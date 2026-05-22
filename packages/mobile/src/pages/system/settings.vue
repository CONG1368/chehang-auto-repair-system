<template>
  <view class="page">
    <!-- 非管理员提示 -->
    <view v-if="!isAdmin" class="no-permission">
      <text>仅系统管理员可访问此页面</text>
    </view>

    <!-- 加载中 -->
    <view v-if="isAdmin && loading" class="empty-hint">
      <text>加载中...</text>
    </view>

    <!-- 加载失败 -->
    <view v-if="isAdmin && loadError" class="empty-hint">
      <text>配置加载失败，请下拉刷新重试</text>
    </view>

    <!-- 设置表单 -->
    <scroll-view
      v-if="isAdmin && !loading && !loadError"
      scroll-y
      class="settings-scroll"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 基本信息 -->
      <view class="section">
        <view class="section-title">
          <text>基本信息</text>
        </view>
        <view v-for="item in basicFields" :key="item.key" class="form-item">
          <text class="form-label">{{ item.label }}</text>
          <input
            class="form-input"
            v-model="config[item.key]"
            :placeholder="item.placeholder"
            :disabled="saving"
          />
        </view>
      </view>

      <!-- 业务规则 -->
      <view class="section">
        <view class="section-title">
          <text>业务规则</text>
        </view>
        <view v-for="item in businessFields" :key="item.key" class="form-item">
          <text class="form-label">{{ item.label }}</text>
          <input
            class="form-input"
            v-model="config[item.key]"
            :placeholder="item.placeholder"
            type="digit"
            :disabled="saving"
          />
        </view>
      </view>

      <!-- 系统开关 -->
      <view class="section">
        <view class="section-title">
          <text>系统开关</text>
        </view>
        <view v-for="item in switchFields" :key="item.key" class="form-item switch-item">
          <text class="form-label">{{ item.label }}</text>
          <switch
            :checked="config[item.key] === 'true'"
            @change="(e: any) => config[item.key] = e.detail.value ? 'true' : 'false'"
            :disabled="saving"
            color="#409EFF"
          />
        </view>
      </view>

      <!-- 保存按钮 -->
      <view class="save-area">
        <view class="save-btn" @click="saveConfig">
          <text>{{ saving ? '保存中...' : '保存设置' }}</text>
        </view>
      </view>

      <view class="bottom-spacer" />
    </scroll-view>
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

// 判断管理员：检查 permissions 是否包含 '*'
const isAdmin = computed(() => {
  if (!authStore.userInfo) return false;
  const perms = authStore.userInfo.permissions;
  if (!perms) return false;
  if (Array.isArray(perms)) return perms.includes('*');
  if (typeof perms === 'string') {
    try {
      const arr = JSON.parse(perms);
      return Array.isArray(arr) && arr.includes('*');
    } catch {
      return perms === '*';
    }
  }
  return false;
});

const basicFields = [
  { key: 'appName', label: '企业名称', placeholder: '请输入企业名称' },
  { key: 'description', label: '系统描述', placeholder: '请输入系统描述' },
  { key: 'contactPhone', label: '联系电话', placeholder: '请输入联系电话' },
  { key: 'address', label: '地址', placeholder: '请输入地址' },
  { key: 'businessHours', label: '营业时间', placeholder: '如：周一至周六 8:00-18:00' },
];

const businessFields = [
  { key: 'hourlyRate', label: '工时费（元/小时）', placeholder: '请输入工时费' },
  { key: 'maxDiscount', label: '最大折扣（%）', placeholder: '请输入最大折扣' },
  { key: 'minRecharge', label: '最低充值（元）', placeholder: '请输入最低充值额' },
  { key: 'safetyStock', label: '安全库存', placeholder: '请输入安全库存数' },
  { key: 'maxStock', label: '最大库存', placeholder: '请输入最大库存数' },
];

const switchFields = [
  { key: 'smsEnabled', label: '短信通知' },
  { key: 'autoGenerateOrderNo', label: '自动生成单号' },
  { key: 'requireCheckPhoto', label: '要求质检照片' },
];

const config = ref<Record<string, string>>({});
const loading = ref(false);
const refreshing = ref(false);
const loadError = ref(false);
const saving = ref(false);

function fetchConfig() {
  loading.value = true;
  loadError.value = false;
  apiFetch<Record<string, string>>({ url: '/system/config' })
    .then((data) => {
      config.value = data || {};
    })
    .catch(() => {
      loadError.value = true;
    })
    .finally(() => {
      loading.value = false;
      refreshing.value = false;
    });
}

async function onRefresh() {
  refreshing.value = true;
  await fetchConfig();
}

function saveConfig() {
  saving.value = true;
  apiFetch({
    url: '/system/config',
    method: 'PUT',
    data: config.value,
  })
    .then(() => {
      uni.showToast({ title: '保存成功', icon: 'success' });
    })
    .catch(() => {})
    .finally(() => {
      saving.value = false;
    });
}

onMounted(() => {
  if (isAdmin.value) {
    fetchConfig();
  }
});
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
}
.no-permission {
  padding: 200rpx 32rpx;
  text-align: center;
  font-size: 28rpx;
  color: #999;
}
.empty-hint {
  padding: 200rpx 32rpx;
  text-align: center;
  font-size: 28rpx;
  color: #999;
}
.settings-scroll {
  height: 100vh;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
}
.section {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 1px solid #f5f5f5;
}
.form-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1px solid #f9f9f9;
}
.form-item:last-child {
  border-bottom: none;
}
.form-label {
  width: 160rpx;
  font-size: 28rpx;
  color: #333;
  flex-shrink: 0;
}
.form-input {
  flex: 1;
  height: 64rpx;
  font-size: 28rpx;
  color: #666;
  text-align: right;
  background: #fafafa;
  border-radius: 8rpx;
  padding: 0 16rpx;
  box-sizing: border-box;
}
.switch-item {
  justify-content: space-between;
}
.switch-item .form-label {
  width: auto;
  flex: 1;
}
.save-area {
  padding: 40rpx 0;
}
.save-btn {
  background: #409EFF;
  color: #fff;
  text-align: center;
  padding: 28rpx 0;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: bold;
}
.bottom-spacer {
  height: 60rpx;
}
</style>
