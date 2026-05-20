<template>
  <view class="page">
    <view class="tab-bar">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: currentTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="order-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="orders.length === 0 && !loading" class="empty-hint">
        <text>暂无工单</text>
      </view>

      <view
        v-for="order in orders"
        :key="order.id"
        class="order-card"
        @click="viewDetail(order)"
      >
        <view class="order-header">
          <text class="order-no">{{ order.orderNo || order.id }}</text>
          <text class="order-status" :style="{ color: statusColor(order.status) }">
            {{ statusText(order.status) }}
          </text>
        </view>
        <view class="order-info">
          <text class="order-plate">{{ order.plateNumber || '未知车牌' }}</text>
          <text class="order-customer">{{ order.customerName || '未知客户' }}</text>
        </view>
        <view class="order-footer" v-if="order.createdAt">
          <text class="order-time">建单时间：{{ formatTime(order.createdAt) }}</text>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && orders.length > 0" class="loading-more">
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

const tabs = [
  { label: '全部', value: '' },
  { label: '待派工', value: 'pending' },
  { label: '维修中', value: 'repairing' },
  { label: '待质检', value: 'checking' },
];

const currentTab = ref('');
const orders = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

const statusMap: Record<string, string> = {
  pending: '待派工',
  repairing: '维修中',
  checking: '待质检',
  done: '已完成',
  cancelled: '已取消',
};

function statusText(status: string) {
  return statusMap[status] || status;
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#E6A23C',
    repairing: '#409EFF',
    checking: '#909399',
    done: '#67C23A',
    cancelled: '#F56C6C',
  };
  return colors[status] || '#909399';
}

function switchTab(value: string) {
  currentTab.value = value;
  page = 1;
  noMore.value = false;
  orders.value = [];
  fetchOrders();
}

function fetchOrders() {
  loading.value = true;
  let url = `/repair?page=${page}&pageSize=20`;
  if (currentTab.value) {
    url += `&status=${currentTab.value}`;
  }
  apiFetch<any[]>({ url })
    .then((data) => {
      const list = data || [];
      if (page === 1) {
        orders.value = list;
      } else {
        orders.value = orders.value.concat(list);
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

function loadMore() {
  if (loadingMore.value || noMore.value) return;
  loadingMore.value = true;
  page++;
  fetchOrders();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchOrders();
}

function viewDetail(order: any) {
  uni.navigateTo({ url: `/pages/repair/detail?id=${order.id}` });
}

function formatTime(time: string) {
  if (!time) return '';
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onMounted(() => {
  fetchOrders();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}
.tab-bar {
  display: flex;
  background: #fff;
  padding: 0 16px;
  border-bottom: 1px solid #eee;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 14px;
  color: #606266;
  position: relative;
}
.tab-item.active {
  color: #409EFF;
  font-weight: bold;
}
.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 3px;
  background: #409EFF;
  border-radius: 2px;
}
.order-list {
  flex: 1;
  padding: 12px 16px;
}
.order-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.order-no {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}
.order-status {
  font-size: 13px;
  font-weight: 500;
}
.order-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.order-plate {
  font-size: 14px;
  color: #409EFF;
  font-weight: 500;
}
.order-customer {
  font-size: 13px;
  color: #606266;
}
.order-footer {
  margin-top: 4px;
}
.order-time {
  font-size: 12px;
  color: #C0C4CC;
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
