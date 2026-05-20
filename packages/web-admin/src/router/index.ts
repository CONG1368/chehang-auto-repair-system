import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', noAuth: true },
  },
  {
    path: '/',
    component: () => import('@/layout/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '经营驾驶舱', icon: 'Odometer' },
      },
      {
        path: 'sales',
        name: 'Sales',
        redirect: '/sales/list',
        meta: { title: '新车销售', icon: 'Sell' },
        children: [
          { path: 'vehicles', name: 'SalesVehicles', component: () => import('@/views/sales/vehicles.vue'), meta: { title: '车辆管理' } },
          { path: 'leads', name: 'SalesLeads', component: () => import('@/views/sales/leads.vue'), meta: { title: '客户跟进' } },
          { path: 'orders', name: 'SalesOrders', component: () => import('@/views/sales/orders.vue'), meta: { title: '报价签约' } },
          { path: 'delivery', name: 'SalesDelivery', component: () => import('@/views/sales/delivery.vue'), meta: { title: '交车管理' } },
        ],
      },
      {
        path: 'repair',
        name: 'Repair',
        redirect: '/repair/list',
        meta: { title: '维修服务', icon: 'Tools' },
        children: [
          { path: 'reception', name: 'RepairReception', component: () => import('@/views/repair/reception.vue'), meta: { title: '接车开单' } },
          { path: 'orders', name: 'RepairOrders', component: () => import('@/views/repair/orders.vue'), meta: { title: '工单管理' } },
          { path: 'dispatch', name: 'RepairDispatch', component: () => import('@/views/repair/dispatch.vue'), meta: { title: '技师派工' } },
          { path: 'quality', name: 'RepairQuality', component: () => import('@/views/repair/quality.vue'), meta: { title: '质检交车' } },
        ],
      },
      {
        path: 'beauty',
        name: 'Beauty',
        redirect: '/beauty/services',
        meta: { title: '美容服务', icon: 'MagicStick' },
        children: [
          { path: 'services', name: 'BeautyServices', component: () => import('@/views/beauty/services.vue'), meta: { title: '服务项目' } },
          { path: 'packages', name: 'BeautyPackages', component: () => import('@/views/beauty/packages.vue'), meta: { title: '套餐管理' } },
          { path: 'cards', name: 'BeautyCards', component: () => import('@/views/beauty/cards.vue'), meta: { title: '会员卡管理' } },
          { path: 'schedule', name: 'BeautySchedule', component: () => import('@/views/beauty/schedule.vue'), meta: { title: '施工管理' } },
        ],
      },
      {
        path: 'finance',
        name: 'Finance',
        redirect: '/finance/cashier',
        meta: { title: '财务管理', icon: 'Money' },
        children: [
          { path: 'cashier', name: 'FinanceCashier', component: () => import('@/views/finance/cashier.vue'), meta: { title: '收银台' } },
          { path: 'reports', name: 'FinanceReports', component: () => import('@/views/finance/reports.vue'), meta: { title: '对账报表' } },
          { path: 'receivable', name: 'FinanceReceivable', component: () => import('@/views/finance/receivable.vue'), meta: { title: '应收应付' } },
          { path: 'profit', name: 'FinanceProfit', component: () => import('@/views/finance/profit.vue'), meta: { title: '利润分析' } },
        ],
      },
      {
        path: 'inventory',
        name: 'Inventory',
        redirect: '/inventory/parts',
        meta: { title: '库存管理', icon: 'Box' },
        children: [
          { path: 'parts', name: 'InventoryParts', component: () => import('@/views/inventory/parts.vue'), meta: { title: '配件管理' } },
          { path: 'stock', name: 'InventoryStock', component: () => import('@/views/inventory/stock.vue'), meta: { title: '库存查询' } },
          { path: 'inbound', name: 'InventoryInbound', component: () => import('@/views/inventory/inbound.vue'), meta: { title: '入库管理' } },
          { path: 'purchase', name: 'InventoryPurchase', component: () => import('@/views/inventory/purchase.vue'), meta: { title: '采购管理' } },
        ],
      },
      {
        path: 'customer',
        name: 'Customer',
        redirect: '/customer/list',
        meta: { title: '客户管理', icon: 'User' },
        children: [
          { path: 'list', name: 'CustomerList', component: () => import('@/views/customer/list.vue'), meta: { title: '客户档案' } },
          { path: 'follow', name: 'CustomerFollow', component: () => import('@/views/customer/follow.vue'), meta: { title: '跟进记录' } },
          { path: 'remind', name: 'CustomerRemind', component: () => import('@/views/customer/remind.vue'), meta: { title: '保养提醒' } },
        ],
      },
      {
        path: 'report',
        name: 'Report',
        redirect: '/report/overview',
        meta: { title: '数据报表', icon: 'DataAnalysis' },
        children: [
          { path: 'overview', name: 'ReportOverview', component: () => import('@/views/report/overview.vue'), meta: { title: '数据大屏' } },
          { path: 'sales', name: 'ReportSales', component: () => import('@/views/report/sales.vue'), meta: { title: '销售分析' } },
          { path: 'repair', name: 'ReportRepair', component: () => import('@/views/report/repair.vue'), meta: { title: '维修分析' } },
          { path: 'finance', name: 'ReportFinance', component: () => import('@/views/report/finance.vue'), meta: { title: '财务分析' } },
        ],
      },
      {
        path: 'system',
        name: 'System',
        redirect: '/system/users',
        meta: { title: '系统管理', icon: 'Setting' },
        children: [
          { path: 'users', name: 'SystemUsers', component: () => import('@/views/system/users.vue'), meta: { title: '用户管理' } },
          { path: 'roles', name: 'SystemRoles', component: () => import('@/views/system/roles.vue'), meta: { title: '角色管理' } },
        ],
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '管理系统'} - 泰州车行维修厂`;

  if (to.meta.noAuth) {
    next();
    return;
  }

  const authStore = useAuthStore();
  if (!authStore.token) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
    return;
  }

  next();
});

export default router;
