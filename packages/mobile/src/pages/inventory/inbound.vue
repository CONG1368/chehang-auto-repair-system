<template>
  <view class="page">
    <!-- 模式切换 -->
    <view class="header-bar">
      <view class="mode-tabs">
        <view
          class="mode-tab"
          :class="{ active: mode === 'list' }"
          @click="switchMode('list')"
        >
          <text>入库记录</text>
        </view>
        <view
          class="mode-tab"
          :class="{ active: mode === 'create' }"
          @click="switchMode('create')"
        >
          <text>新建入库</text>
        </view>
      </view>
    </view>

    <!-- ========== 列表视图 ========== -->
    <template v-if="mode === 'list'">
      <scroll-view
        scroll-y
        class="record-list"
        @scrolltolower="loadMore"
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
      >
        <view v-if="records.length === 0 && !loading" class="empty-hint">
          <text>暂无入库记录</text>
        </view>

        <view
          v-for="item in records"
          :key="item.id"
          class="record-card"
          @click="viewDetail(item)"
        >
          <view class="record-header">
            <text class="record-type" :class="item.type === 'in' ? 'type-in' : 'type-out'">
              {{ item.type === 'in' ? '入库' : '出库' }}
            </text>
            <text class="record-time">{{ formatTime(item.createdAt) }}</text>
          </view>
          <view class="record-body">
            <text class="record-part">{{ item.part?.name || '未知配件' }}</text>
            <text class="record-qty" :class="item.type === 'in' ? 'qty-in' : 'qty-out'">
              {{ item.type === 'in' ? '+' : '-' }}{{ item.quantity }}
            </text>
          </view>
          <view class="record-footer" v-if="item.remark || item.operator">
            <text class="record-remark" v-if="item.remark">{{ item.remark }}</text>
            <text class="record-operator" v-if="item.operator">操作人：{{ item.operator }}</text>
          </view>
          <view class="record-flow">
            <text class="flow-text">
              库存变化：{{ item.beforeQty }} → {{ item.afterQty }}
            </text>
          </view>
        </view>

        <view v-if="loadingMore" class="loading-more">
          <u-loading-icon />
          <text>加载中...</text>
        </view>
        <view v-if="noMore && records.length > 0" class="loading-more">
          <text>没有更多了</text>
        </view>
      </scroll-view>
    </template>

    <!-- ========== 新建入库视图 ========== -->
    <template v-if="mode === 'create'">
      <scroll-view scroll-y class="create-form">
        <view class="form-section">
          <text class="section-title">选择配件</text>
          <view class="search-inline">
            <u-search
              v-model="partKeyword"
              placeholder="搜索配件编码或名称"
              @search="searchParts"
              :show-action="false"
            />
          </view>
          <!-- 配件搜索结果 -->
          <view v-if="partResults.length > 0" class="part-results">
            <view
              v-for="p in partResults"
              :key="p.id"
              class="part-result-item"
              :class="{ selected: selectedPart?.id === p.id }"
              @click="selectPart(p)"
            >
              <view class="pr-info">
                <text class="pr-name">{{ p.name }}</text>
                <text class="pr-code">{{ p.code }}</text>
              </view>
              <view class="pr-stock">
                <text>{{ p.stock?.quantity ?? 0 }} 个</text>
              </view>
              <view v-if="selectedPart?.id === p.id" class="pr-check">
                <text>✓</text>
              </view>
            </view>
          </view>
          <view v-if="selectedPart" class="selected-part">
            <text class="sp-label">已选配件：</text>
            <text class="sp-name">{{ selectedPart.name }} ({{ selectedPart.code }})</text>
            <text class="sp-supplier" v-if="selectedPart.supplier">
              供应商：{{ selectedPart.supplier.name }}
            </text>
          </view>
        </view>

        <view class="form-section">
          <text class="section-title">入库信息</text>
          <view class="form-item">
            <text class="form-label">入库数量</text>
            <input
              class="form-input"
              v-model="inboundQty"
              type="number"
              placeholder="请输入入库数量"
            />
          </view>
          <view class="form-item">
            <text class="form-label">备注</text>
            <input
              class="form-input"
              v-model="inboundRemark"
              placeholder="选填备注信息"
            />
          </view>
        </view>

        <view class="submit-area">
          <view class="btn-submit" @click="submitInbound">
            <text>确认入库</text>
          </view>
        </view>
      </scroll-view>
    </template>
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

// ============ 模式切换 ============
const mode = ref<'list' | 'create'>('list');

function switchMode(m: 'list' | 'create') {
  mode.value = m;
  if (m === 'list') {
    fetchRecords();
  }
}

// ============ 入库记录列表 ============
const records = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

