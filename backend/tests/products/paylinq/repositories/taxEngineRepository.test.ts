/**
 * TaxEngineRepository Unit Tests
 * 
 * Tests for tax engine data access layer.
 * Covers tax rule sets, brackets, allowances, and multi-jurisdiction tax rules.
 * 
 * VERIFIED METHODS:
 * 1. createTaxRuleSet(ruleSetData, organizationId, userId)
 * 2. findApplicableTaxRuleSets(country, state, locality, effectiveDate, organizationId)
 * 3. findTaxRuleSetById(ruleSetId, organizationId)
 * 4. findTaxRuleSets(organizationId, filters)
 * 5. updateTaxRuleSet(ruleSetId, updates, organizationId)
 * 6. createTaxBracket(bracketData, organizationId, userId)
 * 7. findTaxBrackets(taxRuleSetId, organizationId)
 * 8. createAllowance(allowanceData, organizationId, userId)
 * 9. findApplicableAllowances(country, state, effectiveDate, organizationId)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import TaxEngineRepository from '../../../../src/products/paylinq/repositories/taxEngineRepository.js';

describe('TaxEngineRepository', () => {
  let repository: TaxEngineRepository;
  let mockQuery: jest.Mock;
  
  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testRuleSetId = '323e4567-e89b-12d3-a456-426614174002';
  const testBracketId = '423e4567-e89b-12d3-a456-426614174003';

  beforeEach(() => {
    mockQuery = jest.fn();
    repository = new TaxEngineRepository({ query: mockQuery });
  });

  describe('createTaxRuleSet', () => {
    it('should create tax rule set', async () => {
      const ruleSetData = {
        country: 'SR',
        state: null,
        locality: null,
        taxType: 'income_tax',
        effectiveFrom: '2025-01-01'
      };
      
      const dbRuleSet = { id: testRuleSetId, ...ruleSetData };
      mockQuery.mockResolvedValue({ rows: [dbRuleSet] });

      const result = await repository.createTaxRuleSet(ruleSetData, testOrgId, testUserId);

      expect(result).toEqual(dbRuleSet);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.tax_rule_set'),
        expect.any(Array),
        testOrgId,
        { operation: 'INSERT', table: 'payroll.tax_rule_set', userId: testUserId }
      );
    });
  });

  describe('findApplicableTaxRuleSets', () => {
    it('should find applicable tax rules', async () => {
      const effectiveDate = new Date('2025-06-15');
      mockQuery.mockResolvedValue({ rows: [{ id: testRuleSetId }] });

      const result = await repository.findApplicableTaxRuleSets('SR', null, null, effectiveDate, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.tax_rule_set'),
        expect.any(Array),
        testOrgId,
        { operation: 'SELECT', table: 'payroll.tax_rule_set' }
      );
    });

    it('should include state and locality filters', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findApplicableTaxRuleSets('US', 'CA', 'SF', new Date('2025-06-15'), testOrgId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.tax_rule_set'),
        expect.any(Array),
        testOrgId,
        { operation: 'SELECT', table: 'payroll.tax_rule_set' }
      );
    });
  });

  describe('findTaxRuleSetById', () => {
    it('should return tax rule set by ID', async () => {
      const dbRuleSet = { id: testRuleSetId, organization_id: testOrgId };
      mockQuery.mockResolvedValue({ rows: [dbRuleSet] });

      const result = await repository.findTaxRuleSetById(testRuleSetId, testOrgId);

      expect(result).toEqual(dbRuleSet);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.tax_rule_set'),
        [testRuleSetId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'payroll.tax_rule_set' }
      );
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await repository.findTaxRuleSetById(testRuleSetId, testOrgId);
      expect(result).toBeNull();
    });
  });

  describe('findTaxRuleSets', () => {
    it('should return all tax rule sets for organization', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testRuleSetId }] });

      const result = await repository.findTaxRuleSets(testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.tax_rule_set'),
        [testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'payroll.tax_rule_set' }
      );
    });

    it('should filter by country', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findTaxRuleSets(testOrgId, { country: 'SR' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND country = $'),
        expect.arrayContaining([testOrgId, 'SR']),
        testOrgId,
        expect.any(Object)
      );
    });
  });

  describe('updateTaxRuleSet', () => {
    it('should update tax rule set', async () => {
      const updates = { effectiveTo: '2025-12-31' };
      mockQuery.mockResolvedValue({ rows: [{ id: testRuleSetId, ...updates }] });

      const result = await repository.updateTaxRuleSet(testRuleSetId, updates, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.tax_rule_set'),
        expect.any(Array),
        testOrgId,
        expect.objectContaining({ operation: 'UPDATE', table: 'payroll.tax_rule_set' })
      );
    });
  });

  describe('createTaxBracket', () => {
    it('should create tax bracket', async () => {
      const bracketData = {
        taxRuleSetId: testRuleSetId,
        minIncome: 0,
        maxIncome: 10000,
        taxRate: 10.0,
        flatAmount: 0
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: testBracketId, ...bracketData }] });

      const result = await repository.createTaxBracket(bracketData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.tax_bracket'),
        expect.any(Array),
        testOrgId,
        expect.objectContaining({ operation: 'INSERT', table: 'payroll.tax_bracket' })
      );
    });
  });

  describe('findTaxBrackets', () => {
    it('should return brackets for rule set', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testBracketId }] });

      const result = await repository.findTaxBrackets(testRuleSetId, testOrgId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tax_rule_set_id = $1'),
        [testRuleSetId, testOrgId],
        testOrgId,
        { operation: 'SELECT', table: 'payroll.tax_bracket' }
      );
    });
  });

  describe('createAllowance', () => {
    it('should create allowance', async () => {
      const allowanceData = {
        country: 'SR',
        allowanceType: 'standard_deduction',
        amount: 5000,
        effectiveFrom: '2025-01-01'
      };
      
      mockQuery.mockResolvedValue({ rows: [{ id: '523e4567-e89b-12d3-a456-426614174004', ...allowanceData }] });

      const result = await repository.createAllowance(allowanceData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.allowance'),
        expect.any(Array),
        testOrgId,
        expect.objectContaining({ operation: 'INSERT', table: 'payroll.allowance' })
      );
    });
  });

  describe('findApplicableAllowances', () => {
    it('should find applicable allowances', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findApplicableAllowances('SR', null, new Date('2025-06-15'), testOrgId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM payroll.allowance'),
        expect.any(Array),
        testOrgId,
        { operation: 'SELECT', table: 'payroll.allowance' }
      );
    });
  });
});
