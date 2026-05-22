<template>
  <div class="print-page">
    <div class="company-name">{{ data.companyName || '车行综合管理系统' }}</div>
    <div class="print-title">对账单</div>
    <div class="print-period">对账期间：{{ data.period || '' }}</div>

    <h3 class="section-title">收入汇总</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>收入类型</th>
          <th class="tar">金额（元）</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(val, key) in data.incomeByType || {}" :key="key">
          <td>{{ incomeTypeMap[key] || key }}</td>
          <td class="tar">&yen;{{ Number(val || 0).toLocaleString() }}</td>
        </tr>
        <tr v-if="!data.incomeByType || Object.keys(data.incomeByType).length === 0">
          <td colspan="2" class="tac">暂无数据</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td class="tac">总收入</td>
          <td class="tar">&yen;{{ Number(data.totalIncome || 0).toLocaleString() }}</td>
        </tr>
      </tfoot>
    </table>

    <h3 class="section-title">支出汇总</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>费用类别</th>
          <th class="tar">金额（元）</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(val, key) in data.expensesByCategory || {}" :key="key">
          <td>{{ expenseTypeMap[key] || key }}</td>
          <td class="tar">&yen;{{ Number(val || 0).toLocaleString() }}</td>
        </tr>
        <tr v-if="!data.expensesByCategory || Object.keys(data.expensesByCategory).length === 0">
          <td colspan="2" class="tac">暂无数据</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td class="tac">总支出</td>
          <td class="tar">&yen;{{ Number(data.totalExpense || 0).toLocaleString() }}</td>
        </tr>
      </tfoot>
    </table>

    <h3 class="section-title">利润汇总</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>项目</th>
          <th class="tar">金额（元）</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>总收入</td>
          <td class="tar">&yen;{{ Number(data.totalIncome || 0).toLocaleString() }}</td>
        </tr>
        <tr>
          <td>总支出</td>
          <td class="tar">&yen;{{ Number(data.totalExpense || 0).toLocaleString() }}</td>
        </tr>
        <tr class="net-row">
          <td>净利润</td>
          <td class="tar">&yen;{{ Number(data.netProfit || 0).toLocaleString() }}</td>
        </tr>
      </tbody>
    </table>

    <div class="print-footer">
      <span>打印日期：{{ printDate }}</span>
      <span>制单人：{{ data.createdBy || '' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ data: Record<string, any> }>();

const incomeTypeMap: Record<string, string> = {
  repair: '维修收入',
  sales: '销售收入',
  beauty: '美容收入',
  other: '其他收入',
};

const expenseTypeMap: Record<string, string> = {
  parts: '配件采购',
  salary: '员工工资',
  rent: '场地租金',
  utilities: '水电费用',
  marketing: '营销推广',
  other: '其他支出',
};

const printDate = computed(() => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
});
</script>

<style scoped>
.company-name {
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
  letter-spacing: 2px;
}

.print-title {
  text-align: center;
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 8px;
}

.print-period {
  text-align: center;
  font-size: 13px;
  color: #666;
  margin-bottom: 28px;
}

.section-title {
  font-size: 14px;
  color: #333;
  margin: 20px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid #ddd;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 14px;
  font-size: 13px;
}

.data-table th,
.data-table td {
  border: 1px solid #ddd;
  padding: 6px 10px;
  text-align: left;
}

.data-table th {
  background: #f5f5f5;
  font-weight: 500;
  color: #333;
}

.data-table tfoot .total-row td {
  background: #fafafa;
  font-weight: bold;
  color: #333;
}

.net-row td {
  background: #e6f7e6;
  font-weight: bold;
  color: #333;
}

.tar {
  text-align: right;
}

.tac {
  text-align: center;
}

.print-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 40px;
  font-size: 12px;
  color: #666;
}

@media print {
  .print-page {
    width: 210mm;
    min-height: 297mm;
    padding: 20mm;
    box-sizing: border-box;
    font-size: 13px;
    color: #000;
  }

  .company-name {
    font-size: 18px;
  }

  .print-title {
    font-size: 24px;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
  }

  .data-table th,
  .data-table td {
    border: 1px solid #333;
    padding: 8px;
  }

  .data-table th {
    background: #eee;
  }

  .data-table tfoot .total-row td {
    background: #f5f5f5;
  }

  .net-row td {
    background: #e8f5e9;
  }

  .print-footer {
    color: #000;
  }
}
</style>
