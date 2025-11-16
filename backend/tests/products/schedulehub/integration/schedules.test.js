/**
 * Integration Tests: Schedules & Shifts API
 * Tests schedule and shift management endpoints
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
  createTestSchedule,
  cleanupTestData
} from './setup.js';


// SKIPPED: Bearer token auth incomplete - migrating to cookie-based auth
// TODO: Re-enable once cookie auth is implemented for all apps

describe.skip('Integration: Schedules & Shifts API', () => {
  let organizationId;
  let userId;
  let token;
  let departmentId;
  let locationId;
  let workerId;
  let roleId;
  let scheduleId;
  let shiftId;

  beforeAll(async () => {
    const org = await createTestOrganization();
    organizationId = org.organizationId;
    userId = org.userId;
    token = org.token;

    departmentId = await createTestDepartment(organizationId, userId);
    locationId = await createTestLocation(organizationId, userId);
    
    const employeeId = await createTestEmployee(organizationId, userId, departmentId, locationId);
    workerId = await createTestWorker(organizationId, userId, employeeId, departmentId, locationId);
    roleId = await createTestRole(organizationId, userId, departmentId);
  });

  afterAll(async () => {
    await cleanupTestData(organizationId);
    await pool.end();
  });

  describe.skip('POST /api/schedulehub/schedules', () => {
    it('should create a draft schedule', async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const response = await request(app)
        .post('/api/schedulehub/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Weekly Schedule - Week 1',
          departmentId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          scheduleType: 'weekly'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('draft');
      expect(response.body?.data?.name).toBe('Weekly Schedule - Week 1');

      scheduleId = response.body.data.id;
    });

    it('should validate date range', async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // End before start

      const response = await request(app)
        .post('/api/schedulehub/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Invalid Schedule',
          departmentId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.status).toBe(400);
    });

    it('should require name and dates', async () => {
      const response = await request(app)
        .post('/api/schedulehub/schedules')
        .set('Authorization', `Bearer ${token}`)
        .send({
          departmentId
        });

      expect(response.status).toBe(400);
    });
  });

  describe.skip('GET /api/schedulehub/schedules', () => {
    it('should list schedules with pagination', async () => {
      const response = await request(app)
        .get('/api/schedulehub/schedules')
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by department', async () => {
      const response = await request(app)
        .get('/api/schedulehub/schedules')
        .set('Authorization', `Bearer ${token}`)
        .query({ departmentId });

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(s => s.department_id === departmentId)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/schedulehub/schedules')
        .set('Authorization', `Bearer ${token}`)
        .query({ status: 'draft' });

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(s => s.status === 'draft')).toBe(true);
    });

    it('should filter by date range', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .get('/api/schedulehub/schedules')
        .set('Authorization', `Bearer ${token}`)
        .query({ startDate });

      expect(response.status).toBe(200);
    });
  });

  describe.skip('GET /api/schedulehub/schedules/:id', () => {
    it('should get schedule by id', async () => {
      const response = await request(app)
        .get(`/api/schedulehub/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.id).toBe(scheduleId);
      expect(response.body.data).toHaveProperty('name');
    });

    it('should include shifts when requested', async () => {
      const response = await request(app)
        .get(`/api/schedulehub/schedules/${scheduleId}`)
        .set('Authorization', `Bearer ${token}`)
        .query({ includeShifts: true });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('shifts');
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.shifts).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent schedule', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/schedulehub/schedules/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe.skip('POST /api/schedulehub/schedules/:scheduleId/shifts', () => {
    it('should create a shift', async () => {
      const shiftDate = new Date();
      shiftDate.setDate(shiftDate.getDate() + 1);

      const response = await request(app)
        .post(`/api/schedulehub/schedules/${scheduleId}/shifts`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          roleId,
          shiftDate: shiftDate.toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '17:00',
          breakMinutes: 60,
          notes: 'Morning shift'
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.role_id).toBe(roleId);
      expect(response.body?.data?.status).toBe('pending');

      shiftId = response.body.data.id;
    });

    it('should validate time format', async () => {
      const response = await request(app)
        .post(`/api/schedulehub/schedules/${scheduleId}/shifts`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          roleId,
          shiftDate: new Date().toISOString().split('T')[0],
          startTime: '25:00', // Invalid
          endTime: '17:00'
        });

      expect(response.status).toBe(400);
    });

    it('should validate end time after start time', async () => {
      const response = await request(app)
        .post(`/api/schedulehub/schedules/${scheduleId}/shifts`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          roleId,
          shiftDate: new Date().toISOString().split('T')[0],
          startTime: '17:00',
          endTime: '09:00' // Before start
        });

      expect(response.status).toBe(400);
    });
  });

  describe.skip('PATCH /api/schedulehub/shifts/:id', () => {
    it('should update shift details', async () => {
      const response = await request(app)
        .patch(`/api/schedulehub/shifts/${shiftId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          startTime: '08:00',
          endTime: '16:00',
          breakMinutes: 30
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.start_time).toBe('08:00:00');
      expect(response.body?.data?.end_time).toBe('16:00:00');
      expect(response.body?.data?.break_minutes).toBe(30);
    });

    it('should update shift notes', async () => {
      const response = await request(app)
        .patch(`/api/schedulehub/shifts/${shiftId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          notes: 'Updated shift notes'
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.notes).toBe('Updated shift notes');
    });
  });

  describe.skip('POST /api/schedulehub/shifts/:id/assign', () => {
    it('should assign worker to shift', async () => {
      const response = await request(app)
        .post(`/api/schedulehub/shifts/${shiftId}/assign`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          workerId
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.worker_id).toBe(workerId);
      expect(response.body?.data?.status).toBe('confirmed');
    });

    it('should prevent double assignment', async () => {
      const response = await request(app)
        .post(`/api/schedulehub/shifts/${shiftId}/assign`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          workerId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already assigned');
    });
  });

  describe.skip('POST /api/schedulehub/shifts/:id/unassign', () => {
    it('should unassign worker from shift', async () => {
      const response = await request(app)
        .post(`/api/schedulehub/shifts/${shiftId}/unassign`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.worker_id).toBeNull();
      expect(response.body?.data?.status).toBe('pending');
    });
  });

  describe.skip('POST /api/schedulehub/schedules/:id/publish', () => {
    it('should publish schedule', async () => {
      const response = await request(app)
        .post(`/api/schedulehub/schedules/${scheduleId}/publish`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('published');
      expect(response.body?.data?.published_at).toBeTruthy();
    });

    it('should prevent double publish', async () => {
      const response = await request(app)
        .post(`/api/schedulehub/schedules/${scheduleId}/publish`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already published');
    });
  });

  describe.skip('POST /api/schedulehub/shifts/:id/clock-in', () => {
    let clockInShiftId;

    beforeAll(async () => {
      // Create a new shift for clock-in testing
      const schedule = await createTestSchedule(organizationId, userId, departmentId);
      const shiftDate = new Date();
      
      const shiftResult = await pool.query(
        `INSERT INTO scheduling.shifts (
          organization_id, schedule_id, role_id, employee_id,
          shift_date, start_time, end_time, status,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), $10)
        RETURNING id`,
        [
          organizationId, schedule, roleId, workerId,
          shiftDate, '09:00', '17:00', 'confirmed',
          userId, userId
        ]
      );
      clockInShiftId = shiftResult.rows[0].id;
    });

    it('should clock in to shift', async () => {
      const response = await request(app)
        .post(`/api/schedulehub/shifts/${clockInShiftId}/clock-in`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('in_progress');
      expect(response.body?.data?.actual_start_time).toBeTruthy();
    });

    it('should prevent double clock-in', async () => {
      const response = await request(app)
        .post(`/api/schedulehub/shifts/${clockInShiftId}/clock-in`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already started');
    });
  });

  describe.skip('POST /api/schedulehub/shifts/:id/cancel', () => {
    let cancelShiftId;

    beforeAll(async () => {
      // Create shift to cancel
      const schedule = await createTestSchedule(organizationId, userId, departmentId);
      const shiftResult = await pool.query(
        `INSERT INTO scheduling.shifts (
          organization_id, schedule_id, role_id,
          shift_date, start_time, end_time, status,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW(), $9)
        RETURNING id`,
        [
          organizationId, schedule, roleId,
          new Date(), '09:00', '17:00', 'pending',
          userId, userId
        ]
      );
      cancelShiftId = shiftResult.rows[0].id;
    });

    it('should cancel shift with reason', async () => {
      const response = await request(app)
        .post(`/api/schedulehub/shifts/${cancelShiftId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          reason: 'Weather closure'
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('cancelled');
      expect(response.body?.data?.cancelled_reason).toBe('Weather closure');
    });
  });

  describe.skip('GET /api/schedulehub/workers/:workerId/shifts', () => {
    it('should get worker shifts', async () => {
      const response = await request(app)
        .get(`/api/schedulehub/workers/${workerId}/shifts`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by date range', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/schedulehub/workers/${workerId}/shifts`)
        .set('Authorization', `Bearer ${token}`)
        .query({ startDate, endDate });

      expect(response.status).toBe(200);
    });
  });
});
