import request from './request'

export function getServices(params?: any) { return request.get('/beauty/services', { params }) }
export function createService(data: any) { return request.post('/beauty/services', data) }
export function updateService(id: number, data: any) { return request.put(`/beauty/services/${id}`, data) }
export function deleteService(id: number) { return request.delete(`/beauty/services/${id}`) }

export function getPackages(params?: any) { return request.get('/beauty/packages', { params }) }
export function createPackage(data: any) { return request.post('/beauty/packages', data) }
export function updatePackage(id: number, data: any) { return request.put(`/beauty/packages/${id}`, data) }
export function deletePackage(id: number) { return request.delete(`/beauty/packages/${id}`) }

export function getAppointments(params?: any) { return request.get('/beauty/appointments', { params }) }
export function createAppointment(data: any) { return request.post('/beauty/appointments', data) }
export function updateAppointment(id: number, data: any) { return request.put(`/beauty/appointments/${id}`, data) }
export function updateAppointmentStatus(id: number, status: string) { return request.put(`/beauty/appointments/${id}/status`, { status }) }
export function deleteAppointment(id: number) { return request.delete(`/beauty/appointments/${id}`) }

export function getCards(params?: any) { return request.get('/beauty/cards', { params }) }
export function getCard(id: number) { return request.get(`/beauty/cards/${id}`) }
export function createCard(data: any) { return request.post('/beauty/cards', data) }
export function updateCard(id: number, data: any) { return request.put(`/beauty/cards/${id}`, data) }
export function deleteCard(id: number) { return request.delete(`/beauty/cards/${id}`) }

export function getRecharges(params?: any) { return request.get('/beauty/recharges', { params }) }
export function createRecharge(data: any) { return request.post('/beauty/recharges', data) }
