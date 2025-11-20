/**
 * Integration Tests: Workers API
 * Tests all worker management endpoints with cookie-based authentication
 */

import { jest } from '@jest/globals';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import app from '../../../../src/server.js';
import pool, { query } from '../../../../src/config/database.js';
import {
  createTestOrganization,
  createTestDepartment,
  createTestLocation,
  createTestEmployee,
  createTestWorker,
  cleanupTestData
} from './setup.js';
describe('Integration: Workers API', () => {
  let organizationId;
  let userId;
  let agent;
  let csrfToken;
  let departmentId;
  let locationId;
  let employeeId;
  let workerId;

  beforeAll(async () => {
    // Setup test environment with authenticated agent
    const org = await createTestOrganization();
    organizationId = org.organizationId;
    userId = org.userId;
    agent = org.agent;
    csrfToken = org.csrfToken;

    departmentId = await createTestDepartment(organizationId, userId);
    locationId = await createTestLocation(organizationId, userId);
    employeeId = await createTestEmployee(organizationId, userId, departmentId, locationId);
  });

  afterAll(async () => {
    await cleanupTestData(organizationId);
    await pool.end();
  });

  describe('POST /api/products/schedulehub/workers', () => {
    it('should create a worker from Nexus employee', async () => {
      const response = await agent
        .post('/api/products/schedulehub/workers')
        .set('X-CSRF-Token', csrfToken)
        .send({
          employeeId,
          workerNumber: `WRK${Date.now().toString().slice(-4)}`,
          firstName: 'Test',
          lastName: 'Worker',
          email: `worker.${Date.now()}@example.com`,
          maxHoursPerWeek: 40,
          employmentType: 'full_time'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.employee_id).toBe(employeeId);

      workerId = response.body.data.id;
    });

    it('should reject duplicate worker creation', async () => {
      // Try to create another worker with the same employeeId
      const response = await agent
        .post('/api/products/schedulehub/workers')
        .set('X-CSRF-Token', csrfToken)
        .send({
          employeeId, // Same employee ID as first worker
          workerNumber: `WRK${Date.now().toString().slice(-4)}`,
          firstName: 'Test',
          lastName: 'Worker',
          maxHoursPerWeek: 40,
          employmentType: 'full_time'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await agent
        .post('/api/products/schedulehub/workers')
        .set('X-CSRF-Token', csrfToken)
        .send({
          // Missing employeeId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid status', async () => {
      const newEmployee = await createTestEmployee(organizationId, userId, departmentId, locationId);
      
      const response = await agent
        .post('/api/products/schedulehub/workers')
        .set('X-CSRF-Token', csrfToken)
        .send({
          employeeId: newEmployee,
          workerNumber: `WRK${Date.now().toString().slice(-4)}`,
          firstName: 'Test',
          lastName: 'Worker',
          employmentType: 'invalid_type'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/products/schedulehub/workers', () => {
    it('should list workers with pagination', async () => {
      const response = await agent
        .get('/api/products/schedulehub/workers')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('totalCount');
    });

    it('should filter workers by status', async () => {
      const response = await agent
        .get('/api/products/schedulehub/workers')
        .query({ status: 'active' });

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(w => w.status === 'active')).toBe(true);
    });

    it('should filter workers by department', async () => {
      const response = await agent
        .get('/api/products/schedulehub/workers')
        .query({ departmentId });

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(w => w.primary_department_id === departmentId)).toBe(true);
    });

    it('should search workers by name', async () => {
      const response = await agent
        .get('/api/products/schedulehub/workers')
        .query({ search: 'Test' });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/products/schedulehub/workers/:id', () => {
    it('should get worker by ID', async () => {
      const response = await agent
        .get(`/api/products/schedulehub/workers/${workerId}`)

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.id).toBe(workerId);
      expect(response.body.data).toHaveProperty('first_name');
      expect(response.body.data).toHaveProperty('department_name');
    });

    it('should return 404 for non-existent worker', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await agent
        .get(`/api/products/schedulehub/workers/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/products/schedulehub/workers/employee/:employeeId', () => {
    it('should get worker by employee ID', async () => {
      const response = await agent
        .get(`/api/products/schedulehub/workers/employee/${employeeId}`)

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.employee_id).toBe(employeeId);
    });
  });

  describe('PATCH /api/products/schedulehub/workers/:id', () => {
    it('should update worker', async () => {
      const response = await agent
        .patch(`/api/products/schedulehub/workers/${workerId}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          maxHoursPerWeek: 35,
          minHoursPerWeek: 10
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.max_hours_per_week).toBe(35);
      expect(response.body?.data?.min_hours_per_week).toBe(10);
    });

    it('should update worker status', async () => {
      const response = await agent
        .patch(`/api/products/schedulehub/workers/${workerId}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          status: 'on_leave'
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('on_leave');
    });

    it('should reject invalid status update', async () => {
      const response = await agent
        .patch(`/api/products/schedulehub/workers/${workerId}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          status: 'invalid_status'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/products/schedulehub/workers/:id/terminate', () => {
    it('should terminate worker', async () => {
      const response = await agent
        .post(`/api/products/schedulehub/workers/${workerId}/terminate`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          terminationDate: new Date().toISOString().split('T')[0]
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('terminated');
      expect(response.body?.data?.termination_date).toBeTruthy();
    });

    it('should prevent operations on terminated worker', async () => {
      const response = await agent
        .patch(`/api/products/schedulehub/workers/${workerId}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          maxHoursPerWeek: 35
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('terminated');
    });
  });

  describe('GET /api/products/schedulehub/workers/:id/availability', () => {
    it('should get worker availability summary', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await agent
        .get(`/api/products/schedulehub/workers/${workerId}/availability`)
        .query({ startDate, endDate });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /api/products/schedulehub/workers/:id/shifts', () => {
    it('should get worker shift history', async () => {
      const response = await agent
        .get(`/api/products/schedulehub/workers/${workerId}/shifts`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      // API returns data array from service layer
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/products/schedulehub/workers');

      expect(response.status).toBe(401);
    });
  });

  describe('Organization Isolation', () => {
    it('should not access workers from other organizations', async () => {
      // Create second organization and user
      const org2Id = uuidv4();
      const user2Id = uuidv4();
      const uniqueSlug = `test-org-${org2Id.substring(0, 8)}`;
      
      await query(
        'INSERT INTO organizations (id, name, slug, created_at) VALUES ($1, $2, $3, NOW())',
        [org2Id, 'Test Org 2', uniqueSlug]
      );
      
      const hashedPassword = await bcrypt.hash('Test123!@#', 10);
      await query(
        `INSERT INTO hris.user_account (id, email, password_hash, organization_id, created_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [user2Id, 'user2@test.com', hashedPassword, org2Id]
      );
      
      // Create authenticated agent for org2
      const agent2 = request.agent(app);
      await agent2
        .post('/api/auth/tenant/login')
        .send({ email: 'user2@test.com', password: 'Test123!@#' });
      
      // Try to access org1's worker with org2's credentials
      const response = await agent2
        .get(`/api/products/schedulehub/workers/${workerId}`);

      // Should get 403 Forbidden (not 404) - system doesn't reveal resource existence
      expect(response.status).toBe(403);

      // Cleanup
      await query('DELETE FROM hris.user_account WHERE organization_id = $1', [org2Id]);
      await query('DELETE FROM organizations WHERE id = $1', [org2Id]);
    });
  });
});
