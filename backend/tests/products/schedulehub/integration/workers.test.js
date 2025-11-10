/**
 * Integration Tests: Workers API
 * Tests all worker management endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';
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
  let token;
  let departmentId;
  let locationId;
  let employeeId;
  let workerId;

  beforeAll(async () => {
    // Setup test environment
    const org = await createTestOrganization();
    organizationId = org.organizationId;
    userId = org.userId;
    token = org.token;

    departmentId = await createTestDepartment(organizationId, userId);
    locationId = await createTestLocation(organizationId, userId);
    employeeId = await createTestEmployee(organizationId, userId, departmentId, locationId);
  });

  afterAll(async () => {
    await cleanupTestData(organizationId);
    await pool.end();
  });

  describe('POST /api/schedulehub/workers', () => {
    it('should create a worker from Nexus employee', async () => {
      const response = await request(app)
        .post('/api/schedulehub/workers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employeeId,
          status: 'active',
          defaultHourlyRate: 25.00,
          maxHoursPerWeek: 40,
          employmentType: 'full_time'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.employee_id).toBe(employeeId);
      expect(response.body.data.status).toBe('active');

      workerId = response.body.data.id;
    });

    it('should reject duplicate worker creation', async () => {
      const response = await request(app)
        .post('/api/schedulehub/workers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employeeId,
          status: 'active',
          defaultHourlyRate: 25.00,
          maxHoursPerWeek: 40,
          employmentType: 'full_time'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/schedulehub/workers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Missing employeeId
          status: 'active'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid status', async () => {
      const newEmployee = await createTestEmployee(organizationId, userId, departmentId, locationId);
      
      const response = await request(app)
        .post('/api/schedulehub/workers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employeeId: newEmployee,
          status: 'invalid_status',
          defaultHourlyRate: 25.00
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/schedulehub/workers', () => {
    it('should list workers with pagination', async () => {
      const response = await request(app)
        .get('/api/schedulehub/workers')
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('should filter workers by status', async () => {
      const response = await request(app)
        .get('/api/schedulehub/workers')
        .set('Authorization', `Bearer ${token}`)
        .query({ status: 'active' });

      expect(response.status).toBe(200);
      expect(response.body.data.every(w => w.status === 'active')).toBe(true);
    });

    it('should filter workers by department', async () => {
      const response = await request(app)
        .get('/api/schedulehub/workers')
        .set('Authorization', `Bearer ${token}`)
        .query({ departmentId });

      expect(response.status).toBe(200);
      expect(response.body.data.every(w => w.primary_department_id === departmentId)).toBe(true);
    });

    it('should search workers by name', async () => {
      const response = await request(app)
        .get('/api/schedulehub/workers')
        .set('Authorization', `Bearer ${token}`)
        .query({ search: 'Test' });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/schedulehub/workers/:id', () => {
    it('should get worker by id', async () => {
      const response = await request(app)
        .get(`/api/schedulehub/workers/${workerId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(workerId);
      expect(response.body.data).toHaveProperty('first_name');
      expect(response.body.data).toHaveProperty('department_name');
    });

    it('should return 404 for non-existent worker', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/schedulehub/workers/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/schedulehub/workers/employee/:employeeId', () => {
    it('should get worker by employee id', async () => {
      const response = await request(app)
        .get(`/api/schedulehub/workers/employee/${employeeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.employee_id).toBe(employeeId);
    });
  });

  describe('PATCH /api/schedulehub/workers/:id', () => {
    it('should update worker details', async () => {
      const response = await request(app)
        .patch(`/api/schedulehub/workers/${workerId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          defaultHourlyRate: 30.00,
          maxHoursPerWeek: 35
        });

      expect(response.status).toBe(200);
      expect(response.body.data.default_hourly_rate).toBe(30.00);
      expect(response.body.data.max_hours_per_week).toBe(35);
    });

    it('should update worker status', async () => {
      const response = await request(app)
        .patch(`/api/schedulehub/workers/${workerId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'on_leave'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('on_leave');
    });

    it('should reject invalid status update', async () => {
      const response = await request(app)
        .patch(`/api/schedulehub/workers/${workerId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'invalid_status'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/schedulehub/workers/:id/terminate', () => {
    it('should terminate worker', async () => {
      const response = await request(app)
        .post(`/api/schedulehub/workers/${workerId}/terminate`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          terminationDate: new Date().toISOString().split('T')[0]
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('terminated');
      expect(response.body.data.termination_date).toBeTruthy();
    });

    it('should prevent operations on terminated worker', async () => {
      const response = await request(app)
        .patch(`/api/schedulehub/workers/${workerId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          defaultHourlyRate: 35.00
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('terminated');
    });
  });

  describe('GET /api/schedulehub/workers/:id/availability', () => {
    let activeWorkerId;

    beforeAll(async () => {
      const newEmployee = await createTestEmployee(organizationId, userId, departmentId, locationId);
      activeWorkerId = await createTestWorker(organizationId, userId, newEmployee, departmentId, locationId);
    });

    it('should get worker availability summary', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/schedulehub/workers/${activeWorkerId}/availability`)
        .set('Authorization', `Bearer ${token}`)
        .query({ startDate, endDate });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/schedulehub/workers/:id/shifts', () => {
    it('should get worker shift history', async () => {
      const newEmployee = await createTestEmployee(organizationId, userId, departmentId, locationId);
      const newWorkerId = await createTestWorker(organizationId, userId, newEmployee, departmentId, locationId);

      const response = await request(app)
        .get(`/api/schedulehub/workers/${newWorkerId}/shifts`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/schedulehub/workers');

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/schedulehub/workers')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('Organization Isolation', () => {
    it('should not access workers from other organizations', async () => {
      // Create another organization
      const org2 = await createTestOrganization();
      
      const response = await request(app)
        .get(`/api/schedulehub/workers/${workerId}`)
        .set('Authorization', `Bearer ${org2.token}`);

      expect(response.status).toBe(404);

      // Cleanup
      await cleanupTestData(org2.organizationId);
    });
  });
});
