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

    <!-- 线索列表 -->
    <scroll-view
      scroll-y
      class="lead-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="leads.length === 0 && !loading" class="empty-hint">
        <text>暂无线索</text>
      </view>

      <view
        v-for="lead in leads"
        :key="lead.id"
        class="lead-card"
        @click="viewDetail(lead)"
      >
        <view class="card-header">
          <text class="card-customer">{{ lead.customer?.name || '未知客户' }}</text>
          <text class="card-status" :style="{ color: leadStatusColor(lead.status) }">
            {{ leadStatusText(lead.status) }}
          </text>
        </view>
        <view class="card-info">
          <text class="info-phone">{{ lead.customer?.phone || '-' }}</text>
          <text class="info-intent" v-if="lead.intentModel">
            意向：{{ lead.intentModel }}
          </text>
        </view>
        <view class="card-footer">
          <text class="info-source" v-if="lead.source">来源：{{ lead.source }}</text>
          <text class="info-time">{{ formatTime(lead.createdAt) }}</text>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && leads.length > 0" class="loading-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- 线索详情弹窗 -->
    <u-popup :show="detailShow" mode="bottom" round @close="detailShow = false">
      <view class="detail-popup" v-if="currentLead">
        <view class="detail-header">
          <text class="detail-name">{{ currentLead.customer?.name || '未知客户' }}</text>
          <text class="detail-status" :style="{ color: leadStatusColor(currentLead.status) }">
            {{ leadStatusText(currentLead.status) }}
          </text>
        </view>
        <view class="detail-body">
          <view class="detail-item">
            <text class="d-label">电话</text>
            <text class="d-value">{{ currentLead.customer?.phone || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">意向车型</text>
            <text class="d-value">{{ currentLead.intentModel || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">意向等级</text>
            <text class="d-value">{{ intentMap[currentLead.intent] || currentLead.intent || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">预算</text>
            <text class="d-value price">¥{{ formatNum(currentLead.budget) }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">线索来源</text>
            <text class="d-value">{{ currentLead.source || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">销售顾问</text>
            <text class="d-value">{{ currentLead.user?.realName || '-' }}</text>
          </view>
          <view class="detail-item">
            <text class="d-label">下次跟进</text>
            <text class="d-value">{{ currentLead.nextFollowAt ? formatTime(currentLead.nextFollowAt) : '-' }}</text>
          </view>
          <view class="detail-item" v-if="currentLead.remark">
            <text class="d-label">备注</text>
            <text class="d-value">{{ currentLead.remark }}</text>
          </view>
        </view>

        <!-- 跟进记录时间线 -->
        <view class="follow-section">
          <text class="section-title">跟进记录</text>
          <view v-if="followRecords.length === 0" class="empty-follows">
            <text>暂无跟进记录</text>
          </view>
          <view v-for="(rec, idx) in followRecords" :key="idx" class="follow-item">
            <view class="follow-dot" />
            <view class="follow-line" v-if="idx < followRecords.length - 1" />
            <view class="follow-content">
              <text class="follow-text">{{ rec.content }}</text>
              <text class="follow-user" v-if="rec.user?.realName">{{ rec.user.realName }}</text>
              <text class="follow-time">{{ formatTime(rec.createdAt) }}</text>
            </view>
          </view>
        </view>

        <!-- 新增跟进 -->
        <view class="add-follow">
          <text class="section-title">新增跟进</text>
          <textarea
            v-model="followContent"
            class="follow-textarea"
            placeholder="输入跟进内容..."
            :maxlength="500"
          />
          <view class="follow-actions">
            <text class="char-count">{{ followContent.length }}/500</text>
            <view class="follow-btn" @click="submitFollow">提交</view>
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
  { label: '新线索', value: 'new' },
  { label: '跟进中', value: 'following' },
  { label: '已成交', value: 'won' },
  { label: '已战败', value: 'lost' },
];

const leadStatusMap: Record<string, string> = {
  new: '新线索',
  following: '跟进中',
  won: '已成交',
  lost: '已战败',
};

const intentMap: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

function leadStatusText(status: string) {
  return leadStatusMap[status] || status;
}

function leadStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: '#409EFF',
    following: '#E6A23C',
    won: '#67C23A',
    lost: '#F56C6C',
  };
  return colors[status] || '#909399';
}

const currentStatus = ref('');
const leads = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

// 详情弹窗
const detailShow = ref(false);
const currentLead = ref<any>(null);
const followRecords = ref<any[]>([]);
const followContent = ref('');

function switchStatus(value: string) {
  currentStatus.value = value;
  page = 1;
  noMore.value = false;
  leads.value = [];
  fetchLeads();
}

function fetchLeads() {
  loading.value = true;
  let url = `/sales/leads?page=${page}&pageSize=20`;
  if (currentStatus.value) {
    url += `&status=${currentStatus.value}`;
  }
  apiFetch<{ list: any[]; total: number }>({ url })
    .then((data) => {
      const list = data?.list || (Array.isArray(data) ? data : []);
      if (page === 1) {
        leads.value = list;
      } else {
        leads.value = leads.value.concat(list);
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
  fetchLeads();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchLeads();
}

async function viewDetail(lead: any) {
  try {
    const detail = await apiFetch<any>({ url: `/sales/leads/${lead.id}` });
    currentLead.value = detail;
  } catch {
    currentLead.value = lead;
  }
  followContent.value = '';
  detailShow.value = true;
  // 加载跟进记录
  if (currentLead.value?.customerId) {
    loadFollowRecords(currentLead.value.customerId);
  } else {
    followRecords.value = [];
  }
}

async function loadFollowRecords(customerId: number) {
  try {
    const data = await apiFetch<any[]>({ url: `/customers/${customerId}/follows` });
    followRecords.value = Array.isArray(data) ? data : [];
  } catch {
    followRecords.value = [];
  }
}

async function submitFollow() {
  const content = followContent.value.trim();
  if (!content) {
    uni.showToast({ title: '请输入跟进内容', icon: 'none' });
    return;
  }
  if (!currentLead.value?.customerId) {
    uni.showToast({ title: '无法获取客户信息', icon: 'none' });
    return;
  }
  try {
    await apiFetch({
      url: `/customers/${currentLead.value.customerId}/follows`,
      method: 'POST',
      data: { type: 'sales', content },
    });
    uni.showToast({ title: '跟进记录已添加', icon: 'success' });
    followContent.value = '';
    loadFollowRecords(currentLead.value.customerId);
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
  fetchLeads();
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
.lead-list {
  flex: 1;
  padding: 12px 16px;
}
.lead-card {
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
.card-customer {
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
.info-phone {
  font-size: 13px;
  color: #606266;
}
.info-intent {
  font-size: 13px;
  color: #409EFF;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.info-source {
  font-size: 12px;
  color: #C0C4CC;
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

/* 详情弹窗 */
.detail-popup {
  padding: 20px 16px 30px;
  max-height: 75vh;
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
.detail-name {
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
  margin-bottom: 20px;
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

/* 跟进记录 */
.follow-section {
  margin-bottom: 20px;
}
.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  display: block;
  margin-bottom: 12px;
}
.empty-follows {
  text-align: center;
  padding: 20px 0;
  color: #C0C4CC;
  font-size: 13px;
}
.follow-item {
  position: relative;
  display: flex;
  padding-left: 24px;
  padding-bottom: 16px;
}
.follow-dot {
  position: absolute;
  left: 4px;
  top: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #409EFF;
}
.follow-line {
  position: absolute;
  left: 8px;
  top: 20px;
  bottom: 0;
  width: 1px;
  background: #E4E7ED;
}
.follow-content {
  flex: 1;
}
.follow-text {
  font-size: 14px;
  color: #303133;
  display: block;
  margin-bottom: 4px;
}
.follow-user {
  font-size: 12px;
  color: #409EFF;
  margin-right: 12px;
}
.follow-time {
  font-size: 12px;
  color: #C0C4CC;
}

/* 新增跟进 */
.add-follow {
  margin-top: 8px;
}
.follow-textarea {
  width: 100%;
  height: 80px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
  color: #303133;
  box-sizing: border-box;
}
.follow-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.char-count {
  font-size: 12px;
  color: #C0C4CC;
}
.follow-btn {
  background: #409EFF;
  color: #fff;
  font-size: 13px;
  padding: 6px 20px;
  border-radius: 16px;
}
</style>
