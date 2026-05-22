<template>
  <div class="page-container">
    <div class="page-header">
      <h2>发票管理</h2>
    </div>

    <!-- 顶部统计卡片 -->
    <el-row :gutter="16" class="summary-row">
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #409eff20; color: #409eff">
              <el-icon size="28"><Document /></el-icon>
            </div>
            <div class="summary-info">
              <p class="summary-label">发票总数</p>
              <p class="summary-value">{{ stats.totalCount }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #67c23a20; color: #67c23a">
              <el-icon size="28"><Money /></el-icon>
            </div>
            <div class="summary-info">
              <p class="summary-label">总金额</p>
              <p class="summary-value">¥{{ formatMoney(stats.totalAmount) }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #e6a23c20; color: #e6a23c">
              <el-icon size="28"><Calendar /></el-icon>
            </div>
            <div class="summary-info">
              <p class="summary-label">本月开票</p>
              <p class="summary-value">{{ stats.thisMonthCount }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #f56c6c20; color: #f56c6c">
              <el-icon size="28"><CircleClose /></el-icon>
            </div>
            <div class="summary-info">
              <p class="summary-label">已作废</p>
              <p class="summary-value danger">{{ stats.cancelledCount }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索筛选栏 -->
    <el-card>
      <div class="toolbar">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索发票号/关联单号/客户名称"
          clearable
          style="width: 260px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="filters.type"
          placeholder="发票类型"
          clearable
          style="width: 160px"
          @change="handleSearch"
        >
          <el-option label="增值税普票" value="vat" />
          <el-option label="增值税专票" value="special" />
          <el-option label="电子发票" value="electronic" />
        </el-select>
        <el-select
          v-model="filters.status"
          placeholder="状态"
          clearable
          style="width: 130px"
          @change="handleSearch"
        >
          <el-option label="已开票" value="issued" />
          <el-option label="已作废" value="cancelled" />
        </el-select>
        <el-date-picker
          v-model="filters.dateRange"
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
        <el-button type="success" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          新建发票
        </el-button>
        <el-button type="primary" @click="handleExport">
          <el-icon><Download /></el-icon>导出Excel
        </el-button>
      </div>

      <!-- 数据表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%; margin-top: 16px"
        @row-click="handleRowClick"
      >
        <el-table-column prop="invoiceNo" label="发票号" min-width="160" />
        <el-table-column label="客户" min-width="120">
          <template #default="{ row }">
            {{ row.customer?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" size="small">
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额(¥)" width="130" align="right">
          <template #default="{ row }">
            <span class="amount-cell">¥{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="relatedNo" label="关联单号" min-width="160" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'issued' ? 'success' : 'info'" size="small">
              {{ row.status === 'issued' ? '已开票' : '已作废' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="开票日期" width="120" align="center">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click.stop="showDetail(row)">
              详情
            </el-button>
            <el-button type="warning" link size="small" @click.stop="handleEdit(row)">
              编辑
            </el-button>
            <el-button
              v-if="row.status === 'issued'"
              type="danger"
              link
              size="small"
              @click.stop="handleCancel(row)"
            >
              作废
            </el-button>
            <span v-else class="text-muted">已作废</span>
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
      title="发票详情"
      size="480px"
      :close-on-click-modal="false"
    >
      <template v-if="detailRow">
        <el-descriptions :column="1" border size="default">
          <el-descriptions-item label="发票号">{{ detailRow.invoiceNo }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ detailRow.customer?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="发票类型">
            <el-tag :type="typeTagType(detailRow.type)" size="small">
              {{ typeLabel(detailRow.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="金额">¥{{ formatMoney(detailRow.amount) }}</el-descriptions-item>
          <el-descriptions-item label="关联单号">{{ detailRow.relatedNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detailRow.status === 'issued' ? 'success' : 'info'" size="small">
              {{ detailRow.status === 'issued' ? '已开票' : '已作废' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开票日期">{{ formatDate(detailRow.createdAt) }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button @click="drawerVisible = false">关闭</el-button>
      </template>
    </el-drawer>

    <!-- 新建/编辑发票弹窗 -->
    <el-dialog
      v-model="createDialogVisible"
      :title="isEdit ? '编辑发票' : '新建发票'"
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
        <el-form-item v-if="!isEdit" label="发票号" prop="invoiceNo">
          <el-input
            v-model="createForm.invoiceNo"
            placeholder="请输入发票号，如 INV20260521-001"
            maxlength="50"
          />
        </el-form-item>
        <el-form-item v-else label="发票号">
          <span>{{ editTarget?.invoiceNo }}</span>
        </el-form-item>
        <el-form-item label="客户" prop="customerId">
          <el-select
            v-model="createForm.customerId"
            placeholder="请选择客户"
            filterable
            remote
            :remote-method="searchCustomers"
            :loading="customerLoading"
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
        <el-form-item label="发票类型" prop="type">
          <el-select v-model="createForm.type" placeholder="请选择发票类型" style="width: 100%">
            <el-option label="增值税普票" value="vat" />
            <el-option label="增值税专票" value="special" />
            <el-option label="电子发票" value="electronic" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number
            v-model="createForm.amount"
            :min="0.01"
            :precision="2"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入发票金额"
          />
        </el-form-item>
        <el-form-item label="税率(%)" prop="taxRate">
          <el-input-number
            v-model="createForm.taxRate"
            :min="0"
            :max="100"
            :precision="2"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入税率，如 13"
          />
        </el-form-item>
        <el-form-item label="关联单号" prop="relatedNo">
          <el-input
            v-model="createForm.relatedNo"
            placeholder="请输入关联的工单号或销售订单号"
            maxlength="50"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="createForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注"
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Document, Money, Calendar, CircleClose, Search, Plus, Download, Edit } from '@element-plus/icons-vue'
import request from '@/api/request'
import { downloadFile } from '@/utils/download'

// ==================== 类型定义 ====================

interface CustomerOption {
  id: number
  name: string
  phone: string
}

interface InvoiceRecord {
  id: number
  invoiceNo: string
  type: string
  amount: number
  customerId: number
  relatedNo: string
  status: string
  createdAt: string
  customer?: { id: number; name: string } | null
  taxRate?: number
  remark?: string
}

interface ListResponse {
  list: InvoiceRecord[]
  total: number
}

interface StatsData {
  totalCount: number
  totalAmount: number
  thisMonthCount: number
  cancelledCount: number
}

// ==================== 统计卡片 ====================

const stats = reactive<StatsData>({
  totalCount: 0,
  totalAmount: 0,
  thisMonthCount: 0,
  cancelledCount: 0,
})

const fetchStats = async () => {
  try {
    const res = await request.get<any, StatsData>('/invoice/stats')
    Object.assign(stats, res)
  } catch {
    // 统计加载失败时保留旧值
  }
}

// ==================== 筛选条件 ====================

const filters = reactive({
  keyword: '',
  type: '',
  status: '',
  dateRange: null as [string, string] | null,
})

const handleSearch = () => {
  pagination.page = 1
  fetchList()
}

// ==================== 表格数据 ====================

const loading = ref(false)
const tableData = ref<InvoiceRecord[]>([])
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

const fetchList = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (filters.keyword.trim()) {
      params.keyword = filters.keyword.trim()
    }
    if (filters.type) {
      params.type = filters.type
    }
    if (filters.status) {
      params.status = filters.status
    }
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.startDate = filters.dateRange[0]
      params.endDate = filters.dateRange[1]
    }
    const res = await request.get<any, ListResponse>('/invoice', { params })
    tableData.value = res.list || []
    pagination.total = res.total || 0
  } catch {
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// ==================== 详情抽屉 ====================

const drawerVisible = ref(false)
const detailRow = ref<InvoiceRecord | null>(null)

const showDetail = (row: InvoiceRecord) => {
  detailRow.value = row
  drawerVisible.value = true
}

const handleRowClick = (row: InvoiceRecord) => {
  showDetail(row)
}

// ==================== 作废发票 ====================

const handleCancel = async (row: InvoiceRecord) => {
  try {
    await ElMessageBox.confirm(
      `确认作废发票 ${row.invoiceNo}？作废后不可恢复。`,
      '作废确认',
      {
        confirmButtonText: '确认作废',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return // 用户取消
  }

  try {
    await request.put(`/invoice/${row.id}/cancel`)
    ElMessage.success('发票已作废')
    fetchList()
    fetchStats()
  } catch {
    ElMessage.error('作废失败，请重试')
  }
}

// ==================== 新建/编辑发票 ====================

const createDialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number>(0)
const editTarget = ref<InvoiceRecord | null>(null)
const createLoading = ref(false)
const createFormRef = ref<FormInstance>()

const createForm = reactive({
  invoiceNo: '',
  customerId: null as number | null,
  type: '' as string,
  amount: 0.01,
  taxRate: 13 as number,
  relatedNo: '',
  remark: '',
})

const createFormRules: FormRules = {
  invoiceNo: [
    { required: true, message: '请输入发票号', trigger: 'blur' },
  ],
  customerId: [
    { required: true, message: '请选择客户', trigger: 'change' },
  ],
  type: [
    { required: true, message: '请选择发票类型', trigger: 'change' },
  ],
  amount: [
    { required: true, message: '请输入金额', trigger: 'blur' },
  ],
  relatedNo: [
    { required: true, message: '请输入关联单号', trigger: 'blur' },
  ],
}

const openCreateDialog = () => {
  isEdit.value = false
  editingId.value = 0
  editTarget.value = null
  createForm.invoiceNo = ''
  createForm.customerId = null
  createForm.type = ''
  createForm.amount = 0.01
  createForm.taxRate = 13
  createForm.relatedNo = ''
  createForm.remark = ''
  createDialogVisible.value = true
  // 预加载客户列表
  searchCustomers('')
}

const handleEdit = (row: InvoiceRecord) => {
  isEdit.value = true
  editingId.value = row.id
  editTarget.value = row
  createForm.invoiceNo = row.invoiceNo
  createForm.customerId = row.customerId
  createForm.type = row.type
  createForm.amount = row.amount
  createForm.taxRate = row.taxRate || 13
  createForm.relatedNo = row.relatedNo || ''
  createForm.remark = row.remark || ''
  // 预填充客户选项
  if (row.customer) {
    customerOptions.value = [{ id: row.customer.id, name: row.customer.name, phone: '' }]
  }
  createDialogVisible.value = true
}

const handleCreateSubmit = async () => {
  // 编辑时无需校验 invoiceNo
  const rulesToValidate = isEdit.value
    ? { customerId: createFormRules.customerId, type: createFormRules.type, amount: createFormRules.amount, relatedNo: createFormRules.relatedNo }
    : createFormRules
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return

  createLoading.value = true
  try {
    const payload: any = {
      customerId: createForm.customerId,
      type: createForm.type,
      amount: createForm.amount,
      taxRate: createForm.taxRate || undefined,
      relatedNo: createForm.relatedNo,
      remark: createForm.remark || undefined,
    }
    if (isEdit.value) {
      await request.put(`/invoice/${editingId.value}`, payload)
      ElMessage.success('发票已更新')
    } else {
      payload.invoiceNo = createForm.invoiceNo
      await request.post('/invoice', payload)
      ElMessage.success('发票创建成功')
    }
    createDialogVisible.value = false
    fetchList()
    fetchStats()
  } catch {
    ElMessage.error('操作失败，请重试')
  } finally {
    createLoading.value = false
  }
}

// ==================== 客户搜索 ====================

const customerOptions = ref<CustomerOption[]>([])
const customerLoading = ref(false)

const searchCustomers = async (query: string) => {
  customerLoading.value = true
  try {
    const params: any = { page: 1, pageSize: 50 }
    if (query) {
      params.keyword = query
    }
    const res = await request.get<any, { list: CustomerOption[] }>('/customers', { params })
    customerOptions.value = res.list || []
  } catch {
    customerOptions.value = []
  } finally {
    customerLoading.value = false
  }
}

// ==================== 工具函数 ====================

function handleExport() {
  downloadFile('/api/export/excel?module=finance', '发票管理.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

const typeLabel = (type: string): string => {
  const map: Record<string, string> = {
    vat: '增值税普票',
    special: '增值税专票',
    electronic: '电子发票',
  }
  return map[type] || type
}

const typeTagType = (type: string): string => {
  const map: Record<string, string> = {
    vat: 'primary',
    special: 'warning',
    electronic: 'success',
  }
  return map[type] || 'info'
}

const formatMoney = (val?: number): string => {
  if (val === undefined || val === null) return '0.00'
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ==================== 初始化 ====================

onMounted(() => {
  fetchStats()
  fetchList()
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

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.amount-cell {
  color: #f56c6c;
  font-weight: 600;
}

.text-muted {
  color: #c0c4cc;
  font-size: 13px;
}
</style>
