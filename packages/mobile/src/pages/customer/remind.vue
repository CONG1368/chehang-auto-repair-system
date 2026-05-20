<template>
  <view class="page">
    <!-- Tab 切换 -->
    <view class="tab-bar">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: currentTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
        <text v-if="tab.count > 0" class="tab-badge">{{ tab.count }}</text>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="remind-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length === 0 && !loading" class="empty-hint">
        <text>暂无到期提醒</text>
      </view>

      <view v-for="item in list" :key="item.id" class="remind-card">
        <!-- 保养提醒 -->
        <template v-if="currentTab === 'maintenance'">
          <view class="remind-header">
            <text class="remind-customer">{{ item.customerName || item.customer?.name || '-' }}</text>
            <text class="remind-badge" :class="urgencyClass(item)">{{ urgencyText(item) }}</text>
          </view>
          <view class="remind-body">
            <view class="remind-row">
              <text class="remind-label">车牌号</text>
              <text class="remind-value plate">{{ item.plateNumber || '-' }}</text>
            </view>
            <view class="remind-row">
              <text class="remind-label">上次保养</text>
              <text class="remind-value">{{ formatDate(item.lastMaintenanceDate || item.lastMaintenanceAt) }}</text>
            </view>
            <view class="remind-row">
              <text class="remind-label">建议保养</text>
              <text class="remind-value">{{ formatDate(item.suggestedDate || item.nextMaintenanceAt) }}</text>
            </view>
            <view class="remind-row">
              <text class="remind-label">距到期</text>
              <text class="remind-value" :style="{ color: remainColor(item) }">
                {{ remainText(item) }}
              </text>
            </view>
          </view>
          <view class="remind-footer">
            <text class="remind-phone" @click="callCustomer(item)">{{ item.customerPhone || item.customer?.phone || '' }}</text>
          </view>
        </template>

        <!-- 保险提醒 -->
        <template v-if="currentTab === 'insurance'">
          <view class="remind-header">
            <text class="remind-customer">{{ item.customerName || item.customer?.name || '-' }}</text>
            <text class="remind-badge" :class="urgencyClass(item)">{{ urgencyText(item) }}</text>
          </view>
          <view class="remind-body">
            <view class="remind-row">
              <text class="remind-label">车牌号</text>
              <text class="remind-value plate">{{ item.plateNumber || '-' }}</text>
            </view>
            <view class="remind-row">
              <text class="remind-label">保险到期</text>
              <text class="remind-value">{{ formatDate(item.insuranceDue) }}</text>
            </view>
            <view class="remind-row">
              <text class="remind-label">距到期</text>
              <text class="remind-value" :style="{ color: remainColor(item) }">
                {{ remainText(item) }}
              </text>
            </view>
          </view>
          <view class="remind-footer">
            <text class="remind-phone" @click="callCustomer(item)">{{ item.customerPhone || item.customer?.phone || '' }}</text>
          </view>
        </template>

        <!-- 年检提醒 -->
        <template v-if="currentTab === 'inspection'">
          <view class="remind-header">
            <text class="remind-customer">{{ item.customerName || item.customer?.name || '-' }}</text>
            <text class="remind-badge" :class="urgencyClass(item)">{{ urgencyText(item) }}</text>
          </view>
          <view class="remind-body">
            <view class="remind-row">
              <text class="remind-label">车牌号</text>
              <text class="remind-value plate">{{ item.plateNumber || '-' }}</text>
            </view>
            <view class="remind-row">
              <text class="remind-label">年检到期</text>
              <text class="remind-value">{{ formatDate(item.inspectionDue) }}</text>
            </view>
            <view class="remind-row">
              <text class="remind-label">距到期</text>
              <text class="remind-value" :style="{ color: remainColor(item) }">
                {{ remainText(item) }}
              </text>
            </view>
          </view>
          <view class="remind-footer">
            <text class="remind-phone" @click="callCustomer(item)">{{ item.customerPhone || item.customer?.phone || '' }}</text>
          </view>
        </template>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && list.length > 0" class="loading-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>
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

const tabs = [
  { label: '保养到期', value: 'maintenance', count: 0 },
  { label: '保险到期', value: 'insurance', count: 0 },
  { label: '年检到期', value: 'inspection', count: 0 },
];

const currentTab = ref('maintenance');
const list = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

function switchTab(value: string) {
  currentTab.value = value;
  page = 1;
  noMore.value = false;
  list.value = [];
  fetchReminds();
}

function fetchReminds() {
  loading.value = true;
  const url = `/customers/reminds?type=${currentTab.value}&page=${page}&pageSize=20`;
  apiFetch<any>({ url })
    .then((data: any) => {
      const items = data?.list || data || [];
      if (page === 1) {
        list.value = items;
      } else {
        list.value = list.value.concat(items);
      }
      if (items.length < 20) {
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
  fetchReminds();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchReminds();
}

function callCustomer(item: any) {
  const phone = item.customerPhone || item.customer?.phone;
  if (phone) {
    uni.makePhoneCall({ phoneNumber: phone });
  }
}

// 计算距到期天数
function getRemainDays(item: any): number | null {
  let dueDate: string | undefined;
  if (currentTab.value === 'maintenance') {
    dueDate = item.suggestedDate || item.nextMaintenanceAt;
  } else if (currentTab.value === 'insurance') {
    dueDate = item.insuranceDue;
  } else {
    dueDate = item.inspectionDue;
  }
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function remainText(item: any): string {
  const days = getRemainDays(item);
  if (days === null) return '-';
  if (days < 0) return `已超期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  return `剩余 ${days} 天`;
}

function remainColor(item: any): string {
  const days = getRemainDays(item);
  if (days === null) return '#909399';
  if (days < 0) return '#F56C6C';
  if (days <= 7) return '#E6A23C';
  if (days <= 30) return '#409EFF';
  return '#67C23A';
}

function urgencyText(item: any): string {
  const days = getRemainDays(item);
  if (days === null) return '未知';
  if (days < 0) return '已超期';
  if (days <= 7) return '即将到期';
  if (days <= 30) return '近期到期';
  return '';
}

function urgencyClass(item: any): string {
  const days = getRemainDays(item);
  if (days === null) return '';
  if (days < 0) return 'danger';
  if (days <= 7) return 'warning';
  return '';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

onMounted(() => {
  fetchReminds();
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
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
.tab-badge {
  background: #F56C6C;
  color: #fff;
  font-size: 11px;
  padding: 0 6px;
  border-radius: 10px;
  line-height: 18px;
}

.remind-list {
  flex: 1;
  padding: 12px 16px;
}

.remind-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.remind-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.remind-customer {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}
.remind-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  color: #67C23A;
  background: #f0f9eb;
}
.remind-badge.warning {
  color: #E6A23C;
  background: #fdf6ec;
}
.remind-badge.danger {
  color: #F56C6C;
  background: #fef0f0;
}

.remind-body {
  margin-bottom: 10px;
}
.remind-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}
.remind-label {
  font-size: 13px;
  color: #909399;
}
.remind-value {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
}
.remind-value.plate {
  color: #409EFF;
}

.remind-footer {
  padding-top: 8px;
  border-top: 1px solid #f5f5f5;
}
.remind-phone {
  font-size: 13px;
  color: #409EFF;
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
