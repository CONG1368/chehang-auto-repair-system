<template>
  <view class="page">
    <!-- 搜索框 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <u-icon name="search" size="18" color="#909399" />
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索品牌 / 车型"
          confirm-type="search"
          @confirm="onSearch"
        />
        <u-icon
          v-if="keyword"
          name="close-circle-fill"
          size="18"
          color="#C0C4CC"
          @click="onClear"
        />
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

    <scroll-view
      scroll-y
      class="vehicle-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="vehicles.length === 0 && !loading" class="empty-hint">
        <text>暂无车辆</text>
      </view>

      <view
        v-for="v in vehicles"
        :key="v.id"
        class="vehicle-card"
        @click="showDetail(v)"
      >
        <view class="card-header">
          <text class="card-title">{{ v.brand }} {{ v.series }} {{ v.model }}</text>
          <text class="card-status" :style="{ color: stockColor(v.stockStatus) }">
            {{ stockText(v.stockStatus) }}
          </text>
        </view>
        <view class="card-info">
          <view class="info-row">
            <text class="info-label">颜色</text>
            <text class="info-value">{{ v.color || '-' }}</text>
            <text class="info-label" style="margin-left: 20px;">VIN</text>
            <text class="info-value">{{ (v.vin || '-').slice(-8) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">销售价</text>
            <text class="info-value price">¥{{ formatNum(v.salePrice) }}</text>
            <text class="info-label" style="margin-left: 20px;">库龄</text>
            <text class="info-value">{{ stockAge(v.createdAt) }}</text>
          </view>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && vehicles.length > 0" class="loading-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- 车辆详情弹窗 -->
    <u-popup :show="detailShow" mode="bottom" round @close="detailShow = false">
      <view class="detail-popup" v-if="currentVehicle">
        <view class="detail-header">
          <text class="detail-title">{{ currentVehicle.brand }} {{ currentVehicle.series }}</text>
          <text class="detail-model">{{ currentVehicle.model }}</text>
        </view>
        <view class="detail-body">
          <view class="detail-item">
            <text class="d-label">VIN 码</text>
            <text class="d-value">{{ currentVehicle.vin || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">颜色</text>
            <text class="d-value">{{ currentVehicle.color || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">年款</text>
            <text class="d-value">{{ currentVehicle.yearModel || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">配置</text>
            <text class="d-value">{{ currentVehicle.config || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">指导价</text>
            <text class="d-value price">¥{{ formatNum(currentVehicle.guidePrice) }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">销售价</text>
            <text class="d-value price">¥{{ formatNum(currentVehicle.salePrice) }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">最低价</text>
            <text class="d-value price">¥{{ formatNum(currentVehicle.minPrice) }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">库位</text>
            <text class="d-value">{{ currentVehicle.location || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">状态</text>
            <text class="d-value" :style="{ color: stockColor(currentVehicle.stockStatus) }">
              {{ stockText(currentVehicle.stockStatus) }}
            </text>
          </view>
          <view class="detail-item">
            <text class="d-label">入库时间</text>
            <text class="d-value">{{ formatTime(currentVehicle.createdAt) }}</text>
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

const statusTabs = [
  { label: '全部', value: '' },
  { label: '在库', value: 'in_stock' },
  { label: '已订', value: 'reserved' },
  { label: '已售', value: 'sold' },
];

const stockStatusMap: Record<string, string> = {
  in_stock: '在库',
  reserved: '已订',
  sold: '已售',
};

function stockText(status: string) {
  return stockStatusMap[status] || status;
}

function stockColor(status: string): string {
  const colors: Record<string, string> = {
    in_stock: '#67C23A',
    reserved: '#E6A23C',
    sold: '#909399',
  };
  return colors[status] || '#909399';
}

const keyword = ref('');
const currentStatus = ref('');
const vehicles = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

// 详情弹窗
const detailShow = ref(false);
const currentVehicle = ref<any>(null);

function onSearch() {
  page = 1;
  noMore.value = false;
  vehicles.value = [];
  fetchVehicles();
}

function onClear() {
  keyword.value = '';
  page = 1;
  noMore.value = false;
  vehicles.value = [];
  fetchVehicles();
}

function switchStatus(value: string) {
  currentStatus.value = value;
  page = 1;
  noMore.value = false;
  vehicles.value = [];
  fetchVehicles();
}

function fetchVehicles() {
  loading.value = true;
  let url = `/sales/vehicles?page=${page}&pageSize=20`;
  if (keyword.value) {
    url += `&brand=${encodeURIComponent(keyword.value)}`;
  }
  if (currentStatus.value) {
    url += `&stockStatus=${currentStatus.value}`;
  }
  apiFetch<{ list: any[]; total: number }>({ url })
    .then((data) => {
      const list = data?.list || (Array.isArray(data) ? data : []);
      if (page === 1) {
        vehicles.value = list;
      } else {
        vehicles.value = vehicles.value.concat(list);
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
  fetchVehicles();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchVehicles();
}

async function showDetail(vehicle: any) {
  // 先获取详情
  try {
    const detail = await apiFetch<any>({ url: `/sales/vehicles/${vehicle.id}` });
    currentVehicle.value = detail;
  } catch {
    currentVehicle.value = vehicle;
  }
  detailShow.value = true;
}

function formatTime(time: string) {
  if (!time) return '';
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatNum(val: any): string {
  if (val == null) return '0';
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function stockAge(createdAt: string): string {
  if (!createdAt) return '-';
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return '1天';
  if (days < 30) return `${days}天`;
  if (days < 365) return `${Math.floor(days / 30)}个月`;
  return `${Math.floor(days / 365)}年+`;
}

onMounted(() => {
  fetchVehicles();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}
.search-bar {
  padding: 10px 16px;
  background: #fff;
}
.search-input-wrap {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 8px 12px;
  gap: 8px;
}
.search-input {
  flex: 1;
  font-size: 14px;
  color: #303133;
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
.vehicle-list {
  flex: 1;
  padding: 12px 16px;
}
.vehicle-card {
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
.card-title {
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
}
.info-row {
  display: flex;
  align-items: center;
}
.info-label {
  font-size: 12px;
  color: #909399;
  width: 44px;
}
.info-value {
  font-size: 13px;
  color: #606266;
}
.info-value.price {
  color: #E6A23C;
  font-weight: 500;
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
.detail-popup {
  padding: 20px 16px 30px;
  max-height: 70vh;
  overflow-y: auto;
}
.detail-header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}
.detail-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}
.detail-model {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
  display: block;
}
.detail-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
