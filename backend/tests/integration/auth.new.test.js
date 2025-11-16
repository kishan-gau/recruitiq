/**
 * Authentication Integration Tests
 * Tests the new separated authentication system (platform vs tenant)
 * 
 * Run with: npm test -- backend/tests/integration/auth.new.test.js
 */

import request from 'supertest';
import app from '../../src/server.js';
import * as db from '../../src/config/database.js';


// SKIPPED: Bearer token auth incomplete - migrating to cookie-based auth
// TODO: Re-enable once cookie auth is implemented for all apps

describe.skip('Authentication System - Platform vs Tenant', () => {
  let platformAccessToken;
  let platformRefreshToken;
  let tenantAccessToken;
  let tenantRefreshToken;
  let testOrganizationId;

  beforeAll(async () => {
    // Get organization ID from seed data
    const orgResult = await db.query(
      "SELECT id FROM organizations WHERE name = 'Test Company Ltd' LIMIT 1"
    );
    testOrganizationId = orgResult.rows[0]?.id;
  });

  afterAll(async () => {
    await db.closePool();
  });

  describe.skip('Platform Authentication', () => {
    it('should login platform user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/platform/login')
        .send({
          email: 'admin@recruitiq.com',
          password: 'Admin123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body?.data?.user.type).toBe('platform');
      expect(response.body?.data?.user.role).toBe('super_admin');

      platformAccessToken = response.body.data.accessToken;
      platformRefreshToken = response.body.data.refreshToken;
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/platform/login')
        .send({
          email: 'admin@recruitiq.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should get platform user profile', async () => {
      const response = await request(app)
        .get('/api/auth/platform/me')
        .set('Authorization', `Bearer ${platformAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body?.data?.user.type).toBe('platform');
      expect(response.body?.data?.user.email).toBe('admin@recruitiq.com');
    });

    it('should refresh platform access token', async () => {
      const response = await request(app)
        .post('/api/auth/platform/refresh')
        .send({
          refreshToken: platformRefreshToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should logout platform user', async () => {
      const response = await request(app)
        .post('/api/auth/platform/logout')
        .send({
          refreshToken: platformRefreshToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe.skip('Tenant Authentication', () => {
    it('should reject tenant login without organizationId', async () => {
      const response = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: 'tenant@testcompany.com',
          password: 'Admin123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('organization');
    });

    it('should login tenant user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: 'tenant@testcompany.com',
          password: 'Admin123!',
          organizationId: testOrganizationId
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body?.data?.user.type).toBe('tenant');
      expect(response.body?.data?.user.organizationId).toBe(testOrganizationId);
      expect(response.body?.data?.user.enabledProducts).toContain('nexus');

      tenantAccessToken = response.body.data.accessToken;
      tenantRefreshToken = response.body.data.refreshToken;
    });

    it('should get tenant user profile', async () => {
      const response = await request(app)
        .get('/api/auth/tenant/me')
        .set('Authorization', `Bearer ${tenantAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body?.data?.user.type).toBe('tenant');
      expect(response.body?.data?.user.email).toBe('tenant@testcompany.com');
    });

    it('should switch product context', async () => {
      const response = await request(app)
        .post('/api/auth/tenant/switch-product')
        .set('Authorization', `Bearer ${tenantAccessToken}`)
        .send({
          product: 'paylinq'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.product).toBe('paylinq');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('role');
    });

    it('should reject switching to product without access', async () => {
      // Login as payroll user (only has paylinq access)
      const loginRes = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: 'payroll@testcompany.com',
          password: 'Admin123!',
          organizationId: testOrganizationId
        });

      const payrollToken = loginRes.body.data.accessToken;

      const response = await request(app)
        .post('/api/auth/tenant/switch-product')
        .set('Authorization', `Bearer ${payrollToken}`)
        .send({
          product: 'nexus'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('do not have access');
    });

    it('should refresh tenant access token', async () => {
      const response = await request(app)
        .post('/api/auth/tenant/refresh')
        .send({
          refreshToken: tenantRefreshToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should logout tenant user', async () => {
      const response = await request(app)
        .post('/api/auth/tenant/logout')
        .send({
          refreshToken: tenantRefreshToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe.skip('Token Type Enforcement', () => {
    let platformToken;
    let tenantToken;

    beforeAll(async () => {
      // Get fresh platform token
      const platformRes = await request(app)
        .post('/api/auth/platform/login')
        .send({
          email: 'admin@recruitiq.com',
          password: 'Admin123!'
        });
      platformToken = platformRes.body.data.accessToken;

      // Get fresh tenant token
      const tenantRes = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: 'tenant@testcompany.com',
          password: 'Admin123!',
          organizationId: testOrganizationId
        });
      tenantToken = tenantRes.body.data.accessToken;
    });

    it('should reject tenant token on platform endpoint', async () => {
      const response = await request(app)
        .get('/api/auth/platform/me')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token type');
    });

    it('should reject platform token on tenant endpoint', async () => {
      const response = await request(app)
        .get('/api/auth/tenant/me')
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token type');
    });

    it('should reject tenant token on platform-only route', async () => {
      // Assuming /api/admin/products requires platform authentication
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow platform token on platform-only route', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe.skip('Session Management', () => {
    let userToken;
    let refreshToken;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/platform/login')
        .send({
          email: 'admin@recruitiq.com',
          password: 'Admin123!'
        });
      userToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should revoke all sessions', async () => {
      const response = await request(app)
        .post('/api/auth/platform/revoke-all-sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject refresh after revoking all sessions', async () => {
      const response = await request(app)
        .post('/api/auth/platform/refresh')
        .send({
          refreshToken: refreshToken
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe.skip('Account Security', () => {
    it('should lock account after 5 failed login attempts', async () => {
      // Try 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/platform/login')
          .send({
            email: 'license@recruitiq.com',
            password: 'wrongpassword'
          });
      }

      // 6th attempt should show account locked
      const response = await request(app)
        .post('/api/auth/platform/login')
        .send({
          email: 'license@recruitiq.com',
          password: 'Admin123!'
        })
        .expect(403);

      expect(response.body.message).toContain('locked');
    });
  });

  describe.skip('Product Access Control', () => {
    it('should allow tenant with paylinq access to switch to paylinq', async () => {
      const loginRes = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: 'tenant@testcompany.com',
          password: 'Admin123!',
          organizationId: testOrganizationId
        });

      const token = loginRes.body.data.accessToken;

      const response = await request(app)
        .post('/api/auth/tenant/switch-product')
        .set('Authorization', `Bearer ${token}`)
        .send({
          product: 'paylinq'
        })
        .expect(200);

      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.product).toBe('paylinq');
    });

    it('should return user product roles in login response', async () => {
      const response = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: 'tenant@testcompany.com',
          password: 'Admin123!',
          organizationId: testOrganizationId
        });

      expect(response.body?.data?.user.productRoles).toBeDefined();
      expect(response.body?.data?.user.productRoles).toHaveProperty('nexus');
      expect(response.body?.data?.user.productRoles).toHaveProperty('paylinq');
    });
  });
});
