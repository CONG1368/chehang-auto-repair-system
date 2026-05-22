import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      notification: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('findAll', () => {
    it('应返回分页通知列表', async () => {
      const mockList = [
        { id: 1, title: '通知1', content: '内容1', type: 'system', isRead: false },
        { id: 2, title: '通知2', content: '内容2', type: 'repair', isRead: true },
      ];
      mockPrisma.notification.findMany.mockResolvedValue(mockList);
      mockPrisma.notification.count.mockResolvedValue(2);

      const result = await service.findAll({ userId: 1, page: 1, pageSize: 10 } as any);

      expect(result.list).toEqual(mockList);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('应按 type 筛选通知', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findAll({ userId: 1, type: 'system' } as any);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'system' }),
        }),
      );
    });

    it('isRead=true 时应筛选已读通知', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findAll({ userId: 1, isRead: true } as any);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: true }),
        }),
      );
    });

    it('isRead=false 时应筛选未读通知', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findAll({ userId: 1, isRead: false } as any);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: false }),
        }),
      );
    });

    it('isRead 为 undefined 时不应添加 isRead 筛选条件', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findAll({ userId: 1 } as any);

      const callArgs = mockPrisma.notification.findMany.mock.calls[0][0];
      expect(callArgs.where.isRead).toBeUndefined();
    });

    it('isRead 为空字符串时不应添加 isRead 筛选条件', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findAll({ userId: 1, isRead: '' } as any);

      const callArgs = mockPrisma.notification.findMany.mock.calls[0][0];
      expect(callArgs.where.isRead).toBeUndefined();
    });

    it('未传 page 时应使用默认值 1', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.findAll({ userId: 1 } as any);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('应返回未读通知数量', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(1);

      expect(result).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: {
          OR: [{ userId: 1 }, { userId: null }],
          isRead: false,
        },
      });
    });
  });

  describe('markRead', () => {
    it('应标记单条通知为已读', async () => {
      const mockNotification = { id: 1, isRead: true, readAt: new Date('2026-05-20') };
      mockPrisma.notification.update.mockResolvedValue(mockNotification);

      const result = await service.markRead(1);

      expect(result).toEqual(mockNotification);
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('markAllRead', () => {
    it('应标记全部通知为已读', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      await service.markAllRead(1);

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [{ userId: 1 }, { userId: null }],
          isRead: false,
        },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('create', () => {
    it('应创建通知记录', async () => {
      const mockNotification = { id: 1, title: '测试通知', content: '测试内容', type: 'system' };
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.create({
        userId: 1,
        type: 'system',
        title: '测试通知',
        content: '测试内容',
      });

      expect(result).toEqual(mockNotification);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          type: 'system',
          title: '测试通知',
          content: '测试内容',
        },
      });
    });

    it('应支持创建不指定 userId 的通知', async () => {
      const mockNotification = { id: 2, title: '全局通知', content: '内容' };
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await service.create({ type: 'system', title: '全局通知', content: '内容' });

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          type: 'system',
          title: '全局通知',
          content: '内容',
        },
      });
    });
  });
});
