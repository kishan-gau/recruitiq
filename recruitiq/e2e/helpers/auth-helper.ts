import { Page } from '@playwright/test';

/**
 * Authentication Helper
 * Provides utilities for authenticating in tests against the REAL backend API
 */

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'recruiter' | 'hiring_manager';
}

// Test user credentials - must match seed-test-data.js in backend
export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: 'test@recruitiq.com',
    password: 'TestPassword123!',
    name: 'Test User',
    role: 'admin'
  }
};

const API_BASE_URL = 'http://localhost:4000';

/**
 * Login via real backend API and get actual JWT token
 * This is the enterprise-grade solution for E2E testing
 */
export async function loginViaAPI(page: Page, user: TestUser = TEST_USERS.admin) {
  console.log(`[Auth] Logging in as ${user.email} via real backend API...`);
  
  try {
    // Make real login request to backend
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Login failed: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.accessToken) {
      throw new Error('No access token received from backend');
    }

    console.log(`[Auth] ✓ Login successful, received JWT token`);
    console.log(`[Auth] User: ${data.user?.email}, Role: ${data.user?.role}`);

    // Store the real JWT token in the browser using the same keys as the app
    await page.addInitScript((authData) => {
      window.localStorage.setItem('__recruitiq_access_token', authData.accessToken);
      if (authData.refreshToken) {
        window.localStorage.setItem('__recruitiq_refresh_token', authData.refreshToken);
      }
      // Calculate expiry (7 days from now)
      const expiryTime = Date.now() + (7 * 24 * 60 * 60 * 1000);
      window.localStorage.setItem('__recruitiq_token_expiry', expiryTime.toString());
      
      console.log('[Auth] Tokens stored in localStorage');
    }, data);

    console.log(`[Auth] ✓ Authentication setup complete\n`);
    
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Auth] ✗ Login failed:', errorMessage);
    throw new Error(`Failed to authenticate test user: ${errorMessage}`);
  }
}

/**
 * Performs login via UI (for testing the login flow itself)
 */
export async function loginViaUI(page: Page, user: TestUser) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  
  // Wait for redirect to dashboard
  await page.waitForURL(/\/(dashboard|jobs|candidates)/);
  await page.waitForLoadState('networkidle');
}

/**
 * Checks if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => 
    localStorage.getItem('__recruitiq_access_token')
  );
  return !!token;
}

/**
 * Logs out the user
 */
export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('__recruitiq_access_token');
    localStorage.removeItem('__recruitiq_refresh_token');
    localStorage.removeItem('__recruitiq_token_expiry');
    localStorage.removeItem('user');
    sessionStorage.clear();
  });
  
  await page.goto('/login');
}

/**
 * Legacy bypass auth - DEPRECATED
 * Use loginViaAPI() instead for real backend testing
 * 
 * @deprecated This was a temporary solution. Use loginViaAPI() for enterprise-grade testing.
 */
export async function bypassAuth(page: Page) {
  console.warn('[Auth] WARNING: bypassAuth() is deprecated. Use loginViaAPI() instead.');
  await loginViaAPI(page, TEST_USERS.admin);
}
