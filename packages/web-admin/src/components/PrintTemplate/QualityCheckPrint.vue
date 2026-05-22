<template>
  <div class="print-page">
    <div class="print-title">车行 · 质检报告</div>
    <div class="print-no">工单号：{{ data.orderNo }}</div>
    <table class="print-info">
      <tr><td>车主：{{ data.customerName }}</td><td>电话：{{ data.customerPhone }}</td></tr>
      <tr><td>车牌：{{ data.plateNumber }}</td><td>车型：{{ data.vehicleModel }}</td></tr>
      <tr><td>质检结果：{{ data.checkResult === 'pass' || data.isPassed === 1 ? '✅ 合格' : '❌ 不合格' }}</td><td>质检员：{{ data.checker }}</td></tr>
      <tr><td colspan="2">备注：{{ data.remark || '-' }}</td></tr>
    </table>
    <div class="print-sign">
      <span>质检日期：{{ data.checkTime?.slice(0, 10) || data.createTime?.slice(0, 10) || '' }}</span>
      <span>质检签字：__________</span>
      <span>客户签字：__________</span>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ data: any }>()
</script>
<style scoped>
@import './print-common.css';
</style>
