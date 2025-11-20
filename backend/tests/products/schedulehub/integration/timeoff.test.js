/**
 * Integration Tests: Time Off API
 * Tests time off request and approval workflow with cookie-based authentication
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
  cleanupTestData
} from './setup.js';


// SKIPPED: Bearer token auth incomplete - migrating to cookie-based auth
// TODO: Re-enable once cookie auth is implemented for all apps

describe('Integration: Time Off API', () => {
  let organizationId;
  let userId;
  let token;
  let workerId;
  let requestId;

  beforeAll(async () => {
    const org = await createTestOrganization();
    organizationId = org.organizationId;
    userId = org.userId;
    token = org.token;

    const departmentId = await createTestDepartment(organizationId, userId);
    const locationId = await createTestLocation(organizationId, userId);
    const employeeId = await createTestEmployee(organizationId, userId, departmentId, locationId);
    workerId = await createTestWorker(organizationId, userId, employeeId, departmentId, locationId);
  });

  afterAll(async () => {
    await cleanupTestData(organizationId);
    await pool.end();
  });

  describe('POST /api/schedulehub/time-off', () => {
    it('should create time off request', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 3);

      const response = await agent.post('/api/products/schedulehub/time-off')        .send({
          workerId,
          requestType: 'vacation',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          notes: 'Family vacation'
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('pending');
      expect(response.body?.data?.request_type).toBe('vacation');

      requestId = response.body.data.id;
    });

    it('should validate request type', async () => {
      const response = await agent.post('/api/products/schedulehub/time-off')        .send({
          workerId,
          requestType: 'invalid_type',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        });

      expect(response.status).toBe(400);
    });

    it('should validate date range', async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);

      const response = await agent.post('/api/products/schedulehub/time-off')        .send({
          workerId,
          requestType: 'vacation',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });

      expect(response.status).toBe(400);
    });

    it('should require worker and dates', async () => {
      const response = await agent.post('/api/products/schedulehub/time-off')        .send({
          requestType: 'sick'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/schedulehub/time-off/:id', () => {
    it('should get time off request', async () => {
      const response = await agent.get(`/api/products/schedulehub/time-off/${requestId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.id).toBe(requestId);
      expect(response.body.data).toHaveProperty('worker_id');
    });

    it('should return 404 for non-existent request', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await agent.get(`/api/products/schedulehub/time-off/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/schedulehub/workers/:workerId/time-off', () => {
    it('should get worker time off requests', async () => {
      const response = await agent.get(`/api/products/schedulehub/workers/${workerId}/time-off`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const response = await agent.get(`/api/products/schedulehub/workers/${workerId}/time-off`)        .query({ status: 'pending' });

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(r => r.status === 'pending')).toBe(true);
    });

    it('should filter by date range', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await agent.get(`/api/products/schedulehub/workers/${workerId}/time-off`)        .query({ startDate, endDate });

      expect(response.status).toBe(200);
    });

    it('should filter by request type', async () => {
      const response = await agent.get(`/api/products/schedulehub/workers/${workerId}/time-off`)        .query({ requestType: 'vacation' });

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(r => r.request_type === 'vacation')).toBe(true);
    });
  });

  describe('GET /api/schedulehub/time-off/pending', () => {
    it('should get pending requests for manager', async () => {
      const response = await agent.get('/api/products/schedulehub/time-off/pending')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body?.data?.every(r => r.status === 'pending')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await agent.get('/api/products/schedulehub/time-off/pending')        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('POST /api/schedulehub/time-off/:id/review', () => {
    it('should approve time off request', async () => {
      const response = await agent.post(`/api/products/schedulehub/time-off/${requestId}/review`)        .send({
          decision: 'approved',
          reviewNotes: 'Approved - enjoy your vacation'
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('approved');
      expect(response.body?.data?.reviewed_at).toBeTruthy();
      expect(response.body?.data?.reviewed_by).toBe(userId);

      // Verify unavailability was created
      const unavailResult = await pool.query(
        `SELECT * FROM scheduling.worker_availability 
         WHERE worker_id = $1 AND availability_type = 'unavailable'
         AND reason LIKE '%time off%'`,
        [workerId]
      );
      expect(unavailResult.rows.length).toBeGreaterThan(0);
    });

    it('should prevent double review', async () => {
      const response = await agent.post(`/api/products/schedulehub/time-off/${requestId}/review`)        .send({
          decision: 'approved'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already reviewed');
    });
  });

  describe('POST /api/schedulehub/time-off/:id/review (denial)', () => {
    let denyRequestId;

    beforeAll(async () => {
      // Create new request to deny
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 14);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 2);

      const result = await pool.query(
        `INSERT INTO scheduling.time_off_requests (
          organization_id, worker_id, request_type,
          start_date, end_date, status,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $8)
        RETURNING id`,
        [
          organizationId, workerId, 'personal',
          startDate, endDate, 'pending',
          userId, userId
        ]
      );
      denyRequestId = result.rows[0].id;
    });

    it('should deny time off request', async () => {
      const response = await agent.post(`/api/products/schedulehub/time-off/${denyRequestId}/review`)        .send({
          decision: 'denied',
          reviewNotes: 'Busy period - please reschedule'
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('denied');
      expect(response.body?.data?.review_notes).toBe('Busy period - please reschedule');

      // Verify NO unavailability was created
      const unavailResult = await pool.query(
        `SELECT * FROM scheduling.worker_availability 
         WHERE worker_id = $1 AND availability_type = 'unavailable'
         AND created_at > $2`,
        [workerId, new Date(Date.now() - 5000)]
      );
      expect(unavailResult.rows.length).toBe(0);
    });
  });

  describe('POST /api/schedulehub/time-off/:id/cancel', () => {
    let cancelRequestId;

    beforeAll(async () => {
      // Create approved request to cancel
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 21);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      const result = await pool.query(
        `INSERT INTO scheduling.time_off_requests (
          organization_id, worker_id, request_type,
          start_date, end_date, status,
          reviewed_by, reviewed_at,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8, NOW(), $9)
        RETURNING id`,
        [
          organizationId, workerId, 'personal',
          startDate, endDate, 'approved',
          userId, userId, userId
        ]
      );
      cancelRequestId = result.rows[0].id;

      // Create unavailability for this request
      await pool.query(
        `INSERT INTO scheduling.worker_availability (
          organization_id, worker_id, availability_type,
          specific_date, priority, reason,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $8)`,
        [
          organizationId, workerId, 'unavailable',
          startDate, 'unavailable',
          `Approved time off request ${cancelRequestId}`,
          userId, userId
        ]
      );
    });

    it('should cancel pending request', async () => {
      // First create a pending request
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 30);
      
      const createResponse = await agent.post('/api/products/schedulehub/time-off')        .send({
          workerId,
          requestType: 'sick',
          startDate: startDate.toISOString().split('T')[0],
          endDate: startDate.toISOString().split('T')[0]
        });

      const pendingId = createResponse.body.data.id;

      const response = await agent.post(`/api/products/schedulehub/time-off/${pendingId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('cancelled');
    });

    it('should cancel approved request and remove unavailability', async () => {
      const response = await agent.post(`/api/products/schedulehub/time-off/${cancelRequestId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('cancelled');

      // Verify unavailability was removed
      const unavailResult = await pool.query(
        `SELECT * FROM scheduling.worker_availability 
         WHERE worker_id = $1 AND reason LIKE '%${cancelRequestId}%'`,
        [workerId]
      );
      expect(unavailResult.rows.length).toBe(0);
    });

    it('should not cancel denied request', async () => {
      // Create denied request
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 40);

      const result = await pool.query(
        `INSERT INTO scheduling.time_off_requests (
          organization_id, worker_id, request_type,
          start_date, end_date, status,
          reviewed_by, reviewed_at,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8, NOW(), $9)
        RETURNING id`,
        [
          organizationId, workerId, 'personal',
          startDate, startDate, 'denied',
          userId, userId, userId
        ]
      );
      const deniedId = result.rows[0].id;

      const response = await agent.post(`/api/products/schedulehub/time-off/${deniedId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot cancel');
    });
  });

  describe('Authorization', () => {
    it('should enforce organization isolation', async () => {
      const org2 = await createTestOrganization();

      const response = await agent.get(`/api/products/schedulehub/time-off/${requestId}`)
        .set('Authorization', `Bearer ${org2.token}`);

      expect(response.status).toBe(404);

      await cleanupTestData(org2.organizationId);
    });
  });
});
