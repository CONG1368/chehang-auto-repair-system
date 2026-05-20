<template>
  <div class="page-container">
    <div class="page-header">
      <h2>应收应付</h2>
    </div>

    <!-- 顶部汇总卡片 -->
    <el-row :gutter="16" class="summary-row">
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #409eff20; color: #409eff">
              <el-icon size="28"><Money /></el-icon>
            </div>
            <div class="summary-info">
              <p class="summary-label">总应收</p>
              <p class="summary-value">¥{{ formatMoney(receivableSummary.totalReceivable) }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #67c23a20; color: #67c23a">
              <el-icon size="28"><CircleCheck /></el-icon>
            </div>
            <div class="summary-info">
              <p class="summary-label">已收</p>
              <p class="summary-value">¥{{ formatMoney(receivableSummary.totalPaid) }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #e6a23c20; color: #e6a23c">
              <el-icon size="28"><Warning /></el-icon>
            </div>
            <div class="summary-info">
              <p class="summary-label">未收</p>
              <p class="summary-value">¥{{ formatMoney(receivableSummary.totalUnpaid) }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #f56c6c20; color: #f56c6c">
              <el-icon size="28"><Clock /></el-icon>
            </div>
            <div class="summary-info">
              <p class="summary-label">逾期金额</p>
              <p class="summary-value danger">¥{{ formatMoney(receivableSummary.overdueAmount) }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 选项卡 -->
    <el-card>
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 应收账款 -->
        <el-tab-pane label="应收账款" name="receivable">
          <div class="tab-toolbar">
            <el-select
              v-model="receivableStatusFilter"
              placeholder="状态筛选"
              clearable
              style="width: 140px"
              @change="fetchReceivables"
            >
              <el-option label="全部" value="" />
              <el-option label="正常" value="normal" />
              <el-option label="逾期" value="overdue" />
            </el-select>
            <el-input
              v-model="receivableSearch"
              placeholder="搜索客户名称"
              clearable
              style="width: 200px"
              class="tab-search"
              @keyup.enter="fetchReceivables"
              @clear="fetchReceivables"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="fetchReceivables">查询</el-button>
          </div>

          <el-table
            v-loading="receivableLoading"
            :data="receivableList"
            border
            stripe
            style="width: 100%; margin-top: 16px"
          >
            <el-table-column prop="customerName" label="客户" min-width="120" />
            <el-table-column label="应收金额(¥)" min-width="120" align="right">
              <template #default="{ row }">
                <span class="amount-total">¥{{ formatMoney(row.amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="已付(¥)" min-width="110" align="right">
              <template #default="{ row }">
                <span class="amount-paid">¥{{ formatMoney(row.paidAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="未付(¥)" min-width="110" align="right">
              <template #default="{ row }">
                <span class="amount-unpaid">¥{{ formatMoney(row.unpaidAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="dueDate" label="账期" min-width="110" />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'normal' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'normal' ? '正常' : '逾期' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.unpaidAmount > 0"
                  type="primary"
                  link
                  size="small"
                  @click="handleRepay(row)"
                >
                  还款
                </el-button>
                <span v-else class="text-success">已结清</span>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="receivablePagination.page"
              v-model:page-size="receivablePagination.pageSize"
              :page-sizes="[10, 20, 50]"
              :total="receivablePagination.total"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchReceivables"
              @current-change="fetchReceivables"
            />
          </div>
        </el-tab-pane>

        <!-- 应付账款 -->
        <el-tab-pane label="应付账款" name="payable">
          <div class="tab-toolbar">
            <el-input
              v-model="payableSearch"
              placeholder="搜索供应商名称"
              clearable
              style="width: 200px"
              class="tab-search"
              @keyup.enter="fetchPayables"
              @clear="fetchPayables"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="fetchPayables">查询</el-button>
          </div>

          <el-table
            v-loading="payableLoading"
            :data="filteredPayableList"
            border
            stripe
            style="width: 100%; margin-top: 16px"
          >
            <el-table-column prop="supplierName" label="供应商" min-width="150" />
            <el-table-column label="应付金额(¥)" min-width="120" align="right">
              <template #default="{ row }">
                <span class="amount-total">¥{{ formatMoney(row.amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="已付(¥)" min-width="110" align="right">
              <template #default="{ row }">
                <span class="amount-paid">¥{{ formatMoney(row.paidAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="未付(¥)" min-width="110" align="right">
              <template #default="{ row }">
                <span class="amount-unpaid">¥{{ formatMoney(row.unpaidAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="dueDate" label="到期日" min-width="110" />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'normal' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'normal' ? '正常' : '逾期' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.remark || '-' }}
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="payablePagination.page"
              v-model:page-size="payablePagination.pageSize"
              :page-sizes="[10, 20, 50]"
              :total="payablePagination.total"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchPayables"
              @current-change="fetchPayables"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 还款弹窗 -->
    <el-dialog
      v-model="repayDialogVisible"
      title="还款"
      width="450px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="repayFormRef"
        :model="repayForm"
        :rules="repayFormRules"
        label-width="90px"
      >
        <el-form-item label="客户">
          <span>{{ repayTarget?.customerName }}</span>
        </el-form-item>
        <el-form-item label="未付金额">
          <span class="amount-unpaid" style="font-size:16px">¥{{ formatMoney(repayTarget?.unpaidAmount) }}</span>
        </el-form-item>
        <el-form-item label="还款金额(¥)" prop="amount">
          <el-input-number
            v-model="repayForm.amount"
            :min="0.01"
            :max="repayTarget?.unpaidAmount ?? 0"
            :precision="2"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入还款金额"
          />
        </el-form-item>
        <el-form-item label="支付方式" prop="payMethod">
          <el-select v-model="repayForm.payMethod" placeholder="请选择支付方式" style="width: 100%">
            <el-option label="现金" value="cash" />
            <el-option label="银行卡" value="card" />
            <el-option label="微信" value="wechat" />
            <el-option label="支付宝" value="alipay" />
            <el-option label="对公转账" value="bank_transfer" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="repayForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="repayDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="repayLoading" @click="handleRepaySubmit">
          确认还款
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Money, CircleCheck, Warning, Clock, Search } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'

// ==================== 类型定义 ====================

interface ReceivableRecord {
  id: number
  customerName: string
  amount: number
  paidAmount: number
  unpaidAmount: number
  dueDate: string
  status: 'normal' | 'overdue'
}

interface PayableRecord {
  id: number
  supplierName: string
  amount: number
  paidAmount: number
  unpaidAmount: number
  dueDate: string
  status: 'normal' | 'overdue'
  remark: string
}

interface ReceivableSummary {
  totalReceivable: number
  totalPaid: number
  totalUnpaid: number
  overdueAmount: number
}

interface ListResponse<T> {
  list: T[]
  total: number
}

// ==================== 汇总卡片 ====================

const receivableSummary = reactive<ReceivableSummary>({
  totalReceivable: 0,
  totalPaid: 0,
  totalUnpaid: 0,
  overdueAmount: 0,
})

// ==================== Tab 状态 ====================

const activeTab = ref('receivable')

const handleTabChange = (tab: string) => {
  if (tab === 'receivable') {
    fetchReceivables()
  } else if (tab === 'payable') {
    fetchPayables()
  }
}

// ==================== 应收账款 ====================

const receivableSearch = ref('')
const receivableStatusFilter = ref('')
const receivableList = ref<ReceivableRecord[]>([])
const receivableLoading = ref(false)
const receivablePagination = reactive({ page: 1, pageSize: 10, total: 0 })

const fetchReceivables = async () => {
  receivableLoading.value = true
  try {
    const params: any = {
      page: receivablePagination.page,
      pageSize: receivablePagination.pageSize,
    }
    if (receivableSearch.value.trim()) {
      params.keyword = receivableSearch.value.trim()
    }
    if (receivableStatusFilter.value) {
      params.status = receivableStatusFilter.value
    }
    const res = await request.get<any, ListResponse<ReceivableRecord>>('/finance/receivables', { params })
    receivableList.value = res.list || []
    receivablePagination.total = res.total || 0

    // 更新汇总数据
    if (res && 'summary' in res) {
      Object.assign(receivableSummary, (res as any).summary)
    } else {
      calcReceivableSummary()
    }
  } catch {
    receivableList.value = []
    receivablePagination.total = 0
    // 加载模拟数据
    loadMockReceivables()
    calcReceivableSummary()
  } finally {
    receivableLoading.value = false
  }
}

const calcReceivableSummary = () => {
  let totalReceivable = 0
  let totalPaid = 0
  let totalUnpaid = 0
  let overdueAmount = 0

  for (const item of receivableList.value) {
    totalReceivable += item.amount
    totalPaid += item.paidAmount
    totalUnpaid += item.unpaidAmount
    if (item.status === 'overdue') {
      overdueAmount += item.unpaidAmount
    }
  }

  receivableSummary.totalReceivable = totalReceivable
  receivableSummary.totalPaid = totalPaid
  receivableSummary.totalUnpaid = totalUnpaid
  receivableSummary.overdueAmount = overdueAmount
}

const loadMockReceivables = () => {
  receivableList.value = [
    {
      id: 1,
      customerName: '张三',
      amount: 5800,
      paidAmount: 3000,
      unpaidAmount: 2800,
      dueDate: '2026-05-25',
      status: 'normal',
    },
    {
      id: 2,
      customerName: '李四',
      amount: 12000,
      paidAmount: 0,
      unpaidAmount: 12000,
      dueDate: '2026-04-30',
      status: 'overdue',
    },
    {
      id: 3,
      customerName: '王五',
      amount: 3500,
      paidAmount: 3500,
      unpaidAmount: 0,
      dueDate: '2026-05-15',
      status: 'normal',
    },
    {
      id: 4,
      customerName: '赵六',
      amount: 8000,
      paidAmount: 2000,
      unpaidAmount: 6000,
      dueDate: '2026-04-20',
      status: 'overdue',
    },
    {
      id: 5,
      customerName: '钱七',
      amount: 4500,
      paidAmount: 0,
      unpaidAmount: 4500,
      dueDate: '2026-06-10',
      status: 'normal',
    },
  ]
  receivablePagination.total = 5
}

// ==================== 应付账款 ====================

const payableSearch = ref('')
const payableList = ref<PayableRecord[]>([])
const payableLoading = ref(false)
const payablePagination = reactive({ page: 1, pageSize: 10, total: 0 })

const filteredPayableList = computed(() => {
  if (!payableSearch.value.trim()) return payableList.value
  const keyword = payableSearch.value.trim().toLowerCase()
  return payableList.value.filter((item) =>
    item.supplierName.toLowerCase().includes(keyword),
  )
})

const loadMockPayables = () => {
  payableList.value = [
    {
      id: 1,
      supplierName: '博世汽车配件有限公司',
      amount: 25000,
      paidAmount: 15000,
      unpaidAmount: 10000,
      dueDate: '2026-06-15',
      status: 'normal',
      remark: '刹车片、机油滤清器采购',
    },
    {
      id: 2,
      supplierName: '美孚润滑油代理',
      amount: 18000,
      paidAmount: 0,
      unpaidAmount: 18000,
      dueDate: '2026-05-01',
      status: 'overdue',
      remark: '全合成机油批量采购',
    },
    {
      id: 3,
      supplierName: '固特异轮胎经销商',
      amount: 32000,
      paidAmount: 32000,
      unpaidAmount: 0,
      dueDate: '2026-05-10',
      status: 'normal',
      remark: '夏季轮胎采购',
    },
    {
      id: 4,
      supplierName: '3M汽车美容用品',
      amount: 8500,
      paidAmount: 3000,
      unpaidAmount: 5500,
      dueDate: '2026-06-20',
      status: 'normal',
      remark: '镀晶液、抛光剂采购',
    },
    {
      id: 5,
      supplierName: 'AC德科电瓶供应商',
      amount: 12000,
      paidAmount: 0,
      unpaidAmount: 12000,
      dueDate: '2026-04-15',
      status: 'overdue',
      remark: '汽车电瓶一批',
    },
  ]
  payablePagination.total = 5
}

const fetchPayables = async () => {
  payableLoading.value = true
  try {
    // 应付账款暂无后端接口，使用模拟数据
    loadMockPayables()
  } finally {
    payableLoading.value = false
  }
}

// ==================== 还款弹窗 ====================

const repayDialogVisible = ref(false)
const repayTarget = ref<ReceivableRecord | null>(null)
const repayLoading = ref(false)
const repayFormRef = ref<FormInstance>()

const repayForm = reactive({
  amount: 0,
  payMethod: 'cash',
  remark: '',
})

const repayFormRules: FormRules = {
  amount: [
    { required: true, message: '请输入还款金额', trigger: 'blur' },
  ],
  payMethod: [
    { required: true, message: '请选择支付方式', trigger: 'change' },
  ],
}

const handleRepay = (row: ReceivableRecord) => {
  repayTarget.value = row
  repayForm.amount = row.unpaidAmount
  repayForm.payMethod = 'cash'
  repayForm.remark = ''
  repayDialogVisible.value = true
}

const handleRepaySubmit = async () => {
  const valid = await repayFormRef.value?.validate().catch(() => false)
  if (!valid) return

  repayLoading.value = true
  try {
    await request.put(`/finance/receivables/${repayTarget.value!.id}/pay`, {
      amount: repayForm.amount,
      payMethod: repayForm.payMethod,
      remark: repayForm.remark || undefined,
    })
    ElMessage.success('还款成功')
    repayDialogVisible.value = false
    fetchReceivables()
  } catch {
    // API 不可用时模拟本地更新
    if (repayTarget.value) {
      const row = repayTarget.value
      row.paidAmount += repayForm.amount
      row.unpaidAmount = Math.max(0, row.amount - row.paidAmount)
      if (row.unpaidAmount <= 0) {
        row.status = 'normal'
      }
      calcReceivableSummary()
    }
    ElMessage.success('还款成功（本地模拟）')
    repayDialogVisible.value = false
  } finally {
    repayLoading.value = false
  }
}

// ==================== 工具函数 ====================

const formatMoney = (val?: number): string => {
  if (val === undefined || val === null) return '0.00'
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ==================== 初始化 ====================

onMounted(() => {
  fetchReceivables()
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

.summary-row {
  margin-bottom: 16px;
}

.summary-card {
  cursor: default;
}

.summary-inner {
  display: flex;
  align-items: center;
  gap: 14px;
}

.summary-icon {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.summary-info {
  flex: 1;
  min-width: 0;
}

.summary-label {
  font-size: 13px;
  color: #909399;
  margin: 0 0 4px 0;
}

.summary-value {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  margin: 0;
}

.summary-value.danger {
  color: #f56c6c;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tab-search {
  margin-left: 0;
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

.amount-paid {
  color: #67c23a;
  font-weight: 500;
}

.amount-unpaid {
  color: #e6a23c;
  font-weight: 500;
}

.text-success {
  color: #67c23a;
  font-size: 13px;
}
</style>
