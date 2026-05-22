<template>
  <div class="page-container">
    <div class="page-header">
      <h2>维修分析</h2>
      <div class="header-actions">
        <el-button type="success" @click="handleExportExcel">📥 导出Excel</el-button>
        <el-button @click="handleExportPdf">📄 导出PDF</el-button>
        <el-button type="warning" @click="handlePrint">🖨️ 打印</el-button>
      </div>
    </div>

    <!-- 汇总卡片 -->
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card shadow="never">
          <el-statistic title="工单总数" :value="stats.totalOrders" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <el-statistic title="完工率" :value="stats.completionRate + '%'" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <el-statistic title="已完成工单" :value="completedCount" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <el-statistic title="进行中工单" :value="inProgressCount" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 工单状态分布 -->
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>
            <span>工单状态分布</span>
          </template>
          <VChart :option="statusChartOption" autoresize style="height: 340px" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>
            <span>状态明细</span>
          </template>
          <el-table :data="statusTableData" size="small" stripe>
            <el-table-column prop="name" label="状态" width="80" />
            <el-table-column prop="count" label="数量" width="60" align="center" />
            <el-table-column label="占比" width="80" align="center">
              <template #default="{ row }">
                <el-progress
                  :percentage="row.percent"
                  :stroke-width="8"
                  :show-text="false"
                  :color="row.color"
                />
              </template>
            </el-table-column>
          </el-table>
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
  downloadFile('/api/export/excel?module=report', '维修报表.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

const handlePrint = () => {
  window.print()
}

const handleExportPdf = () => {
  exportTableToPdf(
    '维修工单状态分布',
    [
      { header: '状态', dataKey: 'name' },
      { header: '数量', dataKey: 'count' },
      { header: '占比(%)', dataKey: 'percent' },
    ],
    statusTableData.value,
    '维修报表',
  )
}

const statusMap: Record<string, string> = {
  pending: '待处理',
  assigned: '已派工',
  repairing: '维修中',
  quality_check: '质检中',
  completed: '已完成',
  cancelled: '已取消',
};

const statusColors: Record<string, string> = {
  pending: '#e6a23c',
  assigned: '#409eff',
  repairing: '#67c23a',
  quality_check: '#909399',
  completed: '#67c23a',
  cancelled: '#f56c6c',
};

const stats = ref({ totalOrders: 0, completionRate: 0, byStatus: [] as { status: string; _count: number }[] });

const completedCount = computed(
  () => stats.value.byStatus.find((s) => s.status === 'completed')?._count || 0,
);
const inProgressCount = computed(
  () =>
    stats.value.byStatus
      .filter((s) => ['pending', 'assigned', 'repairing', 'quality_check'].includes(s.status))
      .reduce((sum, s) => sum + s._count, 0),
);

const statusTableData = computed(() =>
  stats.value.byStatus.map((s) => ({
    name: statusMap[s.status] || s.status,
    count: s._count,
    percent: stats.value.totalOrders > 0 ? Math.round((s._count / stats.value.totalOrders) * 100) : 0,
    color: statusColors[s.status] || '#909399',
  })),
);

const statusChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 60, right: 20, top: 20, bottom: 30 },
  xAxis: {
    type: 'category',
    data: stats.value.byStatus.map((s) => statusMap[s.status] || s.status),
    axisLabel: { rotate: 30 },
  },
  yAxis: {
    type: 'value',
    name: '单',
    minInterval: 1,
  },
  series: [
    {
      type: 'bar',
      name: '工单数',
      data: stats.value.byStatus.map((s) => ({
        value: s._count,
        itemStyle: { color: statusColors[s.status] || '#909399' },
      })),
      barWidth: 40,
      itemStyle: { borderRadius: [6, 6, 0, 0] },
      label: { show: true, position: 'top', fontWeight: 'bold', color: '#333' },
    },
  ],
}));

onMounted(async () => {
  try {
    const res = await request.get('/reports/repair-stats');
    stats.value = res as any;
  } catch (err) {
    console.error('加载维修分析失败:', err);
  }
});
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
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media print {
  :deep(.el-button) { display: none; }
  :deep(.el-pagination) { display: none; }
}
</style>
