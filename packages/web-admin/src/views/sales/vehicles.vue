<template>
  <div class="page-container">
    <div class="page-header">
      <h2>车辆信息管理</h2>
    </div>
    <el-card>
      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="searchForm.keyword"
          placeholder="关键词搜索"
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="searchForm.brand"
          placeholder="品牌筛选"
          clearable
          style="width: 160px; margin-left: 12px"
          @change="handleSearch"
        >
          <el-option label="丰田" value="丰田" />
          <el-option label="本田" value="本田" />
          <el-option label="大众" value="大众" />
          <el-option label="日产" value="日产" />
          <el-option label="别克" value="别克" />
          <el-option label="宝马" value="宝马" />
          <el-option label="奔驰" value="奔驰" />
          <el-option label="奥迪" value="奥迪" />
          <el-option label="比亚迪" value="比亚迪" />
          <el-option label="吉利" value="吉利" />
        </el-select>
        <el-select
          v-model="searchForm.stockStatus"
          placeholder="库存状态"
          clearable
          style="width: 140px; margin-left: 12px"
          @change="handleSearch"
        >
          <el-option label="在库" value="在库" />
          <el-option label="在途" value="在途" />
          <el-option label="已售" value="已售" />
        </el-select>
        <el-button type="primary" style="margin-left: 12px" @click="handleSearch">
          搜索
        </el-button>
        <el-button style="margin-left: 12px" @click="handleReset">重置</el-button>
        <el-button type="success" style="margin-left: auto" @click="handleAdd">
          新增车辆
        </el-button>
        <el-button type="primary" style="margin-left: 12px" @click="handleExport">
          <el-icon><Download /></el-icon>导出Excel
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
        <el-table-column prop="brand" label="品牌" min-width="100" />
        <el-table-column prop="series" label="车系" min-width="120" />
        <el-table-column prop="model" label="车型" min-width="140" />
        <el-table-column prop="year" label="年款" width="80" align="center" />
        <el-table-column prop="color" label="颜色" width="90" />
        <el-table-column label="指导价(¥)" min-width="120" align="right">
          <template #default="{ row }">
            {{ row.guidePrice != null ? Number(row.guidePrice).toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="销售价(¥)" min-width="120" align="right">
          <template #default="{ row }">
            {{ row.salePrice != null ? Number(row.salePrice).toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="库存状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="stockStatusType(row.stockStatus)"
              size="small"
            >
              {{ row.stockStatus || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
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
      :title="isEdit ? '编辑车辆' : '新增车辆'"
      width="660px"
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
            <el-form-item label="品牌" prop="brand">
              <el-input v-model="form.brand" placeholder="请输入品牌" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="车系" prop="series">
              <el-input v-model="form.series" placeholder="请输入车系" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="车型" prop="model">
              <el-input v-model="form.model" placeholder="请输入车型" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="年款" prop="year">
              <el-input v-model="form.year" placeholder="请输入年款" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="配置" prop="config">
              <el-input v-model="form.config" placeholder="请输入配置" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="颜色" prop="color">
              <el-input v-model="form.color" placeholder="请输入颜色" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="VIN码" prop="vin">
          <el-input v-model="form.vin" placeholder="请输入VIN码" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="指导价" prop="guidePrice">
              <el-input-number
                v-model="form.guidePrice"
                :min="0"
                :precision="0"
                :controls="false"
                placeholder="指导价"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="销售价" prop="salePrice">
              <el-input-number
                v-model="form.salePrice"
                :min="0"
                :precision="0"
                :controls="false"
                placeholder="销售价"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="最低价" prop="minPrice">
              <el-input-number
                v-model="form.minPrice"
                :min="0"
                :precision="0"
                :controls="false"
                placeholder="最低价"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="库存状态" prop="stockStatus">
              <el-select v-model="form.stockStatus" placeholder="请选择库存状态" style="width: 100%">
                <el-option label="在库" value="在库" />
                <el-option label="在途" value="在途" />
                <el-option label="已售" value="已售" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="库位" prop="storageLocation">
              <el-input v-model="form.storageLocation" placeholder="请输入库位" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="车辆照片">
          <el-upload multiple drag :auto-upload="false" :on-change="handleFileChange" :file-list="fileList" accept="image/*">
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

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="detailDrawerVisible"
      title="车辆详情"
      size="500px"
      :close-on-click-modal="true"
    >
      <template v-if="detailRow">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="品牌">{{ detailRow.brand }}</el-descriptions-item>
          <el-descriptions-item label="车系">{{ detailRow.series }}</el-descriptions-item>
          <el-descriptions-item label="车型">{{ detailRow.model }}</el-descriptions-item>
          <el-descriptions-item label="年款">{{ detailRow.year }}</el-descriptions-item>
          <el-descriptions-item label="配置">{{ detailRow.config || '-' }}</el-descriptions-item>
          <el-descriptions-item label="颜色">{{ detailRow.color }}</el-descriptions-item>
          <el-descriptions-item label="VIN码">{{ detailRow.vin || '-' }}</el-descriptions-item>
          <el-descriptions-item label="库存状态">
            <el-tag :type="stockStatusType(detailRow.stockStatus)" size="small">
              {{ detailRow.stockStatus || '-' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="指导价">&yen;{{ detailRow.guidePrice != null ? Number(detailRow.guidePrice).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="销售价">&yen;{{ detailRow.salePrice != null ? Number(detailRow.salePrice).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="最低价">&yen;{{ detailRow.minPrice != null ? Number(detailRow.minPrice).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="库位">{{ detailRow.storageLocation || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">{{ detailRow.createdAt }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, Download } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import { uploadFiles } from '@/utils/upload'
import { downloadFile } from '@/utils/download'

// ==================== 类型定义 ====================
interface Vehicle {
  id: number
  brand: string
  series: string
  model: string
  year: string
  config: string
  color: string
  vin: string
  guidePrice: number | null
  salePrice: number | null
  minPrice: number | null
  stockStatus: string
  storageLocation: string
  createdAt: string
}

interface VehicleForm {
  brand: string
  series: string
  model: string
  year: string
  config: string
  color: string
  vin: string
  guidePrice: number | null
  salePrice: number | null
  minPrice: number | null
  stockStatus: string
  storageLocation: string
}

// ==================== 查询条件 ====================
const searchForm = reactive({
  keyword: '',
  brand: '',
  stockStatus: '',
})

// ==================== 分页 ====================
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 表格数据 ====================
const tableData = ref<Vehicle[]>([])
const loading = ref(false)

// ==================== 弹窗相关 ====================
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref<number | null>(null)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const initForm = (): VehicleForm => ({
  brand: '',
  series: '',
  model: '',
  year: '',
  config: '',
  color: '',
  vin: '',
  guidePrice: null,
  salePrice: null,
  minPrice: null,
  stockStatus: '在库',
  storageLocation: '',
})

const form = reactive<VehicleForm>(initForm())

// ==================== 文件上传 ====================
const fileList = ref<any[]>([])
const pendingFiles = ref<File[]>([])

function handleFileChange(file: any) {
  pendingFiles.value.push(file.raw)
}

// ==================== 表单校验 ====================
const formRules: FormRules = {
  brand: [{ required: true, message: '请输入品牌', trigger: 'blur' }],
  series: [{ required: true, message: '请输入车系', trigger: 'blur' }],
  model: [{ required: true, message: '请输入车型', trigger: 'blur' }],
  year: [{ required: true, message: '请输入年款', trigger: 'blur' }],
  color: [{ required: true, message: '请输入颜色', trigger: 'blur' }],
  stockStatus: [{ required: true, message: '请选择库存状态', trigger: 'change' }],
}

// ==================== 方法 ====================

/** 库存状态 el-tag 类型映射 */
function stockStatusType(status: string): '' | 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
    '在库': 'success',
    '在途': 'warning',
    '已售': 'info',
  }
  return map[status] ?? 'info'
}

/** 获取车辆列表 */
async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/sales/vehicles', {
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
  searchForm.keyword = ''
  searchForm.brand = ''
  searchForm.stockStatus = ''
  handleSearch()
}

/** 导出 */
function handleExport() {
  downloadFile('/api/export/excel?module=vehicles', '车辆信息.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

/** 新增 */
function handleAdd() {
  isEdit.value = false
  currentId.value = null
  Object.assign(form, initForm())
  fileList.value = []
  pendingFiles.value = []
  dialogVisible.value = true
}

/** 编辑 */
function handleEdit(row: Vehicle) {
  isEdit.value = true
  currentId.value = row.id
  form.brand = row.brand
  form.series = row.series
  form.model = row.model
  form.year = row.year
  form.config = row.config
  form.color = row.color
  form.vin = row.vin
  form.guidePrice = row.guidePrice
  form.salePrice = row.salePrice
  form.minPrice = row.minPrice
  form.stockStatus = row.stockStatus
  form.storageLocation = row.storageLocation
  fileList.value = []
  pendingFiles.value = []
  dialogVisible.value = true
}

/** 弹窗关闭后清理验证 */
function handleDialogClosed() {
  formRef.value?.resetFields()
  fileList.value = []
  pendingFiles.value = []
}

/** 提交表单 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    const payload: Record<string, any> = { ...form }

    // 上传车辆图片
    if (pendingFiles.value.length > 0) {
      const urls = await uploadFiles(pendingFiles.value, 'vehicles')
      payload.images = urls
    }

    if (isEdit.value) {
      await request.put(`/sales/vehicles/${currentId.value}`, payload)
      ElMessage.success('更新成功')
    } else {
      await request.post('/sales/vehicles', payload)
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

/** 删除 */
function handleDelete(row: Vehicle) {
  ElMessageBox.confirm(
    `确定要删除车辆「${row.brand} ${row.model}」吗？删除后不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )
    .then(async () => {
      try {
        await request.delete(`/sales/vehicles/${row.id}`)
        ElMessage.success('删除成功')
        fetchData()
      } catch {
        // 错误已在拦截器中处理
      }
    })
    .catch(() => {
      // 用户取消
    })
}

// ==================== 详情抽屉 ====================
const detailDrawerVisible = ref(false)
const detailRow = ref<Vehicle | null>(null)

function handleDetail(row: Vehicle) {
  detailRow.value = row
  detailDrawerVisible.value = true
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
