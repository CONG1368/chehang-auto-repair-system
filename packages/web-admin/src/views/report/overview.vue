<template>
  <div class="dashboard-container">
    <!-- 顶部标题 -->
    <div class="dashboard-header">
      <h1 class="dashboard-title">车行综合管理系统 - 数据大屏</h1>
      <div class="dashboard-header-right">
        <span class="dashboard-time">{{ currentTime }}</span>
        <el-button type="warning" size="small" class="btn-export-pdf" @click="handlePrint">🖨️ 打印</el-button>
        <el-button size="small" class="btn-export-pdf" @click="handleExportPdf">📄 导出PDF</el-button>
      </div>
    </div>

    <!-- 主体三栏布局 -->
    <div class="dashboard-body">
      <!-- 左侧面板 30% -->
      <div class="panel panel-left">
        <!-- 今日概览数字 -->
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-icon revenue-icon">¥</div>
            <div class="stat-info">
              <span class="stat-label">今日营收</span>
              <span class="stat-value">¥{{ formatMoney(dashboard.todayRevenue) }}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon order-icon">📋</div>
            <div class="stat-info">
              <span class="stat-label">今日工单</span>
              <span class="stat-value">{{ dashboard.todayOrderCount }}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon repair-icon">🔧</div>
            <div class="stat-info">
              <span class="stat-label">在修车辆</span>
              <span class="stat-value">{{ dashboard.inRepairCount }}</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon customer-icon">👤</div>
            <div class="stat-info">
              <span class="stat-label">新增客户</span>
              <span class="stat-value">{{ dashboard.newCustomerCount }}</span>
            </div>
          </div>
        </div>

        <!-- 业务占比饼图 -->
        <div class="chart-panel">
          <h3 class="panel-title">业务占比</h3>
          <VChart :option="businessRatioOption" autoresize style="height: 260px" />
        </div>
      </div>

      <!-- 中间面板 40% -->
      <div class="panel panel-center">
        <div class="chart-panel chart-panel-large">
          <h3 class="panel-title">近30天营收趋势</h3>
          <VChart :option="revenueTrendOption" autoresize style="height: 420px" />
        </div>
      </div>

      <!-- 右侧面板 30% -->
      <div class="panel panel-right">
        <!-- 工单状态分布柱状图 -->
        <div class="chart-panel">
          <h3 class="panel-title">工单状态分布</h3>
          <VChart :option="repairStatusOption" autoresize style="height: 240px" />
        </div>

        <!-- 低库存预警 -->
        <div class="chart-panel" style="flex: 1">
          <h3 class="panel-title panel-title-warn">低库存预警</h3>
          <div class="low-stock-list" v-if="lowStockParts.length > 0">
            <div
              class="low-stock-item"
              v-for="item in lowStockParts"
              :key="item.id"
            >
              <span class="stock-name">{{ item.name }}</span>
              <span class="stock-qty">
                {{ item.currentStock }} /
                <span class="stock-safety">{{ item.safetyStock }}</span>
              </span>
            </div>
          </div>
          <div class="empty-text" v-else>暂无低库存配件</div>
        </div>
      </div>
    </div>

    <!-- 底部滚动收款记录 -->
    <div class="dashboard-footer">
      <div class="scroll-label">最近收款记录</div>
      <div class="scroll-list-wrapper">
        <div class="scroll-list">
          <span
            class="scroll-item"
            v-for="item in recentPayments"
            :key="item.id"
          >
            [{{ formatTime(item.createdAt) }}] {{ item.customerName }} -
            {{ typeName(item.type) }} ¥{{ formatMoney(item.amount) }}
            ({{ item.paymentMethod }})
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import VChart from 'vue-echarts';
import 'echarts';
import request from '@/api/request';
import { exportElementToPdf } from '@/utils/export-pdf';

const handlePrint = () => {
  window.print()
}

const handleExportPdf = () => {
  const el = document.querySelector('.dashboard-container') as HTMLElement
  if (el) {
    exportElementToPdf(el, '数据大屏')
  } else {
    console.error('未找到导出元素')
  }
}

// 当前时间
const currentTime = ref('');
let timer: ReturnType<typeof setInterval>;

const formatTime = (d: string) => {
  const date = new Date(d);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  });
};

