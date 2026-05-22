<template>
  <div class="page-container">
    <div class="page-header">
      <h2>入库管理</h2>
    </div>

    <el-card class="form-card">
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
        style="max-width: 600px"
      >
        <el-form-item label="选择配件" prop="partId">
          <el-select
            v-model="form.partId"
            filterable
            remote
            reserve-keyword
            placeholder="请输入配件编码或名称搜索"
            :remote-method="remoteSearchParts"
            :loading="partSearchLoading"
            clearable
            style="width: 100%"
            @change="handlePartChange"
          >
            <el-option
              v-for="p in partOptions"
              :key="p.id"
              :label="`${p.code} - ${p.name}${p.spec ? ' (' + p.spec + ')' : ''}`"
              :value="p.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="当前库存">
          <span :style="{ color: currentStockHint ? '#e6a23c' : '', fontWeight: currentStockHint ? 'bold' : '' }">
            {{ selectedPart ? (selectedPart.stock?.quantity ?? '-') : '-' }}
          </span>
        </el-form-item>

        <el-form-item label="入库数量" prop="quantity">
          <el-input-number
            v-model="form.quantity"
            :min="1"
            :step="1"
            style="width: 100%"
            placeholder="请输入入库数量"
          />
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
            确认入库
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top: 16px">
      <template #header>
        <span style="font-weight: bold">最近库存变动记录</span>
      </template>

      <el-table
        v-loading="tableLoading"
        :data="tableData"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="part.code" label="配件编码" min-width="130">
          <template #default="{ row }">
            {{ row.part?.code ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="part.name" label="配件名称" min-width="150">
          <template #default="{ row }">
            {{ row.part?.name ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" min-width="80" align="center" />
        <el-table-column prop="beforeQty" label="入库前库存" min-width="110" align="center" />
        <el-table-column prop="afterQty" label="入库后库存" min-width="110" align="center" />
        <el-table-column prop="remark" label="备注" min-width="160">
          <template #default="{ row }">
            {{ row.remark || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" min-width="160" />
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchStockRecords"
          @current-change="fetchStockRecords"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'

interface Part {
  id: number
  code: string
  name: string
  spec: string | null
  categoryName: string
  unitPrice: number
  stock?: { quantity: number }
}

interface StockRecord {
  id: number
  partId: number
  type: string
  quantity: number
  beforeQty: number
  afterQty: number
  remark: string | null
  createdAt: string
  part: {
    id: number
    name: string
    code: string
  }
}

interface InboundForm {
  partId: number | null
  quantity: number | null
  remark: string
}

const formRef = ref<FormInstance>()

const initForm = (): InboundForm => ({
  partId: null,
  quantity: null,
  remark: '',
})

const form = reactive<InboundForm>(initForm())

const formRules: FormRules = {
  partId: [{ required: true, message: '请选择配件', trigger: 'change' }],
  quantity: [
    { required: true, message: '请输入入库数量', trigger: 'blur' },
    { type: 'number', min: 1, message: '数量必须大于0', trigger: 'blur' },
  ],
}

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const tableData = ref<StockRecord[]>([])
const tableLoading = ref(false)

const partOptions = ref<Part[]>([])
const partSearchLoading = ref(false)
const selectedPart = ref<Part | null>(null)
const currentStockHint = ref(false)

const submitLoading = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function remoteSearchParts(keyword: string) {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  if (!keyword) {
    partOptions.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    partSearchLoading.value = true
    try {
      const res: any = await request.get('/inventory', {
        params: {
          page: 1,
          pageSize: 50,
          keyword,
        },
      })
      partOptions.value = res.list ?? []
    } catch {
      // 错误已在拦截器中处理
    } finally {
      partSearchLoading.value = false
    }
  }, 300)
}

function handlePartChange(partId: number | null) {
  if (partId) {
    selectedPart.value = partOptions.value.find((p) => p.id === partId) ?? null
    const stock = selectedPart.value?.stock?.quantity
    currentStockHint.value = stock != null && stock < 10
  } else {
    selectedPart.value = null
    currentStockHint.value = false
  }
}

async function fetchStockRecords() {
  tableLoading.value = true
  try {
    const res: any = await request.get('/inventory/stock-records', {
      params: {
        page: pagination.page,
        pageSize: pagination.pageSize,
      },
    })
    const list: StockRecord[] = res.list ?? []
    tableData.value = list
    pagination.total = res.total ?? 0
  } catch {
    // 错误已在拦截器中处理
  } finally {
    tableLoading.value = false
  }
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    await request.post('/inventory/stock-in', {
      partId: form.partId,
      quantity: form.quantity,
      remark: form.remark,
    })
    ElMessage.success('入库成功')
    handleReset()
    fetchStockRecords()
  } catch {
    // 错误已在拦截器中处理
  } finally {
    submitLoading.value = false
  }
}

function handleReset() {
  Object.assign(form, initForm())
  formRef.value?.resetFields()
  selectedPart.value = null
  currentStockHint.value = false
}

onMounted(() => {
  fetchStockRecords()
})
</script>

<style scoped>
.page-container {
  padding: 0;
}
.page-header {
  margin-bottom: 20px;
}
.page-header h2 {
  font-size: 18px;
  color: #303133;
}
.form-card {
  margin-bottom: 0;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
