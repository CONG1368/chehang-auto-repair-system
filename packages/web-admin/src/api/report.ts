import request from './request'

export interface DashboardSummary {
  todayRevenue: number
  todayOrderCount: number
  inRepairCount: number
  newCustomerCount: number
}

export interface RevenueTrendItem {
  date: string
  amount: number
}

export interface BusinessRatioItem {
  name: string
  value: number
}

export interface InventoryStats {
  totalParts: number
  totalStockQuantity: number
  lowStockCount: number
  lowStockParts: { id: number; code: string; name: string; currentStock: number; safetyStock: number; spec: string }[]
}

export function getDashboardSummary() {
  return request.get<any, DashboardSummary>('/reports/dashboard')
}

export function getRevenueTrend(days?: number) {
  return request.get<any, RevenueTrendItem[]>('/reports/revenue-trend', { params: { days } })
}

export function getBusinessRatio() {
  return request.get<any, BusinessRatioItem[]>('/reports/business-ratio')
}

export function getInventoryStats() {
  return request.get<any, InventoryStats>('/reports/inventory-stats')
}

export function getSalesStats(startDate?: string, endDate?: string) {
  return request.get('/reports/sales-stats', { params: { startDate, endDate } })
}

export function getRepairStats(startDate?: string, endDate?: string) {
  return request.get('/reports/repair-stats', { params: { startDate, endDate } })
}

export function getCustomerStats() {
  return request.get('/reports/customer-stats')
}

export function getRecentPayments(limit?: number) {
  return request.get('/reports/recent-payments', { params: { limit } })
}

export function getBeautyStats(startDate?: string, endDate?: string) {
  return request.get('/reports/beauty-stats', { params: { startDate, endDate } })
}

export function getStaffPerformance(startDate?: string, endDate?: string) {
  return request.get('/reports/staff-performance', { params: { startDate, endDate } })
}