// 工具函数
const formatMoney = (v: any) => {
  const n = Number(v) || 0;
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const typeName = (t: string) => {
  const map: Record<string, string> = { repair: '维修', sales: '销售', beauty: '美容' };
  return map[t] || t;
};

const statusName = (s: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    assigned: '已派工',
    repairing: '维修中',
    quality_check: '质检中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return map[s] || s;
};

// 仪表盘数据
const dashboard = ref({ todayRevenue: 0, todayOrderCount: 0, inRepairCount: 0, newCustomerCount: 0 });
const revenueTrend = ref<{ date: string; amount: number }[]>([]);
const businessRatio = ref<{ name: string; value: number }[]>([]);
const repairStats = ref<{ totalOrders: number; completionRate: number; byStatus: { status: string; _count: number }[] }>({
  totalOrders: 0,
  completionRate: 0,
  byStatus: [],
});
const lowStockParts = ref<{ id: number; name: string; currentStock: number; safetyStock: number }[]>([]);
const recentPayments = ref<any[]>([]);

// 营收趋势图表配置
const revenueTrendOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: { trigger: 'axis' },
  grid: { left: 50, right: 20, top: 20, bottom: 30 },
  xAxis: {
    type: 'category',
    data: revenueTrend.value.map((d) => d.date),
    axisLabel: { color: '#8899aa', fontSize: 10, interval: 4 },
    axisLine: { lineStyle: { color: '#1e3a5f' } },
  },
  yAxis: {
    type: 'value',
    name: '元',
    nameTextStyle: { color: '#8899aa' },
    axisLabel: { color: '#8899aa', formatter: (v: number) => (v >= 10000 ? (v / 10000).toFixed(1) + '万' : v) },
    splitLine: { lineStyle: { color: '#1e3a5f', type: 'dashed' } },
  },
  series: [
    {
      type: 'line',
      data: revenueTrend.value.map((d) => d.amount),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#00d4ff', width: 2 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(0, 212, 255, 0.4)' },
            { offset: 1, color: 'rgba(0, 212, 255, 0.02)' },
          ],
        },
      },
    },
  ],
}));

// 业务占比图表配置
const businessRatioOption = computed(() => {
  const data = businessRatio.value.filter((d) => d.value > 0);
  if (data.length === 0) {
    data.push({ name: '暂无数据', value: 1 });
  }
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: {
      bottom: 0,
      textStyle: { color: '#8899aa', fontSize: 11 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        label: {
          color: '#8899aa',
          formatter: '{b}\n{d}%',
          fontSize: 10,
        },
        itemStyle: {
          borderRadius: 4,
          borderColor: '#0a1a2e',
          borderWidth: 3,
        },
        color: ['#00d4ff', '#ff6b6b', '#ffd93d'],
        data,
      },
    ],
  };
});

// 工单状态柱状图配置
const repairStatusOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: { trigger: 'axis' },
  grid: { left: 60, right: 10, top: 10, bottom: 30 },
  xAxis: {
    type: 'category',
    data: repairStats.value.byStatus.map((s) => statusName(s.status)),
    axisLabel: { color: '#8899aa', fontSize: 10, rotate: 30 },
    axisLine: { lineStyle: { color: '#1e3a5f' } },
  },
  yAxis: {
    type: 'value',
    name: '单',
    nameTextStyle: { color: '#8899aa' },
    axisLabel: { color: '#8899aa' },
    splitLine: { lineStyle: { color: '#1e3a5f', type: 'dashed' } },
  },
  series: [
    {
      type: 'bar',
      data: repairStats.value.byStatus.map((s) => s._count),
      barWidth: 24,
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#00d4ff' },
            { offset: 1, color: '#0066cc' },
          ],
        },
      },
    },
  ],
}));

// 加载数据
const loadData = async () => {
  try {
    const [dash, trend, ratio, repairs, inventory, payments] = await Promise.all([
      request.get('/reports/dashboard'),
      request.get('/reports/revenue-trend', { params: { days: 30 } }),
      request.get('/reports/business-ratio'),
      request.get('/reports/repair-stats'),
      request.get('/reports/inventory-stats'),
      request.get('/reports/recent-payments', { params: { limit: 5 } }),
    ]);
    dashboard.value = dash as any;
    revenueTrend.value = trend as any;
    businessRatio.value = ratio as any;
    repairStats.value = repairs as any;
    lowStockParts.value = (inventory as any).lowStockParts || [];
    recentPayments.value = payments as any;
  } catch (err) {
    console.error('加载数据大屏数据失败:', err);
  }
};

