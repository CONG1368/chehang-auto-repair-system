import request from './request'

export function getInvoices(params?: any) { return request.get('/invoice', { params }) }
export function getInvoice(id: number) { return request.get(`/invoice/${id}`) }
export function createInvoice(data: any) { return request.post('/invoice', data) }
export function updateInvoice(id: number, data: any) { return request.put(`/invoice/${id}`, data) }
export function cancelInvoice(id: number) { return request.put(`/invoice/${id}/cancel`) }
export function getInvoiceStats() { return request.get('/invoice/stats') }
