/**
 * E2E Test: Pay Template Workflow - Scenario 10
 * Multi-Currency Components
 * 
 * Tests multi-currency pay components with different currencies:
 * - Base salary in SRD (Surinamese Dollar)
 * - Allowance in USD with currency override
 * - Bonus in EUR with exchange rate handling
 * - Multi-currency paycheck validation
 * 
 * @module tests/products/paylinq/e2e/payTemplateWorkflow-scenario10
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { cleanupTestEmployees } from '../helpers/employeeTestHelper.js';

// Uses cookie-based authentication per security requirements
describe('Scenario 10: Multi-Currency Payroll', () => {
  let authCookies;
  let organizationId;
  let userId;
  let testWorkers = [];
  let testTemplates = [];
  let testPayrollRuns = [];

  // Exchange rates (as of test date)
  const EXCHANGE_RATES = {
    USD_TO_SRD: 28.50,
    EUR_TO_SRD: 31.20,
    SRD_TO_USD: 1 / 28.50,
    SRD_TO_EUR: 1 / 31.20
  };

  beforeAll(async () => {
    // Create test organization
    organizationId = uuidv4();
    await pool.query(
      `INSERT INTO organizations (id, name, slug, tier)
       VALUES ($1, $2, $3, $4)`,
      [organizationId, 'Test Org MultiCurrency', 'testmulticur', 'professional']
    );

    // Create test user
    userId = uuidv4();
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    await pool.query(
      `INSERT INTO hris.user_account (id, organization_id, email, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, organizationId, 'admin@testmulticur.com', hashedPassword, true]
    );

    // Login to get auth cookies
    const loginResponse = await request(app)
      .post('/api/auth/tenant/login')
      .send({
        email: 'admin@testmulticurrency.com',
        password: 'testpassword123'
      });

    expect(loginResponse.status).toBe(200);
    authCookies = loginResponse.headers['set-cookie'];
    expect(authCookies).toBeDefined();
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    if (testPayrollRuns.length > 0) {
      await pool.query(
        'DELETE FROM payroll.payroll_runs WHERE id = ANY($1::uuid[])',
        [testPayrollRuns]
      );
    }

    if (testWorkers.length > 0) {
      await pool.query(
        'DELETE FROM payroll.worker_pay_structures WHERE employee_id = ANY($1::uuid[])',
        [testWorkers]
      );
    }

    if (testTemplates.length > 0) {
      await pool.query(
        'DELETE FROM payroll.pay_structure_template_components WHERE template_id = ANY($1::uuid[])',
        [testTemplates]
      );
      await pool.query(
        'DELETE FROM payroll.pay_structure_templates WHERE id = ANY($1::uuid[])',
        [testTemplates]
      );
    }

    await cleanupTestEmployees(testWorkers, organizationId);

    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);

    await pool.end();
  });

  /**
   * Helper: Create test worker
   */
  async function createTestWorker(employeeNumber, firstName, lastName) {
    const workerResponse = await request(app)
      .post('/api/products/paylinq/workers')
      .set('Cookie', authCookies)
      .send({
        employeeNumber,
        firstName,
        lastName,
        dateOfBirth: '1988-01-01',
        hireDate: '2024-01-01',
        status: 'active',
        metadata: {
          baseCurrency: 'SRD'
        }
      });

    expect(workerResponse.status).toBe(201);
    const workerId = workerResponse.body.worker.id;
    testWorkers.push(workerId);
    return workerId;
  }

  /**
   * Helper: Create pay template
   */
  async function createPayTemplate(templateData) {
    const response = await request(app)
      .post('/api/products/paylinq/pay-structures/templates')
      .set('Cookie', authCookies)
      .send(templateData);

    expect(response.status).toBe(201);
    const templateId = response.body.template.id;
    testTemplates.push(templateId);
    return templateId;
  }

  /**
   * Helper: Add component to template
   */
  async function addComponentToTemplate(templateId, componentData) {
    const response = await request(app)
      .post(`/api/products/paylinq/pay-structures/templates/${templateId}/components`)
      .set('Cookie', authCookies)
      .send(componentData);

    expect(response.status).toBe(201);
    return response.body.component;
  }

  /**
   * Helper: Assign template to worker
   */
  async function assignTemplateToWorker(workerId, templateId, effectiveDate = '2024-11-01') {
    const response = await request(app)
      .post(`/api/products/paylinq/pay-structures/workers/${workerId}/assignments`)
      .set('Cookie', authCookies)
      .send({
        templateId,
        effectiveDate
      });

    expect(response.status).toBe(201);
    return response.body.assignment;
  }

  /**
   * Helper: Run payroll
   */
  async function runPayroll(payrollData) {
    const createResponse = await request(app)
      .post('/api/products/paylinq/payroll-runs')
      .set('Cookie', authCookies)
      .send(payrollData);

    expect(createResponse.status).toBe(201);
    const payrollRunId = createResponse.body.payrollRun.id;
    testPayrollRuns.push(payrollRunId);

    const calculateResponse = await request(app)
      .post(`/api/products/paylinq/payroll-runs/${payrollRunId}/calculate`)
      .set('Cookie', authCookies)
      .send();

    expect(calculateResponse.status).toBe(200);

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${payrollRunId}/paychecks`)
      .set('Cookie', authCookies);

    expect(paychecksResponse.status).toBe(200);

    return {
      payrollRunId,
      paychecks: paychecksResponse.body.paychecks
    };
  }

  it('should create worker with SRD base currency', async () => {
    const workerId = await createTestWorker('EMP-MC-001', 'Multi', 'Currency');
    expect(workerId).toBeDefined();
  });

  it('should create multi-currency pay template', async () => {
    const templateId = await createPayTemplate({
      templateCode: 'MULTI_CURRENCY_TEMPLATE',
      templateName: 'Multi-Currency Pay Template',
      description: 'Template with components in different currencies',
      currency: 'SRD', // Base currency
      status: 'draft'
    });

    expect(templateId).toBeDefined();
  });

  it('should add base salary component in SRD', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'BASE_SALARY_SRD',
      componentName: 'Base Salary (SRD)',
      componentType: 'earning',
      category: 'regular_pay',
      calculationType: 'fixed_amount',
      fixedAmount: 50000.00,
      defaultCurrency: 'SRD',
      allowCurrencyOverride: false,
      sequenceOrder: 1,
      isMandatory: true,
      isVisibleOnPayslip: true,
      isTaxable: true
    });

    expect(component.componentCode).toBe('BASE_SALARY_SRD');
    expect(component.defaultCurrency).toBe('SRD');
    expect(component.fixedAmount).toBe(50000.00);
  });

  it('should add housing allowance in USD with currency override', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'HOUSING_ALLOWANCE_USD',
      componentName: 'Housing Allowance (USD)',
      componentType: 'earning',
      category: 'allowance',
      calculationType: 'fixed_amount',
      fixedAmount: 500.00, // USD 500
      defaultCurrency: 'USD',
      allowCurrencyOverride: true, // Can be overridden at worker level
      sequenceOrder: 2,
      isMandatory: false,
      isVisibleOnPayslip: true,
      isTaxable: true,
      metadata: {
        description: 'Housing allowance in USD',
        exchangeRateDate: '2024-11-01'
      }
    });

    expect(component.componentCode).toBe('HOUSING_ALLOWANCE_USD');
    expect(component.defaultCurrency).toBe('USD');
    expect(component.allowCurrencyOverride).toBe(true);
  });

  it('should add performance bonus in EUR', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'BONUS_EUR',
      componentName: 'Performance Bonus (EUR)',
      componentType: 'earning',
      category: 'bonus',
      calculationType: 'fixed_amount',
      fixedAmount: 1000.00, // EUR 1,000
      defaultCurrency: 'EUR',
      allowCurrencyOverride: false,
      sequenceOrder: 3,
      isMandatory: false,
      isVisibleOnPayslip: true,
      isTaxable: true,
      isRecurring: false,
      metadata: {
        description: 'Quarterly performance bonus in EUR',
        exchangeRateDate: '2024-11-01'
      }
    });

    expect(component.componentCode).toBe('BONUS_EUR');
    expect(component.defaultCurrency).toBe('EUR');
  });

  it('should add tax deduction (percentage of total gross in base currency)', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'INCOME_TAX',
      componentName: 'Income Tax',
      componentType: 'deduction',
      category: 'tax',
      calculationType: 'percentage',
      percentage: 20.0,
      defaultCurrency: 'SRD', // Tax calculated in base currency
      sequenceOrder: 4,
      isMandatory: true,
      isVisibleOnPayslip: true,
      appliesToGross: true
    });

    expect(component.componentCode).toBe('INCOME_TAX');
    expect(component.percentage).toBe(20.0);
  });

  it('should publish template', async () => {
    const templateId = testTemplates[0];

    const response = await request(app)
      .post(`/api/products/paylinq/pay-structures/templates/${templateId}/publish`)
      .set('Cookie', authCookies)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.template.status).toBe('published');
  });

  it('should assign template to worker', async () => {
    const workerId = testWorkers[0];
    const templateId = testTemplates[0];

    const assignment = await assignTemplateToWorker(workerId, templateId, '2024-11-01');

    expect(assignment).toBeDefined();
  });

  it('should run payroll with multi-currency conversion', async () => {
    const result = await runPayroll({
      runTypeCode: 'MONTHLY',
      periodStart: '2024-11-01',
      periodEnd: '2024-11-30',
      payDate: '2024-11-30',
      metadata: {
        exchangeRates: {
          USD: EXCHANGE_RATES.USD_TO_SRD,
          EUR: EXCHANGE_RATES.EUR_TO_SRD,
          effectiveDate: '2024-11-01'
        }
      }
    });

    expect(result.paychecks).toBeDefined();
    expect(result.paychecks.length).toBeGreaterThan(0);
  });

  it('should validate multi-currency calculations on paycheck', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);
    expect(paycheck).toBeDefined();

    // Expected calculations (all converted to SRD base currency):
    // 1. Base Salary: SRD 50,000
    // 2. Housing (USD): USD 500 × 28.50 = SRD 14,250
    // 3. Bonus (EUR): EUR 1,000 × 31.20 = SRD 31,200
    // Total gross: SRD 95,450

    // Components should show original currency AND converted amount
    const baseSalary = paycheck.components.find(c => c.componentCode === 'BASE_SALARY_SRD');
    expect(baseSalary).toBeDefined();
    expect(baseSalary.amount).toBeCloseTo(50000.00, 2);
    expect(baseSalary.currency).toBe('SRD');

    const housingAllowance = paycheck.components.find(c => c.componentCode === 'HOUSING_ALLOWANCE_USD');
    expect(housingAllowance).toBeDefined();
    expect(housingAllowance.originalAmount).toBeCloseTo(500.00, 2);
    expect(housingAllowance.originalCurrency).toBe('USD');
    expect(housingAllowance.amount).toBeCloseTo(14250.00, 2); // Converted to SRD
    expect(housingAllowance.currency).toBe('SRD');
    expect(housingAllowance.exchangeRate).toBeCloseTo(28.50, 2);

    const bonus = paycheck.components.find(c => c.componentCode === 'BONUS_EUR');
    expect(bonus).toBeDefined();
    expect(bonus.originalAmount).toBeCloseTo(1000.00, 2);
    expect(bonus.originalCurrency).toBe('EUR');
    expect(bonus.amount).toBeCloseTo(31200.00, 2); // Converted to SRD
    expect(bonus.currency).toBe('SRD');
    expect(bonus.exchangeRate).toBeCloseTo(31.20, 2);

    // Gross pay should be sum of all earnings in base currency
    expect(paycheck.grossPay).toBeCloseTo(95450.00, 2);
    expect(paycheck.currency).toBe('SRD');
  });

  it('should validate tax calculation on converted gross', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    // Tax: 20% of gross (SRD 95,450) = SRD 19,090
    const tax = paycheck.components.find(c => c.componentCode === 'INCOME_TAX');
    expect(tax).toBeDefined();
    expect(tax.amount).toBeCloseTo(19090.00, 2);
    expect(tax.currency).toBe('SRD');

    // Net pay: 95,450 - 19,090 = SRD 76,360
    expect(paycheck.netPay).toBeCloseTo(76360.00, 2);
  });

  it('should verify exchange rate metadata on paycheck', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    // Paycheck should include exchange rate information
    expect(paycheck.metadata.exchangeRates).toBeDefined();
    expect(paycheck.metadata.exchangeRates.USD).toBeCloseTo(28.50, 2);
    expect(paycheck.metadata.exchangeRates.EUR).toBeCloseTo(31.20, 2);
    expect(paycheck.metadata.baseCurrency).toBe('SRD');
    expect(paycheck.metadata.exchangeRateDate).toBe('2024-11-01');
  });

  it('should verify multi-currency breakdown in paycheck summary', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    // Paycheck should include breakdown by original currency
    expect(paycheck.metadata.currencyBreakdown).toBeDefined();
    
    const breakdown = paycheck.metadata.currencyBreakdown;
    expect(breakdown.SRD).toBeCloseTo(50000.00, 2);
    expect(breakdown.USD).toBeCloseTo(500.00, 2);
    expect(breakdown.EUR).toBeCloseTo(1000.00, 2);

    // Should also show total in base currency
    expect(paycheck.metadata.totalInBaseCurrency).toBeCloseTo(95450.00, 2);
  });
});
