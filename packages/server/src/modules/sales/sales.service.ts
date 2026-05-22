import { Injectable, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WsGateway } from '../ws/ws.gateway';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  CreateLeadDto,
  UpdateLeadDto,
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  DeliveryDto,
  CreateLeadFollowRecordDto,
} from './dto/sales.dto';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    @Optional() private wsGateway?: WsGateway,
  ) {}

  // ==================== 车辆管理 ====================

  async findAllVehicles(query: PaginationDto & { brand?: string; series?: string; model?: string; stockStatus?: string }) {
    const where: any = {};
    if (query.brand) where.brand = { contains: query.brand };
    if (query.series) where.series = { contains: query.series };
    if (query.model) where.model = { contains: query.model };
    if (query.stockStatus) where.stockStatus = query.stockStatus;

    const [list, total] = await Promise.all([
      this.prisma.vehicleInfo.findMany({
        where: { ...where, status: 1 },
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vehicleInfo.count({ where: { ...where, status: 1 } }),
    ]);
    return new PaginatedResult(list, total, query.page!, query.pageSize!);
  }

  async findVehicleOne(id: number) {
    const vehicle = await this.prisma.vehicleInfo.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException(`车辆 #${id} 不存在`);
    return vehicle;
  }

  async createVehicle(dto: CreateVehicleDto) {
    return this.prisma.vehicleInfo.create({
      data: {
        ...dto,
        minPrice: dto.minPrice ?? 0,
        images: dto.images ?? undefined,
      } as any,
    });
  }

  async updateVehicle(id: number, dto: UpdateVehicleDto) {
    await this.findVehicleOne(id);
    return this.prisma.vehicleInfo.update({
      where: { id },
      data: this.stripUndefined(dto) as any,
    });
  }

  async removeVehicle(id: number) {
    await this.findVehicleOne(id);
    return this.prisma.vehicleInfo.update({
      where: { id },
      data: { status: 0 },
    });
  }

  // ==================== 销售线索 ====================

  async findAllLeads(query: PaginationDto & { status?: string }) {
    const where: any = {};
    if (query.status) where.status = query.status;

    const [list, total] = await Promise.all([
      this.prisma.salesLead.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          user: { select: { id: true, realName: true, phone: true } },
        },
      }),
      this.prisma.salesLead.count({ where }),
    ]);

    // 映射为前端期望的 flat 字段名
    const mappedList = list.map((lead) => ({
      ...lead,
      customerName: lead.customer?.name ?? null,
      phone: lead.customer?.phone ?? null,
      intendedVehicle: lead.intentModel,
      intentLevel: lead.intent,
      salesName: lead.user?.realName ?? null,
      salesPhone: lead.user?.phone ?? null,
    }));

    return new PaginatedResult(mappedList, total, query.page!, query.pageSize!);
  }

  async findLeadOne(id: number) {
    const lead = await this.prisma.salesLead.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { id: true, realName: true, phone: true } },
        followRecords: {
          include: { user: { select: { id: true, realName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!lead) throw new NotFoundException(`线索 #${id} 不存在`);

    return {
      ...lead,
      customerName: lead.customer?.name ?? null,
      phone: lead.customer?.phone ?? null,
      intendedVehicle: lead.intentModel,
      intentLevel: lead.intent,
      salesName: lead.user?.realName ?? null,
      salesPhone: lead.user?.phone ?? null,
    };
  }

  async createLead(dto: CreateLeadDto) {
    const data: any = { ...dto };
    // 映射前端字段名到数据库字段
    if (dto.intendedVehicle !== undefined) data.intentModel = dto.intendedVehicle;
    if (dto.intentLevel !== undefined) data.intent = dto.intentLevel;
    delete data.intendedVehicle;
    delete data.intentLevel;
    const lead = await this.prisma.salesLead.create({ data });

    // WebSocket 推送新销售线索
    const customer = data.customerId
      ? await this.prisma.customer.findUnique({ where: { id: data.customerId }, select: { name: true } })
      : null;
    this.wsGateway?.notifyNewSalesLead({
      leadId: lead.id,
      customerName: customer?.name || '-',
      intentModel: lead.intentModel || undefined,
    });

    return lead;
  }

  async updateLead(id: number, dto: UpdateLeadDto, currentUserId?: number) {
    const lead = await this.prisma.salesLead.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!lead) throw new NotFoundException(`线索 #${id} 不存在`);

    // 归属校验：只有线索负责人和超级管理员可以修改
    if (currentUserId && lead.userId !== currentUserId) {
      await this.checkIsAdmin(currentUserId);
    }

    const data: any = { ...dto };
    // 映射前端字段名到数据库字段
    if (dto.intendedVehicle !== undefined) data.intentModel = dto.intendedVehicle;
    if (dto.intentLevel !== undefined) data.intent = dto.intentLevel;
    delete data.intendedVehicle;
    delete data.intentLevel;
    return this.prisma.salesLead.update({
      where: { id },
      data: this.stripUndefined(data) as any,
    });
  }

  async removeLead(id: number) {
    await this.findLeadOne(id);
    return this.prisma.$transaction([
      this.prisma.leadFollowRecord.deleteMany({ where: { leadId: id } }),
      this.prisma.salesLead.delete({ where: { id } }),
    ]);
  }

  // ==================== 线索跟进记录 ====================

  async getLeadFollowRecords(leadId: number) {
    // 轻量存在性校验
    const exists = await this.prisma.salesLead.count({ where: { id: leadId } });
    if (!exists) throw new NotFoundException(`线索 #${leadId} 不存在`);

    return this.prisma.leadFollowRecord.findMany({
      where: { leadId },
      include: { user: { select: { id: true, realName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addLeadFollowRecord(leadId: number, userId: number, dto: CreateLeadFollowRecordDto & { status?: string }) {
    // 轻量存在性校验
    const lead = await this.prisma.salesLead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });
    if (!lead) throw new NotFoundException(`线索 #${leadId} 不存在`);

    const updateData: any = {};
    if (dto.nextFollowAt) {
      updateData.nextFollowAt = new Date(dto.nextFollowAt);
    }
    if (dto.status) {
      updateData.status = dto.status;
    }

    const [followRecord] = await this.prisma.$transaction([
      this.prisma.leadFollowRecord.create({
        data: {
          leadId,
          userId,
          type: dto.type,
          content: dto.content,
          nextFollowAt: dto.nextFollowAt ? new Date(dto.nextFollowAt) : null,
        },
        include: { user: { select: { id: true, realName: true } } },
      }),
      this.prisma.salesLead.update({
        where: { id: leadId },
        data: updateData,
      }),
    ]);

    return followRecord;
  }

  // ==================== 销售订单 ====================

  async findAllOrders(query: PaginationDto & { status?: string; keyword?: string }) {
    const where: any = {};
    if (query.status) {
      const statuses = query.status.split(',');
      where.status = statuses.length > 1 ? { in: statuses } : query.status;
    }
    if (query.keyword) {
      where.OR = [
        { orderNo: { contains: query.keyword } },
        { customer: { name: { contains: query.keyword } } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          vehicle: true,
        },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    // 映射为前端期望的 flat 字段
    const mappedList = list.map((order) => ({
      ...order,
      customerName: order.customer?.name ?? null,
      vehicleInfo: order.vehicle
        ? `${order.vehicle.brand} ${order.vehicle.series} ${order.vehicle.model}`
        : null,
    }));

    return new PaginatedResult(mappedList, total, query.page!, query.pageSize!);
  }

  async findOrderOne(id: number) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        vehicle: true,
      },
    });
    if (!order) throw new NotFoundException(`订单 #${id} 不存在`);
    return order;
  }

  async createOrder(dto: CreateSalesOrderDto) {
    const orderNo = await this.generateOrderNo();
    const order = await this.prisma.salesOrder.create({
      data: {
        ...dto,
        orderNo,
      } as any,
    });

    // WebSocket 推送新销售订单
    const customer = dto.customerId
      ? await this.prisma.customer.findUnique({ where: { id: dto.customerId }, select: { name: true } })
      : null;
    this.wsGateway?.notifyNewSalesOrder({
      orderId: order.id,
      orderNo: order.orderNo,
      customerName: customer?.name || '-',
      totalAmount: Number(order.totalAmount ?? 0),
    });

    return order;
  }

  async updateOrder(id: number, dto: UpdateSalesOrderDto) {
    await this.findOrderOne(id);
    return this.prisma.salesOrder.update({
      where: { id },
      data: this.stripUndefined(dto) as any,
    });
  }

  async removeOrder(id: number) {
    await this.findOrderOne(id);
    return this.prisma.salesOrder.delete({ where: { id } });
  }

  async delivery(id: number, dto: DeliveryDto) {
    const order = await this.findOrderOne(id);

    const data: any = { status: '已交付' };
    if (dto.deliveryDate) data.deliveryDate = new Date(dto.deliveryDate);
    if (dto.checklist) data.deliveryChecklist = dto.checklist;
    if (dto.remark) data.deliveryRemark = dto.remark;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.salesOrder.update({ where: { id }, data });
      await tx.vehicleInfo.update({
        where: { id: order.vehicleId },
        data: { stockStatus: '已售' },
      });
      return updatedOrder;
    });

    // WebSocket 推送订单交车通知
    this.wsGateway?.notifyOrderDelivered({
      orderId: id,
      orderNo: order.orderNo,
      customerName: order.customer?.name || '-',
    });

    return result;
  }

  // ==================== 工具方法 ====================

  private stripUndefined(data: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );
  }

  /** 检查用户是否为超级管理员 */
  private async checkIsAdmin(userId: number): Promise<void> {
    const user = await this.prisma.sysUser.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    const permissions: any = typeof user?.role?.permissions === 'string'
      ? JSON.parse(user.role.permissions as string)
      : user?.role?.permissions;
    if (!permissions || !permissions.includes('*')) {
      throw new ForbiddenException('仅允许线索负责人或超级管理员操作');
    }
  }

  private async generateOrderNo(): Promise<string> {
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');

    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const count = await this.prisma.salesOrder.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    const seq = String(count + 1).padStart(3, '0');
    return `SO${dateStr}-${seq}`;
  }
}
