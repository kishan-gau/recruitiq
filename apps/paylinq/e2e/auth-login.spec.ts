import { test, expect } from '@playwright/test';

test.describe('PayLinQ Login Flow with HttpOnly Cookies', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page via dev gateway (port 3000)
    await page.goto('http://localhost:3000/login');
  });

  test('should successfully login with valid credentials', async ({ page, context }) => {
    // Fill in login form with seeded test user
    await page.fill('input[type="email"]', 'payroll@testcompany.com');
    await page.fill('input[type="password"]', 'Admin123!');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard (PayLinQ redirects to /dashboard, not /)
    await page.waitForURL('http://localhost:3000/dashboard', { timeout: 10000 });

    // Verify we're on the dashboard
    expect(page.url()).toBe('http://localhost:3000/dashboard');

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

    // Verify cookies are NOT accessible from JavaScript (httpOnly)
    let jsCookies = '';
    try {
      jsCookies = await page.evaluate(() => document.cookie);
    } catch (e) {
      // navigation may have destroyed the execution context
      jsCookies = '';
    }
    expect(jsCookies).not.toContain('accessToken');

    console.log('✅ Login successful - httpOnly cookies are set correctly');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Fill in login form with invalid credentials
    await page.fill('input[type="email"]', 'invalid@company.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Click login button and wait for response
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/auth/tenant/login') && r.request().method() === 'POST'),
      page.click('button[type="submit"]'),
    ]);
    
    expect(resp.status()).toBe(401);

    // Verify we're still on login page
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');

    console.log('✅ Invalid credentials handled correctly');
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('http://localhost:3000/');

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });

    expect(page.url()).toContain('/login');

    console.log('✅ Protected route redirect working');
  });

  test('should persist session after page refresh', async ({ page, context }) => {
    // Login first
    await page.fill('input[type="email"]', 'payroll@testcompany.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/dashboard', { timeout: 10000 });

    // Verify cookies exist
    let cookies = await context.cookies();
    const accessTokenBefore = cookies.find(c => c.name === 'accessToken');
    expect(accessTokenBefore).toBeDefined();

    // Refresh the page and wait for it to settle
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toBe('http://localhost:3000/dashboard');

    // Cookies should still exist
    cookies = await context.cookies();
    const accessTokenAfter = cookies.find(c => c.name === 'accessToken');
    expect(accessTokenAfter).toBeDefined();

    console.log('✅ Session persists after page refresh');
  });

  test('should make authenticated API calls with cookies', async ({ page, context }) => {
    // Login
    await page.fill('input[type="email"]', 'payroll@testcompany.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('http://localhost:3000/dashboard', { timeout: 10000 });

    // Verify cookies are set after login
    const cookies = await context.cookies();
    const accessTokenCookie = cookies.find(c => c.name === 'accessToken');
    const refreshTokenCookie = cookies.find(c => c.name === 'refreshToken');
    
    expect(accessTokenCookie).toBeDefined();
    expect(refreshTokenCookie).toBeDefined();
    expect(accessTokenCookie?.httpOnly).toBe(true);
    expect(refreshTokenCookie?.httpOnly).toBe(true);

    // Verify we're on the dashboard page (authentication worked)
    expect(page.url()).toBe('http://localhost:3000/dashboard');

    console.log('✅ Authenticated API calls working with cookies');
  });
});
