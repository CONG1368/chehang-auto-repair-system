import request from './request'

export function getPayments(params?: any) { return request.get('/finance/payments', { params }) }
export function getPayment(id: number) { return request.get(`/finance/payments/${id}`) }
export function createPayment(data: any) { return request.post('/finance/payments', data) }
export function updatePayment(id: number, data: any) { return request.put(`/finance/payments/${id}`, data) }
export function deletePayment(id: number) { return request.delete(`/finance/payments/${id}`) }
export function getDailySummary(date?: string) { return request.get('/finance/daily-summary', { params: { date } }) }

export function getReceivables(params?: any) { return request.get('/finance/receivables', { params }) }
export function getReceivableSummary() { return request.get('/finance/receivables/summary') }
export function createReceivable(data: any) { return request.post('/finance/receivables', data) }
export function updateReceivable(id: number, data: any) { return request.put(`/finance/receivables/${id}`, data) }
export function payReceivable(id: number, amount: number, payMethod?: string) { return request.put(`/finance/receivables/${id}/pay`, { amount, payMethod }) }
export function deleteReceivable(id: number) { return request.delete(`/finance/receivables/${id}`) }

export function getPayables(params?: any) { return request.get('/finance/payables', { params }) }
export function getPayableSummary() { return request.get('/finance/payables/summary') }
export function createPayable(data: any) { return request.post('/finance/payables', data) }
export function updatePayable(id: number, data: any) { return request.put(`/finance/payables/${id}`, data) }
export function payPayable(id: number, amount: number) { return request.put(`/finance/payables/${id}/pay`, { amount }) }
export function deletePayable(id: number) { return request.delete(`/finance/payables/${id}`) }

export function getExpenses(params?: any) { return request.get('/finance/expenses', { params }) }
export function getExpenseSummary(startDate?: string, endDate?: string) { return request.get('/finance/expenses/summary', { params: { startDate, endDate } }) }
export function createExpense(data: any) { return request.post('/finance/expenses', data) }
export function updateExpense(id: number, data: any) { return request.put(`/finance/expenses/${id}`, data) }
export function deleteExpense(id: number) { return request.delete(`/finance/expenses/${id}`) }

export function getProfitSummary(params?: any) { return request.get('/finance/profit-summary', { params }) }
export function getRevenueTrend(days?: number) { return request.get('/finance/revenue-trend', { params: { days } }) }
