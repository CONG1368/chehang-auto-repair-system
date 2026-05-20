import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreateServiceDto,
  CreatePackageDto,
  CreateAppointmentDto,
} from './dto/beauty.dto';

@Injectable()
export class BeautyService {
  constructor(private prisma: PrismaService) {}

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

  async updateService(id: number, dto: CreateServiceDto) {
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
    return this.prisma.beautyPackage.findMany({
      where: { status: 1 },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPackage(dto: CreatePackageDto) {
    return this.prisma.beautyPackage.create({ data: dto });
  }

  async updatePackage(id: number, dto: CreatePackageDto) {
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

    return new PaginatedResult(list, total, page, pageSize);
  }

  async createAppointment(dto: CreateAppointmentDto) {
    return this.prisma.beautyAppointment.create({
      data: {
        ...dto,
        status: 'pending',
      },
    });
  }

  async updateAppointmentStatus(id: number, status: string) {
    const data: any = { status };
    if (status === 'completed') {
      data.endTime = new Date();
    }
    return this.prisma.beautyAppointment.update({
      where: { id },
      data,
    });
  }
}
