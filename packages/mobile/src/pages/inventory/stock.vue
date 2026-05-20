<template>
  <view class="page">
    <view class="search-box">
      <u-search
        v-model="keyword"
        placeholder="搜索配件编码或名称"
        @search="onSearch"
        @clear="onClear"
        :show-action="false"
      />
    </view>

    <scroll-view
      scroll-y
      class="stock-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="stockList.length === 0 && !loading" class="empty-hint">
        <text>暂无库存数据</text>
      </view>

      <view
        v-for="item in stockList"
        :key="item.id"
        class="stock-card"
      >
        <view class="stock-main">
          <view class="stock-info">
            <text class="stock-name">{{ item.name }}</text>
            <text class="stock-code">编码：{{ item.code || '-' }}</text>
            <text class="stock-spec">规格：{{ item.spec || '-' }}</text>
          </view>
          <view class="stock-qty" :class="{ 'low-stock': item.stockQty <= item.lowStockThreshold }">
            <text class="qty-number">{{ item.stockQty }}</text>
            <text class="qty-unit">{{ item.unit || '个' }}</text>
          </view>
        </view>
        <view class="stock-footer" v-if="item.price">
          <text class="stock-price">参考单价：{{ item.price.toFixed?.(2) || item.price }}</text>
        </view>
        <view v-if="item.stockQty <= item.lowStockThreshold" class="low-tag">
          <u-tag text="低库存" type="error" size="small" />
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && stockList.length > 0" class="loading-more">
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

const keyword = ref('');
const stockList = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

function onSearch() {
  page = 1;
  noMore.value = false;
  stockList.value = [];
  fetchStock();
}

function onClear() {
  keyword.value = '';
  page = 1;
  noMore.value = false;
  stockList.value = [];
  fetchStock();
}

function fetchStock() {
  loading.value = true;
  let url = `/inventory?page=${page}&pageSize=20`;
  if (keyword.value.trim()) {
    url += `&keyword=${encodeURIComponent(keyword.value.trim())}`;
  }
  apiFetch<any[]>({ url })
    .then((data) => {
      const list = data || [];
      if (page === 1) {
        stockList.value = list;
      } else {
        stockList.value = stockList.value.concat(list);
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
  fetchStock();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchStock();
}

onMounted(() => {
  fetchStock();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}
.search-box {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.stock-list {
  flex: 1;
  padding: 12px 16px;
}
.stock-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: relative;
}
.stock-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.stock-info {
  flex: 1;
}
.stock-name {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
  display: block;
  margin-bottom: 4px;
}
.stock-code {
  font-size: 12px;
  color: #909399;
  display: block;
  margin-bottom: 2px;
}
.stock-spec {
  font-size: 12px;
  color: #909399;
  display: block;
}
.stock-qty {
  text-align: center;
  padding: 4px 16px;
  border-radius: 8px;
  background: #f0f9ff;
  min-width: 70px;
}
.stock-qty.low-stock {
  background: #fef0f0;
}
.qty-number {
  font-size: 22px;
  font-weight: bold;
  color: #409EFF;
  display: block;
  line-height: 1.2;
}
.low-stock .qty-number {
  color: #F56C6C;
}
.qty-unit {
  font-size: 12px;
  color: #909399;
}
.stock-footer {
  margin-top: 8px;
}
.stock-price {
  font-size: 12px;
  color: #909399;
}
.low-tag {
  position: absolute;
  top: 8px;
  right: 8px;
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
