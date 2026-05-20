<template>
  <view class="page">
    <!-- 搜索框 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">&#128269;</text>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索卡号/姓名/手机号"
          @confirm="onSearch"
        />
      </view>
    </view>

    <scroll-view
      scroll-y
      class="card-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="cards.length === 0 && !loading" class="empty-hint">
        <text>暂无会员卡</text>
      </view>

      <view
        v-for="card in cards"
        :key="card.id"
        class="member-card"
        :class="'level-' + (card.level || 'normal')"
      >
        <view class="card-header">
          <text class="card-no">{{ card.cardNo || card.id }}</text>
          <text class="card-level">{{ card.level || '普通卡' }}</text>
        </view>
        <view class="card-body">
          <view class="card-row">
            <text class="label">持卡人</text>
            <text class="value">{{ card.holderName || '--' }}</text>
          </view>
          <view class="card-row">
            <text class="label">手机号</text>
            <text class="value">{{ card.phone || '--' }}</text>
          </view>
          <view class="card-row">
            <text class="label">余额</text>
            <text class="value balance">&yen;{{ card.balance || 0 }}</text>
          </view>
          <view class="card-row">
            <text class="label">折扣率</text>
            <text class="value discount">{{ card.discount ? (card.discount * 10).toFixed(1) + '折' : '无折扣' }}</text>
          </view>
        </view>
        <view class="card-footer" v-if="card.expireDate">
          <text>有效期至：{{ card.expireDate }}</text>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && cards.length > 0" class="loading-more">
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
const cards = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

function fetchCards() {
  loading.value = true;
  let url = `/beauty/cards?page=${page}&pageSize=20`;
  if (keyword.value) {
    url += `&keyword=${keyword.value}`;
  }
  apiFetch<any[]>({ url })
    .then((data) => {
      const list = data || [];
      if (page === 1) {
        cards.value = list;
      } else {
        cards.value = cards.value.concat(list);
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

function onSearch() {
  page = 1;
  noMore.value = false;
  cards.value = [];
  fetchCards();
}

function loadMore() {
  if (loadingMore.value || noMore.value) return;
  loadingMore.value = true;
  page++;
  fetchCards();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchCards();
}

onMounted(() => {
  fetchCards();
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
  background: #fff;
  padding: 10px 16px;
  border-bottom: 1px solid #eee;
}
.search-input-wrap {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 0 12px;
  height: 36px;
}
.search-icon {
  font-size: 14px;
  margin-right: 6px;
  color: #C0C4CC;
}
.search-input {
  flex: 1;
  font-size: 14px;
  color: #303133;
}
.card-list {
  flex: 1;
  padding: 12px 16px;
}
.member-card {
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  background: linear-gradient(135deg, #fff 0%, #f5f7fa 100%);
}
.member-card.level-金卡 {
  background: linear-gradient(135deg, #FFF7E6 0%, #FFFBE6 100%);
  border: 1px solid #FFD666;
}
.member-card.level-钻石卡 {
  background: linear-gradient(135deg, #F0F5FF 0%, #E6F7FF 100%);
  border: 1px solid #91D5FF;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.card-no {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}
.card-level {
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  background: #409EFF;
  padding: 2px 10px;
  border-radius: 10px;
}
.card-body {
  margin-bottom: 8px;
}
.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}
.card-row .label {
  font-size: 13px;
  color: #909399;
}
.card-row .value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}
.card-row .balance {
  color: #F56C6C;
  font-weight: bold;
}
.card-row .discount {
  color: #E6A23C;
}
.card-footer {
  font-size: 12px;
  color: #C0C4CC;
  border-top: 1px dashed #eee;
  padding-top: 8px;
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
