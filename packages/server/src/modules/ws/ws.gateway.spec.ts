import { WsGateway } from './ws.gateway';
import { NotificationService } from '../notification/notification.service';

describe('WsGateway', () => {
  let gateway: WsGateway;
  let mockServer: any;
  let mockNotificationService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockServer = {
      emit: jest.fn(),
    };

    mockNotificationService = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    // Gateway 不能通过 Test.createTestingModule，需手动 new + 赋值属性
    gateway = new WsGateway();
    (gateway as any).notificationService = mockNotificationService;
    gateway.server = mockServer;
    // stub setNotificationService
    gateway.setNotificationService(mockNotificationService);
  });

  describe('handleConnection', () => {
    it('应在客户端连接时打印日志', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockSocket = { id: 'socket-test-001' } as any;

      gateway.handleConnection(mockSocket);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('socket-test-001'));
      consoleSpy.mockRestore();
    });
  });

  describe('handleDisconnect', () => {
    it('应在客户端断开时打印日志', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockSocket = { id: 'socket-test-002' } as any;

      gateway.handleDisconnect(mockSocket);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('socket-test-002'));
      consoleSpy.mockRestore();
    });
  });

  describe('notifyNewRepairOrder', () => {
    it('应向所有客户端推送新工单事件并保存通知', () => {
      const data = {
        id: 1,
        orderId: 1,
        orderNo: 'RO20260521-001',
        customerName: '张三',
        plateNumber: '苏A12345',
      };

      gateway.notifyNewRepairOrder(data);

      expect(mockServer.emit).toHaveBeenCalledWith('new-repair-order', data);
      expect(mockNotificationService.create).toHaveBeenCalledWith({
        type: 'repair',
        title: '新工单 RO20260521-001 已创建',
        content: '客户：张三 · 车牌：苏A12345',
        targetType: 'repair_order',
        targetId: 1,
      });
    });

    it('无客户名和车牌时应使用占位符', () => {
      const data = { orderNo: 'RO20260521-002' };

      gateway.notifyNewRepairOrder(data);

      const callArg = mockNotificationService.create.mock.calls[0][0];
      expect(callArg.content).toBe('客户：- · 车牌：-');
    });
  });

  describe('notifyOrderStatusChange', () => {
    it('应向所有客户端推送状态变更事件', () => {
      const data = {
        orderId: 1,
        orderNo: 'RO20260521-001',
        status: 'repairing',
        statusName: '维修中',
      };

      gateway.notifyOrderStatusChange(data);

      expect(mockServer.emit).toHaveBeenCalledWith('order-status-change', data);
      expect(mockNotificationService.create).toHaveBeenCalledWith({
        type: 'repair',
        title: '工单 RO20260521-001 状态变更',
        content: '状态更新为：维修中',
        targetType: 'repair_order',
        targetId: 1,
      });
    });

    it('无 statusName 时应使用 status', () => {
      const data = {
        orderId: 2,
        orderNo: 'RO20260521-003',
        status: 'completed',
        statusName: '',
      };

      gateway.notifyOrderStatusChange(data);

      const callArg = mockNotificationService.create.mock.calls[0][0];
      expect(callArg.content).toBe('状态更新为：completed');
    });
  });

  describe('notifyLowStock', () => {
    it('应向所有客户端推送库存预警事件', () => {
      const data = {
        partId: 1,
        partName: '机油滤芯',
        quantity: 3,
        safetyStock: 10,
      };

      gateway.notifyLowStock(data);

      expect(mockServer.emit).toHaveBeenCalledWith('low-stock-alert', data);
      expect(mockNotificationService.create).toHaveBeenCalledWith({
        type: 'stock',
        title: '配件「机油滤芯」库存不足',
        content: '当前库存 3，安全库存 10',
        targetType: 'part',
        targetId: 1,
      });
    });
  });

  describe('notifyNewCustomer', () => {
    it('应向所有客户端推送新客户事件', () => {
      const data = {
        customerId: 1,
        name: '张三',
        phone: '13800138000',
      };

      gateway.notifyNewCustomer(data);

      expect(mockServer.emit).toHaveBeenCalledWith('new-customer', data);
      expect(mockNotificationService.create).toHaveBeenCalledWith({
        type: 'customer',
        title: '新客户注册：张三',
        content: '电话：13800138000',
        targetType: 'customer',
        targetId: 1,
      });
    });
  });

  describe('notifySystem', () => {
    it('应向所有客户端推送系统通知', () => {
      gateway.notifySystem('系统将于今晚 22:00 维护升级', 'warning');

      expect(mockServer.emit).toHaveBeenCalledWith('system-notification', {
        message: '系统将于今晚 22:00 维护升级',
        type: 'warning',
        time: expect.any(String),
      });
      expect(mockNotificationService.create).toHaveBeenCalledWith({
        type: 'system',
        title: '系统通知',
        content: '系统将于今晚 22:00 维护升级',
      });
    });

    it('type 默认应为 info', () => {
      gateway.notifySystem('这是一条测试消息');

      const emitCall = mockServer.emit.mock.calls[0][1];
      expect(emitCall.type).toBe('info');
    });
  });

  describe('saveNotification', () => {
    it('未注入 notificationService 时不应抛错', () => {
      gateway.setNotificationService(null as any);

      expect(() => {
        gateway.notifySystem('测试消息');
      }).not.toThrow();
      // 确认 server.emit 仍然被调用
      expect(mockServer.emit).toHaveBeenCalled();
    });

    it('notificationService.create 失败时应静默捕获错误', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockNotificationService.create.mockRejectedValue(new Error('数据库连接失败'));

      gateway.notifySystem('测试消息');

      // 等待 Promise.catch 回调执行
      await new Promise((r) => setTimeout(r, 100));
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toContain('保存通知失败');
      consoleSpy.mockRestore();
    });
  });
});
