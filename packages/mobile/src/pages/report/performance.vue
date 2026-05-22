<template>
  <view class="page">
    <view class="tab-bar">
      <view
        v-for="t in tabs"
        :key="t.value"
        class="tab-item"
        :class="{ active: activeTab === t.value }"
        @click="switchTab(t.value)"
      >
        <text>{{ t.label }}</text>
      </view>
    </view>

    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else-if="errorMsg">
      <view class="error-wrap">
        <text class="error-text">{{ errorMsg }}</text>
        <view class="retry-btn" @click="fetchData">
          <text>重试</text>
        </view>
      </view>
    </template>

    <template v-else>
      <view v-if="activeTab === 'technician'" class="section">
        <view class="section-title">
          <text>技师绩效排名</text>
        </view>
        <view v-if="data.technicians && data.technicians.length > 0" class="rank-list">
          <view
            v-for="(item, index) in data.technicians"
            :key="item.userId"
            class="rank-item"
          >
            <view class="rank-badge" :class="'rank-' + (index < 3 ? ['gold', 'silver', 'bronze'][index] : 'normal')">
              <text>{{ index + 1 }}</text>
            </view>
            <view class="rank-body">
              <view class="rank-header">
                <text class="rank-name">{{ item.name || ('员工' + item.userId) }}</text>
                <text class="rank-value">{{ item.orderCount ?? 0 }} 单</text>
              </view>
              <view class="stat-bar-bg">
                <view
                  class="stat-bar-fill"
                  :style="{ width: getTechPercent(item.orderCount) + '%' }"
                />
              </view>
            </view>
          </view>
        </view>
        <view v-else class="empty-hint-small">
          <text>暂无技师数据</text>
        </view>
      </view>

      <view v-if="activeTab === 'sales'" class="section">
        <view class="section-title">
          <text>销售绩效排名</text>
        </view>
        <view v-if="data.sales && data.sales.length > 0" class="rank-list">
          <view
            v-for="(item, index) in data.sales"
            :key="item.userId"
            class="rank-item"
          >
            <view class="rank-badge" :class="'rank-' + (index < 3 ? ['gold', 'silver', 'bronze'][index] : 'normal')">
              <text>{{ index + 1 }}</text>
            </view>
            <view class="rank-body">
              <view class="rank-header">
                <text class="rank-name">{{ item.name || ('员工' + item.userId) }}</text>
              </view>
              <view class="sales-detail">
                <text class="sales-orders">{{ item.orderCount ?? 0 }} 单</text>
                <text class="sales-amount">&yen;{{ (item.totalAmount ?? 0).toLocaleString() }}</text>
              </view>
              <view class="stat-bar-bg">
                <view
                  class="stat-bar-fill sales-bar"
                  :style="{ width: getSalesPercent(item.totalAmount) + '%' }"
                />
              </view>
            </view>
          </view>
        </view>
        <view v-else class="empty-hint-small">
          <text>暂无销售数据</text>
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

const tabs = [
  { label: '技师绩效', value: 'technician' },
  { label: '销售绩效', value: 'sales' },
];

const activeTab = ref('technician');
const loading = ref(false);
const errorMsg = ref('');
const data = ref<{
  technicians?: Array<{ userId: number; name: string; orderCount: number }>;
  sales?: Array<{ userId: number; name: string; orderCount: number; totalAmount: number }>;
}>({});

function getTechPercent(count: number): number {
  const list = data.value.technicians || [];
  const max = Math.max(...list.map((item) => item.orderCount || 0), 1);
  return Math.round((count / max) * 100);
}

function getSalesPercent(amount: number): number {
  const list = data.value.sales || [];
  const max = Math.max(...list.map((item) => item.totalAmount || 0), 1);
  return Math.round((amount / max) * 100);
}

function switchTab(tab: string) {
  activeTab.value = tab;
}

function fetchData() {
  loading.value = true;
  errorMsg.value = '';
  apiFetch<any>({ url: '/reports/staff-performance' })
    .then((res) => {
      data.value = res || {};
    })
    .catch((err) => {
      errorMsg.value = err?.message || '加载失败';
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped lang="scss">
.page {
  padding: 16rpx;
  background: #f5f5f5;
  min-height: 100vh;
}

.tab-bar {
  display: flex;
  background: #fff;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  gap: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.tab-item {
  flex: 1;
  padding: 12rpx 0;
  border-radius: 20rpx;
  font-size: 26rpx;
  color: #606266;
  background: #f5f5f5;
  text-align: center;
}

.tab-item.active {
  background: #409EFF;
  color: #fff;
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

.error-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 200rpx 0;
}

.error-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 24rpx;
}

.retry-btn {
  padding: 12rpx 40rpx;
  background: #409EFF;
  border-radius: 20rpx;
  color: #fff;
  font-size: 26rpx;
}

.section {
  background: #fff;
  margin-bottom: 16rpx;
  border-radius: 16rpx;
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

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 8rpx 0;
}

.rank-badge {
  width: 48rpx;
  height: 48rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: bold;
  flex-shrink: 0;
  color: #fff;
}

.rank-gold {
  background: linear-gradient(135deg, #f5d27a, #e6a23c);
}

.rank-silver {
  background: linear-gradient(135deg, #d7d7d7, #909399);
}

.rank-bronze {
  background: linear-gradient(135deg, #e2b679, #b88230);
}

.rank-normal {
  background: #dcdfe6;
  color: #909399;
}

.rank-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.rank-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rank-name {
  font-size: 28rpx;
  color: #303133;
  font-weight: 500;
}

.rank-value {
  font-size: 26rpx;
  color: #409EFF;
  font-weight: bold;
}

.sales-detail {
  display: flex;
  gap: 24rpx;
}

.sales-orders {
  font-size: 24rpx;
  color: #909399;
}

.sales-amount {
  font-size: 24rpx;
  color: #67C23A;
}

.stat-bar-bg {
  width: 100%;
  height: 10rpx;
  background: #f0f0f0;
  border-radius: 5rpx;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #409EFF, #66b1ff);
  border-radius: 5rpx;
  min-width: 4rpx;
}

.sales-bar {
  background: linear-gradient(90deg, #67C23A, #85ce61);
}

.empty-hint-small {
  text-align: center;
  padding: 60rpx 0;
  color: #C0C4CC;
  font-size: 26rpx;
}
</style>
