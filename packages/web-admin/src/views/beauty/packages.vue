<template>
  <div class="page-container">
    <div class="page-header">
      <h2>套餐管理</h2>
    </div>
    <el-card>
      <!-- 搜索与操作栏 -->
      <div class="search-bar">
        <el-input
          v-model="searchForm.name"
          placeholder="套餐名称"
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" style="margin-left: 12px" @click="handleSearch">
          搜索
        </el-button>
        <el-button style="margin-left: 12px" @click="handleReset">重置</el-button>
        <el-button style="margin-left: 12px" @click="handleExport">
          <el-icon style="margin-right: 4px"><Download /></el-icon>导出Excel
        </el-button>
        <el-button type="success" style="margin-left: auto" @click="handleAdd">
          新增套餐
        </el-button>
      </div>

      <!-- 套餐卡片列表 -->
      <div v-loading="loading" class="package-card-list">
        <el-empty v-if="!loading && tableData.length === 0" description="暂无套餐数据" />
        <el-row v-else :gutter="20">
          <el-col
            v-for="item in tableData"
            :key="item.id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6"
          >
            <el-card class="package-card" shadow="hover">
              <div class="card-header">
                <h3 class="card-title">{{ item.name }}</h3>
                <div class="card-actions">
                  <el-button link type="primary" size="small" @click="handleEdit(item)">
                    编辑
                  </el-button>
                  <el-button link type="danger" size="small" @click="handleDelete(item)">
                    删除
                  </el-button>
                </div>
              </div>
              <div class="card-price">
                <span class="original-price">
                  <del>¥{{ item.originalPrice }}</del>
                </span>
                <span class="discount-tag">省{{ item.originalPrice - item.packagePrice }}元</span>
                <div class="package-price">¥{{ item.packagePrice }}</div>
              </div>
              <div class="card-items">
                <el-tag
                  v-for="(svc, idx) in item.services"
                  :key="idx"
                  size="small"
                  style="margin: 2px 4px 2px 0"
                >
                  {{ svc.name || svc }}
                </el-tag>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[12, 24, 48, 96]"
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
      :title="isEdit ? '编辑套餐' : '新增套餐'"
      width="560px"
      :close-on-click-modal="false"
      @closed="handleDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="90px"
      >
        <el-form-item label="套餐名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入套餐名称" />
        </el-form-item>
        <el-form-item label="原价(¥)" prop="originalPrice">
          <el-input-number
            v-model="form.originalPrice"
            :min="0"
            :precision="2"
            :step="10"
            style="width: 100%"
            placeholder="请输入原价"
          />
        </el-form-item>
        <el-form-item label="套餐价(¥)" prop="packagePrice">
          <el-input-number
            v-model="form.packagePrice"
            :min="0"
            :precision="2"
            :step="10"
            style="width: 100%"
            placeholder="请输入套餐价"
          />
        </el-form-item>
        <el-form-item label="折扣率">
          <span v-if="form.originalPrice && form.packagePrice" class="discount-text">
            {{ ((form.packagePrice / form.originalPrice) * 10).toFixed(1) }}折，
            省{{ (form.originalPrice - form.packagePrice).toFixed(2) }}元
          </span>
          <span v-else style="color: #909399">请输入原价和套餐价</span>
        </el-form-item>
        <el-form-item label="包含项目" prop="serviceIds">
          <el-select
            v-model="form.serviceIds"
            placeholder="请选择包含的服务项目"
            multiple
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="svc in serviceList"
              :key="svc.id"
              :label="`${svc.name} (¥${svc.price})`"
              :value="svc.id"
            />
          </el-select>
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
}

interface Package {
  id: number
  name: string
  originalPrice: number
  packagePrice: number
  services: Service[]
  serviceIds?: number[]
}

interface PackageForm {
  name: string
  originalPrice: number | undefined
  packagePrice: number | undefined
  serviceIds: number[]
}

