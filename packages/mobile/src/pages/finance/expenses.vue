<template>
  <view class="page">
    <!-- 汇总卡片 -->
    <view class="summary-cards">
      <view class="summary-card card-blue">
        <text class="summary-label">总费用</text>
        <text class="summary-value">&yen;{{ formatPrice(summary.totalAmount) }}</text>
      </view>
      <view class="summary-card card-green">
        <text class="summary-label">总笔数</text>
        <text class="summary-value">{{ summary.totalCount || 0 }}</text>
        <text class="summary-unit">笔</text>
      </view>
    </view>

    <!-- 分类统计 -->
    <view v-if="categoryList.length > 0" class="section">
      <text class="section-title">费用分类统计</text>
      <view class="category-list">
        <view v-for="cat in categoryList" :key="cat.key" class="category-item">
          <view class="category-info">
            <view class="cat-dot" :style="{ background: categoryColor(cat.key) }" />
            <text class="cat-name">{{ categoryText(cat.key) }}</text>
          </view>
          <view class="category-amount-wrap">
            <text class="cat-amount">&yen;{{ formatPrice(cat.amount) }}</text>
            <view class="cat-bar">
              <view
                class="cat-bar-fill"
                :style="{
                  width: catBarWidth(cat.amount) + '%',
                  background: categoryColor(cat.key),
                }"
              />
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 费用列表 -->
    <scroll-view
      scroll-y
      class="list-scroll"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length === 0 && !loading" class="empty-hint">
        <text>暂无费用记录</text>
      </view>

      <view
        v-for="item in list"
        :key="item.id"
        class="expense-card"
        @longpress="onLongPress(item)"
        @click="editExpense(item)"
      >
        <view class="card-header">
          <view class="header-left">
            <text
              class="category-badge"
              :style="{ background: categoryColor(item.category) }"
            >{{ categoryText(item.category) }}</text>
            <text class="expense-description">{{ item.description || '--' }}</text>
          </view>
          <text class="expense-amount">&yen;{{ formatPrice(item.amount) }}</text>
        </view>
        <view class="card-footer">
          <text class="expense-date">{{ formatDate(item.createdAt) }}</text>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && list.length > 0" class="loading-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- 新建按钮 -->
    <view class="fab-btn" @click="openCreate">
      <text class="fab-icon">+</text>
    </view>

    <!-- 新增/编辑费用弹窗 -->
    <view v-if="showFormModal" class="modal-overlay" @click="showFormModal = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">{{ editingId ? '编辑费用' : '新增费用' }}</text>

        <!-- 费用类别 -->
        <view class="form-item">
          <text class="form-label">费用类别</text>
          <view class="type-selector">
            <view
              v-for="c in expenseCategories"
              :key="c.value"
              class="type-option"
              :class="{ selected: form.category === c.value }"
              @click="form.category = c.value"
            >
              <text>{{ c.label }}</text>
            </view>
          </view>
        </view>

        <!-- 金额 -->
        <view class="form-item">
          <text class="form-label">金额</text>
          <input
            v-model="form.amount"
            class="form-input"
            type="digit"
            placeholder="请输入费用金额"
          />
        </view>

        <!-- 描述 -->
        <view class="form-item">
          <text class="form-label">描述</text>
          <textarea
            v-model="form.description"
            class="form-textarea"
            placeholder="请输入费用描述"
            :maxlength="200"
          />
        </view>

        <!-- 删除按钮（仅编辑模式） -->
        <view v-if="editingId" class="delete-area">
          <text class="delete-btn" @click="handleDelete">删除此费用</text>
        </view>

        <view class="modal-actions">
          <u-button type="default" text="取消" @click="showFormModal = false" />
          <u-button
            type="primary"
            :text="editingId ? '保存修改' : '确认创建'"
            :loading="saving"
            @click="handleSave"
          />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
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
        if (res.statusCode === 401) {
          uni.reLaunch({ url: '/pages/login/login' });
          reject(new Error('未登录'));
          return;
        }
        if (res.data.code === 200) {
          resolve(res.data.data);
        } else {
          uni.showToast({ title: res.data.message || '请求失败', icon: 'none' });
          reject(res.data);
        }
      },
      fail: (err: any) => {
        uni.showToast({ title: '网络错误，请检查连接', icon: 'none' });
        reject(err);
      },
    });
  });
}

// 汇总
const summary = ref({
  totalAmount: 0,
  totalCount: 0,
  byCategory: {} as Record<string, number>,
});

