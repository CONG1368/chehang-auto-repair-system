<template>
  <view class="page">
    <!-- 顶部操作栏 -->
    <view class="top-bar">
      <view class="title-area">
        <text class="page-title">消息通知</text>
        <text v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</text>
      </view>
      <view class="read-all-btn" v-if="unreadCount > 0" @click="markAllRead">
        <text>全部已读</text>
      </view>
    </view>

    <!-- 类型筛选 -->
    <view class="filter-bar">
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-items">
          <view
            v-for="tab in typeTabs"
            :key="tab.value"
            class="filter-tab"
            :class="{ active: filterType === tab.value }"
            @click="switchType(tab.value)"
          >
            <text>{{ tab.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 通知列表 -->
    <scroll-view
      scroll-y
      class="notification-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="notifications.length === 0 && !loading" class="empty-hint">
        <text>暂无消息通知</text>
      </view>

      <view
        v-for="item in notifications"
        :key="item.id"
        class="notification-card"
        :class="{ unread: !item.isRead }"
        @click="handleClick(item)"
      >
        <view class="notify-header">
          <text class="notify-title">{{ item.title }}</text>
          <view v-if="!item.isRead" class="unread-dot" />
        </view>
        <view class="notify-content">
          <text class="notify-summary">{{ item.content }}</text>
        </view>
        <view class="notify-footer">
          <text class="notify-type tag">{{ typeLabel(item.type) }}</text>
          <text class="notify-time">{{ formatTime(item.createdAt) }}</text>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <text>加载中...</text>
      </view>
      <view v-if="noMore && notifications.length > 0" class="loading-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- 全文弹窗 -->
    <view class="modal-mask" v-if="showDetail" @click="showDetail = false">
      <view class="modal-content" @click.stop>
        <view class="modal-title">
          <text>{{ detailItem?.title }}</text>
        </view>
        <view class="modal-body">
          <text class="detail-text">{{ detailItem?.content }}</text>
        </view>
        <view class="detail-meta" v-if="detailItem">
          <text class="detail-time">{{ formatTime(detailItem.createdAt) }}</text>
        </view>
        <view class="modal-close" @click="showDetail = false">
          <text>关闭</text>
        </view>
      </view>
    </view>
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

const typeTabs = [
  { label: '全部', value: '' },
  { label: '维修', value: 'repair' },
  { label: '库存', value: 'stock' },
  { label: '客户', value: 'customer' },
  { label: '系统', value: 'system' },
  { label: '美容', value: 'beauty' },
];

const typeMap: Record<string, string> = {
  repair: '维修',
  stock: '库存',
  customer: '客户',
  system: '系统',
  beauty: '美容',
};

function typeLabel(t: string) {
  return typeMap[t] || t || '--';
}

function formatTime(dateStr: string) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 导航到详情页
function navigateByTarget(item: any) {
  const targetType = item.targetType;
  const targetId = item.targetId;
  if (targetType === 'repair_order' && targetId) {
    uni.navigateTo({ url: `/pages/repair/detail?id=${targetId}` });
  } else if (targetType === 'customer' && targetId) {
    uni.navigateTo({ url: `/pages/customer/detail?id=${targetId}` });
  } else {
    // 无 targetType 或未匹配，弹窗展示全文
    detailItem.value = item;
    showDetail.value = true;
  }
}

// 列表状态
const filterType = ref('');
const notifications = ref<any[]>([]);
const unreadCount = ref(0);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

// 详情弹窗状态
const showDetail = ref(false);
const detailItem = ref<any>(null);

function fetchNotifications() {
  loading.value = true;
  let url = `/notifications?page=${page}&pageSize=20`;
  if (filterType.value) {
    url += `&type=${filterType.value}`;
  }
  apiFetch<{ list: any[]; total: number }>({ url })
    .then((data) => {
      const list = data?.list || [];
      if (page === 1) {
        notifications.value = list;
      } else {
        notifications.value = notifications.value.concat(list);
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

function fetchUnreadCount() {
  apiFetch<{ count: number }>({ url: '/notifications/unread-count' })
    .then((data) => {
      unreadCount.value = data?.count ?? 0;
    })
    .catch(() => {});
}

function switchType(value: string) {
  filterType.value = value;
  page = 1;
  noMore.value = false;
  notifications.value = [];
  fetchNotifications();
}

function loadMore() {
  if (loadingMore.value || noMore.value) return;
  loadingMore.value = true;
  page++;
  fetchNotifications();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchNotifications();
  fetchUnreadCount();
}

// 点击通知：标记已读 + 跳转
async function handleClick(item: any) {
  if (!item.isRead) {
    try {
      await apiFetch({ url: `/notifications/${item.id}/read`, method: 'PUT' });
      item.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch {
      // 标记失败不影响后续跳转
    }
  }
  navigateByTarget(item);
}

// 全部已读
async function markAllRead() {
  try {
    await apiFetch({ url: '/notifications/read-all', method: 'PUT' });
    unreadCount.value = 0;
    notifications.value.forEach((n) => {
      n.isRead = true;
    });
    uni.showToast({ title: '已全部标记为已读', icon: 'success' });
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' });
  }
}

onMounted(() => {
  fetchNotifications();
  fetchUnreadCount();
});
</script>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 32rpx;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.title-area {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.page-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}
.unread-badge {
  min-width: 40rpx;
  height: 40rpx;
  line-height: 40rpx;
  text-align: center;
  background: #F56C6C;
  color: #fff;
  font-size: 22rpx;
  border-radius: 20rpx;
  padding: 0 10rpx;
}
.read-all-btn {
  font-size: 26rpx;
  color: #409EFF;
  padding: 8rpx 20rpx;
}
.filter-bar {
  background: #fff;
  border-bottom: 1px solid #eee;
  padding: 16rpx 0;
}
.filter-scroll {
  white-space: nowrap;
}
.filter-items {
  display: inline-flex;
  padding: 0 24rpx;
  gap: 16rpx;
}
.filter-tab {
  flex-shrink: 0;
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  background: #f5f5f5;
  font-size: 26rpx;
  color: #666;
}
.filter-tab.active {
  background: #ecf5ff;
  color: #409EFF;
  font-weight: bold;
}
.notification-list {
  flex: 1;
  padding: 12px 16px;
}
.notification-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: background 0.2s;
}
.notification-card.unread {
  border-left: 6rpx solid #409EFF;
  background: #f0f7ff;
}
.notify-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.notify-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
.unread-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #409EFF;
  flex-shrink: 0;
}
.notify-content {
  margin-bottom: 14rpx;
}
.notify-summary {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.notify-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
  background: #ecf5ff;
  color: #409EFF;
}
.notify-time {
  font-size: 22rpx;
  color: #999;
}
.empty-hint {
  text-align: center;
  padding: 200rpx 0;
  color: #C0C4CC;
  font-size: 28rpx;
}
.loading-more {
  text-align: center;
  padding: 32rpx;
  color: #999;
  font-size: 24rpx;
}

/* 全文弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 60rpx;
}
.modal-content {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  width: 100%;
  max-height: 70vh;
  overflow-y: auto;
}
.modal-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
  text-align: center;
}
.modal-body {
  margin-bottom: 24rpx;
}
.detail-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.8;
  white-space: pre-wrap;
}
.detail-meta {
  text-align: center;
  margin-bottom: 32rpx;
}
.detail-time {
  font-size: 24rpx;
  color: #999;
}
.modal-close {
  text-align: center;
  padding: 24rpx 0;
}
.modal-close text {
  font-size: 30rpx;
  color: #409EFF;
  font-weight: bold;
}
</style>
