import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm dev:server',
      port: 3000,
      timeout: 30_000,
      reuseExistingServer: true,
    },
    {
      command: 'pnpm dev:web',
      port: 5173,
      timeout: 30_000,
      reuseExistingServer: true,
    },
  ],
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
