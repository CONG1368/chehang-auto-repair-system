import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('mobile-auth', () => {
  const token = ref('');
  const userInfo = ref<any>(null);

  function login(user: string, pwd: string) {
    token.value = 'mock-token';
    userInfo.value = { username: user, realName: '管理员' };
  }

  function logout() {
    token.value = '';
    userInfo.value = null;
  }

  return { token, userInfo, login, logout };
});
