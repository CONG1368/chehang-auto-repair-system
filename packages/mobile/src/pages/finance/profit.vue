<template>
  <view class="page">
    <!-- 月份选择器 -->
    <view class="month-bar">
      <view class="month-nav" @click="prevMonth">
        <text>&lt;</text>
      </view>
      <view class="month-display">
        <text>{{ currentMonth }}</text>
      </view>
      <view class="month-nav" @click="nextMonth">
        <text>&gt;</text>
      </view>
    </view>

    <!-- 利润概览 -->
    <view class="summary-cards">
      <view class="summary-card">
        <text class="summary-label">总收入</text>
        <text class="summary-value income">&yen;{{ profitData.totalRevenue || 0 }}</text>
      </view>
      <view class="summary-card">
        <text class="summary-label">总成本</text>
        <text class="summary-value expense">&yen;{{ profitData.totalCost || 0 }}</text>
      </view>
      <view class="summary-card">
        <text class="summary-label">毛利润</text>
        <text class="summary-value gross">&yen;{{ profitData.grossProfit || 0 }}</text>
      </view>
      <view class="summary-card">
        <text class="summary-label">净利润</text>
        <text class="summary-value net">&yen;{{ profitData.netProfit || 0 }}</text>
      </view>
    </view>

    <!-- 利润率 -->
    <view class="section" v-if="profitData.grossProfit && profitData.totalRevenue">
      <view class="section-title">
        <text>利润率</text>
      </view>
      <view class="rate-row">
        <view class="rate-item">
          <text class="rate-label">毛利率</text>
          <text class="rate-value">{{ grossRate }}%</text>
        </view>
        <view class="rate-item">
          <text class="rate-label">净利率</text>
          <text class="rate-value">{{ netRate }}%</text>
        </view>
      </view>
    </view>

    <!-- 各业务线收入 -->
    <view class="section" v-if="businessLines.length > 0">
      <view class="section-title">
        <text>业务线收入占比</text>
      </view>
      <view class="business-list">
        <view
          v-for="(item, index) in businessLines"
          :key="index"
          class="business-item"
        >
          <view class="business-info">
            <text class="business-name">{{ item.name }}</text>
            <text class="business-amount">&yen;{{ item.amount || 0 }}</text>
          </view>
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: getPercent(item.amount) + '%', backgroundColor: colors[index % colors.length] }"></view>
          </view>
          <text class="business-percent">{{ getPercent(item.amount) }}%</text>
        </view>
      </view>
      <view v-if="businessLines.length === 0" class="empty-hint-small">
        <text>暂无业务数据</text>
      </view>
    </view>
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

const today = new Date();
const currentYear = ref(today.getFullYear());
const currentMonthValue = ref(today.getMonth() + 1);
const currentMonth = computed(() => {
  const m = String(currentMonthValue.value).padStart(2, '0');
  return `${currentYear.value}-${m}`;
});

const profitData = ref<any>({});
const businessLines = ref<any[]>([]);
const loading = ref(false);

const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#1890FF'];

const grossRate = computed(() => {
  if (!profitData.value.totalRevenue || !profitData.value.grossProfit) return '0.0';
  return ((profitData.value.grossProfit / profitData.value.totalRevenue) * 100).toFixed(1);
});

const netRate = computed(() => {
  if (!profitData.value.totalRevenue || !profitData.value.netProfit) return '0.0';
  return ((profitData.value.netProfit / profitData.value.totalRevenue) * 100).toFixed(1);
});

function getPercent(amount: number): number {
  const total = businessLines.value.reduce((sum, item) => sum + (item.amount || 0), 0);
  if (total === 0) return 0;
  return Math.round((amount / total) * 100);
}

function prevMonth() {
  if (currentMonthValue.value === 1) {
    currentMonthValue.value = 12;
    currentYear.value--;
  } else {
    currentMonthValue.value--;
  }
  fetchProfit();
}

function nextMonth() {
  const now = new Date();
  if (currentYear.value === now.getFullYear() && currentMonthValue.value === now.getMonth() + 1) {
    return; // 不能超过当前月份
  }
  if (currentMonthValue.value === 12) {
    currentMonthValue.value = 1;
    currentYear.value++;
  } else {
    currentMonthValue.value++;
  }
  fetchProfit();
}

function fetchProfit() {
  loading.value = true;
  apiFetch<any>({ url: `/reports/profit?month=${currentMonth.value}` })
    .then((data) => {
      if (data) {
        profitData.value = {
          totalRevenue: data.totalRevenue || 0,
          totalCost: data.totalCost || 0,
          grossProfit: data.grossProfit || 0,
          netProfit: data.netProfit || 0,
        };
        businessLines.value = data.businessLines || data.details || [];
      }
    })
    .catch(() => {})
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  fetchProfit();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f5f5f5;
}
.month-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  gap: 20px;
}
.month-nav {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 50%;
  font-size: 14px;
  color: #606266;
}
.month-display {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}
.summary-cards {
  display: flex;
  flex-wrap: wrap;
  padding: 16px;
  gap: 10px;
}
.summary-card {
  width: calc(50% - 5px);
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.summary-label {
  font-size: 12px;
  color: #909399;
  display: block;
  margin-bottom: 6px;
}
.summary-value {
  font-size: 18px;
  font-weight: bold;
}
.summary-value.income { color: #67C23A; }
.summary-value.expense { color: #F56C6C; }
.summary-value.gross { color: #E6A23C; }
.summary-value.net { color: #409EFF; }
.section {
  background: #fff;
  margin: 0 16px 12px;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.section-title {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}
.rate-row {
  display: flex;
  gap: 16px;
}
.rate-item {
  flex: 1;
  text-align: center;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
}
.rate-label {
  font-size: 12px;
  color: #909399;
  display: block;
  margin-bottom: 4px;
}
.rate-value {
  font-size: 20px;
  font-weight: bold;
  color: #409EFF;
}
.business-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.business-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.business-info {
  display: flex;
  flex-direction: column;
  min-width: 80px;
}
.business-name {
  font-size: 13px;
  color: #606266;
}
.business-amount {
  font-size: 12px;
  color: #909399;
}
.progress-bar {
  flex: 1;
  height: 10px;
  background: #f0f0f0;
  border-radius: 5px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.3s;
}
.business-percent {
  font-size: 12px;
  color: #909399;
  min-width: 36px;
  text-align: right;
}
.empty-hint-small {
  text-align: center;
  padding: 20px 0;
  color: #C0C4CC;
  font-size: 13px;
}
</style>
