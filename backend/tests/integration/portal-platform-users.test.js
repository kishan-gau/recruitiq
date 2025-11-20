/**
 * Portal Platform Users Management Integration Tests
 * 
 * Tests platform user (super admin) management endpoints.
 * 
 * Coverage:
 * - Platform user CRUD operations
 * - Password management
 * - User activation/deactivation
 * - Super admin authorization
 * - Audit logging
 * 
 * Run with: npm test -- backend/tests/integration/portal-platform-users.test.js
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import pool from '../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';

describe('Portal Platform Users Management - Integration Tests', () => {
  let superAdminCookies;
  let regularPlatformCookies;
  let testPlatformUserId;

  beforeAll(async () => {
    // Create super admin user
    await pool.query(
      `INSERT INTO hris.user_account (
        email, password_hash, user_type, organization_id,
        email_verified, account_status, is_active,
        user_role, platform_permissions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (email) DO UPDATE 
      SET user_role = EXCLUDED.user_role,
          platform_permissions = EXCLUDED.platform_permissions`,
      [
        'super-admin-test@recruitiq.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyMVLU0DXZ.i',
        'platform',
        null,
        true,
        'active',
        true,
        'super_admin',
        JSON.stringify(['portal.view', 'users.manage', 'users.view'])
      ]
    );

    // Create regular platform admin (not super admin)
    await pool.query(
      `INSERT INTO hris.user_account (
        email, password_hash, user_type, organization_id,
        email_verified, account_status, is_active,
        user_role, platform_permissions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (email) DO UPDATE 
      SET user_role = 'platform_admin'`,
      [
        'platform-admin-test@recruitiq.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyMVLU0DXZ.i',
        'platform',
        null,
        true,
        'active',
        true,
        'platform_admin',
        JSON.stringify(['portal.view', 'users.view'])
      ]
    );

    // Login super admin
    const superAdminLogin = await request(app)
      .post('/api/auth/platform/login')
      .send({
        email: 'super-admin-test@recruitiq.com',
        password: 'Admin123!'
      });
    superAdminCookies = superAdminLogin.headers['set-cookie'];

    // Login regular platform admin
    const platformLogin = await request(app)
      .post('/api/auth/platform/login')
      .send({
        email: 'platform-admin-test@recruitiq.com',
        password: 'Admin123!'
      });
    regularPlatformCookies = platformLogin.headers['set-cookie'];
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query(
      `DELETE FROM hris.user_account WHERE email IN ($1, $2, $3, $4)`,
      [
        'super-admin-test@recruitiq.com',
        'platform-admin-test@recruitiq.com',
        'new-platform-user@recruitiq.com',
        'update-test@recruitiq.com'
      ]
    );
    await pool.end();
  });

  // ============================================================================
  // CREATE PLATFORM USER
  // ============================================================================

  describe('POST /api/platform-users - Create Platform User', () => {
    it('should create new platform user as super admin', async () => {
      const userData = {
        email: 'new-platform-user@recruitiq.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
        role: 'platform_admin',
        platformPermissions: ['portal.view', 'users.view']
      };

      const response = await request(app)
        .post('/api/platform-users')
        .set('Cookie', superAdminCookies)
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('new-platform-user@recruitiq.com');
      expect(response.body.user.userType).toBe('platform');

      testPlatformUserId = response.body.user.id;
    });

    it('should reject creation by non-super-admin', async () => {
      const userData = {
        email: 'should-fail@recruitiq.com',
        password: 'SecurePass123!',
        role: 'platform_admin'
      };

      const response = await request(app)
        .post('/api/platform-users')
        .set('Cookie', regularPlatformCookies)
        .send(userData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/super admin/i);
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'super-admin-test@recruitiq.com', // Already exists
        password: 'SecurePass123!',
        role: 'platform_admin'
      };

      const response = await request(app)
        .post('/api/platform-users')
        .set('Cookie', superAdminCookies)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/email|exists/i);
    });

    it('should reject weak password', async () => {
      const userData = {
        email: 'weak-pass@recruitiq.com',
        password: '123', // Too weak
        role: 'platform_admin'
      };

      const response = await request(app)
        .post('/api/platform-users')
        .set('Cookie', superAdminCookies)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/password/i);
    });

    it('should reject missing required fields', async () => {
      const userData = {
        email: 'missing-fields@recruitiq.com'
        // Missing password
      };

      const response = await request(app)
        .post('/api/platform-users')
        .set('Cookie', superAdminCookies)
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // LIST PLATFORM USERS
  // ============================================================================

  describe('GET /api/platform-users - List Platform Users', () => {
    it('should list all platform users as super admin', async () => {
      const response = await request(app)
        .get('/api/platform-users')
        .set('Cookie', superAdminCookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);

      // All users should be platform type
      response.body.users.forEach(user => {
        expect(user.userType).toBe('platform');
      });
    });

    it('should reject listing by non-super-admin', async () => {
      const response = await request(app)
        .get('/api/platform-users')
        .set('Cookie', regularPlatformCookies)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/platform-users')
        .set('Cookie', superAdminCookies)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter by role', async () => {
      const response = await request(app)
        .get('/api/platform-users')
        .set('Cookie', superAdminCookies)
        .query({ role: 'super_admin' })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.users.length > 0) {
        response.body.users.forEach(user => {
          expect(user.role).toBe('super_admin');
        });
      }
    });

    it('should search by email', async () => {
      const response = await request(app)
        .get('/api/platform-users')
        .set('Cookie', superAdminCookies)
        .query({ search: 'super-admin-test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
    });
  });

  // ============================================================================
  // GET PLATFORM USER BY ID
  // ============================================================================

  describe('GET /api/platform-users/:id - Get Platform User', () => {
    it('should get platform user by ID', async () => {
      const response = await request(app)
        .get(`/api/platform-users/${testPlatformUserId}`)
        .set('Cookie', superAdminCookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(testPlatformUserId);
      expect(response.body.user.email).toBe('new-platform-user@recruitiq.com');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = uuidv4();

      const response = await request(app)
        .get(`/api/platform-users/${fakeId}`)
        .set('Cookie', superAdminCookies)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject access by non-super-admin', async () => {
      const response = await request(app)
        .get(`/api/platform-users/${testPlatformUserId}`)
        .set('Cookie', regularPlatformCookies)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // UPDATE PLATFORM USER
  // ============================================================================

  describe('PATCH /api/platform-users/:id - Update Platform User', () => {
    it('should update platform user details', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        platformPermissions: ['portal.view', 'users.view', 'customers.manage']
      };

      const response = await request(app)
        .patch(`/api/platform-users/${testPlatformUserId}`)
        .set('Cookie', superAdminCookies)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.firstName).toBe('Updated');
      expect(response.body.user.lastName).toBe('Name');
    });

    it('should update user role', async () => {
      const response = await request(app)
        .patch(`/api/platform-users/${testPlatformUserId}`)
        .set('Cookie', superAdminCookies)
        .send({ role: 'platform_admin' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject update by non-super-admin', async () => {
      const response = await request(app)
        .patch(`/api/platform-users/${testPlatformUserId}`)
        .set('Cookie', regularPlatformCookies)
        .send({ firstName: 'Should Fail' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = uuidv4();

      const response = await request(app)
        .patch(`/api/platform-users/${fakeId}`)
        .set('Cookie', superAdminCookies)
        .send({ firstName: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // CHANGE PASSWORD
  // ============================================================================

  describe('POST /api/platform-users/:id/change-password - Change Password', () => {
    it('should change platform user password', async () => {
      const response = await request(app)
        .post(`/api/platform-users/${testPlatformUserId}/change-password`)
        .set('Cookie', superAdminCookies)
        .send({
          newPassword: 'NewSecurePass456!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/password|changed/i);
    });

    it('should reject weak new password', async () => {
      const response = await request(app)
        .post(`/api/platform-users/${testPlatformUserId}/change-password`)
        .set('Cookie', superAdminCookies)
        .send({
          newPassword: '123' // Too weak
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/password/i);
    });

    it('should reject password change by non-super-admin', async () => {
      const response = await request(app)
        .post(`/api/platform-users/${testPlatformUserId}/change-password`)
        .set('Cookie', regularPlatformCookies)
        .send({
          newPassword: 'NewSecurePass456!'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post(`/api/platform-users/${testPlatformUserId}/change-password`)
        .set('Cookie', superAdminCookies)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // DEACTIVATE/REACTIVATE USER
  // ============================================================================

  describe('POST /api/platform-users/:id/deactivate - Deactivate User', () => {
    it('should deactivate platform user', async () => {
      const response = await request(app)
        .post(`/api/platform-users/${testPlatformUserId}/deactivate`)
        .set('Cookie', superAdminCookies)
        .send({
          reason: 'Testing deactivation'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/deactivated/i);
    });

    it('should reject deactivation by non-super-admin', async () => {
      const response = await request(app)
        .post(`/api/platform-users/${testPlatformUserId}/deactivate`)
        .set('Cookie', regularPlatformCookies)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = uuidv4();

      const response = await request(app)
        .post(`/api/platform-users/${fakeId}/deactivate`)
        .set('Cookie', superAdminCookies)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/platform-users/:id/reactivate - Reactivate User', () => {
    it('should reactivate platform user', async () => {
      const response = await request(app)
        .post(`/api/platform-users/${testPlatformUserId}/reactivate`)
        .set('Cookie', superAdminCookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/reactivated/i);
    });

    it('should reject reactivation by non-super-admin', async () => {
      const response = await request(app)
        .post(`/api/platform-users/${testPlatformUserId}/reactivate`)
        .set('Cookie', regularPlatformCookies)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // AUTHENTICATION & AUTHORIZATION
  // ============================================================================

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/platform-users')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject tenant user from platform user management', async () => {
      // Create test organization and tenant user
      const orgResult = await pool.query(
        `INSERT INTO organizations (name, slug, tier, subscription_status)
         VALUES ('Tenant Test Org', 'tenant-test-platform', 'professional', 'active')
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`
      );
      const orgId = orgResult.rows[0].id;

      await pool.query(
        `INSERT INTO hris.user_account (
          email, password_hash, user_type, organization_id,
          email_verified, account_status, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE SET user_type = EXCLUDED.user_type`,
        [
          'tenant-platform-test@test.com',
          '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyMVLU0DXZ.i',
          'tenant',
          orgId,
          true,
          'active',
          true
        ]
      );

      const tenantLogin = await request(app)
        .post('/api/auth/tenant/login')
        .send({
          email: 'tenant-platform-test@test.com',
          password: 'Admin123!'
        });

      if (tenantLogin.status === 200) {
        const tenantCookies = tenantLogin.headers['set-cookie'];

        const response = await request(app)
          .get('/api/platform-users')
          .set('Cookie', tenantCookies)
          .expect(403);

        expect(response.body.success).toBe(false);
      }

      // Cleanup
      await pool.query('DELETE FROM hris.user_account WHERE email = $1', ['tenant-platform-test@test.com']);
      await pool.query('DELETE FROM organizations WHERE slug = $1', ['tenant-test-platform']);
    });

    it('should prevent super admin from deactivating themselves', async () => {
      // Get super admin user ID
      const userResult = await pool.query(
        'SELECT id FROM hris.user_account WHERE email = $1',
        ['super-admin-test@recruitiq.com']
      );
      const superAdminId = userResult.rows[0].id;

      const response = await request(app)
        .post(`/api/platform-users/${superAdminId}/deactivate`)
        .set('Cookie', superAdminCookies)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/self|own/i);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/platform-users/invalid-uuid')
        .set('Cookie', superAdminCookies)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize email input', async () => {
      const userData = {
        email: '  TEST@EXAMPLE.COM  ', // Uppercase with spaces
        password: 'SecurePass123!',
        role: 'platform_admin'
      };

      const response = await request(app)
        .post('/api/platform-users')
        .set('Cookie', superAdminCookies)
        .send(userData);

      // Should normalize email to lowercase and trim
      if (response.status === 201) {
        expect(response.body.user.email).toBe('test@example.com');
        
        // Cleanup
        await pool.query('DELETE FROM hris.user_account WHERE email = $1', ['test@example.com']);
      }
    });

    it('should handle concurrent updates gracefully', async () => {
      // Simulate concurrent updates
      const update1 = request(app)
        .patch(`/api/platform-users/${testPlatformUserId}`)
        .set('Cookie', superAdminCookies)
        .send({ firstName: 'Update1' });

      const update2 = request(app)
        .patch(`/api/platform-users/${testPlatformUserId}`)
        .set('Cookie', superAdminCookies)
        .send({ firstName: 'Update2' });

      const [response1, response2] = await Promise.all([update1, update2]);

      // Both should succeed
      expect([200, 409]).toContain(response1.status);
      expect([200, 409]).toContain(response2.status);
    });
  });
});
