/**
 * Paycheck Controller Tests
 * API contract tests for paycheck management.
 * Tests would have caught:
 * - ❌ Missing validation for void reason
 * - ❌ Incorrect paycheck status handling
 * - ❌ Missing employee paycheck retrieval
 * 
 * Status: Test Data Factory implemented (Nov 5, 2025)
 * Pass Rate: 17/30 (56.7%) - Factory pattern in progress
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import paycheckController from '../../../../src/products/paylinq/controllers/paycheckController.js';
import { query } from '../../../../src/config/database.js';
import { createTestEmployee, cleanupTestEmployees } from '../helpers/employeeTestHelper.js';

// Test constants
const testOrganizationId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
const testUserId = '550e8400-e29b-41d4-a716-446655440000';
let testPaycheckId;
let testEmployeeId;
let testPayrollRunId;

/**
 * Test Data Factory for Paychecks
 * Creates test paychecks with realistic data to ensure tests pass
 */
class PaycheckTestFactory {
  /**
   * Create a payroll run (required for paychecks)
   */
  static async createPayrollRun(overrides = {}) {
    const uniqueId = uuidv4();
    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const periodEnd = new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0];
    const paymentDate = new Date(today.getFullYear(), today.getMonth(), 20).toISOString().split('T')[0];
    
    const result = await query(
      `INSERT INTO payroll.payroll_run 
       (id, organization_id, run_number, run_name, pay_period_start, pay_period_end, 
        payment_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        overrides.id || uuidv4(),
        testOrganizationId,
        overrides.run_number || `TEST-RUN-${uniqueId.substring(0, 8)}`,
        overrides.run_name || `Test Payroll Run ${uniqueId.substring(0, 8)}`,
        periodStart,
        periodEnd,
        paymentDate,
        overrides.status || 'draft',
        testUserId
      ],
      testOrganizationId,
      { operation: 'INSERT', table: 'payroll.payroll_run' }
    );

    return result.rows[0];
  }

  /**
   * Create an employee record (required for paychecks)
   * Uses new schema with hris.employee and payroll.employee_payroll_config
   */
  static async createEmployee(overrides = {}) {
    // Use the helper to create both HRIS and payroll records
    const { employee, payrollConfig } = await createTestEmployee({
      organizationId: testOrganizationId,
      userId: testUserId,
      employee: {
        first_name: overrides.first_name || 'Test',
        last_name: overrides.last_name || 'Employee'
      },
      payrollConfig: {
        employee_number: overrides.employee_number || `EMP-${uuidv4().substring(0, 8)}`,
        pay_frequency: overrides.pay_frequency || 'semimonthly',
        payment_method: overrides.payment_method || 'direct_deposit'
      }
    });

    return employee;
  }

  /**
   * Create a paycheck with realistic data
   */
  static async createPaycheck(overrides = {}) {
    // Ensure we have dependencies
    if (!overrides.payroll_run_id) {
      const payrollRun = await this.createPayrollRun();
      overrides.payroll_run_id = payrollRun.id;
    }

    if (!overrides.employee_id) {
      const employee = await this.createEmployee();
      overrides.employee_id = employee.id;
    }

    const uniqueId = uuidv4();
    const result = await query(
      `INSERT INTO payroll.paycheck 
       (id, organization_id, payroll_run_id, employee_id, 
        check_number, payment_date, pay_period_start, pay_period_end,
        gross_pay, regular_pay, overtime_pay, 
        federal_tax, state_tax, social_security, medicare,
        net_pay, payment_method, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        overrides.id || uuidv4(),
        testOrganizationId,
        overrides.payroll_run_id,
        overrides.employee_id,
        overrides.check_number || `CHK-${uniqueId.substring(0, 8)}`,
        overrides.payment_date || new Date().toISOString().split('T')[0],
        overrides.pay_period_start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        overrides.pay_period_end || new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split('T')[0],
        overrides.gross_pay || 5000.00,
        overrides.regular_pay || 4500.00,
        overrides.overtime_pay || 500.00,
        overrides.federal_tax || 750.00,
        overrides.state_tax || 300.00,
        overrides.social_security || 310.00,
        overrides.medicare || 72.50,
        overrides.net_pay || 3567.50,
        overrides.payment_method || 'direct_deposit',
        overrides.status || 'pending',
        testUserId
      ],
      testOrganizationId,
      { operation: 'INSERT', table: 'payroll.paycheck' }
    );

    return result.rows[0];
  }

  /**
   * Clean up test data
   */
  static async cleanup() {
    // Delete in order: paychecks -> payroll runs
    await query(
      `DELETE FROM payroll.paycheck 
       WHERE created_at > NOW() - INTERVAL '1 hour' 
       AND organization_id = $1`,
      [testOrganizationId],
      testOrganizationId,
      { operation: 'DELETE', table: 'payroll.paycheck' }
    );
    
    await query(
      `DELETE FROM payroll.payroll_run 
       WHERE created_at > NOW() - INTERVAL '1 hour' 
       AND organization_id = $1`,
      [testOrganizationId],
      testOrganizationId,
      { operation: 'DELETE', table: 'payroll.payroll_run' }
    );
  }
}

