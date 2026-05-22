<template>
  <div class="page-container">
    <div class="page-header">
      <h2>应付账款</h2>
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
              <p class="summary-label">应付总额</p>
              <p class="summary-value">¥{{ formatMoney(summary.totalAmount) }}</p>
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
              <p class="summary-label">已付总额</p>
              <p class="summary-value">¥{{ formatMoney(summary.totalPaid) }}</p>
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
              <p class="summary-label">待付总额</p>
              <p class="summary-value">¥{{ formatMoney(summary.totalUnpaid) }}</p>
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
              <p class="summary-label">待付笔数</p>
              <p class="summary-value">{{ summary.pendingCount }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索筛选 + 操作栏 -->
    <el-card>
      <div class="toolbar">
        <div class="toolbar-left">
          <el-select
            v-model="filters.status"
            placeholder="状态筛选"
            clearable
            style="width: 120px"
            @change="handleSearch"
          >
            <el-option label="待付" value="pending" />
            <el-option label="已付" value="paid" />
          </el-select>
          <el-select
            v-model="filters.supplierId"
            placeholder="供应商"
            clearable
            filterable
            style="width: 180px"
            @change="handleSearch"
          >
            <el-option
              v-for="s in supplierList"
              :key="s.id"
              :label="s.name"
              :value="s.id"
            />
          </el-select>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
            @change="handleSearch"
          />
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新建应付
          </el-button>
          <el-button type="success" @click="handleExport">
            <el-icon><Download /></el-icon>导出Excel
          </el-button>
        </div>
      </div>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="list"
        border
        stripe
        style="width: 100%; margin-top: 16px"
        @row-click="(row: any) => handleDetail(row)"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column label="供应商" min-width="160">
          <template #default="{ row }">
            {{ row.supplier?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="应付金额(¥)" min-width="130" align="right">
          <template #default="{ row }">
            <span class="amount-total">¥{{ formatMoney(Number(row.amount)) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="已付金额(¥)" min-width="130" align="right">
          <template #default="{ row }">
            <span class="amount-paid">¥{{ formatMoney(Number(row.paidAmount)) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="未付金额(¥)" min-width="130" align="right">
          <template #default="{ row }">
            <span class="amount-unpaid">¥{{ formatMoney(Number(row.amount) - Number(row.paidAmount)) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="到期日" min-width="110" align="center">
          <template #default="{ row }">
            {{ row.dueDate ? row.dueDate.split('T')[0] : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" min-width="100" align="center" />
        <el-table-column prop="sourceNo" label="来源单号" min-width="140" show-overflow-tooltip />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'paid' ? 'success' : 'warning'" size="small">
              {{ row.status === 'paid' ? '已付' : '待付' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="230" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="info" link size="small" @click.stop="handleDetail(row)">
              详情
            </el-button>
            <el-button type="warning" link size="small" @click.stop="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click.stop="handleDelete(row)">
              删除
            </el-button>
            <el-button
              v-if="row.status !== 'paid'"
              type="primary"
              link
              size="small"
              @click.stop="handlePay(row)"
            >
              付款
            </el-button>
            <span v-else class="text-success">已结清</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="应付账款详情"
      size="480px"
      :close-on-click-modal="false"
    >
      <template v-if="detailRow">
        <el-descriptions :column="1" border size="default">
          <el-descriptions-item label="供应商">{{ detailRow.supplier?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="应付金额">¥{{ formatMoney(Number(detailRow.amount)) }}</el-descriptions-item>
          <el-descriptions-item label="已付金额">¥{{ formatMoney(Number(detailRow.paidAmount)) }}</el-descriptions-item>
          <el-descriptions-item label="未付金额">¥{{ formatMoney(Number(detailRow.amount) - Number(detailRow.paidAmount)) }}</el-descriptions-item>
          <el-descriptions-item label="到期日">{{ detailRow.dueDate ? detailRow.dueDate.split('T')[0] : '-' }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{ detailRow.source || '-' }}</el-descriptions-item>
          <el-descriptions-item label="来源单号">{{ detailRow.sourceNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detailRow.status === 'paid' ? 'success' : 'warning'" size="small">
              {{ detailRow.status === 'paid' ? '已付' : '待付' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(detailRow.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(detailRow.updatedAt) }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button @click="drawerVisible = false">关闭</el-button>
      </template>
    </el-drawer>

    <!-- 新建/编辑应付弹窗 -->
    <el-dialog
      v-model="createDialogVisible"
      :title="isEdit ? '编辑应付账款' : '新建应付账款'"
      width="500px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createFormRules"
        label-width="90px"
      >
        <el-form-item label="供应商" prop="supplierId">
          <el-select
            v-model="createForm.supplierId"
            placeholder="请选择供应商"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="s in supplierList"
              :key="s.id"
              :label="s.name"
              :value="s.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="应付金额(¥)" prop="amount">
          <el-input-number
            v-model="createForm.amount"
            :min="0.01"
            :precision="2"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入应付金额"
          />
        </el-form-item>
        <el-form-item label="到期日" prop="dueDate">
          <el-date-picker
            v-model="createForm.dueDate"
            type="date"
            placeholder="请选择到期日"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="来源" prop="source">
          <el-select v-model="createForm.source" placeholder="请选择来源" style="width: 100%">
            <el-option label="配件采购" value="purchase" />
            <el-option label="设备采购" value="equipment" />
            <el-option label="外协维修" value="outsource" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源单号" prop="sourceNo">
          <el-input
            v-model="createForm.sourceNo"
            placeholder="请输入来源单号（如采购单号）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreateSubmit">
          确认{{ isEdit ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 付款弹窗 -->
    <el-dialog
      v-model="payDialogVisible"
      title="付款"
      width="450px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="payFormRef"
        :model="payForm"
        :rules="payFormRules"
        label-width="100px"
      >
        <el-form-item label="供应商">
          <span>{{ payTarget?.supplier?.name }}</span>
        </el-form-item>
        <el-form-item label="未付金额">
          <span class="amount-unpaid" style="font-size: 16px">
            ¥{{ formatMoney(Number(payTarget?.amount) - Number(payTarget?.paidAmount)) }}
          </span>
        </el-form-item>
        <el-form-item label="付款金额(¥)" prop="amount">
          <el-input-number
            v-model="payForm.amount"
            :min="0.01"
            :max="payTarget ? Number(payTarget.amount) - Number(payTarget.paidAmount) : 0"
            :precision="2"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入付款金额"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="payDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="payLoading" @click="handlePaySubmit">
          确认付款
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Money, CircleCheck, Warning, Clock, Search, Plus, Download, Edit, Delete } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import { downloadFile } from '@/utils/download'

// ==================== 类型定义 ====================

interface Supplier {
  id: number
  name: string
}

interface PayableRecord {
  id: number
  supplierId: number
  supplier?: { id: number; name: string }
  amount: number | string
  paidAmount: number | string
  dueDate: string | null
  status: string
  source: string
  sourceNo: string
  createdAt: string
  updatedAt: string
}

interface PayableSummary {
  totalAmount: number
  totalPaid: number
  totalUnpaid: number
  pendingCount: number
}

// ==================== 汇总数据 ====================

const summary = reactive<PayableSummary>({
  totalAmount: 0,
  totalPaid: 0,
  totalUnpaid: 0,
  pendingCount: 0,
})

// ==================== 供应商列表 ====================

const supplierList = ref<Supplier[]>([])

async function fetchSuppliers() {
  try {
    const res = await request.get<any, any>('/inventory/suppliers')
    supplierList.value = res ?? []
  } catch {
    supplierList.value = []
  }
}

// ==================== 筛选条件 ====================

const filters = reactive({
  status: '' as string,
  supplierId: undefined as number | undefined,
})

const dateRange = ref<[string, string] | null>(null)

function handleSearch() {
  pagination.page = 1
  fetchList()
  fetchSummary()
}

function handleReset() {
  filters.status = ''
  filters.supplierId = undefined
  dateRange.value = null
  pagination.page = 1
  fetchList()
  fetchSummary()
}

// ==================== 数据列表 ====================

const list = ref<PayableRecord[]>([])
const loading = ref(false)
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

async function fetchList() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (filters.status) {
      params.status = filters.status
    }
    if (filters.supplierId) {
      params.supplierId = filters.supplierId
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await request.get<any, any>('/finance/payables', { params })
    list.value = res.list || []
    pagination.total = res.total || 0
  } catch {
    list.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// ==================== 汇总统计 ====================

async function fetchSummary() {
  try {
    const res = await request.get<any, PayableSummary>('/finance/payables/summary')
    if (res) {
      summary.totalAmount = res.totalAmount || 0
      summary.totalPaid = res.totalPaid || 0
      summary.totalUnpaid = res.totalUnpaid || 0
      summary.pendingCount = res.pendingCount || 0
    }
  } catch {
    calcLocalSummary()
  }
}

function calcLocalSummary() {
  let totalAmount = 0
  let totalPaid = 0
  for (const item of list.value) {
    totalAmount += Number(item.amount)
    totalPaid += Number(item.paidAmount)
  }
  summary.totalAmount = totalAmount
  summary.totalPaid = totalPaid
  summary.totalUnpaid = totalAmount - totalPaid
  summary.pendingCount = list.value.filter((r) => r.status !== 'paid').length
}

// ==================== 详情抽屉 ====================

const drawerVisible = ref(false)
const detailRow = ref<PayableRecord | null>(null)

function handleDetail(row: PayableRecord) {
  detailRow.value = row
  drawerVisible.value = true
}

// ==================== 新建/编辑应付 ====================

const createDialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number>(0)
const createLoading = ref(false)
const createFormRef = ref<FormInstance>()

const createForm = reactive({
  supplierId: null as number | null,
  amount: 0,
  dueDate: '' as string,
  source: 'purchase',
  sourceNo: '',
})

const createFormRules: FormRules = {
  supplierId: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  amount: [{ required: true, message: '请输入应付金额', trigger: 'blur' }],
  source: [{ required: true, message: '请选择来源', trigger: 'change' }],
  sourceNo: [{ required: true, message: '请输入来源单号', trigger: 'blur' }],
}

function handleCreate() {
  isEdit.value = false
  editingId.value = 0
  createForm.supplierId = null
  createForm.amount = 0
  createForm.dueDate = ''
  createForm.source = 'purchase'
  createForm.sourceNo = ''
  createDialogVisible.value = true
}

function handleEdit(row: PayableRecord) {
  isEdit.value = true
  editingId.value = row.id
  createForm.supplierId = row.supplierId
  createForm.amount = Number(row.amount)
  createForm.dueDate = row.dueDate || ''
  createForm.source = row.source
  createForm.sourceNo = row.sourceNo
  createDialogVisible.value = true
}

async function handleCreateSubmit() {
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return

  createLoading.value = true
  try {
    const payload = {
      supplierId: createForm.supplierId,
      amount: createForm.amount,
      dueDate: createForm.dueDate || undefined,
      source: createForm.source,
      sourceNo: createForm.sourceNo,
    }
    if (isEdit.value) {
      await request.put(`/finance/payables/${editingId.value}`, payload)
      ElMessage.success('编辑成功')
    } else {
      await request.post('/finance/payables', payload)
      ElMessage.success('创建成功')
    }
    createDialogVisible.value = false
    handleSearch()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    createLoading.value = false
  }
}

// ==================== 删除 ====================

function handleDelete(row: PayableRecord) {
  ElMessageBox.confirm(
    `确定删除供应商「${row.supplier?.name || '-'}」的应付记录吗？金额：¥${formatMoney(Number(row.amount))}，删除后不可恢复。`,
    '删除确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' },
  )
    .then(async () => {
      try {
        await request.delete(`/finance/payables/${row.id}`)
        ElMessage.success('删除成功')
        handleSearch()
      } catch {
        // 错误已在拦截器中处理
      }
    })
    .catch(() => {})
}

// ==================== 付款弹窗 ====================

const payDialogVisible = ref(false)
const payTarget = ref<PayableRecord | null>(null)
const payLoading = ref(false)
const payFormRef = ref<FormInstance>()

const payForm = reactive({
  amount: 0,
})

const payFormRules: FormRules = {
  amount: [{ required: true, message: '请输入付款金额', trigger: 'blur' }],
}

function handlePay(row: PayableRecord) {
  payTarget.value = row
  const unpaid = Number(row.amount) - Number(row.paidAmount)
  payForm.amount = unpaid
  payDialogVisible.value = true
}

async function handlePaySubmit() {
  const valid = await payFormRef.value?.validate().catch(() => false)
  if (!valid) return

  payLoading.value = true
  try {
    await request.put(`/finance/payables/${payTarget.value!.id}/pay`, {
      amount: payForm.amount,
    })
    ElMessage.success('付款成功')
    payDialogVisible.value = false
    handleSearch()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    payLoading.value = false
  }
}

// ==================== 工具函数 ====================

function handleExport() {
  downloadFile('/api/export/excel?module=finance', '应付账款.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

function formatMoney(val?: number): string {
  if (val === undefined || val === null) return '0.00'
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(val?: string): string {
  if (!val) return '-'
  try {
    const d = new Date(val)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}:${s}`
  } catch {
    return val
  }
}

// ==================== 初始化 ====================

onMounted(() => {
  fetchSuppliers()
  fetchList()
  fetchSummary()
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

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
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
