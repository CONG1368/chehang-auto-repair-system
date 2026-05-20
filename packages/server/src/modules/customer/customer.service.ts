import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateCustomerDto, UpdateCustomerDto, CreateVehicleDto, CustomerSearchDto } from './dto/customer.dto';

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
}
