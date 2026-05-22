<template>
  <div class="page-container">
    <div class="page-header">
      <h2>交车管理</h2>
    </div>
    <el-card>
      <div class="search-bar">
        <div class="search-bar-left">
          <el-input
            v-model="searchForm.keyword"
            placeholder="订单号/客户姓名"
            clearable
            style="width: 220px; margin-right: 10px"
            @keyup.enter="handleSearch"
          />
          <el-select
            v-model="searchForm.status"
            placeholder="订单状态"
            style="width: 140px; margin-right: 10px"
          >
            <el-option label="全部" value="" />
            <el-option label="已签约" value="已签约" />
            <el-option label="已交付" value="已交付" />
          </el-select>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </div>
        <div class="search-bar-right">
          <el-button type="success" @click="handleCreateOrder">
            <el-icon><Plus /></el-icon>新建交车
          </el-button>
          <el-button type="primary" @click="handleExport">
            <el-icon><Download /></el-icon>导出Excel
          </el-button>
        </div>
      </div>
      <!-- 表格（仅展示已签约订单） -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%"
        @row-click="handleView"
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
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button type="primary" size="small" @click="handleDelivery(row)">
              交车
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
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 交车弹窗 -->
    <el-dialog
      v-model="deliveryDialogVisible"
      title="交车确认"
      width="600px"
      :close-on-click-modal="false"
      @closed="handleDeliveryDialogClosed"
    >
      <div v-if="currentOrder">
        <el-descriptions :column="2" border size="small" style="margin-bottom: 20px">
          <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ currentOrder.customerName }}</el-descriptions-item>
          <el-descriptions-item label="车辆">{{ currentOrder.vehicleInfo }}</el-descriptions-item>
          <el-descriptions-item label="销售价">
            ¥{{ currentOrder.salePrice != null ? Number(currentOrder.salePrice).toLocaleString() : '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">交车检查清单</el-divider>
        <el-form
          ref="checklistFormRef"
          :model="checklistForm"
          label-width="auto"
        >
          <el-checkbox-group v-model="checklistForm.items" style="width: 100%">
            <div class="checklist-item">
              <el-checkbox label="wash" value="wash">
                <span class="checklist-label">车辆清洗</span>
              </el-checkbox>
              <span class="checklist-desc">确认车辆外观清洗干净，无污渍</span>
            </div>
            <div class="checklist-item">
              <el-checkbox label="pdi" value="pdi">
                <span class="checklist-label">PDI检测</span>
              </el-checkbox>
              <span class="checklist-desc">完成交车前PDI全车检测，无故障码</span>
            </div>
            <div class="checklist-item">
              <el-checkbox label="docs" value="docs">
                <span class="checklist-label">资料准备</span>
              </el-checkbox>
              <span class="checklist-desc">发票、合格证、保养手册、三包凭证等资料齐全</span>
            </div>
            <div class="checklist-item">
              <el-checkbox label="procedure" value="procedure">
                <span class="checklist-label">手续办理</span>
              </el-checkbox>
              <span class="checklist-desc">保险、临牌、购置税等手续已办理完毕</span>
            </div>
            <div class="checklist-item">
              <el-checkbox label="vas" value="vas">
                <span class="checklist-label">增值服务</span>
              </el-checkbox>
              <span class="checklist-desc">精品安装、功能讲解、延保等增值服务已确认</span>
            </div>
          </el-checkbox-group>

          <el-alert
            v-if="currentOrder"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 16px"
          >
            <template #title>
              已付定金：&yen;{{ (currentOrder.deposit != null ? Number(currentOrder.deposit) : 0).toLocaleString() }}
              &nbsp;&nbsp;|&nbsp;&nbsp;
              尾款金额：&yen;{{ getBalance(currentOrder).toLocaleString() }}
              （总金额 &yen;{{ currentOrder.totalAmount != null ? Number(currentOrder.totalAmount).toLocaleString() : '0' }} - 定金）
            </template>
            请确认尾款已收齐后再交车
          </el-alert>

          <el-divider content-position="left">交车信息</el-divider>

          <el-form-item label="交车日期" prop="deliveryDate">
            <el-date-picker
              v-model="checklistForm.deliveryDate"
              type="date"
              placeholder="选择交车日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="备注" prop="remark">
            <el-input
              v-model="checklistForm.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入交车备注"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="deliveryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="deliverySubmitLoading" @click="handleDeliverySubmit">
          确认交车
        </el-button>
      </template>
    </el-dialog>

    <!-- 新建交车弹窗 -->
    <el-dialog
      v-model="createOrderDialogVisible"
      title="新建交车"
      width="600px"
      :close-on-click-modal="false"
      @closed="handleCreateOrderDialogClosed"
    >
      <el-form
        ref="createOrderFormRef"
        :model="createOrderForm"
        :rules="createOrderRules"
        label-width="100px"
      >
        <el-form-item label="客户" prop="customerId">
          <el-select
            v-model="createOrderForm.customerId"
            filterable
            remote
            reserve-keyword
            placeholder="请输入客户姓名或电话搜索"
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

        <el-form-item label="车辆" prop="vehicleId">
          <el-select
            v-model="createOrderForm.vehicleId"
            filterable
            placeholder="请选择车辆"
            style="width: 100%"
          >
            <el-option
              v-for="v in vehicleOptions"
              :key="v.id"
              :label="`${v.brand} ${v.series} ${v.model} (${v.color || '-'})`"
              :value="v.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="销售价" prop="salePrice">
          <el-input-number
            v-model="createOrderForm.salePrice"
            :min="0"
            :precision="2"
            :controls="false"
            style="width: 100%"
            @change="onSalePriceChange"
          />
        </el-form-item>

        <el-form-item label="定金">
          <el-input-number
            v-model="createOrderForm.deposit"
            :min="0"
            :precision="2"
            :controls="false"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="总金额">
          <el-input-number
            v-model="createOrderForm.totalAmount"
            :min="0"
            :precision="2"
            :controls="false"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="支付方式">
          <el-select
            v-model="createOrderForm.paymentMethod"
            placeholder="请选择支付方式"
            clearable
            style="width: 100%"
          >
            <el-option label="现金" value="现金" />
            <el-option label="银行卡" value="银行卡" />
            <el-option label="微信" value="微信" />
            <el-option label="支付宝" value="支付宝" />
            <el-option label="会员卡" value="会员卡" />
            <el-option label="挂账" value="挂账" />
          </el-select>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="createOrderForm.remark"
            type="textarea"
            :rows="3"
            placeholder="选填"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createOrderDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createOrderSubmitLoading" @click="handleCreateOrderSubmit">
          确认创建
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
            <el-tag :type="detailRow.status === '已交付' ? 'success' : 'warning'" size="small">{{ detailRow.status || '-' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="品牌车系" :span="detailRow.vehicle ? 1 : 2">
            {{ detailRow.vehicle ? detailRow.vehicle.brand + ' ' + detailRow.vehicle.series : '-' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detailRow.vehicle?.vin" label="VIN码">{{ detailRow.vehicle.vin }}</el-descriptions-item>
          <el-descriptions-item label="销售价">&yen;{{ detailRow.salePrice != null ? Number(detailRow.salePrice).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="定金">&yen;{{ detailRow.deposit != null ? Number(detailRow.deposit).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="交车日期">{{ detailRow.deliveryDate ? formatDate(detailRow.deliveryDate) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="交车备注" :span="2">{{ detailRow.deliveryRemark || '-' }}</el-descriptions-item>
          <el-descriptions-item label="交车检查清单" :span="2">
            <template v-if="detailRow.deliveryChecklist && detailRow.deliveryChecklist.length > 0">
              <el-tag
                v-for="item in detailRow.deliveryChecklist"
                :key="item"
                size="small"
                type="success"
                style="margin-right: 6px; margin-bottom: 4px"
              >
                {{ getChecklistLabel(item) }}
              </el-tag>
            </template>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="尾款状态" :span="2">
            <span v-if="detailRow.totalAmount != null">
              总金额 &yen;{{ Number(detailRow.totalAmount).toLocaleString() }}
              - 定金 &yen;{{ (detailRow.deposit != null ? Number(detailRow.deposit) : 0).toLocaleString() }}
              = <strong>尾款 &yen;{{ getBalance(detailRow).toLocaleString() }}</strong>
              &nbsp;
              <el-tag :type="detailRow.status === '已交付' ? 'success' : 'warning'" size="small">
                {{ detailRow.status === '已交付' ? '已交付' : '未交付' }}
              </el-tag>
            </span>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import { downloadFile } from '@/utils/download'
import { useAuthStore } from '@/stores/auth'

// ==================== 类型定义 ====================
interface Order {
  id: number
  orderNo: string
  customerName: string
  vehicleInfo: string
  salePrice: number
  deposit: number
  totalAmount: number
  status: string
  deliveryDate: string | null
  deliveryChecklist: string[] | null
  deliveryRemark: string | null
  vehicle: {
    brand: string
    series: string
    vin: string
  } | null
}

interface ChecklistForm {
  items: string[]
  deliveryDate: string
  remark: string
}

// ==================== 搜索表单 ====================
const searchForm = reactive({
  keyword: '',
  status: '已签约',
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

// ==================== 交车弹窗 ====================
const deliveryDialogVisible = ref(false)
const deliverySubmitLoading = ref(false)
const currentOrder = ref<Order | null>(null)
const checklistFormRef = ref<FormInstance>()

const initChecklistForm = (): ChecklistForm => ({
  items: [],
  deliveryDate: '',
  remark: '',
})

const checklistForm = reactive<ChecklistForm>(initChecklistForm())

// ==================== 新建交车弹窗 ====================
const authStore = useAuthStore()
const createOrderDialogVisible = ref(false)
const createOrderSubmitLoading = ref(false)
const createOrderFormRef = ref<FormInstance>()
const customerSearchLoading = ref(false)
const customerOptions = ref<{ id: number; name: string; phone: string }[]>([])
const vehicleOptions = ref<{ id: number; brand: string; series: string; model: string; color: string | null }[]>([])

interface CreateOrderForm {
  customerId: number | null
  vehicleId: number | null
  salePrice: number
  deposit: number
  totalAmount: number
  paymentMethod: string
  remark: string
}

const createOrderForm = reactive<CreateOrderForm>({
  customerId: null,
  vehicleId: null,
  salePrice: 0,
  deposit: 0,
  totalAmount: 0,
  paymentMethod: '',
  remark: '',
})

const createOrderRules: FormRules = {
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  vehicleId: [{ required: true, message: '请选择车辆', trigger: 'change' }],
  salePrice: [{ required: true, message: '请输入销售价', trigger: 'blur' }],
}

/** 销售价变化时同步总金额 */
function onSalePriceChange(val: number | undefined) {
  createOrderForm.totalAmount = val ?? 0
}

/** 远程搜索客户 */
async function searchCustomers(query: string) {
  if (!query) {
    customerOptions.value = []
    return
  }
  customerSearchLoading.value = true
  try {
    const res: any = await request.get('/customers', { params: { keyword: query, page: 1, pageSize: 20 } })
    customerOptions.value = (res.list ?? []).map((c: any) => ({ id: c.id, name: c.name, phone: c.phone }))
  } catch {
    customerOptions.value = []
  } finally {
    customerSearchLoading.value = false
  }
}

/** 加载在库车辆列表 */
async function loadVehicles() {
  try {
    const res: any = await request.get('/sales/vehicles', { params: { stockStatus: '在库', page: 1, pageSize: 50 } })
    vehicleOptions.value = (res.list ?? []).map((v: any) => ({
      id: v.id,
      brand: v.brand,
      series: v.series,
      model: v.model,
      color: v.color,
    }))
  } catch {
    vehicleOptions.value = []
  }
}

/** 打开新建交车弹窗 */
function handleCreateOrder() {
  Object.assign(createOrderForm, {
    customerId: null,
    vehicleId: null,
    salePrice: 0,
    deposit: 0,
    totalAmount: 0,
    paymentMethod: '',
    remark: '',
  })
  customerOptions.value = []
  vehicleOptions.value = []
  createOrderDialogVisible.value = true
  loadVehicles()
}

/** 弹窗关闭后清理 */
function handleCreateOrderDialogClosed() {
  createOrderFormRef.value?.resetFields()
}

/** 提交新建订单 */
async function handleCreateOrderSubmit() {
  const valid = await createOrderFormRef.value?.validate().catch(() => false)
  if (!valid) return

  createOrderSubmitLoading.value = true
  try {
    await request.post('/sales/orders', {
      customerId: createOrderForm.customerId,
      vehicleId: createOrderForm.vehicleId,
      salePrice: createOrderForm.salePrice,
      deposit: createOrderForm.deposit || 0,
      totalAmount: createOrderForm.totalAmount || createOrderForm.salePrice,
      paymentMethod: createOrderForm.paymentMethod || undefined,
      status: '已签约',
      salesId: authStore.userInfo?.id ?? 0,
    })
    ElMessage.success('订单创建成功')
    createOrderDialogVisible.value = false
    fetchData()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    createOrderSubmitLoading.value = false
  }
}

// ==================== 方法 ====================

/** 获取订单列表 */
async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (searchForm.status) params.status = searchForm.status
    if (searchForm.keyword) params.keyword = searchForm.keyword
    const res: any = await request.get('/sales/orders', { params })
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

/** 重置搜索条件 */
function handleReset() {
  searchForm.keyword = ''
  searchForm.status = '已签约'
  pagination.page = 1
  fetchData()
}

/** 格式化日期 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  // 兼容 ISO 日期字符串
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 计算尾款 */
function getBalance(order: Pick<Order, 'totalAmount' | 'deposit'>): number {
  const total = order.totalAmount != null ? Number(order.totalAmount) : 0
  const deposit = order.deposit != null ? Number(order.deposit) : 0
  return Math.max(0, total - deposit)
}

/** 交车检查清单标签映射 */
const checklistLabelMap: Record<string, string> = {
  wash: '车辆清洗',
  pdi: 'PDI检测',
  docs: '资料准备',
  procedure: '手续办理',
  vas: '增值服务',
}

function getChecklistLabel(key: string): string {
  return checklistLabelMap[key] || key
}

/** 点击交车按钮 */
function handleDelivery(row: Order) {
  currentOrder.value = row
  Object.assign(checklistForm, initChecklistForm())
  deliveryDialogVisible.value = true
}

/** 交车弹窗关闭后清理 */
function handleDeliveryDialogClosed() {
  checklistFormRef.value?.resetFields()
}

/** 确认交车 */
async function handleDeliverySubmit() {
  if (!currentOrder.value) return

  // 校验至少勾选一项
  if (checklistForm.items.length === 0) {
    ElMessage.warning('请至少完成一项交车检查项目')
    return
  }

  deliverySubmitLoading.value = true
  try {
    await request.put(`/sales/orders/${currentOrder.value.id}/delivery`, {
      checklist: checklistForm.items,
      deliveryDate: checklistForm.deliveryDate,
      remark: checklistForm.remark,
    })
    ElMessage.success('交车成功')
    deliveryDialogVisible.value = false
    fetchData()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    deliverySubmitLoading.value = false
  }
}

// ==================== 详情抽屉 ====================
const detailDrawerVisible = ref(false)
const detailRow = ref<Order | null>(null)

function handleView(row: Order) {
  detailRow.value = row
  detailDrawerVisible.value = true
}

// ==================== 生命周期 ====================

function handleExport() {
  downloadFile('/api/export/excel?module=delivery', '交车管理.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

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
}
.search-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}
.search-bar-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0;
}
.search-bar-right {
  display: flex;
  align-items: center;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.checklist-item {
  display: flex;
  flex-direction: column;
  padding: 10px 0;
  border-bottom: 1px solid #ebeef5;
}
.checklist-item:last-child {
  border-bottom: none;
}
.checklist-label {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}
.checklist-desc {
  font-size: 12px;
  color: #909399;
  margin-left: 24px;
  margin-top: 2px;
}
</style>
