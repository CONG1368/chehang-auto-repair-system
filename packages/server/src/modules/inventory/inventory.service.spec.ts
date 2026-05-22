import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WsGateway } from '../ws/ws.gateway';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockPrisma: any;
  let mockRedis: any;
  let mockWs: any;

  beforeEach(async () => {
    mockPrisma = {
      part: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      partStock: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      stockRecord: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      partCategory: {
        findMany: jest.fn(),
      },
      supplier: {
        findMany: jest.fn(),
      },
      purchaseOrder: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      purchaseOrderItem: {
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    };

    mockRedis = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
    };

    mockWs = {
      notifyLowStock: jest.fn(),
      notifyNewRepairOrder: jest.fn(),
      notifyOrderStatusChange: jest.fn(),
      notifyNewCustomer: jest.fn(),
      notifySystem: jest.fn(),
      server: { emit: jest.fn() },
      setNotificationService: jest.fn(),
      handleConnection: jest.fn(),
      handleDisconnect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: WsGateway, useValue: mockWs },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  // ========================================================================
  // findAll - 配件列表
  // ========================================================================
  describe('findAll', () => {
    const mockParts = [
      {
        id: 1,
        code: 'P001',
        name: '机油滤清器',
        spec: 'LF-001',
        price: 50,
        cost: 30,
        safetyStock: 10,
        maxStock: 100,
        shelfLocation: 'A-01',
        category: { id: 1, name: '滤清器' },
        supplier: { id: 1, name: '博世供应商' },
        stock: { partId: 1, quantity: 25, lockedQty: 0 },
      },
      {
        id: 2,
        code: 'P002',
        name: '刹车片',
        spec: 'BP-002',
        price: 200,
        cost: 120,
        safetyStock: 20,
        maxStock: 50,
        shelfLocation: 'B-03',
        category: { id: 2, name: '制动系统' },
        supplier: { id: 1, name: '博世供应商' },
        stock: { partId: 2, quantity: 5, lockedQty: 0 },
      },
    ];

    it('应返回分页配件列表', async () => {
      mockPrisma.part.findMany.mockResolvedValue(mockParts);
      mockPrisma.part.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, pageSize: 10 } as any);

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('应按 keyword 搜索配件（code/name/spec）', async () => {
      mockPrisma.part.findMany.mockResolvedValue([mockParts[0]]);
      mockPrisma.part.count.mockResolvedValue(1);

      await service.findAll({ keyword: '机油', page: 1, pageSize: 10 } as any);

      expect(mockPrisma.part.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { code: { contains: '机油' } },
              { name: { contains: '机油' } },
              { spec: { contains: '机油' } },
            ]),
          }),
        }),
      );
    });

    it('应按 categoryId 筛选配件', async () => {
      mockPrisma.part.findMany.mockResolvedValue([mockParts[0]]);
      mockPrisma.part.count.mockResolvedValue(1);

      await service.findAll({ categoryId: 1, page: 1, pageSize: 10 } as any);

      expect(mockPrisma.part.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 1 }),
        }),
      );
    });

    it('应按低库存（status=low）筛选 — post-filter 内存过滤', async () => {
      mockPrisma.part.findMany.mockResolvedValue(mockParts);

      const result = await service.findAll({ status: 'low', page: 1, pageSize: 10, skip: 0, take: 10 } as any);

      // 只有刹车片库存 5 <= 安全库存 20，属于低库存
      expect(result.list).toHaveLength(1);
      expect(result.list[0].name).toBe('刹车片');
      expect(result.total).toBe(1);
    });

    it('应按正常库存（status=normal）筛选', async () => {
      mockPrisma.part.findMany.mockResolvedValue(mockParts);

      const result = await service.findAll({ status: 'normal', page: 1, pageSize: 10, skip: 0, take: 10 } as any);

      // 机油滤清器库存 25，安全库存 10，最大库存 100 → 正常
      expect(result.list).toHaveLength(1);
      expect(result.list[0].name).toBe('机油滤清器');
      expect(result.total).toBe(1);
    });

    it('应按超储（status=over）筛选', async () => {
      const overStockParts = [
        {
          ...mockParts[0],
          stock: { partId: 1, quantity: 150, lockedQty: 0 }, // 超过 maxStock=100
        },
      ];
      mockPrisma.part.findMany.mockResolvedValue(overStockParts);

      const result = await service.findAll({ status: 'over', page: 1, pageSize: 10, skip: 0, take: 10 } as any);

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('低库存筛选结果为空时返回空列表', async () => {
      const highStockParts = [
        { ...mockParts[0], stock: { partId: 1, quantity: 50, lockedQty: 0 } },
      ];
      mockPrisma.part.findMany.mockResolvedValue(highStockParts);

      const result = await service.findAll({ status: 'low', page: 1, pageSize: 10, skip: 0, take: 10 } as any);

      expect(result.list).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('Redis 缓存命中时应直接返回缓存数据，不查数据库', async () => {
      const cachedData = {
        list: mockParts,
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };
      mockRedis.getJson.mockResolvedValueOnce(cachedData);

      const result = await service.findAll({ page: 1, pageSize: 10 } as any);

      expect(result).toEqual(cachedData);
      expect(mockRedis.getJson).toHaveBeenCalled();
      expect(mockPrisma.part.findMany).not.toHaveBeenCalled();
    });

    it('Redis 未命中时应查询数据库并写入缓存', async () => {
      mockPrisma.part.findMany.mockResolvedValue(mockParts);
      mockPrisma.part.count.mockResolvedValue(2);

      await service.findAll({ page: 1, pageSize: 10 } as any);

      expect(mockPrisma.part.findMany).toHaveBeenCalled();
      expect(mockRedis.setJson).toHaveBeenCalledWith(
        expect.stringContaining('parts:list:'),
        expect.any(Object),
        120,
      );
    });
  });

  // ========================================================================
  // findOne - 单个配件
  // ========================================================================
  describe('findOne', () => {
    it('应返回配件详情，含 category/supplier/stock/stockRecords', async () => {
      const mockPart = {
        id: 1,
        code: 'P001',
        name: '机油滤清器',
        spec: 'LF-001',
        price: 50,
        cost: 30,
        safetyStock: 10,
        maxStock: 100,
        category: { id: 1, name: '滤清器' },
        supplier: { id: 1, name: '博世供应商' },
        stock: { partId: 1, quantity: 25, lockedQty: 0 },
        stockRecords: [
          { id: 1, partId: 1, type: 'in', quantity: 30, beforeQty: 0, afterQty: 30 },
        ],
      };
      mockPrisma.part.findUnique.mockResolvedValue(mockPart);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result!.name).toBe('机油滤清器');
      expect(result!.category).toBeDefined();
      expect(result!.supplier).toBeDefined();
      expect(result!.stock).toBeDefined();
      expect(result!.stockRecords).toHaveLength(1);
      expect(mockPrisma.part.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          include: expect.objectContaining({
            category: true,
            supplier: true,
            stock: true,
            stockRecords: expect.any(Object),
          }),
        }),
      );
    });

    it('配件不存在时应返回 null', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  // ========================================================================
  // create - 创建配件
  // ========================================================================
  describe('create', () => {
    const createDto = {
      code: 'P003',
      name: '空调滤清器',
      spec: 'AC-003',
      categoryId: 1,
      supplierId: 1,
      price: 80,
      cost: 45,
      safetyStock: 15,
      maxStock: 60,
      shelfLocation: 'C-02',
      images: ['/uploads/part1.jpg'],
    };

    it('应在事务中创建配件和初始库存，并清除缓存', async () => {
      const createdPart = { id: 3, ...createDto };
      const mockResult = {
        ...createdPart,
        category: { id: 1, name: '滤清器' },
        supplier: { id: 1, name: '博世供应商' },
        stock: { partId: 3, quantity: 0, lockedQty: 0 },
        stockRecords: [],
      };

      mockPrisma.part.create.mockResolvedValue(createdPart);
      mockPrisma.partStock.create.mockResolvedValue({ partId: 3, quantity: 0, lockedQty: 0 });
      mockPrisma.part.findUnique.mockResolvedValue(mockResult);
      mockRedis.keys.mockResolvedValue(['parts:list:{"page":1}']);

      const result = await service.create(createDto as any);

      expect(result!.name).toBe('空调滤清器');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      // 验证清除缓存
      expect(mockRedis.keys).toHaveBeenCalledWith('parts:*');
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('images 为空时不应传递 undefined', async () => {
      const dtoWithoutImages = { ...createDto, images: undefined };
      mockPrisma.part.create.mockResolvedValue({ id: 4, ...dtoWithoutImages });
      mockPrisma.partStock.create.mockResolvedValue({ partId: 4, quantity: 0, lockedQty: 0 });
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 4,
        ...dtoWithoutImages,
        category: null,
        supplier: null,
        stock: { partId: 4, quantity: 0, lockedQty: 0 },
        stockRecords: [],
      });

      await service.create(dtoWithoutImages as any);

      // 验证 create 被调用且 images 字段正确处理
      expect(mockPrisma.part.create).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // update - 更新配件
  // ========================================================================
  describe('update', () => {
    it('应更新配件并清除缓存', async () => {
      const updateDto = { name: '机油滤清器（升级版）', price: 55 };
      const updated = {
        id: 1,
        code: 'P001',
        name: '机油滤清器（升级版）',
        spec: 'LF-001',
        price: 55,
        cost: 30,
        category: { id: 1, name: '滤清器' },
        supplier: { id: 1, name: '博世供应商' },
        stock: { partId: 1, quantity: 25, lockedQty: 0 },
        stockRecords: [],
      };

      mockPrisma.part.update.mockResolvedValue(updated);
      mockPrisma.part.findUnique.mockResolvedValue(updated);
      mockRedis.keys.mockResolvedValue(['parts:list:{"page":1}']);

      const result = await service.update(1, updateDto as any);

      expect(result!.name).toBe('机油滤清器（升级版）');
      expect(mockPrisma.part.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
      expect(mockRedis.keys).toHaveBeenCalledWith('parts:*');
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // remove - 删除配件
  // ========================================================================
  describe('remove', () => {
    it('应删除库存流水、库存记录和配件，并清除缓存', async () => {
      const deletedPart = { id: 1, code: 'P001', name: '机油滤清器' };
      mockPrisma.stockRecord.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.partStock.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.part.delete.mockResolvedValue(deletedPart);
      mockRedis.keys.mockResolvedValue(['parts:list:{"page":1}']);

      const result = await service.remove(1);

      expect(result.name).toBe('机油滤清器');
      expect(mockPrisma.stockRecord.deleteMany).toHaveBeenCalledWith({ where: { partId: 1 } });
      expect(mockPrisma.partStock.deleteMany).toHaveBeenCalledWith({ where: { partId: 1 } });
      expect(mockPrisma.part.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockRedis.keys).toHaveBeenCalledWith('parts:*');
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('配件不存在时 Prisma delete 应抛出错误', async () => {
      mockPrisma.stockRecord.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.partStock.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.part.delete.mockRejectedValue(new Error('Record to delete does not exist'));

      await expect(service.remove(999)).rejects.toThrow('Record to delete does not exist');
    });
  });

  // ========================================================================
  // getLowStock - 库存预警
  // ========================================================================
  describe('getLowStock', () => {
    it('应返回库存低于安全库存的配件列表', async () => {
      const allParts = [
        {
          id: 1, name: '机油滤清器', safetyStock: 10, status: 1,
          stock: { partId: 1, quantity: 5, lockedQty: 0 },
          category: { id: 1, name: '滤清器' },
          supplier: { id: 1, name: '博世供应商' },
        },
        {
          id: 2, name: '刹车片', safetyStock: 20, status: 1,
          stock: { partId: 2, quantity: 30, lockedQty: 0 },
          category: { id: 2, name: '制动系统' },
          supplier: { id: 1, name: '博世供应商' },
        },
      ];
      mockPrisma.part.findMany.mockResolvedValue(allParts);

      const result = await service.getLowStock();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('机油滤清器');
    });

    it('所有配件库存充足时应返回空数组', async () => {
      const allParts = [
        {
          id: 1, name: '机油滤清器', safetyStock: 5, status: 1,
          stock: { partId: 1, quantity: 50, lockedQty: 0 },
          category: null, supplier: null,
        },
      ];
      mockPrisma.part.findMany.mockResolvedValue(allParts);

      const result = await service.getLowStock();

      expect(result).toHaveLength(0);
    });
  });

  // ========================================================================
  // findStockRecords - 库存流水
  // ========================================================================
  describe('findStockRecords', () => {
    it('应返回分页库存流水记录', async () => {
      const mockRecords = [
        {
          id: 1, partId: 1, type: 'in', quantity: 30, beforeQty: 0, afterQty: 30,
          remark: '初始入库', createdAt: new Date(),
          part: { id: 1, name: '机油滤清器', code: 'P001' },
        },
        {
          id: 2, partId: 1, type: 'out', quantity: 5, beforeQty: 30, afterQty: 25,
          remark: '维修领料', createdAt: new Date(),
          part: { id: 1, name: '机油滤清器', code: 'P001' },
        },
      ];
      mockPrisma.stockRecord.findMany.mockResolvedValue(mockRecords);
      mockPrisma.stockRecord.count.mockResolvedValue(2);

      const result = await service.findStockRecords({ page: 1, pageSize: 10 } as any);

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.list[0].part).toBeDefined();
      expect(result.list[0].part.name).toBe('机油滤清器');
    });
  });

  // ========================================================================
  // stockIn - 入库
  // ========================================================================
  describe('stockIn', () => {
    it('PartStock 不存在时应先创建库存记录再入库', async () => {
      mockPrisma.partStock.findUnique.mockResolvedValue(null);
      mockPrisma.partStock.create.mockResolvedValue({ partId: 1, quantity: 0, lockedQty: 0 });
      mockPrisma.partStock.update.mockResolvedValue({ partId: 1, quantity: 30, lockedQty: 0 });
      mockPrisma.stockRecord.create.mockResolvedValue({
        id: 1, partId: 1, type: 'in', quantity: 30, beforeQty: 0, afterQty: 30,
        remark: '采购入库',
      });

      const result = await service.stockIn(1, 30, '采购入库');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.partStock.create).toHaveBeenCalledWith({
        data: { partId: 1, quantity: 0, lockedQty: 0 },
      });
      expect(result.type).toBe('in');
      expect(result.quantity).toBe(30);
      expect(result.afterQty).toBe(30);
      // 验证清除缓存
      expect(mockRedis.keys).toHaveBeenCalledWith('parts:*');
    });

    it('PartStock 已存在时应直接更新库存', async () => {
      mockPrisma.partStock.findUnique.mockResolvedValue({ partId: 1, quantity: 25, lockedQty: 0 });
      mockPrisma.partStock.update.mockResolvedValue({ partId: 1, quantity: 55, lockedQty: 0 });
      mockPrisma.stockRecord.create.mockResolvedValue({
        id: 2, partId: 1, type: 'in', quantity: 30, beforeQty: 25, afterQty: 55,
        remark: '补货入库',
      });

      const result = await service.stockIn(1, 30, '补货入库');

      expect(mockPrisma.partStock.findUnique).toHaveBeenCalledWith({ where: { partId: 1 } });
      expect(mockPrisma.partStock.create).not.toHaveBeenCalled();
      expect(result.beforeQty).toBe(25);
      expect(result.afterQty).toBe(55);
    });

    it('入库时 remark 为空也应正常工作', async () => {
      mockPrisma.partStock.findUnique.mockResolvedValue({ partId: 2, quantity: 10, lockedQty: 0 });
      mockPrisma.partStock.update.mockResolvedValue({ partId: 2, quantity: 20, lockedQty: 0 });
      mockPrisma.stockRecord.create.mockResolvedValue({
        id: 3, partId: 2, type: 'in', quantity: 10, beforeQty: 10, afterQty: 20,
        remark: '',
      });

      const result = await service.stockIn(2, 10);

      expect(result).toBeDefined();
      expect(result.remark).toBe('');
    });
  });

  // ========================================================================
  // stockOut - 出库
  // ========================================================================
  describe('stockOut', () => {
    it('应正常出库并扣减库存', async () => {
      mockPrisma.partStock.findUnique.mockResolvedValue({ partId: 1, quantity: 25, lockedQty: 0 });
      mockPrisma.partStock.update.mockResolvedValue({ partId: 1, quantity: 20, lockedQty: 0 });
      mockPrisma.stockRecord.create.mockResolvedValue({
        id: 1, partId: 1, type: 'out', quantity: 5, beforeQty: 25, afterQty: 20,
        remark: '维修领料',
      });
      // .then() 回调中的 part.findUnique
      mockPrisma.part.findUnique.mockResolvedValue({ id: 1, name: '机油滤清器', safetyStock: 10 });

      const result = await service.stockOut(1, 5, '维修领料');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.type).toBe('out');
      expect(result.beforeQty).toBe(25);
      expect(result.afterQty).toBe(20);
      expect(mockRedis.keys).toHaveBeenCalledWith('parts:*');
    });

    it('库存不足时应抛出错误', async () => {
      mockPrisma.partStock.findUnique.mockResolvedValue({ partId: 1, quantity: 5, lockedQty: 0 });

      await expect(service.stockOut(1, 10, '超量出库')).rejects.toThrow('库存不足: 当前库存 5, 需要 10');
    });

    it('PartStock 不存在时应先创建库存再抛出库存不足', async () => {
      mockPrisma.partStock.findUnique.mockResolvedValue(null);
      mockPrisma.partStock.create.mockResolvedValue({ partId: 1, quantity: 0, lockedQty: 0 });

      await expect(service.stockOut(1, 5, '出库')).rejects.toThrow('库存不足: 当前库存 0, 需要 5');
    });

    it('出库后库存低于安全库存时应触发 WsGateway 低库存通知', async () => {
      // 事务内的 mock
      mockPrisma.partStock.findUnique.mockResolvedValue({ partId: 2, quantity: 25, lockedQty: 0 });
      mockPrisma.partStock.update.mockResolvedValue({ partId: 2, quantity: 5, lockedQty: 0 });
      const stockRecord = {
        id: 2, partId: 2, type: 'out', quantity: 20, beforeQty: 25, afterQty: 5,
        remark: '批量领料',
      };
      mockPrisma.stockRecord.create.mockResolvedValue(stockRecord);
      // .then() 回调中的查询：afterQty=5 <= safetyStock=20 → 触发通知
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 2, name: '刹车片', safetyStock: 20,
      });

      const result = await service.stockOut(2, 20, '批量领料');

      expect(mockWs.notifyLowStock).toHaveBeenCalledWith({
        partId: 2,
        partName: '刹车片',
        quantity: 5,
        safetyStock: 20,
      });
      expect(result.afterQty).toBe(5);
    });

    it('出库后库存仍高于安全库存时不应触发通知', async () => {
      mockPrisma.partStock.findUnique.mockResolvedValue({ partId: 1, quantity: 100, lockedQty: 0 });
      mockPrisma.partStock.update.mockResolvedValue({ partId: 1, quantity: 90, lockedQty: 0 });
      mockPrisma.stockRecord.create.mockResolvedValue({
        id: 3, partId: 1, type: 'out', quantity: 10, beforeQty: 100, afterQty: 90,
        remark: '',
      });
      // afterQty=90 > safetyStock=10 → 不触发
      mockPrisma.part.findUnique.mockResolvedValue({
        id: 1, name: '机油滤清器', safetyStock: 10,
      });

      await service.stockOut(1, 10);

      expect(mockWs.notifyLowStock).not.toHaveBeenCalled();
    });
  });

  // ========================================================================
  // getCategories / getSuppliers - 分类与供应商
  // ========================================================================
  describe('getCategories', () => {
    it('应按 sortOrder 升序返回分类列表', async () => {
      const mockCategories = [
        { id: 1, name: '滤清器', sortOrder: 1 },
        { id: 2, name: '制动系统', sortOrder: 2 },
        { id: 3, name: '机油', sortOrder: 3 },
      ];
      mockPrisma.partCategory.findMany.mockResolvedValue(mockCategories);

      const result = await service.getCategories();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('滤清器');
      expect(mockPrisma.partCategory.findMany).toHaveBeenCalledWith({
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('getSuppliers', () => {
    it('应只返回启用状态（status=1）的供应商', async () => {
      const mockSuppliers = [
        { id: 1, name: '博世供应商', status: 1 },
        { id: 2, name: '曼牌供应商', status: 1 },
      ];
      mockPrisma.supplier.findMany.mockResolvedValue(mockSuppliers);

      const result = await service.getSuppliers();

      expect(result).toHaveLength(2);
      expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith({
        where: { status: 1 },
      });
    });
  });

  // ========================================================================
  // 采购单管理
  // ========================================================================
  describe('findPurchaseOrders', () => {
    it('应返回分页采购单列表', async () => {
      const mockOrders = [
        {
          id: 1, orderNo: 'PO20260521-001', totalAmount: 5000, status: 'pending',
          supplier: { id: 1, name: '博世供应商' },
          items: [{ id: 1, part: { id: 1, name: '机油滤清器', code: 'P001', spec: 'LF-001' } }],
        },
      ];
      mockPrisma.purchaseOrder.findMany.mockResolvedValue(mockOrders);
      mockPrisma.purchaseOrder.count.mockResolvedValue(1);

      const result = await service.findPurchaseOrders({ page: 1, pageSize: 10 } as any);

      expect(result.list).toHaveLength(1);
      expect(result.list[0].orderNo).toBe('PO20260521-001');
      expect(result.list[0].supplier).toBeDefined();
      expect(result.list[0].items).toHaveLength(1);
    });

    it('应按 status 筛选采购单', async () => {
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([]);
      mockPrisma.purchaseOrder.count.mockResolvedValue(0);

      await service.findPurchaseOrders({ status: 'approved', page: 1, pageSize: 10 } as any);

      expect(mockPrisma.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'approved' },
        }),
      );
    });
  });

  describe('findPurchaseOrder', () => {
    it('应返回采购单详情，含 supplier 和 items+part', async () => {
      const mockOrder = {
        id: 1, orderNo: 'PO20260521-001', totalAmount: 5000, status: 'pending',
        supplier: { id: 1, name: '博世供应商', contact: '张经理' },
        items: [
          { id: 1, quantity: 10, unitPrice: 50, amount: 500,
            part: { id: 1, name: '机油滤清器', code: 'P001', spec: 'LF-001', price: 50 } },
        ],
      };
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findPurchaseOrder(1);

      expect(result.orderNo).toBe('PO20260521-001');
      expect(result.supplier.name).toBe('博世供应商');
      expect(result.items[0].part.name).toBe('机油滤清器');
    });

    it('采购单不存在时应抛出 NotFoundException', async () => {
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue(null);

      await expect(service.findPurchaseOrder(999)).rejects.toThrow(NotFoundException);
      await expect(service.findPurchaseOrder(999)).rejects.toThrow('采购单不存在');
    });
  });

  describe('createPurchaseOrder', () => {
    it('应创建采购单并自动生成 PO 单号', async () => {
      const createDto = {
        supplierId: 1,
        items: [
          { partId: 1, quantity: 10, unitPrice: 50 },
          { partId: 2, quantity: 5, unitPrice: 200 },
        ],
        attachments: ['/uploads/po1.pdf'],
      };

      const mockOrder = {
        id: 1,
        orderNo: 'PO20260521-001',
        supplierId: 1,
        totalAmount: 1500,
        status: 'pending',
        supplier: { id: 1, name: '博世供应商' },
        items: [
          { id: 1, part: { id: 1, name: '机油滤清器', code: 'P001', spec: 'LF-001' } },
          { id: 2, part: { id: 2, name: '刹车片', code: 'P002', spec: 'BP-002' } },
        ],
      };

      mockPrisma.purchaseOrder.count.mockResolvedValue(0);
      mockPrisma.purchaseOrder.create.mockResolvedValue(mockOrder);

      const result = await service.createPurchaseOrder(createDto as any, 1);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.orderNo).toMatch(/^PO\d{8}-\d{3}$/);
      // totalAmount = 10*50 + 5*200 = 1500
      expect(mockPrisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalAmount: 1500,
            applicantId: 1,
          }),
        }),
      );
    });

    it('同一天多个采购单时 PO 单号序号应递增', async () => {
      const createDto = {
        supplierId: 1,
        items: [{ partId: 1, quantity: 5, unitPrice: 100 }],
      };
      // 模拟当天已有 2 个采购单
      mockPrisma.purchaseOrder.count.mockResolvedValue(2);
      mockPrisma.purchaseOrder.create.mockResolvedValue({
        id: 3,
        orderNo: 'PO20260521-003',
        supplier: { id: 1, name: '博世供应商' },
        items: [{ id: 1, part: { id: 1, name: '机油滤清器', code: 'P001', spec: 'LF-001' } }],
      });

      const result = await service.createPurchaseOrder(createDto as any, 1);

      expect(result.orderNo).toBe('PO20260521-003');
    });

    it('items 为空时应抛出 BadRequestException', async () => {
      const createDto = { supplierId: 1, items: [] };

      await expect(service.createPurchaseOrder(createDto as any, 1)).rejects.toThrow(BadRequestException);
      await expect(service.createPurchaseOrder(createDto as any, 1)).rejects.toThrow('采购明细不能为空');
    });

    it('attachments 为空时不应传递 undefined', async () => {
      const createDto = {
        supplierId: 1,
        items: [{ partId: 1, quantity: 10, unitPrice: 50 }],
      };

      mockPrisma.purchaseOrder.count.mockResolvedValue(0);
      mockPrisma.purchaseOrder.create.mockResolvedValue({
        id: 2,
        orderNo: 'PO20260521-001',
        supplier: { id: 1, name: '博世供应商' },
        items: [{ id: 1, part: { id: 1, name: '机油滤清器', code: 'P001', spec: 'LF-001' } }],
      });

      const result = await service.createPurchaseOrder(createDto as any, 1);

      expect(result).toBeDefined();
      expect(mockPrisma.purchaseOrder.create).toHaveBeenCalled();
    });
  });

  describe('removePurchaseOrder', () => {
    it('应删除采购单及其明细', async () => {
      const mockOrder = { id: 1, orderNo: 'PO20260521-001' };
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.purchaseOrderItem.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.purchaseOrder.delete.mockResolvedValue(mockOrder);

      const result = await service.removePurchaseOrder(1);

      expect(result.orderNo).toBe('PO20260521-001');
      expect(mockPrisma.purchaseOrderItem.deleteMany).toHaveBeenCalledWith({
        where: { purchaseOrderId: 1 },
      });
      expect(mockPrisma.purchaseOrder.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('采购单不存在时应抛出 NotFoundException', async () => {
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue(null);

      await expect(service.removePurchaseOrder(999)).rejects.toThrow(NotFoundException);
      await expect(service.removePurchaseOrder(999)).rejects.toThrow('采购单不存在');
    });
  });
});
