/**
 * Integration tests for overlapping shift prevention
 * Tests both session-aware and database constraint protection
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';
import { generateTestToken } from '../../../helpers/auth.js';

describe('Overlapping Shift Prevention - Integration Tests', () => {
  let testOrgId, testUserId, testScheduleId, testEmployeeId;
  let authToken;

  beforeAll(async () => {
    // Create test organization
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name)
      VALUES (gen_random_uuid(), 'Test Org - Overlap Prevention')
      RETURNING id
    `);
    testOrgId = orgResult.rows[0].id;

    // Create test user
    const userResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, organization_id, role)
      VALUES (gen_random_uuid(), 'test@overlap.com', '$2b$10$dummy', $1, 'admin')
      RETURNING id
    `, [testOrgId]);
    testUserId = userResult.rows[0].id;

    // Create test employee
    const empResult = await pool.query(`
      INSERT INTO nexus.employees (id, organization_id, first_name, last_name, employee_number, status)
      VALUES (gen_random_uuid(), $1, 'John', 'Doe', 'EMP001', 'active')
      RETURNING id
    `, [testOrgId]);
    testEmployeeId = empResult.rows[0].id;

    // Create test schedule
    const schedResult = await pool.query(`
      INSERT INTO scheduling.schedules (id, organization_id, schedule_name, start_date, end_date, status, created_by, updated_by)
      VALUES (gen_random_uuid(), $1, 'Test Schedule', '2025-01-24', '2025-01-30', 'draft', $2, $2)
      RETURNING id
    `, [testOrgId, testUserId]);
    testScheduleId = schedResult.rows[0].id;

    // Generate auth token
    authToken = generateTestToken({
      id: testUserId,
      organizationId: testOrgId,
      role: 'admin'
    });
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM scheduling.shifts WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM scheduling.schedules WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM nexus.employees WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
    await pool.end();
  });

  beforeEach(async () => {
    // Clean shifts before each test
    await pool.query('DELETE FROM scheduling.shifts WHERE organization_id = $1', [testOrgId]);
  });

  describe('Database Constraint Protection', () => {
    it('should prevent overlapping shifts at database level', async () => {
      // Create first shift: 09:00-17:00
      await pool.query(`
        INSERT INTO scheduling.shifts (
          id, organization_id, schedule_id, shift_date, start_time, end_time,
          employee_id, role_id, status, created_by, updated_by
        ) VALUES (
          gen_random_uuid(), $1, $2, '2025-01-25', '09:00', '17:00',
          $3, gen_random_uuid(), 'scheduled', $4, $4
        )
      `, [testOrgId, testScheduleId, testEmployeeId, testUserId]);

      // Try to create overlapping shift: 15:00-23:00 (overlaps with 09:00-17:00)
      await expect(
        pool.query(`
          INSERT INTO scheduling.shifts (
            id, organization_id, schedule_id, shift_date, start_time, end_time,
            employee_id, role_id, status, created_by, updated_by
          ) VALUES (
            gen_random_uuid(), $1, $2, '2025-01-25', '15:00', '23:00',
            $3, gen_random_uuid(), 'scheduled', $4, $4
          )
        `, [testOrgId, testScheduleId, testEmployeeId, testUserId])
      ).rejects.toThrow(/already has a shift/);
    });

    it('should allow non-overlapping shifts', async () => {
      // Create first shift: 09:00-17:00
      await pool.query(`
        INSERT INTO scheduling.shifts (
          id, organization_id, schedule_id, shift_date, start_time, end_time,
          employee_id, role_id, status, created_by, updated_by
        ) VALUES (
          gen_random_uuid(), $1, $2, '2025-01-25', '09:00', '17:00',
          $3, gen_random_uuid(), 'scheduled', $4, $4
        )
      `, [testOrgId, testScheduleId, testEmployeeId, testUserId]);

      // Create non-overlapping shift: 18:00-22:00
      const result = await pool.query(`
        INSERT INTO scheduling.shifts (
          id, organization_id, schedule_id, shift_date, start_time, end_time,
          employee_id, role_id, status, created_by, updated_by
        ) VALUES (
          gen_random_uuid(), $1, $2, '2025-01-25', '18:00', '22:00',
          $3, gen_random_uuid(), 'scheduled', $4, $4
        )
        RETURNING id
      `, [testOrgId, testScheduleId, testEmployeeId, testUserId]);

      expect(result.rows[0].id).toBeDefined();
    });

    it('should allow shifts on different dates', async () => {
      // Create first shift on 2025-01-25
      await pool.query(`
        INSERT INTO scheduling.shifts (
          id, organization_id, schedule_id, shift_date, start_time, end_time,
          employee_id, role_id, status, created_by, updated_by
        ) VALUES (
          gen_random_uuid(), $1, $2, '2025-01-25', '09:00', '17:00',
          $3, gen_random_uuid(), 'scheduled', $4, $4
        )
      `, [testOrgId, testScheduleId, testEmployeeId, testUserId]);

      // Create same time on different date: 2025-01-26
      const result = await pool.query(`
        INSERT INTO scheduling.shifts (
          id, organization_id, schedule_id, shift_date, start_time, end_time,
          employee_id, role_id, status, created_by, updated_by
        ) VALUES (
          gen_random_uuid(), $1, $2, '2025-01-26', '09:00', '17:00',
          $3, gen_random_uuid(), 'scheduled', $4, $4
        )
        RETURNING id
      `, [testOrgId, testScheduleId, testEmployeeId, testUserId]);

      expect(result.rows[0].id).toBeDefined();
    });

    it('should ignore cancelled shifts when checking overlaps', async () => {
      // Create cancelled shift: 09:00-17:00
      await pool.query(`
        INSERT INTO scheduling.shifts (
          id, organization_id, schedule_id, shift_date, start_time, end_time,
          employee_id, role_id, status, created_by, updated_by
        ) VALUES (
          gen_random_uuid(), $1, $2, '2025-01-25', '09:00', '17:00',
          $3, gen_random_uuid(), 'cancelled', $4, $4
        )
      `, [testOrgId, testScheduleId, testEmployeeId, testUserId]);

      // Create overlapping shift with cancelled one - should succeed
      const result = await pool.query(`
        INSERT INTO scheduling.shifts (
          id, organization_id, schedule_id, shift_date, start_time, end_time,
          employee_id, role_id, status, created_by, updated_by
        ) VALUES (
          gen_random_uuid(), $1, $2, '2025-01-25', '15:00', '23:00',
          $3, gen_random_uuid(), 'scheduled', $4, $4
        )
        RETURNING id
      `, [testOrgId, testScheduleId, testEmployeeId, testUserId]);

      expect(result.rows[0].id).toBeDefined();
    });
  });

  describe('API Layer Protection', () => {
    it('should return user-friendly error for overlapping shifts via API', async () => {
      // Create first shift via API
      const firstShift = await request(app)
        .post('/api/products/schedulehub/shifts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scheduleId: testScheduleId,
          shiftDate: '2025-01-25',
          startTime: '09:00',
          endTime: '17:00',
          workerId: testEmployeeId,
          roleId: '11111111-1111-1111-1111-111111111111'
        })
        .expect(201);

      expect(firstShift.body.success).toBe(true);

      // Try to create overlapping shift via API
      const response = await request(app)
        .post('/api/products/schedulehub/shifts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scheduleId: testScheduleId,
          shiftDate: '2025-01-25',
          startTime: '15:00',
          endTime: '23:00',
          workerId: testEmployeeId,
          roleId: '11111111-1111-1111-1111-111111111111'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/Cannot create overlapping shift/);
      expect(response.body.error).toMatch(/already has a shift/);
    });
  });
});