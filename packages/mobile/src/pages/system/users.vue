<template>
  <view class="page">
    <!-- 搜索框 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">&#128269;</text>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索用户姓名"
          @confirm="onSearch"
        />
      </view>
    </view>

    <scroll-view
      scroll-y
      class="user-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="users.length === 0 && !loading" class="empty-hint">
        <text>暂无用户</text>
      </view>

      <view
        v-for="user in users"
        :key="user.id"
        class="user-card"
        @click="viewDetail(user)"
      >
        <view class="user-avatar">
          <text class="avatar-letter">{{ (user.realName || user.username || '?').charAt(0) }}</text>
        </view>
        <view class="user-body">
          <view class="user-header">
            <text class="user-name">{{ user.realName || user.username }}</text>
            <text class="user-status" :style="{ color: user.status === 'active' ? '#67C23A' : '#F56C6C' }">
              {{ user.status === 'active' ? '启用' : '禁用' }}
            </text>
          </view>
          <view class="user-info-row">
            <text class="user-role">{{ user.roleName || user.role || '--' }}</text>
            <text class="user-sep">|</text>
            <text class="user-phone">{{ user.phone || '未填手机号' }}</text>
          </view>
        </view>
        <view class="user-arrow">&gt;</view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && users.length > 0" class="loading-more">
        <text>没有更多了</text>
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

const keyword = ref('');
const users = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

function fetchUsers() {
  loading.value = true;
  let url = `/users?page=${page}&pageSize=20`;
  if (keyword.value) {
    url += `&keyword=${keyword.value}`;
  }
  apiFetch<any[]>({ url })
    .then((data) => {
      const list = data || [];
      if (page === 1) {
        users.value = list;
      } else {
        users.value = users.value.concat(list);
      }
      if (list.length < 20) {
        noMore.value = true;
      }
    })
    .catch(() => {
      if (page > 1) page--;
    })
    .finally(() => {
      loading.value = false;
      refreshing.value = false;
      loadingMore.value = false;
    });
}

function onSearch() {
  page = 1;
  noMore.value = false;
  users.value = [];
  fetchUsers();
}

function loadMore() {
  if (loadingMore.value || noMore.value) return;
  loadingMore.value = true;
  page++;
  fetchUsers();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchUsers();
}

function viewDetail(user: any) {
  uni.navigateTo({ url: `/pages/system/detail?id=${user.id}` });
}

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}
.search-bar {
  background: #fff;
  padding: 10px 16px;
  border-bottom: 1px solid #eee;
}
.search-input-wrap {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 0 12px;
  height: 36px;
}
.search-icon {
  font-size: 14px;
  margin-right: 6px;
  color: #C0C4CC;
}
.search-input {
  flex: 1;
  font-size: 14px;
  color: #303133;
}
.user-list {
  flex: 1;
  padding: 12px 16px;
}
.user-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #E6F7FF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.avatar-letter {
  font-size: 18px;
  color: #409EFF;
  font-weight: bold;
}
.user-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.user-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.user-name {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}
.user-status {
  font-size: 11px;
  font-weight: 500;
}
.user-info-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.user-role {
  font-size: 12px;
  color: #409EFF;
  background: #E6F7FF;
  padding: 1px 8px;
  border-radius: 8px;
}
.user-sep {
  font-size: 12px;
  color: #E0E0E0;
}
.user-phone {
  font-size: 12px;
  color: #909399;
}
.user-arrow {
  font-size: 14px;
  color: #C0C4CC;
  flex-shrink: 0;
}
.empty-hint {
  text-align: center;
  padding: 80px 0;
  color: #C0C4CC;
  font-size: 14px;
}
.loading-more {
  text-align: center;
  padding: 16px;
  color: #909399;
  font-size: 13px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}
</style>
