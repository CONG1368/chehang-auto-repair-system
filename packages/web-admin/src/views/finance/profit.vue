<template>
  <div class="page-container">
    <div class="page-header">
      <h2>利润分析</h2>
    </div>

    <!-- 日期范围 + 操作 -->
    <el-card class="toolbar-card">
      <div class="toolbar">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="handleDateChange"
        />
        <el-button type="primary" @click="fetchAllData">查询</el-button>
        <el-radio-group v-model="quickRange" style="margin-left: 16px" @change="handleQuickRange">
          <el-radio-button value="thisMonth">本月</el-radio-button>
          <el-radio-button value="lastMonth">上月</el-radio-button>
          <el-radio-button value="last3Months">近3个月</el-radio-button>
          <el-radio-button value="thisYear">今年</el-radio-button>
        </el-radio-group>
      </div>
    </el-card>

    <!-- 汇总卡片 -->
    <el-row :gutter="16" class="summary-row">
      <el-col :span="4">
        <el-card shadow="hover" class="kpi-card">
          <div class="kpi-inner">
            <p class="kpi-label">总收入</p>
            <p class="kpi-value" style="color: #409eff">¥{{ formatMoney(profitData.totalRevenue) }}</p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="kpi-card">
          <div class="kpi-inner">
            <p class="kpi-label">总成本</p>
            <p class="kpi-value" style="color: #e6a23c">¥{{ formatMoney(profitData.totalCost) }}</p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="5">
        <el-card shadow="hover" class="kpi-card">
          <div class="kpi-inner">
            <p class="kpi-label">毛利</p>
            <p class="kpi-value" :style="{ color: profitData.grossProfit >= 0 ? '#67c23a' : '#f56c6c' }">
              ¥{{ formatMoney(profitData.grossProfit) }}
            </p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="5">
        <el-card shadow="hover" class="kpi-card">
          <div class="kpi-inner">
            <p class="kpi-label">费用</p>
            <p class="kpi-value" style="color: #909399">¥{{ formatMoney(profitData.totalExpense) }}</p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="kpi-card">
          <div class="kpi-inner">
            <p class="kpi-label">净利润</p>
            <p class="kpi-value kpi-net" :style="{ color: profitData.netProfit >= 0 ? '#67c23a' : '#f56c6c' }">
              ¥{{ formatMoney(profitData.netProfit) }}
            </p>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="16" class="chart-row">
      <!-- 收入构成饼图 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span class="card-title">收入构成</span>
          </template>
          <div class="chart-container">
            <VChart
              v-if="pieChartOption"
              :option="pieChartOption"
              autoresize
              style="height: 360px"
            />
            <el-empty v-else description="暂无数据" />
          </div>
        </el-card>
      </el-col>

      <!-- 近30天利润趋势 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span class="card-title">近30天利润趋势</span>
          </template>
          <div class="chart-container">
            <VChart
              v-if="lineChartOption"
              :option="lineChartOption"
              autoresize
              style="height: 360px"
            />
            <el-empty v-else description="暂无数据" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 费用明细表格 -->
    <el-card class="expense-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">费用明细</span>
          <el-input
            v-model="expenseSearch"
            placeholder="搜索费用类别"
            clearable
            size="small"
            class="expense-search"
            @keyup.enter="fetchExpenses"
            @clear="fetchExpenses"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>
      <el-table
        v-loading="expenseLoading"
        :data="filteredExpenseList"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column label="序号" type="index" width="60" align="center" />
        <el-table-column prop="category" label="费用类别" min-width="130">
          <template #default="{ row }">
            <el-tag size="small" :type="getExpenseTagType(row.category)">
              {{ row.category }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额(¥)" width="140" align="right">
          <template #default="{ row }">
            <span class="amount-total">¥{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="时间" min-width="170" />
      </el-table>
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="expensePagination.page"
          v-model:page-size="expensePagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="expensePagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchExpenses"
          @current-change="fetchExpenses"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import request from '@/api/request'
import dayjs from 'dayjs'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([PieChart, LineChart, TitleComponent, TooltipComponent, LegendComponent, CanvasRenderer])

// ==================== 类型定义 ====================

interface ProfitSummary {
  totalRevenue: number
  totalCost: number
  grossProfit: number
  totalExpense: number
  netProfit: number
  revenueComposition?: {
    repair: number
    sales: number
    beauty: number
  }
}

interface RevenueTrendItem {
  date: string
  revenue: number
  cost: number
  profit: number
}

interface ExpenseItem {
  id: number
  category: string
  amount: number
  description: string
  createTime: string
}

interface ListResponse<T> {
  list: T[]
  total: number
}

// ==================== 日期范围 ====================

const dateRange = ref<string[]>([
  dayjs().startOf('month').format('YYYY-MM-DD'),
  dayjs().format('YYYY-MM-DD'),
])

const quickRange = ref('thisMonth')

const handleQuickRange = (value: string) => {
  const today = dayjs()
  switch (value) {
    case 'thisMonth':
      dateRange.value = [today.startOf('month').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')]
      break
    case 'lastMonth':
      dateRange.value = [
        today.subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
        today.subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
      ]
      break
    case 'last3Months':
      dateRange.value = [
        today.subtract(3, 'month').startOf('month').format('YYYY-MM-DD'),
        today.format('YYYY-MM-DD'),
      ]
      break
    case 'thisYear':
      dateRange.value = [today.startOf('year').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')]
      break
  }
  fetchAllData()
}

const handleDateChange = () => {
  quickRange.value = ''
  fetchAllData()
}

// ==================== 利润汇总 ====================

const profitData = reactive<ProfitSummary>({
  totalRevenue: 0,
  totalCost: 0,
  grossProfit: 0,
  totalExpense: 0,
  netProfit: 0,
  revenueComposition: { repair: 0, sales: 0, beauty: 0 },
})

const mockProfitData = () => {
  Object.assign(profitData, {
    totalRevenue: 285600,
    totalCost: 168400,
    grossProfit: 117200,
    totalExpense: 45200,
    netProfit: 72000,
    revenueComposition: {
      repair: 165800,
      sales: 78000,
      beauty: 41800,
    },
  })
}

const fetchProfitSummary = async () => {
  try {
    const params: any = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await request.get<any, ProfitSummary>('/finance/profit-summary', { params })
    if (res) {
      Object.assign(profitData, res)
    }
  } catch {
    mockProfitData()
  }
}

// ==================== 收入构成饼图 ====================

const pieChartOption = computed(() => {
  const comp = profitData.revenueComposition
  if (!comp) return null

  const data = [
    { value: comp.repair || 0, name: '维修收入', itemStyle: { color: '#409eff' } },
    { value: comp.sales || 0, name: '销售收入', itemStyle: { color: '#67c23a' } },
    { value: comp.beauty || 0, name: '美容收入', itemStyle: { color: '#e6a23c' } },
  ]

  // 如果全为0，显示提示
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return null

  return {
    title: {
      text: '收入构成占比',
      left: 'center',
      top: 10,
      textStyle: { fontSize: 14, color: '#606266' },
    },
    tooltip: {
      trigger: 'item' as const,
      formatter: '{b}: ¥{c} ({d}%)',
    },
    legend: {
      orient: 'horizontal' as const,
      bottom: 10,
      textStyle: { fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        data,
      },
    ],
  }
})

// ==================== 近30天利润趋势图 ====================

const trendData = ref<RevenueTrendItem[]>([])

const mockTrendData = () => {
  const data: RevenueTrendItem[] = []
  for (let i = 29; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('MM-DD')
    data.push({
      date,
      revenue: Math.round(5000 + Math.random() * 15000),
      cost: Math.round(3000 + Math.random() * 8000),
      profit: Math.round(1000 + Math.random() * 7000),
    })
  }
  trendData.value = data
}

const fetchRevenueTrend = async () => {
  try {
    const res = await request.get<any, RevenueTrendItem[]>('/finance/revenue-trend', {
      params: { days: 30 },
    })
    if (res && Array.isArray(res) && res.length > 0) {
      trendData.value = res
    } else {
      mockTrendData()
    }
  } catch {
    mockTrendData()
  }
}

const lineChartOption = computed(() => {
  if (!trendData.value || trendData.value.length === 0) return null

  const dates = trendData.value.map((d) => d.date)
  const revenues = trendData.value.map((d) => d.revenue)
  const costs = trendData.value.map((d) => d.cost)
  const profits = trendData.value.map((d) => d.profit)

  return {
    title: {
      text: '利润趋势',
      left: 'center',
      top: 10,
      textStyle: { fontSize: 14, color: '#606266' },
    },
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        let html = `<strong>${params[0].axisValue}</strong><br/>`
        params.forEach((p: any) => {
          html += `${p.marker} ${p.seriesName}: ¥${p.value.toLocaleString()}<br/>`
        })
        return html
      },
    },
    legend: {
      data: ['收入', '成本', '利润'],
      bottom: 10,
      textStyle: { fontSize: 12 },
    },
    grid: {
      top: 50,
      left: 20,
      right: 20,
      bottom: 40,
      containLabel: true,
    },
    xAxis: {
      type: 'category' as const,
      data: dates,
      axisLabel: {
        rotate: 45,
        fontSize: 10,
      },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        formatter: '¥{value}',
        fontSize: 10,
      },
      splitLine: {
        lineStyle: { color: '#f2f2f2' },
      },
    },
    series: [
      {
        name: '收入',
        type: 'line',
        data: revenues,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#409eff', width: 2 },
        itemStyle: { color: '#409eff' },
      },
      {
        name: '成本',
        type: 'line',
        data: costs,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#e6a23c', width: 2 },
        itemStyle: { color: '#e6a23c' },
      },
      {
        name: '利润',
        type: 'line',
        data: profits,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#67c23a', width: 2 },
        itemStyle: { color: '#67c23a' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(103,194,58,0.25)' },
              { offset: 1, color: 'rgba(103,194,58,0.02)' },
            ],
          },
        },
      },
    ],
  }
})

