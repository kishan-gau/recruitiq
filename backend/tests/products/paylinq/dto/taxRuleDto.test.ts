/**
 * Tax Rule DTO Unit Tests
 * 
 * Tests for tax rule data transformation functions.
 * Validates snake_case (DB) to camelCase (API) conversion.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Pure function testing
 * - EXACT function names from DTO (verified against source)
 * 
 * VERIFIED FUNCTIONS (from source analysis):
 * 1. mapTaxRuleSetDbToApi(dbRule)
 * 2. mapTaxBracketDbToApi(dbBracket)
 * 3. mapTaxRuleSetApiToDb(apiData)
 */

import { describe, it, expect } from '@jest/globals';
import {
  mapTaxRuleSetDbToApi,
  mapTaxBracketDbToApi,
  mapTaxRuleSetApiToDb
} from '../../../../src/products/paylinq/dto/taxRuleDto.js';

describe('Tax Rule DTO', () => {
  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  const testRuleSetId = '660e8400-e29b-41d4-a716-446655440002';
  const testBracketId = '770e8400-e29b-41d4-a716-446655440003';

  // ==================== mapTaxRuleSetDbToApi ====================

  describe('mapTaxRuleSetDbToApi', () => {
    it('should map database tax rule set to API format', () => {
      // Arrange
      const dbRule = {
        id: testRuleSetId,
        organization_id: testOrgId,
        tax_type: 'income',
        tax_name: 'Federal Income Tax',
        country: 'US',
        state: 'CA',
        locality: 'San Francisco',
        effective_from: new Date('2024-01-01'),
        effective_to: new Date('2024-12-31'),
        annual_cap: 150000.00,
        calculation_method: 'progressive',
        calculation_mode: 'bracket',
        description: 'Federal income tax brackets',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        deleted_at: null,
        created_by: testUserId,
        updated_by: testUserId,
        deleted_by: null
      };

      // Act
      const result = mapTaxRuleSetDbToApi(dbRule);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbRule.id);
      expect(result.organizationId).toBe(dbRule.organization_id);
      expect(result.taxType).toBe(dbRule.tax_type);
      expect(result.taxName).toBe(dbRule.tax_name);
      expect(result.country).toBe(dbRule.country);
      expect(result.state).toBe(dbRule.state);
      expect(result.locality).toBe(dbRule.locality);
      expect(result.effectiveFrom).toBe(dbRule.effective_from);
      expect(result.effectiveTo).toBe(dbRule.effective_to);
      expect(result.annualCap).toBe(dbRule.annual_cap);
      expect(result.calculationMethod).toBe(dbRule.calculation_method);
      expect(result.calculationMode).toBe(dbRule.calculation_mode);
      expect(result.description).toBe(dbRule.description);
      expect(result.createdAt).toBe(dbRule.created_at);
      expect(result.updatedAt).toBe(dbRule.updated_at);
      expect(result.deletedAt).toBeNull();
      expect(result.createdBy).toBe(dbRule.created_by);
      expect(result.updatedBy).toBe(dbRule.updated_by);
      expect(result.deletedBy).toBeNull();
    });

    it('should return null for null input', () => {
      const result = mapTaxRuleSetDbToApi(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = mapTaxRuleSetDbToApi(undefined);
      expect(result).toBeNull();
    });
  });

  // ==================== mapTaxBracketDbToApi ====================

  describe('mapTaxBracketDbToApi', () => {
    it('should map database tax bracket to API format', () => {
      // Arrange
      const dbBracket = {
        id: testBracketId,
        organization_id: testOrgId,
        tax_rule_set_id: testRuleSetId,
        bracket_order: 1,
        income_min: 0,
        income_max: 50000,
        rate_percentage: 10.00,
        fixed_amount: 0,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        deleted_at: null
      };

      // Act
      const result = mapTaxBracketDbToApi(dbBracket);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbBracket.id);
      expect(result.organizationId).toBe(dbBracket.organization_id);
      expect(result.taxRuleSetId).toBe(dbBracket.tax_rule_set_id);
      expect(result.bracketOrder).toBe(dbBracket.bracket_order);
      expect(result.minIncome).toBe(dbBracket.income_min);
      expect(result.maxIncome).toBe(dbBracket.income_max);
      expect(result.taxRate).toBe(dbBracket.rate_percentage);
      expect(result.standardDeduction).toBe(0);
      expect(result.additionalDeduction).toBe(0);
      expect(result.createdAt).toBe(dbBracket.created_at);
      expect(result.updatedAt).toBe(dbBracket.updated_at);
      expect(result.deletedAt).toBeNull();
    });

    it('should return null for null input', () => {
      const result = mapTaxBracketDbToApi(null);
      expect(result).toBeNull();
    });

    it('should handle bracket with fixed_amount', () => {
      // Arrange
      const dbBracket = {
        id: testBracketId,
        organization_id: testOrgId,
        tax_rule_set_id: testRuleSetId,
        bracket_order: 2,
        income_min: 50000,
        income_max: 100000,
        rate_percentage: 20.00,
        fixed_amount: 5000,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapTaxBracketDbToApi(dbBracket);

      // Assert
      expect(result.standardDeduction).toBe(5000);
    });

    it('should handle bracket with null fixed_amount', () => {
      // Arrange
      const dbBracket = {
        id: testBracketId,
        organization_id: testOrgId,
        tax_rule_set_id: testRuleSetId,
        bracket_order: 1,
        income_min: 0,
        income_max: 30000,
        rate_percentage: 5.00,
        fixed_amount: null,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapTaxBracketDbToApi(dbBracket);

      // Assert
      expect(result.standardDeduction).toBe(0);
    });
  });

  // ==================== mapTaxRuleSetApiToDb ====================

  describe('mapTaxRuleSetApiToDb', () => {
    it('should map API tax rule set to database format', () => {
      // Arrange
      const apiData = {
        taxType: 'sales',
        taxName: 'State Sales Tax',
        country: 'US',
        state: 'NY',
        locality: 'New York City',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: new Date('2024-12-31'),
        annualCap: 200000,
        calculationMethod: 'flat',
        calculationMode: 'simple',
        description: 'NYC sales tax'
      };

      // Act
      const result = mapTaxRuleSetApiToDb(apiData);

      // Assert
      expect(result).toBeDefined();
      expect(result.tax_type).toBe(apiData.taxType);
      expect(result.tax_name).toBe(apiData.taxName);
      expect(result.country).toBe(apiData.country);
      expect(result.state).toBe(apiData.state);
      expect(result.locality).toBe(apiData.locality);
      expect(result.effective_from).toBe(apiData.effectiveFrom);
      expect(result.effective_to).toBe(apiData.effectiveTo);
      expect(result.annual_cap).toBe(apiData.annualCap);
      expect(result.calculation_method).toBe(apiData.calculationMethod);
      expect(result.calculation_mode).toBe(apiData.calculationMode);
      expect(result.description).toBe(apiData.description);
    });

    it('should return null for null input', () => {
      const result = mapTaxRuleSetApiToDb(null);
      expect(result).toBeNull();
    });

    it('should only include defined fields', () => {
      // Arrange
      const apiData = {
        taxType: 'custom',
        taxName: 'Custom Tax'
      };

      // Act
      const result = mapTaxRuleSetApiToDb(apiData);

      // Assert
      expect(result.tax_type).toBe('custom');
      expect(result.tax_name).toBe('Custom Tax');
      expect(result.country).toBeUndefined();
      expect(result.state).toBeUndefined();
      expect(result.locality).toBeUndefined();
    });
  });
});
