<template>
  <view class="page">
    <!-- 模式切换 -->
    <view class="header-bar">
      <view class="mode-tabs">
        <view
          class="mode-tab"
          :class="{ active: mode === 'list' }"
          @click="switchMode('list')"
        >
          <text>采购列表</text>
        </view>
        <view
          class="mode-tab"
          :class="{ active: mode === 'create' }"
          @click="switchMode('create')"
        >
          <text>新建采购</text>
        </view>
      </view>
    </view>

    <!-- ========== 列表视图 ========== -->
    <template v-if="mode === 'list'">
      <!-- 状态筛选 Tab -->
      <view class="status-tabs">
        <view
          v-for="tab in statusTabs"
          :key="tab.value"
          class="status-tab"
          :class="{ active: currentStatus === tab.value }"
          @click="switchStatus(tab.value)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <scroll-view
        scroll-y
        class="purchase-list"
        @scrolltolower="loadMore"
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
      >
        <view v-if="orders.length === 0 && !loading" class="empty-hint">
          <text>暂无采购单</text>
        </view>

        <view
          v-for="order in orders"
          :key="order.id"
          class="order-card"
          @click="viewDetail(order)"
        >
          <view class="order-header">
            <text class="order-no">{{ order.orderNo || order.id }}</text>
            <text class="order-status" :class="statusClass(order.status)">
              {{ statusText(order.status) }}
            </text>
          </view>
          <view class="order-body">
            <text class="order-supplier">
              供应商：{{ order.supplier?.name || '未知' }}
            </text>
            <text class="order-amount">
              ￥{{ amountText(order.totalAmount) }}
            </text>
          </view>
          <view class="order-footer" v-if="order.createdAt">
            <text class="order-time">创建时间：{{ formatTime(order.createdAt) }}</text>
            <text class="order-items" v-if="order.items">
              {{ order.items.length }} 项配件
            </text>
          </view>
        </view>

        <view v-if="loadingMore" class="loading-more">
          <u-loading-icon />
          <text>加载中...</text>
        </view>
        <view v-if="noMore && orders.length > 0" class="loading-more">
          <text>没有更多了</text>
        </view>
      </scroll-view>
    </template>

    <!-- ========== 新建采购视图 ========== -->
    <template v-if="mode === 'create'">
      <scroll-view scroll-y class="create-form">
        <!-- 选择供应商 -->
        <view class="form-section">
          <text class="section-title">供应商</text>
          <view class="supplier-list" v-if="suppliers.length > 0">
            <view
              v-for="sup in suppliers"
              :key="sup.id"
              class="supplier-item"
              :class="{ selected: selectedSupplier?.id === sup.id }"
              @click="selectedSupplier = sup"
            >
              <view class="sup-info">
                <text class="sup-name">{{ sup.name }}</text>
                <text class="sup-contact" v-if="sup.contact">
                  {{ sup.contact }} {{ sup.phone || '' }}
                </text>
              </view>
              <view v-if="selectedSupplier?.id === sup.id" class="sup-check">
                <text>✓</text>
              </view>
            </view>
          </view>
          <view v-else class="empty-mini">
            <text>暂无供应商数据</text>
          </view>
        </view>

        <!-- 选择配件 -->
        <view class="form-section">
          <text class="section-title">采购配件</text>
          <view class="search-inline">
            <u-search
              v-model="partKeyword"
              placeholder="搜索配件编码或名称"
              @search="searchParts"
              :show-action="false"
            />
          </view>
          <view v-if="partResults.length > 0" class="part-results">
            <view
              v-for="p in partResults"
              :key="p.id"
              class="part-result-item"
              @click="addItem(p)"
            >
              <view class="pr-info">
                <text class="pr-name">{{ p.name }}</text>
                <text class="pr-code">{{ p.code }}</text>
                <text class="pr-supplier" v-if="p.supplier">
                  供应商：{{ p.supplier.name }}
                </text>
              </view>
              <view class="pr-add">
                <text class="pr-add-btn">+ 添加</text>
              </view>
            </view>
          </view>

          <!-- 已添加的采购项 -->
          <view v-if="purchaseItems.length > 0" class="added-items">
            <text class="section-subtitle">采购清单（{{ purchaseItems.length }} 项）</text>
            <view
              v-for="(item, idx) in purchaseItems"
              :key="idx"
              class="added-item"
            >
              <view class="ai-info">
                <text class="ai-name">{{ item.partName }}</text>
                <text class="ai-code">{{ item.partCode }}</text>
              </view>
              <view class="ai-inputs">
                <view class="ai-field">
                  <text class="ai-label">数量</text>
                  <input
                    class="ai-input"
                    v-model.number="item.quantity"
                    type="number"
                    placeholder="0"
                  />
                </view>
                <view class="ai-field">
                  <text class="ai-label">单价</text>
                  <input
                    class="ai-input"
                    v-model.number="item.unitPrice"
                    type="digit"
                    placeholder="0.00"
                  />
                </view>
              </view>
              <view class="ai-amount">
                <text>小计：￥{{ itemAmount(item) }}</text>
              </view>
              <view class="ai-remove" @click="removeItem(idx)">
                <text class="remove-btn">删除</text>
              </view>
            </view>
            <view class="total-row">
              <text class="total-label">合计金额</text>
              <text class="total-value">￥{{ totalAmount }}</text>
            </view>
          </view>
        </view>

        <view class="submit-area">
          <view class="btn-submit" @click="submitPurchase">
            <text>提交采购单</text>
          </view>
        </view>
      </scroll-view>
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

