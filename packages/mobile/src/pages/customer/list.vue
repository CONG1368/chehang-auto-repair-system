<template>
  <view class="page">
    <view class="search-box">
      <u-search
        v-model="keyword"
        placeholder="搜索客户姓名或手机号"
        @search="onSearch"
        @clear="onClear"
        :show-action="false"
      />
    </view>

    <scroll-view
      scroll-y
      class="customer-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="customers.length === 0 && !loading" class="empty-hint">
        <text>暂无客户数据</text>
      </view>

      <view
        v-for="customer in customers"
        :key="customer.id"
        class="customer-card"
        @click="viewDetail(customer)"
      >
        <view class="customer-main">
          <view class="customer-avatar">
            <u-avatar :text="(customer.name || '?')[0]" size="44" fontSize="18" />
          </view>
          <view class="customer-info">
            <text class="customer-name">{{ customer.name }}</text>
            <text class="customer-phone">{{ customer.phone || '无电话' }}</text>
          </view>
          <view class="customer-extra">
            <text class="vehicle-count">车辆：{{ customer.vehicleCount || 0 }}辆</text>
            <text class="last-visit" v-if="customer.lastVisit">
              最近到店：{{ formatDate(customer.lastVisit) }}
            </text>
          </view>
        </view>
        <view class="arrow">
          <u-icon name="arrow-right" size="16" color="#C0C4CC" />
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && customers.length > 0" class="loading-more">
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
const customers = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

function onSearch() {
  page = 1;
  noMore.value = false;
  customers.value = [];
  fetchCustomers();
}

function onClear() {
  keyword.value = '';
  page = 1;
  noMore.value = false;
  customers.value = [];
  fetchCustomers();
}

function fetchCustomers() {
  loading.value = true;
  let url = `/customers?page=${page}&pageSize=20`;
  if (keyword.value.trim()) {
    url += `&keyword=${encodeURIComponent(keyword.value.trim())}`;
  }
  apiFetch<any[]>({ url })
    .then((data) => {
      const list = data || [];
      if (page === 1) {
        customers.value = list;
      } else {
        customers.value = customers.value.concat(list);
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
  fetchCustomers();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchCustomers();
}

function viewDetail(customer: any) {
  uni.navigateTo({ url: `/pages/customer/detail?id=${customer.id}` });
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

onMounted(() => {
  fetchCustomers();
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
.customer-list {
  flex: 1;
  padding: 12px 16px;
}
.customer-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.customer-main {
  flex: 1;
  display: flex;
  align-items: center;
}
.customer-avatar {
  margin-right: 12px;
}
.customer-info {
  flex: 1;
}
.customer-name {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
  display: block;
}
.customer-phone {
  font-size: 13px;
  color: #909399;
  margin-top: 2px;
  display: block;
}
.customer-extra {
  text-align: right;
}
.vehicle-count {
  font-size: 13px;
  color: #606266;
  display: block;
}
.last-visit {
  font-size: 12px;
  color: #C0C4CC;
  margin-top: 2px;
  display: block;
}
.arrow {
  margin-left: 8px;
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
