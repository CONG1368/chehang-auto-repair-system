<template>
  <div class="page-container">
    <div class="page-header">
      <h2>客户档案</h2>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card">
      <div class="search-bar">
        <el-input
          v-model="keyword"
          placeholder="请输入客户姓名或电话"
          clearable
          class="search-input"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button type="success" @click="handleExportExcel">📥 导出Excel</el-button>
        <el-button @click="handleExportPdf">📄 导出PDF</el-button>
        <el-button type="success" @click="handleAdd">新增客户</el-button>
      </div>
    </el-card>

    <!-- 客户列表 -->
    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%; cursor: pointer"
        @row-click="handleDetail"
      >
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column label="性别" width="70">
          <template #default="{ row }">
            <el-tag v-if="row.gender === 1" type="primary" size="small">男</el-tag>
            <el-tag v-else-if="row.gender === 2" type="danger" size="small">女</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="车辆数" width="80" align="center">
          <template #default="{ row }">
            {{ row.vehicles?.length || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="会员等级" width="120">
          <template #default="{ row }">
            <el-tag
              :type="getLevelTagType(row.level)"
              :effect="row.level === 3 ? 'dark' : 'light'"
              size="small"
            >
              {{ getLevelName(row.level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="累计消费" width="120" align="right">
          <template #default="{ row }">
            <span class="amount">¥{{ formatMoney(row.totalSpent) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="lastVisitAt" label="最近到店" width="160" />
        <el-table-column label="操作" min-width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleDetail(row)">详情</el-button>
            <el-button type="warning" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑客户' : '新增客户'"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="formData.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="formData.gender">
            <el-radio :value="1">男</el-radio>
            <el-radio :value="2">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="生日">
          <el-date-picker
            v-model="formData.birthday"
            type="date"
            placeholder="请选择生日"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="formData.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="formData.source" placeholder="请选择来源" style="width: 100%">
            <el-option label="到店" value="到店" />
            <el-option label="电话" value="电话" />
            <el-option label="网络" value="网络" />
            <el-option label="转介绍" value="转介绍" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="formData.tags" placeholder="请输入标签，多个用逗号分隔" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
        <el-form-item label="证件照片">
          <el-upload
            multiple
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :file-list="fileList"
            accept="image/*,.pdf"
          >
            <el-icon :size="32"><UploadFilled /></el-icon>
            <div>拖拽或点击批量上传</div>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="客户详情"
      size="700px"
      destroy-on-close
    >
      <div v-if="detailCustomer" class="drawer-content">
        <el-tabs v-model="activeTab">
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息" name="info">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="姓名">{{ detailCustomer.name }}</el-descriptions-item>
              <el-descriptions-item label="电话">{{ detailCustomer.phone }}</el-descriptions-item>
              <el-descriptions-item label="性别">
                <el-tag v-if="detailCustomer.gender === 1" type="primary" size="small">男</el-tag>
                <el-tag v-else-if="detailCustomer.gender === 2" type="danger" size="small">女</el-tag>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="生日">{{ detailCustomer.birthday || '-' }}</el-descriptions-item>
              <el-descriptions-item label="地址">{{ detailCustomer.address || '-' }}</el-descriptions-item>
              <el-descriptions-item label="来源">{{ detailCustomer.source || '-' }}</el-descriptions-item>
              <el-descriptions-item label="会员等级">
                <el-tag
                  :type="getLevelTagType(detailCustomer.level)"
                  :effect="detailCustomer.level === 3 ? 'dark' : 'light'"
                  size="small"
                >
                  {{ getLevelName(detailCustomer.level) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="累计消费">¥{{ formatMoney(detailCustomer.totalSpent) }}</el-descriptions-item>
              <el-descriptions-item label="标签">{{ detailCustomer.tags || '-' }}</el-descriptions-item>
              <el-descriptions-item label="备注">{{ detailCustomer.remark || '-' }}</el-descriptions-item>
              <el-descriptions-item label="最近到店">{{ detailCustomer.lastVisitAt || '-' }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ detailCustomer.createdAt || '-' }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- 车辆列表 -->
          <el-tab-pane label="车辆列表" name="vehicles">
            <div class="tab-header">
              <el-button type="primary" size="small" @click="handleAddVehicle">新增车辆</el-button>
            </div>
            <el-table :data="vehicles" border stripe v-loading="vehiclesLoading" style="width: 100%">
              <el-table-column prop="plateNumber" label="车牌号" width="120" />
              <el-table-column prop="brand" label="品牌" width="120" />
              <el-table-column prop="series" label="车系" width="120" />
              <el-table-column prop="model" label="车型" min-width="150" />
              <el-table-column prop="mileage" label="里程(公里)" width="120" align="right">
                <template #default="{ row: v }">
                  {{ v.mileage ? v.mileage.toLocaleString() : '-' }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="140" fixed="right">
                <template #default="{ row: v }">
                  <el-button type="primary" link size="small" @click="handleEditVehicle(v)">编辑</el-button>
                  <el-button type="danger" link size="small" @click="handleDeleteVehicle(v)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!vehiclesLoading && vehicles.length === 0" description="暂无车辆信息" />

            <!-- 新增车辆弹窗 -->
            <el-dialog
              v-model="vehicleDialogVisible"
              :title="isVehicleEdit ? '编辑车辆' : '新增车辆'"
              width="500px"
              append-to-body
              destroy-on-close
            >
              <el-form
                ref="vehicleFormRef"
                :model="vehicleForm"
                :rules="vehicleFormRules"
                label-width="80px"
              >
                <el-form-item label="车牌号" prop="plateNumber">
                  <el-input v-model="vehicleForm.plateNumber" placeholder="请输入车牌号" />
                </el-form-item>
                <el-form-item label="品牌">
                  <el-input v-model="vehicleForm.brand" placeholder="请输入品牌" />
                </el-form-item>
                <el-form-item label="车系">
                  <el-input v-model="vehicleForm.series" placeholder="请输入车系" />
                </el-form-item>
                <el-form-item label="车型">
                  <el-input v-model="vehicleForm.model" placeholder="请输入车型" />
                </el-form-item>
                <el-form-item label="车架号">
                  <el-input v-model="vehicleForm.vin" placeholder="请输入车架号" />
                </el-form-item>
                <el-form-item label="里程">
                  <el-input-number
                    v-model="vehicleForm.mileage"
                    :min="0"
                    :step="1000"
                    placeholder="请输入里程"
                    controls-position="right"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-form>
              <template #footer>
                <el-button @click="vehicleDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="vehicleSubmitLoading" @click="handleVehicleSubmit">
                  确定
                </el-button>
              </template>
            </el-dialog>
          </el-tab-pane>

          <!-- 跟进记录 -->
          <el-tab-pane label="跟进记录" name="follows">
            <el-timeline v-if="follows.length > 0" v-loading="followsLoading">
              <el-timeline-item
                v-for="item in follows"
                :key="item.id"
                :timestamp="item.createdAt"
                placement="top"
              >
                <el-card shadow="hover">
                  <p class="follow-type">
                    <el-tag size="small" :type="getFollowTypeTag(item.type)">
                      {{ item.type }}
                    </el-tag>
                    <span class="follow-user">跟进人：{{ item.user?.realName || '-' }}</span>
                  </p>
                  <p class="follow-content">{{ item.content }}</p>
                </el-card>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-if="!followsLoading && follows.length === 0" description="暂无跟进记录" />
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import { uploadFiles } from '@/utils/upload'
import { downloadFile } from '@/utils/download'
import { exportTableToPdf } from '@/utils/export-pdf'
import { UploadFilled } from '@element-plus/icons-vue'

// ==================== 类型定义 ====================

interface Customer {
  id?: number
  name: string
  phone: string
  gender?: number
  birthday?: string
  address?: string
  source?: string
  tags?: string
  remark?: string
  level?: number
  totalSpent?: number
  vehicles?: any[]
  lastVisitAt?: string
  createdAt?: string
}

interface Vehicle {
  id?: number
  plateNumber: string
  brand?: string
  series?: string
  model?: string
  vin?: string
  mileage?: number
}

interface FollowRecord {
  id?: number
  type: string
  content: string
  user?: { realName: string }
  createdAt?: string
}

interface ApiResponse {
  list: any[]
  total: number
}

// ==================== 列表搜索 ====================

const keyword = ref('')
const loading = ref(false)
const tableData = ref<Customer[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const fetchList = async () => {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (keyword.value.trim()) {
      params.keyword = keyword.value.trim()
    }
    const res = await request.get<any, ApiResponse>('/customers', { params })
    tableData.value = res.list || []
    total.value = res.total || 0
  } catch {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  fetchList()
}

// ==================== 新增/编辑 ====================

const dialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const editId = ref<number | undefined>()

const formData = reactive<Customer>({
  name: '',
  phone: '',
  gender: undefined,
  birthday: '',
  address: '',
  source: '',
  tags: '',
  remark: ''
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

const resetForm = () => {
  formData.name = ''
  formData.phone = ''
  formData.gender = undefined
  formData.birthday = ''
  formData.address = ''
  formData.source = ''
  formData.tags = ''
  formData.remark = ''
  fileList.value = []
  pendingFiles.value = []
}

// ==================== 文件上传 ====================

const fileList = ref<any[]>([])
const pendingFiles = ref<File[]>([])

function handleFileChange(file: any) {
  pendingFiles.value.push(file.raw)
}

function handleExportExcel() {
  downloadFile('/api/export/excel?module=customers', '客户列表.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

function handleExportPdf() {
  exportTableToPdf(
    '客户列表',
    [
      { header: '姓名', dataKey: 'name' },
      { header: '电话', dataKey: 'phone' },
      { header: '性别', dataKey: 'gender' },
      { header: '来源', dataKey: 'source' },
      { header: '累计消费', dataKey: 'totalSpent' },
      { header: '最近到店', dataKey: 'lastVisitAt' },
    ],
    tableData.value,
    '客户列表',
  )
}

const handleAdd = () => {
  isEdit.value = false
  editId.value = undefined
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: Customer) => {
  isEdit.value = true
  editId.value = row.id
  Object.assign(formData, {
    name: row.name,
    phone: row.phone,
    gender: row.gender,
    birthday: row.birthday || '',
    address: row.address || '',
    source: row.source || '',
    tags: row.tags || '',
    remark: row.remark || ''
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  let images: string[] | undefined
  if (pendingFiles.value.length > 0) {
    images = await uploadFiles(pendingFiles.value, 'customers')
    pendingFiles.value = []
    fileList.value = []
  }

  submitLoading.value = true
  try {
    const payload = {
      name: formData.name,
      phone: formData.phone,
      gender: formData.gender,
      birthday: formData.birthday || undefined,
      address: formData.address || undefined,
      source: formData.source || undefined,
      tags: formData.tags || undefined,
      remark: formData.remark || undefined,
      images
    }

    if (isEdit.value && editId.value) {
      await request.put(`/customers/${editId.value}`, payload)
      ElMessage.success('编辑成功')
    } else {
      await request.post('/customers', payload)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    submitLoading.value = false
  }
}

// ==================== 删除 ====================

const handleDelete = (row: Customer) => {
  ElMessageBox.confirm(`确定删除客户「${row.name}」吗？删除后不可恢复。`, '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await request.delete(`/customers/${row.id}`)
      ElMessage.success('删除成功')
      fetchList()
    } catch {
      // 错误已在拦截器中处理
    }
  }).catch(() => {})
}

// ==================== 详情抽屉 ====================

const drawerVisible = ref(false)
const detailCustomer = ref<Customer | null>(null)
const activeTab = ref('info')

const handleDetail = async (row: Customer) => {
  drawerVisible.value = true
  activeTab.value = 'info'
  try {
    const res = await request.get<any, Customer>(`/customers/${row.id}`)
    detailCustomer.value = res
  } catch {
    drawerVisible.value = false
  }
}

// ==================== 车辆 ====================

const vehicles = ref<Vehicle[]>([])
const vehiclesLoading = ref(false)

const fetchVehicles = async () => {
  if (!detailCustomer.value?.id) return
  vehiclesLoading.value = true
  try {
    const res = await request.get<any, Vehicle[]>(`/customers/${detailCustomer.value.id}/vehicles`)
    vehicles.value = res || []
  } catch {
    vehicles.value = []
  } finally {
    vehiclesLoading.value = false
  }
}

const vehicleDialogVisible = ref(false)
const isVehicleEdit = ref(false)
const editVehicleId = ref<number | undefined>()
const vehicleSubmitLoading = ref(false)
const vehicleFormRef = ref<FormInstance>()

const vehicleForm = reactive<Vehicle>({
  plateNumber: '',
  brand: '',
  series: '',
  model: '',
  vin: '',
  mileage: undefined
})

const vehicleFormRules: FormRules = {
  plateNumber: [{ required: true, message: '请输入车牌号', trigger: 'blur' }]
}

const resetVehicleForm = () => {
  vehicleForm.plateNumber = ''
  vehicleForm.brand = ''
  vehicleForm.series = ''
  vehicleForm.model = ''
  vehicleForm.vin = ''
  vehicleForm.mileage = undefined
}

const handleAddVehicle = () => {
  isVehicleEdit.value = false
  editVehicleId.value = undefined
  resetVehicleForm()
  vehicleDialogVisible.value = true
}

const handleEditVehicle = (row: Vehicle) => {
  if (!row.id) return
  isVehicleEdit.value = true
  editVehicleId.value = row.id
  vehicleForm.plateNumber = row.plateNumber || ''
  vehicleForm.brand = row.brand || ''
  vehicleForm.series = row.series || ''
  vehicleForm.model = row.model || ''
  vehicleForm.vin = row.vin || ''
  vehicleForm.mileage = row.mileage
  vehicleDialogVisible.value = true
}

const handleDeleteVehicle = (row: Vehicle) => {
  if (!row.id) return
  ElMessageBox.confirm(`确定删除车辆「${row.plateNumber || '无车牌'}」吗？删除后不可恢复。`, '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await request.delete(`/customers/${detailCustomer.value!.id}/vehicles/${row.id}`)
      ElMessage.success('删除车辆成功')
      fetchVehicles()
      fetchList()
    } catch {
      // 错误已在拦截器中处理
    }
  }).catch(() => {})
}

const handleVehicleSubmit = async () => {
  const valid = await vehicleFormRef.value?.validate().catch(() => false)
  if (!valid) return

  vehicleSubmitLoading.value = true
  try {
    const payload = {
      plateNumber: vehicleForm.plateNumber,
      brand: vehicleForm.brand || undefined,
      series: vehicleForm.series || undefined,
      model: vehicleForm.model || undefined,
      vin: vehicleForm.vin || undefined,
      mileage: vehicleForm.mileage
    }

    if (isVehicleEdit.value && editVehicleId.value) {
      await request.put(`/customers/${detailCustomer.value!.id}/vehicles/${editVehicleId.value}`, payload)
      ElMessage.success('编辑车辆成功')
    } else {
      await request.post(`/customers/${detailCustomer.value!.id}/vehicles`, payload)
      ElMessage.success('新增车辆成功')
    }
    vehicleDialogVisible.value = false
    fetchVehicles()
    // 刷新客户列表以更新车辆数
    fetchList()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    vehicleSubmitLoading.value = false
  }
}

// ==================== 跟进记录 ====================

const follows = ref<FollowRecord[]>([])
const followsLoading = ref(false)

const fetchFollows = async () => {
  if (!detailCustomer.value?.id) return
  followsLoading.value = true
  try {
    const res = await request.get<any, FollowRecord[]>(`/customers/${detailCustomer.value.id}/follows`)
    follows.value = res || []
  } catch {
    follows.value = []
  } finally {
    followsLoading.value = false
  }
}

// 监听 tab 切换，懒加载车辆和跟进数据
import { watch } from 'vue'
watch(activeTab, (val) => {
  if (val === 'vehicles' && vehicles.value.length === 0) {
    fetchVehicles()
  }
  if (val === 'follows' && follows.value.length === 0) {
    fetchFollows()
  }
})

// ==================== 工具函数 ====================

const levelMap: Record<number, string> = {
  0: '普通会员',
  1: '银卡',
  2: '金卡',
  3: '钻石卡'
}

const getLevelName = (level?: number) => {
  if (level === undefined || level === null) return '普通会员'
  return levelMap[level] || '普通会员'
}

const getLevelTagType = (level?: number) => {
  const map: Record<number, string> = {
    0: 'info',
    1: '',
    2: 'warning',
    3: 'danger'
  }
  return map[level ?? 0] || 'info'
}

const followTypeTagMap: Record<string, string> = {
  '电话回访': '',
  '微信沟通': 'success',
  '到店接待': 'primary',
  '售后跟进': 'warning'
}

const getFollowTypeTag = (type: string) => {
  return followTypeTagMap[type] || 'info'
}

const formatMoney = (val?: number) => {
  if (val === undefined || val === null) return '0.00'
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ==================== 初始化 ====================

onMounted(() => {
  fetchList()
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

.search-card {
  margin-bottom: 16px;
}

.search-bar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 300px;
}

.table-card {
  margin-bottom: 16px;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.amount {
  color: #e6a23c;
  font-weight: 500;
}

.drawer-content {
  padding: 0 8px;
}

.tab-header {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}

.follow-type {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.follow-user {
  font-size: 12px;
  color: #909399;
}

.follow-content {
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
