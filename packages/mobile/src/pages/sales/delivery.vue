<template>
  <view class="page">
    <!-- 交车标签切换 -->
    <view class="tab-bar">
      <view
        v-for="tab in deliveryTabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: currentTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="delivery-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length === 0 && !loading" class="empty-hint">
        <text>{{ currentTab === 'pending' ? '暂无待交车订单' : '暂无交车记录' }}</text>
      </view>

      <!-- 待交车 -->
      <template v-if="currentTab === 'pending'">
        <view
          v-for="order in list"
          :key="order.id"
          class="delivery-card"
        >
          <view class="card-header">
            <text class="card-no">{{ order.orderNo }}</text>
            <text class="card-status" style="color: #409EFF;">待交车</text>
          </view>
          <view class="card-info">
            <view class="info-row">
              <text class="info-label">客户</text>
              <text class="info-value">{{ order.customer?.name || '-' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">车辆</text>
              <text class="info-value">
                {{ order.vehicle ? `${order.vehicle.brand} ${order.vehicle.series} ${order.vehicle.model || ''}` : '-' }}
              </text>
            </view>
            <view class="info-row">
              <text class="info-label">总金额</text>
              <text class="info-value price">¥{{ formatNum(order.totalAmount) }}</text>
            </view>
            <view class="info-row" v-if="order.createdAt">
              <text class="info-label">签约时间</text>
              <text class="info-value">{{ formatTime(order.createdAt) }}</text>
            </view>
          </view>
          <view class="card-actions">
            <view class="action-btn primary" @click="openDelivery(order)">执行交车</view>
          </view>
        </view>
      </template>

      <!-- 已交车 -->
      <template v-if="currentTab === 'completed'">
        <view
          v-for="order in list"
          :key="order.id"
          class="delivery-card"
          @click="viewCompleted(order)"
        >
          <view class="card-header">
            <text class="card-no">{{ order.orderNo }}</text>
            <text class="card-status" style="color: #67C23A;">已交车</text>
          </view>
          <view class="card-info">
            <view class="info-row">
              <text class="info-label">客户</text>
              <text class="info-value">{{ order.customer?.name || '-' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">车辆</text>
              <text class="info-value">
                {{ order.vehicle ? `${order.vehicle.brand} ${order.vehicle.series} ${order.vehicle.model || ''}` : '-' }}
              </text>
            </view>
            <view class="info-row" v-if="order.deliveryDate">
              <text class="info-label">交车日期</text>
              <text class="info-value">{{ formatDate(order.deliveryDate) }}</text>
            </view>
          </view>
        </view>
      </template>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && list.length > 0" class="loading-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- 执行交车弹窗 -->
    <u-popup :show="deliveryShow" mode="bottom" round @close="deliveryShow = false">
      <view class="delivery-popup" v-if="deliveryOrder">
        <text class="section-title">确认交车</text>

        <view class="delivery-summary">
          <view class="sum-item">
            <text class="sum-label">订单号</text>
            <text class="sum-value">{{ deliveryOrder.orderNo }}</text>
          </view>
          <view class="sum-item">
            <text class="sum-label">客户</text>
            <text class="sum-value">{{ deliveryOrder.customer?.name || '-' }}</text>
          </view>
          <view class="sum-item">
            <text class="sum-label">车辆</text>
            <text class="sum-value">
              {{ deliveryOrder.vehicle ? `${deliveryOrder.vehicle.brand} ${deliveryOrder.vehicle.series}` : '-' }}
            </text>
          </view>
        </view>

        <!-- 交车检查项 -->
        <view class="check-section">
          <text class="check-title">交车前检查</text>
          <view class="check-item">
            <text class="check-label">保险已办理</text>
            <u-switch v-model="deliveryForm.insuranceDone" activeColor="#409EFF" />
          </view>
          <view class="check-item">
            <text class="check-label">上牌已完成</text>
            <u-switch v-model="deliveryForm.licenseDone" activeColor="#409EFF" />
          </view>
          <view class="check-item">
            <text class="check-label">精品/附件已安装</text>
            <u-switch v-model="deliveryForm.accessoriesInstalled" activeColor="#409EFF" />
          </view>
        </view>

        <!-- 交车日期 -->
        <view class="form-group">
          <text class="form-label">交车日期</text>
          <input v-model="deliveryForm.deliveryDate" class="form-input" placeholder="YYYY-MM-DD（默认今天）" />
        </view>

        <!-- 提醒 -->
        <view class="reminder">
          <u-icon name="info-circle" size="16" color="#E6A23C" />
          <text class="reminder-text">确认交车后，车辆状态将变更为「已售」</text>
        </view>

        <view class="delivery-btn" @click="confirmDelivery">确认交车</view>
      </view>
    </u-popup>

    <!-- 详细查看已交车 -->
    <u-popup :show="completedShow" mode="bottom" round @close="completedShow = false">
      <view class="detail-popup" v-if="completedOrder">
        <text class="section-title">交车详情</text>
        <view class="detail-body">
          <view class="detail-item">
            <text class="d-label">订单号</text>
            <text class="d-value">{{ completedOrder.orderNo }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">客户</text>
            <text class="d-value">{{ completedOrder.customer?.name || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">车辆</text>
            <text class="d-value">
              {{ completedOrder.vehicle ? `${completedOrder.vehicle.brand} ${completedOrder.vehicle.series} ${completedOrder.vehicle.model || ''}` : '-' }}
            </text>
          </view>
          <view class="detail-item">
            <text class="d-label">VIN码</text>
            <text class="d-value">{{ completedOrder.vehicle?.vin || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">总金额</text>
            <text class="d-value price">¥{{ formatNum(completedOrder.totalAmount) }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">交车日期</text>
            <text class="d-value">{{ formatDate(completedOrder.deliveryDate) || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">创建时间</text>
            <text class="d-value">{{ formatTime(completedOrder.createdAt) }}</text>
          </view>
        </view>
      </view>
    </u-popup>
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

const deliveryTabs = [
  { label: '待交车', value: 'pending' },
  { label: '已交车', value: 'completed' },
];

const currentTab = ref('pending');
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
  fetchList();
}

function fetchList() {
  loading.value = true;
  let url: string;
  if (currentTab.value === 'pending') {
    url = `/sales/orders?status=signed&page=${page}&pageSize=20`;
  } else {
    url = `/sales/orders?status=delivered&page=${page}&pageSize=20`;
  }
  apiFetch<{ list: any[]; total: number }>({ url })
    .then((data) => {
      const arr = data?.list || (Array.isArray(data) ? data : []);
      if (page === 1) {
        list.value = arr;
      } else {
        list.value = list.value.concat(arr);
      }
      if (arr.length < 20) {
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
  fetchList();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchList();
}

// --- 执行交车 ---
const deliveryShow = ref(false);
const deliveryOrder = ref<any>(null);
const deliveryForm = ref({
  insuranceDone: false,
  licenseDone: false,
  accessoriesInstalled: false,
  deliveryDate: '',
});

function openDelivery(order: any) {
  deliveryOrder.value = order;
  deliveryForm.value = {
    insuranceDone: false,
    licenseDone: false,
    accessoriesInstalled: false,
    deliveryDate: new Date().toISOString().split('T')[0],
  };
  deliveryShow.value = true;
}

async function confirmDelivery() {
  if (!deliveryOrder.value) return;
  const payload = {
    insuranceDone: deliveryForm.value.insuranceDone,
    licenseDone: deliveryForm.value.licenseDone,
    accessoriesInstalled: deliveryForm.value.accessoriesInstalled,
    deliveryDate: deliveryForm.value.deliveryDate || new Date().toISOString(),
  };
  try {
    await apiFetch({
      url: `/sales/orders/${deliveryOrder.value.id}/delivery`,
      method: 'PUT',
      data: payload,
    });
    uni.showToast({ title: '交车成功', icon: 'success' });
    deliveryShow.value = false;
    // 刷新列表
    page = 1;
    noMore.value = false;
    list.value = [];
    fetchList();
  } catch {
    // 错误已在 apiFetch 中处理
  }
}

// --- 查看已交车详情 ---
const completedShow = ref(false);
const completedOrder = ref<any>(null);

async function viewCompleted(order: any) {
  try {
    const detail = await apiFetch<any>({ url: `/sales/orders/${order.id}` });
    completedOrder.value = detail;
  } catch {
    completedOrder.value = order;
  }
  completedShow.value = true;
}

function formatTime(time: string) {
  if (!time) return '';
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(time: string) {
  if (!time) return '';
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatNum(val: any): string {
  if (val == null || val === 0) return '0';
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

onMounted(() => {
  fetchList();
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
.delivery-list {
  flex: 1;
  padding: 12px 16px;
}
.delivery-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.card-no {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}
.card-status {
  font-size: 13px;
  font-weight: 500;
}
.card-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.info-row {
  display: flex;
  align-items: center;
}
.info-label {
  font-size: 13px;
  color: #909399;
  width: 60px;
}
.info-value {
  font-size: 13px;
  color: #303133;
}
.info-value.price {
  color: #E6A23C;
  font-weight: 500;
}
.card-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid #f5f5f5;
}
.action-btn {
  font-size: 13px;
  padding: 6px 20px;
  border-radius: 16px;
}
.action-btn.primary {
  background: #409EFF;
  color: #fff;
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

/* 交车弹窗 */
.delivery-popup {
  padding: 20px 16px 30px;
  max-height: 75vh;
  overflow-y: auto;
}
.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  display: block;
  margin-bottom: 16px;
}
.delivery-summary {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
}
.sum-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}
.sum-label {
  font-size: 14px;
  color: #909399;
}
.sum-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

/* 检查项 */
.check-section {
  margin-bottom: 20px;
}
.check-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  display: block;
  margin-bottom: 12px;
}
.check-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}
.check-label {
  font-size: 14px;
  color: #606266;
}

/* 日期 */
.form-group {
  margin-bottom: 16px;
}
.form-label {
  font-size: 14px;
  color: #606266;
  display: block;
  margin-bottom: 6px;
}
.form-input {
  width: 100%;
  height: 40px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  color: #303133;
  box-sizing: border-box;
}

/* 提醒 */
.reminder {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FDF6EC;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 20px;
}
.reminder-text {
  font-size: 13px;
  color: #E6A23C;
}

/* 确认按钮 */
.delivery-btn {
  height: 44px;
  background: #67C23A;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

/* 详情弹窗 */
.detail-popup {
  padding: 20px 16px 30px;
  max-height: 60vh;
  overflow-y: auto;
}
.detail-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.d-label {
  font-size: 14px;
  color: #909399;
}
.d-value {
  font-size: 14px;
  color: #303133;
}
.d-value.price {
  color: #E6A23C;
  font-weight: 500;
}
</style>
