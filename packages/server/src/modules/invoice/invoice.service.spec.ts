import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      invoiceRecord: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  describe('findAll', () => {
    it('应返回分页发票列表', async () => {
      const mockList = [
        { id: 1, invoiceNo: 'INV20260520-001', type: 'vat', amount: '1000', status: 'issued', customer: { id: 1, name: '张三' } },
        { id: 2, invoiceNo: 'INV20260520-002', type: 'electronic', amount: '500', status: 'issued', customer: { id: 2, name: '李四' } },
      ];
      mockPrisma.invoiceRecord.findMany.mockResolvedValue(mockList);
      mockPrisma.invoiceRecord.count.mockResolvedValue(2);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      const result = await service.findAll(query);

      expect(result.list).toEqual(mockList);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('应按 type 筛选发票', async () => {
      mockPrisma.invoiceRecord.findMany.mockResolvedValue([]);
      mockPrisma.invoiceRecord.count.mockResolvedValue(0);

      const query = { type: 'vat', page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      await service.findAll(query);

      expect(mockPrisma.invoiceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'vat' }),
        }),
      );
    });

    it('应按 status 筛选发票', async () => {
      mockPrisma.invoiceRecord.findMany.mockResolvedValue([]);
      mockPrisma.invoiceRecord.count.mockResolvedValue(0);

      const query = { status: 'cancelled', page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      await service.findAll(query);

      expect(mockPrisma.invoiceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'cancelled' }),
        }),
      );
    });

    it('应按日期范围筛选发票', async () => {
      mockPrisma.invoiceRecord.findMany.mockResolvedValue([]);
      mockPrisma.invoiceRecord.count.mockResolvedValue(0);

      const query = { startDate: '2026-05-01', endDate: '2026-05-20', page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      await service.findAll(query);

      expect(mockPrisma.invoiceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-05-01'),
              lte: new Date('2026-05-20 23:59:59'),
            },
          }),
        }),
      );
    });

    it('应按 keyword 搜索发票号、关联单号和客户名', async () => {
      mockPrisma.invoiceRecord.findMany.mockResolvedValue([]);
      mockPrisma.invoiceRecord.count.mockResolvedValue(0);

      const query = { keyword: '张三', page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      await service.findAll(query);

      expect(mockPrisma.invoiceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { invoiceNo: { contains: '张三' } },
              { relatedNo: { contains: '张三' } },
              { customer: { name: { contains: '张三' } } },
            ],
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('应返回发票详情含客户信息', async () => {
      const mockInvoice = {
        id: 1,
        invoiceNo: 'INV20260520-001',
        type: 'vat',
        amount: '1000',
        customerId: 1,
        customer: { id: 1, name: '张三' },
      };
      mockPrisma.invoiceRecord.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.findOne(1);

      expect(result).toEqual(mockInvoice);
      expect(result.customer.name).toBe('张三');
    });

    it('不存在的 ID 应抛出 NotFoundException', async () => {
      mockPrisma.invoiceRecord.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('发票记录不存在');
    });
  });

  describe('create', () => {
    it('应成功创建发票记录', async () => {
      const mockInvoice = {
        id: 1,
        invoiceNo: 'INV20260520-001',
        type: 'vat',
        amount: 1000,
        customerId: 1,
        relatedNo: 'RO20260520-001',
        status: 'issued',
        customer: { id: 1, name: '张三' },
      };

      mockPrisma.invoiceRecord.findUnique
        .mockResolvedValueOnce(null) // 第一次调用：检查发票号不重复
        .mockResolvedValueOnce(null); // （不会被第二次调用）
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 1, name: '张三' });
      mockPrisma.invoiceRecord.create.mockResolvedValue(mockInvoice);

      const dto = {
        invoiceNo: 'INV20260520-001',
        type: 'vat',
        amount: 1000,
        customerId: 1,
        relatedNo: 'RO20260520-001',
      } as any;

      const result = await service.create(dto);

      expect(result).toEqual(mockInvoice);
      expect(mockPrisma.invoiceRecord.create).toHaveBeenCalled();
    });

    it('重复的 invoiceNo 应抛出 BadRequestException', async () => {
      mockPrisma.invoiceRecord.findUnique.mockResolvedValue({ id: 1, invoiceNo: 'INV20260520-001' });

      const dto = {
        invoiceNo: 'INV20260520-001',
        type: 'vat',
        amount: 1000,
        customerId: 1,
        relatedNo: 'RO20260520-001',
      } as any;

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow('发票号 INV20260520-001 已存在');
    });

    it('客户不存在时应抛出 NotFoundException', async () => {
      mockPrisma.invoiceRecord.findUnique.mockResolvedValue(null);
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      const dto = {
        invoiceNo: 'INV20260520-002',
        type: 'electronic',
        amount: 500,
        customerId: 999,
        relatedNo: 'RO20260520-002',
      } as any;

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      await expect(service.create(dto)).rejects.toThrow('客户不存在');
    });
  });

  describe('cancel', () => {
    it('应成功作废发票', async () => {
      mockPrisma.invoiceRecord.findUnique.mockResolvedValue({
        id: 1,
        invoiceNo: 'INV20260520-001',
        status: 'issued',
      });
      mockPrisma.invoiceRecord.update.mockResolvedValue({
        id: 1,
        invoiceNo: 'INV20260520-001',
        status: 'cancelled',
        customer: { id: 1, name: '张三' },
      });

      const result = await service.cancel(1);

      expect(result.status).toBe('cancelled');
      expect(mockPrisma.invoiceRecord.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'cancelled' },
        include: { customer: { select: { id: true, name: true } } },
      });
    });

    it('不存在的 ID 应抛出 NotFoundException', async () => {
      mockPrisma.invoiceRecord.findUnique.mockResolvedValue(null);

      await expect(service.cancel(999)).rejects.toThrow(NotFoundException);
      await expect(service.cancel(999)).rejects.toThrow('发票记录不存在');
    });

    it('已作废的发票应抛出 BadRequestException', async () => {
      mockPrisma.invoiceRecord.findUnique.mockResolvedValue({
        id: 1,
        invoiceNo: 'INV20260520-001',
        status: 'cancelled',
      });

      await expect(service.cancel(1)).rejects.toThrow(BadRequestException);
      await expect(service.cancel(1)).rejects.toThrow('该发票已作废，无需重复操作');
    });
  });

  describe('getStats', () => {
    it('应返回发票统计数据', async () => {
      mockPrisma.invoiceRecord.findMany.mockResolvedValue([
        { id: 1, status: 'issued', amount: '1000' },
        { id: 2, status: 'issued', amount: '500' },
        { id: 3, status: 'cancelled', amount: '200' },
      ]);
      mockPrisma.invoiceRecord.count
        .mockResolvedValueOnce(2) // 本月已开票
        .mockResolvedValueOnce(1); // 已作废

      const result = await service.getStats();

      expect(result.totalCount).toBe(3);
      expect(result.totalAmount).toBe(1500);
      expect(result.thisMonthCount).toBe(2);
      expect(result.cancelledCount).toBe(1);
    });
  });
});
