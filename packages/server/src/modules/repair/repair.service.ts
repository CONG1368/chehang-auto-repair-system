import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WsGateway } from '../ws/ws.gateway';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreateRepairOrderDto,
  UpdateRepairOrderDto,
  RepairItemDto,
  DispatchDto,
  QualityCheckDto,
  RepairQueryDto,
} from './dto/repair.dto';

@Injectable()
export class RepairService {
  constructor(
    private prisma: PrismaService,
    private wsGateway?: WsGateway,
  ) {}

  async findAll(query: RepairQueryDto) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.plateNumber) {
      where.plateNumber = { contains: query.plateNumber };
    }
    if (query.orderNo) {
      where.orderNo = { contains: query.orderNo };
    }
    if (query.customerName) {
      where.customer = { name: { contains: query.customerName } };
    }

    const [list, total] = await Promise.all([
      this.prisma.repairOrder.findMany({
        skip: query.skip,
        take: query.take,
        where,
        include: {
          customer: true,
          advisor: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.repairOrder.count({ where }),
    ]);

    return new PaginatedResult(list, total, query.page!, query.pageSize!);
  }

  async findOne(id: number) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        advisor: true,
        items: true,
        dispatchRecords: {
          include: {
            technician: true,
          },
        },
        qualityCheck: true,
        paymentRecords: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`工单 #${id} 不存在`);
    }

    return order;
  }

  async create(dto: CreateRepairOrderDto) {
    const orderNo = await this.generateOrderNo();

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.repairOrder.create({
        data: {
          orderNo,
          customerId: dto.customerId,
          vehicleId: dto.vehicleId,
          plateNumber: dto.plateNumber,
          vehicleModel: dto.vehicleModel,
          mileage: dto.mileage,
          faultDesc: dto.faultDesc,
          checkResult: dto.checkResult,
          advisorId: dto.advisorId,
          estCompleteTime: dto.estCompleteTime ? new Date(dto.estCompleteTime) : null,
          status: 'pending',
          items: {
            create: dto.items.map((item) => ({
              type: item.type,
              name: item.name,
              laborFee: item.laborFee ?? 0,
              partFee: item.partFee ?? 0,
              amount: item.amount ?? 0,
            })),
          },
        },
        include: {
          customer: true,
          advisor: true,
          items: true,
        },
      });

      // WebSocket 推送新工单通知
      this.wsGateway?.notifyNewRepairOrder({
        id: order.id,
        orderNo: order.orderNo,
        plateNumber: order.plateNumber,
        vehicleModel: order.vehicleModel,
        status: order.status,
        customerName: order.customer?.name,
        faultDesc: order.faultDesc,
      });

      return order;
    });
  }

  async update(id: number, dto: UpdateRepairOrderDto) {
    const existing = await this.prisma.repairOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`工单 #${id} 不存在`);
    }

    const data: any = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.faultDesc !== undefined) data.faultDesc = dto.faultDesc;
    if (dto.checkResult !== undefined) data.checkResult = dto.checkResult;

    // If items are provided, replace them
    if (dto.items) {
      return this.prisma.$transaction(async (tx) => {
        await tx.repairOrderItem.deleteMany({ where: { repairOrderId: id } });
        await tx.repairOrderItem.createMany({
          data: dto.items!.map((item) => ({
            repairOrderId: id,
            type: item.type,
            name: item.name,
            laborFee: item.laborFee ?? 0,
            partFee: item.partFee ?? 0,
            amount: item.amount ?? 0,
          })),
        });

        const updated = await tx.repairOrder.update({
          where: { id },
          data,
          include: {
            customer: true,
            advisor: true,
            items: true,
          },
        });

        return updated;
      });
    }

    return this.prisma.repairOrder.update({
      where: { id },
      data,
      include: {
        customer: true,
        advisor: true,
        items: true,
      },
    });
  }

  async updateStatus(id: number, status: string) {
    const existing = await this.prisma.repairOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`工单 #${id} 不存在`);
    }

    const validStatuses = [
      'pending',
      'assigned',
      'repairing',
      'quality_check',
      'completed',
      'delivered',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `无效状态: ${status}。有效状态为: ${validStatuses.join(', ')}`,
      );
    }

    const statusNames: Record<string, string> = {
      pending: '待处理',
      assigned: '已派工',
      repairing: '维修中',
      quality_check: '质检中',
      completed: '已完成',
      delivered: '已交车',
      cancelled: '已取消',
    };

    const updated = await this.prisma.repairOrder.update({
      where: { id },
      data: { status },
    });

    // WebSocket 推送工单状态变更
    this.wsGateway?.notifyOrderStatusChange({
      orderId: updated.id,
      orderNo: updated.orderNo,
      status: updated.status,
      statusName: statusNames[updated.status] ?? updated.status,
    });

    return updated;
  }

  async updateItems(id: number, items: RepairItemDto[]) {
    const existing = await this.prisma.repairOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`工单 #${id} 不存在`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.repairOrderItem.deleteMany({ where: { repairOrderId: id } });
      await tx.repairOrderItem.createMany({
        data: items.map((item) => ({
          repairOrderId: id,
          type: item.type,
          name: item.name,
          laborFee: item.laborFee ?? 0,
          partFee: item.partFee ?? 0,
          amount: item.amount ?? 0,
        })),
      });

      return tx.repairOrder.findUnique({
        where: { id },
        include: { items: true },
      });
    });
  }

  async dispatch(dto: DispatchDto) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id: dto.repairOrderId },
    });

    if (!order) {
      throw new NotFoundException(`工单 #${dto.repairOrderId} 不存在`);
    }

    if (order.status !== 'pending' && order.status !== 'assigned') {
      throw new BadRequestException(`工单当前状态为 ${order.status}，无法派工`);
    }

    return this.prisma.$transaction(async (tx) => {
      const dispatchRecord = await tx.dispatchRecord.create({
        data: {
          repairOrderId: dto.repairOrderId,
          technicianId: dto.technicianId,
          standardHours: dto.standardHours ?? 0,
        },
        include: {
          technician: true,
        },
      });

      await tx.repairOrder.update({
        where: { id: dto.repairOrderId },
        data: { status: 'assigned' },
      });

      return dispatchRecord;
    });
  }

  async completeDispatch(id: number, actualHours: number) {
    const dispatchRecord = await this.prisma.dispatchRecord.findUnique({
      where: { id },
    });

    if (!dispatchRecord) {
      throw new NotFoundException(`派工记录 #${id} 不存在`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.dispatchRecord.update({
        where: { id },
        data: {
          actualHours,
          status: 'completed',
        },
      });

      await tx.repairOrder.update({
        where: { id: dispatchRecord.repairOrderId },
        data: { status: 'quality_check' },
      });

      return updated;
    });
  }

  async qualityCheck(dto: QualityCheckDto) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id: dto.repairOrderId },
    });

    if (!order) {
      throw new NotFoundException(`工单 #${dto.repairOrderId} 不存在`);
    }

    return this.prisma.$transaction(async (tx) => {
      // upsert quality check record
      const qc = await tx.qualityCheck.upsert({
        where: { repairOrderId: dto.repairOrderId },
        create: {
          repairOrderId: dto.repairOrderId,
          checkerId: dto.checkerId,
          itemsChecked: dto.itemsChecked ?? [],
          roadTest: dto.roadTest,
          isPassed: dto.isPassed,
          remark: dto.remark,
        },
        update: {
          checkerId: dto.checkerId,
          itemsChecked: dto.itemsChecked ?? [],
          roadTest: dto.roadTest,
          isPassed: dto.isPassed,
          remark: dto.remark,
        },
      });

      // If passed, update order status to completed
      if (dto.isPassed === 1) {
        await tx.repairOrder.update({
          where: { id: dto.repairOrderId },
          data: {
            status: 'completed',
            actualCompleteTime: new Date(),
          },
        });
      } else {
        // If failed, revert to repairing
        await tx.repairOrder.update({
          where: { id: dto.repairOrderId },
          data: { status: 'repairing' },
        });
      }

      return qc;
    });
  }

  async deliver(id: number) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`工单 #${id} 不存在`);
    }

    if (order.status !== 'completed') {
      throw new BadRequestException(`工单当前状态为 ${order.status}，需要先完成质检才能交车`);
    }

    return this.prisma.repairOrder.update({
      where: { id },
      data: { status: 'delivered' },
    });
  }

  async calculateTotal(id: number) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`工单 #${id} 不存在`);
    }

    const totalLaborFee = order.items.reduce(
      (sum, item) => sum + Number(item.laborFee),
      0,
    );
    const totalPartFee = order.items.reduce(
      (sum, item) => sum + Number(item.partFee),
      0,
    );
    const totalAmount = totalLaborFee + totalPartFee;
    const discount = Number(order.discount);
    const finalAmount = totalAmount - discount;

    return this.prisma.repairOrder.update({
      where: { id },
      data: {
        totalLaborFee,
        totalPartFee,
        totalAmount,
        finalAmount,
      },
      include: { items: true },
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.repairOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`工单 #${id} 不存在`);
    }

    return this.prisma.repairOrder.delete({ where: { id } });
  }

  /**
   * 生成工单号：格式 RO年月日-序号（例：RO20260519-001）
   */
  private async generateOrderNo(): Promise<string> {
    const today = new Date();
    const dateStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('');

    const prefix = `RO${dateStr}-`;

    // 查找今天最大的工单号
    const lastOrder = await this.prisma.repairOrder.findFirst({
      where: {
        orderNo: { startsWith: prefix },
      },
      orderBy: { orderNo: 'desc' },
    });

    let seq = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.orderNo.split('-')[1], 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${String(seq).padStart(3, '0')}`;
  }
}
