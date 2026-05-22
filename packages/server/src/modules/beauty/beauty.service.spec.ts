import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BeautyService } from './beauty.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WsGateway } from '../ws/ws.gateway';

describe('BeautyService', () => {
  let service: BeautyService;
  let prisma: any;

  const mockPrisma = {
    beautyService: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    beautyPackage: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    beautyAppointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    memberCard: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    memberCardRecharge: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const mockWs = {
      notifyNewCustomer: jest.fn(),
      notifyLowStock: jest.fn(),
      notifyNewRepairOrder: jest.fn(),
      notifyOrderStatusChange: jest.fn(),
      notifyNewBeautyAppointment: jest.fn(),
      notifyBeautyAppointmentStatusChange: jest.fn(),
      notifySystem: jest.fn(),
      server: { emit: jest.fn() },
      setNotificationService: jest.fn(),
      handleConnection: jest.fn(),
      handleDisconnect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BeautyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WsGateway, useValue: mockWs },
      ],
    }).compile();

    service = module.get<BeautyService>(BeautyService);
    prisma = mockPrisma;
  });

  // ==================== 服务项目管理 ====================

  describe('findAllServices', () => {
    it('应返回所有启用状态的美容服务', async () => {
      const services = [
        { id: 1, name: '全车镀晶', category: '漆面养护', price: 1980, status: 1 },
        { id: 2, name: '内饰精洗', category: '内饰清洁', price: 680, status: 1 },
      ];
      prisma.beautyService.findMany.mockResolvedValue(services);

      const result = await service.findAllServices();
      expect(result).toHaveLength(2);
      expect(prisma.beautyService.findMany).toHaveBeenCalledWith({
        where: { status: 1 },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('无服务时应返回空数组', async () => {
      prisma.beautyService.findMany.mockResolvedValue([]);

      const result = await service.findAllServices();
      expect(result).toEqual([]);
    });
  });

  describe('createService', () => {
    it('应成功创建美容服务', async () => {
      const dto = { name: '全车镀晶', category: '漆面养护', price: 1980, duration: 120 } as any;
      const created = { id: 1, ...dto, status: 1 };
      prisma.beautyService.create.mockResolvedValue(created);

      const result = await service.createService(dto);
      expect(result).toEqual(created);
      expect(prisma.beautyService.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('updateService', () => {
    it('应成功更新服务信息', async () => {
      const updated = { id: 1, name: '全车镀晶升级版', price: 2280 };
      prisma.beautyService.update.mockResolvedValue(updated);

      const result = await service.updateService(1, { name: '全车镀晶升级版', price: 2280 } as any);
      expect(result).toEqual(updated);
    });
  });

  describe('removeService', () => {
    it('应软删除服务（设 status 为 0）', async () => {
      prisma.beautyService.update.mockResolvedValue({ id: 1, status: 0 });

      await service.removeService(1);
      expect(prisma.beautyService.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 0 },
      });
    });
  });

  // ==================== 套餐管理 ====================

  describe('findAllPackages', () => {
    it('应返回所有启用状态的套餐，并防御性解析 items', async () => {
      const packages = [
        { id: 1, name: '漆面养护套餐', originalPrice: 2980, packagePrice: 1980, items: ['全车镀晶', '打蜡'], status: 1 },
        { id: 2, name: '内饰套餐', originalPrice: 1280, packagePrice: 880, items: '["内饰精洗","空调清洗"]', status: 1 },
      ];
      prisma.beautyPackage.findMany.mockResolvedValue(packages);

      const result = await service.findAllPackages();
      expect(result).toHaveLength(2);
      // 第二个套餐的 items 应该是 JSON 字符串被解析后的数组
      expect(Array.isArray(result[1].items)).toBe(true);
      expect(result[1].items).toEqual(['内饰精洗', '空调清洗']);
    });

    it('无套餐时应返回空数组', async () => {
      prisma.beautyPackage.findMany.mockResolvedValue([]);

      const result = await service.findAllPackages();
      expect(result).toEqual([]);
    });
  });

  describe('createPackage', () => {
    it('应成功创建套餐', async () => {
      const dto = { name: '漆面养护套餐', originalPrice: 2980, packagePrice: 1980, items: ['全车镀晶', '打蜡'] } as any;
      const created = { id: 1, ...dto, status: 1 };
      prisma.beautyPackage.create.mockResolvedValue(created);

      const result = await service.createPackage(dto);
      expect(result).toEqual(created);
    });
  });

  describe('updatePackage', () => {
    it('应成功更新套餐', async () => {
      const updated = { id: 1, name: '升级版养护套餐', packagePrice: 2280 };
      prisma.beautyPackage.update.mockResolvedValue(updated);

      const result = await service.updatePackage(1, { name: '升级版养护套餐', packagePrice: 2280 } as any);
      expect(result).toEqual(updated);
    });
  });

  describe('removePackage', () => {
    it('应软删除套餐（设 status 为 0）', async () => {
      prisma.beautyPackage.update.mockResolvedValue({ id: 1, status: 0 });

      await service.removePackage(1);
      expect(prisma.beautyPackage.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 0 },
      });
    });
  });

  // ==================== 预约施工 ====================

  describe('findAllAppointments', () => {
    it('应返回分页预约列表并防御性解析 items', async () => {
      const appointments = [
        { id: 1, status: 'pending', items: ['全车镀晶'], customer: { name: '张三' } },
        { id: 2, status: 'completed', items: '["内饰精洗"]', customer: { name: '李四' } },
      ];
      prisma.beautyAppointment.findMany.mockResolvedValue(appointments);
      prisma.beautyAppointment.count.mockResolvedValue(2);

      const result = await service.findAllAppointments({ page: '1', pageSize: '10' } as any);
      expect(result.list).toHaveLength(2);
      expect(Array.isArray(result.list[1].items)).toBe(true);
    });

    it('应支持按状态筛选', async () => {
      prisma.beautyAppointment.findMany.mockResolvedValue([]);
      prisma.beautyAppointment.count.mockResolvedValue(0);

      await service.findAllAppointments({ page: '1', pageSize: '10', status: 'pending' } as any);
      expect(prisma.beautyAppointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'pending' } }),
      );
    });

    it('应正确计算分页参数', async () => {
      prisma.beautyAppointment.findMany.mockResolvedValue([]);
      prisma.beautyAppointment.count.mockResolvedValue(0);

      await service.findAllAppointments({ page: '2', pageSize: '5' } as any);
      expect(prisma.beautyAppointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });
  });

  describe('createAppointment', () => {
    it('应创建预约并默认状态为 pending', async () => {
      const dto = { customerId: 1, serviceType: '漆面养护', totalAmount: 1980 } as any;
      const created = { id: 1, ...dto, status: 'pending' };
      prisma.beautyAppointment.create.mockResolvedValue(created);

      const result = await service.createAppointment(dto);
      expect(result.status).toBe('pending');
      expect(prisma.beautyAppointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'pending' }),
      });
    });
  });

  describe('updateAppointment', () => {
    it('应更新预约并返回最新记录', async () => {
      const updated = { id: 1, status: 'in_progress', totalAmount: 2280 };
      prisma.beautyAppointment.update.mockResolvedValue(updated);
      prisma.beautyAppointment.findUnique.mockResolvedValue(updated);

      const result = await service.updateAppointment(1, { totalAmount: 2280 } as any);
      expect(result).toEqual(updated);
      expect(prisma.beautyAppointment.update).toHaveBeenCalled();
      expect(prisma.beautyAppointment.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('updateAppointmentStatus', () => {
    it('应更新预约状态', async () => {
      const updated = { id: 1, status: 'in_progress' };
      prisma.beautyAppointment.update.mockResolvedValue(updated);

      const result = await service.updateAppointmentStatus(1, 'in_progress');
      expect(result).toEqual(updated);
    });

    it('状态为 completed 时应设置 endTime', async () => {
      const updated = { id: 1, status: 'completed', endTime: expect.any(Date) };
      prisma.beautyAppointment.update.mockResolvedValue(updated);

      await service.updateAppointmentStatus(1, 'completed');

      const callData = prisma.beautyAppointment.update.mock.calls[0][0].data;
      expect(callData.status).toBe('completed');
      expect(callData.endTime).toBeInstanceOf(Date);
    });
  });

  describe('removeAppointment', () => {
    it('应物理删除预约', async () => {
      prisma.beautyAppointment.delete.mockResolvedValue({ id: 1 });

      await service.removeAppointment(1);
      expect(prisma.beautyAppointment.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  // ==================== 会员卡 ====================

  describe('findAllCards', () => {
    it('应返回分页会员卡列表', async () => {
      const cards = [
        { id: 1, cardNo: 'CARD001', name: '张三', level: 1, discount: 0.95 },
        { id: 2, cardNo: 'CARD002', name: '李四', level: 2, discount: 0.9 },
      ];
      prisma.memberCard.findMany.mockResolvedValue(cards);
      prisma.memberCard.count.mockResolvedValue(2);

      const result = await service.findAllCards({ page: '1', pageSize: '20' } as any);
      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('应支持关键词搜索', async () => {
      prisma.memberCard.findMany.mockResolvedValue([]);
      prisma.memberCard.count.mockResolvedValue(0);

      await service.findAllCards({ keyword: '张三' } as any);

      expect(prisma.memberCard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { cardNo: { contains: '张三' } },
              { name: { contains: '张三' } },
            ],
          },
        }),
      );
    });
  });

  describe('findCardOne', () => {
    it('应返回会员卡详情', async () => {
      const card = { id: 1, cardNo: 'CARD001', name: '张三', level: 1, discount: 0.95 };
      prisma.memberCard.findUnique.mockResolvedValue(card);

      const result = await service.findCardOne(1);
      expect(result).toEqual(card);
    });

    it('会员卡不存在时应抛出 NotFoundException', async () => {
      prisma.memberCard.findUnique.mockResolvedValue(null);

      await expect(service.findCardOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findCardOne(999)).rejects.toThrow('会员卡 #999 不存在');
    });
  });

  describe('createCard', () => {
    it('应成功创建会员卡', async () => {
      const dto = { cardNo: 'CARD003', name: '王五', level: 1, discount: 0.95, minRecharge: 1000 } as any;
      const created = { id: 1, ...dto };
      prisma.memberCard.create.mockResolvedValue(created);

      const result = await service.createCard(dto);
      expect(result).toEqual(created);
    });
  });

  describe('removeCard', () => {
    it('应成功删除会员卡', async () => {
      prisma.memberCard.findUnique.mockResolvedValue({ id: 1, cardNo: 'CARD001' });
      prisma.memberCard.delete.mockResolvedValue({ id: 1 });

      await service.removeCard(1);
      expect(prisma.memberCard.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('会员卡不存在时应抛出 NotFoundException', async () => {
      prisma.memberCard.findUnique.mockResolvedValue(null);

      await expect(service.removeCard(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== 充值记录 ====================

  describe('findAllRecharges', () => {
    it('应返回分页充值记录', async () => {
      const recharges = [
        { id: 1, customerId: 1, amount: 2000, customer: { id: 1, name: '张三', phone: '13800138000' } },
      ];
      prisma.memberCardRecharge.findMany.mockResolvedValue(recharges);
      prisma.memberCardRecharge.count.mockResolvedValue(1);

      const result = await service.findAllRecharges({ page: '1', pageSize: '10' } as any);
      expect(result.list).toHaveLength(1);
      expect(result.list[0].amount).toBe(2000);
    });

    it('应支持按客户 ID 筛选', async () => {
      prisma.memberCardRecharge.findMany.mockResolvedValue([]);
      prisma.memberCardRecharge.count.mockResolvedValue(0);

      await service.findAllRecharges({ customerId: '1' } as any);

      expect(prisma.memberCardRecharge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: 1 } }),
      );
    });
  });

  describe('createRecharge', () => {
    it('应创建充值记录并增加客户余额', async () => {
      prisma.memberCardRecharge.findUnique = jest.fn();
      const recharge = { id: 1, customerId: 1, amount: 2000, paymentMethod: '微信支付' };
      const mockTx = {
        memberCardRecharge: { create: jest.fn().mockResolvedValue(recharge) },
        customer: { update: jest.fn().mockResolvedValue({ id: 1, balance: 5000 }) },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));

      const dto = { customerId: 1, amount: 2000, paymentMethod: '微信支付' } as any;
      const result = await service.createRecharge(dto);

      expect(result).toEqual(recharge);
      expect(mockTx.memberCardRecharge.create).toHaveBeenCalledWith({
        data: { customerId: 1, amount: 2000, paymentMethod: '微信支付' },
      });
      expect(mockTx.customer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { balance: { increment: 2000 } },
      });
    });
  });
});
