<template>
  <view class="page">
    <view class="section">
      <text class="section-title">客户信息</text>
      <view class="search-box">
        <u-search
          v-model="customerKeyword"
          placeholder="搜索客户姓名/电话"
          @search="searchCustomers"
          @clear="clearCustomers"
          :show-action="false"
        />
      </view>
      <scroll-view scroll-y class="customer-list" v-if="showCustomerList && customers.length > 0">
        <view
          v-for="item in customers"
          :key="item.id"
          class="customer-item"
          @click="selectCustomer(item)"
        >
          <text class="customer-name">{{ item.name }}</text>
          <text class="customer-phone">{{ item.phone }}</text>
        </view>
      </scroll-view>
      <view class="selected-customer" v-if="selectedCustomer">
        <u-cell-group>
          <u-cell :title="selectedCustomer.name" :value="selectedCustomer.phone" />
        </u-cell-group>
      </view>
    </view>

    <view class="section" v-if="selectedCustomer">
      <text class="section-title">选择车辆</text>
      <u-cell-group>
        <u-cell
          v-for="v in vehicles"
          :key="v.id"
          :title="v.plateNumber"
          :label="v.model || '未知车型'"
          :value="selectedVehicle && selectedVehicle.id === v.id ? '已选' : ''"
          @click="selectedVehicle = v"
        />
      </u-cell-group>
      <view v-if="vehicles.length === 0" class="empty-hint">暂无车辆</view>
    </view>

    <view class="section" v-if="selectedVehicle">
      <text class="section-title">故障描述</text>
      <u-textarea
        v-model="faultDesc"
        placeholder="请描述车辆故障现象..."
        maxlength="500"
        height="120"
      />
    </view>

    <view class="section" v-if="selectedVehicle">
      <text class="section-title">维修项目</text>
      <view v-for="(item, index) in repairItems" :key="index" class="repair-item">
        <u-input v-model="item.name" placeholder="维修项目名称" />
        <view class="repair-item-row">
          <u-input v-model="item.price" placeholder="单价" type="number" class="flex-1" />
          <u-button type="error" size="mini" @click="removeRepairItem(index)">删除</u-button>
        </view>
      </view>
      <u-button type="info" size="small" @click="addRepairItem" class="mt-10">+ 添加项目</u-button>
    </view>

    <view class="section" v-if="selectedVehicle">
      <text class="section-title">预计完工时间</text>
      <u-datetime-picker
        :show="showDatePicker"
        v-model="datePickerValue"
        mode="datetime"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
      <u-cell
        :title="expectedFinishTime ? expectedFinishTime : '请选择预计完工时间'"
        is-link
        @click="showDatePicker = true"
      />
    </view>

    <view class="submit-area" v-if="selectedVehicle">
      <u-button
        type="primary"
        :loading="submitting"
        @click="submitOrder"
        block
      >提交开单</u-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
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

const customerKeyword = ref('');
const showCustomerList = ref(false);
const customers = ref<any[]>([]);
const selectedCustomer = ref<any>(null);
const vehicles = ref<any[]>([]);
const selectedVehicle = ref<any>(null);
const faultDesc = ref('');
const repairItems = ref<{ name: string; price: string }[]>([]);
const expectedFinishTime = ref('');
const showDatePicker = ref(false);
const datePickerValue = ref(Date.now());
const submitting = ref(false);

function searchCustomers() {
  if (!customerKeyword.value.trim()) {
    uni.showToast({ title: '请输入搜索关键词', icon: 'none' });
    return;
  }
  uni.showLoading({ title: '搜索中...' });
  apiFetch<any[]>({ url: `/customers?keyword=${encodeURIComponent(customerKeyword.value)}` })
    .then((data) => {
      customers.value = data || [];
      showCustomerList.value = true;
    })
    .catch(() => {})
    .finally(() => uni.hideLoading());
}

function clearCustomers() {
  customers.value = [];
  showCustomerList.value = false;
}

function selectCustomer(customer: any) {
  selectedCustomer.value = customer;
  selectedVehicle.value = null;
  showCustomerList.value = false;
  customers.value = [];
  vehicles.value = [];
  customerKeyword.value = customer.name;

  uni.showLoading({ title: '加载车辆...' });
  apiFetch<any[]>({ url: `/customers/${customer.id}/vehicles` })
    .then((data) => {
      vehicles.value = data || [];
    })
    .catch(() => {})
    .finally(() => uni.hideLoading());
}

function addRepairItem() {
  repairItems.value.push({ name: '', price: '' });
}

function removeRepairItem(index: number) {
  repairItems.value.splice(index, 1);
}

function onDateConfirm(e: any) {
  const d = new Date(e.value);
  const pad = (n: number) => String(n).padStart(2, '0');
  expectedFinishTime.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  showDatePicker.value = false;
}

function submitOrder() {
  if (!selectedCustomer.value) {
    uni.showToast({ title: '请选择客户', icon: 'none' });
    return;
  }
  if (!selectedVehicle.value) {
    uni.showToast({ title: '请选择车辆', icon: 'none' });
    return;
  }
  if (!faultDesc.value.trim()) {
    uni.showToast({ title: '请填写故障描述', icon: 'none' });
    return;
  }
  if (repairItems.value.length === 0) {
    uni.showToast({ title: '请添加维修项目', icon: 'none' });
    return;
  }
  if (!expectedFinishTime.value) {
    uni.showToast({ title: '请选择预计完工时间', icon: 'none' });
    return;
  }

  submitting.value = true;
  const payload = {
    customerId: selectedCustomer.value.id,
    vehicleId: selectedVehicle.value.id,
    faultDescription: faultDesc.value,
    repairItems: repairItems.value.map(item => ({
      name: item.name,
      price: Number(item.price) || 0,
    })),
    expectedFinishTime: expectedFinishTime.value,
  };

  apiFetch({ url: '/repair', method: 'POST', data: payload })
    .then(() => {
      uni.showToast({ title: '开单成功', icon: 'success' });
      resetForm();
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    })
    .catch(() => {})
    .finally(() => { submitting.value = false; });
}

function resetForm() {
  customerKeyword.value = '';
  selectedCustomer.value = null;
  vehicles.value = [];
  selectedVehicle.value = null;
  faultDesc.value = '';
  repairItems.value = [];
  expectedFinishTime.value = '';
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
.search-box {
  margin-bottom: 8px;
}
.customer-list {
  max-height: 200px;
  background: #fafafa;
  border-radius: 8px;
  margin-top: 8px;
}
.customer-item {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.customer-name {
  font-size: 14px;
  color: #303133;
}
.customer-phone {
  font-size: 13px;
  color: #909399;
}
.selected-customer {
  margin-top: 8px;
}
.empty-hint {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 20px;
}
.repair-item {
  background: #fafafa;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 10px;
}
.repair-item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}
.flex-1 {
  flex: 1;
}
.mt-10 {
  margin-top: 10px;
}
.submit-area {
  padding: 16px 0 30px;
}
</style>