// ==================== 查询条件 ====================
const searchForm = reactive({
  name: '',
})

// ==================== 分页 ====================
const pagination = reactive({
  page: 1,
  pageSize: 12,
  total: 0,
})

// ==================== 表格数据 ====================
const tableData = ref<Package[]>([])
const loading = ref(false)

// ==================== 服务列表（用于多选） ====================
const serviceList = ref<Service[]>([])

// ==================== 弹窗相关 ====================
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref<number | null>(null)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const initForm = (): PackageForm => ({
  name: '',
  originalPrice: undefined,
  packagePrice: undefined,
  serviceIds: [],
})

const form = reactive<PackageForm>(initForm())

// ==================== 表单校验 ====================
const formRules: FormRules = {
  name: [{ required: true, message: '请输入套餐名称', trigger: 'blur' }],
  originalPrice: [{ required: true, message: '请输入原价', trigger: 'blur' }],
  packagePrice: [{ required: true, message: '请输入套餐价', trigger: 'blur' }],
  serviceIds: [{ required: true, message: '请选择至少一个服务项目', trigger: 'change' }],
}

// ==================== 方法 ====================

/** 获取套餐列表 */
async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/beauty/packages', {
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

/** 获取所有服务（用于下拉多选） */
async function fetchServices() {
  try {
    const res: any = await request.get('/beauty/services', {
      params: { page: 1, pageSize: 999 },
    })
    serviceList.value = res.list ?? []
  } catch {
    // 错误已在拦截器中处理
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
  handleSearch()
}

/** 导出 Excel */
function handleExport() {
  downloadFile('/api/export/excel?module=beauty', '美容套餐.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

/** 新增 */
function handleAdd() {
  isEdit.value = false
  currentId.value = null
  Object.assign(form, initForm())
  dialogVisible.value = true
}

/** 编辑 */
function handleEdit(row: Package) {
  isEdit.value = true
  currentId.value = row.id
  form.name = row.name
  form.originalPrice = row.originalPrice
  form.packagePrice = row.packagePrice
  form.serviceIds = row.services ? row.services.map((s: any) => s.id ?? s) : (row.serviceIds ?? [])
  dialogVisible.value = true
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
      originalPrice: form.originalPrice,
      packagePrice: form.packagePrice,
      items: form.serviceIds,
    }

    if (isEdit.value) {
      await request.put(`/beauty/packages/${currentId.value}`, payload)
      ElMessage.success('更新成功')
    } else {
      await request.post('/beauty/packages', payload)
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
function handleDelete(row: Package) {
  ElMessageBox.confirm(
    `确定要删除套餐「${row.name}」吗？删除后不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )
    .then(async () => {
      try {
        await request.delete(`/beauty/packages/${row.id}`)
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

// ==================== 生命周期 ====================
onMounted(() => {
  fetchData()
  fetchServices()
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

/* 套餐卡片样式 */
.package-card-list {
  margin-top: 16px;
  min-height: 200px;
}
.package-card {
  margin-bottom: 20px;
  border-radius: 8px;
  transition: transform 0.2s;
}
.package-card:hover {
  transform: translateY(-2px);
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}
.card-actions {
  display: flex;
  gap: 4px;
}
.card-price {
  margin-bottom: 12px;
  padding: 10px 0;
  border-top: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
}
.original-price {
  font-size: 14px;
  color: #c0c4cc;
  margin-right: 8px;
}
.discount-tag {
  display: inline-block;
  font-size: 12px;
  color: #fff;
  background: #f56c6c;
  padding: 1px 8px;
  border-radius: 10px;
}
.package-price {
  font-size: 28px;
  font-weight: 700;
  color: #f56c6c;
  margin-top: 4px;
}
.card-items {
  min-height: 32px;
}
.discount-text {
  font-size: 14px;
  font-weight: 600;
  color: #f56c6c;
}
</style>
