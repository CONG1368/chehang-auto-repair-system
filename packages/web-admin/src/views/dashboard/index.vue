<template>
  <div class="dashboard">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-card--revenue" style="cursor:pointer" @click="router.push('/finance/profit')">
          <div class="stat-card__inner">
            <div class="stat-card__icon">
              <el-icon :size="36"><Money /></el-icon>
            </div>
            <div class="stat-card__info">
              <div class="stat-card__label">今日营收</div>
              <div class="stat-card__value">&yen;{{ formatKilo(dashboard.todayRevenue) }}</div>
              <div class="stat-card__desc">实时数据</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-card--orders" style="cursor:pointer" @click="router.push('/repair/orders')">
          <div class="stat-card__inner">
            <div class="stat-card__icon">
              <el-icon :size="36"><Document /></el-icon>
            </div>
            <div class="stat-card__info">
              <div class="stat-card__label">今日工单</div>
              <div class="stat-card__value">{{ dashboard.todayOrderCount }}<span class="stat-card__unit">单</span></div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-card--repair" style="cursor:pointer" @click="router.push('/repair/orders?status=repairing')">
          <div class="stat-card__inner">
            <div class="stat-card__icon">
              <el-icon :size="36"><Tools /></el-icon>
            </div>
            <div class="stat-card__info">
              <div class="stat-card__label">在修车辆</div>
              <div class="stat-card__value">{{ dashboard.inRepairCount }}<span class="stat-card__unit">辆</span></div>
              <div class="stat-card__desc">待派工/维修中/待质检</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-card--customer" style="cursor:pointer" @click="router.push('/customer/list')">
          <div class="stat-card__inner">
            <div class="stat-card__icon">
              <el-icon :size="36"><User /></el-icon>
            </div>
            <div class="stat-card__info">
              <div class="stat-card__label">新增客户</div>
              <div class="stat-card__value">{{ dashboard.newCustomerCount }}<span class="stat-card__unit">人</span></div>
              <div class="stat-card__desc">今日新增</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 中间图表区 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="chart-card__header">
              <span class="chart-card__title">近30天营收趋势</span>
              <el-button text type="primary" size="small" @click="router.push('/finance/profit')">查看详情</el-button>
            </div>
          </template>
          <VChart v-if="!chartLoading" :option="revenueChartOption" class="chart-box" autoresize />
          <div v-else class="chart-placeholder"><el-icon class="is-loading" :size="32"><Loading /></el-icon></div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="chart-card__header">
              <span class="chart-card__title">业务类型占比</span>
              <el-button text type="primary" size="small" @click="router.push('/report/overview')">查看数据大屏</el-button>
            </div>
          </template>
          <VChart v-if="!chartLoading" :option="bizTypeChartOption" class="chart-box" autoresize />
          <div v-else class="chart-placeholder"><el-icon class="is-loading" :size="32"><Loading /></el-icon></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 底部列表区 -->
    <el-row :gutter="20" class="list-row">
      <el-col :span="8">
        <el-card shadow="hover" class="list-card">
          <template #header>
            <div class="list-card__header">
              <span class="list-card__title">最近工单</span>
              <el-button text type="primary" size="small" @click="router.push('/repair/orders')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentOrders" stripe size="small" class="compact-table" style="cursor:pointer" v-loading="listLoading" @row-click="() => router.push('/repair/orders')">
            <el-table-column prop="orderNo" label="工单号" width="130" />
            <el-table-column prop="customerName" label="客户" min-width="70" />
            <el-table-column prop="status" label="状态" width="85" align="center">
              <template #default="{ row }">
                <el-tag :type="orderStatusType(row.status)" size="small">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="totalAmount" label="金额" width="100" align="right">
              <template #default="{ row }">
                <span class="amount-text">¥{{ (row.totalAmount || 0).toLocaleString() }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover" class="list-card">
          <template #header>
            <div class="list-card__header">
              <span class="list-card__title">库存预警</span>
              <el-button text type="primary" size="small" @click="router.push('/inventory/parts')">查看全部</el-button>
            </div>
          </template>
          <div class="alert-list" v-loading="listLoading">
            <div
              v-for="item in stockAlerts"
              :key="item.id"
              class="alert-item"
              style="cursor:pointer"
              @click="router.push(`/inventory/parts`)"
            >
              <div class="alert-item__name">{{ item.name }}</div>
              <div class="alert-item__info">
                <span class="alert-item__stock">库存: {{ item.currentStock }}{{ item.unit || '个' }}</span>
                <el-tag
                  :type="item.currentStock <= 3 ? 'danger' : 'warning'"
                  size="small"
                  effect="dark"
                >
                  {{ item.currentStock <= 3 ? '告急' : '偏低' }}
                </el-tag>
              </div>
              <div class="alert-item__spec">{{ item.spec || '' }}</div>
            </div>
            <el-empty v-if="!listLoading && stockAlerts.length === 0" description="暂无库存预警" :image-size="60" />
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover" class="list-card">
          <template #header>
            <div class="list-card__header">
              <span class="list-card__title">待跟进客户</span>
              <el-button text type="primary" size="small" @click="router.push('/sales/leads')">查看全部</el-button>
            </div>
          </template>
          <div class="follow-list" v-loading="listLoading">
            <div
              v-for="(item, idx) in pendingLeads"
              :key="item.id"
              class="follow-item"
              style="cursor:pointer"
              @click="router.push('/sales/leads')"
            >
              <div class="follow-item__avatar">
                <el-avatar :size="36" :style="{ backgroundColor: avatarColors[idx % avatarColors.length] }">
                  {{ (item.customerName || '?').slice(0, 1) }}
                </el-avatar>
              </div>
              <div class="follow-item__info">
                <div class="follow-item__name">{{ item.customerName || '-' }}</div>
                <div class="follow-item__desc">{{ item.intendedVehicle || '咨询' }}</div>
              </div>
              <div class="follow-item__time">{{ formatFollowTime(item.nextFollowAt || item.createdAt) }}</div>
            </div>
            <el-empty v-if="!listLoading && pendingLeads.length === 0" description="暂无待跟进客户" :image-size="60" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { onSocketEvent, offSocketEvent } from '@/utils/socket'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { Loading } from '@element-plus/icons-vue'
import request from '@/api/request'
import {
  getDashboardSummary,
  getRevenueTrend,
  getBusinessRatio,
  getInventoryStats,
  type DashboardSummary,
  type RevenueTrendItem,
  type BusinessRatioItem,
} from '@/api/report'

use([
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
])

const router = useRouter()

// ==================== 状态工具函数 ====================

const statusLabelMap: Record<string, string> = {
  pending: '待派工',
  assigned: '已派工',
  repairing: '维修中',
  quality_check: '待质检',
  completed: '已完成',
  delivered: '已交车',
}

function getStatusLabel(status: string): string {
  return statusLabelMap[status] || status
}

function orderStatusType(status: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'info',
    assigned: 'primary',
    repairing: 'warning',
    quality_check: 'danger',
    completed: 'success',
    delivered: 'success',
  }
  return map[status] || 'info'
}

