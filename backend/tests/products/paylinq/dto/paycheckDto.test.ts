/**
 * Paycheck DTO Unit Tests
 * 
 * Tests for paycheck data transformation functions.
 * Validates snake_case (DB) to camelCase (API) conversion.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Pure function testing
 * - EXACT function names from DTO (verified against source)
 * 
 * VERIFIED FUNCTIONS (from source analysis):
 * 1. mapPaycheckToDto(paycheck)
 * 2. mapPaychecksToDto(paychecks)
 */

import { describe, it, expect } from '@jest/globals';
import {
  mapPaycheckToDto,
  mapPaychecksToDto
} from '../../../../src/products/paylinq/dto/paycheckDto.js';

describe('Paycheck DTO', () => {
  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  const testPaycheckId = '660e8400-e29b-41d4-a716-446655440002';
  const testEmployeeId = '770e8400-e29b-41d4-a716-446655440003';
  const testRunId = '880e8400-e29b-41d4-a716-446655440004';

  // ==================== mapPaycheckToDto ====================

  describe('mapPaycheckToDto', () => {
    it('should map database paycheck to API format', () => {
      // Arrange
      const dbPaycheck = {
        id: testPaycheckId,
        organization_id: testOrgId,
        payroll_run_id: testRunId,
        employee_id: testEmployeeId,
        payment_date: new Date('2024-01-31'),
        pay_period_start: new Date('2024-01-01'),
        pay_period_end: new Date('2024-01-31'),
        employee_number: 'EMP001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        gross_pay: '5000.00',
        regular_pay: '4500.00',
        overtime_pay: '500.00',
        net_pay: '3750.00',
        tax_free_allowance: '500.00',
        taxable_income: '4500.00',
        wage_tax: '800.00',
        aov_tax: '250.00',
        aww_tax: '200.00',
        federal_tax: '0.00',
        state_tax: '0.00',
        local_tax: '0.00',
        social_security: '0.00',
        medicare: '0.00',
        other_deductions: '0.00',
        payment_method: 'direct_deposit',
        status: 'paid',
        payment_reference: 'PAY-2024-01-001',
        components: [
          { code: 'BASE', name: 'Base Salary', amount: 4500, type: 'earning' },
          { code: 'OT', name: 'Overtime', amount: 500, type: 'earning' }
        ],
        created_at: new Date('2024-01-31'),
        updated_at: new Date('2024-01-31'),
        created_by: testUserId,
        updated_by: testUserId
      };

      // Act
      const result = mapPaycheckToDto(dbPaycheck);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbPaycheck.id);
      expect(result.organizationId).toBe(dbPaycheck.organization_id);
      expect(result.payrollRunId).toBe(dbPaycheck.payroll_run_id);
      expect(result.employeeId).toBe(dbPaycheck.employee_id);
      expect(result.paymentDate).toBe(dbPaycheck.payment_date);
      expect(result.payPeriodStart).toBe(dbPaycheck.pay_period_start);
      expect(result.payPeriodEnd).toBe(dbPaycheck.pay_period_end);
      expect(result.employeeNumber).toBe('EMP001');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.fullName).toBe('John Doe');
      expect(result.email).toBe('john.doe@example.com');
      expect(result.grossPay).toBe(5000);
      expect(result.regularPay).toBe(4500);
      expect(result.overtimePay).toBe(500);
      expect(result.netPay).toBe(3750);
      expect(result.taxFreeAllowance).toBe(500);
      expect(result.taxableIncome).toBe(4500);
      expect(result.wageTax).toBe(800);
      expect(result.aovTax).toBe(250);
      expect(result.awwTax).toBe(200);
      expect(result.federalTax).toBe(0);
      expect(result.stateTax).toBe(0);
      expect(result.localTax).toBe(0);
      expect(result.socialSecurity).toBe(0);
      expect(result.medicare).toBe(0);
      expect(result.otherDeductions).toBe(0);
      expect(result.paymentMethod).toBe('direct_deposit');
      expect(result.status).toBe('paid');
      expect(result.paymentReference).toBe('PAY-2024-01-001');
      expect(result.components).toHaveLength(2);
      expect(result.createdAt).toBe(dbPaycheck.created_at);
      expect(result.updatedAt).toBe(dbPaycheck.updated_at);
    });

    it('should return null for null input', () => {
      // Act
      const result = mapPaycheckToDto(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle paycheck with null optional fields', () => {
      // Arrange
      const dbPaycheck = {
        id: testPaycheckId,
        organization_id: testOrgId,
        payroll_run_id: testRunId,
        employee_id: testEmployeeId,
        payment_date: new Date('2024-01-31'),
        pay_period_start: new Date('2024-01-01'),
        pay_period_end: new Date('2024-01-31'),
        employee_number: null,
        first_name: null,
        last_name: null,
        email: null,
        gross_pay: null,
        regular_pay: null,
        overtime_pay: null,
        net_pay: null,
        tax_free_allowance: null,
        taxable_income: null,
        wage_tax: null,
        aov_tax: null,
        aww_tax: null,
        payment_method: 'check',
        status: 'pending',
        payment_reference: null,
        components: [],
        created_at: new Date('2024-01-31'),
        updated_at: new Date('2024-01-31')
      };

      // Act
      const result = mapPaycheckToDto(dbPaycheck);

      // Assert
      expect(result).toBeDefined();
      expect(result.grossPay).toBe(0);
      expect(result.regularPay).toBe(0);
      expect(result.overtimePay).toBe(0);
      expect(result.netPay).toBe(0);
      expect(result.wageTax).toBe(0);
      expect(result.fullName).toBe('Unknown');
    });

    it('should construct fullName from firstName only', () => {
      // Arrange
      const dbPaycheck = {
        id: testPaycheckId,
        first_name: 'Jane',
        last_name: null,
        payment_date: new Date('2024-01-31'),
        pay_period_start: new Date('2024-01-01'),
        pay_period_end: new Date('2024-01-31'),
        payment_method: 'direct_deposit',
        status: 'paid',
        created_at: new Date('2024-01-31'),
        updated_at: new Date('2024-01-31')
      };

      // Act
      const result = mapPaycheckToDto(dbPaycheck);

      // Assert
      expect(result.fullName).toBe('Jane');
    });

    it('should construct fullName from lastName only', () => {
      // Arrange
      const dbPaycheck = {
        id: testPaycheckId,
        first_name: null,
        last_name: 'Smith',
        payment_date: new Date('2024-01-31'),
        pay_period_start: new Date('2024-01-01'),
        pay_period_end: new Date('2024-01-31'),
        payment_method: 'direct_deposit',
        status: 'paid',
        created_at: new Date('2024-01-31'),
        updated_at: new Date('2024-01-31')
      };

      // Act
      const result = mapPaycheckToDto(dbPaycheck);

      // Assert
      expect(result.fullName).toBe('Smith');
    });
  });

  // ==================== mapPaychecksToDto ====================

  describe('mapPaychecksToDto', () => {
    it('should map array of paychecks to API format', () => {
      // Arrange
      const dbPaychecks = [
        {
          id: testPaycheckId,
          organization_id: testOrgId,
          payroll_run_id: testRunId,
          employee_id: testEmployeeId,
          first_name: 'John',
          last_name: 'Doe',
          payment_date: new Date('2024-01-31'),
          pay_period_start: new Date('2024-01-01'),
          pay_period_end: new Date('2024-01-31'),
          gross_pay: '5000.00',
          net_pay: '3750.00',
          payment_method: 'direct_deposit',
          status: 'paid',
          created_at: new Date('2024-01-31'),
          updated_at: new Date('2024-01-31')
        },
        {
          id: '990e8400-e29b-41d4-a716-446655440005',
          organization_id: testOrgId,
          payroll_run_id: testRunId,
          employee_id: '990e8400-e29b-41d4-a716-446655440006',
          first_name: 'Jane',
          last_name: 'Smith',
          payment_date: new Date('2024-01-31'),
          pay_period_start: new Date('2024-01-01'),
          pay_period_end: new Date('2024-01-31'),
          gross_pay: '6000.00',
          net_pay: '4500.00',
          payment_method: 'direct_deposit',
          status: 'paid',
          created_at: new Date('2024-01-31'),
          updated_at: new Date('2024-01-31')
        }
      ];

      // Act
      const result = mapPaychecksToDto(dbPaychecks);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].fullName).toBe('John Doe');
      expect(result[1].fullName).toBe('Jane Smith');
    });

    it('should return empty array for non-array input', () => {
      // Act
      const result = mapPaychecksToDto(null);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle empty array', () => {
      // Act
      const result = mapPaychecksToDto([]);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });
});
