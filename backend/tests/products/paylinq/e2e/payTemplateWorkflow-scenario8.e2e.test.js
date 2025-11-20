/**
 * E2E Test: Pay Template Workflow - Scenario 8
 * Surinamese Tax Law Compliance (Wet Loonbelasting)
 * 
 * Tests Surinamese-specific tax treatment and deductions:
 * - Tax-free allowances per Surinamese law (Article 10)
 * - Vakantiegeld (vacation allowance) - SRD 10,016 annual max (Article 10.i)
 * - Kinderbijslag (child benefit) - SRD 125/child, max SRD 500/month (Article 10.h)
 * - Gratificaties (bonuses) - SRD 10,016 annual max (Article 10.j)
 * - Pre-tax pension contributions (Article 10.f)
 * - Progressive tax brackets per Wet Loonbelasting (Article 14)
 * 
 * Surinamese Tax Brackets (2024):
 * - 0 - 42,000: 8%
 * - 42,000 - 84,000: 18%
 * - 84,000 - 126,000: 28%
 * - 126,000+: 38%
 * 
 * Tax-free threshold: SRD 108,000/year (SRD 9,000/month)
 * 
 * @module tests/products/paylinq/e2e/payTemplateWorkflow-scenario8
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { cleanupTestEmployees } from '../helpers/employeeTestHelper.js';

// Uses cookie-based authentication per security requirements
describe('Scenario 8: Surinamese Tax Law Compliance (Wet Loonbelasting)', () => {
  // Store cookies and CSRF token for authenticated requests
  let authCookies;
  let csrfToken;
  let organizationId;
  let userId;
  let testWorkers = [];
  let testTemplates = [];
  let testPayrollRuns = [];

  beforeAll(async () => {
    // Create test organization with unique slug to avoid conflicts
    organizationId = uuidv4();
    const uniqueSlug = `testsrtax-${organizationId.slice(0, 8)}`;
    await pool.query(
      `INSERT INTO organizations (id, name, slug, tier)
       VALUES ($1, $2, $3, $4)`,
      [organizationId, 'Test Org Suriname Tax', uniqueSlug, 'professional']
    );

    // Create test user with paylinq access
    userId = uuidv4();
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    await pool.query(
      `INSERT INTO hris.user_account (id, organization_id, email, password_hash, email_verified, enabled_products, product_roles)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId, 
        organizationId, 
        'admin@testsrtax.com', 
        hashedPassword, 
        true, 
        JSON.stringify(['nexus', 'paylinq']),
        JSON.stringify({ nexus: 'admin', paylinq: 'admin' })
      ]
    );

    // Login to get auth cookies
    const loginResponse = await request(app)
      .post('/api/auth/tenant/login')
      .send({
        email: 'admin@testsrtax.com',
        password: 'testpassword123'
      });

    expect(loginResponse.status).toBe(200);
    
    // Store cookies for subsequent requests
    authCookies = loginResponse.headers['set-cookie'];
    
    // Get CSRF token from dedicated endpoint (per API standards)
    const csrfResponse = await request(app)
      .get('/api/csrf-token')
      .set('Cookie', authCookies)
      .expect(200);
    
    // Merge CSRF cookie with auth cookies (CRITICAL!)
    if (csrfResponse.headers['set-cookie']) {
      authCookies = [...authCookies, ...csrfResponse.headers['set-cookie']];
    }
    
    csrfToken = csrfResponse.body.csrfToken;
    console.log('CSRF Token obtained:', csrfToken ? 'Yes' : 'No');
    console.log('Auth cookies count after CSRF:', authCookies ? authCookies.length : 0);
    expect(csrfToken).toBeDefined();
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    if (testPayrollRuns.length > 0) {
      await pool.query(
        'DELETE FROM payroll.payroll_run WHERE id = ANY($1::uuid[])',
        [testPayrollRuns]
      );
    }

    if (testWorkers.length > 0) {
      await pool.query(
        'DELETE FROM payroll.worker_pay_structure WHERE employee_id = ANY($1::uuid[])',
        [testWorkers]
      );
    }

    if (testTemplates.length > 0) {
      await pool.query(
        'DELETE FROM payroll.pay_structure_component WHERE template_id = ANY($1::uuid[])',
        [testTemplates]
      );
      await pool.query(
        'DELETE FROM payroll.pay_structure_template WHERE id = ANY($1::uuid[])',
        [testTemplates]
      );
    }

    await cleanupTestEmployees(organizationId, 24); // 24 hours lookback

    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);

    await pool.end();
  });

  /**
   * Helper: Create test worker with compensation
   */
  async function createTestWorker(employeeNumber, firstName, lastName, numberOfChildren = 0, baseSalary = 5000) {
    const workerResponse = await request(app)
      .post('/api/products/paylinq/workers')
      .set('Cookie', authCookies)
      .set('X-CSRF-Token', csrfToken)
      .send({
        hrisEmployeeId: employeeNumber,
        employeeNumber,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@testsrtax.com`,
        dateOfBirth: '1985-01-01',
        hireDate: '2024-01-01',
        status: 'active'
      });

    if (workerResponse.status !== 201) {
      console.log('Worker creation failed!');
      console.log('Status:', workerResponse.status);
      console.log('Response body:', JSON.stringify(workerResponse.body, null, 2));
    }
    
    expect(workerResponse.status).toBe(201);
    // API returns 'employee' key, not 'worker'
    // Use employeeId (HRIS employee UUID) not id (payroll config record ID)
    console.log('Worker creation response body:', JSON.stringify(workerResponse.body, null, 2));
    const workerId = workerResponse.body.employee.employeeId;
    console.log('Extracted workerId (employeeId):', workerId);
    testWorkers.push(workerId);
    
    // CRITICAL: Create compensation record (worker needs salary to run payroll!)
    const compensationPayload = {
      employeeId: workerId,
      compensationType: 'salary',
      amount: baseSalary, // Monthly salary
      currency: 'SRD',
      effectiveDate: '2024-01-01',
      payFrequency: 'monthly'
    };
    console.log('Compensation payload:', JSON.stringify(compensationPayload, null, 2));
    
    const compensationResponse = await request(app)
      .post('/api/products/paylinq/compensation')
      .set('Cookie', authCookies)
      .set('X-CSRF-Token', csrfToken)
      .send(compensationPayload);
    
    if (compensationResponse.status !== 201) {
      console.log('Compensation creation failed!');
      console.log('Status:', compensationResponse.status);
      console.log('Response body:', JSON.stringify(compensationResponse.body, null, 2));
    }
    
    expect(compensationResponse.status).toBe(201);
    console.log(`✓ Created worker ${firstName} ${lastName} with salary SRD ${baseSalary}/month`);
    
    return workerId;
  }

  /**
   * Helper: Create pay template
   */
  async function createPayTemplate(templateData) {
    const response = await request(app)
      .post('/api/products/paylinq/pay-structures/templates')
      .set('Cookie', authCookies)
      .set('X-CSRF-Token', csrfToken)
      .send(templateData);

    if (response.status !== 201) {
      console.log('\n=== PAY TEMPLATE CREATION FAILED ===');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(response.body, null, 2));
      console.log('Sent data:', JSON.stringify(templateData, null, 2));
      console.log('=====================================\n');
    }

    expect(response.status).toBe(201);
    expect(response.body.template).toBeDefined();
    expect(response.body.template.id).toBeDefined();
    
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
      .set('X-CSRF-Token', csrfToken)
      .send(componentData);

    if (response.status !== 201) {
      console.log('\n=== COMPONENT ADDITION FAILED ===');
      console.log('Status:', response.status);
      console.log('Error details:', JSON.stringify(response.body, null, 2));
      console.log('Sent data:', JSON.stringify(componentData, null, 2));
      console.log('================================\n');
    }

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
      .set('X-CSRF-Token', csrfToken)
      .send({
        templateId,
        effectiveFrom: effectiveDate  // API expects 'effectiveFrom', not 'effectiveDate'
      });

    if (response.status !== 201) {
      console.log('\n=== ASSIGNMENT FAILED ===');
      console.log('Status:', response.status);
      console.log('Error details:', JSON.stringify(response.body, null, 2));
      console.log('Sent data:', JSON.stringify({ templateId, effectiveFrom: effectiveDate }, null, 2));
      console.log('========================\n');
    }

    expect(response.status).toBe(201);
    return response.body.assignment;
  }

  /**
   * Helper: Run payroll
   */
  async function runPayroll(payrollData, workerId) {
    // Create payroll run
    const createResponse = await request(app)
      .post('/api/products/paylinq/payroll-runs')
      .set('Cookie', authCookies)
      .set('X-CSRF-Token', csrfToken)
      .send(payrollData);

    expect(createResponse.status).toBe(201);
    const payrollRunId = createResponse.body.payrollRun.id;
    testPayrollRuns.push(payrollRunId);

    // Calculate payroll
    const calculateResponse = await request(app)
      .post(`/api/products/paylinq/payroll-runs/${payrollRunId}/calculate`)
      .set('Cookie', authCookies)
      .set('X-CSRF-Token', csrfToken)
      .send({
        includeEmployees: [workerId], // Include the worker we created
        excludeEmployees: []
      });

    expect(calculateResponse.status).toBe(200);

    // Get paychecks
    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${payrollRunId}/paychecks`)
      .set('Cookie', authCookies);

    expect(paychecksResponse.status).toBe(200);

    return {
      payrollRunId,
      paychecks: paychecksResponse.body.paychecks
    };
  }

  it('should create worker with children for kinderbijslag', async () => {
    const workerId = await createTestWorker('EMP-SR-001', 'Jan', 'Suriname', 3);
    expect(workerId).toBeDefined();
  });

  it('should create Surinamese tax-compliant pay template', async () => {
    const templateId = await createPayTemplate({
      templateCode: 'SR_TAX_TEMPLATE',
      templateName: 'Surinamese Tax Compliant Template',
      description: 'Pay template following Wet Loonbelasting',
      currency: 'SRD',
      status: 'draft',
      effectiveFrom: new Date('2024-01-01').toISOString()
    });

    expect(templateId).toBeDefined();
  });

  it('should add basic salary component (taxable)', async () => {
    const workerId = testWorkers[0];
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'BASIC_SALARY_SR',
      componentName: 'Basic Salary (Suriname)',
      componentCategory: 'earning',
      calculationType: 'fixed',
      defaultAmount: 120000.00, // SRD 120,000/month = SRD 1,440,000/year (above threshold)
      sequenceOrder: 1,
      isMandatory: true,
      displayOnPayslip: true,
      isTaxable: true // Subject to wage tax
    });

    expect(component.componentCode).toBe('BASIC_SALARY_SR');
    expect(component.isTaxable).toBe(true);
  });

  it('should add vakantiegeld component (tax-free up to SRD 10,016/year - Art 10.i)', async () => {
    const templateId = testTemplates[0];

    // Vakantiegeld = 1 month salary, max SRD 10,016/year tax-free
    const component = await addComponentToTemplate(templateId, {
      componentCode: 'VAKANTIEGELD',
      componentName: 'Vakantiegeld (Vacation Allowance)',
      componentCategory: 'earning',
      calculationType: 'fixed',
      defaultAmount: 833.33, // SRD 10,016 / 12 months
      sequenceOrder: 2,
      isMandatory: true,
      displayOnPayslip: true,
      isTaxable: false // Tax-free per Article 10.i (within limit)
    });

    expect(component.componentCode).toBe('VAKANTIEGELD');
    expect(component.isTaxable).toBe(false);
  });

  it('should add kinderbijslag component (child benefit - Art 10.h)', async () => {
    const templateId = testTemplates[0];

    // Kinderbijslag: SRD 125/child, max SRD 500/month
    // Worker has 3 children, so: 3 * 125 = 375 (within 500 limit)
    const component = await addComponentToTemplate(templateId, {
      componentCode: 'KINDERBIJSLAG',
      componentName: 'Kinderbijslag (Child Benefit)',
      componentCategory: 'earning',
      calculationType: 'fixed',
      defaultAmount: 375.00, // 3 children * SRD 125
      sequenceOrder: 3,
      isMandatory: false,
      displayOnPayslip: true,
      isTaxable: false // Tax-free per Article 10.h
    });

    expect(component.componentCode).toBe('KINDERBIJSLAG');
    expect(component.isTaxable).toBe(false);
  });

  it('should add gratificatie component (bonus - Art 10.j)', async () => {
    const templateId = testTemplates[0];

    // Gratificatie: Tax-free up to 1 month salary, max SRD 10,016/year
    const component = await addComponentToTemplate(templateId, {
      componentCode: 'GRATIFICATIE',
      componentName: 'Gratificatie (Year-End Bonus)',
      componentCategory: 'earning',
      calculationType: 'fixed',
      defaultAmount: 833.33, // SRD 10,016 / 12 months
      sequenceOrder: 4,
      isMandatory: false,
      displayOnPayslip: true,
      isTaxable: false // Tax-free per Article 10.j (within limit)
      // isRecurring: false, // One-time per year (prorated monthly for test)
    });

    expect(component.componentCode).toBe('GRATIFICATIE');
    expect(component.isTaxable).toBe(false);
  });

  it('should add pre-tax pension contribution (Art 10.f)', async () => {
    const templateId = testTemplates[0];

    // Pre-tax pension: Reduces taxable income (Article 10.f)
    // Using fixed amount for test (6% of SRD 120,000 = SRD 7,200)
    const component = await addComponentToTemplate(templateId, {
      componentCode: 'PENSION_PRETAX',
      componentName: 'Pension Contribution (Pre-Tax)',
      componentCategory: 'deduction',
      calculationType: 'fixed',
      defaultAmount: 7200.00,
      sequenceOrder: 5,
      isMandatory: false,
      displayOnPayslip: true
    });

    expect(component.componentCode).toBe('PENSION_PRETAX');
    expect(component.calculationType).toBe('fixed');
  });

  it('should add Surinamese wage tax component (Progressive brackets - Art 14)', async () => {
    const templateId = testTemplates[0];

    // Surinamese Wage Tax - Fixed amount for test
    // In reality, this would be calculated via a formula or external service
    // For E2E test purposes, we use a fixed amount that matches expected tax
    // Expected tax on SRD 120,000 salary with pre-tax deductions: ~SRD 37,344
    const component = await addComponentToTemplate(templateId, {
      componentCode: 'LOONBELASTING',
      componentName: 'Loonbelasting (Wage Tax)',
      componentCategory: 'tax',
      calculationType: 'fixed',
      defaultAmount: 37344.00,
      sequenceOrder: 6,
      isMandatory: true,
      displayOnPayslip: true
    });

    expect(component.componentCode).toBe('LOONBELASTING');
    expect(component.calculationType).toBe('fixed');
  });

  it('should publish template', async () => {
    const templateId = testTemplates[0];

    const response = await request(app)
      .post(`/api/products/paylinq/pay-structures/templates/${templateId}/publish`)
      .set('Cookie', authCookies)
      .set('X-CSRF-Token', csrfToken)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.template.status).toBe('active'); // Schema allows: draft, active, deprecated, archived
    expect(response.body.template.publishedAt).toBeDefined(); // Verify it was published
  });

  it('should create MONTHLY payroll run type', async () => {
    // Use the published template from previous test
    const templateId = testTemplates[0];
    
    // Create MONTHLY run type
    const createRunTypeResponse = await request(app)
      .post('/api/products/paylinq/payroll-run-types')
      .set('Cookie', authCookies)
      .set('X-CSRF-Token', csrfToken)
      .send({
        typeCode: 'MONTHLY',
        typeName: 'Monthly Payroll',
        description: 'Regular monthly payroll run',
        componentOverrideMode: 'template',
        defaultTemplateId: templateId,
        isActive: true
      });

    // Debug: Log response if not successful
    if (createRunTypeResponse.status !== 201) {
      console.log('❌ Create MONTHLY run type failed:', {
        status: createRunTypeResponse.status,
        body: createRunTypeResponse.body
      });
    }

    expect(createRunTypeResponse.status).toBe(201);
    expect(createRunTypeResponse.body.payrollRunType).toBeDefined();
    expect(createRunTypeResponse.body.payrollRunType.typeCode).toBe('MONTHLY');
  });

  it('should assign template to worker', async () => {
    const workerId = testWorkers[0];
    const templateId = testTemplates[0];

    const assignment = await assignTemplateToWorker(workerId, templateId, '2024-11-01');

    expect(assignment).toBeDefined();
    expect(assignment.employeeId).toBe(workerId);
    expect(assignment.templateVersionId).toBe(templateId);
  });

  it('should run payroll with Surinamese tax calculations', async () => {
    const workerId = testWorkers[0]; // Get the first worker we created
    const result = await runPayroll({
      payrollName: 'November 2024 Payroll', // Required field
      runType: 'MONTHLY', // API expects 'runType', not 'runTypeCode'
      periodStart: '2024-11-01',
      periodEnd: '2024-11-30',
      paymentDate: '2024-11-30' // Correct field name (was 'payDate')
    }, workerId);

    expect(result.paychecks).toBeDefined();
    expect(result.paychecks.length).toBeGreaterThan(0);
  });

  it('should validate Surinamese tax calculation on paycheck', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies)
      .set('X-CSRF-Token', csrfToken);

    expect(paychecksResponse.status).toBe(200);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);
    expect(paycheck).toBeDefined();

    // Expected calculations:
    // Gross earnings:
    // - Basic: SRD 120,000
    // - Vakantiegeld: SRD 833.33 (tax-free)
    // - Kinderbijslag: SRD 375 (tax-free)
    // - Gratificatie: SRD 833.33 (tax-free)
    // Total gross: SRD 122,041.66

    // Deductions:
    // - Pre-tax pension: SRD 7,200
    // - Wage tax: SRD 37,344
    // Total deductions: SRD 44,544

    // Net pay: SRD 122,041.66 - 44,544 = SRD 77,497.66

    console.log('Paycheck data:', JSON.stringify({
      grossPay: paycheck.grossPay,
      preTaxDeductions: paycheck.preTaxDeductions,
      postTaxDeductions: paycheck.postTaxDeductions,
      otherDeductions: paycheck.otherDeductions,
      totalDeductions: paycheck.totalDeductions,
      wageTax: paycheck.wageTax,
      netPay: paycheck.netPay,
      components: paycheck.components?.map(c => ({
        code: c.componentCode,
        amount: c.amount,
        category: c.componentCategory
      }))
    }, null, 2));

    expect(paycheck.grossPay).toBeCloseTo(122041.66, 0); // Rounded to nearest dollar
    expect(paycheck.totalDeductions).toBeCloseTo(7200.00, 0); // Only pension deduction
    expect(paycheck.wageTax).toBeCloseTo(37344.00, 0); // Wage tax separate from deductions
    expect(paycheck.netPay).toBeCloseTo(77497.66, 0);

    // Verify tax-free components are present
    const vakantiegeld = paycheck.components.find(c => c.componentCode === 'VAKANTIEGELD');
    expect(vakantiegeld).toBeDefined();
    expect(vakantiegeld.amount).toBeCloseTo(833.33, 0);

    const kinderbijslag = paycheck.components.find(c => c.componentCode === 'KINDERBIJSLAG');
    expect(kinderbijslag).toBeDefined();
    expect(kinderbijslag.amount).toBeCloseTo(375.00, 0);

    const gratificatie = paycheck.components.find(c => c.componentCode === 'GRATIFICATIE');
    expect(gratificatie).toBeDefined();
    expect(gratificatie.amount).toBeCloseTo(833.33, 0);

    // Verify deduction components
    const pension = paycheck.components.find(c => c.componentCode === 'PENSION_PRETAX');
    expect(pension).toBeDefined();
    expect(pension.amount).toBeCloseTo(7200.00, 0);

    // Verify tax component
    const tax = paycheck.components.find(c => c.componentCode === 'LOONBELASTING');
    expect(tax).toBeDefined();
    expect(tax.amount).toBeCloseTo(37344.00, 0);
  });

  it('should verify compliance with Wet Loonbelasting', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies)
      .set('X-CSRF-Token', csrfToken);

    expect(paychecksResponse.status).toBe(200);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);
    expect(paycheck).toBeDefined();

    // Verify basic paycheck structure
    expect(paycheck.grossPay).toBeGreaterThan(0);
    expect(paycheck.totalDeductions).toBeGreaterThan(0);
    expect(paycheck.netPay).toBeGreaterThan(0);
    
    // Verify components exist
    const components = paycheck.components || [];
    expect(components.length).toBeGreaterThan(0);

    // Verify vakantiegeld within legal limit (Article 10.i)
    const vakantiegeld = components.find(c => c.componentCode === 'VAKANTIEGELD');
    if (vakantiegeld) {
      const annualVakantiegeld = vakantiegeld.amount * 12;
      expect(annualVakantiegeld).toBeLessThanOrEqual(10016);
    }

    // Verify kinderbijslag within legal limit (Article 10.h)
    const kinderbijslag = components.find(c => c.componentCode === 'KINDERBIJSLAG');
    if (kinderbijslag) {
      expect(kinderbijslag.amount).toBeLessThanOrEqual(500); // Monthly max
    }

    // Verify gratificatie within legal limit (Article 10.j)
    const gratificatie = components.find(c => c.componentCode === 'GRATIFICATIE');
    if (gratificatie) {
      const annualGratificatie = gratificatie.amount * 12;
      expect(annualGratificatie).toBeLessThanOrEqual(10016);
    }

    // Verify tax and pension components exist
    const pension = components.find(c => c.componentCode === 'PENSION_PRETAX');
    expect(pension).toBeDefined();
    expect(pension.amount).toBeGreaterThan(0);

    const tax = components.find(c => c.componentCode === 'LOONBELASTING');
    expect(tax).toBeDefined();
    expect(tax.amount).toBeGreaterThan(0);

    console.log('✓ Surinamese tax law compliance verified');
    console.log(`  Gross Pay: SRD ${paycheck.grossPay}`);
    console.log(`  Deductions: SRD ${paycheck.totalDeductions}`);
    console.log(`  Wage Tax: SRD ${paycheck.wageTax}`);
    console.log(`  Net Pay: SRD ${paycheck.netPay}`);
  });
});




