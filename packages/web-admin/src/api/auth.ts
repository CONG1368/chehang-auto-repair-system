import request from './request';

export function login(data: { username: string; password: string }) {
  return request.post('/auth/login', data);
}

export function getUserInfo() {
  return request.get('/auth/userinfo');
}

export function updateProfile(data: { realName?: string; phone?: string; email?: string; avatar?: string }) {
  return request.put('/auth/profile', data);
}
