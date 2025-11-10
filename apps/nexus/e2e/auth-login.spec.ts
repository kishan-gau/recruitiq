import { test, expect } from '@playwright/test';

test.describe('Nexus Login Flow with HttpOnly Cookies', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5174/login');
  });

  test('should successfully login with valid credentials', async ({ page, context }) => {
    // Fill in login form
    await page.fill('input[type="email"]', 'johndoe@company.com');
    await page.fill('input[type="password"]', 'SecurePass123!');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('http://localhost:5174/', { timeout: 10000 });

    // Verify we're on the dashboard
    expect(page.url()).toBe('http://localhost:5174/');

    // Verify httpOnly cookies are set
    const cookies = await context.cookies();
    console.log('Cookies after login:', cookies);

    const accessTokenCookie = cookies.find(c => c.name === 'accessToken');
    const refreshTokenCookie = cookies.find(c => c.name === 'refreshToken');

    // Check that cookies exist
    expect(accessTokenCookie).toBeDefined();
    expect(refreshTokenCookie).toBeDefined();

    // Verify httpOnly flag is set
    expect(accessTokenCookie?.httpOnly).toBe(true);
    expect(refreshTokenCookie?.httpOnly).toBe(true);

    // Verify cookies are NOT accessible from JavaScript
    const canAccessToken = await page.evaluate(() => {
      return document.cookie.includes('accessToken');
    });
    expect(canAccessToken).toBe(false);

    console.log('✅ Login successful - httpOnly cookies are set correctly');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Fill in login form with invalid credentials
    await page.fill('input[type="email"]', 'invalid@company.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForSelector('text=/Invalid credentials|Login failed/i', { timeout: 5000 });

    // Verify we're still on login page
    expect(page.url()).toContain('/login');

    console.log('✅ Invalid credentials handled correctly');
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('http://localhost:5174/');

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });

    expect(page.url()).toContain('/login');

    console.log('✅ Protected route redirect working');
  });

  test('should persist session after page refresh', async ({ page, context }) => {
    // Login first
    await page.fill('input[type="email"]', 'johndoe@company.com');
    await page.fill('input[type="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5174/', { timeout: 10000 });

    // Verify cookies exist
    let cookies = await context.cookies();
    const accessTokenBefore = cookies.find(c => c.name === 'accessToken');
    expect(accessTokenBefore).toBeDefined();

    // Refresh the page
    await page.reload();

    // Should still be on dashboard (not redirected to login)
    await page.waitForLoadState('networkidle');
    expect(page.url()).toBe('http://localhost:5174/');

    // Cookies should still exist
    cookies = await context.cookies();
    const accessTokenAfter = cookies.find(c => c.name === 'accessToken');
    expect(accessTokenAfter).toBeDefined();

    console.log('✅ Session persists after page refresh');
  });

  test('should make authenticated API calls with cookies', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', 'johndoe@company.com');
    await page.fill('input[type="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5174/', { timeout: 10000 });

    // Monitor network requests
    interface ApiRequest {
      url: string;
      headers: Record<string, string>;
    }
    const apiRequests: ApiRequest[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          headers: request.headers()
        });
      }
    });

    // Wait for some API calls to be made (dashboard loading)
    await page.waitForTimeout(2000);

    // Check that API requests don't have Authorization header
    // (because tokens are in cookies)
    const hasAuthHeader = apiRequests.some((req: ApiRequest) => req.headers['authorization']);
    expect(hasAuthHeader).toBe(false);

    console.log('✅ API calls use cookies, not Authorization header');
    console.log('API requests made:', apiRequests.length);
  });
});
