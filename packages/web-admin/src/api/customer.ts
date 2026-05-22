import request from './request'

export function getCustomers(params?: any) { return request.get('/customers', { params }) }
export function getCustomer(id: number) { return request.get(`/customers/${id}`) }
export function createCustomer(data: any) { return request.post('/customers', data) }
export function updateCustomer(id: number, data: any) { return request.put(`/customers/${id}`, data) }
export function deleteCustomer(id: number) { return request.delete(`/customers/${id}`) }
export function getReminds(type?: string) { return request.get('/customers/reminds', { params: { type } }) }
export function getCustomerVehicles(customerId: number) { return request.get(`/customers/${customerId}/vehicles`) }
export function addCustomerVehicle(customerId: number, data: any) { return request.post(`/customers/${customerId}/vehicles`, data) }
export function updateCustomerVehicle(customerId: number, id: number, data: any) { return request.put(`/customers/${customerId}/vehicles/${id}`, data) }
export function deleteCustomerVehicle(customerId: number, id: number) { return request.delete(`/customers/${customerId}/vehicles/${id}`) }
export function getFollowRecords(customerId: number) { return request.get(`/customers/${customerId}/follows`) }
export function addFollowRecord(customerId: number, data: any) { return request.post(`/customers/${customerId}/follows`, data) }
