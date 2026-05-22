<template>
  <div class="page-container">
    <div class="page-header">
      <h2>报价签约管理</h2>
    </div>
    <el-card>
      <!-- 操作栏 -->
      <div class="search-bar">
        <el-button type="success" @click="handleAdd">新建订单</el-button>
        <el-button type="success" plain @click="handleExportExcel">📥 导出Excel</el-button>
        <el-button @click="handleExportPdf">📄 导出PDF</el-button>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%; margin-top: 16px"
        @row-click="handleDetail"
      >
        <el-table-column prop="orderNo" label="订单号" min-width="160" />
        <el-table-column prop="customerName" label="客户" min-width="100" />
        <el-table-column prop="vehicleInfo" label="车辆" min-width="140" />
        <el-table-column label="销售价(¥)" min-width="120" align="right">
          <template #default="{ row }">
            {{ row.salePrice != null ? Number(row.salePrice).toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="定金(¥)" min-width="110" align="right">
          <template #default="{ row }">
            {{ row.deposit != null ? Number(row.deposit).toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="orderStatusTagType(row.status)"
              size="small"
            >
              {{ row.status || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="salesConsultant" label="销售顾问" min-width="100" />
        <el-table-column prop="createdAt" label="创建时间" min-width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleDetail(row)">
              详情
            </el-button>
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">
              删除
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑订单' : '新建订单'"
      width="700px"
      :close-on-click-modal="false"
      @closed="handleDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="80px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="选择客户" prop="customerId">
              <el-select
                v-model="form.customerId"
                placeholder="请选择客户"
                filterable
                style="width: 100%"
                @change="onCustomerChange"
              >
                <el-option
                  v-for="c in customerList"
                  :key="c.id"
                  :label="`${c.name} (${c.phone})`"
                  :value="c.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="选择车辆" prop="vehicleId">
              <el-select
                v-model="form.vehicleId"
                placeholder="请选择车辆"
                filterable
                style="width: 100%"
                @change="onVehicleChange"
              >
                <el-option
                  v-for="v in vehicleList"
                  :key="v.id"
                  :label="`${v.brand} ${v.model} (${v.color})`"
                  :value="v.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 车辆信息自动回显 -->
        <el-descriptions
          v-if="selectedVehicle"
          :column="2"
          border
          size="small"
          style="margin-bottom: 18px"
        >
          <el-descriptions-item label="品牌">{{ selectedVehicle.brand }}</el-descriptions-item>
          <el-descriptions-item label="车系">{{ selectedVehicle.series }}</el-descriptions-item>
          <el-descriptions-item label="车型">{{ selectedVehicle.model }}</el-descriptions-item>
          <el-descriptions-item label="颜色">{{ selectedVehicle.color }}</el-descriptions-item>
          <el-descriptions-item label="指导价">
            ¥{{ selectedVehicle.guidePrice != null ? Number(selectedVehicle.guidePrice).toLocaleString() : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="库位">{{ selectedVehicle.storageLocation || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 费用明细 -->
        <el-divider content-position="left">费用明细</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="车价" prop="carPrice">
              <el-input-number
                v-model="form.carPrice"
                :min="0"
                :precision="0"
                :controls="false"
                placeholder="车价"
                style="width: 100%"
                @change="calcTotal"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="优惠" prop="discount">
              <el-input-number
                v-model="form.discount"
                :min="0"
                :precision="0"
                :controls="false"
                placeholder="优惠金额"
                style="width: 100%"
                @change="calcTotal"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="购置税" prop="purchaseTax">
              <el-input-number
                v-model="form.purchaseTax"
                :min="0"
                :precision="0"
                :controls="false"
                placeholder="购置税"
                style="width: 100%"
                @change="calcTotal"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="保险" prop="insurance">
              <el-input-number
                v-model="form.insurance"
                :min="0"
                :precision="0"
                :controls="false"
                placeholder="保险费"
                style="width: 100%"
                @change="calcTotal"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="精品" prop="accessories">
              <el-input-number
                v-model="form.accessories"
                :min="0"
                :precision="0"
                :controls="false"
                placeholder="精品费"
                style="width: 100%"
                @change="calcTotal"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="服务费" prop="serviceFee">
              <el-input-number
                v-model="form.serviceFee"
                :min="0"
                :precision="0"
                :controls="false"
                placeholder="服务费"
                style="width: 100%"
                @change="calcTotal"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="定金" prop="deposit">
              <el-input-number
                v-model="form.deposit"
                :min="0"
                :precision="0"
                :controls="false"
                placeholder="定金"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="总金额">
              <el-input
                :model-value="'¥' + computedTotal.toLocaleString()"
                disabled
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="销售顾问" prop="salesConsultant">
          <el-select v-model="form.salesConsultant" placeholder="请选择销售顾问" style="width: 100%">
            <el-option
              v-for="u in salesUserList"
              :key="u.id"
              :label="u.realName"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="warning" @click="handlePrintOrder">🖨️ 打印合同</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="detailDrawerVisible"
      title="订单详情"
      size="500px"
      :close-on-click-modal="true"
    >
      <template v-if="detailRow">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="订单号">{{ detailRow.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ detailRow.customerName }}</el-descriptions-item>
          <el-descriptions-item label="车辆">{{ detailRow.vehicleInfo }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="orderStatusTagType(detailRow.status)" size="small">
              {{ detailRow.status || '-' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="车价">&yen;{{ detailRow.carPrice != null ? Number(detailRow.carPrice).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="优惠">&yen;{{ detailRow.discount != null ? Number(detailRow.discount).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="购置税">&yen;{{ detailRow.purchaseTax != null ? Number(detailRow.purchaseTax).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="保险">&yen;{{ detailRow.insurance != null ? Number(detailRow.insurance).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="精品费">&yen;{{ detailRow.accessories != null ? Number(detailRow.accessories).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="服务费">&yen;{{ detailRow.serviceFee != null ? Number(detailRow.serviceFee).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="销售价">&yen;{{ detailRow.salePrice != null ? Number(detailRow.salePrice).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="定金">&yen;{{ detailRow.deposit != null ? Number(detailRow.deposit).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="总金额">&yen;{{ detailRow.totalAmount != null ? Number(detailRow.totalAmount).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="销售顾问">{{ detailRow.salesConsultantName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">{{ detailRow.createdAt }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, h, createApp } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import { printHtml } from '@/utils/print'
import { downloadFile } from '@/utils/download'
import { exportTableToPdf } from '@/utils/export-pdf'
import SalesOrderPrint from '@/components/PrintTemplate/SalesOrderPrint.vue'

/** HTML 实体转义，防止 XSS */
function escapeHtml(str: any): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 递归深度转义对象中所有字符串值（防御纵深，配合 Vue {{ }} 模板转义） */
function deepEscape(data: any): any {
  if (typeof data === 'string') return escapeHtml(data)
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

// ==================== 类型定义 ====================
interface Order {
  id: number
  orderNo: string
  customerId: number
  customerName: string
  vehicleId: number
  vehicleInfo: string
  carPrice: number
  discount: number
  purchaseTax: number
  insurance: number
  accessories: number
  serviceFee: number
  salePrice: number
  deposit: number
  totalAmount: number
  status: string
  salesConsultant: number | null
  salesConsultantName: string
  createdAt: string
}

interface Customer {
  id: number
  name: string
  phone: string
}

interface Vehicle {
  id: number
  brand: string
  series: string
  model: string
  year: string
  color: string
  guidePrice: number
  storageLocation: string
}

interface SalesUser {
  id: number
  realName: string
}

interface OrderForm {
  customerId: number | null
  vehicleId: number | null
  carPrice: number | null
  discount: number | null
  purchaseTax: number | null
  insurance: number | null
  accessories: number | null
  serviceFee: number | null
  deposit: number | null
  salesConsultant: number | null
}

// ==================== 查询条件 ====================
const searchForm = reactive({
  keyword: '',
})

// ==================== 分页 ====================
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 表格数据 ====================
const tableData = ref<Order[]>([])
const loading = ref(false)

// ==================== 弹窗相关 ====================
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref<number | null>(null)
const editRow = ref<Order | null>(null)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const initForm = (): OrderForm => ({
  customerId: null,
  vehicleId: null,
  carPrice: null,
  discount: null,
  purchaseTax: null,
  insurance: null,
  accessories: null,
  serviceFee: null,
  deposit: null,
  salesConsultant: null,
})

const form = reactive<OrderForm>(initForm())

const formRules: FormRules = {
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  vehicleId: [{ required: true, message: '请选择车辆', trigger: 'change' }],
  carPrice: [{ required: true, message: '请输入车价', trigger: 'blur' }],
  salesConsultant: [{ required: true, message: '请选择销售顾问', trigger: 'change' }],
}

// ==================== 基础数据 ====================
const customerList = ref<Customer[]>([])
const vehicleList = ref<Vehicle[]>([])
const salesUserList = ref<SalesUser[]>([])

/** 当前选中的车辆详情（用于回显） */
const selectedVehicle = ref<Vehicle | null>(null)

// ==================== 计算总金额 ====================
const computedTotal = computed(() => {
  const carPrice = form.carPrice ?? 0
  const discount = form.discount ?? 0
  const purchaseTax = form.purchaseTax ?? 0
  const insurance = form.insurance ?? 0
  const accessories = form.accessories ?? 0
  const serviceFee = form.serviceFee ?? 0
  return carPrice - discount + purchaseTax + insurance + accessories + serviceFee
})

function calcTotal() {
  // 触发computed重新计算（占位函数，便于理解）
}

// ==================== 订单状态标签颜色 ====================
function orderStatusTagType(status: string): '' | 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
    '待签约': 'warning',
    '已签约': '',
    '已交车': 'success',
  }
  return map[status] ?? 'info'
}

// ==================== 方法 ====================

/** 获取订单列表 */
async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/sales/orders', {
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

/** 获取客户列表 */
async function fetchCustomers() {
  try {
    const res: any = await request.get('/customers', {
      params: { pageSize: 100 },
    })
    customerList.value = res.list ?? []
  } catch {
    // 错误已在拦截器中处理
  }
}

/** 获取车辆列表 */
async function fetchVehicles() {
  try {
    const res: any = await request.get('/sales/vehicles', {
      params: { pageSize: 9999, stockStatus: '在库' },
    })
    vehicleList.value = res.list ?? []
  } catch {
    // 错误已在拦截器中处理
  }
}

/** 获取销售顾问（用户列表） */
async function fetchSalesUsers() {
  try {
    const res: any = await request.get('/users', {
      params: { pageSize: 100 },
    })
    salesUserList.value = res.list ?? []
  } catch {
    // 错误已在拦截器中处理
  }
}

/** 搜索 */
function handleSearch() {
  pagination.page = 1
  fetchData()
}

/** 选择客户 */
function onCustomerChange(_val: number | null) {
  // 客户变更时不需要联动，仅触发校验
}

/** 选择车辆后回显车辆信息 */
function onVehicleChange(val: number | null) {
  if (val != null) {
    const v = vehicleList.value.find((item) => item.id === val)
    selectedVehicle.value = v ?? null
    // 自动填充车价为销售价
    if (v && form.carPrice == null) {
      form.carPrice = v.guidePrice ?? 0
    }
  } else {
    selectedVehicle.value = null
  }
}

/** 新增 */
function handleAdd() {
  isEdit.value = false
  currentId.value = null
  selectedVehicle.value = null
  Object.assign(form, initForm())
  dialogVisible.value = true
}

/** 编辑 */
function handleEdit(row: Order) {
  isEdit.value = true
  currentId.value = row.id
  editRow.value = row
  form.customerId = row.customerId
  form.vehicleId = row.vehicleId
  form.carPrice = row.carPrice
  form.discount = row.discount
  form.purchaseTax = row.purchaseTax
  form.insurance = row.insurance
  form.accessories = row.accessories
  form.serviceFee = row.serviceFee
  form.deposit = row.deposit
  form.salesConsultant = row.salesConsultant

  // 回显车辆信息
  const v = vehicleList.value.find((item) => item.id === row.vehicleId)
  selectedVehicle.value = v ?? null

  dialogVisible.value = true
}

/** 弹窗关闭后清理 */
function handleDialogClosed() {
  formRef.value?.resetFields()
  selectedVehicle.value = null
}

/** 提交表单 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    const payload = {
      ...form,
      totalAmount: computedTotal.value,
    }

    if (isEdit.value) {
      await request.put(`/sales/orders/${currentId.value}`, payload)
      ElMessage.success('更新成功')
    } else {
      await request.post('/sales/orders', payload)
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    fetchData()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    submitLoading.value = false
  }
}

/** 删除 */
function handleDelete(row: Order) {
  ElMessageBox.confirm(`确定删除订单「${row.orderNo}」吗？`, '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        await request.delete(`/sales/orders/${row.id}`)
        ElMessage.success('删除成功')
        fetchData()
      } catch {
        // 错误已在拦截器中处理
      }
    })
    .catch(() => {})
}

// ==================== 详情抽屉 ====================
const detailDrawerVisible = ref(false)
const detailRow = ref<Order | null>(null)

function handleDetail(row: Order) {
  detailRow.value = row
  detailDrawerVisible.value = true
}

// ==================== 导出与打印 ====================

function handleExportExcel() {
  downloadFile('/api/export/excel?module=sales', '销售订单.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

function handleExportPdf() {
  exportTableToPdf(
    '销售订单',
    [
      { header: '订单号', dataKey: 'orderNo' },
      { header: '客户', dataKey: 'customerName' },
      { header: '车辆信息', dataKey: 'vehicleInfo' },
      { header: '销售价', dataKey: 'salePrice' },
      { header: '状态', dataKey: 'status' },
      { header: '创建时间', dataKey: 'createdAt' },
    ],
    tableData.value,
    '销售订单',
  )
}

async function handlePrintOrder() {
  const container = document.createElement('div')
  let dataForPrint: any

  if (isEdit.value && editRow.value) {
    // 编辑模式：基于已保存的完整数据，覆盖用户当前编辑的金额字段
    dataForPrint = {
      ...editRow.value,
      carPrice: form.carPrice ?? editRow.value.carPrice,
      discount: form.discount ?? editRow.value.discount,
      purchaseTax: form.purchaseTax ?? editRow.value.purchaseTax,
      insurance: form.insurance ?? editRow.value.insurance,
      accessories: form.accessories ?? editRow.value.accessories,
      serviceFee: form.serviceFee ?? editRow.value.serviceFee,
      deposit: form.deposit ?? editRow.value.deposit,
      salesConsultantName: editRow.value.salesConsultantName,
    }
  } else {
    // 新增模式：从表单构建（缺少 orderNo 等后端生成字段属正常）
    dataForPrint = { ...form }
  }

  const safeData = deepEscape(dataForPrint)
  const app = createApp({ render: () => h(SalesOrderPrint, { data: safeData }) })
  app.mount(container)
  await new Promise(r => setTimeout(r, 100))
  printHtml(container.innerHTML)
  app.unmount()
}

// ==================== 生命周期 ====================
onMounted(() => {
  fetchData()
  fetchCustomers()
  fetchVehicles()
  fetchSalesUsers()
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
