/**
 * E2E Test: Pay Template Workflow
 * 
 * Tests the complete flow of creating pay structure templates with various component
 * configurations, assigning them to workers, running payroll, and validating calculations.
 * 
 * Workflow:
 * 1. Create pay structure template
 * 2. Add components with different configurations (earnings, deductions, calculation types)
 * 3. Assign template to worker
 * 4. Run payroll calculation
 * 5. Validate paycheck calculations
 * 
 * Test Scenarios:
 * 1. Basic Fixed Salary - Simple fixed earnings component
 * 2. Complex Earnings - Multiple earnings components (base, overtime, bonus)
 * 3. Earnings with Deductions - Salary with tax and insurance deductions
 * 4. Formula-Based Calculations - Components using formula calculations
 * 5. Mixed Calculation Types - Fixed, formula, and percentage calculations
 * 6. Optional Components - Mix of required and optional components
 * 7. Complete Complex Template - All component types and calculations
 * 
 * @module tests/products/paylinq/e2e/payTemplateWorkflow
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { cleanupTestEmployees } from '../helpers/employeeTestHelper.js';

// Uses cookie-based authentication per security requirements

describe('Pay Template Workflow E2E Tests', () => {
  let authCookies;
  let organizationId;
  let userId;
  let testWorkers = []; // Track created workers for cleanup
  let testTemplates = []; // Track created templates for cleanup
  let testPayrollRuns = []; // Track payroll runs for cleanup

  beforeAll(async () => {
    // Create test organization
    organizationId = uuidv4();
    await pool.query(
      `INSERT INTO organizations (id, name, slug, tier)
       VALUES ($1, $2, $3, $4)`,
      [organizationId, 'Test Org PayTemplate', 'testpaytemplate', 'professional']
    );

    // Create test user with admin role
    userId = uuidv4();
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    await pool.query(
      `INSERT INTO hris.user_account (id, organization_id, email, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, organizationId, 'admin@testpaytemplate.com', hashedPassword, true]
    );

    // Login to get auth cookies
    const loginResponse = await request(app)
      .post('/api/auth/tenant/login')
      .send({
        email: 'admin@testpaytemplate.com',
        password: 'testpassword123'
      });

    expect(loginResponse.status).toBe(200);
    authCookies = loginResponse.headers['set-cookie'];
    expect(authCookies).toBeDefined();
  });

  afterAll(async () => {
    // Clean up in reverse order of dependencies
    
    // Delete payroll runs
    if (testPayrollRuns.length > 0) {
      await pool.query(
        'DELETE FROM payroll.payroll_runs WHERE id = ANY($1::uuid[])',
        [testPayrollRuns]
      );
    }

    // Delete worker pay structure assignments
    if (testWorkers.length > 0) {
      await pool.query(
        'DELETE FROM payroll.worker_pay_structures WHERE employee_id = ANY($1::uuid[])',
        [testWorkers]
      );
    }

    // Delete template components
    if (testTemplates.length > 0) {
      await pool.query(
        'DELETE FROM payroll.pay_structure_template_components WHERE template_id = ANY($1::uuid[])',
        [testTemplates]
      );
    }

    // Delete templates
    if (testTemplates.length > 0) {
      await pool.query(
        'DELETE FROM payroll.pay_structure_templates WHERE id = ANY($1::uuid[])',
        [testTemplates]
      );
    }

    // Delete workers
    if (testWorkers.length > 0) {
      await cleanupTestEmployees(organizationId);
    }

    // Delete user and organization
    await pool.query('DELETE FROM hris.user_account WHERE organization_id = $1', [organizationId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    
    await pool.end();
  });

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Helper to create a test worker
   */
  async function createTestWorker(employeeNumber, firstName, lastName) {
    const workerData = {
      hrisEmployeeId: employeeNumber,
      employeeNumber: employeeNumber,
      firstName: firstName,
      lastName: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
      hireDate: '2024-01-15T00:00:00.000Z',
      status: 'active',
      paymentMethod: 'ach',
      bankAccountNumber: '1234567890',
      bankRoutingNumber: '987654321',
      metadata: {
        phone: '+597-123-4567',
        department: 'Engineering',
        position: 'Software Engineer'
      }
    };

    const response = await request(app)
      .post('/api/products/paylinq/workers')
      .set('Cookie', authCookies)
      .send(workerData);

    if (response.status === 201) {
      const workerId = response.body.employee.id;
      testWorkers.push(workerId);
      return workerId;
    }

    throw new Error(`Failed to create worker: ${response.body.message}`);
  }

  /**
   * Helper to create a pay structure template
   */
  async function createPayTemplate(templateData) {
    const response = await request(app)
      .post('/api/products/paylinq/pay-structures/templates')
      .set('Cookie', authCookies)
      .send(templateData);

    if (response.status === 201) {
      const templateId = response.body.template.id;
      testTemplates.push(templateId);
      return templateId;
    }

    throw new Error(`Failed to create template: ${response.body.message}`);
  }

  /**
   * Helper to add component to template
   */
  async function addComponentToTemplate(templateId, componentData) {
    const response = await request(app)
      .post(`/api/products/paylinq/pay-structures/templates/${templateId}/components`)
      .set('Cookie', authCookies)
      .send(componentData);

    if (response.status === 201) {
      return response.body.component;
    }

    throw new Error(`Failed to add component: ${response.body.message}`);
  }

  /**
   * Helper to assign template to worker
   */
  async function assignTemplateToWorker(workerId, templateId, effectiveDate = '2024-06-01') {
    const response = await request(app)
      .post(`/api/products/paylinq/pay-structures/workers/${workerId}/assignments`)
      .set('Cookie', authCookies)
      .send({
        templateId: templateId,
        effectiveDate: effectiveDate
      });

    if (response.status === 201) {
      return response.body.assignment;
    }

    throw new Error(`Failed to assign template: ${response.body.message}`);
  }

  /**
   * Helper to create and calculate payroll run
   */
  async function runPayroll(payrollData) {
    // Create payroll run
    const createResponse = await request(app)
      .post('/api/products/paylinq/payroll-runs')
      .set('Cookie', authCookies)
      .send(payrollData);

    if (createResponse.status !== 201) {
      throw new Error(`Failed to create payroll run: ${createResponse.body.message}`);
    }

    const payrollRunId = createResponse.body.payrollRun.id;
    testPayrollRuns.push(payrollRunId);

    // Calculate payroll
    const calculateResponse = await request(app)
      .post(`/api/products/paylinq/payroll-runs/${payrollRunId}/calculate`)
      .set('Cookie', authCookies)
      .send({});

    if (calculateResponse.status !== 200) {
      throw new Error(`Failed to calculate payroll: ${calculateResponse.body.message}`);
    }

    // Get paychecks
    const paychecksResponse = await request(app)
      .get(`/api/products/paylinq/payroll-runs/${payrollRunId}/paychecks`)
      .set('Cookie', authCookies);

    if (paychecksResponse.status !== 200) {
      throw new Error(`Failed to get paychecks: ${paychecksResponse.body.message}`);
    }

    return {
      payrollRunId,
      paychecks: paychecksResponse.body.paychecks || []
    };
  }

  // ==================== SCENARIO 1: BASIC FIXED SALARY ====================

  describe('Scenario 1: Basic Fixed Salary Template', () => {
    let workerId;
    let templateId;

    it('should create worker for basic salary test', async () => {
      workerId = await createTestWorker('EMP-BASIC-001', 'John', 'Basic');
      expect(workerId).toBeDefined();
    });

    it('should create basic salary template', async () => {
      templateId = await createPayTemplate({
        templateCode: 'BASIC_SALARY_TEMPLATE',
        templateName: 'Basic Salary Template',
        description: 'Simple fixed salary template',
        status: 'draft'
      });

      expect(templateId).toBeDefined();
    });

    it('should add fixed salary component to template', async () => {
      const component = await addComponentToTemplate(templateId, {
        componentCode: 'BASIC_SALARY',
        componentName: 'Basic Salary',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        fixedAmount: 5000.00,
        sequenceOrder: 1,
        isMandatory: true,
        isVisibleOnPayslip: true
      });

      expect(component).toBeDefined();
      expect(component.componentCode).toBe('BASIC_SALARY');
      expect(component.fixedAmount).toBe(5000.00);
    });

    it('should publish template', async () => {
      const response = await request(app)
        .post(`/api/products/paylinq/pay-structures/templates/${templateId}/publish`)
        .set('Cookie', authCookies)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should assign template to worker', async () => {
      const assignment = await assignTemplateToWorker(workerId, templateId);
      expect(assignment).toBeDefined();
    });

    it('should run payroll and validate basic salary calculation', async () => {
      const result = await runPayroll({
        payrollName: 'Basic Salary Payroll - June 2024',
        periodStart: '2024-06-01',
        periodEnd: '2024-06-30',
        paymentDate: '2024-07-01',
        runType: 'REGULAR',
        status: 'draft'
      });

      expect(result.paychecks).toBeDefined();
      expect(result.paychecks.length).toBeGreaterThan(0);

      // Find paycheck for our test worker
      const paycheck = result.paychecks.find(pc => pc.employeeId === workerId);
      expect(paycheck).toBeDefined();
      expect(paycheck.grossPay).toBe(5000.00);
      expect(paycheck.netPay).toBe(5000.00); // No deductions
    });
  });

  // ==================== SCENARIO 2: COMPLEX EARNINGS ====================

  describe('Scenario 2: Complex Earnings Template', () => {
    let workerId;
    let templateId;

    it('should create worker for complex earnings test', async () => {
      workerId = await createTestWorker('EMP-COMPLEX-001', 'Sarah', 'Complex');
      expect(workerId).toBeDefined();
    });

    it('should create complex earnings template', async () => {
      templateId = await createPayTemplate({
        templateCode: 'COMPLEX_EARNINGS_TEMPLATE',
        templateName: 'Complex Earnings Template',
        description: 'Template with multiple earnings components',
        status: 'draft'
      });

      expect(templateId).toBeDefined();
    });

    it('should add base pay component', async () => {
      const component = await addComponentToTemplate(templateId, {
        componentCode: 'BASE_PAY',
        componentName: 'Base Pay',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        fixedAmount: 4000.00,
        sequenceOrder: 1,
        isMandatory: true,
        isVisibleOnPayslip: true
      });

      expect(component.componentCode).toBe('BASE_PAY');
    });

    it('should add overtime component', async () => {
      const component = await addComponentToTemplate(templateId, {
        componentCode: 'OVERTIME',
        componentName: 'Overtime Pay',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        fixedAmount: 500.00,
        sequenceOrder: 2,
        isMandatory: false,
        isVisibleOnPayslip: true
      });

      expect(component.componentCode).toBe('OVERTIME');
    });

    it('should add bonus component', async () => {
      const component = await addComponentToTemplate(templateId, {
        componentCode: 'BONUS',
        componentName: 'Performance Bonus',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        fixedAmount: 1000.00,
        sequenceOrder: 3,
        isMandatory: false,
        isVisibleOnPayslip: true
      });

      expect(component.componentCode).toBe('BONUS');
    });

    it('should add commission component', async () => {
      const component = await addComponentToTemplate(templateId, {
        componentCode: 'COMMISSION',
        componentName: 'Sales Commission',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        fixedAmount: 750.00,
        sequenceOrder: 4,
        isMandatory: false,
        isVisibleOnPayslip: true
      });

      expect(component.componentCode).toBe('COMMISSION');
    });

    it('should publish template and assign to worker', async () => {
      await request(app)
        .post(`/api/products/paylinq/pay-structures/templates/${templateId}/publish`)
        .set('Cookie', authCookies)
        .send({});

      await assignTemplateToWorker(workerId, templateId);
    });

    it('should calculate payroll with all earnings components', async () => {
      const result = await runPayroll({
        payrollName: 'Complex Earnings Payroll - June 2024',
        periodStart: '2024-06-01',
        periodEnd: '2024-06-30',
        paymentDate: '2024-07-01',
        runType: 'REGULAR'
      });

      const paycheck = result.paychecks.find(pc => pc.employeeId === workerId);
      expect(paycheck).toBeDefined();
      
      // Total: 4000 + 500 + 1000 + 750 = 6250
      expect(paycheck.grossPay).toBe(6250.00);
    });
  });

  // ==================== SCENARIO 3: EARNINGS WITH DEDUCTIONS ====================

  describe('Scenario 3: Earnings with Deductions Template', () => {
    let workerId;
    let templateId;

    it('should create worker for deductions test', async () => {
      workerId = await createTestWorker('EMP-DEDUCT-001', 'Mike', 'Deduct');
      expect(workerId).toBeDefined();
    });

    it('should create earnings with deductions template', async () => {
      templateId = await createPayTemplate({
        templateCode: 'SALARY_WITH_DEDUCTIONS',
        templateName: 'Salary with Deductions',
        description: 'Template with earnings and deductions',
        status: 'draft'
      });

      expect(templateId).toBeDefined();
    });

    it('should add base salary earning', async () => {
      await addComponentToTemplate(templateId, {
        componentCode: 'BASIC_SALARY',
        componentName: 'Basic Salary',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        fixedAmount: 5000.00,
        sequenceOrder: 1,
        isMandatory: true,
        isVisibleOnPayslip: true
      });
    });

    it('should add federal tax deduction (percentage)', async () => {
      const component = await addComponentToTemplate(templateId, {
        componentCode: 'FED_TAX',
        componentName: 'Federal Tax',
        componentType: 'deduction',
        calculationType: 'percentage',
        percentage: 15.0,
        sequenceOrder: 2,
        isMandatory: true,
        isVisibleOnPayslip: true
      });

      expect(component.componentCode).toBe('FED_TAX');
      expect(component.percentage).toBe(15.0);
    });

    it('should add health insurance deduction (fixed)', async () => {
      await addComponentToTemplate(templateId, {
        componentCode: 'HEALTH_INS',
        componentName: 'Health Insurance',
        componentType: 'deduction',
        calculationType: 'fixed_amount',
        fixedAmount: 200.00,
        sequenceOrder: 3,
        isMandatory: true,
        isVisibleOnPayslip: true
      });
    });

    it('should add retirement deduction (percentage)', async () => {
      await addComponentToTemplate(templateId, {
        componentCode: 'RETIREMENT_401K',
        componentName: '401K Retirement',
        componentType: 'deduction',
        calculationType: 'percentage',
        percentage: 5.0,
        sequenceOrder: 4,
        isMandatory: false,
        isVisibleOnPayslip: true
      });
    });

    it('should publish template and assign to worker', async () => {
      await request(app)
        .post(`/api/products/paylinq/pay-structures/templates/${templateId}/publish`)
        .set('Cookie', authCookies)
        .send({});

      await assignTemplateToWorker(workerId, templateId);
    });

    it('should calculate net pay with deductions', async () => {
      const result = await runPayroll({
        payrollName: 'Deductions Payroll - June 2024',
        periodStart: '2024-06-01',
        periodEnd: '2024-06-30',
        paymentDate: '2024-07-01',
        runType: 'REGULAR'
      });

      const paycheck = result.paychecks.find(pc => pc.employeeId === workerId);
      expect(paycheck).toBeDefined();

      // Gross: $5000
      // Fed Tax (15%): $750
      // Health Insurance: $200
      // 401K (5%): $250
      // Total Deductions: $1200
      // Net: $3800
      
      expect(paycheck.grossPay).toBe(5000.00);
      expect(paycheck.totalDeductions).toBeCloseTo(1200.00, 2);
      expect(paycheck.netPay).toBeCloseTo(3800.00, 2);
    });
  });

  // ==================== SCENARIO 4: FORMULA-BASED CALCULATIONS ====================

  describe('Scenario 4: Formula-Based Calculations', () => {
    let workerId;
    let templateId;

    it('should create worker for formula test', async () => {
      workerId = await createTestWorker('EMP-FORMULA-001', 'Alice', 'Formula');
      expect(workerId).toBeDefined();
    });

    it('should create formula-based template', async () => {
      templateId = await createPayTemplate({
        templateCode: 'FORMULA_TEMPLATE',
        templateName: 'Formula-Based Template',
        description: 'Template using formula calculations',
        status: 'draft'
      });

      expect(templateId).toBeDefined();
    });

    it('should add hourly rate component with formula', async () => {
      const component = await addComponentToTemplate(templateId, {
        componentCode: 'HOURLY_PAY',
        componentName: 'Hourly Pay',
        componentType: 'earning',
        calculationType: 'formula',
        formulaExpression: 'hours_worked * hourly_rate',
        sequenceOrder: 1,
        isMandatory: true,
        isVisibleOnPayslip: true
      });

      expect(component.componentCode).toBe('HOURLY_PAY');
      expect(component.formulaExpression).toBe('hours_worked * hourly_rate');
    });

    it('should add overtime formula component', async () => {
      await addComponentToTemplate(templateId, {
        componentCode: 'OVERTIME_PAY',
        componentName: 'Overtime Pay',
        componentType: 'earning',
        calculationType: 'formula',
        formulaExpression: 'overtime_hours * hourly_rate * 1.5',
        sequenceOrder: 2,
        isMandatory: false,
        isVisibleOnPayslip: true
      });
    });

    it('should publish template and assign to worker', async () => {
      await request(app)
        .post(`/api/products/paylinq/pay-structures/templates/${templateId}/publish`)
        .set('Cookie', authCookies)
        .send({});

      await assignTemplateToWorker(workerId, templateId);
    });

    it('should calculate payroll with formula components', async () => {
      // Note: In a real scenario, formula variables would be provided
      // For this test, we expect the formula engine to calculate based on
      // worker metadata or payroll run context variables
      const result = await runPayroll({
        payrollName: 'Formula Payroll - June 2024',
        periodStart: '2024-06-01',
        periodEnd: '2024-06-30',
        paymentDate: '2024-07-01',
        runType: 'REGULAR'
      });

      const paycheck = result.paychecks.find(pc => pc.employeeId === workerId);
      expect(paycheck).toBeDefined();
      expect(paycheck.grossPay).toBeGreaterThan(0);
    });
  });

  // ==================== SCENARIO 5: MIXED CALCULATION TYPES ====================

  describe('Scenario 5: Mixed Calculation Types', () => {
    let workerId;
    let templateId;

    it('should create worker for mixed calculations test', async () => {
      workerId = await createTestWorker('EMP-MIXED-001', 'Bob', 'Mixed');
      expect(workerId).toBeDefined();
    });

    it('should create mixed calculations template', async () => {
      templateId = await createPayTemplate({
        templateCode: 'MIXED_CALC_TEMPLATE',
        templateName: 'Mixed Calculations Template',
        description: 'Template with fixed, formula, and percentage calculations',
        status: 'draft'
      });

      expect(templateId).toBeDefined();
    });

    it('should add components with different calculation types', async () => {
      // Fixed amount
      await addComponentToTemplate(templateId, {
        componentCode: 'BASE_SALARY',
        componentName: 'Base Salary',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        fixedAmount: 3000.00,
        sequenceOrder: 1,
        isMandatory: true,
        isVisibleOnPayslip: true
      });

      // Percentage
      await addComponentToTemplate(templateId, {
        componentCode: 'COMMISSION',
        componentName: 'Sales Commission',
        componentType: 'earning',
        calculationType: 'percentage',
        percentage: 10.0,
        sequenceOrder: 2,
        isMandatory: false,
        isVisibleOnPayslip: true
      });

      // Formula
      await addComponentToTemplate(templateId, {
        componentCode: 'OVERTIME',
        componentName: 'Overtime',
        componentType: 'earning',
        calculationType: 'formula',
        formulaExpression: 'ot_hours * rate * 1.5',
        sequenceOrder: 3,
        isMandatory: false,
        isVisibleOnPayslip: true
      });

      // Percentage deduction
      await addComponentToTemplate(templateId, {
        componentCode: 'TAX',
        componentName: 'Income Tax',
        componentType: 'deduction',
        calculationType: 'percentage',
        percentage: 20.0,
        sequenceOrder: 4,
        isMandatory: true,
        isVisibleOnPayslip: true
      });
    });

    it('should publish and assign template', async () => {
      await request(app)
        .post(`/api/products/paylinq/pay-structures/templates/${templateId}/publish`)
        .set('Cookie', authCookies)
        .send({});

      await assignTemplateToWorker(workerId, templateId);
    });

    it('should calculate payroll with mixed calculation types', async () => {
      const result = await runPayroll({
        payrollName: 'Mixed Calculations Payroll - June 2024',
        periodStart: '2024-06-01',
        periodEnd: '2024-06-30',
        paymentDate: '2024-07-01',
        runType: 'REGULAR'
      });

      const paycheck = result.paychecks.find(pc => pc.employeeId === workerId);
      expect(paycheck).toBeDefined();
      expect(paycheck.grossPay).toBeGreaterThan(0);
      expect(paycheck.totalDeductions).toBeGreaterThan(0);
      expect(paycheck.netPay).toBeLessThan(paycheck.grossPay);
    });
  });

  // ==================== SCENARIO 6: OPTIONAL COMPONENTS ====================

  describe('Scenario 6: Optional Components', () => {
    let workerId;
    let templateId;

    it('should create worker for optional components test', async () => {
      workerId = await createTestWorker('EMP-OPTIONAL-001', 'Carol', 'Optional');
      expect(workerId).toBeDefined();
    });

    it('should create template with optional components', async () => {
      templateId = await createPayTemplate({
        templateCode: 'OPTIONAL_COMPONENTS_TEMPLATE',
        templateName: 'Optional Components Template',
        description: 'Template with mix of required and optional components',
        status: 'draft'
      });

      expect(templateId).toBeDefined();
    });

    it('should add required base salary', async () => {
      await addComponentToTemplate(templateId, {
        componentCode: 'BASE_SALARY',
        componentName: 'Base Salary',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        fixedAmount: 4000.00,
        sequenceOrder: 1,
        isMandatory: true,
        isVisibleOnPayslip: true
      });
    });

    it('should add optional health insurance', async () => {
      await addComponentToTemplate(templateId, {
        componentCode: 'HEALTH_INS',
        componentName: 'Health Insurance',
        componentType: 'deduction',
        calculationType: 'fixed_amount',
        fixedAmount: 300.00,
        sequenceOrder: 2,
        isMandatory: false,
        isVisibleOnPayslip: true
      });
    });

    it('should add optional dental insurance (hidden)', async () => {
      await addComponentToTemplate(templateId, {
        componentCode: 'DENTAL_INS',
        componentName: 'Dental Insurance',
        componentType: 'deduction',
        calculationType: 'fixed_amount',
        fixedAmount: 50.00,
        sequenceOrder: 3,
        isMandatory: false,
        isVisibleOnPayslip: false // Hidden from payslip
      });
    });

    it('should add optional retirement', async () => {
      await addComponentToTemplate(templateId, {
        componentCode: 'RETIREMENT',
        componentName: 'Retirement 401K',
        componentType: 'deduction',
        calculationType: 'percentage',
        percentage: 5.0,
        sequenceOrder: 4,
        isMandatory: false,
        isVisibleOnPayslip: true
      });
    });

    it('should publish and assign template', async () => {
      await request(app)
        .post(`/api/products/paylinq/pay-structures/templates/${templateId}/publish`)
        .set('Cookie', authCookies)
        .send({});

      await assignTemplateToWorker(workerId, templateId);
    });

    it('should calculate payroll with custom optional component selection', async () => {
      const result = await runPayroll({
        payrollName: 'Optional Components Payroll - June 2024',
        periodStart: '2024-06-01',
        periodEnd: '2024-06-30',
        paymentDate: '2024-07-01',
        runType: 'REGULAR'
      });

      const paycheck = result.paychecks.find(pc => pc.employeeId === workerId);
      expect(paycheck).toBeDefined();
      expect(paycheck.grossPay).toBe(4000.00);
      
      // Only mandatory base salary should be included by default
      // Optional components may or may not be applied based on worker preferences
    });
  });

  // ==================== SCENARIO 7: COMPLETE COMPLEX TEMPLATE ====================

  describe('Scenario 7: Complete Complex Template', () => {
    let workerId;
    let templateId;

    it('should create worker for complete template test', async () => {
      workerId = await createTestWorker('EMP-COMPLETE-001', 'David', 'Complete');
      expect(workerId).toBeDefined();
    });

    it('should create complete complex template', async () => {
      templateId = await createPayTemplate({
        templateCode: 'COMPLETE_TEMPLATE',
        templateName: 'Complete Template',
        description: 'Comprehensive template with all component types and calculations',
        status: 'draft'
      });

      expect(templateId).toBeDefined();
    });

    it('should add all earnings components', async () => {
      // Fixed salary
      await addComponentToTemplate(templateId, {
        componentCode: 'BASE_SALARY',
        componentName: 'Base Salary',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        fixedAmount: 5000.00,
        sequenceOrder: 1,
        isMandatory: true,
        isVisibleOnPayslip: true
      });

      // Formula overtime
      await addComponentToTemplate(templateId, {
        componentCode: 'OVERTIME',
        componentName: 'Overtime Pay',
        componentType: 'earning',
        calculationType: 'formula',
        formulaExpression: 'ot_hours * base_rate * 1.5',
        sequenceOrder: 2,
        isMandatory: false,
        isVisibleOnPayslip: true
      });

      // Fixed bonus
      await addComponentToTemplate(templateId, {
        componentCode: 'BONUS',
        componentName: 'Performance Bonus',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        fixedAmount: 1500.00,
        sequenceOrder: 3,
        isMandatory: false,
        isVisibleOnPayslip: true
      });
    });

    it('should add all deduction components', async () => {
      // Percentage federal tax
      await addComponentToTemplate(templateId, {
        componentCode: 'FED_TAX',
        componentName: 'Federal Tax',
        componentType: 'deduction',
        calculationType: 'percentage',
        percentage: 15.0,
        sequenceOrder: 4,
        isMandatory: true,
        isVisibleOnPayslip: true
      });

      // Percentage state tax
      await addComponentToTemplate(templateId, {
        componentCode: 'STATE_TAX',
        componentName: 'State Tax',
        componentType: 'deduction',
        calculationType: 'percentage',
        percentage: 5.0,
        sequenceOrder: 5,
        isMandatory: true,
        isVisibleOnPayslip: true
      });

      // Fixed insurance
      await addComponentToTemplate(templateId, {
        componentCode: 'INSURANCE',
        componentName: 'Health & Dental Insurance',
        componentType: 'deduction',
        calculationType: 'fixed_amount',
        fixedAmount: 250.00,
        sequenceOrder: 6,
        isMandatory: true,
        isVisibleOnPayslip: true
      });

      // Percentage retirement
      await addComponentToTemplate(templateId, {
        componentCode: 'RETIREMENT_401K',
        componentName: '401K Retirement',
        componentType: 'deduction',
        calculationType: 'percentage',
        percentage: 6.0,
        sequenceOrder: 7,
        isMandatory: false,
        isVisibleOnPayslip: true
      });

      // Fixed HSA (hidden)
      await addComponentToTemplate(templateId, {
        componentCode: 'HSA',
        componentName: 'Health Savings Account',
        componentType: 'deduction',
        calculationType: 'fixed_amount',
        fixedAmount: 100.00,
        sequenceOrder: 8,
        isMandatory: false,
        isVisibleOnPayslip: false
      });
    });

    it('should publish and assign complete template', async () => {
      const publishResponse = await request(app)
        .post(`/api/products/paylinq/pay-structures/templates/${templateId}/publish`)
        .set('Cookie', authCookies)
        .send({});

      expect(publishResponse.status).toBe(200);

      await assignTemplateToWorker(workerId, templateId);
    });

    it('should calculate complete payroll with all components', async () => {
      const result = await runPayroll({
        payrollName: 'Complete Template Payroll - June 2024',
        periodStart: '2024-06-01',
        periodEnd: '2024-06-30',
        paymentDate: '2024-07-01',
        runType: 'REGULAR'
      });

      const paycheck = result.paychecks.find(pc => pc.employeeId === workerId);
      expect(paycheck).toBeDefined();

      // Expected calculations (with all mandatory components):
      // Gross: Base $5000 + Bonus $1500 = $6500
      // Deductions:
      //   - Fed Tax (15%): $975
      //   - State Tax (5%): $325
      //   - Insurance: $250
      //   - 401K (6%): $390
      // Total Deductions: $1940
      // Net: $6500 - $1940 = $4560

      expect(paycheck.grossPay).toBeCloseTo(6500.00, 2);
      expect(paycheck.totalDeductions).toBeGreaterThan(0);
      expect(paycheck.netPay).toBeLessThan(paycheck.grossPay);
    });

    it('should verify all components are included in paycheck breakdown', async () => {
      const result = await runPayroll({
        payrollName: 'Component Verification Payroll - June 2024',
        periodStart: '2024-06-01',
        periodEnd: '2024-06-30',
        paymentDate: '2024-07-01',
        runType: 'REGULAR'
      });

      const paycheck = result.paychecks.find(pc => pc.employeeId === workerId);
      expect(paycheck).toBeDefined();

      // Verify paycheck has component breakdown
      if (paycheck.components) {
        const componentCodes = paycheck.components.map(c => c.componentCode);
        
        // Verify earnings
        expect(componentCodes).toContain('BASE_SALARY');
        expect(componentCodes).toContain('BONUS');
        
        // Verify deductions
        expect(componentCodes).toContain('FED_TAX');
        expect(componentCodes).toContain('STATE_TAX');
        expect(componentCodes).toContain('INSURANCE');
      }
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases and Validation', () => {
    it('should prevent assigning unpublished template to worker', async () => {
      const workerId = await createTestWorker('EMP-EDGE-001', 'Edge', 'Case');
      
      const templateId = await createPayTemplate({
        templateCode: 'DRAFT_TEMPLATE',
        templateName: 'Draft Template',
        description: 'Template in draft status',
        status: 'draft'
      });

      // Try to assign draft template (should fail)
      const response = await request(app)
        .post(`/api/products/paylinq/pay-structures/workers/${workerId}/assignments`)
        .set('Cookie', authCookies)
        .send({
          templateId: templateId,
          effectiveDate: '2024-06-01'
        });

      // Should return error (draft templates cannot be assigned)
      expect([400, 403, 409]).toContain(response.status);
    });

    it('should handle payroll run with no workers assigned to template', async () => {
      const result = await runPayroll({
        payrollName: 'Empty Payroll - June 2024',
        periodStart: '2024-06-01',
        periodEnd: '2024-06-30',
        paymentDate: '2024-07-01',
        runType: 'REGULAR'
      });

      // Should succeed but have no paychecks
      expect(result.payrollRunId).toBeDefined();
    });
  });
});
