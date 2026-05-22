import { Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WsGateway } from '../ws/ws.gateway';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  CreateReceivableDto,
  CreateExpenseDto,
  PaymentQueryDto,
  ReceivableQueryDto,
  ExpenseQueryDto,
  ProfitSummaryQueryDto,
  CreatePayableDto,
  PayableQueryDto,
  UpdateExpenseDto,
  UpdateReceivableDto,
  UpdatePayableDto,
} from './dto/finance.dto';

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    @Optional() private wsGateway?: WsGateway,
  ) {}

  // ==================== 收银管理 ====================

  /**
   * 创建收款记录（含事务保护）
   */
  async createPayment(dto: CreatePaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      // 在事务内生成支付单号：PAO + 年月日 + - + 4位序号（按当天已有数量+1，与ID解耦）
      const now = new Date();
      const dateStr =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const todayCount = await tx.paymentRecord.count({
        where: {
          createdAt: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      });

      const seq = String(todayCount + 1).padStart(4, '0');
      const paymentNo = `PAO${dateStr}-${seq}`;

      const payment = await tx.paymentRecord.create({
        data: {
          paymentNo,
          customerId: dto.customerId,
          repairOrderId: dto.repairOrderId ?? null,
          salesOrderId: dto.salesOrderId ?? null,
          type: dto.type,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          discount: dto.discount ?? 0,
          operatorId: dto.operatorId,
          remark: dto.remark ?? null,
          status: 'completed',
        },
        include: {
          customer: true,
          repairOrder: true,
        },
      });

      // 更新客户累计消费和到店次数
      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          totalSpent: { increment: dto.amount },
          visitCount: { increment: 1 },
          lastVisitAt: new Date(),
        },
      });

      return payment;
    }).then(async (payment) => {
      // WebSocket 推送新收款通知
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
        select: { name: true },
      });
      this.wsGateway?.notifyNewPayment({
        paymentId: payment.id,
        paymentNo: payment.paymentNo,
        customerName: customer?.name || '-',
        amount: Number(payment.amount),
        type: payment.type,
      });
      return payment;
    });
  }

  /**
   * 支付列表（支持筛选）
   */
  async findAllPayments(query: PaymentQueryDto) {
    const where: any = {};

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate + ' 23:59:59');
      }
    }
    if (query.keyword) {
      where.OR = [
        { paymentNo: { contains: query.keyword } },
        { customer: { name: { contains: query.keyword } } },
        { customer: { phone: { contains: query.keyword } } },
        { remark: { contains: query.keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.paymentRecord.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          repairOrder: true,
        },
      }),
      this.prisma.paymentRecord.count({ where }),
    ]);

    return new PaginatedResult(list, total, query.page!, query.pageSize!);
  }

  /**
   * 查询单条收款记录
   */
  async findPaymentOne(id: number) {
    const payment = await this.prisma.paymentRecord.findUnique({
      where: { id },
      include: {
        customer: true,
        repairOrder: true,
      },
    });
    if (!payment) {
      throw new NotFoundException('收款记录不存在');
    }
    return payment;
  }

  async updatePayment(id: number, dto: UpdatePaymentDto) {
    const payment = await this.prisma.paymentRecord.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundException('收款记录不存在');
    }
    return this.prisma.paymentRecord.update({
      where: { id },
      data: {
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        discount: dto.discount,
        remark: dto.remark,
        status: dto.status,
      },
      include: {
        customer: true,
        repairOrder: true,
      },
    });
  }

  async removePayment(id: number) {
    const payment = await this.prisma.paymentRecord.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundException('收款记录不存在');
    }
    return this.prisma.paymentRecord.delete({ where: { id } });
  }

  /**
   * 当日收银汇总
   */
  async getDailySummary(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const payments = await this.prisma.paymentRecord.findMany({
      where: {
        createdAt: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
    });

    // 总收入
    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    // 各支付方式金额
    const byPaymentMethod: Record<string, number> = {};
    // 各业务类型金额
    const byType: Record<string, number> = {};

    for (const p of payments) {
      const method = p.paymentMethod;
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + Number(p.amount);

      const type = p.type;
      byType[type] = (byType[type] || 0) + Number(p.amount);
    }

    return {
      date: dayStart.toISOString().split('T')[0],
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCount: payments.length,
      byPaymentMethod,
      byType,
    };
  }

  // ==================== 应收应付 ====================

  /**
   * 应收列表
   */
  async findAllReceivables(query: ReceivableQueryDto) {
    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    const [list, total] = await Promise.all([
      this.prisma.receivable.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
        },
      }),
      this.prisma.receivable.count({ where }),
    ]);

    return new PaginatedResult(list, total, query.page!, query.pageSize!);
  }

  /**
   * 查询单条应收记录
   */
  async findReceivableOne(id: number) {
    const receivable = await this.prisma.receivable.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });
    if (!receivable) {
      throw new NotFoundException('应收记录不存在');
    }
    return receivable;
  }

  /**
   * 创建应收
   */
  async createReceivable(dto: CreateReceivableDto) {
    return this.prisma.receivable.create({
      data: {
        customerId: dto.customerId,
        amount: dto.amount,
        paidAmount: 0,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: 'pending',
        source: dto.source,
        sourceNo: dto.sourceNo,
      },
      include: {
        customer: true,
      },
    });
  }

  /**
   * 还款
   */
  async payReceivable(id: number, amount: number, payMethod?: string, remark?: string) {
    const receivable = await this.prisma.receivable.findUnique({
      where: { id },
    });
    if (!receivable) {
      throw new NotFoundException('应收记录不存在');
    }
    if (receivable.status === 'paid') {
      throw new BadRequestException('该应收已结清');
    }

    const newPaidAmount = Number(receivable.paidAmount) + amount;
    const totalAmount = Number(receivable.amount);

    if (newPaidAmount > totalAmount) {
      throw new BadRequestException('还款金额超出应收金额');
    }

    const status = newPaidAmount >= totalAmount ? 'paid' : 'pending';

    // 同时创建一条收款记录，关联到该应收记录
    const updateData: any = {
      paidAmount: newPaidAmount,
      status,
    };

    const updated = await this.prisma.receivable.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
      },
    });

    // WebSocket 推送应收还款通知
    this.wsGateway?.notifyReceivablePaid({
      receivableId: id,
      customerName: updated.customer?.name || '-',
      amount,
    });

    // 记录还款操作，paymentRecord 没有 receivableId，用 remark 记录
    if (payMethod) {
      await this.prisma.paymentRecord.create({
        data: {
          paymentNo: `RPAY${Date.now()}`,
          customerId: receivable.customerId,
          type: 'repay',
          amount: amount,
          paymentMethod: payMethod,
          discount: 0,
          operatorId: 0,
          remark: remark || `应收还款 #${id}`,
          status: 'completed',
        },
      });
    }

    return updated;
  }

  /**
   * 编辑应收
   */
  async updateReceivable(id: number, dto: UpdateReceivableDto) {
    const receivable = await this.prisma.receivable.findUnique({ where: { id } });
    if (!receivable) {
      throw new NotFoundException('应收记录不存在');
    }
    return this.prisma.receivable.update({
      where: { id },
      data: {
        amount: dto.amount,
        source: dto.source,
        sourceNo: dto.sourceNo,
        status: dto.status,
      },
      include: { customer: true },
    });
  }

  /**
   * 删除应收
   */
  async deleteReceivable(id: number) {
    const receivable = await this.prisma.receivable.findUnique({ where: { id } });
    if (!receivable) {
      throw new NotFoundException('应收记录不存在');
    }
    return this.prisma.receivable.delete({ where: { id } });
  }

  /**
   * 应收汇总
   */
  async getReceivableSummary() {
    const receivables = await this.prisma.receivable.findMany({
      where: { status: { not: 'paid' } },
    });

    const totalAmount = receivables.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalPaid = receivables.reduce((sum, r) => sum + Number(r.paidAmount), 0);
    const totalUnpaid = totalAmount - totalPaid;

    // 计算逾期金额
    const now = new Date();
    let overdueAmount = 0;
    for (const r of receivables) {
      if (r.dueDate && new Date(r.dueDate) < now) {
        overdueAmount += Number(r.amount) - Number(r.paidAmount);
      }
    }

    return {
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalUnpaid: Math.round(totalUnpaid * 100) / 100,
      overdueAmount: Math.round(overdueAmount * 100) / 100,
      pendingCount: receivables.filter((r) => r.status === 'pending').length,
      overdueCount: receivables.filter(
        (r) => r.dueDate && new Date(r.dueDate) < now && r.status === 'pending',
      ).length,
    };
  }

  // ==================== 应付账款 ====================

  /**
   * 应付列表（支持筛选）
   */
  async findAllPayables(query: PayableQueryDto) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }
    if (query.startDate || query.endDate) {
      where.dueDate = {};
      if (query.startDate) {
        where.dueDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.dueDate.lte = new Date(query.endDate + ' 23:59:59');
      }
    }

    const [list, total] = await Promise.all([
      this.prisma.payable.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.payable.count({ where }),
    ]);

    return new PaginatedResult(list, total, query.page!, query.pageSize!);
  }

  /**
   * 应付详情
   */
  async findPayableOne(id: number) {
    const payable = await this.prisma.payable.findUnique({
      where: { id },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
      },
    });
    if (!payable) {
      throw new NotFoundException('应付记录不存在');
    }
    return payable;
  }

  /**
   * 创建应付
   */
  async createPayable(dto: CreatePayableDto) {
    return this.prisma.payable.create({
      data: {
        supplierId: dto.supplierId,
        amount: dto.amount,
        paidAmount: 0,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: 'pending',
        source: dto.source,
        sourceNo: dto.sourceNo,
      },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * 还款（支付应付）
   */
  async payPayable(id: number, amount: number) {
    const payable = await this.prisma.payable.findUnique({
      where: { id },
    });
    if (!payable) {
      throw new NotFoundException('应付记录不存在');
    }
    if (payable.status === 'paid') {
      throw new BadRequestException('该应付已结清');
    }

    const newPaidAmount = Number(payable.paidAmount) + amount;
    const totalAmount = Number(payable.amount);

    if (newPaidAmount > totalAmount) {
      throw new BadRequestException('付款金额超出应付金额');
    }

    const status = newPaidAmount >= totalAmount ? 'paid' : 'pending';

    const updated = await this.prisma.payable.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status,
      },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    // WebSocket 推送应付付款通知
    this.wsGateway?.notifyPayablePaid({
      payableId: id,
      supplierName: updated.supplier?.name || '-',
      amount,
    });

    return updated;
  }

  /**
   * 编辑应付
   */
  async updatePayable(id: number, dto: UpdatePayableDto) {
    const payable = await this.prisma.payable.findUnique({ where: { id } });
    if (!payable) {
      throw new NotFoundException('应付记录不存在');
    }
    return this.prisma.payable.update({
      where: { id },
      data: {
        amount: dto.amount,
        source: dto.source,
        sourceNo: dto.sourceNo,
        status: dto.status,
      },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * 删除应付
   */
  async deletePayable(id: number) {
    const payable = await this.prisma.payable.findUnique({ where: { id } });
    if (!payable) {
      throw new NotFoundException('应付记录不存在');
    }
    return this.prisma.payable.delete({ where: { id } });
  }

  /**
   * 应付汇总统计
   */
  async getPayableSummary() {
    const [aggregation, pendingCount] = await Promise.all([
      this.prisma.payable.aggregate({
        _sum: {
          amount: true,
          paidAmount: true,
        },
      }),
      this.prisma.payable.count({
        where: { status: 'pending' },
      }),
    ]);

    const totalAmount = Number(aggregation._sum.amount ?? 0);
    const totalPaid = Number(aggregation._sum.paidAmount ?? 0);
    const totalUnpaid = totalAmount - totalPaid;

    return {
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalUnpaid: Math.round(totalUnpaid * 100) / 100,
      pendingCount,
    };
  }

  // ==================== 费用管理 ====================

  /**
   * 记录费用
   */
  async createExpense(dto: CreateExpenseDto) {
    return this.prisma.expenseRecord.create({
      data: {
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
        operatorId: dto.operatorId,
      },
    });
  }

  /**
   * 费用列表
   */
  async findAllExpenses(query: ExpenseQueryDto) {
    const where: any = {};

    if (query.category) {
      where.category = query.category;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate + ' 23:59:59');
      }
    }

    const [list, total] = await Promise.all([
      this.prisma.expenseRecord.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.expenseRecord.count({ where }),
    ]);

    return new PaginatedResult(list, total, query.page!, query.pageSize!);
  }

  /**
   * 编辑费用
   */
  async updateExpense(id: number, dto: UpdateExpenseDto) {
    const expense = await this.prisma.expenseRecord.findUnique({ where: { id } });
    if (!expense) {
      throw new NotFoundException('费用记录不存在');
    }
    return this.prisma.expenseRecord.update({
      where: { id },
      data: {
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
      },
    });
  }

  /**
   * 删除费用
   */
  async deleteExpense(id: number) {
    const expense = await this.prisma.expenseRecord.findUnique({ where: { id } });
    if (!expense) {
      throw new NotFoundException('费用记录不存在');
    }
    return this.prisma.expenseRecord.delete({ where: { id } });
  }

  /**
   * 费用汇总
   */
  async getExpenseSummary(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + ' 23:59:59');
      }
    }

    const expenses = await this.prisma.expenseRecord.findMany({ where });

    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // 按类别汇总
    const byCategory: Record<string, number> = {};
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    }

    // 四舍五入
    for (const key of Object.keys(byCategory)) {
      byCategory[key] = Math.round(byCategory[key] * 100) / 100;
    }

    return {
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalCount: expenses.length,
      byCategory,
    };
  }

  // ==================== 利润分析 ====================

  /**
   * 利润汇总：收入(分类型)/成本/毛利/费用/净利润
   */
  async getProfitSummary(query: ProfitSummaryQueryDto) {
    const where: any = {};
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate + ' 23:59:59');
      }
    }

    const expenseWhere: any = {};
    if (query.startDate || query.endDate) {
      expenseWhere.createdAt = {};
      if (query.startDate) {
        expenseWhere.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        expenseWhere.createdAt.lte = new Date(query.endDate + ' 23:59:59');
      }
    }

    // 收入（按类型汇总）
    const payments = await this.prisma.paymentRecord.findMany({ where });

    const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const incomeByType: Record<string, number> = {};
    for (const p of payments) {
      incomeByType[p.type] = (incomeByType[p.type] || 0) + Number(p.amount);
    }
    for (const key of Object.keys(incomeByType)) {
      incomeByType[key] = Math.round(incomeByType[key] * 100) / 100;
    }

    // 费用
    const expenses = await this.prisma.expenseRecord.findMany({
      where: expenseWhere,
    });
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // 成本（采购金额）-- 从purchase_order中取已完成的采购单总金额作为成本近似
    const purchaseWhere: any = { status: 'completed' };
    if (query.startDate || query.endDate) {
      purchaseWhere.createdAt = {};
      if (query.startDate) {
        purchaseWhere.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        purchaseWhere.createdAt.lte = new Date(query.endDate + ' 23:59:59');
      }
    }

    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: purchaseWhere,
    });
    const totalCost = purchaseOrders.reduce(
      (sum, po) => sum + Number(po.totalAmount),
      0,
    );

    const grossProfit = totalIncome - totalCost;
    const netProfit = grossProfit - totalExpense;

    return {
      totalRevenue: Math.round(totalIncome * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      incomeByType,
      incomeCount: payments.length,
      expenseCount: expenses.length,
    };
  }

  /**
   * 近N天收入趋势
   */
  async getRevenueTrend(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const payments = await this.prisma.paymentRecord.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 按天汇总
    const dailyMap: Record<string, { revenue: number; cost: number; count: number }> = {};

    // 初始化所有日期
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { revenue: 0, cost: 0, count: 0 };
    }

    for (const p of payments) {
      const key = p.createdAt.toISOString().split('T')[0];
      if (dailyMap[key]) {
        dailyMap[key].revenue += Number(p.amount);
        dailyMap[key].count += 1;
      }
    }

    // 同期拉取费用（ExpenseRecord）
    const expenses = await this.prisma.expenseRecord.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });
    for (const e of expenses) {
      const key = e.createdAt.toISOString().split('T')[0];
      if (dailyMap[key]) {
        dailyMap[key].cost += Number(e.amount);
      }
    }

    return Object.entries(dailyMap).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      cost: Math.round(data.cost * 100) / 100,
      profit: Math.round((data.revenue - data.cost) * 100) / 100,
      count: data.count,
    }));
  }
}
