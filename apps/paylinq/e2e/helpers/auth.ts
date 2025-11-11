/**
 * Authentication Helper Functions for E2E Tests
 * 
 * Provides reusable functions for login, logout, and session management
 */

import { type Page } from '@playwright/test';

/**
 * Login to Paylinq application
 * 
 * @param page - Playwright page instance
 * @param email - User email
 * @param password - User password
 */
/**
 * Test user credentials (matches seed-test-tenant.sql)
 */
export const TEST_USER = {
  email: 'payroll@testcompany.com',
  password: 'Admin123!',
};

/**
 * Login helper for E2E tests
 */
export async function login(page: Page, email: string = TEST_USER.email, password: string = TEST_USER.password) {
  // Only navigate to login if not already there (preserve query params like returnTo)
  if (!page.url().includes('/login')) {
    await page.goto('/login');
  }
  
  // Wait for login form to be visible
  await page.waitForSelector('input[type="email"], input[name="email"]', { 
    state: 'visible',
    timeout: 10000 
  });
  
  // Fill in credentials
  const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'));
  await emailInput.fill(email);
  
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);
  
  // Click login button
  const loginButton = page.getByRole('button', { name: /log in|sign in|login/i });
  await loginButton.click();
  
  // Wait for navigation to complete (either to dashboard or intended page)
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15000
  });
  
  // Wait a bit for auth cookies to be set and initial data to load
  await page.waitForTimeout(1000);
}

/**
 * Logout from Paylinq application
 * 
 * @param page - Playwright page instance
 */
export async function logout(page: Page): Promise<void> {
  // Look for user menu or logout button
  const userMenu = page.getByRole('button', { name: /user menu|profile|account/i }).first();
  
  if (await userMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
    await userMenu.click();
    
    // Click logout option
    const logoutButton = page.getByRole('menuitem', { name: /log out|logout|sign out/i });
    await logoutButton.click();
  } else {
    // Alternative: Direct logout button
    const logoutButton = page.getByRole('button', { name: /log out|logout|sign out/i });
    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();
    }
  }
  
  // Wait for redirect to login page
  await page.waitForURL(/\/login/, { timeout: 10000 });
}

/**
 * Clear all authentication cookies
 * Simulates session invalidation (e.g., backend restart)
 * 
 * @param page - Playwright page instance
 */
export async function clearAuthCookies(page: Page): Promise<void> {
  // Clear all cookies for the current context
  await page.context().clearCookies();
  
  // Also clear localStorage and sessionStorage to fully reset state
  // Use try-catch in case page hasn't loaded yet or doesn't allow access
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore security errors for cross-origin pages
      }
    });
  } catch (error) {
    // Ignore evaluation errors - not critical for test
  }
}

/**
 * Get authentication cookies from the page
 * 
 * @param page - Playwright page instance
 * @returns Object containing auth-related cookies
 */
export async function getAuthCookies(page: Page): Promise<Record<string, string>> {
  const cookies = await page.context().cookies();
  
  const authCookies: Record<string, string> = {};
  for (const cookie of cookies) {
    // Common auth cookie names
    if (
      cookie.name.toLowerCase().includes('token') ||
      cookie.name.toLowerCase().includes('session') ||
      cookie.name.toLowerCase().includes('auth') ||
      cookie.name === '_csrf'
    ) {
      authCookies[cookie.name] = cookie.value;
    }
  }
  
  return authCookies;
}

/**
 * Check if user is currently authenticated
 * 
 * @param page - Playwright page instance
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check if auth cookies exist
  const authCookies = await getAuthCookies(page);
  const hasCookies = Object.keys(authCookies).length > 0;
  
  // Check if we're not on login page
  const url = page.url();
  const notOnLoginPage = !url.includes('/login');
  
  return hasCookies && notOnLoginPage;
}

/**
 * Setup authenticated session for test
 * Logs in and navigates to specified page
 * 
 * @param page - Playwright page instance
 * @param targetUrl - URL to navigate to after login (default: /dashboard)
 */
export async function setupAuthenticatedSession(
  page: Page,
  targetUrl: string = '/dashboard'
): Promise<void> {
  // Use default test credentials
  await login(page, 'paylinq@test.com', 'Test123!@#');
  
  // Navigate to target page
  if (targetUrl !== '/dashboard') {
    await page.goto(targetUrl);
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Simulate session expiration by clearing specific cookies
 * More realistic than clearing all cookies
 * 
 * @param page - Playwright page instance
 * @param clearRefreshToken - Whether to also clear refresh token (default: true)
 */
export async function simulateSessionExpiration(
  page: Page,
  clearRefreshToken: boolean = true
): Promise<void> {
  const cookies = await page.context().cookies();
  
  // Clear access token and optionally refresh token
  for (const cookie of cookies) {
    const isAccessToken = cookie.name.toLowerCase().includes('access');
    const isRefreshToken = cookie.name.toLowerCase().includes('refresh');
    
    if (isAccessToken || (clearRefreshToken && isRefreshToken)) {
      await page.context().clearCookies({ name: cookie.name });
    }
  }
}

/**
 * Wait for and verify redirect to login page
 * 
 * @param page - Playwright page instance
 * @param expectedReturnUrl - Expected returnTo parameter in URL (optional)
 */
export async function waitForLoginRedirect(
  page: Page,
  expectedReturnUrl?: string
): Promise<void> {
  // Wait for redirect to login
  await page.waitForURL(/\/login/, { timeout: 10000 });
  
  // Verify returnTo parameter if provided
  if (expectedReturnUrl) {
    const url = new URL(page.url());
    const returnTo = url.searchParams.get('returnTo');
    
    if (returnTo !== expectedReturnUrl) {
      throw new Error(
        `Expected returnTo="${expectedReturnUrl}", got "${returnTo}"`
      );
    }
  }
  
  // Verify login form is visible
  await page.waitForSelector('input[type="email"], input[name="email"]', {
    state: 'visible',
    timeout: 5000
  });
}