function extractList(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.list)) return data.list;
  return [];
}

function formatTime(time: string) {
  if (!time) return '';
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function amountText(val: any): string {
  if (val === null || val === undefined) return '0.00';
  const n = Number(val);
  return isNaN(n) ? '0.00' : n.toFixed(2);
}

// ============ 模式切换 ============
const mode = ref<'list' | 'create'>('list');

function switchMode(m: 'list' | 'create') {
  mode.value = m;
  if (m === 'list') {
    fetchOrders();
  } else if (m === 'create') {
    loadSuppliers();
  }
}

// ============ 状态筛选 ============
const statusTabs = [
  { label: '全部', value: '' },
  { label: '待审批', value: 'pending' },
  { label: '已审批', value: 'approved' },
  { label: '已入库', value: 'stocked' },
];
const currentStatus = ref('');

const statusMap: Record<string, string> = {
  pending: '待审批',
  approved: '已审批',
  stocked: '已入库',
  cancelled: '已取消',
};

function statusText(status: string): string {
  return statusMap[status] || status;
}

function statusClass(status: string): string {
  const cls: Record<string, string> = {
    pending: 's-pending',
    approved: 's-approved',
    stocked: 's-stocked',
    cancelled: 's-cancelled',
  };
  return cls[status] || '';
}

function switchStatus(value: string) {
  currentStatus.value = value;
  page = 1;
  noMore.value = false;
  orders.value = [];
  fetchOrders();
}

// ============ 采购单列表 ============
const orders = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

function fetchOrders() {
  loading.value = true;
  let url = `/inventory/purchase?page=${page}&pageSize=20`;
  if (currentStatus.value) {
    url += `&status=${currentStatus.value}`;
  }
  apiFetch<any>({ url })
    .then((data) => {
      const list = extractList(data);
      if (page === 1) {
        orders.value = list;
      } else {
        orders.value = orders.value.concat(list);
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
  fetchOrders();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchOrders();
}

function viewDetail(order: any) {
  const info = [
    `单号：${order.orderNo || order.id}`,
    `供应商：${order.supplier?.name || '未知'}`,
    `状态：${statusText(order.status)}`,
    `总金额：￥${amountText(order.totalAmount)}`,
    `创建时间：${formatTime(order.createdAt)}`,
  ];
  if (order.items && order.items.length > 0) {
    info.push(`---配件明细---`);
    order.items.forEach((it: any, idx: number) => {
      info.push(
        `${idx + 1}. ${it.part?.name || '配件' + it.partId} ×${it.quantity} @￥${amountText(it.unitPrice)} = ￥${amountText(it.amount)}`
      );
    });
  }
  uni.showModal({ title: '采购单详情', content: info.join('\n'), showCancel: false });
}

// ============ 新建采购 ============
const suppliers = ref<any[]>([]);
const selectedSupplier = ref<any>(null);
const partKeyword = ref('');
const partResults = ref<any[]>([]);
const purchaseItems = ref<Array<{ partId: number; partName: string; partCode: string; quantity: number; unitPrice: number }>>([]);

function loadSuppliers() {
  apiFetch<any[]>({ url: '/suppliers' })
    .then((data) => {
      suppliers.value = Array.isArray(data) ? data : (data?.list || data || []);
    })
    .catch(() => {});
}

function searchParts() {
  if (!partKeyword.value.trim()) {
    partResults.value = [];
    return;
  }
  const url = `/inventory?keyword=${encodeURIComponent(partKeyword.value.trim())}&page=1&pageSize=30`;
  apiFetch<any>({ url })
    .then((data) => {
      partResults.value = extractList(data);
    })
    .catch(() => {
      partResults.value = [];
    });
}

function addItem(part: any) {
  const exists = purchaseItems.value.find((it) => it.partId === part.id);
  if (exists) {
    uni.showToast({ title: '该配件已添加', icon: 'none' });
    return;
  }
  purchaseItems.value.push({
    partId: part.id,
    partName: part.name,
    partCode: part.code,
    quantity: 1,
    unitPrice: Number(part.price) || 0,
  });
  partKeyword.value = '';
  partResults.value = [];
}

function removeItem(idx: number) {
  purchaseItems.value.splice(idx, 1);
}

function itemAmount(item: { quantity: number; unitPrice: number }): string {
  const n = (item.quantity || 0) * (item.unitPrice || 0);
  return n.toFixed(2);
}

const totalAmount = computed(() => {
  const sum = purchaseItems.value.reduce(
    (acc, it) => acc + (it.quantity || 0) * (it.unitPrice || 0),
    0,
  );
  return sum.toFixed(2);
});

async function submitPurchase() {
  if (!selectedSupplier.value) {
    uni.showToast({ title: '请选择供应商', icon: 'none' });
    return;
  }
  if (purchaseItems.value.length === 0) {
    uni.showToast({ title: '请添加至少一个配件', icon: 'none' });
    return;
  }
  const invalidIdx = purchaseItems.value.findIndex(
    (it) => !it.quantity || it.quantity <= 0 || it.unitPrice == null,
  );
  if (invalidIdx >= 0) {
    uni.showToast({ title: `第${invalidIdx + 1}项数量或单价无效`, icon: 'none' });
    return;
  }

  try {
    await apiFetch({
      url: '/inventory/purchase',
      method: 'POST',
      data: {
        supplierId: selectedSupplier.value.id,
        items: purchaseItems.value.map((it) => ({
          partId: it.partId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
      },
    });
    uni.showToast({ title: '采购单已提交', icon: 'success' });
    // 重置表单
    selectedSupplier.value = null;
    purchaseItems.value = [];
    partKeyword.value = '';
    partResults.value = [];
  } catch {
    // 错误已在 apiFetch 中提示
  }
}

onMounted(() => {
  fetchOrders();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

/* 模式切换 */
.header-bar {
  background: #fff;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}
.mode-tabs {
  display: flex;
  background: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
}
.mode-tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 14px;
  color: #606266;
  border-radius: 8px;
}
.mode-tab.active {
  background: #409EFF;
  color: #fff;
  font-weight: bold;
}

/* 状态筛选 Tab */
.status-tabs {
  display: flex;
  background: #fff;
  padding: 0 16px;
  border-bottom: 1px solid #eee;
}
.status-tab {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 13px;
  color: #606266;
  position: relative;
}
.status-tab.active {
  color: #409EFF;
  font-weight: bold;
}
.status-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 3px;
  background: #409EFF;
  border-radius: 2px;
}

/* 采购单列表 */
.purchase-list {
  flex: 1;
  padding: 12px 16px;
}

.order-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.order-no {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}

.order-status {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 4px;
}

.s-pending {
  background: #fdf6ec;
  color: #E6A23C;
}
.s-approved {
  background: #f0f9ff;
  color: #409EFF;
}
.s-stocked {
  background: #f0fdf4;
  color: #67C23A;
}
.s-cancelled {
  background: #fef0f0;
  color: #F56C6C;
}

.order-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.order-supplier {
  font-size: 14px;
  color: #606266;
}

.order-amount {
  font-size: 17px;
  font-weight: bold;
  color: #F56C6C;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}

.order-time {
  font-size: 12px;
  color: #C0C4CC;
}

.order-items {
  font-size: 12px;
  color: #909399;
}

/* 新建采购表单 */
.create-form {
  flex: 1;
  padding: 16px;
}

.form-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
  display: block;
  margin-bottom: 12px;
}

.section-subtitle {
  font-size: 13px;
  color: #606266;
  display: block;
  margin-bottom: 10px;
  margin-top: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

/* 供应商列表 */
.supplier-list {}

.supplier-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #f5f5f5;
  border-radius: 6px;
}

.supplier-item.selected {
  background: #ecf5ff;
}

.sup-info {
  flex: 1;
}

.sup-name {
  font-size: 14px;
  color: #303133;
  display: block;
}

.sup-contact {
  font-size: 12px;
  color: #909399;
  display: block;
}

.sup-check {
  color: #409EFF;
  font-weight: bold;
  font-size: 18px;
}

.empty-mini {
  text-align: center;
  padding: 20px 0;
  color: #C0C4CC;
  font-size: 13px;
}

/* 配件搜索 */
.search-inline {
  margin-bottom: 12px;
}

.part-results {
  margin-bottom: 12px;
}

.part-result-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #f5f5f5;
}

.pr-info {
  flex: 1;
}

.pr-name {
  font-size: 14px;
  color: #303133;
  display: block;
}

.pr-code {
  font-size: 12px;
  color: #909399;
}

.pr-supplier {
  font-size: 11px;
  color: #C0C4CC;
  display: block;
}

.pr-add {}

.pr-add-btn {
  font-size: 13px;
  color: #409EFF;
  padding: 4px 10px;
  border: 1px solid #409EFF;
  border-radius: 4px;
}

/* 已添加配件列表 */
.added-items {}

.added-item {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}

.ai-info {
  margin-bottom: 8px;
}

.ai-name {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  display: block;
}

.ai-code {
  font-size: 12px;
  color: #909399;
}

.ai-inputs {
  display: flex;
  gap: 12px;
  margin-bottom: 6px;
}

.ai-field {
  flex: 1;
  display: flex;
  align-items: center;
}

.ai-label {
  font-size: 13px;
  color: #606266;
  margin-right: 8px;
  flex-shrink: 0;
}

.ai-input {
  flex: 1;
  font-size: 14px;
  color: #303133;
  border-bottom: 1px solid #ddd;
  padding: 4px 0;
  text-align: center;
}

.ai-amount {
  margin-bottom: 6px;
}

.ai-amount text {
  font-size: 13px;
  color: #F56C6C;
}

.ai-remove {
  text-align: right;
}

.remove-btn {
  font-size: 12px;
  color: #F56C6C;
  padding: 4px 10px;
  border: 1px solid #F56C6C;
  border-radius: 4px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0 4px;
  border-top: 1px solid #f0f0f0;
  margin-top: 8px;
}

.total-label {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}

.total-value {
  font-size: 18px;
  font-weight: bold;
  color: #F56C6C;
}

/* 提交按钮 */
.submit-area {
  padding: 20px 0 40px;
}

.btn-submit {
  background: #409EFF;
  border-radius: 10px;
  padding: 14px 0;
  text-align: center;
}

.btn-submit text {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
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
