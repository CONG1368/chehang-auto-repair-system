<template>
  <view class="page">
    <!-- 时间段切换 -->
    <view class="period-bar">
      <view
        v-for="p in periods"
        :key="p.value"
        class="period-item"
        :class="{ active: trendDays === p.value }"
        @click="switchPeriod(p.value)"
      >
        <text>{{ p.label }}</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 库存概览 -->
      <view class="section">
        <view class="section-title">
          <text>库存概览</text>
        </view>
        <view v-if="inventoryStats" class="inventory-cards">
          <view class="inv-card">
            <text class="inv-value">{{ inventoryStats.totalParts || 0 }}</text>
            <text class="inv-label">配件总数</text>
          </view>
          <view class="inv-card">
            <text class="inv-value">{{ inventoryStats.totalStockQuantity || 0 }}</text>
            <text class="inv-label">库存总量</text>
          </view>
          <view class="inv-card warning">
            <text class="inv-value warn">{{ inventoryStats.lowStockCount || 0 }}</text>
            <text class="inv-label">低库存预警</text>
          </view>
        </view>
        <view v-else class="empty-hint-small">
          <text>暂无库存数据</text>
        </view>
      </view>

      <!-- 客户统计 -->
      <view class="section">
        <view class="section-title">
          <text>客户统计</text>
        </view>
        <view v-if="customerStats" class="customer-cards">
          <view class="customer-card">
            <text class="customer-value">{{ customerStats.totalCustomers || 0 }}</text>
            <text class="customer-label">总客户数</text>
          </view>
          <view class="customer-card">
            <text class="customer-value">{{ customerStats.activeCustomers || 0 }}</text>
            <text class="customer-label">月活跃客户</text>
          </view>
        </view>
        <view v-else class="empty-hint-small">
          <text>暂无客户数据</text>
        </view>
      </view>

      <!-- 营收趋势 -->
      <view class="section">
        <view class="section-title">
          <text>营收趋势（近{{ trendDays }}天）</text>
        </view>
        <view v-if="revenueTrend.length > 0" class="trend-list">
          <view
            v-for="(item, index) in revenueTrend"
            :key="index"
            class="trend-item"
          >
            <view class="trend-left">
              <text class="trend-date">{{ item.date }}</text>
            </view>
            <view class="trend-right">
              <text class="trend-amount">&yen;{{ item.amount || 0 }}</text>
            </view>
            <view class="trend-bar-bg">
              <view
                class="trend-bar-fill"
                :style="{ width: getTrendPercent(item.amount) + '%' }"
              />
            </view>
          </view>
        </view>
        <view v-else class="empty-hint-small">
          <text>暂无营收数据</text>
        </view>
      </view>

      <!-- 低库存配件明细 -->
      <view class="section" v-if="inventoryStats && inventoryStats.lowStockParts && inventoryStats.lowStockParts.length > 0">
        <view class="section-title">
          <text>低库存明细</text>
        </view>
        <view class="lowstock-list">
          <view
            v-for="(part, index) in inventoryStats.lowStockParts"
            :key="index"
            class="lowstock-item"
          >
            <view class="lowstock-left">
              <text class="lowstock-name">{{ part.name || part.partName || '--' }}</text>
              <text class="lowstock-code">{{ part.code || part.partCode || '' }}</text>
            </view>
            <view class="lowstock-right">
              <text class="lowstock-qty" :class="part.quantity <= (part.minStock || part.safetyStock || 5) ? 'danger' : 'warn'">
                {{ part.quantity || 0 }}
              </text>
              <text class="lowstock-unit">件</text>
            </view>
          </view>
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

const periods = [
  { label: '近7天', value: 7 },
  { label: '近30天', value: 30 },
  { label: '近90天', value: 90 },
];

const trendDays = ref(30);
const loading = ref(false);

const revenueTrend = ref<any[]>([]);
const inventoryStats = ref<any>(null);
const customerStats = ref<any>(null);

function getTrendPercent(amount: number): number {
  const max = Math.max(...revenueTrend.value.map((item) => item.amount || 0), 1);
  return Math.round(((amount || 0) / max) * 100);
}

