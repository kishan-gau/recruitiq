/**
 * ComplianceService Test Suite
 * 
 * Tests for PayLinQ compliance service following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Dependency injection pattern
 * - Comprehensive service method coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ComplianceService from '../../../../src/products/paylinq/services/complianceService.js';

describe('ComplianceService', () => {
  let service: any;
  let mockComplianceRepository: any;
  let mockPayrollRepository: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testRuleId = '323e4567-e89b-12d3-a456-426614174002';
  const testViolationId = '423e4567-e89b-12d3-a456-426614174003';
  const testEmployeeId = '523e4567-e89b-12d3-a456-426614174004';

  beforeEach(() => {
    // Create comprehensive mock repositories
    mockComplianceRepository = {
      createComplianceRule: jest.fn(),
      updateComplianceRule: jest.fn(),
      findComplianceRulesByType: jest.fn(),
      findById: jest.fn(),
      createComplianceViolation: jest.fn(),
      createComplianceCheck: jest.fn(),
      findComplianceViolations: jest.fn(),
      updateComplianceViolation: jest.fn(),
      getOpenViolationCount: jest.fn(),
      findComplianceChecks: jest.fn(),
      createAuditLog: jest.fn(),
      findAuditLogs: jest.fn()
    };

    mockPayrollRepository = {
      findByOrganization: jest.fn(),
      findCurrentCompensation: jest.fn(),
      findTimesheets: jest.fn()
    };

    // Inject mock repositories using DI pattern
    service = new ComplianceService(mockComplianceRepository, mockPayrollRepository);
  });

  describe('createComplianceRule', () => {
    it('should create compliance rule with valid data', async () => {
      const ruleData = {
        ruleName: 'Minimum Wage Rule',
        ruleType: 'wage_law',
        description: 'Enforce minimum wage compliance',
        isActive: true,
        effectiveDate: new Date('2025-01-01')
      };

      const mockCreatedRule = {
        id: testRuleId,
        ...ruleData
      };

      mockComplianceRepository.createComplianceRule.mockResolvedValue(mockCreatedRule);

      const result = await service.createComplianceRule(ruleData, testOrganizationId, testUserId);

      expect(result).toBeDefined();
      expect(mockComplianceRepository.createComplianceRule).toHaveBeenCalledWith(
        ruleData,
        testOrganizationId,
        testUserId
      );
    });

    it('should throw error for missing required fields', async () => {
      const invalidData = {
        ruleName: 'Test Rule'
        // Missing other required fields
      };

      await expect(service.createComplianceRule(invalidData, testOrganizationId, testUserId))
        .rejects.toThrow('Missing required fields for compliance rule');
    });

    it('should throw error for invalid rule type', async () => {
      const ruleData = {
        ruleName: 'Invalid Rule',
        ruleType: 'invalid_type',
        description: 'Test',
        isActive: true,
        effectiveDate: new Date('2025-01-01')
      };

      await expect(service.createComplianceRule(ruleData, testOrganizationId, testUserId))
        .rejects.toThrow('Invalid rule type: invalid_type');
    });

    it('should accept all valid rule types', async () => {
      const validRuleTypes = ['wage_law', 'overtime_law', 'tax_law', 'benefits_law', 'deduction_law'];

      for (const ruleType of validRuleTypes) {
        const ruleData = {
          ruleName: `${ruleType} Rule`,
          ruleType,
          description: 'Test rule',
          isActive: true,
          effectiveDate: new Date('2025-01-01')
        };

        mockComplianceRepository.createComplianceRule.mockResolvedValue({ id: testRuleId, ...ruleData });

        await service.createComplianceRule(ruleData, testOrganizationId, testUserId);

        expect(mockComplianceRepository.createComplianceRule).toHaveBeenCalledWith(
          expect.objectContaining({ ruleType }),
          testOrganizationId,
          testUserId
        );
      }
    });
  });

  describe('updateComplianceRule', () => {
    it('should update compliance rule', async () => {
      const updates = {
        isActive: false,
        description: 'Updated description'
      };

      const mockUpdatedRule = {
        id: testRuleId,
        ...updates
      };

      mockComplianceRepository.updateComplianceRule.mockResolvedValue(mockUpdatedRule);

      const result = await service.updateComplianceRule(testRuleId, updates, testOrganizationId, testUserId);

      expect(result).toBeDefined();
      expect(mockComplianceRepository.updateComplianceRule).toHaveBeenCalledWith(
        testRuleId,
        updates,
        testOrganizationId,
        testUserId
      );
    });
  });

  describe('getComplianceRules', () => {
    it('should retrieve all compliance rules', async () => {
      const mockRules = [
        { id: '1', rule_type: 'wage_law' },
        { id: '2', rule_type: 'overtime_law' }
      ];

      mockComplianceRepository.findComplianceRulesByType.mockResolvedValue(mockRules);

      const result = await service.getComplianceRules(testOrganizationId);

      expect(result).toBeDefined();
      expect(mockComplianceRepository.findComplianceRulesByType).toHaveBeenCalledWith(testOrganizationId, {});
    });

    it('should retrieve compliance rules with filters', async () => {
      const filters = { is_active: true };
      const mockRules = [{ id: '1', rule_type: 'wage_law' }];

      mockComplianceRepository.findComplianceRulesByType.mockResolvedValue(mockRules);

      const result = await service.getComplianceRules(testOrganizationId, filters);

      expect(mockComplianceRepository.findComplianceRulesByType).toHaveBeenCalledWith(testOrganizationId, filters);
    });
  });

  describe('runComplianceCheck', () => {
    it('should run wage law compliance check', async () => {
      const mockRule = {
        id: testRuleId,
        rule_type: 'wage_law',
        threshold: 15.00
      };

      const mockEmployees = [
        { employee_id: testEmployeeId }
      ];

      const mockCompensation = {
        pay_period: 'hour',
        pay_rate: 12.00
      };

      mockComplianceRepository.findById.mockResolvedValue(mockRule);
      mockPayrollRepository.findByOrganization.mockResolvedValue(mockEmployees);
      mockPayrollRepository.findCurrentCompensation.mockResolvedValue(mockCompensation);
      mockComplianceRepository.createComplianceViolation.mockResolvedValue({});
      mockComplianceRepository.createComplianceCheck.mockResolvedValue({});

      const result = await service.runComplianceCheck(testRuleId, testOrganizationId, testUserId);

      expect(result).toBeDefined();
      expect(result.checkStatus).toBe('failed');
      expect(result.violationsFound).toBe(1);
      expect(result.recordsChecked).toBe(1);
    });

    it('should run overtime law compliance check', async () => {
      const mockRule = {
        id: testRuleId,
        rule_type: 'overtime_law',
        threshold: 40
      };

      const mockEmployees = [
        { employee_id: testEmployeeId }
      ];

      const mockTimesheets = [
        { total_hours: 45, overtime_hours: 0 }
      ];

      mockComplianceRepository.findById.mockResolvedValue(mockRule);
      mockPayrollRepository.findByOrganization.mockResolvedValue(mockEmployees);
      mockPayrollRepository.findTimesheets.mockResolvedValue(mockTimesheets);
      mockComplianceRepository.createComplianceViolation.mockResolvedValue({});
      mockComplianceRepository.createComplianceCheck.mockResolvedValue({});

      const result = await service.runComplianceCheck(testRuleId, testOrganizationId, testUserId);

      expect(result).toBeDefined();
      expect(result.checkStatus).toBe('failed');
      expect(result.violationsFound).toBe(1);
    });

    it('should throw error for non-existent rule', async () => {
      mockComplianceRepository.findById.mockResolvedValue(null);

      await expect(service.runComplianceCheck(testRuleId, testOrganizationId, testUserId))
        .rejects.toThrow(`Compliance rule not found: ${testRuleId}`);
    });

    it('should pass check when no violations found', async () => {
      const mockRule = {
        id: testRuleId,
        rule_type: 'wage_law',
        threshold: 10.00
      };

      const mockEmployees = [];

      mockComplianceRepository.findById.mockResolvedValue(mockRule);
      mockPayrollRepository.findByOrganization.mockResolvedValue(mockEmployees);
      mockComplianceRepository.createComplianceCheck.mockResolvedValue({});

      const result = await service.runComplianceCheck(testRuleId, testOrganizationId, testUserId);

      expect(result.checkStatus).toBe('passed');
      expect(result.violationsFound).toBe(0);
    });
  });

  describe('runAllComplianceChecks', () => {
    it('should run all active compliance checks', async () => {
      const mockRules = [
        { id: '1', is_active: true, rule_type: 'wage_law', threshold: 15 },
        { id: '2', is_active: true, rule_type: 'overtime_law', threshold: 40 }
      ];

      mockComplianceRepository.findComplianceRulesByType.mockResolvedValue(mockRules);
      mockComplianceRepository.findById.mockResolvedValue(mockRules[0]);
      mockPayrollRepository.findByOrganization.mockResolvedValue([]);
      mockComplianceRepository.createComplianceCheck.mockResolvedValue({});

      const result = await service.runAllComplianceChecks(testOrganizationId, testUserId);

      expect(result).toBeDefined();
      expect(result.totalChecks).toBe(2);
      expect(result.checks.length).toBe(2);
    });
  });

  describe('getComplianceViolations', () => {
    it('should retrieve compliance violations', async () => {
      const mockViolations = [
        { id: '1', severity: 'high' },
        { id: '2', severity: 'medium' }
      ];

      mockComplianceRepository.findComplianceViolations.mockResolvedValue(mockViolations);

      const result = await service.getComplianceViolations(testOrganizationId);

      expect(result).toBeDefined();
      expect(mockComplianceRepository.findComplianceViolations).toHaveBeenCalledWith(testOrganizationId, {});
    });
  });

  describe('resolveViolation', () => {
    it('should resolve violation with notes', async () => {
      const resolutionNotes = 'Issue resolved by updating pay rate';
      const mockResolvedViolation = {
        id: testViolationId,
        status: 'resolved',
        resolution_notes: resolutionNotes
      };

      mockComplianceRepository.updateComplianceViolation.mockResolvedValue(mockResolvedViolation);

      const result = await service.resolveViolation(testViolationId, resolutionNotes, testOrganizationId, testUserId);

      expect(result).toBeDefined();
      expect(mockComplianceRepository.updateComplianceViolation).toHaveBeenCalledWith(
        testViolationId,
        expect.objectContaining({ status: 'resolved' }),
        testOrganizationId,
        testUserId
      );
    });

    it('should throw error for empty resolution notes', async () => {
      await expect(service.resolveViolation(testViolationId, '', testOrganizationId, testUserId))
        .rejects.toThrow('Resolution notes are required');
    });
  });

  describe('escalateViolation', () => {
    it('should escalate violation severity', async () => {
      const mockEscalatedViolation = {
        id: testViolationId,
        severity: 'critical'
      };

      mockComplianceRepository.updateComplianceViolation.mockResolvedValue(mockEscalatedViolation);

      const result = await service.escalateViolation(testViolationId, 'critical', testOrganizationId, testUserId);

      expect(result).toBeDefined();
      expect(mockComplianceRepository.updateComplianceViolation).toHaveBeenCalledWith(
        testViolationId,
        expect.objectContaining({ severity: 'critical' }),
        testOrganizationId,
        testUserId
      );
    });

    it('should throw error for invalid severity', async () => {
      await expect(service.escalateViolation(testViolationId, 'invalid', testOrganizationId, testUserId))
        .rejects.toThrow('Invalid severity level: invalid');
    });
  });

  describe('getComplianceDashboard', () => {
    it('should retrieve compliance dashboard summary', async () => {
      const mockViolations = [
        { severity: 'high' },
        { severity: 'medium' }
      ];

      mockComplianceRepository.getOpenViolationCount.mockResolvedValue(5);
      mockComplianceRepository.findComplianceViolations.mockResolvedValue(mockViolations);
      mockComplianceRepository.findComplianceChecks.mockResolvedValue([]);

      const result = await service.getComplianceDashboard(testOrganizationId);

      expect(result).toBeDefined();
      expect(result.openViolations).toBe(5);
      expect(result.highSeverityCount).toBe(1);
    });
  });

  describe('getComplianceReport', () => {
    it('should generate compliance report for period', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockChecks = [
        { check_status: 'passed' },
        { check_status: 'passed' },
        { check_status: 'failed' }
      ];

      const mockViolations = [
        { id: '1' }
      ];

      mockComplianceRepository.findComplianceChecks.mockResolvedValue(mockChecks);
      mockComplianceRepository.findComplianceViolations.mockResolvedValue(mockViolations);

      const result = await service.getComplianceReport(startDate, endDate, testOrganizationId);

      expect(result).toBeDefined();
      expect(result.totalChecks).toBe(3);
      expect(result.totalViolations).toBe(1);
      expect(result.complianceRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('createAuditLog', () => {
    it('should create audit log entry', async () => {
      const auditData = {
        entityType: 'payroll_run',
        entityId: testRuleId,
        action: 'create'
      };

      const mockAuditLog = {
        id: '1',
        ...auditData
      };

      mockComplianceRepository.createAuditLog.mockResolvedValue(mockAuditLog);

      const result = await service.createAuditLog(auditData, testOrganizationId);

      expect(result).toBeDefined();
      expect(mockComplianceRepository.createAuditLog).toHaveBeenCalledWith(auditData, testOrganizationId);
    });

    it('should throw error for invalid entity type', async () => {
      const auditData = {
        entityType: 'invalid_type',
        entityId: testRuleId
      };

      await expect(service.createAuditLog(auditData, testOrganizationId))
        .rejects.toThrow('Invalid entity type: invalid_type');
    });
  });

  describe('getAuditTrail', () => {
    it('should retrieve audit trail for entity', async () => {
      const mockAuditLogs = [
        { id: '1', action: 'create' },
        { id: '2', action: 'update' }
      ];

      mockComplianceRepository.findAuditLogs.mockResolvedValue(mockAuditLogs);

      const result = await service.getAuditTrail('payroll_run', testRuleId, testOrganizationId);

      expect(result).toBeDefined();
      expect(mockComplianceRepository.findAuditLogs).toHaveBeenCalledWith(
        'payroll_run',
        testRuleId,
        testOrganizationId,
        {}
      );
    });
  });

  describe('validateMinimumWage', () => {
    it('should return true for wage above minimum', () => {
      const result = service.validateMinimumWage(15.00, 12.00);
      expect(result).toBe(true);
    });

    it('should return false for wage below minimum', () => {
      const result = service.validateMinimumWage(10.00, 12.00);
      expect(result).toBe(false);
    });

    it('should return true for wage equal to minimum', () => {
      const result = service.validateMinimumWage(12.00, 12.00);
      expect(result).toBe(true);
    });
  });

  describe('validateOvertimeCompliance', () => {
    it('should return true when overtime hours not recorded', () => {
      const result = service.validateOvertimeCompliance(45, 0, 40);
      expect(result).toBe(true);
    });

    it('should return false when overtime properly recorded', () => {
      const result = service.validateOvertimeCompliance(45, 5, 40);
      expect(result).toBe(false);
    });

    it('should return false for total hours under threshold', () => {
      const result = service.validateOvertimeCompliance(35, 0, 40);
      expect(result).toBe(false);
    });
  });

  describe('checkMinimumWage', () => {
    it('should check against federal minimum wage', () => {
      const result = service.checkMinimumWage(8.00, 'federal');
      expect(result).toBe(true);
    });

    it('should check against California minimum wage', () => {
      const result = service.checkMinimumWage(17.00, 'california');
      expect(result).toBe(true);
    });

    it('should default to federal for unknown jurisdiction', () => {
      const result = service.checkMinimumWage(8.00, 'unknown');
      expect(result).toBe(true);
    });
  });

  describe('validatePayrollCompliance', () => {
    it('should validate payroll compliance', async () => {
      const result = await service.validatePayrollCompliance('payroll-123', testOrganizationId);

      expect(result).toBeDefined();
      expect(result.isCompliant).toBe(true);
      expect(result.issues).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('generateComplianceReport (legacy)', () => {
    it('should generate compliance report for backward compatibility', async () => {
      const period = { start: '2025-01-01', end: '2025-01-31' };
      const result = await service.generateComplianceReport(testOrganizationId, period);

      expect(result).toBeDefined();
      expect(result.period).toEqual(period);
      expect(result.complianceScore).toBe(100);
      expect(result.issues).toEqual([]);
      expect(result.recommendations).toEqual([]);
    });
  });
});
