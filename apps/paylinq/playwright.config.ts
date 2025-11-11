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
    // Setup project
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    
    // Authenticated tests (most tests)
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: ['**/session-management.spec.ts'], // Session tests need fresh state
    },
    
    // Unauthenticated tests (session management)
    {
      name: 'chromium-no-auth',
      use: { 
        ...devices['Desktop Chrome'],
        // No storageState - start fresh
      },
      testMatch: ['**/session-management.spec.ts'],
    },
  ],

  webServer: [
    {
      command: 'cd ../../backend && npm run dev',
      url: 'http://localhost:4000',
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:5174',
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'cd ../../dev-gateway && npm start',
      url: 'http://localhost:3000',
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
