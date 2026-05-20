<template>
  <view class="page">
    <!-- 状态筛选 Tab -->
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

    <!-- 订单列表 -->
    <scroll-view
      scroll-y
      class="order-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="orders.length === 0 && !loading" class="empty-hint">
        <text>暂无订单</text>
      </view>

      <view
        v-for="order in orders"
        :key="order.id"
        class="order-card"
        @click="viewDetail(order)"
      >
        <view class="card-header">
          <text class="card-no">{{ order.orderNo || order.id }}</text>
          <text class="card-status" :style="{ color: orderStatusColor(order.status) }">
            {{ orderStatusText(order.status) }}
          </text>
        </view>
        <view class="card-info">
          <text class="info-customer">{{ order.customer?.name || '未知客户' }}</text>
          <text class="info-vehicle" v-if="order.vehicle">
            {{ order.vehicle.brand }} {{ order.vehicle.series }}
          </text>
        </view>
        <view class="card-footer">
          <text class="info-amount">¥{{ formatNum(order.totalAmount) }}</text>
          <text class="info-time">{{ formatTime(order.createdAt) }}</text>
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

    <!-- 新建按钮 -->
    <view class="fab-btn" @click="openCreate">
      <u-icon name="plus" size="24" color="#fff" />
    </view>

    <!-- 订单详情弹窗 -->
    <u-popup :show="detailShow" mode="bottom" round @close="detailShow = false">
      <view class="detail-popup" v-if="currentOrder">
        <view class="detail-header">
          <text class="detail-no">{{ currentOrder.orderNo }}</text>
          <text class="detail-status" :style="{ color: orderStatusColor(currentOrder.status) }">
            {{ orderStatusText(currentOrder.status) }}
          </text>
        </view>
        <view class="detail-body">
          <view class="detail-item">
            <text class="d-label">客户</text>
            <text class="d-value">{{ currentOrder.customer?.name || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">车辆</text>
            <text class="d-value">
              {{ currentOrder.vehicle ? `${currentOrder.vehicle.brand} ${currentOrder.vehicle.series} ${currentOrder.vehicle.model || ''}` : '-' }}
            </text>
          </view>
          <view class="detail-item">
            <text class="d-label">销售价</text>
            <text class="d-value price">¥{{ formatNum(currentOrder.salePrice) }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">优惠</text>
            <text class="d-value">¥{{ formatNum(currentOrder.discount) }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">购置税</text>
            <text class="d-value">¥{{ formatNum(currentOrder.tax) }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">保险</text>
            <text class="d-value">¥{{ formatNum(currentOrder.insurance) }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">精品</text>
            <text class="d-value">¥{{ formatNum(currentOrder.accessories) }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">服务费</text>
            <text class="d-value">¥{{ formatNum(currentOrder.serviceFee) }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">定金</text>
            <text class="d-value">¥{{ formatNum(currentOrder.deposit) }}</text>
          </view>
          <view class="detail-item total-row">
            <text class="d-label">总金额</text>
            <text class="d-value price" style="font-size: 16px; font-weight: bold;">¥{{ formatNum(currentOrder.totalAmount) }}</text>
          </view>
          <view class="detail-item" v-if="currentOrder.paymentMethod">
            <text class="d-label">支付方式</text>
            <text class="d-value">{{ currentOrder.paymentMethod }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">创建时间</text>
            <text class="d-value">{{ formatTime(currentOrder.createdAt) }}</text>
          </view>
        </view>
      </view>
    </u-popup>

    <!-- 新建订单弹窗 -->
    <u-popup :show="createShow" mode="bottom" round @close="createShow = false">
      <view class="create-popup">
        <text class="section-title">新建销售订单</text>

        <!-- 步骤：选择客户 -->
        <view class="form-group">
          <text class="form-label">选择客户</text>
          <view class="select-row" @click="openCustomerPicker">
            <text :style="{ color: form.customer ? '#303133' : '#C0C4CC' }">
              {{ form.customer ? form.customer.name : '点击选择客户' }}
            </text>
            <u-icon name="arrow-right" size="14" color="#C0C4CC" />
          </view>
        </view>

        <!-- 步骤：选择车辆 -->
        <view class="form-group">
          <text class="form-label">选择车辆</text>
          <view class="select-row" @click="openVehiclePicker">
            <text :style="{ color: form.vehicle ? '#303133' : '#C0C4CC' }">
              {{ form.vehicle ? `${form.vehicle.brand} ${form.vehicle.series} ${form.vehicle.model || ''}` : '点击选择车辆' }}
            </text>
            <u-icon name="arrow-right" size="14" color="#C0C4CC" />
          </view>
        </view>

        <!-- 价格明细 -->
        <view class="form-group">
          <text class="form-label">销售价</text>
          <input v-model="form.salePrice" type="digit" class="form-input" placeholder="车辆销售价" />
        </view>
        <view class="form-group">
          <text class="form-label">优惠金额</text>
          <input v-model="form.discount" type="digit" class="form-input" placeholder="0" />
        </view>
        <view class="form-group">
          <text class="form-label">购置税</text>
          <input v-model="form.tax" type="digit" class="form-input" placeholder="0" />
        </view>
        <view class="form-group">
          <text class="form-label">保险费</text>
          <input v-model="form.insurance" type="digit" class="form-input" placeholder="0" />
        </view>
        <view class="form-group">
          <text class="form-label">精品/附件</text>
          <input v-model="form.accessories" type="digit" class="form-input" placeholder="0" />
        </view>
        <view class="form-group">
          <text class="form-label">服务费</text>
          <input v-model="form.serviceFee" type="digit" class="form-input" placeholder="0" />
        </view>
        <view class="form-group">
          <text class="form-label">定金</text>
          <input v-model="form.deposit" type="digit" class="form-input" placeholder="0" />
        </view>
        <view class="form-group">
          <text class="form-label">支付方式</text>
          <view class="select-row" @click="paymentShow = true">
            <text :style="{ color: form.paymentMethod ? '#303133' : '#C0C4CC' }">
              {{ form.paymentMethod || '选择支付方式' }}
            </text>
            <u-icon name="arrow-right" size="14" color="#C0C4CC" />
          </view>
        </view>
        <view class="form-group">
          <text class="form-label">总计</text>
          <text class="form-total">¥{{ formatNum(calcTotal) }}</text>
        </view>

        <view class="create-btn" @click="submitOrder">提交订单</view>
      </view>
    </u-popup>

    <!-- 客户选择器弹窗 -->
    <u-popup :show="customerShow" mode="bottom" round @close="customerShow = false">
      <view class="picker-popup">
        <text class="section-title">选择客户</text>
        <view class="picker-search">
          <input v-model="customerSearch" class="picker-input" placeholder="搜索客户姓名/电话" />
          <view class="picker-search-btn" @click="searchCustomers">搜索</view>
        </view>
        <scroll-view scroll-y style="max-height: 300px;">
          <view v-if="customerList.length === 0" class="empty-hint">
            <text>暂无数据，尝试搜索</text>
          </view>
          <view
            v-for="c in customerList"
            :key="c.id"
            class="picker-item"
            @click="selectCustomer(c)"
          >
            <text class="picker-name">{{ c.name }}</text>
            <text class="picker-phone">{{ c.phone }}</text>
          </view>
        </scroll-view>
      </view>
    </u-popup>

    <!-- 车辆选择器弹窗 -->
    <u-popup :show="vehicleShow" mode="bottom" round @close="vehicleShow = false">
      <view class="picker-popup">
        <text class="section-title">选择车辆</text>
        <view class="picker-search">
          <input v-model="vehicleSearch" class="picker-input" placeholder="搜索品牌/车型" />
          <view class="picker-search-btn" @click="searchVehicles">搜索</view>
        </view>
        <scroll-view scroll-y style="max-height: 300px;">
          <view v-if="vehicleList.length === 0" class="empty-hint">
            <text>暂无可售车辆</text>
          </view>
          <view
            v-for="v in vehicleList"
            :key="v.id"
            class="picker-item"
            @click="selectVehicle(v)"
          >
            <view class="picker-main">
              <text class="picker-name">{{ v.brand }} {{ v.series }} {{ v.model || '' }}</text>
              <text class="picker-price">¥{{ formatNum(v.salePrice) }}</text>
            </view>
            <text class="picker-sub">{{ v.color || '' }} | {{ stockText(v.stockStatus) }}</text>
          </view>
        </scroll-view>
      </view>
    </u-popup>

    <!-- 支付方式选择 -->
    <u-popup :show="paymentShow" mode="bottom" round @close="paymentShow = false">
      <view class="picker-popup">
        <text class="section-title">选择支付方式</text>
        <view
          v-for="m in paymentMethods"
          :key="m"
          class="picker-item"
          @click="selectPayment(m)"
        >
          <text class="picker-name">{{ m }}</text>
        </view>
      </view>
    </u-popup>
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

const statusTabs = [
  { label: '全部', value: '' },
  { label: '报价中', value: 'pending' },
  { label: '已签约', value: 'signed' },
  { label: '已交车', value: 'delivered' },
  { label: '已取消', value: 'cancelled' },
];

const orderStatusMap: Record<string, string> = {
  pending: '报价中',
  signed: '已签约',
  delivered: '已交车',
  cancelled: '已取消',
};

const stockStatusMap: Record<string, string> = {
  in_stock: '在库',
  reserved: '已订',
  sold: '已售',
};

function orderStatusText(status: string) {
  return orderStatusMap[status] || status;
}

function orderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#E6A23C',
    signed: '#409EFF',
    delivered: '#67C23A',
    cancelled: '#F56C6C',
  };
  return colors[status] || '#909399';
}

function stockText(status: string) {
  return stockStatusMap[status] || status;
}

const paymentMethods = ['全款', '分期', '贷款', '现金', '银行卡', '微信', '支付宝'];

// --- 列表 ---
const currentStatus = ref('');
const orders = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

function switchStatus(value: string) {
  currentStatus.value = value;
  page = 1;
  noMore.value = false;
  orders.value = [];
  fetchOrders();
}

function fetchOrders() {
  loading.value = true;
  let url = `/sales/orders?page=${page}&pageSize=20`;
  if (currentStatus.value) {
    url += `&status=${currentStatus.value}`;
  }
  apiFetch<{ list: any[]; total: number }>({ url })
    .then((data) => {
      const list = data?.list || (Array.isArray(data) ? data : []);
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

// --- 详情 ---
const detailShow = ref(false);
const currentOrder = ref<any>(null);

async function viewDetail(order: any) {
  try {
    const detail = await apiFetch<any>({ url: `/sales/orders/${order.id}` });
    currentOrder.value = detail;
  } catch {
    currentOrder.value = order;
  }
  detailShow.value = true;
}

// --- 新建订单 ---
const createShow = ref(false);
const customerShow = ref(false);
const vehicleShow = ref(false);
const paymentShow = ref(false);

const form = ref<Record<string, any>>({
  customer: null,
  vehicle: null,
  salePrice: '',
  discount: '',
  tax: '',
  insurance: '',
  accessories: '',
  serviceFee: '',
  deposit: '',
  paymentMethod: '',
});

const customerSearch = ref('');
const customerList = ref<any[]>([]);
const vehicleSearch = ref('');
const vehicleList = ref<any[]>([]);

const calcTotal = computed(() => {
  const sale = Number(form.value.salePrice) || 0;
  const discount = Number(form.value.discount) || 0;
  const tax = Number(form.value.tax) || 0;
  const insurance = Number(form.value.insurance) || 0;
  const acc = Number(form.value.accessories) || 0;
  const fee = Number(form.value.serviceFee) || 0;
  return sale - discount + tax + insurance + acc + fee;
});

function openCreate() {
  // 重置表单
  form.value = {
    customer: null,
    vehicle: null,
    salePrice: '',
    discount: '',
    tax: '',
    insurance: '',
    accessories: '',
    serviceFee: '',
    deposit: '',
    paymentMethod: '',
  };
  createShow.value = true;
}

function openCustomerPicker() {
  customerSearch.value = '';
  customerList.value = [];
  customerShow.value = true;
}

async function searchCustomers() {
  try {
    const kw = customerSearch.value.trim();
    const url = kw ? `/customers?keyword=${encodeURIComponent(kw)}&page=1&pageSize=30` : `/customers?page=1&pageSize=30`;
    const data = await apiFetch<any>({ url });
    customerList.value = data?.list || (Array.isArray(data) ? data : []);
  } catch {
    customerList.value = [];
  }
}

function selectCustomer(c: any) {
  form.value.customer = c;
  customerShow.value = false;
}

function openVehiclePicker() {
  vehicleSearch.value = '';
  vehicleList.value = [];
  vehicleShow.value = true;
  searchVehicles();
}

async function searchVehicles() {
  try {
    const kw = vehicleSearch.value.trim();
    let url = `/sales/vehicles?page=1&pageSize=30&stockStatus=in_stock`;
    if (kw) {
      url += `&brand=${encodeURIComponent(kw)}`;
    }
    const data = await apiFetch<any>({ url });
    vehicleList.value = data?.list || (Array.isArray(data) ? data : []);
  } catch {
    vehicleList.value = [];
  }
}

function selectVehicle(v: any) {
  form.value.vehicle = v;
  // 自动填入销售价
  if (!form.value.salePrice && v.salePrice) {
    form.value.salePrice = String(v.salePrice);
  }
  vehicleShow.value = false;
}

function selectPayment(m: string) {
  form.value.paymentMethod = m;
  paymentShow.value = false;
}

async function submitOrder() {
  const f = form.value;
  if (!f.customer) { uni.showToast({ title: '请选择客户', icon: 'none' }); return; }
  if (!f.vehicle) { uni.showToast({ title: '请选择车辆', icon: 'none' }); return; }
  if (!f.salePrice) { uni.showToast({ title: '请输入销售价', icon: 'none' }); return; }

  const payload = {
    customerId: f.customer.id,
    vehicleId: f.vehicle.id,
    salePrice: Number(f.salePrice) || 0,
    discount: Number(f.discount) || 0,
    tax: Number(f.tax) || 0,
    insurance: Number(f.insurance) || 0,
    accessories: Number(f.accessories) || 0,
    serviceFee: Number(f.serviceFee) || 0,
    deposit: Number(f.deposit) || 0,
    totalAmount: calcTotal.value,
    paymentMethod: f.paymentMethod || undefined,
    salesId: authStore.userInfo?.id || 1,
  };

  try {
    await apiFetch({ url: '/sales/orders', method: 'POST', data: payload });
    uni.showToast({ title: '订单创建成功', icon: 'success' });
    createShow.value = false;
    page = 1;
    noMore.value = false;
    orders.value = [];
    fetchOrders();
  } catch {
    // 错误已在 apiFetch 中处理
  }
}

function formatTime(time: string) {
  if (!time) return '';
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatNum(val: any): string {
  if (val == null || val === 0) return '0';
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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
  position: relative;
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
.order-list {
  flex: 1;
  padding: 12px 16px;
}
.order-card {
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
  margin-bottom: 8px;
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
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.info-customer {
  font-size: 14px;
  color: #606266;
}
.info-vehicle {
  font-size: 13px;
  color: #409EFF;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.info-amount {
  font-size: 16px;
  font-weight: bold;
  color: #E6A23C;
}
.info-time {
  font-size: 12px;
  color: #C0C4CC;
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

/* FAB */
.fab-btn {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #409EFF;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
  z-index: 10;
}

/* 详情弹窗 */
.detail-popup {
  padding: 20px 16px 30px;
  max-height: 70vh;
  overflow-y: auto;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}
.detail-no {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}
.detail-status {
  font-size: 14px;
  font-weight: 500;
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
.detail-item.total-row {
  padding-top: 10px;
  border-top: 1px solid #eee;
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

/* 新建弹窗 */
.create-popup {
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
.form-group {
  margin-bottom: 14px;
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
.select-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
}
.form-total {
  font-size: 20px;
  font-weight: bold;
  color: #E6A23C;
}
.create-btn {
  margin-top: 20px;
  height: 44px;
  background: #409EFF;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

/* 选择器弹窗 */
.picker-popup {
  padding: 20px 16px 20px;
  max-height: 60vh;
  overflow-y: auto;
}
.picker-search {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.picker-input {
  flex: 1;
  height: 38px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  color: #303133;
}
.picker-search-btn {
  background: #409EFF;
  color: #fff;
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 6px;
}
.picker-item {
  padding: 14px 0;
  border-bottom: 1px solid #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.picker-item:active {
  background: #f5f5f5;
}
.picker-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.picker-name {
  font-size: 15px;
  color: #303133;
}
.picker-phone {
  font-size: 13px;
  color: #909399;
}
.picker-price {
  font-size: 14px;
  color: #E6A23C;
  font-weight: 500;
}
.picker-sub {
  font-size: 12px;
  color: #C0C4CC;
}
</style>
