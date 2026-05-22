import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationService } from '../notification/notification.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
  },
  namespace: 'ws',
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private notificationService: NotificationService;

  setNotificationService(service: NotificationService) {
    this.notificationService = service;
  }

  handleConnection(client: Socket) {
    console.log(`WS客户端连接: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`WS客户端断开: ${client.id}`);
  }

  // 推送新工单通知
  notifyNewRepairOrder(data: any) {
    this.server.emit('new-repair-order', data);
    this.saveNotification({
      type: 'repair',
      title: `新工单 ${data.orderNo} 已创建`,
      content: `客户：${data.customerName || '-'} · 车牌：${data.plateNumber || '-'}`,
      targetType: 'repair_order',
      targetId: data.id || data.orderId,
    });
  }

  // 推送工单状态变更
  notifyOrderStatusChange(data: { orderId: number; orderNo: string; status: string; statusName: string }) {
    this.server.emit('order-status-change', data);
    this.saveNotification({
      type: 'repair',
      title: `工单 ${data.orderNo} 状态变更`,
      content: `状态更新为：${data.statusName || data.status}`,
      targetType: 'repair_order',
      targetId: data.orderId,
    });
  }

  // 推送库存预警
  notifyLowStock(data: { partId: number; partName: string; quantity: number; safetyStock: number }) {
    this.server.emit('low-stock-alert', data);
    this.saveNotification({
      type: 'stock',
      title: `配件「${data.partName}」库存不足`,
      content: `当前库存 ${data.quantity}，安全库存 ${data.safetyStock}`,
      targetType: 'part',
      targetId: data.partId,
    });
  }

  // 推送新客户注册
  notifyNewCustomer(data: { customerId: number; name: string; phone: string }) {
    this.server.emit('new-customer', data);
    this.saveNotification({
      type: 'customer',
      title: `新客户注册：${data.name}`,
      content: `电话：${data.phone}`,
      targetType: 'customer',
      targetId: data.customerId,
    });
  }

  // 推送系统通知
  notifySystem(message: string, type: string = 'info') {
    this.server.emit('system-notification', { message, type, time: new Date().toISOString() });
    this.saveNotification({
      type: 'system',
      title: '系统通知',
      content: message,
    });
  }

  // ==================== 销售模块推送 ====================

  // 推送新销售线索
  notifyNewSalesLead(data: { leadId: number; customerName: string; intentModel?: string }) {
    this.server.emit('new-sales-lead', data);
    this.saveNotification({
      type: 'sales',
      title: `新销售线索：${data.customerName || '-'}`,
      content: data.intentModel ? `意向车型：${data.intentModel}` : '新线索已录入',
      targetType: 'sales_lead',
      targetId: data.leadId,
    });
  }

  // 推送新销售订单
  notifyNewSalesOrder(data: { orderId: number; orderNo: string; customerName?: string; totalAmount?: number }) {
    this.server.emit('new-sales-order', data);
    this.saveNotification({
      type: 'sales',
      title: `新销售订单 ${data.orderNo} 已创建`,
      content: `客户：${data.customerName || '-'} · 金额：¥${data.totalAmount ?? 0}`,
      targetType: 'sales_order',
      targetId: data.orderId,
    });
  }

  // 推送订单交车
  notifyOrderDelivered(data: { orderId: number; orderNo: string; customerName?: string }) {
    this.server.emit('order-delivered', data);
    this.saveNotification({
      type: 'sales',
      title: `订单 ${data.orderNo} 已交车`,
      content: `客户：${data.customerName || '-'}`,
      targetType: 'sales_order',
      targetId: data.orderId,
    });
  }

  // ==================== 美容模块推送 ====================

  // 推送新美容预约
  notifyNewBeautyAppointment(data: { appointmentId: number; customerName?: string; serviceType?: string }) {
    this.server.emit('new-beauty-appointment', data);
    this.saveNotification({
      type: 'beauty',
      title: `新美容预约`,
      content: `客户：${data.customerName || '-'} · 类型：${data.serviceType || '-'}`,
      targetType: 'beauty',
      targetId: data.appointmentId,
    });
  }

  // 推送美容预约状态变更
  notifyBeautyAppointmentStatusChange(data: { appointmentId: number; status: string; statusName: string; customerName?: string }) {
    this.server.emit('beauty-appointment-status-change', data);
    this.saveNotification({
      type: 'beauty',
      title: `美容预约状态变更`,
      content: `客户：${data.customerName || '-'} · 状态更新为：${data.statusName}`,
      targetType: 'beauty',
      targetId: data.appointmentId,
    });
  }

  // ==================== 财务模块推送 ====================

  // 推送新收款
  notifyNewPayment(data: { paymentId: number; paymentNo: string; customerName?: string; amount: number; type: string }) {
    this.server.emit('new-payment', data);
    this.saveNotification({
      type: 'finance',
      title: `新收款：${data.paymentNo}`,
      content: `客户：${data.customerName || '-'} · 金额：¥${data.amount} · 类型：${data.type}`,
      targetType: 'payment',
      targetId: data.paymentId,
    });
  }

  // 推送应收还款
  notifyReceivablePaid(data: { receivableId: number; customerName?: string; amount: number }) {
    this.server.emit('receivable-paid', data);
    this.saveNotification({
      type: 'finance',
      title: `应收已还款`,
      content: `客户：${data.customerName || '-'} · 还款金额：¥${data.amount}`,
      targetType: 'receivable',
      targetId: data.receivableId,
    });
  }

  // 推送应付付款
  notifyPayablePaid(data: { payableId: number; supplierName?: string; amount: number }) {
    this.server.emit('payable-paid', data);
    this.saveNotification({
      type: 'finance',
      title: `应付已付款`,
      content: `供应商：${data.supplierName || '-'} · 付款金额：¥${data.amount}`,
      targetType: 'payable',
      targetId: data.payableId,
    });
  }

  private saveNotification(data: {
    type: string;
    title: string;
    content: string;
    targetType?: string;
    targetId?: number;
  }) {
    if (this.notificationService) {
      this.notificationService.create(data).catch((err: Error) => {
        console.error('保存通知失败:', err.message);
      });
    }
  }
}
