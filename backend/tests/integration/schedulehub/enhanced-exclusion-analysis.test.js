/**
 * Integration tests for Enhanced Worker Exclusion Analysis
 * Tests the comprehensive exclusion analysis system in real scheduling scenarios
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import pool from '../../../src/config/database.js';
import ScheduleService from '../../../src/products/schedulehub/services/scheduleService.js';

describe('Enhanced Worker Exclusion Analysis - Integration Tests', () => {
  jest.setTimeout(45000); // 45 second timeout for integration tests
  
  let testOrgId, testUserId, testScheduleId, testRoleId, testStationId, testEmployeeId;
  let scheduleService;

  beforeAll(async () => {
    // Setup test organization with unique slug using timestamp
    const uniqueSlug = `test-org-enhanced-exclusion-${Date.now()}`;
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name, slug)
      VALUES (gen_random_uuid(), 'Test Org - Enhanced Exclusion Analysis', $1)
      RETURNING id
    `, [uniqueSlug]);
    testOrgId = orgResult.rows[0].id;

    // Setup test user
    const userResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, organization_id)
      VALUES (gen_random_uuid(), 'test-exclusion@example.com', '$2b$10$dummyhash', $1)
      RETURNING id
    `, [testOrgId]);
    testUserId = userResult.rows[0].id;

    // Setup test schedule
    const scheduleResult = await pool.query(`
      INSERT INTO scheduling.schedules (id, schedule_name, organization_id, created_by, start_date, end_date, status)
      VALUES (gen_random_uuid(), 'Test Schedule - Enhanced Exclusion', $1, $2, '2024-12-02', '2024-12-08', 'draft')
      RETURNING id
    `, [testOrgId, testUserId]);
    testScheduleId = scheduleResult.rows[0].id;

    // Setup test role
    const roleResult = await pool.query(`
      INSERT INTO scheduling.roles (id, role_code, role_name, organization_id, is_active)
      VALUES (gen_random_uuid(), 'SERVER', 'Server', $1, true)
      RETURNING id
    `, [testOrgId]);
    testRoleId = roleResult.rows[0].id;

    // Setup test station
    const stationResult = await pool.query(`
      INSERT INTO scheduling.stations (id, station_code, station_name, organization_id, created_by)
      VALUES (gen_random_uuid(), 'STAT1', 'Station 1', $1, $2)
      RETURNING id
    `, [testOrgId, testUserId]);
    testStationId = stationResult.rows[0].id;

    // Setup test employee (Vivaan Gauri scenario)
    const employeeResult = await pool.query(`
      INSERT INTO hris.employee (id, organization_id, first_name, last_name, 
        email, employee_number, department_id, employment_status, hire_date, created_by)
      VALUES (gen_random_uuid(), $1, 'Vivaan', 'Gauri', 
        'vivaan.gauri@test.com', 'EMP001', NULL, 'active', '2024-01-01', $2)
      RETURNING id
    `, [testOrgId, testUserId]);
    testEmployeeId = employeeResult.rows[0].id;

    // Create ScheduleService instance
    scheduleService = new ScheduleService();
  });

  afterAll(async () => {
    // Cleanup test data in correct order
    await pool.query('DELETE FROM scheduling.shifts WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM scheduling.stations WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM scheduling.schedules WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM scheduling.worker_availability WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM scheduling.worker_roles WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM scheduling.worker_scheduling_config WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM hris.employee WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM scheduling.roles WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
    
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up shifts between tests
    await pool.query('DELETE FROM scheduling.shifts WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM scheduling.worker_availability WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM scheduling.worker_roles WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM scheduling.worker_scheduling_config WHERE organization_id = $1', [testOrgId]);
  });

  describe('Scenario: Complete Self-Contained Test with All Required Data', () => {
    beforeEach(async () => {
      // Setup role assignment (worker has the role)
      await pool.query(`
        INSERT INTO scheduling.worker_roles 
        (employee_id, role_id, organization_id)
        VALUES ($1, $2, $3)
      `, [testEmployeeId, testRoleId, testOrgId]);

      // Setup availability (worker is available on Monday 15hrs)
      await pool.query(`
        INSERT INTO scheduling.worker_availability 
        (employee_id, day_of_week, start_time, end_time, organization_id, availability_type, effective_from, created_by, updated_by)
        VALUES ($1, 1, '08:00:00', '23:00:00', $2, 'recurring', '2024-01-01', $3, $3)
      `, [testEmployeeId, testOrgId, testUserId]);

      // Add specific date availability for 2024-12-16 (Monday)
      await pool.query(`
        INSERT INTO scheduling.worker_availability 
        (employee_id, specific_date, start_time, end_time, organization_id, availability_type, effective_from, created_by, updated_by)
        VALUES ($1, '2024-12-16', '08:00:00', '23:00:00', $2, 'one_time', '2024-01-01', $3, $3)
      `, [testEmployeeId, testOrgId, testUserId]);

      // Debug: Check availability records
      const debugAvailability = await pool.query(`
        SELECT * FROM scheduling.worker_availability WHERE employee_id = $1
      `, [testEmployeeId]);
      console.log('🔍 DEBUG: Availability records created:', JSON.stringify(debugAvailability.rows, null, 2));

      // Setup COMPLETE scheduling configuration (all required fields)
      await pool.query(`
        INSERT INTO scheduling.worker_scheduling_config 
        (employee_id, organization_id, max_hours_per_week, min_hours_per_week, 
         max_consecutive_days, min_rest_hours_between_shifts, 
         is_schedulable, scheduling_status, created_by, created_at)
        VALUES ($1, $2, 40.00, 0.00, 6, 11, true, 'active', $3, NOW())
      `, [testEmployeeId, testOrgId, testUserId]);
    });

    it('should successfully generate shifts with complete worker configuration', async () => {
      const templateData = {
        templateName: 'Middag shift template',
        startTime: '12:00',
        endTime: '20:00',
        roles: [
          {
            roleId: testRoleId,
            quantity: 1
          }
        ]
      };

      const startDate = new Date('2024-12-16'); // Monday (matches availability)
      const endDate = new Date('2024-12-17'); // Tuesday (end date after start date)
      
      // Run auto-generation
      const client = await pool.connect();
      let result;
      try {
        result = await scheduleService.generateShiftsFromDedicatedTemplate(
          client,
          testScheduleId,
          templateData,
          startDate,
          endDate,
          [1], // Monday (applicableDays)
          testOrgId,
          testUserId,
          {} // options
        );
      } finally {
        client.release();
      }

      // DEBUG: First check what's in our test data
      console.log('🔍 DEBUG: Checking test data setup...');
      const testDataCheck = await pool.query(`
        SELECT 
          e.id, e.first_name || ' ' || e.last_name as name,
          wr.role_id, wr.employee_id as role_emp_id,
          wsc.employee_id as config_emp_id, wsc.is_schedulable, wsc.scheduling_status,
          wa.employee_id as avail_emp_id, wa.start_time, wa.end_time
        FROM hris.employee e
        LEFT JOIN scheduling.worker_roles wr ON e.id = wr.employee_id AND wr.organization_id = e.organization_id
        LEFT JOIN scheduling.worker_scheduling_config wsc ON e.id = wsc.employee_id AND wsc.organization_id = e.organization_id  
        LEFT JOIN scheduling.worker_availability wa ON e.id = wa.employee_id AND wa.organization_id = e.organization_id
        WHERE e.organization_id = $1
      `, [testOrgId]);
      console.log('🔍 TEST DATA:', JSON.stringify(testDataCheck.rows, null, 2));

      // DEBUG: Log the actual result structure
      console.log('🔍 DEBUG: Actual result structure:', JSON.stringify(result, null, 2));
      console.log('🔍 DEBUG: result.generated value:', result.generated);
      console.log('🔍 DEBUG: result.uncovered value:', result.uncovered);
      console.log('🔍 DEBUG: Vivaan Gauri should now be selected with complete config');

      // Verify shifts were successfully created (expected behavior with complete config)
      expect(result.generated).toBeGreaterThan(0);
      expect(result.uncovered).toBe(0);

      // Verify enhanced exclusion analysis should report successful worker selection
      console.log('🔍 ENHANCED ANALYSIS WITH COMPLETE CONFIG:');
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => console.log('⚠️ ', warning));
      } else {
        console.log('✅ No warnings - all workers properly configured!');
      }

      // Verify actual shifts in database
      const shiftResult = await pool.query(`
        SELECT s.*, 
               CONCAT(e.first_name, ' ', e.last_name) as worker_name, 
               r.role_name as role_name
        FROM scheduling.shifts s
        JOIN hris.employee e ON s.employee_id = e.id  
        JOIN scheduling.roles r ON s.role_id = r.id
        WHERE s.organization_id = $1
      `, [testOrgId]);

      expect(shiftResult.rows.length).toBeGreaterThan(0);
      console.log('🔍 CREATED SHIFTS:', shiftResult.rows.map(s => ({
        worker: s.worker_name,
        role: s.role_name,
        date: s.shift_date,
        time: `${s.start_time}-${s.end_time}`
      })));

      // Verify the warning provides actionable guidance
      expect(configWarning).toMatch(/ACTION:/);
      expect(configWarning.toLowerCase()).toMatch(/worker.*settings|scheduling.*config|add.*config/);
    });

    it('should provide worker-specific details in exclusion analysis', async () => {
      const templateData = {
        templateName: 'Evening shift',
        startTime: '18:00',
        endTime: '22:00',
        roles: [
          {
            roleId: testRoleId,
            quantity: 1
          }
        ]
      };

      const startDate = new Date('2024-12-16'); // Monday
      const endDate = new Date('2024-12-17'); // Tuesday (end date after start date)
      
      const client = await pool.connect();
      let result;
      try {
        result = await scheduleService.generateShiftsFromDedicatedTemplate(
          client,
          testScheduleId,
          templateData,
          startDate,
          endDate,
          [1], // Monday (applicableDays)
          testOrgId,
          testUserId,
          {} // options
        );
      } finally {
        client.release();
      }

      expect(result.generated).toBe(0);
      
      // Check that worker names are included in the warnings
      const workerSpecificWarning = result.warnings.find(warning =>
        warning.includes('Vivaan Gauri') || warning.includes('Gauri')
      );

      expect(workerSpecificWarning).toBeDefined();
      console.log('🔍 WORKER-SPECIFIC WARNING:', workerSpecificWarning);
    });
  });

  describe('Scenario: Worker with Complete Configuration', () => {
    beforeEach(async () => {
      // Setup complete configuration (should work)
      await pool.query(`
        INSERT INTO scheduling.worker_roles 
        (employee_id, role_id, organization_id)
        VALUES ($1, $2, $3)
      `, [testEmployeeId, testRoleId, testOrgId]);

      await pool.query(`
        INSERT INTO scheduling.worker_availability 
        (employee_id, day_of_week, start_time, end_time, availability_type, effective_from, organization_id, created_by, updated_by)
        VALUES ($1, 1, '08:00', '23:00', 'recurring', '2024-01-01', $2, $3, $3)
      `, [testEmployeeId, testOrgId, testUserId]);

      // Create proper scheduling configuration
      await pool.query(`
        INSERT INTO scheduling.worker_scheduling_config 
        (employee_id, is_schedulable, scheduling_status, organization_id, created_by)
        VALUES ($1, true, 'active', $2, $3)
      `, [testEmployeeId, testOrgId, testUserId]);
    });

    it('should successfully create shifts when worker is properly configured', async () => {
      const templateData = {
        templateName: 'Middag shift template',
        startTime: '12:00',
        endTime: '20:00',
        roles: [
          {
            roleId: testRoleId,
            quantity: 1
          }
        ]
      };

      const startDate = new Date('2024-12-16'); // Monday
      const endDate = new Date('2024-12-16'); // Same day
      
      const client = await pool.connect();
      let result;
      try {
        result = await scheduleService.generateShiftsFromDedicatedTemplate(
          client,
          testScheduleId,
          templateData,
          startDate,
          endDate,
          [1], // Monday (applicableDays)
          testOrgId,
          testUserId,
          {} // options
        );
      } finally {
        client.release();
      }

      // With proper configuration, shifts should be created
      expect(result.generated).toBe(1);
      expect(result.uncovered).toBe(0);
      expect(result.warnings.length).toBe(0);

      console.log('✅ SUCCESS: Proper configuration allowed shift creation');
    });
  });

  describe('Scenario: Multiple Exclusion Types', () => {
    beforeEach(async () => {
      // Setup second employee with different issues
      const emp2Result = await pool.query(`
        INSERT INTO hris.employee (id, organization_id, first_name, last_name, 
          email, employee_number, employment_status, hire_date, created_by)
        VALUES (gen_random_uuid(), $1, 'John', 'OnLeave', 
          'john.onleave@company.com', 'EMP002', 'on_leave', '2023-01-01', $2)
        RETURNING id
      `, [testOrgId, testUserId]);
      
      const emp2Id = emp2Result.rows[0].id;

      // Setup third employee with role but no availability
      const emp3Result = await pool.query(`
        INSERT INTO hris.employee (id, organization_id, first_name, last_name, 
          email, employee_number, employment_status, hire_date, created_by)
        VALUES (gen_random_uuid(), $1, 'Jane', 'NoAvailability', 
          'jane.noavail@example.com', 'EMP003', 'active', '2024-01-03', $2)
        RETURNING id
      `, [testOrgId, testUserId]);
      
      const emp3Id = emp3Result.rows[0].id;

      // Employee 1 (Vivaan): Has role, availability, but missing scheduling config
      await pool.query(`
        INSERT INTO scheduling.worker_roles 
        (employee_id, role_id, organization_id)
        VALUES ($1, $2, $3)
      `, [testEmployeeId, testRoleId, testOrgId]);

      await pool.query(`
        INSERT INTO scheduling.worker_availability 
        (employee_id, day_of_week, start_time, end_time, availability_type, organization_id, created_by, updated_by)
        VALUES ($1, 1, '08:00', '23:00', 'recurring', $2, $3, $3)
      `, [testEmployeeId, testOrgId, testUserId]);

      // Employee 2: Inactive employee with proper config
      await pool.query(`
        INSERT INTO scheduling.worker_roles 
        (employee_id, role_id, organization_id)
        VALUES ($1, $2, $3)
      `, [emp2Id, testRoleId, testOrgId]);

      await pool.query(`
        INSERT INTO scheduling.worker_scheduling_config 
        (employee_id, is_schedulable, scheduling_status, organization_id, created_by)
        VALUES ($1, true, 'active', $2, $3)
      `, [emp2Id, testOrgId, testUserId]);

      // Employee 3: Active with role and config but no availability
      await pool.query(`
        INSERT INTO scheduling.worker_roles 
        (employee_id, role_id, organization_id)
        VALUES ($1, $2, $3)
      `, [emp3Id, testRoleId, testOrgId]);

      await pool.query(`
        INSERT INTO scheduling.worker_scheduling_config 
        (employee_id, is_schedulable, scheduling_status, organization_id, created_by)
        VALUES ($1, true, 'active', $2, $3)
      `, [emp3Id, testOrgId, testUserId]);
    });

    it('should identify multiple different exclusion reasons across workers', async () => {
      const templateData = {
        templateName: 'Complex scenario test',
        startTime: '10:00',
        endTime: '18:00',
        roleRequirements: [
          {
            roleId: testRoleId,
            quantity: 3  // Need 3 workers but all have different issues
          }
        ],
        stations: [testStationId]  // Assign station to avoid station warning
      };

      const startDate = new Date('2024-12-16'); // Monday
      const endDate = new Date('2024-12-16'); // Same day
      
      const client = await pool.connect();
      let result;
      try {
        result = await scheduleService.generateShiftsFromDedicatedTemplate(
          client,
          testScheduleId,
          templateData,
          startDate,
          endDate,
          [1], // Monday (applicableDays)
          testOrgId,
          testUserId,
          {} // options
        );
      } finally {
        client.release();
      }

      expect(result.generated).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);

      // Should have different types of exclusions
      const warningText = result.warnings.join(' ');
      
      console.log('🔍 MULTIPLE EXCLUSION TYPES DETECTED:');
      result.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });

      // Should mention worker exclusion reasons (not schedulable, inactive, no availability)
      expect(warningText.toLowerCase()).toMatch(/not.*schedulable|inactive|availability|excluded/);
    });
  });
});
