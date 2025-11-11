import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Take screenshot before login
  await page.screenshot({ path: 'test-results/before-login.png', fullPage: true });
  
  // Fill in login credentials (use test tenant user from seed file)
  await page.locator('#email').fill('tenant@testcompany.com');
  await page.locator('#password').fill('Admin123!');
  
  // Click login button and wait for navigation
  await Promise.all([
    page.waitForURL(/\/(dashboard|payroll-runs|payroll)?/, { timeout: 10000 }).catch(() => {
      console.log('Did not navigate after login - might be auth error');
    }),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);
  
  // Wait a bit for any async auth operations
  await page.waitForTimeout(2000);
  
  // Take screenshot after login attempt
  await page.screenshot({ path: 'test-results/after-login.png', fullPage: true });
  
  // Check current URL
  const currentUrl = page.url();
  console.log('Current URL after login:', currentUrl);
  
  // Fetch CSRF token for API calls
  try {
    const csrfResponse = await page.request.get('/api/csrf-token');
    if (csrfResponse.ok()) {
      const csrfData = await csrfResponse.json();
      console.log('CSRF token fetched:', csrfData.csrfToken ? 'yes' : 'no');
    }
  } catch (err) {
    console.warn('Failed to fetch CSRF token:', err);
  }
  
  // Save authentication state regardless
  await page.context().storageState({ path: authFile });
  
  // If still on login page, login failed
  if (currentUrl.includes('/login')) {
    throw new Error('Login failed - still on login page. Check credentials or backend.');
  }
});
