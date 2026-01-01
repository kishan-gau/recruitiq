/**
 * Forfait Rule DTO Unit Tests
 * 
 * Tests for forfait rule data transformation functions.
 * Validates snake_case (DB) to camelCase (API) conversion.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Pure function testing
 * - EXACT function names from DTO (verified against source)
 * 
 * VERIFIED FUNCTIONS (from source analysis):
 * 1. mapForfaitRuleDbToApi(dbRule)
 * 2. mapForfaitRulesDbToApi(dbRules)
 * 3. mapForfaitRuleApiToDb(apiData)
 */

import { describe, it, expect } from '@jest/globals';
import {
  mapForfaitRuleDbToApi,
  mapForfaitRulesDbToApi,
  mapForfaitRuleApiToDb
} from '../../../../src/products/paylinq/dto/forfaitRuleDto.js';

describe('Forfait Rule DTO', () => {
  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  const testRuleId = '660e8400-e29b-41d4-a716-446655440002';
  const testSourceComponentId = '770e8400-e29b-41d4-a716-446655440003';
  const testForfaitComponentId = '880e8400-e29b-41d4-a716-446655440004';

  // ==================== mapForfaitRuleDbToApi ====================

  describe('mapForfaitRuleDbToApi', () => {
    it('should map database forfait rule to API format', () => {
      // Arrange
      const dbRule = {
        id: testRuleId,
        organization_id: testOrgId,
        rule_name: 'Vacation Forfait',
        description: 'Forfait calculation for vacation pay',
        source_component_id: testSourceComponentId,
        forfait_component_id: testForfaitComponentId,
        percentage_rate: '8.00',
        apply_on_gross: true,
        min_amount: '100.00',
        max_amount: '5000.00',
        catalog_value: 'CAT_001',
        effective_from: new Date('2024-01-01'),
        effective_to: new Date('2024-12-31'),
        is_active: true,
        metadata: { notes: 'Test rule' },
        created_by: testUserId,
        created_at: new Date('2024-01-01'),
        updated_by: testUserId,
        updated_at: new Date('2024-01-01'),
        deleted_at: null,
        deleted_by: null
      };

      // Act
      const result = mapForfaitRuleDbToApi(dbRule);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbRule.id);
      expect(result.organizationId).toBe(dbRule.organization_id);
      expect(result.ruleName).toBe(dbRule.rule_name);
      expect(result.description).toBe(dbRule.description);
      expect(result.sourceComponentId).toBe(dbRule.source_component_id);
      expect(result.forfaitComponentId).toBe(dbRule.forfait_component_id);
      expect(result.percentageRate).toBe(8.00);
      expect(result.applyOnGross).toBe(dbRule.apply_on_gross);
      expect(result.minAmount).toBe(100.00);
      expect(result.maxAmount).toBe(5000.00);
      expect(result.catalogValue).toBe(dbRule.catalog_value);
      expect(result.effectiveFrom).toBe(dbRule.effective_from);
      expect(result.effectiveTo).toBe(dbRule.effective_to);
      expect(result.isActive).toBe(dbRule.is_active);
      expect(result.metadata).toEqual(dbRule.metadata);
      expect(result.createdBy).toBe(dbRule.created_by);
      expect(result.createdAt).toBe(dbRule.created_at);
      expect(result.updatedBy).toBe(dbRule.updated_by);
      expect(result.updatedAt).toBe(dbRule.updated_at);
      expect(result.deletedAt).toBeNull();
      expect(result.deletedBy).toBeNull();
    });

    it('should return null for null input', () => {
      // Act
      const result = mapForfaitRuleDbToApi(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      // Act
      const result = mapForfaitRuleDbToApi(undefined);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle rule with null optional fields', () => {
      // Arrange
      const dbRule = {
        id: testRuleId,
        organization_id: testOrgId,
        rule_name: 'Basic Rule',
        description: null,
        source_component_id: testSourceComponentId,
        forfait_component_id: testForfaitComponentId,
        percentage_rate: '5.00',
        apply_on_gross: false,
        min_amount: null,
        max_amount: null,
        catalog_value: null,
        effective_from: new Date('2024-01-01'),
        effective_to: null,
        is_active: true,
        metadata: {},
        created_by: testUserId,
        created_at: new Date('2024-01-01'),
        updated_by: testUserId,
        updated_at: new Date('2024-01-01'),
        deleted_at: null,
        deleted_by: null
      };

      // Act
      const result = mapForfaitRuleDbToApi(dbRule);

      // Assert
      expect(result).toBeDefined();
      expect(result.description).toBeNull();
      expect(result.minAmount).toBeNull();
      expect(result.maxAmount).toBeNull();
      expect(result.catalogValue).toBeNull();
      expect(result.effectiveTo).toBeNull();
    });

    it('should include source component details when joined', () => {
      // Arrange
      const dbRule = {
        id: testRuleId,
        organization_id: testOrgId,
        rule_name: 'Test Rule',
        source_component_id: testSourceComponentId,
        source_component_name: 'Base Salary',
        source_component_code: 'BASE',
        forfait_component_id: testForfaitComponentId,
        percentage_rate: '8.00',
        apply_on_gross: true,
        effective_from: new Date('2024-01-01'),
        is_active: true,
        created_by: testUserId,
        created_at: new Date('2024-01-01'),
        updated_by: testUserId,
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapForfaitRuleDbToApi(dbRule);

      // Assert
      expect(result.sourceComponent).toBeDefined();
      expect(result.sourceComponent.id).toBe(testSourceComponentId);
      expect(result.sourceComponent.name).toBe('Base Salary');
      expect(result.sourceComponent.code).toBe('BASE');
    });

    it('should include forfait component details when joined', () => {
      // Arrange
      const dbRule = {
        id: testRuleId,
        organization_id: testOrgId,
        rule_name: 'Test Rule',
        source_component_id: testSourceComponentId,
        forfait_component_id: testForfaitComponentId,
        forfait_component_name: 'Vacation Pay',
        forfait_component_code: 'VAC',
        percentage_rate: '8.00',
        apply_on_gross: true,
        effective_from: new Date('2024-01-01'),
        is_active: true,
        created_by: testUserId,
        created_at: new Date('2024-01-01'),
        updated_by: testUserId,
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapForfaitRuleDbToApi(dbRule);

      // Assert
      expect(result.forfaitComponent).toBeDefined();
      expect(result.forfaitComponent.id).toBe(testForfaitComponentId);
      expect(result.forfaitComponent.name).toBe('Vacation Pay');
      expect(result.forfaitComponent.code).toBe('VAC');
    });
  });

  // ==================== mapForfaitRulesDbToApi ====================

  describe('mapForfaitRulesDbToApi', () => {
    it('should map array of forfait rules to API format', () => {
      // Arrange
      const dbRules = [
        {
          id: testRuleId,
          organization_id: testOrgId,
          rule_name: 'Rule 1',
          source_component_id: testSourceComponentId,
          forfait_component_id: testForfaitComponentId,
          percentage_rate: '8.00',
          apply_on_gross: true,
          effective_from: new Date('2024-01-01'),
          is_active: true,
          created_by: testUserId,
          created_at: new Date('2024-01-01'),
          updated_by: testUserId,
          updated_at: new Date('2024-01-01')
        },
        {
          id: '990e8400-e29b-41d4-a716-446655440005',
          organization_id: testOrgId,
          rule_name: 'Rule 2',
          source_component_id: testSourceComponentId,
          forfait_component_id: testForfaitComponentId,
          percentage_rate: '5.00',
          apply_on_gross: false,
          effective_from: new Date('2024-01-01'),
          is_active: true,
          created_by: testUserId,
          created_at: new Date('2024-01-01'),
          updated_by: testUserId,
          updated_at: new Date('2024-01-01')
        }
      ];

      // Act
      const result = mapForfaitRulesDbToApi(dbRules);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].ruleName).toBe('Rule 1');
      expect(result[1].ruleName).toBe('Rule 2');
    });

    it('should return empty array for non-array input', () => {
      // Act
      const result = mapForfaitRulesDbToApi(null);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle empty array', () => {
      // Act
      const result = mapForfaitRulesDbToApi([]);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  // ==================== mapForfaitRuleApiToDb ====================

  describe('mapForfaitRuleApiToDb', () => {
    it('should map API forfait rule to database format', () => {
      // Arrange
      const apiData = {
        ruleName: 'API Rule',
        description: 'API description',
        sourceComponentId: testSourceComponentId,
        forfaitComponentId: testForfaitComponentId,
        percentageRate: 8.00,
        applyOnGross: true,
        minAmount: 100.00,
        maxAmount: 5000.00,
        catalogValue: 'CAT_002',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: new Date('2024-12-31'),
        isActive: true,
        metadata: { notes: 'API test' }
      };

      // Act
      const result = mapForfaitRuleApiToDb(apiData);

      // Assert
      expect(result).toBeDefined();
      expect(result.rule_name).toBe(apiData.ruleName);
      expect(result.description).toBe(apiData.description);
      expect(result.source_component_id).toBe(apiData.sourceComponentId);
      expect(result.forfait_component_id).toBe(apiData.forfaitComponentId);
      expect(result.percentage_rate).toBe(apiData.percentageRate);
      expect(result.apply_on_gross).toBe(apiData.applyOnGross);
      expect(result.min_amount).toBe(apiData.minAmount);
      expect(result.max_amount).toBe(apiData.maxAmount);
      expect(result.catalog_value).toBe(apiData.catalogValue);
      expect(result.effective_from).toBe(apiData.effectiveFrom);
      expect(result.effective_to).toBe(apiData.effectiveTo);
      expect(result.is_active).toBe(apiData.isActive);
      expect(result.metadata).toEqual(apiData.metadata);
    });

    it('should return null for null input', () => {
      // Act
      const result = mapForfaitRuleApiToDb(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should only include defined fields', () => {
      // Arrange
      const apiData = {
        ruleName: 'Partial Rule',
        sourceComponentId: testSourceComponentId,
        forfaitComponentId: testForfaitComponentId
      };

      // Act
      const result = mapForfaitRuleApiToDb(apiData);

      // Assert
      expect(result).toBeDefined();
      expect(result.rule_name).toBe('Partial Rule');
      expect(result.source_component_id).toBe(testSourceComponentId);
      expect(result.forfait_component_id).toBe(testForfaitComponentId);
      expect(result.description).toBeUndefined();
      expect(result.percentage_rate).toBeUndefined();
    });
  });
});
