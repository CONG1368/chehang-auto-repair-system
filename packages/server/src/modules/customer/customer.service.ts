import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateCustomerDto, UpdateCustomerDto, CreateVehicleDto, CustomerSearchDto } from './dto/customer.dto';

function diffDays(a: Date, b: Date): number {
  return Math.ceil((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaginationDto & CustomerSearchDto) {
    const where: any = {};
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { phone: { contains: query.keyword } },
        { plateNumber: { contains: query.keyword } },
      ];
    }
    if (query.phone) where.phone = { contains: query.phone };

    const [list, total] = await Promise.all([
      this.prisma.customer.findMany({
        skip: query.skip,
        take: query.take,
        where,
        include: { vehicles: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return new PaginatedResult(list, total, query.page!, query.pageSize!);
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        vehicles: true,
        followRecords: { include: { user: { select: { realName: true } } }, orderBy: { createdAt: 'desc' }, take: 20 },
        repairOrders: { orderBy: { createdAt: 'desc' }, take: 10 },
        paymentRecords: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!customer) throw new NotFoundException('客户不存在');
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: { ...dto, birthday: dto.birthday ? new Date(dto.birthday) : null },
      include: { vehicles: true },
    });
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data: { ...dto, birthday: dto.birthday ? new Date(dto.birthday) : undefined },
      include: { vehicles: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.customer.delete({ where: { id } });
    return { message: '删除成功' };
  }

  // 车辆管理
  async getVehicles(customerId: number) {
    return this.prisma.customerVehicle.findMany({ where: { customerId } });
  }

  async addVehicle(customerId: number, dto: CreateVehicleDto) {
    return this.prisma.customerVehicle.create({ data: { ...dto, customerId } });
  }

  async updateVehicle(id: number, dto: Partial<CreateVehicleDto>) {
    const vehicle = await this.prisma.customerVehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('车辆不存在');
    return this.prisma.customerVehicle.update({ where: { id }, data: dto });
  }

  async removeVehicle(id: number) {
    const vehicle = await this.prisma.customerVehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('车辆不存在');
    await this.prisma.customerVehicle.delete({ where: { id } });
    return { message: '删除成功' };
  }

  // 跟进记录
  async getFollowRecords(customerId: number) {
    return this.prisma.followRecord.findMany({
      where: { customerId },
      include: { user: { select: { realName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addFollowRecord(customerId: number, data: { type: string; content: string; userId: number; nextFollowAt?: string }) {
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { lastVisitAt: new Date(), visitCount: { increment: 1 } },
    });
    return this.prisma.followRecord.create({
      data: { ...data, customerId, nextFollowAt: data.nextFollowAt ? new Date(data.nextFollowAt) : null },
    });
  }

  // 到期提醒
  async getReminds(type?: string) {
    const now = new Date();
    const results: any[] = [];

    function calcUrgency(days: number): string {
      if (days <= 0) return '已超期';
      if (days <= 7) return '即将到期';
      if (days <= 30) return '近期到期';
      return '正常';
    }

    // 保险到期提醒
    if (!type || type === 'insurance') {
      const vehicles = await this.prisma.customerVehicle.findMany({
        where: { insuranceDue: { not: null } },
        include: { customer: true },
        orderBy: { insuranceDue: 'asc' },
      });

      for (const v of vehicles) {
        const remainDays = diffDays(v.insuranceDue!, now);
        results.push({
          id: `${v.id}-insurance`,
          type: 'insurance',
          customerId: v.customerId,
          customerName: v.customer.name,
          customerPhone: v.customer.phone,
          plateNumber: v.plateNumber,
          dueDate: v.insuranceDue,
          remainDays,
          urgent: calcUrgency(remainDays),
        });
      }
    }

    // 年检到期提醒
    if (!type || type === 'inspection') {
      const vehicles = await this.prisma.customerVehicle.findMany({
        where: { inspectionDue: { not: null } },
        include: { customer: true },
        orderBy: { inspectionDue: 'asc' },
      });

      for (const v of vehicles) {
        const remainDays = diffDays(v.inspectionDue!, now);
        results.push({
          id: `${v.id}-inspection`,
          type: 'inspection',
          customerId: v.customerId,
          customerName: v.customer.name,
          customerPhone: v.customer.phone,
          plateNumber: v.plateNumber,
          dueDate: v.inspectionDue,
          remainDays,
          urgent: calcUrgency(remainDays),
        });
      }
    }

    // 保养到期提醒（基于最近一次维修 + 6个月/5000km）
    if (!type || type === 'maintenance') {
      const vehicles = await this.prisma.customerVehicle.findMany({
        include: { customer: true },
      });

      // 批量获取每辆车的最新维修记录
      const plateNumbers = vehicles.map((v) => v.plateNumber);
      const lastRepairs = await this.prisma.repairOrder.groupBy({
        by: ['plateNumber'],
        where: {
          plateNumber: { in: plateNumbers },
          status: { in: ['completed', 'delivered'] },
          actualCompleteTime: { not: null },
        },
        _max: { actualCompleteTime: true },
      });
      const repairMap = new Map(
        lastRepairs.map((r) => [r.plateNumber, r._max.actualCompleteTime]),
      );

      for (const v of vehicles) {
        const lastRepairDate = repairMap.get(v.plateNumber);
        const baseDate = lastRepairDate || v.purchaseDate;
        if (!baseDate) continue;

        const suggestedDate = addMonths(new Date(baseDate), 6);
        const remainDays = diffDays(suggestedDate, now);
        results.push({
          id: `${v.id}-maintenance`,
          type: 'maintenance',
          customerId: v.customerId,
          customerName: v.customer.name,
          customerPhone: v.customer.phone,
          plateNumber: v.plateNumber,
          lastMaintenanceDate: lastRepairDate || null,
          suggestedDate: suggestedDate.toISOString(),
          remainDays,
          mileage: v.mileage,
          suggestedMileage: v.mileage ? v.mileage + 5000 : null,
          urgent: calcUrgency(remainDays),
        });
      }
    }

    results.sort((a, b) => a.remainDays - b.remainDays);
    return results;
  }
}
