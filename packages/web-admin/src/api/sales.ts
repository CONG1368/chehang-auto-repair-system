import request from './request'

export function getVehicles(params?: any) { return request.get('/sales/vehicles', { params }) }
export function getVehicle(id: number) { return request.get(`/sales/vehicles/${id}`) }
export function createVehicle(data: any) { return request.post('/sales/vehicles', data) }
export function updateVehicle(id: number, data: any) { return request.put(`/sales/vehicles/${id}`, data) }
export function deleteVehicle(id: number) { return request.delete(`/sales/vehicles/${id}`) }

export function getLeads(params?: any) { return request.get('/sales/leads', { params }) }
export function getLead(id: number) { return request.get(`/sales/leads/${id}`) }
export function createLead(data: any) { return request.post('/sales/leads', data) }
export function updateLead(id: number, data: any) { return request.put(`/sales/leads/${id}`, data) }
export function deleteLead(id: number) { return request.delete(`/sales/leads/${id}`) }
export function getLeadFollows(leadId: number) { return request.get(`/sales/leads/${leadId}/follows`) }
export function addLeadFollow(leadId: number, data: any) { return request.post(`/sales/leads/${leadId}/follows`, data) }

export function getSalesOrders(params?: any) { return request.get('/sales/orders', { params }) }
export function getSalesOrder(id: number) { return request.get(`/sales/orders/${id}`) }
export function createSalesOrder(data: any) { return request.post('/sales/orders', data) }
export function updateSalesOrder(id: number, data: any) { return request.put(`/sales/orders/${id}`, data) }
export function deleteSalesOrder(id: number) { return request.delete(`/sales/orders/${id}`) }
export function deliverVehicle(id: number, data: any) { return request.put(`/sales/orders/${id}/delivery`, data) }
