import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    userId?: number;
    type: string;
    title: string;
    content: string;
    targetType?: string;
    targetId?: number;
  }) {
    return this.prisma.notification.create({ data });
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    type?: string;
    isRead?: any;
    userId: number;
  }) {
    const page = +(query.page ?? 1) || 1;
    const pageSize = +(query.pageSize ?? 10) || 10;
    const where: any = {
      OR: [{ userId: query.userId }, { userId: null }],
    };
    if (query.type) where.type = query.type;
    if (query.isRead !== undefined && query.isRead !== null && String(query.isRead) !== '') {
      where.isRead = String(query.isRead) === 'true';
    }

    const [list, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return new PaginatedResult(list, total, page, pageSize);
  }

  async getUnreadCount(userId: number) {
    return this.prisma.notification.count({
      where: {
        OR: [{ userId }, { userId: null }],
        isRead: false,
      },
    });
  }

  async markRead(id: number) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: {
        OR: [{ userId }, { userId: null }],
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