// ==================== 费用明细 ====================

const expenseSearch = ref('')
const expenseList = ref<ExpenseItem[]>([])
const expenseLoading = ref(false)
const expensePagination = reactive({ page: 1, pageSize: 10, total: 0 })

const filteredExpenseList = computed(() => {
  if (!expenseSearch.value.trim()) return expenseList.value
  const keyword = expenseSearch.value.trim().toLowerCase()
  return expenseList.value.filter(
    (item) =>
      item.category.toLowerCase().includes(keyword) ||
      (item.description && item.description.toLowerCase().includes(keyword)),
  )
})

const mockExpenses = () => {
  expenseList.value = [
    { id: 1, category: '人工成本', amount: 18000, description: '5月份技师工资', createTime: '2026-05-15 18:30' },
    { id: 2, category: '房租', amount: 8500, description: '5月场地租金', createTime: '2026-05-01 09:00' },
    { id: 3, category: '水电费', amount: 3200, description: '4月水电费结算', createTime: '2026-05-10 14:00' },
    { id: 4, category: '设备维护', amount: 4500, description: '举升机维修保养', createTime: '2026-05-08 10:30' },
    { id: 5, category: '办公耗材', amount: 1200, description: '打印纸、墨盒等办公用品', createTime: '2026-05-12 16:00' },
    { id: 6, category: '营销推广', amount: 6800, description: '抖音推广、美团平台费', createTime: '2026-05-06 11:00' },
    { id: 7, category: '保险', amount: 2000, description: '门店财产险', createTime: '2026-05-03 08:30' },
    { id: 8, category: '其他', amount: 1000, description: '员工团建活动费用', createTime: '2026-05-18 17:00' },
  ]
  expensePagination.total = 8
}

