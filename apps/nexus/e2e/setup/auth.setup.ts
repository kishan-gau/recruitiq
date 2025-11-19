/**
 * Authentication Setup for E2E Tests
 * Industry Standard: Playwright Storage State Pattern
 * 
 * This setup runs ONCE before all tests to authenticate and save cookies.
 * All test files will reuse this authentication state (10-100x faster than logging in per test).
 * 
 * Reference: https://playwright.dev/docs/auth
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage file for authenticated state
const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate as test user', async ({ page }) => {
  console.log('🔐 Authenticating test user...');
  
  // Navigate to login page
  await page.goto('/login');
  
  // Fill credentials (from seeded test database)
  await page.fill('input[type="email"]', 'tenant@testcompany.com');
  await page.fill('input[type="password"]', 'Admin123!');
  
  // Submit login form
  await page.click('button[type="submit"]');
  
  // Wait for successful redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
  
  // Verify cookies are set
  const cookies = await page.context().cookies();
  const accessTokenCookie = cookies.find(c => c.name === 'tenant_access_token');
  const refreshTokenCookie = cookies.find(c => c.name === 'tenant_refresh_token');
  
  expect(accessTokenCookie).toBeDefined();
  expect(accessTokenCookie?.httpOnly).toBe(true);
  expect(refreshTokenCookie).toBeDefined();
  
  console.log('✅ Authentication successful');
  console.log(`📝 Access token cookie: ${accessTokenCookie?.name} (httpOnly: ${accessTokenCookie?.httpOnly})`);
  console.log(`📝 Refresh token cookie: ${refreshTokenCookie?.name} (httpOnly: ${refreshTokenCookie?.httpOnly})`);
  
  // Save authenticated state to file
  await page.context().storageState({ path: authFile });
  
  console.log(`💾 Saved authentication state to: ${authFile}`);
  console.log('🎉 All tests will now reuse this authenticated session');
});