function switchPeriod(days: number) {
  trendDays.value = days;
  fetchRevenueTrend();
}

function fetchRevenueTrend() {
  return apiFetch<any>({ url: `/reports/revenue-trend?days=${trendDays.value}` })
    .then((data) => {
      revenueTrend.value = Array.isArray(data) ? data : (data?.list || []);
    })
    .catch(() => {});
}

function fetchInventoryStats() {
  return apiFetch<any>({ url: '/reports/inventory-stats' })
    .then((data) => {
      inventoryStats.value = data;
    })
    .catch(() => {
      inventoryStats.value = null;
    });
}

function fetchCustomerStats() {
  return apiFetch<any>({ url: '/reports/customer-stats' })
    .then((data) => {
      customerStats.value = data;
    })
    .catch(() => {
      customerStats.value = null;
    });
}

function fetchAll() {
  loading.value = true;
  Promise.all([
    fetchRevenueTrend(),
    fetchInventoryStats(),
    fetchCustomerStats(),
  ]).finally(() => {
    loading.value = false;
  });
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

.period-bar {
  display: flex;
  background: #fff;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  gap: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.period-item {
  flex: 1;
  padding: 12rpx 0;
  border-radius: 20rpx;
  font-size: 26rpx;
  color: #606266;
  background: #f5f5f5;
  text-align: center;
}

.period-item.active {
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

.section {
  background: #fff;
  margin-bottom: 16rpx;
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

/* 库存概览 */
.inventory-cards {
  display: flex;
  gap: 12rpx;
}

.inv-card {
  flex: 1;
  background: #fafafa;
  border-radius: 8rpx;
  padding: 24rpx 12rpx;
  text-align: center;
}

.inv-card.warning {
  background: #fef0f0;
}

.inv-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #409EFF;
  display: block;
  margin-bottom: 8rpx;
}

.inv-value.warn {
  color: #F56C6C;
}

.inv-label {
  font-size: 24rpx;
  color: #909399;
}

/* 客户统计 */
.customer-cards {
  display: flex;
  gap: 16rpx;
}

.customer-card {
  flex: 1;
  text-align: center;
  padding: 24rpx;
  background: #fafafa;
  border-radius: 8rpx;
}

.customer-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #67C23A;
  display: block;
  margin-bottom: 8rpx;
}

.customer-label {
  font-size: 24rpx;
  color: #909399;
}

/* 营收趋势 */
.trend-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.trend-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 4rpx 0;
}

.trend-left {
  width: 160rpx;
}

.trend-date {
  font-size: 24rpx;
  color: #606266;
}

.trend-right {
  width: 120rpx;
  text-align: right;
}

.trend-amount {
  font-size: 28rpx;
  font-weight: 500;
  color: #303133;
}

.trend-bar-bg {
  width: 100%;
  height: 10rpx;
  background: #f0f0f0;
  border-radius: 5rpx;
  margin-top: 8rpx;
  overflow: hidden;
}

.trend-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #67C23A, #85ce61);
  border-radius: 5rpx;
  min-width: 2rpx;
}

/* 低库存明细 */
.lowstock-list {
  display: flex;
  flex-direction: column;
}

.lowstock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f9f9f9;
}

.lowstock-item:last-child {
  border-bottom: none;
}

.lowstock-left {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.lowstock-name {
  font-size: 28rpx;
  color: #303133;
}

.lowstock-code {
  font-size: 22rpx;
  color: #C0C4CC;
  margin-top: 4rpx;
}

.lowstock-right {
  display: flex;
  align-items: baseline;
  gap: 4rpx;
}

.lowstock-qty {
  font-size: 32rpx;
  font-weight: bold;
}

.lowstock-qty.warn {
  color: #E6A23C;
}

.lowstock-qty.danger {
  color: #F56C6C;
}

.lowstock-unit {
  font-size: 22rpx;
  color: #909399;
}

.empty-hint-small {
  text-align: center;
  padding: 60rpx 0;
  color: #C0C4CC;
  font-size: 26rpx;
}
</style>
