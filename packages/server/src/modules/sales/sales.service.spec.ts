import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WsGateway } from '../ws/ws.gateway';

describe('SalesService', () => {
  let service: SalesService;
  let prisma: any;

  const mockPrisma = {
    vehicleInfo: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    salesLead: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    salesOrder: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    leadFollowRecord: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
    sysUser: {
      findUnique: jest.fn(),
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
      notifyOrderDelivered: jest.fn(),
      notifyNewSalesOrder: jest.fn(),
      notifyNewSalesLead: jest.fn(),
      notifySystem: jest.fn(),
      server: { emit: jest.fn() },
      setNotificationService: jest.fn(),
      handleConnection: jest.fn(),
      handleDisconnect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WsGateway, useValue: mockWs },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    prisma = mockPrisma;
  });

  // ==================== 车辆管理 ====================

  describe('findAllVehicles', () => {
    const mockVehicleList = [
      { id: 1, brand: '丰田', series: '凯美瑞', model: '2.0G', status: 1 },
      { id: 2, brand: '丰田', series: '卡罗拉', model: '1.8L', status: 1 },
    ];

    it('应返回分页车辆列表', async () => {
      prisma.vehicleInfo.findMany.mockResolvedValue(mockVehicleList);
      prisma.vehicleInfo.count.mockResolvedValue(2);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      const result = await service.findAllVehicles(query);

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(prisma.vehicleInfo.findMany).toHaveBeenCalledWith({
        where: { status: 1 },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('应支持按品牌筛选', async () => {
      prisma.vehicleInfo.findMany.mockResolvedValue([mockVehicleList[0]]);
      prisma.vehicleInfo.count.mockResolvedValue(1);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10, brand: '丰田' } as any;
      await service.findAllVehicles(query);

      expect(prisma.vehicleInfo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { brand: { contains: '丰田' }, status: 1 },
        }),
      );
    });

    it('应支持按系列筛选', async () => {
      prisma.vehicleInfo.findMany.mockResolvedValue([]);
      prisma.vehicleInfo.count.mockResolvedValue(0);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10, series: '凯美瑞' } as any;
      await service.findAllVehicles(query);

      expect(prisma.vehicleInfo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { series: { contains: '凯美瑞' }, status: 1 },
        }),
      );
    });

    it('应支持库存状态筛选', async () => {
      prisma.vehicleInfo.findMany.mockResolvedValue([]);
      prisma.vehicleInfo.count.mockResolvedValue(0);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10, stockStatus: 'in_stock' } as any;
      await service.findAllVehicles(query);

      expect(prisma.vehicleInfo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stockStatus: 'in_stock', status: 1 },
        }),
      );
    });

    it('空列表应正确返回', async () => {
      prisma.vehicleInfo.findMany.mockResolvedValue([]);
      prisma.vehicleInfo.count.mockResolvedValue(0);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      const result = await service.findAllVehicles(query);

      expect(result.list).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findVehicleOne', () => {
    it('应返回指定车辆', async () => {
      const vehicle = { id: 1, brand: '丰田', series: '凯美瑞', model: '2.0G' };
      prisma.vehicleInfo.findUnique.mockResolvedValue(vehicle);

      const result = await service.findVehicleOne(1);
      expect(result).toEqual(vehicle);
    });

    it('车辆不存在时应抛出 NotFoundException', async () => {
      prisma.vehicleInfo.findUnique.mockResolvedValue(null);

      await expect(service.findVehicleOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findVehicleOne(999)).rejects.toThrow('车辆 #999 不存在');
    });
  });

  describe('createVehicle', () => {
    it('应成功创建车辆', async () => {
      const dto = { brand: '丰田', series: '凯美瑞', model: '2.0G', guidePrice: 199800, salePrice: 189800 } as any;
      const created = { id: 1, ...dto, status: 1 };
      prisma.vehicleInfo.create.mockResolvedValue(created);

      const result = await service.createVehicle(dto);
      expect(result).toEqual(created);
      expect(prisma.vehicleInfo.create).toHaveBeenCalled();
    });

    it('未提供 minPrice 时应默认设 0', async () => {
      const dto = { brand: '本田', series: '雅阁', model: '1.5T', guidePrice: 179800, salePrice: 169800 } as any;
      prisma.vehicleInfo.create.mockResolvedValue({ id: 2, ...dto, minPrice: 0 });

      await service.createVehicle(dto);
      const callArg = prisma.vehicleInfo.create.mock.calls[0][0].data;
      expect(callArg.minPrice).toBe(0);
    });
  });

  describe('updateVehicle', () => {
    it('应成功更新车辆信息', async () => {
      prisma.vehicleInfo.findUnique.mockResolvedValue({ id: 1, brand: '丰田' });
      const updated = { id: 1, brand: '丰田', salePrice: 185000 };
      prisma.vehicleInfo.update.mockResolvedValue(updated);

      const result = await service.updateVehicle(1, { salePrice: 185000 } as any);
      expect(result).toEqual(updated);
    });

    it('车辆不存在时应抛出 NotFoundException', async () => {
      prisma.vehicleInfo.findUnique.mockResolvedValue(null);

      await expect(service.updateVehicle(999, { salePrice: 100 } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeVehicle', () => {
    it('应软删除车辆（设 status 为 0）', async () => {
      prisma.vehicleInfo.findUnique.mockResolvedValue({ id: 1, status: 1 });
      prisma.vehicleInfo.update.mockResolvedValue({ id: 1, status: 0 });

      await service.removeVehicle(1);
      expect(prisma.vehicleInfo.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 0 },
      });
    });

    it('车辆不存在时应抛出 NotFoundException', async () => {
      prisma.vehicleInfo.findUnique.mockResolvedValue(null);

      await expect(service.removeVehicle(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== 销售线索 ====================

  describe('findAllLeads', () => {
    const mockLead = {
      id: 1,
      customerId: 1,
      userId: 1,
      intentModel: '凯美瑞',
      intent: '高意向',
      status: 'follow',
      customer: { name: '张三', phone: '13800138000' },
      user: { id: 1, realName: '李销售', phone: '13900139000' },
    };

    it('应返回分页线索列表并映射字段', async () => {
      prisma.salesLead.findMany.mockResolvedValue([mockLead]);
      prisma.salesLead.count.mockResolvedValue(1);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      const result = await service.findAllLeads(query);

      expect(result.list).toHaveLength(1);
      expect(result.list[0].customerName).toBe('张三');
      expect(result.list[0].intendedVehicle).toBe('凯美瑞');
      expect(result.list[0].intentLevel).toBe('高意向');
      expect(result.list[0].salesName).toBe('李销售');
    });

    it('应支持按状态筛选', async () => {
      prisma.salesLead.findMany.mockResolvedValue([]);
      prisma.salesLead.count.mockResolvedValue(0);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10, status: 'follow' } as any;
      await service.findAllLeads(query);

      expect(prisma.salesLead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'follow' } }),
      );
    });

    it('无关联客户时 customerName 应为 null', async () => {
      const leadNoCustomer = { ...mockLead, customer: null, user: null };
      prisma.salesLead.findMany.mockResolvedValue([leadNoCustomer]);
      prisma.salesLead.count.mockResolvedValue(1);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      const result = await service.findAllLeads(query);

      expect(result.list[0].customerName).toBeNull();
      expect(result.list[0].phone).toBeNull();
      expect(result.list[0].salesName).toBeNull();
    });
  });

  describe('findLeadOne', () => {
    it('应返回线索详情及跟进记录', async () => {
      const lead = {
        id: 1,
        customerId: 1,
        customer: { name: '张三', phone: '13800138000' },
        user: { id: 1, realName: '李销售', phone: '13900139000' },
        intentModel: '凯美瑞',
        intent: '高意向',
        followRecords: [{ id: 1, content: '已联系', user: { id: 1, realName: '李销售' } }],
      };
      prisma.salesLead.findUnique.mockResolvedValue(lead);

      const result = await service.findLeadOne(1);
      expect(result.customerName).toBe('张三');
      expect(result.intendedVehicle).toBe('凯美瑞');
      expect(result.intentLevel).toBe('高意向');
    });

    it('线索不存在时应抛出 NotFoundException', async () => {
      prisma.salesLead.findUnique.mockResolvedValue(null);

      await expect(service.findLeadOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createLead', () => {
    it('应创建线索并映射字段名', async () => {
      const dto = {
        customerId: 1,
        userId: 1,
        intendedVehicle: '凯美瑞',
        intentLevel: '高意向',
        source: '线上推广',
      } as any;

      const created = { id: 1, customerId: 1, userId: 1, intentModel: '凯美瑞', intent: '高意向' };
      prisma.salesLead.create.mockResolvedValue(created);

      const result = await service.createLead(dto);
      expect(result).toEqual(created);

      const data = prisma.salesLead.create.mock.calls[0][0].data;
      expect(data.intentModel).toBe('凯美瑞');
      expect(data.intent).toBe('高意向');
      expect(data.intendedVehicle).toBeUndefined();
      expect(data.intentLevel).toBeUndefined();
    });
  });

  describe('updateLead', () => {
    it('线索负责人可直接修改', async () => {
      prisma.salesLead.findUnique.mockResolvedValue({ id: 1, userId: 1 });
      prisma.salesLead.update.mockResolvedValue({ id: 1, status: 'deal' });

      const result = await service.updateLead(1, { status: 'deal' } as any, 1);
      expect(result).toEqual({ id: 1, status: 'deal' });
    });

    it('超级管理员可修改他人线索', async () => {
      prisma.salesLead.findUnique.mockResolvedValue({ id: 1, userId: 2 });
      // 管理员校验
      prisma.sysUser.findUnique.mockResolvedValue({
        id: 1,
        role: { permissions: ['*'] },
      });
      prisma.salesLead.update.mockResolvedValue({ id: 1, status: 'deal' });

      const result = await service.updateLead(1, { status: 'deal' } as any, 1);
      expect(result).toEqual({ id: 1, status: 'deal' });
    });

    it('非负责人且非管理员修改他人线索时应抛出 ForbiddenException', async () => {
      prisma.salesLead.findUnique.mockResolvedValue({ id: 1, userId: 2 });
      prisma.sysUser.findUnique.mockResolvedValue({
        id: 1,
        role: { permissions: ['sales'] },
      });

      await expect(service.updateLead(1, { status: 'deal' } as any, 1)).rejects.toThrow(ForbiddenException);
    });

    it('线索不存在时应抛出 NotFoundException', async () => {
      prisma.salesLead.findUnique.mockResolvedValue(null);

      await expect(service.updateLead(999, { status: 'deal' } as any)).rejects.toThrow(NotFoundException);
    });

    it('不传 currentUserId 时不校验归属', async () => {
      prisma.salesLead.findUnique.mockResolvedValue({ id: 1, userId: 2 });
      prisma.salesLead.update.mockResolvedValue({ id: 1, status: 'deal' });

      const result = await service.updateLead(1, { status: 'deal' } as any);
      expect(result).toEqual({ id: 1, status: 'deal' });
    });
  });

  describe('removeLead', () => {
    it('应级联删除线索和跟进记录', async () => {
      prisma.salesLead.findUnique.mockResolvedValue({ id: 1, customerId: 1 });
      prisma.$transaction.mockResolvedValue([{ count: 3 }, { id: 1 }]);

      await service.removeLead(1);
      expect(prisma.$transaction).toHaveBeenCalled();
      // 事务内第一个操作应删除跟进记录
      const callArgs = prisma.$transaction.mock.calls[0][0];
      expect(callArgs).toHaveLength(2);
    });

    it('线索不存在时应抛出 NotFoundException', async () => {
      prisma.salesLead.findUnique.mockResolvedValue(null);

      await expect(service.removeLead(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== 线索跟进记录 ====================

  describe('getLeadFollowRecords', () => {
    it('应返回线索跟进记录列表', async () => {
      const records = [
        { id: 1, leadId: 1, content: '第一次联系', user: { id: 1, realName: '李销售' } },
        { id: 2, leadId: 1, content: '客户考虑中', user: { id: 1, realName: '李销售' } },
      ];
      prisma.salesLead.count.mockResolvedValue(1);
      prisma.leadFollowRecord.findMany.mockResolvedValue(records);

      const result = await service.getLeadFollowRecords(1);
      expect(result).toHaveLength(2);
    });

    it('线索不存在时应抛出 NotFoundException', async () => {
      prisma.salesLead.count.mockResolvedValue(0);

      await expect(service.getLeadFollowRecords(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addLeadFollowRecord', () => {
    it('应创建跟进记录并更新线索状态', async () => {
      prisma.salesLead.findUnique.mockResolvedValue({ id: 1 });
      const record = { id: 1, leadId: 1, type: '电话', content: '客户已预约试驾', user: { id: 1, realName: '李销售' } };
      prisma.$transaction.mockResolvedValue([record, { id: 1 }]);

      const dto = { type: '电话', content: '客户已预约试驾', status: 'trial' } as any;
      const result = await service.addLeadFollowRecord(1, 1, dto);
      expect(result).toEqual(record);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('线索不存在时应抛出 NotFoundException', async () => {
      prisma.salesLead.findUnique.mockResolvedValue(null);

      const dto = { type: '电话', content: '测试内容' } as any;
      await expect(service.addLeadFollowRecord(999, 1, dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== 销售订单 ====================

  describe('findAllOrders', () => {
    it('应返回分页订单列表', async () => {
      const orders = [
        { id: 1, orderNo: 'SO20260521-001', customer: { name: '张三' }, vehicle: { brand: '丰田' } },
      ];
      prisma.salesOrder.findMany.mockResolvedValue(orders);
      prisma.salesOrder.count.mockResolvedValue(1);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      const result = await service.findAllOrders(query);

      expect(result.list).toHaveLength(1);
      expect(result.list[0].orderNo).toBe('SO20260521-001');
    });

    it('应支持按状态筛选', async () => {
      prisma.salesOrder.findMany.mockResolvedValue([]);
      prisma.salesOrder.count.mockResolvedValue(0);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10, status: 'delivered' } as any;
      await service.findAllOrders(query);

      expect(prisma.salesOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'delivered' } }),
      );
    });
  });

  describe('findOrderOne', () => {
    it('应返回订单详情', async () => {
      const order = { id: 1, orderNo: 'SO20260521-001', customer: { name: '张三' }, vehicle: { brand: '丰田' } };
      prisma.salesOrder.findUnique.mockResolvedValue(order);

      const result = await service.findOrderOne(1);
      expect(result).toEqual(order);
    });

    it('订单不存在时应抛出 NotFoundException', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue(null);

      await expect(service.findOrderOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createOrder', () => {
    it('应自动生成订单号并创建', async () => {
      const dto = { customerId: 1, vehicleId: 1, salePrice: 189800, totalAmount: 200000, salesId: 1 } as any;
      const created = { id: 1, orderNo: 'SO20260521-001', ...dto };
      prisma.salesOrder.count.mockResolvedValue(0);
      prisma.salesOrder.create.mockResolvedValue(created);

      const result = await service.createOrder(dto);
      expect(result.orderNo).toMatch(/^SO\d{8}-\d{3}$/);
    });
  });

  describe('updateOrder', () => {
    it('应成功更新订单', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue({ id: 1, orderNo: 'SO20260521-001' });
      prisma.salesOrder.update.mockResolvedValue({ id: 1, discount: 5000 });

      const result = await service.updateOrder(1, { discount: 5000 } as any);
      expect(result).toEqual({ id: 1, discount: 5000 });
    });

    it('订单不存在时应抛出 NotFoundException', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue(null);

      await expect(service.updateOrder(999, { discount: 1000 } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeOrder', () => {
    it('应成功删除订单', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue({ id: 1, orderNo: 'SO20260521-001' });
      prisma.salesOrder.delete.mockResolvedValue({ id: 1 });

      await service.removeOrder(1);
      expect(prisma.salesOrder.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('delivery', () => {
    it('应完成交车并更新车辆状态为已售', async () => {
      prisma.salesOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'SO20260521-001',
        vehicleId: 1,
      });

      const updatedOrder = { id: 1, status: 'delivered' };
      const mockTx = {
        salesOrder: { update: jest.fn().mockResolvedValue(updatedOrder) },
        vehicleInfo: { update: jest.fn().mockResolvedValue({ id: 1, stockStatus: '已售' }) },
      };
      prisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));

      const result = await service.delivery(1, { deliveryDate: '2026-05-21' } as any);
      expect(result.status).toBe('delivered');
      expect(mockTx.vehicleInfo.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { stockStatus: '已售' },
      });
    });
  });
});