const fetchExpenses = async () => {
  expenseLoading.value = true
  try {
    const res = await request.get<any, ListResponse<ExpenseItem>>('/finance/expenses', {
      params: {
        page: expensePagination.page,
        pageSize: expensePagination.pageSize,
      },
    })
    if (res && res.list) {
      expenseList.value = res.list
      expensePagination.total = res.total
    } else {
      mockExpenses()
    }
  } catch {
    mockExpenses()
  } finally {
    expenseLoading.value = false
  }
}

const getExpenseTagType = (category: string): string => {
  const map: Record<string, string> = {
    人工成本: 'warning',
    房租: 'danger',
    水电费: 'info',
    设备维护: '',
    办公耗材: 'info',
    营销推广: 'success',
    保险: 'primary',
    其他: 'info',
  }
  return map[category] || 'info'
}

// ==================== 工具函数 ====================

const formatMoney = (val?: number): string => {
  if (val === undefined || val === null) return '0.00'
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fetchAllData = () => {
  fetchProfitSummary()
  fetchRevenueTrend()
  fetchExpenses()
}

// ==================== 初始化 ====================

onMounted(() => {
  fetchAllData()
})
</script>

<style scoped>
.page-container {
  padding: 0;
}

.page-header {
  margin-bottom: 16px;
}

.page-header h2 {
  font-size: 18px;
  color: #303133;
}

.toolbar-card {
  margin-bottom: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
}

.summary-row {
  margin-bottom: 16px;
}

.kpi-card {
  cursor: default;
}

.kpi-card :deep(.el-card__body) {
  padding: 16px 20px;
}

.kpi-inner {
  text-align: center;
}

.kpi-label {
  font-size: 13px;
  color: #909399;
  margin: 0 0 8px 0;
}

.kpi-value {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
}

.kpi-net {
  font-size: 24px;
}

.chart-row {
  margin-bottom: 16px;
}

.chart-container {
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expense-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.expense-search {
  width: 200px;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.amount-total {
  color: #f56c6c;
  font-weight: 600;
}
</style>
