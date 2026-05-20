<template>
  <view class="page">
    <scroll-view
      scroll-y
      class="role-list"
    >
      <view v-if="roles.length === 0 && !loading" class="empty-hint">
        <text>暂无角色</text>
      </view>

      <view
        v-for="role in roles"
        :key="role.id"
        class="role-card"
      >
        <view class="role-header">
          <view class="role-icon" :style="{ background: iconBg(role.name) }">
            <text>{{ (role.name || '?').charAt(0) }}</text>
          </view>
          <view class="role-info">
            <text class="role-name">{{ role.name }}</text>
            <text class="role-users">{{ role.userCount || 0 }} 位用户</text>
          </view>
        </view>
        <view class="role-permissions" v-if="role.permissions">
          <view
            v-for="(perm, idx) in previewPermissions(role.permissions)"
            :key="idx"
            class="perm-tag"
          >
            <text>{{ perm }}</text>
          </view>
          <view v-if="hasMorePermissions(role.permissions)" class="perm-tag more">
            <text>+{{ role.permissions.length - 5 }}</text>
          </view>
        </view>
        <view class="role-desc" v-if="role.description">
          <text>{{ role.description }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
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

const roles = ref<any[]>([]);
const loading = ref(false);

const iconColors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#1890FF'];

function iconBg(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return iconColors[Math.abs(hash) % iconColors.length];
}

function previewPermissions(permissions: any): string[] {
  if (!permissions) return [];
  let perms: string[] = [];
  if (Array.isArray(permissions)) {
    perms = permissions;
  } else if (typeof permissions === 'string') {
    try {
      perms = JSON.parse(permissions);
    } catch {
      perms = permissions === '*' ? ['超级管理员'] : [permissions];
    }
  }
  return perms.slice(0, 5);
}

function hasMorePermissions(permissions: any): boolean {
  if (!permissions) return false;
  if (Array.isArray(permissions)) return permissions.length > 5;
  if (typeof permissions === 'string') {
    try {
      return JSON.parse(permissions).length > 5;
    } catch {
      return false;
    }
  }
  return false;
}

function fetchRoles() {
  loading.value = true;
  apiFetch<any[]>({ url: '/roles' })
    .then((data) => {
      roles.value = data || [];
    })
    .catch(() => {})
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  fetchRoles();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}
.role-list {
  flex: 1;
  padding: 12px 16px;
}
.role-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.role-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.role-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.role-icon text {
  font-size: 20px;
  color: #fff;
  font-weight: bold;
}
.role-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.role-name {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}
.role-users {
  font-size: 12px;
  color: #909399;
}
.role-permissions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.perm-tag {
  background: #f0f5ff;
  border: 1px solid #d0dfff;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: #409EFF;
}
.perm-tag.more {
  background: #f5f5f5;
  border-color: #e0e0e0;
  color: #909399;
}
.role-desc {
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
  border-top: 1px dashed #eee;
  padding-top: 8px;
}
.empty-hint {
  text-align: center;
  padding: 80px 0;
  color: #C0C4CC;
  font-size: 14px;
}
</style>
