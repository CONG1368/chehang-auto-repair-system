<template>
  <div class="page-container">
    <div class="page-header">
      <h2>交车管理</h2>
    </div>
    <el-card>
      <!-- 表格（仅展示已签约订单） -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="orderNo" label="订单号" min-width="160" />
        <el-table-column prop="customerName" label="客户" min-width="100" />
        <el-table-column prop="vehicleInfo" label="车辆" min-width="140" />
        <el-table-column label="销售价(¥)" min-width="120" align="right">
          <template #default="{ row }">
            {{ row.salePrice != null ? Number(row.salePrice).toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="定金(¥)" min-width="110" align="right">
          <template #default="{ row }">
            {{ row.deposit != null ? Number(row.deposit).toLocaleString() : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleDelivery(row)">
              交车
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
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 交车弹窗 -->
    <el-dialog
      v-model="deliveryDialogVisible"
      title="交车确认"
      width="600px"
      :close-on-click-modal="false"
      @closed="handleDeliveryDialogClosed"
    >
      <div v-if="currentOrder">
        <el-descriptions :column="2" border size="small" style="margin-bottom: 20px">
          <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ currentOrder.customerName }}</el-descriptions-item>
          <el-descriptions-item label="车辆">{{ currentOrder.vehicleInfo }}</el-descriptions-item>
          <el-descriptions-item label="销售价">
            ¥{{ currentOrder.salePrice != null ? Number(currentOrder.salePrice).toLocaleString() : '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">交车检查清单</el-divider>
        <el-form
          ref="checklistFormRef"
          :model="checklistForm"
          label-width="auto"
        >
          <el-checkbox-group v-model="checklistForm.items" style="width: 100%">
            <div class="checklist-item">
              <el-checkbox label="wash" value="wash">
                <span class="checklist-label">车辆清洗</span>
              </el-checkbox>
              <span class="checklist-desc">确认车辆外观清洗干净，无污渍</span>
            </div>
            <div class="checklist-item">
              <el-checkbox label="pdi" value="pdi">
                <span class="checklist-label">PDI检测</span>
              </el-checkbox>
              <span class="checklist-desc">完成交车前PDI全车检测，无故障码</span>
            </div>
            <div class="checklist-item">
              <el-checkbox label="docs" value="docs">
                <span class="checklist-label">资料准备</span>
              </el-checkbox>
              <span class="checklist-desc">发票、合格证、保养手册、三包凭证等资料齐全</span>
            </div>
            <div class="checklist-item">
              <el-checkbox label="procedure" value="procedure">
                <span class="checklist-label">手续办理</span>
              </el-checkbox>
              <span class="checklist-desc">保险、临牌、购置税等手续已办理完毕</span>
            </div>
            <div class="checklist-item">
              <el-checkbox label="vas" value="vas">
                <span class="checklist-label">增值服务</span>
              </el-checkbox>
              <span class="checklist-desc">精品安装、功能讲解、延保等增值服务已确认</span>
            </div>
          </el-checkbox-group>

          <el-divider content-position="left">交车信息</el-divider>

          <el-form-item label="交车日期" prop="deliveryDate">
            <el-date-picker
              v-model="checklistForm.deliveryDate"
              type="date"
              placeholder="选择交车日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="备注" prop="remark">
            <el-input
              v-model="checklistForm.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入交车备注"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="deliveryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="deliverySubmitLoading" @click="handleDeliverySubmit">
          确认交车
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import request from '@/api/request'

// ==================== 类型定义 ====================
interface Order {
  id: number
  orderNo: string
  customerName: string
  vehicleInfo: string
  salePrice: number
  deposit: number
  status: string
}

interface ChecklistForm {
  items: string[]
  deliveryDate: string
  remark: string
}

// ==================== 分页 ====================
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 表格数据 ====================
const tableData = ref<Order[]>([])
const loading = ref(false)

// ==================== 交车弹窗 ====================
const deliveryDialogVisible = ref(false)
const deliverySubmitLoading = ref(false)
const currentOrder = ref<Order | null>(null)
const checklistFormRef = ref<FormInstance>()

const initChecklistForm = (): ChecklistForm => ({
  items: [],
  deliveryDate: '',
  remark: '',
})

const checklistForm = reactive<ChecklistForm>(initChecklistForm())

// ==================== 方法 ====================

/** 获取已签约订单列表 */
async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/sales/orders', {
      params: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        status: '已签约',
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

/** 点击交车按钮 */
function handleDelivery(row: Order) {
  currentOrder.value = row
  Object.assign(checklistForm, initChecklistForm())
  deliveryDialogVisible.value = true
}

/** 交车弹窗关闭后清理 */
function handleDeliveryDialogClosed() {
  checklistFormRef.value?.resetFields()
}

/** 确认交车 */
async function handleDeliverySubmit() {
  if (!currentOrder.value) return

  // 校验至少勾选一项
  if (checklistForm.items.length === 0) {
    ElMessage.warning('请至少完成一项交车检查项目')
    return
  }

  deliverySubmitLoading.value = true
  try {
    await request.put(`/sales/orders/${currentOrder.value.id}/delivery`, {
      checklist: checklistForm.items,
      deliveryDate: checklistForm.deliveryDate,
      remark: checklistForm.remark,
    })
    ElMessage.success('交车成功')
    deliveryDialogVisible.value = false
    fetchData()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    deliverySubmitLoading.value = false
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
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.checklist-item {
  display: flex;
  flex-direction: column;
  padding: 10px 0;
  border-bottom: 1px solid #ebeef5;
}
.checklist-item:last-child {
  border-bottom: none;
}
.checklist-label {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}
.checklist-desc {
  font-size: 12px;
  color: #909399;
  margin-left: 24px;
  margin-top: 2px;
}
</style>
