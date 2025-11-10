import { test as base } from '@playwright/test';

// Extend base test with authenticated session
export const test = base.extend({
  page: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Login with test credentials (update these based on your environment)
    await page.fill('input#email', process.env.TEST_USER_EMAIL || 'payroll@testcompany.com');
    await page.fill('input#password', process.env.TEST_USER_PASSWORD || 'Admin123!');
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
