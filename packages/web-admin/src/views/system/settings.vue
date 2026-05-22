<template>
  <div class="settings-page">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- ===== 标签页1：基本设置 ===== -->
      <el-tab-pane label="基本设置" name="basic">
        <el-form :model="form" label-width="120px" style="max-width: 650px">
          <!-- 系统 LOGO -->
          <el-form-item label="系统LOGO">
            <div class="logo-upload">
              <el-upload
                :show-file-list="false"
                :before-upload="handleLogoUpload"
                accept="image/*"
                action=""
              >
                <img v-if="form.logo" :src="form.logo" class="logo-preview" />
                <el-icon v-else class="logo-uploader-icon" :size="48">
                  <Plus />
                </el-icon>
              </el-upload>
              <el-button v-if="form.logo" link type="danger" @click="form.logo = ''">
                移除LOGO
              </el-button>
            </div>
          </el-form-item>

          <!-- 系统名称 -->
          <el-form-item label="系统名称">
            <el-input
              v-model="form.appName"
              placeholder="请输入系统名称"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>

          <!-- 系统描述 -->
          <el-form-item label="系统描述">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="3"
              placeholder="请输入系统描述"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>

          <!-- 联系电话 -->
          <el-form-item label="联系电话">
            <el-input
              v-model="form.contactPhone"
              placeholder="请输入联系电话"
              maxlength="20"
            />
          </el-form-item>

          <!-- 地址 -->
          <el-form-item label="地址">
            <el-input
              v-model="form.address"
              type="textarea"
              :rows="2"
              placeholder="请输入地址"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>

          <!-- 营业时间 -->
          <el-form-item label="营业时间">
            <el-input
              v-model="form.businessHours"
              placeholder="例如：周一至周六 8:00-18:00"
              maxlength="100"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="saving" @click="handleSave">
              保存设置
            </el-button>
            <el-button @click="loadConfig">重置</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- ===== 标签页2：业务规则 ===== -->
      <el-tab-pane label="业务规则" name="rules">
        <el-form :model="form" label-width="180px" style="max-width: 750px">
          <!-- 工时与费率 -->
          <el-divider content-position="left">
            <el-icon><Tools /></el-icon>
            <span style="margin-left: 4px">工时与费率</span>
          </el-divider>

          <el-form-item label="工时费率（元/小时）">
            <el-input-number
              v-model="form.hourlyRate"
              :min="0"
              :max="9999"
              :step="10"
              controls-position="right"
              style="width: 220px"
            />
            <span class="unit-tip">元/小时</span>
          </el-form-item>

          <el-form-item label="维修折扣上限（%）">
            <div class="slider-row">
              <el-slider
                v-model="form.maxDiscount"
                :min="0"
                :max="100"
                :step="1"
                show-input
                style="width: 350px"
              />
            </div>
          </el-form-item>

          <!-- 会员卡 -->
          <el-divider content-position="left">
            <el-icon><CreditCard /></el-icon>
            <span style="margin-left: 4px">会员卡</span>
          </el-divider>

          <el-form-item label="会员卡充值最低金额">
            <el-input-number
              v-model="form.minRecharge"
              :min="0"
              :max="999999"
              :step="100"
              controls-position="right"
              style="width: 220px"
            />
            <span class="unit-tip">元</span>
          </el-form-item>

          <!-- 库存管理 -->
          <el-divider content-position="left">
            <el-icon><Box /></el-icon>
            <span style="margin-left: 4px">库存管理</span>
          </el-divider>

          <el-form-item label="安全库存默认值">
            <el-input-number
              v-model="form.safetyStock"
              :min="0"
              :max="9999"
              controls-position="right"
              style="width: 220px"
            />
            <span class="unit-tip">件（低于此值触发预警）</span>
          </el-form-item>

          <el-form-item label="最大库存默认值">
            <el-input-number
              v-model="form.maxStock"
              :min="0"
              :max="99999"
              controls-position="right"
              style="width: 220px"
            />
            <span class="unit-tip">件（高于此值发出提醒）</span>
          </el-form-item>

          <!-- 系统开关 -->
          <el-divider content-position="left">
            <el-icon><Switch /></el-icon>
            <span style="margin-left: 4px">系统开关</span>
          </el-divider>

          <el-form-item label="开启短信通知">
            <el-switch
              v-model="form.smsEnabled"
              active-text="开"
              inactive-text="关"
              :active-value="true"
              :inactive-value="false"
            />
            <span class="unit-tip">启用后系统将自动发送短信通知</span>
          </el-form-item>

          <el-form-item label="自动生成工单号">
            <el-switch
              v-model="form.autoGenerateOrderNo"
              active-text="开"
              inactive-text="关"
              :active-value="true"
              :inactive-value="false"
            />
            <span class="unit-tip">关闭后需手动输入工单号</span>
          </el-form-item>

          <el-form-item label="质检必须上传照片">
            <el-switch
              v-model="form.requireCheckPhoto"
              active-text="是"
              inactive-text="否"
              :active-value="true"
              :inactive-value="false"
            />
            <span class="unit-tip">启用后质检环节必须上传照片才能提交</span>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="saving" @click="handleSave">
              保存设置
            </el-button>
            <el-button @click="loadConfig">重置</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- ===== 标签页3：关于系统 ===== -->
      <el-tab-pane label="关于系统" name="about">
        <div class="about-section">
          <el-card shadow="never">
            <template #header>
              <span style="font-weight: bold; font-size: 16px">系统信息</span>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="系统名称" label-align="right" width="150px">
                {{ form.appName || '车行综合管理系统' }}
              </el-descriptions-item>
              <el-descriptions-item label="版本号" label-align="right">
                <el-tag type="primary" size="large">v2.0.0</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="技术栈" label-align="right">
                <div class="tech-stack">
                  <el-tag size="small" type="">NestJS</el-tag>
                  <el-tag size="small" type="success">Vue 3</el-tag>
                  <el-tag size="small" type="warning">Element Plus</el-tag>
                  <el-tag size="small" type="">Prisma</el-tag>
                  <el-tag size="small" type="danger">MySQL</el-tag>
                  <el-tag size="small" type="info">Redis</el-tag>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="前端框架" label-align="right">
                Vite + TypeScript + Pinia + ECharts
              </el-descriptions-item>
              <el-descriptions-item label="数据库连接" label-align="right">
                <el-tag v-if="dbConnected" type="success" effect="dark">
                  <el-icon style="margin-right: 4px"><CircleCheck /></el-icon>
                  已连接
                </el-tag>
                <el-tag v-else type="danger" effect="dark">
                  <el-icon style="margin-right: 4px"><CircleClose /></el-icon>
                  未连接
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>

          <el-card shadow="never" style="margin-top: 20px">
            <template #header>
              <span style="font-weight: bold; font-size: 16px">系统说明</span>
            </template>
            <div class="about-desc">
              <p>
                车行综合管理系统是一款专为汽车维修厂打造的内部管理平台。
                系统支持多角色（销售顾问、服务顾问、维修技师、配件管理员、财务、店长）
                通过浏览器和手机APP实时协同办公。
              </p>
              <p style="margin-top: 10px">
                本系统采用 B/S 架构，部署于云服务器，支持主流浏览器及移动端访问。
                覆盖客户管理、维修工单、库存配件、销售管理、美容服务、财务管理等核心业务模块，
                助力维修厂实现数字化管理与智能化运营。
              </p>
            </div>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Tools, CreditCard, Box, Switch, CircleCheck, CircleClose } from '@element-plus/icons-vue';
