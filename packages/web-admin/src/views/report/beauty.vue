<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h2>美容统计</h2>
      <div class="header-actions">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 260px"
          size="default"
        />
        <el-button type="primary" @click="fetchData">查询</el-button>
        <el-button type="success" @click="handleExportExcel">导出Excel</el-button>
        <el-button @click="handleExportPdf">导出PDF</el-button>
      </div>
    </div>

    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="6">
        <el-card shadow="never">
          <el-statistic title="总预约数" :value="stats.totalAppointments" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <el-statistic title="总营收（元）" :value="stats.totalRevenue" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span>按服务类型统计</span>
          </template>
          <VChart :option="serviceTypeChartOption" autoresize style="height: 320px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span>服务类型明细</span>
          </template>
          <el-table :data="byServiceType" size="small" stripe>
            <el-table-column prop="serviceType" label="服务类型" />
            <el-table-column prop="count" label="预约数量" align="center" />
          </el-table>
          <div v-if="byServiceType.length === 0" class="empty-hint">暂无数据</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span>按状态分布</span>
          </template>
          <VChart :option="statusChartOption" autoresize style="height: 320px" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span>状态明细</span>
          </template>
          <el-table :data="byStatus" size="small" stripe>
            <el-table-column prop="status" label="状态" />
            <el-table-column prop="count" label="数量" align="center" />
          </el-table>
          <div v-if="byStatus.length === 0" class="empty-hint">暂无数据</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import VChart from 'vue-echarts'
import 'echarts'
import request from '@/api/request'
import { downloadFile } from '@/utils/download'
import { exportTableToPdf } from '@/utils/export-pdf'

const statusMap: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  in_progress: '施工中',
  completed: '已完成',
  cancelled: '已取消',
}

const serviceTypeMap: Record<string, string> = {
  wash: '洗车',
  detail: '美容',
  maintenance: '保养',
  repair: '维修',
  other: '其他',
}

const loading = ref(false)
const dateRange = ref<[string, string] | null>(null)
const stats = ref({
  totalAppointments: 0,
  totalRevenue: 0,
  byStatus: [] as { status: string; count: number }[],
  byServiceType: [] as { serviceType: string; count: number }[],
})

const byStatus = computed(() =>
  stats.value.byStatus.map((s) => ({
    status: statusMap[s.status] || s.status,
    count: s.count,
  })),
)

const byServiceType = computed(() =>
  stats.value.byServiceType.map((s) => ({
    serviceType: serviceTypeMap[s.serviceType] || s.serviceType,
    count: s.count,
  })),
)

const statusChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 50, right: 20, top: 20, bottom: 30 },
  xAxis: {
    type: 'category',
    data: byStatus.value.map((s) => s.status),
  },
  yAxis: {
    type: 'value',
    name: '单',
    minInterval: 1,
  },
  series: [
    {
      type: 'bar',
      name: '预约数',
      data: byStatus.value.map((s) => s.count),
      barWidth: 36,
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#67c23a' },
            { offset: 1, color: '#b3e19d' },
          ],
        },
      },
      label: { show: true, position: 'top', fontWeight: 'bold', color: '#333' },
    },
  ],
}))

const serviceTypeChartOption = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [
    {
      type: 'pie',
      name: '服务类型',
      radius: ['45%', '75%'],
      center: ['50%', '45%'],
      data: byServiceType.value.map((s) => ({
        name: s.serviceType,
        value: s.count,
      })),
      label: { formatter: '{b}: {c} ({d}%)' },
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' },
      },
    },
  ],
}))

async function fetchData() {
  loading.value = true
  try {
    const params: any = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await request.get('/reports/beauty-stats', { params })
    stats.value = res as any
  } catch (err) {
    console.error('加载美容统计失败:', err)
  } finally {
    loading.value = false
  }
}

function handleExportExcel() {
  let params = ''
  if (dateRange.value && dateRange.value.length === 2) {
    params = `?startDate=${dateRange.value[0]}&endDate=${dateRange.value[1]}`
  }
  downloadFile(`/api/export/excel?module=beauty-stats${params}`, '美容统计.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

function handleExportPdf() {
  exportTableToPdf(
    '美容统计报表',
    [
      { header: '分类', dataKey: 'name' },
      { header: '数量', dataKey: 'count' },
    ],
    [
      ...byServiceType.value.map((s) => ({ name: `服务类型-${s.serviceType}`, count: s.count })),
      ...byStatus.value.map((s) => ({ name: `状态-${s.status}`, count: s.count })),
    ],
    '美容统计',
  )
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.page-container { padding: 0; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-header h2 { font-size: 18px; color: #303133; margin: 0; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.empty-hint { text-align: center; padding: 24px; color: #909399; font-size: 13px; }
</style>
