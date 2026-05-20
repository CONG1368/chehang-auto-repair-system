<template>
  <view class="page">
    <!-- 用户信息卡片 -->
    <view class="profile-card">
      <view class="avatar-wrap">
        <view class="avatar">
          <text class="avatar-text">{{ initial }}</text>
        </view>
      </view>
      <view class="user-info">
        <text class="user-name">{{ userInfo.realName || userInfo.username || '--' }}</text>
        <text class="user-role">{{ userInfo.roleName || userInfo.role || '--' }}</text>
        <text class="user-phone">{{ userInfo.phone || '未绑定手机号' }}</text>
      </view>
    </view>

    <!-- 操作菜单 -->
    <view class="menu-section">
      <view class="menu-item" @click="showPasswordForm = true">
        <text class="menu-icon">&#128274;</text>
        <text class="menu-label">修改密码</text>
        <text class="menu-arrow">&gt;</text>
      </view>
      <view class="menu-item" @click="handleLogout">
        <text class="menu-icon" style="color: #F56C6C;">&#128682;</text>
        <text class="menu-label" style="color: #F56C6C;">退出登录</text>
        <text class="menu-arrow">&gt;</text>
      </view>
    </view>

    <!-- 修改密码弹窗 -->
    <view class="password-modal" v-if="showPasswordForm" @click.self="closePasswordForm">
      <view class="password-form">
        <view class="form-title">
          <text>修改密码</text>
        </view>
        <view class="form-item">
          <text class="form-label">原密码</text>
          <input class="form-input" v-model="passwordForm.oldPassword" type="password" placeholder="请输入原密码" />
        </view>
        <view class="form-item">
          <text class="form-label">新密码</text>
          <input class="form-input" v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" />
        </view>
        <view class="form-item">
          <text class="form-label">确认密码</text>
          <input class="form-input" v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" />
        </view>
        <view class="form-buttons">
          <view class="btn btn-cancel" @click="closePasswordForm">
            <text>取消</text>
          </view>
          <view class="btn btn-confirm" @click="submitPassword">
            <text>确认修改</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const BASE_URL = 'http://localhost:3000/api';

function apiFetch<T = any>(options: { url: string; method?: string; data?: any }): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': authStore.token ? `Bearer ${authStore.token}` : '',
      },
      success: (res: any) => {
        if (res.data.code === 200) {
          resolve(res.data.data);
        } else {
          uni.showToast({ title: res.data.message || '请求失败', icon: 'none' });
          reject(res.data);
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络错误，请检查连接', icon: 'none' });
        reject(err);
      },
    });
  });
}

const userInfo = ref<any>({});
const showPasswordForm = ref(false);

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const initial = computed(() => {
  const name = userInfo.value.realName || userInfo.value.username || '?';
  return name.charAt(0).toUpperCase();
});

function fetchProfile() {
  apiFetch<any>({ url: '/users/profile' })
    .then((data) => {
      userInfo.value = data || {};
    })
    .catch(() => {});
}

function closePasswordForm() {
  showPasswordForm.value = false;
  passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
}

function submitPassword() {
  const { oldPassword, newPassword, confirmPassword } = passwordForm.value;
  if (!oldPassword || !newPassword || !confirmPassword) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' });
    return;
  }
  if (newPassword !== confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' });
    return;
  }
  if (newPassword.length < 6) {
    uni.showToast({ title: '密码长度不能少于6位', icon: 'none' });
    return;
  }
  apiFetch<any>({
    url: '/users/password',
    method: 'PUT',
    data: { oldPassword, newPassword },
  })
    .then(() => {
      uni.showToast({ title: '密码修改成功', icon: 'success' });
      closePasswordForm();
    })
    .catch(() => {});
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        authStore.logout();
        uni.reLaunch({ url: '/pages/login/login' });
      }
    },
  });
}

onMounted(() => {
  fetchProfile();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f5f5f5;
}
.profile-card {
  background: linear-gradient(135deg, #409EFF 0%, #1890FF 100%);
  padding: 30px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.avatar-wrap {
  flex-shrink: 0;
}
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.6);
}
.avatar-text {
  font-size: 28px;
  color: #fff;
  font-weight: bold;
}
.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.user-name {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
}
.user-role {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 10px;
  border-radius: 10px;
  align-self: flex-start;
}
.user-phone {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}
.menu-section {
  margin: 16px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f5f5f5;
  gap: 12px;
}
.menu-item:last-child {
  border-bottom: none;
}
.menu-icon {
  font-size: 18px;
}
.menu-label {
  flex: 1;
  font-size: 15px;
  color: #303133;
}
.menu-arrow {
  font-size: 14px;
  color: #C0C4CC;
}

/* 修改密码弹窗 */
.password-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.password-form {
  width: 85%;
  background: #fff;
  border-radius: 12px;
  padding: 24px 20px;
}
.form-title {
  text-align: center;
  font-size: 17px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 20px;
}
.form-item {
  margin-bottom: 14px;
}
.form-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
  display: block;
}
.form-input {
  width: 100%;
  height: 42px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  color: #303133;
  box-sizing: border-box;
}
.form-buttons {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
.btn {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 8px;
  font-size: 15px;
}
.btn-cancel {
  background: #f5f5f5;
  color: #606266;
}
.btn-confirm {
  background: #409EFF;
  color: #fff;
}
</style>
