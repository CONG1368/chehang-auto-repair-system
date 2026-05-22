/**
 * PM2 配置示例
 * 复制到 /opt/chehang-auto/ecosystem.config.js 后执行: pm2 start ecosystem.config.js
 */
module.exports = {
  apps: [
    {
      name: 'chehang-api',
      cwd: '/opt/chehang-auto/server',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/opt/chehang-auto/logs/api-error.log',
      out_file: '/opt/chehang-auto/logs/api-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
