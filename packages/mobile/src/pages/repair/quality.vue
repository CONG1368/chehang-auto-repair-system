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
        <text>{{ currentTab === 'checking' ? '暂无待质检工单' : '暂无质检记录' }}</text>
      </view>

      <!-- 待质检列表 -->
      <template v-if="currentTab === 'checking'">
        <view v-for="order in list" :key="order.id" class="card">
          <view class="card-header">
            <text class="order-no">{{ order.orderNo || order.id }}</text>
            <text class="order-status" style="color: #909399;">待质检</text>
          </view>
          <view class="card-info">
            <text class="card-plate">{{ order.plateNumber || '未知车牌' }}</text>
            <text class="card-customer">{{ order.customer?.name || '未知客户' }}</text>
          </view>
          <view class="card-desc" v-if="order.faultDesc">
            <text class="desc-text">故障：{{ order.faultDesc }}</text>
          </view>
          <view class="card-amount" v-if="order.totalAmount">
            <text class="amount-label">预计金额：</text>
            <text class="amount-value">￥{{ Number(order.totalAmount).toFixed(2) }}</text>
          </view>
          <view class="card-footer">
            <text class="card-time">{{ formatTime(order.createdAt) }}</text>
            <view class="footer-actions">
              <view class="action-btn deliver-btn" @click.stop="openDeliverConfirm(order)">
                <text>交车</text>
              </view>
              <view class="action-btn check-btn" @click.stop="openQualityPopup(order)">
                <text>质检</text>
              </view>
            </view>
          </view>
        </view>
      </template>

      <!-- 质检记录列表 -->
      <template v-if="currentTab === 'records'">
        <view v-for="record in list" :key="record.id" class="card">
          <view class="card-header">
            <text class="order-no">{{ record.repairOrder?.orderNo || record.repairOrderId || record.id }}</text>
            <text
              class="order-status"
              :style="{ color: record.isPassed === 1 ? '#67C23A' : '#F56C6C' }"
            >
              {{ record.isPassed === 1 ? '通过' : '不通过' }}
            </text>
          </view>
          <view class="card-info" v-if="record.repairOrder">
            <text class="card-plate">{{ record.repairOrder.plateNumber || '未知车牌' }}</text>
            <text class="card-customer">{{ record.repairOrder.customer?.name || '未知客户' }}</text>
          </view>
          <view class="card-meta">
            <text>质检人：{{ record.checker?.name || record.checker?.realName || '未知' }}</text>
            <text>{{ formatTime(record.createdAt) }}</text>
          </view>
          <view class="card-meta" v-if="record.remark">
            <text class="remark-text">备注：{{ record.remark }}</text>
          </view>
          <view class="card-meta">
            <text :style="{ color: record.repairOrder?.status === 'delivered' ? '#67C23A' : '#E6A23C', fontSize: '13px' }">
              {{ record.repairOrder?.status === 'delivered' ? '已交车' : '未交车' }}
            </text>
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

    <!-- 质检弹窗 -->
    <view class="popup-mask" v-if="showQualityPopup" @click="cancelQualityPopup">
      <view class="popup-panel" @click.stop>
        <text class="popup-title">质检确认</text>
        <text class="popup-subtitle">工单：{{ qualityOrder?.orderNo }}</text>

        <view class="popup-field">
          <text class="popup-label">质检结论</text>
          <view class="result-options">
            <view
              class="result-option"
              :class="{ active: qualityForm.isPassed === 1 }"
              @click="qualityForm.isPassed = 1"
            >
              <text>通过</text>
            </view>
            <view
              class="result-option fail"
              :class="{ active: qualityForm.isPassed === 0 }"
              @click="qualityForm.isPassed = 0"
            >
              <text>不通过</text>
            </view>
          </view>
        </view>

        <view class="popup-field">
          <text class="popup-label">质检备注</text>
          <textarea
            v-model="qualityForm.remark"
            placeholder="请填写质检备注（选填）"
            class="popup-textarea"
            maxlength="500"
          />
        </view>

        <view class="popup-field" v-if="qualityForm.isPassed === 0">
          <text class="popup-label" style="color: #F56C6C;">
            不通过时工单将退回「维修中」状态，技师需重新维修
          </text>
        </view>

        <view class="popup-btns">
          <view class="popup-btn btn-cancel" @click="cancelQualityPopup">
            <text>取消</text>
          </view>
          <view class="popup-btn btn-confirm" @click="submitQualityCheck">
            <text>确认提交</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 交车确认弹窗 -->
    <view class="popup-mask" v-if="showDeliverPopup" @click="cancelDeliverPopup">
      <view class="popup-panel" @click.stop>
        <text class="popup-title">确认交车</text>
        <text class="popup-subtitle">
          确认将工单 {{ deliverOrder?.orderNo }} 标记为已交车？
        </text>
        <text class="popup-note">
          车牌：{{ deliverOrder?.plateNumber }} | 客户：{{ deliverOrder?.customer?.name || '未知' }}
        </text>

        <view class="popup-btns">
          <view class="popup-btn btn-cancel" @click="cancelDeliverPopup">
            <text>取消</text>
          </view>
          <view class="popup-btn btn-confirm" @click="submitDeliver">
            <text>确认交车</text>
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
  { label: '待质检', value: 'checking' },
  { label: '质检记录', value: 'records' },
];

