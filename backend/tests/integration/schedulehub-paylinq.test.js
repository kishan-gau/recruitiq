/**
 * Integration Test: ScheduleHub → Paylinq
 * Tests time entry recording when employee clocks out
 * 
 * Flow:
 * 1. Employee clocks in to shift
 * 2. Employee clocks out of shift
 * 3. Time entry recorded in Paylinq for payroll
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import pool from '../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { createTestEmployee, cleanupTestEmployees } from '../products/paylinq/helpers/employeeTestHelper.js';

describe('Integration: ScheduleHub → Paylinq', () => {
  let organizationId;
  let testUserId;
  let employeeId;
  let workerId;
  let shiftId;
  let employeeRecordId;

  beforeAll(async () => {
    // Create test organization
    const orgResult = await pool.query(
      `INSERT INTO public.organization (name, created_at) 
       VALUES ('Test Org - TimeEntry Integration', NOW()) 
       RETURNING id`
    );
    organizationId = orgResult.rows[0].id;

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO public.users (organization_id, email, password_hash, first_name, last_name, role, created_at)
       VALUES ($1, 'test-time@integration.com', 'hash', 'Test', 'Time', 'admin', NOW())
       RETURNING id`,
      [organizationId]
    );
    testUserId = userResult.rows[0].id;

    // Create employee in Nexus
    const empResult = await pool.query(
      `INSERT INTO hris.employee (
        organization_id, employee_number, first_name, last_name, email,
        job_title, employment_type, employment_status, hire_date,
        created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9)
      RETURNING id`,
      [
        organizationId,
        `EMP${Date.now().toString().slice(-4)}`,
        'Mike',
        'Worker',
        `mike.worker.${Date.now()}@example.com`,
        'Shift Worker',
        'full_time',
        'active',
        testUserId
      ]
    );
    employeeId = empResult.rows[0].id;

    // Create worker in ScheduleHub
    const workerResult = await pool.query(
      `INSERT INTO scheduling.worker (
        organization_id, employee_id, employee_number, first_name, last_name,
        email, job_title, employment_type, status, hire_date,
        max_hours_per_week, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 40, NOW(), $10)
      RETURNING id`,
      [
        organizationId,
        employeeId,
        `EMP${Date.now().toString().slice(-4)}`,
        'Mike',
        'Worker',
        `mike.worker.${Date.now()}@example.com`,
        'Shift Worker',
        'full_time',
        'active',
        testUserId
      ]
    );
    workerId = workerResult.rows[0].id;

    // Create payroll employee config using helper
    const { employee, payrollConfig } = await createTestEmployee({
      organizationId,
      userId: testUserId,
      employee: {
        id: employeeId, // Use the same employee ID
        first_name: 'Mike',
        last_name: 'Worker',
        email: `mike.worker.${Date.now()}@example.com`
      },
      payrollConfig: {
        pay_frequency: 'biweekly',
        payroll_status: 'active'
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    if (organizationId) {
      await pool.query('DELETE FROM payroll.time_entry WHERE organization_id = $1', [organizationId]);
      await cleanupTestEmployees(organizationId);
      await pool.query('DELETE FROM scheduling.shift WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM scheduling.worker WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM hris.employee WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM public.users WHERE organization_id = $1', [organizationId]);
      await pool.query('DELETE FROM public.organization WHERE id = $1', [organizationId]);
    }
    await pool.end();
  });

  beforeEach(async () => {
    // Create fresh shift for each test
    const today = new Date();
    today.setHours(9, 0, 0, 0); // 9 AM
    const startTime = new Date(today);
    const endTime = new Date(today);
    endTime.setHours(17, 0, 0, 0); // 5 PM

    const shiftResult = await pool.query(
      `INSERT INTO scheduling.shift (
        organization_id, worker_id, shift_date, start_time, end_time,
        break_minutes, status, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, 30, 'scheduled', NOW(), $6)
      RETURNING id`,
      [organizationId, workerId, today, startTime, endTime, testUserId]
    );
    shiftId = shiftResult.rows[0].id;
  });

  describe('Clock In/Clock Out Flow', () => {
    it('should record clock in successfully', async () => {
      const clockInTime = new Date();
      clockInTime.setHours(9, 5, 0, 0); // Clocked in at 9:05 AM

      const { default: ShiftService } = await import('../../src/products/schedulehub/services/shiftService.js');
      const shiftService = new ShiftService();

      const result = await shiftService.clockIn(
        shiftId,
        clockInTime,
        organizationId,
        testUserId
      );

      expect(result.shift).toBeDefined();
      expect(result.shift.status).toBe('in_progress');
      expect(result.shift.clock_in_time).toBeTruthy();
    });

    it('should record time entry when clocking out', async () => {
      // Clock in first
      const clockInTime = new Date();
      clockInTime.setHours(9, 0, 0, 0); // 9:00 AM

      await pool.query(
        `UPDATE scheduling.shift 
         SET clock_in_time = $1, status = 'in_progress'
         WHERE id = $2`,
        [clockInTime, shiftId]
      );

      // Clock out
      const clockOutTime = new Date();
      clockOutTime.setHours(17, 0, 0, 0); // 5:00 PM

      const { default: ShiftService } = await import('../../src/products/schedulehub/services/shiftService.js');
      const shiftService = new ShiftService();

      const result = await shiftService.clockOut({
        shiftId,
        clockOutTime,
        actualBreakMinutes: 30
      }, organizationId, testUserId);

      expect(result.shift).toBeDefined();
      expect(result.shift.status).toBe('completed');
      expect(result.timeTracking).toBeDefined();
      expect(result.timeTracking.workedHours).toBe(7.5); // 8 hours - 0.5 hour break
      expect(result.timeTracking.regularHours).toBe(7.5);
      expect(result.timeTracking.overtimeHours).toBe(0);

      // Wait for async integration
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify time entry was created in Paylinq
      const timeEntryResult = await pool.query(
        `SELECT * FROM payroll.time_entry 
         WHERE organization_id = $1 
         AND employee_id = $2 
         AND source_reference_id = $3
         AND deleted_at IS NULL`,
        [organizationId, employeeId, shiftId]
      );

      expect(timeEntryResult.rows.length).toBe(1);
      const timeEntry = timeEntryResult.rows[0];

      expect(parseFloat(timeEntry.worked_hours)).toBe(7.5);
      expect(parseFloat(timeEntry.regular_hours)).toBe(7.5);
      expect(parseFloat(timeEntry.overtime_hours)).toBe(0);
      expect(timeEntry.entry_type).toBe('regular');
      expect(timeEntry.status).toBe('approved');
      expect(timeEntry.source_system).toBe('schedulehub');
    });

    it('should calculate overtime hours correctly', async () => {
      // Clock in
      const clockInTime = new Date();
      clockInTime.setHours(8, 0, 0, 0); // 8:00 AM

      await pool.query(
        `UPDATE scheduling.shift 
         SET clock_in_time = $1, status = 'in_progress'
         WHERE id = $2`,
        [clockInTime, shiftId]
      );

      // Clock out after 10 hours
      const clockOutTime = new Date();
      clockOutTime.setHours(18, 30, 0, 0); // 6:30 PM (10.5 hours)

      const { default: ShiftService } = await import('../../src/products/schedulehub/services/shiftService.js');
      const shiftService = new ShiftService();

      const result = await shiftService.clockOut({
        shiftId,
        clockOutTime,
        actualBreakMinutes: 30
      }, organizationId, testUserId);

      expect(result.timeTracking.workedHours).toBe(10); // 10.5 - 0.5 break
      expect(result.timeTracking.regularHours).toBe(8); // Standard day
      expect(result.timeTracking.overtimeHours).toBe(2); // 2 hours OT

      // Wait for integration
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify time entry has overtime
      const timeEntryResult = await pool.query(
        `SELECT * FROM payroll.time_entry 
         WHERE organization_id = $1 
         AND source_reference_id = $2`,
        [organizationId, shiftId]
      );

      const timeEntry = timeEntryResult.rows[0];
      expect(parseFloat(timeEntry.regular_hours)).toBe(8);
      expect(parseFloat(timeEntry.overtime_hours)).toBe(2);
    });

    it('should handle part-time worker hours correctly', async () => {
      // Update worker to part-time
      await pool.query(
        `UPDATE scheduling.worker 
         SET employment_type = 'part_time', max_hours_per_week = 20
         WHERE id = $1`,
        [workerId]
      );

      // Update shift to 6 hour shift (part-time)
      const clockInTime = new Date();
      clockInTime.setHours(9, 0, 0, 0);
      const startTime = new Date(clockInTime);
      const endTime = new Date(clockInTime);
      endTime.setHours(15, 0, 0, 0); // 6 hour shift

      await pool.query(
        `UPDATE scheduling.shift 
         SET start_time = $1, end_time = $2, clock_in_time = $3, status = 'in_progress'
         WHERE id = $4`,
        [startTime, endTime, clockInTime, shiftId]
      );

      // Clock out after working 7 hours (1 hour OT for part-time)
      const clockOutTime = new Date();
      clockOutTime.setHours(16, 0, 0, 0);

      const { default: ShiftService } = await import('../../src/products/schedulehub/services/shiftService.js');
      const shiftService = new ShiftService();

      const result = await shiftService.clockOut({
        shiftId,
        clockOutTime,
        actualBreakMinutes: 0
      }, organizationId, testUserId);

      // For part-time, scheduled hours (6) is standard, anything over is OT
      expect(result.timeTracking.workedHours).toBe(7);
      expect(result.timeTracking.regularHours).toBe(6);
      expect(result.timeTracking.overtimeHours).toBe(1);
    });

    it('should not create duplicate time entries', async () => {
      // Clock in and out
      const clockInTime = new Date();
      clockInTime.setHours(9, 0, 0, 0);
      const clockOutTime = new Date();
      clockOutTime.setHours(17, 0, 0, 0);

      await pool.query(
        `UPDATE scheduling.shift 
         SET clock_in_time = $1, status = 'in_progress'
         WHERE id = $2`,
        [clockInTime, shiftId]
      );

      const { default: ShiftService } = await import('../../src/products/schedulehub/services/shiftService.js');
      const shiftService = new ShiftService();

      await shiftService.clockOut({
        shiftId,
        clockOutTime,
        actualBreakMinutes: 30
      }, organizationId, testUserId);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Try to create time entry again manually
      const { default: PaylinqIntegrationService } = await import('../../src/products/paylinq/services/integrationService.js');
      const paylinqIntegration = new PaylinqIntegrationService();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await paylinqIntegration.recordTimeEntryFromScheduleHub({
        employeeId,
        shiftId,
        organizationId,
        workDate: today,
        regularHours: 7.5,
        overtimeHours: 0,
        clockIn: clockInTime,
        clockOut: clockOutTime
      }, testUserId);

      // Should return message about existing entry
      expect(result.integrationResult.data.message).toContain('already exists');

      // Verify only one time entry
      const timeEntryCount = await pool.query(
        `SELECT COUNT(*) FROM payroll.time_entry 
         WHERE organization_id = $1 AND source_reference_id = $2`,
        [organizationId, shiftId]
      );

      expect(parseInt(timeEntryCount.rows[0].count)).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should prevent clock out without clock in', async () => {
      const clockOutTime = new Date();
      
      const { default: ShiftService } = await import('../../src/products/schedulehub/services/shiftService.js');
      const shiftService = new ShiftService();

      await expect(
        shiftService.clockOut({
          shiftId,
          clockOutTime,
          actualBreakMinutes: 30
        }, organizationId, testUserId)
      ).rejects.toThrow('Cannot clock out before clocking in');
    });

    it('should prevent double clock out', async () => {
      // Clock in and out once
      const clockInTime = new Date();
      clockInTime.setHours(9, 0, 0, 0);
      const clockOutTime = new Date();
      clockOutTime.setHours(17, 0, 0, 0);

      await pool.query(
        `UPDATE scheduling.shift 
         SET clock_in_time = $1, clock_out_time = $2, status = 'completed'
         WHERE id = $3`,
        [clockInTime, clockOutTime, shiftId]
      );

      const { default: ShiftService } = await import('../../src/products/schedulehub/services/shiftService.js');
      const shiftService = new ShiftService();

      // Try to clock out again
      await expect(
        shiftService.clockOut({
          shiftId,
          clockOutTime: new Date(),
          actualBreakMinutes: 30
        }, organizationId, testUserId)
      ).rejects.toThrow('already clocked out');
    });

    it('should handle missing employee in payroll gracefully', async () => {
      // Create worker without payroll record
      const newWorkerResult = await pool.query(
        `INSERT INTO scheduling.worker (
          organization_id, employee_id, employee_number, first_name, last_name,
          email, employment_type, status, created_at, created_by
        ) VALUES ($1, $2, $3, 'New', 'Worker', 'new@test.com', 'full_time', 'active', NOW(), $4)
        RETURNING id`,
        [organizationId, uuidv4(), `EMP${Date.now().toString().slice(-4)}`, testUserId]
      );

      const newShiftResult = await pool.query(
        `INSERT INTO scheduling.shift (
          organization_id, worker_id, shift_date, start_time, end_time,
          clock_in_time, status, created_at, created_by
        ) VALUES ($1, $2, NOW(), NOW(), NOW() + INTERVAL '8 hours', NOW(), 'in_progress', NOW(), $3)
        RETURNING id`,
        [organizationId, newWorkerResult.rows[0].id, testUserId]
      );

      const { default: ShiftService } = await import('../../src/products/schedulehub/services/shiftService.js');
      const shiftService = new ShiftService();

      // Clock out should succeed even if payroll integration fails
      const result = await shiftService.clockOut({
        shiftId: newShiftResult.rows[0].id,
        clockOutTime: new Date(),
        actualBreakMinutes: 30
      }, organizationId, testUserId);

      expect(result.shift.status).toBe('completed');
      // Payroll integration should have failed, but shift still completed
    });
  });

  describe('Integration Health', () => {
    it('should track time entry integration metrics', async () => {
      const { default: integrationErrorHandler } = await import('../../src/shared/utils/integrationErrorHandler.js');

      // Reset metrics
      integrationErrorHandler.resetMetrics('schedulehub-to-paylinq-timeentry');

      // Execute successful clock out
      const clockInTime = new Date();
      clockInTime.setHours(9, 0, 0, 0);
      await pool.query(
        `UPDATE scheduling.shift 
         SET clock_in_time = $1, status = 'in_progress'
         WHERE id = $2`,
        [clockInTime, shiftId]
      );

      const { default: ShiftService } = await import('../../src/products/schedulehub/services/shiftService.js');
      const shiftService = new ShiftService();

      await shiftService.clockOut({
        shiftId,
        clockOutTime: new Date(),
        actualBreakMinutes: 30
      }, organizationId, testUserId);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Check metrics
      const health = integrationErrorHandler.getHealthStatus();

      if (health['schedulehub-to-paylinq-timeentry']) {
        expect(health['schedulehub-to-paylinq-timeentry'].successCount).toBeGreaterThan(0);
      }
    });
  });
});