// 分类列表（从 summary.byCategory 计算）
const categoryList = computed(() => {
  const byCategory = summary.value.byCategory || {};
  return Object.entries(byCategory)
    .map(([key, amount]) => ({ key, amount: Number(amount) }))
    .sort((a, b) => b.amount - a.amount);
});

const categoryMap: Record<string, string> = {
  rent: '房租',
  salary: '工资',
  utility: '水电',
  marketing: '市场',
  other: '其他',
};

const categoryColors: Record<string, string> = {
  rent: '#F56C6C',
  salary: '#409EFF',
  utility: '#67C23A',
  marketing: '#E6A23C',
  other: '#909399',
};

const expenseCategories = [
  { label: '房租', value: 'rent' },
  { label: '工资', value: 'salary' },
  { label: '水电', value: 'utility' },
  { label: '市场', value: 'marketing' },
  { label: '其他', value: 'other' },
];

function categoryText(key: string): string {
  return categoryMap[key] || key || '--';
}

function categoryColor(key: string): string {
  return categoryColors[key] || '#909399';
}

function catBarWidth(amount: number): number {
  const maxAmount = categoryList.value.length > 0 ? categoryList.value[0].amount : 1;
  if (maxAmount === 0) return 0;
  return Math.min(Math.round((amount / maxAmount) * 100), 100);
}

function formatPrice(val: any): string {
  return (Number(val) || 0).toFixed(2);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '--';
  return dateStr.substring(0, 16).replace('T', ' ');
}

// 列表
const list = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

async function fetchExpenses() {
  loading.value = true;
  const url = `/finance/expenses?page=${page}&pageSize=20`;

  try {
    const data: any = await apiFetch({ url });
    const resultList = data?.list || data || [];
    if (page === 1) {
      list.value = resultList;
    } else {
      list.value = list.value.concat(resultList);
    }
    if (!resultList || resultList.length < 20) {
      noMore.value = true;
    }
  } catch {
    if (page > 1) page--;
  } finally {
    loading.value = false;
    refreshing.value = false;
    loadingMore.value = false;
  }
}

async function fetchSummary() {
  try {
    const data: any = await apiFetch({ url: '/finance/expenses/summary' });
    if (data) {
      summary.value = data;
    }
  } catch {
    // 汇总加载失败不影响列表
  }
}

function loadMore() {
  if (loadingMore.value || noMore.value) return;
  loadingMore.value = true;
  page++;
  fetchExpenses();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchExpenses();
  await fetchSummary();
}

// 表单弹窗
const showFormModal = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = ref({
  category: 'other',
  amount: '',
  description: '',
});

function openCreate() {
  editingId.value = null;
  form.value = { category: 'other', amount: '', description: '' };
  showFormModal.value = true;
}

function editExpense(item: any) {
  editingId.value = item.id;
  form.value = {
    category: item.category || 'other',
    amount: String(item.amount || ''),
    description: item.description || '',
  };
  showFormModal.value = true;
}

async function handleSave() {
  if (!form.value.amount || Number(form.value.amount) <= 0) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' });
    return;
  }

  saving.value = true;
  try {
    if (editingId.value) {
      // 编辑
      await apiFetch({
        url: `/finance/expenses/${editingId.value}`,
        method: 'PUT',
        data: {
          category: form.value.category,
          amount: Number(form.value.amount),
          description: form.value.description,
        },
      });
      uni.showToast({ title: '修改成功', icon: 'success' });
    } else {
      // 新增
      await apiFetch({
        url: '/finance/expenses',
        method: 'POST',
        data: {
          category: form.value.category,
          amount: Number(form.value.amount),
          description: form.value.description,
          operatorId: 0,
        },
      });
      uni.showToast({ title: '创建成功', icon: 'success' });
    }
    showFormModal.value = false;
    page = 1;
    noMore.value = false;
    list.value = [];
    await fetchExpenses();
    await fetchSummary();
  } catch {
    // 错误已处理
  } finally {
    saving.value = false;
  }
}

// 长按删除
function onLongPress(item: any) {
  uni.showActionSheet({
    itemList: ['编辑', '删除'],
    success: (res) => {
      if (res.tapIndex === 0) {
        editExpense(item);
      } else if (res.tapIndex === 1) {
        confirmDelete(item);
      }
    },
  });
}

