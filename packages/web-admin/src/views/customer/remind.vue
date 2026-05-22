<template>
  <div class="page-container">
    <div class="page-header">
      <h2>到期提醒</h2>
    </div>

    <el-card class="table-card">
      <div class="search-bar" style="display: flex; align-items: center; margin-bottom: 16px">
        <el-button type="primary" @click="handleExport">
          <el-icon><Download /></el-icon>导出Excel
        </el-button>
      </div>
      <el-tabs v-model="activeType" @tab-change="handleTabChange">
        <el-tab-pane label="保养提醒" name="maintenance" />
        <el-tab-pane label="保险到期" name="insurance" />
        <el-tab-pane label="年检到期" name="inspection" />
      </el-tabs>

      <el-table
        v-loading="loading"
        :data="pagedData"
        border
        stripe
        style="width: 100%; cursor: pointer"
        @row-click="handleDetail"
      >
        <el-table-column prop="customerName" label="客户姓名" width="120" />
        <el-table-column prop="customerPhone" label="电话" width="130" />
        <el-table-column prop="plateNumber" label="车牌号" width="120" />
        <el-table-column label="到期日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.dueDate || row.suggestedDate) }}
          </template>
        </el-table-column>
        <el-table-column label="剩余天数" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.remainDays <= 0" class="text-danger">{{ row.remainDays }}天</span>
            <span v-else-if="row.remainDays <= 7" class="text-warning">{{ row.remainDays }}天</span>
            <span v-else>{{ row.remainDays }}天</span>
          </template>
        </el-table-column>
        <el-table-column label="紧急程度" width="100">
          <template #default="{ row }">
            <el-tag :type="urgentTagType(row.urgent)" size="small">{{ row.urgent }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源类型" width="100">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" size="small">{{ typeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="activeType === 'maintenance'" prop="lastMaintenanceDate" label="上次保养日期" width="120">
          <template #default="{ row }">
            {{ row.lastMaintenanceDate ? formatDate(row.lastMaintenanceDate) : '-' }}
          </template>
        </el-table-column>
        <el-table-column v-if="activeType === 'maintenance'" label="建议保养里程" width="130" align="right">
          <template #default="{ row }">
            {{ row.suggestedMileage ? row.suggestedMileage.toLocaleString() + ' 公里' : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="page = 1"
        />
      </div>
    </el-card>

    <el-drawer
      v-model="drawerVisible"
      title="提醒详情"
      size="600px"
      destroy-on-close
    >
      <div v-if="detailItem" class="drawer-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="客户姓名">{{ detailItem.customerName }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detailItem.customerPhone }}</el-descriptions-item>
          <el-descriptions-item label="车牌号">{{ detailItem.plateNumber }}</el-descriptions-item>
          <el-descriptions-item label="提醒类型">
            <el-tag :type="typeTagType(detailItem.type)" size="small">{{ typeLabel(detailItem.type) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="到期日期">
            {{ formatDate(detailItem.dueDate || detailItem.suggestedDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="剩余天数">
            <span v-if="detailItem.remainDays <= 0" class="text-danger">{{ detailItem.remainDays }}天</span>
            <span v-else-if="detailItem.remainDays <= 7" class="text-warning">{{ detailItem.remainDays }}天</span>
            <span v-else>{{ detailItem.remainDays }}天</span>
          </el-descriptions-item>
          <el-descriptions-item label="紧急程度">
            <el-tag :type="urgentTagType(detailItem.urgent)" size="small">{{ detailItem.urgent }}</el-tag>
          </el-descriptions-item>
          <template v-if="detailItem.type === 'maintenance'">
            <el-descriptions-item label="上次保养日期">
              {{ detailItem.lastMaintenanceDate ? formatDate(detailItem.lastMaintenanceDate) : '无记录' }}
            </el-descriptions-item>
            <el-descriptions-item label="建议保养日期">
              {{ formatDate(detailItem.suggestedDate) }}
            </el-descriptions-item>
            <el-descriptions-item label="当前里程" :span="2">
              {{ detailItem.mileage ? detailItem.mileage.toLocaleString() + ' 公里' : '无记录' }}
            </el-descriptions-item>
            <el-descriptions-item label="建议保养里程">
              {{ detailItem.suggestedMileage ? detailItem.suggestedMileage.toLocaleString() + ' 公里' : '-' }}
            </el-descriptions-item>
          </template>
        </el-descriptions>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import request from '@/api/request'
import { downloadFile } from '@/utils/download'

interface RemindItem {
  id: string
  type: string
  customerId: number
  customerName: string
  customerPhone: string
  plateNumber: string
  dueDate?: string
  remainDays: number
  urgent: string
  lastMaintenanceDate?: string | null
  suggestedDate?: string
  mileage?: number | null
  suggestedMileage?: number | null
}

const activeType = ref('maintenance')
const loading = ref(false)
const allData = ref<RemindItem[]>([])
const page = ref(1)
const pageSize = ref(20)

const total = computed(() => allData.value.length)

const pagedData = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return allData.value.slice(start, end)
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await request.get<any, RemindItem[]>('/customers/reminds', {
      params: { type: activeType.value }
    })
    allData.value = Array.isArray(res) ? res : []
    page.value = 1
  } catch {
    allData.value = []
  } finally {
    loading.value = false
  }
}

const handleTabChange = () => {
  fetchData()
}

const typeLabel = (type: string) => {
  const map: Record<string, string> = {
    maintenance: '保养',
    insurance: '保险',
    inspection: '年检'
  }
  return map[type] || type
}

const typeTagType = (type: string) => {
  const map: Record<string, string> = {
    maintenance: 'primary',
    insurance: 'warning',
    inspection: 'success'
  }
  return map[type] || 'info'
}

const urgentTagType = (urgent: string) => {
  const map: Record<string, string> = {
    '已超期': 'danger',
    '即将到期': 'warning',
    '近期到期': 'info',
    '正常': 'success'
  }
  return map[urgent] || 'info'
}

const formatDate = (val?: string) => {
  if (!val) return '-'
  if (val.length >= 10) return val.substring(0, 10)
  return val
}

const drawerVisible = ref(false)
const detailItem = ref<RemindItem | null>(null)

const handleDetail = (row: RemindItem) => {
  detailItem.value = row
  drawerVisible.value = true
}

function handleExport() {
  downloadFile('/api/export/excel?module=customers', '到期提醒.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

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

.table-card {
  margin-bottom: 16px;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.drawer-content {
  padding: 0 8px;
}

.text-danger {
  color: #f56c6c;
  font-weight: 500;
}

.text-warning {
  color: #e6a23c;
  font-weight: 500;
}
</style>
