<template>
  <div class="print-page">
    <div class="print-title">车行 · 收款收据</div>
    <div class="print-no">收据号：{{ data.paymentNo }}</div>
    <table class="print-info">
      <tr><td>客户：{{ data.customerName }}</td><td>电话：{{ data.customerPhone || '-' }}</td></tr>
      <tr><td>收款类型：{{ data.type }}</td><td>支付方式：{{ data.paymentMethod }}</td></tr>
      <tr><td>实收金额：<strong>¥{{ Number(data.amount || 0).toLocaleString() }}</strong></td><td>优惠：¥{{ Number(data.discount || 0).toLocaleString() }}</td></tr>
      <tr><td colspan="2">备注：{{ data.remark || '-' }}</td></tr>
    </table>
    <div class="print-sign">
      <span>收款日期：{{ data.createdAt?.slice(0, 10) || '' }}</span>
      <span>收款人：__________</span>
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
