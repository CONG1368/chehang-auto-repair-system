import request from './request'

export function getParts(params?: any) { return request.get('/inventory', { params }) }
export function getPart(id: number) { return request.get(`/inventory/${id}`) }
export function createPart(data: any) { return request.post('/inventory', data) }
export function updatePart(id: number, data: any) { return request.put(`/inventory/${id}`, data) }
export function deletePart(id: number) { return request.delete(`/inventory/${id}`) }
export function getLowStockParts() { return request.get('/inventory/low-stock') }
export function getStockRecords(params?: any) { return request.get('/inventory/stock-records', { params }) }
export function stockIn(data: any) { return request.post('/inventory/stock-in', data) }
export function stockOut(data: any) { return request.post('/inventory/stock-out', data) }

export function getPurchaseOrders(params?: any) { return request.get('/inventory/purchase', { params }) }
export function getPurchaseOrder(id: number) { return request.get(`/inventory/purchase/${id}`) }
export function createPurchaseOrder(data: any) { return request.post('/inventory/purchase', data) }
export function updatePurchaseOrder(id: number, data: any) { return request.put(`/inventory/purchase/${id}`, data) }
export function deletePurchaseOrder(id: number) { return request.delete(`/inventory/purchase/${id}`) }

export function getCategories() { return request.get('/part-categories') }
export function createCategory(data: any) { return request.post('/part-categories', data) }
export function updateCategory(id: number, data: any) { return request.put(`/part-categories/${id}`, data) }
export function deleteCategory(id: number) { return request.delete(`/part-categories/${id}`) }
export function getSuppliers() { return request.get('/suppliers') }
export function createSupplier(data: any) { return request.post('/suppliers', data) }
export function updateSupplier(id: number, data: any) { return request.put(`/suppliers/${id}`, data) }
export function deleteSupplier(id: number) { return request.delete(`/suppliers/${id}`) }
