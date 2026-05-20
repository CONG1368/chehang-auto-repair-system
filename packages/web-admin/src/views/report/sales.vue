<template>
  <div class="page-container">
    <div class="page-header">
      <h2>销售分析</h2>
    </div>

    <!-- 汇总卡片 -->
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card shadow="never">
          <el-statistic title="已售车辆总数" :value="totalSold" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <el-statistic title="品牌数量" :value="brandCount" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 品牌销量柱状图 -->
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="24">
        <el-card shadow="never">
          <template #header>
            <span>品牌销量统计</span>
          </template>
          <VChart :option="brandChartOption" autoresize style="height: 360px" />
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

const vehicleStats = ref<{ brand: string; _count: number }[]>([]);
const totalSold = computed(() => vehicleStats.value.reduce((s, v) => s + v._count, 0));
const brandCount = computed(() => vehicleStats.value.length);

const brandChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 60, right: 30, top: 20, bottom: 40 },
  xAxis: {
    type: 'category',
    data: vehicleStats.value.map((v) => v.brand || '未知'),
    axisLabel: { rotate: 30 },
  },
  yAxis: {
    type: 'value',
    name: '辆',
    minInterval: 1,
  },
  series: [
    {
      type: 'bar',
      name: '销量',
      data: vehicleStats.value.map((v) => v._count),
      barWidth: 40,
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#409eff' },
            { offset: 1, color: '#79bbff' },
          ],
        },
      },
      label: {
        show: true,
        position: 'top',
        color: '#333',
        fontWeight: 'bold',
      },
    },
  ],
}));

onMounted(async () => {
  try {
    const res = await request.get('/reports/sales-stats');
    vehicleStats.value = (res as any).vehicleStats || [];
  } catch (err) {
    console.error('加载销售分析失败:', err);
  }
});
</script>

<style scoped>
.page-container {
  padding: 0;
}
.page-header {
  margin-bottom: 20px;
}
.page-header h2 {
  font-size: 18px;
  color: #303133;
}
</style>
