<template>
  <view class="page">
    <!-- 模块筛选栏 -->
    <view class="filter-bar">
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-items">
          <view
            v-for="tab in moduleTabs"
            :key="tab.value"
            class="filter-tab"
            :class="{ active: filterModule === tab.value }"
            @click="switchModule(tab.value)"
          >
            <text>{{ tab.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 统计卡片 -->
    <view v-if="stats.todayCount !== undefined" class="stats-bar">
      <text class="stats-text">今日操作：{{ stats.todayCount }} 次</text>
    </view>

    <!-- 日志列表 -->
    <scroll-view
      scroll-y
      class="log-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="logs.length === 0 && !loading" class="empty-hint">
        <text>暂无操作日志</text>
      </view>

      <view
        v-for="item in logs"
        :key="item.id"
        class="log-card"
      >
        <view class="log-indicator" :style="{ background: actionColor(item.action) }" />
        <view class="log-body">
          <view class="log-header">
            <text class="log-operator">{{ item.user?.realName || item.user?.username || '系统' }}</text>
            <text class="log-time">{{ formatTime(item.createdAt) }}</text>
          </view>
          <view class="log-desc">
            <text>{{ item.targetName || item.detail || item.action }}</text>
          </view>
          <view class="log-meta">
            <text class="log-module tag">{{ moduleLabel(item.module) }}</text>
            <text class="log-action tag action-tag">{{ actionLabel(item.action) }}</text>
            <text v-if="item.ip" class="log-ip">{{ item.ip }}</text>
          </view>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <text>加载中...</text>
      </view>
      <view v-if="noMore && logs.length > 0" class="loading-more">
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

const moduleTabs = [
  { label: '全部', value: '' },
  { label: '用户', value: 'user' },
  { label: '客户', value: 'customer' },
  { label: '维修', value: 'repair' },
  { label: '库存', value: 'inventory' },
  { label: '财务', value: 'finance' },
  { label: '系统', value: 'system' },
];

const moduleMap: Record<string, string> = {
  user: '用户',
  customer: '客户',
  repair: '维修',
  inventory: '库存',
  finance: '财务',
  system: '系统',
  auth: '认证',
  sales: '销售',
  beauty: '美容',
};

function moduleLabel(m: string) {
  return moduleMap[m] || m || '--';
}

const actionMap: Record<string, string> = {
  create: '新建',
  update: '编辑',
  delete: '删除',
  login: '登录',
  export: '导出',
  import: '导入',
  stock_in: '入库',
  stock_out: '出库',
  dispatch: '派工',
  quality_check: '质检',
  deliver: '交车',
  pay: '收款',
};

function actionLabel(a: string) {
  return actionMap[a] || a || '--';
}

function actionColor(a: string): string {
  const colors: Record<string, string> = {
    create: '#67C23A',
    update: '#409EFF',
    delete: '#F56C6C',
    login: '#909399',
    export: '#E6A23C',
    import: '#E6A23C',
    stock_in: '#67C23A',
    stock_out: '#F56C6C',
    dispatch: '#409EFF',
    quality_check: '#E6A23C',
    deliver: '#67C23A',
    pay: '#67C23A',
  };
  return colors[a] || '#909399';
}

function formatTime(dateStr: string) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 筛选状态
const filterModule = ref('');
const logs = ref<any[]>([]);
const stats = ref<{ todayCount?: number; topActions?: any[] }>({});
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

function fetchLogs() {
  loading.value = true;
  let url = `/audit?page=${page}&pageSize=20`;
  if (filterModule.value) {
    url += `&module=${filterModule.value}`;
  }
  apiFetch<{ list: any[]; total: number }>({ url })
    .then((data) => {
      const list = data?.list || [];
      if (page === 1) {
        logs.value = list;
      } else {
        logs.value = logs.value.concat(list);
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

function fetchStats() {
  apiFetch<{ todayCount: number; topActions: any[] }>({ url: '/audit/stats' })
    .then((data) => {
      stats.value = data || {};
    })
    .catch(() => {});
}

function switchModule(value: string) {
  filterModule.value = value;
  page = 1;
  noMore.value = false;
  logs.value = [];
  fetchLogs();
}

function loadMore() {
  if (loadingMore.value || noMore.value) return;
  loadingMore.value = true;
  page++;
  fetchLogs();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchLogs();
  fetchStats();
}

onMounted(() => {
  fetchLogs();
  fetchStats();
});
</script>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
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
.stats-bar {
  padding: 16rpx 32rpx;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}
.stats-text {
  font-size: 24rpx;
  color: #999;
}
.log-list {
  flex: 1;
  padding: 12px 16px;
}
.log-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  gap: 20rpx;
}
.log-indicator {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 10rpx;
}
.log-body {
  flex: 1;
  min-width: 0;
}
.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}
.log-operator {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}
.log-time {
  font-size: 22rpx;
  color: #999;
  flex-shrink: 0;
}
.log-desc {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 14rpx;
  line-height: 1.5;
}
.log-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}
.tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 6rpx;
}
.log-module {
  background: #ecf5ff;
  color: #409EFF;
}
.action-tag {
  background: #f5f5f5;
  color: #666;
}
.log-ip {
  font-size: 22rpx;
  color: #C0C4CC;
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
</style>
