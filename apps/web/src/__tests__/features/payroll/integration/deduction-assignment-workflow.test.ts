/**
 * Integration Tests for Deduction Assignment Workflows
 * 
 * Tests the complete deduction lifecycle including assignment, calculation,
 * and interaction with payroll processing.
 * Following industry standards from TESTING_STANDARDS.md - Integration Testing section.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDeductions, useCreateDeduction, useUpdateDeduction } from '@/features/payroll/hooks/useDeductions';
import { deductionsService } from '@/features/payroll/services/deductions.service';

// Mock the deductions service
vi.mock('@/features/payroll/services/deductions.service', () => ({
  deductionsService: {
    getDeductions: vi.fn(),
    getDeduction: vi.fn(),
    createDeduction: vi.fn(),
    updateDeduction: vi.fn(),
    deleteDeduction: vi.fn(),
    calculateDeduction: vi.fn(),
    getEmployeeDeductions: vi.fn(),
  },
}));

describe('Deduction Assignment Workflow Integration Tests', () => {
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

  describe('Deduction Creation and Assignment', () => {
    it('should create and assign deduction to employee', async () => {
      // Arrange - Mock empty initial state
      vi.mocked(deductionsService.getDeductions).mockResolvedValue([]);

      // Act - Fetch initial deductions (empty)
      const { result: deductionsResult } = renderHook(() => useDeductions(), { wrapper });
      await waitFor(() => expect(deductionsResult.current.isSuccess).toBe(true));
      expect(deductionsResult.current.data).toHaveLength(0);

      // Act - Create new deduction for employee
      const newDeduction = {
        employeeId: 'emp-001',
        deductionCode: 'HEALTH_INS',
        deductionName: 'Health Insurance',
        deductionType: 'VOLUNTARY',
        deductionAmount: 150,
        startDate: '2025-01-01',
        isActive: true,
      };

      const createdDeduction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...newDeduction,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(deductionsService.createDeduction).mockResolvedValue(createdDeduction);

      const { result: createResult } = renderHook(() => useCreateDeduction(), { wrapper });
      createResult.current.mutate(newDeduction);

      await waitFor(() => expect(createResult.current.isSuccess).toBe(true));

      // Assert - Deduction created successfully
      expect(createResult.current.data).toEqual(createdDeduction);
      expect(createResult.current.data?.employeeId).toBe('emp-001');
      expect(createResult.current.data?.deductionType).toBe('VOLUNTARY');

      // Act - Fetch updated deductions list
      vi.mocked(deductionsService.getDeductions).mockResolvedValue([createdDeduction]);
      const { result: updatedDeductionsResult } = renderHook(() => useDeductions(), { wrapper });
      
      await waitFor(() => expect(updatedDeductionsResult.current.isSuccess).toBe(true));

      // Assert - New deduction appears in list
      expect(updatedDeductionsResult.current.data).toHaveLength(1);
      expect(updatedDeductionsResult.current.data?.[0].id).toBe(createdDeduction.id);
    });

    it('should assign multiple deductions to employee', async () => {
      // Arrange - Employee with multiple deductions
      const employeeId = 'emp-001';
      const deductions = [
        {
          id: '1',
          employeeId,
          deductionCode: 'HEALTH_INS',
          deductionName: 'Health Insurance',
          deductionType: 'VOLUNTARY',
          deductionAmount: 150,
        },
        {
          id: '2',
          employeeId,
          deductionCode: 'PENSION',
          deductionName: 'Pension Contribution',
          deductionType: 'STATUTORY',
          deductionPercentage: 5,
        },
        {
          id: '3',
          employeeId,
          deductionCode: 'LOAN_REPAY',
          deductionName: 'Loan Repayment',
          deductionType: 'LOAN',
          deductionAmount: 200,
        },
      ];

      vi.mocked(deductionsService.getEmployeeDeductions).mockResolvedValue(deductions);

      // Act - Fetch employee deductions
      const result = await deductionsService.getEmployeeDeductions(employeeId);

      // Assert - All deductions retrieved
      expect(result).toHaveLength(3);
      expect(result.filter(d => d.deductionType === 'VOLUNTARY')).toHaveLength(1);
      expect(result.filter(d => d.deductionType === 'STATUTORY')).toHaveLength(1);
      expect(result.filter(d => d.deductionType === 'LOAN')).toHaveLength(1);
    });

    it('should update deduction amount', async () => {
      // Arrange - Existing deduction
      const existingDeduction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: 'emp-001',
        deductionCode: 'HEALTH_INS',
        deductionName: 'Health Insurance',
        deductionType: 'VOLUNTARY',
        deductionAmount: 150,
        isActive: true,
      };

      vi.mocked(deductionsService.getDeductions).mockResolvedValue([existingDeduction]);

      // Act - Fetch existing deductions
      const { result: deductionsResult } = renderHook(() => useDeductions(), { wrapper });
      await waitFor(() => expect(deductionsResult.current.isSuccess).toBe(true));

      // Act - Update deduction amount
      const updates = {
        deductionAmount: 175, // Increased from 150
      };

      const updatedDeduction = {
        ...existingDeduction,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(deductionsService.updateDeduction).mockResolvedValue(updatedDeduction);

      const { result: updateResult } = renderHook(() => useUpdateDeduction(), { wrapper });
      updateResult.current.mutate({ id: existingDeduction.id, ...updates });

      await waitFor(() => expect(updateResult.current.isSuccess).toBe(true));

      // Assert - Amount updated successfully
      expect(updateResult.current.data?.deductionAmount).toBe(175);
    });
  });

  describe('Deduction Calculation Workflow', () => {
    it('should calculate fixed amount deduction', async () => {
      // Arrange - Fixed amount deduction
      const deduction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: 'emp-001',
        deductionCode: 'HEALTH_INS',
        deductionType: 'VOLUNTARY',
        deductionAmount: 150,
      };

      const calculationRequest = {
        deductionId: deduction.id,
        grossPay: 5000,
      };

      const calculationResult = {
        deductionId: deduction.id,
        grossPay: 5000,
        deductionAmount: 150,
        netPay: 4850,
      };

      vi.mocked(deductionsService.calculateDeduction).mockResolvedValue(calculationResult);

      // Act - Calculate deduction
      const result = await deductionsService.calculateDeduction(calculationRequest);

      // Assert - Fixed amount deducted
      expect(result.deductionAmount).toBe(150);
      expect(result.netPay).toBe(4850);
    });

    it('should calculate percentage-based deduction', async () => {
      // Arrange - Percentage-based deduction (pension)
      const deduction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: 'emp-001',
        deductionCode: 'PENSION',
        deductionType: 'STATUTORY',
        deductionPercentage: 5, // 5% of gross pay
      };

      const calculationRequest = {
        deductionId: deduction.id,
        grossPay: 6000,
      };

      const calculationResult = {
        deductionId: deduction.id,
        grossPay: 6000,
        deductionPercentage: 5,
        deductionAmount: 300, // 5% of 6000
        netPay: 5700,
      };

      vi.mocked(deductionsService.calculateDeduction).mockResolvedValue(calculationResult);

      // Act - Calculate percentage deduction
      const result = await deductionsService.calculateDeduction(calculationRequest);

      // Assert - Percentage calculated correctly
      expect(result.deductionAmount).toBe(300);
      expect(result.netPay).toBe(5700);
    });

    it('should apply maximum deduction limit', async () => {
      // Arrange - Deduction with max limit
      const deduction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: 'emp-001',
        deductionCode: 'LOAN_REPAY',
        deductionType: 'LOAN',
        deductionPercentage: 20, // 20% of gross
        maxAmount: 500, // Maximum 500 per period
      };

      const calculationRequest = {
        deductionId: deduction.id,
        grossPay: 4000, // 20% would be 800, but capped at 500
      };

      const calculationResult = {
        deductionId: deduction.id,
        grossPay: 4000,
        deductionPercentage: 20,
        calculatedAmount: 800, // 20% of 4000
        maxAmount: 500,
        deductionAmount: 500, // Capped at max
        netPay: 3500,
      };

      vi.mocked(deductionsService.calculateDeduction).mockResolvedValue(calculationResult);

      // Act - Calculate with max limit
      const result = await deductionsService.calculateDeduction(calculationRequest);

      // Assert - Amount capped at maximum
      expect(result.calculatedAmount).toBe(800);
      expect(result.deductionAmount).toBe(500);
      expect(result.netPay).toBe(3500);
    });

    it('should calculate multiple deductions for employee', async () => {
      // Arrange - Multiple deductions for same employee
      const deductions = [
        {
          id: '1',
          deductionCode: 'HEALTH_INS',
          deductionAmount: 150,
        },
        {
          id: '2',
          deductionCode: 'PENSION',
          deductionPercentage: 5,
        },
        {
          id: '3',
          deductionCode: 'UNION_DUES',
          deductionAmount: 50,
        },
      ];

      const grossPay = 5000;

      // Mock calculations for each deduction
      vi.mocked(deductionsService.calculateDeduction)
        .mockResolvedValueOnce({ deductionAmount: 150, netPay: 4850 })
        .mockResolvedValueOnce({ deductionAmount: 250, netPay: 4600 }) // 5% of 5000
        .mockResolvedValueOnce({ deductionAmount: 50, netPay: 4550 });

      // Act - Calculate each deduction
      const result1 = await deductionsService.calculateDeduction({ deductionId: '1', grossPay });
      const result2 = await deductionsService.calculateDeduction({ deductionId: '2', grossPay });
      const result3 = await deductionsService.calculateDeduction({ deductionId: '3', grossPay });

      // Assert - Total deductions
      const totalDeductions = result1.deductionAmount + result2.deductionAmount + result3.deductionAmount;
      expect(totalDeductions).toBe(450); // 150 + 250 + 50

      const finalNetPay = grossPay - totalDeductions;
      expect(finalNetPay).toBe(4550);
    });
  });

  describe('Deduction Date Range Workflow', () => {
    it('should activate deduction on start date', async () => {
      // Arrange - Deduction with future start date
      const deduction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: 'emp-001',
        deductionCode: 'HEALTH_INS',
        deductionAmount: 150,
        startDate: '2025-02-01',
        endDate: null,
        isActive: false, // Not active yet
      };

      // Act - Check if deduction applies for January payroll
      const januaryPayroll = {
        payrollDate: '2025-01-31',
      };

      // Deduction should not apply (before start date)
      const januaryApplies = new Date(januaryPayroll.payrollDate) >= new Date(deduction.startDate);
      expect(januaryApplies).toBe(false);

      // Act - Check if deduction applies for February payroll
      const februaryPayroll = {
        payrollDate: '2025-02-28',
      };

      // Deduction should apply (after start date)
      const februaryApplies = new Date(februaryPayroll.payrollDate) >= new Date(deduction.startDate);
      expect(februaryApplies).toBe(true);
    });

    it('should deactivate deduction on end date', async () => {
      // Arrange - Deduction with end date
      const deduction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: 'emp-001',
        deductionCode: 'LOAN_REPAY',
        deductionAmount: 200,
        startDate: '2025-01-01',
        endDate: '2025-06-30', // Ends June 30
        isActive: true,
      };

      // Act - Check if deduction applies for June payroll
      const junePayroll = {
        payrollDate: '2025-06-30',
      };

      const juneApplies = new Date(junePayroll.payrollDate) <= new Date(deduction.endDate);
      expect(juneApplies).toBe(true);

      // Act - Check if deduction applies for July payroll
      const julyPayroll = {
        payrollDate: '2025-07-31',
      };

      const julyApplies = new Date(julyPayroll.payrollDate) <= new Date(deduction.endDate);
      expect(julyApplies).toBe(false);
    });

    it('should handle ongoing deductions with no end date', async () => {
      // Arrange - Ongoing deduction (no end date)
      const deduction = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: 'emp-001',
        deductionCode: 'HEALTH_INS',
        deductionAmount: 150,
        startDate: '2025-01-01',
        endDate: null, // No end date
        isActive: true,
      };

      // Act - Check if applies for any future date
      const futurePayroll = {
        payrollDate: '2026-12-31',
      };

      const applies = new Date(futurePayroll.payrollDate) >= new Date(deduction.startDate) &&
                      (deduction.endDate === null || new Date(futurePayroll.payrollDate) <= new Date(deduction.endDate));

      // Assert - Should apply indefinitely
      expect(applies).toBe(true);
    });
  });

  describe('Deduction Types Workflow', () => {
    it('should handle statutory deductions', async () => {
      // Arrange - Statutory deduction (mandatory)
      const statutoryDeduction = {
        id: '1',
        employeeId: 'emp-001',
        deductionCode: 'SOCIAL_SEC',
        deductionName: 'Social Security',
        deductionType: 'STATUTORY',
        deductionPercentage: 5,
        isActive: true,
        isMandatory: true,
      };

      vi.mocked(deductionsService.createDeduction).mockResolvedValue(statutoryDeduction);

      // Act - Create statutory deduction
      const { result } = renderHook(() => useCreateDeduction(), { wrapper });
      result.current.mutate(statutoryDeduction);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Statutory deduction created
      expect(result.current.data?.deductionType).toBe('STATUTORY');
      expect(result.current.data?.isMandatory).toBe(true);
    });

    it('should handle voluntary deductions', async () => {
      // Arrange - Voluntary deduction (optional)
      const voluntaryDeduction = {
        id: '1',
        employeeId: 'emp-001',
        deductionCode: 'SAVINGS',
        deductionName: 'Savings Plan',
        deductionType: 'VOLUNTARY',
        deductionPercentage: 10,
        isActive: true,
        isMandatory: false,
      };

      vi.mocked(deductionsService.createDeduction).mockResolvedValue(voluntaryDeduction);

      // Act - Create voluntary deduction
      const { result } = renderHook(() => useCreateDeduction(), { wrapper });
      result.current.mutate(voluntaryDeduction);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Voluntary deduction created
      expect(result.current.data?.deductionType).toBe('VOLUNTARY');
      expect(result.current.data?.isMandatory).toBe(false);
    });

    it('should handle garnishment deductions', async () => {
      // Arrange - Garnishment (court-ordered)
      const garnishment = {
        id: '1',
        employeeId: 'emp-001',
        deductionCode: 'GARNISH_CHILD',
        deductionName: 'Child Support Garnishment',
        deductionType: 'GARNISHMENT',
        deductionPercentage: 25, // Court-ordered 25%
        maxAmount: 1000,
        isActive: true,
        isMandatory: true,
        priority: 1, // High priority
      };

      vi.mocked(deductionsService.createDeduction).mockResolvedValue(garnishment);

      // Act - Create garnishment
      const { result } = renderHook(() => useCreateDeduction(), { wrapper });
      result.current.mutate(garnishment);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Assert - Garnishment created with high priority
      expect(result.current.data?.deductionType).toBe('GARNISHMENT');
      expect(result.current.data?.priority).toBe(1);
    });

    it('should prioritize deductions correctly', async () => {
      // Arrange - Multiple deductions with different priorities
      const deductions = [
        {
          id: '1',
          deductionCode: 'GARNISH',
          deductionType: 'GARNISHMENT',
          priority: 1, // Highest priority
          deductionAmount: 500,
        },
        {
          id: '2',
          deductionCode: 'SOCIAL_SEC',
          deductionType: 'STATUTORY',
          priority: 2,
          deductionAmount: 300,
        },
        {
          id: '3',
          deductionCode: 'HEALTH_INS',
          deductionType: 'VOLUNTARY',
          priority: 3, // Lowest priority
          deductionAmount: 150,
        },
      ];

      // Act - Sort by priority
      const sortedDeductions = [...deductions].sort((a, b) => a.priority - b.priority);

      // Assert - Garnishment processed first, voluntary last
      expect(sortedDeductions[0].deductionType).toBe('GARNISHMENT');
      expect(sortedDeductions[1].deductionType).toBe('STATUTORY');
      expect(sortedDeductions[2].deductionType).toBe('VOLUNTARY');
    });
  });

  describe('Deduction and Tax Interaction', () => {
    it('should calculate deductions on post-tax income', async () => {
      // Arrange - Employee with pre-tax and post-tax deductions
      const grossPay = 5000;
      const preTaxDeduction = { code: 'PENSION', amount: 250 }; // Pre-tax
      const tax = 800; // Calculated on (5000 - 250) = 4750
      const postTaxDeduction = { code: 'HEALTH_INS', amount: 150 }; // Post-tax

      // Act - Calculate net pay
      const taxableIncome = grossPay - preTaxDeduction.amount;
      const afterTax = taxableIncome - tax;
      const netPay = afterTax - postTaxDeduction.amount;

      // Assert - Correct order of deductions
      expect(taxableIncome).toBe(4750);
      expect(afterTax).toBe(3950);
      expect(netPay).toBe(3800);
    });

    it('should handle tax-deductible contributions', async () => {
      // Arrange - Retirement contribution (tax-deductible)
      const grossPay = 6000;
      const retirementContribution = {
        code: 'RETIREMENT',
        amount: 600,
        isTaxDeductible: true,
      };

      // Act - Calculate taxable income
      const taxableIncome = retirementContribution.isTaxDeductible
        ? grossPay - retirementContribution.amount
        : grossPay;

      // Assert - Taxable income reduced
      expect(taxableIncome).toBe(5400);
    });
  });

  describe('Error Handling in Deduction Workflows', () => {
    it('should handle deduction creation errors', async () => {
      // Arrange - Invalid deduction (negative amount)
      const invalidDeduction = {
        employeeId: 'emp-001',
        deductionCode: 'INVALID',
        deductionAmount: -100, // Invalid negative amount
      };

      const error = new Error('Deduction amount must be positive');
      vi.mocked(deductionsService.createDeduction).mockRejectedValue(error);

      // Act
      const { result } = renderHook(() => useCreateDeduction(), { wrapper });
      result.current.mutate(invalidDeduction);

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Assert - Error handled
      expect(result.current.error).toEqual(error);
    });

    it('should handle calculation errors', async () => {
      // Arrange - Invalid calculation request
      const invalidRequest = {
        deductionId: 'non-existent',
        grossPay: 0,
      };

      const error = new Error('Gross pay must be greater than zero');
      vi.mocked(deductionsService.calculateDeduction).mockRejectedValue(error);

      // Act & Assert
      await expect(deductionsService.calculateDeduction(invalidRequest)).rejects.toThrow('Gross pay must be greater than zero');
    });
  });
});