function fetchRecords() {
  loading.value = true;
  const url = `/inventory/stock-records?page=${page}&pageSize=20`;
  apiFetch<any>({ url })
    .then((data) => {
      const list = extractList(data);
      if (page === 1) {
        records.value = list;
      } else {
        records.value = records.value.concat(list);
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
  fetchRecords();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchRecords();
}

function viewDetail(item: any) {
  // 展示入库记录详情
  const info = [
    `配件：${item.part?.name || '未知'}`,
    `类型：${item.type === 'in' ? '入库' : '出库'}`,
    `数量：${item.quantity}`,
    `库存变化：${item.beforeQty} → ${item.afterQty}`,
    `备注：${item.remark || '无'}`,
    `操作人：${item.operator || '未知'}`,
    `时间：${formatTime(item.createdAt)}`,
  ].join('\n');
  uni.showModal({ title: '记录详情', content: info, showCancel: false });
}

// ============ 新建入库 ============
const partKeyword = ref('');
const partResults = ref<any[]>([]);
const selectedPart = ref<any>(null);
const inboundQty = ref('');
const inboundRemark = ref('');

function searchParts() {
  if (!partKeyword.value.trim()) {
    partResults.value = [];
    return;
  }
  const url = `/inventory?keyword=${encodeURIComponent(partKeyword.value.trim())}&page=1&pageSize=20`;
  apiFetch<any>({ url })
    .then((data) => {
      partResults.value = extractList(data);
    })
    .catch(() => {
      partResults.value = [];
    });
}

function selectPart(part: any) {
  selectedPart.value = part;
}

async function submitInbound() {
  if (!selectedPart.value) {
    uni.showToast({ title: '请先选择配件', icon: 'none' });
    return;
  }
  const qty = parseInt(inboundQty.value, 10);
  if (!qty || qty <= 0) {
    uni.showToast({ title: '请输入有效的入库数量', icon: 'none' });
    return;
  }

  try {
    await apiFetch({
      url: '/inventory/stock-in',
      method: 'POST',
      data: {
        partId: selectedPart.value.id,
        type: 'in',
        quantity: qty,
        remark: inboundRemark.value,
      },
    });
    uni.showToast({ title: '入库成功', icon: 'success' });
    // 重置表单
    selectedPart.value = null;
    inboundQty.value = '';
    inboundRemark.value = '';
    partKeyword.value = '';
    partResults.value = [];
  } catch {
    // 错误已在 apiFetch 中提示
  }
}

onMounted(() => {
  fetchRecords();
});
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

/* 模式切换 */
.header-bar {
  background: #fff;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}
.mode-tabs {
  display: flex;
  background: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
}
.mode-tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 14px;
  color: #606266;
  border-radius: 8px;
}
.mode-tab.active {
  background: #409EFF;
  color: #fff;
  font-weight: bold;
}

/* 记录列表 */
.record-list {
  flex: 1;
  padding: 12px 16px;
}

.record-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.record-type {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 4px;
  font-weight: bold;
}

.type-in {
  background: #f0f9ff;
  color: #67C23A;
}

.type-out {
  background: #fef0f0;
  color: #F56C6C;
}

.record-time {
  font-size: 12px;
  color: #C0C4CC;
}

.record-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.record-part {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}

.record-qty {
  font-size: 18px;
  font-weight: bold;
}

.qty-in {
  color: #67C23A;
}

.qty-out {
  color: #F56C6C;
}

.record-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-remark {
  font-size: 12px;
  color: #909399;
  flex: 1;
}

.record-operator {
  font-size: 12px;
  color: #C0C4CC;
}

.record-flow {
  margin-top: 6px;
}

.flow-text {
  font-size: 11px;
  color: #C0C4CC;
}

/* 新建入库表单 */
.create-form {
  flex: 1;
  padding: 16px;
}

.form-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
  display: block;
  margin-bottom: 12px;
}

.search-inline {
  margin-bottom: 12px;
}

/* 配件搜索结果 */
.part-results {
  margin-bottom: 12px;
}

.part-result-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #f5f5f5;
  border-radius: 6px;
}

.part-result-item.selected {
  background: #ecf5ff;
}

.pr-info {
  flex: 1;
}

.pr-name {
  font-size: 14px;
  color: #303133;
  display: block;
}

.pr-code {
  font-size: 12px;
  color: #909399;
}

.pr-stock {
  margin: 0 10px;
}

.pr-stock text {
  font-size: 13px;
  color: #409EFF;
}

.pr-check {
  color: #409EFF;
  font-weight: bold;
  font-size: 18px;
}

/* 已选配件 */
.selected-part {
  background: #f0f9ff;
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}

.sp-label {
  font-size: 13px;
  color: #606266;
}

.sp-name {
  font-size: 14px;
  color: #303133;
  font-weight: bold;
  display: block;
  margin-top: 4px;
}

.sp-supplier {
  font-size: 12px;
  color: #909399;
  display: block;
  margin-top: 2px;
}

/* 表单输入项 */
.form-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.form-label {
  font-size: 14px;
  color: #606266;
  width: 80px;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  font-size: 14px;
  color: #303133;
  text-align: right;
}

/* 提交按钮 */
.submit-area {
  padding: 20px 0 40px;
}

.btn-submit {
  background: #409EFF;
  border-radius: 10px;
  padding: 14px 0;
  text-align: center;
}

.btn-submit text {
  color: #fff;
  font-size: 16px;
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
