<template>
  <el-container class="main-layout">
    <!-- 侧边栏 -->
    <el-aside :width="sidebarHidden ? '0px' : (isCollapse ? '64px' : '220px')" class="sidebar" :class="{ 'sidebar--hidden': sidebarHidden }">
      <div class="logo">
        <img v-if="systemConfig.logo" :src="systemConfig.logo" class="logo-img" />
        <span v-show="!isCollapse" class="logo-text">{{ systemConfig.appName || '车行' }}</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
      >
        <el-menu-item index="/notifications">
          <el-icon><Bell /></el-icon>
          <span>消息中心</span>
        </el-menu-item>

        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>经营驾驶舱</span>
        </el-menu-item>

        <el-sub-menu index="/sales">
          <template #title>
            <el-icon><Sell /></el-icon>
            <span>新车销售</span>
          </template>
          <el-menu-item index="/sales/vehicles">车辆管理</el-menu-item>
          <el-menu-item index="/sales/leads">客户跟进</el-menu-item>
          <el-menu-item index="/sales/orders">报价签约</el-menu-item>
          <el-menu-item index="/sales/delivery">交车管理</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/repair">
          <template #title>
            <el-icon><Tools /></el-icon>
            <span>维修服务</span>
          </template>
          <el-menu-item index="/repair/reception">接车开单</el-menu-item>
          <el-menu-item index="/repair/orders">工单管理</el-menu-item>
          <el-menu-item index="/repair/dispatch">技师派工</el-menu-item>
          <el-menu-item index="/repair/quality">质检交车</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/beauty">
          <template #title>
            <el-icon><MagicStick /></el-icon>
            <span>美容服务</span>
          </template>
          <el-menu-item index="/beauty/services">服务项目</el-menu-item>
          <el-menu-item index="/beauty/packages">套餐管理</el-menu-item>
          <el-menu-item index="/beauty/cards">会员卡</el-menu-item>
          <el-menu-item index="/beauty/schedule">施工管理</el-menu-item>
          <el-menu-item index="/beauty/recharges">充值记录</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/finance">
          <template #title>
            <el-icon><Money /></el-icon>
            <span>财务管理</span>
          </template>
          <el-menu-item index="/finance/cashier">收银台</el-menu-item>
          <el-menu-item index="/finance/reports">对账报表</el-menu-item>
          <el-menu-item index="/finance/receivable">应收应付</el-menu-item>
          <el-menu-item index="/finance/profit">利润分析</el-menu-item>
          <el-menu-item index="/finance/payable">应付账款</el-menu-item>
          <el-menu-item index="/finance/invoice">发票管理</el-menu-item>
          <el-menu-item index="/finance/expenses">费用管理</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/inventory">
          <template #title>
            <el-icon><Box /></el-icon>
            <span>库存管理</span>
          </template>
          <el-menu-item index="/inventory/parts">配件管理</el-menu-item>
          <el-menu-item index="/inventory/stock">库存查询</el-menu-item>
          <el-menu-item index="/inventory/inbound">入库管理</el-menu-item>
          <el-menu-item index="/inventory/purchase">采购管理</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/customer">
          <template #title>
            <el-icon><User /></el-icon>
            <span>客户管理</span>
          </template>
          <el-menu-item index="/customer/list">客户档案</el-menu-item>
          <el-menu-item index="/customer/follow">跟进记录</el-menu-item>
          <el-menu-item index="/customer/remind">保养提醒</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/report">
          <template #title>
            <el-icon><DataAnalysis /></el-icon>
            <span>数据报表</span>
          </template>
          <el-menu-item index="/report/overview">数据大屏</el-menu-item>
          <el-menu-item index="/report/sales">销售分析</el-menu-item>
          <el-menu-item index="/report/repair">维修分析</el-menu-item>
          <el-menu-item index="/report/finance">财务分析</el-menu-item>
          <el-menu-item index="/report/beauty">美容统计</el-menu-item>
          <el-menu-item index="/report/performance">员工绩效</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/system">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/system/settings">系统设置</el-menu-item>
          <el-menu-item index="/system/users">用户管理</el-menu-item>
          <el-menu-item index="/system/roles">角色管理</el-menu-item>
          <el-menu-item index="/system/profile">个人设置</el-menu-item>
          <el-menu-item index="/system/logs">操作日志</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse" :size="20">
            <Fold v-if="!isCollapse" /><Expand v-else />
          </el-icon>
          <el-tooltip :content="sidebarHidden ? '显示侧边栏' : '隐藏侧边栏（全屏模式）'" placement="bottom">
            <el-icon class="collapse-btn" @click="sidebarHidden = !sidebarHidden" :size="20">
              <DArrowRight v-if="sidebarHidden" /><DArrowLeft v-else />
            </el-icon>
          </el-tooltip>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentTitle">{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <!-- 消息通知铃铛 -->
          <el-popover
            placement="bottom-end"
            :width="380"
            trigger="click"
            @show="fetchNotifications"
          >
            <template #reference>
              <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
                <el-icon :size="20" class="bell-icon"><Bell /></el-icon>
              </el-badge>
            </template>
            <div class="notification-popover">
              <div class="popover-header">
                <span>消息通知</span>
                <div>
                  <el-button link type="primary" size="small" @click="handleMarkAllRead">全部已读</el-button>
                  <el-button link type="primary" size="small" @click="handleGoNotifications">查看全部</el-button>
                </div>
              </div>
              <div v-if="recentNotifications.length === 0" class="popover-empty">暂无消息</div>
              <div
                v-for="item in recentNotifications"
                :key="item.id"
                class="popover-item"
                :class="{ unread: !item.isRead }"
                @click="handleNotificationClick(item)"
              >
                <span class="popover-item-icon">{{ typeIcon(item.type) }}</span>
                <div class="popover-item-body">
                  <div class="popover-item-title">{{ item.title }}</div>
                  <div class="popover-item-content">{{ item.content }}</div>
                  <div class="popover-item-time">{{ formatTime(item.createdAt) }}</div>
                </div>
                <span v-if="!item.isRead" class="unread-dot"></span>
              </div>
            </div>
          </el-popover>

          <span class="username" @click="router.push('/system/profile')">{{ authStore.userInfo?.realName }}</span>
          <el-dropdown>
            <el-avatar :size="32" :src="authStore.userInfo?.avatar" v-if="authStore.userInfo?.avatar" />
            <el-avatar :size="32" icon="UserFilled" v-else />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/system/profile')">个人设置</el-dropdown-item>
                <el-dropdown-item @click="authStore.logout()">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>

    <!-- 侧边栏隐藏时的浮动恢复按钮 -->
    <transition name="fade">
      <el-button
        v-if="sidebarHidden"
        class="sidebar-restore-btn"
        type="primary"
        circle
        :icon="DArrowRight"
        @click="sidebarHidden = false"
      />
    </transition>
  </el-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { connectSocket, onSocketEvent, offSocketEvent } from '@/utils/socket';
