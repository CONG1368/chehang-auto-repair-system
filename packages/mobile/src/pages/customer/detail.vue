<template>
  <view class="page">
    <scroll-view scroll-y class="detail-scroll">
      <!-- 客户基本信息卡片 -->
      <view class="section-card">
        <view class="section-title">
          <text>基本信息</text>
        </view>
        <view class="info-row">
          <text class="label">姓名</text>
          <text class="value">{{ customer.name || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="label">电话</text>
          <text class="value link" @click="callPhone">{{ customer.phone || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="label">性别</text>
          <text class="value">{{ genderText }}</text>
        </view>
        <view class="info-row" v-if="customer.birthday">
          <text class="label">生日</text>
          <text class="value">{{ formatDate(customer.birthday) }}</text>
        </view>
        <view class="info-row">
          <text class="label">会员等级</text>
          <text class="value member-level" :style="{ color: levelColor }">
            {{ levelText }}
          </text>
        </view>
        <view class="info-row">
          <text class="label">账户余额</text>
          <text class="value price">¥{{ formatPrice(customer.balance) }}</text>
        </view>
        <view class="info-row">
          <text class="label">累计消费</text>
          <text class="value price">¥{{ formatPrice(customer.totalSpent) }}</text>
        </view>
        <view class="info-row">
          <text class="label">积分</text>
          <text class="value">{{ customer.points || 0 }}</text>
        </view>
        <view class="info-row">
          <text class="label">到店次数</text>
          <text class="value">{{ customer.visitCount || 0 }} 次</text>
        </view>
        <view class="info-row" v-if="customer.lastVisitAt">
          <text class="label">最近到店</text>
          <text class="value">{{ formatDate(customer.lastVisitAt) }}</text>
        </view>
        <view class="info-row" v-if="customer.address">
          <text class="label">地址</text>
          <text class="value">{{ customer.address }}</text>
        </view>
        <view class="info-row" v-if="customer.remark">
          <text class="label">备注</text>
          <text class="value">{{ customer.remark }}</text>
        </view>
      </view>

      <!-- 车辆列表 -->
      <view class="section-card">
        <view class="section-title">
          <text>名下车辆（{{ vehicles.length }}辆）</text>
        </view>
        <view v-if="vehicles.length === 0" class="empty-hint">
          <text>暂无车辆信息</text>
        </view>
        <view v-for="vehicle in vehicles" :key="vehicle.id" class="vehicle-item">
          <view class="vehicle-header">
            <text class="plate-number">{{ vehicle.plateNumber || '未上牌' }}</text>
            <text class="vehicle-brand">{{ vehicle.brand }} {{ vehicle.series || '' }}</text>
          </view>
          <view class="vehicle-info" v-if="vehicle.model">
            <text class="vehicle-detail">车型：{{ vehicle.model }}</text>
          </view>
          <view class="vehicle-info" v-if="vehicle.vin">
            <text class="vehicle-detail">VIN：{{ vehicle.vin }}</text>
          </view>
          <view class="vehicle-info">
            <text class="vehicle-detail" v-if="vehicle.mileage">里程：{{ vehicle.mileage }}km</text>
            <text class="vehicle-detail" v-if="vehicle.insuranceDue">
              保险到期：{{ formatDate(vehicle.insuranceDue) }}
            </text>
            <text class="vehicle-detail" v-if="vehicle.inspectionDue">
              年检到期：{{ formatDate(vehicle.inspectionDue) }}
            </text>
          </view>
        </view>
      </view>

      <!-- 最近维修记录 -->
      <view class="section-card">
        <view class="section-title">
          <text>最近维修记录</text>
        </view>
        <view v-if="repairOrders.length === 0" class="empty-hint">
          <text>暂无维修记录</text>
        </view>
        <view
          v-for="order in repairOrders"
          :key="order.id"
          class="repair-item"
          @click="viewRepairDetail(order)"
        >
          <view class="repair-header">
            <text class="repair-no">{{ order.orderNo || order.id }}</text>
            <text class="repair-status" :style="{ color: repairStatusColor(order.status) }">
              {{ repairStatusText(order.status) }}
            </text>
          </view>
          <view class="repair-body">
            <text class="repair-plate">{{ order.plateNumber || '无车牌' }}</text>
            <text class="repair-amount">¥{{ formatPrice(order.finalAmount || order.totalAmount) }}</text>
          </view>
          <view class="repair-footer" v-if="order.createdAt">
            <text class="repair-time">{{ formatTime(order.createdAt) }}</text>
          </view>
        </view>
      </view>

      <!-- 底部占位 -->
      <view style="height: 24px;" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
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

const customerId = ref<number>(0);
const customer = ref<any>({});
const vehicles = ref<any[]>([]);
const repairOrders = ref<any[]>([]);
const loading = ref(false);

const memberLevelMap: Record<number, string> = {
  0: '普通客户',
  1: '银卡会员',
  2: '金卡会员',
  3: '钻石会员',
};

const levelColorMap: Record<number, string> = {
  0: '#909399',
  1: '#C0C4CC',
  2: '#E6A23C',
  3: '#409EFF',
};

const levelText = computed(() => {
  const lv = customer.value.memberLevel;
  return memberLevelMap[lv] ?? '普通客户';
});

const levelColor = computed(() => {
  const lv = customer.value.memberLevel;
  return levelColorMap[lv] ?? '#909399';
});

const genderText = computed(() => {
  const g = customer.value.gender;
  if (g === 1) return '男';
  if (g === 2) return '女';
  return '未知';
});

onLoad((options: any) => {
  if (options.id) {
    customerId.value = Number(options.id);
    fetchDetail();
  }
});

function fetchDetail() {
  loading.value = true;
  apiFetch<any>({ url: `/customers/${customerId.value}` })
    .then((data) => {
      customer.value = data || {};
      vehicles.value = data?.vehicles || [];
      repairOrders.value = data?.repairOrders || [];
    })
    .catch(() => {
      uni.showToast({ title: '加载客户详情失败', icon: 'none' });
    })
    .finally(() => {
      loading.value = false;
    });
}

function callPhone() {
  if (customer.value.phone) {
    uni.makePhoneCall({ phoneNumber: customer.value.phone });
  }
}

function viewRepairDetail(order: any) {
  uni.navigateTo({ url: `/pages/repair/detail?id=${order.id}` });
}

function formatPrice(val: any): string {
  if (val === null || val === undefined) return '0.00';
  return Number(val).toFixed(2);
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

const repairStatusMap: Record<string, string> = {
  pending: '待派工',
  assigned: '已派工',
  repairing: '维修中',
  quality_check: '待质检',
  completed: '已完成',
  delivered: '已交车',
  cancelled: '已取消',
};

function repairStatusText(status: string): string {
  return repairStatusMap[status] || status;
}

function repairStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#E6A23C',
    assigned: '#409EFF',
    repairing: '#409EFF',
    quality_check: '#909399',
    completed: '#67C23A',
    delivered: '#67C23A',
    cancelled: '#F56C6C',
  };
  return colors[status] || '#909399';
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}
.detail-scroll {
  flex: 1;
  padding: 12px 16px;
}
.section-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}
.section-title text {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #fafafa;
}
.info-row:last-child {
  border-bottom: none;
}
.label {
  font-size: 14px;
  color: #909399;
  flex-shrink: 0;
}
.value {
  font-size: 14px;
  color: #303133;
  text-align: right;
}
.value.link {
  color: #409EFF;
}
.value.price {
  color: #E6A23C;
  font-weight: 500;
}
.member-level {
  font-weight: 500;
}

/* 车辆 */
.vehicle-item {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}
.vehicle-item:last-child {
  margin-bottom: 0;
}
.vehicle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.plate-number {
  font-size: 15px;
  font-weight: bold;
  color: #409EFF;
}
.vehicle-brand {
  font-size: 13px;
  color: #606266;
}
.vehicle-info {
  margin-top: 4px;
}
.vehicle-detail {
  font-size: 12px;
  color: #909399;
  margin-right: 12px;
}

/* 维修 */
.repair-item {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}
.repair-item:last-child {
  margin-bottom: 0;
}
.repair-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.repair-no {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}
.repair-status {
  font-size: 12px;
  font-weight: 500;
}
.repair-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.repair-plate {
  font-size: 13px;
  color: #606266;
}
.repair-amount {
  font-size: 14px;
  color: #E6A23C;
  font-weight: 500;
}
.repair-footer {
  margin-top: 2px;
}
.repair-time {
  font-size: 12px;
  color: #C0C4CC;
}

.empty-hint {
  text-align: center;
  padding: 24px 0;
  color: #C0C4CC;
  font-size: 13px;
}
</style>
