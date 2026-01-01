/**
 * ComplianceRepository Test Suite
 * 
 * Tests for PayLinQ compliance repository following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Database query mocking via dependency injection
 * - Multi-tenant isolation validation
 * - Data layer operations coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ComplianceRepository from '../../../../src/products/paylinq/repositories/complianceRepository.js';

describe('ComplianceRepository', () => {
  let repository: any;
  let mockDb: any;

  // Test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testRuleId = 1;
  const testCheckId = 1;
  const testViolationId = 1;

  /**
   * Helper to create DB format compliance rule
   */
  const createDbComplianceRule = (overrides: any = {}) => ({
    id: testRuleId,
    organization_id: testOrganizationId,
    rule_name: 'Minimum Wage Rule',
    rule_type: 'wage',
    description: 'Ensure compliance with minimum wage laws',
    is_active: true,
    effective_date: new Date('2025-01-01'),
    created_by: testUserId,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    ...overrides
  });

  /**
   * Helper to create DB format compliance check
   */
  const createDbComplianceCheck = (overrides: any = {}) => ({
    id: testCheckId,
    rule_id: testRuleId,
    status: 'passed',
    issues: null,
    check_date: new Date('2025-01-15'),
    checked_by: testUserId,
    created_at: new Date('2025-01-15'),
    ...overrides
  });

  /**
   * Helper to create DB format compliance violation
   */
  const createDbComplianceViolation = (overrides: any = {}) => ({
    id: testViolationId,
    organization_id: testOrganizationId,
    rule_id: testRuleId,
    severity: 'high',
    description: 'Employee paid below minimum wage',
    status: 'open',
    detected_date: new Date('2025-01-15'),
    resolved_date: null,
    resolution_notes: null,
    created_at: new Date('2025-01-15'),
    updated_at: new Date('2025-01-15'),
    ...overrides
  });

  beforeEach(() => {
    // Create mock database with query method
    mockDb = {
      query: jest.fn()
    };
    
    // Inject mock via constructor
    repository = new ComplianceRepository(mockDb);
  });

  // ==================== CREATE COMPLIANCE RULE ====================

  describe('createComplianceRule', () => {
    it('should create compliance rule with organization isolation', async () => {
      const ruleData = {
        ruleName: 'Minimum Wage Rule',
        ruleType: 'wage',
        description: 'Ensure compliance with minimum wage laws',
        isActive: true,
        effectiveDate: new Date('2025-01-01')
      };

      const dbRule = createDbComplianceRule();
      mockDb.query.mockResolvedValue({ rows: [dbRule] });

      const result = await repository.createComplianceRule(
        ruleData,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual(dbRule);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO compliance_rules'),
        [
          testOrganizationId,
          ruleData.ruleName,
          ruleData.ruleType,
          ruleData.description,
          true,
          ruleData.effectiveDate,
          testUserId
        ]
      );
    });

    it('should default isActive to true when not provided', async () => {
      const ruleData = {
        ruleName: 'Test Rule',
        ruleType: 'test',
        description: 'Test',
        effectiveDate: new Date('2025-01-01')
      };

      mockDb.query.mockResolvedValue({ rows: [createDbComplianceRule()] });

      await repository.createComplianceRule(
        ruleData,
        testOrganizationId,
        testUserId
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([true]) // isActive defaults to true
      );
    });

    it('should respect isActive false value', async () => {
      const ruleData = {
        ruleName: 'Test Rule',
        ruleType: 'test',
        description: 'Test',
        isActive: false,
        effectiveDate: new Date('2025-01-01')
      };

      mockDb.query.mockResolvedValue({ rows: [createDbComplianceRule({ is_active: false })] });

      await repository.createComplianceRule(
        ruleData,
        testOrganizationId,
        testUserId
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([false])
      );
    });
  });

  // ==================== FIND COMPLIANCE RULES BY TYPE ====================

  describe('findComplianceRulesByType', () => {
    it('should find rules by type with organization isolation', async () => {
      const dbRules = [createDbComplianceRule()];
      mockDb.query.mockResolvedValue({ rows: dbRules });

      const result = await repository.findComplianceRulesByType(
        testOrganizationId,
        'wage'
      );

      expect(result).toEqual(dbRules);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = $1 AND rule_type = $2'),
        [testOrganizationId, 'wage']
      );
    });

    it('should filter by isActive when provided', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.findComplianceRulesByType(
        testOrganizationId,
        'wage',
        { isActive: true }
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND is_active = $3'),
        [testOrganizationId, 'wage', true]
      );
    });

    it('should order results by effective_date DESC', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.findComplianceRulesByType(
        testOrganizationId,
        'wage'
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY effective_date DESC'),
        expect.any(Array)
      );
    });
  });

  // ==================== UPDATE COMPLIANCE RULE ====================

  describe('updateComplianceRule', () => {
    it('should update compliance rule', async () => {
      const updates = {
        ruleName: 'Updated Rule Name',
        description: 'Updated description',
        isActive: false
      };

      const dbRule = createDbComplianceRule(updates);
      mockDb.query.mockResolvedValue({ rows: [dbRule] });

      const result = await repository.updateComplianceRule(testRuleId, updates);

      expect(result).toEqual(dbRule);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE compliance_rules'),
        [
          updates.ruleName,
          updates.description,
          updates.isActive,
          testRuleId
        ]
      );
    });

    it('should use COALESCE for partial updates', async () => {
      const updates = { ruleName: 'New Name' };
      mockDb.query.mockResolvedValue({ rows: [createDbComplianceRule()] });

      await repository.updateComplianceRule(testRuleId, updates);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('COALESCE'),
        [updates.ruleName, undefined, undefined, testRuleId]
      );
    });
  });

  // ==================== CREATE COMPLIANCE CHECK ====================

  describe('createComplianceCheck', () => {
    it('should create compliance check', async () => {
      const checkData = {
        ruleId: testRuleId,
        status: 'passed',
        issues: null,
        checkDate: new Date('2025-01-15'),
        checkedBy: testUserId
      };

      const dbCheck = createDbComplianceCheck();
      mockDb.query.mockResolvedValue({ rows: [dbCheck] });

      const result = await repository.createComplianceCheck(checkData);

      expect(result).toEqual(dbCheck);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO compliance_checks'),
        [
          checkData.ruleId,
          checkData.status,
          JSON.stringify([]), // issues gets stringified, null becomes []
          checkData.checkDate,
          checkData.checkedBy
        ]
      );
    });

    it('should handle failed checks with issues', async () => {
      const checkData = {
        ruleId: testRuleId,
        status: 'failed',
        issues: JSON.stringify(['Issue 1', 'Issue 2']),
        checkDate: new Date('2025-01-15'),
        checkedBy: testUserId
      };

      mockDb.query.mockResolvedValue({ rows: [createDbComplianceCheck(checkData)] });

      const result = await repository.createComplianceCheck(checkData);

      expect(result.issues).toBeTruthy();
    });
  });

  // ==================== CREATE COMPLIANCE VIOLATION ====================

  describe('createComplianceViolation', () => {
    it('should create compliance violation with employee_id', async () => {
      const violationData = {
        employeeId: testUserId,
        violationType: 'wage',
        severity: 'high',
        description: 'Employee paid below minimum wage',
        status: 'open',
        detectedDate: new Date('2025-01-15')
      };

      const dbViolation = createDbComplianceViolation();
      mockDb.query.mockResolvedValue({ rows: [dbViolation] });

      const result = await repository.createComplianceViolation(violationData);

      expect(result).toEqual(dbViolation);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO compliance_violations'),
        [
          violationData.employeeId,
          violationData.violationType,
          'high',
          'Employee paid below minimum wage',
          'open',
          violationData.detectedDate
        ]
      );
    });
  });

  // ==================== UPDATE COMPLIANCE VIOLATION ====================

  describe('updateComplianceViolation', () => {
    it('should update compliance violation', async () => {
      const updates = {
        status: 'resolved',
        resolvedDate: new Date('2025-01-20'),
        resolutionNotes: 'Issue fixed by adjusting wage'
      };

      const dbViolation = createDbComplianceViolation(updates);
      mockDb.query.mockResolvedValue({ rows: [dbViolation] });

      const result = await repository.updateComplianceViolation(
        testViolationId,
        updates
      );

      expect(result).toEqual(dbViolation);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE compliance_violations'),
        expect.arrayContaining([
          updates.status,
          updates.resolvedDate,
          updates.resolutionNotes,
          testViolationId
        ])
      );
    });
  });

  // ==================== GET OPEN VIOLATION COUNT ====================

  describe('getOpenViolationCount', () => {
    it('should get open violation count and return integer', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ count: '5' }]
      });

      const result = await repository.getOpenViolationCount({
        employeeId: testUserId
      });

      expect(result).toBe(5); // Returns integer, not object
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        expect.arrayContaining(['open', testUserId])
      );
    });

    it('should only filter by open status by default', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ count: '2' }] });

      await repository.getOpenViolationCount({});

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        ['open']
      );
    });
  });

  // ==================== CREATE AUDIT LOG ====================

  describe('createAuditLog', () => {
    it('should create audit log entry', async () => {
      const logData = {
        entityType: 'compliance_rule',
        entityId: testRuleId,
        action: 'rule_created',
        performedBy: testUserId,
        details: { note: 'Created new rule' }
      };

      const dbLog = {
        id: 1,
        ...logData,
        details: JSON.stringify(logData.details),
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [dbLog] });

      const result = await repository.createAuditLog(logData);

      expect(result).toEqual(dbLog);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO compliance_audit_logs'),
        [
          logData.entityType,
          logData.entityId,
          logData.action,
          logData.performedBy,
          JSON.stringify(logData.details)
        ]
      );
    });
  });

  // ==================== GET COMPLIANCE HISTORY ====================

  describe('getComplianceHistory', () => {
    it('should get compliance history for date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const history = [
        {
          check_date: new Date('2025-01-15'),
          rule_name: 'Minimum Wage Rule',
          status: 'passed'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: history });

      const result = await repository.getComplianceHistory(
        testOrganizationId,
        startDate,
        endDate
      );

      expect(result).toEqual(history);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([testOrganizationId, startDate, endDate])
      );
    });
  });

  // ==================== FIND METHODS ====================

  describe('findComplianceChecks', () => {
    it('should find compliance checks with filters', async () => {
      const options = {
        ruleId: testRuleId,
        status: 'passed'
      };

      mockDb.query.mockResolvedValue({ rows: [createDbComplianceCheck()] });

      await repository.findComplianceChecks(options);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM compliance_checks'),
        expect.any(Array)
      );
    });
  });

  describe('findComplianceViolations', () => {
    it('should find compliance violations with filters', async () => {
      const options = {
        organizationId: testOrganizationId,
        status: 'open'
      };

      mockDb.query.mockResolvedValue({ rows: [createDbComplianceViolation()] });

      await repository.findComplianceViolations(options);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM compliance_violations'),
        expect.any(Array)
      );
    });
  });

  describe('findAuditLogs', () => {
    it('should find audit logs with filters', async () => {
      const options = {
        organizationId: testOrganizationId,
        entityType: 'compliance_rule'
      };

      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.findAuditLogs(options);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM compliance_audit_log'),
        expect.any(Array)
      );
    });
  });
});
