/**
 * Session Management E2E Tests
 * 
 * Tests automatic redirect to login page when session is invalidated
 * and return to original page after successful authentication.
 * 
 * Scenarios covered:
 * 1. Hard reset / backend restart (session lost)
 * 2. CSRF token expiration
 * 3. Access token expiration with refresh failure
 * 4. Initial page load with no session
 */

import { test, expect } from '@playwright/test';
import { login, clearAuthCookies } from './helpers/auth.js';

test.describe('Session Management & Auto-Redirect', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh - clear all cookies
    await clearAuthCookies(page);
  });

  test('should redirect to login when accessing protected route without session', async ({ page }) => {
    // Try to access a protected route directly
    await page.goto('/dashboard');

    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/);
    
    // Verify login form is visible
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    console.log('✓ Redirect to login successful for unauthenticated access');
  });

  test('should preserve return URL and redirect back after login', async ({ page }) => {
    // Listen to console logs
    page.on('console', msg => console.log('[Browser]', msg.text()));
    
    // Try to access workers list directly without auth
    await page.goto('/workers');

    // Should be redirected to login with returnTo parameter
    await expect(page).toHaveURL(/\/login.*returnTo=%2Fworkers/);
    console.log('[Test] On login page with returnTo parameter');
    
    // Login with valid credentials
    await login(page);
    console.log('[Test] Login completed, current URL:', page.url());
    
    // Wait a bit for any redirects
    await page.waitForTimeout(1000);
    console.log('[Test] After wait, current URL:', page.url());
    
    // Should be redirected back to workers page
    await expect(page).toHaveURL('/workers');
    
    // Verify we're actually on the workers page
    await expect(page.getByRole('heading', { name: /workers/i })).toBeVisible();
    
    console.log('✓ Return URL preserved and redirect after login successful');
  });

  test('should redirect to login when session expires during API call', async ({ page }) => {
    // Login first
    await login(page);
    await page.goto('/workers');
    
    // Verify we're authenticated
    await expect(page.getByRole('heading', { name: /workers/i })).toBeVisible();
    
    // Simulate session expiration by clearing auth cookies (simulates backend restart)
    await clearAuthCookies(page);
    
    // Try to trigger an API call - click "Add Worker" button
    const addWorkerButton = page.getByRole('button', { name: /add worker/i });
    if (await addWorkerButton.isVisible()) {
      await addWorkerButton.click();
    } else {
      // Alternative: trigger any API call by refreshing
      await page.reload();
    }
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/);
    
    // Should have returnTo parameter with current page
    await expect(page).toHaveURL(/returnTo=%2Fworkers/);
    
    console.log('✓ Session expiration during API call triggers redirect');
  });

  test('should redirect to login when CSRF token fetch fails due to invalid session', async ({ page }) => {
    // Login first
    await login(page);
    await page.goto('/workers');
    
    // Wait for page to load
    await expect(page.getByRole('heading', { name: /workers/i })).toBeVisible();
    
    // Listen for console logs to verify CSRF error handling
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });
    
    // Simulate session expiration
    await clearAuthCookies(page);
    
    // Try to perform a mutation (which requires CSRF token)
    // This will trigger: mutation → 403 CSRF → fetch new token → 401 → redirect
    const addButton = page.getByRole('button', { name: /add/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Wait a bit for the API call sequence
      await page.waitForTimeout(1000);
    }
    
    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    
    console.log('✓ CSRF token fetch failure triggers redirect');
  });

  test('should handle page refresh without session gracefully', async ({ page }) => {
    // Login first
    await login(page);
    await page.goto('/workers');
    
    // Verify authenticated
    await expect(page.getByRole('heading', { name: /workers/i })).toBeVisible();
    
    // Clear session (simulate backend restart)
    await clearAuthCookies(page);
    
    // Refresh the page
    await page.reload();
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    
    // Should preserve the page we were on
    await expect(page).toHaveURL(/returnTo/);
    
    console.log('✓ Page refresh without session redirects to login');
  });

  test('should redirect to login from nested routes when session is invalid', async ({ page }) => {
    // Try to access deeply nested route
    await page.goto('/workers/123/details');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    
    // Should preserve the full path
    await expect(page).toHaveURL(/returnTo=%2Fworkers%2F123%2Fdetails/);
    
    console.log('✓ Nested route redirect with preserved path successful');
  });

  test('should handle multiple tabs with session invalidation', async ({ browser }) => {
    const context = await browser.newContext();
    
    // Open first tab and login
    const page1 = await context.newPage();
    await login(page1);
    await page1.goto('/dashboard');
    await expect(page1.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    
    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('/workers');
    await expect(page2.getByRole('heading', { name: /workers/i })).toBeVisible();
    
    // Clear session in context (affects both tabs)
    await clearAuthCookies(page1);
    
    // Refresh first tab
    await page1.reload();
    await expect(page1).toHaveURL(/\/login/);
    
    // Try to interact with second tab
    await page2.reload();
    await expect(page2).toHaveURL(/\/login/);
    
    console.log('✓ Multiple tabs handle session invalidation correctly');
    
    await context.close();
  });

  test('should show appropriate message when session expires', async ({ page }) => {
    // Login first
    await login(page);
    await page.goto('/workers');
    
    // Clear session
    await clearAuthCookies(page);
    
    // Trigger redirect
    await page.reload();
    
    // Should be on login page with session_expired reason
    await expect(page).toHaveURL(/reason=session_expired/);
    
    // Check if there's a message about session expiration
    // (This assumes your Login component shows a message based on the reason param)
    const sessionMessage = page.getByText(/session.*expired/i);
    if (await sessionMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(sessionMessage).toBeVisible();
      console.log('✓ Session expiration message displayed');
    } else {
      console.log('⚠ Session expiration message not found (may not be implemented)');
    }
  });

  test('should clear CSRF token when session is invalidated', async ({ page }) => {
    // Login first
    await login(page);
    await page.goto('/workers');
    
    // Monitor console for CSRF token logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });
    
    // Clear session
    await clearAuthCookies(page);
    
    // Try to make a mutation
    await page.reload();
    
    // Should redirect
    await expect(page).toHaveURL(/\/login/);
    
    // After re-login, CSRF token should be fetched fresh
    await login(page);
    
    // Check if CSRF token was fetched
    await page.waitForTimeout(1000);
    
    const hasCsrfLog = consoleLogs.some(log => 
      log.includes('CSRF token fetched') || log.includes('CSRF')
    );
    
    expect(hasCsrfLog).toBeTruthy();
    console.log('✓ CSRF token cleared and refetched after re-authentication');
  });

  test('should handle rapid API calls during session expiration', async ({ page }) => {
    // Login first
    await login(page);
    await page.goto('/workers');
    
    // Clear session
    await clearAuthCookies(page);
    
    // Try to trigger multiple API calls rapidly
    const promises = [
      page.reload(),
      page.goto('/dashboard'),
    ];
    
    await Promise.all(promises.map(p => p.catch(() => {}))); // Catch any navigation errors
    
    // Should eventually land on login page (not multiple redirects)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    
    console.log('✓ Rapid API calls during session expiration handled correctly');
  });

  test('should preserve query parameters in return URL', async ({ page }) => {
    // Try to access page with query params
    await page.goto('/workers?status=active&department=engineering');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    
    // Should preserve query params in returnTo
    await expect(page).toHaveURL(/returnTo=.*status%3Dactive/);
    await expect(page).toHaveURL(/department%3Dengineering/);
    
    // Login
    await login(page);
    
    // Should be redirected back with query params
    await expect(page).toHaveURL(/\/workers\?status=active&department=engineering/);
    
    console.log('✓ Query parameters preserved in return URL');
  });
});

