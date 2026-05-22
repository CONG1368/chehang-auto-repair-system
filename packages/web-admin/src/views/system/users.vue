<template>
  <div class="page-container">
    <div class="page-header">
      <h2>用户管理</h2>
    </div>
    <el-card>
      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="searchForm.username"
          placeholder="用户名"
          clearable
          style="width: 180px"
          @keyup.enter="handleSearch"
        />
        <el-input
          v-model="searchForm.realName"
          placeholder="姓名"
          clearable
          style="width: 180px; margin-left: 12px"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" style="margin-left: 12px" @click="handleSearch">
          搜索
        </el-button>
        <el-button style="margin-left: 12px" @click="handleReset">重置</el-button>
        <el-button type="success" style="margin-left: auto" @click="handleAdd">
          新增用户
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
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="realName" label="姓名" min-width="100" />
        <el-table-column prop="phone" label="手机号" min-width="130" />
        <el-table-column label="角色" min-width="120">
          <template #default="{ row }">
            {{ row.role?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              :loading="row._statusLoading"
              @change="(val: boolean) => handleStatusChange(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button link type="info" size="small" @click="handleDetail(row)">
              详情
            </el-button>
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">
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

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="用户详情"
      size="480px"
      :close-on-click-modal="false"
    >
      <template v-if="detailRow">
        <el-descriptions :column="1" border size="default">
          <el-descriptions-item label="用户名">{{ detailRow.username }}</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ detailRow.realName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detailRow.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ detailRow.email || '-' }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag size="small">{{ detailRow.role?.name || '未分配' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="权限">
            <template v-if="detailPermissions.length">
              <el-tag
                v-for="(perm, idx) in detailPermissions"
                :key="idx"
                size="small"
                style="margin: 2px 4px 2px 0"
              >
                {{ permissionLabelMap[perm] || perm }}
              </el-tag>
            </template>
            <span v-else-if="detailRow.role?.name === '超级管理员'">全部权限（*）</span>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detailRow.status === 1 ? 'success' : 'info'" size="small">
              {{ detailRow.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ detailRow.createdAt || '-' }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <template #footer>
        <el-button @click="drawerVisible = false">关闭</el-button>
      </template>
    </el-drawer>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      width="560px"
      :close-on-click-modal="false"
      @closed="handleDialogClosed"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="密码" :prop="isEdit ? '' : 'password'">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="isEdit ? '留空则不修改密码' : '请输入密码'"
          />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="头像">
          <el-upload :auto-upload="false" :on-change="handleAvatarChange" :file-list="avatarList" accept="image/*" :limit="1">
            <el-button type="primary">选择头像</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="角色" prop="roleId">
          <el-select v-model="form.roleId" placeholder="请选择角色" style="width: 100%">
            <el-option
              v-for="role in roleList"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch
            :model-value="form.status === 1"
            active-text="启用"
            inactive-text="禁用"
            @change="(val: boolean) => (form.status = val ? 1 : 0)"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
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
import { uploadFiles } from '@/utils/upload'
import { permissionLabelMap } from '@/constants/permissions'

// ==================== 类型定义 ====================
interface User {
  id: number
  username: string
  realName: string
  phone: string
  email: string
  roleId: number | null
  role?: { name: string }
  status: number
  createdAt: string
  _statusLoading?: boolean
}

interface Role {
  id: number
  name: string
}

interface UserForm {
  username: string
  password: string
  realName: string
  phone: string
  email: string
  roleId: number | null
  status: number
}

// ==================== 查询条件 ====================
const searchForm = reactive({
  username: '',
  realName: '',
})

// ==================== 分页 ====================
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// ==================== 表格数据 ====================
const tableData = ref<User[]>([])
const loading = ref(false)

// ==================== 弹窗相关 ====================
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentUserId = ref<number | null>(null)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

// ==================== 详情抽屉 ====================
const drawerVisible = ref(false)
const detailRow = ref<User | null>(null)
const detailPermissions = ref<string[]>([])

async function handleDetail(row: User) {
  detailRow.value = row
  drawerVisible.value = true

  // 获取角色权限信息
  if (row.roleId) {
    try {
      const res: any = await request.get(`/roles/${row.roleId}`)
      if (res && res.permissions) {
        detailPermissions.value = typeof res.permissions === 'string'
          ? JSON.parse(res.permissions)
          : res.permissions
      } else {
        detailPermissions.value = []
      }
    } catch {
      // 查询角色时尝试从本地 roleList 获取
      const role = roleList.value.find((r: any) => r.id === row.roleId)
      if (role && (role as any).permissions) {
        const perms = (role as any).permissions
        detailPermissions.value = typeof perms === 'string' ? JSON.parse(perms) : perms
      } else {
        detailPermissions.value = []
      }
    }
  } else {
    detailPermissions.value = []
  }
}

const initForm = (): UserForm => ({
  username: '',
  password: '',
  realName: '',
  phone: '',
  email: '',
  roleId: null,
  status: 1,
})

const form = reactive<UserForm>(initForm())

// ==================== 头像上传 ====================
const avatarList = ref<any[]>([])
const pendingAvatar = ref<File | null>(null)

function handleAvatarChange(file: any) {
  pendingAvatar.value = file.raw
}

// ==================== 角色列表 ====================
const roleList = ref<Role[]>([])

// ==================== 表单校验 ====================
const formRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度为 3-50 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度为 6-50 个字符', trigger: 'blur' },
  ],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  roleId: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

// ==================== 方法 ====================

/** 获取用户列表 */
async function fetchUsers() {
  loading.value = true
  try {
    const res: any = await request.get('/users', {
      params: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...searchForm,
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

/** 获取角色列表 */
async function fetchRoles() {
  try {
    const res: any = await request.get('/roles')
    roleList.value = res ?? []
  } catch {
    // 错误已在拦截器中处理
  }
}

/** 搜索 */
function handleSearch() {
  pagination.page = 1
  fetchUsers()
}

/** 重置 */
function handleReset() {
  searchForm.username = ''
  searchForm.realName = ''
  handleSearch()
}

/** 新增 */
function handleAdd() {
  isEdit.value = false
  currentUserId.value = null
  Object.assign(form, initForm())
  avatarList.value = []
  pendingAvatar.value = null
  dialogVisible.value = true
}

/** 编辑 */
function handleEdit(row: User) {
  isEdit.value = true
  currentUserId.value = row.id
  form.username = row.username
  form.password = ''
  form.realName = row.realName
  form.phone = row.phone
  form.email = row.email
  form.roleId = row.roleId
  form.status = row.status
  avatarList.value = []
  pendingAvatar.value = null
  dialogVisible.value = true
}

/** 弹窗关闭后清理验证 */
function handleDialogClosed() {
  formRef.value?.resetFields()
  avatarList.value = []
  pendingAvatar.value = null
}

/** 提交表单 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    const payload: Record<string, any> = {
      username: form.username,
      realName: form.realName,
      phone: form.phone,
      email: form.email,
      roleId: form.roleId,
      status: form.status,
    }

    // 新增时必传密码，编辑时仅当填写了密码才传
    if (!isEdit.value || form.password) {
      payload.password = form.password
    }

    // 上传头像
    if (pendingAvatar.value) {
      const urls = await uploadFiles([pendingAvatar.value], 'avatars')
      if (urls.length > 0) {
        payload.avatar = urls[0]
      }
    }

    if (isEdit.value) {
      await request.put(`/users/${currentUserId.value}`, payload)
      ElMessage.success('更新成功')
    } else {
      await request.post('/users', payload)
      ElMessage.success('新增成功')
    }

    dialogVisible.value = false
    fetchUsers()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    submitLoading.value = false
  }
}

/** 删除 */
function handleDelete(row: User) {
  ElMessageBox.confirm(
    `确定要删除用户「${row.realName}」吗？删除后不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )
    .then(async () => {
      try {
        await request.delete(`/users/${row.id}`)
        ElMessage.success('删除成功')
        fetchUsers()
      } catch {
        // 错误已在拦截器中处理
      }
    })
    .catch(() => {
      // 用户取消
    })
}

/** 状态切换 */
async function handleStatusChange(row: User, val: boolean) {
  row._statusLoading = true
  const newStatus = val ? 1 : 0
  try {
    await request.put(`/users/${row.id}`, { status: newStatus })
    row.status = newStatus
    ElMessage.success(val ? '已启用' : '已禁用')
  } catch {
    // 错误已在拦截器中处理，恢复原状态
  } finally {
    row._statusLoading = false
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  fetchUsers()
  fetchRoles()
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
</style>
