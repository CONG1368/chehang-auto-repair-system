<template>
  <view class="page">
    <!-- 分类 Tab -->
    <scroll-view scroll-x class="category-bar">
      <view class="category-list">
        <view
          v-for="cat in categories"
          :key="cat"
          class="category-item"
          :class="{ active: currentCategory === cat }"
          @click="switchCategory(cat)"
        >
          <text>{{ cat }}</text>
        </view>
      </view>
    </scroll-view>

    <scroll-view
      scroll-y
      class="service-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="services.length === 0 && !loading" class="empty-hint">
        <text>暂无服务项目</text>
      </view>

      <view
        v-for="item in services"
        :key="item.id"
        class="service-card"
      >
        <view class="service-header">
          <text class="service-name">{{ item.name }}</text>
          <text class="service-price">&yen;{{ item.price }}</text>
        </view>
        <view class="service-info">
          <text class="service-duration">时长：{{ item.duration || '--' }}分钟</text>
          <text class="service-category">{{ item.category || '--' }}</text>
        </view>
        <view class="service-desc" v-if="item.description">
          <text>{{ item.description }}</text>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && services.length > 0" class="loading-more">
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

const categories = ref<string[]>(['全部', '洗车', '美容', '保养', '改装']);
const currentCategory = ref('全部');
const services = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

function switchCategory(cat: string) {
  currentCategory.value = cat;
  page = 1;
  noMore.value = false;
  services.value = [];
  fetchServices();
}

function fetchServices() {
  loading.value = true;
  let url = `/beauty/services?page=${page}&pageSize=20`;
  if (currentCategory.value !== '全部') {
    url += `&category=${currentCategory.value}`;
  }
  apiFetch<any[]>({ url })
    .then((data) => {
      const list = data || [];
      if (page === 1) {
        services.value = list;
      } else {
        services.value = services.value.concat(list);
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
  fetchServices();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchServices();
}

onMounted(() => {
  fetchServices();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}
.category-bar {
  background: #fff;
  white-space: nowrap;
  border-bottom: 1px solid #eee;
}
.category-list {
  display: flex;
  padding: 0 12px;
}
.category-item {
  display: inline-block;
  padding: 12px 16px;
  font-size: 14px;
  color: #606266;
  position: relative;
}
.category-item.active {
  color: #409EFF;
  font-weight: bold;
}
.category-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: #409EFF;
  border-radius: 2px;
}
.service-list {
  flex: 1;
  padding: 12px 16px;
}
.service-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.service-name {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}
.service-price {
  font-size: 16px;
  font-weight: bold;
  color: #F56C6C;
}
.service-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.service-duration {
  font-size: 13px;
  color: #909399;
}
.service-category {
  font-size: 12px;
  color: #C0C4CC;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 8px;
}
.service-desc {
  font-size: 13px;
  color: #909399;
  margin-top: 6px;
  line-height: 1.5;
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
