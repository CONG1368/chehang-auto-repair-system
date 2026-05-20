<template>
  <view class="page">
    <!-- 用户信息 -->
    <view class="header">
      <view class="user-area">
        <view class="avatar">
          <u-avatar
            :text="(userInfo?.realName || '管')[0]"
            size="48"
            fontSize="22"
            bgColor="#409EFF"
          />
        </view>
        <view class="user-info">
          <text class="user-name">{{ userInfo?.realName || '管理员' }}</text>
          <text class="user-role">{{ userInfo?.role || '系统用户' }}</text>
        </view>
      </view>
      <text class="date-text">{{ today }}</text>
    </view>

    <!-- 今日概览 -->
    <view class="overview-section">
      <text class="section-title">今日概览</text>
      <view class="overview-grid">
        <view class="overview-item">
          <text class="overview-value">{{ dashboard.todayRevenue || '0' }}元</text>
          <text class="overview-label">今日营收</text>
        </view>
        <view class="overview-item">
          <text class="overview-value">{{ dashboard.todayOrders || 0 }}</text>
          <text class="overview-label">工单数</text>
        </view>
        <view class="overview-item">
          <text class="overview-value">{{ dashboard.repairingCount || 0 }}</text>
          <text class="overview-label">在修车辆</text>
        </view>
        <view class="overview-item">
          <text class="overview-value">{{ dashboard.newCustomers || 0 }}</text>
          <text class="overview-label">新客户</text>
        </view>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="menu-section">
      <text class="section-title">快捷功能</text>
      <view class="menu-grid">
        <view class="menu-item" @click="navigate('/pages/repair/reception')">
          <view class="menu-icon bg-blue">
            <u-icon name="car" size="28" color="#fff" />
          </view>
          <text class="menu-text">接车开单</text>
        </view>
        <view class="menu-item" @click="switchTab('/pages/repair/orders')">
          <view class="menu-icon bg-green">
            <u-icon name="file-text" size="28" color="#fff" />
          </view>
          <text class="menu-text">工单管理</text>
        </view>
        <view class="menu-item" @click="switchTab('/pages/customer/list')">
          <view class="menu-icon bg-orange">
            <u-icon name="account" size="28" color="#fff" />
          </view>
          <text class="menu-text">客户管理</text>
        </view>
        <view class="menu-item" @click="switchTab('/pages/inventory/stock')">
          <view class="menu-icon bg-red">
            <u-icon name="grid" size="28" color="#fff" />
          </view>
          <text class="menu-text">库存查询</text>
        </view>
        <view class="menu-item" @click="navigate('/pages/finance/cashier')">
          <view class="menu-icon bg-gray">
            <u-icon name="rmb-circle" size="28" color="#fff" />
          </view>
          <text class="menu-text">收银台</text>
        </view>
        <view class="menu-item" @click="handleLogout">
          <view class="menu-icon bg-dark">
            <u-icon name="setting" size="28" color="#fff" />
          </view>
          <text class="menu-text">退出登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const BASE_URL = 'http://localhost:3000/api';

const userInfo = computed(() => authStore.userInfo);

const today = computed(() => {
  const d = new Date();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${weekDays[d.getDay()]}`;
});

const dashboard = reactive({
  todayRevenue: 0,
  todayOrders: 0,
  repairingCount: 0,
  newCustomers: 0,
});

const loading = ref(false);

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
          resolve(res.data.data);
        }
      },
      fail: (err) => {
        console.error('API request failed:', err);
        reject(err);
      },
    });
  });
}

function fetchDashboard() {
  loading.value = true;
  apiFetch<any>({ url: '/reports/dashboard' })
    .then((data) => {
      if (data) {
        dashboard.todayRevenue = data.todayRevenue ?? 0;
        dashboard.todayOrders = data.todayOrders ?? 0;
        dashboard.repairingCount = data.repairingCount ?? 0;
        dashboard.newCustomers = data.newCustomers ?? 0;
      }
    })
    .catch(() => {})
    .finally(() => { loading.value = false; });
}

function navigate(url: string) {
  uni.navigateTo({ url });
}

function switchTab(url: string) {
  uni.switchTab({ url });
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        authStore.logout();
        uni.reLaunch({ url: '/pages/login/login' });
      }
    },
  });
}

onMounted(() => {
  fetchDashboard();
});
</script>

<style scoped>
.page {
  padding: 16px;
  background: #f5f5f5;
  min-height: 100vh;
}
.header {
  background: linear-gradient(135deg, #409EFF, #337ecc);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.user-area {
  display: flex;
  align-items: center;
}
.avatar {
  margin-right: 12px;
}
.user-info {
  display: flex;
  flex-direction: column;
}
.user-name {
  font-size: 18px;
  font-weight: bold;
  color: #fff;
}
.user-role {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 2px;
}
.date-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  text-align: right;
  max-width: 120px;
}
.overview-section {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}
.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 16px;
  display: block;
}
.overview-grid {
  display: flex;
  flex-wrap: wrap;
}
.overview-item {
  width: 25%;
  text-align: center;
}
.overview-value {
  font-size: 22px;
  font-weight: bold;
  color: #303133;
  display: block;
  margin-bottom: 4px;
}
.overview-label {
  font-size: 12px;
  color: #909399;
}
.menu-section {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}
.menu-grid {
  display: flex;
  flex-wrap: wrap;
}
.menu-item {
  width: 33.33%;
  text-align: center;
  padding: 16px 0;
}
.menu-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.bg-blue {
  background: #409EFF;
}
.bg-green {
  background: #67C23A;
}
.bg-orange {
  background: #E6A23C;
}
.bg-red {
  background: #F56C6C;
}
.bg-gray {
  background: #909399;
}
.bg-dark {
  background: #606266;
}
.menu-text {
  font-size: 13px;
  color: #606266;
  display: block;
}
</style>
