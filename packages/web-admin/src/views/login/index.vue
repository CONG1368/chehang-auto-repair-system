<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <img v-if="systemConfig.logo" :src="systemConfig.logo" class="login-logo" />
        <el-icon v-else :size="40" color="#409EFF"><Tools /></el-icon>
        <h1>{{ systemConfig.appName || '车行综合管理系统' }}</h1>
        <p>数字化管理 · 智能化运营 · 一体化服务</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" size="large">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-form-item>
          <el-row style="width:100%">
            <el-col :span="12">
              <el-checkbox v-model="rememberPwd">记住密码</el-checkbox>
            </el-col>
            <el-col :span="12" style="text-align:right">
              <el-checkbox v-model="autoLogin">自动登录</el-checkbox>
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" style="width:100%" @click="handleLogin">
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock, Tools } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';
import { connectSocket } from '@/utils/socket';
import { getSystemConfig } from '@/api/system';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const loading = ref(false);
const rememberPwd = ref(false);
const autoLogin = ref(false);
const form = reactive({ username: '', password: '' });
const systemConfig = reactive({ logo: '', appName: '车行综合管理系统' });

onMounted(() => {
  getSystemConfig().then((res: any) => {
    if (res.logo) systemConfig.logo = res.logo;
    if (res.appName) systemConfig.appName = res.appName;
  }).catch(() => {});

  const saved = localStorage.getItem('auto-repair-remember');
  if (saved) {
    try {
      const decoded = JSON.parse(atob(saved));
      form.username = decoded.username || '';
      form.password = decoded.password || '';
      rememberPwd.value = true;
      autoLogin.value = decoded.autoLogin || false;
      if (autoLogin.value) {
        handleLogin();
      }
    } catch { /* ignore */ }
  }
});
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

async function handleLogin() {
  loading.value = true;
  try {
    await authStore.login(form.username, form.password);

    // 记住密码 / 自动登录
    if (rememberPwd.value) {
      const data = btoa(JSON.stringify({
        username: form.username,
        password: form.password,
        autoLogin: autoLogin.value,
      }));
      localStorage.setItem('auto-repair-remember', data);
    } else {
      localStorage.removeItem('auto-repair-remember');
    }

    ElMessage.success('登录成功');
    connectSocket();
    const redirect = (route.query.redirect as string) || '/';
    router.push(redirect);
  } catch {
    ElMessage.error('用户名或密码错误');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 420px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  font-size: 20px;
  color: #303133;
  margin: 12px 0 8px;
}

.login-header p {
  font-size: 13px;
  color: #909399;
}

.login-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  border-radius: 8px;
  margin-bottom: 8px;
}

</style>
