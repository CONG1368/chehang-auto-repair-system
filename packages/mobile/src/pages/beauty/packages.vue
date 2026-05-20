<template>
  <view class="page">
    <scroll-view
      scroll-y
      class="package-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="packages.length === 0 && !loading" class="empty-hint">
        <text>暂无套餐</text>
      </view>

      <view
        v-for="item in packages"
        :key="item.id"
        class="package-card"
      >
        <view class="package-header">
          <text class="package-name">{{ item.name }}</text>
          <view class="package-tag" v-if="item.tag">
            <text>{{ item.tag }}</text>
          </view>
        </view>
        <view class="package-items">
          <text>包含 {{ item.itemCount || 0 }} 项服务</text>
        </view>
        <view class="package-desc" v-if="item.description">
          <text>{{ item.description }}</text>
        </view>
        <view class="package-price">
          <text class="price-sale">&yen;{{ item.salePrice || item.price }}</text>
          <text class="price-original" v-if="item.originalPrice && item.originalPrice > item.salePrice">
            &yen;{{ item.originalPrice }}
          </text>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && packages.length > 0" class="loading-more">
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

const packages = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

function fetchPackages() {
  loading.value = true;
  const url = `/beauty/packages?page=${page}&pageSize=20`;
  apiFetch<any[]>({ url })
    .then((data) => {
      const list = data || [];
      if (page === 1) {
        packages.value = list;
      } else {
        packages.value = packages.value.concat(list);
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
  fetchPackages();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchPackages();
}

onMounted(() => {
  fetchPackages();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}
.package-list {
  flex: 1;
  padding: 12px 16px;
}
.package-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.package-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.package-name {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
  flex: 1;
}
.package-tag {
  background: #E6F7FF;
  border: 1px solid #91D5FF;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: #1890FF;
}
.package-items {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}
.package-desc {
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
  margin-bottom: 10px;
}
.package-price {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.price-sale {
  font-size: 18px;
  font-weight: bold;
  color: #F56C6C;
}
.price-original {
  font-size: 13px;
  color: #C0C4CC;
  text-decoration: line-through;
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
