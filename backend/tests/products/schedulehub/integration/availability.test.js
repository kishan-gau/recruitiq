/**
 * Integration Tests: Availability API
 * Tests worker availability management endpoints with cookie-based authentication
 */

import { jest } from '@jest/globals';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
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
describe('Integration: Availability API', () => {
  let organizationId;
  let userId;
  let agent;
  let csrfToken;
  let workerId;
  let roleId;
  let availabilityId;

  beforeAll(async () => {
    const org = await createTestOrganization();
    organizationId = org.organizationId;
    userId = org.userId;
    agent = org.agent;
    csrfToken = org.csrfToken;

    const departmentId = await createTestDepartment(organizationId, userId);
    const locationId = await createTestLocation(organizationId, userId);
    const employeeId = await createTestEmployee(organizationId, userId, departmentId, locationId);
    workerId = await createTestWorker(organizationId, userId, employeeId, departmentId, locationId);
    roleId = await createTestRole(organizationId, userId, departmentId);
  });

  afterAll(async () => {
    await cleanupTestData(organizationId);
    await pool.end();
  });

  describe('POST /api/products/schedulehub/availability', () => {
    it('should create recurring availability', async () => {
      const response = await agent.post('/api/products/schedulehub/availability')        .set('X-CSRF-Token', csrfToken)
        .send({
          workerId,
          availabilityType: 'recurring',
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '17:00',
          priority: 'preferred'
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.availability_type).toBe('recurring');
      expect(response.body?.data?.day_of_week).toBe(1);

      availabilityId = response.body.data.id;
    });

    it('should create one-time availability', async () => {
      const specificDate = new Date();
      specificDate.setDate(specificDate.getDate() + 3);

      const response = await agent.post('/api/products/schedulehub/availability')        .set('X-CSRF-Token', csrfToken)
        .send({
          workerId,
          availabilityType: 'one_time',
          specificDate: specificDate.toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '14:00',
          priority: 'available'
        });

      expect(response.status).toBe(201);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.availability_type).toBe('one_time');
      expect(response.body?.data?.specific_date).toBeTruthy();
    });

    it('should create unavailability', async () => {
      const response = await agent.post('/api/products/schedulehub/availability')        .set('X-CSRF-Token', csrfToken)
        .send({
          workerId,
          availabilityType: 'unavailable',
          dayOfWeek: 0, // Sunday
          priority: 'unavailable',
          reason: 'Weekend off'
        });

      expect(response.status).toBe(201);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.priority).toBe('unavailable');
    });

    it('should validate time format', async () => {
      const response = await agent.post('/api/products/schedulehub/availability')        .set('X-CSRF-Token', csrfToken)
        .send({
          workerId,
          availabilityType: 'recurring',
          dayOfWeek: 2,
          startTime: '25:00', // Invalid
          endTime: '17:00'
        });

      expect(response.status).toBe(400);
    });

    it('should validate priority enum', async () => {
      const response = await agent.post('/api/products/schedulehub/availability')        .set('X-CSRF-Token', csrfToken)
        .send({
          workerId,
          availabilityType: 'recurring',
          dayOfWeek: 3,
          startTime: '09:00',
          endTime: '17:00',
          priority: 'invalid_priority'
        });

      expect(response.status).toBe(400);
    });

    it('should require specific_date for one_time', async () => {
      const response = await agent.post('/api/products/schedulehub/availability')        .set('X-CSRF-Token', csrfToken)
        .send({
          workerId,
          availabilityType: 'one_time',
          startTime: '09:00',
          endTime: '17:00'
          // Missing specificDate
        });

      expect(response.status).toBe(400);
    });

    it('should require day_of_week for recurring', async () => {
      const response = await agent.post('/api/products/schedulehub/availability')        .set('X-CSRF-Token', csrfToken)
        .send({
          workerId,
          availabilityType: 'recurring',
          startTime: '09:00',
          endTime: '17:00'
          // Missing dayOfWeek
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/products/schedulehub/workers/:workerId/availability', () => {
    it('should get worker availability', async () => {
      const response = await agent.get(`/api/products/schedulehub/workers/${workerId}/availability`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.length).toBeGreaterThan(0);
    });

    it('should filter by availability type', async () => {
      const response = await agent.get(`/api/products/schedulehub/workers/${workerId}/availability`)        .query({ availabilityType: 'recurring' });

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(a => a.availability_type === 'recurring')).toBe(true);
    });

    it('should filter by date range', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await agent.get(`/api/products/schedulehub/workers/${workerId}/availability`)        .query({ startDate, endDate });

      expect(response.status).toBe(200);
    });

    it('should filter by day of week', async () => {
      const response = await agent.get(`/api/products/schedulehub/workers/${workerId}/availability`)        .query({ dayOfWeek: 1 });

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(a => a.day_of_week === 1 || a.day_of_week === null)).toBe(true);
    });
  });

  describe('GET /api/products/schedulehub/workers/:workerId/check-availability', () => {
    it('should check if worker is available', async () => {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() + 1);
      
      // Check Monday (we created recurring availability for Monday)
      while (checkDate.getDay() !== 1) {
        checkDate.setDate(checkDate.getDate() + 1);
      }

      const response = await agent.get(`/api/products/schedulehub/workers/${workerId}/check-availability`)        .query({
          date: checkDate.toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '16:00'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('available');
      expect(response.body.data).toHaveProperty('priority');
    });

    it('should require date and times', async () => {
      const response = await agent.get(`/api/products/schedulehub/workers/${workerId}/check-availability`)        .query({
          date: new Date().toISOString().split('T')[0]
          // Missing times
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/products/schedulehub/available-workers', () => {
    it('should find available workers for shift', async () => {
      const shiftDate = new Date();
      shiftDate.setDate(shiftDate.getDate() + 1);
      
      // Find next Monday
      while (shiftDate.getDay() !== 1) {
        shiftDate.setDate(shiftDate.getDate() + 1);
      }

      const response = await agent.get('/api/products/schedulehub/available-workers')        .query({
          date: shiftDate.toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '16:00'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by role', async () => {
      const shiftDate = new Date();
      shiftDate.setDate(shiftDate.getDate() + 1);

      const response = await agent.get('/api/products/schedulehub/available-workers')        .query({
          date: shiftDate.toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '16:00',
          roleId
        });

      expect(response.status).toBe(200);
    });

    it('should exclude already assigned workers', async () => {
      const shiftDate = new Date();
      const excludeWorkerIds = [workerId];

      const response = await agent.get('/api/products/schedulehub/available-workers')        .query({
          date: shiftDate.toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '16:00',
          excludeWorkerIds: excludeWorkerIds.join(',')
        });

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(w => !excludeWorkerIds.includes(w.id))).toBe(true);
    });
  });

  describe('POST /api/products/schedulehub/workers/:workerId/default-availability', () => {
    let newWorkerId;

    beforeAll(async () => {
      const departmentId = await createTestDepartment(organizationId, userId);
      const locationId = await createTestLocation(organizationId, userId);
      const employeeId = await createTestEmployee(organizationId, userId, departmentId, locationId);
      newWorkerId = await createTestWorker(organizationId, userId, employeeId, departmentId, locationId);
    });

    it('should create default availability (Mon-Fri 9-5)', async () => {
      const response = await agent.post(`/api/products/schedulehub/workers/${newWorkerId}/default-availability`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(201);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.length).toBe(5); // Mon-Fri

      // Check each day is Mon-Fri
      const daysOfWeek = response.body.data.map(a => a.day_of_week);
      expect(daysOfWeek).toEqual(expect.arrayContaining([1, 2, 3, 4, 5]));

      // Check times
      response.body.data.forEach(avail => {
        expect(avail.start_time).toBe('09:00:00');
        expect(avail.end_time).toBe('17:00:00');
        expect(avail.priority).toBe('available');
      });
    });

    it('should allow custom default times', async () => {
      const anotherDepartmentId = await createTestDepartment(organizationId, userId);
      const anotherLocationId = await createTestLocation(organizationId, userId);
      const anotherEmployeeId = await createTestEmployee(organizationId, userId, anotherDepartmentId, anotherLocationId);
      const anotherWorkerId = await createTestWorker(organizationId, userId, anotherEmployeeId, anotherDepartmentId, anotherLocationId);

      const response = await agent.post(`/api/products/schedulehub/workers/${anotherWorkerId}/default-availability`)        .set('X-CSRF-Token', csrfToken)
        .send({
          startTime: '08:00',
          endTime: '16:00'
        });

      expect(response.status).toBe(201);
      response.body.data.forEach(avail => {
        expect(avail.start_time).toBe('08:00:00');
        expect(avail.end_time).toBe('16:00:00');
      });
    });
  });

  describe('PATCH /api/products/schedulehub/availability/:id', () => {
    it('should update availability', async () => {
      const response = await agent.patch(`/api/products/schedulehub/availability/${availabilityId}`)        .set('X-CSRF-Token', csrfToken)
        .send({
          startTime: '08:00',
          endTime: '16:00',
          priority: 'required'
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.start_time).toBe('08:00:00');
      expect(response.body?.data?.end_time).toBe('16:00:00');
      expect(response.body?.data?.priority).toBe('required');
    });

    it('should update reason', async () => {
      const response = await agent.patch(`/api/products/schedulehub/availability/${availabilityId}`)        .set('X-CSRF-Token', csrfToken)
        .send({
          reason: 'Updated availability reason'
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.reason).toBe('Updated availability reason');
    });

    it('should return 404 for non-existent availability', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await agent.patch(`/api/products/schedulehub/availability/${fakeId}`)        .set('X-CSRF-Token', csrfToken)
        .send({
          priority: 'preferred'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/products/schedulehub/availability/:id', () => {
    let deleteAvailId;

    beforeAll(async () => {
      // Create availability to delete
      const result = await pool.query(
        `INSERT INTO scheduling.worker_availability (
          organization_id, worker_id, availability_type,
          day_of_week, start_time, end_time, priority,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW(), $9)
        RETURNING id`,
        [
          organizationId, workerId, 'recurring',
          5, '09:00', '17:00', 'available',
          userId, userId
        ]
      );
      deleteAvailId = result.rows[0].id;
    });

    it('should delete availability', async () => {
      const response = await agent.delete(`/api/products/schedulehub/availability/${deleteAvailId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deletion
      const checkResult = await pool.query(
        'SELECT * FROM scheduling.worker_availability WHERE id = $1',
        [deleteAvailId]
      );
      expect(checkResult.rows.length).toBe(0);
    });

    it('should return 404 for already deleted availability', async () => {
      const response = await agent.delete(`/api/products/schedulehub/availability/${deleteAvailId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});

