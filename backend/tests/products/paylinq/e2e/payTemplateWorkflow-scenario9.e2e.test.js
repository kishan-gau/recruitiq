/**
 * E2E Test: Pay Template Workflow - Scenario 9
 * Hourly & Unit-Based Calculations
 * 
 * Tests hourly_rate, hours_based, and unit_based calculation types:
 * - Hourly rate component (rate × hours worked)
 * - Hours-based overtime (hours × rate × multiplier)
 * - Unit-based piece rate (units produced × rate per unit)
 * - Mixed calculation types in one template
 * 
 * @module tests/products/paylinq/e2e/payTemplateWorkflow-scenario9
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { cleanupTestEmployees } from '../helpers/employeeTestHelper.js';

// Uses cookie-based authentication per security requirements
describe('Scenario 9: Hourly and Unit-Based Workers', () => {
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
      [organizationId, 'Test Org Hourly', 'testhourly', 'professional']
    );

    // Create test user
    userId = uuidv4();
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    await pool.query(
      `INSERT INTO hris.user_account (id, organization_id, email, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, organizationId, 'admin@testhourly.com', hashedPassword, true]
    );

    // Login to get auth cookies
    const loginResponse = await request(app)
      .post('/api/auth/tenant/login')
      .send({
        email: 'admin@testhourly.com',
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
   * Helper: Create test worker with hourly rate
   */
  async function createTestWorker(employeeNumber, firstName, lastName, hourlyRate, units = 0) {
    const workerResponse = await request(app)
      .post('/api/products/paylinq/workers')
      .set('Cookie', authCookies)
      .send({
        employeeNumber,
        firstName,
        lastName,
        dateOfBirth: '1990-01-01',
        hireDate: '2024-01-01',
        status: 'active',
        metadata: {
          hourlyRate,
          standardHours: 160, // Monthly standard hours
          unitsProduced: units
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

  it('should create hourly worker', async () => {
    const workerId = await createTestWorker('EMP-HR-001', 'Hourly', 'Worker', 25.50, 150);
    expect(workerId).toBeDefined();
  });

  it('should create hourly/unit-based pay template', async () => {
    const templateId = await createPayTemplate({
      templateCode: 'HOURLY_UNIT_TEMPLATE',
      templateName: 'Hourly & Unit-Based Template',
      description: 'Template with hourly, hours-based, and unit-based components',
      currency: 'USD',
      status: 'draft'
    });

    expect(templateId).toBeDefined();
  });

  it('should add hourly rate component (calculation_type: hourly_rate)', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'HOURLY_WAGE',
      componentName: 'Hourly Wage',
      componentType: 'earning',
      category: 'regular_pay',
      calculationType: 'hourly_rate',
      defaultRate: 25.50, // USD per hour
      sequenceOrder: 1,
      isMandatory: true,
      isVisibleOnPayslip: true,
      isTaxable: true,
      metadata: {
        description: 'Base hourly rate × hours worked',
        rateUnit: 'hour'
      }
    });

    expect(component.componentCode).toBe('HOURLY_WAGE');
    expect(component.calculationType).toBe('hourly_rate');
    expect(component.defaultRate).toBe(25.50);
  });

  it('should add hours-based overtime component (calculation_type: hours_based)', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'OVERTIME_PAY',
      componentName: 'Overtime Pay (1.5x)',
      componentType: 'earning',
      category: 'overtime',
      calculationType: 'hours_based',
      defaultRate: 38.25, // USD 25.50 × 1.5
      sequenceOrder: 2,
      isMandatory: false,
      isVisibleOnPayslip: true,
      isTaxable: true,
      appliesToOvertime: true,
      metadata: {
        description: 'Overtime hours × 1.5 × base rate',
        multiplier: 1.5,
        rateUnit: 'hour'
      }
    });

    expect(component.componentCode).toBe('OVERTIME_PAY');
    expect(component.calculationType).toBe('hours_based');
    expect(component.defaultRate).toBe(38.25);
  });

  it('should add unit-based piece rate component (calculation_type: unit_based)', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'PIECE_RATE',
      componentName: 'Piece Rate Bonus',
      componentType: 'earning',
      category: 'bonus',
      calculationType: 'unit_based',
      defaultRate: 2.00, // USD per unit
      sequenceOrder: 3,
      isMandatory: false,
      isVisibleOnPayslip: true,
      isTaxable: true,
      metadata: {
        description: 'Units produced × rate per unit',
        rateUnit: 'unit',
        minimumUnits: 100
      }
    });

    expect(component.componentCode).toBe('PIECE_RATE');
    expect(component.calculationType).toBe('unit_based');
    expect(component.defaultRate).toBe(2.00);
  });

  it('should add tax deduction (percentage of gross)', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'INCOME_TAX',
      componentName: 'Income Tax',
      componentType: 'deduction',
      category: 'tax',
      calculationType: 'percentage',
      percentage: 15.0,
      sequenceOrder: 4,
      isMandatory: true,
      isVisibleOnPayslip: true,
      appliesToGross: true
    });

    expect(component.componentCode).toBe('INCOME_TAX');
    expect(component.percentage).toBe(15.0);
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
    expect(assignment.workerId).toBe(workerId);
  });

  it('should run payroll with hourly/unit calculations', async () => {
    const result = await runPayroll({
      runTypeCode: 'MONTHLY',
      periodStart: '2024-11-01',
      periodEnd: '2024-11-30',
      payDate: '2024-11-30',
      metadata: {
        hoursWorked: {
          [testWorkers[0]]: {
            regular: 160, // Standard hours
            overtime: 20 // Overtime hours
          }
        },
        unitsProduced: {
          [testWorkers[0]]: 150 // Units produced
        }
      }
    });

    expect(result.paychecks).toBeDefined();
    expect(result.paychecks.length).toBeGreaterThan(0);
  });

  it('should validate hourly rate calculation on paycheck', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);
    expect(paycheck).toBeDefined();

    // Expected calculations:
    // 1. Hourly wage: 160 hours × USD 25.50 = USD 4,080
    // 2. Overtime: 20 hours × USD 38.25 (1.5x) = USD 765
    // 3. Piece rate: 150 units × USD 2.00 = USD 300
    // Total gross: USD 5,145

    const hourlyComponent = paycheck.components.find(c => c.componentCode === 'HOURLY_WAGE');
    expect(hourlyComponent).toBeDefined();
    expect(hourlyComponent.amount).toBeCloseTo(4080.00, 2);
    expect(hourlyComponent.calculationType).toBe('hourly_rate');

    const overtimeComponent = paycheck.components.find(c => c.componentCode === 'OVERTIME_PAY');
    expect(overtimeComponent).toBeDefined();
    expect(overtimeComponent.amount).toBeCloseTo(765.00, 2);
    expect(overtimeComponent.calculationType).toBe('hours_based');

    const pieceRateComponent = paycheck.components.find(c => c.componentCode === 'PIECE_RATE');
    expect(pieceRateComponent).toBeDefined();
    expect(pieceRateComponent.amount).toBeCloseTo(300.00, 2);
    expect(pieceRateComponent.calculationType).toBe('unit_based');

    expect(paycheck.grossPay).toBeCloseTo(5145.00, 2);
  });

  it('should validate tax calculation on gross including all earnings', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    // Tax: 15% of gross (5,145) = USD 771.75
    const taxComponent = paycheck.components.find(c => c.componentCode === 'INCOME_TAX');
    expect(taxComponent).toBeDefined();
    expect(taxComponent.amount).toBeCloseTo(771.75, 2);

    // Net pay: 5,145 - 771.75 = USD 4,373.25
    expect(paycheck.netPay).toBeCloseTo(4373.25, 2);
  });

  it('should verify rate units in component metadata', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    const hourlyComponent = paycheck.components.find(c => c.componentCode === 'HOURLY_WAGE');
    expect(hourlyComponent.metadata.rateUnit).toBe('hour');
    expect(hourlyComponent.metadata.hoursWorked).toBe(160);

    const overtimeComponent = paycheck.components.find(c => c.componentCode === 'OVERTIME_PAY');
    expect(overtimeComponent.metadata.rateUnit).toBe('hour');
    expect(overtimeComponent.metadata.hoursWorked).toBe(20);
    expect(overtimeComponent.metadata.multiplier).toBe(1.5);

    const pieceRateComponent = paycheck.components.find(c => c.componentCode === 'PIECE_RATE');
    expect(pieceRateComponent.metadata.rateUnit).toBe('unit');
    expect(pieceRateComponent.metadata.unitsProduced).toBe(150);
  });
});
