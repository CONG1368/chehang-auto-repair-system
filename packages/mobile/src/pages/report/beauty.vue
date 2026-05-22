<template>
  <view class="page">
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
      <view class="section">
        <view class="section-title">
          <text>汇总统计</text>
        </view>
        <view class="summary-cards">
          <view class="summary-card">
            <text class="summary-value primary">{{ data.totalAppointments ?? 0 }}</text>
            <text class="summary-label">总预约数</text>
          </view>
          <view class="summary-card">
            <text class="summary-value success">&yen;{{ (data.totalRevenue ?? 0).toLocaleString() }}</text>
            <text class="summary-label">总营收</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">
          <text>服务类型统计</text>
        </view>
        <view v-if="data.byServiceType && data.byServiceType.length > 0" class="stat-list">
          <view
            v-for="item in data.byServiceType"
            :key="item.serviceType"
            class="stat-item"
          >
            <view class="stat-header">
              <text class="stat-name">{{ serviceTypeMap[item.serviceType] || item.serviceType }}</text>
              <text class="stat-count">{{ item.count }}</text>
            </view>
            <view class="stat-bar-bg">
              <view
                class="stat-bar-fill type-bar"
                :style="{ width: getPercent(item.count, data.byServiceType) + '%' }"
              />
            </view>
          </view>
        </view>
        <view v-else class="empty-hint-small">
          <text>暂无服务数据</text>
        </view>
      </view>

      <view class="section">
        <view class="section-title">
          <text>状态分布</text>
        </view>
        <view v-if="data.byStatus && data.byStatus.length > 0" class="stat-list">
          <view
            v-for="item in data.byStatus"
            :key="item.status"
            class="stat-item"
          >
            <view class="stat-header">
              <view class="status-tag" :class="'status-' + item.status">
                <text class="status-text">{{ statusMap[item.status] || item.status }}</text>
              </view>
              <text class="stat-count">{{ item.count }}</text>
            </view>
            <view class="stat-bar-bg">
              <view
                class="stat-bar-fill status-bar"
                :class="'bar-' + item.status"
                :style="{ width: getPercent(item.count, data.byStatus) + '%' }"
              />
            </view>
          </view>
        </view>
        <view v-else class="empty-hint-small">
          <text>暂无状态数据</text>
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

const statusMap: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  in_progress: '施工中',
  completed: '已完成',
  cancelled: '已取消',
};

const serviceTypeMap: Record<string, string> = {
  wash: '洗车',
  detail: '美容',
  maintenance: '保养',
  repair: '维修',
  other: '其他',
};

const periods = [
  { label: '本月', value: 'month' },
  { label: '本季', value: 'quarter' },
  { label: '本年', value: 'year' },
];

const currentPeriod = ref('month');
const loading = ref(false);
const errorMsg = ref('');
const data = ref<{
  totalAppointments?: number;
  totalRevenue?: number;
  byStatus?: Array<{ status: string; count: number }>;
  byServiceType?: Array<{ serviceType: string; count: number }>;
}>({});

function getDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  let startDate: Date;
  if (currentPeriod.value === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (currentPeriod.value === 'quarter') {
    const qStart = Math.floor(now.getMonth() / 3) * 3;
    startDate = new Date(now.getFullYear(), qStart, 1);
  } else {
    startDate = new Date(now.getFullYear(), 0, 1);
  }
  const endStr = now.toISOString().slice(0, 10);
  const startStr = startDate.toISOString().slice(0, 10);
  return { startDate: startStr, endDate: endStr };
}

function getPercent(count: number, list: Array<{ count: number }>): number {
  const max = Math.max(...list.map((item) => item.count || 0), 1);
  return Math.round((count / max) * 100);
}

function switchPeriod(period: string) {
  currentPeriod.value = period;
  fetchData();
}

function fetchData() {
  loading.value = true;
  errorMsg.value = '';
  const { startDate, endDate } = getDateRange();
  apiFetch<any>({
    url: `/reports/beauty-stats?startDate=${startDate}&endDate=${endDate}`,
  })
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

.period-bar {
  display: flex;
  background: #fff;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
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

.summary-cards {
  display: flex;
  gap: 16rpx;
}

.summary-card {
  flex: 1;
  background: #fafafa;
  border-radius: 12rpx;
  padding: 28rpx 16rpx;
  text-align: center;
}

.summary-value {
  font-size: 40rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 8rpx;
}

.summary-value.primary {
  color: #409EFF;
}

.summary-value.success {
  color: #67C23A;
  font-size: 34rpx;
}

.summary-label {
  font-size: 24rpx;
  color: #909399;
}

.stat-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-name {
  font-size: 26rpx;
  color: #303133;
}

.stat-count {
  font-size: 28rpx;
  font-weight: bold;
  color: #303133;
}

.stat-bar-bg {
  width: 100%;
  height: 14rpx;
  background: #f0f0f0;
  border-radius: 7rpx;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  border-radius: 7rpx;
  min-width: 4rpx;
}

.type-bar {
  background: linear-gradient(90deg, #409EFF, #66b1ff);
}

.status-bar {
  background: linear-gradient(90deg, #E6A23C, #ebb563);
}

.bar-pending {
  background: linear-gradient(90deg, #909399, #b4b4b4);
}

.bar-confirmed {
  background: linear-gradient(90deg, #409EFF, #66b1ff);
}

.bar-in_progress {
  background: linear-gradient(90deg, #E6A23C, #ebb563);
}

.bar-completed {
  background: linear-gradient(90deg, #67C23A, #85ce61);
}

.bar-cancelled {
  background: linear-gradient(90deg, #F56C6C, #f89898);
}

.status-tag {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.status-text {
  color: #fff;
}

.status-pending {
  background: #909399;
}

.status-confirmed {
  background: #409EFF;
}

.status-in_progress {
  background: #E6A23C;
}

.status-completed {
  background: #67C23A;
}

.status-cancelled {
  background: #F56C6C;
}

.empty-hint-small {
  text-align: center;
  padding: 60rpx 0;
  color: #C0C4CC;
  font-size: 26rpx;
}
</style>
