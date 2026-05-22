import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WsGateway } from '../ws/ws.gateway';

describe('CustomerService', () => {
  let service: CustomerService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      customer: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      customerVehicle: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      followRecord: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      repairOrder: {
        findMany: jest.fn(),
      },
      paymentRecord: {
        findMany: jest.fn(),
      },
    };

    const mockRedis = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
    };

    const mockWs = {
      notifyNewCustomer: jest.fn(),
      notifyLowStock: jest.fn(),
      notifyNewRepairOrder: jest.fn(),
      notifyOrderStatusChange: jest.fn(),
      notifySystem: jest.fn(),
      server: { emit: jest.fn() },
      setNotificationService: jest.fn(),
      handleConnection: jest.fn(),
      handleDisconnect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: WsGateway, useValue: mockWs },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
  });

  describe('findAll', () => {
    it('应返回分页客户列表', async () => {
      const mockCustomers = [
        { id: 1, name: '张三', phone: '13800000001', status: 1 },
        { id: 2, name: '李四', phone: '13800000002', status: 1 },
      ];
      mockPrisma.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrisma.customer.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, pageSize: 10 } as any);
      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('应按关键词搜索客户', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.customer.count.mockResolvedValue(0);

      await service.findAll({ keyword: '张三', page: 1, pageSize: 10 } as any);
      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('应返回单个客户详情', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 1, name: '张三', phone: '13800000001', gender: 1,
        vehicles: [], followRecords: [], repairOrders: [], paymentRecords: [],
      });

      const result = await service.findOne(1);
      expect(result).toBeDefined();
      expect(result.name).toBe('张三');
    });

    it('客户不存在时应抛出异常', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('应创建客户', async () => {
      const dto = { name: '新客户', phone: '13900000000' };
      mockPrisma.customer.create.mockResolvedValue({ id: 3, ...dto, status: 1 });

      const result = await service.create(dto as any);
      expect(result.name).toBe('新客户');
    });
  });
});
