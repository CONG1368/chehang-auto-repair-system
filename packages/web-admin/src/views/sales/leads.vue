<template>
  <div class="page-container">
    <div class="page-header">
      <h2>客户线索跟进管理</h2>
    </div>
    <el-card>
      <!-- 操作栏 -->
      <div class="search-bar">
        <el-button type="success" @click="handleAdd">新增线索</el-button>
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
        <el-table-column prop="customerName" label="客户姓名" min-width="100" />
        <el-table-column prop="phone" label="电话" min-width="120" />
        <el-table-column prop="intendedVehicle" label="意向车型" min-width="140" />
        <el-table-column label="预算(¥)" min-width="110" align="right">
          <template #default="{ row }">
            {{ row.budget != null ? Number(row.budget).toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" min-width="100" />
        <el-table-column prop="salesName" label="负责员工" min-width="100" />
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
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click.stop="handleDetail(row)">
              详情
            </el-button>
            <el-button link type="primary" size="small" @click.stop="handleEdit(row)">
              编辑
            </el-button>
            <el-button link type="success" size="small" @click.stop="handleAddFollow(row)">
              跟进
            </el-button>
            <el-button link type="danger" size="small" @click.stop="handleDelete(row)">
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

    <!-- 新增线索弹窗 -->
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
        <el-form-item label="意向等级" prop="intentLevel">
          <el-select v-model="addForm.intentLevel" placeholder="请选择意向等级" style="width: 100%">
            <el-option label="H - 高意向" value="H" />
            <el-option label="A - 中意向" value="A" />
            <el-option label="B - 一般" value="B" />
            <el-option label="C - 低意向" value="C" />
          </el-select>
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

    <!-- 新增跟进弹窗 -->
    <el-dialog
      v-model="followDialogVisible"
      title="新增跟进记录"
      width="500px"
      :close-on-click-modal="false"
      @closed="handleFollowDialogClosed"
    >
      <el-form
        ref="followFormRef"
        :model="followForm"
        :rules="followFormRules"
        label-width="100px"
      >
        <el-form-item label="当前状态">
          <el-tag :type="statusTagType(currentLead?.status ?? '')" size="default">
            {{ currentLead?.status ?? '-' }}
          </el-tag>
        </el-form-item>
        <el-form-item label="跟进类型" prop="type">
          <el-select v-model="followForm.type" placeholder="请选择跟进类型" style="width: 100%">
            <el-option label="电话沟通" value="电话沟通" />
            <el-option label="微信沟通" value="微信沟通" />
            <el-option label="到店接待" value="到店接待" />
            <el-option label="试驾体验" value="试驾体验" />
            <el-option label="报价洽谈" value="报价洽谈" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进内容" prop="content">
          <el-input
            v-model="followForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入本次跟进详情"
          />
        </el-form-item>
        <el-form-item label="更新状态">
          <el-select v-model="followForm.status" placeholder="不改变则留空" clearable style="width: 100%">
            <el-option
              v-for="s in availableStatuses"
              :key="s"
              :label="s"
              :value="s"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="下次跟进时间">
          <el-date-picker
            v-model="followForm.nextFollowAt"
            type="datetime"
            placeholder="选择日期时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="followDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="followSubmitLoading" @click="handleFollowSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="detailDrawerVisible"
      title="线索详情"
      size="550px"
      :close-on-click-modal="true"
      @open="fetchDetailData"
    >
      <template v-if="detailRow">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="客户姓名">{{ detailRow.customerName }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ detailRow.phone }}</el-descriptions-item>
          <el-descriptions-item label="意向车型">{{ detailRow.intendedVehicle || '-' }}</el-descriptions-item>
          <el-descriptions-item label="负责员工">{{ detailRow.salesName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="预算">&yen;{{ detailRow.budget != null ? Number(detailRow.budget).toLocaleString() : '-' }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{ detailRow.source || '-' }}</el-descriptions-item>
          <el-descriptions-item label="意向等级">
            <el-tag :type="intentTagType(detailRow.intentLevel)" size="small">
              {{ detailRow.intentLevel || '-' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(detailRow.status)" size="small">
              {{ detailRow.status || '-' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="下次跟进时间">{{ detailRow.nextFollowAt || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ detailRow.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailRow.remark || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 跟进历史 -->
        <div class="follow-section">
          <div class="follow-section-header">
            <h4>跟进记录</h4>
            <el-button type="primary" size="small" @click="handleAddFollow(detailRow)">
              新增跟进
            </el-button>
          </div>
          <el-timeline v-if="detailFollows.length > 0" v-loading="detailFollowLoading">
            <el-timeline-item
              v-for="item in detailFollows"
              :key="item.id"
              :timestamp="item.createdAt"
              placement="top"
            >
              <el-card shadow="hover" size="small">
                <div class="follow-record-header">
                  <el-tag size="small" :type="followTypeTag(item.type)">
                    {{ item.type }}
                  </el-tag>
                  <span class="follow-user">跟进人：{{ item.user?.realName || '-' }}</span>
                  <span v-if="item.nextFollowAt" class="follow-next">
                    下次：{{ item.nextFollowAt }}
                  </span>
                </div>
                <p class="follow-content">{{ item.content }}</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
          <el-empty
            v-if="!detailFollowLoading && detailFollows.length === 0"
            description="暂无跟进记录"
          />
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import { downloadFile } from '@/utils/download'

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
  salesName: string
  nextFollowAt: string
  remark: string
  createdAt: string
}

interface Customer {
  id: number
  name: string
  phone: string
}

interface FollowRecord {
  id: number
  type: string
  content: string
  userId: number
  nextFollowAt: string | null
  createdAt: string
  user?: {
    realName: string
  }
}

interface AddForm {
  customerId: number | null
  intendedVehicle: string
  intentLevel: string
  budget: number | null
  source: string
  remark: string
}

interface EditForm {
  intentLevel: string
  status: string
  nextFollowAt: string
}

interface FollowForm {
  type: string
  content: string
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

// ==================== 分页 ====================
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 表格数据 ====================
const tableData = ref<Lead[]>([])
const loading = ref(false)

// ==================== 新增线索弹窗 ====================
const addDialogVisible = ref(false)
const addSubmitLoading = ref(false)
const addFormRef = ref<FormInstance>()

const initAddForm = (): AddForm => ({
  customerId: null,
  intendedVehicle: '',
  intentLevel: '',
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

// ==================== 新增跟进弹窗 ====================
const followDialogVisible = ref(false)
const followSubmitLoading = ref(false)
const currentLead = ref<Lead | null>(null)
const followFormRef = ref<FormInstance>()

const initFollowForm = (): FollowForm => ({
  type: '',
  content: '',
  status: '',
  nextFollowAt: '',
})

const followForm = reactive<FollowForm>(initFollowForm())

const followFormRules: FormRules = {
  type: [{ required: true, message: '请选择跟进类型', trigger: 'change' }],
  content: [{ required: true, message: '请输入跟进内容', trigger: 'blur' }],
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

/** 跟进类型 tag 颜色 */
function followTypeTag(type: string): string {
  const map: Record<string, string> = {
    '电话沟通': '',
    '微信沟通': 'success',
    '到店接待': '',
    '试驾体验': 'warning',
    '报价洽谈': 'danger',
  }
  return map[type] ?? 'info'
}

/** 获取线索列表 */
async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/sales/leads', {
      params: {
        page: pagination.page,
        pageSize: pagination.pageSize,
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

/** 搜索 */
function handleSearch() {
  pagination.page = 1
  fetchData()
}

/** 新增线索 */
function handleAdd() {
  Object.assign(addForm, initAddForm())
  addDialogVisible.value = true
}

function handleExport() {
  downloadFile('/api/export/excel?module=leads', '客户线索.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

function handleAddDialogClosed() {
  addFormRef.value?.resetFields()
}

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

function handleEditDialogClosed() {
  editFormRef.value?.resetFields()
}

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

/** 新增跟进 */
function handleAddFollow(row: Lead) {
  currentLead.value = row
  Object.assign(followForm, initFollowForm())
  followDialogVisible.value = true
}

function handleFollowDialogClosed() {
  followFormRef.value?.resetFields()
}

async function handleFollowSubmit() {
  const valid = await followFormRef.value?.validate().catch(() => false)
  if (!valid) return

  followSubmitLoading.value = true
  try {
    const leadId = currentLead.value?.id as number
    await request.post(`/sales/leads/${leadId}/follows`, {
      type: followForm.type,
      content: followForm.content,
      nextFollowAt: followForm.nextFollowAt || undefined,
      status: followForm.status || undefined,
    })
    ElMessage.success('跟进记录已保存')
    followDialogVisible.value = false
    fetchData()
    // 如果详情抽屉开着，刷新跟进列表
    if (detailDrawerVisible.value && detailRow.value?.id === leadId) {
      fetchDetailFollows(leadId)
    }
  } catch {
    // 错误已在拦截器中处理
  } finally {
    followSubmitLoading.value = false
  }
}

/** 删除 */
function handleDelete(row: Lead) {
  ElMessageBox.confirm(`确定删除线索「${row.customerName}」吗？`, '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        await request.delete(`/sales/leads/${row.id}`)
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
const detailRow = ref<Lead | null>(null)
const detailFollows = ref<FollowRecord[]>([])
const detailFollowLoading = ref(false)

function handleDetail(row: Lead) {
  detailRow.value = row
  detailFollows.value = []
  detailDrawerVisible.value = true
}

/** 抽屉打开时加载完整详情 */
async function fetchDetailData() {
  if (!detailRow.value) return
  const leadId = detailRow.value.id
  // 并行加载详情和跟进记录
  await Promise.all([
    fetchDetailInfo(leadId),
    fetchDetailFollows(leadId),
  ])
}

async function fetchDetailInfo(leadId: number) {
  try {
    const res: any = await request.get(`/sales/leads/${leadId}`)
    detailRow.value = res
  } catch {
    // 错误已在拦截器中处理
  }
}

async function fetchDetailFollows(leadId: number) {
  detailFollowLoading.value = true
  try {
    const res: any = await request.get(`/sales/leads/${leadId}/follows`)
    detailFollows.value = res || []
  } catch {
    detailFollows.value = []
  } finally {
    detailFollowLoading.value = false
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

/* 跟进记录区域 */
.follow-section {
  margin-top: 24px;
}
.follow-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.follow-section-header h4 {
  font-size: 15px;
  color: #303133;
}
.follow-record-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.follow-user {
  font-size: 12px;
  color: #909399;
}
.follow-next {
  font-size: 12px;
  color: #e6a23c;
  margin-left: auto;
}
.follow-content {
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
