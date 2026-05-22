<template>
  <view class="page">
    <!-- 统计卡片 -->
    <view class="summary-cards">
      <view class="summary-card card-blue">
        <text class="summary-label">发票总数</text>
        <text class="summary-value">{{ stats.totalCount || 0 }}</text>
        <text class="summary-unit">张</text>
      </view>
      <view class="summary-card card-green">
        <text class="summary-label">开票总额</text>
        <text class="summary-value">&yen;{{ formatPrice(stats.totalAmount) }}</text>
      </view>
      <view class="summary-card card-orange">
        <text class="summary-label">本月开票</text>
        <text class="summary-value">{{ stats.thisMonthCount || 0 }}</text>
        <text class="summary-unit">张</text>
      </view>
      <view class="summary-card card-red">
        <text class="summary-label">已作废</text>
        <text class="summary-value">{{ stats.cancelledCount || 0 }}</text>
        <text class="summary-unit">张</text>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索发票号或客户名..."
        confirm-type="search"
        @confirm="onSearch"
      />
      <text class="search-btn" @click="onSearch">搜索</text>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-row">
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-group">
          <text class="filter-label">类型：</text>
          <view
            v-for="tab in typeTabs"
            :key="tab.value"
            class="filter-chip"
            :class="{ active: currentType === tab.value }"
            @click="switchType(tab.value)"
          >
            <text>{{ tab.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
    <view class="filter-row">
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-group">
          <text class="filter-label">状态：</text>
          <view
            v-for="tab in statusTabs"
            :key="tab.value"
            class="filter-chip"
            :class="{ active: currentStatus === tab.value }"
            @click="switchStatus(tab.value)"
          >
            <text>{{ tab.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 发票列表 -->
    <scroll-view
      scroll-y
      class="list-scroll"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length === 0 && !loading" class="empty-hint">
        <text>暂无发票数据</text>
      </view>

      <view
        v-for="item in list"
        :key="item.id"
        class="invoice-card"
        @longpress="onLongPress(item)"
      >
        <view class="card-header">
          <text class="invoice-no">{{ item.invoiceNo }}</text>
          <view class="header-right">
            <text class="type-badge" :style="{ background: typeColor(item.type) }">
              {{ typeText(item.type) }}
            </text>
            <text class="status-dot" :style="{ color: invoiceStatusColor(item.status) }">
              {{ invoiceStatusText(item.status) }}
            </text>
          </view>
        </view>
        <view class="card-body">
          <text class="customer-name">{{ item.customer?.name || '--' }}</text>
          <text class="invoice-amount">&yen;{{ formatPrice(item.amount) }}</text>
        </view>
        <view class="card-footer">
          <text class="related-no">{{ item.relatedNo || '--' }}</text>
          <text class="invoice-date">{{ formatDate(item.createdAt) }}</text>
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

    <!-- 新建按钮 -->
    <view class="fab-btn" @click="showCreateModal = true">
      <text class="fab-icon">+</text>
    </view>

    <!-- 新建发票弹窗 -->
    <view v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">新建发票</text>

        <!-- 发票号 -->
        <view class="form-item">
          <text class="form-label">发票号 *</text>
          <input v-model="createForm.invoiceNo" class="form-input" placeholder="请输入发票号" />
        </view>

        <!-- 选择客户 -->
        <view class="form-item">
          <text class="form-label">客户</text>
          <view class="customer-pick" @click="showCustomerPicker = true">
            <text :class="{ placeholder: !selectedCustomer }">
              {{ selectedCustomer ? selectedCustomer.name : '请选择客户' }}
            </text>
            <text class="arrow">></text>
          </view>
        </view>

        <!-- 发票类型 -->
        <view class="form-item">
          <text class="form-label">发票类型</text>
          <view class="type-selector">
            <view
              v-for="t in invoiceTypes"
              :key="t.value"
              class="type-option"
              :class="{ selected: createForm.type === t.value }"
              @click="createForm.type = t.value"
            >
              <text>{{ t.label }}</text>
            </view>
          </view>
        </view>

        <!-- 金额 -->
        <view class="form-item">
          <text class="form-label">金额</text>
          <input
            v-model="createForm.amount"
            class="form-input"
            type="digit"
            placeholder="请输入开票金额"
          />
        </view>

        <!-- 关联单号 -->
        <view class="form-item">
          <text class="form-label">关联单号</text>
          <input v-model="createForm.relatedNo" class="form-input" placeholder="请输入关联工单号" />
        </view>

        <view class="modal-actions">
          <u-button type="default" text="取消" @click="showCreateModal = false" />
          <u-button type="primary" text="确认创建" :loading="creating" @click="handleCreate" />
        </view>
      </view>
    </view>

    <!-- 选择客户弹窗 -->
    <view v-if="showCustomerPicker" class="modal-overlay" @click="showCustomerPicker = false">
      <view class="modal-content picker-content" @click.stop>
        <text class="modal-title">选择客户</text>
        <view class="search-bar" style="margin: 0 0 20rpx 0;">
          <input
            v-model="customerSearch"
            class="search-input"
            placeholder="搜索客户姓名..."
            @input="onCustomerSearch"
          />
        </view>
        <scroll-view scroll-y class="picker-list">
          <view
            v-for="c in customerList"
            :key="c.id"
            class="picker-item"
            :class="{ picked: selectedCustomer?.id === c.id }"
            @click="pickCustomer(c)"
          >
            <text>{{ c.name }}</text>
            <text class="picker-phone">{{ c.phone || '' }}</text>
          </view>
          <view v-if="customerList.length === 0" class="empty-hint" style="padding: 60rpx 0;">
            <text>未找到匹配客户</text>
          </view>
        </scroll-view>
        <view style="margin-top: 24rpx; text-align: center;">
          <u-button type="primary" text="确定" @click="showCustomerPicker = false" />
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

// 统计
const stats = ref({
  totalCount: 0,
  totalAmount: 0,
  thisMonthCount: 0,
  cancelledCount: 0,
});

// 搜索
const keyword = ref('');

// 筛选
const typeTabs = [
  { label: '全部', value: '' },
  { label: '增值税发票', value: 'vat' },
  { label: '普通发票', value: 'normal' },
  { label: '电子发票', value: 'electronic' },
];
const statusTabs = [
  { label: '全部', value: '' },
  { label: '已开具', value: 'issued' },
  { label: '已作废', value: 'cancelled' },
];

const currentType = ref('');
const currentStatus = ref('');

// 列表
const list = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

// 类型/状态映射
const typeMap: Record<string, string> = {
  vat: '增值税发票',
  normal: '普通发票',
  electronic: '电子发票',
};
const statusInvMap: Record<string, string> = {
  issued: '已开具',
  cancelled: '已作废',
};

function typeText(type: string): string {
  return typeMap[type] || type || '--';
}
function typeColor(type: string): string {
  const colors: Record<string, string> = {
    vat: '#409EFF',
    normal: '#67C23A',
    electronic: '#E6A23C',
  };
  return colors[type] || '#909399';
}
function invoiceStatusText(status: string): string {
  return statusInvMap[status] || status || '--';
}
function invoiceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    issued: '#67C23A',
    cancelled: '#F56C6C',
  };
  return colors[status] || '#909399';
}

function formatPrice(val: any): string {
  return (Number(val) || 0).toFixed(2);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '--';
  return dateStr.substring(0, 10);
}

function onSearch() {
  page = 1;
  noMore.value = false;
  list.value = [];
  fetchInvoices();
}

function switchType(value: string) {
  currentType.value = value;
  page = 1;
  noMore.value = false;
  list.value = [];
  fetchInvoices();
}

function switchStatus(value: string) {
  currentStatus.value = value;
  page = 1;
  noMore.value = false;
  list.value = [];
  fetchInvoices();
}

async function fetchInvoices() {
  loading.value = true;
  let url = `/invoice?page=${page}&pageSize=20`;
  if (currentType.value) url += `&type=${currentType.value}`;
  if (currentStatus.value) url += `&status=${currentStatus.value}`;
  if (keyword.value) url += `&keyword=${encodeURIComponent(keyword.value)}`;

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

async function fetchStats() {
  try {
    const data: any = await apiFetch({ url: '/invoice/stats' });
    if (data) {
      stats.value = data;
    }
  } catch {
    // 统计加载失败不影响列表
  }
}

function loadMore() {
  if (loadingMore.value || noMore.value) return;
  loadingMore.value = true;
  page++;
  fetchInvoices();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchInvoices();
  await fetchStats();
}

// 长按作废发票
function onLongPress(item: any) {
  if (item.status === 'cancelled') {
    uni.showToast({ title: '该发票已作废', icon: 'none' });
    return;
  }
  uni.showModal({
    title: '作废发票',
    content: `确定作废发票 ${item.invoiceNo} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiFetch({ url: `/invoice/${item.id}/cancel`, method: 'PUT' });
          uni.showToast({ title: '作废成功', icon: 'success' });
          page = 1;
          noMore.value = false;
          list.value = [];
          await fetchInvoices();
          await fetchStats();
        } catch {
          // 错误已处理
        }
      }
    },
  });
}

// 新建发票
const showCreateModal = ref(false);
const creating = ref(false);
const createForm = ref({
  invoiceNo: '',
  type: 'vat',
  amount: '',
  relatedNo: '',
});

const invoiceTypes = [
  { label: '增值税发票', value: 'vat' },
  { label: '普通发票', value: 'normal' },
  { label: '电子发票', value: 'electronic' },
];

// 客户选择
const showCustomerPicker = ref(false);
const selectedCustomer = ref<any>(null);
const customerSearch = ref('');
const customerList = ref<any[]>([]);

// 搜索客户
async function onCustomerSearch() {
  if (!customerSearch.value.trim()) {
    customerList.value = [];
    return;
  }
  try {
    const data: any = await apiFetch({
      url: `/customers?keyword=${encodeURIComponent(customerSearch.value)}&pageSize=50`,
    });
    customerList.value = data?.list || data || [];
  } catch {
    customerList.value = [];
  }
}

function pickCustomer(c: any) {
  selectedCustomer.value = c;
}

async function handleCreate() {
  if (!createForm.value.invoiceNo.trim()) {
    uni.showToast({ title: '请输入发票号', icon: 'none' });
    return;
  }
  if (!selectedCustomer.value) {
    uni.showToast({ title: '请选择客户', icon: 'none' });
    return;
  }
  if (!createForm.value.amount || Number(createForm.value.amount) <= 0) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' });
    return;
  }

  creating.value = true;
  try {
    await apiFetch({
      url: '/invoice',
      method: 'POST',
      data: {
        invoiceNo: createForm.value.invoiceNo.trim(),
        type: createForm.value.type,
        amount: Number(createForm.value.amount),
        customerId: selectedCustomer.value.id,
        relatedNo: createForm.value.relatedNo || '',
      },
    });
    uni.showToast({ title: '创建成功', icon: 'success' });
    showCreateModal.value = false;
    createForm.value = { invoiceNo: '', type: 'vat', amount: '', relatedNo: '' };
    selectedCustomer.value = null;
    page = 1;
    noMore.value = false;
    list.value = [];
    await fetchInvoices();
    await fetchStats();
  } catch {
    // 错误已处理
  } finally {
    creating.value = false;
  }
}

onMounted(() => {
  fetchInvoices();
  fetchStats();
});
</script>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  position: relative;
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

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  background: #fff;
  gap: 16rpx;
}
.search-input {
  flex: 1;
  height: 68rpx;
  background: #f5f5f5;
  border-radius: 34rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #333;
}
.search-btn {
  font-size: 28rpx;
  color: #409EFF;
  padding: 12rpx 16rpx;
}

/* 筛选行 */
.filter-row {
  background: #fff;
  padding: 8rpx 24rpx 20rpx;
}
.filter-scroll {
  white-space: nowrap;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.filter-label {
  font-size: 26rpx;
  color: #666;
  flex-shrink: 0;
}
.filter-chip {
  display: inline-flex;
  padding: 8rpx 24rpx;
  border-radius: 28rpx;
  background: #f5f5f5;
  font-size: 26rpx;
  color: #666;
}
.filter-chip.active {
  background: #ecf5ff;
  color: #409EFF;
  font-weight: 500;
}

/* 列表 */
.list-scroll {
  flex: 1;
  padding: 12rpx 24rpx 120rpx;
}
.invoice-card {
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
.invoice-no {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.type-badge {
  font-size: 22rpx;
  color: #fff;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}
.status-dot {
  font-size: 24rpx;
  font-weight: 500;
}
.card-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}
.customer-name {
  font-size: 28rpx;
  color: #666;
}
.invoice-amount {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 12rpx;
  border-top: 1rpx solid #f5f5f5;
}
.related-no {
  font-size: 24rpx;
  color: #999;
}
.invoice-date {
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

/* 浮动按钮 */
.fab-btn {
  position: fixed;
  bottom: 60rpx;
  right: 40rpx;
  width: 100rpx;
  height: 100rpx;
  background: #409EFF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(64, 158, 255, 0.4);
  z-index: 100;
}
.fab-icon {
  font-size: 56rpx;
  color: #fff;
  line-height: 1;
}

/* 弹窗 */
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
  width: 660rpx;
  max-height: 85vh;
  overflow-y: auto;
}
.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
  text-align: center;
  margin-bottom: 32rpx;
}
.form-item {
  margin-bottom: 24rpx;
}
.form-label {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}
.form-input {
  border: 2rpx solid #E4E7ED;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #333;
  background: #fff;
}
.customer-pick {
  border: 2rpx solid #E4E7ED;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
  color: #333;
}
.customer-pick .placeholder {
  color: #C0C4CC;
}
.customer-pick .arrow {
  color: #C0C4CC;
  font-size: 32rpx;
}
.type-selector {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}
.type-option {
  padding: 12rpx 28rpx;
  border-radius: 24rpx;
  background: #f5f5f5;
  font-size: 26rpx;
  color: #666;
}
.type-option.selected {
  background: #ecf5ff;
  color: #409EFF;
  font-weight: 500;
}
.modal-actions {
  display: flex;
  gap: 24rpx;
  justify-content: center;
  margin-top: 16rpx;
}

/* 客户选择弹窗 */
.picker-content {
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.picker-list {
  flex: 1;
  max-height: 500rpx;
}
.picker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 16rpx;
  border-bottom: 1rpx solid #f5f5f5;
  font-size: 28rpx;
  color: #333;
}
.picker-item.picked {
  background: #ecf5ff;
}
.picker-phone {
  font-size: 24rpx;
  color: #999;
}
</style>
