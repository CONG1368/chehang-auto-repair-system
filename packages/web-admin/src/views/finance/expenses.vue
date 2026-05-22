<template>
  <div class="page-container">
    <div class="page-header">
      <h2>费用管理</h2>
    </div>

    <!-- 顶部汇总卡片 -->
    <el-row :gutter="16" class="summary-row">
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #f56c6c20; color: #f56c6c">
              <el-icon size="28"><Money /></el-icon>
            </div>
            <div class="summary-info">
              <p class="summary-label">本月总支出</p>
              <p class="summary-value danger">¥{{ formatMoney(summary.totalAmount) }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #409eff20; color: #409eff">
              <el-icon size="28"><Document /></el-icon>
            </div>
            <div class="summary-info">
              <p class="summary-label">总笔数</p>
              <p class="summary-value">{{ summary.totalCount }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #67c23a20; color: #67c23a">
              <el-icon size="28"><TrendCharts /></el-icon>
            </div>
            <div class="summary-info" style="flex: 1">
              <p class="summary-label">分类支出</p>
              <div class="category-breakdown" v-if="Object.keys(summary.byCategory).length > 0">
                <el-tag
                  v-for="(val, key) in summary.byCategory"
                  :key="key"
                  size="small"
                  class="category-tag"
                >{{ categoryMap[key] || key }}: ¥{{ formatMoney(val) }}</el-tag>
              </div>
              <span v-else class="summary-empty">暂无数据</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 工具条 -->
    <el-card>
      <div class="tab-toolbar">
        <el-date-picker
          v-model="searchDateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 260px"
          :clearable="true"
        />
        <el-select
          v-model="searchCategory"
          placeholder="分类筛选"
          clearable
          style="width: 140px"
        >
          <el-option label="全部" value="" />
          <el-option
            v-for="(label, value) in categoryMap"
            :key="value"
            :label="label"
            :value="value"
          />
        </el-select>
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>查询
        </el-button>
        <el-button @click="handleReset">
          <el-icon><Refresh /></el-icon>重置
        </el-button>
        <el-button type="success" @click="handleExport">
          <el-icon><Download /></el-icon>导出Excel
        </el-button>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>新增费用
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="expenseList"
        border
        stripe
        style="width: 100%; margin-top: 16px"
        @row-click="handleDetail"
      >
        <el-table-column prop="date" label="日期" min-width="120" />
        <el-table-column label="分类" min-width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="getCategoryTagType(row.category)">
              {{ categoryMap[row.category] || row.category || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额(¥)" min-width="120" align="right">
          <template #default="{ row }">
            <span class="amount-expense">¥{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click.stop="handleDetail(row)">
              详情
            </el-button>
            <el-button type="warning" link size="small" @click.stop="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click.stop="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchExpenses"
          @current-change="fetchExpenses"
        />
      </div>
    </el-card>

    <!-- 新增/编辑费用弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="费用分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择费用分类" style="width: 100%">
            <el-option
              v-for="(label, value) in categoryMap"
              :key="value"
              :label="label"
              :value="value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="金额(¥)" prop="amount">
          <el-input-number
            v-model="form.amount"
            :min="0.01"
            :precision="2"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入金额"
          />
        </el-form-item>
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="form.date"
            type="date"
            placeholder="请选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入费用描述（选填）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="费用详情"
      size="480px"
      :close-on-click-modal="false"
    >
      <template v-if="detailRow">
        <el-descriptions :column="1" border size="default">
          <el-descriptions-item label="费用分类">
            <el-tag size="small" :type="getCategoryTagType(detailRow.category)">
              {{ categoryMap[detailRow.category] || detailRow.category || '-' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="金额">¥{{ formatMoney(detailRow.amount) }}</el-descriptions-item>
          <el-descriptions-item label="日期">{{ detailRow.date || '-' }}</el-descriptions-item>
          <el-descriptions-item label="描述">{{ detailRow.description || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="detailRow.createdAt" label="创建时间">{{ detailRow.createdAt }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button @click="drawerVisible = false">关闭</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Money, Document, TrendCharts, Search, Refresh, Download, Plus, Edit, Delete } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import { downloadFile } from '@/utils/download'

// ==================== 类型定义 ====================

interface ExpenseRecord {
  id: number
  category: string
  amount: number
  description?: string
  date: string
  createdAt?: string
}

interface ExpenseSummary {
  totalAmount: number
  totalCount: number
  byCategory: Record<string, number>
}

interface ListResponse {
  list: ExpenseRecord[]
  total: number
}

// ==================== 分类映射 ====================

const categoryMap: Record<string, string> = {
  purchase: '采购',
  salary: '工资',
  rent: '租金',
  utilities: '水电',
  office: '办公',
  travel: '差旅',
  other: '其他',
}

function getCategoryTagType(category: string): string {
  const typeMap: Record<string, string> = {
    purchase: 'danger',
    salary: 'warning',
    rent: 'warning',
    utilities: '',
    office: 'info',
    travel: 'success',
    other: 'info',
  }
  return typeMap[category] || ''
}

// ==================== 汇总卡片 ====================

const summary = reactive<ExpenseSummary>({
  totalAmount: 0,
  totalCount: 0,
  byCategory: {},
})

// ==================== 搜索条件 ====================

const searchDateRange = ref<[string, string] | null>(null)
const searchCategory = ref('')

// ==================== 列表数据 ====================

const loading = ref(false)
const expenseList = ref<ExpenseRecord[]>([])
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

const fetchExpenses = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (searchCategory.value) {
      params.category = searchCategory.value
    }
    if (searchDateRange.value && searchDateRange.value.length === 2) {
      params.startDate = searchDateRange.value[0]
      params.endDate = searchDateRange.value[1]
    }
    const res = await request.get<any, ListResponse>('/finance/expenses', { params })
    expenseList.value = res.list || []
    pagination.total = res.total || 0
  } catch {
    expenseList.value = []
    pagination.total = 0
    ElMessage.error('费用数据加载失败')
  } finally {
    loading.value = false
  }
}

// ==================== 汇总数据 ====================

const fetchSummary = async () => {
  try {
    const params: any = {}
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    params.startDate = formatDateStr(firstDay)
    params.endDate = formatDateStr(lastDay)
    const res = await request.get<any, ExpenseSummary>('/finance/expenses/summary', { params })
    if (res) {
      summary.totalAmount = res.totalAmount || 0
      summary.totalCount = res.totalCount || 0
      summary.byCategory = res.byCategory || {}
    }
  } catch {
    // 汇总接口失败时从列表数据计算兜底
    let totalAmount = 0
    for (const item of expenseList.value) {
      totalAmount += item.amount
    }
    summary.totalAmount = totalAmount
    summary.totalCount = expenseList.value.length
    summary.byCategory = {}
  }
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ==================== 搜索与重置 ====================

const handleSearch = () => {
  pagination.page = 1
  fetchExpenses()
}

const handleReset = () => {
  searchDateRange.value = null
  searchCategory.value = ''
  pagination.page = 1
  fetchExpenses()
}

// ==================== 新增/编辑费用 ====================

const dialogVisible = ref(false)
const dialogTitle = ref('新增费用')
const isEdit = ref(false)
const editingId = ref<number>(0)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  category: '',
  amount: undefined as number | undefined,
  date: '',
  description: '',
})

const formRules: FormRules = {
  category: [
    { required: true, message: '请选择费用分类', trigger: 'change' },
  ],
  amount: [
    { required: true, message: '请输入金额', trigger: 'blur' },
  ],
  date: [
    { required: true, message: '请选择日期', trigger: 'change' },
  ],
}

const handleAdd = () => {
  dialogTitle.value = '新增费用'
  isEdit.value = false
  editingId.value = 0
  form.category = ''
  form.amount = undefined
  form.date = ''
  form.description = ''
  dialogVisible.value = true
}

const handleEdit = (row: ExpenseRecord) => {
  dialogTitle.value = '编辑费用'
  isEdit.value = true
  editingId.value = row.id
  form.category = row.category
  form.amount = row.amount
  form.date = row.date
  form.description = row.description || ''
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    const payload = {
      category: form.category,
      amount: form.amount,
      date: form.date,
      description: form.description || undefined,
    }
    if (isEdit.value) {
      await request.put(`/finance/expenses/${editingId.value}`, payload)
      ElMessage.success('费用记录已更新')
    } else {
      await request.post('/finance/expenses', payload)
      ElMessage.success('费用记录已保存')
    }
    dialogVisible.value = false
    fetchExpenses()
    fetchSummary()
  } catch {
    ElMessage.error('保存失败，请重试')
  } finally {
    submitLoading.value = false
  }
}

// ==================== 删除 ====================

const handleDelete = (row: ExpenseRecord) => {
  ElMessageBox.confirm(
    `确定删除该费用记录吗？金额：¥${formatMoney(row.amount)}，删除后不可恢复。`,
    '删除确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' },
  )
    .then(async () => {
      try {
        await request.delete(`/finance/expenses/${row.id}`)
        ElMessage.success('删除成功')
        fetchExpenses()
        fetchSummary()
      } catch {
        // 错误已在拦截器中处理
      }
    })
    .catch(() => {})
}

// ==================== 详情抽屉 ====================

const drawerVisible = ref(false)
const detailRow = ref<ExpenseRecord | null>(null)

function handleDetail(row: ExpenseRecord) {
  detailRow.value = row
  drawerVisible.value = true
}

// ==================== 导出 ====================

function handleExport() {
  downloadFile('/api/export/excel?module=finance', '费用记录.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

// ==================== 工具函数 ====================

const formatMoney = (val?: number): string => {
  if (val === undefined || val === null) return '0.00'
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ==================== 初始化 ====================

onMounted(() => {
  fetchExpenses()
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

.summary-value.danger {
  color: #f56c6c;
}

.summary-empty {
  font-size: 13px;
  color: #c0c4cc;
}

.category-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-tag {
  font-size: 12px;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.amount-expense {
  color: #f56c6c;
  font-weight: 600;
}
</style>
