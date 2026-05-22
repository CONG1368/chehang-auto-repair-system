<template>
  <div class="page-container">
    <div class="page-header">
      <h2>操作日志</h2>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">今日操作数</div>
            <div class="stat-value">{{ stats.todayCount }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <!-- 筛选栏 -->
      <div class="search-bar">
        <el-input
          v-model="searchForm.userId"
          placeholder="用户ID"
          clearable
          style="width: 120px"
          @keyup.enter="handleSearch"
        />
        <el-select
          v-model="searchForm.module"
          placeholder="操作模块"
          clearable
          style="width: 140px; margin-left: 12px"
          @change="handleSearch"
        >
          <el-option label="认证" value="auth" />
          <el-option label="客户" value="customer" />
          <el-option label="维修" value="repair" />
          <el-option label="库存" value="inventory" />
          <el-option label="销售" value="sales" />
          <el-option label="美容" value="beauty" />
          <el-option label="财务" value="finance" />
          <el-option label="系统" value="system" />
        </el-select>
        <el-select
          v-model="searchForm.action"
          placeholder="操作类型"
          clearable
          style="width: 140px; margin-left: 12px"
          @change="handleSearch"
        >
          <el-option label="登录" value="login" />
          <el-option label="新增" value="create" />
          <el-option label="编辑" value="update" />
          <el-option label="删除" value="delete" />
          <el-option label="导出" value="export" />
        </el-select>
        <el-date-picker
          v-model="searchForm.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="margin-left: 12px; width: 260px"
          @change="handleSearch"
        />
        <el-button type="primary" style="margin-left: 12px" @click="handleSearch">
          搜索
        </el-button>
        <el-button style="margin-left: 12px" @click="handleReset">重置</el-button>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%; margin-top: 16px"
      >
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="操作用户" min-width="100">
          <template #default="{ row }">
            {{ row.user?.realName || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作模块" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ moduleLabelMap[row.module] || row.module }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="actionTagType(row.action)">
              {{ actionLabelMap[row.action] || row.action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetName" label="目标名称" min-width="120">
          <template #default="{ row }">
            {{ row.targetName || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.detail || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP" width="140" />
        <el-table-column prop="createdAt" label="操作时间" min-width="170" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import request from '@/api/request'

// ==================== 类型定义 ====================
interface AuditLog {
  id: number
  userId: number
  action: string
  module: string
  targetId: number | null
  targetName: string | null
  detail: string | null
  ip: string | null
  createdAt: string
  user: {
    id: number
    realName: string
    username: string
  } | null
}

// ==================== 标签映射 ====================
const moduleLabelMap: Record<string, string> = {
  auth: '认证',
  customer: '客户',
  repair: '维修',
  inventory: '库存',
  sales: '销售',
  beauty: '美容',
  finance: '财务',
  system: '系统',
}

const actionLabelMap: Record<string, string> = {
  login: '登录',
  logout: '登出',
  create: '新增',
  update: '编辑',
  delete: '删除',
  export: '导出',
}

function actionTagType(action: string): string {
  const map: Record<string, string> = {
    login: 'success',
    logout: 'info',
    create: 'primary',
    update: 'warning',
    delete: 'danger',
    export: '',
  }
  return map[action] || ''
}

// ==================== 统计 ====================
const stats = reactive({
  todayCount: 0,
})

// ==================== 查询条件 ====================
const searchForm = reactive({
  userId: '',
  module: '',
  action: '',
  dateRange: [] as string[],
})

// ==================== 分页 ====================
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// ==================== 表格数据 ====================
const tableData = ref<AuditLog[]>([])
const loading = ref(false)

// ==================== 方法 ====================

/** 获取统计数据 */
async function fetchStats() {
  try {
    const res: any = await request.get('/audit/stats')
    stats.todayCount = res.todayCount ?? 0
  } catch {
    // 错误已在拦截器中处理
  }
}

/** 获取日志列表 */
async function fetchLogs() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }
    if (searchForm.userId) params.userId = searchForm.userId
    if (searchForm.module) params.module = searchForm.module
    if (searchForm.action) params.action = searchForm.action
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    const res: any = await request.get('/audit', { params })
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
  fetchLogs()
}

/** 重置 */
function handleReset() {
  searchForm.userId = ''
  searchForm.module = ''
  searchForm.action = ''
  searchForm.dateRange = []
  handleSearch()
}

// ==================== 生命周期 ====================
onMounted(() => {
  fetchStats()
  fetchLogs()
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
.stat-card {
  text-align: center;
  padding: 8px 0;
}
.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}
.search-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
