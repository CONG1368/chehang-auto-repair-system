import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  // 经营驾驶舱汇总
  async getDashboardSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayPayments, inRepair, newCustomers, todayOrders] = await Promise.all([
      // 今日营收 - 从paymentRecord汇总
      this.prisma.paymentRecord.aggregate({
        where: { createdAt: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
        _count: true,
      }),
      // 在修车辆 - 从repairOrder查status未完成
      this.prisma.repairOrder.count({
        where: { status: { in: ['pending', 'assigned', 'repairing', 'quality_check'] } },
      }),
      // 今日新增客户
      this.prisma.customer.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
      // 今日工单
      this.prisma.repairOrder.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
    ]);

    return {
      todayRevenue: todayPayments._sum.amount || 0,
      todayOrderCount: todayOrders,
      inRepairCount: inRepair,
      newCustomerCount: newCustomers,
    };
  }

  // 营收趋势
  async getRevenueTrend(days: number = 30) {
    const results: { date: string; amount: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const agg = await this.prisma.paymentRecord.aggregate({
        where: { createdAt: { gte: date, lt: nextDate } },
        _sum: { amount: true },
      });

      results.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        amount: Number(agg._sum.amount) || 0,
      });
    }
    return results;
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
      customerName: r.customer.name,
      type: r.type,
      amount: r.amount,
      paymentMethod: r.paymentMethod,
      createdAt: r.createdAt,
    }));
  }
}
