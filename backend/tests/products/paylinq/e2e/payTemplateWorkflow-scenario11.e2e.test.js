/**
 * E2E Test: Pay Template Workflow - Scenario 11
 * Conditional & Advanced Formulas
 * 
 * Tests advanced formula types:
 * - IF/THEN conditional logic (tiered commission rates)
 * - Lookup-based calculations (city allowance by location code)
 * - Aggregate formulas (average of prior periods)
 * - Multi-variable formulas with complex logic
 * 
 * @module tests/products/paylinq/e2e/payTemplateWorkflow-scenario11
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { cleanupTestEmployees } from '../helpers/employeeTestHelper.js';

// Uses cookie-based authentication per security requirements
describe('Scenario 11: Advanced Formula Calculations', () => {
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
      [organizationId, 'Test Org Formulas', 'testformulas', 'professional']
    );

    // Create test user
    userId = uuidv4();
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    await pool.query(
      `INSERT INTO hris.user_account (id, organization_id, email, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, organizationId, 'admin@testformula.com', hashedPassword, true]
    );

    // Login to get auth cookies
    const loginResponse = await request(app)
      .post('/api/auth/tenant/login')
      .send({
        email: 'admin@testformulas.com',
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
   * Helper: Create test worker with sales data
   */
  async function createTestWorker(employeeNumber, firstName, lastName, salesAmount, cityCode) {
    const workerResponse = await request(app)
      .post('/api/products/paylinq/workers')
      .set('Cookie', authCookies)
      .send({
        employeeNumber,
        firstName,
        lastName,
        dateOfBirth: '1987-01-01',
        hireDate: '2024-01-01',
        status: 'active',
        metadata: {
          salesAmount,
          cityCode, // For lookup-based allowance
          priorPeriodSales: [45000, 48000, 52000] // For aggregate calculation
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

  it('should create sales worker with high sales', async () => {
    const workerId = await createTestWorker('EMP-FRM-001', 'Sales', 'Person', 75000, 'PBM');
    expect(workerId).toBeDefined();
  });

  it('should create advanced formula pay template', async () => {
    const templateId = await createPayTemplate({
      templateCode: 'FORMULA_TEMPLATE',
      templateName: 'Advanced Formula Template',
      description: 'Template with conditional, lookup, and aggregate formulas',
      currency: 'USD',
      status: 'draft'
    });

    expect(templateId).toBeDefined();
  });

  it('should add base salary component', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'BASE_SALARY',
      componentName: 'Base Salary',
      componentType: 'earning',
      category: 'regular_pay',
      calculationType: 'fixed_amount',
      fixedAmount: 5000.00,
      sequenceOrder: 1,
      isMandatory: true,
      isVisibleOnPayslip: true,
      isTaxable: true
    });

    expect(component.componentCode).toBe('BASE_SALARY');
  });

  it('should add tiered commission component (IF/THEN conditional)', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'TIERED_COMMISSION',
      componentName: 'Tiered Sales Commission',
      componentType: 'earning',
      category: 'commission',
      calculationType: 'formula',
      formulaType: 'conditional',
      formulaExpression: `
        // Tiered commission based on sales amount
        // Tier 1: 0-50,000 @ 5%
        // Tier 2: 50,001-100,000 @ 7.5%
        // Tier 3: 100,001+ @ 10%
        
        let sales = employee.metadata.salesAmount || 0;
        let commission = 0;
        
        if (sales <= 50000) {
          commission = sales * 0.05;
        } else if (sales <= 100000) {
          // First 50k at 5%, remainder at 7.5%
          commission = (50000 * 0.05) + ((sales - 50000) * 0.075);
        } else {
          // First 50k at 5%, next 50k at 7.5%, remainder at 10%
          commission = (50000 * 0.05) + (50000 * 0.075) + ((sales - 100000) * 0.10);
        }
        
        return commission;
      `,
      sequenceOrder: 2,
      isMandatory: false,
      isVisibleOnPayslip: true,
      isTaxable: true,
      conditionalRules: {
        type: 'tiered',
        variable: 'employee.metadata.salesAmount',
        tiers: [
          { min: 0, max: 50000, rate: 0.05 },
          { min: 50001, max: 100000, rate: 0.075 },
          { min: 100001, max: null, rate: 0.10 }
        ]
      },
      variables: {
        salesAmount: {
          type: 'number',
          source: 'employee.metadata.salesAmount',
          description: 'Monthly sales amount'
        }
      }
    });

    expect(component.componentCode).toBe('TIERED_COMMISSION');
    expect(component.formulaType).toBe('conditional');
    expect(component.conditionalRules.tiers).toHaveLength(3);
  });

  it('should add city allowance component (lookup-based)', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'CITY_ALLOWANCE',
      componentName: 'City Cost-of-Living Allowance',
      componentType: 'earning',
      category: 'allowance',
      calculationType: 'formula',
      formulaType: 'lookup',
      formulaExpression: `
        // Lookup allowance by city code
        const allowanceTable = {
          'PBM': 1200.00,  // Paramaribo (high cost)
          'NKW': 800.00,   // Nieuw Nickerie
          'MNO': 600.00,   // Moengo
          'ALB': 500.00,   // Albina
          'DEFAULT': 400.00 // Other locations
        };
        
        let cityCode = employee.metadata.cityCode || 'DEFAULT';
        return allowanceTable[cityCode] || allowanceTable['DEFAULT'];
      `,
      sequenceOrder: 3,
      isMandatory: false,
      isVisibleOnPayslip: true,
      isTaxable: false, // Tax-free allowance
      metadata: {
        lookupTable: {
          PBM: 1200.00,
          NKW: 800.00,
          MNO: 600.00,
          ALB: 500.00,
          DEFAULT: 400.00
        }
      },
      variables: {
        cityCode: {
          type: 'string',
          source: 'employee.metadata.cityCode',
          description: 'City location code'
        }
      }
    });

    expect(component.componentCode).toBe('CITY_ALLOWANCE');
    expect(component.formulaType).toBe('lookup');
    expect(component.metadata.lookupTable).toBeDefined();
  });

  it('should add performance bonus component (aggregate formula)', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'PERFORMANCE_BONUS',
      componentName: 'Performance Bonus (Rolling Average)',
      componentType: 'earning',
      category: 'bonus',
      calculationType: 'formula',
      formulaType: 'aggregate',
      formulaExpression: `
        // Bonus = 10% of average sales from last 3 periods
        let priorSales = employee.metadata.priorPeriodSales || [];
        
        if (priorSales.length === 0) return 0;
        
        let sum = priorSales.reduce((acc, val) => acc + val, 0);
        let average = sum / priorSales.length;
        
        return average * 0.10;
      `,
      sequenceOrder: 4,
      isMandatory: false,
      isVisibleOnPayslip: true,
      isTaxable: true,
      isRecurring: false,
      variables: {
        priorPeriodSales: {
          type: 'array',
          source: 'employee.metadata.priorPeriodSales',
          description: 'Sales amounts from prior 3 periods'
        }
      },
      metadata: {
        aggregateFunction: 'AVERAGE',
        periods: 3,
        multiplier: 0.10
      }
    });

    expect(component.componentCode).toBe('PERFORMANCE_BONUS');
    expect(component.formulaType).toBe('aggregate');
  });

  it('should add multi-variable retention bonus formula', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'RETENTION_BONUS',
      componentName: 'Retention Bonus (Multi-Variable)',
      componentType: 'earning',
      category: 'bonus',
      calculationType: 'formula',
      formulaType: 'conditional',
      formulaExpression: `
        // Complex retention bonus calculation
        // Variables: tenure (months), performance rating, base salary
        
        let tenure = employee.metadata.tenureMonths || 0;
        let performanceRating = employee.metadata.performanceRating || 0;
        let baseSalary = 5000.00; // From base salary component
        
        // No bonus if tenure < 12 months or rating < 3
        if (tenure < 12 || performanceRating < 3) return 0;
        
        // Calculate base bonus percentage
        let bonusPercent = 0;
        if (performanceRating >= 5) {
          bonusPercent = 0.15; // 15% for excellent
        } else if (performanceRating >= 4) {
          bonusPercent = 0.10; // 10% for good
        } else {
          bonusPercent = 0.05; // 5% for satisfactory
        }
        
        // Tenure multiplier (max 2x at 5 years)
        let tenureMultiplier = Math.min(1 + (tenure / 60), 2.0);
        
        return baseSalary * bonusPercent * tenureMultiplier;
      `,
      sequenceOrder: 5,
      isMandatory: false,
      isVisibleOnPayslip: true,
      isTaxable: true,
      isRecurring: false,
      conditionalRules: {
        type: 'multi-variable',
        conditions: [
          { variable: 'tenureMonths', operator: '>=', value: 12 },
          { variable: 'performanceRating', operator: '>=', value: 3 }
        ]
      },
      variables: {
        tenureMonths: {
          type: 'number',
          source: 'employee.metadata.tenureMonths',
          description: 'Employment tenure in months'
        },
        performanceRating: {
          type: 'number',
          source: 'employee.metadata.performanceRating',
          description: 'Performance rating (1-5)'
        }
      }
    });

    expect(component.componentCode).toBe('RETENTION_BONUS');
    expect(component.variables).toHaveProperty('tenureMonths');
    expect(component.variables).toHaveProperty('performanceRating');
  });

  it('should add tax deduction', async () => {
    const templateId = testTemplates[0];

    const component = await addComponentToTemplate(templateId, {
      componentCode: 'INCOME_TAX',
      componentName: 'Income Tax',
      componentType: 'deduction',
      category: 'tax',
      calculationType: 'percentage',
      percentage: 18.0,
      sequenceOrder: 6,
      isMandatory: true,
      isVisibleOnPayslip: true,
      appliesToGross: true
    });

    expect(component.componentCode).toBe('INCOME_TAX');
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

  it('should run payroll with formula calculations', async () => {
    const result = await runPayroll({
      runTypeCode: 'MONTHLY',
      periodStart: '2024-11-01',
      periodEnd: '2024-11-30',
      payDate: '2024-11-30',
      metadata: {
        workerMetadata: {
          [testWorkers[0]]: {
            salesAmount: 75000,
            cityCode: 'PBM',
            priorPeriodSales: [45000, 48000, 52000],
            tenureMonths: 18,
            performanceRating: 4
          }
        }
      }
    });

    expect(result.paychecks).toBeDefined();
    expect(result.paychecks.length).toBeGreaterThan(0);
  });

  it('should validate tiered commission calculation', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    // Sales: $75,000
    // Tier calculation:
    // First $50k: 50,000 × 0.05 = 2,500
    // Next $25k: 25,000 × 0.075 = 1,875
    // Total commission: $4,375

    const commission = paycheck.components.find(c => c.componentCode === 'TIERED_COMMISSION');
    expect(commission).toBeDefined();
    expect(commission.amount).toBeCloseTo(4375.00, 2);
    expect(commission.formulaType).toBe('conditional');
    expect(commission.metadata.salesAmount).toBe(75000);
    expect(commission.metadata.tierUsed).toBe(2); // Second tier
  });

  it('should validate lookup-based city allowance', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    // City: PBM (Paramaribo) → $1,200
    const allowance = paycheck.components.find(c => c.componentCode === 'CITY_ALLOWANCE');
    expect(allowance).toBeDefined();
    expect(allowance.amount).toBeCloseTo(1200.00, 2);
    expect(allowance.formulaType).toBe('lookup');
    expect(allowance.metadata.cityCode).toBe('PBM');
    expect(allowance.metadata.lookupValue).toBe(1200.00);
  });

  it('should validate aggregate performance bonus', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    // Prior sales: [45,000, 48,000, 52,000]
    // Average: 48,333.33
    // Bonus: 48,333.33 × 0.10 = 4,833.33

    const bonus = paycheck.components.find(c => c.componentCode === 'PERFORMANCE_BONUS');
    expect(bonus).toBeDefined();
    expect(bonus.amount).toBeCloseTo(4833.33, 2);
    expect(bonus.formulaType).toBe('aggregate');
    expect(bonus.metadata.averageSales).toBeCloseTo(48333.33, 2);
  });

  it('should validate multi-variable retention bonus', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    // Tenure: 18 months, Performance: 4 (good)
    // Base: $5,000, Bonus %: 10%, Tenure multiplier: 1.30
    // Calculation: 5,000 × 0.10 × 1.30 = $650

    const retention = paycheck.components.find(c => c.componentCode === 'RETENTION_BONUS');
    expect(retention).toBeDefined();
    expect(retention.amount).toBeCloseTo(650.00, 2);
    expect(retention.metadata.tenureMonths).toBe(18);
    expect(retention.metadata.performanceRating).toBe(4);
    expect(retention.metadata.tenureMultiplier).toBeCloseTo(1.30, 2);
  });

  it('should validate total gross with all formula components', async () => {
    const workerId = testWorkers[0];
    const lastPayrollRun = testPayrollRuns[testPayrollRuns.length - 1];

    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${lastPayrollRun}/paychecks`)
      .set('Cookie', authCookies);

    const paycheck = paychecksResponse.body.paychecks.find(pc => pc.employeeId === workerId);

    // Total gross:
    // Base: $5,000
    // Commission: $4,375
    // City Allowance: $1,200
    // Performance Bonus: $4,833.33
    // Retention Bonus: $650
    // Total: $16,058.33

    expect(paycheck.grossPay).toBeCloseTo(16058.33, 2);

    // Tax: 18% of gross = $2,890.50
    const tax = paycheck.components.find(c => c.componentCode === 'INCOME_TAX');
    expect(tax.amount).toBeCloseTo(2890.50, 2);

    // Net: $16,058.33 - $2,890.50 = $13,167.83
    expect(paycheck.netPay).toBeCloseTo(13167.83, 2);
  });
});