import { getSystemConfig, updateSystemConfig } from '@/api/system';
import { uploadBatch } from '@/api/upload';

/** 当前激活的标签页 */
const activeTab = ref('basic');

/** 保存按钮 loading 状态 */
const saving = ref(false);

/** 数据库连接状态 */
const dbConnected = ref(false);

/** 设置表单数据 */
interface SettingsForm {
  logo: string;
  appName: string;
  description: string;
  contactPhone: string;
  address: string;
  businessHours: string;
  hourlyRate: number;
  maxDiscount: number;
  minRecharge: number;
  safetyStock: number;
  maxStock: number;
  smsEnabled: boolean;
  autoGenerateOrderNo: boolean;
  requireCheckPhoto: boolean;
}

const form = reactive<SettingsForm>({
  logo: '',
  appName: '',
  description: '',
  contactPhone: '',
  address: '',
  businessHours: '',
  hourlyRate: 80,
  maxDiscount: 20,
  minRecharge: 500,
  safetyStock: 10,
  maxStock: 100,
  smsEnabled: false,
  autoGenerateOrderNo: true,
  requireCheckPhoto: true,
});

/** 从服务器加载配置 */
async function loadConfig() {
  try {
    const res: any = await getSystemConfig();
    dbConnected.value = true;

    // 基本设置
    if (res.logo !== undefined) form.logo = res.logo;
    if (res.appName) form.appName = res.appName;
    if (res.description) form.description = res.description;
    if (res.contactPhone) form.contactPhone = res.contactPhone;
    if (res.address) form.address = res.address;
    if (res.businessHours) form.businessHours = res.businessHours;

    // 业务规则（字符串转数字）
    if (res.hourlyRate) form.hourlyRate = Number(res.hourlyRate) || 80;
    if (res.maxDiscount) form.maxDiscount = Number(res.maxDiscount) || 20;
    if (res.minRecharge) form.minRecharge = Number(res.minRecharge) || 500;
    if (res.safetyStock) form.safetyStock = Number(res.safetyStock) || 10;
    if (res.maxStock) form.maxStock = Number(res.maxStock) || 100;

    // 开关类（字符串转布尔）
    form.smsEnabled = res.smsEnabled === 'true';
    form.autoGenerateOrderNo = res.autoGenerateOrderNo !== 'false';
    form.requireCheckPhoto = res.requireCheckPhoto === 'true';
  } catch {
    dbConnected.value = false;
    ElMessage.warning('加载系统配置失败，使用默认值');
  }
}

