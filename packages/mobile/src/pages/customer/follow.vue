<template>
  <view class="page">
    <!-- 客户选择模式 -->
    <template v-if="!selectedCustomer">
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
        class="list-container"
        @scrolltolower="loadMoreCustomers"
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefreshCustomers"
      >
        <view v-if="customers.length === 0 && !loading" class="empty-hint">
          <text>暂无客户数据</text>
        </view>

        <view
          v-for="customer in customers"
          :key="customer.id"
          class="customer-card"
          @click="selectCustomer(customer)"
        >
          <view class="customer-main">
            <view class="customer-avatar">
              <u-avatar :text="(customer.name || '?')[0]" size="44" fontSize="18" />
            </view>
            <view class="customer-info">
              <text class="customer-name">{{ customer.name }}</text>
              <text class="customer-phone">{{ customer.phone || '无电话' }}</text>
            </view>
            <view class="arrow">
              <u-icon name="arrow-right" size="16" color="#C0C4CC" />
            </view>
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
    </template>

    <!-- 跟进记录模式 -->
    <template v-else>
      <view class="customer-bar">
        <view class="back-btn" @click="backToCustomerList">
          <u-icon name="arrow-left" size="18" color="#409EFF" />
          <text>返回客户列表</text>
        </view>
        <text class="current-customer">{{ selectedCustomer.name }}</text>
        <view class="add-btn" @click="showForm = true">
          <u-icon name="plus" size="20" color="#409EFF" />
        </view>
      </view>

      <scroll-view
        scroll-y
        class="list-container"
        @scrolltolower="loadMoreFollows"
        refresher-enabled
        :refresher-triggered="followRefreshing"
        @refresherrefresh="onRefreshFollows"
      >
        <view v-if="follows.length === 0 && !followLoading" class="empty-hint">
          <text>暂无跟进记录</text>
        </view>

        <view v-for="follow in follows" :key="follow.id" class="follow-card">
          <view class="follow-header">
            <view class="follow-type-badge" :style="{ background: followTypeColor(follow.type) }">
              <text>{{ followTypeText(follow.type) }}</text>
            </view>
            <text class="follow-time">{{ formatTime(follow.createdAt) }}</text>
          </view>
          <view class="follow-body">
            <text class="follow-content">{{ follow.content }}</text>
          </view>
          <view class="follow-footer" v-if="follow.user || follow.nextFollowAt">
            <text class="follow-operator" v-if="follow.user">
              跟进人：{{ follow.user.realName || '-' }}
            </text>
            <text class="follow-next" v-if="follow.nextFollowAt">
              下次跟进：{{ formatDate(follow.nextFollowAt) }}
            </text>
          </view>
        </view>

        <view v-if="followLoadingMore" class="loading-more">
          <u-loading-icon />
          <text>加载中...</text>
        </view>
        <view v-if="followNoMore && follows.length > 0" class="loading-more">
          <text>没有更多了</text>
        </view>
      </scroll-view>
    </template>

    <!-- 新增跟进表单弹窗 -->
    <view v-if="showForm" class="form-overlay" @click="closeForm">
      <view class="form-container" @click.stop>
        <view class="form-title">
          <text>新增跟进记录</text>
        </view>

        <view class="form-row">
          <text class="form-label">跟进方式</text>
          <view class="type-selector">
            <view
              v-for="opt in followTypes"
              :key="opt.value"
              class="type-option"
              :class="{ selected: formData.type === opt.value }"
              @click="formData.type = opt.value"
            >
              <text>{{ opt.label }}</text>
            </view>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">跟进内容</text>
          <textarea
            v-model="formData.content"
            class="form-textarea"
            placeholder="请输入跟进内容"
            :maxlength="500"
          />
        </view>

        <view class="form-row">
          <text class="form-label">下次跟进</text>
          <view class="date-picker" @click="openDatePicker">
            <text :class="{ placeholder: !formData.nextFollowAt }">
              {{ formData.nextFollowAt || '请选择日期（选填）' }}
            </text>
            <u-icon name="calendar" size="16" color="#909399" />
          </view>
        </view>

        <view class="form-actions">
          <view class="btn-cancel" @click="closeForm">
            <text>取消</text>
          </view>
          <view class="btn-submit" @click="submitFollow">
            <text>提交</text>
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

