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
        <el-divider direction="vertical" />
        <el-button type="success" @click="handleCreatePayment">
          <el-icon><Plus /></el-icon>新增收款
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
            @row-click="handleView"
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
            <el-table-column label="操作" width="80" align="center" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleView(row)">
                  查看
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </div>

    <!-- 收款详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="收款详情"
      size="480px"
      :close-on-click-modal="false"
    >
      <template v-if="viewRow">
        <el-descriptions :column="1" border size="default">
          <el-descriptions-item label="支付单号">{{ viewRow.paymentNo }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ viewRow.customerName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="收款金额">¥{{ formatMoney(viewRow.amount) }}</el-descriptions-item>
          <el-descriptions-item label="支付方式">
            <el-tag size="small">{{ getPayMethodLabel(viewRow.payMethod) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="收款时间">{{ viewRow.createTime || '-' }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button @click="drawerVisible = false">关闭</el-button>
      </template>
    </el-drawer>

    <!-- 新增收款弹窗 -->
    <el-dialog
      v-model="newPayDialogVisible"
      title="新增收款"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="newPayFormRef"
        :model="newPayForm"
        :rules="newPayFormRules"
        label-width="90px"
      >
        <el-form-item label="客户" prop="customerId">
          <el-select
            v-model="newPayForm.customerId"
            filterable
            remote
            reserve-keyword
            placeholder="搜索客户姓名/电话"
            :remote-method="searchCustomers"
            :loading="customerSearchLoading"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="c in customerOptions"
              :key="c.id"
              :label="`${c.name} (${c.phone})`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="业务类型" prop="type">
          <el-select v-model="newPayForm.type" placeholder="请选择业务类型" style="width: 100%">
            <el-option label="维修收款" value="repair" />
            <el-option label="销售收款" value="sales" />
            <el-option label="美容收款" value="beauty" />
            <el-option label="其他收款" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="收款金额" prop="amount">
          <el-input-number
            v-model="newPayForm.amount"
            :min="0.01"
            :precision="2"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="优惠(¥)" prop="discount">
          <el-input-number
            v-model="newPayForm.discount"
            :min="0"
            :max="newPayForm.amount"
            :precision="2"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="实收金额">
          <span class="amount-total" style="font-size:18px">¥{{ formatMoney(newPayActualAmount) }}</span>
        </el-form-item>
        <el-form-item label="支付方式" prop="paymentMethod">
          <el-select v-model="newPayForm.paymentMethod" placeholder="请选择支付方式" style="width: 100%">
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
            v-model="newPayForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注（选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="newPayDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="newPayLoading" @click="handleNewPaySubmit">
          确认收款
        </el-button>
      </template>
    </el-dialog>

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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import { printHtml } from '@/utils/print'
import dayjs from 'dayjs'

// ==================== 类型定义 ====================

interface RepairOrder {
  id: number
  orderNo: string
  plateNumber: string
  customerName: string
  customerId?: number
  totalAmount: number
  status: string
}

interface OrderListResponse {
  list: RepairOrder[]
  total: number
}

interface DailySummaryBackend {
  date: string
  totalRevenue: number
  totalCount: number
  byPaymentMethod: Record<string, number>
  byType: Record<string, number>
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

// ==================== 详情抽屉 ====================

const drawerVisible = ref(false)
const viewRow = ref<PaymentRecord | null>(null)

function handleView(row: PaymentRecord) {
  viewRow.value = row
  drawerVisible.value = true
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
      status: 'quality_check,completed',
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
    const res = await request.post<any, any>('/finance/payments', {
      customerId: payTarget.value!.customerId || 0,
      repairOrderId: payTarget.value!.id,
      type: 'repair',
      amount: actualAmount.value,
      discount: payForm.discount,
      paymentMethod: payForm.payMethod,
      remark: payForm.remark || undefined,
    })
    ElMessage.success('收款成功')
    payDialogVisible.value = false
    fetchOrders()
    fetchDailySummary()
    fetchDailyPayments()

    // 询问是否打印收据
    setTimeout(() => {
      const target = payTarget.value
      ElMessageBox.confirm(
        '收款成功，是否打印收据？',
        '打印确认',
        {
          confirmButtonText: '打印收据',
          cancelButtonText: '暂不打印',
          type: 'info',
        },
      )
        .then(async () => {
          // 使用 CashierReceiptPrint 模板组件渲染打印内容
          const { h, createApp } = await import('vue')
          const { default: CashierReceiptPrint } = await import('@/components/PrintTemplate/CashierReceiptPrint.vue')
          const container = document.createElement('div')
          const safeData = {
            paymentNo: res?.paymentNo || '-',
            customerName: target?.customerName || '-',
            customerPhone: res?.customer?.phone || '-',
            type: '维修',
            paymentMethod: getPayMethodLabel(payForm.payMethod),
            amount: actualAmount.value,
            discount: payForm.discount,
            remark: payForm.remark || '-',
            createdAt: new Date().toISOString(),
          }
          const app = createApp({ render: () => h(CashierReceiptPrint, { data: safeData }) })
          app.mount(container)
          await new Promise(r => setTimeout(r, 100))
          printHtml(container.innerHTML)
          app.unmount()
        })
        .catch(() => {
          // 用户取消打印
        })
    }, 300)
  } catch {
    // 错误已在拦截器中处理
  } finally {
    payLoading.value = false
  }
}

// ==================== 新增收款（独立收款，不关联工单） ====================

const newPayDialogVisible = ref(false)
const newPayLoading = ref(false)
const newPayFormRef = ref<FormInstance>()
const customerSearchLoading = ref(false)
const customerOptions = ref<{ id: number; name: string; phone: string }[]>([])

interface NewPayForm {
  customerId: number | null
  type: string
  amount: number
  discount: number
  paymentMethod: string
  remark: string
}

const newPayForm = reactive<NewPayForm>({
  customerId: null,
  type: 'repair',
  amount: 0,
  discount: 0,
  paymentMethod: 'cash',
  remark: '',
})

const newPayFormRules: FormRules = {
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  type: [{ required: true, message: '请选择业务类型', trigger: 'change' }],
  amount: [{ required: true, message: '请输入收款金额', trigger: 'blur' }],
  paymentMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
}

const newPayActualAmount = computed(() => {
  return Math.max(0, (newPayForm.amount || 0) - (newPayForm.discount || 0))
})

const searchCustomers = async (query: string) => {
  if (!query || query.trim().length === 0) {
    customerOptions.value = []
    return
  }
  customerSearchLoading.value = true
  try {
    const res = await request.get<any, any>('/customers', {
      params: { keyword: query.trim(), page: 1, pageSize: 20 },
    })
    customerOptions.value = (res?.list || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || '-',
    }))
  } catch {
    customerOptions.value = []
  } finally {
    customerSearchLoading.value = false
  }
}

const handleCreatePayment = () => {
  newPayForm.customerId = null
  newPayForm.type = 'repair'
  newPayForm.amount = 0
  newPayForm.discount = 0
  newPayForm.paymentMethod = currentPayMethod.value
  newPayForm.remark = ''
  customerOptions.value = []
  newPayDialogVisible.value = true
}

const handleNewPaySubmit = async () => {
  const valid = await newPayFormRef.value?.validate().catch(() => false)
  if (!valid) return

  newPayLoading.value = true
  try {
    await request.post('/finance/payments', {
      customerId: newPayForm.customerId,
      type: newPayForm.type,
      amount: newPayActualAmount.value,
      discount: newPayForm.discount,
      paymentMethod: newPayForm.paymentMethod,
      remark: newPayForm.remark || undefined,
    })
    ElMessage.success('收款成功')
    newPayDialogVisible.value = false
    fetchDailySummary()
    fetchDailyPayments()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    newPayLoading.value = false
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
    const res = await request.get<any, DailySummaryBackend>('/finance/daily-summary', {
      params: { date: todayDate.value },
    })
    if (res) {
      const pm = res.byPaymentMethod || {}
      Object.assign(dailySummary, {
        totalIncome: res.totalRevenue || 0,
        totalCount: res.totalCount || 0,
        cashAmount: pm.cash || 0,
        cardAmount: pm.card || 0,
        wechatAmount: pm.wechat || 0,
        alipayAmount: pm.alipay || 0,
        memberAmount: pm.member || 0,
        creditAmount: pm.credit || 0,
      })
    }
  } catch {
    dailySummary.totalIncome = 0
    dailySummary.totalCount = 0
    dailySummary.cashAmount = 0
    dailySummary.cardAmount = 0
    dailySummary.wechatAmount = 0
    dailySummary.alipayAmount = 0
    dailySummary.memberAmount = 0
    dailySummary.creditAmount = 0
    ElMessage.warning('今日汇总数据加载失败，当前显示为本地缓存数据')
  }
}

// ==================== 当日收款记录 ====================

const paymentList = ref<PaymentRecord[]>([])
const paymentLoading = ref(false)

const fetchDailyPayments = async () => {
  paymentLoading.value = true
  try {
    const res = await request.get<any, any>('/finance/payments', {
      params: {
        date: todayDate.value,
        page: 1,
        pageSize: 50,
      },
    })
    paymentList.value = res?.list || []
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
