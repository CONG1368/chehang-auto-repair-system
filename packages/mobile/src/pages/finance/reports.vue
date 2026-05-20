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

    <!-- 汇总卡片 -->
    <view class="summary-cards">
      <view class="summary-card income">
        <text class="summary-label">总收款</text>
        <text class="summary-value">&yen;{{ summary.totalIncome || 0 }}</text>
      </view>
      <view class="summary-card expense">
        <text class="summary-label">总支出</text>
        <text class="summary-value">&yen;{{ summary.totalExpense || 0 }}</text>
      </view>
      <view class="summary-card profit">
        <text class="summary-label">净利润</text>
        <text class="summary-value">&yen;{{ summary.netProfit || 0 }}</text>
      </view>
    </view>

    <!-- 收款方式统计 -->
    <view class="section">
      <view class="section-title">
        <text>收款方式统计</text>
      </view>
      <view class="method-list">
        <view
          v-for="(item, index) in paymentMethods"
          :key="index"
          class="method-item"
        >
          <text class="method-name">{{ item.name }}</text>
          <text class="method-amount">&yen;{{ item.amount || 0 }}</text>
        </view>
        <view v-if="paymentMethods.length === 0" class="empty-hint-small">
          <text>暂无收款数据</text>
        </view>
      </view>
    </view>

    <!-- 明细列表 -->
    <view class="section" v-if="details.length > 0">
      <view class="section-title">
        <text>最近记录</text>
      </view>
      <view
        v-for="item in details"
        :key="item.id"
        class="detail-item"
      >
        <view class="detail-header">
          <text class="detail-title">{{ item.description || item.type || '--' }}</text>
          <text class="detail-amount" :class="item.type === 'income' ? 'income-text' : 'expense-text'">
            {{ item.type === 'income' ? '+' : '-' }}&yen;{{ item.amount || 0 }}
          </text>
        </view>
        <view class="detail-footer">
          <text class="detail-time">{{ item.createdAt || item.time || '--' }}</text>
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

const periods = [
  { label: '今天', value: 1 },
  { label: '本周', value: 7 },
  { label: '本月', value: 30 },
];

const currentPeriod = ref(7);
const summary = ref<any>({});
const paymentMethods = ref<any[]>([]);
const details = ref<any[]>([]);
const loading = ref(false);

function switchPeriod(days: number) {
  currentPeriod.value = days;
  fetchData();
}

function fetchData() {
  loading.value = true;
  apiFetch<any>({ url: `/reports/finance-summary?days=${currentPeriod.value}` })
    .then((data) => {
      if (data) {
        summary.value = {
          totalIncome: data.totalIncome || 0,
          totalExpense: data.totalExpense || 0,
          netProfit: data.netProfit || 0,
        };
        paymentMethods.value = data.paymentMethods || [];
        details.value = data.details || [];
      }
    })
    .catch(() => {})
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f5f5f5;
}
.period-bar {
  display: flex;
  background: #fff;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  gap: 12px;
}
.period-item {
  padding: 6px 20px;
  border-radius: 20px;
  font-size: 13px;
  color: #606266;
  background: #f5f5f5;
}
.period-item.active {
  background: #409EFF;
  color: #fff;
}
.summary-cards {
  display: flex;
  padding: 16px;
  gap: 10px;
}
.summary-card {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.summary-card.income .summary-value {
  color: #67C23A;
}
.summary-card.expense .summary-value {
  color: #F56C6C;
}
.summary-card.profit .summary-value {
  color: #409EFF;
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
.method-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.method-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f9f9f9;
}
.method-item:last-child {
  border-bottom: none;
}
.method-name {
  font-size: 14px;
  color: #606266;
}
.method-amount {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}
.detail-item {
  padding: 10px 0;
  border-bottom: 1px solid #f9f9f9;
}
.detail-item:last-child {
  border-bottom: none;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.detail-title {
  font-size: 14px;
  color: #303133;
}
.detail-amount {
  font-size: 14px;
  font-weight: 500;
}
.income-text {
  color: #67C23A;
}
.expense-text {
  color: #F56C6C;
}
.detail-footer {
  font-size: 12px;
  color: #C0C4CC;
}
.empty-hint-small {
  text-align: center;
  padding: 20px 0;
  color: #C0C4CC;
  font-size: 13px;
}
</style>
