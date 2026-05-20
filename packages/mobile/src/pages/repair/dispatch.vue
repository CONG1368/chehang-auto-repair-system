<template>
  <view class="page">
    <view class="tab-bar">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: currentTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="list"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view v-if="list.length === 0 && !loading" class="empty-hint">
        <text>{{ currentTab === 'pending' ? '暂无待派工工单' : '暂无已派工记录' }}</text>
      </view>

      <!-- 待派工列表 -->
      <template v-if="currentTab === 'pending'">
        <view v-for="order in list" :key="order.id" class="card">
          <view class="card-header">
            <text class="order-no">{{ order.orderNo || order.id }}</text>
            <text class="order-status" style="color: #E6A23C;">待派工</text>
          </view>
          <view class="card-info">
            <text class="card-plate">{{ order.plateNumber || '未知车牌' }}</text>
            <text class="card-customer">{{ order.customer?.name || order.customerName || '未知客户' }}</text>
          </view>
          <view class="card-desc" v-if="order.faultDesc">
            <text class="desc-text">故障：{{ order.faultDesc }}</text>
          </view>
          <view class="card-footer">
            <text class="card-time">{{ formatTime(order.createdAt) }}</text>
            <view class="action-btn" @click.stop="openDispatchPopup(order)">
              <text>派工</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 已派工列表 -->
      <template v-if="currentTab === 'dispatched'">
        <view v-for="order in list" :key="order.id" class="card">
          <view class="card-header">
            <text class="order-no">{{ order.orderNo || order.id }}</text>
            <text
              class="order-status"
              :style="{ color: getDispatchedStatusColor(order.status) }"
            >
              {{ dispatchedStatusText(order.status) }}
            </text>
          </view>
          <view class="card-info">
            <text class="card-plate">{{ order.plateNumber || '未知车牌' }}</text>
            <text class="card-customer">{{ order.customer?.name || '未知客户' }}</text>
          </view>
          <view class="card-meta" v-if="order._dispatchInfo">
            <text>技师：{{ order._dispatchInfo.technicianName || '未知' }}</text>
            <text>工时：{{ order._dispatchInfo.standardHours || 0 }}h</text>
          </view>
          <view class="card-footer">
            <text class="card-time">{{ formatTime(order.createdAt) }}</text>
            <view
              v-if="order.status !== 'delivered' && order.status !== 'completed'"
              class="action-btn complete-btn"
              @click.stop="openCompletePopup(order)"
            >
              <text>完成</text>
            </view>
            <text v-else style="color: #67C23A; font-size: 13px;">已完成</text>
          </view>
        </view>
      </template>

      <view v-if="loadingMore" class="loading-more">
        <text>加载中...</text>
      </view>
      <view v-if="noMore && list.length > 0" class="loading-more">
        <text>没有更多了</text>
      </view>
    </scroll-view>

    <!-- 派工弹窗 -->
    <view class="popup-mask" v-if="showDispatchPopup" @click="cancelDispatchPopup">
      <view class="popup-panel" @click.stop>
        <text class="popup-title">派工确认</text>
        <text class="popup-subtitle">工单：{{ dispatchOrder?.orderNo }}</text>

        <view class="popup-field">
          <text class="popup-label">选择技师</text>
          <scroll-view scroll-y class="tech-scroll">
            <view
              v-for="tech in technicians"
              :key="tech.id"
              class="tech-item"
              :class="{ selected: dispatchForm.technicianId === tech.id }"
              @click="dispatchForm.technicianId = tech.id"
            >
              <text class="tech-name">{{ tech.name || tech.realName || tech.username }}</text>
              <text v-if="dispatchForm.technicianId === tech.id" class="check-mark">&#10003;</text>
            </view>
            <view v-if="technicians.length === 0" class="tech-empty">
              <text>暂无可选技师</text>
            </view>
          </scroll-view>
        </view>

        <view class="popup-field">
          <text class="popup-label">标准工时（小时）</text>
          <input
            v-model="dispatchForm.standardHours"
            type="digit"
            placeholder="请输入标准工时"
            class="popup-input"
          />
        </view>

        <view class="popup-btns">
          <view class="popup-btn btn-cancel" @click="cancelDispatchPopup">
            <text>取消</text>
          </view>
          <view class="popup-btn btn-confirm" @click="submitDispatch">
            <text>确认派工</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 完成维修弹窗 -->
    <view class="popup-mask" v-if="showCompletePopup" @click="cancelCompletePopup">
      <view class="popup-panel" @click.stop>
        <text class="popup-title">完成维修</text>
        <text class="popup-subtitle">工单：{{ completeOrder?.orderNo }}</text>

        <view class="popup-field">
          <text class="popup-label">实际工时（小时）</text>
          <input
            v-model="completeForm.actualHours"
            type="digit"
            placeholder="请输入实际工时"
            class="popup-input"
          />
        </view>

        <view class="popup-btns">
          <view class="popup-btn btn-cancel" @click="cancelCompletePopup">
            <text>取消</text>
          </view>
          <view class="popup-btn btn-confirm" @click="submitComplete">
            <text>确认完成</text>
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

