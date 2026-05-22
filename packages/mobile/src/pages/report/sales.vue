<template>
  <view class="page">
    <!-- 日期筛选 -->
    <view class="period-bar">
      <view
        v-for="p in periods"
        :key="p.value"
        class="period-item"
        :class="{ active: currentPeriod === p.value }"
        @click="switchPeriod(p.value)"
      >
        <text>{{ p.label }}</text>
      </view>
    </view>

    <!-- 自定义日期范围 -->
    <view class="custom-date-bar">
      <view class="date-input-wrap" @click="openDatePicker('start')">
        <text class="date-label">开始：</text>
        <text class="date-value">{{ startDate || '请选择' }}</text>
      </view>
      <text class="date-sep">至</text>
      <view class="date-input-wrap" @click="openDatePicker('end')">
        <text class="date-label">结束：</text>
        <text class="date-value">{{ endDate || '请选择' }}</text>
      </view>
      <view class="date-search-btn" @click="fetchAll">
        <text>查询</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <template v-else>
      <!-- 销售概览 -->
      <view class="section">
        <view class="section-title">
          <text>销售概览</text>
        </view>
        <view class="overview-row">
          <view class="overview-item">
            <text class="overview-value">{{ totalSalesCount }}</text>
            <text class="overview-label">总销量</text>
          </view>
          <view class="overview-item">
            <text class="overview-value">&yen;{{ totalSalesAmount || 0 }}</text>
            <text class="overview-label">销售总额</text>
          </view>
        </view>
      </view>

      <!-- 品牌排行 -->
      <view class="section">
        <view class="section-title">
          <text>品牌排行</text>
        </view>
        <view v-if="vehicleStats.length > 0" class="brand-list">
          <view
            v-for="(item, index) in vehicleStats"
            :key="index"
            class="brand-item"
          >
            <view class="brand-rank" :class="'rank-' + (index + 1)">
              <text>{{ index + 1 }}</text>
            </view>
            <view class="brand-info">
              <text class="brand-name">{{ item.brand || '未知品牌' }}</text>
            </view>
            <text class="brand-count">{{ item._count || 0 }}台</text>
          </view>
        </view>
        <view v-else class="empty-hint-small">
          <text>暂无销售数据</text>
        </view>
      </view>

      <!-- 利润汇总（可选） -->
      <view class="section" v-if="profitSummary">
        <view class="section-title">
          <text>利润概况</text>
        </view>
        <view class="profit-cards">
          <view class="profit-card income">
            <text class="profit-label">总收入</text>
            <text class="profit-value">&yen;{{ profitSummary.totalIncome || 0 }}</text>
          </view>
          <view class="profit-card expense">
            <text class="profit-label">总支出</text>
            <text class="profit-value">&yen;{{ profitSummary.totalExpense || 0 }}</text>
          </view>
          <view class="profit-card net">
            <text class="profit-label">净利润</text>
            <text class="profit-value">&yen;{{ profitSummary.netProfit || 0 }}</text>
          </view>
        </view>
      </view>
    </template>
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
  { label: '本月', value: 'month' },
  { label: '本季', value: 'quarter' },
  { label: '本年', value: 'year' },
];

const currentPeriod = ref('month');
const startDate = ref('');
const endDate = ref('');
const loading = ref(false);

const vehicleStats = ref<any[]>([]);
const profitSummary = ref<any>(null);

const totalSalesCount = computed(() => {
  return vehicleStats.value.reduce((sum, item) => sum + (item._count || 0), 0);
});

const totalSalesAmount = computed(() => {
  return vehicleStats.value.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
});

function getDateRange(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  let start = new Date();
  const format = (d: Date) => d.toISOString().split('T')[0];

  if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'quarter') {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), quarterMonth, 1);
  } else if (period === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
  }

  return {
    startDate: format(start),
    endDate: format(now),
  };
}

function switchPeriod(period: string) {
  currentPeriod.value = period;
  startDate.value = '';
  endDate.value = '';
  fetchAll();
}

function openDatePicker(type: 'start' | 'end') {
  // uni-app 日期选择器
  uni.showToast({ title: '请手动输入日期（YYYY-MM-DD）', icon: 'none' });
  // 使用 prompt 方式做简单输入
  // 实际场景可替换为 picker 组件
}

function fetchSalesStats() {
  let params = '';
  if (startDate.value && endDate.value) {
    params = `?startDate=${startDate.value}&endDate=${endDate.value}`;
  } else {
    const range = getDateRange(currentPeriod.value);
    params = `?startDate=${range.startDate}&endDate=${range.endDate}`;
  }

  return apiFetch<any>({ url: `/reports/sales-stats${params}` })
    .then((data) => {
      if (data) {
        vehicleStats.value = data.vehicleStats || [];
      }
    })
    .catch(() => {});
}

function fetchProfitSummary() {
  return apiFetch<any>({ url: '/finance/profit-summary' })
    .then((data) => {
      profitSummary.value = data;
    })
    .catch(() => {
      profitSummary.value = null;
    });
}

function fetchAll() {
  loading.value = true;
  Promise.all([
    fetchSalesStats(),
    fetchProfitSummary(),
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

.custom-date-bar {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  gap: 10rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.date-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 10rpx 16rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}

.date-label {
  font-size: 24rpx;
  color: #909399;
  white-space: nowrap;
}

.date-value {
  font-size: 24rpx;
  color: #303133;
}

.date-sep {
  font-size: 24rpx;
  color: #909399;
}

.date-search-btn {
  background: #409EFF;
  padding: 10rpx 24rpx;
  border-radius: 8rpx;
}

.date-search-btn text {
  font-size: 26rpx;
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

.overview-row {
  display: flex;
  gap: 24rpx;
}

.overview-item {
  flex: 1;
  text-align: center;
  padding: 20rpx;
  background: #fafafa;
  border-radius: 8rpx;
}

.overview-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #409EFF;
  display: block;
  margin-bottom: 8rpx;
}

.overview-label {
  font-size: 24rpx;
  color: #909399;
}

.brand-list {
  display: flex;
  flex-direction: column;
}

.brand-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f9f9f9;
}

.brand-item:last-child {
  border-bottom: none;
}

.brand-rank {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  background: #909399;
}

.brand-rank text {
  font-size: 26rpx;
  font-weight: bold;
  color: #fff;
}

.brand-rank.rank-1 { background: #F56C6C; }
.brand-rank.rank-2 { background: #E6A23C; }
.brand-rank.rank-3 { background: #409EFF; }

.brand-info {
  flex: 1;
}

.brand-name {
  font-size: 28rpx;
  color: #303133;
}

.brand-count {
  font-size: 28rpx;
  font-weight: 500;
  color: #303133;
}

.profit-cards {
  display: flex;
  gap: 12rpx;
}

.profit-card {
  flex: 1;
  background: #fafafa;
  border-radius: 8rpx;
  padding: 20rpx 10rpx;
  text-align: center;
}

.profit-card.income .profit-value { color: #67C23A; }
.profit-card.expense .profit-value { color: #F56C6C; }
.profit-card.net .profit-value { color: #409EFF; }

.profit-label {
  font-size: 24rpx;
  color: #909399;
  display: block;
  margin-bottom: 8rpx;
}

.profit-value {
  font-size: 32rpx;
  font-weight: bold;
}

.empty-hint-small {
  text-align: center;
  padding: 60rpx 0;
  color: #C0C4CC;
  font-size: 26rpx;
}
</style>
