import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

describe('ReportService', () => {
  let service: ReportService;
  let prisma: any;
  let redis: any;

  const mockRedis = {
    getJson: jest.fn(),
    setJson: jest.fn(),
  };

  const mockPrisma = {
    paymentRecord: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    repairOrder: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    customer: {
      count: jest.fn(),
    },
    part: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    partStock: {
      aggregate: jest.fn(),
    },
    vehicleInfo: {
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    prisma = mockPrisma;
    redis = mockRedis;
  });

  // ==================== 经营驾驶舱汇总 ====================

  describe('getDashboardSummary', () => {
    it('应从数据库查询并返回驾驶舱汇总数据', async () => {
      prisma.paymentRecord.aggregate.mockResolvedValue({ _sum: { amount: 56800 }, _count: 12 });
      prisma.repairOrder.count
        .mockResolvedValueOnce(8)  // inRepair
        .mockResolvedValueOnce(5); // todayOrders
      prisma.customer.count.mockResolvedValue(3);

      const result = await service.getDashboardSummary();

      expect(result).toEqual({
        todayRevenue: 56800,
        todayOrderCount: 5,
        inRepairCount: 8,
        newCustomerCount: 3,
      });
    });

    it('没有收款记录时 todayRevenue 应为 0', async () => {
      prisma.paymentRecord.aggregate.mockResolvedValue({ _sum: { amount: null }, _count: 0 });
      prisma.repairOrder.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prisma.customer.count.mockResolvedValue(0);

      const result = await service.getDashboardSummary();

      expect(result.todayRevenue).toBe(0);
      expect(result.todayOrderCount).toBe(0);
    });

    it('有 Redis 缓存时应直接返回缓存数据', async () => {
      const cachedData = { todayRevenue: 99999, todayOrderCount: 10, inRepairCount: 5, newCustomerCount: 8 };
      redis.getJson.mockResolvedValue(cachedData);

      const result = await service.getDashboardSummary();

      expect(result).toEqual(cachedData);
      // 命中缓存后不应查询数据库
      expect(prisma.paymentRecord.aggregate).not.toHaveBeenCalled();
    });

    it('缓存未命中时查库后将结果写入 Redis', async () => {
      prisma.paymentRecord.aggregate.mockResolvedValue({ _sum: { amount: 5000 }, _count: 2 });
      prisma.repairOrder.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
      prisma.customer.count.mockResolvedValue(2);

      await service.getDashboardSummary();

      expect(redis.setJson).toHaveBeenCalledWith('dashboard:data', expect.any(Object), 300);
    });

    it('无 Redis 服务时应正常工作（仅查库）', async () => {
      // 创建一个不带 redis 的 service 实例：注入 null
      const moduleNoRedis: TestingModule = await Test.createTestingModule({
        providers: [
          ReportService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: RedisService, useValue: null },
        ],
      }).compile();
      const serviceNoRedis = moduleNoRedis.get<ReportService>(ReportService);

      prisma.paymentRecord.aggregate.mockResolvedValue({ _sum: { amount: 1000 }, _count: 1 });
      prisma.repairOrder.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
      prisma.customer.count.mockResolvedValue(0);

      const result = await serviceNoRedis.getDashboardSummary();
      expect(result.todayRevenue).toBe(1000);
    });
  });

  // ==================== 营收趋势 ====================

  describe('getRevenueTrend', () => {
    it('应返回默认 30 天的营收趋势', async () => {
      const payments = [
        { amount: 1000, createdAt: new Date() },
        { amount: 2000, createdAt: new Date() },
      ];
      prisma.paymentRecord.findMany.mockResolvedValue(payments);

      const result = await service.getRevenueTrend();
      expect(result).toHaveLength(30);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('amount');
    });

    it('应支持自定义天数', async () => {
      prisma.paymentRecord.findMany.mockResolvedValue([]);

      const result = await service.getRevenueTrend(7);
      expect(result).toHaveLength(7);
    });

    it('无收款记录时所有天金额应为 0', async () => {
      prisma.paymentRecord.findMany.mockResolvedValue([]);

      const result = await service.getRevenueTrend(3);
      expect(result).toHaveLength(3);
      expect(result.every((item: any) => item.amount === 0)).toBe(true);
    });
  });

  // ==================== 业务占比 ====================

  describe('getBusinessRatio', () => {
    it('应返回维修、销售、美容三类业务占比', async () => {
      prisma.paymentRecord.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 50000 } })   // 维修
        .mockResolvedValueOnce({ _sum: { amount: 30000 } })   // 销售
        .mockResolvedValueOnce({ _sum: { amount: 20000 } });  // 美容

      const result = await service.getBusinessRatio();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('维修');
      expect(result[0].value).toBe(50000);
      expect(result[1].name).toBe('销售');
      expect(result[2].name).toBe('美容');
    });

    it('某类业务无数据时金额应为 0', async () => {
      prisma.paymentRecord.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });

      const result = await service.getBusinessRatio();

      expect(result.every((item: any) => item.value === 0)).toBe(true);
    });
  });

  // ==================== 销售分析 ====================

  describe('getSalesStats', () => {
    it('应按品牌统计已售车辆', async () => {
      const vehicleStats = [
        { brand: '丰田', _count: 15 },
        { brand: '本田', _count: 10 },
      ];
      prisma.vehicleInfo.groupBy.mockResolvedValue(vehicleStats);

      const result = await service.getSalesStats();
      expect(result.vehicleStats).toHaveLength(2);
      expect(result.vehicleStats[0].brand).toBe('丰田');
      expect(result.vehicleStats[0]._count).toBe(15);
    });
  });

  // ==================== 维修分析 ====================

  describe('getRepairStats', () => {
    it('应返回维修工单统计', async () => {
      prisma.repairOrder.count.mockResolvedValue(100);
      prisma.repairOrder.groupBy.mockResolvedValue([
        { status: 'completed', _count: 80 },
        { status: 'repairing', _count: 15 },
        { status: 'pending', _count: 5 },
      ]);

      const result = await service.getRepairStats();
      expect(result.totalOrders).toBe(100);
      expect(result.completionRate).toBe(80);
      expect(result.byStatus).toHaveLength(3);
    });

    it('总工单为 0 时完工率应为 0', async () => {
      prisma.repairOrder.count.mockResolvedValue(0);
      prisma.repairOrder.groupBy.mockResolvedValue([]);

      const result = await service.getRepairStats();
      expect(result.totalOrders).toBe(0);
      expect(result.completionRate).toBe(0);
    });

    it('应支持时间范围筛选', async () => {
      prisma.repairOrder.count.mockResolvedValue(0);
      prisma.repairOrder.groupBy.mockResolvedValue([]);

      await service.getRepairStats('2026-01-01', '2026-05-01');

      expect(prisma.repairOrder.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        },
      });
    });
  });

  // ==================== 客户分析 ====================

  describe('getCustomerStats', () => {
    it('应返回客户统计数据', async () => {
      prisma.customer.count
        .mockResolvedValueOnce(500)   // total
        .mockResolvedValueOnce(120);   // activeThisMonth

      const result = await service.getCustomerStats();
      expect(result.totalCustomers).toBe(500);
      expect(result.activeCustomers).toBe(120);
    });
  });

  // ==================== 库存分析 ====================

  describe('getInventoryStats', () => {
    it('应返回库存分析数据', async () => {
      prisma.part.count.mockResolvedValue(200);
      prisma.partStock.aggregate.mockResolvedValue({ _sum: { quantity: 5000 } });
      prisma.part.findMany.mockResolvedValue([
        {
          id: 1, code: 'P001', name: '机油滤芯', safetyStock: 20, spec: '5W-30',
          stock: { quantity: 5 },
        },
        {
          id: 2, code: 'P002', name: '刹车片', safetyStock: 10, spec: '前轮',
          stock: { quantity: 50 },
        },
      ]);

      const result = await service.getInventoryStats();

      expect(result.totalParts).toBe(200);
      expect(result.totalStockQuantity).toBe(5000);
      expect(result.lowStockCount).toBe(1);
      expect(result.lowStockParts[0].name).toBe('机油滤芯');
    });

    it('无低库存配件时应返回空数组', async () => {
      prisma.part.count.mockResolvedValue(100);
      prisma.partStock.aggregate.mockResolvedValue({ _sum: { quantity: 3000 } });
      prisma.part.findMany.mockResolvedValue([
        {
          id: 1, code: 'P002', name: '刹车片', safetyStock: 5, spec: '前轮',
          stock: { quantity: 50 },
        },
      ]);

      const result = await service.getInventoryStats();
      expect(result.lowStockCount).toBe(0);
      expect(result.lowStockParts).toHaveLength(0);
    });
  });

  // ==================== 最近收款记录 ====================

  describe('getRecentPayments', () => {
    it('应返回最近 N 条收款记录', async () => {
      const records = [
        {
          id: 1, paymentNo: 'PMT20260521-001', type: 'repair', amount: 3500,
          paymentMethod: '微信支付', createdAt: new Date(),
          customer: { name: '张三', phone: '13800138000' },
        },
      ];
      prisma.paymentRecord.findMany.mockResolvedValue(records);

      const result = await service.getRecentPayments();
      expect(result).toHaveLength(1);
      expect(result[0].customerName).toBe('张三');
      expect(result[0].paymentMethod).toBe('微信支付');
    });

    it('应支持自定义返回条数', async () => {
      prisma.paymentRecord.findMany.mockResolvedValue([]);

      await service.getRecentPayments(10);
      expect(prisma.paymentRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('无关联客户时应返回空字符串', async () => {
      const records = [
        {
          id: 1, paymentNo: 'PMT001', type: 'repair', amount: 1000,
          paymentMethod: '现金', createdAt: new Date(),
          customer: null,
        },
      ];
      prisma.paymentRecord.findMany.mockResolvedValue(records);

      const result = await service.getRecentPayments();
      expect(result[0].customerName).toBe('');
    });
  });
});
