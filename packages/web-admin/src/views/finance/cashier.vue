<template>
  <div class="page-container">
    <div class="page-header">
      <h2>收银台</h2>
    </div>

    <!-- 快捷收款方式 -->
    <el-card class="pay-method-card">
      <div class="pay-method-bar">
        <el-button
          v-for="item in payMethods"
          :key="item.value"
          :type="currentPayMethod === item.value ? '' : 'default'"
          :class="['pay-method-btn', { active: currentPayMethod === item.value }]"
          :style="currentPayMethod === item.value ? { backgroundColor: item.color, borderColor: item.color, color: '#fff' } : {}"
          @click="currentPayMethod = item.value"
        >
          <el-icon v-if="item.icon" class="pay-method-icon"><component :is="item.icon" /></el-icon>
          {{ item.label }}
        </el-button>
      </div>
    </el-card>

    <!-- 主体区域 -->
    <div class="cashier-body">
      <!-- 左侧：待结算工单 -->
      <div class="cashier-left">
        <el-card class="order-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">待结算工单</span>
              <el-input
                v-model="searchKeyword"
                placeholder="搜索工单号 / 车牌"
                clearable
                class="order-search"
                @keyup.enter="fetchOrders"
                @clear="fetchOrders"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
          </template>

          <el-table
            v-loading="orderLoading"
            :data="orderList"
            border
            stripe
            height="calc(100vh - 380px)"
          >
            <el-table-column prop="orderNo" label="工单号" min-width="160" show-overflow-tooltip />
            <el-table-column prop="plateNumber" label="车牌号" min-width="110" />
            <el-table-column prop="customerName" label="客户姓名" min-width="100" />
            <el-table-column label="金额(¥)" width="120" align="right">
              <template #default="{ row }">
                <span class="amount-total">¥{{ formatMoney(row.totalAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="handlePay(row)">
                  收款
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="orderPage.page"
              v-model:page-size="orderPage.pageSize"
              :page-sizes="[10, 20, 50]"
              :total="orderPage.total"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchOrders"
              @current-change="fetchOrders"
            />
          </div>
        </el-card>
      </div>

      <!-- 右侧：收款汇总与记录 -->
      <div class="cashier-right">
        <!-- 今日收款汇总 -->
        <el-card class="summary-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">今日收款汇总</span>
              <span class="card-date">{{ todayDate }}</span>
            </div>
          </template>
          <div class="summary-content">
            <div class="summary-item main">
              <span class="summary-label">总收入</span>
              <span class="summary-value primary">¥{{ formatMoney(dailySummary.totalIncome) }}</span>
            </div>
            <el-divider />
            <el-row :gutter="12">
              <el-col :span="8">
                <div class="summary-item">
                  <span class="summary-label">总单数</span>
                  <span class="summary-value">{{ dailySummary.totalCount ?? 0 }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="summary-item">
                  <span class="summary-label">现金</span>
                  <span class="summary-value">¥{{ formatMoney(dailySummary.cashAmount) }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="summary-item">
                  <span class="summary-label">银行卡</span>
                  <span class="summary-value">¥{{ formatMoney(dailySummary.cardAmount) }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="summary-item">
                  <span class="summary-label">微信</span>
                  <span class="summary-value">¥{{ formatMoney(dailySummary.wechatAmount) }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="summary-item">
                  <span class="summary-label">支付宝</span>
                  <span class="summary-value">¥{{ formatMoney(dailySummary.alipayAmount) }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="summary-item">
                  <span class="summary-label">挂账</span>
                  <span class="summary-value">¥{{ formatMoney(dailySummary.creditAmount) }}</span>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-card>

        <!-- 当日收款记录 -->
        <el-card class="record-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">当日收款记录</span>
              <el-button type="primary" link size="small" @click="fetchDailyPayments">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </template>
          <el-table
            v-loading="paymentLoading"
            :data="paymentList"
            border
            stripe
            size="small"
            height="calc(100vh - 700px)"
          >
            <el-table-column prop="paymentNo" label="支付单号" min-width="150" show-overflow-tooltip />
            <el-table-column prop="customerName" label="客户" min-width="80" />
            <el-table-column label="金额(¥)" width="90" align="right">
              <template #default="{ row }">
                <span class="amount-total">¥{{ formatMoney(row.amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="支付方式" width="80" align="center">
              <template #default="{ row }">
                <el-tag size="small">{{ getPayMethodLabel(row.payMethod) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="时间" min-width="140" />
          </el-table>
        </el-card>
      </div>
    </div>

    <!-- 收款弹窗 -->
    <el-dialog
      v-model="payDialogVisible"
      title="收款"
      width="500px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="payFormRef"
        :model="payForm"
        :rules="payFormRules"
        label-width="90px"
      >
        <el-form-item label="工单号">
          <span>{{ payTarget?.orderNo }}</span>
        </el-form-item>
        <el-form-item label="应收金额">
          <span class="amount-total" style="font-size:16px">¥{{ formatMoney(payTarget?.totalAmount) }}</span>
        </el-form-item>
        <el-form-item label="优惠(¥)" prop="discount">
          <el-input-number
            v-model="payForm.discount"
            :min="0"
            :max="payTarget?.totalAmount ?? 0"
            :precision="2"
            controls-position="right"
            style="width: 100%"
            @change="calcActualAmount"
          />
        </el-form-item>
        <el-form-item label="实收金额">
          <span class="amount-total" style="font-size:18px">¥{{ formatMoney(actualAmount) }}</span>
        </el-form-item>
        <el-form-item label="支付方式" prop="payMethod">
          <el-select v-model="payForm.payMethod" placeholder="请选择支付方式" style="width: 100%">
            <el-option
              v-for="m in payMethods"
              :key="m.value"
              :label="m.label"
              :value="m.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="payForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="payDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="payLoading" @click="handlePaySubmit">
          确认收款
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import dayjs from 'dayjs'

// ==================== 类型定义 ====================

interface RepairOrder {
  id: number
  orderNo: string
  plateNumber: string
  customerName: string
  totalAmount: number
  status: string
}

interface OrderListResponse {
  list: RepairOrder[]
  total: number
}

interface DailySummary {
  totalIncome: number
  totalCount: number
  cashAmount: number
  cardAmount: number
  wechatAmount: number
  alipayAmount: number
  memberAmount: number
  creditAmount: number
}

interface PaymentRecord {
  id: number
  paymentNo: string
  customerName: string
  amount: number
  payMethod: string
  createTime: string
}

// ==================== 支付方式 ====================

interface PayMethod {
  label: string
  value: string
  color: string
  icon?: any
}

const payMethods: PayMethod[] = [
  { label: '现金', value: 'cash', color: '#67c23a', icon: undefined },
  { label: '银行卡', value: 'card', color: '#409eff', icon: undefined },
  { label: '微信', value: 'wechat', color: '#07c160', icon: undefined },
  { label: '支付宝', value: 'alipay', color: '#1677ff', icon: undefined },
  { label: '会员卡', value: 'member', color: '#e6a23c', icon: undefined },
  { label: '挂账', value: 'credit', color: '#f56c6c', icon: undefined },
]

const currentPayMethod = ref('cash')

const getPayMethodLabel = (value: string): string => {
  const found = payMethods.find((m) => m.value === value)
  return found ? found.label : value
}

// ==================== 待结算工单列表 ====================

const searchKeyword = ref('')
const orderList = ref<RepairOrder[]>([])
const orderLoading = ref(false)

const orderPage = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const fetchOrders = async () => {
  orderLoading.value = true
  try {
    const params: any = {
      page: orderPage.page,
      pageSize: orderPage.pageSize,
      status: 'quality_check',
    }
    if (searchKeyword.value.trim()) {
      params.keyword = searchKeyword.value.trim()
    }
    const res = await request.get<any, OrderListResponse>('/repair', { params })
    orderList.value = res.list || []
    orderPage.total = res.total || 0
  } catch {
    // 错误已在拦截器中处理
  } finally {
    orderLoading.value = false
  }
}

// ==================== 收款弹窗 ====================

const payDialogVisible = ref(false)
const payTarget = ref<RepairOrder | null>(null)
const payLoading = ref(false)
const payFormRef = ref<FormInstance>()

const payForm = reactive({
  discount: 0,
  payMethod: 'cash',
  remark: '',
})

const payFormRules: FormRules = {
  payMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
}

const actualAmount = computed(() => {
  const total = payTarget.value?.totalAmount ?? 0
  return Math.max(0, total - (payForm.discount || 0))
})

const calcActualAmount = () => {
  // computed 自动响应
}

const handlePay = (row: RepairOrder) => {
  payTarget.value = row
  payForm.discount = 0
  payForm.payMethod = currentPayMethod.value
  payForm.remark = ''
  payDialogVisible.value = true
}

const handlePaySubmit = async () => {
  const valid = await payFormRef.value?.validate().catch(() => false)
  if (!valid) return

  payLoading.value = true
  try {
    await request.post('/finance/payments', {
      orderId: payTarget.value!.id,
      amount: actualAmount.value,
      discount: payForm.discount,
      payMethod: payForm.payMethod,
      remark: payForm.remark || undefined,
    })
    ElMessage.success('收款成功')
    payDialogVisible.value = false
    fetchOrders()
    fetchDailySummary()
    fetchDailyPayments()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    payLoading.value = false
  }
}

// ==================== 今日汇总 ====================

const todayDate = computed(() => dayjs().format('YYYY-MM-DD'))

const dailySummary = reactive<DailySummary>({
  totalIncome: 0,
  totalCount: 0,
  cashAmount: 0,
  cardAmount: 0,
  wechatAmount: 0,
  alipayAmount: 0,
  memberAmount: 0,
  creditAmount: 0,
})

const fetchDailySummary = async () => {
  try {
    const res = await request.get<any, DailySummary>('/finance/daily-summary', {
      params: { date: todayDate.value },
    })
    if (res) {
      Object.assign(dailySummary, res)
    }
  } catch {
    // 使用模拟数据
    dailySummary.totalIncome = 0
    dailySummary.totalCount = 0
    dailySummary.cashAmount = 0
    dailySummary.cardAmount = 0
    dailySummary.wechatAmount = 0
    dailySummary.alipayAmount = 0
    dailySummary.memberAmount = 0
    dailySummary.creditAmount = 0
  }
}

// ==================== 当日收款记录 ====================

const paymentList = ref<PaymentRecord[]>([])
const paymentLoading = ref(false)

const fetchDailyPayments = async () => {
  paymentLoading.value = true
  try {
    const res = await request.get<any, PaymentRecord[]>('/finance/daily-summary', {
      params: { date: todayDate.value },
    })
    // daily-summary 可能包含 payments 字段，或者单独请求
    paymentList.value = (res as any)?.payments || []
  } catch {
    paymentList.value = []
  } finally {
    paymentLoading.value = false
  }
}

// ==================== 工具函数 ====================

const formatMoney = (val?: number): string => {
  if (val === undefined || val === null) return '0.00'
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ==================== 初始化 ====================

onMounted(() => {
  fetchOrders()
  fetchDailySummary()
  fetchDailyPayments()
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

.pay-method-card {
  margin-bottom: 16px;
}

.pay-method-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.pay-method-btn {
  min-width: 100px;
  transition: all 0.3s;
}

.pay-method-btn.active {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.pay-method-icon {
  margin-right: 4px;
}

.cashier-body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.cashier-left {
  flex: 0 0 60%;
  min-width: 0;
}

.cashier-right {
  flex: 0 0 calc(40% - 16px);
  min-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.card-date {
  font-size: 13px;
  color: #909399;
}

.order-search {
  width: 220px;
}

.order-card {
  margin-bottom: 0;
}

.summary-card,
.record-card {
  margin-bottom: 0;
}

.summary-content {
  padding: 4px 0;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
}

.summary-item.main {
  padding: 4px 0 8px;
}

.summary-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.summary-value.primary {
  font-size: 28px;
  color: #f56c6c;
  font-weight: 700;
}

.pagination-wrap {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.amount-total {
  color: #f56c6c;
  font-weight: 600;
}

:deep(.el-divider--horizontal) {
  margin: 8px 0;
}
</style>
