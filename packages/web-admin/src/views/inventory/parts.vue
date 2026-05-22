<template>
  <div class="page-container">
    <div class="page-header">
      <h2>配件管理</h2>
    </div>
    <el-card>
      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="searchForm.keyword"
          placeholder="请输入配件编码或名称"
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="searchForm.categoryId"
          placeholder="配件分类"
          clearable
          style="width: 180px; margin-left: 12px"
          @change="handleSearch"
        >
          <el-option
            v-for="cat in categoryList"
            :key="cat.id"
            :label="cat.name"
            :value="cat.id"
          />
        </el-select>
        <el-button type="primary" style="margin-left: 12px" @click="handleSearch">
          搜索
        </el-button>
        <el-button style="margin-left: 12px" @click="handleReset">重置</el-button>
        <el-button type="success" plain @click="handleExportExcel" style="margin-left: auto">📥 导出Excel</el-button>
        <el-button @click="handleExportPdf" style="margin-left: 12px">📄 导出PDF</el-button>
        <el-button type="success" style="margin-left: 12px" @click="handleAdd">
          新增配件
        </el-button>
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
        <el-table-column prop="code" label="配件编码" min-width="130" />
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column prop="spec" label="规格" min-width="120">
          <template #default="{ row }">
            {{ row.spec || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="categoryName" label="分类名称" min-width="110" />
        <el-table-column label="单价(¥)" min-width="100" align="right">
          <template #default="{ row }">
            {{ row.price != null ? Number(row.price).toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="安全库存" min-width="90" align="center">
          <template #default="{ row }">
            {{ row.safetyStock ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="当前库存" min-width="100" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.currentStock < row.safetyStock ? 'red' : '', fontWeight: row.currentStock < row.safetyStock ? 'bold' : '' }">
              {{ row.currentStock ?? '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="310" fixed="right">
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
            <el-button link type="success" size="small" @click="handleStockIn(row)">
              入库
            </el-button>
            <el-button link type="warning" size="small" @click="handleStockOut(row)">
              出库
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
      :title="isEdit ? '编辑配件' : '新增配件'"
      width="500px"
      :close-on-click-modal="false"
      @closed="handleDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入配件编码" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入配件名称" />
        </el-form-item>
        <el-form-item label="规格" prop="spec">
          <el-input v-model="form.spec" placeholder="请输入规格" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select
            v-model="form.categoryId"
            placeholder="请选择分类"
            style="width: 100%"
          >
            <el-option
              v-for="cat in categoryList"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="供应商" prop="supplierId">
          <el-select
            v-model="form.supplierId"
            placeholder="请选择供应商"
            style="width: 100%"
          >
            <el-option
              v-for="s in supplierList"
              :key="s.id"
              :label="s.name"
              :value="s.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="单价" prop="price">
          <el-input-number
            v-model="form.price"
            :min="0"
            :precision="2"
            :step="1"
            style="width: 100%"
            placeholder="请输入单价"
          />
        </el-form-item>
        <el-form-item label="成本价" prop="cost">
          <el-input-number
            v-model="form.cost"
            :min="0"
            :precision="2"
            :step="1"
            style="width: 100%"
            placeholder="请输入成本价"
          />
        </el-form-item>
        <el-form-item label="安全库存" prop="safetyStock">
          <el-input-number
            v-model="form.safetyStock"
            :min="0"
            :step="1"
            style="width: 100%"
            placeholder="请输入安全库存"
          />
        </el-form-item>
        <el-form-item label="最大库存" prop="maxStock">
          <el-input-number
            v-model="form.maxStock"
            :min="0"
            :step="1"
            style="width: 100%"
            placeholder="请输入最大库存"
          />
        </el-form-item>
        <el-form-item label="货架位置" prop="shelfLocation">
          <el-input v-model="form.shelfLocation" placeholder="请输入货架位置" />
        </el-form-item>
        <el-form-item label="配件图片">
          <el-upload
            multiple
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :file-list="fileList"
            accept="image/*"
          >
            <el-icon :size="32"><UploadFilled /></el-icon>
            <div>拖拽或点击批量上传</div>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 入库弹窗 -->
    <el-dialog
      v-model="stockInDialogVisible"
      title="入库"
      width="420px"
      :close-on-click-modal="false"
      @closed="handleStockDialogClosed"
    >
      <el-form ref="stockInFormRef" :model="stockForm" :rules="stockFormRules" label-width="80px">
        <el-form-item label="配件名称">
          <span>{{ stockTargetRow?.name }}</span>
        </el-form-item>
        <el-form-item label="当前库存">
          <span>{{ stockTargetRow?.currentStock ?? '-' }}</span>
        </el-form-item>
        <el-form-item label="入库数量" prop="quantity">
          <el-input-number
            v-model="stockForm.quantity"
            :min="1"
            :step="1"
            style="width: 100%"
            placeholder="请输入入库数量"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="stockForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockInDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="stockSubmitLoading" @click="handleStockInSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 出库弹窗 -->
    <el-dialog
      v-model="stockOutDialogVisible"
      title="出库"
      width="420px"
      :close-on-click-modal="false"
      @closed="handleStockDialogClosed"
    >
      <el-form ref="stockOutFormRef" :model="stockForm" :rules="stockFormRules" label-width="80px">
        <el-form-item label="配件名称">
          <span>{{ stockTargetRow?.name }}</span>
        </el-form-item>
        <el-form-item label="当前库存">
          <span>{{ stockTargetRow?.currentStock ?? '-' }}</span>
        </el-form-item>
        <el-form-item label="出库数量" prop="quantity">
          <el-input-number
            v-model="stockForm.quantity"
            :min="1"
            :step="1"
            style="width: 100%"
            placeholder="请输入出库数量"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="stockForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockOutDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="stockSubmitLoading" @click="handleStockOutSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="detailDrawerVisible"
      title="配件详情"
      size="500px"
      :close-on-click-modal="true"
    >
      <template v-if="detailRow">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="配件编码">{{ detailRow.code }}</el-descriptions-item>
          <el-descriptions-item label="配件名称">{{ detailRow.name }}</el-descriptions-item>
          <el-descriptions-item label="规格">{{ detailRow.spec || '-' }}</el-descriptions-item>
          <el-descriptions-item label="分类">{{ detailRow.categoryName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ detailRow.supplierName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="单价">&yen;{{ detailRow.price != null ? Number(detailRow.price).toFixed(2) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="成本价">&yen;{{ detailRow.cost != null ? Number(detailRow.cost).toFixed(2) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="安全库存">{{ detailRow.safetyStock ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="最大库存">{{ detailRow.maxStock ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前库存" :span="2">
            <span :style="{ color: detailRow.currentStock < detailRow.safetyStock ? 'red' : '', fontWeight: detailRow.currentStock < detailRow.safetyStock ? 'bold' : '' }">
              {{ detailRow.currentStock ?? '-' }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="货架位置">{{ detailRow.shelfLocation || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ detailRow.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="更新时间" :span="2">{{ detailRow.updatedAt }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import { uploadFiles } from '@/utils/upload'
import { downloadFile } from '@/utils/download'
import { exportTableToPdf } from '@/utils/export-pdf'
import { UploadFilled } from '@element-plus/icons-vue'

// ==================== 类型定义 ====================
interface Part {
  id: number
  code: string
  name: string
  spec: string
  categoryId: number | null
  categoryName: string
  supplierId: number | null
  supplierName: string
  price: number
  cost: number
  safetyStock: number
  maxStock: number
  currentStock: number
  shelfLocation: string
  createdAt: string
  updatedAt: string
}

interface Category {
  id: number
  name: string
}

interface Supplier {
  id: number
  name: string
}

interface PartForm {
  code: string
  name: string
  spec: string
  categoryId: number | null
  supplierId: number | null
  price: number | null
  cost: number | null
  safetyStock: number | null
  maxStock: number | null
  shelfLocation: string
}

interface StockForm {
  quantity: number | null
  remark: string
}

// ==================== 查询条件 ====================
const searchForm = reactive({
  keyword: '',
  categoryId: null as number | null,
})

// ==================== 分页 ====================
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 表格数据 ====================
const tableData = ref<Part[]>([])
const loading = ref(false)

// ==================== 下拉列表 ====================
const categoryList = ref<Category[]>([])
const supplierList = ref<Supplier[]>([])

// ==================== 新增/编辑弹窗 ====================
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentPartId = ref<number | null>(null)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const initForm = (): PartForm => ({
  code: '',
  name: '',
  spec: '',
  categoryId: null,
  supplierId: null,
  price: null,
  cost: null,
  safetyStock: null,
  maxStock: null,
  shelfLocation: '',
})

const form = reactive<PartForm>(initForm())

const formRules: FormRules = {
  code: [{ required: true, message: '请输入配件编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入配件名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  supplierId: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  price: [{ required: true, message: '请输入单价', trigger: 'blur' }],
  safetyStock: [{ required: true, message: '请输入安全库存', trigger: 'blur' }],
}

// ==================== 入库/出库弹窗 ====================
const stockInDialogVisible = ref(false)
const stockOutDialogVisible = ref(false)
const stockTargetRow = ref<Part | null>(null)
const stockSubmitLoading = ref(false)
const stockInFormRef = ref<FormInstance>()
const stockOutFormRef = ref<FormInstance>()

const initStockForm = (): StockForm => ({
  quantity: null,
  remark: '',
})

const stockForm = reactive<StockForm>(initStockForm())

const stockFormRules: FormRules = {
  quantity: [
    { required: true, message: '请输入数量', trigger: 'blur' },
    { type: 'number', min: 1, message: '数量必须大于0', trigger: 'blur' },
  ],
}

// ==================== 方法 ====================

/** 获取配件列表 */
async function fetchParts() {
  loading.value = true
  try {
    const res: any = await request.get('/inventory', {
      params: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        keyword: searchForm.keyword || undefined,
        categoryId: searchForm.categoryId || undefined,
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

/** 获取分类列表 */
async function fetchCategories() {
  try {
    const res: any = await request.get('/inventory/categories')
    categoryList.value = res ?? []
  } catch {
    // 错误已在拦截器中处理
  }
}

/** 获取供应商列表 */
async function fetchSuppliers() {
  try {
    const res: any = await request.get('/inventory/suppliers')
    supplierList.value = res ?? []
  } catch {
    // 错误已在拦截器中处理
  }
}

/** 搜索 */
function handleSearch() {
  pagination.page = 1
  fetchParts()
}

/** 重置 */
function handleReset() {
  searchForm.keyword = ''
  searchForm.categoryId = null
  handleSearch()
}

/** 新增 */
function handleAdd() {
  isEdit.value = false
  currentPartId.value = null
  Object.assign(form, initForm())
  dialogVisible.value = true
}

/** 编辑 */
function handleEdit(row: Part) {
  isEdit.value = true
  currentPartId.value = row.id
  form.code = row.code
  form.name = row.name
  form.spec = row.spec
  form.categoryId = row.categoryId
  form.supplierId = row.supplierId
  form.price = Number(row.price)
  form.cost = Number(row.cost)
  form.safetyStock = row.safetyStock
  form.maxStock = row.maxStock
  form.shelfLocation = row.shelfLocation
  dialogVisible.value = true
}

/** 弹窗关闭后清理验证 */
function handleDialogClosed() {
  formRef.value?.resetFields()
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
  downloadFile('/api/export/excel?module=parts', '配件列表.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

function handleExportPdf() {
  exportTableToPdf(
    '配件列表',
    [
      { header: '编码', dataKey: 'code' },
      { header: '名称', dataKey: 'name' },
      { header: '规格', dataKey: 'spec' },
      { header: '分类', dataKey: 'categoryName' },
      { header: '单价', dataKey: 'price' },
      { header: '库存', dataKey: 'currentStock' },
      { header: '安全库存', dataKey: 'safetyStock' },
    ],
    tableData.value,
    '配件列表',
  )
}

/** 提交表单 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  let images: string[] | undefined
  if (pendingFiles.value.length > 0) {
    images = await uploadFiles(pendingFiles.value, 'parts')
    pendingFiles.value = []
    fileList.value = []
  }

  submitLoading.value = true
  try {
    const payload = {
      code: form.code,
      name: form.name,
      spec: form.spec,
      categoryId: form.categoryId,
      supplierId: form.supplierId,
      price: form.price,
      cost: form.cost,
      safetyStock: form.safetyStock,
      maxStock: form.maxStock,
      shelfLocation: form.shelfLocation,
      images,
    }

    if (isEdit.value) {
      await request.put(`/inventory/${currentPartId.value}`, payload)
      ElMessage.success('编辑成功')
    } else {
      await request.post('/inventory', payload)
      ElMessage.success('新增成功')
    }

    dialogVisible.value = false
    fetchParts()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    submitLoading.value = false
  }
}

/** 删除 */
function handleDelete(row: Part) {
  ElMessageBox.confirm(
    `确定要删除配件「${row.name}」(${row.code})吗？删除后不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )
    .then(async () => {
      try {
        await request.delete(`/inventory/${row.id}`)
        ElMessage.success('删除成功')
        fetchParts()
      } catch {
        // 错误已在拦截器中处理
      }
    })
    .catch(() => {
      // 用户取消
    })
}

/** 入库 */
function handleStockIn(row: Part) {
  stockTargetRow.value = row
  Object.assign(stockForm, initStockForm())
  stockInDialogVisible.value = true
}

/** 出库 */
function handleStockOut(row: Part) {
  stockTargetRow.value = row
  Object.assign(stockForm, initStockForm())
  stockOutDialogVisible.value = true
}

/** 入库/出库弹窗关闭后清理 */
function handleStockDialogClosed() {
  stockInFormRef.value?.resetFields()
  stockOutFormRef.value?.resetFields()
}

/** 提交入库 */
async function handleStockInSubmit() {
  const valid = await stockInFormRef.value?.validate().catch(() => false)
  if (!valid) return

  stockSubmitLoading.value = true
  try {
    await request.post('/inventory/stock-in', {
      partId: stockTargetRow.value!.id,
      quantity: stockForm.quantity,
      remark: stockForm.remark,
    })
    ElMessage.success('入库成功')
    stockInDialogVisible.value = false
    fetchParts()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    stockSubmitLoading.value = false
  }
}

/** 提交出库 */
async function handleStockOutSubmit() {
  const valid = await stockOutFormRef.value?.validate().catch(() => false)
  if (!valid) return

  stockSubmitLoading.value = true
  try {
    await request.post('/inventory/stock-out', {
      partId: stockTargetRow.value!.id,
      quantity: stockForm.quantity,
      remark: stockForm.remark,
    })
    ElMessage.success('出库成功')
    stockOutDialogVisible.value = false
    fetchParts()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    stockSubmitLoading.value = false
  }
}

// ==================== 详情抽屉 ====================
const detailDrawerVisible = ref(false)
const detailRow = ref<Part | null>(null)

function handleDetail(row: Part) {
  detailRow.value = row
  detailDrawerVisible.value = true
}

// ==================== 生命周期 ====================
onMounted(() => {
  fetchParts()
  fetchCategories()
  fetchSuppliers()
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
