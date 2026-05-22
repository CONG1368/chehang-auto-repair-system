<template>
  <div class="page-container">
    <div class="page-header">
      <h2>会员卡管理</h2>
      <p class="page-desc">会员卡类型由系统预设，支持普通、银卡、金卡、钻石四种等级</p>
    </div>
    <el-card>
      <!-- 工具栏 -->
      <div class="toolbar">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>新增会员卡
        </el-button>
        <el-button @click="handleExport">
          <el-icon style="margin-right: 4px"><Download /></el-icon>导出Excel
        </el-button>
      </div>

      <!-- 表格 -->
      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%; cursor: pointer"
        @row-click="handleDetail"
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
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleDetail(row)">
              详情
            </el-button>
            <el-button type="warning" link size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">
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
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchCards"
          @current-change="fetchCards"
        />
      </div>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="会员卡详情"
      size="500px"
      destroy-on-close
    >
      <template v-if="detailCard">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="卡号">{{ detailCard.cardNo }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ detailCard.name }}</el-descriptions-item>
          <el-descriptions-item label="等级">
            <el-tag :type="levelTagType(detailCard.level)" size="small">
              {{ detailCard.level }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="折扣">
            <span v-if="detailCard.discount < 1" style="color: #f56c6c; font-weight: 500">
              {{ (detailCard.discount * 10).toFixed(1) }}折
            </span>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="最低充值">¥{{ detailCard.minRecharge }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detailCard.status === 1 ? 'success' : 'danger'" size="small">
              {{ detailCard.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="描述">{{ detailCard.description || '-' }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>

    <!-- 新增/编辑会员卡弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑会员卡' : '新增会员卡'"
      width="500px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="卡号" prop="cardNo">
          <el-input v-model="formData.cardNo" placeholder="请输入卡号" />
        </el-form-item>
        <el-form-item label="卡片名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入卡片名称" />
        </el-form-item>
        <el-form-item label="等级" prop="level">
          <el-input-number v-model="formData.level" :min="1" placeholder="等级" />
        </el-form-item>
        <el-form-item label="折扣" prop="discount">
          <el-input-number v-model="formData.discount" :min="0" :max="10" :precision="1" placeholder="如9.5折=9.5" />
        </el-form-item>
        <el-form-item label="最低充值" prop="minRecharge">
          <el-input-number v-model="formData.minRecharge" :min="0" :precision="2" placeholder="最低充值金额" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Plus, Edit } from '@element-plus/icons-vue'
import request from '@/api/request'
import { downloadFile } from '@/utils/download'

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

interface CardForm {
  cardNo: string
  name: string
  level: number
  discount: number
  minRecharge: number
}

interface EditCardForm {
  id: number
  cardNo: string
  name: string
  level: number
  discount: number
  minRecharge: number
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

// ==================== 导出 ====================
function handleExport() {
  downloadFile('/api/export/excel?module=beauty_cards', '会员卡.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

// ==================== 详情抽屉 ====================
const drawerVisible = ref(false)
const detailCard = ref<MemberCard | null>(null)

// ==================== 新增/编辑会员卡 ====================
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number>(0)
const formRef = ref()
const formData = reactive<CardForm>({
  cardNo: '',
  name: '',
  level: 1,
  discount: 9.5,
  minRecharge: 0,
})
const formRules = {
  cardNo: [{ required: true, message: '请输入卡号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入卡片名称', trigger: 'blur' }],
  level: [{ required: true, message: '请选择等级', trigger: 'change' }],
  discount: [{ required: true, message: '请输入折扣', trigger: 'change' }],
}

function handleAdd() {
  isEdit.value = false
  editingId.value = 0
  formData.cardNo = ''
  formData.name = ''
  formData.level = 1
  formData.discount = 9.5
  formData.minRecharge = 0
  formRef.value?.resetFields()
  dialogVisible.value = true
}

function handleEdit(row: MemberCard) {
  isEdit.value = true
  editingId.value = row.id
  formData.cardNo = row.cardNo
  formData.name = row.name
  formData.level = parseInt(row.level) || 1
  formData.discount = row.discount
  formData.minRecharge = row.minRecharge
  formRef.value?.resetFields()
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  try {
    if (isEdit.value) {
      await request.put(`/beauty/cards/${editingId.value}`, formData)
      ElMessage.success('编辑会员卡成功')
    } else {
      await request.post('/beauty/cards', formData)
      ElMessage.success('新增会员卡成功')
    }
    dialogVisible.value = false
    fetchCards()
  } catch {
    // 错误已在拦截器中处理
  }
}

async function handleDetail(row: MemberCard) {
  drawerVisible.value = true
  try {
    const res: any = await request.get(`/beauty/cards/${row.id}`)
    detailCard.value = res
  } catch {
    drawerVisible.value = false
  }
}

// ==================== 删除 ====================
function handleDelete(row: MemberCard) {
  ElMessageBox.confirm(`确定删除会员卡「${row.name}」(${row.cardNo})吗？`, '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(async () => {
      try {
        await request.delete(`/beauty/cards/${row.id}`)
        ElMessage.success('删除成功')
        fetchCards()
      } catch {
        // 错误已在拦截器中处理
      }
    })
    .catch(() => {})
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
.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
