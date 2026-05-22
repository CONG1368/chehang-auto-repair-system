import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private readonly redis?: RedisService,
  ) {}

  // 经营驾驶舱汇总
  async getDashboardSummary(startDate?: string, endDate?: string) {
    const cacheKey = startDate || endDate
      ? `dashboard:data:${startDate || ''}:${endDate || ''}`
      : 'dashboard:data';

    if (this.redis) {
      const cached = await this.redis.getJson(cacheKey);
      if (cached) return cached;
    }

    const dateWhere: any = {};
    if (startDate || endDate) {
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        dateWhere.gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        dateWhere.lte = e;
      }
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateWhere.gte = today;
      dateWhere.lt = tomorrow;
    }

    const [todayPayments, inRepair, newCustomers, todayOrders] = await Promise.all([
      this.prisma.paymentRecord.aggregate({
        where: { createdAt: dateWhere },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.repairOrder.count({
        where: { status: { in: ['pending', 'assigned', 'repairing', 'quality_check'] } },
      }),
      this.prisma.customer.count({
        where: { createdAt: dateWhere },
      }),
      this.prisma.repairOrder.count({
        where: { createdAt: dateWhere },
      }),
    ]);

    const result = {
      todayRevenue: todayPayments._sum.amount || 0,
      todayOrderCount: todayOrders,
      inRepairCount: inRepair,
      newCustomerCount: newCustomers,
    };

    if (this.redis) {
      await this.redis.setJson(cacheKey, result, 300);
    }

    return result;
  }

  // 营收趋势（一次查询，JS端按日聚合，避免N+1）
  async getRevenueTrend(days: number = 30) {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const payments = await this.prisma.paymentRecord.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // 初始化所有日期
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      dailyMap[key] = 0;
    }

    // JS 端按天聚合
    for (const p of payments) {
      const d = new Date(p.createdAt);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (dailyMap[key] !== undefined) {
        dailyMap[key] += Number(p.amount);
      }
    }

    return Object.entries(dailyMap).map(([date, amount]) => ({
      date,
      amount: Math.round(amount * 100) / 100,
    }));
  }

  // 业务占比
  async getBusinessRatio() {
    const types = ['repair', 'sales', 'beauty'] as const;
    const typeNames: Record<string, string> = { repair: '维修', sales: '销售', beauty: '美容' };

    const results: { name: string; value: number }[] = [];
    for (const type of types) {
      const agg = await this.prisma.paymentRecord.aggregate({
        where: { type },
        _sum: { amount: true },
      });
      results.push({
        name: typeNames[type],
        value: Number(agg._sum.amount) || 0,
      });
    }
    return results;
  }

  // 销售分析
  async getSalesStats(startDate?: string, endDate?: string) {
    const where: any = { stockStatus: 'sold' };

    // 按品牌统计销售数量
    const vehicles = await this.prisma.vehicleInfo.groupBy({
      by: ['brand'],
      where,
      _count: true,
      orderBy: { _count: { brand: 'desc' } },
    });

    return { vehicleStats: vehicles };
  }

  // 维修分析
  async getRepairStats(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const totalOrders = await this.prisma.repairOrder.count({ where });

    const byStatus = await this.prisma.repairOrder.groupBy({
      by: ['status'],
      _count: true,
      orderBy: { _count: { status: 'desc' } },
    });

    // 计算完工率
    const completedCount = byStatus.find(
      (s) => s.status === 'completed',
    )?._count || 0;
    const completionRate =
      totalOrders > 0 ? Math.round((completedCount / totalOrders) * 100) : 0;

    return { totalOrders, completionRate, byStatus };
  }

  // 客户分析
  async getCustomerStats() {
    const total = await this.prisma.customer.count();
    const activeThisMonth = await this.prisma.customer.count({
      where: {
        lastVisitAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    return { totalCustomers: total, activeCustomers: activeThisMonth };
  }

  // 库存分析
  async getInventoryStats() {
    const totalParts = await this.prisma.part.count({ where: { status: 1 } });

    const totalValue = await this.prisma.partStock.aggregate({
      _sum: { quantity: true },
    });

    // 低库存配件：当前库存 <= 安全库存
    const allParts = await this.prisma.part.findMany({
      where: { status: 1 },
      include: { stock: true },
    });

    const lowStockParts = allParts
      .filter((p) => p.stock && p.stock.quantity <= p.safetyStock)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        currentStock: p.stock!.quantity,
        safetyStock: p.safetyStock,
        spec: p.spec || '',
      }));

    return {
      totalParts,
      totalStockQuantity: totalValue._sum.quantity || 0,
      lowStockCount: lowStockParts.length,
      lowStockParts,
    };
  }

  // 最近收款记录
  async getRecentPayments(limit: number = 5) {
    const records = await this.prisma.paymentRecord.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true, phone: true } } },
    });

    return records.map((r) => ({
      id: r.id,
      paymentNo: r.paymentNo,
      customerName: r.customer?.name || '',
      type: r.type,
      amount: r.amount,
      paymentMethod: r.paymentMethod,
      createdAt: r.createdAt,
    }));
  }

  async getBeautyStats(startDate?: string, endDate?: string) {
    const dateWhere: any = {};
    if (startDate || endDate) {
      dateWhere.createdAt = {};
      if (startDate) dateWhere.createdAt.gte = new Date(startDate);
      if (endDate) dateWhere.createdAt.lte = new Date(endDate);
    }

    const [totalAppointments, byStatus, byServiceType, totalRevenue] = await Promise.all([
      this.prisma.beautyAppointment.count({ where: dateWhere }),
      this.prisma.beautyAppointment.groupBy({
        by: ['status'],
        where: dateWhere,
        _count: true,
      }),
      this.prisma.beautyAppointment.groupBy({
        by: ['serviceType'],
        where: dateWhere,
        _count: true,
      }),
      this.prisma.beautyAppointment.aggregate({
        where: { ...dateWhere, status: 'completed' },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalAppointments,
      totalRevenue: Number(totalRevenue._sum.totalAmount) || 0,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      byServiceType: byServiceType.map(s => ({ serviceType: s.serviceType, count: s._count })),
    };
  }

  async getStaffPerformance(startDate?: string, endDate?: string) {
    const dateWhere: any = {};
    if (startDate || endDate) {
      dateWhere.createdAt = {};
      if (startDate) dateWhere.createdAt.gte = new Date(startDate);
      if (endDate) dateWhere.createdAt.lte = new Date(endDate);
    }

    const dispatchStats = await this.prisma.dispatchRecord.groupBy({
      by: ['technicianId'],
      where: dateWhere,
      _count: true,
    });

    const technicianIds = dispatchStats.map(d => d.technicianId);
    const technicians = technicianIds.length > 0
      ? await this.prisma.sysUser.findMany({
          where: { id: { in: technicianIds } },
          select: { id: true, realName: true },
        })
      : [];

    const techMap = new Map(technicians.map(t => [t.id, t.realName]));

    const salesStats = await this.prisma.salesOrder.groupBy({
      by: ['salesId'],
      where: dateWhere,
      _count: true,
      _sum: { totalAmount: true },
    });

    const salesIds = salesStats.map(s => s.salesId);
    const salesUsers = salesIds.length > 0
      ? await this.prisma.sysUser.findMany({
          where: { id: { in: salesIds } },
          select: { id: true, realName: true },
        })
      : [];

    const salesMap = new Map(salesUsers.map(u => [u.id, u.realName]));

    return {
      technicians: dispatchStats.map(d => ({
        userId: d.technicianId,
        name: techMap.get(d.technicianId) || '未知',
        orderCount: d._count,
      })),
      sales: salesStats.map(s => ({
        userId: s.salesId,
        name: salesMap.get(s.salesId) || '未知',
        orderCount: s._count,
        totalAmount: Number(s._sum.totalAmount) || 0,
      })),
    };
  }
}
