<template>
  <div class="page-container">
    <div class="page-header">
      <h2>施工管理</h2>
    </div>
    <el-card>
      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="searchForm.customerName"
          placeholder="客户姓名"
          clearable
          style="width: 160px"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="searchForm.status"
          placeholder="状态"
          clearable
          style="width: 140px; margin-left: 12px"
          @change="handleSearch"
        >
          <el-option label="待施工" value="pending" />
          <el-option label="施工中" value="in_progress" />
          <el-option label="已完成" value="completed" />
        </el-select>
        <el-date-picker
          v-model="searchForm.date"
          type="date"
          placeholder="预约日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          clearable
          style="width: 160px; margin-left: 12px"
          @change="handleSearch"
        />
        <el-button type="primary" style="margin-left: 12px" @click="handleSearch">
          搜索
        </el-button>
        <el-button style="margin-left: 12px" @click="handleReset">重置</el-button>
        <el-button style="margin-left: 12px" @click="handleExport">
          <el-icon style="margin-right: 4px"><Download /></el-icon>导出Excel
        </el-button>
        <el-button type="success" style="margin-left: auto" @click="handleAdd">
          新增预约
        </el-button>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%; margin-top: 16px"
        @row-click="handleView"
      >
        <el-table-column label="客户姓名" min-width="100">
          <template #default="{ row }">
            {{ row.customer?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="电话" min-width="120">
          <template #default="{ row }">
            {{ row.customer?.phone || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="服务类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.serviceType === 'package' ? 'warning' : 'primary'" size="small">
              {{ row.serviceType === 'package' ? '套餐' : '单施' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="服务项目" min-width="160">
          <template #default="{ row }">
            <template v-if="row.items && row.items.length">
              <el-tag
                v-for="(item, idx) in row.items"
                :key="idx"
                size="small"
                style="margin: 2px 4px 2px 0"
              >
                {{ item.name || item }}
              </el-tag>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="100" align="center">
          <template #default="{ row }">
            <span style="color: #e6a23c; font-weight: 500">¥{{ row.totalAmount || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="施工技师" width="100" align="center">
          <template #default="{ row }">
            {{ row.assignedTo || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="预约时间" width="170">
          <template #default="{ row }">
            {{ row.startTime || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="270" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="info"
              size="small"
              @click.stop="handleView(row)"
            >
              查看
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              link
              type="primary"
              size="small"
              @click.stop="handleStartWork(row)"
            >
              开始施工
            </el-button>
            <el-button
              v-if="row.status === 'in_progress'"
              link
              type="success"
              size="small"
              @click.stop="handleComplete(row)"
            >
              完成
            </el-button>
            <el-button link type="primary" size="small" @click.stop="handleEdit(row)">
              编辑
            </el-button>
            <el-button link type="danger" size="small" @click.stop="handleDelete(row)">
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>

    <!-- 查看详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="施工详情"
      size="480px"
      :close-on-click-modal="false"
    >
      <template v-if="viewRow">
        <el-descriptions :column="1" border size="default">
          <el-descriptions-item label="客户姓名">{{ viewRow.customer?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ viewRow.customer?.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="服务类型">
            <el-tag :type="viewRow.serviceType === 'package' ? 'warning' : 'primary'" size="small">
              {{ viewRow.serviceType === 'package' ? '套餐' : '单项服务' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="服务项目">
            <template v-if="viewRow.items && viewRow.items.length">
              <el-tag
                v-for="(item, idx) in viewRow.items"
                :key="idx"
                size="small"
                style="margin: 2px 4px 2px 0"
              >
                {{ item.name || item }}
              </el-tag>
            </template>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="施工金额">¥{{ viewRow.totalAmount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="施工技师">{{ viewRow.assignedTo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="预约时间">{{ viewRow.startTime || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="statusTagType(viewRow.status)" size="small">
              {{ statusLabel(viewRow.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button @click="drawerVisible = false">关闭</el-button>
      </template>
    </el-drawer>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑预约' : '新增预约'"
      width="600px"
      :close-on-click-modal="false"
      @closed="handleDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="90px"
      >
        <el-form-item label="选择客户" prop="customerId">
          <el-select
            v-model="form.customerId"
            placeholder="请选择客户"
            filterable
            remote
            :remote-method="searchCustomers"
            :loading="customerSearching"
            style="width: 100%"
          >
            <el-option
              v-for="c in customerList"
              :key="c.id"
              :label="`${c.name} ${c.phone}`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="服务类型" prop="serviceType">
          <el-radio-group v-model="form.serviceType" @change="handleServiceTypeChange">
            <el-radio label="single">单项服务</el-radio>
            <el-radio label="package">套餐</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          :label="form.serviceType === 'package' ? '选择套餐' : '选择服务'"
          prop="selectedId"
        >
          <el-select
            v-model="form.selectedId"
            :placeholder="form.serviceType === 'package' ? '请选择套餐' : '请选择服务'"
            filterable
            style="width: 100%"
          >
            <template v-if="form.serviceType === 'package'">
              <el-option
                v-for="pkg in packageList"
                :key="pkg.id"
                :label="`${pkg.name} ¥${pkg.packagePrice}`"
                :value="pkg.id"
              />
            </template>
            <template v-else>
              <el-option
                v-for="svc in singleServiceList"
                :key="svc.id"
                :label="`${svc.name} ¥${svc.price}`"
                :value="svc.id"
              />
            </template>
          </el-select>
        </el-form-item>
        <el-form-item label="预约时间" prop="appointmentTime">
          <el-date-picker
            v-model="form.appointmentTime"
            type="datetime"
            placeholder="请选择预约时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="施工技师" prop="technicianId">
          <el-select
            v-model="form.technicianId"
            placeholder="请选择技师"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="u in technicianList"
              :key="u.id"
              :label="u.realName || u.username"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import request from '@/api/request'
import { downloadFile } from '@/utils/download'

// ==================== 类型定义 ====================
interface Appointment {
  id: number
  customerId: number
  customer?: {
    name: string
    phone: string
  }
  serviceType: string
  items: Array<{ serviceId?: number; packageId?: number; name?: string }>
  totalAmount: number
  status: string
  assignedTo: number | null
  startTime: string
}

interface Customer {
  id: number
  name: string
  phone: string
}

interface ServiceItem {
  id: number
  name: string
  price: number
}

interface PackageItem {
  id: number
  name: string
  originalPrice: number
  packagePrice: number
}

interface Technician {
  id: number
  username: string
  realName: string
}

interface AppointmentForm {
  customerId: number | null
  serviceType: string
  selectedId: number | null
  appointmentTime: string
  technicianId: number | null
}

// ==================== 状态辅助方法 ====================
function statusLabel(status: string) {
  const map: Record<string, string> = {
    'pending': '待施工',
    'in_progress': '施工中',
    'completed': '已完成',
  }
  return map[status] || status
}

function statusTagType(status: string) {
  const map: Record<string, string> = {
    'pending': 'info',
    'in_progress': 'warning',
    'completed': 'success',
  }
  return map[status] || 'info'
}

// ==================== 查询条件 ====================
const searchForm = reactive({
  customerName: '',
  status: '',
  date: '',
})

// ==================== 分页 ====================
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 表格数据 ====================
const tableData = ref<Appointment[]>([])
const loading = ref(false)

// ==================== 弹窗相关 ====================
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref<number | null>(null)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

// ==================== 详情抽屉 ====================
const drawerVisible = ref(false)
const viewRow = ref<Appointment | null>(null)

function handleView(row: Appointment) {
  viewRow.value = row
  drawerVisible.value = true
}

const initForm = (): AppointmentForm => ({
  customerId: null,
  serviceType: 'single',
  selectedId: null,
  appointmentTime: '',
  technicianId: null,
})

const form = reactive<AppointmentForm>(initForm())

// ==================== 远程搜索客户 ====================
const customerList = ref<Customer[]>([])
const customerSearching = ref(false)

async function searchCustomers(query: string) {
  if (!query) {
    customerList.value = []
    return
  }
  customerSearching.value = true
  try {
    const res: any = await request.get('/customers', {
      params: { keyword: query, page: 1, pageSize: 20 },
    })
    customerList.value = res.list ?? []
  } catch {
    // 错误已在拦截器中处理
  } finally {
    customerSearching.value = false
  }
}

// ==================== 服务/套餐/技师下拉列表 ====================
const singleServiceList = ref<ServiceItem[]>([])
const packageList = ref<PackageItem[]>([])
const technicianList = ref<Technician[]>([])

async function fetchServices() {
  try {
    const res: any = await request.get('/beauty/services', {
      params: { page: 1, pageSize: 999, status: 1 },
    })
    singleServiceList.value = res.list ?? []
  } catch {
    // 错误已在拦截器中处理
  }
}

async function fetchPackages() {
  try {
    const res: any = await request.get('/beauty/packages', {
      params: { page: 1, pageSize: 999 },
    })
    packageList.value = res.list ?? []
  } catch {
    // 错误已在拦截器中处理
  }
}

async function fetchTechnicians() {
  try {
    const res: any = await request.get('/users', {
      params: { page: 1, pageSize: 999 },
    })
    technicianList.value = res.list ?? []
  } catch {
    // 错误已在拦截器中处理
  }
}

/** 切换服务类型时清空已选项 */
function handleServiceTypeChange() {
  form.selectedId = null
}

// ==================== 表单校验 ====================
const formRules: FormRules = {
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  serviceType: [{ required: true, message: '请选择服务类型', trigger: 'change' }],
  selectedId: [{ required: true, message: '请选择服务或套餐', trigger: 'change' }],
  appointmentTime: [{ required: true, message: '请选择预约时间', trigger: 'change' }],
  technicianId: [{ required: true, message: '请选择施工技师', trigger: 'change' }],
}

// ==================== 方法 ====================

/** 获取预约列表 */
async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/beauty/appointments', {
      params: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...searchForm,
      },
    })
    tableData.value = res.list ?? []
    pagination.total = res.total ?? 0
  } catch {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false
  }
}

/** 搜索 */
function handleSearch() {
  pagination.page = 1
  fetchData()
}

/** 重置 */
function handleReset() {
  searchForm.customerName = ''
  searchForm.status = ''
  searchForm.date = ''
  handleSearch()
}

/** 导出 Excel */
function handleExport() {
  downloadFile('/api/export/excel?module=beauty', '美容预约.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

/** 新增 */
function handleAdd() {
  isEdit.value = false
  currentId.value = null
  Object.assign(form, initForm())
  dialogVisible.value = true
}

/** 编辑 */
function handleEdit(row: Appointment) {
  isEdit.value = true
  currentId.value = row.id
  form.customerId = row.customerId
  form.serviceType = row.serviceType

  // 从 items 中提取 serviceId 或 packageId
  const firstItem = row.items && row.items.length > 0 ? row.items[0] : null
  form.selectedId = firstItem
    ? (firstItem.serviceId ?? firstItem.packageId ?? (firstItem as any).id ?? null)
    : null

  form.appointmentTime = row.startTime
  form.technicianId = row.assignedTo

  // 预填客户列表
  if (row.customer) {
    customerList.value = [
      { id: row.customerId, name: row.customer.name, phone: row.customer.phone },
    ]
  }

  dialogVisible.value = true
}

/** 弹窗关闭后清理验证 */
function handleDialogClosed() {
  formRef.value?.resetFields()
}

/** 提交表单 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    // 后端 controller 会将 technicianId→assignedTo, appointmentTime→startTime, selectedId→items
    const payload = {
      customerId: form.customerId,
      serviceType: form.serviceType,
      appointmentTime: form.appointmentTime,
      technicianId: form.technicianId,
      selectedId: form.selectedId,
    }

    if (isEdit.value) {
      await request.put(`/beauty/appointments/${currentId.value}`, payload)
      ElMessage.success('编辑成功')
    } else {
      await request.post('/beauty/appointments', payload)
      ElMessage.success('新增成功')
    }

    dialogVisible.value = false
    fetchData()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    submitLoading.value = false
  }
}

/** 删除/取消 */
function handleDelete(row: Appointment) {
  const customerName = row.customer?.name || '未知'
  ElMessageBox.confirm(
    `确定要取消客户「${customerName}」的预约吗？`,
    '取消确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '返回',
      type: 'warning',
    },
  )
    .then(async () => {
      try {
        await request.delete(`/beauty/appointments/${row.id}`)
        ElMessage.success('已取消')
        fetchData()
      } catch {
        // 错误已在拦截器中处理
      }
    })
    .catch(() => {
      // 用户取消
    })
}

/** 状态变更：开始施工 */
async function handleStartWork(row: Appointment) {
  const customerName = row.customer?.name || '未知'
  ElMessageBox.confirm(
    `确定将「${customerName}」的预约状态改为「施工中」吗？`,
    '开始施工',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    },
  )
    .then(async () => {
      try {
        await request.put(`/beauty/appointments/${row.id}/status`, { status: 'in_progress' })
        row.status = 'in_progress'
        ElMessage.success('已开始施工')
      } catch {
        // 错误已在拦截器中处理
      }
    })
    .catch(() => {
      // 用户取消
    })
}

/** 状态变更：完成 */
async function handleComplete(row: Appointment) {
  const customerName = row.customer?.name || '未知'
  ElMessageBox.confirm(
    `确定将「${customerName}」的施工标记为「已完成」吗？`,
    '完成确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'success',
    },
  )
    .then(async () => {
      try {
        await request.put(`/beauty/appointments/${row.id}/status`, { status: 'completed' })
        row.status = 'completed'
        ElMessage.success('已完成')
      } catch {
        // 错误已在拦截器中处理
      }
    })
    .catch(() => {
      // 用户取消
    })
}

// ==================== 生命周期 ====================
onMounted(() => {
  fetchData()
  fetchServices()
  fetchPackages()
  fetchTechnicians()
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
}
.search-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
