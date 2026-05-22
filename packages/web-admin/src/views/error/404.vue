<template>
  <div class="not-found">
    <div class="not-found__code">404</div>
    <div class="not-found__title">页面不存在</div>
    <div class="not-found__desc">您访问的页面不存在或已被移除</div>
    <el-button type="primary" size="large" @click="goHome">返回首页</el-button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push('/dashboard')
}
</script>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
}

.not-found__code {
  font-size: 120px;
  font-weight: 700;
  color: #dcdfe6;
  line-height: 1;
}

.not-found__title {
  font-size: 22px;
  color: #303133;
  margin: 20px 0 12px;
}

.not-found__desc {
  font-size: 14px;
  color: #909399;
  margin-bottom: 32px;
}
</style>
