<template>
  <view class="page">
    <view class="section">
      <text class="section-title">查询工单</text>
      <view class="search-row">
        <u-input
          v-model="orderNo"
          placeholder="请输入工单号"
          border="surround"
          class="flex-1"
        />
        <u-button type="primary" :loading="searching" @click="searchOrder" class="search-btn">
          查询
        </u-button>
      </view>
    </view>

    <view class="section" v-if="orderInfo">
      <text class="section-title">工单信息</text>
      <u-cell-group>
        <u-cell title="工单号" :value="orderInfo.orderNo || orderInfo.id" />
        <u-cell title="车牌号" :value="orderInfo.plateNumber || '-'" />
        <u-cell title="客户" :value="orderInfo.customerName || '-'" />
        <u-cell title="维修金额" :value="'¥' + formatPrice(orderInfo.totalAmount || 0)" />
        <u-cell title="已付金额" :value="'¥' + formatPrice(orderInfo.paidAmount || 0)" />
        <u-cell
          title="待付金额"
          :value="'¥' + formatPrice(remainAmount)"
          :valueStyle="{ color: '#F56C6C', fontWeight: 'bold' }"
        />
      </u-cell-group>
    </view>

    <view class="section" v-if="orderInfo && remainAmount > 0">
      <text class="section-title">收款信息</text>
      <u-input
        v-model="payAmount"
        placeholder="收款金额（元）"
        type="digit"
        border="bottom"
      />
      <view class="quick-amount">
        <u-button
          v-for="btn in quickAmounts"
          :key="btn"
          :type="payAmount === String(btn) ? 'primary' : 'default'"
          size="mini"
          :text="'¥' + btn"
          @click="payAmount = String(btn)"
        />
      </view>
    </view>

    <view class="section" v-if="orderInfo && remainAmount > 0">
      <text class="section-title">支付方式</text>
      <view class="payment-methods">
        <view
          v-for="method in paymentMethods"
          :key="method.value"
          class="payment-item"
          :class="{ selected: selectedMethod === method.value }"
          @click="selectedMethod = method.value"
        >
          <u-icon :name="method.icon" size="28" :color="selectedMethod === method.value ? '#409EFF' : '#909399'" />
          <text class="method-label">{{ method.label }}</text>
        </view>
      </view>
    </view>

    <view class="submit-area" v-if="orderInfo && remainAmount > 0">
      <u-button
        type="primary"
        :loading="paying"
        @click="confirmPay"
        block
      >确认收款</u-button>
    </view>

    <!-- 已完成收款提示 -->
    <view class="section" v-if="paidOrders.length > 0">
      <text class="section-title">最近收款记录</text>
      <view v-for="item in paidOrders" :key="item.id" class="paid-item">
        <text class="paid-order">{{ item.orderNo || item.id }}</text>
        <text class="paid-amount">+¥{{ formatPrice(item.receiveAmount) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
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

const orderNo = ref('');
const searching = ref(false);
const orderInfo = ref<any>(null);

const payAmount = ref('');
const quickAmounts = computed(() => {
  if (!orderInfo.value) return [];
  const amt = remainAmount.value;
  const set = new Set<number>([amt, Math.ceil(amt / 2), Math.ceil(amt / 3)]);
  return [...set].filter(v => v > 0).sort((a, b) => a - b);
});
const selectedMethod = ref('cash');
const paying = ref(false);
const paidOrders = ref<any[]>([]);

const paymentMethods = [
  { label: '现金', value: 'cash', icon: 'rmb-circle' },
  { label: '微信', value: 'wechat', icon: 'weixin-circle-fill' },
  { label: '支付宝', value: 'alipay', icon: 'zhifubao-circle-fill' },
  { label: '银行卡', value: 'bank_card', icon: 'credit-card' },
];

const remainAmount = computed(() => {
  if (!orderInfo.value) return 0;
  return (orderInfo.value.totalAmount || 0) - (orderInfo.value.paidAmount || 0);
});

function searchOrder() {
  if (!orderNo.value.trim()) {
    uni.showToast({ title: '请输入工单号', icon: 'none' });
    return;
  }
  searching.value = true;
  orderInfo.value = null;
  payAmount.value = '';

  apiFetch({ url: `/repair?orderNo=${encodeURIComponent(orderNo.value.trim())}` })
    .then((data: any) => {
      const orders = Array.isArray(data) ? data : (data?.list || []);
      if (orders.length > 0) {
        orderInfo.value = orders[0];
        payAmount.value = String(remainAmount.value);
      } else {
        uni.showToast({ title: '未找到该工单', icon: 'none' });
      }
    })
    .catch(() => {})
    .finally(() => { searching.value = false; });
}

function confirmPay() {
  const amount = Number(payAmount.value);
  if (!amount || amount <= 0) {
    uni.showToast({ title: '请输入有效收款金额', icon: 'none' });
    return;
  }
  if (amount > remainAmount.value) {
    uni.showToast({ title: '收款金额不能超过待付金额', icon: 'none' });
    return;
  }

  paying.value = true;
  apiFetch({
    url: '/finance/payments',
    method: 'POST',
    data: {
      orderId: orderInfo.value.id,
      orderNo: orderInfo.value.orderNo || orderInfo.value.id,
      amount: amount,
      paymentMethod: selectedMethod.value,
    },
  })
    .then(() => {
      uni.showToast({ title: '收款成功', icon: 'success' });
      paidOrders.value.unshift({
        id: Date.now(),
        orderNo: orderInfo.value.orderNo || orderInfo.value.id,
        receiveAmount: amount,
      });
      // Update paid amount locally
      orderInfo.value.paidAmount = (orderInfo.value.paidAmount || 0) + amount;
      payAmount.value = String(remainAmount.value);
    })
    .catch(() => {})
    .finally(() => { paying.value = false; });
}

function formatPrice(val: number) {
  return Number(val || 0).toFixed(2);
}
</script>

<style scoped>
.page {
  padding: 16px;
  background: #f5f5f5;
  min-height: 100vh;
}
.section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.section-title {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 12px;
  display: block;
}
.search-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.flex-1 {
  flex: 1;
}
.search-btn {
  width: 80px;
}
.quick-amount {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.payment-methods {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.payment-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  border-radius: 10px;
  border: 1px solid #E4E7ED;
  min-width: 75px;
}
.payment-item.selected {
  border-color: #409EFF;
  background: #ecf5ff;
}
.method-label {
  font-size: 12px;
  color: #606266;
  margin-top: 4px;
}
.submit-area {
  padding: 8px 0 30px;
}
.paid-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}
.paid-order {
  font-size: 14px;
  color: #303133;
}
.paid-amount {
  font-size: 14px;
  color: #67C23A;
  font-weight: bold;
}
</style>
