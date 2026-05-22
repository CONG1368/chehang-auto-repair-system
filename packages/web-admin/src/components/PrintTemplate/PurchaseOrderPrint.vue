<template>
  <div class="print-page">
    <div class="print-title">车行 · 采购单</div>
    <div class="print-no">采购单号：{{ data.orderNo }}</div>
    <table class="print-info">
      <tr><td>供应商：{{ data.supplierName || data.supplier }}</td><td>状态：{{ data.status }}</td></tr>
      <tr><td>总金额：<strong>¥{{ Number(data.totalAmount || 0).toLocaleString() }}</strong></td><td>申请人：{{ data.applicant }}</td></tr>
      <tr><td colspan="2">备注：{{ data.remark || '-' }}</td></tr>
    </table>
    <table class="print-table">
      <thead><tr><th>配件名称</th><th>数量</th><th>单价(¥)</th><th>小计(¥)</th></tr></thead>
      <tbody>
        <tr v-for="(item, i) in (data.items || [])" :key="i">
          <td>{{ item.partName || item.name }}</td>
          <td class="tac">{{ item.quantity }}</td>
          <td class="tar">{{ Number(item.unitPrice || 0).toFixed(2) }}</td>
          <td class="tar">{{ Number(item.amount || 0).toFixed(2) }}</td>
        </tr>
      </tbody>
    </table>
    <div class="print-sign">
      <span>采购日期：{{ data.createdAt?.slice(0, 10) || '' }}</span>
      <span>审批签字：__________</span>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps<{ data: any }>()
</script>
<style scoped>
@import './print-common.css';
</style>
