import request from './request';

/** 获取系统配置（返回 key-value 键值对字典） */
export function getSystemConfig() {
  return request.get('/system/config');
}

/** 批量更新系统配置（传入 key-value 键值对） */
export function updateSystemConfig(data: Record<string, string | number | boolean>) {
  return request.put('/system/config', data);
}
