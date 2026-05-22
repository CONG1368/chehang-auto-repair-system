<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h2>员工绩效</h2>
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

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="技师绩效" name="tech">
        <el-row :gutter="16" style="margin-bottom: 20px">
          <el-col :span="12">
            <el-card shadow="never">
              <template #header>
                <span>技师派工排名</span>
              </template>
              <VChart :option="techChartOption" autoresize style="height: 360px" />
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <template #header>
                <span>技师派工明细</span>
              </template>
              <el-table :data="technicians" size="small" stripe border>
                <el-table-column label="排名" width="60" align="center">
                  <template #default="{ $index }">{{ $index + 1 }}</template>
                </el-table-column>
                <el-table-column prop="name" label="姓名" />
                <el-table-column prop="orderCount" label="派工数量" align="center" sortable />
              </el-table>
              <div v-if="technicians.length === 0 && !loading" class="empty-hint">暂无数据</div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <el-tab-pane label="销售绩效" name="sales">
        <el-card shadow="never">
          <template #header>
            <span>销售业绩排名</span>
          </template>
          <el-table :data="sales" size="small" stripe border show-summary :summary-method="salesSummary">
            <el-table-column label="排名" width="60" align="center">
              <template #default="{ $index }">{{ $index + 1 }}</template>
            </el-table-column>
            <el-table-column prop="name" label="姓名" />
            <el-table-column prop="orderCount" label="订单数" align="center" sortable />
            <el-table-column prop="totalAmount" label="销售额（元）" align="center" sortable>
              <template #default="{ row }">{{ (row.totalAmount || 0).toLocaleString() }}</template>
            </el-table-column>
          </el-table>
          <div v-if="sales.length === 0 && !loading" class="empty-hint">暂无数据</div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
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

const loading = ref(false)
const activeTab = ref('tech')
const dateRange = ref<[string, string] | null>(null)
const technicians = ref<{ userId: number; name: string; orderCount: number }[]>([])
const sales = ref<{ userId: number; name: string; orderCount: number; totalAmount: number }[]>([])

const techChartOption = computed(() => {
  const names = technicians.value.map((t) => t.name).reverse()
  const counts = technicians.value.map((t) => t.orderCount).reverse()
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 30, top: 10, bottom: 20 },
    xAxis: {
      type: 'value',
      name: '单',
      minInterval: 1,
    },
    yAxis: {
      type: 'category',
      data: names,
    },
    series: [
      {
        type: 'bar',
        name: '派工数量',
        data: counts,
        barWidth: 24,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#409eff' },
              { offset: 1, color: '#79bbff' },
            ],
          },
        },
        label: { show: true, position: 'right', fontWeight: 'bold', color: '#333' },
      },
    ],
  }
})

function salesSummary(param: { columns: any[]; data: any[] }) {
  const sums: string[] = []
  const { columns, data } = param
  columns.forEach((col, index) => {
    if (index === 0) {
      sums[index] = '合计'
    } else if (col.property === 'orderCount') {
      sums[index] = data.reduce((s, row) => s + (row.orderCount || 0), 0)
    } else if (col.property === 'totalAmount') {
      const total = data.reduce((s, row) => s + (row.totalAmount || 0), 0)
      sums[index] = total.toLocaleString()
    } else {
      sums[index] = ''
    }
  })
  return sums
}

async function fetchData() {
  loading.value = true
  try {
    const params: any = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res: any = await request.get('/reports/staff-performance', { params })
    technicians.value = (res.technicians || []).sort((a: any, b: any) => (b.orderCount || 0) - (a.orderCount || 0))
    sales.value = (res.sales || []).sort((a: any, b: any) => (b.orderCount || 0) - (a.orderCount || 0))
  } catch (err) {
    console.error('加载员工绩效失败:', err)
  } finally {
    loading.value = false
  }
}

function handleExportExcel() {
  let params = ''
  if (dateRange.value && dateRange.value.length === 2) {
    params = `?startDate=${dateRange.value[0]}&endDate=${dateRange.value[1]}`
  }
  downloadFile(`/api/export/excel?module=staff-performance${params}`, '员工绩效.xlsx').catch(() => {
    ElMessage.error('导出失败')
  })
}

function handleExportPdf() {
  const data =
    activeTab.value === 'tech'
      ? technicians.value.map((t, i) => ({ rank: i + 1, name: t.name, orderCount: t.orderCount }))
      : sales.value.map((s, i) => ({ rank: i + 1, name: s.name, orderCount: s.orderCount, totalAmount: (s.totalAmount || 0).toLocaleString() }))
  const cols =
    activeTab.value === 'tech'
      ? [
          { header: '排名', dataKey: 'rank' },
          { header: '姓名', dataKey: 'name' },
          { header: '派工数量', dataKey: 'orderCount' },
        ]
      : [
          { header: '排名', dataKey: 'rank' },
          { header: '姓名', dataKey: 'name' },
          { header: '订单数', dataKey: 'orderCount' },
          { header: '销售额（元）', dataKey: 'totalAmount' },
        ]
  exportTableToPdf('员工绩效报表', cols, data, '员工绩效')
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
