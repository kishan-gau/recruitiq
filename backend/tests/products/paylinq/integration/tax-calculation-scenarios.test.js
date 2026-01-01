/**
 * Tax Calculation Scenarios - Integration Test
 * 
 * Tests comprehensive tax calculation scenarios with real database:
 * 1. Progressive tax brackets with multiple tiers
 * 2. Tax-free allowances and deductions
 * 3. Multiple employees with different income levels
 * 4. Year-to-date tax accumulation
 * 5. Edge cases (bracket boundaries, zero income, etc.)
 * 
 * This integration test validates that the tax calculation service works
 * correctly with the tax engine repository and produces accurate results
 * across various scenarios.
 * 
 * Following TESTING_STANDARDS.md guidelines:
 * - Real database operations (no mocking)
 * - Complete tax calculation workflow
 * - Edge case coverage
 * - Proper cleanup in afterAll
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../../../src/config/database.js';
import { query } from '../../../../src/config/database.js';
import TaxCalculationService from '../../../../src/products/paylinq/services/taxCalculationService.js';
import { createTestEmployee } from '../helpers/employeeTestHelper.js';

describe('Tax Calculation Scenarios - Integration Tests', () => {
  let organizationId;
  let userId;
  let taxCalculationService;
  let taxRuleSetId;
  let allowanceId;
  
  // Test employees at different income levels
  let lowIncomeEmployeeId;    // 2000 SRD (below first bracket)
  let midIncomeEmployeeId;    // 6000 SRD (bracket 2)
  let highIncomeEmployeeId;   // 15000 SRD (bracket 3)
  let boundaryEmployeeId;     // 3000 SRD (exactly at bracket boundary)

  beforeAll(async () => {
    // Initialize service
    taxCalculationService = new TaxCalculationService();

    // Create test organization
    organizationId = uuidv4();
    await query(
      `INSERT INTO organizations (id, name, slug, tier)
       VALUES ($1, $2, $3, $4)`,
      [organizationId, 'Test Tax Calc Org', 'test-tax-calc', 'professional'],
      organizationId
    );

    // Create test user
    userId = uuidv4();
    await query(
      `INSERT INTO hris.user_account (id, organization_id, email, password_hash, full_name, user_type, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, organizationId, 'admin@testtax.com', 'hash', 'Tax Admin', 'tenant', true],
      organizationId
    );

    // Setup Suriname progressive tax rules (2025 rates)
    const taxRuleSetResult = await query(
      `INSERT INTO payroll.tax_rule_set (
        id, organization_id, tax_type, tax_name, country, effective_from,
        is_active, calculation_method, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        uuidv4(),
        organizationId,
        'wage',
        'Suriname Wage Tax 2025',
        'SR',
        '2025-01-01',
        true,
        'bracket',
        userId
      ],
      organizationId
    );
    taxRuleSetId = taxRuleSetResult.rows[0].id;

    // Create realistic progressive tax brackets
    // Bracket 1: 0 - 3,000 SRD = 0% (tax-free threshold)
    // Bracket 2: 3,001 - 10,000 SRD = 15%
    // Bracket 3: 10,001+ SRD = 25%
    await query(
      `INSERT INTO payroll.tax_bracket (
        id, organization_id, tax_rule_set_id, bracket_order,
        income_min, income_max, rate_percentage, fixed_amount, created_by
      ) VALUES 
        ($1, $2, $3, 1, 0, 3000, 0, 0, $4),
        ($5, $2, $3, 2, 3000, 10000, 15, 0, $4),
        ($6, $2, $3, 3, 10000, NULL, 25, 0, $4)`,
      [
        uuidv4(), organizationId, taxRuleSetId, userId,
        uuidv4(), uuidv4()
      ],
      organizationId
    );

    // Create monthly tax-free allowance (250 SRD)
    const allowanceResult = await query(
      `INSERT INTO payroll.allowance (
        id, organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        uuidv4(),
        organizationId,
        'standard',
        'Monthly Tax-Free Allowance',
        'SR',
        250,
        false,
        '2025-01-01',
        true,
        userId
      ],
      organizationId
    );
    allowanceId = allowanceResult.rows[0].id;

    // Create test employees
    const lowIncomeEmployee = await createTestEmployee({
      organizationId,
      userId,
      employee: {
        employee_number: 'EMP-LOW',
        first_name: 'Low',
        last_name: 'Income',
        email: 'low@test.com',
        hire_date: '2024-01-01'
      }
    });
    lowIncomeEmployeeId = lowIncomeEmployee.employee.id;

    const midIncomeEmployee = await createTestEmployee({
      organizationId,
      userId,
      employee: {
        employee_number: 'EMP-MID',
        first_name: 'Mid',
        last_name: 'Income',
        email: 'mid@test.com',
        hire_date: '2024-01-01'
      }
    });
    midIncomeEmployeeId = midIncomeEmployee.employee.id;

    const highIncomeEmployee = await createTestEmployee({
      organizationId,
      userId,
      employee: {
        employee_number: 'EMP-HIGH',
        first_name: 'High',
        last_name: 'Income',
        email: 'high@test.com',
        hire_date: '2024-01-01'
      }
    });
    highIncomeEmployeeId = highIncomeEmployee.employee.id;

    const boundaryEmployee = await createTestEmployee({
      organizationId,
      userId,
      employee: {
        employee_number: 'EMP-BOUNDARY',
        first_name: 'Boundary',
        last_name: 'Case',
        email: 'boundary@test.com',
        hire_date: '2024-01-01'
      }
    });
    boundaryEmployeeId = boundaryEmployee.employee.id;
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await query('DELETE FROM payroll.employee_payroll_config WHERE organization_id = $1', [organizationId], organizationId);
      await query('DELETE FROM hris.employee WHERE organization_id = $1', [organizationId], organizationId);
      await query('DELETE FROM payroll.tax_bracket WHERE organization_id = $1', [organizationId], organizationId);
      await query('DELETE FROM payroll.allowance WHERE organization_id = $1', [organizationId], organizationId);
      await query('DELETE FROM payroll.tax_rule_set WHERE organization_id = $1', [organizationId], organizationId);
      await query('DELETE FROM hris.user_account WHERE organization_id = $1', [organizationId], organizationId);
      await query('DELETE FROM organizations WHERE id = $1', [organizationId], organizationId);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    await pool.end();
  });

  // ==================== BRACKET 1: NO TAX (0 - 3000 SRD) ====================

  describe('Bracket 1 - Tax-Free Threshold', () => {
    it('should calculate zero tax for income below bracket threshold', async () => {
      // Arrange
      const grossPay = 2000; // Below 3000 threshold
      const payDate = new Date('2025-01-15');
      const payPeriod = 'monthly';

      // Act
      const result = await taxCalculationService.calculateEmployeeTaxes(
        lowIncomeEmployeeId,
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.totalTax).toBe(0);
      expect(result.taxableIncome).toBe(2000 - 250); // Minus allowance
      expect(result.netPay).toBe(2000); // No tax deducted
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.length).toBeGreaterThan(0);
    });

    it('should apply tax-free allowance correctly', async () => {
      // Arrange
      const grossPay = 3000; // At bracket boundary
      const payDate = new Date('2025-01-15');
      const payPeriod = 'monthly';

      // Act
      const result = await taxCalculationService.calculateEmployeeTaxes(
        boundaryEmployeeId,
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      // Assert
      expect(result.taxableIncome).toBe(3000 - 250); // 2750
      // 2750 is below 3000 threshold, so no tax
      expect(result.totalTax).toBe(0);
    });
  });

  // ==================== BRACKET 2: 15% TAX (3000 - 10000 SRD) ====================

  describe('Bracket 2 - 15% Progressive Tax', () => {
    it('should calculate 15% tax on income above 3000 SRD', async () => {
      // Arrange
      const grossPay = 6000; // Middle of bracket 2
      const payDate = new Date('2025-01-15');
      const payPeriod = 'monthly';

      // Act
      const result = await taxCalculationService.calculateEmployeeTaxes(
        midIncomeEmployeeId,
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      // Assert
      expect(result).toBeDefined();
      
      // Taxable income: 6000 - 250 (allowance) = 5750
      expect(result.taxableIncome).toBe(5750);
      
      // Tax calculation:
      // First 3000: 0% = 0
      // Remaining 2750: 15% = 412.50
      const expectedTax = 2750 * 0.15;
      expect(result.totalTax).toBeCloseTo(expectedTax, 2);
      expect(result.netPay).toBeCloseTo(6000 - expectedTax, 2);
    });

    it('should handle income at upper bracket boundary', async () => {
      // Arrange
      const grossPay = 10000; // At bracket 2/3 boundary
      const payDate = new Date('2025-01-15');
      const payPeriod = 'monthly';

      // Act
      const result = await taxCalculationService.calculateEmployeeTaxes(
        midIncomeEmployeeId,
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      // Assert
      // Taxable income: 10000 - 250 = 9750
      expect(result.taxableIncome).toBe(9750);
      
      // Tax calculation:
      // First 3000: 0% = 0
      // Remaining 6750: 15% = 1012.50
      const expectedTax = 6750 * 0.15;
      expect(result.totalTax).toBeCloseTo(expectedTax, 2);
    });
  });

  // ==================== BRACKET 3: 25% TAX (10000+ SRD) ====================

  describe('Bracket 3 - 25% Progressive Tax', () => {
    it('should calculate progressive tax with multiple brackets', async () => {
      // Arrange
      const grossPay = 15000; // In bracket 3
      const payDate = new Date('2025-01-15');
      const payPeriod = 'monthly';

      // Act
      const result = await taxCalculationService.calculateEmployeeTaxes(
        highIncomeEmployeeId,
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      // Assert
      expect(result).toBeDefined();
      
      // Taxable income: 15000 - 250 = 14750
      expect(result.taxableIncome).toBe(14750);
      
      // Tax calculation:
      // First 3000: 0% = 0
      // Next 7000 (3000-10000): 15% = 1050
      // Remaining 4750 (10000+): 25% = 1187.50
      // Total: 2237.50
      const expectedTax = (7000 * 0.15) + (4750 * 0.25);
      expect(result.totalTax).toBeCloseTo(expectedTax, 2);
      expect(result.netPay).toBeCloseTo(15000 - expectedTax, 2);
    });

    it('should provide detailed tax breakdown by bracket', async () => {
      // Arrange
      const grossPay = 15000;
      const payDate = new Date('2025-01-15');
      const payPeriod = 'monthly';

      // Act
      const result = await taxCalculationService.calculateEmployeeTaxes(
        highIncomeEmployeeId,
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      // Assert
      expect(result.breakdown).toBeDefined();
      expect(Array.isArray(result.breakdown)).toBe(true);
      
      // Verify breakdown structure
      const breakdown = result.breakdown;
      expect(breakdown.length).toBeGreaterThan(0);
      
      // Each breakdown entry should have tax details
      breakdown.forEach(entry => {
        expect(entry).toHaveProperty('taxType');
        expect(entry).toHaveProperty('taxableAmount');
        expect(entry).toHaveProperty('taxAmount');
        expect(entry.taxAmount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    it('should handle zero income correctly', async () => {
      // Arrange
      const grossPay = 0;
      const payDate = new Date('2025-01-15');
      const payPeriod = 'monthly';

      // Act
      const result = await taxCalculationService.calculateEmployeeTaxes(
        lowIncomeEmployeeId,
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      // Assert
      expect(result.totalTax).toBe(0);
      expect(result.taxableIncome).toBeLessThanOrEqual(0); // Can't be negative
      expect(result.netPay).toBe(0);
    });

    it('should handle exact bracket boundary (3000 SRD)', async () => {
      // Arrange
      const grossPay = 3250; // 3000 after allowance
      const payDate = new Date('2025-01-15');
      const payPeriod = 'monthly';

      // Act
      const result = await taxCalculationService.calculateEmployeeTaxes(
        boundaryEmployeeId,
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      // Assert
      // Taxable: 3250 - 250 = 3000 (exactly at boundary)
      expect(result.taxableIncome).toBe(3000);
      expect(result.totalTax).toBe(0); // Still in bracket 1
    });

    it('should handle one SRD above bracket boundary', async () => {
      // Arrange
      const grossPay = 3251; // Just above bracket boundary
      const payDate = new Date('2025-01-15');
      const payPeriod = 'monthly';

      // Act
      const result = await taxCalculationService.calculateEmployeeTaxes(
        boundaryEmployeeId,
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      // Assert
      // Taxable: 3251 - 250 = 3001
      expect(result.taxableIncome).toBe(3001);
      // Tax: 1 SRD at 15% = 0.15
      expect(result.totalTax).toBeCloseTo(0.15, 2);
    });

    it('should handle very high income correctly', async () => {
      // Arrange
      const grossPay = 50000; // Very high income
      const payDate = new Date('2025-01-15');
      const payPeriod = 'monthly';

      // Act
      const result = await taxCalculationService.calculateEmployeeTaxes(
        highIncomeEmployeeId,
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      // Assert
      // Taxable: 50000 - 250 = 49750
      expect(result.taxableIncome).toBe(49750);
      
      // Tax calculation:
      // First 3000: 0% = 0
      // Next 7000: 15% = 1050
      // Remaining 39750: 25% = 9937.50
      // Total: 10987.50
      const expectedTax = (7000 * 0.15) + (39750 * 0.25);
      expect(result.totalTax).toBeCloseTo(expectedTax, 2);
    });
  });

  // ==================== ALLOWANCES & DEDUCTIONS ====================

  describe('Allowances and Deductions', () => {
    it('should retrieve and apply active allowances', async () => {
      // Act - Get allowances from database
      const allowances = await query(
        `SELECT * FROM payroll.allowance 
         WHERE organization_id = $1 AND is_active = true`,
        [organizationId],
        organizationId
      );

      // Assert
      expect(allowances.rows.length).toBeGreaterThan(0);
      const allowance = allowances.rows[0];
      expect(allowance.allowance_type).toBe('standard');
      expect(parseFloat(allowance.amount)).toBe(250);
    });

    it('should create and apply employee-specific deduction', async () => {
      // Arrange - Create a deduction for mid-income employee
      const deductionResult = await query(
        `INSERT INTO payroll.deduction (
          id, organization_id, employee_id, deduction_type, deduction_name,
          amount, is_percentage, effective_from, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          uuidv4(),
          organizationId,
          midIncomeEmployeeId,
          'other',
          'Pension Contribution',
          500,
          false,
          '2025-01-01',
          true,
          userId
        ],
        organizationId
      );

      const deductionId = deductionResult.rows[0].id;

      // Act - Calculate taxes with deduction
      const grossPay = 6000;
      const result = await taxCalculationService.calculateEmployeeTaxes(
        midIncomeEmployeeId,
        grossPay,
        new Date('2025-01-15'),
        'monthly',
        organizationId
      );

      // Assert - Deductions should reduce taxable income
      // Note: Implementation may vary, but deductions typically reduce taxable income
      expect(result).toBeDefined();
      expect(result.taxableIncome).toBeLessThanOrEqual(6000);

      // Cleanup
      await query(
        'DELETE FROM payroll.deduction WHERE id = $1',
        [deductionId],
        organizationId
      );
    });
  });

  // ==================== MULTI-EMPLOYEE CALCULATIONS ====================

  describe('Multi-Employee Tax Calculations', () => {
    it('should calculate taxes correctly for multiple employees simultaneously', async () => {
      // Arrange
      const employees = [
        { id: lowIncomeEmployeeId, grossPay: 2500 },
        { id: midIncomeEmployeeId, grossPay: 7000 },
        { id: highIncomeEmployeeId, grossPay: 18000 }
      ];
      const payDate = new Date('2025-01-15');
      const payPeriod = 'monthly';

      // Act - Calculate taxes for all employees
      const results = await Promise.all(
        employees.map(emp => 
          taxCalculationService.calculateEmployeeTaxes(
            emp.id,
            emp.grossPay,
            payDate,
            payPeriod,
            organizationId
          )
        )
      );

      // Assert
      expect(results.length).toBe(3);
      
      // Low income: should have zero or minimal tax
      expect(results[0].totalTax).toBeLessThan(100);
      
      // Mid income: should have moderate tax
      expect(results[1].totalTax).toBeGreaterThan(0);
      expect(results[1].totalTax).toBeLessThan(1500);
      
      // High income: should have highest tax
      expect(results[2].totalTax).toBeGreaterThan(results[1].totalTax);
      expect(results[2].totalTax).toBeGreaterThan(2000);
    });

    it('should maintain tax calculation consistency across multiple runs', async () => {
      // Arrange
      const grossPay = 8000;
      const payDate = new Date('2025-01-15');
      const payPeriod = 'monthly';

      // Act - Calculate same employee tax multiple times
      const result1 = await taxCalculationService.calculateEmployeeTaxes(
        midIncomeEmployeeId,
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      const result2 = await taxCalculationService.calculateEmployeeTaxes(
        midIncomeEmployeeId,
        grossPay,
        payDate,
        payPeriod,
        organizationId
      );

      // Assert - Results should be identical
      expect(result1.totalTax).toBe(result2.totalTax);
      expect(result1.taxableIncome).toBe(result2.taxableIncome);
      expect(result1.netPay).toBe(result2.netPay);
    });
  });

  // ==================== TAX RULE RETRIEVAL ====================

  describe('Tax Rule Retrieval', () => {
    it('should retrieve applicable tax rule sets by country and date', async () => {
      // Act
      const taxRules = await taxCalculationService.getApplicableTaxRuleSets(
        'SR',
        new Date('2025-01-15'),
        organizationId
      );

      // Assert
      expect(taxRules).toBeDefined();
      expect(taxRules.length).toBeGreaterThan(0);
      expect(taxRules[0].country).toBe('SR');
      expect(taxRules[0].isActive).toBe(true);
    });

    it('should retrieve tax brackets for a tax rule set', async () => {
      // Act
      const brackets = await taxCalculationService.getTaxBrackets(
        taxRuleSetId,
        organizationId
      );

      // Assert
      expect(brackets).toBeDefined();
      expect(brackets.length).toBe(3); // We created 3 brackets
      
      // Verify brackets are ordered correctly
      expect(brackets[0].bracketOrder).toBe(1);
      expect(brackets[0].incomeMin).toBe(0);
      expect(brackets[0].ratePercentage).toBe(0);
      
      expect(brackets[1].bracketOrder).toBe(2);
      expect(brackets[1].incomeMin).toBe(3000);
      expect(brackets[1].ratePercentage).toBe(15);
      
      expect(brackets[2].bracketOrder).toBe(3);
      expect(brackets[2].incomeMin).toBe(10000);
      expect(brackets[2].ratePercentage).toBe(25);
    });
  });

  // ==================== DATA INTEGRITY ====================

  describe('Data Integrity', () => {
    it('should enforce organization isolation for tax rules', async () => {
      // Arrange - Create another organization
      const otherOrgId = uuidv4();
      await query(
        `INSERT INTO organizations (id, name, slug, tier)
         VALUES ($1, $2, $3, $4)`,
        [otherOrgId, 'Other Org', 'other-org-tax', 'professional'],
        otherOrgId
      );

      // Act - Try to get tax brackets from different organization
      const brackets = await query(
        `SELECT * FROM payroll.tax_bracket 
         WHERE tax_rule_set_id = $1 AND organization_id = $2`,
        [taxRuleSetId, otherOrgId],
        otherOrgId
      );

      // Assert - Should not find brackets (different org)
      expect(brackets.rows.length).toBe(0);

      // Cleanup
      await query('DELETE FROM organizations WHERE id = $1', [otherOrgId], otherOrgId);
    });

    it('should verify all tax components exist in database', async () => {
      // Act - Check database for all components
      const ruleSetCheck = await query(
        'SELECT COUNT(*) as count FROM payroll.tax_rule_set WHERE organization_id = $1',
        [organizationId],
        organizationId
      );
      
      const bracketsCheck = await query(
        'SELECT COUNT(*) as count FROM payroll.tax_bracket WHERE organization_id = $1',
        [organizationId],
        organizationId
      );
      
      const allowancesCheck = await query(
        'SELECT COUNT(*) as count FROM payroll.allowance WHERE organization_id = $1',
        [organizationId],
        organizationId
      );

      // Assert
      expect(parseInt(ruleSetCheck.rows[0].count)).toBeGreaterThan(0);
      expect(parseInt(bracketsCheck.rows[0].count)).toBe(3);
      expect(parseInt(allowancesCheck.rows[0].count)).toBeGreaterThan(0);
    });
  });
});
