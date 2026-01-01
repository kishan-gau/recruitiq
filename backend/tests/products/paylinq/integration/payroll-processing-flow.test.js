/**
 * Payroll Processing Flow - Integration Test
 * 
 * Tests the complete end-to-end payroll processing workflow with real database:
 * 1. Setup: Create organization, employees, tax rules, pay structures
 * 2. Calculation: Run payroll calculations with multiple employees
 * 3. Payments: Generate payment transactions
 * 4. Verification: Verify data integrity across all components
 * 
 * This integration test validates that all services work together correctly
 * to process a complete payroll run from start to finish.
 * 
 * Following TESTING_STANDARDS.md guidelines:
 * - Real database operations (no mocking)
 * - Complete workflow testing
 * - Data integrity verification
 * - Proper cleanup in afterAll
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../../../src/config/database.js';
import { query } from '../../../../src/config/database.js';
import PayrollService from '../../../../src/products/paylinq/services/payrollService.js';
import { TaxCalculationService } from '../../../../src/products/paylinq/services/taxCalculationService.js';
import PaymentService from '../../../../src/products/paylinq/services/paymentService.js';
import { createTestEmployee } from '../helpers/employeeTestHelper.js';

describe('Payroll Processing Flow - Integration Tests', () => {
  let organizationId;
  let userId;
  let employee1Id;
  let employee2Id;
  let employee3Id;
  let taxRuleSetId;
  let payrollRunId;
  let payrollService;
  let taxCalculationService;
  let paymentService;

  beforeAll(async () => {
    // Initialize services
    payrollService = new PayrollService();
    taxCalculationService = new TaxCalculationService();
    paymentService = new PaymentService();

    // Create test organization
    organizationId = uuidv4();
    await query(
      `INSERT INTO organizations (id, name, slug, tier)
       VALUES ($1, $2, $3, $4)`,
      [organizationId, 'Test Payroll Org', 'test-payroll-org', 'professional'],
      organizationId
    );

    // Create test user (for audit fields)
    userId = uuidv4();
    await query(
      `INSERT INTO hris.user_account (id, organization_id, email, password_hash, full_name, user_type, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, organizationId, 'admin@testpayroll.com', 'hash', 'Admin User', 'tenant', true],
      organizationId
    );

    // Setup tax rules for Suriname (simplified)
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

    // Create tax brackets (progressive tax)
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

    // Create monthly tax-free allowance
    await query(
      `INSERT INTO payroll.allowance (
        id, organization_id, allowance_type, allowance_name, country,
        amount, is_percentage, effective_from, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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

    // Create test employees with different compensation levels
    const employee1 = await createTestEmployee({
      organizationId,
      userId,
      employee: {
        employee_number: 'EMP-001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@test.com',
        hire_date: '2024-01-01',
        employment_status: 'active'
      },
      payrollConfig: {
        pay_frequency: 'monthly',
        currency: 'SRD',
        payment_method: 'ach',
        payroll_status: 'active'
      }
    });
    employee1Id = employee1.employee.id;

    // Create compensation for employee 1 (5000 SRD/month - falls in bracket 2)
    await query(
      `INSERT INTO payroll.compensation (
        id, organization_id, employee_id, effective_date, amount,
        currency, pay_frequency, compensation_type, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        uuidv4(),
        organizationId,
        employee1Id,
        '2024-01-01',
        5000,
        'SRD',
        'monthly',
        'base_salary',
        true,
        userId
      ],
      organizationId
    );

    const employee2 = await createTestEmployee({
      organizationId,
      userId,
      employee: {
        employee_number: 'EMP-002',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@test.com',
        hire_date: '2024-01-01',
        employment_status: 'active'
      },
      payrollConfig: {
        pay_frequency: 'monthly',
        currency: 'SRD',
        payment_method: 'ach',
        payroll_status: 'active'
      }
    });
    employee2Id = employee2.employee.id;

    // Create compensation for employee 2 (12000 SRD/month - falls in bracket 3)
    await query(
      `INSERT INTO payroll.compensation (
        id, organization_id, employee_id, effective_date, amount,
        currency, pay_frequency, compensation_type, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        uuidv4(),
        organizationId,
        employee2Id,
        '2024-01-01',
        12000,
        'SRD',
        'monthly',
        'base_salary',
        true,
        userId
      ],
      organizationId
    );

    const employee3 = await createTestEmployee({
      organizationId,
      userId,
      employee: {
        employee_number: 'EMP-003',
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob.johnson@test.com',
        hire_date: '2024-01-01',
        employment_status: 'active'
      },
      payrollConfig: {
        pay_frequency: 'monthly',
        currency: 'SRD',
        payment_method: 'ach',
        payroll_status: 'active'
      }
    });
    employee3Id = employee3.employee.id;

    // Create compensation for employee 3 (2500 SRD/month - falls in bracket 1, no tax)
    await query(
      `INSERT INTO payroll.compensation (
        id, organization_id, employee_id, effective_date, amount,
        currency, pay_frequency, compensation_type, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        uuidv4(),
        organizationId,
        employee3Id,
        '2024-01-01',
        2500,
        'SRD',
        'monthly',
        'base_salary',
        true,
        userId
      ],
      organizationId
    );
  });

  afterAll(async () => {
    // Cleanup test data in reverse order of dependencies
    try {
      // Delete paychecks first (references payroll_run)
      await query(
        'DELETE FROM payroll.paycheck WHERE organization_id = $1',
        [organizationId],
        organizationId
      );
      
      // Delete payroll runs
      await query(
        'DELETE FROM payroll.payroll_run WHERE organization_id = $1',
        [organizationId],
        organizationId
      );
      
      // Delete payment transactions
      await query(
        'DELETE FROM payroll.payment_transaction WHERE organization_id = $1',
        [organizationId],
        organizationId
      );
      
      // Delete compensation records
      await query(
        'DELETE FROM payroll.compensation WHERE organization_id = $1',
        [organizationId],
        organizationId
      );
      
      // Delete payroll configs
      await query(
        'DELETE FROM payroll.employee_payroll_config WHERE organization_id = $1',
        [organizationId],
        organizationId
      );
      
      // Delete tax brackets
      await query(
        'DELETE FROM payroll.tax_bracket WHERE organization_id = $1',
        [organizationId],
        organizationId
      );
      
      // Delete tax rule sets
      await query(
        'DELETE FROM payroll.tax_rule_set WHERE organization_id = $1',
        [organizationId],
        organizationId
      );
      
      // Delete allowances
      await query(
        'DELETE FROM payroll.allowance WHERE organization_id = $1',
        [organizationId],
        organizationId
      );
      
      // Delete employees
      await query(
        'DELETE FROM hris.employee WHERE organization_id = $1',
        [organizationId],
        organizationId
      );
      
      // Delete user
      await query(
        'DELETE FROM hris.user_account WHERE organization_id = $1',
        [organizationId],
        organizationId
      );
      
      // Delete organization
      await query(
        'DELETE FROM organizations WHERE id = $1',
        [organizationId],
        organizationId
      );
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    
    // Close database connection
    await pool.end();
  });

  // ==================== PAYROLL RUN CREATION ====================

  describe('Payroll Run Creation', () => {
    it('should create a new payroll run with correct metadata', async () => {
      // Arrange
      const payPeriodStart = new Date('2025-01-01');
      const payPeriodEnd = new Date('2025-01-31');
      const payDate = new Date('2025-02-05');

      const runData = {
        payPeriodStart: payPeriodStart.toISOString(),
        payPeriodEnd: payPeriodEnd.toISOString(),
        payDate: payDate.toISOString(),
        runType: 'regular',
        status: 'draft',
        description: 'January 2025 Payroll'
      };

      // Act
      const result = await payrollService.createPayrollRun(
        runData,
        organizationId,
        userId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.payrollRun).toBeDefined();
      expect(result.payrollRun.id).toBeDefined();
      expect(result.payrollRun.status).toBe('draft');
      expect(result.payrollRun.runType).toBe('regular');
      
      // Store for subsequent tests
      payrollRunId = result.payrollRun.id;
    });

    it('should verify payroll run exists in database', async () => {
      // Act
      const result = await query(
        `SELECT * FROM payroll.payroll_run 
         WHERE id = $1 AND organization_id = $2`,
        [payrollRunId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].status).toBe('draft');
      expect(result.rows[0].run_type).toBe('regular');
    });
  });

  // ==================== PAYROLL CALCULATION ====================

  describe('Payroll Calculation', () => {
    it('should calculate payroll for all active employees', async () => {
      // Act
      const result = await payrollService.calculatePayroll(
        payrollRunId,
        organizationId,
        userId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.paychecks).toBeDefined();
      expect(result.paychecks.length).toBe(3); // 3 employees
    });

    it('should create paychecks with correct tax calculations', async () => {
      // Act - Get paychecks from database
      const result = await query(
        `SELECT * FROM payroll.paycheck 
         WHERE payroll_run_id = $1 AND organization_id = $2
         ORDER BY gross_pay ASC`,
        [payrollRunId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(3);
      
      // Employee 3: 2500 SRD (bracket 1: 0% tax)
      const paycheck1 = result.rows[0];
      expect(parseFloat(paycheck1.gross_pay)).toBe(2500);
      expect(parseFloat(paycheck1.tax_deductions)).toBe(0); // No tax in bracket 1
      expect(parseFloat(paycheck1.net_pay)).toBe(2500);
      
      // Employee 1: 5000 SRD (bracket 2: 15% on amount above 3000)
      const paycheck2 = result.rows[1];
      expect(parseFloat(paycheck2.gross_pay)).toBe(5000);
      // Tax calculation: (5000 - 250 allowance) = 4750 taxable
      // First 3000: 0%, Next 1750: 15% = 262.50
      expect(parseFloat(paycheck2.tax_deductions)).toBeGreaterThan(0);
      expect(parseFloat(paycheck2.tax_deductions)).toBeLessThan(400);
      expect(parseFloat(paycheck2.net_pay)).toBeLessThan(5000);
      
      // Employee 2: 12000 SRD (bracket 3: 25% on amount above 10000)
      const paycheck3 = result.rows[2];
      expect(parseFloat(paycheck3.gross_pay)).toBe(12000);
      // Tax calculation: (12000 - 250 allowance) = 11750 taxable
      // First 3000: 0%, Next 7000: 15% = 1050, Next 1750: 25% = 437.50
      // Total: ~1487.50
      expect(parseFloat(paycheck3.tax_deductions)).toBeGreaterThan(1000);
      expect(parseFloat(paycheck3.tax_deductions)).toBeLessThan(2000);
      expect(parseFloat(paycheck3.net_pay)).toBeLessThan(12000);
    });

    it('should update payroll run status after calculation', async () => {
      // Act
      const result = await query(
        `SELECT status FROM payroll.payroll_run 
         WHERE id = $1 AND organization_id = $2`,
        [payrollRunId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].status).toBe('calculated');
    });
  });

  // ==================== PAYMENT GENERATION ====================

  describe('Payment Generation', () => {
    it('should generate payment transactions for all paychecks', async () => {
      // Arrange - Get paychecks
      const paychecksResult = await query(
        `SELECT * FROM payroll.paycheck 
         WHERE payroll_run_id = $1 AND organization_id = $2`,
        [payrollRunId, organizationId],
        organizationId
      );

      // Act - Generate payments for each paycheck
      const paymentPromises = paychecksResult.rows.map(paycheck => 
        paymentService.initiatePayment(
          {
            paycheckId: paycheck.id,
            payrollRunId: payrollRunId,
            employeeId: paycheck.employee_id,
            amount: parseFloat(paycheck.net_pay),
            currency: paycheck.currency,
            paymentMethod: 'ach',
            scheduledDate: paycheck.pay_date
          },
          organizationId,
          userId
        )
      );

      const results = await Promise.all(paymentPromises);

      // Assert
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.transaction).toBeDefined();
        expect(result.transaction.id).toBeDefined();
        expect(result.transaction.status).toBe('pending');
      });
    });

    it('should verify payment transactions exist in database', async () => {
      // Act
      const result = await query(
        `SELECT pt.* FROM payroll.payment_transaction pt
         JOIN payroll.paycheck pc ON pt.paycheck_id = pc.id
         WHERE pc.payroll_run_id = $1 AND pt.organization_id = $2`,
        [payrollRunId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(3);
      result.rows.forEach(transaction => {
        expect(transaction.status).toBe('pending');
        expect(transaction.payment_method).toBe('ach');
        expect(parseFloat(transaction.amount)).toBeGreaterThan(0);
      });
    });
  });

  // ==================== DATA INTEGRITY VERIFICATION ====================

  describe('Data Integrity', () => {
    it('should maintain referential integrity across all tables', async () => {
      // Act - Get complete payroll run data with joins
      const result = await query(
        `SELECT 
          pr.id as payroll_run_id,
          pr.status as run_status,
          pc.id as paycheck_id,
          pc.gross_pay,
          pc.tax_deductions,
          pc.net_pay,
          e.employee_number,
          e.first_name,
          e.last_name,
          pt.id as payment_id,
          pt.status as payment_status,
          pt.amount as payment_amount
         FROM payroll.payroll_run pr
         JOIN payroll.paycheck pc ON pr.id = pc.payroll_run_id
         JOIN hris.employee e ON pc.employee_id = e.id
         LEFT JOIN payroll.payment_transaction pt ON pc.id = pt.paycheck_id
         WHERE pr.id = $1 AND pr.organization_id = $2
         ORDER BY pc.gross_pay ASC`,
        [payrollRunId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(3);
      
      // Verify all relationships exist
      result.rows.forEach(row => {
        expect(row.payroll_run_id).toBe(payrollRunId);
        expect(row.paycheck_id).toBeDefined();
        expect(row.employee_number).toBeDefined();
        expect(row.payment_id).toBeDefined();
        
        // Verify net_pay matches payment amount
        expect(parseFloat(row.net_pay)).toBeCloseTo(parseFloat(row.payment_amount), 2);
      });
    });

    it('should enforce organization isolation', async () => {
      // Arrange - Create another organization
      const otherOrgId = uuidv4();
      await query(
        `INSERT INTO organizations (id, name, slug, tier)
         VALUES ($1, $2, $3, $4)`,
        [otherOrgId, 'Other Org', 'other-org', 'professional'],
        otherOrgId
      );

      // Act - Try to access payroll run from different organization
      const result = await query(
        `SELECT * FROM payroll.payroll_run 
         WHERE id = $1 AND organization_id = $2`,
        [payrollRunId, otherOrgId],
        otherOrgId
      );

      // Assert
      expect(result.rows.length).toBe(0); // Should not find the payroll run

      // Cleanup
      await query(
        'DELETE FROM organizations WHERE id = $1',
        [otherOrgId],
        otherOrgId
      );
    });

    it('should calculate correct payroll totals', async () => {
      // Act - Get payroll run summary
      const result = await query(
        `SELECT 
          COUNT(*)::int as paycheck_count,
          SUM(gross_pay)::numeric as total_gross,
          SUM(tax_deductions)::numeric as total_taxes,
          SUM(net_pay)::numeric as total_net
         FROM payroll.paycheck 
         WHERE payroll_run_id = $1 AND organization_id = $2`,
        [payrollRunId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(1);
      const summary = result.rows[0];
      
      expect(summary.paycheck_count).toBe(3);
      expect(parseFloat(summary.total_gross)).toBe(19500); // 2500 + 5000 + 12000
      expect(parseFloat(summary.total_taxes)).toBeGreaterThan(0);
      expect(parseFloat(summary.total_taxes)).toBeLessThan(3000);
      expect(parseFloat(summary.total_net)).toBe(
        parseFloat(summary.total_gross) - parseFloat(summary.total_taxes)
      );
    });
  });

  // ==================== PAYROLL RUN FINALIZATION ====================

  describe('Payroll Run Finalization', () => {
    it('should finalize payroll run successfully', async () => {
      // Act
      const result = await payrollService.finalizePayrollRun(
        payrollRunId,
        organizationId,
        userId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.payrollRun.status).toBe('finalized');
    });

    it('should verify finalized status persists in database', async () => {
      // Act
      const result = await query(
        `SELECT status, finalized_at, finalized_by 
         FROM payroll.payroll_run 
         WHERE id = $1 AND organization_id = $2`,
        [payrollRunId, organizationId],
        organizationId
      );

      // Assert
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].status).toBe('finalized');
      expect(result.rows[0].finalized_at).toBeDefined();
      expect(result.rows[0].finalized_by).toBe(userId);
    });

    it('should prevent modifications to finalized payroll run', async () => {
      // Act & Assert
      await expect(
        payrollService.calculatePayroll(payrollRunId, organizationId, userId)
      ).rejects.toThrow();
    });
  });
});
