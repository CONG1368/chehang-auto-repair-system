<template>
  <view class="page">
    <!-- 状态 Tab -->
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

    <!-- 日期筛选 -->
    <view class="date-bar">
      <input
        class="date-input"
        v-model="filterDate"
        type="date"
        @change="onDateChange"
      />
    </view>

    <scroll-view
      scroll-y
      class="schedule-list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="appointments.length === 0 && !loading" class="empty-hint">
        <text>暂无预约记录</text>
      </view>

      <view
        v-for="item in appointments"
        :key="item.id"
        class="schedule-card"
      >
        <view class="schedule-header">
          <text class="schedule-customer">{{ item.customerName || '未知客户' }}</text>
          <text class="schedule-status" :style="{ color: statusColor(item.status) }">
            {{ statusText(item.status) }}
          </text>
        </view>
        <view class="schedule-info">
          <view class="info-row">
            <text class="label">服务项目</text>
            <text class="value">{{ item.serviceName || '--' }}</text>
          </view>
          <view class="info-row">
            <text class="label">技师</text>
            <text class="value">{{ item.technicianName || '待分配' }}</text>
          </view>
          <view class="info-row">
            <text class="label">预约时间</text>
            <text class="value">{{ item.appointmentTime || item.date || '--' }}</text>
          </view>
          <view class="info-row" v-if="item.plateNumber">
            <text class="label">车牌号</text>
            <text class="value plate">{{ item.plateNumber }}</text>
          </view>
        </view>
      </view>

      <view v-if="loadingMore" class="loading-more">
        <u-loading-icon />
        <text>加载中...</text>
      </view>
      <view v-if="noMore && appointments.length > 0" class="loading-more">
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

const statusTabs = [
  { label: '全部', value: '' },
  { label: '待施工', value: 'pending' },
  { label: '施工中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
];

const currentStatus = ref('');
const filterDate = ref('');
const appointments = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

const statusMap: Record<string, string> = {
  pending: '待施工',
  in_progress: '施工中',
  completed: '已完成',
  cancelled: '已取消',
};

function statusText(status: string) {
  return statusMap[status] || status;
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: '#E6A23C',
    in_progress: '#409EFF',
    completed: '#67C23A',
    cancelled: '#F56C6C',
  };
  return colors[status] || '#909399';
}

function switchStatus(value: string) {
  currentStatus.value = value;
  page = 1;
  noMore.value = false;
  appointments.value = [];
  fetchAppointments();
}

function onDateChange() {
  page = 1;
  noMore.value = false;
  appointments.value = [];
  fetchAppointments();
}

function fetchAppointments() {
  loading.value = true;
  let url = `/beauty/appointments?page=${page}&pageSize=20`;
  if (currentStatus.value) {
    url += `&status=${currentStatus.value}`;
  }
  if (filterDate.value) {
    url += `&date=${filterDate.value}`;
  }
  apiFetch<any[]>({ url })
    .then((data) => {
      const list = data || [];
      if (page === 1) {
        appointments.value = list;
      } else {
        appointments.value = appointments.value.concat(list);
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
  fetchAppointments();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchAppointments();
}

onMounted(() => {
  fetchAppointments();
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
.date-bar {
  background: #fff;
  padding: 8px 16px;
  border-bottom: 1px solid #eee;
}
.date-input {
  font-size: 14px;
  color: #303133;
  padding: 6px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  height: 36px;
}
.schedule-list {
  flex: 1;
  padding: 12px 16px;
}
.schedule-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.schedule-customer {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}
.schedule-status {
  font-size: 13px;
  font-weight: 500;
}
.schedule-info {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 10px 12px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
}
.info-row .label {
  font-size: 12px;
  color: #909399;
}
.info-row .value {
  font-size: 13px;
  color: #303133;
}
.info-row .plate {
  color: #409EFF;
  font-weight: 500;
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