function formatKilo(v: number): string {
  if (v >= 10000) return (v / 10000).toFixed(1) + '万'
  return v.toLocaleString()
}

function formatFollowTime(t: string | undefined): string {
  if (!t) return '-'
  const d = new Date(t)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ==================== 数据状态 ====================

const dashboard = ref<DashboardSummary>({
  todayRevenue: 0,
  todayOrderCount: 0,
  inRepairCount: 0,
  newCustomerCount: 0,
})

const revenueData = ref<RevenueTrendItem[]>([])
const bizRatioData = ref<BusinessRatioItem[]>([])

interface RepairOrderRow {
  id: number
  orderNo: string
  customerName: string
  status: string
  totalAmount: number
}

interface StockAlertItem {
  id: number
  name: string
  spec: string
  currentStock: number
  safetyStock: number
  unit: string
}

interface LeadRow {
  id: number
  customerName: string
  intendedVehicle: string
  status: string
  nextFollowAt?: string
  createdAt: string
}

interface PartStockRow {
  id: number
  name: string
  spec: string
  currentStock: number
  safetyStock: number
}

interface ApiListResponse<T> {
  list?: T[]
  total?: number
}

const recentOrders = ref<RepairOrderRow[]>([])
const stockAlerts = ref<StockAlertItem[]>([])
const pendingLeads = ref<LeadRow[]>([])

const chartLoading = ref(true)
const listLoading = ref(true)

const avatarColors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399']

// ==================== 图表配置 ====================

const days = computed(() => revenueData.value.map((d) => d.date))
const amounts = computed(() => revenueData.value.map((d) => d.amount))

const revenueChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params: any) => {
      if (!Array.isArray(params) || params.length === 0) return ''
      const p = params[0]
      return `${p.axisValue}<br/>营收: <b>¥${Number(p.data).toLocaleString()}</b>`
    }
  },
  grid: { top: 10, right: 20, bottom: 30, left: 60 },
  xAxis: {
    type: 'category',
    data: days.value,
    axisLabel: { interval: 4, fontSize: 11, color: '#909399' },
    axisTick: { alignWithLabel: true },
    axisLine: { lineStyle: { color: '#dcdfe6' } }
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      formatter: (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(1)}万` : `${v}`),
      fontSize: 11,
      color: '#909399'
    },
    splitLine: { lineStyle: { color: '#f2f3f5', type: 'dashed' } }
  },
  series: [{
    data: amounts.value,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    showSymbol: false,
    lineStyle: { color: '#409EFF', width: 2.5 },
    itemStyle: { color: '#409EFF' },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(64,158,255,0.25)' },
          { offset: 1, color: 'rgba(64,158,255,0.02)' }
        ]
      }
    }
  }]
}))

const bizTypeChartOption = computed(() => {
  const colors = ['#409EFF', '#67C23A', '#E6A23C']
  const data = bizRatioData.value.length > 0
    ? bizRatioData.value.map((d, i) => ({ ...d, itemStyle: { color: colors[i % colors.length] } }))
    : [{ value: 1, name: '暂无数据', itemStyle: { color: '#dcdfe6' } }]

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (!params || params.value == null) return '-'
        return `${params.name}: ¥${params.value.toLocaleString()} (${params.percent}%)`
      }
    },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 12, color: '#606266' },
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 24
    },
    series: [{
      type: 'pie',
      radius: ['55%', '78%'],
      center: ['50%', '48%'],
      avoidLabelOverlap: false,
      emphasis: { label: { fontSize: 18, fontWeight: 'bold' }, scaleSize: 8 },
      label: { show: true, formatter: '{b}\n{d}%', fontSize: 12, color: '#606266' },
      labelLine: { length: 18, length2: 24, lineStyle: { color: '#c0c4cc' } },
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 3 },
      data,
    }]
  }
})

// ==================== 数据加载 ====================

async function loadDashboard() {
  try {
    const d = await getDashboardSummary()
    dashboard.value = d
  } catch { /* 错误已在拦截器中处理 */ }
}

async function loadCharts() {
  chartLoading.value = true
  try {
    const [trend, ratio] = await Promise.all([
      getRevenueTrend(30),
      getBusinessRatio(),
    ])
    revenueData.value = trend
    bizRatioData.value = ratio
  } catch { /* 错误已在拦截器中处理 */ }
  finally { chartLoading.value = false }
}

async function loadLists() {
  listLoading.value = true
  try {
    const [repairRes, inventoryRes, leadsRes] = await Promise.all([
      request.get<unknown, ApiListResponse<RepairOrderRow>>('/repair', { params: { page: 1, pageSize: 5 } }),
      getInventoryStats(),
      request.get<unknown, ApiListResponse<LeadRow>>('/sales/leads', { params: { page: 1, pageSize: 5 } }),
    ])

    // 最近工单
    const orders = repairRes?.list || []
    recentOrders.value = orders.slice(0, 5).map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      customerName: o.customerName || '-',
      status: o.status,
      totalAmount: o.totalAmount || 0,
    }))

    // 库存预警
    stockAlerts.value = (inventoryRes?.lowStockParts || []).slice(0, 5).map((p: PartStockRow) => ({
      id: p.id,
      name: p.name,
      spec: p.spec || '',
      currentStock: p.currentStock,
      safetyStock: p.safetyStock,
      unit: '个',
    }))

    // 待跟进客户（排除已成交和已战败）
    const leads = leadsRes?.list || []
    pendingLeads.value = leads
      .filter((l) => l.status !== '已成交' && l.status !== '已战败')
      .slice(0, 5)
      .map((l) => ({
        id: l.id,
        customerName: l.customerName,
        status: l.status,
        intendedVehicle: l.intendedVehicle || '',
        nextFollowAt: l.nextFollowAt,
        createdAt: l.createdAt,
      }))
  } catch { /* 错误已在拦截器中处理 */ }
  finally { listLoading.value = false }
}

// ==================== 生命周期 ====================

// 触发仪表盘数据刷新的 WS 事件列表
const dashboardRefreshEvents = [
  'new-repair-order', 'order-status-change', 'order-delivered',
  'new-payment', 'new-sales-order', 'new-beauty-appointment',
  'beauty-appointment-status-change', 'receivable-paid', 'payable-paid',
];

const handleDashboardRefresh = () => {
  loadDashboard();
  loadLists();
};

onMounted(() => {
  loadDashboard()
  loadCharts()
  loadLists()
  // 通过 WebSocket 实时推送刷新（替换 30 秒轮询）
  dashboardRefreshEvents.forEach((event) => {
    onSocketEvent(event, handleDashboardRefresh);
  });
})

onUnmounted(() => {
  dashboardRefreshEvents.forEach((event) => {
    offSocketEvent(event, handleDashboardRefresh);
  });
})
</script>

<style scoped>
.dashboard {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ===== 统计卡片 ===== */
.stat-cards { margin-bottom: 20px; }

.stat-card {
  border: none;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s;
}

.stat-card:hover { transform: translateY(-2px); }

.stat-card :deep(.el-card__body) { padding: 24px 20px; }

.stat-card__inner { display: flex; align-items: center; gap: 16px; }

.stat-card__icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card--revenue .stat-card__icon { background: linear-gradient(135deg, #409EFF, #66b1ff); color: #fff; }
.stat-card--orders .stat-card__icon { background: linear-gradient(135deg, #67C23A, #85ce61); color: #fff; }
.stat-card--repair .stat-card__icon { background: linear-gradient(135deg, #E6A23C, #ebb563); color: #fff; }
.stat-card--customer .stat-card__icon { background: linear-gradient(135deg, #F56C6C, #f78989); color: #fff; }

.stat-card__label { font-size: 13px; color: #909399; margin-bottom: 6px; }
.stat-card__value { font-size: 26px; font-weight: 700; color: #303133; letter-spacing: 0.5px; line-height: 1.2; }
.stat-card__unit { font-size: 14px; font-weight: 400; color: #909399; margin-left: 2px; }
.stat-card__trend { font-size: 12px; margin-top: 4px; display: flex; align-items: center; gap: 2px; }
.stat-card__trend--up { color: #67C23A; }
.stat-card__desc { font-size: 12px; color: #909399; margin-top: 4px; }

/* ===== 图表区 ===== */
.chart-row { margin-bottom: 20px; }

.chart-card { border-radius: 8px; border: none; }

.chart-card__header { display: flex; align-items: center; justify-content: space-between; }
.chart-card__title { font-size: 15px; font-weight: 600; color: #303133; }

.chart-card :deep(.el-card__header) { padding: 16px 20px; border-bottom: 1px solid #f2f3f5; }
.chart-card :deep(.el-card__body) { padding: 16px 8px 8px 8px; }

.chart-box { width: 100%; height: 340px; }

.chart-placeholder {
  width: 100%;
  height: 340px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
}

/* ===== 底部列表 ===== */
.list-row { margin-bottom: 0; }

.list-card { border-radius: 8px; border: none; }

.list-card :deep(.el-card__header) { padding: 14px 20px; border-bottom: 1px solid #f2f3f5; }
.list-card :deep(.el-card__body) { padding: 0; }

.list-card__header { display: flex; align-items: center; justify-content: space-between; }
.list-card__title { font-size: 15px; font-weight: 600; color: #303133; }

/* 工单表格 */
.compact-table { font-size: 13px; }

.compact-table :deep(.el-table__header th) {
  background: #fafafa;
  color: #606266;
  font-weight: 600;
  font-size: 12px;
}

.amount-text {
  font-weight: 600;
  color: #303133;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

/* 库存预警列表 */
.alert-list { padding: 4px 0; }

.alert-item {
  padding: 10px 20px;
  border-bottom: 1px solid #f2f3f5;
  transition: background 0.2s;
}

.alert-item:last-child { border-bottom: none; }
.alert-item:hover { background: #fafafa; }

.alert-item__name { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 4px; }

.alert-item__info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.alert-item__stock { font-size: 12px; color: #909399; }
.alert-item__spec { font-size: 11px; color: #c0c4cc; }

/* 待跟进客户列表 */
.follow-list { padding: 4px 0; }

.follow-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid #f2f3f5;
  transition: background 0.2s;
}

.follow-item:last-child { border-bottom: none; }
.follow-item:hover { background: #fafafa; }

.follow-item__avatar { flex-shrink: 0; }
.follow-item__info { flex: 1; min-width: 0; }
.follow-item__name { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 2px; }

.follow-item__desc {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.follow-item__time { flex-shrink: 0; font-size: 11px; color: #c0c4cc; }
</style>