/** 上传系统 LOGO */
async function handleLogoUpload(file: any) {
  try {
    const res: any = await uploadBatch([file], 'logo');
    if (res.urls && res.urls.length > 0) {
      form.logo = res.urls[0];
      ElMessage.success('LOGO 上传成功');
    }
  } catch {
    ElMessage.error('LOGO 上传失败');
  }
  return false;
}

/** 保存所有设置 */
async function handleSave() {
  saving.value = true;
  try {
    await updateSystemConfig({
      // 基本设置
      logo: form.logo,
      appName: form.appName,
      description: form.description,
      contactPhone: form.contactPhone,
      address: form.address,
      businessHours: form.businessHours,
      // 业务规则（数字转字符串）
      hourlyRate: String(form.hourlyRate),
      maxDiscount: String(form.maxDiscount),
      minRecharge: String(form.minRecharge),
      safetyStock: String(form.safetyStock),
      maxStock: String(form.maxStock),
      // 系统开关（布尔转字符串）
      smsEnabled: String(form.smsEnabled),
      autoGenerateOrderNo: String(form.autoGenerateOrderNo),
      requireCheckPhoto: String(form.requireCheckPhoto),
    });
    ElMessage.success('系统设置保存成功');
    // 刷新页面使 LOGO 等全局设置生效
    setTimeout(() => location.reload(), 500);
  } catch {
    ElMessage.error('保存失败，请重试');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.settings-page {
  padding: 0;
}

/* Logo 上传区域 */
.logo-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.logo-preview {
  width: 120px;
  height: 120px;
  object-fit: contain;
  border: 1px solid #ddd;
  border-radius: 8px;
}
.logo-uploader-icon {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #ddd;
  border-radius: 8px;
  cursor: pointer;
  color: #c0c4cc;
}
.logo-uploader-icon:hover {
  border-color: #409eff;
  color: #409eff;
}

/* 单位提示文字 */
.unit-tip {
  margin-left: 10px;
  color: #909399;
  font-size: 13px;
}

/* 滑块行 */
.slider-row {
  display: flex;
  align-items: center;
}

/* 技术栈标签 */
.tech-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 关于系统 */
.about-section {
  max-width: 700px;
}
.about-desc p {
  margin: 0;
  line-height: 1.8;
  color: #606266;
  font-size: 14px;
}

/* 标签页全局样式微调 */
:deep(.el-tabs__content) {
  padding: 10px 20px;
}
:deep(.el-divider) {
  margin: 16px 0;
}
:deep(.el-divider__text) {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #303133;
}
</style>
