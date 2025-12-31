/**
 * Compliance DTO Unit Tests
 * 
 * Tests for compliance data transformation functions.
 * Validates snake_case (DB) to camelCase (API) conversion.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Pure function testing
 * - EXACT function names from DTO (verified against source)
 * 
 * VERIFIED FUNCTIONS (from source analysis):
 * 1. mapComplianceRuleToDto(rule)
 * 2. mapComplianceRulesToDto(rules)
 * 3. mapComplianceViolationToDto(violation)
 * 4. mapComplianceViolationsToDto(violations)
 * 5. mapAuditLogToDto(log)
 * 6. mapAuditLogsToDto(logs)
 */

import { describe, it, expect } from '@jest/globals';
import {
  mapComplianceRuleToDto,
  mapComplianceRulesToDto,
  mapComplianceViolationToDto,
  mapComplianceViolationsToDto,
  mapAuditLogToDto,
  mapAuditLogsToDto
} from '../../../../src/products/paylinq/dto/complianceDto.js';

describe('Compliance DTO', () => {
  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  const testRuleId = '660e8400-e29b-41d4-a716-446655440002';

  // ==================== mapComplianceRuleToDto ====================

  describe('mapComplianceRuleToDto', () => {
    it('should map database rule to API format', () => {
      // Arrange
      const dbRule = {
        id: testRuleId,
        organization_id: testOrgId,
        rule_name: 'Minimum Wage Check',
        rule_type: 'wage_compliance',
        description: 'Ensure minimum wage requirements',
        threshold: 15.00,
        is_active: true,
        effective_date: new Date('2024-01-01'),
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        created_by: testUserId,
        updated_by: testUserId
      };

      // Act
      const result = mapComplianceRuleToDto(dbRule);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbRule.id);
      expect(result.organizationId).toBe(dbRule.organization_id);
      expect(result.ruleName).toBe(dbRule.rule_name);
      expect(result.ruleType).toBe(dbRule.rule_type);
      expect(result.description).toBe(dbRule.description);
      expect(result.threshold).toBe(dbRule.threshold);
      expect(result.isActive).toBe(dbRule.is_active);
      expect(result.effectiveDate).toBe(dbRule.effective_date);
      expect(result.createdAt).toBe(dbRule.created_at);
      expect(result.updatedAt).toBe(dbRule.updated_at);
      expect(result.createdBy).toBe(dbRule.created_by);
      expect(result.updatedBy).toBe(dbRule.updated_by);
    });

    it('should return null for null input', () => {
      // Act
      const result = mapComplianceRuleToDto(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      // Act
      const result = mapComplianceRuleToDto(undefined);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle rule with null optional fields', () => {
      // Arrange
      const dbRule = {
        id: testRuleId,
        organization_id: testOrgId,
        rule_name: 'Test Rule',
        rule_type: 'test',
        description: null,
        threshold: null,
        is_active: true,
        effective_date: new Date(),
        created_at: new Date(),
        updated_at: null,
        created_by: testUserId,
        updated_by: null
      };

      // Act
      const result = mapComplianceRuleToDto(dbRule);

      // Assert
      expect(result).toBeDefined();
      expect(result.description).toBeNull();
      expect(result.threshold).toBeNull();
      expect(result.updatedAt).toBeNull();
      expect(result.updatedBy).toBeNull();
    });

    it('should not have snake_case properties in output', () => {
      // Arrange
      const dbRule = {
        id: testRuleId,
        organization_id: testOrgId,
        rule_name: 'Test',
        rule_type: 'test',
        is_active: true,
        effective_date: new Date(),
        created_at: new Date(),
        created_by: testUserId
      };

      // Act
      const result = mapComplianceRuleToDto(dbRule);

      // Assert
      expect(result).not.toHaveProperty('organization_id');
      expect(result).not.toHaveProperty('rule_name');
      expect(result).not.toHaveProperty('rule_type');
      expect(result).not.toHaveProperty('is_active');
      expect(result).not.toHaveProperty('effective_date');
      expect(result).not.toHaveProperty('created_at');
      expect(result).not.toHaveProperty('created_by');
    });
  });

  // ==================== mapComplianceRulesToDto ====================

  describe('mapComplianceRulesToDto', () => {
    it('should map array of rules', () => {
      // Arrange
      const dbRules = [
        {
          id: testRuleId,
          organization_id: testOrgId,
          rule_name: 'Rule 1',
          rule_type: 'type1',
          is_active: true,
          effective_date: new Date(),
          created_at: new Date(),
          created_by: testUserId
        },
        {
          id: '770e8400-e29b-41d4-a716-446655440003',
          organization_id: testOrgId,
          rule_name: 'Rule 2',
          rule_type: 'type2',
          is_active: false,
          effective_date: new Date(),
          created_at: new Date(),
          created_by: testUserId
        }
      ];

      // Act
      const result = mapComplianceRulesToDto(dbRules);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].ruleName).toBe('Rule 1');
      expect(result[1].ruleName).toBe('Rule 2');
    });

    it('should return empty array for empty input', () => {
      // Act
      const result = mapComplianceRulesToDto([]);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array for null input', () => {
      // Act
      const result = mapComplianceRulesToDto(null);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array for non-array input', () => {
      // Act
      const result = mapComplianceRulesToDto('not an array');

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==================== mapComplianceViolationToDto ====================

  describe('mapComplianceViolationToDto', () => {
    it('should map database violation to API format', () => {
      // Arrange
      const dbViolation = {
        id: '880e8400-e29b-41d4-a716-446655440004',
        organization_id: testOrgId,
        rule_id: testRuleId,
        employee_id: '990e8400-e29b-41d4-a716-446655440005',
        violation_type: 'wage_below_minimum',
        severity: 'high',
        description: 'Employee paid below minimum wage',
        detected_date: new Date('2024-01-15'),
        resolved_date: null,
        status: 'open',
        resolution_notes: null,
        created_at: new Date('2024-01-15'),
        updated_at: new Date('2024-01-15')
      };

      // Act
      const result = mapComplianceViolationToDto(dbViolation);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbViolation.id);
      expect(result.organizationId).toBe(dbViolation.organization_id);
      expect(result.ruleId).toBe(dbViolation.rule_id);
      expect(result.employeeId).toBe(dbViolation.employee_id);
      expect(result.violationType).toBe(dbViolation.violation_type);
      expect(result.severity).toBe(dbViolation.severity);
      expect(result.description).toBe(dbViolation.description);
      expect(result.detectedDate).toBe(dbViolation.detected_date);
      expect(result.resolvedDate).toBeNull();
      expect(result.status).toBe(dbViolation.status);
      expect(result.resolutionNotes).toBeNull();
    });

    it('should return null for null input', () => {
      // Act
      const result = mapComplianceViolationToDto(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle resolved violations', () => {
      // Arrange
      const dbViolation = {
        id: '880e8400-e29b-41d4-a716-446655440004',
        organization_id: testOrgId,
        rule_id: testRuleId,
        employee_id: '990e8400-e29b-41d4-a716-446655440005',
        violation_type: 'test',
        severity: 'low',
        description: 'Test',
        detected_date: new Date('2024-01-15'),
        resolved_date: new Date('2024-01-20'),
        status: 'resolved',
        resolution_notes: 'Fixed by updating pay rate',
        created_at: new Date('2024-01-15'),
        updated_at: new Date('2024-01-20')
      };

      // Act
      const result = mapComplianceViolationToDto(dbViolation);

      // Assert
      expect(result.resolvedDate).toEqual(dbViolation.resolved_date);
      expect(result.status).toBe('resolved');
      expect(result.resolutionNotes).toBe('Fixed by updating pay rate');
    });
  });

  // ==================== mapComplianceViolationsToDto ====================

  describe('mapComplianceViolationsToDto', () => {
    it('should map array of violations', () => {
      // Arrange
      const dbViolations = [
        {
          id: '880e8400-e29b-41d4-a716-446655440004',
          organization_id: testOrgId,
          rule_id: testRuleId,
          employee_id: '990e8400-e29b-41d4-a716-446655440005',
          violation_type: 'type1',
          severity: 'high',
          status: 'open',
          detected_date: new Date(),
          created_at: new Date()
        },
        {
          id: 'aa0e8400-e29b-41d4-a716-446655440006',
          organization_id: testOrgId,
          rule_id: testRuleId,
          employee_id: '990e8400-e29b-41d4-a716-446655440005',
          violation_type: 'type2',
          severity: 'low',
          status: 'resolved',
          detected_date: new Date(),
          resolved_date: new Date(),
          created_at: new Date()
        }
      ];

      // Act
      const result = mapComplianceViolationsToDto(dbViolations);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].violationType).toBe('type1');
      expect(result[1].violationType).toBe('type2');
    });

    it('should return empty array for empty input', () => {
      // Act
      const result = mapComplianceViolationsToDto([]);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==================== mapAuditLogToDto ====================

  describe('mapAuditLogToDto', () => {
    it('should map database audit log to API format', () => {
      // Arrange
      const dbLog = {
        id: 'bb0e8400-e29b-41d4-a716-446655440007',
        organization_id: testOrgId,
        entity_type: 'compliance_rule',
        entity_id: testRuleId,
        action: 'updated',
        performed_by: testUserId,
        changes: { threshold: { old: 10, new: 15 } },
        created_at: new Date('2024-01-15')
      };

      // Act
      const result = mapAuditLogToDto(dbLog);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbLog.id);
      expect(result.organizationId).toBe(dbLog.organization_id);
      expect(result.entityType).toBe(dbLog.entity_type);
      expect(result.entityId).toBe(dbLog.entity_id);
      expect(result.action).toBe(dbLog.action);
      expect(result.performedBy).toBe(dbLog.performed_by);
      expect(result.changes).toEqual(dbLog.changes);
      expect(result.createdAt).toBe(dbLog.created_at);
    });

    it('should return null for null input', () => {
      // Act
      const result = mapAuditLogToDto(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle different action types', () => {
      // Arrange
      const actions = ['created', 'updated', 'deleted', 'viewed'];
      
      actions.forEach(action => {
        const dbLog = {
          id: 'bb0e8400-e29b-41d4-a716-446655440007',
          organization_id: testOrgId,
          entity_type: 'test',
          entity_id: testRuleId,
          action: action,
          performed_by: testUserId,
          created_at: new Date()
        };

        // Act
        const result = mapAuditLogToDto(dbLog);

        // Assert
        expect(result.action).toBe(action);
      });
    });
  });

  // ==================== mapAuditLogsToDto ====================

  describe('mapAuditLogsToDto', () => {
    it('should map array of audit logs', () => {
      // Arrange
      const dbLogs = [
        {
          id: 'bb0e8400-e29b-41d4-a716-446655440007',
          organization_id: testOrgId,
          entity_type: 'compliance_rule',
          entity_id: testRuleId,
          action: 'created',
          performed_by: testUserId,
          created_at: new Date()
        },
        {
          id: 'cc0e8400-e29b-41d4-a716-446655440008',
          organization_id: testOrgId,
          entity_type: 'violation',
          entity_id: '880e8400-e29b-41d4-a716-446655440004',
          action: 'resolved',
          performed_by: testUserId,
          created_at: new Date()
        }
      ];

      // Act
      const result = mapAuditLogsToDto(dbLogs);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('created');
      expect(result[1].action).toBe('resolved');
    });

    it('should return empty array for empty input', () => {
      // Act
      const result = mapAuditLogsToDto([]);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array for null input', () => {
      // Act
      const result = mapAuditLogsToDto(null);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
