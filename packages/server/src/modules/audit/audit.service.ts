import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  // 记录操作日志
  async log(params: {
    userId: number;
    action: string;    // create, update, delete, login, export, etc.
    module: string;    // customer, repair, inventory, etc.
    targetId?: number;
    targetName?: string;
    detail?: string;
    ip?: string;
  }) {
    await this.prisma.auditLog.create({ data: params });
  }

  // 查询日志（分页）
  async findAll(query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const where: any = {};
    if (query.userId) where.userId = Number(query.userId);
    if (query.module) where.module = query.module;
    if (query.action) where.action = query.action;
    if (query.startDate && query.endDate) {
      where.createdAt = { gte: new Date(query.startDate), lte: new Date(query.endDate + 'T23:59:59') };
    }

    const [list, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, realName: true, username: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // 获取操作统计
  async getStats() {
    const [todayCount, topActions] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: new Date(new Date().toDateString()) } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['module'],
        _count: true,
        orderBy: { _count: { module: 'desc' } },
        take: 10,
      }),
    ]);
    return { todayCount, topActions };
  }
}
