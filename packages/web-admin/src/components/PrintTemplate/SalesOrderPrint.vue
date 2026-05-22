<template>
  <div class="print-page">
    <div class="print-title">车行 · 销售合同</div>
    <div class="print-no">订单号：{{ data.orderNo }}</div>
    <table class="print-info">
      <tr><td>客户：{{ data.customerName }}</td><td>电话：{{ data.customerPhone || '-' }}</td></tr>
      <tr><td>车辆信息：{{ data.vehicleInfo }}</td><td>销售顾问：{{ data.salesConsultantName || data.salesConsultant }}</td></tr>
      <tr><td>销售价：¥{{ Number(data.salePrice || 0).toLocaleString() }}</td><td>定金：¥{{ Number(data.deposit || 0).toLocaleString() }}</td></tr>
      <tr><td>总金额：¥{{ Number(data.totalAmount || 0).toLocaleString() }}</td><td>状态：{{ data.status }}</td></tr>
    </table>
    <div class="print-sign">
      <span>签约日期：{{ data.createdAt?.slice(0, 10) || '' }}</span>
      <span>客户签字：__________</span>
      <span>销售签字：__________</span>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ data: any }>()
</script>
<style scoped>
@import './print-common.css';
</style>
