<template>
  <view class="page">
    <view class="logo-area">
      <text class="app-name">泰州车行维修厂</text>
      <text class="app-desc">综合管理系统</text>
    </view>
    <view class="form">
      <u-input v-model="username" placeholder="用户名" border="bottom" />
      <u-input v-model="password" type="password" placeholder="密码" border="bottom" />
      <u-button type="primary" :loading="loading" @click="handleLogin" style="margin-top:30px">登 录</u-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const username = ref('admin');
const password = ref('admin123');
const loading = ref(false);

function handleLogin() {
  loading.value = true;
  setTimeout(() => {
    loading.value = false;
    uni.switchTab({ url: '/pages/index/index' });
  }, 1000);
}
</script>

<style scoped>
.page {
  padding: 60px 40px;
}
.logo-area {
  text-align: center;
  margin-bottom: 50px;
}
.app-name {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}
.app-desc {
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
  display: block;
}
.form {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
}
</style>
