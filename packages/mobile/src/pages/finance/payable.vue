<template>
  <view class="page">
    <!-- 汇总卡片 -->
    <view class="summary-cards">
      <view class="summary-card card-blue">
        <text class="summary-label">应付总额</text>
        <text class="summary-value">&yen;{{ formatPrice(summary.totalAmount) }}</text>
      </view>
      <view class="summary-card card-green">
        <text class="summary-label">已付金额</text>
        <text class="summary-value">&yen;{{ formatPrice(summary.totalPaid) }}</text>
      </view>
      <view class="summary-card card-orange">
        <text class="summary-label">未付金额</text>
        <text class="summary-value">&yen;{{ formatPrice(summary.totalUnpaid) }}</text>
      </view>
      <view class="summary-card card-red">
        <text class="summary-label">待处理</text>
        <text class="summary-value">{{ summary.pendingCount || 0 }}</text>
        <text class="summary-unit">笔</text>
      </view>
    </view>

    <!-- 状态筛选 -->
    <view class="tab-bar">
      <view
        v-for="tab in statusTabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: currentStatus === tab.value }"
        @click="switchStatus(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- 应付列表 -->
    <scroll-view
      scroll-y
      class="list-scroll"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length === 0 && !loading" class="empty-hint">
        <text>暂无应付账款数据</text>
      </view>

      <view
        v-for="item in list"
        :key="item.id"
        class="payable-card"
        @click="selectedPayable = item"
      >
        <view class="card-header">
          <text class="supplier-name">{{ item.supplier?.name || '未知供应商' }}</text>
          <text class="status-badge" :style="{ background: statusColor(item.status) }">
            {{ statusText(item.status) }}
          </text>
        </view>

        <!-- 金额进度 -->
        <view class="amount-row">
          <view class="amount-main">
            <text class="amount-total">&yen;{{ formatPrice(item.amount) }}</text>
          </view>
          <view class="progress-wrap">
            <view class="progress-bar">
              <view
                class="progress-fill"
                :style="{ width: progressPercent(item) + '%', background: statusColor(item.status) }"
              />
            </view>
            <text class="progress-text">已付 {{ progressPercent(item) }}%</text>
          </view>
        </view>

        <view class="card-footer">
          <text class="due-date">到期：{{ item.dueDate || '--' }}</text>
          <text class="source-info">{{ item.source || '--' }}</text>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && list.length > 0" class="loading-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- 付款弹窗 -->
    <view v-if="selectedPayable" class="modal-overlay" @click="selectedPayable = null">
      <view class="modal-content" @click.stop>
        <text class="modal-title">付款</text>
        <view class="modal-info">
          <text class="info-label">供应商：{{ selectedPayable.supplier?.name || '--' }}</text>
          <text class="info-label">应付金额：&yen;{{ formatPrice(selectedPayable.amount) }}</text>
          <text class="info-label">已付金额：&yen;{{ formatPrice(selectedPayable.paidAmount) }}</text>
          <text class="info-label unpaid-text">
            待付金额：&yen;{{ formatPrice(selectedPayable.amount - selectedPayable.paidAmount) }}
          </text>
        </view>
        <view class="modal-input-wrap">
          <text class="input-label">付款金额</text>
          <input
            v-model="payAmount"
            type="digit"
            class="modal-input"
            placeholder="请输入付款金额"
            :max="selectedPayable.amount - selectedPayable.paidAmount"
          />
        </view>
        <view class="modal-actions">
          <u-button type="default" text="取消" @click="selectedPayable = null" />
          <u-button type="primary" text="确认付款" :loading="paying" @click="handlePay" />
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
      fail: (err: any) => {
        uni.showToast({ title: '网络错误，请检查连接', icon: 'none' });
        reject(err);
      },
    });
  });
}

// 汇总数据
const summary = ref({
  totalAmount: 0,
  totalPaid: 0,
  totalUnpaid: 0,
  pendingCount: 0,
});

// 列表数据
const statusTabs = [
  { label: '全部', value: '' },
  { label: '待付', value: 'pending' },
  { label: '已付清', value: 'paid' },
];

const currentStatus = ref('');
const list = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

// 付款弹窗
const selectedPayable = ref<any>(null);
const payAmount = ref('');
const paying = ref(false);

const statusMap: Record<string, string> = {
  pending: '待付',
  paid: '已付清',
  overdue: '已逾期',
};

function statusText(status: string): string {
  return statusMap[status] || status || '--';
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#E6A23C',
    paid: '#67C23A',
    overdue: '#F56C6C',
  };
  return colors[status] || '#909399';
}

function progressPercent(item: any): number {
  const total = Number(item.amount) || 0;
  const paid = Number(item.paidAmount) || 0;
  if (total === 0) return 0;
  return Math.min(Math.round((paid / total) * 100), 100);
}

function formatPrice(val: any): string {
  return (Number(val) || 0).toFixed(2);
}