import request from '@/api/request';
import { getSystemConfig } from '@/api/system';
import { Bell, DArrowLeft, DArrowRight, Tools, Fold, Expand, Odometer, Sell, MagicStick, Money, Box, User, DataAnalysis, Setting, UserFilled } from '@element-plus/icons-vue';

const route = useRoute();
const authStore = useAuthStore();
const isCollapse = ref(false);
const sidebarHidden = ref(false);

const router = useRouter()
const systemConfig = reactive({ logo: '', appName: '车行' });
const unreadCount = ref(0)
const recentNotifications = ref<any[]>([])

async function fetchUnreadCount() {
  try {
    const res: any = await request.get('/notifications/unread-count')
    unreadCount.value = res.count ?? 0
  } catch { /* */ }
}

async function fetchNotifications() {
  try {
    const res: any = await request.get('/notifications', { params: { page: 1, pageSize: 5 } })
    recentNotifications.value = res.list ?? []
  } catch { /* */ }
}

function typeIcon(type: string): string {
  const map: Record<string, string> = { repair: '🔧', stock: '📦', customer: '👤', system: '📢', beauty: '💄', sales: '🚗', finance: '💰' }
  return map[type] || '📌'
}

function formatTime(time: string): string {
  const diff = Date.now() - new Date(time).getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return time?.slice(0, 10) || ''
}

