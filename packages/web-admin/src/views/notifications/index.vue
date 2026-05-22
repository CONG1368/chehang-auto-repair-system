<template>
  <div class="page-container">
    <div class="page-header">
      <h2>消息中心</h2>
    </div>
    <el-card>
      <div class="filter-bar">
        <el-radio-group v-model="filterTab" @change="handleFilterChange">
          <el-radio-button label="all">全部 ({{ total }})</el-radio-button>
          <el-radio-button label="unread">未读 ({{ unreadTotal }})</el-radio-button>
        </el-radio-group>
        <el-select v-model="filterType" placeholder="消息类型" clearable style="width:140px;margin-left:12px" @change="handleFilterChange">
          <el-option label="工单通知" value="repair" />
          <el-option label="库存预警" value="stock" />
          <el-option label="客户通知" value="customer" />
          <el-option label="系统公告" value="system" />
        </el-select>
        <el-button type="primary" link style="margin-left:auto" @click="handleMarkAllRead">全部标为已读</el-button>
      </div>

      <div v-loading="loading" class="msg-list">
        <div
          v-for="item in list"
          :key="item.id"
          class="msg-item"
          :class="{ unread: !item.isRead }"
          @click="handleClick(item)"
        >
          <span class="msg-dot" :class="{ active: !item.isRead }"></span>
          <span class="msg-time">{{ item.createdAt?.slice(0, 16) }}</span>
          <el-tag :type="typeTagType(item.type)" size="small">{{ typeLabel(item.type) }}</el-tag>
          <span class="msg-body">{{ item.content }}</span>
          <span class="msg-action">{{ item.isRead ? '已读' : '查看 →' }}</span>
        </div>
        <el-empty v-if="!loading && list.length === 0" description="暂无消息" />
      </div>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/api/request'
import { onSocketEvent, offSocketEvent } from '@/utils/socket'

const router = useRouter()
const list = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const unreadTotal = ref(0)
const filterTab = ref('all')
const filterType = ref('')

async function fetchList() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (filterTab.value === 'unread') params.isRead = false
    if (filterType.value) params.type = filterType.value
    const res: any = await request.get('/notifications', { params })
    list.value = res.list ?? []
    total.value = res.total ?? 0
  } finally { loading.value = false }
}

async function fetchUnreadTotal() {
  try {
    const res: any = await request.get('/notifications/unread-count')
    unreadTotal.value = res.count ?? 0
  } catch { /* */ }
}

function handleFilterChange() {
  page.value = 1
  fetchList()
}

async function handleClick(item: any) {
  if (!item.isRead) {
    await request.put(`/notifications/${item.id}/read`)
    fetchUnreadTotal()
    item.isRead = true
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
  await request.put('/notifications/read-all')
  ElMessage.success('已全部标为已读')
  fetchList()
  fetchUnreadTotal()
}

function typeLabel(type: string) {
  const m: Record<string, string> = { repair: '工单通知', stock: '库存预警', customer: '客户通知', system: '系统公告', sales: '销售通知', beauty: '美容通知', finance: '财务通知' }
  return m[type] || type
}

function typeTagType(type: string) {
  const m: Record<string, string> = { repair: '', stock: 'warning', customer: 'success', system: 'info', sales: 'success', beauty: '', finance: 'warning' }
  return m[type] || 'info'
}

// WebSocket 实时追加新通知
const wsNotificationEvents = [
  'new-repair-order', 'order-status-change', 'low-stock-alert',
  'new-customer', 'system-notification', 'new-sales-lead',
  'new-sales-order', 'order-delivered', 'new-beauty-appointment',
  'beauty-appointment-status-change', 'new-payment', 'receivable-paid',
  'payable-paid',
];

// 根据 WS 事件类型推断通知标题
function inferNotificationTitle(event: string): string {
  const map: Record<string, string> = {
    'new-repair-order': '新工单',
    'order-status-change': '工单状态变更',
    'low-stock-alert': '库存预警',
    'new-customer': '新客户',
    'system-notification': '系统通知',
    'new-sales-lead': '新销售线索',
    'new-sales-order': '新销售订单',
    'order-delivered': '订单已交车',
    'new-beauty-appointment': '新美容预约',
    'beauty-appointment-status-change': '美容预约状态变更',
    'new-payment': '新收款',
    'receivable-paid': '应收还款',
    'payable-paid': '应付付款',
  };
  return map[event] || '消息通知';
}

// 处理实时通知：只更新未读数量和 total，不在列表页首行插入（首页已加载完）
const handleWsNotification = () => {
  unreadTotal.value++;
  total.value++;
};

onMounted(() => {
  fetchList();
  fetchUnreadTotal();
  // 注册 WebSocket 事件监听，实时更新未读数量
  wsNotificationEvents.forEach((event) => {
    onSocketEvent(event, handleWsNotification);
  });
});

onUnmounted(() => {
  wsNotificationEvents.forEach((event) => {
    offSocketEvent(event, handleWsNotification);
  });
})
</script>

<style scoped>
.page-container { padding: 0; }
.page-header { margin-bottom: 20px; }
.page-header h2 { font-size: 18px; color: #303133; }
.filter-bar { display: flex; align-items: center; margin-bottom: 16px; }
.msg-list { min-height: 200px; }
.msg-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #ebeef5; cursor: pointer; }
.msg-item.unread { background: #ecf5ff; }
.msg-item:hover { background: #f5f7fa; }
.msg-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.msg-dot.active { background: #409EFF; }
.msg-time { font-size: 12px; color: #909399; width: 140px; flex-shrink: 0; }
.msg-body { flex: 1; font-size: 13px; color: #303133; }
.msg-action { font-size: 12px; color: #909399; flex-shrink: 0; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
