<template>
  <div class="print-page">
    <div class="print-title">车行 · 维修施工单</div>
    <div class="print-no">No: {{ data.orderNo }}</div>
    <table class="print-info">
      <tr><td>车主：{{ data.customerName }}</td><td>电话：{{ data.customerPhone }}</td></tr>
      <tr><td>车牌：{{ data.plateNumber }}</td><td>车型：{{ data.vehicleModel }}</td></tr>
      <tr><td>进厂里程：{{ data.mileage }} km</td><td>服务顾问：{{ data.serviceAdvisor }}</td></tr>
      <tr><td colspan="2">故障描述：{{ data.description }}</td></tr>
    </table>
    <table class="print-table">
      <thead><tr><th>序号</th><th>维修项目</th><th>工时费(¥)</th><th>技师</th></tr></thead>
      <tbody>
        <tr v-for="(item, i) in (data.repairItems || [])" :key="i">
          <td>{{ i + 1 }}</td><td>{{ item.name }}</td><td class="tar">{{ fmt(item.laborFee) }}</td><td>{{ item.technician }}</td>
        </tr>
        <tr v-if="!data.repairItems || data.repairItems.length === 0">
          <td colspan="4" style="text-align:center;color:#999;">暂无维修项目</td>
        </tr>
      </tbody>
    </table>
    <table class="print-table">
      <thead><tr><th>配件名称</th><th>数量</th><th>单价(¥)</th><th>小计(¥)</th></tr></thead>
      <tbody>
        <tr v-for="(p, i) in (data.partsList || [])" :key="i">
          <td>{{ p.name }}</td><td class="tac">{{ p.quantity }}</td><td class="tar">{{ fmt(p.unitPrice) }}</td><td class="tar">{{ fmt(p.totalPrice) }}</td>
        </tr>
        <tr v-if="!data.partsList || data.partsList.length === 0">
          <td colspan="4" style="text-align:center;color:#999;">暂无配件明细</td>
        </tr>
      </tbody>
    </table>
    <div class="print-total">总计：¥{{ fmt(data.totalAmount) }}</div>
    <div class="print-sign">
      <span>开单日期：{{ data.createTime?.slice(0, 10) || '' }}</span>
      <span>客户签字：__________</span>
      <span>质检签字：__________</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ data: any }>()
function fmt(n: any, digits = 2): string {
  const v = Number(n)
  return isNaN(v) ? (0).toFixed(digits) : v.toFixed(digits)
}
</script>

<style scoped>
@import './print-common.css';
</style>
