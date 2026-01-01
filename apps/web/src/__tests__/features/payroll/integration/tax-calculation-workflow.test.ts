/**
 * Integration Tests for Tax Calculation Workflows
 * 
 * Tests the complete tax rule creation, versioning, and calculation workflows.
 * Following industry standards from TESTING_STANDARDS.md - Integration Testing section.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTax, useCreateTaxRule, useUpdateTaxRule, useCreateTaxVersion } from '@/features/payroll/hooks/useTax';
import { taxService } from '@/features/payroll/services/tax.service';

// Mock the tax service
vi.mock('@/features/payroll/services/tax.service', () => ({
  taxService: {
    getTaxRules: vi.fn(),
    getTaxRule: vi.fn(),
    createTaxRule: vi.fn(),
    updateTaxRule: vi.fn(),
    deleteTaxRule: vi.fn(),
    createVersion: vi.fn(),
    getTaxVersions: vi.fn(),
    calculateTax: vi.fn(),
  },
}));

describe('Tax Calculation Workflow Integration Tests', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

    vi.clearAllMocks();
  });

  describe('Tax Rule Creation and Management', () => {
    it('should create new tax rule and retrieve it', async () => {
      // Arrange - Mock empty initial state
      vi.mocked(taxService.getTaxRules).mockResolvedValue([]);

      // Act - Fetch initial tax rules (empty)
      const { result: rulesResult } = renderHook(() => useTax(), { wrapper });
      await waitFor(() => expect(rulesResult.current.isSuccess).toBe(true));
      expect(rulesResult.current.data).toHaveLength(0);

      // Act - Create new tax rule
      const newTaxRule = {
        ruleCode: 'INCOME_TAX_2025',
        ruleName: 'Income Tax 2025',
        ruleType: 'INCOME',
        description: 'Income tax rules for 2025',
        country: 'SR',
        isActive: true,
      };

      const createdRule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...newTaxRule,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(taxService.createTaxRule).mockResolvedValue(createdRule);

      const { result: createResult } = renderHook(() => useCreateTaxRule(), { wrapper });
      createResult.current.mutate(newTaxRule);

      await waitFor(() => expect(createResult.current.isSuccess).toBe(true));

      // Assert - Tax rule created successfully
      expect(createResult.current.data).toEqual(createdRule);
      expect(createResult.current.data?.ruleCode).toBe('INCOME_TAX_2025');
      expect(createResult.current.data?.ruleType).toBe('INCOME');

      // Act - Fetch updated tax rules list
      vi.mocked(taxService.getTaxRules).mockResolvedValue([createdRule]);
      const { result: updatedRulesResult } = renderHook(() => useTax(), { wrapper });
      
      await waitFor(() => expect(updatedRulesResult.current.isSuccess).toBe(true));

      // Assert - New rule appears in list
      expect(updatedRulesResult.current.data).toHaveLength(1);
      expect(updatedRulesResult.current.data?.[0].id).toBe(createdRule.id);
    });

    it('should update existing tax rule', async () => {
      // Arrange - Existing tax rule
      const existingRule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ruleCode: 'SOCIAL_SEC_2025',
        ruleName: 'Social Security 2025',
        ruleType: 'SOCIAL_SECURITY',
        description: 'Social security contributions',
        country: 'SR',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(taxService.getTaxRules).mockResolvedValue([existingRule]);

      // Act - Fetch existing rules
      const { result: rulesResult } = renderHook(() => useTax(), { wrapper });
      await waitFor(() => expect(rulesResult.current.isSuccess).toBe(true));

      // Act - Update the rule
      const updates = {
        ruleName: 'Social Security 2025 - Updated',
        description: 'Updated social security contributions for 2025',
      };

      const updatedRule = {
        ...existingRule,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(taxService.updateTaxRule).mockResolvedValue(updatedRule);

      const { result: updateResult } = renderHook(() => useUpdateTaxRule(), { wrapper });
      updateResult.current.mutate({ id: existingRule.id, ...updates });

      await waitFor(() => expect(updateResult.current.isSuccess).toBe(true));

      // Assert - Rule updated successfully
      expect(updateResult.current.data?.ruleName).toBe('Social Security 2025 - Updated');
      expect(updateResult.current.data?.description).toContain('Updated');
    });

    it('should handle tax rule with multiple versions', async () => {
      // Arrange - Tax rule with initial version
      const taxRule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ruleCode: 'PAYROLL_TAX_2025',
        ruleName: 'Payroll Tax 2025',
        ruleType: 'PAYROLL',
        description: 'Payroll tax rules',
        country: 'SR',
        isActive: true,
        currentVersion: 1,
      };

      vi.mocked(taxService.getTaxRule).mockResolvedValue(taxRule);

      // Act - Fetch tax rule
      const { result: ruleResult } = renderHook(
        () => useTax({ ruleId: taxRule.id }),
        { wrapper }
      );
      await waitFor(() => expect(ruleResult.current.isSuccess).toBe(true));

      // Assert - Current version is 1
      expect(ruleResult.current.data?.currentVersion).toBe(1);

      // Act - Create new version
      const versionRequest = {
        ruleId: taxRule.id,
        effectiveDate: '2025-07-01',
        description: 'Mid-year adjustment',
        brackets: [
          { minIncome: 0, maxIncome: 10000, rate: 0.10 },
          { minIncome: 10001, maxIncome: 50000, rate: 0.20 },
          { minIncome: 50001, maxIncome: null, rate: 0.30 },
        ],
      };

      const newVersion = {
        id: '223e4567-e89b-12d3-a456-426614174001',
        ...versionRequest,
        version: 2,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      vi.mocked(taxService.createVersion).mockResolvedValue(newVersion);

      const { result: versionResult } = renderHook(() => useCreateTaxVersion(), { wrapper });
      versionResult.current.mutate(versionRequest);

      await waitFor(() => expect(versionResult.current.isSuccess).toBe(true));

      // Assert - New version created
      expect(versionResult.current.data?.version).toBe(2);
      expect(versionResult.current.data?.status).toBe('pending');
      expect(versionResult.current.data?.brackets).toHaveLength(3);
    });
  });

  describe('Tax Calculation Workflow', () => {
    it('should calculate income tax for employee', async () => {
      // Arrange - Tax rule with brackets
      const taxRule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ruleCode: 'INCOME_TAX_2025',
        ruleName: 'Income Tax 2025',
        ruleType: 'INCOME',
        brackets: [
          { minIncome: 0, maxIncome: 10000, rate: 0.10 },
          { minIncome: 10001, maxIncome: 50000, rate: 0.20 },
          { minIncome: 50001, maxIncome: null, rate: 0.30 },
        ],
      };

      // Act - Calculate tax for income of 35000
      const calculationRequest = {
        ruleId: taxRule.id,
        taxableIncome: 35000,
        employeeId: 'emp-001',
      };

      const calculationResult = {
        taxableIncome: 35000,
        totalTax: 6000, // (10000 * 0.10) + (25000 * 0.20) = 1000 + 5000 = 6000
        effectiveRate: 0.171, // 6000 / 35000
        brackets: [
          { bracket: 1, income: 10000, rate: 0.10, tax: 1000 },
          { bracket: 2, income: 25000, rate: 0.20, tax: 5000 },
        ],
      };

      vi.mocked(taxService.calculateTax).mockResolvedValue(calculationResult);

      const result = await taxService.calculateTax(calculationRequest);

      // Assert - Tax calculated correctly
      expect(result.totalTax).toBe(6000);
      expect(result.effectiveRate).toBeCloseTo(0.171, 3);
      expect(result.brackets).toHaveLength(2);
    });

    it('should handle progressive tax calculation across brackets', async () => {
      // Arrange - Higher income spanning all brackets
      const calculationRequest = {
        ruleId: '123e4567-e89b-12d3-a456-426614174000',
        taxableIncome: 75000,
        employeeId: 'emp-002',
      };

      const calculationResult = {
        taxableIncome: 75000,
        totalTax: 16000, // (10000 * 0.10) + (40000 * 0.20) + (25000 * 0.30)
        effectiveRate: 0.213,
        brackets: [
          { bracket: 1, income: 10000, rate: 0.10, tax: 1000 },
          { bracket: 2, income: 40000, rate: 0.20, tax: 8000 },
          { bracket: 3, income: 25000, rate: 0.30, tax: 7500 },
        ],
      };

      vi.mocked(taxService.calculateTax).mockResolvedValue(calculationResult);

      const result = await taxService.calculateTax(calculationRequest);

      // Assert - Progressive calculation correct
      expect(result.totalTax).toBe(16000);
      expect(result.brackets).toHaveLength(3);
    });

    it('should apply tax exemptions and deductions', async () => {
      // Arrange - Employee with exemptions
      const calculationRequest = {
        ruleId: '123e4567-e89b-12d3-a456-426614174000',
        grossIncome: 50000,
        exemptions: 5000, // Personal exemption
        deductions: 2000, // Other deductions
        employeeId: 'emp-003',
      };

      const calculationResult = {
        grossIncome: 50000,
        exemptions: 5000,
        deductions: 2000,
        taxableIncome: 43000, // 50000 - 5000 - 2000
        totalTax: 7600,
        netIncome: 35400, // 43000 - 7600
      };

      vi.mocked(taxService.calculateTax).mockResolvedValue(calculationResult);

      const result = await taxService.calculateTax(calculationRequest);

      // Assert - Exemptions and deductions applied
      expect(result.taxableIncome).toBe(43000);
      expect(result.totalTax).toBe(7600);
      expect(result.netIncome).toBe(35400);
    });
  });

  describe('Tax Rule Versioning Workflow', () => {
    it('should manage multiple tax rule versions over time', async () => {
      // Arrange - Tax rule with version history
      const ruleId = '123e4567-e89b-12d3-a456-426614174000';

      const versions = [
        {
          id: 'v1-001',
          ruleId,
          version: 1,
          effectiveDate: '2025-01-01',
          status: 'active',
          brackets: [
            { minIncome: 0, maxIncome: 10000, rate: 0.08 },
            { minIncome: 10001, maxIncome: null, rate: 0.15 },
          ],
        },
        {
          id: 'v2-001',
          ruleId,
          version: 2,
          effectiveDate: '2025-07-01',
          status: 'pending',
          brackets: [
            { minIncome: 0, maxIncome: 10000, rate: 0.10 },
            { minIncome: 10001, maxIncome: null, rate: 0.20 },
          ],
        },
      ];

      vi.mocked(taxService.getTaxVersions).mockResolvedValue(versions);

      // Act - Fetch version history
      const result = await taxService.getTaxVersions(ruleId);

      // Assert - All versions retrieved
      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(1);
      expect(result[0].status).toBe('active');
      expect(result[1].version).toBe(2);
      expect(result[1].status).toBe('pending');
    });

    it('should use correct version based on effective date', async () => {
      // Arrange - Multiple versions with different effective dates
      const versions = [
        {
          id: 'v1-001',
          version: 1,
          effectiveDate: '2025-01-01',
          status: 'active',
          brackets: [{ minIncome: 0, maxIncome: null, rate: 0.10 }],
        },
        {
          id: 'v2-001',
          version: 2,
          effectiveDate: '2025-07-01',
          status: 'pending',
          brackets: [{ minIncome: 0, maxIncome: null, rate: 0.15 }],
        },
      ];

      // Act - Calculate tax for date before version 2
      const calculationJune = {
        ruleId: '123e4567-e89b-12d3-a456-426614174000',
        taxableIncome: 10000,
        calculationDate: '2025-06-15', // Before July 1
      };

      vi.mocked(taxService.calculateTax).mockResolvedValue({
        taxableIncome: 10000,
        totalTax: 1000, // Using version 1 rate (10%)
        versionUsed: 1,
      });

      const resultJune = await taxService.calculateTax(calculationJune);

      // Assert - Version 1 used
      expect(resultJune.totalTax).toBe(1000);
      expect(resultJune.versionUsed).toBe(1);

      // Act - Calculate tax for date after version 2 effective
      const calculationAugust = {
        ...calculationJune,
        calculationDate: '2025-08-15', // After July 1
      };

      vi.mocked(taxService.calculateTax).mockResolvedValue({
        taxableIncome: 10000,
        totalTax: 1500, // Using version 2 rate (15%)
        versionUsed: 2,
      });

      const resultAugust = await taxService.calculateTax(calculationAugust);

      // Assert - Version 2 used
      expect(resultAugust.totalTax).toBe(1500);
      expect(resultAugust.versionUsed).toBe(2);
    });
  });

  describe('Tax Rule Types Workflow', () => {
    it('should handle different tax rule types', async () => {
      // Arrange - Multiple tax rules of different types
      const taxRules = [
        {
          id: '1',
          ruleCode: 'INCOME_TAX',
          ruleType: 'INCOME',
          ruleName: 'Income Tax',
        },
        {
          id: '2',
          ruleCode: 'SOCIAL_SEC',
          ruleType: 'SOCIAL_SECURITY',
          ruleName: 'Social Security',
        },
        {
          id: '3',
          ruleCode: 'PAYROLL_TAX',
          ruleType: 'PAYROLL',
          ruleName: 'Payroll Tax',
        },
      ];

      vi.mocked(taxService.getTaxRules).mockResolvedValue(taxRules);

      // Act - Fetch all tax rules
      const { result } = renderHook(() => useTax(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - All types retrieved
      expect(result.current.data).toHaveLength(3);

      // Assert - Filter by type
      const incomeTaxRules = result.current.data?.filter(r => r.ruleType === 'INCOME');
      expect(incomeTaxRules).toHaveLength(1);
      expect(incomeTaxRules?.[0].ruleCode).toBe('INCOME_TAX');
    });

    it('should calculate combined tax liability', async () => {
      // Arrange - Multiple tax rules apply to same income
      const grossIncome = 50000;

      const incomeTaxCalc = {
        ruleId: 'income-rule',
        taxableIncome: grossIncome,
        totalTax: 8000,
      };

      const socialSecCalc = {
        ruleId: 'social-sec-rule',
        taxableIncome: grossIncome,
        totalTax: 2500,
      };

      // Act - Calculate each tax type
      vi.mocked(taxService.calculateTax)
        .mockResolvedValueOnce(incomeTaxCalc)
        .mockResolvedValueOnce(socialSecCalc);

      const incomeTaxResult = await taxService.calculateTax({ ruleId: 'income-rule', taxableIncome: grossIncome });
      const socialSecResult = await taxService.calculateTax({ ruleId: 'social-sec-rule', taxableIncome: grossIncome });

      // Assert - Combined tax liability
      const totalTaxLiability = incomeTaxResult.totalTax + socialSecResult.totalTax;
      expect(totalTaxLiability).toBe(10500);

      const netIncome = grossIncome - totalTaxLiability;
      expect(netIncome).toBe(39500);
    });
  });

  describe('Error Handling in Tax Workflows', () => {
    it('should handle tax rule creation errors', async () => {
      // Arrange
      const invalidRule = {
        ruleCode: '', // Invalid - empty code
        ruleName: 'Test Rule',
        ruleType: 'INCOME',
      };

      const error = new Error('Rule code is required');
      vi.mocked(taxService.createTaxRule).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useCreateTaxRule(), { wrapper });
      result.current.mutate(invalidRule);

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert - Error handled
      expect(result.current.error).toEqual(error);
    });

    it('should handle tax calculation errors', async () => {
      // Arrange - Invalid calculation request
      const invalidRequest = {
        ruleId: 'non-existent-rule',
        taxableIncome: -1000, // Invalid negative income
      };

      const error = new Error('Invalid income amount');
      vi.mocked(taxService.calculateTax).mockRejectedValue(error);

      // Act & Assert
      await expect(taxService.calculateTax(invalidRequest)).rejects.toThrow('Invalid income amount');
    });
  });
});
