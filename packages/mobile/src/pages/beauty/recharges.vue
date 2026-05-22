<template>
  <view class="page">
    <!-- 充值记录列表 -->
    <scroll-view
      scroll-y
      class="recharge-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="recharges.length === 0 && !loading" class="empty-hint">
        <text>暂无充值记录</text>
      </view>

      <view
        v-for="item in recharges"
        :key="item.id"
        class="recharge-card"
      >
        <view class="recharge-header">
          <text class="recharge-customer">{{ item.customer?.name || '未知客户' }}</text>
          <text class="recharge-amount">+¥{{ formatPrice(item.amount) }}</text>
        </view>
        <view class="recharge-info">
          <view class="info-row">
            <text class="label">支付方式</text>
            <text class="value">{{ paymentLabel(item.paymentMethod) }}</text>
          </view>
          <view class="info-row">
            <text class="label">充值时间</text>
            <text class="value">{{ formatTime(item.createdAt) }}</text>
          </view>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <text>加载中...</text>
      </view>
      <view v-if="noMore && recharges.length > 0" class="loading-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- 底部新建按钮 -->
    <view class="bottom-btn-area">
      <view class="create-btn" @click="showForm = true">
        <text>+ 新建充值</text>
      </view>
    </view>

    <!-- 新建充值弹窗 -->
    <view class="modal-mask" v-if="showForm" @click="showForm = false">
      <view class="modal-content" @click.stop>
        <view class="modal-title">
          <text>新建充值记录</text>
        </view>

        <view class="form-group">
          <text class="form-label">选择客户</text>
          <view class="customer-select-wrap">
            <input
              class="form-input"
              v-model="customerSearch"
              placeholder="输入客户姓名搜索"
              @input="searchCustomer"
            />
            <view class="customer-dropdown" v-if="customerResults.length > 0">
              <view
                v-for="c in customerResults"
                :key="c.id"
                class="customer-option"
                @click="selectCustomer(c)"
              >
                <text>{{ c.name }}</text>
                <text class="customer-phone">{{ c.phone || '' }}</text>
              </view>
            </view>
          </view>
          <view v-if="selectedCustomer" class="selected-customer">
            <text>已选择：{{ selectedCustomer.name }}</text>
            <text class="clear-select" @click="clearCustomer">×</text>
          </view>
        </view>

        <view class="form-group">
          <text class="form-label">充值金额</text>
          <input
            class="form-input"
            v-model="formAmount"
            type="digit"
            placeholder="请输入充值金额"
          />
        </view>

        <view class="form-group">
          <text class="form-label">支付方式</text>
          <view class="method-options">
            <view
              v-for="m in paymentMethods"
              :key="m.value"
              class="method-option"
              :class="{ active: formMethod === m.value }"
              @click="formMethod = m.value"
            >
              <text>{{ m.label }}</text>
            </view>
          </view>
        </view>

        <view class="modal-actions">
          <view class="btn-cancel" @click="showForm = false">
            <text>取消</text>
          </view>
          <view class="btn-submit" @click="submitRecharge">
            <text>{{ submitting ? '提交中...' : '确认充值' }}</text>
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

const paymentMethods = [
  { label: '现金', value: 'cash' },
  { label: '刷卡', value: 'card' },
  { label: '微信', value: 'wechat' },
  { label: '支付宝', value: 'alipay' },
];

const paymentMap: Record<string, string> = {
  cash: '现金',
  card: '刷卡',
  wechat: '微信',
  alipay: '支付宝',
};

function paymentLabel(method: string) {
  return paymentMap[method] || method;
}

function formatPrice(val: number) {
  return Number(val || 0).toFixed(2);
}

function formatTime(dateStr: string) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 列表状态
const recharges = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

