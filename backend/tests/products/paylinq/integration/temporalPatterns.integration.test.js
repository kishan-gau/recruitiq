/**
 * Temporal Pattern Integration Tests
 * 
 * End-to-end tests for temporal pattern evaluation including:
 * - Database integration
 * - Pay structure calculation with patterns
 * - API endpoint testing
 */

import request from 'supertest';
import app from '../../../src/app.js';
import { query } from '../../../src/config/database.js';
import temporalPatternService from '../../../src/products/paylinq/services/temporalPatternService.js';

describe('Temporal Pattern Integration Tests', () => {
  let testOrganizationId;
  let testEmployeeId;
  let authToken;

  beforeAll(async () => {
    // Setup test data
    testOrganizationId = 'test-org-integration-001';
    testEmployeeId = 'test-emp-integration-001';
    
    // Create test organization
    await query(
      `INSERT INTO core.organizations (id, name, slug, status)
       VALUES ($1, 'Test Org', 'test-org', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [testOrganizationId]
    );

    // Create test employee
    await query(
      `INSERT INTO hris.employee (id, organization_id, employee_number, first_name, last_name, email, status)
       VALUES ($1, $2, 'EMP001', 'John', 'Doe', 'john.doe@test.com', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [testEmployeeId, testOrganizationId]
    );
  });

  afterAll(async () => {
    // Cleanup test data
    await query('DELETE FROM payroll.time_entry WHERE organization_id = $1', [testOrganizationId]);
    await query('DELETE FROM hris.employee WHERE id = $1', [testEmployeeId]);
    await query('DELETE FROM core.organizations WHERE id = $1', [testOrganizationId]);
  });

  describe('Day of Week Pattern with Real Data', () => {
    beforeEach(async () => {
      // Clean time entries
      await query('DELETE FROM payroll.time_entry WHERE organization_id = $1', [testOrganizationId]);
    });

    test('should evaluate pattern with database time entries', async () => {
      // Create 3 consecutive Sunday entries
      const sundays = ['2024-01-07', '2024-01-14', '2024-01-21'];
      
      for (const date of sundays) {
        await query(
          `INSERT INTO payroll.time_entry 
           (organization_id, employee_id, entry_date, worked_hours, status, created_by)
           VALUES ($1, $2, $3, 8, 'approved', 'system')`,
          [testOrganizationId, testEmployeeId, date]
        );
      }

      const pattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'sunday',
        consecutiveCount: 3,
        lookbackPeriodDays: 90,
      };

      const result = await temporalPatternService.evaluatePattern(
        testEmployeeId,
        pattern,
        testOrganizationId,
        new Date('2024-01-28')
      );

      expect(result.qualified).toBe(true);
      expect(result.metadata.actualMaxConsecutive).toBe(3);
      expect(result.metadata.totalMatchingDays).toBe(3);
    });

    test('should not qualify with broken consecutive run', async () => {
      // Create 2 Sundays, skip one, then 1 more
      const dates = ['2024-01-07', '2024-01-14', '2024-01-28'];
      
      for (const date of dates) {
        await query(
          `INSERT INTO payroll.time_entry 
           (organization_id, employee_id, entry_date, worked_hours, status, created_by)
           VALUES ($1, $2, $3, 8, 'approved', 'system')`,
          [testOrganizationId, testEmployeeId, date]
        );
      }

      const pattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'sunday',
        consecutiveCount: 3,
        lookbackPeriodDays: 90,
      };

      const result = await temporalPatternService.evaluatePattern(
        testEmployeeId,
        pattern,
        testOrganizationId,
        new Date('2024-02-04')
      );

      expect(result.qualified).toBe(false);
      expect(result.metadata.actualMaxConsecutive).toBe(2);
    });

    test('should only count approved time entries', async () => {
      // Create 3 Sundays, but only 2 approved
      await query(
        `INSERT INTO payroll.time_entry 
         (organization_id, employee_id, entry_date, worked_hours, status, created_by)
         VALUES 
         ($1, $2, '2024-01-07', 8, 'approved', 'system'),
         ($1, $2, '2024-01-14', 8, 'approved', 'system'),
         ($1, $2, '2024-01-21', 8, 'draft', 'system')`,
        [testOrganizationId, testEmployeeId]
      );

      const pattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'sunday',
        consecutiveCount: 3,
        lookbackPeriodDays: 90,
      };

      const result = await temporalPatternService.evaluatePattern(
        testEmployeeId,
        pattern,
        testOrganizationId,
        new Date('2024-01-28')
      );

      expect(result.qualified).toBe(false);
      expect(result.metadata.actualMaxConsecutive).toBe(2);
    });
  });

  describe('Hours Threshold Pattern with Real Data', () => {
    beforeEach(async () => {
      await query('DELETE FROM payroll.time_entry WHERE organization_id = $1', [testOrganizationId]);
    });

    test('should evaluate hours threshold pattern', async () => {
      // Create 7 consecutive days with >40 total hours
      const entries = [
        { date: '2024-01-01', hours: 6 },
        { date: '2024-01-02', hours: 7 },
        { date: '2024-01-03', hours: 8 },
        { date: '2024-01-04', hours: 8 },
        { date: '2024-01-05', hours: 6 },
        { date: '2024-01-06', hours: 4 },
        { date: '2024-01-07', hours: 3 }, // Total: 42 hours
      ];

      for (const entry of entries) {
        await query(
          `INSERT INTO payroll.time_entry 
           (organization_id, employee_id, entry_date, worked_hours, status, created_by)
           VALUES ($1, $2, $3, $4, 'approved', 'system')`,
          [testOrganizationId, testEmployeeId, entry.date, entry.hours]
        );
      }

      const pattern = {
        patternType: 'hours_threshold',
        hoursThreshold: 40,
        comparisonOperator: 'greater_than',
        consecutiveCount: 7,
        lookbackPeriodDays: 30,
      };

      const result = await temporalPatternService.evaluatePattern(
        testEmployeeId,
        pattern,
        testOrganizationId,
        new Date('2024-01-15')
      );

      expect(result.qualified).toBe(true);
      expect(result.metadata.qualifyingPeriods).toHaveLength(1);
      expect(result.metadata.qualifyingPeriods[0].totalHours).toBeGreaterThan(40);
    });
  });

  describe('Pattern Test with Multiple Workers', () => {
    let testEmployee2Id;

    beforeAll(async () => {
      testEmployee2Id = 'test-emp-integration-002';
      await query(
        `INSERT INTO hris.employee (id, organization_id, employee_number, first_name, last_name, email, status)
         VALUES ($1, $2, 'EMP002', 'Jane', 'Smith', 'jane.smith@test.com', 'active')
         ON CONFLICT (id) DO NOTHING`,
        [testEmployee2Id, testOrganizationId]
      );
    });

    afterAll(async () => {
      await query('DELETE FROM hris.employee WHERE id = $1', [testEmployee2Id]);
    });

    beforeEach(async () => {
      await query('DELETE FROM payroll.time_entry WHERE organization_id = $1', [testOrganizationId]);
    });

    test('should test pattern against multiple workers', async () => {
      // Employee 1: Qualified (3 Sundays)
      await query(
        `INSERT INTO payroll.time_entry 
         (organization_id, employee_id, entry_date, worked_hours, status, created_by)
         VALUES 
         ($1, $2, '2024-01-07', 8, 'approved', 'system'),
         ($1, $2, '2024-01-14', 8, 'approved', 'system'),
         ($1, $2, '2024-01-21', 8, 'approved', 'system')`,
        [testOrganizationId, testEmployeeId]
      );

      // Employee 2: Not qualified (only 2 Sundays)
      await query(
        `INSERT INTO payroll.time_entry 
         (organization_id, employee_id, entry_date, worked_hours, status, created_by)
         VALUES 
         ($1, $2, '2024-01-07', 8, 'approved', 'system'),
         ($1, $2, '2024-01-14', 8, 'approved', 'system')`,
        [testOrganizationId, testEmployee2Id]
      );

      const pattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'sunday',
        consecutiveCount: 3,
        lookbackPeriodDays: 90,
      };

      const result = await temporalPatternService.testPattern(
        pattern,
        [testEmployeeId, testEmployee2Id],
        testOrganizationId,
        new Date('2024-01-28')
      );

      expect(result.totalTested).toBe(2);
      expect(result.qualifiedCount).toBe(1);
      expect(result.notQualifiedCount).toBe(1);
      expect(result.qualifiedWorkers[0].employeeId).toBe(testEmployeeId);
      expect(result.notQualifiedWorkers[0].employeeId).toBe(testEmployee2Id);
    });
  });

  describe('Performance with Large Dataset', () => {
    test('should handle large number of time entries efficiently', async () => {
      // Clear existing entries
      await query('DELETE FROM payroll.time_entry WHERE organization_id = $1', [testOrganizationId]);

      // Create 100 time entries
      const entries = [];
      for (let i = 0; i < 100; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + i);
        entries.push(`('${testOrganizationId}', '${testEmployeeId}', '${date.toISOString().split('T')[0]}', 8, 'approved', 'system')`);
      }

      await query(
        `INSERT INTO payroll.time_entry 
         (organization_id, employee_id, entry_date, worked_hours, status, created_by)
         VALUES ${entries.join(', ')}`
      );

      const pattern = {
        patternType: 'day_of_week',
        dayOfWeek: 'sunday',
        consecutiveCount: 5,
        lookbackPeriodDays: 365,
      };

      const startTime = Date.now();
      const result = await temporalPatternService.evaluatePattern(
        testEmployeeId,
        pattern,
        testOrganizationId,
        new Date('2024-04-15')
      );
      const executionTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(100); // Should complete in <100ms
      expect(result.executionTime).toBeLessThan(100);
    });
  });
});
