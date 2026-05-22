<template>
  <div class="page-container">
    <div class="page-header">
      <h2>接车开单</h2>
    </div>

    <div class="reception-layout">
      <!-- 左栏：工单表单 -->
      <div class="reception-left">
        <el-card shadow="never">
          <template #header>
            <span class="card-title">维修工单</span>
          </template>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="100px"
            label-position="right"
            size="default"
          >
            <!-- 客户选择区 -->
            <el-divider content-position="left">客户信息</el-divider>

            <el-form-item label="选择客户" prop="customerId">
              <div class="customer-select-row">
                <el-select
                  v-model="form.customerId"
                  filterable
                  remote
                  reserve-keyword
                  placeholder="请输入客户姓名或电话搜索"
                  :remote-method="searchCustomers"
                  :loading="customerLoading"
                  clearable
                  style="flex: 1"
                  @change="handleCustomerChange"
                >
                  <el-option
                    v-for="item in customerOptions"
                    :key="item.id"
                    :label="`${item.name} - ${item.phone}`"
                    :value="item.id"
                  />
                </el-select>
                <el-button
                  type="primary"
                  text
                  @click="toggleNewCustomer"
                  style="margin-left: 8px; flex-shrink: 0"
                >
                  {{ showNewCustomerForm ? '取消新增' : '快速新增' }}
                </el-button>
              </div>
            </el-form-item>

            <!-- 快速新增客户表单 -->
            <template v-if="showNewCustomerForm">
              <el-form-item label="客户姓名" prop="newCustomerName">
                <el-input v-model="form.newCustomerName" placeholder="请输入姓名" />
              </el-form-item>
              <el-form-item label="联系电话" prop="newCustomerPhone">
                <el-input v-model="form.newCustomerPhone" placeholder="请输入手机号" maxlength="11" />
              </el-form-item>
              <el-form-item label="备注">
                <el-input v-model="form.newCustomerRemark" placeholder="选填" />
              </el-form-item>
            </template>

            <!-- 车辆信息 -->
            <el-divider content-position="left">车辆信息</el-divider>

            <el-form-item label="选择车辆" prop="vehicleId">
              <div class="customer-select-row">
                <el-select
                  v-model="form.vehicleId"
                  placeholder="请选择车辆"
                  clearable
                  style="flex: 1"
                  :disabled="!form.customerId && !showNewCustomerForm"
                  @change="handleVehicleChange"
                >
                  <el-option
                    v-for="item in vehicleOptions"
                    :key="item.id"
                    :label="`${item.plateNumber} - ${item.brand} ${item.model}`"
                    :value="item.id"
                  />
                </el-select>
                <el-button
                  type="primary"
                  text
                  style="margin-left: 8px; flex-shrink: 0"
                  @click="toggleNewVehicle"
                >
                  {{ showNewVehicleForm ? '取消' : '新增车辆' }}
                </el-button>
              </div>
            </el-form-item>

            <!-- 新增车辆表单 -->
            <template v-if="showNewVehicleForm">
              <el-form-item label="车牌号" prop="newVehiclePlate">
                <el-input v-model="form.newVehiclePlate" placeholder="请输入车牌号" />
              </el-form-item>
              <el-form-item label="车辆品牌" prop="newVehicleBrand">
                <el-input v-model="form.newVehicleBrand" placeholder="请输入品牌" />
              </el-form-item>
              <el-form-item label="车型" prop="newVehicleModel">
                <el-input v-model="form.newVehicleModel" placeholder="请输入车型" />
              </el-form-item>
              <el-form-item label="当前里程(km)">
                <el-input-number
                  v-model="form.newVehicleMileage"
                  :min="0"
                  :step="1000"
                  placeholder="请输入里程"
                  controls-position="right"
                  style="width: 100%"
                />
              </el-form-item>
            </template>

            <!-- 故障描述 -->
            <el-divider content-position="left">故障诊断</el-divider>

            <el-form-item label="故障描述" prop="faultDescription">
              <el-input
                v-model="form.faultDescription"
                type="textarea"
                :rows="3"
                placeholder="请描述客户反馈的故障现象..."
              />
            </el-form-item>

            <el-form-item label="检查结果" prop="inspectionResult">
              <el-input
                v-model="form.inspectionResult"
                type="textarea"
                :rows="3"
                placeholder="请填写初步检查结果..."
              />
            </el-form-item>

            <el-form-item label="故障照片">
              <el-upload multiple drag :auto-upload="false" :on-change="handleFileChange" :file-list="fileList" accept="image/*">
                <el-icon :size="32"><UploadFilled /></el-icon>
                <div>拖拽或点击上传故障部位照片</div>
              </el-upload>
            </el-form-item>

            <!-- 维修项目列表 -->
            <el-divider content-position="left">
              维修项目
              <el-button type="primary" size="small" text @click="addRepairItem" style="margin-left: 8px">
                + 添加项目
              </el-button>
            </el-divider>

            <el-form-item label-width="0" prop="repairItems">
              <div class="repair-items-table">
                <div
                  v-for="(item, index) in form.repairItems"
                  :key="index"
                  class="repair-item-row"
                >
                  <el-select
                    v-model="item.type"
                    placeholder="类型"
                    style="width: 100px"
                  >
                    <el-option label="工时" value="labor" />
                    <el-option label="配件" value="part" />
                  </el-select>
                  <el-input
                    v-model="item.name"
                    placeholder="项目名称"
                    style="flex: 1; min-width: 150px"
                  />
                  <el-input-number
                    v-model="item.laborFee"
                    placeholder="工时费"
                    :min="0"
                    :step="50"
                    controls-position="right"
                    style="width: 130px"
                  />
                  <el-input-number
                    v-model="item.partFee"
                    placeholder="配件费"
                    :min="0"
                    :step="50"
                    controls-position="right"
                    style="width: 130px"
                  />
                  <span class="item-amount">
                    &yen;{{ computedItemAmount(item).toLocaleString() }}
                  </span>
                  <el-button
                    type="danger"
                    text
                    :icon="Delete"
                    circle
                    size="small"
                    @click="removeRepairItem(index)"
                  />
                </div>
                <el-empty
                  v-if="form.repairItems.length === 0"
                  description="暂无维修项目，点击上方添加"
                  :image-size="60"
                />
              </div>
            </el-form-item>

            <!-- 服务顾问与工期 -->
            <el-divider content-position="left">派工信息</el-divider>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="服务顾问" prop="advisorId">
                  <el-select
                    v-model="form.advisorId"
                    placeholder="请选择服务顾问"
                    clearable
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in advisorOptions"
                      :key="item.id"
                      :label="item.realName"
                      :value="item.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="预计完工" prop="estimatedCompletion">
                  <el-date-picker
                    v-model="form.estimatedCompletion"
                    type="datetime"
                    placeholder="请选择预计完工时间"
                    style="width: 100%"
                    value-format="YYYY-MM-DD HH:mm:ss"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <!-- 提交按钮 -->
            <el-form-item label-width="0" style="margin-top: 20px">
              <el-button
                type="primary"
                size="large"
                :loading="submitting"
                @click="handleSubmit"
                style="width: 100%"
              >
                创建工单
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>

      <!-- 右栏：客户信息预览 -->
      <div class="reception-right">
        <el-card shadow="never" class="sticky-card">
          <template #header>
            <span class="card-title">客户信息预览</span>
          </template>

          <div v-if="!selectedCustomer" class="empty-preview">
            <el-empty
              description="请先在左侧选择或新增客户"
              :image-size="80"
            />
          </div>

          <div v-else v-loading="customerDetailLoading" class="customer-preview">
            <!-- 基本信息 -->
            <div class="preview-section">
              <div class="section-title">基本信息</div>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">姓名</span>
                  <span class="info-value">{{ selectedCustomer.name }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">电话</span>
                  <span class="info-value">{{ selectedCustomer.phone }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">会员等级</span>
                  <el-tag
                    v-if="selectedCustomer.memberLevel"
                    :type="memberLevelTagType(selectedCustomer.memberLevel)"
                    size="small"
                  >
                    {{ selectedCustomer.memberLevel }}
                  </el-tag>
                  <span v-else class="info-value">普通客户</span>
                </div>
                <div class="info-item">
                  <span class="info-label">累计消费</span>
                  <span class="info-value amount">
                    &yen;{{ (selectedCustomer.totalConsumption || 0).toLocaleString() }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 车辆列表 -->
            <div class="preview-section">
              <div class="section-title">
                车辆列表
                <span class="section-badge">{{ customerVehicles.length }}</span>
              </div>
              <div v-if="customerVehicles.length === 0" class="no-data">暂无车辆</div>
              <div v-else class="vehicle-list">
                <div
                  v-for="v in customerVehicles"
                  :key="v.id"
                  class="vehicle-item"
                  :class="{ 'vehicle-item--active': form.vehicleId === v.id }"
                >
                  <div class="vehicle-plate">{{ v.plateNumber }}</div>
                  <div class="vehicle-detail">{{ v.brand }} {{ v.model }}</div>
                  <div class="vehicle-mileage" v-if="v.mileage !== undefined">
                    {{ (v.mileage || 0).toLocaleString() }} km
                  </div>
                </div>
              </div>
            </div>

            <!-- 最近维修记录 -->
            <div class="preview-section">
              <div class="section-title">最近维修记录</div>
              <div v-if="recentRepairs.length === 0" class="no-data">暂无维修记录</div>
              <div v-else class="repair-list">
                <div v-for="r in recentRepairs" :key="r.id" class="repair-item">
                  <div class="repair-item-header">
                    <span class="repair-order-no">{{ r.orderNo }}</span>
                    <el-tag :type="repairStatusTagType(r.status)" size="small">
                      {{ r.status }}
                    </el-tag>
                  </div>
                  <div class="repair-item-desc">{{ r.description || r.faultDescription || '无故障描述' }}</div>
                  <div class="repair-item-footer">
                    <span>{{ r.createTime }}</span>
                    <span class="repair-amount">&yen;{{ (r.totalAmount || 0).toLocaleString() }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, h, createApp } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Delete, UploadFilled } from '@element-plus/icons-vue'
import request from '@/api/request'
import { uploadFiles } from '@/utils/upload'
import { printHtml } from '@/utils/print'
import ReceptionPrint from '@/components/PrintTemplate/ReceptionPrint.vue'

/** 递归深度转义对象中所有字符串值（防御纵深，配合 Vue {{ }} 模板转义） */
function deepEscape(data: any): any {
  if (typeof data === 'string') return String(data)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
  if (Array.isArray(data)) return data.map(deepEscape)
  if (data !== null && typeof data === 'object') {
    const result: Record<string, any> = {}
    for (const key of Object.keys(data)) {
      result[key] = deepEscape(data[key])
    }
    return result
  }
  return data
}

const router = useRouter()
const formRef = ref<FormInstance>()

// ==================== 类型定义 ====================

interface CustomerOption {
  id: number
  name: string
  phone: string
  memberLevel?: string
  totalConsumption?: number
}

interface VehicleOption {
  id: number
  plateNumber: string
  brand: string
  model: string
  mileage?: number
}

interface RepairItem {
  type: 'labor' | 'part'
  name: string
  laborFee: number
  partFee: number
}

interface AdvisorOption {
  id: number
  realName: string
}

interface CustomerDetail {
  id: number
  name: string
  phone: string
  memberLevel?: string
  totalConsumption?: number
}

interface RecentRepair {
  id: number
  orderNo: string
  status: string
  description?: string
  faultDescription?: string
  totalAmount?: number
  createTime: string
}

// ==================== 表单数据 ====================

const form = reactive({
  customerId: null as number | null,
  newCustomerName: '',
  newCustomerPhone: '',
  newCustomerRemark: '',
  vehicleId: null as number | null,
  newVehiclePlate: '',
  newVehicleBrand: '',
  newVehicleModel: '',
  newVehicleMileage: 0,
  faultDescription: '',
  inspectionResult: '',
  repairItems: [] as RepairItem[],
  advisorId: null as number | null,
  estimatedCompletion: '',
})

// ==================== 表单校验规则 ====================

const rules = reactive<FormRules>({
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  newCustomerName: [] as any[],
  newCustomerPhone: [] as any[],
  vehicleId: [{ required: true, message: '请选择车辆', trigger: 'change' }],
  faultDescription: [{ required: true, message: '请填写故障描述', trigger: 'blur' }],
  advisorId: [{ required: true, message: '请选择服务顾问', trigger: 'change' }],
  estimatedCompletion: [{ required: true, message: '请选择预计完工时间', trigger: 'change' }],
})

// ==================== 状态 ====================

const showNewCustomerForm = ref(false)
const showNewVehicleForm = ref(false)
const submitting = ref(false)

// ==================== 文件上传 ====================
const fileList = ref<any[]>([])
const pendingFiles = ref<File[]>([])

function handleFileChange(file: any) {
  pendingFiles.value.push(file.raw)
}

// 客户搜索
const customerLoading = ref(false)
const customerOptions = ref<CustomerOption[]>([])

// 车辆选项
const vehicleOptions = ref<VehicleOption[]>([])
// 服务顾问
const advisorOptions = ref<AdvisorOption[]>([])

// 客户详情预览
const selectedCustomer = ref<CustomerDetail | null>(null)
const customerDetailLoading = ref(false)
const customerVehicles = ref<VehicleOption[]>([])
const recentRepairs = ref<RecentRepair[]>([])

// ==================== 方法 ====================

// 搜索客户
async function searchCustomers(query: string) {
  if (!query || query.length < 1) {
    customerOptions.value = []
    return
  }
  customerLoading.value = true
  try {
    const res = await request.get('/customers', { params: { keyword: query } })
    customerOptions.value = (res as any).list || (Array.isArray(res) ? res : [])
  } catch {
    customerOptions.value = []
  } finally {
    customerLoading.value = false
  }
}

// 选择客户后
async function handleCustomerChange(customerId: number | null) {
  showNewVehicleForm.value = false
  vehicleOptions.value = []
  customerVehicles.value = []
  recentRepairs.value = []
  selectedCustomer.value = null

  if (!customerId) {
    form.vehicleId = null
    return
  }

  customerDetailLoading.value = true
  try {
    const detail = (await request.get(`/customers/${customerId}`)) as any
    selectedCustomer.value = {
      id: detail.id,
      name: detail.name,
      phone: detail.phone,
      memberLevel: detail.memberLevel,
      totalConsumption: detail.totalConsumption,
    }

    const vehiclesRes = (await request.get(`/customers/${customerId}/vehicles`)) as any
    const vehicleList = vehiclesRes.list || (Array.isArray(vehiclesRes) ? vehiclesRes : [])
    vehicleOptions.value = vehicleList
    customerVehicles.value = vehicleList

    const repairsRes = (await request.get(`/repair`, { params: { customerId, pageSize: 5 } })) as any
    const repairList = repairsRes.list || repairsRes.records || (Array.isArray(repairsRes) ? repairsRes : [])
    recentRepairs.value = (repairList as RecentRepair[]).slice(0, 5)

    form.vehicleId = null
  } catch {
    ElMessage.warning('获取客户详情失败')
  } finally {
    customerDetailLoading.value = false
  }

  // 如果选择了已有客户，清除新增客户表单
  showNewCustomerForm.value = false
  form.newCustomerName = ''
  form.newCustomerPhone = ''
  form.newCustomerRemark = ''
}

// 选择车辆后
function handleVehicleChange(vehicleId: number | null) {
  showNewVehicleForm.value = false
  if (vehicleId) {
    form.newVehiclePlate = ''
    form.newVehicleBrand = ''
    form.newVehicleModel = ''
    form.newVehicleMileage = 0
  }
}

// 切换新增客户表单
function toggleNewCustomer() {
  showNewCustomerForm.value = !showNewCustomerForm.value
  if (showNewCustomerForm.value) {
    form.customerId = null
    selectedCustomer.value = null
    vehicleOptions.value = []
    customerVehicles.value = []
    recentRepairs.value = []
    form.vehicleId = null
  } else {
    form.newCustomerName = ''
    form.newCustomerPhone = ''
    form.newCustomerRemark = ''
  }
}

// 切换新增车辆
function toggleNewVehicle() {
  showNewVehicleForm.value = !showNewVehicleForm.value
  if (showNewVehicleForm.value) {
    form.vehicleId = null
  } else {
    form.newVehiclePlate = ''
    form.newVehicleBrand = ''
    form.newVehicleModel = ''
    form.newVehicleMileage = 0
  }
}

// 添加维修项目行
function addRepairItem() {
  form.repairItems.push({
    type: 'labor',
    name: '',
    laborFee: 0,
    partFee: 0,
  })
}

// 删除维修项目行
function removeRepairItem(index: number) {
  form.repairItems.splice(index, 1)
}

// 计算单项金额
function computedItemAmount(item: RepairItem): number {
  return (item.laborFee || 0) + (item.partFee || 0)
}

// 总金额
const totalAmount = computed(() => {
  return form.repairItems.reduce((sum, item) => sum + computedItemAmount(item), 0)
})

// 提交工单
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  // 校验维修项目
  if (form.repairItems.length === 0) {
    ElMessage.warning('请至少添加一个维修项目')
    return
  }
  for (const item of form.repairItems) {
    if (!item.name.trim()) {
      ElMessage.warning('请填写维修项目名称')
      return
    }
  }

  submitting.value = true
  try {
    const payload: Record<string, any> = {
      faultDescription: form.faultDescription,
      inspectionResult: form.inspectionResult,
      repairItems: form.repairItems.map((item) => ({
        type: item.type,
        name: item.name,
        laborFee: item.laborFee,
        partFee: item.partFee,
        amount: computedItemAmount(item),
      })),
      totalAmount: totalAmount.value,
      advisorId: form.advisorId,
      estimatedCompletion: form.estimatedCompletion,
    }

    // 上传故障照片
    if (pendingFiles.value.length > 0) {
      const urls = await uploadFiles(pendingFiles.value, 'repair')
      payload.images = urls
    }

    // 客户信息
    if (showNewCustomerForm.value) {
      payload.newCustomer = {
        name: form.newCustomerName,
        phone: form.newCustomerPhone,
        remark: form.newCustomerRemark,
      }
    } else {
      payload.customerId = form.customerId
    }

    // 车辆信息
    if (showNewVehicleForm.value) {
      payload.newVehicle = {
        plateNumber: form.newVehiclePlate,
        brand: form.newVehicleBrand,
        model: form.newVehicleModel,
        mileage: form.newVehicleMileage,
      }
    } else {
      payload.vehicleId = form.vehicleId
    }

    const result = await request.post('/repair', payload) as any

    ElMessage.success('工单创建成功！')

    // 询问是否打印接车单
    setTimeout(() => {
      ElMessageBox.confirm(
        '接车单已创建，是否打印？',
        '打印确认',
        {
          confirmButtonText: '打印',
          cancelButtonText: '暂不打印',
          type: 'info',
        },
      )
        .then(async () => {
          const orderNo = result?.orderNo || result?.data?.orderNo || ''
          const selectedVehicle = form.vehicleId
            ? customerVehicles.value.find(v => (v as any).id === form.vehicleId)
            : null
          const printData = {
            orderNo,
            customerName: selectedCustomer.value?.name || form.newCustomerName || '-',
            customerPhone: selectedCustomer.value?.phone || form.newCustomerPhone || '-',
            plateNumber: form.newVehiclePlate || (selectedVehicle as any)?.plateNumber || '-',
            vehicleModel: form.newVehicleModel || (selectedVehicle as any)?.model || '-',
            mileage: form.newVehicleMileage || (selectedVehicle as any)?.mileage || 0,
            serviceAdvisor: advisorOptions.value.find(a => a.id === form.advisorId)?.realName || '-',
            faultDesc: form.faultDescription,
            estCompleteTime: form.estimatedCompletion,
            createTime: new Date().toISOString(),
          }
          const container = document.createElement('div')
          const safeData = deepEscape(printData)
          const app = createApp({ render: () => h(ReceptionPrint, { data: safeData }) })
          app.mount(container)
          await new Promise(r => setTimeout(r, 100))
          printHtml(container.innerHTML)
          app.unmount()
        })
        .catch(() => {
          // 用户取消打印
        })
      router.push({ name: 'RepairOrders' })
    }, 300)
  } catch {
    // 错误已在拦截器处理
  } finally {
    submitting.value = false
  }
}

// 加载服务顾问
async function loadAdvisors() {
  try {
    const res = await request.get('/users', { params: { roleId: 3 } })
    const list = (res as any).list || (res as any).records || (Array.isArray(res) ? res : [])
    advisorOptions.value = list as AdvisorOption[]
  } catch {
    // ignore
  }
}

// ==================== 辅助方法 ====================

function memberLevelTagType(level: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    '钻石会员': 'danger',
    '金卡会员': 'warning',
    '银卡会员': 'info',
    '普通会员': 'info',
  }
  return map[level] || 'info'
}

