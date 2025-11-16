/**
 * Integration Tests: Roles API
 * Tests role management and worker assignments
 */

import { jest } from '@jest/globals';
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
  createTestRole,
  cleanupTestData
} from './setup.js';


// SKIPPED: Bearer token auth incomplete - migrating to cookie-based auth
// TODO: Re-enable once cookie auth is implemented for all apps

describe.skip('Integration: Roles API', () => {
  let organizationId;
  let userId;
  let token;
  let departmentId;
  let workerId;
  let roleId;

  beforeAll(async () => {
    const org = await createTestOrganization();
    organizationId = org.organizationId;
    userId = org.userId;
    token = org.token;

    departmentId = await createTestDepartment(organizationId, userId);
    const locationId = await createTestLocation(organizationId, userId);
    const employeeId = await createTestEmployee(organizationId, userId, departmentId, locationId);
    workerId = await createTestWorker(organizationId, userId, employeeId, departmentId, locationId);
  });

  afterAll(async () => {
    await cleanupTestData(organizationId);
    await pool.end();
  });

  describe.skip('POST /api/schedulehub/roles', () => {
    it('should create a role', async () => {
      const response = await request(app)
        .post('/api/schedulehub/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Cashier',
          code: `CASH-${Date.now()}`,
          description: 'Front-end cashier position',
          departmentId,
          requiredCertifications: ['Food Handler', 'Customer Service'],
          defaultHourlyRate: 18.50
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.name).toBe('Cashier');
      expect(response.body?.data?.default_hourly_rate).toBe(18.50);

      roleId = response.body.data.id;
    });

    it('should validate unique role code', async () => {
      const code = `UNIQUE-${Date.now()}`;
      
      // Create first role
      await request(app)
        .post('/api/schedulehub/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Role 1',
          code,
          departmentId
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/schedulehub/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Role 2',
          code, // Duplicate
          departmentId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    it('should require name and code', async () => {
      const response = await request(app)
        .post('/api/schedulehub/roles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          departmentId
        });

      expect(response.status).toBe(400);
    });
  });

  describe.skip('GET /api/schedulehub/roles', () => {
    it('should list roles', async () => {
      const response = await request(app)
        .get('/api/schedulehub/roles')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.length).toBeGreaterThan(0);
    });

    it('should filter by department', async () => {
      const response = await request(app)
        .get('/api/schedulehub/roles')
        .set('Authorization', `Bearer ${token}`)
        .query({ departmentId });

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(r => r.department_id === departmentId)).toBe(true);
    });

    it('should filter active only by default', async () => {
      const response = await request(app)
        .get('/api/schedulehub/roles')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(r => r.is_active === true)).toBe(true);
    });

    it('should include inactive when requested', async () => {
      // Create inactive role
      await pool.query(
        `INSERT INTO scheduling.roles (
          organization_id, name, code, department_id,
          is_active, created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW(), $7)`,
        [organizationId, 'Inactive Role', `INACT-${Date.now()}`,
         departmentId, false, userId, userId]
      );

      const response = await request(app)
        .get('/api/schedulehub/roles')
        .set('Authorization', `Bearer ${token}`)
        .query({ includeInactive: true });

      expect(response.status).toBe(200);
      expect(response.body?.data?.some(r => r.is_active === false)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/schedulehub/roles')
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe.skip('GET /api/schedulehub/roles/:id', () => {
    it('should get role by id', async () => {
      const response = await request(app)
        .get(`/api/schedulehub/roles/${roleId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.id).toBe(roleId);
      expect(response.body.data).toHaveProperty('name');
    });

    it('should return 404 for non-existent role', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/schedulehub/roles/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe.skip('PATCH /api/schedulehub/roles/:id', () => {
    it('should update role details', async () => {
      const response = await request(app)
        .patch(`/api/schedulehub/roles/${roleId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'Updated description',
          defaultHourlyRate: 20.00
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.description).toBe('Updated description');
      expect(response.body?.data?.default_hourly_rate).toBe(20.00);
    });

    it('should update certifications', async () => {
      const response = await request(app)
        .patch(`/api/schedulehub/roles/${roleId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          requiredCertifications: ['Food Handler', 'POS System', 'Safety Training']
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.required_certifications).toHaveLength(3);
    });

    it('should deactivate role', async () => {
      const tempRole = await createTestRole(organizationId, userId, departmentId);

      const response = await request(app)
        .patch(`/api/schedulehub/roles/${tempRole}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          isActive: false
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.is_active).toBe(false);
    });
  });

  describe.skip('POST /api/schedulehub/roles/:roleId/workers', () => {
    it('should assign worker to role', async () => {
      const response = await request(app)
        .post(`/api/schedulehub/roles/${roleId}/workers`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          workerId,
          proficiency: 'competent',
          certifications: ['Food Handler'],
          certificationDate: new Date().toISOString().split('T')[0]
        });

      expect(response.status).toBe(201);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.worker_id).toBe(workerId);
      expect(response.body?.data?.role_id).toBe(roleId);
      expect(response.body?.data?.proficiency).toBe('competent');
    });

    it('should validate proficiency enum', async () => {
      const newDept = await createTestDepartment(organizationId, userId);
      const newLoc = await createTestLocation(organizationId, userId);
      const newEmp = await createTestEmployee(organizationId, userId, newDept, newLoc);
      const newWorker = await createTestWorker(organizationId, userId, newEmp, newDept, newLoc);

      const response = await request(app)
        .post(`/api/schedulehub/roles/${roleId}/workers`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          workerId: newWorker,
          proficiency: 'invalid_level'
        });

      expect(response.status).toBe(400);
    });

    it('should prevent duplicate assignment', async () => {
      const response = await request(app)
        .post(`/api/schedulehub/roles/${roleId}/workers`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          workerId,
          proficiency: 'proficient'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already assigned');
    });
  });

  describe.skip('GET /api/schedulehub/roles/:id/workers', () => {
    it('should get workers for role', async () => {
      const response = await request(app)
        .get(`/api/schedulehub/roles/${roleId}/workers`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.length).toBeGreaterThan(0);
    });

    it('should filter by proficiency', async () => {
      const response = await request(app)
        .get(`/api/schedulehub/roles/${roleId}/workers`)
        .set('Authorization', `Bearer ${token}`)
        .query({ proficiency: 'competent' });

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(w => w.proficiency === 'competent')).toBe(true);
    });

    it('should filter active only by default', async () => {
      const response = await request(app)
        .get(`/api/schedulehub/roles/${roleId}/workers`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(w => w.is_active === true)).toBe(true);
    });
  });

  describe.skip('GET /api/schedulehub/workers/:workerId/roles', () => {
    it('should get roles for worker', async () => {
      const response = await request(app)
        .get(`/api/schedulehub/workers/${workerId}/roles`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.length).toBeGreaterThan(0);
    });

    it('should include role details', async () => {
      const response = await request(app)
        .get(`/api/schedulehub/workers/${workerId}/roles`)
        .set('Authorization', `Bearer ${token}`)
        .query({ includeDetails: true });

      expect(response.status).toBe(200);
      expect(response.body.data[0]).toHaveProperty('role_name');
      expect(response.body.data[0]).toHaveProperty('proficiency');
    });
  });

  describe.skip('PATCH /api/schedulehub/roles/:roleId/workers/:workerId', () => {
    it('should update worker assignment', async () => {
      const response = await request(app)
        .patch(`/api/schedulehub/roles/${roleId}/workers/${workerId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          proficiency: 'proficient',
          certifications: ['Food Handler', 'Advanced POS'],
          certificationDate: new Date().toISOString().split('T')[0]
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.proficiency).toBe('proficient');
    });

    it('should update proficiency level', async () => {
      const response = await request(app)
        .patch(`/api/schedulehub/roles/${roleId}/workers/${workerId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          proficiency: 'expert'
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.proficiency).toBe('expert');
    });
  });

  describe.skip('DELETE /api/schedulehub/roles/:roleId/workers/:workerId', () => {
    it('should remove worker from role (soft delete)', async () => {
      const response = await request(app)
        .delete(`/api/schedulehub/roles/${roleId}/workers/${workerId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify soft delete (is_active = false)
      const checkResult = await pool.query(
        'SELECT is_active FROM scheduling.worker_roles WHERE role_id = $1 AND worker_id = $2',
        [roleId, workerId]
      );
      expect(checkResult.rows[0].is_active).toBe(false);
    });

    it('should return 404 for already removed assignment', async () => {
      const response = await request(app)
        .delete(`/api/schedulehub/roles/${roleId}/workers/${workerId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe.skip('Organization Isolation', () => {
    it('should not access roles from other organizations', async () => {
      const org2 = await createTestOrganization();

      const response = await request(app)
        .get(`/api/schedulehub/roles/${roleId}`)
        .set('Authorization', `Bearer ${org2.token}`);

      expect(response.status).toBe(404);

      await cleanupTestData(org2.organizationId);
    });
  });
});
