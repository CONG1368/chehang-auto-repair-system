import request from './request'

export function getUsers(params?: any) { return request.get('/users', { params }) }
export function getTechnicians() { return request.get('/users/technicians') }
export function getUser(id: number) { return request.get(`/users/${id}`) }
export function createUser(data: any) { return request.post('/users', data) }
export function updateUser(id: number, data: any) { return request.put(`/users/${id}`, data) }
export function deleteUser(id: number) { return request.delete(`/users/${id}`) }

export function getRoles() { return request.get('/roles') }
export function getRole(id: number) { return request.get(`/roles/${id}`) }
export function createRole(data: any) { return request.post('/roles', data) }
export function updateRole(id: number, data: any) { return request.put(`/roles/${id}`, data) }
export function deleteRole(id: number) { return request.delete(`/roles/${id}`) }