// ---- 状态定义 ----

const tabs = [
  { label: '待派工', value: 'pending' },
  { label: '已派工', value: 'dispatched' },
];

const currentTab = ref('pending');
const list = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

// 派工弹窗
const showDispatchPopup = ref(false);
const dispatchOrder = ref<any>(null);
const technicians = ref<any[]>([]);
const dispatchForm = ref({ technicianId: 0, standardHours: '' });

// 完成维修弹窗
const showCompletePopup = ref(false);
const completeOrder = ref<any>(null);
const completeForm = ref({ actualHours: '' });

// ---- 状态映射 ----

const dispatchedStatusMap: Record<string, string> = {
  assigned: '已派工',
  repairing: '维修中',
  quality_check: '待质检',
  completed: '已完成',
  delivered: '已交车',
};

function dispatchedStatusText(status: string) {
  return dispatchedStatusMap[status] || status;
}

function getDispatchedStatusColor(status: string): string {
  const colors: Record<string, string> = {
    assigned: '#E6A23C',
    repairing: '#409EFF',
    quality_check: '#909399',
    completed: '#67C23A',
    delivered: '#67C23A',
  };
  return colors[status] || '#909399';
}

function formatTime(time: string) {
  if (!time) return '';
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---- Tab 切换与列表加载 ----

function switchTab(value: string) {
  currentTab.value = value;
  page = 1;
  noMore.value = false;
  list.value = [];
  fetchData();
}

function fetchData() {
  loading.value = true;
  if (currentTab.value === 'pending') {
    fetchPendingOrders();
  } else {
    fetchDispatchedOrders();
  }
}

function fetchPendingOrders() {
  const url = `/repair?page=${page}&pageSize=20&status=pending`;
  apiFetch<any>({ url })
    .then((data) => {
      const result = data?.list ?? data ?? [];
      if (page === 1) {
        list.value = result;
      } else {
        list.value.push(...result);
      }
      if (result.length < 20) {
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

function fetchDispatchedOrders() {
  // 获取已派工及后续状态的工单（排除 pending 和 cancelled）
  const url = `/repair?page=${page}&pageSize=20&status=assigned`;
  apiFetch<any>({ url })
    .then((data) => {
      const result = data?.list ?? data ?? [];
      // 为每个工单尝试获取派工信息
      if (page === 1) {
        list.value = result;
      } else {
        list.value.push(...result);
      }
      if (result.length < 20) {
        noMore.value = true;
      }
      // 异步补充分派工信息
      enrichDispatchInfo(result);
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

// 为已派工列表补充派工记录中的技师和工时信息
function enrichDispatchInfo(orders: any[]) {
  orders.forEach((order) => {
    apiFetch<any>({ url: `/repair/${order.id}` })
      .then((detail) => {
        const dispatchRecords = detail.dispatchRecords || [];
        const activeRecord = dispatchRecords.find((r: any) => r.status !== 'completed');
        if (activeRecord) {
          order._dispatchInfo = {
            technicianName: activeRecord.technician?.name || activeRecord.technician?.realName || '未知',
            standardHours: activeRecord.standardHours || 0,
          };
        }
      })
      .catch(() => {});
  });
}

function loadMore() {
  if (loadingMore.value || noMore.value) return;
  loadingMore.value = true;
  page++;
  fetchData();
}

async function onRefresh() {
  refreshing.value = true;
  page = 1;
  noMore.value = false;
  await fetchData();
}

// ---- 派工操作 ----

function openDispatchPopup(order: any) {
  dispatchOrder.value = order;
  dispatchForm.value = { technicianId: 0, standardHours: '' };
  showDispatchPopup.value = true;
  fetchTechnicians();
}

function cancelDispatchPopup() {
  showDispatchPopup.value = false;
  dispatchOrder.value = null;
}

function fetchTechnicians() {
  apiFetch<any>({ url: '/users?page=1&pageSize=100' })
    .then((data) => {
      const users = data?.list ?? data ?? [];
      technicians.value = users.filter(
        (u: any) => {
          const roleName = u.role?.name || '';
          return roleName.includes('技师') || u.role === 'technician';
        },
      );
      // 如果没有角色筛选结果，显示所有用户供选择
      if (technicians.value.length === 0) {
        technicians.value = users;
      }
    })
    .catch(() => {
      technicians.value = [];
    });
}

function submitDispatch() {
  if (!dispatchForm.value.technicianId) {
    uni.showToast({ title: '请选择技师', icon: 'none' });
    return;
  }
  if (!dispatchForm.value.standardHours || Number(dispatchForm.value.standardHours) <= 0) {
    uni.showToast({ title: '请输入有效的标准工时', icon: 'none' });
    return;
  }

  const payload = {
    repairOrderId: dispatchOrder.value.id,
    technicianId: dispatchForm.value.technicianId,
    standardHours: Number(dispatchForm.value.standardHours),
  };

  uni.showLoading({ title: '派工中...' });
  apiFetch({ url: '/repair/dispatch', method: 'POST', data: payload })
    .then(() => {
      uni.showToast({ title: '派工成功', icon: 'success' });
      showDispatchPopup.value = false;
      dispatchOrder.value = null;
      page = 1;
      list.value = [];
      fetchPendingOrders();
    })
    .catch(() => {})
    .finally(() => uni.hideLoading());
}

// ---- 完成维修操作 ----

function openCompletePopup(order: any) {
  completeOrder.value = order;
  completeForm.value = { actualHours: '' };
  showCompletePopup.value = true;
}

function cancelCompletePopup() {
  showCompletePopup.value = false;
  completeOrder.value = null;
}

function submitComplete() {
  if (!completeForm.value.actualHours || Number(completeForm.value.actualHours) <= 0) {
    uni.showToast({ title: '请输入有效的实际工时', icon: 'none' });
    return;
  }

  const orderId = completeOrder.value.id;

  uni.showLoading({ title: '处理中...' });
  // 先获取工单详情，找到对应的派工记录 ID
  apiFetch<any>({ url: `/repair/${orderId}` })
    .then((detail) => {
      const dispatchRecords = detail.dispatchRecords || [];
      const activeRecord = dispatchRecords.find(
        (r: any) => r.status === 'assigned' || r.status === 'repairing',
      );
      if (!activeRecord) {
        uni.showToast({ title: '未找到进行中的派工记录', icon: 'none' });
        throw new Error('NO_DISPATCH');
      }
      // 调用完成接口
      return apiFetch({
        url: `/repair/dispatch/${activeRecord.id}/complete`,
        method: 'PUT',
        data: { actualHours: Number(completeForm.value.actualHours) },
      });
    })
    .then(() => {
      uni.showToast({ title: '维修完成', icon: 'success' });
      showCompletePopup.value = false;
      completeOrder.value = null;
      page = 1;
      list.value = [];
      fetchDispatchedOrders();
    })
    .catch((err) => {
      if (err === 'NO_DISPATCH') return;
    })
    .finally(() => uni.hideLoading());
}

onMounted(() => {
  fetchData();
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

.list {
  flex: 1;
  padding: 12px 16px;
}

.card {
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

.order-no {
  font-size: 15px;
  font-weight: bold;
  color: #303133;
}

.order-status {
  font-size: 13px;
  font-weight: 500;
}

.card-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.card-plate {
  font-size: 14px;
  color: #409EFF;
  font-weight: 500;
}

.card-customer {
  font-size: 13px;
  color: #606266;
}

.card-desc {
  margin-bottom: 6px;
}

.desc-text {
  font-size: 13px;
  color: #909399;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
  color: #606266;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}

.card-time {
  font-size: 12px;
  color: #C0C4CC;
}

.action-btn {
  background: #409EFF;
  color: #fff;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
}

.action-btn.complete-btn {
  background: #67C23A;
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
}

/* 弹窗 */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.popup-panel {
  width: 85%;
  max-height: 70vh;
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.popup-title {
  font-size: 17px;
  font-weight: bold;
  color: #303133;
  text-align: center;
  margin-bottom: 4px;
}

.popup-subtitle {
  font-size: 13px;
  color: #909399;
  text-align: center;
  margin-bottom: 16px;
}

.popup-field {
  margin-bottom: 14px;
}

.popup-label {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  display: block;
  margin-bottom: 8px;
}

.popup-input {
  height: 40px;
  border: 1px solid #DCDFE6;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  color: #303133;
}

.tech-scroll {
  max-height: 180px;
  border: 1px solid #DCDFE6;
  border-radius: 8px;
  padding: 4px 0;
}

.tech-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #f0f0f0;
}

.tech-item:last-child {
  border-bottom: none;
}

.tech-item.selected {
  background: #ecf5ff;
}

.tech-name {
  font-size: 14px;
  color: #303133;
}

.check-mark {
  color: #409EFF;
  font-size: 16px;
  font-weight: bold;
}

.tech-empty {
  padding: 20px;
  text-align: center;
  color: #C0C4CC;
  font-size: 13px;
}

.popup-btns {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.popup-btn {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 22px;
  font-size: 15px;
}

.btn-cancel {
  background: #f5f5f5;
  color: #606266;
}

.btn-confirm {
  background: #409EFF;
  color: #fff;
}
</style>