function fetchRecharges() {
  loading.value = true;
  const url = `/beauty/recharges?page=${page}&pageSize=20`;
  apiFetch<{ list: any[]; total: number }>({ url })
    .then((data) => {
      const list = data?.list || [];
      if (page === 1) {
        recharges.value = list;
      } else {
        recharges.value = recharges.value.concat(list);
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
  fetchRecharges();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchRecharges();
}

// 新建充值表单
const showForm = ref(false);
const customerSearch = ref('');
const customerResults = ref<any[]>([]);
const selectedCustomer = ref<any>(null);
const formAmount = ref('');
const formMethod = ref('cash');
const submitting = ref(false);
let searchTimer: any = null;

function searchCustomer() {
  if (!customerSearch.value.trim()) {
    customerResults.value = [];
    return;
  }
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    apiFetch<{ list: any[] }>({ url: `/customers?keyword=${encodeURIComponent(customerSearch.value.trim())}&pageSize=10` })
      .then((data) => {
        customerResults.value = data?.list || [];
      })
      .catch(() => {
        customerResults.value = [];
      });
  }, 300);
}

function selectCustomer(c: any) {
  selectedCustomer.value = c;
  customerSearch.value = c.name;
  customerResults.value = [];
}

function clearCustomer() {
  selectedCustomer.value = null;
  customerSearch.value = '';
  customerResults.value = [];
}

function submitRecharge() {
  if (!selectedCustomer.value) {
    uni.showToast({ title: '请选择客户', icon: 'none' });
    return;
  }
  const amount = Number(formAmount.value);
  if (!amount || amount <= 0) {
    uni.showToast({ title: '请输入有效充值金额', icon: 'none' });
    return;
  }

  submitting.value = true;
  apiFetch({
    url: '/beauty/recharges',
    method: 'POST',
    data: {
      customerId: selectedCustomer.value.id,
      amount: amount,
      paymentMethod: formMethod.value,
    },
  })
    .then(() => {
      uni.showToast({ title: '充值成功', icon: 'success' });
      showForm.value = false;
      clearCustomer();
      formAmount.value = '';
      formMethod.value = 'cash';
      page = 1;
      noMore.value = false;
      fetchRecharges();
    })
    .catch(() => {})
    .finally(() => {
      submitting.value = false;
    });
}

onMounted(() => {
  fetchRecharges();
});
</script>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}
.recharge-list {
  flex: 1;
  padding: 12px 16px;
}
.recharge-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.recharge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.recharge-customer {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
.recharge-amount {
  font-size: 32rpx;
  font-weight: bold;
  color: #67C23A;
}
.recharge-info {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16rpx 20rpx;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6rpx 0;
}
.info-row .label {
  font-size: 24rpx;
  color: #999;
}
.info-row .value {
  font-size: 26rpx;
  color: #666;
}
.empty-hint {
  text-align: center;
  padding: 160rpx 0;
  color: #C0C4CC;
  font-size: 28rpx;
}
.loading-more {
  text-align: center;
  padding: 32rpx;
  color: #999;
  font-size: 24rpx;
}
.bottom-btn-area {
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #eee;
}
.create-btn {
  background: #409EFF;
  color: #fff;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: bold;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 999;
}
.modal-content {
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 40rpx 32rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}
.modal-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 36rpx;
}
.form-group {
  margin-bottom: 28rpx;
}
.form-label {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  display: block;
}
.form-input {
  height: 80rpx;
  border: 1px solid #E4E7ED;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333;
  background: #fafafa;
  width: 100%;
  box-sizing: border-box;
}
.customer-select-wrap {
  position: relative;
}
.customer-dropdown {
  position: absolute;
  top: 88rpx;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #E4E7ED;
  border-radius: 12rpx;
  max-height: 300rpx;
  overflow-y: auto;
  z-index: 10;
}
.customer-option {
  display: flex;
  justify-content: space-between;
  padding: 20rpx;
  font-size: 28rpx;
  color: #333;
  border-bottom: 1px solid #f5f5f5;
}
.customer-phone {
  color: #999;
  font-size: 24rpx;
}
.selected-customer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12rpx;
  padding: 16rpx 20rpx;
  background: #ecf5ff;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #409EFF;
}
.clear-select {
  font-size: 32rpx;
  color: #999;
  padding: 0 10rpx;
}
.method-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.method-option {
  padding: 16rpx 32rpx;
  border: 1px solid #E4E7ED;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #666;
  background: #fafafa;
}
.method-option.active {
  border-color: #409EFF;
  background: #ecf5ff;
  color: #409EFF;
}
.modal-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 40rpx;
}
.btn-cancel, .btn-submit {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: bold;
}
.btn-cancel {
  background: #f5f5f5;
  color: #666;
}
.btn-submit {
  background: #409EFF;
  color: #fff;
}
</style>
