/**
 * Paycheck Component Breakdown Integration Tests (Phase 2)
 * 
 * End-to-end tests for GET /api/paylinq/paychecks/:id/components endpoint
 * Tests component-based tax calculation, allowance tracking, and multi-tenant security
 */

import request from 'supertest';
import { jest } from '@jest/globals';
import pool from '../../../../src/config/database.js';
import app from '../../../../src/server.js';

describe('Paycheck Component Breakdown Integration (Phase 2)', () => {
  let authToken;
  let organizationId;
  let userId;
  let employeeId;
  let payrollRunId;
  let paycheckId;

  beforeAll(async () => {
    // Setup test organization
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, slug, created_at, updated_at) 
       VALUES ($1, $2, NOW(), NOW()) RETURNING id`,
      ['Component Test Org', 'component-test-org']
    );
    organizationId = orgResult.rows[0].id;

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, organization_id, legacy_role, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id`,
      ['component@test.com', '$2a$10$dummyhash', 'Component Test User', organizationId, 'admin']
    );
    userId = userResult.rows[0].id;

    // Generate mock auth token
    authToken = `Bearer test-token-${userId}`;

    // Create test employee
    const empResult = await pool.query(
      `INSERT INTO payroll.employee_record (
        organization_id, first_name, last_name, email, 
        employment_status, hire_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
      [organizationId, 'John', 'Doe', 'john@test.com', 'active', '2025-01-01']
    );
    employeeId = empResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  beforeEach(async () => {
    // Create fresh payroll run and paycheck for each test
    const runResult = await pool.query(
      `INSERT INTO payroll.payroll_run (
        organization_id, run_number, run_name, pay_period_start, pay_period_end,
        payment_date, status, total_employees, total_gross_pay, total_net_pay,
        total_taxes, total_deductions, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()) RETURNING id`,
      [
        organizationId, 'RUN-2025-12', 'December Payroll', '2025-12-01', '2025-12-31',
        '2025-12-31', 'calculated', 1, 15000, 14070, 930, 0, userId
      ]
    );
    payrollRunId = runResult.rows[0].id;

    const checkResult = await pool.query(
      `INSERT INTO payroll.paycheck (
        organization_id, payroll_run_id, employee_id, payment_date,
        pay_period_start, pay_period_end, gross_pay, taxable_income,
        tax_free_allowance, wage_tax, aov_tax, aww_tax, net_pay,
        payment_method, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()) RETURNING id`,
      [
        organizationId, payrollRunId, employeeId, '2025-12-31',
        '2025-12-01', '2025-12-31', 15000, 6000,
        9000, 600, 300, 30, 14070,
        'bank_transfer', 'pending'
      ]
    );
    paycheckId = checkResult.rows[0].id;
  });

  afterEach(async () => {
    // Cleanup test data
    if (paycheckId) {
      await pool.query('DELETE FROM payroll.payroll_run_component WHERE paycheck_id = $1', [paycheckId]);
      await pool.query('DELETE FROM payroll.paycheck WHERE id = $1', [paycheckId]);
    }
    if (payrollRunId) {
      await pool.query('DELETE FROM payroll.payroll_run WHERE id = $1', [payrollRunId]);
    }
  });

  describe('GET /api/paylinq/paychecks/:id/components', () => {
    describe('Single Component - Regular Salary', () => {
      test('should return component breakdown for regular salary with monthly allowance', async () => {
        // Insert component with tax calculation metadata
        await pool.query(
          `INSERT INTO payroll.payroll_run_component (
            organization_id, payroll_run_id, paycheck_id, component_type,
            component_code, component_name, amount, is_taxable,
            calculation_metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            organizationId, payrollRunId, paycheckId, 'earning',
            'REGULAR_SALARY', 'Regular Salary', 15000, true,
            JSON.stringify({
              taxCalculation: {
                amount: 15000,
                taxFreeAmount: 9000,
                taxableAmount: 6000,
                wageTax: 600,
                aovTax: 300,
                awwTax: 30,
                totalTax: 930,
                allowanceType: 'tax_free_sum_monthly',
                effectiveTaxRate: 0.155
              }
            })
          ]
        );

        const response = await request(app)
          .get(`/api/paylinq/paychecks/${paycheckId}/components`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.components).toBeDefined();

        const { components } = response.body;

        // Verify earnings
        expect(components.earnings).toHaveLength(1);
        const earning = components.earnings[0];
        expect(earning.componentCode).toBe('REGULAR_SALARY');
        expect(earning.amount).toBe(15000);
        expect(earning.taxFreeAmount).toBe(9000);
        expect(earning.taxableAmount).toBe(6000);
        expect(earning.wageTax).toBe(600);
        expect(earning.aovTax).toBe(300);
        expect(earning.awwTax).toBe(30);
        expect(earning.totalTax).toBe(930);
        expect(earning.allowanceType).toBe('tax_free_sum_monthly');
        expect(earning.effectiveTaxRate).toBe(0.155);

        // Verify synthetic tax components
        expect(components.taxes).toHaveLength(3);
        const wageTax = components.taxes.find(t => t.componentCode === 'WAGE_TAX');
        const aov = components.taxes.find(t => t.componentCode === 'AOV');
        const aww = components.taxes.find(t => t.componentCode === 'AWW');
        expect(wageTax.amount).toBe(600);
        expect(aov.amount).toBe(300);
        expect(aww.amount).toBe(30);

        // Verify summary
        expect(components.summary.totalEarnings).toBe(15000);
        expect(components.summary.totalTaxFree).toBe(9000);
        expect(components.summary.totalTaxable).toBe(6000);
        expect(components.summary.totalWageTax).toBe(600);
        expect(components.summary.totalAovTax).toBe(300);
        expect(components.summary.totalAwwTax).toBe(30);
        expect(components.summary.totalTaxes).toBe(930);
        expect(components.summary.netPay).toBe(14070);
      });
    });

    describe('Multiple Components - Regular + Overtime', () => {
      test('should return breakdown for multiple earning components', async () => {
        // Insert regular salary
        await pool.query(
          `INSERT INTO payroll.payroll_run_component (
            organization_id, payroll_run_id, paycheck_id, component_type,
            component_code, component_name, amount, is_taxable,
            calculation_metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            organizationId, payrollRunId, paycheckId, 'earning',
            'REGULAR_SALARY', 'Regular Salary', 12000, true,
            JSON.stringify({
              taxCalculation: {
                amount: 12000,
                taxFreeAmount: 9000,
                taxableAmount: 3000,
                wageTax: 300,
                aovTax: 150,
                awwTax: 15,
                totalTax: 465,
                allowanceType: 'tax_free_sum_monthly',
                effectiveTaxRate: 0.155
              }
            })
          ]
        );

        // Insert overtime
        await pool.query(
          `INSERT INTO payroll.payroll_run_component (
            organization_id, payroll_run_id, paycheck_id, component_type,
            component_code, component_name, amount, is_taxable,
            calculation_metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            organizationId, payrollRunId, paycheckId, 'earning',
            'OVERTIME', 'Overtime', 3000, true,
            JSON.stringify({
              taxCalculation: {
                amount: 3000,
                taxFreeAmount: 0,
                taxableAmount: 3000,
                wageTax: 300,
                aovTax: 150,
                awwTax: 15,
                totalTax: 465,
                allowanceType: null,
                effectiveTaxRate: 0.155
              }
            })
          ]
        );

        const response = await request(app)
          .get(`/api/paylinq/paychecks/${paycheckId}/components`)
          .set('Authorization', authToken)
          .expect(200);

        const { components } = response.body;

        // Verify both earnings
        expect(components.earnings).toHaveLength(2);
        const regular = components.earnings.find(e => e.componentCode === 'REGULAR_SALARY');
        const overtime = components.earnings.find(e => e.componentCode === 'OVERTIME');

        expect(regular.taxFreeAmount).toBe(9000);
        expect(regular.allowanceType).toBe('tax_free_sum_monthly');

        expect(overtime.taxFreeAmount).toBe(0);
        expect(overtime.allowanceType).toBeNull();

        // Verify summary aggregation
        expect(components.summary.totalEarnings).toBe(15000);
        expect(components.summary.totalTaxFree).toBe(9000);
        expect(components.summary.totalTaxable).toBe(6000);
        expect(components.summary.totalTaxes).toBe(930);
      });
    });

    describe('Multiple Components - Regular + Vakantiegeld', () => {
      test('should return breakdown with different allowance types', async () => {
        // Update paycheck totals
        await pool.query(
          `UPDATE payroll.paycheck 
           SET gross_pay = 13000, tax_free_allowance = 11016, taxable_income = 1984,
               wage_tax = 198, aov_tax = 99, aww_tax = 10, net_pay = 12693
           WHERE id = $1`,
          [paycheckId]
        );

        // Insert regular salary
        await pool.query(
          `INSERT INTO payroll.payroll_run_component (
            organization_id, payroll_run_id, paycheck_id, component_type,
            component_code, component_name, amount, is_taxable,
            calculation_metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            organizationId, payrollRunId, paycheckId, 'earning',
            'REGULAR_SALARY', 'Regular Salary', 10000, true,
            JSON.stringify({
              taxCalculation: {
                amount: 10000,
                taxFreeAmount: 9000,
                taxableAmount: 1000,
                wageTax: 100,
                aovTax: 50,
                awwTax: 5,
                totalTax: 155,
                allowanceType: 'tax_free_sum_monthly',
                effectiveTaxRate: 0.155
              }
            })
          ]
        );

        // Insert vakantiegeld
        await pool.query(
          `INSERT INTO payroll.payroll_run_component (
            organization_id, payroll_run_id, paycheck_id, component_type,
            component_code, component_name, amount, is_taxable,
            calculation_metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            organizationId, payrollRunId, paycheckId, 'earning',
            'VAKANTIEGELD', 'Vakantiegeld', 3000, true,
            JSON.stringify({
              taxCalculation: {
                amount: 3000,
                taxFreeAmount: 2016,
                taxableAmount: 984,
                wageTax: 98,
                aovTax: 49,
                awwTax: 5,
                totalTax: 152,
                allowanceType: 'holiday_allowance',
                effectiveTaxRate: 0.155
              }
            })
          ]
        );

        const response = await request(app)
          .get(`/api/paylinq/paychecks/${paycheckId}/components`)
          .set('Authorization', authToken)
          .expect(200);

        const { components } = response.body;

        expect(components.earnings).toHaveLength(2);

        const regular = components.earnings.find(e => e.componentCode === 'REGULAR_SALARY');
        expect(regular.allowanceType).toBe('tax_free_sum_monthly');
        expect(regular.taxFreeAmount).toBe(9000);

        const vakantie = components.earnings.find(e => e.componentCode === 'VAKANTIEGELD');
        expect(vakantie.allowanceType).toBe('holiday_allowance');
        expect(vakantie.taxFreeAmount).toBe(2016);
        expect(vakantie.allowanceApplied).toBe(2016);

        // Verify summary
        expect(components.summary.totalEarnings).toBe(13000);
        expect(components.summary.totalTaxFree).toBe(11016);
        expect(components.summary.totalTaxable).toBe(1984);
      });
    });

    describe('With Deductions and Benefits', () => {
      test('should include deductions and benefits in breakdown', async () => {
        // Insert earnings
        await pool.query(
          `INSERT INTO payroll.payroll_run_component (
            organization_id, payroll_run_id, paycheck_id, component_type,
            component_code, component_name, amount, is_taxable,
            calculation_metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            organizationId, payrollRunId, paycheckId, 'earning',
            'REGULAR_SALARY', 'Regular Salary', 15000, true,
            JSON.stringify({
              taxCalculation: {
                amount: 15000,
                taxFreeAmount: 9000,
                taxableAmount: 6000,
                wageTax: 600,
                aovTax: 300,
                awwTax: 30,
                totalTax: 930,
                allowanceType: 'tax_free_sum_monthly',
                effectiveTaxRate: 0.155
              }
            })
          ]
        );

        // Insert deduction
        await pool.query(
          `INSERT INTO payroll.payroll_run_component (
            organization_id, payroll_run_id, paycheck_id, component_type,
            component_code, component_name, amount, is_taxable,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [
            organizationId, payrollRunId, paycheckId, 'deduction',
            'HEALTH_INS', 'Health Insurance', 300, false
          ]
        );

        // Insert benefit
        await pool.query(
          `INSERT INTO payroll.payroll_run_component (
            organization_id, payroll_run_id, paycheck_id, component_type,
            component_code, component_name, amount, is_taxable,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [
            organizationId, payrollRunId, paycheckId, 'benefit',
            'COMPANY_CAR', 'Company Car', 500, false
          ]
        );

        const response = await request(app)
          .get(`/api/paylinq/paychecks/${paycheckId}/components`)
          .set('Authorization', authToken)
          .expect(200);

        const { components } = response.body;

        expect(components.earnings).toHaveLength(1);
        expect(components.deductions).toHaveLength(1);
        expect(components.benefits).toHaveLength(1);

        expect(components.deductions[0].componentCode).toBe('HEALTH_INS');
        expect(components.deductions[0].amount).toBe(300);

        expect(components.benefits[0].componentCode).toBe('COMPANY_CAR');
        expect(components.benefits[0].amount).toBe(500);

        expect(components.summary.totalDeductions).toBe(300);
      });
    });

    describe('Multi-Tenant Security', () => {
      test('should return 404 for paycheck from different organization', async () => {
        // Create another organization
        const otherOrgResult = await pool.query(
          `INSERT INTO organizations (name, slug, created_at, updated_at) 
           VALUES ($1, $2, NOW(), NOW()) RETURNING id`,
          ['Other Org', 'other-org']
        );
        const otherOrgId = otherOrgResult.rows[0].id;

        // Create paycheck in other organization
        const otherRunResult = await pool.query(
          `INSERT INTO payroll.payroll_run (
            organization_id, run_number, run_name, pay_period_start, pay_period_end,
            payment_date, status, total_employees, total_gross_pay, total_net_pay,
            total_taxes, total_deductions, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()) RETURNING id`,
          [
            otherOrgId, 'RUN-OTHER', 'Other Run', '2025-12-01', '2025-12-31',
            '2025-12-31', 'calculated', 1, 10000, 9000, 1000, 0, userId
          ]
        );

        const otherCheckResult = await pool.query(
          `INSERT INTO payroll.paycheck (
            organization_id, payroll_run_id, employee_id, payment_date,
            pay_period_start, pay_period_end, gross_pay, taxable_income,
            tax_free_allowance, wage_tax, aov_tax, aww_tax, net_pay,
            payment_method, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()) RETURNING id`,
          [
            otherOrgId, otherRunResult.rows[0].id, employeeId, '2025-12-31',
            '2025-12-01', '2025-12-31', 10000, 5000,
            5000, 500, 250, 25, 9000,
            'bank_transfer', 'pending'
          ]
        );
        const otherPaycheckId = otherCheckResult.rows[0].id;

        // Try to access paycheck from different org
        const response = await request(app)
          .get(`/api/paylinq/paychecks/${otherPaycheckId}/components`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/not found/i);

        // Cleanup
        await pool.query('DELETE FROM payroll.paycheck WHERE id = $1', [otherPaycheckId]);
        await pool.query('DELETE FROM payroll.payroll_run WHERE id = $1', [otherRunResult.rows[0].id]);
        await pool.query('DELETE FROM organizations WHERE id = $1', [otherOrgId]);
      });

      test('should return 401 for unauthenticated request', async () => {
        await request(app)
          .get(`/api/paylinq/paychecks/${paycheckId}/components`)
          .expect(401);
      });
    });

    describe('Error Handling', () => {
      test('should return 404 for non-existent paycheck', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';

        const response = await request(app)
          .get(`/api/paylinq/paychecks/${fakeId}/components`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toMatch(/not found/i);
      });

      test('should return 400 for invalid UUID format', async () => {
        await request(app)
          .get('/api/paylinq/paychecks/invalid-uuid/components')
          .set('Authorization', authToken)
          .expect(400);
      });

      test('should handle paycheck with no components gracefully', async () => {
        const response = await request(app)
          .get(`/api/paylinq/paychecks/${paycheckId}/components`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.components.earnings).toHaveLength(0);
        expect(response.body.components.taxes).toHaveLength(0);
        expect(response.body.components.summary.totalEarnings).toBe(0);
        expect(response.body.components.summary.totalTaxes).toBe(0);
      });
    });

    describe('Component Ordering', () => {
      test('should return components ordered by type and code', async () => {
        // Insert multiple components
        await pool.query(
          `INSERT INTO payroll.payroll_run_component (
            organization_id, payroll_run_id, paycheck_id, component_type,
            component_code, component_name, amount, is_taxable,
            calculation_metadata, created_at, updated_at
          ) VALUES 
            ($1, $2, $3, 'earning', 'OVERTIME', 'Overtime', 2000, true, $9, NOW(), NOW()),
            ($1, $2, $3, 'earning', 'REGULAR_SALARY', 'Regular Salary', 12000, true, $10, NOW(), NOW()),
            ($1, $2, $3, 'deduction', 'HEALTH_INS', 'Health Insurance', 300, false, NULL, NOW(), NOW()),
            ($1, $2, $3, 'benefit', 'COMPANY_CAR', 'Company Car', 500, false, NULL, NOW(), NOW())`,
          [
            organizationId, payrollRunId, paycheckId,
            JSON.stringify({ taxCalculation: { amount: 2000, taxFreeAmount: 0, taxableAmount: 2000, wageTax: 200, aovTax: 100, awwTax: 10, totalTax: 310, allowanceType: null, effectiveTaxRate: 0.155 } }),
            JSON.stringify({ taxCalculation: { amount: 12000, taxFreeAmount: 9000, taxableAmount: 3000, wageTax: 300, aovTax: 150, awwTax: 15, totalTax: 465, allowanceType: 'tax_free_sum_monthly', effectiveTaxRate: 0.155 } })
          ]
        );

        const response = await request(app)
          .get(`/api/paylinq/paychecks/${paycheckId}/components`)
          .set('Authorization', authToken)
          .expect(200);

        const { components } = response.body;

        // Verify components are grouped by type
        expect(components.earnings).toHaveLength(2);
        expect(components.taxes).toHaveLength(3);
        expect(components.deductions).toHaveLength(1);
        expect(components.benefits).toHaveLength(1);

        // Verify earnings are ordered (REGULAR_SALARY before OVERTIME alphabetically)
        expect(components.earnings[0].componentCode).toBe('OVERTIME');
        expect(components.earnings[1].componentCode).toBe('REGULAR_SALARY');
      });
    });
  });
});
