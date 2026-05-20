<template>
  <div class="page-container">
    <div class="page-header">
      <h2>客户跟进管理</h2>
    </div>
    <el-card>
      <!-- 操作栏 -->
      <div class="search-bar">
        <el-button type="success" @click="handleAdd">新增线索</el-button>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%; margin-top: 16px"
      >
        <el-table-column prop="customerName" label="客户姓名" min-width="100" />
        <el-table-column prop="phone" label="电话" min-width="120" />
        <el-table-column prop="intendedVehicle" label="意向车型" min-width="140" />
        <el-table-column label="预算(¥)" min-width="110" align="right">
          <template #default="{ row }">
            {{ row.budget != null ? Number(row.budget).toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" min-width="100" />
        <el-table-column label="意向等级" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="intentTagType(row.intentLevel)"
              size="small"
            >
              {{ row.intentLevel || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="nextFollowAt" label="下次跟进时间" min-width="160" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="statusTagType(row.status)"
              size="small"
            >
              {{ row.status || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button
              v-if="row.status !== '已成交' && row.status !== '已战败'"
              link
              type="warning"
              size="small"
              @click="handleStatusChange(row)"
            >
              推进状态
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

    <!-- 新增弹窗 -->
    <el-dialog
      v-model="addDialogVisible"
      title="新增线索"
      width="560px"
      :close-on-click-modal="false"
      @closed="handleAddDialogClosed"
    >
      <el-form
        ref="addFormRef"
        :model="addForm"
        :rules="addFormRules"
        label-width="80px"
      >
        <el-form-item label="选择客户" prop="customerId">
          <el-select
            v-model="addForm.customerId"
            placeholder="请选择客户"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="c in customerList"
              :key="c.id"
              :label="`${c.name} (${c.phone})`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="意向车型" prop="intendedVehicle">
          <el-input v-model="addForm.intendedVehicle" placeholder="请输入意向车型" />
        </el-form-item>
        <el-form-item label="预算" prop="budget">
          <el-input-number
            v-model="addForm.budget"
            :min="0"
            :precision="0"
            :controls="false"
            placeholder="请输入预算"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="来源" prop="source">
          <el-select v-model="addForm.source" placeholder="请选择来源" style="width: 100%">
            <el-option label="展厅到店" value="展厅到店" />
            <el-option label="电话咨询" value="电话咨询" />
            <el-option label="网络线索" value="网络线索" />
            <el-option label="老客推荐" value="老客推荐" />
            <el-option label="车展活动" value="车展活动" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="addForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="addSubmitLoading" @click="handleAddSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑线索"
      width="560px"
      :close-on-click-modal="false"
      @closed="handleEditDialogClosed"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editFormRules"
        label-width="100px"
      >
        <el-form-item label="意向等级" prop="intentLevel">
          <el-select v-model="editForm.intentLevel" placeholder="请选择意向等级" style="width: 100%">
            <el-option label="H - 高意向" value="H" />
            <el-option label="A - 中意向" value="A" />
            <el-option label="B - 一般" value="B" />
            <el-option label="C - 低意向" value="C" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="editForm.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="新线索" value="新线索" />
            <el-option label="跟进中" value="跟进中" />
            <el-option label="已报价" value="已报价" />
            <el-option label="已成交" value="已成交" />
            <el-option label="已战败" value="已战败" />
          </el-select>
        </el-form-item>
        <el-form-item label="下次跟进时间" prop="nextFollowAt">
          <el-date-picker
            v-model="editForm.nextFollowAt"
            type="datetime"
            placeholder="选择日期时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSubmitLoading" @click="handleEditSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 状态流转弹窗 -->
    <el-dialog
      v-model="statusDialogVisible"
      title="推进状态"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="statusFormRef"
        :model="statusForm"
        :rules="statusFormRules"
        label-width="100px"
      >
        <el-form-item label="当前状态">
          <el-tag :type="statusTagType(currentLead?.status ?? '')" size="default">
            {{ currentLead?.status ?? '-' }}
          </el-tag>
        </el-form-item>
        <el-form-item label="新状态" prop="status">
          <el-select v-model="statusForm.status" placeholder="请选择新状态" style="width: 100%">
            <el-option
              v-for="s in availableStatuses"
              :key="s"
              :label="s"
              :value="s"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="下次跟进时间" prop="nextFollowAt">
          <el-date-picker
            v-model="statusForm.nextFollowAt"
            type="datetime"
            placeholder="选择日期时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="statusSubmitLoading" @click="handleStatusSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'

// ==================== 类型定义 ====================
interface Lead {
  id: number
  customerId: number
  customerName: string
  phone: string
  intendedVehicle: string
  budget: number | null
  source: string
  intentLevel: string
  status: string
  nextFollowAt: string
  remark: string
  createdAt: string
}

interface Customer {
  id: number
  name: string
  phone: string
}

interface AddForm {
  customerId: number | null
  intendedVehicle: string
  budget: number | null
  source: string
  remark: string
}

interface EditForm {
  intentLevel: string
  status: string
  nextFollowAt: string
}

interface StatusForm {
  status: string
  nextFollowAt: string
}

// 状态流转映射
const statusFlowMap: Record<string, string[]> = {
  '新线索': ['跟进中', '已战败'],
  '跟进中': ['已报价', '已战败'],
  '已报价': ['已成交', '已战败', '跟进中'],
  '已成交': [],
  '已战败': [],
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
const tableData = ref<Lead[]>([])
const loading = ref(false)

// ==================== 新增弹窗 ====================
const addDialogVisible = ref(false)
const addSubmitLoading = ref(false)
const addFormRef = ref<FormInstance>()

const initAddForm = (): AddForm => ({
  customerId: null,
  intendedVehicle: '',
  budget: null,
  source: '',
  remark: '',
})

const addForm = reactive<AddForm>(initAddForm())

const addFormRules: FormRules = {
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  intendedVehicle: [{ required: true, message: '请输入意向车型', trigger: 'blur' }],
  source: [{ required: true, message: '请选择来源', trigger: 'change' }],
}

// ==================== 编辑弹窗 ====================
const editDialogVisible = ref(false)
const editSubmitLoading = ref(false)
const currentEditId = ref<number | null>(null)
const editFormRef = ref<FormInstance>()

const initEditForm = (): EditForm => ({
  intentLevel: '',
  status: '',
  nextFollowAt: '',
})

const editForm = reactive<EditForm>(initEditForm())

const editFormRules: FormRules = {
  intentLevel: [{ required: true, message: '请选择意向等级', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

// ==================== 状态流转弹窗 ====================
const statusDialogVisible = ref(false)
const statusSubmitLoading = ref(false)
const currentLead = ref<Lead | null>(null)
const statusFormRef = ref<FormInstance>()

const initStatusForm = (): StatusForm => ({
  status: '',
  nextFollowAt: '',
})

const statusForm = reactive<StatusForm>(initStatusForm())

const statusFormRules: FormRules = {
  status: [{ required: true, message: '请选择新状态', trigger: 'change' }],
}

/** 根据当前状态计算可流转的状态列表 */
const availableStatuses = computed(() => {
  if (!currentLead.value) return []
  return statusFlowMap[currentLead.value.status] ?? []
})

// ==================== 客户列表 ====================
const customerList = ref<Customer[]>([])

// ==================== 方法 ====================

/** 意向等级 el-tag 类型 */
function intentTagType(level: string): '' | 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
    'H': 'danger',
    'A': 'warning',
    'B': '',
    'C': 'info',
  }
  return map[level] ?? 'info'
}

/** 状态 el-tag 类型 */
function statusTagType(status: string): '' | 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
    '新线索': '',
    '跟进中': 'warning',
    '已报价': '',
    '已成交': 'success',
    '已战败': 'info',
  }
  return map[status] ?? 'info'
}

/** 获取线索列表 */
async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/sales/leads', {
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
      params: { pageSize: 9999 },
    })
    customerList.value = res.list ?? []
  } catch {
    // 错误已在拦截器中处理
  }
}

/** 搜索 */
function handleSearch() {
  pagination.page = 1
  fetchData()
}

/** 新增 */
function handleAdd() {
  Object.assign(addForm, initAddForm())
  addDialogVisible.value = true
}

/** 新增弹窗关闭后清理 */
function handleAddDialogClosed() {
  addFormRef.value?.resetFields()
}

/** 新增提交 */
async function handleAddSubmit() {
  const valid = await addFormRef.value?.validate().catch(() => false)
  if (!valid) return

  addSubmitLoading.value = true
  try {
    await request.post('/sales/leads', { ...addForm })
    ElMessage.success('新增成功')
    addDialogVisible.value = false
    fetchData()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    addSubmitLoading.value = false
  }
}

/** 编辑 */
function handleEdit(row: Lead) {
  currentEditId.value = row.id
  editForm.intentLevel = row.intentLevel
  editForm.status = row.status
  editForm.nextFollowAt = row.nextFollowAt
  editDialogVisible.value = true
}

/** 编辑弹窗关闭后清理 */
function handleEditDialogClosed() {
  editFormRef.value?.resetFields()
}

/** 编辑提交 */
async function handleEditSubmit() {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) return

  editSubmitLoading.value = true
  try {
    await request.put(`/sales/leads/${currentEditId.value}`, { ...editForm })
    ElMessage.success('更新成功')
    editDialogVisible.value = false
    fetchData()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    editSubmitLoading.value = false
  }
}

/** 推进状态 */
function handleStatusChange(row: Lead) {
  currentLead.value = row
  Object.assign(statusForm, initStatusForm())
  statusDialogVisible.value = true
}

/** 状态流转提交 */
async function handleStatusSubmit() {
  const valid = await statusFormRef.value?.validate().catch(() => false)
  if (!valid) return

  statusSubmitLoading.value = true
  try {
    await request.put(`/sales/leads/${currentLead.value?.id}`, {
      status: statusForm.status,
      nextFollowAt: statusForm.nextFollowAt || undefined,
    })
    ElMessage.success('状态更新成功')
    statusDialogVisible.value = false
    fetchData()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    statusSubmitLoading.value = false
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  fetchData()
  fetchCustomers()
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
