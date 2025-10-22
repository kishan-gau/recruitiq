import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: { PORT: '5173' },
  },
  use: {
    headless: true,
    baseURL: 'http://localhost:5173',
    viewport: { width: 375, height: 812 },
    actionTimeout: 5000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'chromium', use: { channel: 'chrome' } }
  ]
});