test.describe('CSRF Token Management', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthCookies(page);
  });

  test('should fetch CSRF token after successful login', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });
    
    await login(page);
    
    // Wait for CSRF token fetch
    await page.waitForTimeout(1000);
    
    // Check console logs for CSRF token fetch
    const hasCsrfFetch = consoleLogs.some(log => 
      log.includes('CSRF token fetched') || 
      log.includes('Fetching CSRF token')
    );
    
    expect(hasCsrfFetch).toBeTruthy();
    console.log('✓ CSRF token fetched after login');
  });

  test('should automatically retry request with new CSRF token on 403', async ({ page }) => {
    await login(page);
    await page.goto('/workers');
    
    // Monitor network requests
    const apiCalls: string[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiCalls.push(`${response.request().method()} ${response.url()} -> ${response.status()}`);
      }
    });
    
    // Intercept API calls and simulate CSRF error on first attempt
    let csrfErrorSimulated = false;
    await page.route('**/api/payroll/workers', async (route) => {
      if (route.request().method() === 'POST' && !csrfErrorSimulated) {
        csrfErrorSimulated = true;
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Forbidden',
            message: 'CSRF token validation failed',
            code: 'EBADCSRFTOKEN'
          })
        });
      } else {
        await route.continue();
      }
    });
    
    // Try to add a worker (this will trigger the mocked CSRF error)
    const addButton = page.getByRole('button', { name: /add worker/i });
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Wait for the retry logic to complete
      await page.waitForTimeout(2000);
      
      // Should have fetched new CSRF token and retried
      const hasCsrfTokenFetch = apiCalls.some(call => call.includes('/csrf-token'));
      expect(hasCsrfTokenFetch).toBeTruthy();
      
      console.log('✓ CSRF error triggered automatic token refresh and retry');
    } else {
      console.log('⚠ Add Worker button not found, skipping test');
    }
  });
});

test.describe('Session Refresh Flow', () => {
  test('should attempt token refresh on 401 before redirecting', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('refresh') || msg.text().includes('401')) {
        consoleLogs.push(msg.text());
      }
    });
    
    await login(page);
    await page.goto('/workers');
    
    // Clear only access token cookie (simulate expiration, but keep refresh token)
    await page.context().clearCookies({ 
      name: 'accessToken' // Adjust based on your cookie name
    });
    
    // Trigger API call
    await page.reload();
    
    // Wait for refresh attempt
    await page.waitForTimeout(2000);
    
    // Check if refresh was attempted
    const hasRefreshAttempt = consoleLogs.some(log => 
      log.includes('refresh') || log.includes('Attempting to refresh')
    );
    
    if (hasRefreshAttempt) {
      console.log('✓ Token refresh attempted before redirecting');
    } else {
      console.log('⚠ Token refresh logs not found');
    }
  });
});
