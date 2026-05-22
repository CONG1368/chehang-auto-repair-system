<template>
  <div class="page-container">
    <div class="page-header">
      <h2>库存查询</h2>
    </div>

    <!-- 低库存预警 -->
    <el-card class="low-stock-card" v-if="lowStockList.length > 0">
      <template #header>
        <div class="low-stock__header">
          <span class="low-stock__title">
            <el-icon style="color: #E6A23C; margin-right: 6px"><WarningFilled /></el-icon>
            低库存预警（{{ lowStockList.length }} 项）
          </span>
        </div>
      </template>
      <el-table :data="lowStockList" border stripe size="small" v-loading="lowStockLoading">
        <el-table-column prop="code" label="编码" width="120" />
        <el-table-column prop="name" label="配件名称" min-width="140" />
        <el-table-column prop="spec" label="规格" width="100" />
        <el-table-column prop="currentStock" label="当前库存" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.currentStock <= 3 ? 'danger' : 'warning'" effect="dark" size="small">
              {{ row.currentStock }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="safetyStock" label="安全库存" width="100" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.currentStock === 0 ? '#F56C6C' : '#E6A23C', fontWeight: 'bold' }">
              {{ row.currentStock === 0 ? '缺货' : '不足' }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 库存流水 -->
    <el-card style="margin-top: 16px">
      <div class="search-bar">
        <el-button type="primary" @click="handleExport">
          <el-icon><Download /></el-icon>导出Excel
        </el-button>
      </div>
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%; margin-top: 16px"
        @row-click="handleDetail"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column label="配件编码" min-width="120">
          <template #default="{ row }">
            {{ row.part?.code || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="配件名称" min-width="140">
          <template #default="{ row }">
            {{ row.part?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="规格" min-width="100">
          <template #default="{ row }">
            {{ row.part?.spec || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'in' ? 'success' : 'danger'" size="small">
              {{ row.type === 'in' ? '入库' : '出库' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="数量" width="80" align="center">
          <template #default="{ row }">
            {{ row.quantity }}
          </template>
        </el-table-column>
        <el-table-column label="变动前库存" width="110" align="center">
          <template #default="{ row }">
            {{ row.beforeQty }}
          </template>
        </el-table-column>
        <el-table-column label="变动后库存" width="110" align="center">
          <template #default="{ row }">
            {{ row.afterQty }}
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="150">
          <template #default="{ row }">
            {{ row.remark || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="160">
          <template #default="{ row }">
            {{ row.createdAt }}
          </template>
        </el-table-column>
      </el-table>

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

    <el-drawer
      v-model="detailDrawerVisible"
      title="库存记录详情"
      size="500px"
      :close-on-click-modal="true"
    >
      <template v-if="detailRow">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="ID">{{ detailRow.id }}</el-descriptions-item>
          <el-descriptions-item label="配件ID">{{ detailRow.partId }}</el-descriptions-item>
          <el-descriptions-item label="配件编码">{{ detailRow.part?.code || '-' }}</el-descriptions-item>
          <el-descriptions-item label="配件名称">{{ detailRow.part?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="规格">{{ detailRow.part?.spec || '-' }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag :type="detailRow.type === 'in' ? 'success' : 'danger'" size="small">
              {{ detailRow.type === 'in' ? '入库' : '出库' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="数量">{{ detailRow.quantity }}</el-descriptions-item>
          <el-descriptions-item label="变动前库存">{{ detailRow.beforeQty }}</el-descriptions-item>
          <el-descriptions-item label="变动后库存">{{ detailRow.afterQty }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailRow.remark || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">{{ detailRow.createdAt }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, WarningFilled } from '@element-plus/icons-vue'
import request from '@/api/request'
import { downloadFile } from '@/utils/download'

interface LowStockPart {
  id: number
  code: string
  name: string
  spec: string
  currentStock: number
  safetyStock: number
}

interface PartInfo {
  id: number
  code: string
  name: string
  spec: string
}

interface StockRecord {
  id: number
  partId: number
  type: 'in' | 'out'
  quantity: number
  beforeQty: number
  afterQty: number
  remark: string
  createdAt: string
  part: PartInfo
}

const tableData = ref<StockRecord[]>([])
const loading = ref(false)
const lowStockList = ref<LowStockPart[]>([])
const lowStockLoading = ref(false)

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const detailDrawerVisible = ref(false)
const detailRow = ref<StockRecord | null>(null)

async function fetchLowStock() {
  lowStockLoading.value = true
  try {
    const res: any = await request.get('/inventory/low-stock')
    lowStockList.value = Array.isArray(res) ? res : (res?.list || [])
  } catch {
    // 低库存加载失败不阻断主流程
  } finally {
    lowStockLoading.value = false
  }
}

async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/inventory/stock-records', {
      params: {
        page: pagination.page,
        pageSize: pagination.pageSize,
      },
    })
    tableData.value = res.list ?? []
    pagination.total = res.total ?? 0
  } catch {
    ElMessage.error('加载库存流水失败')
  } finally {
    loading.value = false
  }
}

function handleDetail(row: StockRecord) {
  detailRow.value = row
  detailDrawerVisible.value = true
}

function handleExport() {
  downloadFile('/api/export/excel?module=inventory_stock', '库存流水.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

onMounted(() => {
  fetchLowStock()
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

.low-stock-card {
  border: 1px solid #faecd8;
  border-radius: 8px;
}
.low-stock-card :deep(.el-card__header) {
  background: #fdf6ec;
  border-bottom: 1px solid #faecd8;
  padding: 12px 20px;
}
.low-stock__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.low-stock__title {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
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
