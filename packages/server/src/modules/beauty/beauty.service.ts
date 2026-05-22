import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WsGateway } from '../ws/ws.gateway';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreateServiceDto,
  UpdateServiceDto,
  CreatePackageDto,
  UpdatePackageDto,
  CreateAppointmentDto,
  UpdateAppointmentDto,
  CreateCardDto,
  UpdateCardDto,
  CreateRechargeDto,
} from './dto/beauty.dto';

@Injectable()
export class BeautyService {
  constructor(
    private prisma: PrismaService,
    @Optional() private wsGateway?: WsGateway,
  ) {}

  // ==================== 服务项目管理 ====================

  async findAllServices() {
    return this.prisma.beautyService.findMany({
      where: { status: 1 },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createService(dto: CreateServiceDto) {
    return this.prisma.beautyService.create({ data: dto });
  }

  async updateService(id: number, dto: UpdateServiceDto) {
    return this.prisma.beautyService.update({ where: { id }, data: dto });
  }

  async removeService(id: number) {
    return this.prisma.beautyService.update({
      where: { id },
      data: { status: 0 },
    });
  }

  // ==================== 套餐管理 ====================

  async findAllPackages() {
    const packages = await this.prisma.beautyPackage.findMany({
      where: { status: 1 },
      orderBy: { createdAt: 'desc' },
    });
    return packages.map((pkg) => ({
      ...pkg,
      items: typeof pkg.items === 'string' ? JSON.parse(pkg.items as string) : pkg.items,
    }));
  }

  async createPackage(dto: CreatePackageDto) {
    return this.prisma.beautyPackage.create({ data: dto });
  }

  async updatePackage(id: number, dto: UpdatePackageDto) {
    return this.prisma.beautyPackage.update({ where: { id }, data: dto });
  }

  async removePackage(id: number) {
    return this.prisma.beautyPackage.update({
      where: { id },
      data: { status: 0 },
    });
  }

  // ==================== 预约施工 ====================

  async findAllAppointments(query: any) {
    const page = +query.page || 1;
    const pageSize = +query.pageSize || 10;
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    const [list, total] = await Promise.all([
      this.prisma.beautyAppointment.findMany({
        skip,
        take: pageSize,
        where,
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.beautyAppointment.count({ where }),
    ]);

    const normalizedList = list.map((appt: any) => ({
      ...appt,
      items: typeof appt.items === 'string' ? JSON.parse(appt.items as string) : appt.items,
    }));
    return new PaginatedResult(normalizedList, total, page, pageSize);
  }

  async createAppointment(dto: CreateAppointmentDto) {
    const appointment = await this.prisma.beautyAppointment.create({
      data: {
        ...dto,
        status: 'pending',
      },
    });

    // WebSocket 推送新美容预约
    const customer = dto.customerId
      ? await this.prisma.customer.findUnique({ where: { id: dto.customerId }, select: { name: true } })
      : null;
    this.wsGateway?.notifyNewBeautyAppointment({
      appointmentId: appointment.id,
      customerName: customer?.name || '-',
      serviceType: dto.serviceType || undefined,
    });

    return appointment;
  }

  async updateAppointment(id: number, dto: UpdateAppointmentDto) {
    await this.prisma.beautyAppointment.update({
      where: { id },
      data: dto,
    });
    return this.prisma.beautyAppointment.findUnique({ where: { id } });
  }

  async updateAppointmentStatus(id: number, status: string) {
    const data: any = { status };
    if (status === 'completed') {
      data.endTime = new Date();
    }
    const appointment = await this.prisma.beautyAppointment.update({
      where: { id },
      data,
    });

    // WebSocket 推送美容预约状态变更
    const customer = await this.prisma.customer.findUnique({
      where: { id: appointment.customerId },
      select: { name: true },
    });
    const statusNames: Record<string, string> = {
      pending: '待施工',
      in_progress: '施工中',
      completed: '已完成',
      cancelled: '已取消',
    };
    this.wsGateway?.notifyBeautyAppointmentStatusChange({
      appointmentId: appointment.id,
      status: appointment.status,
      statusName: statusNames[appointment.status] || appointment.status,
      customerName: customer?.name || '-',
    });

    return appointment;
  }

  async removeAppointment(id: number) {
    return this.prisma.beautyAppointment.delete({ where: { id } });
  }

  // ==================== 会员卡 ====================

  async findAllCards(query: any) {
    const page = +query.page || 1;
    const pageSize = +query.pageSize || 20;
    const where: any = {};
    if (query.keyword) {
      where.OR = [
        { cardNo: { contains: query.keyword } },
        { name: { contains: query.keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.memberCard.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.memberCard.count({ where }),
    ]);
    return new PaginatedResult(list, total, page, pageSize);
  }

  async findCardOne(id: number) {
    const card = await this.prisma.memberCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundException(`会员卡 #${id} 不存在`);
    return card;
  }

  async createCard(dto: CreateCardDto) {
    return this.prisma.memberCard.create({ data: dto });
  }

  async updateCard(id: number, dto: UpdateCardDto) {
    await this.findCardOne(id);
    return this.prisma.memberCard.update({ where: { id }, data: dto });
  }

  async removeCard(id: number) {
    await this.findCardOne(id);
    return this.prisma.memberCard.delete({ where: { id } });
  }

  // ==================== 充值记录 ====================

  async findAllRecharges(query: any) {
    const page = +query.page || 1;
    const pageSize = +query.pageSize || 10;
    const skip = (page - 1) * pageSize;
    const where: any = {};

    // customerId 从字符串转数字
    if (query.customerId) {
      where.customerId = +query.customerId;
    }

    const [list, total] = await Promise.all([
      this.prisma.memberCardRecharge.findMany({
        skip,
        take: pageSize,
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.memberCardRecharge.count({ where }),
    ]);

    return new PaginatedResult(list, total, page, pageSize);
  }

  async createRecharge(dto: CreateRechargeDto) {
    return this.prisma.$transaction(async (tx) => {
      // 创建充值记录
      const recharge = await tx.memberCardRecharge.create({
        data: {
          customerId: dto.customerId,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
        },
      });

      // 更新客户余额（增加充值金额）
      await tx.customer.update({
        where: { id: dto.customerId },
        data: { balance: { increment: dto.amount } },
      });

      return recharge;
    });
  }
}
