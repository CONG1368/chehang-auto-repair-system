import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      auditLog: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('log', () => {
    it('应创建审计日志记录', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 1 });

      await service.log({
        userId: 1,
        action: 'create',
        module: 'repair',
        targetId: 100,
        targetName: 'RO20260520-001',
        detail: '创建维修工单',
        ip: '127.0.0.1',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          action: 'create',
          module: 'repair',
          targetId: 100,
          targetName: 'RO20260520-001',
          detail: '创建维修工单',
          ip: '127.0.0.1',
        },
      });
    });

    it('应支持创建部分字段的日志', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 2 });

      await service.log({
        userId: 2,
        action: 'login',
        module: 'auth',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 2,
          action: 'login',
          module: 'auth',
        },
      });
    });
  });

  describe('findAll', () => {
    it('应返回分页日志列表', async () => {
      const mockList = [
        {
          id: 1,
          userId: 1,
          module: 'repair',
          action: 'create',
          targetName: '工单1',
          createdAt: new Date('2026-05-20'),
          user: { id: 1, realName: '管理员', username: 'admin' },
        },
      ];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockList);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, pageSize: 20 });

      expect(result.list).toEqual(mockList);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('应按 userId 筛选日志', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({ userId: 3, page: 1, pageSize: 20 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 3 }),
        }),
      );
    });

    it('应按 module 筛选日志', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({ module: 'inventory', page: 1, pageSize: 20 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ module: 'inventory' }),
        }),
      );
    });

    it('应按 action 筛选日志', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({ action: 'delete', page: 1, pageSize: 20 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'delete' }),
        }),
      );
    });

    it('应按日期范围筛选日志', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({
        startDate: '2026-05-01',
        endDate: '2026-05-20',
        page: 1,
        pageSize: 20,
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-05-01'),
              lte: new Date('2026-05-20T23:59:59'),
            },
          }),
        }),
      );
    });

    it('应在查询中包含关联的 user 信息', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.findAll({ page: 1, pageSize: 20 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { user: { select: { id: true, realName: true, username: true } } },
        }),
      );
    });
  });

  describe('getStats', () => {
    it('应返回今日操作数和模块统计', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(15);
      mockPrisma.auditLog.groupBy.mockResolvedValue([
        { module: 'repair', _count: 5 },
        { module: 'inventory', _count: 4 },
        { module: 'customer', _count: 3 },
      ]);

      const result = await service.getStats();

      expect(result.todayCount).toBe(15);
      expect(result.topActions).toEqual([
        { module: 'repair', _count: 5 },
        { module: 'inventory', _count: 4 },
        { module: 'customer', _count: 3 },
      ]);
    });

    it('今日无操作时应返回 0', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.auditLog.groupBy.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.todayCount).toBe(0);
      expect(result.topActions).toEqual([]);
    });
  });
});
