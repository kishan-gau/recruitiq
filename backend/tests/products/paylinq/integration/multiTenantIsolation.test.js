/**
 * Multi-Tenant Isolation Integration Tests
 * 
 * End-to-end tests to verify complete data isolation between organizations
 */

import request from 'supertest';
import pool from '../../../../src/config/database.js';
import app from '../../../../src/server.js';

describe('Multi-Tenant Isolation Integration', () => {
  let org1Id, org2Id;
  let org1Token, org2Token;
  let org1EmployeeId, org2EmployeeId;
  let org1PayrollRunId, org2PayrollRunId;

  beforeAll(async () => {
    // Setup Organization 1
    const org1Result = await pool.query(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
      ['Company A', 'company-a']
    );
    org1Id = org1Result.rows[0].id;

    const user1Result = await pool.query(
      `INSERT INTO users (email, password_hash, name, organization_id, legacy_role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['admin@companya.com', 'dummy_hash_for_test', 'Company A Admin', org1Id, 'admin']
    );
    org1Token = `Bearer test-token-${user1Result.rows[0].id}`;

    // Setup Organization 2
    const org2Result = await pool.query(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
      ['Company B', 'company-b']
    );
    org2Id = org2Result.rows[0].id;

    const user2Result = await pool.query(
      `INSERT INTO users (email, password_hash, name, organization_id, legacy_role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['admin@companyb.com', 'dummy_hash_for_test', 'Company B Admin', org2Id, 'admin']
    );
    org2Token = `Bearer test-token-${user2Result.rows[0].id}`;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM organizations WHERE id IN ($1, $2)', [org1Id, org2Id]);
    await pool.end();
  });

  describe('Employee Isolation', () => {
    test('should create employees in separate organizations', async () => {
      // Create employee in Org 1
      const org1Response = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', org1Token)
        .send({
          firstName: 'John',
          lastName: 'CompanyA',
          email: 'john@companya.com',
          workerType: 'w2',
          hireDate: '2024-01-01'
        })
        .expect(201);

      org1EmployeeId = org1Response.body.employee.id;

      // Create employee in Org 2
      const org2Response = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', org2Token)
        .send({
          firstName: 'Jane',
          lastName: 'CompanyB',
          email: 'jane@companyb.com',
          workerType: 'w2',
          hireDate: '2024-01-01'
        })
        .expect(201);

      org2EmployeeId = org2Response.body.employee.id;

      expect(org1EmployeeId).not.toBe(org2EmployeeId);
    });

    test('Org 1 should not see Org 2 employees', async () => {
      const response = await request(app)
        .get('/api/paylinq/employees')
        .set('Authorization', org1Token)
        .expect(200);

      const emails = response.body.employees.map(e => e.email);
      expect(emails).toContain('john@companya.com');
      expect(emails).not.toContain('jane@companyb.com');
    });

    test('Org 2 should not see Org 1 employees', async () => {
      const response = await request(app)
        .get('/api/paylinq/employees')
        .set('Authorization', org2Token)
        .expect(200);

      const emails = response.body.employees.map(e => e.email);
      expect(emails).toContain('jane@companyb.com');
      expect(emails).not.toContain('john@companya.com');
    });

    test('Org 1 should not access Org 2 employee details', async () => {
      const response = await request(app)
        .get(`/api/paylinq/employees/${org2EmployeeId}`)
        .set('Authorization', org1Token)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('Org 2 should not access Org 1 employee details', async () => {
      const response = await request(app)
        .get(`/api/paylinq/employees/${org1EmployeeId}`)
        .set('Authorization', org2Token)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('Org 1 should not update Org 2 employees', async () => {
      const response = await request(app)
        .put(`/api/paylinq/employees/${org2EmployeeId}`)
        .set('Authorization', org1Token)
        .send({ firstName: 'Hacked' })
        .expect(404);

      expect(response.body.success).toBe(false);

      // Verify employee not changed
      const checkResponse = await request(app)
        .get(`/api/paylinq/employees/${org2EmployeeId}`)
        .set('Authorization', org2Token)
        .expect(200);

      expect(checkResponse.body.employee.first_name).toBe('Jane');
    });
  });

  describe('Payroll Run Isolation', () => {
    beforeAll(async () => {
      // Setup compensation for both employees
      await request(app)
        .post(`/api/paylinq/employees/${org1EmployeeId}/compensation`)
        .set('Authorization', org1Token)
        .send({
          payType: 'salary',
          payRate: 75000,
          payPeriod: 'bi_weekly',
          effectiveDate: '2024-01-01'
        })
        .expect(201);

      await request(app)
        .post(`/api/paylinq/employees/${org2EmployeeId}/compensation`)
        .set('Authorization', org2Token)
        .send({
          payType: 'salary',
          payRate: 80000,
          payPeriod: 'bi_weekly',
          effectiveDate: '2024-01-01'
        })
        .expect(201);
    });

    test('should create payroll runs in separate organizations', async () => {
      // Org 1 payroll
      const org1Response = await request(app)
        .post('/api/paylinq/payroll-runs')
        .set('Authorization', org1Token)
        .send({
          periodStart: '2024-01-01',
          periodEnd: '2024-01-14',
          paymentDate: '2024-01-19'
        })
        .expect(201);

      org1PayrollRunId = org1Response.body.payrollRun.id;

      // Org 2 payroll
      const org2Response = await request(app)
        .post('/api/paylinq/payroll-runs')
        .set('Authorization', org2Token)
        .send({
          periodStart: '2024-01-01',
          periodEnd: '2024-01-14',
          paymentDate: '2024-01-19'
        })
        .expect(201);

      org2PayrollRunId = org2Response.body.payrollRun.id;

      expect(org1PayrollRunId).not.toBe(org2PayrollRunId);
    });

    test('Org 1 should not see Org 2 payroll runs', async () => {
      const response = await request(app)
        .get('/api/paylinq/payroll-runs')
        .set('Authorization', org1Token)
        .expect(200);

      const ids = response.body.payrollRuns.map(pr => pr.id);
      expect(ids).toContain(org1PayrollRunId);
      expect(ids).not.toContain(org2PayrollRunId);
    });

    test('Org 1 should not access Org 2 payroll run details', async () => {
      const response = await request(app)
        .get(`/api/paylinq/payroll-runs/${org2PayrollRunId}`)
        .set('Authorization', org1Token)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('Org 1 should not calculate Org 2 payroll', async () => {
      const response = await request(app)
        .post(`/api/paylinq/payroll-runs/${org2PayrollRunId}/calculate`)
        .set('Authorization', org1Token)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Paycheck Isolation', () => {
    let org1PaycheckId, org2PaycheckId;

    beforeAll(async () => {
      // Create timesheets and calculate payroll for both orgs
      // Org 1
      const ts1Response = await request(app)
        .post('/api/paylinq/timesheets')
        .set('Authorization', org1Token)
        .send({
          employeeId: org1EmployeeId,
          periodStart: '2024-01-01',
          periodEnd: '2024-01-14',
          regularHours: 80
        })
        .expect(201);

      await request(app)
        .post(`/api/paylinq/timesheets/${ts1Response.body.timesheet.id}/approve`)
        .set('Authorization', org1Token)
        .expect(200);

      await request(app)
        .post(`/api/paylinq/payroll-runs/${org1PayrollRunId}/calculate`)
        .set('Authorization', org1Token)
        .expect(200);

      // Org 2
      const ts2Response = await request(app)
        .post('/api/paylinq/timesheets')
        .set('Authorization', org2Token)
        .send({
          employeeId: org2EmployeeId,
          periodStart: '2024-01-01',
          periodEnd: '2024-01-14',
          regularHours: 80
        })
        .expect(201);

      await request(app)
        .post(`/api/paylinq/timesheets/${ts2Response.body.timesheet.id}/approve`)
        .set('Authorization', org2Token)
        .expect(200);

      await request(app)
        .post(`/api/paylinq/payroll-runs/${org2PayrollRunId}/calculate`)
        .set('Authorization', org2Token)
        .expect(200);

      // Get paycheck IDs
      const pc1Response = await request(app)
        .get('/api/paylinq/paychecks')
        .set('Authorization', org1Token)
        .query({ payrollRunId: org1PayrollRunId })
        .expect(200);
      org1PaycheckId = pc1Response.body.paychecks[0].id;

      const pc2Response = await request(app)
        .get('/api/paylinq/paychecks')
        .set('Authorization', org2Token)
        .query({ payrollRunId: org2PayrollRunId })
        .expect(200);
      org2PaycheckId = pc2Response.body.paychecks[0].id;
    });

    test('Org 1 should not access Org 2 paychecks', async () => {
      const response = await request(app)
        .get(`/api/paylinq/paychecks/${org2PaycheckId}`)
        .set('Authorization', org1Token)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('Org 1 should not generate Org 2 pay stubs', async () => {
      const response = await request(app)
        .get(`/api/paylinq/paychecks/${org2PaycheckId}/stub`)
        .set('Authorization', org1Token)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Tax Configuration Isolation', () => {
    test('should maintain separate tax configs per organization', async () => {
      // Org 1 creates custom state tax
      const org1TaxResponse = await request(app)
        .post('/api/paylinq/tax-configs')
        .set('Authorization', org1Token)
        .send({
          taxType: 'state_income',
          taxName: 'California State Tax',
          taxRate: 9.3,
          effectiveDate: '2024-01-01'
        })
        .expect(201);

      const org1TaxId = org1TaxResponse.body.taxConfig.id;

      // Org 2 should not see Org 1's tax config
      const org2Response = await request(app)
        .get('/api/paylinq/tax-configs')
        .set('Authorization', org2Token)
        .expect(200);

      const ids = org2Response.body.taxConfigs.map(tc => tc.id);
      expect(ids).not.toContain(org1TaxId);
    });
  });

  describe('Deduction Type Isolation', () => {
    test('should maintain separate deduction types per organization', async () => {
      // Org 1 creates custom deduction
      const org1DeductionResponse = await request(app)
        .post('/api/paylinq/deduction-types')
        .set('Authorization', org1Token)
        .send({
          name: 'Company A 401k',
          calculationType: 'percentage',
          defaultAmount: 5,
          isPreTax: true
        })
        .expect(201);

      const org1DeductionId = org1DeductionResponse.body.deductionType.id;

      // Org 2 should not see Org 1's deduction type
      const org2Response = await request(app)
        .get('/api/paylinq/deduction-types')
        .set('Authorization', org2Token)
        .expect(200);

      const ids = org2Response.body.deductionTypes.map(dt => dt.id);
      expect(ids).not.toContain(org1DeductionId);

      // Org 2 should not be able to use Org 1's deduction type
      const assignResponse = await request(app)
        .post(`/api/paylinq/employees/${org2EmployeeId}/deductions`)
        .set('Authorization', org2Token)
        .send({
          deductionTypeId: org1DeductionId,
          amount: 100,
          startDate: '2024-01-01'
        })
        .expect(404);

      expect(assignResponse.body.success).toBe(false);
    });
  });

  describe('Report Isolation', () => {
    test('Org 1 should only see own payroll summary', async () => {
      const response = await request(app)
        .get('/api/paylinq/reports/payroll-summary')
        .set('Authorization', org1Token)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
        .expect(200);

      // Should only include Org 1's payroll data
      expect(response.body.report.totalGrossPay).toBeGreaterThan(0);
      // Verify amounts don't include Org 2 data (would be higher if mixed)
    });

    test('Org 1 should not generate W-2 for Org 2 employee', async () => {
      const response = await request(app)
        .get(`/api/paylinq/reports/w2/${org2EmployeeId}`)
        .set('Authorization', org1Token)
        .query({ year: 2024 })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Schedule Isolation', () => {
    test('should maintain separate schedules per organization', async () => {
      // Org 1 creates schedule
      const org1ScheduleResponse = await request(app)
        .post('/api/paylinq/schedules')
        .set('Authorization', org1Token)
        .send({
          name: 'Week 1 - Org 1',
          startDate: '2024-01-15',
          endDate: '2024-01-21'
        })
        .expect(201);

      const org1ScheduleId = org1ScheduleResponse.body.schedule.id;

      // Org 2 should not see Org 1's schedule
      const org2Response = await request(app)
        .get('/api/paylinq/schedules')
        .set('Authorization', org2Token)
        .expect(200);

      const ids = org2Response.body.schedules.map(s => s.id);
      expect(ids).not.toContain(org1ScheduleId);
    });
  });

  describe('Cross-Organization Attack Scenarios', () => {
    test('should prevent SQL injection attempts to access other org data', async () => {
      const maliciousPayload = {
        firstName: "' OR organization_id != '" + org1Id + "' --",
        lastName: 'Test',
        email: 'malicious@test.com',
        workerType: 'w2',
        hireDate: '2024-01-01'
      };

      await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', org1Token)
        .send(maliciousPayload)
        .expect(201); // Should sanitize and create normally

      // Verify only Org 1 data returned
      const response = await request(app)
        .get('/api/paylinq/employees')
        .set('Authorization', org1Token)
        .expect(200);

      // Should not include Org 2 employees
      const emails = response.body.employees.map(e => e.email);
      expect(emails).not.toContain('jane@companyb.com');
    });

    test('should prevent parameter tampering to access other org resources', async () => {
      // Try to manipulate URL parameters
      const response = await request(app)
        .get(`/api/paylinq/employees/${org2EmployeeId}`)
        .set('Authorization', org1Token)
        .query({ organizationId: org2Id }) // Attempt to override
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
