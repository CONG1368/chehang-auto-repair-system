<template>
  <div class="page-container">
    <div class="page-header">
      <h2>维修工单管理</h2>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card">
      <div class="search-bar">
        <el-input
          v-model="searchForm.keyword"
          placeholder="工单号 / 车牌号 / 客户姓名"
          clearable
          class="search-input"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="searchForm.status"
          placeholder="工单状态"
          clearable
          class="search-select"
          @change="handleSearch"
        >
          <el-option label="全部" value="" />
          <el-option label="待派工" value="pending" />
          <el-option label="已派工" value="assigned" />
          <el-option label="维修中" value="repairing" />
          <el-option label="待质检" value="quality_check" />
          <el-option label="已完成" value="completed" />
          <el-option label="已交车" value="delivered" />
        </el-select>
        <el-date-picker
          v-model="searchForm.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          class="search-date"
          @change="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button type="success" plain @click="handleExportExcel">📥 导出Excel</el-button>
        <el-button @click="handleExportPdf">📄 导出PDF</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </el-card>

    <!-- 表格 -->
    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%; cursor: pointer"
        @row-click="handleView"
      >
        <el-table-column prop="orderNo" label="工单号" min-width="160" show-overflow-tooltip />
        <el-table-column prop="plateNumber" label="车牌号" min-width="110" />
        <el-table-column prop="customerName" label="客户姓名" min-width="100" />
        <el-table-column prop="vehicleModel" label="车型" min-width="140" show-overflow-tooltip />
        <el-table-column label="维修项目数" width="100" align="center">
          <template #default="{ row }">
            {{ row._count?.items ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column label="工时费(¥)" width="110" align="right">
          <template #default="{ row }">
            <span class="amount">{{ formatMoney(row.totalLaborFee) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="配件费(¥)" width="110" align="right">
          <template #default="{ row }">
            <span class="amount">{{ formatMoney(row.totalPartFee) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="总金额(¥)" width="120" align="right">
          <template #default="{ row }">
            <span class="amount-total">¥{{ formatMoney(row.totalAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-bind="getStatusTagProps(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="服务顾问" min-width="100">
          <template #default="{ row }">
            {{ row.advisor?.realName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="160" />
        <el-table-column label="操作" width="230" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              type="primary"
              link
              size="small"
              @click="handleDispatch(row)"
            >
              派工
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="warning"
              link
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status === 'quality_check'"
              type="success"
              link
              size="small"
              @click="handleQualityCheck(row)"
            >
              质检
            </el-button>
            <el-button
              v-if="row.status === 'completed'"
              type="success"
              link
              size="small"
              @click="handleDeliver(row)"
            >
              交车
            </el-button>
            <el-button type="primary" link size="small" @click="handleView(row)">
              {{ row.status === 'assigned' || row.status === 'repairing' ? '查看详情' : '查看' }}
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap">
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

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="工单详情"
      size="760px"
      destroy-on-close
      @closed="handleDrawerClosed"
    >
      <div v-if="detail" class="drawer-content">
        <el-tabs v-model="activeTab">
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息" name="info">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="工单号">{{ detail.orderNo }}</el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag v-bind="getStatusTagProps(detail.status)" size="small">
                  {{ getStatusLabel(detail.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="客户姓名">{{ detail.customer?.name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ detail.customer?.phone || '-' }}</el-descriptions-item>
              <el-descriptions-item label="车牌号">{{ detail.plateNumber || '-' }}</el-descriptions-item>
              <el-descriptions-item label="车型">{{ detail.vehicleModel || '-' }}</el-descriptions-item>
              <el-descriptions-item label="行驶里程">
                {{ detail.mileage ? detail.mileage.toLocaleString() + ' 公里' : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="服务顾问">{{ detail.advisor?.realName || '-' }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ detail.createdAt || '-' }}</el-descriptions-item>
              <el-descriptions-item label="故障描述" :span="2">
                {{ detail.faultDesc || '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- 维修项目列表 -->
          <el-tab-pane label="维修项目" name="items">
            <el-table
              v-if="detail.items && detail.items.length > 0"
              :data="detail.items"
              border
              stripe
              style="width: 100%"
            >
              <el-table-column prop="name" label="项目名称" min-width="160" show-overflow-tooltip />
              <el-table-column label="类型" width="90" align="center">
                <template #default="{ row: item }">
                  <el-tag size="small">{{ item.type === 'labor' ? '工时' : item.type === 'part' ? '配件' : item.type || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="工时费(¥)" width="110" align="right">
                <template #default="{ row: item }">
                  {{ formatMoney(item.laborFee) }}
                </template>
              </el-table-column>
              <el-table-column label="配件费(¥)" width="110" align="right">
                <template #default="{ row: item }">
                  {{ formatMoney(item.partFee) }}
                </template>
              </el-table-column>
              <el-table-column label="小计(¥)" width="110" align="right">
                <template #default="{ row: item }">
                  {{ formatMoney(item.amount) }}
                </template>
              </el-table-column>
              <el-table-column label="状态" width="90" align="center">
                <template #default="{ row: item }">
                  <el-tag :type="getItemStatusTagType(item.status)" size="small">
                    {{ getItemStatusLabel(item.status) }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="暂无维修项目" />
          </el-tab-pane>

          <!-- 派工记录 -->
          <el-tab-pane label="派工记录" name="dispatch">
            <el-timeline v-if="detail.dispatchRecords && detail.dispatchRecords.length > 0">
              <el-timeline-item
                v-for="item in detail.dispatchRecords"
                :key="item.id"
                :timestamp="item.createdAt"
                placement="top"
              >
                <el-card shadow="hover">
                  <p class="record-line">
                    <span class="record-label">维修技师：</span>
                    <span>{{ item.technician?.realName || '-' }}</span>
                  </p>
                  <p class="record-line">
                    <span class="record-label">标准工时：</span>
                    <span>{{ item.standardHours ? item.standardHours + 'h' : '-' }}</span>
                  </p>
                  <p class="record-line">
                    <span class="record-label">备注：</span>
                    <span>{{ item.remark || '-' }}</span>
                  </p>
                </el-card>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无派工记录" />
          </el-tab-pane>

          <!-- 质检记录 -->
          <el-tab-pane label="质检记录" name="quality">
            <template v-if="detail.qualityCheck">
              <el-card shadow="hover">
                <el-descriptions :column="2" border size="small">
                  <el-descriptions-item label="质检时间">{{ detail.qualityCheck.createdAt || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="结果">
                    <el-tag :type="detail.qualityCheck.isPassed ? 'success' : 'danger'" size="small">
                      {{ detail.qualityCheck.isPassed ? '合格' : '不合格' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="路试">{{ detail.qualityCheck.roadTest || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="备注">{{ detail.qualityCheck.remark || '-' }}</el-descriptions-item>
                  <el-descriptions-item v-if="detail.qualityCheck.itemsChecked && detail.qualityCheck.itemsChecked.length > 0" label="检查项" :span="2">
                    <el-tag v-for="(ci, idx) in detail.qualityCheck.itemsChecked" :key="idx" size="small" style="margin:2px 4px 2px 0">{{ ci }}</el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </el-card>
            </template>
            <el-empty v-else description="暂无质检记录" />
          </el-tab-pane>

          <!-- 费用明细 -->
          <el-tab-pane label="费用明细" name="cost">
            <el-descriptions :column="1" border class="cost-summary">
              <el-descriptions-item label="工时费合计">
                <span class="amount">¥{{ formatMoney(detail.totalLaborFee) }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="配件费合计">
                <span class="amount">¥{{ formatMoney(detail.totalPartFee) }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="优惠金额">
                <span class="amount">¥{{ formatMoney(detail.discount) }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="最终金额">
                <span class="amount-total" style="font-size: 16px">¥{{ formatMoney(detail.finalAmount) }}</span>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
        </el-tabs>
        <el-button type="primary" @click="handlePrintOrder">🖨️ 打印施工单</el-button>
      </div>
    </el-drawer>

    <!-- 编辑工单弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑工单"
      width="560px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editFormRules"
        label-width="90px"
      >
        <el-form-item label="工单号"><span>{{ editTarget?.orderNo }}</span></el-form-item>
        <el-form-item label="车牌号" prop="plateNumber">
          <el-input v-model="editForm.plateNumber" placeholder="请输入车牌号" />
        </el-form-item>
        <el-form-item label="车型" prop="vehicleModel">
          <el-input v-model="editForm.vehicleModel" placeholder="请输入车型" />
        </el-form-item>
        <el-form-item label="里程(km)" prop="mileage">
          <el-input-number v-model="editForm.mileage" :min="0" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="故障描述" prop="faultDesc">
          <el-input v-model="editForm.faultDesc" type="textarea" :rows="3" placeholder="请输入故障描述" />
        </el-form-item>
        <el-form-item label="优惠(¥)" prop="discount">
          <el-input-number v-model="editForm.discount" :min="0" :precision="2" controls-position="right" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最终金额">
          <span class="amount-total" style="font-size:16px">¥{{ formatMoney(editComputedAmount) }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="handleEditSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 派工弹窗 -->
    <el-dialog
      v-model="dispatchDialogVisible"
      title="派工"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="dispatchFormRef"
        :model="dispatchForm"
        :rules="dispatchFormRules"
        label-width="90px"
      >
        <el-form-item label="工单号">
          <span>{{ dispatchTarget?.orderNo }}</span>
        </el-form-item>
        <el-form-item label="维修技师" prop="technicianId">
          <el-select
            v-model="dispatchForm.technicianId"
            placeholder="请选择维修技师"
            style="width: 100%"
          >
            <el-option
              v-for="tech in technicianList"
              :key="tech.id"
              :label="tech.name"
              :value="tech.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="dispatchForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入派工备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dispatchDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dispatchLoading" @click="handleDispatchSubmit">
          确定派工
        </el-button>
      </template>
    </el-dialog>

    <!-- 质检弹窗 -->
    <el-dialog
      v-model="qcDialogVisible"
      title="质检"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="qcFormRef"
        :model="qcForm"
        :rules="qcFormRules"
        label-width="90px"
      >
        <el-form-item label="工单号">
          <span>{{ qcTarget?.orderNo }}</span>
        </el-form-item>
        <el-form-item label="质检结果" prop="result">
          <el-radio-group v-model="qcForm.result">
            <el-radio value="pass">合格</el-radio>
            <el-radio value="fail">不合格</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="qcForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入质检备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="qcDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="qcLoading" @click="handleQcSubmit">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, h, createApp } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import { printHtml } from '@/utils/print'
import { downloadFile } from '@/utils/download'
import { exportTableToPdf } from '@/utils/export-pdf'
import RepairOrderPrint from '@/components/PrintTemplate/RepairOrderPrint.vue'

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

interface RepairOrder {
  id: number
  orderNo: string
  plateNumber: string
  customerName: string
  vehicleModel: string
  mileage?: number
  faultDesc?: string
  discount?: number
  _count?: { items: number }
  totalLaborFee: number
  totalPartFee: number
  totalAmount: number
  status: string
  advisor?: { realName: string }
  createdAt: string
}

interface RepairItem {
  id: number
  name: string
  type: string
  laborFee: number
  partFee: number
  amount: number
  status: string
}

interface DispatchRecord {
  id: number
  technician?: { realName: string }
  standardHours?: number
  createdAt: string
  remark?: string
}

interface RepairOrderDetail {
  id: number
  orderNo: string
  customer?: { name: string; phone: string }
  plateNumber: string
  vehicleModel: string
  mileage: number
  advisor?: { realName: string }
  status: string
  createdAt: string
  faultDesc: string
  items: RepairItem[]
  dispatchRecords: DispatchRecord[]
  qualityCheck?: {
    id: number
    isPassed: boolean
    roadTest?: string
    itemsChecked?: string[]
    remark?: string
    createdAt: string
  }
  totalLaborFee: number
  totalPartFee: number
  totalAmount: number
  discount: number
  finalAmount: number
}

interface Technician {
  id: number
  name: string
}

interface ListResponse {
  list: RepairOrder[]
  total: number
}

// ==================== 搜索 ====================

const searchForm = reactive({
  keyword: '',
  status: '',
  dateRange: [] as string[],
})

const handleSearch = () => {
  pagination.page = 1
  fetchList()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.status = ''
  searchForm.dateRange = []
  handleSearch()
}

// ==================== 分页 ====================

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 表格 ====================

const tableData = ref<RepairOrder[]>([])
const loading = ref(false)

const fetchList = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (searchForm.keyword.trim()) {
      params.keyword = searchForm.keyword.trim()
    }
    if (searchForm.status) {
      params.status = searchForm.status
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    const res = await request.get<any, ListResponse>('/repair', { params })
    tableData.value = res.list || []
    pagination.total = res.total || 0
  } catch {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false
  }
}

// ==================== 详情抽屉 ====================

const drawerVisible = ref(false)
const detail = ref<RepairOrderDetail | null>(null)
const activeTab = ref('info')

const handleView = async (row: RepairOrder) => {
  drawerVisible.value = true
  activeTab.value = 'info'
  detail.value = null
  try {
    const res = await request.get<any, RepairOrderDetail>(`/repair/${row.id}`)
    detail.value = res
  } catch {
    drawerVisible.value = false
  }
}

const handleDrawerClosed = () => {
  detail.value = null
  activeTab.value = 'info'
}

// ==================== 编辑 ====================

const editDialogVisible = ref(false)
const editLoading = ref(false)
const editTarget = ref<RepairOrder | null>(null)
const editFormRef = ref<FormInstance>()

interface EditForm {
  plateNumber: string
  vehicleModel: string
  mileage: number | null
  faultDesc: string
  discount: number
}

const editForm = reactive<EditForm>({
  plateNumber: '',
  vehicleModel: '',
  mileage: null,
  faultDesc: '',
  discount: 0,
})

const editFormRules: FormRules = {
  plateNumber: [{ required: true, message: '请输入车牌号', trigger: 'blur' }],
}

const editComputedAmount = computed(() => {
  if (!editTarget.value) return 0
  const total = Number(editTarget.value.totalAmount) || 0
  return Math.max(0, total - editForm.discount)
})

const handleEdit = (row: RepairOrder) => {
  editTarget.value = row
  editForm.plateNumber = row.plateNumber || ''
  editForm.vehicleModel = row.vehicleModel || ''
  editForm.mileage = (row as any).mileage ?? null
  editForm.faultDesc = row.faultDesc || ''
  editForm.discount = Number(row.discount) || 0
  editDialogVisible.value = true
}

const handleEditSubmit = async () => {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return

  editLoading.value = true
  try {
    await request.put(`/repair/${editTarget.value!.id}`, {
      plateNumber: editForm.plateNumber,
      vehicleModel: editForm.vehicleModel,
      mileage: editForm.mileage,
      faultDesc: editForm.faultDesc,
      discount: editForm.discount,
      finalAmount: editComputedAmount.value,
    })
    ElMessage.success('工单更新成功')
    editDialogVisible.value = false
    fetchList()
    // 如果详情抽屉打开着，也刷新详情
    if (detail.value && detail.value.id === editTarget.value!.id) {
      const res = await request.get<any, RepairOrderDetail>(`/repair/${editTarget.value!.id}`)
      detail.value = res
    }
  } catch {
    // 错误已在拦截器中处理
  } finally {
    editLoading.value = false
  }
}

// ==================== 派工 ====================

const dispatchDialogVisible = ref(false)
const dispatchTarget = ref<RepairOrder | null>(null)
const dispatchLoading = ref(false)
const dispatchFormRef = ref<FormInstance>()
const technicianList = ref<Technician[]>([])

const dispatchForm = reactive({
  technicianId: null as number | null,
  remark: '',
})

const dispatchFormRules: FormRules = {
  technicianId: [{ required: true, message: '请选择维修技师', trigger: 'change' }],
}

const fetchTechnicians = async () => {
  try {
    const res = await request.get<any, Technician[]>('/users/technicians')
    technicianList.value = res || []
  } catch {
    // 错误已在拦截器中处理
  }
}

const handleDispatch = async (row: RepairOrder) => {
  dispatchTarget.value = row
  dispatchForm.technicianId = null
  dispatchForm.remark = ''
  if (technicianList.value.length === 0) {
    await fetchTechnicians()
  }
  dispatchDialogVisible.value = true
}

const handleDispatchSubmit = async () => {
  const valid = await dispatchFormRef.value?.validate().catch(() => false)
  if (!valid) return

  dispatchLoading.value = true
  try {
    await request.post('/repair/dispatch', {
      repairOrderId: dispatchTarget.value!.id,
      technicianId: dispatchForm.technicianId,
      remark: dispatchForm.remark || undefined,
    })
    ElMessage.success('派工成功')
    dispatchDialogVisible.value = false
    fetchList()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    dispatchLoading.value = false
  }
}

// ==================== 质检 ====================

const qcDialogVisible = ref(false)
const qcTarget = ref<RepairOrder | null>(null)
const qcLoading = ref(false)
const qcFormRef = ref<FormInstance>()

const qcForm = reactive({
  result: 'pass',
  remark: '',
})

const qcFormRules: FormRules = {
  result: [{ required: true, message: '请选择质检结果', trigger: 'change' }],
}

const handleQualityCheck = (row: RepairOrder) => {
  qcTarget.value = row
  qcForm.result = 'pass'
  qcForm.remark = ''
  qcDialogVisible.value = true
}

const handleQcSubmit = async () => {
  const valid = await qcFormRef.value?.validate().catch(() => false)
  if (!valid) return

  qcLoading.value = true
  try {
    const newStatus = qcForm.result === 'pass' ? 'completed' : 'repairing'
    await request.put(`/repair/${qcTarget.value!.id}/status`, {
      status: newStatus,
      qualityResult: qcForm.result,
      remark: qcForm.remark || undefined,
    })
    ElMessage.success(qcForm.result === 'pass' ? '质检通过，工单已完成' : '质检不通过，已退回维修中')
    qcDialogVisible.value = false
    fetchList()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    qcLoading.value = false
  }
}

// ==================== 交车 ====================

const handleDeliver = (row: RepairOrder) => {
  ElMessageBox.confirm(
    `确认对工单「${row.orderNo}」进行交车操作吗？`,
    '交车确认',
    {
      confirmButtonText: '确认交车',
      cancelButtonText: '取消',
      type: 'success',
    },
  )
    .then(async () => {
      try {
        await request.put(`/repair/${row.id}/deliver`)
        ElMessage.success('交车成功')
        fetchList()
      } catch {
        // 错误已在拦截器中处理
      }
    })
    .catch(() => {
      // 用户取消
    })
}

/** 删除 */
const handleDelete = (row: RepairOrder) => {
  ElMessageBox.confirm(`确定删除工单「${row.orderNo}」吗？删除后不可恢复。`, '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        await request.delete(`/repair/${row.id}`)
        ElMessage.success('删除成功')
        fetchList()
      } catch {
        // 错误已在拦截器中处理
      }
    })
    .catch(() => {})
}

// ==================== 状态工具函数 ====================

const statusLabelMap: Record<string, string> = {
  pending: '待派工',
  assigned: '已派工',
  repairing: '维修中',
  quality_check: '待质检',
  completed: '已完成',
  delivered: '已交车',
}

const getStatusLabel = (status: string): string => {
  return statusLabelMap[status] || status
}

const getStatusTagProps = (status: string): Record<string, string> => {
  const map: Record<string, Record<string, string>> = {
    pending: { type: 'info' },
    assigned: { type: '' },
    repairing: { type: 'warning' },
    quality_check: { color: '#9b59b6' },
    completed: { type: 'success' },
    delivered: { type: 'success', effect: 'dark' },
  }
  return map[status] || { type: 'info' }
}

const itemStatusLabelMap: Record<string, string> = {
  pending: '待维修',
  ongoing: '维修中',
  completed: '已完成',
}

const getItemStatusLabel = (status: string): string => {
  return itemStatusLabelMap[status] || status
}

const itemStatusTagTypeMap: Record<string, string> = {
  pending: 'info',
  ongoing: 'warning',
  completed: 'success',
}

const getItemStatusTagType = (status: string): string => {
  return itemStatusTagTypeMap[status] || 'info'
}

const formatMoney = (val?: number): string => {
  if (val === undefined || val === null) return '0.00'
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ==================== 导出与打印 ====================

function handleExportExcel() {
  downloadFile('/api/export/excel?module=repair', '维修工单.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

function handleExportPdf() {
  exportTableToPdf(
    '维修工单',
    [
      { header: '工单号', dataKey: 'orderNo' },
      { header: '客户', dataKey: 'customerName' },
      { header: '车牌', dataKey: 'plateNumber' },
      { header: '状态', dataKey: 'status' },
      { header: '总金额', dataKey: 'totalAmount' },
      { header: '创建时间', dataKey: 'createdAt' },
    ],
    tableData.value,
    '维修工单',
  )
}

async function handlePrintOrder() {
  if (!detail.value) {
    ElMessage.warning('请先查看工单详情')
    return
  }
  const d = detail.value
  const printData = {
    orderNo: d.orderNo,
    customerName: d.customer?.name || '-',
    customerPhone: d.customer?.phone || '-',
    plateNumber: d.plateNumber,
    vehicleModel: d.vehicleModel,
    mileage: d.mileage,
    serviceAdvisor: d.advisor?.realName || '-',
    description: d.faultDesc || '-',
    repairItems: d.items || [],
    partsList: (d.items || []).filter((i: any) => i.partFee > 0).map((i: any) => ({
      name: i.name, quantity: 1, unitPrice: i.partFee || 0, totalPrice: i.partFee || 0
    })),
    totalAmount: d.totalAmount,
    createTime: d.createdAt,
  }
  const loadingMsg = ElMessage({ message: '正在生成打印内容...', type: 'info', duration: 0 })
  try {
    const container = document.createElement('div')
    const safeData = deepEscape(printData)
    const app = createApp({ render: () => h(RepairOrderPrint, { data: safeData }) })
    app.mount(container)
    await new Promise(r => setTimeout(r, 150))
    const html = container.innerHTML
    app.unmount()
    if (!html || html.trim() === '') {
      loadingMsg.close()
      ElMessage.error('打印内容为空，请检查工单数据')
      return
    }
    printHtml(html)
    loadingMsg.close()
  } catch (e: any) {
    loadingMsg.close()
    console.error('打印失败:', e)
    ElMessage.error('打印失败：' + (e?.message || '未知错误'))
  }
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
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.search-input {
  width: 300px;
}

.search-select {
  width: 160px;
}

.search-date {
  width: 280px;
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

.amount-total {
  color: #f56c6c;
  font-weight: 600;
}

.drawer-content {
  padding: 0 8px;
}

.record-line {
  display: flex;
  align-items: flex-start;
  margin-bottom: 6px;
  line-height: 1.6;
}

.record-line:last-child {
  margin-bottom: 0;
}

.record-label {
  flex-shrink: 0;
  color: #909399;
  font-size: 13px;
}

.cost-summary {
  margin-bottom: 20px;
}

.sub-title {
  font-size: 14px;
  color: #303133;
  margin: 0 0 12px 0;
}
</style>
