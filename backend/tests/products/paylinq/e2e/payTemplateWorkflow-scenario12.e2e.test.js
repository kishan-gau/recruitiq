/**
 * E2E Test: Pay Template Workflow - Scenario 12
 * Tax-Free Allowances & Reimbursements
 * 
 * Tests non-taxable components:
 * - Tax-free transportation allowance
 * - Meal reimbursement (non-taxable)
 * - Per diem allowance for business travel
 * - Equipment/uniform reimbursement
 * - Verification that these don't affect taxable income
 * 
 * @module tests/products/paylinq/e2e/payTemplateWorkflow-scenario12
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { cleanupTestEmployees } from '../helpers/employeeTestHelper.js';

// Uses cookie-based authentication per security requirements
describe('Scenario 12: Allowances and Benefits', () => {
  let authCookies;
  let organizationId;
  let userId;
  let testWorkers = [];
  let testTemplates = [];
  let testPayrollRuns = [];

  beforeAll(async () => {
    // Create test organization
    organizationId = uuidv4();
    await pool.query(
      `INSERT INTO organizations (id, name, slug, tier)
       VALUES ($1, $2, $3, $4)`,
      [organizationId, 'Test Org Reimbursements', 'testreimb', 'professional']
    );

    // Create test user
    userId = uuidv4();
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    await pool.query(
      `INSERT INTO hris.user_account (id, organization_id, email, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, organizationId, 'admin@testallowances.com', hashedPassword, true]
    );

    // Login to get auth cookies
    const loginResponse = await request(app)
      .post('/api/auth/tenant/login')
      .send({
        email: 'admin@testallowances.com',
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
  async function createTestWorker(employeeNumber, firstName, lastName, travelDays = 0) {
    const workerResponse = await request(app)
      .post('/api/products/paylinq/workers')
      .set('Cookie', authCookies)
      .send({
        employeeNumber,
        firstName,
        lastName,
        dateOfBirth: '1989-01-01',
        hireDate: '2024-01-01',
        status: 'active',
        metadata: {
          travelDays, // Business travel days for per diem
          hasUniform: true,
          mealDays: 22 // Working days in month
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

  it('should create worker with travel days', async () => {
    const workerId = await createTestWorker('EMP-REIMB-001', 'Travel', 'Employee', 5);
    expect(workerId).toBeDefined();
  });

  it('should create reimbursement pay template', async () => {
    const templateId = await createPayTemplate({
      templateCode: 'REIMBURSEMENT_TEMPLATE',
      templateName: 'Tax-Free Reimbursement Template',
      description: 'Template with non-taxable allowances and reimbursements',
      currency: 'USD',
      status: 'draft'
    });

    expect(templateId).toBeDefined();
  });

  it('should add base salary component (taxable)', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'BASE_SALARY',
      componentName: 'Base Salary',
      componentType: 'earning',
      category: 'regular_pay',
      calculationType: 'fixed_amount',
      fixedAmount: 8000.00,
      sequenceOrder: 1,
      isMandatory: true,
      isVisibleOnPayslip: true,
      isTaxable: true,
      affectsTaxableIncome: true
    });

    expect(component.componentCode).toBe('BASE_SALARY');
    expect(component.isTaxable).toBe(true);
  });

  it('should add transportation allowance (tax-free)', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'TRANSPORT_ALLOWANCE',
      componentName: 'Transportation Allowance',
      componentType: 'earning',
      category: 'allowance',
      calculationType: 'fixed_amount',
      fixedAmount: 300.00, // Fixed monthly transportation stipend
      sequenceOrder: 2,
      isMandatory: false,
      isVisibleOnPayslip: true,
      isTaxable: false, // Non-taxable per IRS/local regulations
      affectsTaxableIncome: false,
      gaapCategory: 'reimbursements',
      metadata: {
        description: 'Tax-free transportation allowance for commuting',
        accountingCode: 'REIMB-TRANS',
        justification: 'Business necessity'
      }
    });

    expect(component.componentCode).toBe('TRANSPORT_ALLOWANCE');
    expect(component.isTaxable).toBe(false);
    expect(component.affectsTaxableIncome).toBe(false);
  });

  it('should add meal reimbursement (tax-free)', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'MEAL_REIMBURSEMENT',
      componentName: 'Meal Reimbursement',
      componentType: 'earning',
      category: 'reimbursement',
      calculationType: 'unit_based',
      defaultRate: 15.00, // USD per meal/day
      sequenceOrder: 3,
      isMandatory: false,
      isVisibleOnPayslip: true,
      isTaxable: false, // Non-taxable when within IRS limits
      affectsTaxableIncome: false,
      gaapCategory: 'reimbursements',
      metadata: {
        description: 'Tax-free meal reimbursement (working days)',
        rateUnit: 'day',
        maxDailyAmount: 15.00,
        accountingCode: 'REIMB-MEAL'
      }
    });

    expect(component.componentCode).toBe('MEAL_REIMBURSEMENT');
    expect(component.isTaxable).toBe(false);
    expect(component.calculationType).toBe('unit_based');
  });

  it('should add per diem allowance (tax-free for business travel)', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'PER_DIEM',
      componentName: 'Per Diem Allowance',
      componentType: 'earning',
      category: 'allowance',
      calculationType: 'unit_based',
      defaultRate: 100.00, // USD per travel day
      sequenceOrder: 4,
      isMandatory: false,
      isVisibleOnPayslip: true,
      isTaxable: false, // Non-taxable for business travel
      affectsTaxableIncome: false,
      gaapCategory: 'reimbursements',
      metadata: {
        description: 'Tax-free per diem for business travel',
        rateUnit: 'day',
        maxDailyAmount: 100.00,
        requiresDocumentation: true,
        accountingCode: 'REIMB-TRAVEL'
      }
    });

    expect(component.componentCode).toBe('PER_DIEM');
    expect(component.isTaxable).toBe(false);
  });

  it('should add uniform/equipment reimbursement (tax-free)', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'UNIFORM_REIMBURSEMENT',
      componentName: 'Uniform/Equipment Reimbursement',
      componentType: 'earning',
      category: 'reimbursement',
      calculationType: 'fixed_amount',
      fixedAmount: 150.00, // Monthly uniform allowance
      sequenceOrder: 5,
      isMandatory: false,
      isVisibleOnPayslip: true,
      isTaxable: false, // Non-taxable when for business purposes
      affectsTaxableIncome: false,
      isRecurring: false, // Typically one-time or periodic
      gaapCategory: 'reimbursements',
      metadata: {
        description: 'Tax-free reimbursement for work uniform/equipment',
        accountingCode: 'REIMB-UNIFORM',
        requiresReceipt: true
      }
    });

    expect(component.componentCode).toBe('UNIFORM_REIMBURSEMENT');
    expect(component.isTaxable).toBe(false);
    expect(component.isRecurring).toBe(false);
  });

  it('should add tax deduction (only on taxable income)', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'INCOME_TAX',
      componentName: 'Income Tax',
      componentType: 'deduction',
      category: 'tax',
      calculationType: 'percentage',
      percentage: 22.0,
      sequenceOrder: 6,
      isMandatory: true,
      isVisibleOnPayslip: true,
      appliesToGross: false, // Only taxable components
      metadata: {
        description: 'Tax applied only to taxable income (excludes reimbursements)'
      }
    });

    expect(component.componentCode).toBe('INCOME_TAX');
    expect(component.appliesToGross).toBe(false);
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

  it('should run payroll with reimbursements', async () => {
    const result = await runPayroll({
      runTypeCode: 'MONTHLY',
      periodStart: '2024-11-01',
      periodEnd: '2024-11-30',
      payDate: '2024-11-30',
      metadata: {
        workerMetadata: {
          [testWorkers[0]]: {
            travelDays: 5, // Per diem for 5 travel days
            mealDays: 22, // Meal reimbursement for 22 working days
            hasUniform: true
          }
        }
      }
    });

    expect(result.paychecks).toBeDefined();
    expect(result.paychecks.length).toBeGreaterThan(0);
  });

  it('should validate tax-free allowances do not affect taxable income', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);
    expect(paycheck).toBeDefined();

    // Expected calculations:
    // Taxable income:
    // - Base salary: $8,000 (TAXABLE)
    // 
    // Non-taxable reimbursements:
    // - Transportation: $300
    // - Meals: 22 days × $15 = $330
    // - Per diem: 5 days × $100 = $500
    // - Uniform: $150
    // Total reimbursements: $1,280
    //
    // Total gross pay: $8,000 + $1,280 = $9,280
    // Taxable income: $8,000 (only base salary)

    const baseSalary = paycheck.components.find(c => c.componentCode === 'BASE_SALARY');
    expect(baseSalary).toBeDefined();
    expect(baseSalary.amount).toBeCloseTo(8000.00, 2);
    expect(baseSalary.isTaxable).toBe(true);

    const transportAllowance = paycheck.components.find(c => c.componentCode === 'TRANSPORT_ALLOWANCE');
    expect(transportAllowance).toBeDefined();
    expect(transportAllowance.amount).toBeCloseTo(300.00, 2);
    expect(transportAllowance.isTaxable).toBe(false);

    const mealReimbursement = paycheck.components.find(c => c.componentCode === 'MEAL_REIMBURSEMENT');
    expect(mealReimbursement).toBeDefined();
    expect(mealReimbursement.amount).toBeCloseTo(330.00, 2);
    expect(mealReimbursement.isTaxable).toBe(false);

    const perDiem = paycheck.components.find(c => c.componentCode === 'PER_DIEM');
    expect(perDiem).toBeDefined();
    expect(perDiem.amount).toBeCloseTo(500.00, 2);
    expect(perDiem.isTaxable).toBe(false);

    const uniform = paycheck.components.find(c => c.componentCode === 'UNIFORM_REIMBURSEMENT');
    expect(uniform).toBeDefined();
    expect(uniform.amount).toBeCloseTo(150.00, 2);
    expect(uniform.isTaxable).toBe(false);

    // Verify gross includes all components
    expect(paycheck.grossPay).toBeCloseTo(9280.00, 2);

    // Verify taxable income is only base salary
    expect(paycheck.taxableIncome).toBeCloseTo(8000.00, 2);
  });

  it('should validate tax calculated only on taxable income', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    // Tax should be 22% of taxable income ($8,000), not gross ($9,280)
    // Tax: $8,000 × 0.22 = $1,760

    const tax = paycheck.components.find(c => c.componentCode === 'INCOME_TAX');
    expect(tax).toBeDefined();
    expect(tax.amount).toBeCloseTo(1760.00, 2);
    
    // Tax base should be taxable income only
    expect(tax.metadata.taxBase).toBeCloseTo(8000.00, 2);
    expect(tax.metadata.excludedReimbursements).toBeCloseTo(1280.00, 2);
  });

  it('should validate net pay calculation', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    // Net pay: Gross - Tax
    // $9,280 - $1,760 = $7,520

    expect(paycheck.totalDeductions).toBeCloseTo(1760.00, 2);
    expect(paycheck.netPay).toBeCloseTo(7520.00, 2);
  });

  it('should verify GAAP categorization of reimbursements', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    // All reimbursements should be categorized as 'reimbursements'
    const reimbursementComponents = paycheck.components.filter(
      c => c.gaapCategory === 'reimbursements'
    );

    expect(reimbursementComponents.length).toBe(4); // Transport, meal, per diem, uniform

    reimbursementComponents.forEach(comp => {
      expect(comp.isTaxable).toBe(false);
      expect(comp.affectsTaxableIncome).toBe(false);
      expect(comp.gaapCategory).toBe('reimbursements');
    });
  });

  it('should verify accounting codes for reimbursements', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    const transport = paycheck.components.find(c => c.componentCode === 'TRANSPORT_ALLOWANCE');
    expect(transport.metadata.accountingCode).toBe('REIMB-TRANS');

    const meal = paycheck.components.find(c => c.componentCode === 'MEAL_REIMBURSEMENT');
    expect(meal.metadata.accountingCode).toBe('REIMB-MEAL');

    const travel = paycheck.components.find(c => c.componentCode === 'PER_DIEM');
    expect(travel.metadata.accountingCode).toBe('REIMB-TRAVEL');

    const uniform = paycheck.components.find(c => c.componentCode === 'UNIFORM_REIMBURSEMENT');
    expect(uniform.metadata.accountingCode).toBe('REIMB-UNIFORM');
  });

  it('should validate paycheck summary separates taxable vs non-taxable', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    // Paycheck summary should clearly separate:
    expect(paycheck.summary).toBeDefined();
    expect(paycheck.summary.taxableEarnings).toBeCloseTo(8000.00, 2);
    expect(paycheck.summary.nonTaxableEarnings).toBeCloseTo(1280.00, 2);
    expect(paycheck.summary.totalEarnings).toBeCloseTo(9280.00, 2);
    expect(paycheck.summary.taxableIncome).toBeCloseTo(8000.00, 2);
    expect(paycheck.summary.totalTax).toBeCloseTo(1760.00, 2);
    expect(paycheck.summary.netPay).toBeCloseTo(7520.00, 2);
  });
});
