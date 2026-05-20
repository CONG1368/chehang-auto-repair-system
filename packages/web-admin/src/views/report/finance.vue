<template>
  <div class="page-container">
    <div class="page-header">
      <h2>财务分析</h2>
      <div class="header-actions">
        <el-radio-group v-model="days" size="small" @change="loadData">
          <el-radio-button :value="7">近7天</el-radio-button>
          <el-radio-button :value="30">近30天</el-radio-button>
          <el-radio-button :value="90">近90天</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 汇总卡片 -->
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card shadow="never">
          <el-statistic title="总收入" :value="'¥' + formatMoney(totalRevenue)" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <el-statistic title="总支出" :value="'¥' + formatMoney(totalExpense)" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <el-statistic title="净利润" :value="'¥' + formatMoney(totalRevenue - totalExpense)" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <el-statistic title="利润率" :value="profitRate + '%'" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 收入趋势 -->
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>
            <span>收入趋势</span>
          </template>
          <VChart :option="revenueOption" autoresize style="height: 300px" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <span>业务类型构成</span>
          </template>
          <VChart :option="ratioOption" autoresize style="height: 300px" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 费用构成 -->
    <el-row :gutter="16">
      <el-col :span="24">
        <el-card shadow="never">
          <template #header>
            <span>费用构成（近{{ days }}天）</span>
          </template>
          <VChart :option="expenseOption" autoresize style="height: 300px" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import VChart from 'vue-echarts';
import 'echarts';
import request from '@/api/request';

const days = ref(30);

const revenueTrend = ref<{ date: string; amount: number }[]>([]);
const businessRatio = ref<{ name: string; value: number }[]>([]);
const expenseByCategory = ref<{ category: string; total: number }[]>([]);

const totalRevenue = computed(() => revenueTrend.value.reduce((s, d) => s + d.amount, 0));
const totalExpense = computed(() => expenseByCategory.value.reduce((s, d) => s + d.total, 0));
const profitRate = computed(() => {
  if (totalRevenue.value === 0) return 0;
  return Math.round(((totalRevenue.value - totalExpense.value) / totalRevenue.value) * 100);
});

const formatMoney = (v: number) => {
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const revenueOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 70, right: 20, top: 10, bottom: 30 },
  xAxis: {
    type: 'category',
    data: revenueTrend.value.map((d) => d.date),
    axisLabel: { interval: Math.ceil(revenueTrend.value.length / 10) },
  },
  yAxis: {
    type: 'value',
    name: '元',
    axisLabel: { formatter: (v: number) => (v >= 10000 ? (v / 10000).toFixed(1) + '万' : String(v)) },
  },
  series: [
    {
      type: 'line',
      name: '收入',
      data: revenueTrend.value.map((d) => d.amount),
      smooth: true,
      areaStyle: { opacity: 0.3 },
      itemStyle: { color: '#409eff' },
    },
  ],
}));

const ratioOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
  legend: { bottom: 0 },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '40%'],
      data: businessRatio.value.filter((d) => d.value > 0),
      label: { formatter: '{b}\n{d}%' },
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      color: ['#409eff', '#67c23a', '#e6a23c'],
    },
  ],
}));

const expenseOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 60, right: 30, top: 10, bottom: 30 },
  xAxis: {
    type: 'category',
    data: expenseByCategory.value.map((e) => e.category),
  },
  yAxis: {
    type: 'value',
    name: '元',
    axisLabel: { formatter: (v: number) => (v >= 10000 ? (v / 10000).toFixed(1) + '万' : String(v)) },
  },
  series: [
    {
      type: 'bar',
      name: '费用',
      data: expenseByCategory.value.map((e) => ({
        value: e.total,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
      })),
      barWidth: 36,
      label: { show: true, position: 'top', formatter: (p: any) => '¥' + formatMoney(p.value) },
    },
  ],
}));

const loadData = async () => {
  try {
    const params = { days: days.value };
    const [trend, ratio] = await Promise.all([
      request.get('/reports/revenue-trend', { params }),
      request.get('/reports/business-ratio'),
    ]);
    revenueTrend.value = trend as any;
    businessRatio.value = ratio as any;

    // 模拟费用数据（ExpenseRecord 表暂无可读接口，后续可接入）
    // 此处展示模拟结构
    expenseByCategory.value = [
      { category: '配件采购', total: 0 },
      { category: '工资支出', total: 0 },
      { category: '水电房租', total: 0 },
      { category: '设备维护', total: 0 },
      { category: '其他', total: 0 },
    ];
  } catch (err) {
    console.error('加载财务分析失败:', err);
  }
};

onMounted(() => loadData());
</script>

<style scoped>
.page-container {
  padding: 0;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.page-header h2 {
  font-size: 18px;
  color: #303133;
  margin: 0;
}
</style>
