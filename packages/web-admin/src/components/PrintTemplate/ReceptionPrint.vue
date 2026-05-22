<template>
  <div class="print-page">
    <div class="print-title">车行 · 接车委托单</div>
    <div class="print-no">No: {{ data.orderNo }}</div>
    <table class="print-info">
      <tr><td>车主：{{ data.customerName }}</td><td>电话：{{ data.customerPhone }}</td></tr>
      <tr><td>车牌：{{ data.plateNumber }}</td><td>车型：{{ data.vehicleModel }}</td></tr>
      <tr><td>进厂里程：{{ data.mileage }} km</td><td>服务顾问：{{ data.serviceAdvisor }}</td></tr>
      <tr><td colspan="2">故障描述：{{ data.faultDesc || data.description }}</td></tr>
    </table>
    <div style="margin:16px 0;font-size:12px;">
      <strong>预计交车时间：</strong>{{ data.estCompleteTime?.slice(0, 10) || '待定' }}
    </div>
    <div class="print-sign">
      <span>接车日期：{{ data.createTime?.slice(0, 10) || '' }}</span>
      <span>客户签字：__________</span>
      <span>接待签字：__________</span>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ data: any }>()
</script>
<style scoped>
@import './print-common.css';
</style>
