<template>
  <div class="page-container">
    <div class="page-header">
      <h2>应收应付</h2>
    </div>

    <!-- 顶部汇总卡片 -->
    <el-row :gutter="16" class="summary-row">
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card" @click="activeTab = 'receivable'; receivableStatusFilter = ''; fetchReceivables()">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #409eff20; color: #409eff">
              <el-icon size="28"><Money /></el-icon>
            </div>
            <div class="summary-info">
              <p class="summary-label">总应收</p>
              <p class="summary-value">¥{{ formatMoney(receivableSummary.totalReceivable) }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card" @click="activeTab = 'receivable'; receivableStatusFilter = ''; fetchReceivables()">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #67c23a20; color: #67c23a">
              <el-icon size="28"><CircleCheck /></el-icon>
            </div>
            <div class="summary-info">
              <p class="summary-label">已收</p>
              <p class="summary-value">¥{{ formatMoney(receivableSummary.totalPaid) }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card" @click="activeTab = 'receivable'; receivableStatusFilter = 'pending'; fetchReceivables()">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #e6a23c20; color: #e6a23c">
              <el-icon size="28"><Warning /></el-icon>
            </div>
            <div class="summary-info">
              <p class="summary-label">未收</p>
              <p class="summary-value">¥{{ formatMoney(receivableSummary.totalUnpaid) }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="summary-card" @click="activeTab = 'receivable'; receivableStatusFilter = ''; fetchReceivables()">
          <div class="summary-inner">
            <div class="summary-icon" style="background-color: #f56c6c20; color: #f56c6c">
              <el-icon size="28"><Clock /></el-icon>
            </div>
            <div class="summary-info">
              <p class="summary-label">逾期金额</p>
              <p class="summary-value danger">¥{{ formatMoney(receivableSummary.overdueAmount) }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 选项卡 -->
    <el-card>
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 应收账款 -->
        <el-tab-pane label="应收账款" name="receivable">
          <div class="tab-toolbar">
            <el-select
              v-model="receivableStatusFilter"
              placeholder="状态筛选"
              clearable
              style="width: 140px"
              @change="fetchReceivables"
            >
              <el-option label="全部" value="" />
              <el-option label="未付" value="pending" />
              <el-option label="已付" value="paid" />
            </el-select>
            <el-input
              v-model="receivableSearch"
              placeholder="搜索客户名称"
              clearable
              style="width: 200px"
              class="tab-search"
              @keyup.enter="fetchReceivables"
              @clear="fetchReceivables"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="fetchReceivables">查询</el-button>
            <el-button type="primary" @click="handleOpenCreate">
              <el-icon><Plus /></el-icon>新增应收
            </el-button>
            <el-button type="success" @click="handleExportReceivable">
              <el-icon><Download /></el-icon>导出Excel
            </el-button>
          </div>

          <el-table
            v-loading="receivableLoading"
            :data="receivableList"
            border
            stripe
            style="width: 100%; margin-top: 16px"
            @row-click="(row: any) => handleDetail(row, 'receivable')"
          >
            <el-table-column label="客户" min-width="120">
              <template #default="{ row }">
                {{ row.customer?.name || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="应收金额(¥)" min-width="120" align="right">
              <template #default="{ row }">
                <span class="amount-total">¥{{ formatMoney(row.amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="已付(¥)" min-width="110" align="right">
              <template #default="{ row }">
                <span class="amount-paid">¥{{ formatMoney(row.paidAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="未付(¥)" min-width="110" align="right">
              <template #default="{ row }">
                <span class="amount-unpaid">¥{{ formatMoney(row.unpaidAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="dueDate" label="账期" min-width="110" />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row)" size="small">
                  {{ getStatusLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="210" align="center" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handleDetail(row, 'receivable')">
                  详情
                </el-button>
                <el-button type="warning" link size="small" @click="handleEditReceivable(row)">
                  编辑
                </el-button>
                <el-button type="danger" link size="small" @click="handleDeleteReceivable(row)">
                  删除
                </el-button>
                <el-button
                  v-if="row.unpaidAmount > 0"
                  type="primary"
                  link
                  size="small"
                  @click="handleRepay(row)"
                >
                  还款
                </el-button>
                <span v-else class="text-success">已结清</span>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="receivablePagination.page"
              v-model:page-size="receivablePagination.pageSize"
              :page-sizes="[10, 20, 50]"
              :total="receivablePagination.total"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchReceivables"
              @current-change="fetchReceivables"
            />
          </div>
        </el-tab-pane>

        <!-- 应付账款 -->
        <el-tab-pane label="应付账款" name="payable">
          <div class="tab-toolbar">
            <el-input
              v-model="payableSearch"
              placeholder="搜索供应商名称"
              clearable
              style="width: 200px"
              class="tab-search"
              @keyup.enter="fetchPayables"
              @clear="fetchPayables"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="fetchPayables">查询</el-button>
            <el-button type="success" @click="handleExportPayable">
              <el-icon><Download /></el-icon>导出Excel
            </el-button>
          </div>

          <el-table
            v-loading="payableLoading"
            :data="filteredPayableList"
            border
            stripe
            style="width: 100%; margin-top: 16px"
            @row-click="(row: any) => handleDetail(row, 'payable')"
          >
            <el-table-column label="供应商" min-width="150">
              <template #default="{ row }">
                {{ row.supplier?.name || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="应付金额(¥)" min-width="120" align="right">
              <template #default="{ row }">
                <span class="amount-total">¥{{ formatMoney(row.amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="已付(¥)" min-width="110" align="right">
              <template #default="{ row }">
                <span class="amount-paid">¥{{ formatMoney(row.paidAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="未付(¥)" min-width="110" align="right">
              <template #default="{ row }">
                <span class="amount-unpaid">¥{{ formatMoney(row.unpaidAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="dueDate" label="到期日" min-width="110" />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="getPayableStatusTagType(row)" size="small">
                  {{ getPayableStatusLabel(row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.remark || '-' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" align="center" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handleDetail(row, 'payable')">
                  详情
                </el-button>
                <el-button type="warning" link size="small" @click="handleEditPayable(row)">
                  编辑
                </el-button>
                <el-button type="danger" link size="small" @click="handleDeletePayable(row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="payablePagination.page"
              v-model:page-size="payablePagination.pageSize"
              :page-sizes="[10, 20, 50]"
              :total="payablePagination.total"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchPayables"
              @current-change="fetchPayables"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="drawerTitle"
      size="480px"
      :close-on-click-modal="false"
    >
      <template v-if="detailRow">
        <el-descriptions :column="1" border size="default">
          <template v-if="detailType === 'receivable'">
            <el-descriptions-item label="客户">{{ detailRow.customer?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="应收金额">¥{{ formatMoney(detailRow.amount) }}</el-descriptions-item>
            <el-descriptions-item label="已付金额">¥{{ formatMoney(detailRow.paidAmount) }}</el-descriptions-item>
            <el-descriptions-item label="未付金额">¥{{ formatMoney(detailRow.unpaidAmount) }}</el-descriptions-item>
            <el-descriptions-item label="账期">{{ detailRow.dueDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="getStatusTagType(detailRow)" size="small">
                {{ getStatusLabel(detailRow) }}
              </el-tag>
            </el-descriptions-item>
          </template>
          <template v-else>
            <el-descriptions-item label="供应商">{{ detailRow.supplier?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="应付金额">¥{{ formatMoney(detailRow.amount) }}</el-descriptions-item>
            <el-descriptions-item label="已付金额">¥{{ formatMoney(detailRow.paidAmount) }}</el-descriptions-item>
            <el-descriptions-item label="未付金额">¥{{ formatMoney(detailRow.unpaidAmount) }}</el-descriptions-item>
            <el-descriptions-item label="到期日">{{ detailRow.dueDate || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="getPayableStatusTagType(detailRow)" size="small">
                {{ getPayableStatusLabel(detailRow) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="备注">{{ detailRow.remark || '-' }}</el-descriptions-item>
          </template>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button @click="drawerVisible = false">关闭</el-button>
      </template>
    </el-drawer>

    <!-- 还款弹窗 -->
    <el-dialog
      v-model="repayDialogVisible"
      title="还款"
      width="450px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="repayFormRef"
        :model="repayForm"
        :rules="repayFormRules"
        label-width="90px"
      >
        <el-form-item label="客户">
          <span>{{ repayTarget?.customer?.name || '-' }}</span>
        </el-form-item>
        <el-form-item label="未付金额">
          <span class="amount-unpaid" style="font-size:16px">¥{{ formatMoney(repayTarget?.unpaidAmount) }}</span>
        </el-form-item>
        <el-form-item label="还款金额(¥)" prop="amount">
          <el-input-number
            v-model="repayForm.amount"
            :min="0.01"
            :max="repayTarget?.unpaidAmount ?? 0"
            :precision="2"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入还款金额"
          />
        </el-form-item>
        <el-form-item label="支付方式" prop="payMethod">
          <el-select v-model="repayForm.payMethod" placeholder="请选择支付方式" style="width: 100%">
            <el-option label="现金" value="cash" />
            <el-option label="银行卡" value="card" />
            <el-option label="微信" value="wechat" />
            <el-option label="支付宝" value="alipay" />
            <el-option label="对公转账" value="bank_transfer" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="repayForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="repayDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="repayLoading" @click="handleRepaySubmit">
          确认还款
        </el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑应收弹窗 -->
    <el-dialog
      v-model="createDialogVisible"
      :title="isEditReceivable ? '编辑应收' : '新增应收'"
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
        <el-form-item label="客户" prop="customerId">
          <el-select
            v-model="createForm.customerId"
            filterable
            remote
            reserve-keyword
            placeholder="请输入客户姓名搜索"
            :remote-method="searchCustomers"
            :loading="customerSearchLoading"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="item in customerOptions"
              :key="item.id"
              :label="`${item.name} (${item.phone || '无电话'})`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="应收金额(¥)" prop="amount">
          <el-input-number
            v-model="createForm.amount"
            :min="0.01"
            :precision="2"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入应收金额"
          />
        </el-form-item>
        <el-form-item label="来源类型" prop="source">
          <el-select v-model="createForm.source" placeholder="请选择来源类型" style="width: 100%" clearable>
            <el-option label="维修" value="维修" />
            <el-option label="销售" value="销售" />
            <el-option label="美容" value="美容" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源单号" prop="sourceNo">
          <el-input
            v-model="createForm.sourceNo"
            placeholder="请输入来源单号"
            clearable
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="createForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreateOrUpdate">
          确认
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑应付弹窗 -->
    <el-dialog
      v-model="editPayableDialogVisible"
      title="编辑应付"
      width="500px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="editPayableFormRef"
        :model="editPayableForm"
        :rules="editPayableFormRules"
        label-width="90px"
      >
        <el-form-item label="供应商">
          <span>{{ editPayableTarget?.supplier?.name || '-' }}</span>
        </el-form-item>
        <el-form-item label="应付金额(¥)" prop="amount">
          <el-input-number
            v-model="editPayableForm.amount"
            :min="0.01"
            :precision="2"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入应付金额"
          />
        </el-form-item>
        <el-form-item label="来源类型" prop="source">
          <el-select v-model="editPayableForm.source" placeholder="请选择来源类型" style="width: 100%" clearable>
            <el-option label="配件采购" value="purchase" />
            <el-option label="设备采购" value="equipment" />
            <el-option label="外协维修" value="outsource" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源单号" prop="sourceNo">
          <el-input v-model="editPayableForm.sourceNo" placeholder="请输入来源单号" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="editPayableForm.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editPayableDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editPayableLoading" @click="handleEditPayableSubmit">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Money, CircleCheck, Warning, Clock, Search, Download, Plus, Edit, Delete } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import { downloadFile } from '@/utils/download'

// ==================== 类型定义 ====================

interface CustomerOption {
  id: number
  name: string
  phone?: string
}

interface CreateReceivableForm {
  customerId: number | null
  amount: number
  source: string
  sourceNo: string
  remark: string
}

interface ReceivableRecord {
  id: number
  customer?: { id: number; name: string }
  amount: number
  paidAmount: number
  unpaidAmount: number
  dueDate: string
  status: 'pending' | 'paid'
  remark?: string
  source?: string
  sourceNo?: string
}

interface PayableRecord {
  id: number
  supplier?: { id: number; name: string }
  amount: number
  paidAmount: number
  unpaidAmount: number
  dueDate: string
  status: 'pending' | 'paid'
  remark: string
  source?: string
  sourceNo?: string
}

interface ReceivableSummary {
  totalReceivable: number
  totalPaid: number
  totalUnpaid: number
  overdueAmount: number
}

interface ListResponse<T> {
  list: T[]
  total: number
}

// ==================== 汇总卡片 ====================

const receivableSummary = reactive<ReceivableSummary>({
  totalReceivable: 0,
  totalPaid: 0,
  totalUnpaid: 0,
  overdueAmount: 0,
})

// ==================== Tab 状态 ====================

const activeTab = ref('receivable')

const handleTabChange = (tab: string) => {
  if (tab === 'receivable') {
    fetchReceivables()
  } else if (tab === 'payable') {
    fetchPayables()
  }
}

// ==================== 详情抽屉 ====================

const drawerVisible = ref(false)
const drawerTitle = ref('')
const detailRow = ref<any>(null)
const detailType = ref<'receivable' | 'payable'>('receivable')

function handleDetail(row: ReceivableRecord | PayableRecord, type: 'receivable' | 'payable') {
  detailRow.value = row
  detailType.value = type
  drawerTitle.value = type === 'receivable' ? '应收账款详情' : '应付账款详情'
  drawerVisible.value = true
}

// ==================== 应收账款 ====================

const receivableSearch = ref('')
const receivableStatusFilter = ref('')
const receivableList = ref<ReceivableRecord[]>([])
const receivableLoading = ref(false)
const receivablePagination = reactive({ page: 1, pageSize: 10, total: 0 })

const fetchReceivables = async () => {
  receivableLoading.value = true
  try {
    const params: any = {
      page: receivablePagination.page,
      pageSize: receivablePagination.pageSize,
    }
    if (receivableSearch.value.trim()) {
      params.keyword = receivableSearch.value.trim()
    }
    if (receivableStatusFilter.value) {
      params.status = receivableStatusFilter.value
    }
    const res = await request.get<any, ListResponse<ReceivableRecord>>('/finance/receivables', { params })
    receivableList.value = res.list || []
    receivablePagination.total = res.total || 0

    await calcReceivableSummary()
  } catch {
    receivableList.value = []
    receivablePagination.total = 0
    ElMessage.error('应收数据加载失败')
    await calcReceivableSummary()
  } finally {
    receivableLoading.value = false
  }
}

// 状态判断辅助函数
function isOverdue(row: { status: string; dueDate?: string }): boolean {
  if (row.status !== 'pending') return false
  if (!row.dueDate) return false
  return new Date(row.dueDate) < new Date()
}

function getStatusTagType(row: { status: string; dueDate?: string }): string {
  if (row.status === 'paid') return 'success'
  if (isOverdue(row)) return 'danger'
  return 'warning'
}

function getStatusLabel(row: { status: string; dueDate?: string }): string {
  if (row.status === 'paid') return '已结清'
  if (isOverdue(row)) return '逾期'
  return '未付'
}

function getPayableStatusTagType(row: { status: string }): string {
  return row.status === 'paid' ? 'success' : 'warning'
}

function getPayableStatusLabel(row: { status: string }): string {
  return row.status === 'paid' ? '已结清' : '未付'
}

const calcReceivableSummary = async () => {
  try {
    const res = await request.get<any, any>('/finance/receivables/summary')
    if (res) {
      receivableSummary.totalReceivable = res.totalAmount || 0
      receivableSummary.totalPaid = res.totalPaid || 0
      receivableSummary.totalUnpaid = res.totalUnpaid || 0
      receivableSummary.overdueAmount = res.overdueAmount || 0
    }
  } catch {
    let totalReceivable = 0
    let totalPaid = 0
    let totalUnpaid = 0
    let overdueAmount = 0
    for (const item of receivableList.value) {
      totalReceivable += item.amount
      totalPaid += item.paidAmount
      totalUnpaid += item.unpaidAmount
      if (isOverdue(item)) {
        overdueAmount += item.unpaidAmount
      }
    }
    receivableSummary.totalReceivable = totalReceivable
    receivableSummary.totalPaid = totalPaid
    receivableSummary.totalUnpaid = totalUnpaid
    receivableSummary.overdueAmount = overdueAmount
  }
}

// ==================== 应收账款 --- 编辑 ====================

const isEditReceivable = ref(false)
const editReceivableId = ref<number>(0)

const handleEditReceivable = (row: ReceivableRecord) => {
  isEditReceivable.value = true
  editReceivableId.value = row.id
  createForm.customerId = row.customer?.id || null
  createForm.amount = row.amount
  createForm.source = row.source || ''
  createForm.sourceNo = row.sourceNo || ''
  createForm.remark = row.remark || ''
  // 如果客户不在选项中，预填充
  if (row.customer) {
    customerOptions.value = [{
      id: row.customer.id,
      name: row.customer.name,
    }]
  }
  createDialogVisible.value = true
}

// ==================== 应收账款 --- 删除 ====================

const handleDeleteReceivable = (row: ReceivableRecord) => {
  ElMessageBox.confirm(
    `确定删除客户「${row.customer?.name || '-'}」的应收记录吗？金额：¥${formatMoney(row.amount)}，删除后不可恢复。`,
    '删除确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' },
  )
    .then(async () => {
      try {
        await request.delete(`/finance/receivables/${row.id}`)
        ElMessage.success('删除成功')
        fetchReceivables()
      } catch {
        // 错误已在拦截器中处理
      }
    })
    .catch(() => {})
}

// ==================== 应付账款 ====================

const payableSearch = ref('')
const payableList = ref<PayableRecord[]>([])
const payableLoading = ref(false)
const payablePagination = reactive({ page: 1, pageSize: 10, total: 0 })

const filteredPayableList = computed(() => {
  if (!payableSearch.value.trim()) return payableList.value
  const keyword = payableSearch.value.trim().toLowerCase()
  return payableList.value.filter((item) =>
    (item.supplier?.name || '').toLowerCase().includes(keyword),
  )
})


const fetchPayables = async () => {
  payableLoading.value = true
  try {
    const params: any = {
      page: payablePagination.page,
      pageSize: payablePagination.pageSize,
    }
    if (payableSearch.value.trim()) {
      params.keyword = payableSearch.value.trim()
    }
    const res = await request.get<any, any>('/finance/payables', { params })
    if (res && res.list && res.list.length > 0) {
      payableList.value = res.list
      payablePagination.total = res.total || 0
      return
    }
    ElMessage.warning('未查询到应付数据')
  } catch {
    ElMessage.error('应付数据加载失败')
  } finally {
    payableLoading.value = false
  }
}

// ==================== 应付账款 --- 编辑 ====================

const editPayableDialogVisible = ref(false)
const editPayableLoading = ref(false)
const editPayableFormRef = ref<FormInstance>()
const editPayableTarget = ref<PayableRecord | null>(null)

const editPayableForm = reactive({
  amount: 0,
  source: '',
  sourceNo: '',
  remark: '',
})

const editPayableFormRules: FormRules = {
  amount: [{ required: true, message: '请输入应付金额', trigger: 'blur' }],
}

const handleEditPayable = (row: PayableRecord) => {
  editPayableTarget.value = row
  editPayableForm.amount = row.amount
  editPayableForm.source = row.source || ''
  editPayableForm.sourceNo = row.sourceNo || ''
  editPayableForm.remark = row.remark || ''
  editPayableDialogVisible.value = true
}

const handleEditPayableSubmit = async () => {
  const valid = await editPayableFormRef.value?.validate().catch(() => false)
  if (!valid) return

  editPayableLoading.value = true
  try {
    await request.put(`/finance/payables/${editPayableTarget.value!.id}`, {
      amount: editPayableForm.amount,
      source: editPayableForm.source || undefined,
      sourceNo: editPayableForm.sourceNo || undefined,
      remark: editPayableForm.remark || undefined,
    })
    ElMessage.success('应付记录已更新')
    editPayableDialogVisible.value = false
    fetchPayables()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    editPayableLoading.value = false
  }
}

// ==================== 应付账款 --- 删除 ====================

const handleDeletePayable = (row: PayableRecord) => {
  ElMessageBox.confirm(
    `确定删除供应商「${row.supplier?.name || '-'}」的应付记录吗？金额：¥${formatMoney(row.amount)}，删除后不可恢复。`,
    '删除确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' },
  )
    .then(async () => {
      try {
        await request.delete(`/finance/payables/${row.id}`)
        ElMessage.success('删除成功')
        fetchPayables()
      } catch {
        // 错误已在拦截器中处理
      }
    })
    .catch(() => {})
}

// ==================== 还款弹窗 ====================

const repayDialogVisible = ref(false)
const repayTarget = ref<ReceivableRecord | null>(null)
const repayLoading = ref(false)
const repayFormRef = ref<FormInstance>()

const repayForm = reactive({
  amount: 0,
  payMethod: 'cash',
  remark: '',
})

const repayFormRules: FormRules = {
  amount: [
    { required: true, message: '请输入还款金额', trigger: 'blur' },
  ],
  payMethod: [
    { required: true, message: '请选择支付方式', trigger: 'change' },
  ],
}

const handleRepay = (row: ReceivableRecord) => {
  repayTarget.value = row
  repayForm.amount = row.unpaidAmount
  repayForm.payMethod = 'cash'
  repayForm.remark = ''
  repayDialogVisible.value = true
}

const handleRepaySubmit = async () => {
  const valid = await repayFormRef.value?.validate().catch(() => false)
  if (!valid) return

  repayLoading.value = true
  try {
    await request.put(`/finance/receivables/${repayTarget.value!.id}/pay`, {
      amount: repayForm.amount,
      payMethod: repayForm.payMethod,
      remark: repayForm.remark || undefined,
    })
    ElMessage.success('还款成功')
    repayDialogVisible.value = false
    fetchReceivables()
  } catch {
    ElMessage.error('还款失败，请重试')
  } finally {
    repayLoading.value = false
  }
}

// ==================== 新增/编辑应收弹窗 ====================

const createDialogVisible = ref(false)
const createLoading = ref(false)
const createFormRef = ref<FormInstance>()

const createForm = reactive<CreateReceivableForm>({
  customerId: null,
  amount: 0,
  source: '',
  sourceNo: '',
  remark: '',
})

const createFormRules: FormRules = {
  customerId: [
    { required: true, message: '请选择客户', trigger: 'change' },
  ],
  amount: [
    { required: true, message: '请输入应收金额', trigger: 'blur' },
  ],
}

// 客户远程搜索
const customerOptions = ref<CustomerOption[]>([])
const customerSearchLoading = ref(false)

const searchCustomers = async (keyword: string) => {
  if (!keyword || !keyword.trim()) {
    customerOptions.value = []
    return
  }
  customerSearchLoading.value = true
  try {
    const res = await request.get<any, any>('/customers', {
      params: { keyword: keyword.trim(), page: 1, pageSize: 20 },
    })
    customerOptions.value = (res?.list || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      phone: item.phone || '',
    }))
  } catch {
    customerOptions.value = []
  } finally {
    customerSearchLoading.value = false
  }
}

const handleOpenCreate = () => {
  isEditReceivable.value = false
  editReceivableId.value = 0
  createForm.customerId = null
  createForm.amount = 0
  createForm.source = ''
  createForm.sourceNo = ''
  createForm.remark = ''
  customerOptions.value = []
  createDialogVisible.value = true
}

const handleCreateOrUpdate = async () => {
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return

  createLoading.value = true
  try {
    const payload = {
      customerId: createForm.customerId,
      amount: createForm.amount,
      source: createForm.source || undefined,
      sourceNo: createForm.sourceNo || undefined,
      remark: createForm.remark || undefined,
    }
    if (isEditReceivable.value) {
      await request.put(`/finance/receivables/${editReceivableId.value}`, payload)
      ElMessage.success('应收记录已更新')
    } else {
      await request.post('/finance/receivables', payload)
      ElMessage.success('新增应收成功')
    }
    createDialogVisible.value = false
    fetchReceivables()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    createLoading.value = false
  }
}

// ==================== 工具函数 ====================

function handleExportReceivable() {
  downloadFile('/api/export/excel?module=finance', '应收账款.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

function handleExportPayable() {
  downloadFile('/api/export/excel?module=finance', '应付账款.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

const formatMoney = (val?: number): string => {
  if (val === undefined || val === null) return '0.00'
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ==================== 初始化 ====================

onMounted(() => {
  fetchReceivables()
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

.tab-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tab-search {
  margin-left: 0;
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
