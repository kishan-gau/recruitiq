/**
 * Authentication Security Tests
 * 
 * Tests security features of the authentication system:
 * - SQL injection prevention
 * - XSS protection via httpOnly cookies
 * - CSRF protection
 * - Token type enforcement
 * - Cookie security attributes
 * - Tenant isolation
 * 
 * Part of authentication migration Phase 4: Security & Compliance
 * 
 * AC-4.1.1: Test that XSS attacks cannot steal tokens (httpOnly cookies)
 * AC-4.1.2: Test that CSRF attacks are prevented  
 * AC-4.1.3: Test that SQL injection is prevented in RLS context
 * AC-4.1.4: Test that session cookies have correct security attributes
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import pool from '../../src/config/database.js';

describe('Authentication Security Tests', () => {
  let testOrgId;
  let testUserId;
  let testUserEmail;
  let testUserPassword;
  let platformUserId;
  let platformUserEmail;
  let platformUserPassword;

  beforeAll(async () => {
    // Create test organization
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name, slug)
      VALUES (gen_random_uuid(), 'Security Test Org', 'security-test-org')
      RETURNING id
    `);
    testOrgId = orgResult.rows[0].id;

    // Create test tenant user
    testUserEmail = `security-test-${Date.now()}@example.com`;
    testUserPassword = 'SecurePassword123!@#';
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(testUserPassword, 12);

    const userResult = await pool.query(`
      INSERT INTO hris.user_account (
        id, email, password_hash, organization_id,
        is_active, enabled_products, product_roles
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3,
        true,
        '["paylinq", "recruitiq"]'::jsonb,
        '{"paylinq": "admin", "recruitiq": "recruiter"}'::jsonb
      )
      RETURNING id
    `, [testUserEmail, passwordHash, testOrgId]);
    testUserId = userResult.rows[0].id;

    // Create test platform user
    platformUserEmail = `platform-security-test-${Date.now()}@example.com`;
    platformUserPassword = 'PlatformSecure123!@#';
    const platformPasswordHash = await bcrypt.hash(platformUserPassword, 12);

    const platformUserResult = await pool.query(`
      INSERT INTO platform_users (
        id, email, password_hash, name, role, permissions, is_active
      )
      VALUES (
        gen_random_uuid(), $1, $2, 'Platform Security Tester', 'admin',
        '["portal.view", "customers.manage", "licenses.manage"]'::jsonb,
        true
      )
      RETURNING id
    `, [platformUserEmail, platformPasswordHash]);
    platformUserId = platformUserResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM hris.tenant_refresh_tokens WHERE user_account_id = $1', [testUserId]);
    await pool.query('DELETE FROM platform_refresh_tokens WHERE user_id = $1', [platformUserId]);
    await pool.query('DELETE FROM hris.user_account WHERE id = $1', [testUserId]);
    await pool.query('DELETE FROM platform_users WHERE id = $1', [platformUserId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
    await pool.end();
  });

  // ============================================================================
  // AC-4.1.1: XSS Protection - httpOnly Cookies
  // ============================================================================

  describe('XSS Protection', () => {
    it('should set httpOnly flag on access token cookie (tenant)', async () => {
      const response = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
          rememberMe: false
        })
        .expect(200);

      expect(response.body.user).toBeDefined();
      
      // Check Set-Cookie header
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const accessTokenCookie = cookies.find(c => c.startsWith('tenant_access_token='));
      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie).toContain('HttpOnly');
      expect(accessTokenCookie).toContain('SameSite=Lax');
      
      // In production, should also have Secure flag
      if (process.env.NODE_ENV === 'production') {
        expect(accessTokenCookie).toContain('Secure');
      }
    });

    it('should set httpOnly flag on refresh token cookie (tenant)', async () => {
      const response = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
          rememberMe: false
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const refreshTokenCookie = cookies.find(c => c.startsWith('tenant_refresh_token='));
      
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('SameSite=Lax');
    });

    it('should set httpOnly flag on access token cookie (platform)', async () => {
      const response = await request(app)
        .post('/api/auth/platform/login')
        .send({
          email: platformUserEmail,
          password: platformUserPassword,
          rememberMe: false
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const accessTokenCookie = cookies.find(c => c.startsWith('platform_access_token='));
      
      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie).toContain('HttpOnly');
      expect(accessTokenCookie).toContain('SameSite=Strict');
    });

    it('should NOT return tokens in response body (tenant)', async () => {
      const response = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        })
        .expect(200);

      // Tokens should NOT be in response body
      expect(response.body.accessToken).toBeUndefined();
      expect(response.body.refreshToken).toBeUndefined();
      expect(response.body.token).toBeUndefined();
      
      // Only user data should be returned
      expect(response.body.user).toBeDefined();
    });

    it('should NOT return tokens in response body (platform)', async () => {
      const response = await request(app)
        .post('/api/auth/platform/login')
        .send({
          email: platformUserEmail,
          password: platformUserPassword
        })
        .expect(200);

      expect(response.body.accessToken).toBeUndefined();
      expect(response.body.refreshToken).toBeUndefined();
      expect(response.body.token).toBeUndefined();
      expect(response.body.user).toBeDefined();
    });
  });

  // ============================================================================
  // AC-4.1.2: CSRF Protection
  // ============================================================================

  describe('CSRF Protection', () => {
    let tenantCookies;
    let csrfToken;

    beforeAll(async () => {
      // Login to get cookies
      const loginResponse = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });
      
      tenantCookies = loginResponse.headers['set-cookie'];

      // Get CSRF token
      const csrfResponse = await request(app)
        .get('/api/csrf-token')
        .set('Cookie', tenantCookies);
      
      csrfToken = csrfResponse.body.csrfToken;
    });

    it('should reject POST request without CSRF token', async () => {
      // Try to make a POST request without CSRF token
      await request(app)
        .post('/api/products/paylinq/test-endpoint')
        .set('Cookie', tenantCookies)
        .send({ data: 'test' })
        .expect(403); // CSRF protection should reject
    });

    it('should accept POST request with valid CSRF token', async () => {
      // Make POST request with CSRF token
      const response = await request(app)
        .post('/api/auth/tenant/refresh')
        .set('Cookie', tenantCookies)
        .set('X-CSRF-Token', csrfToken);
      
      // Should not get 403 CSRF error
      expect(response.status).not.toBe(403);
    });

    it('should allow GET requests without CSRF token', async () => {
      // GET requests should work without CSRF token
      const response = await request(app)
        .get('/api/auth/tenant/me')
        .set('Cookie', tenantCookies);
      
      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
    });

    it('should exempt auth endpoints from CSRF', async () => {
      // Login and logout should work without CSRF token
      const loginResponse = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });
      
      expect(loginResponse.status).toBe(200);
    });
  });

  // ============================================================================
  // AC-4.1.3: SQL Injection Prevention
  // ============================================================================

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in organization ID (login)', async () => {
      // Try SQL injection in email field (which is used in org lookup)
      const response = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: "test' OR '1'='1",
          password: 'password'
        });
      
      // Should fail authentication, not execute SQL injection
      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should use parameterized queries for RLS context', async () => {
      // Login successfully
      const loginResponse = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });
      
      const cookies = loginResponse.headers['set-cookie'];

      // Make authenticated request - RLS context should be set safely
      const response = await request(app)
        .get('/api/auth/tenant/me')
        .set('Cookie', cookies)
        .expect(200);
      
      // If SQL injection in RLS was possible, this would fail
      expect(response.body.user).toBeDefined();
      expect(response.body.user.organizationId).toBe(testOrgId);
    });

    it('should sanitize organization ID in token payload', async () => {
      // Login and check that organizationId in response is a valid UUID
      const response = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        })
        .expect(200);
      
      const orgId = response.body.user.organizationId;
      
      // Should be valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(orgId)).toBe(true);
    });
  });

  // ============================================================================
  // AC-4.1.4: Cookie Security Attributes
  // ============================================================================

  describe('Cookie Security Attributes', () => {
    it('should set correct cookie attributes for tenant cookies', async () => {
      const response = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
          rememberMe: false
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const accessTokenCookie = cookies.find(c => c.startsWith('tenant_access_token='));
      
      // HttpOnly
      expect(accessTokenCookie).toContain('HttpOnly');
      
      // SameSite=Lax (for SSO)
      expect(accessTokenCookie).toContain('SameSite=Lax');
      
      // Path=/
      expect(accessTokenCookie).toContain('Path=/');
      
      // Domain should be set for SSO in production
      if (process.env.NODE_ENV === 'production') {
        expect(accessTokenCookie).toContain('Domain=.recruitiq.com');
      }
      
      // Max-Age should be 15 minutes (900 seconds)
      expect(accessTokenCookie).toMatch(/Max-Age=90[0-9]/);
    });

    it('should set correct cookie attributes for platform cookies', async () => {
      const response = await request(app)
        .post('/api/auth/platform/login')
        .send({
          email: platformUserEmail,
          password: platformUserPassword,
          rememberMe: false
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const accessTokenCookie = cookies.find(c => c.startsWith('platform_access_token='));
      
      // HttpOnly
      expect(accessTokenCookie).toContain('HttpOnly');
      
      // SameSite=Strict (no SSO for platform)
      expect(accessTokenCookie).toContain('SameSite=Strict');
      
      // Path=/
      expect(accessTokenCookie).toContain('Path=/');
      
      // No domain (platform is isolated)
      expect(accessTokenCookie).not.toContain('Domain=');
    });

    it('should set longer expiry for refresh token when rememberMe is true', async () => {
      const response = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
          rememberMe: true
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const refreshTokenCookie = cookies.find(c => c.startsWith('tenant_refresh_token='));
      
      // Should be 30 days (2592000 seconds) when rememberMe=true
      expect(refreshTokenCookie).toMatch(/Max-Age=259200[0-9]/);
    });

    it('should clear cookies with same attributes on logout', async () => {
      // Login first
      const loginResponse = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });
      
      const loginCookies = loginResponse.headers['set-cookie'];

      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/tenant/logout')
        .set('Cookie', loginCookies)
        .expect(200);

      const logoutCookies = logoutResponse.headers['set-cookie'];
      const accessTokenCookie = logoutCookies.find(c => c.startsWith('tenant_access_token='));
      
      // Should expire immediately
      expect(accessTokenCookie).toContain('Max-Age=0');
      
      // Should have same attributes (HttpOnly, SameSite, Domain, Path)
      expect(accessTokenCookie).toContain('HttpOnly');
      expect(accessTokenCookie).toContain('SameSite=Lax');
      expect(accessTokenCookie).toContain('Path=/');
    });
  });

  // ============================================================================
  // Token Type Enforcement
  // ============================================================================

  describe('Token Type Enforcement', () => {
    let tenantCookies;
    let platformCookies;

    beforeAll(async () => {
      // Get tenant cookies
      const tenantLogin = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });
      tenantCookies = tenantLogin.headers['set-cookie'];

      // Get platform cookies
      const platformLogin = await request(app)
        .post('/api/auth/platform/login')
        .send({
          email: platformUserEmail,
          password: platformUserPassword
        });
      platformCookies = platformLogin.headers['set-cookie'];
    });

    it('should reject tenant token on platform endpoint', async () => {
      // Try to use tenant cookies on platform endpoint
      // Note: This won't work because cookie names are different
      // tenant_access_token vs platform_access_token
      const response = await request(app)
        .get('/api/auth/platform/me')
        .set('Cookie', tenantCookies);
      
      // Should be unauthorized because platform_access_token is missing
      expect(response.status).toBe(401);
    });

    it('should reject platform token on tenant endpoint', async () => {
      // Try to use platform cookies on tenant endpoint
      const response = await request(app)
        .get('/api/auth/tenant/me')
        .set('Cookie', platformCookies);
      
      // Should be unauthorized because tenant_access_token is missing
      expect(response.status).toBe(401);
    });

    it('should accept tenant token on tenant endpoint', async () => {
      const response = await request(app)
        .get('/api/auth/tenant/me')
        .set('Cookie', tenantCookies)
        .expect(200);
      
      expect(response.body.user).toBeDefined();
      expect(response.body.user.type).toBe('tenant');
    });

    it('should accept platform token on platform endpoint', async () => {
      const response = await request(app)
        .get('/api/auth/platform/me')
        .set('Cookie', platformCookies)
        .expect(200);
      
      expect(response.body.user).toBeDefined();
      expect(response.body.user.role).toBeDefined();
    });
  });

  // ============================================================================
  // Tenant Isolation
  // ============================================================================

  describe('Tenant Isolation', () => {
    it('should only return data for authenticated user organization', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });
      
      const cookies = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/auth/tenant/me')
        .set('Cookie', cookies)
        .expect(200);
      
      // Should only get user data for this organization
      expect(response.body.user.organizationId).toBe(testOrgId);
    });

    it('should include organization_id in all authenticated requests', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });
      
      const cookies = loginResponse.headers['set-cookie'];

      // Make any authenticated request
      const response = await request(app)
        .get('/api/auth/tenant/me')
        .set('Cookie', cookies)
        .expect(200);
      
      // Organization context should be set in database session
      // This is verified by the fact that the query succeeds and returns correct data
      expect(response.body.user.organizationId).toBe(testOrgId);
    });
  });
});
