import request from './request'

export function getNotifications(params?: any) { return request.get('/notifications', { params }) }
export function getUnreadCount() { return request.get('/notifications/unread-count') }
export function markAsRead(id: number) { return request.put(`/notifications/${id}/read`) }
export function markAllRead() { return request.put('/notifications/read-all') }
