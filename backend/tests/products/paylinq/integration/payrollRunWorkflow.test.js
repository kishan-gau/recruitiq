/**
 * Payroll Run Workflow Integration Tests
 * 
 * End-to-end tests for complete payroll run workflow:
 * Create draft → Add employees → Calculate → Approve → Process → Generate payments
 */

import request from 'supertest';
import pool from '../../../../src/config/database.js';
import app from '../../../../src/server.js';
import { eventEmitter  } from '../../../../src/products/paylinq/events/eventEmitter.js';

describe('Payroll Run Workflow Integration', () => {
  let authToken;
  let organizationId;
  let employeeId;
  let payrollRunId;

  beforeAll(async () => {
    // Setup test organization and authentication
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
      ['Test Payroll Org', 'test-payroll-org']
    );
    organizationId = orgResult.rows[0].id;

    // Create test user with admin role
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, organization_id, legacy_role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['payroll@test.com', 'dummy_hash_for_test', 'Payroll Test User', organizationId, 'admin']
    );
    
    // Generate auth token (mock authentication)
    authToken = `Bearer test-token-${userResult.rows[0].id}`;
  });

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  describe('Complete Payroll Run Workflow', () => {
    test('Step 1: Create employee with compensation', async () => {
      const employeeResponse = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', authToken)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@test.com',
          workerType: 'w2',
          employmentStatus: 'active',
          hireDate: '2024-01-01'
        })
        .expect(201);

      employeeId = employeeResponse.body.employee.id;
      expect(employeeId).toBeDefined();

      // Setup compensation
      const compensationResponse = await request(app)
        .post(`/api/paylinq/employees/${employeeId}/compensation`)
        .set('Authorization', authToken)
        .send({
          payType: 'hourly',
          payRate: 25.00,
          payPeriod: 'bi_weekly',
          effectiveDate: '2024-01-01'
        })
        .expect(201);

      expect(compensationResponse.body.compensation.pay_rate).toBe(25.00);
    });

    test('Step 2: Submit and approve timesheet', async () => {
      // Create timesheet
      const timesheetResponse = await request(app)
        .post('/api/paylinq/timesheets')
        .set('Authorization', authToken)
        .send({
          employeeId: employeeId,
          periodStart: '2024-01-15',
          periodEnd: '2024-01-21',
          regularHours: 40,
          overtimeHours: 5
        })
        .expect(201);

      const timesheetId = timesheetResponse.body.timesheet.id;

      // Approve timesheet
      const approvalResponse = await request(app)
        .post(`/api/paylinq/timesheets/${timesheetId}/approve`)
        .set('Authorization', authToken)
        .expect(200);

      expect(approvalResponse.body.timesheet.status).toBe('approved');
      expect(approvalResponse.body.timesheet.regular_hours).toBe(40);
      expect(approvalResponse.body.timesheet.overtime_hours).toBe(5);
    });

    test('Step 3: Create payroll run draft', async () => {
      const response = await request(app)
        .post('/api/paylinq/payroll-runs')
        .set('Authorization', authToken)
        .send({
          periodStart: '2024-01-15',
          periodEnd: '2024-01-21',
          paymentDate: '2024-01-26',
          payPeriodType: 'bi_weekly'
        })
        .expect(201);

      payrollRunId = response.body.payrollRun.id;
      expect(response.body.payrollRun.status).toBe('draft');
    });

    test('Step 4: Calculate payroll', async () => {
      // Listen for calculation events
      let calculationCompleteEvent = null;
      eventEmitter.on('payroll.calculated', (data) => {
        calculationCompleteEvent = data;
      });

      const response = await request(app)
        .post(`/api/paylinq/payroll-runs/${payrollRunId}/calculate`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.payrollRun.status).toBe('calculated');
      expect(response.body.payrollRun.total_gross_pay).toBeGreaterThan(0);
      expect(response.body.payrollRun.total_net_pay).toBeGreaterThan(0);

      // Verify calculations
      // Regular pay: 40 hours * $25 = $1,000
      // OT pay: 5 hours * $25 * 1.5 = $187.50
      // Total gross: $1,187.50
      expect(response.body.payrollRun.total_gross_pay).toBeCloseTo(1187.50, 2);

      // Verify event emitted
      expect(calculationCompleteEvent).toBeDefined();
      expect(calculationCompleteEvent.payrollRunId).toBe(payrollRunId);
    });

    test('Step 5: Retrieve calculated paychecks', async () => {
      const response = await request(app)
        .get('/api/paylinq/paychecks')
        .set('Authorization', authToken)
        .query({ payrollRunId: payrollRunId })
        .expect(200);

      expect(response.body.paychecks.length).toBeGreaterThan(0);
      
      const paycheck = response.body.paychecks[0];
      expect(paycheck.employee_id).toBe(employeeId);
      expect(paycheck.gross_pay).toBeCloseTo(1187.50, 2);
      expect(paycheck.net_pay).toBeLessThan(paycheck.gross_pay); // After taxes
    });

    test('Step 6: Approve payroll run', async () => {
      const response = await request(app)
        .post(`/api/paylinq/payroll-runs/${payrollRunId}/approve`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.payrollRun.status).toBe('approved');
      expect(response.body.payrollRun.approved_by).toBeDefined();
      expect(response.body.payrollRun.approved_date).toBeDefined();
    });

    test('Step 7: Process payroll run and initiate payments', async () => {
      // Listen for processing events
      let processingEvents = [];
      eventEmitter.on('payroll.processed', (data) => {
        processingEvents.push({ type: 'processed', data });
      });
      eventEmitter.on('payment.initiated', (data) => {
        processingEvents.push({ type: 'payment', data });
      });

      const response = await request(app)
        .post(`/api/paylinq/payroll-runs/${payrollRunId}/process`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.payrollRun.status).toBe('processed');
      expect(response.body.payrollRun.processed_date).toBeDefined();

      // Verify payments initiated
      expect(processingEvents.some(e => e.type === 'payment')).toBe(true);
    });

    test('Step 8: Verify payment details', async () => {
      const response = await request(app)
        .get('/api/paylinq/payments')
        .set('Authorization', authToken)
        .query({ payrollRunId: payrollRunId })
        .expect(200);

      expect(response.body.payments.length).toBeGreaterThan(0);
      
      const payment = response.body.payments[0];
      expect(payment.status).toBe('pending');
      expect(payment.payment_method).toBeDefined();
      expect(payment.amount).toBeGreaterThan(0);
    });

    test('Step 9: Generate pay stub', async () => {
      // Get paycheck ID
      const paychecksResponse = await request(app)
        .get('/api/paylinq/paychecks')
        .set('Authorization', authToken)
        .query({ payrollRunId: payrollRunId })
        .expect(200);

      const paycheckId = paychecksResponse.body.paychecks[0].id;

      // Generate pay stub
      const stubResponse = await request(app)
        .get(`/api/paylinq/paychecks/${paycheckId}/stub`)
        .set('Authorization', authToken)
        .expect(200);

      expect(stubResponse.body.payStub.employee_info).toBeDefined();
      expect(stubResponse.body.payStub.earnings.regular_hours).toBe(40);
      expect(stubResponse.body.payStub.earnings.overtime_hours).toBe(5);
      expect(stubResponse.body.payStub.gross_pay).toBeCloseTo(1187.50, 2);
      expect(stubResponse.body.payStub.deductions).toBeDefined();
      expect(stubResponse.body.payStub.taxes).toBeDefined();
      expect(stubResponse.body.payStub.net_pay).toBeGreaterThan(0);
    });

    test('Step 10: Generate payroll summary report', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/payroll-summary')
        .set('Authorization', authToken)
        .query({
          startDate: '2024-01-15',
          endDate: '2024-01-21'
        })
        .expect(200);

      expect(response.body.report.totalGrossPay).toBeCloseTo(1187.50, 2);
      expect(response.body.report.payrollRuns).toBe(1);
      expect(response.body.report.employeeCount).toBeGreaterThan(0);
    });
  });

  describe('Error Scenarios and Validations', () => {
    test('should prevent calculating payroll without approved timesheets', async () => {
      // Create payroll run without timesheets
      const runResponse = await request(app)
        .post('/api/paylinq/payroll-runs')
        .set('Authorization', authToken)
        .send({
          periodStart: '2024-02-01',
          periodEnd: '2024-02-07',
          paymentDate: '2024-02-12'
        })
        .expect(201);

      // Try to calculate
      const calcResponse = await request(app)
        .post(`/api/paylinq/payroll-runs/${runResponse.body.payrollRun.id}/calculate`)
        .set('Authorization', authToken)
        .expect(400);

      expect(calcResponse.body.message).toContain('timesheet');
    });

    test('should prevent processing unapproved payroll', async () => {
      const runResponse = await request(app)
        .post('/api/paylinq/payroll-runs')
        .set('Authorization', authToken)
        .send({
          periodStart: '2024-02-08',
          periodEnd: '2024-02-14',
          paymentDate: '2024-02-19'
        })
        .expect(201);

      const processResponse = await request(app)
        .post(`/api/paylinq/payroll-runs/${runResponse.body.payrollRun.id}/process`)
        .set('Authorization', authToken)
        .expect(400);

      expect(processResponse.body.message).toContain('approved');
    });

    test('should prevent deleting processed payroll', async () => {
      const deleteResponse = await request(app)
        .delete(`/api/paylinq/payroll-runs/${payrollRunId}`)
        .set('Authorization', authToken)
        .expect(400);

      expect(deleteResponse.body.message).toContain('processed');
    });
  });
});
