/**
 * Performance and Edge Cases Integration Tests
 * 
 * Tests for high-volume scenarios, concurrent operations, and edge cases
 */

import request from 'supertest';
import pool from '../../../../src/config/database.js';
import app from '../../../../src/server.js';

describe('Performance and Edge Cases Integration', () => {
  let authToken;
  let organizationId;

  beforeAll(async () => {
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
      ['Performance Test Org', 'performance-test-org']
    );
    organizationId = orgResult.rows[0].id;

    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, organization_id, legacy_role) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['perf@test.com', 'dummy_hash_for_test', 'Perf Test User', organizationId, 'admin']
    );
    
    authToken = `Bearer test-token-${userResult.rows[0].id}`;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    await pool.end();
  });

  describe('Bulk Employee Processing', () => {
    test('should handle bulk employee creation (100 employees)', async () => {
      const startTime = Date.now();
      const employees = [];

      // Create 100 employees
      for (let i = 0; i < 100; i++) {
        const response = await request(app)
          .post('/api/paylinq/employees')
          .set('Authorization', authToken)
          .send({
            firstName: `Employee${i}`,
            lastName: `Test`,
            email: `emp${i}@perftest.com`,
            workerType: 'w2',
            hireDate: '2024-01-01'
          })
          .expect(201);

        employees.push(response.body.employee);
      }

      const duration = Date.now() - startTime;
      
      expect(employees.length).toBe(100);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(`Bulk employee creation: ${duration}ms for 100 employees (${duration/100}ms avg)`);
    }, 60000); // 60 second timeout

    test('should efficiently paginate large employee lists', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/paylinq/employees')
        .set('Authorization', authToken)
        .query({ page: 1, pageSize: 50 })
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.employees.length).toBe(50);
      expect(duration).toBeLessThan(2000); // Should be fast with pagination

      console.log(`Paginated query: ${duration}ms for 50 employees`);
    });
  });

  describe('Large Payroll Run Processing', () => {
    let employeeIds = [];

    beforeAll(async () => {
      // Create 50 test employees with compensation
      for (let i = 0; i < 50; i++) {
        const empResponse = await request(app)
          .post('/api/paylinq/employees')
          .set('Authorization', authToken)
          .send({
            firstName: `PayrollEmp${i}`,
            lastName: 'Test',
            email: `payemp${i}@perftest.com`,
            workerType: 'w2',
            hireDate: '2024-01-01'
          })
          .expect(201);

        const employeeId = empResponse.body.employee.id;
        employeeIds.push(employeeId);

        // Setup compensation
        await request(app)
          .post(`/api/paylinq/employees/${employeeId}/compensation`)
          .set('Authorization', authToken)
          .send({
            payType: 'hourly',
            payRate: 25.00,
            payPeriod: 'bi_weekly',
            effectiveDate: '2024-01-01'
          })
          .expect(201);
      }
    }, 120000); // 2 minute timeout

    test('should calculate large payroll run efficiently', async () => {
      // Create timesheets for all employees
      for (const employeeId of employeeIds) {
        const tsResponse = await request(app)
          .post('/api/paylinq/timesheets')
          .set('Authorization', authToken)
          .send({
            employeeId: employeeId,
            periodStart: '2024-01-01',
            periodEnd: '2024-01-14',
            regularHours: 80,
            overtimeHours: 5
          })
          .expect(201);

        await request(app)
          .post(`/api/paylinq/timesheets/${tsResponse.body.timesheet.id}/approve`)
          .set('Authorization', authToken)
          .expect(200);
      }

      // Create payroll run
      const runResponse = await request(app)
        .post('/api/paylinq/payroll-runs')
        .set('Authorization', authToken)
        .send({
          periodStart: '2024-01-01',
          periodEnd: '2024-01-14',
          paymentDate: '2024-01-19'
        })
        .expect(201);

      const payrollRunId = runResponse.body.payrollRun.id;

      // Calculate payroll and measure time
      const startTime = Date.now();

      const calcResponse = await request(app)
        .post(`/api/paylinq/payroll-runs/${payrollRunId}/calculate`)
        .set('Authorization', authToken)
        .expect(200);

      const duration = Date.now() - startTime;

      expect(calcResponse.body.payrollRun.status).toBe('calculated');
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`Payroll calculation: ${duration}ms for 50 employees (${duration/50}ms avg)`);

      // Verify all paychecks created
      const paycheckResponse = await request(app)
        .get('/api/paylinq/paychecks')
        .set('Authorization', authToken)
        .query({ payrollRunId: payrollRunId })
        .expect(200);

      expect(paycheckResponse.body.paychecks.length).toBe(50);
    }, 120000);
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent employee updates', async () => {
      // Create test employee
      const empResponse = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', authToken)
        .send({
          firstName: 'Concurrent',
          lastName: 'Test',
          email: 'concurrent@test.com',
          workerType: 'w2',
          hireDate: '2024-01-01'
        })
        .expect(201);

      const employeeId = empResponse.body.employee.id;

      // Simulate concurrent updates
      const updates = [];
      for (let i = 0; i < 10; i++) {
        updates.push(
          request(app)
            .put(`/api/paylinq/employees/${employeeId}`)
            .set('Authorization', authToken)
            .send({ phone: `555-010${i}` })
        );
      }

      const results = await Promise.all(updates);

      // All should succeed or handle optimistic locking
      results.forEach(result => {
        expect([200, 409]).toContain(result.status);
      });
    });

    test('should handle concurrent payroll calculations', async () => {
      // Create multiple payroll runs
      const runs = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/paylinq/payroll-runs')
          .set('Authorization', authToken)
          .send({
            periodStart: `2024-0${i+1}-01`,
            periodEnd: `2024-0${i+1}-14`,
            paymentDate: `2024-0${i+1}-19`
          })
          .expect(201);

        runs.push(response.body.payrollRun.id);
      }

      // Try to calculate all concurrently
      const calculations = runs.map(runId =>
        request(app)
          .post(`/api/paylinq/payroll-runs/${runId}/calculate`)
          .set('Authorization', authToken)
      );

      const results = await Promise.all(calculations);

      // Should handle concurrency gracefully
      results.forEach(result => {
        expect([200, 400, 409]).toContain(result.status);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero-hour timesheets', async () => {
      const empResponse = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', authToken)
        .send({
          firstName: 'ZeroHours',
          lastName: 'Test',
          email: 'zerohours@test.com',
          workerType: 'w2',
          hireDate: '2024-01-01'
        })
        .expect(201);

      const employeeId = empResponse.body.employee.id;

      const response = await request(app)
        .post('/api/paylinq/timesheets')
        .set('Authorization', authToken)
        .send({
          employeeId: employeeId,
          periodStart: '2024-01-01',
          periodEnd: '2024-01-14',
          regularHours: 0,
          overtimeHours: 0
        })
        .expect(201);

      expect(response.body.timesheet.regular_hours).toBe(0);
    });

    test('should handle very high overtime hours', async () => {
      const empResponse = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', authToken)
        .send({
          firstName: 'HighOT',
          lastName: 'Test',
          email: 'highot@test.com',
          workerType: 'w2',
          hireDate: '2024-01-01'
        })
        .expect(201);

      const employeeId = empResponse.body.employee.id;

      // 40 regular + 40 OT = 80 hours (extreme but valid)
      const response = await request(app)
        .post('/api/paylinq/timesheets')
        .set('Authorization', authToken)
        .send({
          employeeId: employeeId,
          periodStart: '2024-01-01',
          periodEnd: '2024-01-14',
          regularHours: 40,
          overtimeHours: 40
        })
        .expect(201);

      expect(response.body.timesheet.overtime_hours).toBe(40);
    });

    test('should handle very small paycheck amounts (penny payroll)', async () => {
      const empResponse = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', authToken)
        .send({
          firstName: 'Penny',
          lastName: 'Test',
          email: 'penny@test.com',
          workerType: 'w2',
          hireDate: '2024-01-01'
        })
        .expect(201);

      const employeeId = empResponse.body.employee.id;

      await request(app)
        .post(`/api/paylinq/employees/${employeeId}/compensation`)
        .set('Authorization', authToken)
        .send({
          payType: 'hourly',
          payRate: 0.01, // 1 cent per hour
          payPeriod: 'bi_weekly',
          effectiveDate: '2024-01-01'
        })
        .expect(201);

      const tsResponse = await request(app)
        .post('/api/paylinq/timesheets')
        .set('Authorization', authToken)
        .send({
          employeeId: employeeId,
          periodStart: '2024-01-01',
          periodEnd: '2024-01-14',
          regularHours: 1
        })
        .expect(201);

      await request(app)
        .post(`/api/paylinq/timesheets/${tsResponse.body.timesheet.id}/approve`)
        .set('Authorization', authToken)
        .expect(200);

      // Should handle penny amounts without rounding errors
    });

    test('should handle very large salary amounts', async () => {
      const empResponse = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', authToken)
        .send({
          firstName: 'Executive',
          lastName: 'Test',
          email: 'exec@test.com',
          workerType: 'w2',
          hireDate: '2024-01-01'
        })
        .expect(201);

      const employeeId = empResponse.body.employee.id;

      const response = await request(app)
        .post(`/api/paylinq/employees/${employeeId}/compensation`)
        .set('Authorization', authToken)
        .send({
          payType: 'salary',
          payRate: 5000000, // $5M annual
          payPeriod: 'bi_weekly',
          effectiveDate: '2024-01-01'
        })
        .expect(201);

      expect(response.body.compensation.pay_rate).toBe(5000000);
    });

    test('should handle leap year pay periods', async () => {
      const response = await request(app)
        .post('/api/paylinq/payroll-runs')
        .set('Authorization', authToken)
        .send({
          periodStart: '2024-02-26', // Leap year
          periodEnd: '2024-02-29',
          paymentDate: '2024-03-05'
        })
        .expect(201);

      expect(response.body.payrollRun.period_end).toBe('2024-02-29');
    });

    test('should handle decimal hour precision', async () => {
      const empResponse = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', authToken)
        .send({
          firstName: 'Decimal',
          lastName: 'Test',
          email: 'decimal@test.com',
          workerType: 'w2',
          hireDate: '2024-01-01'
        })
        .expect(201);

      const employeeId = empResponse.body.employee.id;

      // 7.5 hour day
      const response = await request(app)
        .post('/api/paylinq/timesheets')
        .set('Authorization', authToken)
        .send({
          employeeId: employeeId,
          periodStart: '2024-01-01',
          periodEnd: '2024-01-14',
          regularHours: 37.5, // 5 days * 7.5 hours
          overtimeHours: 2.5
        })
        .expect(201);

      expect(response.body.timesheet.regular_hours).toBe(37.5);
      expect(response.body.timesheet.overtime_hours).toBe(2.5);
    });

    test('should handle payroll runs spanning year boundary', async () => {
      const response = await request(app)
        .post('/api/paylinq/payroll-runs')
        .set('Authorization', authToken)
        .send({
          periodStart: '2024-12-23',
          periodEnd: '2025-01-05', // Crosses year
          paymentDate: '2025-01-10'
        })
        .expect(201);

      expect(response.body.payrollRun.period_start).toBe('2024-12-23');
      expect(response.body.payrollRun.period_end).toBe('2025-01-05');
    });
  });

  describe('Data Integrity', () => {
    test('should maintain referential integrity on cascade deletes', async () => {
      // Create employee with full setup
      const empResponse = await request(app)
        .post('/api/paylinq/employees')
        .set('Authorization', authToken)
        .send({
          firstName: 'Integrity',
          lastName: 'Test',
          email: 'integrity@test.com',
          workerType: 'w2',
          hireDate: '2024-01-01'
        })
        .expect(201);

      const employeeId = empResponse.body.employee.id;

      // Add compensation
      await request(app)
        .post(`/api/paylinq/employees/${employeeId}/compensation`)
        .set('Authorization', authToken)
        .send({
          payType: 'salary',
          payRate: 75000,
          payPeriod: 'bi_weekly',
          effectiveDate: '2024-01-01'
        })
        .expect(201);

      // Should not be able to delete employee with compensation history
      const deleteResponse = await request(app)
        .delete(`/api/paylinq/employees/${employeeId}`)
        .set('Authorization', authToken)
        .expect(400);

      expect(deleteResponse.body.message).toContain('history');
    });

    test('should prevent orphaned records', async () => {
      // Attempt to create timesheet for non-existent employee
      const response = await request(app)
        .post('/api/paylinq/timesheets')
        .set('Authorization', authToken)
        .send({
          employeeId: 'non-existent-id',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-14',
          regularHours: 40
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    test('should rollback failed payroll calculations', async () => {
      // Create payroll run with invalid data
      const runResponse = await request(app)
        .post('/api/paylinq/payroll-runs')
        .set('Authorization', authToken)
        .send({
          periodStart: '2024-05-01',
          periodEnd: '2024-05-14',
          paymentDate: '2024-05-19'
        })
        .expect(201);

      const payrollRunId = runResponse.body.payrollRun.id;

      // Try to calculate without timesheets (should fail)
      const calcResponse = await request(app)
        .post(`/api/paylinq/payroll-runs/${payrollRunId}/calculate`)
        .set('Authorization', authToken)
        .expect(400);

      // Verify payroll run still in draft state
      const checkResponse = await request(app)
        .get(`/api/paylinq/payroll-runs/${payrollRunId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(checkResponse.body.payrollRun.status).toBe('draft');
    });
  });
});