async function handleNotificationClick(item: any) {
  if (!item.isRead) {
    await request.put(`/notifications/${item.id}/read`).catch(() => {})
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
  if (item.targetType === 'repair_order') router.push(`/repair/orders?id=${item.targetId}`)
  else if (item.targetType === 'part') router.push(`/inventory/parts?id=${item.targetId}`)
  else if (item.targetType === 'customer') router.push(`/customer/list?id=${item.targetId}`)
  else if (item.targetType === 'beauty') router.push(`/beauty/schedule?id=${item.targetId}`)
  else if (item.targetType === 'sales_lead') router.push(`/sales/leads?id=${item.targetId}`)
  else if (item.targetType === 'sales_order') router.push(`/sales/orders?id=${item.targetId}`)
  else if (item.targetType === 'payment') router.push(`/finance/cashier`)
  else if (item.targetType === 'receivable') router.push(`/finance/receivable`)
  else if (item.targetType === 'payable') router.push(`/finance/payable`)
}

async function handleMarkAllRead() {
  try { await request.put('/notifications/read-all') } catch { /* */ }
  unreadCount.value = 0
  recentNotifications.value = recentNotifications.value.map((n: any) => ({ ...n, isRead: true }))
}

function handleGoNotifications() {
  router.push('/notifications')
}

const currentTitle = computed(() => route.meta.title as string || '');
const activeMenu = computed(() => route.path);

async function loadSystemConfig() {
  try {
    const res: any = await getSystemConfig();
    if (res.logo) systemConfig.logo = res.logo;
    if (res.appName) systemConfig.appName = res.appName;
  } catch { /* ignore */ }
}

// WebSocket 实时通知回调：当服务端推送新通知时自动更新未读计数
const notificationEvents = [
  'new-repair-order', 'order-status-change', 'low-stock-alert',
  'new-customer', 'system-notification', 'new-sales-lead',
  'new-sales-order', 'order-delivered', 'new-beauty-appointment',
  'beauty-appointment-status-change', 'new-payment', 'receivable-paid',
  'payable-paid',
];

const handleWsNotification = () => {
  unreadCount.value++;
};

onMounted(() => {
  connectSocket();
  loadSystemConfig();
  fetchUnreadCount();

  // WebSocket 实时更新未读计数（替换 30 秒轮询）
  notificationEvents.forEach((event) => {
    onSocketEvent(event, handleWsNotification);
  });
});

onUnmounted(() => {
  notificationEvents.forEach((event) => {
    offSocketEvent(event, handleWsNotification);
  });
});
</script>

<style scoped>
/* 侧边栏菜单子项对齐 */
:deep(.el-sub-menu .el-menu-item) {
  padding-left: 54px !important;
  min-width: auto;
}

:deep(.el-menu-item) {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.el-sub-menu__title) {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.el-menu--collapse .el-sub-menu .el-menu-item) {
  padding-left: 50px !important;
}

.main-layout {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  overflow-y: auto;
  overflow-x: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.logo-text {
  white-space: nowrap;
}

.logo-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 4px;
}

.header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e6e6e6;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  cursor: pointer;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-size: 14px;
  color: #606266;
  cursor: pointer;
}

.main-content {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}

.bell-icon { cursor: pointer; color: #606266; }
.bell-icon:hover { color: #409EFF; }
.notification-popover { max-height: 400px; overflow-y: auto; }
.popover-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 0 12px; border-bottom: 1px solid #ebeef5; margin-bottom: 8px; font-weight: 600; }
.popover-empty { text-align: center; padding: 24px; color: #909399; font-size: 13px; }
.popover-item { display: flex; align-items: flex-start; gap: 8px; padding: 10px 0; border-bottom: 1px solid #f5f5f5; cursor: pointer; }
.popover-item.unread { background: #ecf5ff; margin: 0 -4px; padding: 10px 4px; border-radius: 4px; }
.popover-item:hover { background: #f5f7fa; }
.popover-item-icon { font-size: 16px; flex-shrink: 0; margin-top: 2px; }
.popover-item-body { flex: 1; min-width: 0; }
.popover-item-title { font-size: 13px; color: #303133; font-weight: 500; }
.popover-item-content { font-size: 12px; color: #909399; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.popover-item-time { font-size: 11px; color: #c0c4cc; margin-top: 4px; }
.unread-dot { width: 6px; height: 6px; background: #409EFF; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }

/* 侧边栏隐藏 */
.sidebar--hidden { overflow: hidden; }

/* 浮动恢复按钮 */
.sidebar-restore-btn {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 2000;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

/* 过渡动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
