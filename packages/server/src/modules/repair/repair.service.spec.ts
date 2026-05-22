import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RepairService } from './repair.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WsGateway } from '../ws/ws.gateway';

describe('RepairService', () => {
  let service: RepairService;
  let mockPrisma: any;
  let mockWsGateway: any;

  beforeEach(async () => {
    mockPrisma = {
      repairOrder: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      repairOrderItem: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      dispatchRecord: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      qualityCheck: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      paymentRecord: {
        deleteMany: jest.fn(),
      },
      // $transaction 处理两种模式：回调函数 / 数组
      $transaction: jest.fn((arg: any) => {
        if (typeof arg === 'function') {
          return arg(mockPrisma);
        }
        // 数组模式（remove 使用）
        return Promise.all(arg);
      }),
    };

    mockWsGateway = {
      notifyNewRepairOrder: jest.fn(),
      notifyOrderStatusChange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepairService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WsGateway, useValue: mockWsGateway },
      ],
    }).compile();

    service = module.get<RepairService>(RepairService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ========== 工单查询 ==========

  describe('findAll', () => {
    it('无筛选条件时应返回分页列表', async () => {
      const mockOrders = [
        {
          id: 1,
          orderNo: 'RO20260520-001',
          plateNumber: '苏A12345',
          vehicleModel: '奔驰C260',
          status: 'pending',
          faultDesc: '发动机异响',
          customer: { id: 1, name: '张三', phone: '13800138000' },
          advisor: { id: 2, realName: '李四' },
          createdAt: new Date('2026-05-20'),
          updatedAt: new Date('2026-05-20'),
        },
        {
          id: 2,
          orderNo: 'RO20260520-002',
          plateNumber: '苏B67890',
          vehicleModel: '宝马X5',
          status: 'completed',
          faultDesc: '刹车片磨损',
          customer: { id: 2, name: '李四', phone: '13900139000' },
          advisor: { id: 3, realName: '王五' },
          createdAt: new Date('2026-05-20'),
          updatedAt: new Date('2026-05-20'),
        },
      ];

      mockPrisma.repairOrder.findMany.mockResolvedValue(mockOrders);
      mockPrisma.repairOrder.count.mockResolvedValue(2);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      const result = await service.findAll(query);

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(mockPrisma.repairOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { customer: true, advisor: true, _count: { select: { items: true } } },
        }),
      );
    });

    it('按 status 筛选应添加 where 条件', async () => {
      mockPrisma.repairOrder.findMany.mockResolvedValue([]);
      mockPrisma.repairOrder.count.mockResolvedValue(0);

      const query = {
        page: 1,
        pageSize: 10,
        skip: 0,
        take: 10,
        status: 'pending',
      } as any;
      await service.findAll(query);

      expect(mockPrisma.repairOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending' }),
        }),
      );
      expect(mockPrisma.repairOrder.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending' }),
        }),
      );
    });

    it('按 plateNumber 搜索应使用 contains', async () => {
      mockPrisma.repairOrder.findMany.mockResolvedValue([]);
      mockPrisma.repairOrder.count.mockResolvedValue(0);

      const query = {
        page: 1,
        pageSize: 10,
        skip: 0,
        take: 10,
        plateNumber: '苏A',
      } as any;
      await service.findAll(query);

      expect(mockPrisma.repairOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ plateNumber: { contains: '苏A' } }),
        }),
      );
    });

    it('按 customerName 搜索应使用嵌套 contains', async () => {
      mockPrisma.repairOrder.findMany.mockResolvedValue([]);
      mockPrisma.repairOrder.count.mockResolvedValue(0);

      const query = {
        page: 1,
        pageSize: 10,
        skip: 0,
        take: 10,
        customerName: '张三',
      } as any;
      await service.findAll(query);

      expect(mockPrisma.repairOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customer: { name: { contains: '张三' } },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('应返回工单含所有关联数据', async () => {
      const mockOrder = {
        id: 1,
        orderNo: 'RO20260520-001',
        plateNumber: '苏A12345',
        vehicleModel: '奔驰C260',
        mileage: 50000,
        faultDesc: '发动机异响',
        checkResult: '需更换火花塞',
        status: 'repairing',
        totalLaborFee: 500,
        totalPartFee: 200,
        totalAmount: 700,
        discount: 0,
        finalAmount: 700,
        images: ['https://img.example.com/fault1.jpg'],
        checkImages: [],
        customerId: 1,
        advisorId: 2,
        vehicleId: null,
        estCompleteTime: null,
        actualCompleteTime: null,
        customer: { id: 1, name: '张三', phone: '13800138000' },
        advisor: { id: 2, realName: '李四', phone: '13800000001' },
        items: [
          { id: 1, type: 'labor', name: '发动机检修', laborFee: 500, partFee: 0, amount: 500 },
          { id: 2, type: 'part', name: '火花塞', laborFee: 0, partFee: 200, amount: 200 },
        ],
        dispatchRecords: [
          {
            id: 1,
            technicianId: 5,
            standardHours: 3,
            actualHours: null,
            status: 'assigned',
            technician: { id: 5, realName: '赵六', phone: '13700000001' },
          },
        ],
        qualityCheck: null,
        paymentRecords: [],
        createdAt: new Date('2026-05-20'),
        updatedAt: new Date('2026-05-20'),
      };

      mockPrisma.repairOrder.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result.orderNo).toBe('RO20260520-001');
      expect(result.customer).toBeDefined();
      expect(result.customer.name).toBe('张三');
      expect(result.advisor).toBeDefined();
      expect(result.items).toHaveLength(2);
      expect(result.dispatchRecords).toHaveLength(1);
      expect(result.dispatchRecords[0].technician.realName).toBe('赵六');
      expect(mockPrisma.repairOrder.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          include: expect.objectContaining({
            customer: true,
            advisor: true,
            items: true,
            dispatchRecords: expect.any(Object),
            qualityCheck: true,
            paymentRecords: true,
          }),
        }),
      );
    });

    it('不存在的 ID 应抛出 NotFoundException', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('工单 #999 不存在');
    });
  });

  // ========== 工单创建与更新 ==========

  describe('create', () => {
    it('应自动生成 orderNo 并创建工单及维修项目', async () => {
      const dto = {
        customerId: 1,
        plateNumber: '苏A12345',
        vehicleModel: '奔驰C260',
        mileage: 50000,
        faultDesc: '发动机异响',
        advisorId: 2,
        items: [
          { type: 'labor', name: '发动机检修', laborFee: 500, amount: 500 },
          { type: 'part', name: '火花塞', partFee: 200, amount: 200 },
        ],
      } as any;

      // generateOrderNo 调用 findFirst
      mockPrisma.repairOrder.findFirst.mockResolvedValue(null);

      mockPrisma.repairOrder.create.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260521-001',
        customerId: 1,
        plateNumber: '苏A12345',
        vehicleModel: '奔驰C260',
        mileage: 50000,
        faultDesc: '发动机异响',
        status: 'pending',
        customer: { id: 1, name: '张三', phone: '13800138000' },
        advisor: { id: 2, realName: '李四' },
        items: [
          { id: 1, type: 'labor', name: '发动机检修', laborFee: 500, partFee: 0, amount: 500 },
          { id: 2, type: 'part', name: '火花塞', laborFee: 0, partFee: 200, amount: 200 },
        ],
        createdAt: new Date('2026-05-21'),
        updatedAt: new Date('2026-05-21'),
      });

      const result = await service.create(dto);

      // 验证工单号格式 RO年月日-序号
      expect(result.orderNo).toMatch(/^RO\d{8}-\d{3}$/);
      expect(result.status).toBe('pending');
      // 验证 nested items 创建
      const createCall = mockPrisma.repairOrder.create.mock.calls[0][0];
      expect(createCall.data.items.create).toHaveLength(2);
      expect(createCall.include).toEqual(
        expect.objectContaining({ customer: true, advisor: true, items: true }),
      );
    });

    it('应通过 WsGateway 推送新工单通知', async () => {
      const dto = {
        customerId: 1,
        plateNumber: '苏C11111',
        vehicleModel: '奥迪A6',
        faultDesc: '空调不制冷',
        advisorId: 2,
        items: [{ type: 'labor', name: '空调检修', laborFee: 300, amount: 300 }],
      } as any;

      mockPrisma.repairOrder.findFirst.mockResolvedValue(null);
      mockPrisma.repairOrder.create.mockResolvedValue({
        id: 2,
        orderNo: 'RO20260521-002',
        plateNumber: '苏C11111',
        vehicleModel: '奥迪A6',
        status: 'pending',
        faultDesc: '空调不制冷',
        customer: { id: 3, name: '王五', phone: '13600000001' },
        advisor: { id: 2, realName: '李四' },
        items: [{ id: 3, type: 'labor', name: '空调检修', laborFee: 300, partFee: 0, amount: 300 }],
        createdAt: new Date('2026-05-21'),
        updatedAt: new Date('2026-05-21'),
      });

      await service.create(dto);

      expect(mockWsGateway.notifyNewRepairOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 2,
          orderNo: 'RO20260521-002',
          plateNumber: '苏C11111',
          status: 'pending',
          customerName: '王五',
        }),
      );
    });

    it('已有当日工单时应正确递增序号', async () => {
      const dto = {
        customerId: 1,
        plateNumber: '苏D22222',
        advisorId: 2,
        items: [{ type: 'labor', name: '检查', laborFee: 100, amount: 100 }],
      } as any;

      // 模拟今天已有 RO20260521-005
      mockPrisma.repairOrder.findFirst.mockResolvedValue({
        id: 5,
        orderNo: 'RO20260521-005',
        status: 'completed',
      });
      mockPrisma.repairOrder.create.mockResolvedValue({
        id: 6,
        orderNo: 'RO20260521-006',
        plateNumber: '苏D22222',
        status: 'pending',
        customer: { id: 1, name: '张三', phone: '13800138000' },
        advisor: { id: 2, realName: '李四' },
        items: [{ id: 4, type: 'labor', name: '检查', laborFee: 100, partFee: 0, amount: 100 }],
        createdAt: new Date('2026-05-21'),
        updatedAt: new Date('2026-05-21'),
      });

      const result = await service.create(dto);

      // 序号应递增为 006
      expect(result.orderNo).toMatch(/-006$/);
    });
  });

  describe('update', () => {
    it('应更新工单基本信息', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'pending',
        faultDesc: '原始描述',
      });
      mockPrisma.repairOrder.update.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        faultDesc: '更新后的故障描述',
        checkResult: '检查完成',
        status: 'pending',
        customer: { id: 1, name: '张三' },
        advisor: { id: 2, realName: '李四' },
        items: [],
        createdAt: new Date('2026-05-20'),
        updatedAt: new Date('2026-05-21'),
      });

      const dto = {
        faultDesc: '更新后的故障描述',
        checkResult: '检查完成',
      } as any;
      const result = await service.update(1, dto);

      expect(result.faultDesc).toBe('更新后的故障描述');
      expect(result.checkResult).toBe('检查完成');
      // 不含 items 时不进入事务
      expect(mockPrisma.repairOrder.update).toHaveBeenCalled();
    });

    it('含 items 时应通过事务替换 items', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'pending',
      });
      mockPrisma.repairOrderItem.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.repairOrderItem.createMany.mockResolvedValue({ count: 3 });
      mockPrisma.repairOrder.update.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'pending',
        customer: { id: 1, name: '张三' },
        advisor: { id: 2, realName: '李四' },
        items: [
          { id: 3, type: 'labor', name: '新项目1', laborFee: 150, partFee: 0, amount: 150 },
          { id: 4, type: 'part', name: '新项目2', laborFee: 0, partFee: 350, amount: 350 },
        ],
        createdAt: new Date('2026-05-20'),
        updatedAt: new Date('2026-05-21'),
      });

      const dto = {
        items: [
          { type: 'labor', name: '新项目1', laborFee: 150, amount: 150 },
          { type: 'part', name: '新项目2', partFee: 350, amount: 350 },
        ],
      } as any;
      const result = await service.update(1, dto);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.repairOrderItem.deleteMany).toHaveBeenCalledWith({
        where: { repairOrderId: 1 },
      });
      expect(mockPrisma.repairOrderItem.createMany).toHaveBeenCalled();
      expect(result.items).toHaveLength(2);
    });

    it('不存在的 ID 应抛出 NotFoundException', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(null);

      const dto = { faultDesc: '更新描述' } as any;
      await expect(service.update(999, dto)).rejects.toThrow(NotFoundException);
      await expect(service.update(999, dto)).rejects.toThrow('工单 #999 不存在');
    });
  });

  // ========== 状态流转 ==========

  describe('updateStatus', () => {
    it('pending → assigned 合法状态流转', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'pending',
      });
      mockPrisma.repairOrder.update.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'assigned',
      });

      const result = await service.updateStatus(1, 'assigned');

      expect(result.status).toBe('assigned');
      expect(mockWsGateway.notifyOrderStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 1,
          orderNo: 'RO20260520-001',
          status: 'assigned',
          statusName: '已派工',
        }),
      );
    });

    it('非法状态字符串应抛出 BadRequestException', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'pending',
      });

      await expect(service.updateStatus(1, 'invalid_status')).rejects.toThrow(BadRequestException);
      await expect(service.updateStatus(1, 'invalid_status')).rejects.toThrow('无效状态');
    });

    it('非法跳转应抛出 BadRequestException（如 pending → completed）', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'pending',
      });

      await expect(service.updateStatus(1, 'completed')).rejects.toThrow(BadRequestException);
      await expect(service.updateStatus(1, 'completed')).rejects.toThrow('不允许');
    });

    it('assigned → repairing 合法流转', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'assigned',
      });
      mockPrisma.repairOrder.update.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'repairing',
      });

      const result = await service.updateStatus(1, 'repairing');

      expect(result.status).toBe('repairing');
      expect(mockWsGateway.notifyOrderStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'repairing',
          statusName: '维修中',
        }),
      );
    });

    it('不存在的工单应抛出 NotFoundException', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus(999, 'assigned')).rejects.toThrow(NotFoundException);
      await expect(service.updateStatus(999, 'assigned')).rejects.toThrow('工单 #999 不存在');
    });

    it('delivered 状态不能再流转', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'delivered',
      });

      await expect(service.updateStatus(1, 'repairing')).rejects.toThrow(BadRequestException);
      await expect(service.updateStatus(1, 'repairing')).rejects.toThrow('不允许');
    });
  });

  describe('dispatch', () => {
    it('应创建派工记录并将状态改为 assigned', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'pending',
      });
      mockPrisma.dispatchRecord.create.mockResolvedValue({
        id: 1,
        repairOrderId: 1,
        technicianId: 5,
        standardHours: 3,
        status: 'pending',
        technician: { id: 5, realName: '赵六' },
      });
      mockPrisma.repairOrder.update.mockResolvedValue({
        id: 1,
        status: 'assigned',
      });

      const dto = {
        repairOrderId: 1,
        technicianId: 5,
        standardHours: 3,
      } as any;
      const result = await service.dispatch(dto);

      expect(result.id).toBe(1);
      expect(result.technicianId).toBe(5);
      expect(result.technician.realName).toBe('赵六');
      expect(mockPrisma.repairOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { status: 'assigned' },
        }),
      );
    });

    it('非 pending/assigned 状态应抛出 BadRequestException', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'repairing',
      });

      const dto = { repairOrderId: 1, technicianId: 5 } as any;
      await expect(service.dispatch(dto)).rejects.toThrow(BadRequestException);
      await expect(service.dispatch(dto)).rejects.toThrow('无法派工');
    });

    it('不存在的工单应抛出 NotFoundException', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(null);

      const dto = { repairOrderId: 999, technicianId: 5 } as any;
      await expect(service.dispatch(dto)).rejects.toThrow(NotFoundException);
      await expect(service.dispatch(dto)).rejects.toThrow('工单 #999 不存在');
    });
  });

  describe('completeDispatch', () => {
    it('应更新派工记录并改工单状态为 quality_check', async () => {
      mockPrisma.dispatchRecord.findUnique.mockResolvedValue({
        id: 1,
        repairOrderId: 1,
        technicianId: 5,
        standardHours: 3,
        status: 'pending',
      });
      mockPrisma.dispatchRecord.update.mockResolvedValue({
        id: 1,
        repairOrderId: 1,
        actualHours: 4,
        status: 'completed',
      });
      mockPrisma.repairOrder.update.mockResolvedValue({
        id: 1,
        status: 'quality_check',
      });

      const result = await service.completeDispatch(1, 4);

      expect(result.status).toBe('completed');
      expect(result.actualHours).toBe(4);
      expect(mockPrisma.repairOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'quality_check' },
        }),
      );
    });

    it('不存在的派工记录应抛出 NotFoundException', async () => {
      mockPrisma.dispatchRecord.findUnique.mockResolvedValue(null);

      await expect(service.completeDispatch(999, 3)).rejects.toThrow(NotFoundException);
      await expect(service.completeDispatch(999, 3)).rejects.toThrow('派工记录 #999 不存在');
    });
  });

  describe('qualityCheck', () => {
    it('质检通过应将状态改为 completed', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'quality_check',
      });
      mockPrisma.qualityCheck.upsert.mockResolvedValue({
        id: 1,
        repairOrderId: 1,
        checkerId: 3,
        itemsChecked: ['灯光检查', '制动检查'],
        roadTest: '正常',
        isPassed: 1,
        remark: '全部合格',
      });
      mockPrisma.repairOrder.update.mockResolvedValue({
        id: 1,
        status: 'completed',
        actualCompleteTime: new Date('2026-05-21'),
      });

      const dto = {
        repairOrderId: 1,
        checkerId: 3,
        itemsChecked: ['灯光检查', '制动检查'],
        roadTest: '正常',
        isPassed: 1,
        remark: '全部合格',
      } as any;
      const result = await service.qualityCheck(dto);

      expect(result.isPassed).toBe(1);
      expect(mockPrisma.repairOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });

    it('质检不通过应回退到 repairing', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'quality_check',
      });
      mockPrisma.qualityCheck.upsert.mockResolvedValue({
        id: 1,
        repairOrderId: 1,
        checkerId: 3,
        itemsChecked: ['制动检查'],
        roadTest: '制动偏软',
        isPassed: 0,
        remark: '需重新调整制动系统',
      });
      mockPrisma.repairOrder.update.mockResolvedValue({
        id: 1,
        status: 'repairing',
      });

      const dto = {
        repairOrderId: 1,
        checkerId: 3,
        itemsChecked: ['制动检查'],
        roadTest: '制动偏软',
        isPassed: 0,
        remark: '需重新调整制动系统',
      } as any;
      const result = await service.qualityCheck(dto);

      expect(result.isPassed).toBe(0);
      expect(mockPrisma.repairOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'repairing' },
        }),
      );
    });

    it('非 quality_check 状态应抛出 BadRequestException', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'repairing',
      });

      const dto = {
        repairOrderId: 1,
        checkerId: 3,
        isPassed: 1,
      } as any;
      await expect(service.qualityCheck(dto)).rejects.toThrow(BadRequestException);
      await expect(service.qualityCheck(dto)).rejects.toThrow('当前状态不可质检');
    });
  });

  describe('deliver', () => {
    it('completed → delivered 应正常流转', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'completed',
      });
      mockPrisma.repairOrder.update.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'delivered',
      });

      const result = await service.deliver(1);

      expect(result.status).toBe('delivered');
      expect(mockPrisma.repairOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { status: 'delivered' },
        }),
      );
    });

    it('非 completed 状态应抛出 BadRequestException', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'repairing',
      });

      await expect(service.deliver(1)).rejects.toThrow(BadRequestException);
      await expect(service.deliver(1)).rejects.toThrow('需要先完成质检才能交车');
    });

    it('不存在的工单应抛出 NotFoundException', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(null);

      await expect(service.deliver(999)).rejects.toThrow(NotFoundException);
      await expect(service.deliver(999)).rejects.toThrow('工单 #999 不存在');
    });
  });

  // ========== 其他操作 ==========

  describe('attachCheckImages', () => {
    it('应更新工单的 checkImages 字段', async () => {
      mockPrisma.repairOrder.update.mockResolvedValue({
        id: 1,
        checkImages: ['https://img.example.com/check1.jpg', 'https://img.example.com/check2.jpg'],
      });

      const images = ['https://img.example.com/check1.jpg', 'https://img.example.com/check2.jpg'];
      const result = await service.attachCheckImages(1, images);

      expect(result.checkImages).toEqual(images);
      expect(mockPrisma.repairOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { checkImages: images },
        }),
      );
    });
  });

  describe('calculateTotal', () => {
    it('应从 items 计算并更新费用合计', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        discount: 100,
        items: [
          { id: 1, type: 'labor', name: '工时费1', laborFee: 300, partFee: 0, amount: 300 },
          { id: 2, type: 'labor', name: '工时费2', laborFee: 200, partFee: 0, amount: 200 },
          { id: 3, type: 'part', name: '配件1', laborFee: 0, partFee: 500, amount: 500 },
          { id: 4, type: 'part', name: '配件2', laborFee: 0, partFee: 300, amount: 300 },
        ],
      });
      mockPrisma.repairOrder.update.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        totalLaborFee: 500,
        totalPartFee: 800,
        totalAmount: 1300,
        discount: 100,
        finalAmount: 1200,
        items: [
          { id: 1, type: 'labor', name: '工时费1', laborFee: 300, partFee: 0, amount: 300 },
          { id: 2, type: 'labor', name: '工时费2', laborFee: 200, partFee: 0, amount: 200 },
          { id: 3, type: 'part', name: '配件1', laborFee: 0, partFee: 500, amount: 500 },
          { id: 4, type: 'part', name: '配件2', laborFee: 0, partFee: 300, amount: 300 },
        ],
        createdAt: new Date('2026-05-20'),
        updatedAt: new Date('2026-05-21'),
      });

      const result = await service.calculateTotal(1);

      expect(result.totalLaborFee).toBe(500);
      expect(result.totalPartFee).toBe(800);
      expect(result.totalAmount).toBe(1300);
      expect(result.finalAmount).toBe(1200);
      expect(mockPrisma.repairOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalLaborFee: 500,
            totalPartFee: 800,
            totalAmount: 1300,
            finalAmount: 1200,
          }),
        }),
      );
    });

    it('不存在的工单应抛出 NotFoundException', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(null);

      await expect(service.calculateTotal(999)).rejects.toThrow(NotFoundException);
      await expect(service.calculateTotal(999)).rejects.toThrow('工单 #999 不存在');
    });
  });

  describe('remove', () => {
    it('应级联删除工单及所有关联记录', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue({
        id: 1,
        orderNo: 'RO20260520-001',
        status: 'completed',
      });
      mockPrisma.qualityCheck.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.dispatchRecord.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.repairOrderItem.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.paymentRecord.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.repairOrder.delete.mockResolvedValue({ id: 1 });

      const result = await service.remove(1);

      expect(result).toEqual({ message: '工单已删除' });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      // 验证传入的是数组（批量模式）
      const txArg = mockPrisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(txArg)).toBe(true);
      expect(txArg).toHaveLength(5);
    });

    it('不存在的工单应抛出 NotFoundException', async () => {
      mockPrisma.repairOrder.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999)).rejects.toThrow('工单 #999 不存在');
      // 确认没有删除操作被执行
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
