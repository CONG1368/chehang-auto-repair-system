<template>
  <div class="page-container">
    <div class="page-header">
      <h2>质检交车</h2>
    </div>
    <el-card>
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 待质检 -->
        <el-tab-pane label="待质检" name="pending">
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
            <el-table-column prop="repairItems" label="维修项目" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.repairItems ?? '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="estimatedAmount" label="预计金额" width="120" align="right">
              <template #default="{ row }">
                &yen;{{ row.estimatedAmount?.toFixed(2) ?? '0.00' }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleQualityCheck(row)">
                  质检
                </el-button>
                <el-button link type="success" size="small" @click="handleDeliver(row)">
                  交车
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

        <!-- 质检记录 -->
        <el-tab-pane label="质检记录" name="records">
          <el-table
            v-loading="loadingRecords"
            :data="recordsTableData"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column prop="orderNo" label="工单号" min-width="140" />
            <el-table-column prop="plateNo" label="车牌" min-width="100" />
            <el-table-column prop="customerName" label="客户" min-width="100" />
            <el-table-column prop="technicianName" label="技师" min-width="100" />
            <el-table-column label="质检结论" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.qualityResult === 'pass' ? 'success' : 'danger'" size="small">
                  {{ row.qualityResult === 'pass' ? '通过' : '不通过' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="qualityCheckerName" label="质检人" min-width="100" />
            <el-table-column prop="qualityCheckAt" label="质检时间" min-width="170" />
            <el-table-column label="交车状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.deliveredAt ? 'success' : 'warning'" size="small">
                  {{ row.deliveredAt ? '已交车' : '未交车' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.qualityRemark ?? '-' }}
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="recordsPagination.page"
              v-model:page-size="recordsPagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="recordsPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="fetchQualityRecords"
              @current-change="fetchQualityRecords"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 质检弹窗 -->
    <el-dialog
      v-model="qualityDialogVisible"
      title="质检"
      width="600px"
      :close-on-click-modal="false"
      @closed="handleQualityDialogClosed"
    >
      <el-form
        ref="qualityFormRef"
        :model="qualityForm"
        :rules="qualityFormRules"
        label-width="100px"
      >
        <el-form-item label="工单号">
          <span>{{ currentOrder?.orderNo }}</span>
        </el-form-item>
        <el-form-item label="车牌">
          <span>{{ currentOrder?.plateNo }}</span>
        </el-form-item>
        <el-form-item label="质检项目" prop="checkItems">
          <el-checkbox-group v-model="qualityForm.checkItems">
            <div class="checkbox-grid">
              <el-checkbox label="维修项目核对">维修项目核对</el-checkbox>
              <el-checkbox label="配件安装检查">配件安装检查</el-checkbox>
              <el-checkbox label="功能测试">功能测试</el-checkbox>
              <el-checkbox label="外观清洁">外观清洁</el-checkbox>
              <el-checkbox label="路试验收">路试验收</el-checkbox>
            </div>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="路试结果" prop="testDriveResult">
          <el-radio-group v-model="qualityForm.testDriveResult">
            <el-radio value="pass">通过</el-radio>
            <el-radio value="fail">不通过</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="qualityForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入质检备注"
          />
        </el-form-item>
        <el-form-item label="质检结论" prop="conclusion">
          <el-radio-group v-model="qualityForm.conclusion">
            <el-radio value="pass">通过</el-radio>
            <el-radio value="fail">不通过</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="qualityDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="qualitySubmitLoading" @click="submitQualityCheck">
          提交质检
        </el-button>
      </template>
    </el-dialog>

    <!-- 交车弹窗 -->
    <el-dialog
      v-model="deliverDialogVisible"
      title="费用确认交车"
      width="560px"
      :close-on-click-modal="false"
      @closed="handleDeliverDialogClosed"
    >
      <el-form
        ref="deliverFormRef"
        :model="deliverForm"
        :rules="deliverFormRules"
        label-width="100px"
      >
        <el-form-item label="工单号">
          <span>{{ currentOrder?.orderNo }}</span>
        </el-form-item>
        <el-form-item label="车牌">
          <span>{{ currentOrder?.plateNo }}</span>
        </el-form-item>
        <el-form-item label="客户">
          <span>{{ currentOrder?.customerName }}</span>
        </el-form-item>
        <el-divider />
        <el-form-item label="工时费">
          <span class="fee-amount">&yen;{{ deliverForm.laborFee?.toFixed(2) ?? '0.00' }}</span>
        </el-form-item>
        <el-form-item label="配件费">
          <span class="fee-amount">&yen;{{ deliverForm.partsFee?.toFixed(2) ?? '0.00' }}</span>
        </el-form-item>
        <el-form-item label="优惠金额" prop="discount">
          <el-input-number
            v-model="deliverForm.discount"
            :min="0"
            :precision="2"
            style="width: 100%"
            placeholder="请输入优惠金额"
            @change="calcFinalAmount"
          />
        </el-form-item>
        <el-divider />
        <el-form-item label="最终金额">
          <span class="final-amount">&yen;{{ finalAmount.toFixed(2) }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="deliverDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="deliverSubmitLoading" @click="submitDeliver">
          确认交车
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'

// ==================== 类型定义 ====================
interface RepairOrder {
  id: number
  orderNo: string
  plateNo: string
  customerName: string
  repairItems?: string
  estimatedAmount?: number
  status: string
  technicianName?: string
  qualityResult?: string
  qualityCheckerName?: string
  qualityCheckAt?: string
  qualityRemark?: string
  deliveredAt?: string
  laborFee?: number
  partsFee?: number
}

interface QualityForm {
  checkItems: string[]
  testDriveResult: string
  remark: string
  conclusion: string
}

interface DeliverForm {
  laborFee: number
  partsFee: number
  discount: number
}

// ==================== Tab 状态 ====================
const activeTab = ref('pending')

// ==================== 待质检表格 ====================
const pendingTableData = ref<RepairOrder[]>([])
const loading = ref(false)
const pendingPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 质检记录表格 ====================
const recordsTableData = ref<RepairOrder[]>([])
const loadingRecords = ref(false)
const recordsPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 质检弹窗 ====================
const qualityDialogVisible = ref(false)
const qualitySubmitLoading = ref(false)
const qualityFormRef = ref<FormInstance>()
const currentOrder = ref<RepairOrder | null>(null)

const qualityForm = reactive<QualityForm>({
  checkItems: [],
  testDriveResult: 'pass',
  remark: '',
  conclusion: 'pass',
})

const qualityFormRules: FormRules = {
  checkItems: [
    { type: 'array', required: true, message: '请至少选择一项质检项目', trigger: 'change' },
  ],
  testDriveResult: [{ required: true, message: '请选择路试结果', trigger: 'change' }],
  conclusion: [{ required: true, message: '请选择质检结论', trigger: 'change' }],
}

// ==================== 交车弹窗 ====================
const deliverDialogVisible = ref(false)
const deliverSubmitLoading = ref(false)
const deliverFormRef = ref<FormInstance>()

const deliverForm = reactive<DeliverForm>({
  laborFee: 0,
  partsFee: 0,
  discount: 0,
})

const deliverFormRules: FormRules = {
  discount: [
    { required: true, message: '请输入优惠金额', trigger: 'blur' },
    {
      validator: (_rule, value: number, callback) => {
        const maxDiscount = deliverForm.laborFee + deliverForm.partsFee
        if (value > maxDiscount) {
          callback(new Error(`优惠金额不能超过合计金额 &yen;${maxDiscount.toFixed(2)}`))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
}

/** 计算最终金额 */
const finalAmount = computed(() => {
  const total = deliverForm.laborFee + deliverForm.partsFee - deliverForm.discount
  return Math.max(0, total)
})

function calcFinalAmount() {
  // 触发响应式更新（computed 已自动处理）
}

// ==================== 方法 ====================

/** 获取待质检工单列表 */
async function fetchPendingOrders() {
  loading.value = true
  try {
    const res: any = await request.get('/repair', {
      params: {
        status: 'quality_check',
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

/** 获取质检记录列表 */
async function fetchQualityRecords() {
  loadingRecords.value = true
  try {
    const res: any = await request.get('/repair', {
      params: {
        status: 'quality_checked,delivered',
        page: recordsPagination.page,
        pageSize: recordsPagination.pageSize,
      },
    })
    recordsTableData.value = res.list ?? []
    recordsPagination.total = res.total ?? 0
  } catch {
    // 错误已在拦截器中处理
  } finally {
    loadingRecords.value = false
  }
}

/** Tab 切换 */
function handleTabChange(name: string | number) {
  if (name === 'pending') {
    fetchPendingOrders()
  } else if (name === 'records') {
    fetchQualityRecords()
  }
}

// ==================== 质检操作 ====================

/** 打开质检弹窗 */
function handleQualityCheck(row: RepairOrder) {
  currentOrder.value = row
  qualityForm.checkItems = []
  qualityForm.testDriveResult = 'pass'
  qualityForm.remark = ''
  qualityForm.conclusion = 'pass'
  qualityDialogVisible.value = true
}

/** 关闭质检弹窗清理 */
function handleQualityDialogClosed() {
  qualityFormRef.value?.resetFields()
}

/** 提交质检 */
async function submitQualityCheck() {
  const valid = await qualityFormRef.value?.validate().catch(() => false)
  if (!valid) return

  qualitySubmitLoading.value = true
  try {
    await request.post('/repair/quality-check', {
      orderId: currentOrder.value!.id,
      checkItems: qualityForm.checkItems,
      testDriveResult: qualityForm.testDriveResult,
      remark: qualityForm.remark,
      conclusion: qualityForm.conclusion,
    })
    ElMessage.success(qualityForm.conclusion === 'pass' ? '质检通过' : '质检不通过')
    qualityDialogVisible.value = false
    fetchPendingOrders()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    qualitySubmitLoading.value = false
  }
}

// ==================== 交车操作 ====================

/** 打交车弹窗 */
function handleDeliver(row: RepairOrder) {
  currentOrder.value = row
  deliverForm.laborFee = row.laborFee ?? 0
  deliverForm.partsFee = row.partsFee ?? 0
  deliverForm.discount = 0
  deliverDialogVisible.value = true
}

/** 关闭交车弹窗清理 */
function handleDeliverDialogClosed() {
  deliverFormRef.value?.resetFields()
}

/** 提交交车 */
async function submitDeliver() {
  const valid = await deliverFormRef.value?.validate().catch(() => false)
  if (!valid) return

  deliverSubmitLoading.value = true
  try {
    await request.put(`/repair/${currentOrder.value!.id}/deliver`, {
      laborFee: deliverForm.laborFee,
      partsFee: deliverForm.partsFee,
      discount: deliverForm.discount,
      finalAmount: finalAmount.value,
    })
    ElMessage.success('交车成功')
    deliverDialogVisible.value = false
    fetchPendingOrders()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    deliverSubmitLoading.value = false
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
.checkbox-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
}
.fee-amount {
  font-size: 16px;
  color: #606266;
}
.final-amount {
  font-size: 22px;
  font-weight: bold;
  color: #e6a23c;
}
</style>
