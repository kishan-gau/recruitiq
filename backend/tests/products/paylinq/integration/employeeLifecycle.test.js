/**
 * Employee Lifecycle Integration Tests
 * 
 * End-to-end tests for employee lifecycle:
 * Hire → Setup compensation → Assign deductions → Modify pay → Termination
 */

import request from 'supertest';
import pool from '../../../../src/config/database.js';
import app from '../../../../src/server.js';
import { eventEmitter  } from '../../../../src/products/paylinq/events/eventEmitter.js';

describe('Employee Lifecycle Integration', () => {
  let authToken;
  let organizationId;
  let employeeId;
  let compensationId;

  beforeAll(async () => {
    // Setup test organization
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
      ['Test Employee Lifecycle Org', 'test-employee-lifecycle-org']
    );
    organizationId = orgResult.rows[0].id;

    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, organization_id, legacy_role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['lifecycle@test.com', 'dummy_hash_for_test', 'Lifecycle Test User', organizationId, 'admin']
    );
    
    authToken = `Bearer test-token-${userResult.rows[0].id}`;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  describe('Complete Employee Lifecycle', () => {
    test('Step 1: Hire new employee (W-2)', async () => {
      const response = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', authToken)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@test.com',
          phone: '555-0123',
          workerType: 'w2',
          employmentStatus: 'active',
          department: 'Engineering',
          jobTitle: 'Software Engineer',
          hireDate: '2024-01-15',
          address: {
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            zip: '94105'
          },
          bankAccount: {
            routingNumber: '121000248',
            accountNumber: '1234567890',
            accountType: 'checking'
          }
        })
        .expect(201);

      employeeId = response.body.employee.id;
      expect(response.body.employee.employment_status).toBe('active');
      expect(response.body.employee.worker_type).toBe('w2');
    });

    test('Step 2: Setup initial compensation (salary)', async () => {
      const response = await request(app)
        .post(`/api/paylinq/employees/${employeeId}/compensation`)
        .set('Authorization', authToken)
        .send({
          payType: 'salary',
          payRate: 90000, // Annual salary
          payPeriod: 'bi_weekly',
          effectiveDate: '2024-01-15'
        })
        .expect(201);

      compensationId = response.body.compensation.id;
      expect(response.body.compensation.pay_rate).toBe(90000);
      expect(response.body.compensation.is_current).toBe(true);
    });

    test('Step 3: Assign benefits deductions', async () => {
      // Create benefit deduction types
      const healthInsuranceResponse = await request(app)
        .post('/api/paylinq/deduction-types')
        .set('Authorization', authToken)
        .send({
          name: 'Health Insurance',
          calculationType: 'fixed',
          defaultAmount: 200,
          isPreTax: true
        })
        .expect(201);

      const deductionTypeId = healthInsuranceResponse.body.deductionType.id;

      // Assign to employee
      const assignResponse = await request(app)
        .post(`/api/paylinq/employees/${employeeId}/deductions`)
        .set('Authorization', authToken)
        .send({
          deductionTypeId: deductionTypeId,
          amount: 200,
          frequency: 'monthly',
          startDate: '2024-02-01'
        })
        .expect(201);

      expect(assignResponse.body.deduction.amount).toBe(200);
      expect(assignResponse.body.deduction.is_active).toBe(true);
    });

    test('Step 4: Assign 401k deduction', async () => {
      // Create 401k deduction type
      const retirement401kResponse = await request(app)
        .post('/api/paylinq/deduction-types')
        .set('Authorization', authToken)
        .send({
          name: '401k Contribution',
          calculationType: 'percentage',
          defaultAmount: 5,
          isPreTax: true,
          maxAnnualAmount: 23000 // 2024 IRS limit
        })
        .expect(201);

      const deductionTypeId = retirement401kResponse.body.deductionType.id;

      // Assign with 6% contribution
      const assignResponse = await request(app)
        .post(`/api/paylinq/employees/${employeeId}/deductions`)
        .set('Authorization', authToken)
        .send({
          deductionTypeId: deductionTypeId,
          amount: 6, // 6% of gross
          frequency: 'per_paycheck',
          startDate: '2024-02-01'
        })
        .expect(201);

      expect(assignResponse.body.deduction.amount).toBe(6);
    });

    test('Step 5: Add custom pay component (bonus)', async () => {
      // Create bonus component
      const bonusTypeResponse = await request(app)
        .post('/api/paylinq/pay-components')
        .set('Authorization', authToken)
        .send({
          name: 'Quarterly Performance Bonus',
          componentType: 'bonus',
          calculationMethod: 'fixed',
          isTaxable: true
        })
        .expect(201);

      const componentId = bonusTypeResponse.body.payComponent.id;

      // Assign $5,000 quarterly bonus
      const assignResponse = await request(app)
        .post(`/api/paylinq/employees/${employeeId}/pay-components`)
        .set('Authorization', authToken)
        .send({
          payComponentId: componentId,
          amount: 5000,
          effectiveDate: '2024-03-01'
        })
        .expect(201);

      expect(assignResponse.body.assignment.amount).toBe(5000);
    });

    test('Step 6: Give pay raise', async () => {
      // Update compensation with raise
      const response = await request(app)
        .post(`/api/paylinq/employees/${employeeId}/compensation`)
        .set('Authorization', authToken)
        .send({
          payType: 'salary',
          payRate: 95000, // $5k raise
          payPeriod: 'bi_weekly',
          effectiveDate: '2024-07-01',
          notes: 'Annual performance review - 5.5% raise'
        })
        .expect(201);

      expect(response.body.compensation.pay_rate).toBe(95000);

      // Verify old compensation is no longer current
      const historyResponse = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/compensation`)
        .set('Authorization', authToken)
        .expect(200);

      expect(historyResponse.body.compensationHistory.length).toBe(2);
      expect(historyResponse.body.compensationHistory[0].is_current).toBe(true);
      expect(historyResponse.body.compensationHistory[0].pay_rate).toBe(95000);
      expect(historyResponse.body.compensationHistory[1].is_current).toBe(false);
      expect(historyResponse.body.compensationHistory[1].pay_rate).toBe(90000);
    });

    test('Step 7: Process first paycheck', async () => {
      // Create timesheet (bi-weekly salary = 80 hours)
      const timesheetResponse = await request(app)
        .post('/api/paylinq/timesheets')
        .set('Authorization', authToken)
        .send({
          employeeId: employeeId,
          periodStart: '2024-01-15',
          periodEnd: '2024-01-28',
          regularHours: 80,
          overtimeHours: 0
        })
        .expect(201);

      const timesheetId = timesheetResponse.body.timesheet.id;

      // Approve timesheet
      await request(app)
        .post(`/api/paylinq/timesheets/${timesheetId}/approve`)
        .set('Authorization', authToken)
        .expect(200);

      // Create and calculate payroll
      const payrollResponse = await request(app)
        .post('/api/paylinq/payroll-runs')
        .set('Authorization', authToken)
        .send({
          periodStart: '2024-01-15',
          periodEnd: '2024-01-28',
          paymentDate: '2024-02-02'
        })
        .expect(201);

      const payrollRunId = payrollResponse.body.payrollRun.id;

      await request(app)
        .post(`/api/paylinq/payroll-runs/${payrollRunId}/calculate`)
        .set('Authorization', authToken)
        .expect(200);

      // Get paycheck
      const paycheckResponse = await request(app)
        .get('/api/paylinq/paychecks')
        .set('Authorization', authToken)
        .query({ payrollRunId: payrollRunId, employeeId: employeeId })
        .expect(200);

      const paycheck = paycheckResponse.body.paychecks[0];
      
      // Bi-weekly salary: $90,000 / 26 = $3,461.54
      expect(paycheck.gross_pay).toBeCloseTo(3461.54, 2);
      expect(paycheck.net_pay).toBeLessThan(paycheck.gross_pay);
    });

    test('Step 8: Change employment status to leave', async () => {
      const response = await request(app)
        .put(`/api/paylinq/employees/${employeeId}`)
        .set('Authorization', authToken)
        .send({
          employmentStatus: 'on_leave',
          leaveStartDate: '2024-06-01',
          leaveEndDate: '2024-08-01',
          leaveType: 'medical'
        })
        .expect(200);

      expect(response.body.employee.employment_status).toBe('on_leave');
    });

    test('Step 9: Return from leave', async () => {
      const response = await request(app)
        .put(`/api/paylinq/employees/${employeeId}`)
        .set('Authorization', authToken)
        .send({
          employmentStatus: 'active',
          returnDate: '2024-08-01'
        })
        .expect(200);

      expect(response.body.employee.employment_status).toBe('active');
    });

    test('Step 10: Reclassify worker type', async () => {
      // Get current classification
      const classificationResponse = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/classification`)
        .set('Authorization', authToken)
        .expect(200);

      expect(classificationResponse.body.classification.worker_type.classification).toBe('w2');

      // Note: In practice, W-2 to 1099 reclassification is complex
      // This demonstrates the endpoint - actual conversion would require business logic
    });

    test('Step 11: Generate W-2 for tax year', async () => {
      const response = await request(app)
        .get(`/api/paylinq/reports/w2/${employeeId}`)
        .set('Authorization', authToken)
        .query({ year: 2024 })
        .expect(200);

      expect(response.body.w2.year).toBe(2024);
      expect(response.body.w2.employeeId).toBe(employeeId);
      expect(response.body.w2.box1_wages).toBeGreaterThan(0);
      expect(response.body.w2.box2_federal).toBeGreaterThan(0);
    });

    test('Step 12: Terminate employment', async () => {
      // Listen for termination event
      let terminationEvent = null;
      eventEmitter.on('employee.terminated', (data) => {
        terminationEvent = data;
      });

      const response = await request(app)
        .put(`/api/paylinq/employees/${employeeId}`)
        .set('Authorization', authToken)
        .send({
          employmentStatus: 'terminated',
          terminationDate: '2024-12-31',
          terminationReason: 'voluntary_resignation'
        })
        .expect(200);

      expect(response.body.employee.employment_status).toBe('terminated');
      expect(response.body.employee.termination_date).toBe('2024-12-31');

      // Verify event emitted
      expect(terminationEvent).toBeDefined();
      expect(terminationEvent.employeeId).toBe(employeeId);
    });

    test('Step 13: Process final paycheck', async () => {
      // Final paycheck should include accrued vacation, prorated amounts, etc.
      // This is simplified for testing
      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/paychecks`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.paychecks.length).toBeGreaterThan(0);
      
      // Verify YTD totals
      expect(response.body.ytdTotals.gross_pay).toBeGreaterThan(0);
      expect(response.body.ytdTotals.net_pay).toBeGreaterThan(0);
      expect(response.body.ytdTotals.taxes_withheld).toBeGreaterThan(0);
    });
  });

  describe('Validation and Business Rules', () => {
    test('should prevent terminating employee with future effective date beyond 30 days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 45);

      const response = await request(app)
        .put(`/api/paylinq/employees/${employeeId}`)
        .set('Authorization', authToken)
        .send({
          employmentStatus: 'terminated',
          terminationDate: futureDate.toISOString().split('T')[0]
        })
        .expect(400);

      expect(response.body.message).toContain('date');
    });

    test('should prevent deleting employee with payroll history', async () => {
      const response = await request(app)
        .delete(`/api/paylinq/employees/${employeeId}`)
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.message).toContain('payroll history');
    });

    test('should enforce 401k annual contribution limits', async () => {
      // Attempt to assign $30,000 annual 401k (exceeds $23,000 limit)
      const response = await request(app)
        .post(`/api/paylinq/employees/${employeeId}/deductions`)
        .set('Authorization', authToken)
        .send({
          deductionTypeId: 'retirement-401k',
          amount: 30000,
          frequency: 'annual',
          startDate: '2024-01-01'
        })
        .expect(400);

      expect(response.body.message).toContain('limit');
    });
  });
});