function switchStatus(value: string) {
  currentStatus.value = value;
  page = 1;
  noMore.value = false;
  list.value = [];
  fetchPayables();
}

async function fetchPayables() {
  loading.value = true;
  let url = `/finance/payables?page=${page}&pageSize=20`;
  if (currentStatus.value) {
    url += `&status=${currentStatus.value}`;
  }
  try {
    const data: any = await apiFetch({ url });
    const resultList = data?.list || data || [];
    if (page === 1) {
      list.value = resultList;
    } else {
      list.value = list.value.concat(resultList);
    }
    if (!resultList || resultList.length < 20) {
      noMore.value = true;
    }
  } catch {
    if (page > 1) page--;
  } finally {
    loading.value = false;
    refreshing.value = false;
    loadingMore.value = false;
  }
}

async function fetchSummary() {
  try {
    const data: any = await apiFetch({ url: '/finance/payables/summary' });
    if (data) {
      summary.value = data;
    }
  } catch {
    // 汇总加载失败不影响列表
  }
}

function loadMore() {
  if (loadingMore.value || noMore.value) return;
  loadingMore.value = true;
  page++;
  fetchPayables();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchPayables();
  await fetchSummary();
}

async function handlePay() {
  const amount = Number(payAmount.value);
  if (!amount || amount <= 0) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' });
    return;
  }
  const maxPay = (selectedPayable.value.amount || 0) - (selectedPayable.value.paidAmount || 0);
  if (amount > maxPay) {
    uni.showToast({ title: '付款金额不能超过待付金额', icon: 'none' });
    return;
  }

  paying.value = true;
  try {
    await apiFetch({
      url: `/finance/payables/${selectedPayable.value.id}/pay`,
      method: 'PUT',
      data: { amount },
    });
    uni.showToast({ title: '付款成功', icon: 'success' });
    selectedPayable.value = null;
    payAmount.value = '';
    page = 1;
    noMore.value = false;
    list.value = [];
    await fetchPayables();
    await fetchSummary();
  } catch {
    // 错误已在 apiFetch 中处理
  } finally {
    paying.value = false;
  }
}

onMounted(() => {
  fetchPayables();
  fetchSummary();
});
</script>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

/* 汇总卡片 */
.summary-cards {
  display: flex;
  padding: 16rpx 24rpx;
  gap: 16rpx;
  flex-wrap: wrap;
}
.summary-card {
  flex: 1;
  min-width: 150rpx;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}
.card-blue {
  background: linear-gradient(135deg, #409EFF, #66b1ff);
}
.card-green {
  background: linear-gradient(135deg, #67C23A, #85ce61);
}
.card-orange {
  background: linear-gradient(135deg, #E6A23C, #ebb563);
}
.card-red {
  background: linear-gradient(135deg, #F56C6C, #f78989);
}
.summary-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  display: block;
  margin-bottom: 8rpx;
}
.summary-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}
.summary-unit {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-left: 4rpx;
}

/* 筛选标签 */
.tab-bar {
  display: flex;
  background: #fff;
  padding: 0 32rpx;
  margin-bottom: 4rpx;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
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
  width: 60rpx;
  height: 6rpx;
  background: #409EFF;
  border-radius: 4rpx;
}

/* 列表 */
.list-scroll {
  flex: 1;
  padding: 16rpx 24rpx;
}
.payable-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.supplier-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
.status-badge {
  font-size: 24rpx;
  color: #fff;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}
.amount-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 16rpx;
}
.amount-main {
  flex-shrink: 0;
}
.amount-total {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}
.progress-wrap {
  flex: 1;
}
.progress-bar {
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
  margin-bottom: 6rpx;
}
.progress-fill {
  height: 100%;
  border-radius: 6rpx;
  transition: width 0.3s;
}
.progress-text {
  font-size: 22rpx;
  color: #999;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid #f5f5f5;
}
.due-date {
  font-size: 24rpx;
  color: #999;
}
.source-info {
  font-size: 24rpx;
  color: #999;
}

/* 空状态 */
.empty-hint {
  text-align: center;
  padding: 160rpx 0;
  color: #C0C4CC;
  font-size: 28rpx;
}

/* 加载更多 */
.loading-more {
  text-align: center;
  padding: 32rpx;
  color: #909399;
  font-size: 26rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12rpx;
}

/* 付款弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.modal-content {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  width: 640rpx;
  max-height: 80vh;
}
.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
  text-align: center;
  margin-bottom: 32rpx;
}
.modal-info {
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.info-label {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}
.unpaid-text {
  color: #F56C6C;
  font-weight: bold;
  margin-bottom: 0;
}
.modal-input-wrap {
  margin-bottom: 32rpx;
}
.input-label {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}
.modal-input {
  border: 2rpx solid #E4E7ED;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 32rpx;
  color: #333;
}
.modal-actions {
  display: flex;
  gap: 24rpx;
  justify-content: center;
}
</style>
