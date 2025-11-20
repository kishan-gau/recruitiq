/**
 * Integration Tests: Shift Swap API
 * Tests shift swapping marketplace and trade management with cookie-based authentication
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
  createTestSchedule,
  cleanupTestData
} from './setup.js';


// SKIPPED: Bearer token auth incomplete - migrating to cookie-based auth
// TODO: Re-enable once cookie auth is implemented for all apps

describe('Integration: Shift Swap API', () => {
  let organizationId;
  let userId;
  let token;
  let worker1Id, worker2Id, worker3Id;
  let roleId;
  let scheduleId;
  let shift1Id, shift2Id, shift3Id;
  let offerId;

  beforeAll(async () => {
    const org = await createTestOrganization();
    organizationId = org.organizationId;
    userId = org.userId;
    token = org.token;

    const departmentId = await createTestDepartment(organizationId, userId);
    const locationId = await createTestLocation(organizationId, userId);
    roleId = await createTestRole(organizationId, userId, departmentId);
    scheduleId = await createTestSchedule(organizationId, userId, departmentId);

    // Create three workers
    const emp1 = await createTestEmployee(organizationId, userId, departmentId, locationId);
    const emp2 = await createTestEmployee(organizationId, userId, departmentId, locationId);
    const emp3 = await createTestEmployee(organizationId, userId, departmentId, locationId);
    
    worker1Id = await createTestWorker(organizationId, userId, emp1, departmentId, locationId);
    worker2Id = await createTestWorker(organizationId, userId, emp2, departmentId, locationId);
    worker3Id = await createTestWorker(organizationId, userId, emp3, departmentId, locationId);

    // Create shifts for workers
    const shiftDate1 = new Date();
    shiftDate1.setDate(shiftDate1.getDate() + 3);
    const shiftDate2 = new Date();
    shiftDate2.setDate(shiftDate2.getDate() + 4);
    const shiftDate3 = new Date();
    shiftDate3.setDate(shiftDate3.getDate() + 5);

    const shift1 = await pool.query(
      `INSERT INTO scheduling.shifts (
        organization_id, schedule_id, role_id, employee_id,
        shift_date, start_time, end_time, status,
        created_at, created_by, updated_at, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), $10)
      RETURNING id`,
      [organizationId, scheduleId, roleId, worker1Id,
       shiftDate1, '09:00', '17:00', 'confirmed',
       userId, userId]
    );
    shift1Id = shift1.rows[0].id;

    const shift2 = await pool.query(
      `INSERT INTO scheduling.shifts (
        organization_id, schedule_id, role_id, employee_id,
        shift_date, start_time, end_time, status,
        created_at, created_by, updated_at, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), $10)
      RETURNING id`,
      [organizationId, scheduleId, roleId, worker2Id,
       shiftDate2, '14:00', '22:00', 'confirmed',
       userId, userId]
    );
    shift2Id = shift2.rows[0].id;

    const shift3 = await pool.query(
      `INSERT INTO scheduling.shifts (
        organization_id, schedule_id, role_id, employee_id,
        shift_date, start_time, end_time, status,
        created_at, created_by, updated_at, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), $10)
      RETURNING id`,
      [organizationId, scheduleId, roleId, worker3Id,
       shiftDate3, '09:00', '17:00', 'confirmed',
       userId, userId]
    );
    shift3Id = shift3.rows[0].id;
  });

  afterAll(async () => {
    await cleanupTestData(organizationId);
    await pool.end();
  });

  describe('POST /api/schedulehub/shift-swaps', () => {
    it('should create open swap offer', async () => {
      const response = await agent.post('/api/products/schedulehub/shift-swaps')        .send({
          shiftId: shift1Id,
          swapType: 'open',
          notes: 'Need someone to cover this shift'
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.swap_type).toBe('open');
      expect(response.body?.data?.status).toBe('pending');

      offerId = response.body.data.id;
    });

    it('should create direct swap offer', async () => {
      const response = await agent.post('/api/products/schedulehub/shift-swaps')        .send({
          shiftId: shift2Id,
          swapType: 'direct',
          targetWorkerId: worker3Id,
          notes: 'Direct swap with Worker 3'
        });

      expect(response.status).toBe(201);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.swap_type).toBe('direct');
      expect(response.body?.data?.target_worker_id).toBe(worker3Id);
    });

    it('should create trade swap offer', async () => {
      const response = await agent.post('/api/products/schedulehub/shift-swaps')        .send({
          shiftId: shift3Id,
          swapType: 'trade',
          notes: 'Looking to trade shifts'
        });

      expect(response.status).toBe(201);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.swap_type).toBe('trade');
    });

    it('should validate swap type', async () => {
      const response = await agent.post('/api/products/schedulehub/shift-swaps')        .send({
          shiftId: shift1Id,
          swapType: 'invalid_type'
        });

      expect(response.status).toBe(400);
    });

    it('should require target worker for direct swap', async () => {
      const response = await agent.post('/api/products/schedulehub/shift-swaps')        .send({
          shiftId: shift1Id,
          swapType: 'direct'
          // Missing targetWorkerId
        });

      expect(response.status).toBe(400);
    });

    it('should prevent swapping unassigned shift', async () => {
      // Create unassigned shift
      const unassignedShift = await pool.query(
        `INSERT INTO scheduling.shifts (
          organization_id, schedule_id, role_id,
          shift_date, start_time, end_time, status,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW(), $9)
        RETURNING id`,
        [organizationId, scheduleId, roleId,
         new Date(), '09:00', '17:00', 'pending',
         userId, userId]
      );

      const response = await agent.post('/api/products/schedulehub/shift-swaps')        .send({
          shiftId: unassignedShift.rows[0].id,
          swapType: 'open'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('not assigned');
    });
  });

  describe('GET /api/schedulehub/shift-swaps/marketplace', () => {
    it('should browse marketplace', async () => {
      const response = await agent.get('/api/products/schedulehub/shift-swaps/marketplace')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.length).toBeGreaterThan(0);
    });

    it('should filter by swap type', async () => {
      const response = await agent.get('/api/products/schedulehub/shift-swaps/marketplace')        .query({ swapType: 'open' });

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(o => o.swap_type === 'open')).toBe(true);
    });

    it('should filter by date range', async () => {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await agent.get('/api/products/schedulehub/shift-swaps/marketplace')        .query({ startDate, endDate });

      expect(response.status).toBe(200);
    });

    it('should filter by role', async () => {
      const response = await agent.get('/api/products/schedulehub/shift-swaps/marketplace')        .query({ roleId });

      expect(response.status).toBe(200);
    });

    it('should support pagination', async () => {
      const response = await agent.get('/api/products/schedulehub/shift-swaps/marketplace')        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/schedulehub/shift-swaps/:id', () => {
    it('should get swap offer details', async () => {
      const response = await agent.get(`/api/products/schedulehub/shift-swaps/${offerId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.id).toBe(offerId);
      expect(response.body.data).toHaveProperty('shift_date');
    });

    it('should return 404 for non-existent offer', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await agent.get(`/api/products/schedulehub/shift-swaps/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/schedulehub/shift-swaps/:offerId/request', () => {
    it('should request to take open swap', async () => {
      const response = await agent.post(`/api/products/schedulehub/shift-swaps/${offerId}/request`)        .send({
          requestingWorkerId: worker2Id,
          notes: 'I can cover this shift'
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.requesting_worker_id).toBe(worker2Id);
      expect(response.body?.data?.status).toBe('pending');
    });

    it('should request trade swap with offered shift', async () => {
      // Create trade offer first
      const tradeOffer = await pool.query(
        `INSERT INTO scheduling.shift_swap_offers (
          organization_id, shift_id, offered_by_worker_id,
          swap_type, status, requires_manager_approval,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $8)
        RETURNING id`,
        [organizationId, shift2Id, worker2Id,
         'trade', 'pending', true,
         userId, userId]
      );
      const tradeOfferId = tradeOffer.rows[0].id;

      const response = await agent.post(`/api/products/schedulehub/shift-swaps/${tradeOfferId}/request`)        .send({
          requestingWorkerId: worker1Id,
          offeredShiftId: shift1Id,
          notes: 'Trade my shift for yours'
        });

      expect(response.status).toBe(201);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.offered_shift_id).toBe(shift1Id);
    });

    it('should require offered shift for trade swap', async () => {
      // Create another trade offer
      const tradeOffer = await pool.query(
        `INSERT INTO scheduling.shift_swap_offers (
          organization_id, shift_id, offered_by_worker_id,
          swap_type, status, requires_manager_approval,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $8)
        RETURNING id`,
        [organizationId, shift3Id, worker3Id,
         'trade', 'pending', true,
         userId, userId]
      );

      const response = await agent.post(`/api/products/schedulehub/shift-swaps/${tradeOffer.rows[0].id}/request`)        .send({
          requestingWorkerId: worker1Id
          // Missing offeredShiftId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('offered shift');
    });
  });

  describe('GET /api/schedulehub/shift-swaps/:offerId/requests', () => {
    it('should get requests for offer', async () => {
      const response = await agent.get(`/api/products/schedulehub/shift-swaps/${offerId}/requests`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/schedulehub/shift-swap-requests/:requestId/accept', () => {
    let requestId;

    beforeAll(async () => {
      // Get the first request
      const requests = await pool.query(
        'SELECT id FROM scheduling.shift_swap_requests WHERE offer_id = $1 LIMIT 1',
        [offerId]
      );
      requestId = requests.rows[0].id;
    });

    it('should accept swap request without manager approval', async () => {
      // Update offer to not require manager approval
      await pool.query(
        'UPDATE scheduling.shift_swap_offers SET requires_manager_approval = false WHERE id = $1',
        [offerId]
      );

      const response = await agent.post(`/api/products/schedulehub/shift-swap-requests/${requestId}/accept`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('completed');
    });
  });

  describe('POST /api/schedulehub/shift-swap-requests/:requestId/accept (with approval)', () => {
    let approvalRequestId;
    let approvalOfferId;

    beforeAll(async () => {
      // Create new shift and offer requiring approval
      const newShiftDate = new Date();
      newShiftDate.setDate(newShiftDate.getDate() + 10);

      const newShift = await pool.query(
        `INSERT INTO scheduling.shifts (
          organization_id, schedule_id, role_id, employee_id,
          shift_date, start_time, end_time, status,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), $10)
        RETURNING id`,
        [organizationId, scheduleId, roleId, worker1Id,
         newShiftDate, '09:00', '17:00', 'confirmed',
         userId, userId]
      );

      const offer = await pool.query(
        `INSERT INTO scheduling.shift_swap_offers (
          organization_id, shift_id, offered_by_worker_id,
          swap_type, status, requires_manager_approval,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $8)
        RETURNING id`,
        [organizationId, newShift.rows[0].id, worker1Id,
         'open', 'pending', true,
         userId, userId]
      );
      approvalOfferId = offer.rows[0].id;

      const req = await pool.query(
        `INSERT INTO scheduling.shift_swap_requests (
          organization_id, offer_id, requesting_worker_id,
          status, created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, NOW(), $5, NOW(), $6)
        RETURNING id`,
        [organizationId, approvalOfferId, worker2Id,
         'pending', userId, userId]
      );
      approvalRequestId = req.rows[0].id;
    });

    it('should accept and set to pending approval', async () => {
      const response = await agent.post(`/api/products/schedulehub/shift-swap-requests/${approvalRequestId}/accept`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('pending_approval');
    });

    it('should allow manager to approve swap', async () => {
      const response = await agent.post(`/api/products/schedulehub/shift-swaps/${approvalOfferId}/approve`)        .send({
          approvalNotes: 'Approved by manager'
        });

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('completed');
      expect(response.body?.data?.approved_at).toBeTruthy();
    });
  });

  describe('POST /api/schedulehub/shift-swaps/:offerId/cancel', () => {
    let cancelOfferId;

    beforeAll(async () => {
      // Create offer to cancel
      const newShiftDate = new Date();
      newShiftDate.setDate(newShiftDate.getDate() + 15);

      const newShift = await pool.query(
        `INSERT INTO scheduling.shifts (
          organization_id, schedule_id, role_id, employee_id,
          shift_date, start_time, end_time, status,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), $10)
        RETURNING id`,
        [organizationId, scheduleId, roleId, worker3Id,
         newShiftDate, '09:00', '17:00', 'confirmed',
         userId, userId]
      );

      const offer = await pool.query(
        `INSERT INTO scheduling.shift_swap_offers (
          organization_id, shift_id, offered_by_worker_id,
          swap_type, status, requires_manager_approval,
          created_at, created_by, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $8)
        RETURNING id`,
        [organizationId, newShift.rows[0].id, worker3Id,
         'open', 'pending', false,
         userId, userId]
      );
      cancelOfferId = offer.rows[0].id;
    });

    it('should cancel pending offer', async () => {
      const response = await agent.post(`/api/products/schedulehub/shift-swaps/${cancelOfferId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body?.data).toBeDefined();
      expect(response.body?.data?.status).toBe('cancelled');
    });

    it('should not cancel completed offer', async () => {
      // Try to cancel already accepted offer
      const response = await agent.post(`/api/products/schedulehub/shift-swaps/${offerId}/cancel`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot cancel');
    });
  });

  describe('GET /api/schedulehub/workers/:workerId/swap-offers', () => {
    it('should get worker swap offers', async () => {
      const response = await agent.get(`/api/products/schedulehub/workers/${worker1Id}/swap-offers`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by status', async () => {
      const response = await agent.get(`/api/products/schedulehub/workers/${worker1Id}/swap-offers`)        .query({ status: 'pending' });

      expect(response.status).toBe(200);
      expect(response.body?.data?.every(o => o.status === 'pending')).toBe(true);
    });
  });

  describe('Organization Isolation', () => {
    it('should not access offers from other organizations', async () => {
      const org2 = await createTestOrganization();

      const response = await agent.get(`/api/products/schedulehub/shift-swaps/${offerId}`)
        .set('Authorization', `Bearer ${org2.token}`);

      expect(response.status).toBe(404);

      await cleanupTestData(org2.organizationId);
    });
  });
});
