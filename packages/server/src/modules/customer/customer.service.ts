import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WsGateway } from '../ws/ws.gateway';
import { PaginatedResult } from '../../common/dto/pagination.dto';
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
  constructor(
    private prisma: PrismaService,
    private readonly redis?: RedisService,
    private wsGateway?: WsGateway,
  ) {}

  async findAll(query: CustomerSearchDto) {
    const cacheKey = `customers:list:${JSON.stringify(query)}`;

    // 尝试从 Redis 缓存读取
    if (this.redis) {
      const cached = await this.redis.getJson(cacheKey);
      if (cached) return cached;
    }

    const where: any = {};
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { phone: { contains: query.keyword } },
        { vehicles: { some: { plateNumber: { contains: query.keyword } } } },
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
    const result = new PaginatedResult(list, total, query.page!, query.pageSize!);

    // 写入缓存，TTL 60 秒
    if (this.redis) {
      await this.redis.setJson(cacheKey, result, 60);
    }

    return result;
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
    const customer = await this.prisma.customer.create({
      data: { ...dto, birthday: dto.birthday ? new Date(dto.birthday) : null, images: dto.images ?? undefined },
      include: { vehicles: true },
    });
    // 清除客户列表缓存
    await this.clearCustomerCache();
    // 推送新客户通知
    this.wsGateway?.notifyNewCustomer({
      customerId: customer.id,
      name: customer.name,
      phone: customer.phone || '',
    });
    return customer;
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findOne(id);
    const customer = await this.prisma.customer.update({
      where: { id },
      data: { ...dto, birthday: dto.birthday ? new Date(dto.birthday) : undefined, images: dto.images ?? undefined },
      include: { vehicles: true },
    });
    // 清除客户列表缓存
    await this.clearCustomerCache();
    return customer;
  }

  async remove(id: number) {
    await this.findOne(id);
    // 级联删除关联记录，避免外键约束失败
    await this.prisma.$transaction([
      this.prisma.followRecord.deleteMany({ where: { customerId: id } }),
      this.prisma.customerVehicle.deleteMany({ where: { customerId: id } }),
      this.prisma.memberCardRecharge.deleteMany({ where: { customerId: id } }),
      this.prisma.paymentRecord.deleteMany({ where: { customerId: id } }),
      this.prisma.receivable.deleteMany({ where: { customerId: id } }),
      this.prisma.salesLead.deleteMany({ where: { customerId: id } }),
      this.prisma.salesOrder.deleteMany({ where: { customerId: id } }),
      this.prisma.repairOrder.deleteMany({ where: { customerId: id } }),
      this.prisma.customer.delete({ where: { id } }),
    ]);
    // 清除客户列表缓存
    await this.clearCustomerCache();
    return { message: '删除成功' };
  }

  // 车辆管理
  async getVehicles(customerId: number) {
    return this.prisma.customerVehicle.findMany({ where: { customerId } });
  }

  async addVehicle(customerId: number, dto: CreateVehicleDto) {
    return this.prisma.customerVehicle.create({ data: { ...dto, customerId } });
  }

  async updateVehicle(customerId: number, id: number, dto: Partial<CreateVehicleDto>) {
    const vehicle = await this.prisma.customerVehicle.findFirst({ where: { id, customerId } });
    if (!vehicle) throw new NotFoundException('车辆不存在或不属于该客户');
    return this.prisma.customerVehicle.update({ where: { id }, data: dto });
  }

  async removeVehicle(customerId: number, id: number) {
    const vehicle = await this.prisma.customerVehicle.findFirst({ where: { id, customerId } });
    if (!vehicle) throw new NotFoundException('车辆不存在或不属于该客户');
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
    return this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: customerId },
        data: { lastVisitAt: new Date(), visitCount: { increment: 1 } },
      });
      return tx.followRecord.create({
        data: { ...data, customerId, nextFollowAt: data.nextFollowAt ? new Date(data.nextFollowAt) : null },
      });
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

  // ==================== Redis 缓存辅助 ====================

  /** 清除 customers 相关缓存 */
  private async clearCustomerCache() {
    if (!this.redis) return;
    const keys = await this.redis.keys('customers:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