async function confirmDelete(item: any) {
  uni.showModal({
    title: '删除费用',
    content: `确定删除「${categoryText(item.category)}」费用 ¥${formatPrice(item.amount)} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await apiFetch({ url: `/finance/expenses/${item.id}`, method: 'DELETE' });
          uni.showToast({ title: '删除成功', icon: 'success' });
          page = 1;
          noMore.value = false;
          list.value = [];
          fetchExpenses();
          fetchSummary();
        } catch {
          // 错误已处理
        }
      }
    },
  });
}

async function handleDelete() {
  if (!editingId.value) return;
  try {
    await apiFetch({ url: `/finance/expenses/${editingId.value}`, method: 'DELETE' });
    uni.showToast({ title: '删除成功', icon: 'success' });
    showFormModal.value = false;
    page = 1;
    noMore.value = false;
    list.value = [];
    fetchExpenses();
    fetchSummary();
  } catch {
    // 错误已处理
  }
}

onMounted(() => {
  fetchExpenses();
  fetchSummary();
});
</script>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  position: relative;
}

/* 汇总卡片 */
.summary-cards {
  display: flex;
  padding: 16rpx 24rpx;
  gap: 16rpx;
}
.summary-card {
  flex: 1;
  border-radius: 16rpx;
  padding: 24rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}
.card-blue {
  background: linear-gradient(135deg, #409EFF, #66b1ff);
}
.card-green {
  background: linear-gradient(135deg, #67C23A, #85ce61);
}
.summary-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  display: block;
  margin-bottom: 8rpx;
}
.summary-value {
  font-size: 44rpx;
  font-weight: bold;
  color: #fff;
}
.summary-unit {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-left: 4rpx;
}

/* 分类统计 */
.section {
  background: #fff;
  margin: 16rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.category-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
}
.category-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.cat-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}
.cat-name {
  font-size: 28rpx;
  color: #333;
  min-width: 80rpx;
}
.category-amount-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}
.cat-amount {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}
.cat-bar {
  width: 100%;
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}
.cat-bar-fill {
  height: 100%;
  border-radius: 6rpx;
  transition: width 0.3s;
}

/* 列表 */
.list-scroll {
  flex: 1;
  padding: 12rpx 24rpx 120rpx;
}
.expense-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12rpx;
}
.header-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.category-badge {
  font-size: 22rpx;
  color: #fff;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
}
.expense-description {
  font-size: 28rpx;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.expense-amount {
  font-size: 30rpx;
  font-weight: bold;
  color: #F56C6C;
  flex-shrink: 0;
}
.card-footer {
  padding-top: 8rpx;
}
.expense-date {
  font-size: 24rpx;
  color: #999;
}

/* 空状态 */
.empty-hint {
  text-align: center;
  padding: 160rpx 0;
  color: #C0C4CC;
  font-size: 28rpx;
}

/* 加载更多 */
.loading-more {
  text-align: center;
  padding: 32rpx;
  color: #909399;
  font-size: 26rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12rpx;
}

/* 浮动按钮 */
.fab-btn {
  position: fixed;
  bottom: 60rpx;
  right: 40rpx;
  width: 100rpx;
  height: 100rpx;
  background: #409EFF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(64, 158, 255, 0.4);
  z-index: 100;
}
.fab-icon {
  font-size: 56rpx;
  color: #fff;
  line-height: 1;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.modal-content {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  width: 660rpx;
  max-height: 85vh;
  overflow-y: auto;
}
.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
  text-align: center;
  margin-bottom: 32rpx;
}
.form-item {
  margin-bottom: 24rpx;
}
.form-label {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}
.form-input {
  border: 2rpx solid #E4E7ED;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #333;
  background: #fff;
}
.form-textarea {
  border: 2rpx solid #E4E7ED;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #333;
  background: #fff;
  min-height: 150rpx;
  width: 100%;
  box-sizing: border-box;
}
.type-selector {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}
.type-option {
  padding: 12rpx 28rpx;
  border-radius: 24rpx;
  background: #f5f5f5;
  font-size: 26rpx;
  color: #666;
}
.type-option.selected {
  background: #ecf5ff;
  color: #409EFF;
  font-weight: 500;
}
.delete-area {
  text-align: center;
  margin-bottom: 24rpx;
  padding: 20rpx;
}
.delete-btn {
  font-size: 28rpx;
  color: #F56C6C;
  border: 2rpx solid #F56C6C;
  border-radius: 8rpx;
  padding: 16rpx 48rpx;
}
.modal-actions {
  display: flex;
  gap: 24rpx;
  justify-content: center;
}
</style>
