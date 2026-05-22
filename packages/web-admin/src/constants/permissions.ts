export const permissionOptions = [
  { label: '经营驾驶舱', value: 'dashboard' },
  { label: '新车销售', value: 'sales' },
  { label: '维修服务', value: 'repair' },
  { label: '美容服务', value: 'beauty' },
  { label: '财务管理', value: 'finance' },
  { label: '库存管理', value: 'inventory' },
  { label: '客户管理', value: 'customer' },
  { label: '数据报表', value: 'report' },
]

export const permissionLabelMap: Record<string, string> = {
  '*': '全部权限',
  dashboard: '经营驾驶舱',
  sales: '新车销售',
  repair: '维修服务',
  beauty: '美容服务',
  finance: '财务管理',
  inventory: '库存管理',
  customer: '客户管理',
  report: '数据报表',
  'customer:view': '客户查看',
  'repair:view': '维修查看',
  'repair:update': '维修编辑',
  'report:view': '报表查看',
}