onMounted(() => {
  updateTime();
  timer = setInterval(updateTime, 1000);
  loadData();
});

onUnmounted(() => {
  clearInterval(timer);
});
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: #0a1a2e;
  color: #e0e6ed;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  box-sizing: border-box;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* 顶部标题 */
.dashboard-header {
  text-align: center;
  padding: 10px 0 14px;
  flex-shrink: 0;
}
.dashboard-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #ffffff;
  margin: 0;
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
  background: linear-gradient(90deg, #00d4ff, #4a9eff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.dashboard-header-right {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.dashboard-time {
  display: block;
  margin-top: 6px;
  font-size: 13px;
  color: #5a7a9a;
}
.btn-export-pdf {
  margin-top: 6px;
}

@media print {
  :deep(.el-button) { display: none; }
  :deep(.el-pagination) { display: none; }
  :deep(.btn-export-pdf) { display: none; }
  .dashboard-header-right { display: none; }
}

/* 主体 */
.dashboard-body {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}
.panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.panel-left {
  width: 30%;
}
.panel-center {
  width: 40%;
}
.panel-right {
  width: 30%;
}

/* 统计卡片网格 */
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.stat-card {
  background: linear-gradient(135deg, #0d2137 0%, #132d4a 100%);
  border: 1px solid #1e3a5f;
  border-radius: 8px;
  padding: 16px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.revenue-icon {
  background: rgba(0, 212, 255, 0.15);
  color: #00d4ff;
  font-weight: 700;
}
.order-icon {
  background: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
}
.repair-icon {
  background: rgba(255, 217, 61, 0.15);
  color: #ffd93d;
}
.customer-icon {
  background: rgba(46, 213, 115, 0.15);
  color: #2ed573;
}
.stat-info {
  display: flex;
  flex-direction: column;
}
.stat-label {
  font-size: 12px;
  color: #5a7a9a;
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  margin-top: 2px;
}

/* 图表面板 */
.chart-panel {
  background: linear-gradient(135deg, #0d2137 0%, #132d4a 100%);
  border: 1px solid #1e3a5f;
  border-radius: 8px;
  padding: 14px 16px;
  flex-shrink: 0;
}
.chart-panel-large {
  flex: 1;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #c0cfdf;
  margin: 0 0 10px;
  padding-left: 10px;
  border-left: 3px solid #00d4ff;
}
.panel-title-warn {
  border-left-color: #ff6b6b;
}

/* 低库存列表 */
.low-stock-list {
  max-height: 200px;
  overflow-y: auto;
}
.low-stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid #1e3a5f;
  font-size: 13px;
}
.low-stock-item:last-child {
  border-bottom: none;
}
.stock-name {
  color: #c0cfdf;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.stock-qty {
  color: #ff6b6b;
  font-weight: 600;
  margin-left: 12px;
}
.stock-safety {
  color: #5a7a9a;
  font-weight: 400;
}
.empty-text {
  color: #5a7a9a;
  text-align: center;
  padding: 30px 0;
  font-size: 13px;
}

/* 底部滚动条 */
.dashboard-footer {
  flex-shrink: 0;
  background: linear-gradient(135deg, #0d2137 0%, #132d4a 100%);
  border: 1px solid #1e3a5f;
  border-radius: 8px;
  padding: 10px 16px;
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.scroll-label {
  font-size: 13px;
  font-weight: 600;
  color: #00d4ff;
  white-space: nowrap;
  flex-shrink: 0;
}
.scroll-list-wrapper {
  overflow: hidden;
  flex: 1;
}
.scroll-list {
  display: flex;
  gap: 40px;
  animation: scroll-left 25s linear infinite;
  white-space: nowrap;
}
.scroll-item {
  font-size: 13px;
  color: #8899aa;
  white-space: nowrap;
}

@keyframes scroll-left {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

/* 滚动条样式 */
.low-stock-list::-webkit-scrollbar {
  width: 4px;
}
.low-stock-list::-webkit-scrollbar-thumb {
  background: #1e3a5f;
  border-radius: 2px;
}
</style>
