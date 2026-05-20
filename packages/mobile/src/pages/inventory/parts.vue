<template>
  <view class="page">
    <!-- 搜索框 -->
    <view class="search-box">
      <u-search
        v-model="keyword"
        placeholder="搜索配件名称或编码"
        @search="onSearch"
        @clear="onClear"
        :show-action="false"
      />
    </view>

    <!-- 分类筛选 Tab -->
    <scroll-view scroll-x class="category-tabs" v-if="categories.length > 0">
      <view class="tabs-inner">
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="tab-item"
          :class="{ active: currentCategory === cat.id }"
          @click="switchCategory(cat.id)"
        >
          <text>{{ cat.name }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 配件列表 -->
    <scroll-view
      scroll-y
      class="part-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="parts.length === 0 && !loading" class="empty-hint">
        <text>暂无配件数据</text>
      </view>

      <view
        v-for="item in parts"
        :key="item.id"
        class="part-card"
        @click="viewDetail(item)"
      >
        <view class="part-main">
          <view class="part-info">
            <text class="part-name">{{ item.name }}</text>
            <text class="part-code">编码：{{ item.code || '-' }}</text>
            <text class="part-brand" v-if="item.supplier">
              品牌/供应商：{{ item.supplier.name }}
            </text>
            <text class="part-spec" v-if="item.spec">
              规格：{{ item.spec }}
            </text>
          </view>
          <view class="part-right">
            <text class="part-price">￥{{ priceText(item.price) }}</text>
            <view
              class="stock-badge"
              :class="{ 'low-stock': isLowStock(item) }"
            >
              <text class="stock-num">{{ stockQty(item) }}</text>
              <text class="stock-label">库存</text>
            </view>
          </view>
        </view>
        <view class="part-footer" v-if="item.category">
          <text class="part-category">{{ item.category.name }}</text>
          <text class="part-position" v-if="item.shelfLocation">
            库位：{{ item.shelfLocation }}
          </text>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && parts.length > 0" class="loading-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- 配件详情弹窗 -->
    <view class="detail-mask" v-if="showDetail" @click="showDetail = false">
      <view class="detail-panel" @click.stop>
        <view class="detail-header">
          <text class="detail-name">{{ currentPart?.name }}</text>
          <text class="detail-close" @click="showDetail = false">×</text>
        </view>
        <view class="detail-body" v-if="currentPart">
          <view class="detail-row">
            <text class="label">配件编码</text>
            <text class="value">{{ currentPart.code }}</text>
          </view>
          <view class="detail-row">
            <text class="label">规格型号</text>
            <text class="value">{{ currentPart.spec || '-' }}</text>
          </view>
          <view class="detail-row">
            <text class="label">分类</text>
            <text class="value">{{ currentPart.category?.name || '-' }}</text>
          </view>
          <view class="detail-row">
            <text class="label">供应商</text>
            <text class="value">{{ currentPart.supplier?.name || '-' }}</text>
          </view>
          <view class="detail-row">
            <text class="label">销售价</text>
            <text class="value price">￥{{ priceText(currentPart.price) }}</text>
          </view>
          <view class="detail-row">
            <text class="label">成本价</text>
            <text class="value">￥{{ priceText(currentPart.cost) }}</text>
          </view>
          <view class="detail-row">
            <text class="label">当前库存</text>
            <text class="value">{{ stockQty(currentPart) }}</text>
          </view>
          <view class="detail-row">
            <text class="label">安全库存</text>
            <text class="value">{{ currentPart.safetyStock }}</text>
          </view>
          <view class="detail-row">
            <text class="label">最高库存</text>
            <text class="value">{{ currentPart.maxStock }}</text>
          </view>
          <view class="detail-row" v-if="currentPart.shelfLocation">
            <text class="label">库位</text>
            <text class="value">{{ currentPart.shelfLocation }}</text>
          </view>
          <view class="detail-row" v-if="currentPart.createdAt">
            <text class="label">创建时间</text>
            <text class="value">{{ formatTime(currentPart.createdAt) }}</text>
          </view>
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

/** 从分页结果中提取列表数组 */
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

function priceText(price: any): string {
  if (price === null || price === undefined) return '0.00';
  const n = Number(price);
  return isNaN(n) ? '0.00' : n.toFixed(2);
}

function stockQty(item: any): number {
  return item.stock?.quantity ?? 0;
}

function isLowStock(item: any): boolean {
  const qty = stockQty(item);
  const safety = item.safetyStock || 0;
  return qty <= safety;
}

// ============ 分类筛选 ============
const categories = ref<any[]>([]);
const currentCategory = ref<number | string>('');

function fetchCategories() {
  apiFetch<any[]>({ url: '/part-categories' })
    .then((data) => {
      categories.value = Array.isArray(data) ? data : (data?.list || data || []);
    })
    .catch(() => {});
}

function switchCategory(catId: number | string) {
  currentCategory.value = catId;
  page = 1;
  noMore.value = false;
  parts.value = [];
  fetchParts();
}

// ============ 配件列表 ============
const keyword = ref('');
const parts = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

function onSearch() {
  page = 1;
  noMore.value = false;
  parts.value = [];
  fetchParts();
}

function onClear() {
  keyword.value = '';
  page = 1;
  noMore.value = false;
  parts.value = [];
  fetchParts();
}

function fetchParts() {
  loading.value = true;
  let url = `/inventory?page=${page}&pageSize=20`;
  if (keyword.value.trim()) {
    url += `&keyword=${encodeURIComponent(keyword.value.trim())}`;
  }
  if (currentCategory.value) {
    url += `&categoryId=${currentCategory.value}`;
  }
  apiFetch<any>({ url })
    .then((data) => {
      const list = extractList(data);
      if (page === 1) {
        parts.value = list;
      } else {
        parts.value = parts.value.concat(list);
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
  fetchParts();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchParts();
}

// ============ 详情弹窗 ============
const showDetail = ref(false);
const currentPart = ref<any>(null);

function viewDetail(item: any) {
  currentPart.value = item;
  showDetail.value = true;
}

onMounted(() => {
  fetchCategories();
  fetchParts();
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

.category-tabs {
  background: #fff;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
}
.tabs-inner {
  display: flex;
  padding: 0 16px;
}
.tab-item {
  flex-shrink: 0;
  padding: 10px 14px;
  font-size: 13px;
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
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: #409EFF;
  border-radius: 2px;
}

.part-list {
  flex: 1;
  padding: 12px 16px;
}

.part-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.part-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.part-info {
  flex: 1;
  margin-right: 12px;
}

.part-name {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
  display: block;
  margin-bottom: 4px;
}

.part-code {
  font-size: 12px;
  color: #909399;
  display: block;
  margin-bottom: 2px;
}

.part-brand {
  font-size: 12px;
  color: #606266;
  display: block;
  margin-bottom: 2px;
}

.part-spec {
  font-size: 12px;
  color: #909399;
  display: block;
}

.part-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 80px;
}

.part-price {
  font-size: 16px;
  font-weight: bold;
  color: #F56C6C;
  margin-bottom: 6px;
}

.stock-badge {
  padding: 4px 12px;
  border-radius: 6px;
  background: #f0f9ff;
  text-align: center;
}

.stock-badge.low-stock {
  background: #fef0f0;
}

.stock-num {
  font-size: 18px;
  font-weight: bold;
  color: #409EFF;
  display: block;
  line-height: 1.2;
}

.low-stock .stock-num {
  color: #F56C6C;
}

.stock-label {
  font-size: 11px;
  color: #909399;
}

.part-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.part-category {
  font-size: 11px;
  color: #C0C4CC;
  background: #f0f2f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.part-position {
  font-size: 11px;
  color: #C0C4CC;
}

/* 详情弹窗 */
.detail-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.detail-panel {
  background: #fff;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-height: 70vh;
  overflow-y: auto;
  padding: 20px 16px 30px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-name {
  font-size: 17px;
  font-weight: bold;
  color: #303133;
}

.detail-close {
  font-size: 24px;
  color: #C0C4CC;
  padding: 0 8px;
}

.detail-body {}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.detail-row .label {
  font-size: 14px;
  color: #909399;
}

.detail-row .value {
  font-size: 14px;
  color: #303133;
}

.detail-row .value.price {
  color: #F56C6C;
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
