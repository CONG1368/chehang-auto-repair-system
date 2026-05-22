<template>
  <view class="page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 概览数字卡片 -->
      <view class="summary-cards">
        <view class="summary-card revenue">
          <text class="summary-label">今日营收</text>
          <text class="summary-value">&yen;{{ dashboard.todayRevenue || 0 }}</text>
        </view>
        <view class="summary-card orders">
          <text class="summary-label">工单数</text>
          <text class="summary-value">{{ dashboard.todayOrderCount || 0 }}</text>
        </view>
        <view class="summary-card repair">
          <text class="summary-label">在修车辆</text>
          <text class="summary-value">{{ dashboard.inRepairCount || 0 }}</text>
        </view>
        <view class="summary-card customer">
          <text class="summary-label">新增客户</text>
          <text class="summary-value">{{ dashboard.newCustomerCount || 0 }}</text>
        </view>
      </view>

      <!-- 业务占比 -->
      <view class="section">
        <view class="section-title">
          <text>业务占比</text>
        </view>
        <view v-if="businessRatio.length > 0" class="ratio-list">
          <view
            v-for="(item, index) in businessRatio"
            :key="index"
            class="ratio-item"
          >
            <view class="ratio-header">
              <text class="ratio-name">{{ item.name }}</text>
              <text class="ratio-value">{{ item.value }}</text>
            </view>
            <view class="progress-bar">
              <view
                class="progress-fill"
                :style="{ width: getPercent(item.value) + '%' }"
              />
            </view>
          </view>
        </view>
        <view v-else class="empty-hint-small">
          <text>暂无业务数据</text>
        </view>
      </view>

      <!-- 最近收款 -->
      <view class="section">
        <view class="section-title">
          <text>最近收款</text>
        </view>
        <view v-if="recentPayments.length > 0" class="payment-list">
          <view
            v-for="item in recentPayments"
            :key="item.id"
            class="payment-item"
          >
            <view class="payment-header">
              <text class="payment-type">{{ item.paymentMethod || item.type || '--' }}</text>
              <text class="payment-amount">&yen;{{ item.amount || 0 }}</text>
            </view>
            <view class="payment-footer">
              <text class="payment-desc">{{ item.description || item.customerName || '--' }}</text>
              <text class="payment-time">{{ formatTime(item.createdAt || item.paymentDate) }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-hint-small">
          <text>暂无收款记录</text>
        </view>
      </view>
    </template>
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
        if (res.statusCode === 401) {
          uni.reLaunch({ url: '/pages/login/login' });
          reject(new Error('未登录'));
          return;
        }
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

const loading = ref(false);
const refreshing = ref(false);

const dashboard = ref<any>({
  todayRevenue: 0,
  todayOrderCount: 0,
  inRepairCount: 0,
  newCustomerCount: 0,
});

const businessRatio = ref<any[]>([]);
const recentPayments = ref<any[]>([]);

function getPercent(value: number): number {
  const total = businessRatio.value.reduce((sum, item) => sum + (item.value || 0), 0);
  if (total === 0) return 0;
  return Math.round(((value || 0) / total) * 100);
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

function fetchDashboard() {
  apiFetch<any>({ url: '/reports/dashboard' })
    .then((data) => {
      if (data) {
        dashboard.value = {
          todayRevenue: data.todayRevenue ?? 0,
          todayOrderCount: data.todayOrderCount ?? 0,
          inRepairCount: data.inRepairCount ?? 0,
          newCustomerCount: data.newCustomerCount ?? 0,
        };
      }
    })
    .catch(() => {});
}

function fetchBusinessRatio() {
  apiFetch<any>({ url: '/reports/business-ratio' })
    .then((data) => {
      businessRatio.value = Array.isArray(data) ? data : (data?.list || []);
    })
    .catch(() => {});
}

function fetchRecentPayments() {
  apiFetch<any>({ url: '/reports/recent-payments?limit=5' })
    .then((data) => {
      recentPayments.value = Array.isArray(data) ? data : (data?.list || []);
    })
    .catch(() => {});
}

function fetchAll() {
  loading.value = true;
  Promise.all([
    fetchDashboard(),
    fetchBusinessRatio(),
    fetchRecentPayments(),
  ]).finally(() => {
    loading.value = false;
    refreshing.value = false;
  });
}

function onRefresh() {
  refreshing.value = true;
  fetchAll();
}

onMounted(() => {
  fetchAll();
});
</script>

<style scoped lang="scss">
.page {
  padding: 16rpx;
  background: #f5f5f5;
  min-height: 100vh;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

.summary-cards {
  display: flex;
  flex-wrap: wrap;
  padding: 16rpx;
  gap: 12rpx;
}

.summary-card {
  flex: 1;
  min-width: calc(50% - 22rpx);
  background: #fff;
  border-radius: 12rpx;
  padding: 28rpx 20rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.summary-card.revenue { border-left: 6rpx solid #409EFF; }
.summary-card.orders { border-left: 6rpx solid #67C23A; }
.summary-card.repair { border-left: 6rpx solid #E6A23C; }
.summary-card.customer { border-left: 6rpx solid #F56C6C; }

.summary-label {
  font-size: 24rpx;
  color: #909399;
  display: block;
  margin-bottom: 10rpx;
}

.summary-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #303133;
}

.section {
  background: #fff;
  margin: 0 16rpx 16rpx;
  border-radius: 12rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #303133;
  margin-bottom: 20rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.ratio-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.ratio-item {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.ratio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ratio-name {
  font-size: 26rpx;
  color: #606266;
}

.ratio-value {
  font-size: 26rpx;
  color: #303133;
  font-weight: 500;
}

.progress-bar {
  height: 16rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #409EFF, #66b1ff);
  border-radius: 8rpx;
  min-width: 4rpx;
}

.payment-list {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.payment-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f9f9f9;
}

.payment-item:last-child {
  border-bottom: none;
}

.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6rpx;
}

.payment-type {
  font-size: 28rpx;
  color: #303133;
}

.payment-amount {
  font-size: 28rpx;
  font-weight: 500;
  color: #67C23A;
}

.payment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.payment-desc {
  font-size: 24rpx;
  color: #909399;
}

.payment-time {
  font-size: 24rpx;
  color: #C0C4CC;
}

.empty-hint-small {
  text-align: center;
  padding: 60rpx 0;
  color: #C0C4CC;
  font-size: 26rpx;
}
</style>
