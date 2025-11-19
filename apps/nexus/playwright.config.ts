import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage state file for authenticated sessions (Industry Standard Pattern)
const authFile = path.join(__dirname, './playwright/.auth/user.json');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60000, // 60 seconds per test
  use: {
    baseURL: 'http://localhost:5175',
    trace: 'on-first-retry',
    navigationTimeout: 30000, // 30 seconds for page navigation
    actionTimeout: 15000,     // 15 seconds for actions (click, fill, etc.)
  },

  projects: [
    // Setup project - runs once to authenticate and save state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    // Auth tests project - NO storage state (tests login flow itself)
    {
      name: 'auth-chromium',
      testMatch: /.*auth.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'auth-firefox',
      testMatch: /.*auth.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'auth-webkit',
      testMatch: /.*auth.*\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
    
    // Module tests - USE storage state (authenticated)
    {
      name: 'chromium',
      testIgnore: /.*auth.*\.spec\.ts/,  // Exclude auth tests
      use: { 
        ...devices['Desktop Chrome'],
        storageState: authFile,  // ✅ Reuse authentication
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      testIgnore: /.*auth.*\.spec\.ts/,  // Exclude auth tests
      use: { 
        ...devices['Desktop Firefox'],
        storageState: authFile,  // ✅ Reuse authentication
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      testIgnore: /.*auth.*\.spec\.ts/,  // Exclude auth tests
      use: { 
        ...devices['Desktop Safari'],
        storageState: authFile,  // ✅ Reuse authentication
      },
      dependencies: ['setup'],
    },
  ],

  /* Global setup and teardown for self-sustaining E2E tests */
  /* Mirrors backend E2E pattern - starts backend server automatically */
  globalSetup: './e2e/setup.ts',
  globalTeardown: './e2e/teardown.ts',

  webServer: {
    command: 'powershell -ExecutionPolicy Bypass -File ./start-dev-server.ps1',
    url: 'http://localhost:5175',
    timeout: 120000, // 2 minutes for Vite to start
    stdout: 'pipe',
    stderr: 'pipe',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_API_PROXY_TARGET: 'http://localhost:3000', // E2E backend runs on port 3000
    },
  },
});
