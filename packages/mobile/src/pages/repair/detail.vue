<template>
  <view class="page">
    <view v-if="loading" class="loading-wrap">
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="error" class="error-wrap">
      <text class="error-text">{{ error }}</text>
      <view class="retry-btn" @click="fetchDetail">
        <text>重新加载</text>
      </view>
    </view>

    <template v-else-if="order">
      <!-- 工单基本信息 -->
      <view class="section">
        <view class="section-header">
          <text class="order-no">{{ order.orderNo }}</text>
          <text class="status-tag" :style="{ color: statusColor(order.status), borderColor: statusColor(order.status) }">
            {{ statusText(order.status) }}
          </text>
        </view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">车牌号</text>
            <text class="info-value plate">{{ order.plateNumber || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">车型</text>
            <text class="info-value">{{ order.vehicleModel || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">客户</text>
            <text class="info-value">{{ order.customer?.name || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">客户电话</text>
            <text class="info-value">{{ order.customer?.phone || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">服务顾问</text>
            <text class="info-value">{{ order.advisor?.name || order.advisor?.realName || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">行驶里程</text>
            <text class="info-value">{{ order.mileage ? order.mileage + ' km' : '-' }}</text>
          </view>
        </view>
        <view class="fault-block" v-if="order.faultDesc">
          <text class="fault-label">故障描述</text>
          <text class="fault-content">{{ order.faultDesc }}</text>
        </view>
        <view class="time-row">
          <text>创建时间：{{ formatTime(order.createdAt) }}</text>
          <text v-if="order.estCompleteTime">预计完工：{{ formatTime(order.estCompleteTime) }}</text>
        </view>
      </view>

      <!-- 维修项目 -->
      <view class="section" v-if="order.items && order.items.length > 0">
        <text class="section-title">维修项目</text>
        <view v-for="item in order.items" :key="item.id" class="item-row">
          <view class="item-info">
            <text class="item-name">{{ item.name }}</text>
            <text class="item-type">{{ item.type === 'part' ? '配件' : '工时' }}</text>
          </view>
          <view class="item-fees">
            <text v-if="item.laborFee > 0" class="fee-text">工时费：￥{{ Number(item.laborFee).toFixed(2) }}</text>
            <text v-if="item.partFee > 0" class="fee-text">配件费：￥{{ Number(item.partFee).toFixed(2) }}</text>
            <text v-if="item.amount > 0" class="fee-text total">小计：￥{{ Number(item.amount).toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- 配件使用列表 -->
      <view class="section" v-if="partItems.length > 0">
        <text class="section-title">配件使用</text>
        <view v-for="item in partItems" :key="item.id" class="item-row">
          <view class="item-info">
            <text class="item-name">{{ item.name }}</text>
          </view>
          <view class="item-fees">
            <text class="fee-text">单价：￥{{ Number(item.partFee).toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- 费用汇总 -->
      <view class="section" v-if="order.totalLaborFee || order.totalPartFee">
        <text class="section-title">费用汇总</text>
        <view class="fee-summary">
          <view class="fee-line">
            <text>工时费</text>
            <text>￥{{ Number(order.totalLaborFee || 0).toFixed(2) }}</text>
          </view>
          <view class="fee-line">
            <text>配件费</text>
            <text>￥{{ Number(order.totalPartFee || 0).toFixed(2) }}</text>
          </view>
          <view class="fee-line" v-if="order.discount > 0">
            <text>优惠</text>
            <text class="discount">-￥{{ Number(order.discount).toFixed(2) }}</text>
          </view>
          <view class="fee-line total-line">
            <text>合计</text>
            <text class="final-amount">￥{{ Number(order.finalAmount || order.totalAmount || 0).toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- 派工记录 -->
      <view class="section" v-if="order.dispatchRecords && order.dispatchRecords.length > 0">
        <text class="section-title">派工记录</text>
        <view v-for="record in order.dispatchRecords" :key="record.id" class="record-card">
          <view class="record-header">
            <text class="record-tech">技师：{{ record.technician?.name || record.technician?.realName || '-' }}</text>
            <text class="record-status" :style="{ color: dispatchStatusColor(record.status) }">
              {{ dispatchStatusText(record.status) }}
            </text>
          </view>
          <view class="record-detail">
            <text>标准工时：{{ record.standardHours || 0 }}h</text>
            <text v-if="record.actualHours">实际工时：{{ record.actualHours }}h</text>
          </view>
        </view>
      </view>

      <!-- 质检记录 -->
      <view class="section" v-if="order.qualityCheck">
        <text class="section-title">质检记录</text>
        <view class="record-card">
          <view class="record-header">
            <text class="record-tech">
              质检结果：
              <text :style="{ color: order.qualityCheck.isPassed === 1 ? '#67C23A' : '#F56C6C' }">
                {{ order.qualityCheck.isPassed === 1 ? '通过' : '不通过' }}
              </text>
            </text>
            <text class="record-time">{{ formatTime(order.qualityCheck.createdAt) }}</text>
          </view>
          <view class="record-detail" v-if="order.qualityCheck.remark">
            <text>备注：{{ order.qualityCheck.remark }}</text>
          </view>
          <view class="record-detail" v-if="order.qualityCheck.roadTest">
            <text>路试：{{ order.qualityCheck.roadTest }}</text>
          </view>
        </view>
      </view>

      <!-- 底部占位 -->
      <view class="bottom-placeholder"></view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { onLoad } from '@dcloudio/uni-app';

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

// ---- 状态定义 ----

const order = ref<any>(null);
const loading = ref(true);
const error = ref('');

// 配件类型项目筛选
const partItems = computed(() => {
  if (!order.value?.items) return [];
  return order.value.items.filter((item: any) => item.type === 'part');
});

// ---- 状态映射 ----

const statusMap: Record<string, string> = {
  pending: '待派工',
  assigned: '已派工',
  repairing: '维修中',
  quality_check: '待质检',
  completed: '已完成',
  delivered: '已交车',
  cancelled: '已取消',
};

function statusText(status: string) {
  return statusMap[status] || status;
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#E6A23C',
    assigned: '#E6A23C',
    repairing: '#409EFF',
    quality_check: '#909399',
    completed: '#67C23A',
    delivered: '#67C23A',
    cancelled: '#F56C6C',
  };
  return colors[status] || '#909399';
}

const dispatchStatusMap: Record<string, string> = {
  assigned: '已派工',
  repairing: '维修中',
  completed: '已完成',
};

function dispatchStatusText(status: string) {
  return dispatchStatusMap[status] || status;
}

function dispatchStatusColor(status: string): string {
  const colors: Record<string, string> = {
    assigned: '#E6A23C',
    repairing: '#409EFF',
    completed: '#67C23A',
  };
  return colors[status] || '#909399';
}

function formatTime(time: string) {
  if (!time) return '';
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---- 数据获取 ----

function fetchDetail() {
  const id = orderId;
  if (!id) {
    error.value = '缺少工单ID';
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = '';

  apiFetch<any>({ url: `/repair/${id}` })
    .then((data) => {
      order.value = data;
    })
    .catch((err) => {
      error.value = '加载工单详情失败';
    })
    .finally(() => {
      loading.value = false;
    });
}

let orderId = '';

onLoad((options: any) => {
  orderId = options?.id || '';
  fetchDetail();
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 12px 16px;
}

.loading-wrap,
.error-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 120px;
}

.loading-text {
  font-size: 14px;
  color: #C0C4CC;
}

.error-text {
  font-size: 14px;
  color: #F56C6C;
  margin-bottom: 16px;
}

.retry-btn {
  background: #409EFF;
  color: #fff;
  padding: 8px 24px;
  border-radius: 20px;
  font-size: 14px;
}

/* 区块 */
.section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.order-no {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.status-tag {
  font-size: 13px;
  font-weight: 500;
  padding: 2px 10px;
  border: 1px solid;
  border-radius: 4px;
}

.section-title {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 12px;
  display: block;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

/* 信息网格 */
.info-grid {
  display: flex;
  flex-wrap: wrap;
}

.info-item {
  width: 50%;
  margin-bottom: 10px;
}

.info-label {
  font-size: 12px;
  color: #C0C4CC;
  display: block;
  margin-bottom: 2px;
}

.info-value {
  font-size: 14px;
  color: #303133;
}

.info-value.plate {
  color: #409EFF;
  font-weight: 500;
}

.fault-block {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.fault-label {
  font-size: 12px;
  color: #C0C4CC;
  display: block;
  margin-bottom: 4px;
}

.fault-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.time-row {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: #C0C4CC;
}

/* 项目行 */
.item-row {
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.item-row:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.item-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.item-type {
  font-size: 11px;
  color: #fff;
  background: #909399;
  padding: 1px 6px;
  border-radius: 3px;
}

.item-fees {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.fee-text {
  font-size: 12px;
  color: #909399;
}

.fee-text.total {
  color: #F56C6C;
  font-weight: 500;
}

/* 费用汇总 */
.fee-summary {
  padding: 4px 0;
}

.fee-line {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: #606266;
  border-bottom: 1px solid #f5f5f5;
}

.fee-line:last-child {
  border-bottom: none;
}

.fee-line.total-line {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  padding-top: 10px;
  margin-top: 4px;
  border-top: 1px solid #eee;
}

.discount {
  color: #67C23A;
}

.final-amount {
  color: #F56C6C;
}

/* 记录卡片 */
.record-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.record-card:last-child {
  margin-bottom: 0;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.record-tech {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.record-status {
  font-size: 13px;
  font-weight: 500;
}

.record-time {
  font-size: 12px;
  color: #C0C4CC;
}

.record-detail {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.bottom-placeholder {
  height: 30px;
}
</style>
