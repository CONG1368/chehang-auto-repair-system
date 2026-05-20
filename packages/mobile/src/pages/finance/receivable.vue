<template>
  <view class="page">
    <!-- 类型 Tab -->
    <view class="tab-bar">
      <view
        v-for="tab in typeTabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: currentType === tab.value }"
        @click="switchType(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="receivable-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="records.length === 0 && !loading" class="empty-hint">
        <text>暂无数据</text>
      </view>

      <view
        v-for="item in records"
        :key="item.id"
        class="receivable-card"
      >
        <view class="receivable-header">
          <text class="receivable-name">{{ item.counterpartyName || item.name || '--' }}</text>
          <text class="receivable-status" :style="{ color: payStatusColor(item.status) }">
            {{ payStatusText(item.status) }}
          </text>
        </view>
        <view class="receivable-info">
          <view class="info-row">
            <text class="label">金额</text>
            <text class="value amount">&yen;{{ item.amount || 0 }}</text>
          </view>
          <view class="info-row">
            <text class="label">账期</text>
            <text class="value">{{ item.dueDate || item.paymentTerm || '--' }}</text>
          </view>
          <view class="info-row" v-if="item.paidAmount !== undefined">
            <text class="label">已付</text>
            <text class="value paid">&yen;{{ item.paidAmount || 0 }}</text>
          </view>
          <view class="info-row" v-if="item.paidAmount !== undefined">
            <text class="label">未付</text>
            <text class="value unpaid">&yen;{{ (item.amount || 0) - (item.paidAmount || 0) }}</text>
          </view>
        </view>
        <view class="receivable-footer" v-if="item.description">
          <text>{{ item.description }}</text>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && records.length > 0" class="loading-more">
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

const typeTabs = [
  { label: '应收账款', value: 'receivable' },
  { label: '应付账款', value: 'payable' },
];

const currentType = ref('receivable');
const records = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

const payStatusMap: Record<string, string> = {
  unpaid: '未付',
  partial: '部分付',
  paid: '已付',
  overdue: '已逾期',
};

function payStatusText(status: string) {
  return payStatusMap[status] || status;
}

function payStatusColor(status: string): string {
  const colors: Record<string, string> = {
    unpaid: '#F56C6C',
    partial: '#E6A23C',
    paid: '#67C23A',
    overdue: '#F56C6C',
  };
  return colors[status] || '#909399';
}

function switchType(value: string) {
  currentType.value = value;
  page = 1;
  noMore.value = false;
  records.value = [];
  fetchRecords();
}

function fetchRecords() {
  loading.value = true;
  const url = currentType.value === 'receivable'
    ? `/finance/receivable?page=${page}&pageSize=20`
    : `/finance/payable?page=${page}&pageSize=20`;
  apiFetch<any[]>({ url })
    .then((data) => {
      const list = data || [];
      if (page === 1) {
        records.value = list;
      } else {
        records.value = records.value.concat(list);
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

function loadMore() {
  if (loadingMore.value || noMore.value) return;
  loadingMore.value = true;
  page++;
  fetchRecords();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchRecords();
}

onMounted(() => {
  fetchRecords();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}
.tab-bar {
  display: flex;
  background: #fff;
  padding: 0 16px;
  border-bottom: 1px solid #eee;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 14px;
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
  width: 30px;
  height: 3px;
  background: #409EFF;
  border-radius: 2px;
}
.receivable-list {
  flex: 1;
  padding: 12px 16px;
}
.receivable-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.receivable-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.receivable-name {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}
.receivable-status {
  font-size: 13px;
  font-weight: 500;
}
.receivable-info {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 10px 12px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
}
.info-row .label {
  font-size: 12px;
  color: #909399;
}
.info-row .value {
  font-size: 13px;
  color: #303133;
}
.info-row .amount {
  font-weight: bold;
  color: #303133;
}
.info-row .paid {
  color: #67C23A;
}
.info-row .unpaid {
  color: #F56C6C;
}
.receivable-footer {
  font-size: 12px;
  color: #C0C4CC;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #eee;
}
.empty-hint {
  text-align: center;
  padding: 80px 0;
  color: #C0C4CC;
  font-size: 14px;
}
.loading-more {
  text-align: center;
  padding: 16px;
  color: #909399;
  font-size: 13px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}
</style>