const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.auth = {
    userId: testUserId,
    organizationId: testOrganizationId,
    email: 'admin@recruitiq.com',
    role: 'admin'
  };
  next();
});

// Mount routes - using actual controller functions
app.get('/api/paylinq/paychecks', paycheckController.getPaychecks);
app.get('/api/paylinq/paychecks/:id', paycheckController.getPaycheckById);
app.get('/api/paylinq/employees/:employeeId/paychecks', paycheckController.getEmployeePaychecks);
app.put('/api/paylinq/paychecks/:id', paycheckController.updatePaycheck);
app.post('/api/paylinq/paychecks/:id/void', paycheckController.voidPaycheck);
app.post('/api/paylinq/paychecks/:id/reissue', paycheckController.reissuePaycheck);
app.delete('/api/paylinq/paychecks/:id', paycheckController.deletePaycheck);

describe('Paycheck Controller - API Contract Tests', () => {
  // Set up test organization and user
  beforeAll(async () => {
    await query(
      `INSERT INTO organizations (id, name, slug) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (id) DO NOTHING`,
      [testOrganizationId, 'Test Paycheck Org', 'test-paycheck-org']
    );

    await query(
      `INSERT INTO users (id, email, password_hash, name, organization_id, legacy_role) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (id) DO NOTHING`,
      [testUserId, 'paycheck@test.com', 'dummy_hash', 'Paycheck Test User', testOrganizationId, 'admin']
    );
  });

  // Create fresh test data before each test for isolation
  beforeEach(async () => {
    const employee = await PaycheckTestFactory.createEmployee();
    const payrollRun = await PaycheckTestFactory.createPayrollRun();
    const paycheck = await PaycheckTestFactory.createPaycheck({
      employee_id: employee.id,
      payroll_run_id: payrollRun.id,
      status: 'pending'
    });

    testPaycheckId = paycheck.id;
    testEmployeeId = employee.id;
    testPayrollRunId = payrollRun.id;
  });

  // Clean up after all tests
  afterAll(async () => {
    await PaycheckTestFactory.cleanup();
    await cleanupTestEmployees(testOrganizationId);
  });

  describe('GET /api/paylinq/paychecks', () => {
    test('should return array of paychecks', async () => {
      const response = await request(app)
        .get('/api/paylinq/paychecks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.paychecks)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    test('should filter by employeeId', async () => {
      const response = await request(app)
        .get(`/api/paylinq/paychecks?employeeId=${testEmployeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.paychecks)).toBe(true);
    });

    test('should filter by payrollRunId', async () => {
      const response = await request(app)
        .get(`/api/paylinq/paychecks?payrollRunId=${testPayrollRunId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/paylinq/paychecks?status=paid')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/paylinq/paychecks?startDate=2024-01-01&endDate=2024-01-31')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should accept limit parameter', async () => {
      const response = await request(app)
        .get('/api/paylinq/paychecks?limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.paychecks.length).toBeLessThanOrEqual(10);
    });

    test('should handle empty paycheck list gracefully', async () => {
      const response = await request(app)
        .get('/api/paylinq/paychecks?employeeId=550e8400-e29b-41d4-a716-446655440999')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.paychecks)).toBe(true);
      expect(response.body.count).toBe(0);
    });
  });

  describe('GET /api/paylinq/employees/:employeeId/paychecks', () => {
    test('should return paychecks for employee', async () => {
      const response = await request(app)
        .get(`/api/paylinq/employees/${testEmployeeId}/paychecks`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.paychecks)).toBe(true);
    });

    test('should filter employee paychecks by date range', async () => {
      const response = await request(app)
        .get(`/api/paylinq/employees/${testEmployeeId}/paychecks?startDate=2024-01-01&endDate=2024-01-31`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should accept limit parameter', async () => {
      const response = await request(app)
        .get(`/api/paylinq/employees/${testEmployeeId}/paychecks?limit=5`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.paychecks.length).toBeLessThanOrEqual(5);
    });

    test('should return empty array for employee with no paychecks', async () => {
      const testEmployeeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/employees/${testEmployeeId}/paychecks`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
    });
  });

  describe('GET /api/paylinq/paychecks/:id', () => {
    test('should return single paycheck', async () => {
      const response = await request(app)
        .get(`/api/paylinq/paychecks/${testPaycheckId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.paycheck).toBeDefined();
      expect(response.body.paycheck.id).toBe(testPaycheckId);
    });

    test('should include paycheck details', async () => {
      const response = await request(app)
        .get(`/api/paylinq/paychecks/${testPaycheckId}`)
        .expect(200);

      expect(response.body.paycheck).toBeDefined();
      expect(response.body.paycheck.grossPay).toBeDefined();
      expect(response.body.paycheck.netPay).toBeDefined();
    });

    test('should return 404 when paycheck not found', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/paychecks/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should return 500 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/paylinq/paychecks/invalid-uuid')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/paylinq/paychecks/:id', () => {
    test('should update paycheck successfully', async () => {
      const updates = {
        notes: 'Updated paycheck notes',
        updatedBy: testUserId
      };

      const response = await request(app)
        .put(`/api/paylinq/paychecks/${testPaycheckId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.paycheck).toBeDefined();
    });

    test('should update paycheck metadata', async () => {
      const updates = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportFormat: 'PDF',
        },
        updatedBy: testUserId
      };

      const response = await request(app)
        .put(`/api/paylinq/paychecks/${testPaycheckId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when updating non-existent paycheck', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .put(`/api/paylinq/paychecks/${fakeId}`)
        .send({ notes: 'Test', updatedBy: testUserId })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should prevent updating critical fields', async () => {
      const updates = {
        grossPay: 10000.00, // Should not allow direct updates
        updatedBy: testUserId
      };

      const response = await request(app)
        .put(`/api/paylinq/paychecks/${testPaycheckId}`)
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/paylinq/paychecks/:id/void', () => {
    test('should void paycheck successfully', async () => {
      const response = await request(app)
        .post(`/api/paylinq/paychecks/${testPaycheckId}/void`)
        .send({ reason: 'Calculation error', userId: testUserId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.paycheck).toBeDefined();
      expect(response.body.message).toContain('voided');
    });

    test('should return 400 when void reason missing', async () => {
      const response = await request(app)
        .post(`/api/paylinq/paychecks/${testPaycheckId}/void`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('reason');
    });

    test('should return 404 when voiding non-existent paycheck', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .post(`/api/paylinq/paychecks/${fakeId}/void`)
        .send({ reason: 'Test', userId: testUserId })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should return 409 when paycheck cannot be voided', async () => {
      // Create a paid paycheck that cannot be voided
      const paidPaycheck = await PaycheckTestFactory.createPaycheck({
        employee_id: testEmployeeId,
        payroll_run_id: testPayrollRunId,
        status: 'paid'
      });

      const response = await request(app)
        .post(`/api/paylinq/paychecks/${paidPaycheck.id}/void`)
        .send({ reason: 'Test', userId: testUserId });

      expect([400, 409]).toContain(response.status);
      if (response.status === 409 || response.status === 400) {
        expect(response.body.message).toMatch(/cannot be voided|already paid/i);
      }
    });
  });

  describe('POST /api/paylinq/paychecks/:id/reissue', () => {
    test('should reissue paycheck successfully', async () => {
      // First void the paycheck so it can be reissued
      await request(app)
        .post(`/api/paylinq/paychecks/${testPaycheckId}/void`)
        .send({ reason: 'Test void', userId: testUserId });

      const response = await request(app)
        .post(`/api/paylinq/paychecks/${testPaycheckId}/reissue`)
        .send({
          adjustments: {
            grossPay: 5200.00,
            reason: 'Bonus correction',
          },
          userId: testUserId
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.paycheck).toBeDefined();
      expect(response.body.message).toContain('reissued');
    });

    test('should reissue without adjustments', async () => {
      // Create and void a paycheck for reissue
      const voidedPaycheck = await PaycheckTestFactory.createPaycheck({
        employee_id: testEmployeeId,
        payroll_run_id: testPayrollRunId,
        status: 'voided'
      });

      const response = await request(app)
        .post(`/api/paylinq/paychecks/${voidedPaycheck.id}/reissue`)
        .send({ userId: testUserId })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when reissuing non-existent paycheck', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .post(`/api/paylinq/paychecks/${fakeId}/reissue`)
        .send({ userId: testUserId })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should return 409 when paycheck cannot be reissued', async () => {
      // Try to reissue non-voided paycheck (should fail)
      const pendingPaycheck = await PaycheckTestFactory.createPaycheck({
        employee_id: testEmployeeId,
        payroll_run_id: testPayrollRunId,
        status: 'pending'
      });

      const response = await request(app)
        .post(`/api/paylinq/paychecks/${pendingPaycheck.id}/reissue`)
        .send({ userId: testUserId });

      expect([400, 409]).toContain(response.status);
      if (response.status === 409) {
        expect(response.body.message).toBeDefined();
      }
    });

    test('should validate adjustment amounts', async () => {
      // Create a voided paycheck for validation test
      const voidedPaycheck = await PaycheckTestFactory.createPaycheck({
        employee_id: testEmployeeId,
        payroll_run_id: testPayrollRunId,
        status: 'voided'
      });

      const response = await request(app)
        .post(`/api/paylinq/paychecks/${voidedPaycheck.id}/reissue`)
        .send({
          adjustments: {
            grossPay: -1000.00, // Invalid negative amount
          },
          userId: testUserId
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/paylinq/paychecks/:id', () => {
    test('should delete paycheck successfully (soft delete)', async () => {
      const response = await request(app)
        .delete(`/api/paylinq/paychecks/${testPaycheckId}?userId=${testUserId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    test('should return 404 when deleting non-existent paycheck', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .delete(`/api/paylinq/paychecks/${fakeId}?userId=${testUserId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });
});
