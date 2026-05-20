<template>
  <div class="page-container">
    <div class="page-header">
      <h2>对账报表</h2>
    </div>

    <!-- Tab 切换 -->
    <el-card class="report-card">
      <el-tabs v-model="activeReportTab" @tab-change="handleTabChange">
        <!-- 日报 -->
        <el-tab-pane label="日报" name="daily">
          <div class="tab-toolbar">
            <el-date-picker
              v-model="dailyDate"
              type="date"
              placeholder="选择日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              @change="fetchDailyReport"
            />
            <el-button type="primary" plain @click="handleExport" style="margin-left: 12px">
              <el-icon><Download /></el-icon>
              导出Excel
            </el-button>
          </div>
          <el-table
            v-loading="dailyLoading"
            :data="dailyData"
            border
            stripe
            style="width: 100%; margin-top: 16px"
          >
            <el-table-column prop="date" label="日期" min-width="120" />
            <el-table-column label="总收入(¥)" min-width="120" align="right">
              <template #default="{ row }">
                <span class="amount-total">¥{{ formatMoney(row.totalIncome) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="totalCount" label="总单数" width="100" align="center" />
            <el-table-column label="现金(¥)" min-width="100" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.cashAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="刷卡(¥)" min-width="100" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.cardAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="微信(¥)" min-width="100" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.wechatAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="支付宝(¥)" min-width="100" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.alipayAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="会员卡(¥)" min-width="100" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.memberAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="挂账(¥)" min-width="100" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.creditAmount) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 周报 -->
        <el-tab-pane label="周报" name="weekly">
          <div class="tab-toolbar">
            <el-date-picker
              v-model="weeklyDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              @change="fetchWeeklyReport"
            />
            <el-button type="primary" plain @click="fetchWeeklyReport" style="margin-left: 12px">
              查询
            </el-button>
            <el-button type="primary" plain @click="handleExport" style="margin-left: 8px">
              <el-icon><Download /></el-icon>
              导出Excel
            </el-button>
          </div>
          <el-table
            v-loading="weeklyLoading"
            :data="weeklyData"
            border
            stripe
            style="width: 100%; margin-top: 16px"
          >
            <el-table-column prop="weekRange" label="周期" min-width="200" show-overflow-tooltip />
            <el-table-column label="总收入(¥)" min-width="120" align="right">
              <template #default="{ row }">
                <span class="amount-total">¥{{ formatMoney(row.totalIncome) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="totalCount" label="总单数" width="100" align="center" />
            <el-table-column label="现金(¥)" min-width="100" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.cashAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="刷卡(¥)" min-width="100" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.cardAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="微信(¥)" min-width="100" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.wechatAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="支付宝(¥)" min-width="100" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.alipayAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="会员卡(¥)" min-width="100" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.memberAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="挂账(¥)" min-width="100" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.creditAmount) }}</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrap" v-if="weeklyPagination.total > 0">
            <el-pagination
              v-model:current-page="weeklyPagination.page"
              v-model:page-size="weeklyPagination.pageSize"
              :page-sizes="[10, 20, 50]"
              :total="weeklyPagination.total"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchWeeklyReport"
              @current-change="fetchWeeklyReport"
            />
          </div>
        </el-tab-pane>

        <!-- 月报 -->
        <el-tab-pane label="月报" name="monthly">
          <div class="tab-toolbar">
            <el-date-picker
              v-model="monthlyDateRange"
              type="monthrange"
              range-separator="至"
              start-placeholder="开始月份"
              end-placeholder="结束月份"
              format="YYYY-MM"
              value-format="YYYY-MM"
              @change="fetchMonthlyReport"
            />
            <el-button type="primary" plain @click="fetchMonthlyReport" style="margin-left: 12px">
              查询
            </el-button>
            <el-button type="primary" plain @click="handleExport" style="margin-left: 8px">
              <el-icon><Download /></el-icon>
              导出Excel
            </el-button>
          </div>
          <el-table
            v-loading="monthlyLoading"
            :data="monthlyData"
            border
            stripe
            style="width: 100%; margin-top: 16px"
          >
            <el-table-column prop="month" label="月份" min-width="120" />
            <el-table-column label="总收入(¥)" min-width="130" align="right">
              <template #default="{ row }">
                <span class="amount-total">¥{{ formatMoney(row.totalIncome) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="totalCount" label="总单数" width="100" align="center" />
            <el-table-column label="现金(¥)" min-width="110" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.cashAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="刷卡(¥)" min-width="110" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.cardAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="微信(¥)" min-width="110" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.wechatAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="支付宝(¥)" min-width="110" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.alipayAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="会员卡(¥)" min-width="110" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.memberAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="挂账(¥)" min-width="110" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.creditAmount) }}</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrap" v-if="monthlyPagination.total > 0">
            <el-pagination
              v-model:current-page="monthlyPagination.page"
              v-model:page-size="monthlyPagination.pageSize"
              :page-sizes="[10, 20, 50]"
              :total="monthlyPagination.total"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchMonthlyReport"
              @current-change="fetchMonthlyReport"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 收款明细列表 -->
    <el-card class="detail-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">收款明细</span>
          <div class="card-header-right">
            <el-date-picker
              v-model="paymentDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              size="small"
              @change="fetchPayments"
            />
            <el-input
              v-model="paymentSearch"
              placeholder="搜索支付单号/客户"
              clearable
              size="small"
              class="payment-search"
              @keyup.enter="fetchPayments"
              @clear="fetchPayments"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" size="small" @click="fetchPayments">查询</el-button>
          </div>
        </div>
      </template>
      <el-table
        v-loading="paymentLoading"
        :data="paymentData"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="paymentNo" label="支付单号" min-width="170" show-overflow-tooltip />
        <el-table-column prop="customerName" label="客户" min-width="100" />
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.type === 'repair' ? '' : 'success'">
              {{ row.type === 'repair' ? '维修' : row.type === 'sales' ? '销售' : row.type === 'beauty' ? '美容' : row.type ?? '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额(¥)" width="120" align="right">
          <template #default="{ row }">
            <span class="amount-total">¥{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="支付方式" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="getPayMethodTagType(row.payMethod)">
              {{ getPayMethodLabel(row.payMethod) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="收款时间" min-width="170" />
      </el-table>
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="paymentPagination.page"
          v-model:page-size="paymentPagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="paymentPagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchPayments"
          @current-change="fetchPayments"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Download } from '@element-plus/icons-vue'
import request from '@/api/request'
import dayjs from 'dayjs'

// ==================== 类型定义 ====================

interface DailySummaryRow {
  date: string
  totalIncome: number
  totalCount: number
  cashAmount: number
  cardAmount: number
  wechatAmount: number
  alipayAmount: number
  memberAmount: number
  creditAmount: number
}

interface WeeklySummaryRow {
  weekRange: string
  totalIncome: number
  totalCount: number
  cashAmount: number
  cardAmount: number
  wechatAmount: number
  alipayAmount: number
  memberAmount: number
  creditAmount: number
}

interface MonthlySummaryRow {
  month: string
  totalIncome: number
  totalCount: number
  cashAmount: number
  cardAmount: number
  wechatAmount: number
  alipayAmount: number
  memberAmount: number
  creditAmount: number
}

interface PaymentRow {
  id: number
  paymentNo: string
  customerName: string
  type: string
  amount: number
  payMethod: string
  createTime: string
}

interface ListResponse<T> {
  list: T[]
  total: number
}

// ==================== Tab 状态 ====================

const activeReportTab = ref('daily')

// ==================== 日报 ====================

const dailyDate = ref(dayjs().format('YYYY-MM-DD'))
const dailyData = ref<DailySummaryRow[]>([])
const dailyLoading = ref(false)

const fetchDailyReport = async () => {
  if (!dailyDate.value) return
  dailyLoading.value = true
  try {
    const res = await request.get<any, DailySummaryRow>('/finance/daily-summary', {
      params: { date: dailyDate.value },
    })
    dailyData.value = res ? [res] : []
  } catch {
    dailyData.value = []
  } finally {
    dailyLoading.value = false
  }
}

// ==================== 周报 ====================

const weeklyDateRange = ref<string[]>([])
const weeklyData = ref<WeeklySummaryRow[]>([])
const weeklyLoading = ref(false)
const weeklyPagination = reactive({ page: 1, pageSize: 10, total: 0 })

const fetchWeeklyReport = async () => {
  weeklyLoading.value = true
  try {
    const params: any = {
      page: weeklyPagination.page,
      pageSize: weeklyPagination.pageSize,
    }
    if (weeklyDateRange.value && weeklyDateRange.value.length === 2) {
      params.startDate = weeklyDateRange.value[0]
      params.endDate = weeklyDateRange.value[1]
    }
    const res = await request.get<any, ListResponse<WeeklySummaryRow>>('/finance/payments', { params })
    weeklyData.value = res.list || []
    weeklyPagination.total = res.total || 0
  } catch {
    weeklyData.value = []
    weeklyPagination.total = 0
  } finally {
    weeklyLoading.value = false
  }
}

// ==================== 月报 ====================

const monthlyDateRange = ref<string[]>([])
const monthlyData = ref<MonthlySummaryRow[]>([])
const monthlyLoading = ref(false)
const monthlyPagination = reactive({ page: 1, pageSize: 10, total: 0 })

const fetchMonthlyReport = async () => {
  monthlyLoading.value = true
  try {
    const params: any = {
      page: monthlyPagination.page,
      pageSize: monthlyPagination.pageSize,
    }
    if (monthlyDateRange.value && monthlyDateRange.value.length === 2) {
      params.startDate = monthlyDateRange.value[0]
      params.endDate = monthlyDateRange.value[1]
    }
    const res = await request.get<any, ListResponse<MonthlySummaryRow>>('/finance/payments', { params })
    monthlyData.value = res.list || []
    monthlyPagination.total = res.total || 0
  } catch {
    monthlyData.value = []
    monthlyPagination.total = 0
  } finally {
    monthlyLoading.value = false
  }
}

// ==================== Tab 切换 ====================

const handleTabChange = (tab: string) => {
  if (tab === 'daily') {
    fetchDailyReport()
  } else if (tab === 'weekly') {
    fetchWeeklyReport()
  } else if (tab === 'monthly') {
    fetchMonthlyReport()
  }
}

// ==================== 收款明细 ====================

const paymentSearch = ref('')
const paymentDateRange = ref<string[]>([])
const paymentData = ref<PaymentRow[]>([])
const paymentLoading = ref(false)
const paymentPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const fetchPayments = async () => {
  paymentLoading.value = true
  try {
    const params: any = {
      page: paymentPagination.page,
      pageSize: paymentPagination.pageSize,
    }
    if (paymentSearch.value.trim()) {
      params.keyword = paymentSearch.value.trim()
    }
    if (paymentDateRange.value && paymentDateRange.value.length === 2) {
      params.startDate = paymentDateRange.value[0]
      params.endDate = paymentDateRange.value[1]
    }
    const res = await request.get<any, ListResponse<PaymentRow>>('/finance/payments', { params })
    paymentData.value = res.list || []
    paymentPagination.total = res.total || 0
  } catch {
    paymentData.value = []
    paymentPagination.total = 0
  } finally {
    paymentLoading.value = false
  }
}

// ==================== 导出 ====================

const handleExport = () => {
  ElMessage.info('导出Excel功能开发中，敬请期待')
}

// ==================== 工具函数 ====================

const payMethodLabelMap: Record<string, string> = {
  cash: '现金',
  card: '银行卡',
  wechat: '微信',
  alipay: '支付宝',
  member: '会员卡',
  credit: '挂账',
}

const getPayMethodLabel = (value: string): string => {
  return payMethodLabelMap[value] || value
}

const getPayMethodTagType = (value: string): string => {
  const map: Record<string, string> = {
    cash: 'success',
    card: '',
    wechat: 'success',
    alipay: 'primary',
    member: 'warning',
    credit: 'danger',
  }
  return map[value] || 'info'
}

const formatMoney = (val?: number): string => {
  if (val === undefined || val === null) return '0.00'
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ==================== 初始化 ====================

onMounted(() => {
  fetchDailyReport()
  fetchPayments()
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

.report-card {
  margin-bottom: 16px;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.detail-card {
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

.card-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.payment-search {
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
