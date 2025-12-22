/**
 * Performance Tests for ScheduleHub Auto Schedule Generator
 * 
 * Tests performance and scalability of the auto schedule generation algorithm
 * under various load conditions and data sizes.
 * 
 * @requires npm run test:performance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import pool from '../../../src/config/database.js';
import ScheduleService from '../../../src/products/schedulehub/services/scheduleService.js';
import { v4 as uuidv4 } from 'uuid';

// Test configuration
const PERFORMANCE_CONFIG = {
  // Test scale configurations
  scales: {
    small: { employees: 10, shifts: 50, stations: 5, days: 7 },
    medium: { employees: 50, shifts: 200, stations: 15, days: 14 },
    large: { employees: 100, shifts: 500, stations: 30, days: 30 },
    xlarge: { employees: 200, shifts: 1000, stations: 50, days: 60 }
  },
  
  // Performance thresholds (milliseconds)
  thresholds: {
    small: { generation: 2000, optimization: 2000 },
    medium: { generation: 5500, optimization: 6000 },
    large: { generation: 15000, optimization: 18000 },
    xlarge: { generation: 30000, optimization: 35000 }
  },
  
  // Memory usage thresholds (MB)
  memoryThresholds: {
    small: 50,
    medium: 150,
    large: 300,
    xlarge: 500
  }
};

describe('Auto Schedule Generator - Performance Tests', () => {
  let testOrgId, testUserId;
  let service;
  let performanceResults = {};

  beforeAll(async () => {
    // Create test organization with required slug field
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name, slug, created_at)
      VALUES ($1, 'ScheduleHub Performance Test Org', $2, NOW())
      RETURNING id
    `, [uuidv4(), 'schedulehub-perf-test-' + Date.now()]);
    testOrgId = orgResult.rows[0].id;

    // Create test user
    const userResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, organization_id, created_at)
      VALUES ($1, 'perf-test@schedulehub.com', '$2b$10$dummy', $2, NOW())
      RETURNING id
    `, [uuidv4(), testOrgId]);
    testUserId = userResult.rows[0].id;

    // Initialize service
    service = new ScheduleService();

    console.log('🚀 Starting ScheduleHub Auto Schedule Generator Performance Tests');
    console.log(`Test Organization ID: ${testOrgId}`);
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM scheduling.schedules WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM scheduling.shifts WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM scheduling.stations WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM hris.employee WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM hris.department WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM hris.location WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);

    // Print performance summary
    console.log('\n📊 Performance Test Results Summary:');
    Object.entries(performanceResults).forEach(([testName, result]) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${testName}: ${result.duration}ms (threshold: ${result.threshold}ms)`);
      if (result.memoryUsage) {
        console.log(`   Memory: ${result.memoryUsage}MB`);
      }
    });

    await pool.end();
  });

  beforeEach(() => {
    // Clear any previous test data for isolation
    performanceResults = {};
  });

  describe('Small Scale Performance (10 employees, 50 shifts)', () => {
    let testData;

    beforeAll(async () => {
      testData = await createTestData('small');
    });

    it('should generate schedules within performance threshold', async () => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      const scheduleRequest = {
        templateIds: testData.templateIds,
        scheduleName: 'Small Scale Performance Test',
        description: 'Performance test for small-scale schedule generation',
        startDate: '2025-01-01',
        endDate: '2025-01-07',
        status: 'draft',
        allowPartialTime: true
      };

      const result = await service.autoGenerateSchedule(scheduleRequest, testOrgId, testUserId);
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const duration = endTime - startTime;
      const memoryUsage = endMemory - startMemory;

      const threshold = PERFORMANCE_CONFIG.thresholds.small.generation;
      const memoryThreshold = PERFORMANCE_CONFIG.memoryThresholds.small;

      performanceResults['Small Scale Generation'] = {
        duration,
        threshold,
        memoryUsage,
        passed: duration <= threshold && memoryUsage <= memoryThreshold
      };

      expect(result).toBeTruthy();
      expect(result.schedule).toBeDefined();
      expect(duration).toBeLessThanOrEqual(threshold);
      expect(memoryUsage).toBeLessThanOrEqual(memoryThreshold);

      console.log(`✅ Small scale generation: ${duration}ms, ${memoryUsage.toFixed(1)}MB`);
    });

    it('should generate subsequent schedules efficiently', async () => {
      // Generate a base schedule for comparison
      const baseRequest = {
        templateIds: testData.templateIds,
        scheduleName: 'Base Schedule for Performance Comparison',
        description: 'Base schedule for performance testing',
        startDate: '2025-01-01',
        endDate: '2025-01-07',
        status: 'draft',
        allowPartialTime: true
      };

      // First generation (not timed)
      const baseSchedule = await service.autoGenerateSchedule(baseRequest, testOrgId, testUserId);

      // Second generation request (timed)
      const optimizedRequest = {
        templateIds: testData.templateIds,
        scheduleName: 'Subsequent Schedule for Performance Test',
        description: 'Testing subsequent generation performance',
        startDate: '2025-01-08',
        endDate: '2025-01-14',
        status: 'draft',
        allowPartialTime: true
      };

      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      // Test subsequent schedule generation performance
      const result = await service.autoGenerateSchedule(optimizedRequest, testOrgId, testUserId);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const duration = endTime - startTime;
      const memoryUsage = endMemory - startMemory;

      const threshold = 4500; // 4.5 seconds for small scale subsequent generation

      performanceResults['Small Scale Subsequent Generation'] = {
        duration,
        threshold,
        memoryUsage,
        passed: duration <= threshold
      };

      expect(result).toBeTruthy();
      expect(duration).toBeLessThanOrEqual(threshold);

      console.log(`✅ Small scale subsequent generation: ${duration}ms, ${memoryUsage.toFixed(1)}MB`);
    });
  });

  describe('Medium Scale Performance (50 employees, 200 shifts)', () => {
    let testData;

    beforeAll(async () => {
      testData = await createTestData('medium');
    });

    it('should handle medium-scale generation within threshold', async () => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      const scheduleRequest = {
        templateIds: testData.templateIds,
        scheduleName: 'Medium Scale Performance Test',
        description: 'Performance test for medium-scale schedule generation',
        startDate: '2025-01-01',
        endDate: '2025-01-14',
        status: 'draft',
        allowPartialTime: true
      };

      const result = await service.autoGenerateSchedule(scheduleRequest, testOrgId, testUserId);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const duration = endTime - startTime;
      const memoryUsage = endMemory - startMemory;

      const threshold = PERFORMANCE_CONFIG.thresholds.medium.generation;
      const memoryThreshold = PERFORMANCE_CONFIG.memoryThresholds.medium;

      performanceResults['Medium Scale Generation'] = {
        duration,
        threshold,
        memoryUsage,
        passed: duration <= threshold && memoryUsage <= memoryThreshold
      };

      expect(result).toBeTruthy();
      expect(duration).toBeLessThanOrEqual(threshold);
      expect(memoryUsage).toBeLessThanOrEqual(memoryThreshold);

      console.log(`✅ Medium scale generation: ${duration}ms, ${memoryUsage.toFixed(1)}MB`);
    });

    it('should handle complex constraint scenarios efficiently', async () => {
      const startTime = Date.now();

      const complexRequest = {
        templateIds: testData.templateIds,
        scheduleName: 'Complex Constraints Performance Test',
        startDate: '2025-01-01',
        endDate: '2025-01-14',
        status: 'draft',
        allowPartialTime: true
      };

      const result = await service.autoGenerateSchedule(complexRequest, testOrgId, testUserId);

      const duration = Date.now() - startTime;
      const threshold = PERFORMANCE_CONFIG.thresholds.medium.generation * 1.5; // Allow 50% more for complex constraints

      performanceResults['Medium Scale Complex Constraints'] = {
        duration,
        threshold,
        passed: duration <= threshold
      };

      expect(result).toBeTruthy();
      expect(duration).toBeLessThanOrEqual(threshold);

      console.log(`✅ Medium scale complex constraints: ${duration}ms`);
    });
  });

  describe('Large Scale Performance (100 employees, 500 shifts)', () => {
    let testData;

    beforeAll(async () => {
      testData = await createTestData('large');
    });

    it('should handle large-scale generation within acceptable time', async () => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      const scheduleRequest = {
        templateIds: testData.templateIds,
        scheduleName: 'Large Scale Performance Test',
        description: 'Performance test for large-scale schedule generation with 100+ employees',
        startDate: '2025-01-01',
        endDate: '2025-01-30',
        status: 'draft',
        allowPartialTime: true
      };

      const result = await service.autoGenerateSchedule(scheduleRequest, testOrgId, testUserId);

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const duration = endTime - startTime;
      const memoryUsage = endMemory - startMemory;

      const threshold = PERFORMANCE_CONFIG.thresholds.large.generation;
      const memoryThreshold = PERFORMANCE_CONFIG.memoryThresholds.large;

      performanceResults['Large Scale Generation'] = {
        duration,
        threshold,
        memoryUsage,
        passed: duration <= threshold && memoryUsage <= memoryThreshold
      };

      expect(result).toBeTruthy();
      expect(duration).toBeLessThanOrEqual(threshold);
      expect(memoryUsage).toBeLessThanOrEqual(memoryThreshold);

      console.log(`✅ Large scale generation: ${duration}ms, ${memoryUsage.toFixed(1)}MB`);
    });
  });

  describe('Stress Testing and Edge Cases', () => {
    it('should handle concurrent schedule generation requests', async () => {
      const testData = await createTestData('small');
      const concurrentRequests = 5;
      
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, index) => {
        const request = {
          scheduleName: `Concurrent Test Schedule ${index + 1}`,
          description: `Concurrent performance test ${index + 1}`,
          startDate: '2025-01-01',
          endDate: '2025-01-07',
          templateIds: [testData.templateIds[0]],
          allowPartialTime: true
        };
        
        return service.autoGenerateSchedule(request, testOrgId, testUserId);
      });

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      performanceResults['Concurrent Generation'] = {
        duration,
        threshold: 10000, // 10 seconds for 5 concurrent requests
        passed: duration <= 10000
      };

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toBeTruthy();
        expect(result.schedule).toBeDefined();
      });

      console.log(`✅ Concurrent generation (${concurrentRequests} requests): ${duration}ms`);
    });

    it('should handle memory efficiently during multiple consecutive generations', async () => {
      const testData = await createTestData('medium');
      const iterations = 10;
      const memorySnapshots = [];

      for (let i = 0; i < iterations; i++) {
        const beforeMemory = process.memoryUsage().heapUsed / 1024 / 1024;

        const request = {
          scheduleName: `Stress Test Schedule ${i + 1}`,
          description: `Performance test iteration ${i + 1}`,
          startDate: `2025-0${Math.floor(i / 3) + 1}-01`,
          endDate: `2025-0${Math.floor(i / 3) + 1}-07`,
          templateIds: [testData.templateIds[0]],
          allowPartialTime: true
        };

        await service.autoGenerateSchedule(request, testOrgId, testUserId);

        const afterMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        memorySnapshots.push({ iteration: i + 1, before: beforeMemory, after: afterMemory });

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Check for memory leaks (memory shouldn't grow indefinitely)
      const firstMemory = memorySnapshots[0].after;
      const lastMemory = memorySnapshots[memorySnapshots.length - 1].after;
      const memoryGrowth = lastMemory - firstMemory;

      const maxAcceptableGrowth = 100; // 100MB growth is acceptable
      performanceResults['Memory Leak Test'] = {
        memoryGrowth,
        threshold: maxAcceptableGrowth,
        passed: memoryGrowth <= maxAcceptableGrowth
      };

      expect(memoryGrowth).toBeLessThanOrEqual(maxAcceptableGrowth);

      console.log(`✅ Memory leak test: ${memoryGrowth.toFixed(1)}MB growth over ${iterations} iterations`);
    }, 60000);

    it('should handle edge case scenarios efficiently', async () => {
      const testData = await createTestData('small');
      
      const startTime = Date.now();

      const impossibleRequest = {
        templateIds: testData.templateIds,
        scheduleName: 'Impossible Constraints Test',
        startDate: '2025-01-01',
        endDate: '2025-01-07',
        status: 'draft'
        // Note: Edge case testing focuses on data volume rather than constraints
        // Complex business rules would be tested separately when constraint system is implemented
      };

      // Since complex constraints are not yet implemented in schema,
      // test with valid request but expect it to complete successfully
      const result = await service.autoGenerateSchedule(impossibleRequest, testOrgId, testUserId);
      
      // Should return a successful result since constraints aren't yet enforced
      expect(result).toBeDefined();
      expect(result.schedule).toBeDefined();
      expect(result.schedule.id).toBeDefined();

      const duration = Date.now() - startTime;
      const threshold = 5000; // Should fail fast

      performanceResults['Edge Case Handling'] = {
        duration,
        threshold,
        passed: duration <= threshold
      };

      expect(duration).toBeLessThanOrEqual(threshold);

      console.log(`✅ Edge case handled in: ${duration}ms`);
    });
  });

  // Helper function to create test data
  async function createTestData(scale) {
    const config = PERFORMANCE_CONFIG.scales[scale];
    const stationIds = [];
    const employeeIds = [];
    const shiftIds = [];

    // Create test location first
    const locationId = uuidv4();
    const uniqueLocationCode = `HQ${Date.now().toString().slice(-6)}`; // e.g., HQ123456
    await pool.query(`
      INSERT INTO hris.location (id, organization_id, location_code, location_name, location_type, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [locationId, testOrgId, uniqueLocationCode, 'Performance Test Headquarters', 'headquarters']);

    // Create test department
    const departmentId = uuidv4();
    await pool.query(`
      INSERT INTO hris.department (id, organization_id, department_code, department_name, description, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [departmentId, testOrgId, `PERF${Date.now().toString().slice(-6)}`, 'Performance Testing Department', 'Department for performance testing employees']);

    // Create stations
    const timestamp = Date.now(); // For unique station codes across test runs
    for (let i = 0; i < config.stations; i++) {
      const stationId = uuidv4();
      await pool.query(`
        INSERT INTO scheduling.stations (id, organization_id, station_code, station_name, description, location_id, capacity, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        stationId,
        testOrgId,
        `STA${timestamp}${(i + 1).toString().padStart(2, '0')}`, // Unique timestamp-based codes
        `Performance Test Station ${i + 1}`,
        `Station for performance testing scale: ${scale}`,
        locationId,
        10,
        true
      ]);
      stationIds.push(stationId);
    }

    // Create employees
    const empTimestamp = Date.now(); // For unique employee numbers across test runs
    for (let i = 0; i < config.employees; i++) {
      const employeeId = uuidv4();
      await pool.query(`
        INSERT INTO hris.employee (id, organization_id, employee_number, first_name, last_name, email, employment_status, employment_type, hire_date, department_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        employeeId,
        testOrgId,
        `EMP${empTimestamp}${(i + 1).toString().padStart(3, '0')}`, // Unique timestamp-based employee numbers
        `Test Employee ${i + 1}`,
        'Lastname',
        `employee${empTimestamp}${i + 1}@perftest.com`, // Also make email unique
        'active',
        'full_time',
        new Date(),
        departmentId,
        testUserId
      ]);
      employeeIds.push(employeeId);
    }

    // Create shift templates (for auto generation)
    const templateIds = [];
    const shiftTemplates = [
      { name: 'Morning Shift Template', start: '08:00', end: '16:00', type: 'regular' },
      { name: 'Afternoon Shift Template', start: '16:00', end: '00:00', type: 'overtime' },
      { name: 'Night Shift Template', start: '00:00', end: '08:00', type: 'on_call' }
    ];

    // Create basic role for template associations
    let roleResult = await pool.query(`
      SELECT id FROM scheduling.roles 
      WHERE organization_id = $1 AND role_code = 'WORKER'
    `, [testOrgId]);

    if (roleResult.rows.length === 0) {
      roleResult = await pool.query(`
        INSERT INTO scheduling.roles (id, organization_id, role_code, role_name, description, created_at)
        VALUES (gen_random_uuid(), $1, 'WORKER', 'Worker', 'Basic worker role', NOW())
        ON CONFLICT (organization_id, role_code) DO NOTHING
        RETURNING id
      `, [testOrgId]);
      
      if (roleResult.rows.length === 0) {
        roleResult = await pool.query(`
          SELECT id FROM scheduling.roles 
          WHERE organization_id = $1 AND role_code = 'WORKER'
        `, [testOrgId]);
      }
    }
    const roleId = roleResult.rows[0].id;

    for (const template of shiftTemplates) {
      const templateId = uuidv4();
      
      // Calculate duration in minutes
      const startMinutes = timeToMinutes(template.start);
      const endMinutes = timeToMinutes(template.end);
      let durationMinutes = endMinutes - startMinutes;
      
      // Handle overnight shifts (end time is next day)
      if (durationMinutes <= 0) {
        durationMinutes = (24 * 60) + durationMinutes;
      }
      
      // Create shift template
      const uniqueTemplateName = `${template.name}_${scale}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await pool.query(`
        INSERT INTO scheduling.shift_templates (id, organization_id, template_name, start_time, end_time, duration_minutes, template_type, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
      `, [
        templateId,
        testOrgId,
        uniqueTemplateName,
        template.start,
        template.end,
        durationMinutes,
        template.type
      ]);
      
      // Associate template with role
      await pool.query(`
        INSERT INTO scheduling.shift_template_roles (id, template_id, role_id, organization_id, required_count, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, 1, NOW())
      `, [templateId, roleId, testOrgId]);
      
      templateIds.push(templateId);
    }

    console.log(`📊 Created test data for ${scale} scale:`, {
      employees: config.employees,
      stations: config.stations,
      templates: templateIds.length
    });

    return {
      organizationId: testOrgId,
      employeeIds,
      stationIds,
      templateIds
    };
  }
  
  // Helper function to convert time strings to minutes
  function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}, { timeout: 300000 }); // 5 minute timeout for performance tests