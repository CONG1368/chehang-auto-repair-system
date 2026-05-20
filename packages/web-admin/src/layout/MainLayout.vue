<template>
  <el-container class="main-layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
      <div class="logo">
        <el-icon :size="24"><Tools /></el-icon>
        <span v-show="!isCollapse" class="logo-text">泰州车行维修厂</span>
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
        </el-sub-menu>

        <el-sub-menu index="/system">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/system/users">用户管理</el-menu-item>
          <el-menu-item index="/system/roles">角色管理</el-menu-item>
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
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentTitle">{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <span class="username">{{ authStore.userInfo?.realName }}</span>
          <el-dropdown>
            <el-avatar :size="32" icon="UserFilled" />
            <template #dropdown>
              <el-dropdown-menu>
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
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { connectSocket } from '@/utils/socket';

const route = useRoute();
const authStore = useAuthStore();
const isCollapse = ref(false);
const currentTitle = computed(() => route.meta.title as string || '');
const activeMenu = computed(() => route.path);

onMounted(() => {
  connectSocket();
});
</script>

<style scoped>
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
}

.main-content {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>
