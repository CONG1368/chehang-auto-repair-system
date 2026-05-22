import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from './finance.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FinanceService', () => {
  let service: FinanceService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      paymentRecord: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      receivable: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      expenseRecord: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      payable: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      purchaseOrder: {
        findMany: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
  });

  describe('findAllPayments', () => {
    it('应返回分页收款记录', async () => {
      mockPrisma.paymentRecord.findMany.mockResolvedValue([
        { id: 1, paymentNo: 'PAY20260520-001', amount: 1000, type: 'repair' },
      ]);
      mockPrisma.paymentRecord.count.mockResolvedValue(1);

      const result = await service.findAllPayments({ page: 1, pageSize: 10 } as any);
      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('createPayment', () => {
    it('应创建收款记录并自动生成单号', async () => {
      mockPrisma.paymentRecord.count.mockResolvedValue(0);
      mockPrisma.paymentRecord.create.mockResolvedValue({
        id: 1,
        paymentNo: 'PAY20260521-001',
        amount: 500,
        type: 'beauty',
        customerId: 1,
        paymentMethod: 'cash',
        operatorId: 1,
      });

      const result = await service.createPayment({
        customerId: 1,
        type: 'beauty',
        amount: 500,
        paymentMethod: 'cash',
        operatorId: 1,
      });
      expect(result.paymentNo).toContain('PAY');
    });
  });

  describe('payReceivable', () => {
    it('还款金额等于剩余时应将状态改为 paid', async () => {
      mockPrisma.receivable.findUnique.mockResolvedValue({
        id: 1, amount: 1000, paidAmount: 500, status: 'pending',
      });
      mockPrisma.receivable.update.mockResolvedValue({});
      mockPrisma.paymentRecord.create.mockResolvedValue({});
      mockPrisma.paymentRecord.count.mockResolvedValue(1);

      await service.payReceivable(1, 500);
      expect(mockPrisma.receivable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'paid' }),
        }),
      );
    });
  });

  describe('getProfitSummary', () => {
    it('应返回利润汇总数据', async () => {
      mockPrisma.paymentRecord.findMany.mockResolvedValue([
        { amount: 1000, type: 'repair' },
        { amount: 500, type: 'beauty' },
      ]);
      mockPrisma.expenseRecord.findMany.mockResolvedValue([
        { amount: 300 },
      ]);
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([
        { totalAmount: 400 },
      ]);

      const result = await service.getProfitSummary({});
      expect(result.totalRevenue).toBe(1500);
      expect(result.totalExpense).toBe(300);
      expect(result.totalCost).toBe(400);
    });
  });
});
