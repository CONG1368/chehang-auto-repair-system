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
        <el-button type="success" size="small" style="margin-left: 12px" @click="handleExportExcel">📥 导出Excel</el-button>
        <el-button size="small" @click="handleExportPdf" style="margin-left: 8px">📄 导出PDF</el-button>
        <el-button type="warning" size="small" style="margin-left: 8px" @click="handlePrint">🖨️ 打印</el-button>
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
import { ElMessage } from 'element-plus';
import VChart from 'vue-echarts';
import 'echarts';
import request from '@/api/request';
import { downloadFile } from '@/utils/download';
import { exportTableToPdf } from '@/utils/export-pdf';

const handleExportExcel = () => {
  downloadFile('/api/export/excel?module=report', '财务报表.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

const handlePrint = () => {
  window.print()
}

const handleExportPdf = () => {
  // 导出收入趋势 + 费用构成
  const revenueData = revenueTrend.value.map((d: any) => ({
    日期: d.date,
    收入: `¥${formatMoney(d.amount)}`,
  }))
  const expenseData = expenseByCategory.value.map((e: any) => ({
    类别: e.category,
    费用: `¥${formatMoney(e.total)}`,
  }))

  // 合并为一张报表
  exportTableToPdf(
    `财务分析报表（近${days.value}天）`,
    [
      { header: '日期', dataKey: '日期' },
      { header: '收入', dataKey: '收入' },
    ],
    revenueData,
    '财务报表',
  )
}

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

    // 计算费用汇总查询的日期范围（最近N天）
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days.value + 1);
    const dateParams = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };

    const [trend, ratio, expenseSummary] = await Promise.all([
      request.get('/reports/revenue-trend', { params }),
      request.get('/reports/business-ratio'),
      request.get('/finance/expenses/summary', { params: dateParams }),
    ]);
    revenueTrend.value = trend as any;
    businessRatio.value = ratio as any;

    // 将后端返回的 { "配件采购": 123, ... } 转换为图表所需的 [{ category, total }, ...] 格式
    const summary = expenseSummary as any;
    if (summary && summary.byCategory) {
      expenseByCategory.value = Object.entries(summary.byCategory).map(([category, total]) => ({
        category,
        total: Number(total),
      }));
    } else {
      expenseByCategory.value = [];
    }
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

@media print {
  :deep(.el-button) { display: none; }
  :deep(.el-pagination) { display: none; }
}
</style>
