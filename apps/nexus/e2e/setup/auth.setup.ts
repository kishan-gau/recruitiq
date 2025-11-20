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

setup('authenticate as test user', async ({ request, page }) => {
  console.log('🔐 Authenticating test user via API (industry standard)...');
  
  // ✅ BEST PRACTICE: Use API authentication (faster, more reliable)
  // This bypasses Vite proxy issues and UI rendering delays
  // Use 127.0.0.1 instead of localhost to force IPv4 (avoids IPv6 connection issues)
  // Backend port comes from environment (set in e2e/setup.ts and .env.test)
  const backendPort = process.env.PORT || process.env.VITE_BACKEND_PORT || '3000';
  const response = await request.post(`http://127.0.0.1:${backendPort}/api/auth/tenant/login`, {
    data: {
      email: 'tenant@testcompany.com',
      password: 'Admin123!',
      product: 'nexus'
    }
  });
  
  console.log(`📡 API Response: ${response.status()}`);
  expect(response.ok()).toBeTruthy();
  
  // Get response body
  const body = await response.json();
  console.log('✅ API authentication successful');
  console.log(`👤 User: ${body.user?.email}`);
  
  // Extract cookies from Set-Cookie headers
  const setCookieHeaders = response.headers()['set-cookie'];
  console.log(`🍪 Set-Cookie headers received: ${setCookieHeaders ? 'Yes' : 'No'}`);
  
  if (setCookieHeaders) {
    // Parse cookie strings
    // Note: Playwright returns Set-Cookie as a single string with multiple cookies separated by \n
    const cookieStrings = typeof setCookieHeaders === 'string' 
      ? setCookieHeaders.split('\n').filter(s => s.trim())
      : setCookieHeaders;
    
    console.log(`📦 Number of cookies: ${cookieStrings.length}`);
    console.log(`🔍 Raw cookie strings:`, cookieStrings);
    
    // Parse each cookie and add to browser context
    const cookies = cookieStrings.map(cookieStr => {
      const parts = cookieStr.split(';')[0].trim();
      const [name, ...valueParts] = parts.split('=');
      const value = valueParts.join('='); // Handle values with = in them
      
      // Extract additional cookie attributes
      const httpOnly = cookieStr.includes('HttpOnly');
      const secure = cookieStr.includes('Secure');
      const sameSite = cookieStr.match(/SameSite=(\w+)/i)?.[1] || 'Lax';
      const path = cookieStr.match(/Path=([^;]+)/)?.[1] || '/';
      
      console.log(`  - ${name}: ${value.substring(0, 20)}... (httpOnly: ${httpOnly}, secure: ${secure})`);
      
      return {
        name,
        value,
        domain: 'localhost', // Must match baseURL domain (localhost:5175)
        path,
        httpOnly,
        secure,
        sameSite: sameSite as 'Strict' | 'Lax' | 'None',
      };
    });
    
    // Add cookies to page context before navigating
    await page.context().addCookies(cookies);
    console.log('✅ Cookies added to browser context');
  }
  
  // Now navigate to the app (cookies are already set)
  console.log('🌐 Navigating to dashboard...');
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  
  // Verify cookies were stored properly
  const storedCookies = await page.context().cookies();
  const accessTokenCookie = storedCookies.find(c => c.name === 'tenant_access_token');
  const refreshTokenCookie = storedCookies.find(c => c.name === 'tenant_refresh_token');
  
  console.log(`🔍 Total cookies in context: ${storedCookies.length}`);
  console.log(`🔍 Cookie names: ${storedCookies.map(c => c.name).join(', ')}`);
  
  expect(accessTokenCookie).toBeDefined();
  expect(refreshTokenCookie).toBeDefined();
  
  console.log(`📝 Access token cookie: ${accessTokenCookie?.name} (httpOnly: ${accessTokenCookie?.httpOnly})`);
  console.log(`📝 Refresh token cookie: ${refreshTokenCookie?.name} (httpOnly: ${refreshTokenCookie?.httpOnly})`);
  
  // Save authenticated state to file
  await page.context().storageState({ path: authFile });
  
  console.log(`💾 Saved authentication state to: ${authFile}`);
  console.log('🎉 All tests will now reuse this authenticated session');
});
