import { io, Socket } from 'socket.io-client';
import { ElNotification } from 'element-plus';

let socket: Socket | null = null;

export function connectSocket() {
  if (socket?.connected) return;

  socket = io('http://localhost:3000/ws', {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('WebSocket 已连接');
  });

  socket.on('new-repair-order', (data: any) => {
    ElNotification.success({ title: '新工单', message: `工单 ${data.orderNo} 已创建` });
  });

  socket.on('order-status-change', (data: any) => {
    ElNotification.info({ title: '工单状态更新', message: `工单 ${data.orderNo}: ${data.statusName}` });
  });

  socket.on('low-stock-alert', (data: any) => {
    ElNotification.warning({ title: '库存预警', message: `${data.partName} 库存不足 (${data.quantity}/${data.safetyStock})` });
  });

  socket.on('new-customer', (data: any) => {
    ElNotification.success({ title: '新客户', message: `${data.name} 已添加为客户` });
  });

  socket.on('system-notification', (data: any) => {
    ElNotification({ title: '系统通知', message: data.message, type: data.type as any });
  });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
