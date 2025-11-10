/**
 * Compliance Service Tests
 * 
 * Unit tests for ComplianceService business logic.
 */

import ComplianceService from '../../../../src/products/paylinq/services/complianceService.js';
import ComplianceRepository from '../../../../src/products/paylinq/repositories/complianceRepository.js';
import PayrollRepository from '../../../../src/products/paylinq/repositories/payrollRepository.js';

// Mock dependencies

describe('ComplianceService', () => {
  let service;
  let mockComplianceRepository;
  let mockPayrollRepository;

  beforeEach(() => {
    service = new ComplianceService();
    mockComplianceRepository = ComplianceRepository.mock.instances[0];
    mockPayrollRepository = PayrollRepository.mock.instances[0];
    jest.clearAllMocks();
  });

  describe('Compliance Rule Management', () => {
    describe('createComplianceRule', () => {
      test('should create compliance rule with valid data', async () => {
        const ruleData = {
          ruleName: 'Minimum Wage Compliance',
          ruleType: 'wage_law',
          description: 'Ensure minimum wage requirements',
          threshold: 15.0,
          isActive: true,
          effectiveDate: '2024-01-01'
        };

        mockComplianceRepository.createComplianceRule = jest.fn().mockResolvedValue({
          id: 'rule-123',
          ...ruleData
        });

        const result = await service.createComplianceRule(
          ruleData,
          'org-789',
          'user-123'
        );

        expect(result).toBeDefined();
        expect(result.rule_name).toBe('Minimum Wage Compliance');
      });

      test('should validate required fields', async () => {
        const invalidData = {
          ruleName: 'Test Rule'
          // Missing required fields
        };

        await expect(
          service.createComplianceRule(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });

      test('should validate rule type enum', async () => {
        const invalidData = {
          ruleName: 'Test Rule',
          ruleType: 'invalid_type',
          description: 'Test',
          isActive: true,
          effectiveDate: '2024-01-01'
        };

        await expect(
          service.createComplianceRule(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });
    });

    describe('updateComplianceRule', () => {
      test('should update compliance rule', async () => {
        const updates = {
          isActive: false,
          description: 'Updated description'
        };

        mockComplianceRepository.updateComplianceRule = jest.fn().mockResolvedValue({
          id: 'rule-123',
          ...updates
        });

        const result = await service.updateComplianceRule(
          'rule-123',
          updates,
          'org-789',
          'user-123'
        );

        expect(result.is_active).toBe(false);
      });
    });

    describe('getComplianceRules', () => {
      test('should retrieve all compliance rules', async () => {
        const mockRules = [
          { id: 'rule-1', rule_type: 'wage_law' },
          { id: 'rule-2', rule_type: 'overtime_law' }
        ];

        mockComplianceRepository.findComplianceRulesByType = jest.fn().mockResolvedValue(mockRules);

        const result = await service.getComplianceRules('org-789');

        expect(result).toEqual(mockRules);
      });
    });
  });

  describe('Compliance Checking', () => {
    describe('runComplianceCheck', () => {
      test('should run minimum wage compliance check', async () => {
        const mockRule = {
          id: 'rule-123',
          rule_type: 'wage_law',
          rule_name: 'Minimum Wage',
          threshold: 15.0
        };

        const mockEmployees = [
          { id: 'record-1', employee_id: 'emp-1' },
          { id: 'record-2', employee_id: 'emp-2' }
        ];

        const mockCompensation1 = { pay_rate: 20.0, pay_period: 'hour' }; // Compliant
        const mockCompensation2 = { pay_rate: 12.0, pay_period: 'hour' }; // Violation

        mockComplianceRepository.findById = jest.fn().mockResolvedValue(mockRule);
        mockPayrollRepository.findByOrganization = jest.fn().mockResolvedValue(mockEmployees);
        mockPayrollRepository.findCurrentCompensation = jest.fn()
          .mockResolvedValueOnce(mockCompensation1)
          .mockResolvedValueOnce(mockCompensation2);
        
        mockComplianceRepository.createComplianceCheck = jest.fn().mockResolvedValue({ id: 'check-123' });
        mockComplianceRepository.createComplianceViolation = jest.fn().mockResolvedValue({ id: 'violation-123' });

        const result = await service.runComplianceCheck('rule-123', 'org-789', 'user-123');

        expect(result.checkStatus).toBe('failed');
        expect(result.recordsChecked).toBe(2);
        expect(result.violationsFound).toBe(1);
        expect(mockComplianceRepository.createComplianceViolation).toHaveBeenCalledTimes(1);
      });

      test('should pass check when all employees compliant', async () => {
        const mockRule = {
          id: 'rule-123',
          rule_type: 'wage_law',
          threshold: 15.0
        };

        const mockEmployees = [
          { id: 'record-1', employee_id: 'emp-1' },
          { id: 'record-2', employee_id: 'emp-2' }
        ];

        const mockCompensation = { pay_rate: 20.0, pay_period: 'hour' };

        mockComplianceRepository.findById = jest.fn().mockResolvedValue(mockRule);
        mockPayrollRepository.findByOrganization = jest.fn().mockResolvedValue(mockEmployees);
        mockPayrollRepository.findCurrentCompensation = jest.fn().mockResolvedValue(mockCompensation);
        mockComplianceRepository.createComplianceCheck = jest.fn().mockResolvedValue({ id: 'check-123' });

        const result = await service.runComplianceCheck('rule-123', 'org-789', 'user-123');

        expect(result.checkStatus).toBe('passed');
        expect(result.violationsFound).toBe(0);
      });

      test('should check overtime compliance', async () => {
        const mockRule = {
          id: 'rule-123',
          rule_type: 'overtime_law',
          rule_name: 'Overtime Pay',
          threshold: 40
        };

        const mockEmployees = [{ id: 'record-1', employee_id: 'emp-1' }];
        
        const mockTimesheets = [
          { regular_hours: 45, overtime_hours: 0, total_hours: 45 } // Violation: No OT pay for hours > 40
        ];

        mockComplianceRepository.findById = jest.fn().mockResolvedValue(mockRule);
        mockPayrollRepository.findByOrganization = jest.fn().mockResolvedValue(mockEmployees);
        mockPayrollRepository.findTimesheets = jest.fn().mockResolvedValue(mockTimesheets);
        mockComplianceRepository.createComplianceCheck = jest.fn().mockResolvedValue({ id: 'check-123' });
        mockComplianceRepository.createComplianceViolation = jest.fn().mockResolvedValue({ id: 'violation-123' });

        const result = await service.runComplianceCheck('rule-123', 'org-789', 'user-123');

        expect(result.violationsFound).toBeGreaterThan(0);
      });

      test('should throw error if rule not found', async () => {
        mockComplianceRepository.findById = jest.fn().mockResolvedValue(null);

        await expect(
          service.runComplianceCheck('nonexistent', 'org-789', 'user-123')
        ).rejects.toThrow('not found');
      });
    });

    describe('runAllComplianceChecks', () => {
      test('should run all active compliance rules', async () => {
        const mockRules = [
          { id: 'rule-1', rule_type: 'wage_law', is_active: true },
          { id: 'rule-2', rule_type: 'overtime_law', is_active: true }
        ];

        mockComplianceRepository.findComplianceRulesByType = jest.fn().mockResolvedValue(mockRules);
        mockComplianceRepository.findById = jest.fn()
          .mockResolvedValueOnce(mockRules[0])
          .mockResolvedValueOnce(mockRules[1]);
        
        mockPayrollRepository.findByOrganization = jest.fn().mockResolvedValue([]);
        mockComplianceRepository.createComplianceCheck = jest.fn().mockResolvedValue({ id: 'check-123' });

        const result = await service.runAllComplianceChecks('org-789', 'user-123');

        expect(result.totalChecks).toBe(2);
        expect(result.checks).toHaveLength(2);
      });

      test('should skip inactive rules', async () => {
        const mockRules = [
          { id: 'rule-1', rule_type: 'wage_law', is_active: true },
          { id: 'rule-2', rule_type: 'overtime_law', is_active: false }
        ];

        mockComplianceRepository.findComplianceRulesByType = jest.fn()
          .mockResolvedValue(mockRules.filter(r => r.is_active));

        mockComplianceRepository.findById = jest.fn().mockResolvedValue(mockRules[0]);
        mockPayrollRepository.findByOrganization = jest.fn().mockResolvedValue([]);
        mockComplianceRepository.createComplianceCheck = jest.fn().mockResolvedValue({ id: 'check-123' });

        const result = await service.runAllComplianceChecks('org-789', 'user-123');

        expect(result.totalChecks).toBe(1);
      });
    });
  });

  describe('Violation Management', () => {
    describe('getComplianceViolations', () => {
      test('should retrieve all violations', async () => {
        const mockViolations = [
          { id: 'violation-1', status: 'open', severity: 'high' },
          { id: 'violation-2', status: 'open', severity: 'medium' }
        ];

        mockComplianceRepository.findComplianceViolations = jest.fn().mockResolvedValue(mockViolations);

        const result = await service.getComplianceViolations('org-789');

        expect(result).toEqual(mockViolations);
      });

      test('should filter violations by status', async () => {
        const mockOpenViolations = [
          { id: 'violation-1', status: 'open' }
        ];

        mockComplianceRepository.findComplianceViolations = jest.fn().mockResolvedValue(mockOpenViolations);

        const result = await service.getComplianceViolations('org-789', { status: 'open' });

        expect(result.every(v => v.status === 'open')).toBe(true);
      });

      test('should filter violations by severity', async () => {
        const mockHighSeverity = [
          { id: 'violation-1', severity: 'high' }
        ];

        mockComplianceRepository.findComplianceViolations = jest.fn().mockResolvedValue(mockHighSeverity);

        const result = await service.getComplianceViolations('org-789', { severity: 'high' });

        expect(result.every(v => v.severity === 'high')).toBe(true);
      });
    });

    describe('resolveViolation', () => {
      test('should resolve violation with notes', async () => {
        const resolutionData = {
          status: 'resolved',
          resolutionNotes: 'Corrected wage amount retroactively'
        };

        mockComplianceRepository.updateComplianceViolation = jest.fn().mockResolvedValue({
          id: 'violation-123',
          status: 'resolved',
          resolution_notes: resolutionData.resolutionNotes
        });

        const result = await service.resolveViolation(
          'violation-123',
          resolutionData.resolutionNotes,
          'org-789',
          'user-123'
        );

        expect(result.status).toBe('resolved');
        expect(result.resolution_notes).toBeDefined();
      });

      test('should require resolution notes', async () => {
        await expect(
          service.resolveViolation('violation-123', '', 'org-789', 'user-123')
        ).rejects.toThrow(/resolution notes/i);
      });
    });

    describe('escalateViolation', () => {
      test('should escalate violation severity', async () => {
        mockComplianceRepository.updateComplianceViolation = jest.fn().mockResolvedValue({
          id: 'violation-123',
          severity: 'critical'
        });

        const result = await service.escalateViolation(
          'violation-123',
          'critical',
          'org-789',
          'user-123'
        );

        expect(result.severity).toBe('critical');
      });

      test('should validate severity level', async () => {
        await expect(
          service.escalateViolation('violation-123', 'invalid', 'org-789', 'user-123')
        ).rejects.toThrow();
      });
    });
  });

  describe('Compliance Reporting', () => {
    describe('getComplianceDashboard', () => {
      test('should generate compliance dashboard', async () => {
        mockComplianceRepository.getOpenViolationCount = jest.fn().mockResolvedValue(5);
        mockComplianceRepository.findComplianceViolations = jest.fn().mockResolvedValue([
          { severity: 'high' },
          { severity: 'high' },
          { severity: 'medium' }
        ]);
        mockComplianceRepository.findComplianceChecks = jest.fn().mockResolvedValue([
          { check_status: 'passed' },
          { check_status: 'failed' },
          { check_status: 'failed' }
        ]);

        const result = await service.getComplianceDashboard('org-789');

        expect(result.openViolations).toBe(5);
        expect(result.highSeverityCount).toBe(2);
        expect(result.recentChecks).toBeDefined();
      });
    });

    describe('getComplianceReport', () => {
      test('should generate compliance report for period', async () => {
        const mockChecks = [
          { id: 'check-1', check_status: 'passed', violations_found: 0 },
          { id: 'check-2', check_status: 'failed', violations_found: 2 }
        ];

        const mockViolations = [
          { id: 'violation-1', severity: 'high', status: 'open' },
          { id: 'violation-2', severity: 'medium', status: 'resolved' }
        ];

        mockComplianceRepository.findComplianceChecks = jest.fn().mockResolvedValue(mockChecks);
        mockComplianceRepository.findComplianceViolations = jest.fn().mockResolvedValue(mockViolations);

        const result = await service.getComplianceReport(
          '2024-01-01',
          '2024-01-31',
          'org-789'
        );

        expect(result.period).toBeDefined();
        expect(result.totalChecks).toBe(2);
        expect(result.totalViolations).toBe(2);
        expect(result.complianceRate).toBeDefined();
      });

      test('should calculate compliance rate correctly', async () => {
        const mockChecks = [
          { check_status: 'passed' },
          { check_status: 'passed' },
          { check_status: 'failed' },
          { check_status: 'passed' }
        ];

        mockComplianceRepository.findComplianceChecks = jest.fn().mockResolvedValue(mockChecks);
        mockComplianceRepository.findComplianceViolations = jest.fn().mockResolvedValue([]);

        const result = await service.getComplianceReport(
          '2024-01-01',
          '2024-01-31',
          'org-789'
        );

        // 3 passed out of 4 = 75%
        expect(result.complianceRate).toBeCloseTo(75, 0);
      });
    });
  });

  describe('Audit Trail', () => {
    describe('createAuditLog', () => {
      test('should create audit log entry', async () => {
        const auditData = {
          entityType: 'payroll_run',
          entityId: 'run-123',
          action: 'approved',
          performedBy: 'user-456',
          changeDetails: { status: 'draft -> approved' }
        };

        mockComplianceRepository.createAuditLog = jest.fn().mockResolvedValue({
          id: 'audit-789',
          ...auditData
        });

        const result = await service.createAuditLog(auditData, 'org-789');

        expect(result).toBeDefined();
        expect(result.entity_type).toBe('payroll_run');
      });

      test('should validate entity type', async () => {
        const invalidData = {
          entityType: 'invalid_entity',
          entityId: 'id-123',
          action: 'created'
        };

        await expect(
          service.createAuditLog(invalidData, 'org-789')
        ).rejects.toThrow();
      });
    });

    describe('getAuditTrail', () => {
      test('should retrieve audit trail for entity', async () => {
        const mockLogs = [
          { id: 'audit-1', action: 'created' },
          { id: 'audit-2', action: 'calculated' },
          { id: 'audit-3', action: 'approved' }
        ];

        mockComplianceRepository.findAuditLogs = jest.fn().mockResolvedValue(mockLogs);

        const result = await service.getAuditTrail(
          'payroll_run',
          'run-123',
          'org-789'
        );

        expect(result).toEqual(mockLogs);
        expect(result).toHaveLength(3);
      });

      test('should filter by action', async () => {
        const mockApprovalLogs = [
          { id: 'audit-1', action: 'approved' }
        ];

        mockComplianceRepository.findAuditLogs = jest.fn().mockResolvedValue(mockApprovalLogs);

        const result = await service.getAuditTrail(
          'payroll_run',
          'run-123',
          'org-789',
          { action: 'approved' }
        );

        expect(result.every(log => log.action === 'approved')).toBe(true);
      });
    });
  });

  describe('Validation Rules', () => {
    test('should validate hourly wage against minimum', () => {
      const isCompliant = service.validateMinimumWage(12.0, 15.0);
      expect(isCompliant).toBe(false);
    });

    test('should pass validation when wage meets minimum', () => {
      const isCompliant = service.validateMinimumWage(20.0, 15.0);
      expect(isCompliant).toBe(true);
    });

    test('should validate overtime hours', () => {
      const hasViolation = service.validateOvertimeCompliance(45, 0, 40);
      expect(hasViolation).toBe(true); // Worked 45 hours, no OT recorded
    });

    test('should pass overtime validation when proper', () => {
      const hasViolation = service.validateOvertimeCompliance(45, 5, 40);
      expect(hasViolation).toBe(false); // Worked 45 hours, 5 OT recorded
    });
  });

  describe('Error Handling', () => {
    test('should handle repository errors', async () => {
      mockComplianceRepository.createComplianceRule = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        service.createComplianceRule({
          ruleName: 'Test',
          ruleType: 'wage_law',
          description: 'Test',
          isActive: true,
          effectiveDate: '2024-01-01'
        }, 'org-789', 'user-123')
      ).rejects.toThrow('Database error');
    });

    test('should handle missing compliance data', async () => {
      mockComplianceRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(
        service.runComplianceCheck('nonexistent', 'org-789', 'user-123')
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero employees for compliance check', async () => {
      const mockRule = {
        id: 'rule-123',
        rule_type: 'wage_law',
        threshold: 15.0
      };

      mockComplianceRepository.findById = jest.fn().mockResolvedValue(mockRule);
      mockPayrollRepository.findByOrganization = jest.fn().mockResolvedValue([]);
      mockComplianceRepository.createComplianceCheck = jest.fn().mockResolvedValue({ id: 'check-123' });

      const result = await service.runComplianceCheck('rule-123', 'org-789', 'user-123');

      expect(result.recordsChecked).toBe(0);
      expect(result.checkStatus).toBe('passed');
    });

    test('should handle employees without compensation', async () => {
      const mockRule = {
        id: 'rule-123',
        rule_type: 'wage_law',
        threshold: 15.0
      };

      const mockEmployees = [{ id: 'record-1' }];

      mockComplianceRepository.findById = jest.fn().mockResolvedValue(mockRule);
      mockPayrollRepository.findByOrganization = jest.fn().mockResolvedValue(mockEmployees);
      mockPayrollRepository.findCurrentCompensation = jest.fn().mockResolvedValue(null);
      mockComplianceRepository.createComplianceCheck = jest.fn().mockResolvedValue({ id: 'check-123' });

      const result = await service.runComplianceCheck('rule-123', 'org-789', 'user-123');

      // Should skip employees without compensation
      expect(result.recordsChecked).toBe(0);
    });
  });
});
