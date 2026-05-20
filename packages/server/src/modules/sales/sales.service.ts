import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  CreateLeadDto,
  UpdateLeadDto,
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  DeliveryDto,
} from './dto/sales.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

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
    return new PaginatedResult(list, total, query.page!, query.pageSize!);
  }

  async findLeadOne(id: number) {
    const lead = await this.prisma.salesLead.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { id: true, realName: true, phone: true } },
      },
    });
    if (!lead) throw new NotFoundException(`线索 #${id} 不存在`);
    return lead;
  }

  async createLead(dto: CreateLeadDto) {
    return this.prisma.salesLead.create({ data: dto as any });
  }

  async updateLead(id: number, dto: UpdateLeadDto) {
    await this.findLeadOne(id);
    return this.prisma.salesLead.update({
      where: { id },
      data: this.stripUndefined(dto) as any,
    });
  }

  // ==================== 销售订单 ====================

  async findAllOrders(query: PaginationDto & { status?: string }) {
    const where: any = {};
    if (query.status) where.status = query.status;

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
    return new PaginatedResult(list, total, query.page!, query.pageSize!);
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
    return this.prisma.salesOrder.create({
      data: {
        ...dto,
        orderNo,
      } as any,
    });
  }

  async updateOrder(id: number, dto: UpdateSalesOrderDto) {
    await this.findOrderOne(id);
    return this.prisma.salesOrder.update({
      where: { id },
      data: this.stripUndefined(dto) as any,
    });
  }

  async delivery(id: number, dto: DeliveryDto) {
    const order = await this.findOrderOne(id);

    const data: any = { status: 'delivered' };
    if (dto.deliveryDate) data.deliveryDate = new Date(dto.deliveryDate);

    const [updatedOrder] = await Promise.all([
      this.prisma.salesOrder.update({ where: { id }, data }),
      this.prisma.vehicleInfo.update({
        where: { id: order.vehicleId },
        data: { stockStatus: 'sold' },
      }),
    ]);

    return updatedOrder;
  }

  // ==================== 工具方法 ====================

  private stripUndefined(data: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );
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