// 客户列表
const keyword = ref('');
const customers = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let customerPage = 1;

// 选中客户
const selectedCustomer = ref<any>(null);

// 跟进记录
const follows = ref<any[]>([]);
const followLoading = ref(false);
const followRefreshing = ref(false);
const followLoadingMore = ref(false);
const followNoMore = ref(false);
let followPage = 1;

// 表单
const showForm = ref(false);
const formData = ref({
  type: 'phone',
  content: '',
  nextFollowAt: '',
});

const followTypes = [
  { label: '电话', value: 'phone' },
  { label: '到店', value: 'visit' },
  { label: '微信', value: 'wechat' },
  { label: '短信', value: 'sms' },
  { label: '其他', value: 'other' },
];

// ============ 客户列表 ============

function onSearch() {
  customerPage = 1;
  noMore.value = false;
  customers.value = [];
  fetchCustomers();
}

function onClear() {
  keyword.value = '';
  customerPage = 1;
  noMore.value = false;
  customers.value = [];
  fetchCustomers();
}

function fetchCustomers() {
  loading.value = true;
  let url = `/customers?page=${customerPage}&pageSize=20`;
  if (keyword.value.trim()) {
    url += `&keyword=${encodeURIComponent(keyword.value.trim())}`;
  }
  apiFetch<any>({ url })
    .then((data: any) => {
      const list = data?.list || data || [];
      if (customerPage === 1) {
        customers.value = list;
      } else {
        customers.value = customers.value.concat(list);
      }
      if (list.length < 20) {
        noMore.value = true;
      }
    })
    .catch(() => {
      if (customerPage > 1) customerPage--;
    })
    .finally(() => {
      loading.value = false;
      refreshing.value = false;
      loadingMore.value = false;
    });
}

function loadMoreCustomers() {
  if (loadingMore.value || noMore.value) return;
  loadingMore.value = true;
  customerPage++;
  fetchCustomers();
}

async function onRefreshCustomers() {
  refreshing.value = true;
  customerPage = 1;
  noMore.value = false;
  await fetchCustomers();
}

function selectCustomer(customer: any) {
  selectedCustomer.value = customer;
  followPage = 1;
  followNoMore.value = false;
  follows.value = [];
  fetchFollows();
}

function backToCustomerList() {
  selectedCustomer.value = null;
}

// ============ 跟进记录 ============

function fetchFollows() {
  if (!selectedCustomer.value) return;
  followLoading.value = true;
  const url = `/customers/${selectedCustomer.value.id}/follows?page=${followPage}&pageSize=20`;
  apiFetch<any>({ url })
    .then((data: any) => {
      const list = data?.list || data || [];
      if (followPage === 1) {
        follows.value = list;
      } else {
        follows.value = follows.value.concat(list);
      }
      if (list.length < 20) {
        followNoMore.value = true;
      }
    })
    .catch(() => {
      if (followPage > 1) followPage--;
    })
    .finally(() => {
      followLoading.value = false;
      followRefreshing.value = false;
      followLoadingMore.value = false;
    });
}

function loadMoreFollows() {
  if (followLoadingMore.value || followNoMore.value) return;
  followLoadingMore.value = true;
  followPage++;
  fetchFollows();
}

async function onRefreshFollows() {
  followRefreshing.value = true;
  followPage = 1;
  followNoMore.value = false;
  await fetchFollows();
}

// ============ 表单 ============

function closeForm() {
  showForm.value = false;
  formData.value = { type: 'phone', content: '', nextFollowAt: '' };
}

