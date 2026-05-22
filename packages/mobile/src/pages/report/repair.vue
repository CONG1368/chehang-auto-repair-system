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
      <!-- 核心指标 -->
      <view class="kpi-cards">
        <view class="kpi-card total">
          <text class="kpi-value">{{ repairData.totalOrders || 0 }}</text>
          <text class="kpi-label">总工单数</text>
        </view>
        <view class="kpi-card rate">
          <text class="kpi-value">{{ formatRate(repairData.completionRate) }}</text>
          <text class="kpi-label">完工率</text>
        </view>
      </view>

      <!-- 工单状态分布 -->
      <view class="section">
        <view class="section-title">
          <text>工单状态分布</text>
        </view>
        <view v-if="byStatus.length > 0" class="status-list">
          <view
            v-for="item in byStatus"
            :key="item.status"
            class="status-item"
          >
            <view class="status-left">
              <view class="status-dot" :class="'dot-' + item.status" />
              <text class="status-name">{{ statusLabel(item.status) }}</text>
            </view>
            <view class="status-right">
              <text class="status-count">{{ item._count || 0 }}单</text>
            </view>
            <view class="status-bar-bg">
              <view
                class="status-bar-fill"
                :class="'bar-' + item.status"
                :style="{ width: getStatusPercent(item._count) + '%' }"
              />
            </view>
          </view>
        </view>
        <view v-else class="empty-hint-small">
          <text>暂无数据</text>
        </view>
      </view>

      <!-- 工单类型统计 -->
      <view class="section" v-if="byType && byType.length > 0">
        <view class="section-title">
          <text>工单类型统计</text>
        </view>
        <view class="type-list">
          <view
            v-for="item in byType"
            :key="item.type"
            class="type-item"
          >
            <text class="type-name">{{ item.type || '--' }}</text>
            <text class="type-count">{{ item._count || 0 }}单</text>
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

const statusMap: Record<string, string> = {
  pending: '待派工',
  assigned: '已派工',
  repairing: '维修中',
  quality_check: '待质检',
  completed: '已完成',
  delivered: '已交车',
};

const periods = [
  { label: '本月', value: 'month' },
  { label: '本季', value: 'quarter' },
  { label: '本年', value: 'year' },
];

const currentPeriod = ref('month');
const startDate = ref('');
const endDate = ref('');
const loading = ref(false);

const repairData = ref<any>({
  totalOrders: 0,
  completionRate: 0,
});

const byStatus = ref<any[]>([]);
const byType = ref<any[]>([]);

function statusLabel(status: string): string {
  return statusMap[status] || status;
}

function formatRate(rate: number | undefined | null): string {
  if (rate === undefined || rate === null) return '0%';
  const num = Number(rate);
  return Number.isInteger(num) ? num + '%' : num.toFixed(1) + '%';
}

function getStatusPercent(count: number): number {
  const total = byStatus.value.reduce((sum, item) => sum + (item._count || 0), 0);
  if (total === 0) return 0;
  return Math.round(((count || 0) / total) * 100);
}

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
  const defaultDate = type === 'start'
    ? getDateRange(currentPeriod.value).startDate
    : getDateRange(currentPeriod.value).endDate;

  // 使用 uni-app 原生日期选择器或在真实场景中替换为 picker
  // 此处提供基本的日期输入提示
  uni.showToast({ title: '请手动输入日期（YYYY-MM-DD）', icon: 'none' });
}

function fetchRepairStats() {
  let params = '';
  if (startDate.value && endDate.value) {
    params = `?startDate=${startDate.value}&endDate=${endDate.value}`;
  } else {
    const range = getDateRange(currentPeriod.value);
    params = `?startDate=${range.startDate}&endDate=${range.endDate}`;
  }

  return apiFetch<any>({ url: `/reports/repair-stats${params}` })
    .then((data) => {
      if (data) {
        repairData.value = {
          totalOrders: data.totalOrders ?? 0,
          completionRate: data.completionRate ?? 0,
        };
        byStatus.value = data.byStatus || [];
        byType.value = data.byType || [];
      }
    })
    .catch(() => {});
}

function fetchAll() {
  loading.value = true;
  fetchRepairStats().finally(() => {
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

.kpi-cards {
  display: flex;
  gap: 16rpx;
  margin: 0 0 16rpx;
}

.kpi-card {
  flex: 1;
  background: #fff;
  border-radius: 12rpx;
  padding: 32rpx 24rpx;
  text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.kpi-card.total .kpi-value { color: #409EFF; }
.kpi-card.rate .kpi-value { color: #67C23A; }

.kpi-value {
  font-size: 48rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 8rpx;
}

.kpi-label {
  font-size: 26rpx;
  color: #909399;
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

.status-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.status-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 8rpx 0;
}

.status-left {
  display: flex;
  align-items: center;
  width: 140rpx;
}

.status-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-right: 12rpx;
}

.dot-pending { background: #909399; }
.dot-assigned { background: #E6A23C; }
.dot-repairing { background: #409EFF; }
.dot-quality_check { background: #F56C6C; }
.dot-completed { background: #67C23A; }
.dot-delivered { background: #303133; }

.status-name {
  font-size: 26rpx;
  color: #606266;
}

.status-right {
  width: 80rpx;
  text-align: right;
}

.status-count {
  font-size: 26rpx;
  font-weight: 500;
  color: #303133;
}

.status-bar-bg {
  width: 100%;
  height: 10rpx;
  background: #f0f0f0;
  border-radius: 5rpx;
  margin-top: 10rpx;
  overflow: hidden;
}

.status-bar-fill {
  height: 100%;
  border-radius: 5rpx;
  min-width: 2rpx;
}

.bar-pending { background: #909399; }
.bar-assigned { background: #E6A23C; }
.bar-repairing { background: #409EFF; }
.bar-quality_check { background: #F56C6C; }
.bar-completed { background: #67C23A; }
.bar-delivered { background: #303133; }

.type-list {
  display: flex;
  flex-direction: column;
}

.type-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f9f9f9;
}

.type-item:last-child {
  border-bottom: none;
}

.type-name {
  font-size: 28rpx;
  color: #303133;
}

.type-count {
  font-size: 28rpx;
  font-weight: 500;
  color: #409EFF;
}

.empty-hint-small {
  text-align: center;
  padding: 60rpx 0;
  color: #C0C4CC;
  font-size: 26rpx;
}
</style>
