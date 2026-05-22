<template>
  <div class="page-container">
    <div class="page-header">
      <h2>美容服务项目</h2>
    </div>
    <el-card>
      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="searchForm.name"
          placeholder="服务名称"
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="searchForm.category"
          placeholder="分类"
          clearable
          style="width: 160px; margin-left: 12px"
          @change="handleSearch"
        >
          <el-option label="清洗" value="清洗" />
          <el-option label="护理" value="护理" />
          <el-option label="改装" value="改装" />
          <el-option label="养护" value="养护" />
        </el-select>
        <el-button type="primary" style="margin-left: 12px" @click="handleSearch">
          搜索
        </el-button>
        <el-button style="margin-left: 12px" @click="handleReset">重置</el-button>
        <el-button style="margin-left: 12px" @click="handleExport">
          <el-icon style="margin-right: 4px"><Download /></el-icon>导出Excel
        </el-button>
        <el-button type="success" style="margin-left: auto" @click="handleAdd">
          新增服务
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
        <el-table-column prop="name" label="服务名称" min-width="150" />
        <el-table-column label="分类" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="categoryTagType(row.category)"
              size="small"
            >
              {{ row.category }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="价格" width="120" align="center">
          <template #default="{ row }">
            <span style="color: #e6a23c; font-weight: 500">¥{{ row.price }}</span>
          </template>
        </el-table-column>
        <el-table-column label="时长(分钟)" width="110" align="center">
          <template #default="{ row }">
            {{ row.duration }}分钟
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              :loading="row._statusLoading"
              @change="(val: boolean) => handleStatusChange(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button link type="info" size="small" @click="handleDetail(row)">
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

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="服务详情"
      size="480px"
      :close-on-click-modal="false"
    >
      <template v-if="detailRow">
        <el-descriptions :column="1" border size="default">
          <el-descriptions-item label="服务名称">{{ detailRow.name }}</el-descriptions-item>
          <el-descriptions-item label="分类">
            <el-tag :type="categoryTagType(detailRow.category)" size="small">
              {{ detailRow.category }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="价格">¥{{ detailRow.price }}</el-descriptions-item>
          <el-descriptions-item label="时长">{{ detailRow.duration }}分钟</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detailRow.status === 1 ? 'success' : 'info'" size="small">
              {{ detailRow.status === 1 ? '启用' : '禁用' }}
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
      :title="isEdit ? '编辑服务' : '新增服务'"
      width="500px"
      :close-on-click-modal="false"
      @closed="handleDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="90px"
      >
        <el-form-item label="服务名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入服务名称" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
            <el-option label="清洗" value="清洗" />
            <el-option label="护理" value="护理" />
            <el-option label="改装" value="改装" />
            <el-option label="养护" value="养护" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格(¥)" prop="price">
          <el-input-number
            v-model="form.price"
            :min="0"
            :precision="2"
            :step="10"
            style="width: 100%"
            placeholder="请输入价格"
          />
        </el-form-item>
        <el-form-item label="时长(分钟)" prop="duration">
          <el-input-number
            v-model="form.duration"
            :min="1"
            :max="9999"
            :step="10"
            style="width: 100%"
            placeholder="请输入时长"
          />
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
import { Download } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import { downloadFile } from '@/utils/download'

// ==================== 类型定义 ====================
interface Service {
  id: number
  name: string
  category: string
  price: number
  duration: number
  status: number
  _statusLoading?: boolean
}

interface ServiceForm {
  name: string
  category: string
  price: number | undefined
  duration: number | undefined
}

// ==================== 分类对应标签颜色 ====================
function categoryTagType(category: string) {
  const map: Record<string, string> = {
    '清洗': 'success',
    '护理': 'primary',
    '改装': 'warning',
    '养护': 'info',
  }
  return map[category] || 'info'
}

// ==================== 查询条件 ====================
const searchForm = reactive({
  name: '',
  category: '',
})

// ==================== 分页 ====================
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 表格数据 ====================
const tableData = ref<Service[]>([])
const loading = ref(false)

// ==================== 弹窗相关 ====================
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref<number | null>(null)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

// ==================== 详情抽屉 ====================
const drawerVisible = ref(false)
const detailRow = ref<Service | null>(null)

function handleDetail(row: Service) {
  detailRow.value = row
  drawerVisible.value = true
}

const initForm = (): ServiceForm => ({
  name: '',
  category: '',
  price: undefined,
  duration: undefined,
})

const form = reactive<ServiceForm>(initForm())

// ==================== 表单校验 ====================
const formRules: FormRules = {
  name: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  duration: [{ required: true, message: '请输入时长', trigger: 'blur' }],
}

// ==================== 方法 ====================

/** 获取服务列表 */
async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/beauty/services', {
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
  searchForm.name = ''
  searchForm.category = ''
  handleSearch()
}

/** 新增 */
function handleAdd() {
  isEdit.value = false
  currentId.value = null
  Object.assign(form, initForm())
  dialogVisible.value = true
}

/** 编辑 */
function handleEdit(row: Service) {
  isEdit.value = true
  currentId.value = row.id
  form.name = row.name
  form.category = row.category
  form.price = row.price
  form.duration = row.duration
  dialogVisible.value = true
}

/** 导出 Excel */
function handleExport() {
  downloadFile('/api/export/excel?module=beauty', '美容服务项目.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
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
    const payload = {
      name: form.name,
      category: form.category,
      price: form.price,
      duration: form.duration,
    }

    if (isEdit.value) {
      await request.put(`/beauty/services/${currentId.value}`, payload)
      ElMessage.success('更新成功')
    } else {
      await request.post('/beauty/services', payload)
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
function handleDelete(row: Service) {
  ElMessageBox.confirm(
    `确定要删除服务「${row.name}」吗？删除后不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )
    .then(async () => {
      try {
        await request.delete(`/beauty/services/${row.id}`)
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

/** 状态切换 */
async function handleStatusChange(row: Service, val: boolean) {
  row._statusLoading = true
  const newStatus = val ? 1 : 0
  try {
    await request.put(`/beauty/services/${row.id}`, { status: newStatus })
    row.status = newStatus
    ElMessage.success(val ? '已启用' : '已禁用')
  } catch {
    // 错误已在拦截器中处理
  } finally {
    row._statusLoading = false
  }
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
