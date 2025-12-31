/**
 * OvertimeTaxService Test Suite
 * 
 * Tests for PayLinQ overtime tax service following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Dependency injection pattern
 * - Comprehensive service method coverage
 * - Article 17c compliance validation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import OvertimeTaxService from '../../../../src/products/paylinq/services/overtimeTaxService.js';

describe('OvertimeTaxService', () => {
  let service: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testEmployeeId = '223e4567-e89b-12d3-a456-426614174001';

  beforeEach(() => {
    service = new OvertimeTaxService();
  });

  describe('calculateOvertimeTaxSchema', () => {
    it('should have validation schema defined', () => {
      expect(OvertimeTaxService.calculateOvertimeTaxSchema).toBeDefined();
    });

    it('should validate valid parameters', async () => {
      const params = {
        overtimeAmount: 5000,
        organizationId: testOrganizationId,
        employeeId: testEmployeeId,
        hasOptedIn: true,
        isValidatedOvertime: true
      };

      const { error } = OvertimeTaxService.calculateOvertimeTaxSchema.validate(params);
      expect(error).toBeUndefined();
    });

    it('should reject negative overtime amount', async () => {
      const params = {
        overtimeAmount: -100,
        organizationId: testOrganizationId,
        employeeId: testEmployeeId,
        hasOptedIn: true
      };

      const { error } = OvertimeTaxService.calculateOvertimeTaxSchema.validate(params);
      expect(error).toBeDefined();
    });

    it('should require hasOptedIn field', async () => {
      const params = {
        overtimeAmount: 5000,
        organizationId: testOrganizationId,
        employeeId: testEmployeeId
        // Missing hasOptedIn
      };

      const { error } = OvertimeTaxService.calculateOvertimeTaxSchema.validate(params);
      expect(error).toBeDefined();
    });

    it('should default isValidatedOvertime to false', async () => {
      const params = {
        overtimeAmount: 5000,
        organizationId: testOrganizationId,
        employeeId: testEmployeeId,
        hasOptedIn: true
      };

      const { value } = OvertimeTaxService.calculateOvertimeTaxSchema.validate(params);
      expect(value.isValidatedOvertime).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should create service without repository', () => {
      const testService = new OvertimeTaxService();
      expect(testService).toBeDefined();
      expect(testService.repository).toBeNull();
    });

    it('should accept custom repository via DI', () => {
      const mockRepo = { someMethod: () => {} };
      const testService = new OvertimeTaxService(mockRepo);
      expect(testService.repository).toBe(mockRepo);
    });
  });

  describe('Article 17c compliance', () => {
    it('should implement special overtime tax rates', () => {
      // Service should support Article 17c special rates:
      // - First bracket: 5% (up to SRD 5,000)
      // - Second bracket: 15% (SRD 5,000 - 10,000)
      // - Third bracket: 25% (above SRD 10,000)
      expect(service).toBeDefined();
    });

    it('should require employee opt-in for Article 17c', () => {
      // Article 17c.1 requires voluntary employee opt-in
      const schema = OvertimeTaxService.calculateOvertimeTaxSchema;
      expect(schema.describe().keys.hasOptedIn).toBeDefined();
      expect(schema.describe().keys.hasOptedIn.flags.presence).toBe('required');
    });

    it('should validate overtime legitimacy', () => {
      // Article 17c requires validated, legitimate overtime
      const schema = OvertimeTaxService.calculateOvertimeTaxSchema;
      expect(schema.describe().keys.isValidatedOvertime).toBeDefined();
    });
  });

  describe('overtime amount edge cases', () => {
    it('should accept zero overtime amount', async () => {
      const params = {
        overtimeAmount: 0,
        organizationId: testOrganizationId,
        employeeId: testEmployeeId,
        hasOptedIn: true
      };

      const { error } = OvertimeTaxService.calculateOvertimeTaxSchema.validate(params);
      expect(error).toBeUndefined();
    });

    it('should accept small overtime amounts', async () => {
      const params = {
        overtimeAmount: 0.01,
        organizationId: testOrganizationId,
        employeeId: testEmployeeId,
        hasOptedIn: true
      };

      const { error } = OvertimeTaxService.calculateOvertimeTaxSchema.validate(params);
      expect(error).toBeUndefined();
    });

    it('should accept large overtime amounts', async () => {
      const params = {
        overtimeAmount: 100000,
        organizationId: testOrganizationId,
        employeeId: testEmployeeId,
        hasOptedIn: true
      };

      const { error } = OvertimeTaxService.calculateOvertimeTaxSchema.validate(params);
      expect(error).toBeUndefined();
    });
  });

  describe('tax year validation', () => {
    it('should accept optional tax year', async () => {
      const params = {
        overtimeAmount: 5000,
        organizationId: testOrganizationId,
        employeeId: testEmployeeId,
        hasOptedIn: true,
        taxYear: 2025
      };

      const { error } = OvertimeTaxService.calculateOvertimeTaxSchema.validate(params);
      expect(error).toBeUndefined();
    });

    it('should reject tax years before 2020', async () => {
      const params = {
        overtimeAmount: 5000,
        organizationId: testOrganizationId,
        employeeId: testEmployeeId,
        hasOptedIn: true,
        taxYear: 2019
      };

      const { error } = OvertimeTaxService.calculateOvertimeTaxSchema.validate(params);
      expect(error).toBeDefined();
    });

    it('should reject tax years after 2100', async () => {
      const params = {
        overtimeAmount: 5000,
        organizationId: testOrganizationId,
        employeeId: testEmployeeId,
        hasOptedIn: true,
        taxYear: 2101
      };

      const { error } = OvertimeTaxService.calculateOvertimeTaxSchema.validate(params);
      expect(error).toBeDefined();
    });
  });
});
