import { defineStore } from 'pinia';
import { ref } from 'vue';
import { login as loginApi, getUserInfo } from '@/api/auth';
import { disconnectSocket } from '@/utils/socket';
import router from '@/router';

export interface UserInfo {
  id: number;
  username: string;
  realName: string;
  phone: string;
  email?: string;
  avatar?: string;
  roleId: number;
  roleName: string;
  permissions: string[];
}

export const useAuthStore = defineStore(
  'auth',
  () => {
    const token = ref('');
    const userInfo = ref<UserInfo | null>(null);

    async function login(username: string, password: string, remember?: boolean) {
      const res: any = await loginApi({ username, password });
      token.value = res.token;
      if (remember) {
        const data = btoa(JSON.stringify({ username, password }));
        localStorage.setItem('auto-repair-remember', data);
      }
      await fetchUserInfo();
    }

    async function fetchUserInfo() {
      const res: any = await getUserInfo();
      userInfo.value = res;
    }

    function logout() {
      disconnectSocket();
      token.value = '';
      userInfo.value = null;
      router.push('/login');
    }

    function updateProfileInfo(data: Partial<UserInfo>) {
      if (userInfo.value) {
        Object.assign(userInfo.value, data);
      }
    }

    function hasPermission(permission: string): boolean {
      if (!userInfo.value) return false;
      if (userInfo.value.permissions.includes('*')) return true;
      return userInfo.value.permissions.includes(permission);
    }

    return { token, userInfo, login, fetchUserInfo, logout, updateProfileInfo, hasPermission };
  },
  {
    persist: true,
  },
);
