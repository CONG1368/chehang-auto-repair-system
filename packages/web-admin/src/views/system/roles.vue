<template>
  <div class="page-container">
    <div class="page-header">
      <h2>角色管理</h2>
      <el-button type="primary" @click="handleAdd">新增角色</el-button>
    </div>
    <el-card>
      <el-table :data="tableData" v-loading="loading" border stripe>
        <el-table-column prop="name" label="角色名称" min-width="120" />
        <el-table-column prop="code" label="编码" min-width="120" />
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
        <el-table-column label="权限" min-width="300">
          <template #default="{ row }">
            <el-tag
              v-for="perm in row.permissions"
              :key="perm"
              size="small"
              style="margin-right: 4px; margin-bottom: 4px"
            >
              {{ permissionLabelMap[perm] || perm }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="160" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入角色名称" maxlength="20" />
        </el-form-item>
        <el-form-item label="编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入角色编码" maxlength="30" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            placeholder="请输入角色描述"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="权限" prop="permissions">
          <el-checkbox-group v-model="form.permissions">
            <el-checkbox
              v-for="item in permissionOptions"
              :key="item.value"
              :value="item.value"
              :label="item.value"
              style="margin-right: 16px; margin-bottom: 8px"
            >
              {{ item.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import request from '@/api/request'

// ============ 类型定义 ============
interface Role {
  id: number
  name: string
  code: string
  description: string
  permissions: string[]
  createdAt: string
}

interface RoleForm {
  name: string
  code: string
  description: string
  permissions: string[]
}

// ============ 权限选项 ============
const permissionOptions = [
  { label: 'dashboard-经营驾驶舱', value: 'dashboard' },
  { label: 'sales-新车销售', value: 'sales' },
  { label: 'repair-维修服务', value: 'repair' },
  { label: 'beauty-美容服务', value: 'beauty' },
  { label: 'finance-财务管理', value: 'finance' },
  { label: 'inventory-库存管理', value: 'inventory' },
  { label: 'customer-客户管理', value: 'customer' },
  { label: 'report-数据报表', value: 'report' },
]

const permissionLabelMap = permissionOptions.reduce((map, item) => {
  map[item.value] = item.label
  return map
}, {} as Record<string, string>)

// ============ 表格数据 ============
const tableData = ref<Role[]>([])
const loading = ref(false)

// ============ 弹窗相关 ============
const dialogVisible = ref(false)
const dialogTitle = computed(() => (form.id ? '编辑角色' : '新增角色'))
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const initForm = (): RoleForm & { id?: number } => ({
  id: undefined,
  name: '',
  code: '',
  description: '',
  permissions: [],
})

const form = reactive<RoleForm & { id?: number }>(initForm())

const formRules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '编码只能包含字母、数字和下划线，且以字母或下划线开头', trigger: 'blur' },
  ],
}

// ============ API 调用 ============
async function fetchRoles() {
  loading.value = true
  try {
    tableData.value = await request.get('/roles')
  } finally {
    loading.value = false
  }
}

async function createRole(data: RoleForm) {
  return request.post('/roles', data)
}

async function updateRole(id: number, data: RoleForm) {
  return request.put(`/roles/${id}`, data)
}

async function deleteRole(id: number) {
  return request.delete(`/roles/${id}`)
}

// ============ 操作方法 ============
function handleAdd() {
  Object.assign(form, initForm())
  dialogVisible.value = true
}

function handleEdit(row: Role) {
  Object.assign(form, {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    permissions: [...row.permissions],
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    const payload: RoleForm = {
      name: form.name,
      code: form.code,
      description: form.description,
      permissions: form.permissions,
    }
    if (form.id) {
      await updateRole(form.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createRole(payload)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    fetchRoles()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: Role) {
  try {
    await ElMessageBox.confirm(
      `确定要删除角色「${row.name}」吗？删除后不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  try {
    await deleteRole(row.id)
    ElMessage.success('删除成功')
    fetchRoles()
  } catch (error: any) {
    // 角色下有用户时后端返回特定错误
    const msg = error?.message || ''
    if (msg.includes('用户') || msg.includes('user')) {
      ElMessage.warning('该角色下存在关联用户，无法删除')
    } else {
      ElMessage.error(msg || '删除失败')
    }
  }
}

// ============ 初始化 ============
onMounted(() => {
  fetchRoles()
})
</script>

<style scoped>
.page-container {
  padding: 0;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h2 {
  font-size: 18px;
  color: #303133;
}
</style>
