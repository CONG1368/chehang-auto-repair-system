import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: 'ws',
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`WS客户端连接: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`WS客户端断开: ${client.id}`);
  }

  // 推送新工单通知
  notifyNewRepairOrder(data: any) {
    this.server.emit('new-repair-order', data);
  }

  // 推送工单状态变更
  notifyOrderStatusChange(data: { orderId: number; orderNo: string; status: string; statusName: string }) {
    this.server.emit('order-status-change', data);
  }

  // 推送库存预警
  notifyLowStock(data: { partId: number; partName: string; quantity: number; safetyStock: number }) {
    this.server.emit('low-stock-alert', data);
  }

  // 推送新客户注册
  notifyNewCustomer(data: { customerId: number; name: string; phone: string }) {
    this.server.emit('new-customer', data);
  }

  // 推送系统通知
  notifySystem(message: string, type: string = 'info') {
    this.server.emit('system-notification', { message, type, time: new Date().toISOString() });
  }
}
