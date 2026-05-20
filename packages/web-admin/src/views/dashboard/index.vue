<template>
  <div class="dashboard">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-card--revenue">
          <div class="stat-card__inner">
            <div class="stat-card__icon">
              <el-icon :size="36"><Money /></el-icon>
            </div>
            <div class="stat-card__info">
              <div class="stat-card__label">今日营收</div>
              <div class="stat-card__value">&yen;28,560</div>
              <div class="stat-card__trend stat-card__trend--up">
                <el-icon><Top /></el-icon> 较昨日 ↑12%
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-card--orders">
          <div class="stat-card__inner">
            <div class="stat-card__icon">
              <el-icon :size="36"><Document /></el-icon>
            </div>
            <div class="stat-card__info">
              <div class="stat-card__label">今日工单</div>
              <div class="stat-card__value">32<span class="stat-card__unit">单</span></div>
              <div class="stat-card__trend stat-card__trend--up">
                <el-icon><Top /></el-icon> 较昨日 ↑5%
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-card--repair">
          <div class="stat-card__inner">
            <div class="stat-card__icon">
              <el-icon :size="36"><Tools /></el-icon>
            </div>
            <div class="stat-card__info">
              <div class="stat-card__label">在修车辆</div>
              <div class="stat-card__value">18<span class="stat-card__unit">辆</span></div>
              <div class="stat-card__desc">其中等待交车 5 辆</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="hover" class="stat-card stat-card--customer">
          <div class="stat-card__inner">
            <div class="stat-card__icon">
              <el-icon :size="36"><User /></el-icon>
            </div>
            <div class="stat-card__info">
              <div class="stat-card__label">新增客户</div>
              <div class="stat-card__value">8<span class="stat-card__unit">人</span></div>
              <div class="stat-card__trend stat-card__trend--up">
                <el-icon><Top /></el-icon> 较昨日 ↑3
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 中间图表区 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="chart-card__header">
              <span class="chart-card__title">近30天营收趋势</span>
            </div>
          </template>
          <VChart :option="revenueChartOption" class="chart-box" autoresize />
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="chart-card__header">
              <span class="chart-card__title">业务类型占比</span>
            </div>
          </template>
          <VChart :option="bizTypeChartOption" class="chart-box" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <!-- 底部列表区 -->
    <el-row :gutter="20" class="list-row">
      <el-col :span="8">
        <el-card shadow="hover" class="list-card">
          <template #header>
            <div class="list-card__header">
              <span class="list-card__title">最近工单</span>
              <el-button text type="primary" size="small">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentOrders" stripe size="small" class="compact-table">
            <el-table-column prop="orderNo" label="工单号" width="100" />
            <el-table-column prop="customer" label="客户" min-width="80" />
            <el-table-column prop="status" label="状态" width="85" align="center">
              <template #default="{ row }">
                <el-tag :type="orderStatusType(row.status)" size="small">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="100" align="right">
              <template #default="{ row }">
                <span class="amount-text">¥{{ row.amount.toLocaleString() }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover" class="list-card">
          <template #header>
            <div class="list-card__header">
              <span class="list-card__title">库存预警</span>
              <el-button text type="primary" size="small">查看全部</el-button>
            </div>
          </template>
          <div class="alert-list">
            <div v-for="item in stockAlerts" :key="item.name" class="alert-item">
              <div class="alert-item__name">{{ item.name }}</div>
              <div class="alert-item__info">
                <span class="alert-item__stock">库存: {{ item.stock }}{{ item.unit }}</span>
                <el-tag
                  :type="item.stock <= 3 ? 'danger' : 'warning'"
                  size="small"
                  effect="dark"
                >
                  {{ item.stock <= 3 ? '告急' : '偏低' }}
                </el-tag>
              </div>
              <div class="alert-item__spec">{{ item.spec }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover" class="list-card">
          <template #header>
            <div class="list-card__header">
              <span class="list-card__title">待跟进客户</span>
              <el-button text type="primary" size="small">查看全部</el-button>
            </div>
          </template>
          <div class="follow-list">
            <div v-for="item in pendingCustomers" :key="item.name" class="follow-item">
              <div class="follow-item__avatar">
                <el-avatar :size="36" :style="{ backgroundColor: item.avatarColor }">
                  {{ item.name.slice(0, 1) }}
                </el-avatar>
              </div>
              <div class="follow-item__info">
                <div class="follow-item__name">{{ item.name }}</div>
                <div class="follow-item__desc">{{ item.intent }}</div>
              </div>
              <div class="follow-item__time">{{ item.time }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
])

// ------------------- 近30天营收趋势 -------------------
const days: string[] = []
const amounts: number[] = []
const now = new Date()
for (let i = 29; i >= 0; i--) {
  const d = new Date(now)
  d.setDate(d.getDate() - i)
  days.push(`${d.getMonth() + 1}/${d.getDate()}`)
  // 模拟营收: 基础 12000 ~ 30000 之间波动
  const base = 15000 + (i % 7) * 800
  const noise = Math.round(Math.sin(i * 0.6) * 4000 + (Math.random() - 0.5) * 3000)
  amounts.push(Math.max(8000, base + noise))
}

const revenueChartOption = reactive({
  tooltip: {
    trigger: 'axis',
    formatter: (params: any) => {
      const p = params[0]
      return `${p.axisValue}<br/>营收: <b>¥${p.data.toLocaleString()}</b>`
    }
  },
  grid: { top: 10, right: 20, bottom: 30, left: 60 },
  xAxis: {
    type: 'category',
    data: days,
    axisLabel: {
      interval: 4,
      fontSize: 11,
      color: '#909399'
    },
    axisTick: { alignWithLabel: true },
    axisLine: { lineStyle: { color: '#dcdfe6' } }
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      formatter: (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(1)}万` : `${v}`),
      fontSize: 11,
      color: '#909399'
    },
    splitLine: { lineStyle: { color: '#f2f3f5', type: 'dashed' } }
  },
  series: [
    {
      data: amounts,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      showSymbol: false,
      lineStyle: { color: '#409EFF', width: 2.5 },
      itemStyle: { color: '#409EFF' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(64,158,255,0.25)' },
            { offset: 1, color: 'rgba(64,158,255,0.02)' }
          ]
        }
      }
    }
  ]
})

// ------------------- 业务类型占比 -------------------
const bizTypeChartOption = reactive({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c}% ({d}%)'
  },
  legend: {
    bottom: 0,
    textStyle: { fontSize: 12, color: '#606266' },
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 24
  },
  series: [
    {
      type: 'pie',
      radius: ['55%', '78%'],
      center: ['50%', '48%'],
      avoidLabelOverlap: false,
      emphasis: {
        label: { fontSize: 18, fontWeight: 'bold' },
        scaleSize: 8
      },
      label: {
        show: true,
        formatter: '{b}\n{d}%',
        fontSize: 12,
        color: '#606266'
      },
      labelLine: {
        length: 18,
        length2: 24,
        lineStyle: { color: '#c0c4cc' }
      },
      itemStyle: {
        borderRadius: 4,
        borderColor: '#fff',
        borderWidth: 3
      },
      data: [
        { value: 45, name: '维修', itemStyle: { color: '#409EFF' } },
        { value: 30, name: '销售', itemStyle: { color: '#67C23A' } },
        { value: 25, name: '美容', itemStyle: { color: '#E6A23C' } }
      ],
    }
  ]
})

// ------------------- 最近工单 -------------------
interface RecentOrder {
  orderNo: string
  customer: string
  status: string
  amount: number
}

const recentOrders: RecentOrder[] = [
  { orderNo: 'GD20260519001', customer: '李明', status: '施工中', amount: 2850 },
  { orderNo: 'GD20260519002', customer: '王芳', status: '待派工', amount: 1200 },
  { orderNo: 'GD20260518003', customer: '张伟', status: '质检中', amount: 4320 },
  { orderNo: 'GD20260518004', customer: '赵丽', status: '已完工', amount: 1560 },
  { orderNo: 'GD20260517005', customer: '陈强', status: '等待配件', amount: 6800 }
]

function orderStatusType(status: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    '施工中': 'primary',
    '待派工': 'warning',
    '质检中': 'info',
    '已完工': 'success',
    '等待配件': 'danger'
  }
  return map[status] || 'info'
}

// ------------------- 库存预警 -------------------
interface StockAlert {
  name: string
  spec: string
  stock: number
  unit: string
}

const stockAlerts: StockAlert[] = [
  { name: '机油滤清器', spec: '博世 AF0267', stock: 2, unit: '个' },
  { name: '刹车片', spec: '前轮 陶瓷配方', stock: 1, unit: '套' },
  { name: '合成机油 5W-30', spec: '壳牌 4L装', stock: 3, unit: '桶' },
  { name: '空调滤芯', spec: '曼牌 CUK 26009', stock: 4, unit: '个' },
  { name: '火花塞', spec: 'NGK 双铂金', stock: 2, unit: '支' }
]

// ------------------- 待跟进客户 -------------------
interface PendingCustomer {
  name: string
  intent: string
  time: string
  avatarColor: string
}

const pendingCustomers: PendingCustomer[] = [
  { name: '刘建国', intent: '意向购买 SUV 车型', time: '今天 10:30', avatarColor: '#409EFF' },
  { name: '孙秀英', intent: '咨询保养套餐', time: '今天 09:15', avatarColor: '#67C23A' },
  { name: '周明华', intent: '询价维修大灯', time: '昨天 16:40', avatarColor: '#E6A23C' },
  { name: '吴小红', intent: '美容镀晶咨询', time: '昨天 14:20', avatarColor: '#F56C6C' },
  { name: '郑志远', intent: '二手车置换评估', time: '昨天 11:00', avatarColor: '#909399' }
]
</script>

<style scoped>
.dashboard {
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ===== 统计卡片 ===== */
.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  border: none;
  border-radius: 8px;
  overflow: hidden;
}

.stat-card :deep(.el-card__body) {
  padding: 24px 20px;
}

.stat-card__inner {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-card__icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card--revenue .stat-card__icon {
  background: linear-gradient(135deg, #409EFF, #66b1ff);
  color: #fff;
}
.stat-card--orders .stat-card__icon {
  background: linear-gradient(135deg, #67C23A, #85ce61);
  color: #fff;
}
.stat-card--repair .stat-card__icon {
  background: linear-gradient(135deg, #E6A23C, #ebb563);
  color: #fff;
}
.stat-card--customer .stat-card__icon {
  background: linear-gradient(135deg, #F56C6C, #f78989);
  color: #fff;
}

.stat-card__label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.stat-card__value {
  font-size: 26px;
  font-weight: 700;
  color: #303133;
  letter-spacing: 0.5px;
  line-height: 1.2;
}

.stat-card__unit {
  font-size: 14px;
  font-weight: 400;
  color: #909399;
  margin-left: 2px;
}

.stat-card__trend {
  font-size: 12px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.stat-card__trend--up {
  color: #67C23A;
}

.stat-card__desc {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* ===== 图表区 ===== */
.chart-row {
  margin-bottom: 20px;
}

.chart-card {
  border-radius: 8px;
  border: none;
}

.chart-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-card__title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.chart-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #f2f3f5;
}

.chart-card :deep(.el-card__body) {
  padding: 16px 8px 8px 8px;
}

.chart-box {
  width: 100%;
  height: 340px;
}

/* ===== 底部列表 ===== */
.list-row {
  margin-bottom: 0;
}

.list-card {
  border-radius: 8px;
  border: none;
}

.list-card :deep(.el-card__header) {
  padding: 14px 20px;
  border-bottom: 1px solid #f2f3f5;
}

.list-card :deep(.el-card__body) {
  padding: 0;
}

.list-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-card__title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

/* 工单表格 */
.compact-table {
  font-size: 13px;
}

.compact-table :deep(.el-table__header th) {
  background: #fafafa;
  color: #606266;
  font-weight: 600;
  font-size: 12px;
}

.amount-text {
  font-weight: 600;
  color: #303133;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

/* 库存预警列表 */
.alert-list {
  padding: 4px 0;
}

.alert-item {
  padding: 10px 20px;
  border-bottom: 1px solid #f2f3f5;
  transition: background 0.2s;
}

.alert-item:last-child {
  border-bottom: none;
}

.alert-item:hover {
  background: #fafafa;
}

.alert-item__name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.alert-item__info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.alert-item__stock {
  font-size: 12px;
  color: #909399;
}

.alert-item__spec {
  font-size: 11px;
  color: #c0c4cc;
}

/* 待跟进客户列表 */
.follow-list {
  padding: 4px 0;
}

.follow-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid #f2f3f5;
  transition: background 0.2s;
}

.follow-item:last-child {
  border-bottom: none;
}

.follow-item:hover {
  background: #fafafa;
}

.follow-item__avatar {
  flex-shrink: 0;
}

.follow-item__info {
  flex: 1;
  min-width: 0;
}

.follow-item__name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 2px;
}

.follow-item__desc {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.follow-item__time {
  flex-shrink: 0;
  font-size: 11px;
  color: #c0c4cc;
}
</style>
