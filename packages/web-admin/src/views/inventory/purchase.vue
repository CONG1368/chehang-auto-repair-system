<template>
  <div class="page-container">
    <div class="page-header">
      <h2>采购管理</h2>
    </div>
    <el-card>
      <div class="search-bar">
        <el-select
          v-model="searchForm.status"
          placeholder="状态筛选"
          clearable
          style="width: 180px"
          @change="handleSearch"
        >
          <el-option label="全部" value="" />
          <el-option label="待审批" value="pending" />
          <el-option label="已审批" value="approved" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-button type="primary" style="margin-left: 12px" @click="handleSearch">搜索</el-button>
        <el-button style="margin-left: 12px" @click="handleReset">重置</el-button>
        <el-button type="success" style="margin-left: auto" @click="handleAdd">新增采购单</el-button>
        <el-button type="primary" style="margin-left: 12px" @click="handleExport">
          <el-icon><Download /></el-icon>导出Excel
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%; margin-top: 16px"
        @row-click="handleDetail"
      >
        <el-table-column prop="orderNo" label="采购单号" min-width="180" />
        <el-table-column label="供应商名称" min-width="160">
          <template #default="{ row }">{{ row.supplier?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="总金额" min-width="120" align="right">
          <template #default="{ row }">
            &yen;{{ row.totalAmount != null ? row.totalAmount.toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">{{ row.createdAt }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click.stop="handleDetail(row)">详情</el-button>
            <el-button link type="warning" size="small" @click.stop="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click.stop="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

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

    <el-dialog
      v-model="dialogVisible"
      title="新增采购单"
      width="780px"
      :close-on-click-modal="false"
      @closed="handleDialogClosed"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="供应商" prop="supplierId">
          <el-select v-model="form.supplierId" placeholder="请选择供应商" style="width: 100%">
            <el-option v-for="s in supplierList" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="配件明细">
          <el-table :data="form.items" border size="small">
            <el-table-column label="配件" min-width="200">
              <template #default="{ $index }">
                <el-select
                  v-model="form.items[$index].partId"
                  placeholder="请选择配件"
                  filterable
                  style="width: 100%"
                  @change="(val: number) => onPartSelect($index, val)"
                >
                  <el-option
                    v-for="p in partsList"
                    :key="p.id"
                    :label="`${p.code} - ${p.name}`"
                    :value="p.id"
                  />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="数量" width="120">
              <template #default="{ $index }">
                <el-input-number
                  v-model="form.items[$index].quantity"
                  :min="1"
                  :step="1"
                  style="width: 100%"
                />
              </template>
            </el-table-column>
            <el-table-column label="单价" width="140">
              <template #default="{ $index }">
                <el-input-number
                  v-model="form.items[$index].unitPrice"
                  :min="0"
                  :precision="2"
                  :step="1"
                  style="width: 100%"
                />
              </template>
            </el-table-column>
            <el-table-column label="小计" width="130" align="right">
              <template #default="{ row: item }">
                &yen;{{ itemTotal(item).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="70" align="center">
              <template #default="{ $index }">
                <el-button link type="danger" size="small" @click="removeItem($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="primary" link style="margin-top: 8px" @click="addItem">+ 添加配件</el-button>
          <div style="text-align: right; margin-top: 8px; font-size: 16px; font-weight: bold">
            合计：&yen;{{ totalAmount.toFixed(2) }}
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑采购单弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑采购单"
      width="500px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editFormRules"
        label-width="80px"
      >
        <el-form-item label="采购单号">
          <span>{{ editTarget?.orderNo }}</span>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="editForm.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="待审批" value="pending" />
            <el-option label="已审批" value="approved" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="editForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="handleEditSubmit">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="detailDrawerVisible"
      title="采购单详情"
      size="650px"
      :close-on-click-modal="true"
    >
      <template v-if="detailRow">
        <div style="display: flex; justify-content: flex-end; margin-bottom: 12px">
          <el-button type="warning" :icon="Printer" @click="handlePrintPurchase"> 打印采购单</el-button>
        </div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="采购单号">{{ detailRow.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ detailRow.supplier?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="总金额">
            &yen;{{ detailRow.totalAmount != null ? detailRow.totalAmount.toFixed(2) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(detailRow.status)">{{ statusLabel(detailRow.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">{{ detailRow.createdAt }}</el-descriptions-item>
        </el-descriptions>
        <el-divider>配件明细</el-divider>
        <el-table :data="detailRow.items" border size="small">
          <el-table-column label="配件编码" min-width="120">
            <template #default="{ row: item }">{{ item.part?.code || '-' }}</template>
          </el-table-column>
          <el-table-column label="配件名称" min-width="140">
            <template #default="{ row: item }">{{ item.part?.name || '-' }}</template>
          </el-table-column>
          <el-table-column label="规格" min-width="100">
            <template #default="{ row: item }">{{ item.part?.spec || '-' }}</template>
          </el-table-column>
          <el-table-column label="数量" width="80" align="center">
            <template #default="{ row: item }">{{ item.quantity }}</template>
          </el-table-column>
          <el-table-column label="单价" width="110" align="right">
            <template #default="{ row: item }">&yen;{{ item.unitPrice != null ? item.unitPrice.toFixed(2) : '-' }}</template>
          </el-table-column>
          <el-table-column label="金额" width="110" align="right">
            <template #default="{ row: item }">&yen;{{ item.amount != null ? item.amount.toFixed(2) : '-' }}</template>
          </el-table-column>
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, h, createApp } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Download, Printer } from '@element-plus/icons-vue'
import request from '@/api/request'
import { downloadFile } from '@/utils/download'
import { printHtml } from '@/utils/print'
import PurchaseOrderPrint from '@/components/PrintTemplate/PurchaseOrderPrint.vue'

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

interface PurchaseOrder {
  id: number
  orderNo: string
  supplierId: number
  totalAmount: number
  status: string
  createdAt: string
  supplier: { id: number; name: string } | null
  items: PurchaseOrderItem[]
}

interface PurchaseOrderItem {
  id: number
  partId: number
  quantity: number
  unitPrice: number
  amount: number
  part: { id: number; name: string; code: string; spec: string } | null
}

interface Supplier {
  id: number
  name: string
}

interface PartSimple {
  id: number
  code: string
  name: string
  unitPrice: number
}

interface PurchaseItemRow {
  partId: number | null
  quantity: number | null
  unitPrice: number | null
}

interface PurchaseForm {
  supplierId: number | null
  items: PurchaseItemRow[]
}

const searchForm = reactive({
  status: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const tableData = ref<PurchaseOrder[]>([])
const loading = ref(false)

const supplierList = ref<Supplier[]>([])
const partsList = ref<PartSimple[]>([])

const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const statusMap: Record<string, string> = {
  pending: '待审批',
  approved: '已审批',
  completed: '已完成',
  cancelled: '已取消',
}

const statusTagTypeMap: Record<string, string> = {
  pending: 'warning',
  approved: 'info',
  completed: 'success',
  cancelled: 'danger',
}

const initForm = (): PurchaseForm => ({
  supplierId: null,
  items: [],
})

const form = reactive<PurchaseForm>(initForm())

const formRules: FormRules = {
  supplierId: [{ required: true, message: '请选择供应商', trigger: 'change' }],
}

function statusLabel(status: string): string {
  return statusMap[status] || status
}

function statusTagType(status: string): string {
  return statusTagTypeMap[status] || 'info'
}

function itemTotal(item: PurchaseItemRow): number {
  return (item.quantity ?? 0) * (item.unitPrice ?? 0)
}

const totalAmount = computed(() => {
  return form.items.reduce((sum, item) => sum + itemTotal(item), 0)
})

async function fetchPurchaseList() {
  loading.value = true
  try {
    const res: any = await request.get('/inventory/purchase', {
      params: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        status: searchForm.status || undefined,
      },
    })
    tableData.value = res.list ?? []
    pagination.total = res.total ?? 0
  } catch {
    //
  } finally {
    loading.value = false
  }
}

async function fetchSuppliers() {
  try {
    const res: any = await request.get('/inventory/suppliers')
    supplierList.value = res ?? []
  } catch {
    //
  }
}

async function fetchParts() {
  try {
    const res: any = await request.get('/inventory', {
      params: { page: 1, pageSize: 200 },
    })
    partsList.value = res.list ?? []
  } catch {
    //
  }
}

function handleSearch() {
  pagination.page = 1
  fetchPurchaseList()
}

function handleReset() {
  searchForm.status = ''
  handleSearch()
}

function handleExport() {
  downloadFile('/api/export/excel?module=report', '采购报表.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

function handleAdd() {
  Object.assign(form, initForm())
  dialogVisible.value = true
}

function addItem() {
  form.items.push({ partId: null, quantity: 1, unitPrice: null })
}

function removeItem(index: number) {
  form.items.splice(index, 1)
}

function onPartSelect(index: number, partId: number) {
  const part = partsList.value.find((p) => p.id === partId)
  if (part) {
    form.items[index].unitPrice = part.unitPrice
  }
}

function handleDialogClosed() {
  formRef.value?.resetFields()
  form.items = []
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  if (form.items.length === 0) {
    ElMessage.error('请至少添加一条配件明细')
    return
  }

  for (let i = 0; i < form.items.length; i++) {
    const item = form.items[i]
    if (!item.partId) {
      ElMessage.error(`第 ${i + 1} 行未选择配件`)
      return
    }
    if (!item.quantity || item.quantity <= 0) {
      ElMessage.error(`第 ${i + 1} 行数量无效`)
      return
    }
    if (item.unitPrice == null || item.unitPrice < 0) {
      ElMessage.error(`第 ${i + 1} 行单价无效`)
      return
    }
  }

  submitLoading.value = true
  try {
    await request.post('/inventory/purchase', {
      supplierId: form.supplierId,
      items: form.items.map((item) => ({
        partId: item.partId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    })
    ElMessage.success('新增成功')
    dialogVisible.value = false
    fetchPurchaseList()
  } catch {
    //
  } finally {
    submitLoading.value = false
  }
}

// ==================== 编辑采购单 ====================

const editDialogVisible = ref(false)
const editLoading = ref(false)
const editFormRef = ref<FormInstance>()
const editTarget = ref<PurchaseOrder | null>(null)

const editForm = reactive({
  status: '',
  remark: '',
})

const editFormRules: FormRules = {
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

function handleEdit(row: PurchaseOrder) {
  editTarget.value = row
  editForm.status = row.status
  editForm.remark = ''
  editDialogVisible.value = true
}

async function handleEditSubmit() {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return

  editLoading.value = true
  try {
    await request.put(`/inventory/purchase/${editTarget.value!.id}`, {
      status: editForm.status,
      remark: editForm.remark || undefined,
    })
    ElMessage.success('采购单已更新')
    editDialogVisible.value = false
    fetchPurchaseList()
  } catch {
    //
  } finally {
    editLoading.value = false
  }
}

// ==================== 删除 ====================

function handleDelete(row: PurchaseOrder) {
  ElMessageBox.confirm(
    `确定要删除采购单「${row.orderNo}」吗？删除后不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )
    .then(async () => {
      try {
        await request.delete(`/inventory/purchase/${row.id}`)
        ElMessage.success('删除成功')
        fetchPurchaseList()
      } catch {
        //
      }
    })
    .catch(() => {
      //
    })
}

const detailDrawerVisible = ref(false)
const detailRow = ref<PurchaseOrder | null>(null)

async function handleDetail(row: PurchaseOrder) {
  try {
    const res: any = await request.get(`/inventory/purchase/${row.id}`)
    detailRow.value = res
    detailDrawerVisible.value = true
  } catch {
    //
  }
}

async function handlePrintPurchase() {
  const row = detailRow.value
  if (!row) return
  const printData = {
    orderNo: row.orderNo,
    supplierName: row.supplier?.name || '-',
    totalAmount: row.totalAmount,
    status: statusLabel(row.status),
    applicant: '-',
    remark: '',
    items: (row.items || []).map((item: any) => ({
      partName: item.part?.name || '-',
      name: item.part?.name || '-',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
    })),
    createdAt: row.createdAt,
  }
  const container = document.createElement('div')
  const safeData = deepEscape(printData)
  const app = createApp({ render: () => h(PurchaseOrderPrint, { data: safeData }) })
  app.mount(container)
  await new Promise(r => setTimeout(r, 100))
  printHtml(container.innerHTML)
  app.unmount()
}

onMounted(() => {
  fetchPurchaseList()
  fetchSuppliers()
  fetchParts()
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

@media print {
  :deep(.el-button) { display: none; }
  :deep(.el-pagination) { display: none; }
}
</style>