function openDatePicker() {
  // uni-app 中弹出日期选择器（兼容各端）
  // @ts-ignore
  if (typeof uni.showDatePicker === 'function') {
    // H5 或其他
  }
  uni.showModal({
    title: '提示',
    content: '请在下方输入日期（格式：YYYY-MM-DD）',
    editable: true,
    placeholderText: '2026-05-20',
    success: (res) => {
      if (res.confirm && res.content) {
        formData.value.nextFollowAt = res.content;
      }
    },
  });
}

async function submitFollow() {
  if (!formData.value.content.trim()) {
    uni.showToast({ title: '请输入跟进内容', icon: 'none' });
    return;
  }
  if (!selectedCustomer.value) return;

  const body: any = {
    type: formData.value.type,
    content: formData.value.content.trim(),
  };
  if (formData.value.nextFollowAt) {
    body.nextFollowAt = formData.value.nextFollowAt;
  }

  try {
    await apiFetch({
      url: `/customers/${selectedCustomer.value.id}/follows`,
      method: 'POST',
      data: body,
    });
    uni.showToast({ title: '跟进记录已添加', icon: 'success' });
    closeForm();
    // 刷新跟进列表
    followPage = 1;
    followNoMore.value = false;
    follows.value = [];
    fetchFollows();
  } catch {
    // 错误已在 apiFetch 中提示
  }
}

// ============ 工具函数 ============

function followTypeText(type: string): string {
  const map: Record<string, string> = {
    phone: '电话',
    visit: '到店',
    wechat: '微信',
    sms: '短信',
    other: '其他',
  };
  return map[type] || type;
}

function followTypeColor(type: string): string {
  const colors: Record<string, string> = {
    phone: '#67C23A',
    visit: '#409EFF',
    wechat: '#E6A23C',
    sms: '#909399',
    other: '#909399',
  };
  return colors[type] || '#909399';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(time: string): string {
  if (!time) return '';
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

/* 搜索 */
.search-box {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}

/* 客户选中栏 */
.customer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #409EFF;
}
.current-customer {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}
.add-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 列表 */
.list-container {
  flex: 1;
  padding: 12px 16px;
}

/* 客户卡片 */
.customer-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.customer-main {
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
.arrow {
  margin-left: 8px;
}

/* 跟进卡片 */
.follow-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.follow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.follow-type-badge {
  padding: 2px 10px;
  border-radius: 10px;
}
.follow-type-badge text {
  font-size: 12px;
  color: #fff;
}
.follow-time {
  font-size: 12px;
  color: #C0C4CC;
}
.follow-body {
  margin-bottom: 8px;
}
.follow-content {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
}
.follow-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.follow-operator {
  font-size: 12px;
  color: #909399;
}
.follow-next {
  font-size: 12px;
  color: #E6A23C;
}

/* 表单弹窗 */
.form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}
.form-container {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 20px 16px 32px;
}
.form-title {
  text-align: center;
  margin-bottom: 20px;
}
.form-title text {
  font-size: 17px;
  font-weight: bold;
  color: #303133;
}
.form-row {
  margin-bottom: 16px;
}
.form-label {
  font-size: 14px;
  color: #606266;
  display: block;
  margin-bottom: 8px;
}
.type-selector {
  display: flex;
  gap: 10px;
}
.type-option {
  padding: 6px 16px;
  border-radius: 6px;
  background: #f5f5f5;
  font-size: 13px;
  color: #606266;
}
.type-option.selected {
  background: #409EFF;
  color: #fff;
}
.form-textarea {
  width: 100%;
  height: 100px;
  border: 1px solid #E4E7ED;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: #303133;
  box-sizing: border-box;
}
.date-picker {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #E4E7ED;
  border-radius: 8px;
  font-size: 14px;
  color: #303133;
}
.date-picker .placeholder {
  color: #C0C4CC;
}
.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
.btn-cancel {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  border-radius: 8px;
  background: #f5f5f5;
  font-size: 15px;
  color: #606266;
}
.btn-submit {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  border-radius: 8px;
  background: #409EFF;
  font-size: 15px;
  color: #fff;
}

/* 通用 */
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
