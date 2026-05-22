import { io, Socket } from 'socket.io-client';
import { ElNotification } from 'element-plus';
import router from '@/router';

let socket: Socket | null = null;

// WebSocket 事件回调存储（供页面组件监听实时更新）
const eventCallbacks: Record<string, Set<Function>> = {};

/**
 * 触发 WebSocket 事件回调
 */
function emitEvent(event: string, data: any) {
  eventCallbacks[event]?.forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.error(`WebSocket 事件 ${event} 回调异常:`, e);
    }
  });
}

export function connectSocket() {
  if (socket?.connected) return;

  const wsUrl = import.meta.env.VITE_WS_URL
    || (location.hostname === 'localhost'
      ? `http://${location.hostname}:3000/ws`
      : `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`);
  socket = io(wsUrl, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('WebSocket 已连接');
  });

  // ==================== 现有事件 ====================

  socket.on('new-repair-order', (data: any) => {
    ElNotification.success({
      title: '新工单',
      message: `工单 ${data.orderNo} 已创建`,
      onClick: () => router.push(`/repair/orders?id=${data.id || data.orderId}`),
    });
    emitEvent('new-repair-order', data);
  });

  socket.on('order-status-change', (data: any) => {
    ElNotification.info({
      title: '工单状态更新',
      message: `工单 ${data.orderNo}: ${data.statusName}`,
      onClick: () => router.push(`/repair/orders?id=${data.orderId}`),
    });
    emitEvent('order-status-change', data);
  });

  socket.on('low-stock-alert', (data: any) => {
    ElNotification.warning({
      title: '库存预警',
      message: `${data.partName} 库存不足 (${data.quantity}/${data.safetyStock})`,
      onClick: () => router.push(`/inventory/parts?id=${data.partId}`),
    });
    emitEvent('low-stock-alert', data);
  });

  socket.on('new-customer', (data: any) => {
    ElNotification.success({
      title: '新客户',
      message: `${data.name} 已添加为客户`,
      onClick: () => router.push(`/customer/list?id=${data.customerId}`),
    });
    emitEvent('new-customer', data);
  });

  socket.on('system-notification', (data: any) => {
    ElNotification({ title: '系统通知', message: data.message, type: data.type as any });
    emitEvent('system-notification', data);
  });

  // ==================== 销售模块事件 ====================

  socket.on('new-sales-lead', (data: any) => {
    ElNotification.success({
      title: '新销售线索',
      message: `客户：${data.customerName || '-'}`,
      onClick: () => router.push('/sales/leads'),
    });
    emitEvent('new-sales-lead', data);
  });

  socket.on('new-sales-order', (data: any) => {
    ElNotification.success({
      title: '新销售订单',
      message: `订单 ${data.orderNo} - 客户：${data.customerName || '-'}`,
      onClick: () => router.push('/sales/orders'),
    });
    emitEvent('new-sales-order', data);
  });

  socket.on('order-delivered', (data: any) => {
    ElNotification.success({
      title: '订单已交车',
      message: `订单 ${data.orderNo} - 客户：${data.customerName || '-'}`,
      onClick: () => router.push('/sales/orders'),
    });
    emitEvent('order-delivered', data);
  });

  // ==================== 美容模块事件 ====================

  socket.on('new-beauty-appointment', (data: any) => {
    ElNotification.success({
      title: '新美容预约',
      message: `客户：${data.customerName || '-'} · 类型：${data.serviceType || '-'}`,
      onClick: () => router.push('/beauty/schedule'),
    });
    emitEvent('new-beauty-appointment', data);
  });

  socket.on('beauty-appointment-status-change', (data: any) => {
    ElNotification.info({
      title: '美容预约状态变更',
      message: `客户：${data.customerName || '-'} · 状态：${data.statusName}`,
      onClick: () => router.push('/beauty/schedule'),
    });
    emitEvent('beauty-appointment-status-change', data);
  });

  // ==================== 财务模块事件 ====================

  socket.on('new-payment', (data: any) => {
    ElNotification.success({
      title: '新收款',
      message: `${data.paymentNo} - 客户：${data.customerName || '-'} · ¥${data.amount}`,
      onClick: () => router.push('/finance/cashier'),
    });
    emitEvent('new-payment', data);
  });

  socket.on('receivable-paid', (data: any) => {
    ElNotification.success({
      title: '应收已还款',
      message: `客户：${data.customerName || '-'} · 还款：¥${data.amount}`,
      onClick: () => router.push('/finance/receivable'),
    });
    emitEvent('receivable-paid', data);
  });

  socket.on('payable-paid', (data: any) => {
    ElNotification.success({
      title: '应付已付款',
      message: `供应商：${data.supplierName || '-'} · 付款：¥${data.amount}`,
      onClick: () => router.push('/finance/payable'),
    });
    emitEvent('payable-paid', data);
  });

  // ==================== 通用刷新事件 ====================

  socket.on('data-refresh', (data: any) => {
    emitEvent('data-refresh', data);
  });
}

/**
 * 注册 WebSocket 事件监听回调（页面组件用）
 */
export function onSocketEvent(event: string, callback: Function) {
  if (!eventCallbacks[event]) {
    eventCallbacks[event] = new Set();
  }
  eventCallbacks[event].add(callback);
}

/**
 * 移除 WebSocket 事件监听回调
 */
export function offSocketEvent(event: string, callback: Function) {
  eventCallbacks[event]?.delete(callback);
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