const currentTab = ref('checking');
const list = ref<any[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const loadingMore = ref(false);
const noMore = ref(false);
let page = 1;

// 质检弹窗
const showQualityPopup = ref(false);
const qualityOrder = ref<any>(null);
const qualityForm = ref({ isPassed: 1, remark: '' });

// 交车弹窗
const showDeliverPopup = ref(false);
const deliverOrder = ref<any>(null);

// ---- 工具函数 ----

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
  if (currentTab.value === 'checking') {
    fetchQualityCheckOrders();
  } else {
    fetchQualityRecords();
  }
}

function fetchQualityCheckOrders() {
  const url = `/repair?page=${page}&pageSize=20&status=quality_check`;
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

function fetchQualityRecords() {
  // 获取已质检的工单列表（completed 和 delivered 状态）
  const url = `/repair?page=${page}&pageSize=20&status=completed`;
  apiFetch<any>({ url })
    .then((data) => {
      const orders = data?.list ?? data ?? [];
      if (page === 1) {
        list.value = [];
      }
      // 为每个工单获取质检详情
      fetchQualityDetailsForOrders(orders);
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

// 异步获取每个工单的质检记录
function fetchQualityDetailsForOrders(orders: any[]) {
  if (orders.length === 0) {
    noMore.value = true;
    return;
  }

  let loaded = 0;
  orders.forEach((order) => {
    apiFetch<any>({ url: `/repair/${order.id}` })
      .then((detail) => {
        if (detail.qualityCheck) {
          list.value.push({
            ...detail.qualityCheck,
            repairOrder: {
              id: order.id,
              orderNo: order.orderNo,
              plateNumber: order.plateNumber,
              customer: order.customer,
              status: order.status,
            },
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        loaded++;
        if (loaded === orders.length) {
          if (orders.length < 20) {
            noMore.value = true;
          }
        }
      });
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

// ---- 质检操作 ----

function openQualityPopup(order: any) {
  qualityOrder.value = order;
  qualityForm.value = { isPassed: 1, remark: '' };
  showQualityPopup.value = true;
}

function cancelQualityPopup() {
  showQualityPopup.value = false;
  qualityOrder.value = null;
}

function submitQualityCheck() {
  const checkerId = authStore.userInfo?.id || 1;

  const payload = {
    repairOrderId: qualityOrder.value.id,
    checkerId,
    isPassed: qualityForm.value.isPassed,
    remark: qualityForm.value.remark || undefined,
  };

  uni.showLoading({ title: '提交质检...' });
  apiFetch({ url: '/repair/quality-check', method: 'POST', data: payload })
    .then(() => {
      const msg = qualityForm.value.isPassed === 1 ? '质检通过' : '质检不通过，已退回维修';
      uni.showToast({ title: msg, icon: 'success' });
      showQualityPopup.value = false;
      qualityOrder.value = null;
      page = 1;
      list.value = [];
      fetchQualityCheckOrders();
    })
    .catch(() => {})
    .finally(() => uni.hideLoading());
}

// ---- 交车操作 ----

function openDeliverConfirm(order: any) {
  // 只有已完成（质检通过后）的工单才能交车
  if (order.status !== 'completed') {
    uni.showToast({ title: '当前工单尚未完成质检，无法交车', icon: 'none' });
    return;
  }
  deliverOrder.value = order;
  showDeliverPopup.value = true;
}

function cancelDeliverPopup() {
  showDeliverPopup.value = false;
  deliverOrder.value = null;
}

function submitDeliver() {
  if (!deliverOrder.value) return;

  uni.showLoading({ title: '交车处理中...' });
  apiFetch({ url: `/repair/${deliverOrder.value.id}/deliver`, method: 'PUT' })
    .then(() => {
      uni.showToast({ title: '交车成功', icon: 'success' });
      showDeliverPopup.value = false;
      deliverOrder.value = null;
      page = 1;
      list.value = [];
      fetchQualityCheckOrders();
    })
    .catch(() => {})
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

.card-amount {
  margin-bottom: 6px;
}

.amount-label {
  font-size: 13px;
  color: #909399;
}

.amount-value {
  font-size: 15px;
  color: #F56C6C;
  font-weight: bold;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 13px;
  color: #606266;
}

.remark-text {
  color: #909399;
  font-size: 12px;
  flex: 1;
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

.footer-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  color: #fff;
}

.check-btn {
  background: #409EFF;
}

.deliver-btn {
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
  margin-bottom: 8px;
}

.popup-note {
  font-size: 13px;
  color: #606266;
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

.popup-textarea {
  width: 100%;
  height: 80px;
  border: 1px solid #DCDFE6;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: #303133;
  box-sizing: border-box;
}

.result-options {
  display: flex;
  gap: 12px;
}

.result-option {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 8px;
  border: 2px solid #DCDFE6;
  font-size: 15px;
  color: #606266;
}

.result-option.active {
  border-color: #67C23A;
  background: #f0f9eb;
  color: #67C23A;
  font-weight: bold;
}

.result-option.fail.active {
  border-color: #F56C6C;
  background: #fef0f0;
  color: #F56C6C;
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
