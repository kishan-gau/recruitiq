import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Note: webServer not configured - you must manually start:
  // 1. Backend: cd backend && npm run dev (port 4000)
  // 2. Dev Gateway: cd dev-gateway && npm start (port 3000)
  // 3. PayLinq: cd apps/paylinq && pnpm dev (port 5174)
  // The gateway will proxy requests from :3000 to backend :4000 and frontend :5174
});
