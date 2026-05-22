import request from './request'

export function getRepairOrders(params?: any) { return request.get('/repair', { params }) }
export function getRepairOrder(id: number) { return request.get(`/repair/${id}`) }
export function createRepairOrder(data: any) { return request.post('/repair', data) }
export function updateRepairOrder(id: number, data: any) { return request.put(`/repair/${id}`, data) }
export function updateOrderStatus(id: number, status: string, actualHours?: number) { return request.put(`/repair/${id}/status`, { status, actualHours }) }
export function dispatchTechnician(data: any) { return request.post('/repair/dispatch', data) }
export function completeDispatch(id: number, actualHours: number) { return request.put(`/repair/dispatch/${id}/complete`, { actualHours }) }
export function qualityCheck(data: any) { return request.post('/repair/quality-check', data) }
export function calculateTotal(id: number) { return request.post(`/repair/${id}/calculate`) }
export function deliverOrder(id: number, data: any) { return request.put(`/repair/${id}/deliver`, data) }
export function deleteRepairOrder(id: number) { return request.delete(`/repair/${id}`) }
