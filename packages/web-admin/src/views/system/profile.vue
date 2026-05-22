<template>
  <div class="page-container">
    <div class="page-header">
      <h2>个人设置</h2>
    </div>
    <el-card>
      <el-row :gutter="40">
        <el-col :span="8" style="text-align:center">
          <el-avatar :size="100" :src="form.avatar" v-if="form.avatar" />
          <el-avatar :size="100" icon="UserFilled" v-else />
          <div style="margin-top:16px">
            <el-upload
              :show-file-list="false"
              :before-upload="handleBeforeUpload"
              :http-request="handleAvatarUpload"
              accept="image/*"
            >
              <el-button type="primary" size="small">更换头像</el-button>
            </el-upload>
          </div>
        </el-col>
        <el-col :span="16">
          <el-form :model="form" label-width="80px">
            <el-form-item label="真实姓名">
              <el-input v-model="form.realName" />
            </el-form-item>
            <el-form-item label="手机号">
              <el-input v-model="form.phone" />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="form.email" />
            </el-form-item>
            <el-form-item label="角色">
              <el-input :value="authStore.userInfo?.roleName" disabled />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="handleSave">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { updateProfile } from '@/api/auth'
import request from '@/api/request'

const authStore = useAuthStore()
const saving = ref(false)

const form = reactive({
  realName: '',
  phone: '',
  email: '',
  avatar: '',
})

onMounted(() => {
  if (authStore.userInfo) {
    form.realName = authStore.userInfo.realName || ''
    form.phone = authStore.userInfo.phone || ''
    form.email = authStore.userInfo.email || ''
    form.avatar = authStore.userInfo.avatar || ''
  }
})

function handleBeforeUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB')
    return false
  }
  return true
}

async function handleAvatarUpload(options: any) {
  const formData = new FormData()
  formData.append('files', options.file)
  try {
    const res: any = await request.post('/upload/batch?module=avatars', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (res && res.urls && res.urls.length > 0) {
      form.avatar = res.urls[0]
      ElMessage.success('头像上传成功')
    }
  } catch {
    ElMessage.error('头像上传失败')
  }
}

async function handleSave() {
  saving.value = true
  try {
    const result: any = await updateProfile({
      realName: form.realName,
      phone: form.phone,
      email: form.email,
      avatar: form.avatar,
    })
    // 直接更新 store 中数据
    if (authStore.userInfo) {
      authStore.userInfo.realName = result.realName
      authStore.userInfo.phone = result.phone
      authStore.userInfo.email = result.email
      authStore.userInfo.avatar = result.avatar
    }
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}
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
