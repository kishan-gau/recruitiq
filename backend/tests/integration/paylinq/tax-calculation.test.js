/**
 * Tax Calculation Service - Integration Tests
 * 
 * Tests the complete tax calculation workflow with real database interactions.
 * This tests the orchestration of multiple services and repositories together.
 * 
 * Coverage:
 * - calculateEmployeeTaxes (orchestration method)
 * - End-to-end tax calculation workflow
 * - Database interactions with tax rules, brackets, deductions
 * 
 * @module tests/integration/paylinq/tax-calculation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/server.js';
import pool from '../../../src/config/database.js';
import { TaxCalculationService } from '../../../src/products/paylinq/services/taxCalculationService.js';

describe('Tax Calculation - Integration Tests', () => {
  let testOrgId;
  let testUserId;
  let testEmployeeRecordId;
  let testTaxRuleSetId;
  let authToken;

  beforeAll(async () => {
    // Setup test organization
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name)
      VALUES (gen_random_uuid(), 'Test Tax Org')
      RETURNING id
    `);
    testOrgId = orgResult.rows[0].id;

    // Setup test user
    const userResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, organization_id, role)
      VALUES (gen_random_uuid(), 'taxtest@example.com', '$2b$10$dummyhash', $1, 'admin')
      RETURNING id
    `, [testOrgId]);
    testUserId = userResult.rows[0].id;

    // Setup test employee record
    const employeeResult = await pool.query(`
      INSERT INTO paylinq.employee_records (
        id, organization_id, employee_id, first_name, last_name,
        is_suriname_resident, created_by
      )
      VALUES (gen_random_uuid(), $1, 'EMP001', 'Test', 'Employee', true, $2)
      RETURNING id
    `, [testOrgId, testUserId]);
    testEmployeeRecordId = employeeResult.rows[0].id;

    // Setup basic tax rule set
    const taxRuleResult = await pool.query(`
      INSERT INTO paylinq.tax_rule_sets (
        id, organization_id, rule_set_name, tax_type, tax_name,
        country, effective_date_start, created_by, is_active
      )
      VALUES (
        gen_random_uuid(), $1, 'Surinamese Wage Tax', 'wage',
        'Surinamese Income Tax', 'SR', '2025-01-01', $2, true
      )
      RETURNING id
    `, [testOrgId, testUserId]);
    testTaxRuleSetId = taxRuleResult.rows[0].id;

    // Setup tax brackets for the rule set
    await pool.query(`
      INSERT INTO paylinq.tax_brackets (
        id, tax_rule_set_id, organization_id, bracket_order,
        income_min, income_max, rate_percentage, fixed_amount, created_by
      )
      VALUES
        (gen_random_uuid(), $1, $2, 1, 0, 10000, 10, 0, $3),
        (gen_random_uuid(), $1, $2, 2, 10000, 50000, 20, 1000, $3)
    `, [testTaxRuleSetId, testOrgId, testUserId]);

    // Generate auth token for API tests
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'taxtest@example.com',
        password: 'password123'
      });

    authToken = loginResponse.headers['set-cookie'];
  });

  afterAll(async () => {
    // Cleanup in reverse order (respect foreign keys)
    await pool.query('DELETE FROM paylinq.tax_brackets WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM paylinq.tax_rule_sets WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM paylinq.employee_records WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [testOrgId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);

    // Close database connection
    await pool.end();
  });

  describe('calculateEmployeeTaxes - Full Workflow', () => {
    it('should calculate taxes for resident employee with tax-free allowance', async () => {
      // Arrange: Real service with real database
      const service = new TaxCalculationService();
      const grossPay = 15000; // SRD 15,000
      const payDate = new Date('2025-01-15');
      const payPeriod = 'monthly';

      // Act: Call the orchestration method
      const result = await service.calculateEmployeeTaxes(
        testEmployeeRecordId,
        grossPay,
        payDate,
        payPeriod,
        testOrgId
      );

      // Assert: Verify complete calculation
      expect(result).toBeDefined();
      expect(result.employeeRecordId).toBe(testEmployeeRecordId);
      expect(result.grossPay).toBe(grossPay);
      expect(result.taxFreeAllowance).toBeGreaterThan(0); // Resident gets allowance
      expect(result.taxableIncome).toBe(grossPay - result.taxFreeAllowance);
      expect(result.federalTax).toBeGreaterThan(0); // Should have wage tax
      expect(result.totalTaxes).toBeGreaterThan(0);

      // Verify calculation logic
      expect(result.totalTaxes).toBe(
        result.federalTax + result.stateTax + result.socialSecurity + result.medicare
      );
    });

    it('should calculate taxes for non-resident employee (no tax-free allowance)', async () => {
      // Arrange: Create non-resident employee
      const nonResidentResult = await pool.query(`
        INSERT INTO paylinq.employee_records (
          id, organization_id, employee_id, first_name, last_name,
          is_suriname_resident, created_by
        )
        VALUES (gen_random_uuid(), $1, 'EMP002', 'Non', 'Resident', false, $2)
        RETURNING id
      `, [testOrgId, testUserId]);
      const nonResidentId = nonResidentResult.rows[0].id;

      const service = new TaxCalculationService();
      const grossPay = 15000;

      // Act
      const result = await service.calculateEmployeeTaxes(
        nonResidentId,
        grossPay,
        new Date('2025-01-15'),
        'monthly',
        testOrgId
      );

      // Assert: Non-resident should have ZERO tax-free allowance
      expect(result.taxFreeAllowance).toBe(0);
      expect(result.taxableIncome).toBe(grossPay); // Full amount is taxable

      // Cleanup
      await pool.query('DELETE FROM paylinq.employee_records WHERE id = $1', [nonResidentId]);
    });

    it('should handle employee with pre-tax deductions', async () => {
      // Arrange: Create deduction
      const deductionResult = await pool.query(`
        INSERT INTO paylinq.deductions (
          id, organization_id, employee_record_id, deduction_type,
          deduction_amount, is_pre_tax, effective_date, created_by, is_active
        )
        VALUES (
          gen_random_uuid(), $1, $2, 'pension', 1000, true, '2025-01-01', $3, true
        )
        RETURNING id
      `, [testOrgId, testEmployeeRecordId, testUserId]);
      const deductionId = deductionResult.rows[0].id;

      const service = new TaxCalculationService();
      const grossPay = 15000;

      // Act
      const result = await service.calculateEmployeeTaxes(
        testEmployeeRecordId,
        grossPay,
        new Date('2025-01-15'),
        'monthly',
        testOrgId
      );

      // Assert: Pre-tax deduction should reduce taxable income
      expect(result.preTaxDeductions).toBeGreaterThan(0);
      expect(result.taxableIncome).toBeLessThan(grossPay - result.taxFreeAllowance);

      // Cleanup
      await pool.query('DELETE FROM paylinq.deductions WHERE id = $1', [deductionId]);
    });

    it('should use default brackets when no custom tax rules exist', async () => {
      // Arrange: Create organization without custom tax rules
      const org2Result = await pool.query(`
        INSERT INTO organizations (id, name)
        VALUES (gen_random_uuid(), 'No Rules Org')
        RETURNING id
      `);
      const org2Id = org2Result.rows[0].id;

      const user2Result = await pool.query(`
        INSERT INTO hris.user_account (id, email, password_hash, organization_id, role)
        VALUES (gen_random_uuid(), 'norules@example.com', '$2b$10$hash', $1, 'admin')
        RETURNING id
      `, [org2Id]);
      const user2Id = user2Result.rows[0].id;

      const emp2Result = await pool.query(`
        INSERT INTO paylinq.employee_records (
          id, organization_id, employee_id, first_name, last_name,
          is_suriname_resident, created_by
        )
        VALUES (gen_random_uuid(), $1, 'EMP003', 'Test', 'Default', true, $2)
        RETURNING id
      `, [org2Id, user2Id]);
      const emp2Id = emp2Result.rows[0].id;

      const service = new TaxCalculationService();

      // Act: Should fall back to default Surinamese brackets
      const result = await service.calculateEmployeeTaxes(
        emp2Id,
        15000,
        new Date('2025-01-15'),
        'monthly',
        org2Id
      );

      // Assert: Should still calculate taxes using defaults
      expect(result).toBeDefined();
      expect(result.federalTax).toBeGreaterThan(0);

      // Cleanup
      await pool.query('DELETE FROM paylinq.employee_records WHERE organization_id = $1', [org2Id]);
      await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [org2Id]);
      await pool.query('DELETE FROM organizations WHERE id = $1', [org2Id]);
    });
  });

  describe('API Integration - Tax Calculation Endpoint', () => {
    it('should calculate taxes via API endpoint', async () => {
      // Act: Call API endpoint
      const response = await request(app)
        .post('/api/products/paylinq/tax-calculations')
        .set('Cookie', authToken)
        .send({
          employeeRecordId: testEmployeeRecordId,
          grossPay: 15000,
          payDate: '2025-01-15',
          payPeriod: 'monthly'
        })
        .expect(200);

      // Assert: API response
      expect(response.body.success).toBe(true);
      expect(response.body.taxCalculation).toBeDefined();
      expect(response.body.taxCalculation.grossPay).toBe(15000);
      expect(response.body.taxCalculation.totalTaxes).toBeGreaterThan(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/products/paylinq/tax-calculations')
        .send({
          employeeRecordId: testEmployeeRecordId,
          grossPay: 15000,
          payDate: '2025-01-15',
          payPeriod: 'monthly'
        })
        .expect(401);
    });

    it('should return 403 for cross-organization access attempt', async () => {
      // Arrange: Create another organization's employee
      const org2Result = await pool.query(`
        INSERT INTO organizations (id, name)
        VALUES (gen_random_uuid(), 'Other Org')
        RETURNING id
      `);
      const org2Id = org2Result.rows[0].id;

      const emp2Result = await pool.query(`
        INSERT INTO paylinq.employee_records (
          id, organization_id, employee_id, first_name, last_name, created_by
        )
        VALUES (gen_random_uuid(), $1, 'EMP999', 'Other', 'Org', $2)
        RETURNING id
      `, [org2Id, testUserId]);
      const emp2Id = emp2Result.rows[0].id;

      // Act: Try to access other org's employee
      await request(app)
        .post('/api/products/paylinq/tax-calculations')
        .set('Cookie', authToken)
        .send({
          employeeRecordId: emp2Id, // From different organization
          grossPay: 15000,
          payDate: '2025-01-15',
          payPeriod: 'monthly'
        })
        .expect(403); // Forbidden - tenant isolation

      // Cleanup
      await pool.query('DELETE FROM paylinq.employee_records WHERE organization_id = $1', [org2Id]);
      await pool.query('DELETE FROM organizations WHERE id = $1', [org2Id]);
    });
  });
});
