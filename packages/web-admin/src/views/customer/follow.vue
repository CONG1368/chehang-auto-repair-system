<template>
  <div class="page-container">
    <div class="page-header">
      <h2>跟进记录</h2>
    </div>

    <el-card class="search-card">
      <div class="search-bar">
        <el-select
          v-model="selectedCustomerId"
          filterable
          remote
          reserve-keyword
          placeholder="请输入客户姓名或电话搜索"
          :remote-method="remoteSearch"
          :loading="customerLoading"
          clearable
          class="customer-select"
          @change="onCustomerChange"
        >
          <el-option
            v-for="item in customerOptions"
            :key="item.id"
            :label="`${item.name} - ${item.phone}`"
            :value="item.id"
          />
        </el-select>
      </div>
    </el-card>

    <div v-if="!selectedCustomerId" class="empty-wrap">
      <el-empty description="请选择客户" />
    </div>

    <template v-else>
      <el-card class="toolbar-card">
        <div class="toolbar">
          <span class="current-customer">
            当前客户：<strong>{{ currentCustomer?.name }}</strong>
            <span class="customer-phone">{{ currentCustomer?.phone }}</span>
          </span>
          <el-button type="primary" @click="showAddDialog">新增跟进</el-button>
        </div>
      </el-card>

      <el-card class="timeline-card">
        <el-timeline v-if="follows.length > 0" v-loading="followLoading">
          <el-timeline-item
            v-for="item in follows"
            :key="item.id"
            :timestamp="item.createdAt"
            placement="top"
          >
            <el-card shadow="hover">
              <div class="follow-header">
                <el-tag size="small" :type="getFollowTypeTag(item.type)">
                  {{ item.type }}
                </el-tag>
                <span class="follow-user">跟进人：{{ item.user?.realName || '-' }}</span>
                <span v-if="item.nextFollowAt" class="follow-next">
                  下次跟进：{{ item.nextFollowAt }}
                </span>
              </div>
              <p class="follow-content">{{ item.content }}</p>
            </el-card>
          </el-timeline-item>
        </el-timeline>
        <el-empty
          v-if="!followLoading && follows.length === 0"
          description="暂无跟进记录"
        />
      </el-card>
    </template>

    <el-dialog
      v-model="dialogVisible"
      title="新增跟进记录"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="跟进类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择跟进类型" style="width: 100%">
            <el-option label="电话回访" value="电话回访" />
            <el-option label="微信沟通" value="微信沟通" />
            <el-option label="到店接待" value="到店接待" />
            <el-option label="售后跟进" value="售后跟进" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进内容" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="4"
            placeholder="请输入跟进内容"
          />
        </el-form-item>
        <el-form-item label="下次跟进日期">
          <el-date-picker
            v-model="formData.nextFollowAt"
            type="date"
            placeholder="请选择下次跟进日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
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
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'

interface Customer {
  id: number
  name: string
  phone: string
}

interface FollowRecord {
  id: number
  type: string
  content: string
  userId: number
  nextFollowAt: string | null
  createdAt: string
  user?: {
    realName: string
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const customerLoading = ref(false)
const customerOptions = ref<Customer[]>([])
const selectedCustomerId = ref<number | null>(null)
const currentCustomer = ref<Customer | null>(null)

const remoteSearch = (keyword: string) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    fetchCustomers(keyword)
  }, 300)
}

const fetchCustomers = async (keyword: string) => {
  customerLoading.value = true
  try {
    const params: Record<string, string | number> = { page: 1, pageSize: 20 }
    if (keyword.trim()) {
      params.keyword = keyword.trim()
    }
    const res = await request.get<any, { list: Customer[]; total: number }>('/customers', { params })
    customerOptions.value = res.list || []
  } catch {
    customerOptions.value = []
  } finally {
    customerLoading.value = false
  }
}

const onCustomerChange = (val: number | null) => {
  if (val) {
    const found = customerOptions.value.find((c) => c.id === val)
    currentCustomer.value = found || null
    fetchFollows()
  } else {
    currentCustomer.value = null
    follows.value = []
  }
}

const follows = ref<FollowRecord[]>([])
const followLoading = ref(false)

const fetchFollows = async () => {
  if (!selectedCustomerId.value) return
  followLoading.value = true
  try {
    const res = await request.get<any, FollowRecord[]>(`/customers/${selectedCustomerId.value}/follows`)
    follows.value = res || []
  } catch {
    follows.value = []
  } finally {
    followLoading.value = false
  }
}

const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive({
  type: '',
  content: '',
  nextFollowAt: ''
})

const formRules: FormRules = {
  type: [{ required: true, message: '请选择跟进类型', trigger: 'change' }],
  content: [{ required: true, message: '请输入跟进内容', trigger: 'blur' }]
}

const resetForm = () => {
  formData.type = ''
  formData.content = ''
  formData.nextFollowAt = ''
}

const showAddDialog = () => {
  resetForm()
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    await request.post(`/customers/${selectedCustomerId.value}/follows`, {
      type: formData.type,
      content: formData.content,
      nextFollowAt: formData.nextFollowAt || undefined
    })
    ElMessage.success('新增跟进记录成功')
    dialogVisible.value = false
    fetchFollows()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    submitLoading.value = false
  }
}

const followTypeTagMap: Record<string, string> = {
  '电话回访': '',
  '微信沟通': 'success',
  '到店接待': 'primary',
  '售后跟进': 'warning'
}

const getFollowTypeTag = (type: string) => {
  return followTypeTagMap[type] || 'info'
}
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

.search-card {
  margin-bottom: 16px;
}

.search-bar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.customer-select {
  width: 400px;
}

.empty-wrap {
  margin-top: 40px;
}

.toolbar-card {
  margin-bottom: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.current-customer {
  font-size: 14px;
  color: #606266;
}

.current-customer strong {
  color: #303133;
}

.customer-phone {
  margin-left: 12px;
  color: #909399;
  font-size: 13px;
}

.timeline-card {
  margin-bottom: 16px;
}

.follow-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.follow-user {
  font-size: 12px;
  color: #909399;
}

.follow-next {
  font-size: 12px;
  color: #e6a23c;
  margin-left: auto;
}

.follow-content {
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
