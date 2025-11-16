/**
 * Vakantiegeld (Holiday Allowance) Integration Tests
 * 
 * Tests the complete flow of vakantiegeld calculations:
 * 1. Component metadata configuration (3 calculation methods)
 * 2. PayStructureService calculation execution
 * 3. PayrollService tax treatment (holiday_allowance type)
 * 4. TaxCalculationService allowance cap enforcement (SRD 10,016/year)
 * 5. employee_allowance_usage tracking
 * 
 * Test Scenarios:
 * - Organization A: 8% of base salary (semi-annual)
 * - Organization B: Fixed SRD 5,000 (bi-annual)
 * - Organization C: One month salary (annual)
 */

import request from 'supertest';
import { query } from '../../src/config/database.js';
import app from '../../src/server.js';
import { v4 as uuidv4 } from 'uuid';


// SKIPPED: Bearer token auth incomplete - migrating to cookie-based auth
// TODO: Re-enable once cookie auth is implemented for all apps

describe.skip('Vakantiegeld Integration Tests', () => {
  let authToken;
  let organizationAId;
  let organizationBId;
  let organizationCId;
  let employeeAId;
  let employeeBId;
  let employeeCId;
  let runTypeId;

  // ================================================================
  // SETUP: Create test organizations and employees
  // ================================================================
  
  beforeAll(async () => {
    // Login as admin to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'TestPassword123!',
      });
    
    authToken = loginResponse.body.data.accessToken;

    // Create Organization A (8% of base salary)
    organizationAId = uuidv4();
    await query(
      `INSERT INTO organizations (id, name, email, timezone) VALUES ($1, 'Organization A - 8% Vakantiegeld', 'orga@test.com', 'America/Paramaribo')`,
      [organizationAId]
    );

    // Create Organization B (Fixed SRD 5,000)
    organizationBId = uuidv4();
    await query(
      `INSERT INTO organizations (id, name, email, timezone) VALUES ($1, 'Organization B - Fixed 5000', 'orgb@test.com', 'America/Paramaribo')`,
      [organizationBId]
    );

    // Create Organization C (One month salary)
    organizationCId = uuidv4();
    await query(
      `INSERT INTO organizations (id, name, email, timezone) VALUES ($1, 'Organization C - One Month', 'orgc@test.com', 'America/Paramaribo')`,
      [organizationCId]
    );

    // Create VAKANTIEGELD run type for Organization A
    runTypeId = uuidv4();
    await query(
      `INSERT INTO payroll.payroll_run_type 
       (id, organization_id, type_code, type_name, description, 
        component_override_mode, allowed_components, is_active)
       VALUES ($1, $2, 'VAKANTIEGELD', 'Holiday Allowance', 
               'Semi-annual vakantiegeld payment', 'explicit', 
               '["VAKANTIEGELD"]'::jsonb, true)`,
      [runTypeId, organizationAId]
    );

    // Create employees
    employeeAId = await createTestEmployee(organizationAId, 'John Doe', 15000);
    employeeBId = await createTestEmployee(organizationBId, 'Jane Smith', 18000);
    employeeCId = await createTestEmployee(organizationCId, 'Bob Johnson', 20000);

    // Seed VAKANTIEGELD components for each organization
    await seedVakantiegeldComponents();
  });

  // ================================================================
  // Helper: Create test employee with compensation
  // ================================================================
  
  async function createTestEmployee(orgId, name, baseSalary) {
    const employeeId = uuidv4();
    const [firstName, lastName] = name.split(' ');
    
    await query(
      `INSERT INTO hris.employee 
       (id, organization_id, employee_number, first_name, last_name, 
        email, hire_date, employment_status, pay_frequency)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'active', 'monthly')`,
      [employeeId, orgId, `EMP${Math.floor(Math.random() * 10000)}`, firstName, lastName, 
       `${firstName.toLowerCase()}@test.com`]
    );

    // Create compensation record
    await query(
      `INSERT INTO payroll.compensation 
       (id, employee_id, organization_id, compensation_type, amount, 
        effective_date, status)
       VALUES ($1, $2, $3, 'salary', $4, CURRENT_DATE, 'active')`,
      [uuidv4(), employeeId, orgId, baseSalary]
    );

    return employeeId;
  }

  // ================================================================
  // Helper: Seed VAKANTIEGELD components
  // ================================================================
  
  async function seedVakantiegeldComponents() {
    // Organization A: 8% of base salary (semi-annual)
    await query(
      `INSERT INTO payroll.pay_component 
       (id, organization_id, component_code, component_name, component_type, 
        category, calculation_type, default_rate, is_taxable, metadata)
       VALUES ($1, $2, 'VAKANTIEGELD', 'Holiday Allowance', 'earning', 
               'special_payment', 'percentage', 8.0, true, 
               $3::jsonb)`,
      [
        uuidv4(),
        organizationAId,
        JSON.stringify({
          calculation_method: 'percentage',
          percentage: 8.0,
          basis: 'base_salary',
          multiplier: 6,
          accumulation_period: 'semi_annual',
          payment_months: [1, 9],
          allowance_type: 'holiday_allowance',
        }),
      ]
    );

    // Organization B: Fixed SRD 5,000 (bi-annual)
    await query(
      `INSERT INTO payroll.pay_component 
       (id, organization_id, component_code, component_name, component_type, 
        category, calculation_type, default_amount, is_taxable, metadata)
       VALUES ($1, $2, 'VAKANTIEGELD', 'Holiday Allowance', 'earning', 
               'special_payment', 'fixed_amount', 5000.00, true, 
               $3::jsonb)`,
      [
        uuidv4(),
        organizationBId,
        JSON.stringify({
          calculation_method: 'fixed_amount',
          amount: 5000.0,
          payment_months: [6, 12],
          allowance_type: 'holiday_allowance',
        }),
      ]
    );

    // Organization C: One month salary (annual)
    await query(
      `INSERT INTO payroll.pay_component 
       (id, organization_id, component_code, component_name, component_type, 
        category, calculation_type, formula, is_taxable, metadata)
       VALUES ($1, $2, 'VAKANTIEGELD', 'Holiday Allowance', 'earning', 
               'special_payment', 'formula', 'base_salary * 1', true, 
               $3::jsonb)`,
      [
        uuidv4(),
        organizationCId,
        JSON.stringify({
          calculation_method: 'one_month_salary',
          payment_months: [12],
          allowance_type: 'holiday_allowance',
        }),
      ]
    );
  }

  // ================================================================
  // TEST SUITE: Organization A - 8% of Base Salary
  // ================================================================
  
  describe.skip('Organization A - 8% of Base Salary (Semi-Annual)', () => {
    let payrollRunId;
    let paycheckId;

    test('should calculate 8% of base salary × 6 months = SRD 7,200', async () => {
      // Given: Employee with SRD 15,000 base salary
      // Expected: 15,000 × 8% × 6 months = 7,200

      // Create payroll run
      const runResponse = await request(app)
        .post('/api/paylinq/payroll-runs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          payrollName: 'January 2025 - Vakantiegeld',
          periodStart: '2025-01-01',
          periodEnd: '2025-01-15',
          paymentDate: '2025-01-20',
          runTypeCode: 'VAKANTIEGELD',
        });

      expect(runResponse.status).toBe(201);
      payrollRunId = runResponse.body.payrollRun.id;

      // Calculate payroll
      const calcResponse = await request(app)
        .post(`/api/paylinq/payroll-runs/${payrollRunId}/calculate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(calcResponse.status).toBe(200);

      // Get paycheck
      const paycheckResponse = await request(app)
        .get(`/api/paylinq/payroll-runs/${payrollRunId}/paychecks`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(paycheckResponse.status).toBe(200);
      expect(paycheckResponse.body.paychecks).toHaveLength(1);

      const paycheck = paycheckResponse.body.paychecks[0];
      paycheckId = paycheck.id;

      // Verify gross pay
      expect(paycheck.grossPay).toBe(7200);
      
      // Verify component breakdown
      const componentsResponse = await request(app)
        .get(`/api/paylinq/paychecks/${paycheckId}/components`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(componentsResponse.status).toBe(200);
      const vakantiegeldComponent = componentsResponse.body.components.find(
        (c) => c.componentCode === 'VAKANTIEGELD'
      );

      expect(vakantiegeldComponent).toBeDefined();
      expect(vakantiegeldComponent.amount).toBe(7200);
      expect(vakantiegeldComponent.allowanceType).toBe('holiday_allowance');
    });

    test('should apply tax-free allowance up to monthly cap', async () => {
      // SRD 10,016/year cap = 1,669.33/month for semi-annual (10,016 / 6)
      // Expected: SRD 1,669.33 tax-free, remaining 5,530.67 taxable

      const paycheckResponse = await request(app)
        .get(`/api/paylinq/paychecks/${paycheckId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(paycheckResponse.status).toBe(200);
      const paycheck = paycheckResponse.body.paycheck;

      // Verify tax-free allowance applied
      expect(paycheck.taxFreeAllowance).toBeCloseTo(1669.33, 2);
      expect(paycheck.taxableIncome).toBeCloseTo(5530.67, 2);
    });

    test('should track employee allowance usage', async () => {
      // Verify employee_allowance_usage record created
      const usageResult = await query(
        `SELECT * FROM payroll.employee_allowance_usage
         WHERE employee_id = $1 AND allowance_type = 'holiday_allowance' 
         AND usage_year = 2025`,
        [employeeAId]
      );

      expect(usageResult.rows).toHaveLength(1);
      expect(usageResult.rows[0].used_amount).toBe('1669.33');
      expect(usageResult.rows[0].remaining_amount).toBeCloseTo(8346.67, 2);
    });
  });

  // ================================================================
  // TEST SUITE: Organization B - Fixed SRD 5,000
  // ================================================================
  
  describe.skip('Organization B - Fixed SRD 5,000 (Bi-Annual)', () => {
    let payrollRunId;
    let paycheckId;

    test('should calculate fixed SRD 5,000', async () => {
      // Given: Fixed amount of SRD 5,000
      // Expected: SRD 5,000 (regardless of base salary)

      // Create payroll run for Organization B
      const runResponse = await request(app)
        .post('/api/paylinq/payroll-runs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationBId) // Switch org context
        .send({
          payrollName: 'June 2025 - Vakantiegeld',
          periodStart: '2025-06-01',
          periodEnd: '2025-06-15',
          paymentDate: '2025-06-20',
          runTypeCode: 'VAKANTIEGELD',
        });

      expect(runResponse.status).toBe(201);
      payrollRunId = runResponse.body.payrollRun.id;

      // Calculate payroll
      await request(app)
        .post(`/api/paylinq/payroll-runs/${payrollRunId}/calculate`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationBId);

      // Get paycheck
      const paycheckResponse = await request(app)
        .get(`/api/paylinq/payroll-runs/${payrollRunId}/paychecks`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationBId);

      const paycheck = paycheckResponse.body.paychecks[0];
      paycheckId = paycheck.id;

      // Verify fixed amount
      expect(paycheck.grossPay).toBe(5000);
    });

    test('should apply full tax-free allowance (within cap)', async () => {
      // SRD 5,000 is within the SRD 10,016 cap
      // Expected: Full SRD 5,000 tax-free

      const paycheckResponse = await request(app)
        .get(`/api/paylinq/paychecks/${paycheckId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationBId);

      const paycheck = paycheckResponse.body.paycheck;

      expect(paycheck.taxFreeAllowance).toBe(5000);
      expect(paycheck.taxableIncome).toBe(0);
    });
  });

  // ================================================================
  // TEST SUITE: Organization C - One Month Salary
  // ================================================================
  
  describe.skip('Organization C - One Month Salary (Annual)', () => {
    let payrollRunId;
    let paycheckId;

    test('should calculate one full month salary = SRD 20,000', async () => {
      // Given: Employee with SRD 20,000 base salary
      // Expected: SRD 20,000 (one full month)

      // Create payroll run for Organization C
      const runResponse = await request(app)
        .post('/api/paylinq/payroll-runs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationCId)
        .send({
          payrollName: 'December 2025 - Vakantiegeld',
          periodStart: '2025-12-01',
          periodEnd: '2025-12-15',
          paymentDate: '2025-12-20',
          runTypeCode: 'VAKANTIEGELD',
        });

      expect(runResponse.status).toBe(201);
      payrollRunId = runResponse.body.payrollRun.id;

      // Calculate payroll
      await request(app)
        .post(`/api/paylinq/payroll-runs/${payrollRunId}/calculate`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationCId);

      // Get paycheck
      const paycheckResponse = await request(app)
        .get(`/api/paylinq/payroll-runs/${payrollRunId}/paychecks`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationCId);

      const paycheck = paycheckResponse.body.paychecks[0];
      paycheckId = paycheck.id;

      // Verify one month salary
      expect(paycheck.grossPay).toBe(20000);
    });

    test('should apply tax-free cap and tax remainder', async () => {
      // SRD 20,000 exceeds SRD 10,016 cap
      // Expected: SRD 10,016 tax-free, SRD 9,984 taxable

      const paycheckResponse = await request(app)
        .get(`/api/paylinq/paychecks/${paycheckId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationCId);

      const paycheck = paycheckResponse.body.paycheck;

      expect(paycheck.taxFreeAllowance).toBe(10016);
      expect(paycheck.taxableIncome).toBe(9984);
      expect(paycheck.wageTax).toBeGreaterThan(0); // Taxes applied to remainder
    });

    test('should track full yearly cap usage', async () => {
      // Verify employee used full SRD 10,016 cap
      const usageResult = await query(
        `SELECT * FROM payroll.employee_allowance_usage
         WHERE employee_id = $1 AND allowance_type = 'holiday_allowance' 
         AND usage_year = 2025`,
        [employeeCId]
      );

      expect(usageResult.rows).toHaveLength(1);
      expect(usageResult.rows[0].used_amount).toBe('10016.00');
      expect(usageResult.rows[0].remaining_amount).toBe('0.00');
    });
  });

  // ================================================================
  // TEST SUITE: Multiple Payments - Yearly Cap Enforcement
  // ================================================================
  
  describe.skip('Multiple Payments - Yearly Cap Enforcement', () => {
    test('should enforce SRD 10,016/year cap across multiple payments', async () => {
      // Organization A: Two semi-annual payments
      // Payment 1 (Jan): SRD 7,200 → 1,669.33 tax-free
      // Payment 2 (Sep): SRD 7,200 → remaining 8,346.67 tax-free
      // Total tax-free: SRD 10,016

      // Create second payroll run for Organization A (September)
      const runResponse = await request(app)
        .post('/api/paylinq/payroll-runs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationAId)
        .send({
          payrollName: 'September 2025 - Vakantiegeld',
          periodStart: '2025-09-01',
          periodEnd: '2025-09-15',
          paymentDate: '2025-09-20',
          runTypeCode: 'VAKANTIEGELD',
        });

      const payrollRunId = runResponse.body.payrollRun.id;

      // Calculate payroll
      await request(app)
        .post(`/api/paylinq/payroll-runs/${payrollRunId}/calculate`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationAId);

      // Get paycheck
      const paycheckResponse = await request(app)
        .get(`/api/paylinq/payroll-runs/${payrollRunId}/paychecks`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Organization-Id', organizationAId);

      const paycheck = paycheckResponse.body.paychecks[0];

      // Verify remaining tax-free allowance used
      expect(paycheck.taxFreeAllowance).toBeCloseTo(8346.67, 2);
      
      // Verify total usage reaches cap
      const usageResult = await query(
        `SELECT * FROM payroll.employee_allowance_usage
         WHERE employee_id = $1 AND allowance_type = 'holiday_allowance' 
         AND usage_year = 2025`,
        [employeeAId]
      );

      expect(usageResult.rows[0].used_amount).toBe('10016.00');
      expect(usageResult.rows[0].remaining_amount).toBe('0.00');
    });
  });

  // ================================================================
  // CLEANUP: Remove test data
  // ================================================================
  
  afterAll(async () => {
    // Clean up in reverse order of dependencies
    await query('DELETE FROM payroll.employee_allowance_usage WHERE employee_id IN ($1, $2, $3)', 
                [employeeAId, employeeBId, employeeCId]);
    await query('DELETE FROM payroll.paycheck WHERE employee_id IN ($1, $2, $3)', 
                [employeeAId, employeeBId, employeeCId]);
    await query('DELETE FROM payroll.payroll_run WHERE organization_id IN ($1, $2, $3)', 
                [organizationAId, organizationBId, organizationCId]);
    await query('DELETE FROM payroll.pay_component WHERE organization_id IN ($1, $2, $3)', 
                [organizationAId, organizationBId, organizationCId]);
    await query('DELETE FROM payroll.payroll_run_type WHERE organization_id IN ($1, $2, $3)', 
                [organizationAId, organizationBId, organizationCId]);
    await query('DELETE FROM payroll.compensation WHERE organization_id IN ($1, $2, $3)', 
                [organizationAId, organizationBId, organizationCId]);
    await query('DELETE FROM hris.employee WHERE organization_id IN ($1, $2, $3)', 
                [organizationAId, organizationBId, organizationCId]);
    await query('DELETE FROM organizations WHERE id IN ($1, $2, $3)', 
                [organizationAId, organizationBId, organizationCId]);
  });
});
