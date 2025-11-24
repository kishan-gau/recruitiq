/**
 * RBAC Integration Tests - PayLinQ Routes
 * Tests permission enforcement on PayLinQ product routes
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';
import pool from '../../src/config/database.js';
import { generateTestToken } from '../helpers/auth.js';

describe('RBAC Integration Tests - PayLinQ', () => {
  let testOrgId;
  let adminUserId;
  let regularUserId;
  let adminToken;
  let regularUserToken;
  let noPermissionToken;

  beforeAll(async () => {
    // Create test organization
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name, slug, status)
      VALUES (gen_random_uuid(), 'RBAC Test Org', 'rbac-test-org', 'active')
      RETURNING id
    `);
    testOrgId = orgResult.rows[0].id;

    // Create admin user with payroll permissions
    const adminResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, organization_id, user_role)
      VALUES (gen_random_uuid(), 'admin@rbactest.com', '$2b$10$dummyhash', $1, 'admin')
      RETURNING id
    `, [testOrgId]);
    adminUserId = adminResult.rows[0].id;

    // Create regular user with limited permissions
    const userResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, organization_id, user_role)
      VALUES (gen_random_uuid(), 'user@rbactest.com', '$2b$10$dummyhash', $1, 'user')
      RETURNING id
    `, [testOrgId]);
    regularUserId = userResult.rows[0].id;

    // Assign permissions to admin (payroll manager role)
    await pool.query(`
      INSERT INTO rbac.user_role_assignments (user_id, role_id, organization_id, assigned_by)
      SELECT $1, r.id, $2, $1
      FROM rbac.roles r
      WHERE r.code = 'payroll_manager'
    `, [adminUserId, testOrgId]);

    // Assign limited permissions to regular user (viewer role)
    await pool.query(`
      INSERT INTO rbac.user_role_assignments (user_id, role_id, organization_id, assigned_by)
      SELECT $1, r.id, $2, $3
      FROM rbac.roles r
      WHERE r.code = 'employee'
    `, [regularUserId, testOrgId, adminUserId]);

    // Generate tokens with permissions
    adminToken = generateTestToken({
      id: adminUserId,
      email: 'admin@rbactest.com',
      organizationId: testOrgId,
      role: 'admin',
      permissions: [
        'payroll:employees:view',
        'payroll:employees:create',
        'payroll:employees:edit',
        'payroll:runs:view',
        'payroll:runs:create',
        'payroll:process',
        'payroll:components:view',
        'payroll:components:manage',
        'payroll:reports:view'
      ]
    });

    regularUserToken = generateTestToken({
      id: regularUserId,
      email: 'user@rbactest.com',
      organizationId: testOrgId,
      role: 'user',
      permissions: [
        'payroll:employees:view',
        'payroll:runs:view'
      ]
    });

    noPermissionToken = generateTestToken({
      id: regularUserId,
      email: 'user@rbactest.com',
      organizationId: testOrgId,
      role: 'user',
      permissions: []
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM rbac.user_role_assignments WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
    await pool.end();
  });

  describe('Employee Routes', () => {
    it('should allow admin to view employees', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status); // 404 if no employees exist yet
    });

    it('should allow regular user to view employees', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/employees')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should deny user without permission from viewing employees', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/employees')
        .set('Authorization', `Bearer ${noPermissionToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should allow admin to create employee', async () => {
      const response = await request(app)
        .post('/api/products/paylinq/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Employee',
          email: 'test@example.com'
        });

      expect([201, 400, 422]).toContain(response.status); // May fail validation but not permission
    });

    it('should deny regular user from creating employee', async () => {
      const response = await request(app)
        .post('/api/products/paylinq/employees')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Employee',
          email: 'test@example.com'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Payroll Run Routes', () => {
    it('should allow admin to view payroll runs', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/payroll-runs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should allow regular user to view payroll runs', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/payroll-runs')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should allow admin to create payroll run', async () => {
      const response = await request(app)
        .post('/api/products/paylinq/payroll-runs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Run',
          period: '2025-11'
        });

      expect([201, 400, 422]).toContain(response.status);
    });

    it('should deny regular user from creating payroll run', async () => {
      const response = await request(app)
        .post('/api/products/paylinq/payroll-runs')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: 'Test Run',
          period: '2025-11'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Component Routes', () => {
    it('should allow admin to view components', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/components')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should deny user without permission from viewing components', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/components')
        .set('Authorization', `Bearer ${noPermissionToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow admin to create component', async () => {
      const response = await request(app)
        .post('/api/products/paylinq/components')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TEST_COMP',
          name: 'Test Component'
        });

      expect([201, 400, 422]).toContain(response.status);
    });

    it('should deny regular user from creating component', async () => {
      const response = await request(app)
        .post('/api/products/paylinq/components')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          code: 'TEST_COMP',
          name: 'Test Component'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Report Routes', () => {
    it('should allow admin to view payroll summary report', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/reports/payroll-summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should deny user without permission from viewing reports', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/reports/payroll-summary')
        .set('Authorization', `Bearer ${noPermissionToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Worker Type Routes', () => {
    it('should allow admin to view worker types', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/worker-types')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should deny user without permission from viewing worker types', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/worker-types')
        .set('Authorization', `Bearer ${noPermissionToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Allowance Routes', () => {
    it('should allow admin to view allowances', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/allowances')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should deny user without permission', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/allowances')
        .set('Authorization', `Bearer ${noPermissionToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Deduction Routes', () => {
    it('should allow admin to view deductions', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/deductions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should deny user without permission', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/deductions')
        .set('Authorization', `Bearer ${noPermissionToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Authentication Required', () => {
    it('should return 401 without authentication token', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/employees');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/products/paylinq/employees')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});
