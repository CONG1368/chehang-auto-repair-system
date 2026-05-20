<template>
  <div class="page-container">
    <div class="page-header">
      <h2>会员卡管理</h2>
      <p class="page-desc">会员卡类型由系统预设，支持普通、银卡、金卡、钻石四种等级</p>
    </div>
    <el-card>
      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="cardNo" label="卡号" min-width="150" />
        <el-table-column prop="name" label="名称" min-width="120" />
        <el-table-column label="等级" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="levelTagType(row.level)"
              size="small"
            >
              {{ row.level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="折扣" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.discount < 1" style="color: #f56c6c; font-weight: 500">
              {{ (row.discount * 10).toFixed(1) }}折
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="最低充值(¥)" width="130" align="center">
          <template #default="{ row }">
            ¥{{ row.minRecharge }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 1 ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="200">
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchCards"
          @current-change="fetchCards"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import request from '@/api/request'

// ==================== 类型定义 ====================
interface MemberCard {
  id: number
  cardNo: string
  name: string
  level: string
  discount: number
  minRecharge: number
  status: number
  description?: string
}

// ==================== 等级标签颜色映射 ====================
function levelTagType(level: string) {
  const map: Record<string, string> = {
    '普通': 'info',
    '银卡': 'warning',
    '金卡': 'primary',
    '钻石': 'danger',
  }
  return map[level] || 'info'
}

// ==================== 分页 ====================
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 表格数据 ====================
const tableData = ref<MemberCard[]>([])
const loading = ref(false)

// ==================== 方法 ====================

/** 获取会员卡列表 */
async function fetchCards() {
  loading.value = true
  try {
    const res: any = await request.get('/beauty/cards', {
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

// ==================== 生命周期 ====================
onMounted(() => {
  fetchCards()
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
  margin-bottom: 4px;
}
.page-desc {
  font-size: 13px;
  color: #909399;
  margin: 0;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
