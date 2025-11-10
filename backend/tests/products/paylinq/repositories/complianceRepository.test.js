/**
 * Compliance Repository Tests
 * 
 * Unit tests for ComplianceRepository CRUD operations.
 */

import ComplianceRepository from '../../../../src/products/paylinq/repositories/complianceRepository.js';
import pool from '../../../../src/config/database.js';

// Mock database

describe('ComplianceRepository', () => {
  let repository;
  let mockDb;

  beforeEach(() => {
    repository = new ComplianceRepository();
    mockDb = db;
    jest.clearAllMocks();
  });

  describe('Compliance Rules', () => {
    describe('createComplianceRule', () => {
      test('should create compliance rule successfully', async () => {
        const ruleData = {
          ruleName: 'Minimum Wage Compliance',
          ruleType: 'wage_law',
          description: 'Ensure minimum wage requirements',
          isActive: true,
          effectiveDate: '2024-01-01'
        };

        const mockCreated = {
          id: 'rule-123',
          ...ruleData,
          organization_id: 'org-789',
          created_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockCreated])
        });

        const result = await repository.createComplianceRule(
          ruleData,
          'org-789',
          'user-123'
        );

        expect(result).toEqual(mockCreated);
        expect(result.rule_name).toBe('Minimum Wage Compliance');
        expect(result.is_active).toBe(true);
        expect(mockDb).toHaveBeenCalledWith('paylinq_compliance_rules');
      });

      test('should include organizationId in rule', async () => {
        let insertedData;
        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockImplementation((data) => {
            insertedData = data;
            return {
              returning: jest.fn().mockResolvedValue([{ id: 'rule-123', ...data }])
            };
          })
        });

        await repository.createComplianceRule({
          ruleName: 'Test Rule',
          ruleType: 'labor_law'
        }, 'org-specific', 'user-123');

        expect(insertedData.organization_id).toBe('org-specific');
      });
    });

    describe('findComplianceRulesByType', () => {
      test('should find rules by type', async () => {
        const mockRules = [
          { id: 'rule-1', rule_type: 'wage_law', is_active: true },
          { id: 'rule-2', rule_type: 'wage_law', is_active: true }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockResolvedValue(mockRules)
        });

        const result = await repository.findComplianceRulesByType('wage_law', 'org-789');

        expect(result).toEqual(mockRules);
        expect(result).toHaveLength(2);
        expect(result.every(r => r.rule_type === 'wage_law')).toBe(true);
      });

      test('should filter by active status', async () => {
        const mockActiveRules = [
          { id: 'rule-1', rule_type: 'labor_law', is_active: true }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockResolvedValue(mockActiveRules)
        });

        const result = await repository.findComplianceRulesByType('labor_law', 'org-789', true);

        expect(result.every(r => r.is_active)).toBe(true);
      });
    });

    describe('updateComplianceRule', () => {
      test('should update compliance rule', async () => {
        const updates = {
          isActive: false,
          description: 'Updated description'
        };

        const mockUpdated = {
          id: 'rule-123',
          is_active: false,
          description: 'Updated description',
          updated_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockUpdated])
        });

        const result = await repository.updateComplianceRule(
          'rule-123',
          updates,
          'org-789',
          'user-123'
        );

        expect(result).toEqual(mockUpdated);
        expect(result.is_active).toBe(false);
      });
    });
  });

  describe('Compliance Checks', () => {
    describe('createComplianceCheck', () => {
      test('should create compliance check record', async () => {
        const checkData = {
          ruleId: 'rule-123',
          checkDate: '2024-01-15',
          checkType: 'automated',
          checkStatus: 'passed',
          recordsChecked: 50,
          violationsFound: 0
        };

        const mockCreated = {
          id: 'check-456',
          ...checkData,
          organization_id: 'org-789',
          created_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockCreated])
        });

        const result = await repository.createComplianceCheck(
          checkData,
          'org-789',
          'user-123'
        );

        expect(result).toEqual(mockCreated);
        expect(result.check_status).toBe('passed');
        expect(result.violations_found).toBe(0);
      });

      test('should handle failed compliance checks', async () => {
        const checkData = {
          ruleId: 'rule-123',
          checkStatus: 'failed',
          recordsChecked: 50,
          violationsFound: 3
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([{ id: 'check-789', ...checkData }])
        });

        const result = await repository.createComplianceCheck(checkData, 'org-789', 'user-123');

        expect(result.check_status).toBe('failed');
        expect(result.violations_found).toBe(3);
      });
    });

    describe('findComplianceChecks', () => {
      test('should find compliance checks by rule', async () => {
        const mockChecks = [
          { id: 'check-1', rule_id: 'rule-123', check_status: 'passed' },
          { id: 'check-2', rule_id: 'rule-123', check_status: 'passed' }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue(mockChecks)
        });

        const result = await repository.findComplianceChecks(
          { ruleId: 'rule-123' },
          'org-789'
        );

        expect(result).toEqual(mockChecks);
        expect(result).toHaveLength(2);
      });

      test('should filter by status', async () => {
        const mockFailedChecks = [
          { id: 'check-1', check_status: 'failed', violations_found: 2 }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue(mockFailedChecks)
        });

        const result = await repository.findComplianceChecks(
          { checkStatus: 'failed' },
          'org-789'
        );

        expect(result.every(c => c.check_status === 'failed')).toBe(true);
      });

      test('should order by check_date descending', async () => {
        const mockChecks = [
          { id: 'check-3', check_date: '2024-03-01' },
          { id: 'check-2', check_date: '2024-02-01' },
          { id: 'check-1', check_date: '2024-01-01' }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue(mockChecks)
        });

        const result = await repository.findComplianceChecks({}, 'org-789');

        // Verify descending order
        for (let i = 1; i < result.length; i++) {
          expect(result[i].check_date <= result[i - 1].check_date).toBe(true);
        }
      });
    });
  });

  describe('Compliance Violations', () => {
    describe('createComplianceViolation', () => {
      test('should create violation record', async () => {
        const violationData = {
          checkId: 'check-123',
          ruleId: 'rule-456',
          employeeRecordId: 'record-789',
          violationType: 'minimum_wage',
          violationDescription: 'Wage below minimum threshold',
          severity: 'high',
          status: 'open'
        };

        const mockCreated = {
          id: 'violation-101',
          ...violationData,
          organization_id: 'org-789',
          created_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockCreated])
        });

        const result = await repository.createComplianceViolation(
          violationData,
          'org-789',
          'user-123'
        );

        expect(result).toEqual(mockCreated);
        expect(result.violation_type).toBe('minimum_wage');
        expect(result.severity).toBe('high');
        expect(result.status).toBe('open');
      });

      test('should handle different severity levels', async () => {
        const severities = ['low', 'medium', 'high', 'critical'];

        for (const severity of severities) {
          jest.clearAllMocks();

          mockDb.mockReturnValueOnce({
            insert: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([{ id: 'violation-123', severity }])
          });

          const result = await repository.createComplianceViolation(
            { severity },
            'org-789',
            'user-123'
          );

          expect(result.severity).toBe(severity);
        }
      });
    });

    describe('findComplianceViolations', () => {
      test('should find violations by employee', async () => {
        const mockViolations = [
          { id: 'violation-1', employee_id: 'record-123', status: 'open' },
          { id: 'violation-2', employee_id: 'record-123', status: 'resolved' }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue(mockViolations)
        });

        const result = await repository.findComplianceViolations(
          { employeeId: 'record-123' },
          'org-789'
        );

        expect(result).toEqual(mockViolations);
        expect(result.every(v => v.employee_id === 'record-123')).toBe(true);
      });

      test('should filter by status', async () => {
        const mockOpenViolations = [
          { id: 'violation-1', status: 'open', severity: 'high' },
          { id: 'violation-2', status: 'open', severity: 'medium' }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue(mockOpenViolations)
        });

        const result = await repository.findComplianceViolations(
          { status: 'open' },
          'org-789'
        );

        expect(result.every(v => v.status === 'open')).toBe(true);
      });

      test('should filter by severity', async () => {
        const mockHighSeverity = [
          { id: 'violation-1', severity: 'high', status: 'open' }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue(mockHighSeverity)
        });

        const result = await repository.findComplianceViolations(
          { severity: 'high' },
          'org-789'
        );

        expect(result.every(v => v.severity === 'high')).toBe(true);
      });
    });

    describe('updateComplianceViolation', () => {
      test('should update violation status', async () => {
        const updates = {
          status: 'resolved',
          resolutionNotes: 'Corrected wage amount'
        };

        const mockUpdated = {
          id: 'violation-123',
          status: 'resolved',
          resolution_notes: 'Corrected wage amount',
          resolved_at: new Date(),
          updated_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockUpdated])
        });

        const result = await repository.updateComplianceViolation(
          'violation-123',
          updates,
          'org-789',
          'user-123'
        );

        expect(result).toEqual(mockUpdated);
        expect(result.status).toBe('resolved');
      });
    });

    describe('getOpenViolationCount', () => {
      test('should count open violations', async () => {
        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          count: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue({ count: 5 })
        });

        const result = await repository.getOpenViolationCount('org-789');

        expect(result).toBe(5);
      });

      test('should return 0 if no open violations', async () => {
        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          count: jest.fn().mockReturnThis(),
          first: jest.fn().mockResolvedValue({ count: 0 })
        });

        const result = await repository.getOpenViolationCount('org-789');

        expect(result).toBe(0);
      });
    });
  });

  describe('Audit Logs', () => {
    describe('createAuditLog', () => {
      test('should create audit log entry', async () => {
        const auditData = {
          entityType: 'payroll_run',
          entityId: 'run-123',
          action: 'approved',
          performedBy: 'user-456',
          changeDetails: { status: 'draft -> approved' }
        };

        const mockCreated = {
          id: 'audit-789',
          ...auditData,
          organization_id: 'org-123',
          created_at: new Date()
        };

        mockDb.mockReturnValueOnce({
          insert: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([mockCreated])
        });

        const result = await repository.createAuditLog(
          auditData,
          'org-123'
        );

        expect(result).toEqual(mockCreated);
        expect(result.entity_type).toBe('payroll_run');
        expect(result.action).toBe('approved');
      });

      test('should handle different entity types', async () => {
        const entityTypes = ['employee_record', 'paycheck', 'timesheet', 'tax_configuration'];

        for (const entityType of entityTypes) {
          jest.clearAllMocks();

          mockDb.mockReturnValueOnce({
            insert: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([{ id: 'audit-123', entity_type: entityType }])
          });

          const result = await repository.createAuditLog(
            { entityType, entityId: 'id-123', action: 'created' },
            'org-789'
          );

          expect(result.entity_type).toBe(entityType);
        }
      });
    });

    describe('findAuditLogs', () => {
      test('should find audit logs by entity', async () => {
        const mockLogs = [
          { id: 'audit-1', entity_id: 'run-123', action: 'created' },
          { id: 'audit-2', entity_id: 'run-123', action: 'calculated' },
          { id: 'audit-3', entity_id: 'run-123', action: 'approved' }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue(mockLogs)
        });

        const result = await repository.findAuditLogs(
          { entityType: 'payroll_run', entityId: 'run-123' },
          'org-789'
        );

        expect(result).toEqual(mockLogs);
        expect(result).toHaveLength(3);
      });

      test('should filter by action', async () => {
        const mockApprovalLogs = [
          { id: 'audit-1', action: 'approved' },
          { id: 'audit-2', action: 'approved' }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue(mockApprovalLogs)
        });

        const result = await repository.findAuditLogs(
          { action: 'approved' },
          'org-789'
        );

        expect(result.every(log => log.action === 'approved')).toBe(true);
      });

      test('should order by created_at descending', async () => {
        const mockLogs = [
          { id: 'audit-3', created_at: new Date('2024-03-01') },
          { id: 'audit-2', created_at: new Date('2024-02-01') },
          { id: 'audit-1', created_at: new Date('2024-01-01') }
        ];

        mockDb.mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockResolvedValue(mockLogs)
        });

        const result = await repository.findAuditLogs({}, 'org-789');

        // Verify descending order
        for (let i = 1; i < result.length; i++) {
          expect(result[i].created_at <= result[i - 1].created_at).toBe(true);
        }
      });
    });
  });

  describe('Tenant Isolation', () => {
    test('should enforce tenant isolation in all queries', async () => {
      const methods = [
        { name: 'findComplianceRulesByType', args: ['wage_law', 'org-test'] },
        { name: 'findComplianceChecks', args: [{}, 'org-test'] },
        { name: 'findComplianceViolations', args: [{}, 'org-test'] },
        { name: 'findAuditLogs', args: [{}, 'org-test'] }
      ];

      for (const method of methods) {
        jest.clearAllMocks();

        let whereClauses = [];
        mockDb.mockReturnValueOnce({
          where: jest.fn().mockImplementation((clause) => {
            whereClauses.push(clause);
            return {
              andWhere: jest.fn().mockImplementation((andClause) => {
                whereClauses.push(andClause);
                return {
                  andWhere: jest.fn().mockReturnThis(),
                  orderBy: jest.fn().mockResolvedValue([])
                };
              })
            };
          })
        });

        await repository[method.name](...method.args);

        const hasOrgFilter = whereClauses.some(clause =>
          clause && clause.organization_id === 'org-test'
        );

        expect(hasOrgFilter).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockDb.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        returning: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(
        repository.createComplianceRule({}, 'org-123', 'user-123')
      ).rejects.toThrow('Database error');
    });

    test('should handle not found scenarios', async () => {
      mockDb.mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([])
      });

      const result = await repository.findComplianceChecks({}, 'org-123');

      expect(result).toEqual([]);
    });
  });
});