function repairStatusTagType(status: string): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
    '待派工': 'warning',
    '施工中': 'primary',
    '质检中': 'info',
    '已完工': 'success',
    '已结算': 'success',
    '已取消': 'info',
  }
  return map[status] || 'info'
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadAdvisors()
})

// 动态切换校验规则
watch(showNewCustomerForm, (val) => {
  if (val) {
    rules.customerId = []
    rules.newCustomerName = [{ required: true, message: '请输入客户姓名', trigger: 'blur' }]
    rules.newCustomerPhone = [
      { required: true, message: '请输入联系电话', trigger: 'blur' },
      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
    ]
  } else {
    rules.customerId = [{ required: true, message: '请选择客户', trigger: 'change' }]
    rules.newCustomerName = []
    rules.newCustomerPhone = []
  }
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

/* 左右布局 */
.reception-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.reception-left {
  flex: 0 0 60%;
  min-width: 0;
}

.reception-right {
  flex: 0 0 40%;
  min-width: 0;
}

.sticky-card {
  position: sticky;
  top: 20px;
}

/* 卡片 */
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

/* 客户选择行 */
.customer-select-row {
  display: flex;
  align-items: center;
  width: 100%;
}

/* 分隔线 */
.el-divider {
  margin: 16px 0 12px;
}

.el-divider :deep(.el-divider__text) {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  background-color: #fff;
}

/* 维修项目表格 */
.repair-items-table {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
}

.repair-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #ebeef5;
  background: #fff;
  transition: background 0.15s;
}

.repair-item-row:last-child {
  border-bottom: none;
}

.repair-item-row:hover {
  background: #fafafa;
}

.item-amount {
  font-weight: 600;
  color: #f56c6c;
  font-size: 14px;
  white-space: nowrap;
  min-width: 80px;
  text-align: right;
}

/* 客户预览区 */
.empty-preview {
  padding: 40px 0;
}

.customer-preview {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.preview-section {
  margin-bottom: 20px;
}

.preview-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f2f3f5;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 11px;
  font-weight: 600;
}

.no-data {
  font-size: 12px;
  color: #c0c4cc;
  text-align: center;
  padding: 16px 0;
}

/* 信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 12px;
  color: #909399;
}

.info-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.info-value.amount {
  color: #e6a23c;
  font-weight: 600;
}

/* 车辆列表 */
.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vehicle-item {
  padding: 8px 10px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.vehicle-item:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.vehicle-item--active {
  border-color: #409eff;
  background: #ecf5ff;
}

.vehicle-plate {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.vehicle-detail {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.vehicle-mileage {
  font-size: 12px;
  color: #67c23a;
  margin-top: 2px;
}

/* 维修记录列表 */
.repair-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.repair-item {
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  transition: border-color 0.2s;
}

.repair-item:hover {
  border-color: #c0c4cc;
}

.repair-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.repair-order-no {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.repair-item-desc {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.repair-item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #c0c4cc;
}

.repair-amount {
  font-weight: 600;
  color: #e6a23c;
}

/* 响应式 */
@media (max-width: 1200px) {
  .reception-layout {
    flex-direction: column;
  }
  .reception-left,
  .reception-right {
    flex: 1 1 auto;
    width: 100%;
  }
}
</style>
