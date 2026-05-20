<template>
  <div class="page-container">
    <div class="page-header">
      <h2>技师派工</h2>
    </div>
    <el-card>
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 待派工 -->
        <el-tab-pane label="待派工" name="pending">
          <el-table
            v-loading="loading"
            :data="pendingTableData"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column prop="orderNo" label="工单号" min-width="140" />
            <el-table-column prop="plateNo" label="车牌" min-width="100" />
            <el-table-column prop="customerName" label="客户" min-width="100" />
            <el-table-column prop="faultDesc" label="故障描述" min-width="200" show-overflow-tooltip />
            <el-table-column prop="itemCount" label="维修项目数" width="110" align="center" />
            <el-table-column prop="createdAt" label="创建时间" min-width="170" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleDispatch(row)">
                  派工
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="pendingPagination.page"
              v-model:page-size="pendingPagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="pendingPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="fetchPendingOrders"
              @current-change="fetchPendingOrders"
            />
          </div>
        </el-tab-pane>

        <!-- 已派工 -->
        <el-tab-pane label="已派工" name="dispatched">
          <el-table
            v-loading="loadingDispatched"
            :data="dispatchedTableData"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column prop="orderNo" label="工单号" min-width="140" />
            <el-table-column prop="plateNo" label="车牌" min-width="100" />
            <el-table-column prop="customerName" label="客户" min-width="100" />
            <el-table-column prop="technicianName" label="技师" min-width="100" />
            <el-table-column prop="standardHours" label="标准工时" width="100" align="center" />
            <el-table-column prop="actualHours" label="实际工时" width="100" align="center">
              <template #default="{ row }">
                {{ row.actualHours ?? '-' }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'repairing' ? 'warning' : 'info'" size="small">
                  {{ row.status === 'repairing' ? '维修中' : '已派工' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  link
                  type="success"
                  size="small"
                  :disabled="row.status === 'completed'"
                  @click="handleComplete(row)"
                >
                  完成
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="dispatchedPagination.page"
              v-model:page-size="dispatchedPagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="dispatchedPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="fetchDispatchedOrders"
              @current-change="fetchDispatchedOrders"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 派工弹窗 -->
    <el-dialog
      v-model="dispatchDialogVisible"
      title="派工"
      width="500px"
      :close-on-click-modal="false"
      @closed="handleDispatchDialogClosed"
    >
      <el-form
        ref="dispatchFormRef"
        :model="dispatchForm"
        :rules="dispatchFormRules"
        label-width="100px"
      >
        <el-form-item label="工单号">
          <span>{{ currentOrder?.orderNo }}</span>
        </el-form-item>
        <el-form-item label="车牌">
          <span>{{ currentOrder?.plateNo }}</span>
        </el-form-item>
        <el-form-item label="选择技师" prop="technicianId">
          <el-select v-model="dispatchForm.technicianId" placeholder="请选择技师" style="width: 100%">
            <el-option
              v-for="tech in technicianList"
              :key="tech.id"
              :label="tech.realName"
              :value="tech.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标准工时" prop="standardHours">
          <el-input-number
            v-model="dispatchForm.standardHours"
            :min="0.5"
            :max="999"
            :step="0.5"
            :precision="1"
            style="width: 100%"
            placeholder="请输入标准工时（小时）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dispatchDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dispatchSubmitLoading" @click="submitDispatch">
          确认派工
        </el-button>
      </template>
    </el-dialog>

    <!-- 完成维修弹窗 -->
    <el-dialog
      v-model="completeDialogVisible"
      title="完成维修"
      width="500px"
      :close-on-click-modal="false"
      @closed="handleCompleteDialogClosed"
    >
      <el-form
        ref="completeFormRef"
        :model="completeForm"
        :rules="completeFormRules"
        label-width="100px"
      >
        <el-form-item label="工单号">
          <span>{{ currentOrder?.orderNo }}</span>
        </el-form-item>
        <el-form-item label="车牌">
          <span>{{ currentOrder?.plateNo }}</span>
        </el-form-item>
        <el-form-item label="技师">
          <span>{{ currentOrder?.technicianName }}</span>
        </el-form-item>
        <el-form-item label="标准工时">
          <span>{{ currentOrder?.standardHours }} 小时</span>
        </el-form-item>
        <el-form-item label="实际工时" prop="actualHours">
          <el-input-number
            v-model="completeForm.actualHours"
            :min="0.5"
            :max="999"
            :step="0.5"
            :precision="1"
            style="width: 100%"
            placeholder="请输入实际工时（小时）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="completeSubmitLoading" @click="submitComplete">
          确认完成
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'

// ==================== 类型定义 ====================
interface RepairOrder {
  id: number
  orderNo: string
  plateNo: string
  customerName: string
  faultDesc: string
  itemCount: number
  status: string
  technicianName?: string
  technicianId?: number
  standardHours?: number
  actualHours?: number
  createdAt: string
}

interface Technician {
  id: number
  realName: string
}

interface DispatchForm {
  technicianId: number | null
  standardHours: number
}

interface CompleteForm {
  actualHours: number
}

// ==================== Tab 状态 ====================
const activeTab = ref('pending')

// ==================== 待派工表格 ====================
const pendingTableData = ref<RepairOrder[]>([])
const loading = ref(false)
const pendingPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 已派工表格 ====================
const dispatchedTableData = ref<RepairOrder[]>([])
const loadingDispatched = ref(false)
const dispatchedPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 派工弹窗 ====================
const dispatchDialogVisible = ref(false)
const dispatchSubmitLoading = ref(false)
const dispatchFormRef = ref<FormInstance>()
const currentOrder = ref<RepairOrder | null>(null)
const technicianList = ref<Technician[]>([])

const dispatchForm = reactive<DispatchForm>({
  technicianId: null,
  standardHours: 2,
})

const dispatchFormRules: FormRules = {
  technicianId: [{ required: true, message: '请选择技师', trigger: 'change' }],
  standardHours: [{ required: true, message: '请输入标准工时', trigger: 'blur' }],
}

// ==================== 完成维修弹窗 ====================
const completeDialogVisible = ref(false)
const completeSubmitLoading = ref(false)
const completeFormRef = ref<FormInstance>()

const completeForm = reactive<CompleteForm>({
  actualHours: 0,
})

const completeFormRules: FormRules = {
  actualHours: [{ required: true, message: '请输入实际工时', trigger: 'blur' }],
}

// ==================== 方法 ====================

/** 获取待派工工单列表 */
async function fetchPendingOrders() {
  loading.value = true
  try {
    const res: any = await request.get('/repair', {
      params: {
        status: 'pending',
        page: pendingPagination.page,
        pageSize: pendingPagination.pageSize,
      },
    })
    pendingTableData.value = res.list ?? []
    pendingPagination.total = res.total ?? 0
  } catch {
    // 错误已在拦截器中处理
  } finally {
    loading.value = false
  }
}

/** 获取已派工工单列表 */
async function fetchDispatchedOrders() {
  loadingDispatched.value = true
  try {
    const res: any = await request.get('/repair', {
      params: {
        status: 'assigned,repairing',
        page: dispatchedPagination.page,
        pageSize: dispatchedPagination.pageSize,
      },
    })
    dispatchedTableData.value = res.list ?? []
    dispatchedPagination.total = res.total ?? 0
  } catch {
    // 错误已在拦截器中处理
  } finally {
    loadingDispatched.value = false
  }
}

/** 获取技师列表（roleId=4） */
async function fetchTechnicians() {
  try {
    const res: any = await request.get('/users', {
      params: {
        roleId: 4,
      },
    })
    // 兼容分页和全量返回
    technicianList.value = res.list ?? res ?? []
  } catch {
    // 错误已在拦截器中处理
  }
}

/** Tab 切换 */
function handleTabChange(name: string | number) {
  if (name === 'pending') {
    fetchPendingOrders()
  } else if (name === 'dispatched') {
    fetchDispatchedOrders()
  }
}

/** 打开派工弹窗 */
async function handleDispatch(row: RepairOrder) {
  currentOrder.value = row
  dispatchForm.technicianId = null
  dispatchForm.standardHours = 2
  // 每次打开弹窗时重新拉取技师列表
  await fetchTechnicians()
  dispatchDialogVisible.value = true
}

/** 关闭派工弹窗清理 */
function handleDispatchDialogClosed() {
  dispatchFormRef.value?.resetFields()
}

/** 提交派工 */
async function submitDispatch() {
  const valid = await dispatchFormRef.value?.validate().catch(() => false)
  if (!valid) return

  dispatchSubmitLoading.value = true
  try {
    await request.post('/repair/dispatch', {
      orderId: currentOrder.value!.id,
      technicianId: dispatchForm.technicianId,
      standardHours: dispatchForm.standardHours,
    })
    ElMessage.success('派工成功')
    dispatchDialogVisible.value = false
    fetchPendingOrders()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    dispatchSubmitLoading.value = false
  }
}

/** 打开完成维修弹窗 */
function handleComplete(row: RepairOrder) {
  currentOrder.value = row
  completeForm.actualHours = row.actualHours ?? row.standardHours ?? 0
  completeDialogVisible.value = true
}

/** 关闭完成弹窗清理 */
function handleCompleteDialogClosed() {
  completeFormRef.value?.resetFields()
}

/** 提交完成维修 */
async function submitComplete() {
  const valid = await completeFormRef.value?.validate().catch(() => false)
  if (!valid) return

  completeSubmitLoading.value = true
  try {
    await request.put(`/repair/dispatch/${currentOrder.value!.id}/complete`, {
      actualHours: completeForm.actualHours,
    })
    ElMessage.success('维修完成')
    completeDialogVisible.value = false
    fetchDispatchedOrders()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    completeSubmitLoading.value = false
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  fetchPendingOrders()
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
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
