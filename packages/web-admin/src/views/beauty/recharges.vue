<template>
  <div class="page-container">
    <div class="page-header">
      <h2>会员卡充值记录</h2>
      <p class="page-desc">管理会员卡充值记录，支持按客户筛选和新建充值</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="总充值金额(元)" :value="stats.totalAmount" :precision="2" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <el-statistic title="充值笔数" :value="stats.totalCount" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选栏 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="客户">
          <el-select
            v-model="filterForm.customerId"
            placeholder="全部客户"
            clearable
            filterable
            remote
            :remote-method="searchCustomers"
            :loading="customerLoading"
            @change="handleFilter"
          >
            <el-option
              v-for="c in customerOptions"
              :key="c.id"
              :label="`${c.name} - ${c.phone}`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 充值记录表格 -->
    <el-card>
      <div class="table-header">
        <el-button @click="handleExport">
          <el-icon style="margin-right: 4px"><Download /></el-icon>导出Excel
        </el-button>
        <el-button type="primary" @click="openCreateDialog">新建充值</el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column label="客户名称" min-width="120">
          <template #default="{ row }">
            {{ row.customer?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="客户电话" min-width="130">
          <template #default="{ row }">
            {{ row.customer?.phone || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="充值金额" width="130" align="center">
          <template #default="{ row }">
            <span style="color: #67c23a; font-weight: 600">
              ¥{{ Number(row.amount).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="支付方式" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="paymentTagType(row.paymentMethod)">
              {{ row.paymentMethod }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="充值时间" min-width="170" align="center">
          <template #default="{ row }">
            {{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-' }}
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 新建充值弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="新建充值"
      width="460px"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="90px"
      >
        <el-form-item label="客户" prop="customerId">
          <el-select
            v-model="form.customerId"
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
              :label="`${c.name} - ${c.phone}`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="充值金额" prop="amount">
          <el-input-number
            v-model="form.amount"
            :min="0.01"
            :precision="2"
            :step="100"
            style="width: 100%"
            placeholder="请输入充值金额"
          />
        </el-form-item>
        <el-form-item label="支付方式" prop="paymentMethod">
          <el-select
            v-model="form.paymentMethod"
            placeholder="请选择支付方式"
            style="width: 100%"
          >
            <el-option label="现金" value="现金" />
            <el-option label="微信" value="微信" />
            <el-option label="支付宝" value="支付宝" />
            <el-option label="银行卡" value="银行卡" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定充值</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import request from '@/api/request'
import { downloadFile } from '@/utils/download'

// ==================== 统计 ====================
const stats = reactive({
  totalAmount: 0,
  totalCount: 0,
})

// ==================== 筛选 ====================
const filterForm = reactive({
  customerId: null as number | null,
})

const customerOptions = ref<{ id: number; name: string; phone: string }[]>([])
const customerLoading = ref(false)

async function searchCustomers(query: string) {
  customerLoading.value = true
  try {
    const res: any = await request.get('/customers', {
      params: { keyword: query, page: 1, pageSize: 50 },
    })
    customerOptions.value = res.list ?? []
  } catch {
    // 错误已在拦截器中处理
  } finally {
    customerLoading.value = false
  }
}

function handleFilter() {
  pagination.page = 1
  fetchData()
}

function resetFilter() {
  filterForm.customerId = null
  pagination.page = 1
  fetchData()
}

// ==================== 表格数据 ====================
const tableData = ref<any[]>([])
const loading = ref(false)

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

async function fetchData() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (filterForm.customerId) {
      params.customerId = filterForm.customerId
    }
    const res: any = await request.get('/beauty/recharges', { params })
    tableData.value = res.list ?? []
    pagination.total = res.total ?? 0

    // 计算统计
    const allData: any = await request.get('/beauty/recharges', {
      params: { page: 1, pageSize: 9999 },
    })
    const allList = allData.list ?? []
    stats.totalAmount = allList.reduce((sum: number, item: any) => sum + Number(item.amount), 0)
    stats.totalCount = allList.length
  } catch {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false
  }
}

// ==================== 新建充值弹窗 ====================
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref()

const form = reactive({
  customerId: null as number | null,
  amount: 0,
  paymentMethod: '微信',
})

const formRules = {
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  amount: [{ required: true, message: '请输入充值金额', trigger: 'blur' }],
  paymentMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
}

async function openCreateDialog() {
  dialogVisible.value = true
  // 预加载客户列表
  searchCustomers('')
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await request.post('/beauty/recharges', {
      customerId: form.customerId,
      amount: form.amount,
      paymentMethod: form.paymentMethod,
    })
    ElMessage.success('充值成功')
    dialogVisible.value = false
    fetchData()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.customerId = null
  form.amount = 0
  form.paymentMethod = '微信'
  formRef.value?.resetFields()
}

// ==================== 导出 ====================
function handleExport() {
  downloadFile('/api/export/excel?module=finance', '充值记录.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

// ==================== 辅助方法 ====================
function paymentTagType(method: string) {
  const map: Record<string, string> = {
    '现金': '',
    '微信': 'success',
    '支付宝': 'primary',
    '银行卡': 'warning',
  }
  return map[method] || ''
}

// ==================== 生命周期 ====================
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.page-container {
  padding: 0;
}
.page-header {
  margin-bottom: 20px;
}
.page-header h2 {
  font-size: 18px;
  color: #303133;
  margin-bottom: 4px;
}
.page-desc {
  font-size: 13px;
  color: #909399;
  margin: 0;
}
.stats-row {
  margin-bottom: 16px;
}
.filter-card {
  margin-bottom: 16px;
}
.table-header {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 16px;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
