import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from './export.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('exceljs', () => ({
  Workbook: jest.fn().mockImplementation(() => ({
    addWorksheet: jest.fn().mockReturnValue({
      columns: [],
      addRows: jest.fn(),
    }),
    xlsx: { write: jest.fn() },
  })),
}));

describe('ExportService', () => {
  let service: ExportService;
  let mockPrisma: any;
  let mockRes: any;

  beforeEach(async () => {
    mockPrisma = {
      customer: { findMany: jest.fn() },
      part: { findMany: jest.fn() },
      repairOrder: { findMany: jest.fn() },
      salesOrder: { findMany: jest.fn() },
      beautyAppointment: { findMany: jest.fn() },
      paymentRecord: { findMany: jest.fn() },
      expenseRecord: { findMany: jest.fn() },
      receivable: { findMany: jest.fn() },
      payable: { findMany: jest.fn() },
      memberCard: { findMany: jest.fn() },
    };

    mockRes = {
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
  });

  describe('customers 模块导出', () => {
    it('应设置客户 columns 并调用 customer.findMany', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([
        { name: '张三', phone: '13800001111', gender: '男', address: '深圳市', totalSpent: 5000, lastVisitTime: new Date('2026-05-20') },
      ]);

      await service.exportExcel(mockRes, 'customers', {});

      expect(mockPrisma.customer.findMany).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalled();
    });
  });

  describe('parts 模块导出', () => {
    it('应设置配件 columns 并调用 part.findMany', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        { code: 'P001', name: '机油滤芯', spec: 'A型', price: 50, status: 1, category: { name: '滤芯' }, stock: { quantity: 20 }, safetyStock: 5, categoryName: undefined, currentStock: undefined },
      ]);

      await service.exportExcel(mockRes, 'parts', {});

      expect(mockPrisma.part.findMany).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalled();
    });
  });

  describe('repair 模块导出', () => {
    it('应设置维修 columns 并调用 repairOrder.findMany', async () => {
      mockPrisma.repairOrder.findMany.mockResolvedValue([
        { orderNo: 'RO20260520-001', customerName: '李四', plateNumber: '苏A12345', status: 'completed', totalLaborFee: 200, totalPartFee: 300, totalAmount: 500, createdAt: new Date('2026-05-20') },
      ]);

      await service.exportExcel(mockRes, 'repair', {});

      expect(mockPrisma.repairOrder.findMany).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalled();
    });
  });

  describe('sales 模块导出', () => {
    it('应设置销售 columns 并调用 salesOrder.findMany', async () => {
      mockPrisma.salesOrder.findMany.mockResolvedValue([
        { orderNo: 'SO20260520-001', customerName: undefined, vehicleInfo: '奥迪A6', salePrice: 300000, status: 'completed', customer: { name: '王五' }, createdAt: new Date('2026-05-20') },
      ]);

      await service.exportExcel(mockRes, 'sales', {});

      expect(mockPrisma.salesOrder.findMany).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalled();
    });
  });

  describe('beauty 模块导出', () => {
    it('应设置美容预约 columns 并调用 beautyAppointment.findMany', async () => {
      mockPrisma.beautyAppointment.findMany.mockResolvedValue([
        { customerName: undefined, serviceType: '洗车', totalAmount: '99', status: 'completed', customer: { name: '赵六' }, startTime: new Date('2026-05-20'), createdAt: new Date('2026-05-20') },
      ]);

      await service.exportExcel(mockRes, 'beauty', {});

      expect(mockPrisma.beautyAppointment.findMany).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalled();
    });
  });

  describe('finance 模块导出', () => {
    it('应设置财务 columns 并调用 paymentRecord.findMany', async () => {
      mockPrisma.paymentRecord.findMany.mockResolvedValue([
        { paymentNo: 'PAY20260520-001', customerName: undefined, type: '维修收款', amount: '500', paymentMethod: '微信', status: 'paid', customer: { name: '孙七' }, createdAt: new Date('2026-05-20') },
      ]);

      await service.exportExcel(mockRes, 'finance', {});

      expect(mockPrisma.paymentRecord.findMany).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalled();
    });
  });

  describe('inventory_stock 模块导出', () => {
    it('应设置库存 columns 并调用 part.findMany', async () => {
      mockPrisma.part.findMany.mockResolvedValue([
        { code: 'P002', name: '刹车片', spec: '标准', price: '200', category: { name: '制动' }, stock: { quantity: 30 }, safetyStock: 10, shelfLocation: 'A-01', status: 1, categoryName: undefined, quantity: undefined },
      ]);

      await service.exportExcel(mockRes, 'inventory_stock', {});

      expect(mockPrisma.part.findMany).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalled();
    });
  });

  describe('beauty_cards 模块导出', () => {
    it('应设置会员卡 columns 并调用 memberCard.findMany', async () => {
      mockPrisma.memberCard.findMany.mockResolvedValue([
        { cardNo: 'MC20260520-001', name: '金卡', level: 'VIP', discount: '0.85', minRecharge: '1000', status: 1 },
      ]);

      await service.exportExcel(mockRes, 'beauty_cards', {});

      expect(mockPrisma.memberCard.findMany).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalled();
    });
  });

  describe('report 模块导出', () => {
    it('应汇总四类财务数据并导出', async () => {
      mockPrisma.paymentRecord.findMany.mockResolvedValue([
        { amount: 500, remark: '维修收款', paymentMethod: '微信', createdAt: new Date('2026-05-20') },
      ]);
      mockPrisma.expenseRecord.findMany.mockResolvedValue([
        { amount: 200, description: '采购配件', category: '采购支出', createdAt: new Date('2026-05-19') },
      ]);
      mockPrisma.receivable.findMany.mockResolvedValue([
        { amount: 1000, source: '维修挂账', sourceNo: 'RO-001', status: 'pending', createdAt: new Date('2026-05-18') },
      ]);
      mockPrisma.payable.findMany.mockResolvedValue([
        { amount: 800, source: '配件采购', sourceNo: 'PO-001', status: 'pending', createdAt: new Date('2026-05-17') },
      ]);

      await service.exportExcel(mockRes, 'report', {});

      expect(mockPrisma.paymentRecord.findMany).toHaveBeenCalled();
      expect(mockPrisma.expenseRecord.findMany).toHaveBeenCalled();
      expect(mockPrisma.receivable.findMany).toHaveBeenCalled();
      expect(mockPrisma.payable.findMany).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalled();
    });
  });

  describe('默认分支', () => {
    it('未知模块且有 rows 时应调用 JSON.parse 并 addRows', async () => {
      const rows = JSON.stringify([{ label: '测试项', value: 100 }]);

      await service.exportExcel(mockRes, 'unknown_module', { rows });

      expect(mockRes.setHeader).toHaveBeenCalled();
    });

    it('未知模块且无 rows 时不应报错', async () => {
      await service.exportExcel(mockRes, 'unknown_module', {});

      expect(mockRes.setHeader).toHaveBeenCalled();
    });
  });
});
