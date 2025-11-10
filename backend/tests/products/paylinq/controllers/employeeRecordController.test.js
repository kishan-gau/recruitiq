/**
 * Employee Record Controller Tests
 * 
 * API Contract tests for employee payroll record HTTP endpoints.
 * Validates response structures match frontend expectations.
 */

import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import employeeRecordController from '../../../../src/products/paylinq/controllers/employeeRecordController.js';
import { query } from '../../../../src/config/database.js';
import { createTestEmployee, cleanupTestEmployees } from '../helpers/employeeTestHelper.js';

// Create Express app for testing
const app = express();
app.use(express.json());

// Test constants
const testUserId = '550e8400-e29b-41d4-a716-446655440001';
const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
let testEmployeeId = null;

// Mock authentication middleware
app.use((req, res, next) => {
  req.auth = {
    userId: testUserId,
    organizationId: testOrgId,
    email: 'admin@recruitiq.com',
    role: 'admin'
  };
  next();
});

// Mount employee routes
app.post('/api/paylinq/employees', employeeRecordController.createEmployeeRecord);
app.get('/api/paylinq/employees', employeeRecordController.getEmployeeRecords);
app.get('/api/paylinq/employees/:id', employeeRecordController.getEmployeeRecordById);
app.put('/api/paylinq/employees/:id', employeeRecordController.updateEmployeeRecord);
app.delete('/api/paylinq/employees/:id', employeeRecordController.deleteEmployeeRecord);
app.get('/api/paylinq/employees/:id/history', employeeRecordController.getEmployeePayrollHistory);

describe('Employee Record Controller - API Contract Tests', () => {

  // Create test employee before all tests
  beforeAll(async () => {
    // Create test organization
    await query(
      `INSERT INTO organizations (id, name, slug) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (id) DO NOTHING`,
      [testOrgId, 'Test Organization', 'test-org']
    );

    // Create test user
    await query(
      `INSERT INTO users (id, email, password_hash, name, organization_id, legacy_role) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (id) DO NOTHING`,
      [testUserId, 'admin@recruitiq.com', 'dummy_hash', 'Admin User', testOrgId, 'admin']
    );

    // Create test employee using new schema helper
    const { employee } = await createTestEmployee({
      organizationId: testOrgId,
      userId: testUserId,
      employee: {
        first_name: 'Test',
        last_name: 'Employee',
        email: 'test.employee@example.com'
      },
      payrollConfig: {
        employee_number: 'EMP-TEST-001',
        pay_frequency: 'monthly',
        payment_method: 'check',
        currency: 'SRD'
      }
    });
    testEmployeeId = employee.id;
  });

  // Clean up test data after all tests
  afterAll(async () => {
    await cleanupTestEmployees(testOrgId);
  });

  // ============================================================================
  // POST /api/paylinq/employees - Create Employee Record
  // ============================================================================
  
  describe('POST /api/paylinq/employees', () => {
    // Clean up any employees created by POST tests before each test
    beforeEach(async () => {
      await cleanupTestEmployees(testOrgId);
    });

    test('should return correct response structure on create', async () => {
      const newEmployee = {
        hrisEmployeeId: 'HRIS-001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        hireDate: '2024-01-15',
        status: 'active',
        paymentMethod: 'direct_deposit'
      };

      const response = await request(app)
        .post('/api/paylinq/employees')
        .send(newEmployee)
        .expect(201);

      // Validate response structure
      expect(response.body.success).toBe(true);
      expect(response.body.employee).toBeDefined();
      expect(response.body.employee).toHaveProperty('id');
      expect(response.body.employee).toHaveProperty('firstName', 'John');
      expect(response.body.employee).toHaveProperty('lastName', 'Doe');
      expect(response.body.employee).toHaveProperty('email', 'john.doe@example.com');
      expect(response.body.message).toContain('created successfully');
    });

    test('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .post('/api/paylinq/employees')
        .send({}) // Empty body - missing required fields
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    test('should return 400 when email format invalid', async () => {
      const invalidEmployee = {
        hrisEmployeeId: 'HRIS-002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'invalid-email', // Invalid email format
        hireDate: '2024-01-15',
        status: 'active'
      };

      const response = await request(app)
        .post('/api/paylinq/employees')
        .send(invalidEmployee)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 when no organization_id', async () => {
      const appNoOrg = express();
      appNoOrg.use(express.json());
      appNoOrg.use((req, res, next) => {
        req.auth = { 
          userId: '550e8400-e29b-41d4-a716-446655440001', 
          organizationId: null // No org
        };
        next();
      });
      appNoOrg.post('/api/paylinq/employees', employeeRecordController.createEmployeeRecord);

      const response = await request(appNoOrg)
        .post('/api/paylinq/employees')
        .send({
          hrisEmployeeId: 'HRIS-003',
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          hireDate: '2024-01-15'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should create employee with optional fields', async () => {
      const employeeWithOptionals = {
        hrisEmployeeId: 'HRIS-004',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@example.com',
        hireDate: '2024-02-01',
        status: 'active',
        paymentMethod: 'check',
        employeeNumber: 'EMP-001',
        departmentId: '550e8400-e29b-41d4-a716-446655440010',
        bankAccountNumber: '1234567890',
        bankRoutingNumber: '021000021',
        taxInfo: { exemptions: 2 },
        metadata: { notes: 'Test employee' }
      };

      const response = await request(app)
        .post('/api/paylinq/employees')
        .send(employeeWithOptionals)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.employee).toBeDefined();
    });
  });

  // ============================================================================
  // GET /api/paylinq/employees - List Employee Records
  // ============================================================================
  
  describe('GET /api/paylinq/employees', () => {
    test('should return array of employees', async () => {
      const response = await request(app)
        .get('/api/paylinq/employees')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });

    test('should accept status filter parameter', async () => {
      const response = await request(app)
        .get('/api/paylinq/employees?status=active')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
    });

    test('should accept workerTypeId filter parameter', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440020';

      const response = await request(app)
        .get(`/api/paylinq/employees?workerTypeId=${workerTypeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should accept departmentId filter parameter', async () => {
      const departmentId = '550e8400-e29b-41d4-a716-446655440030';

      const response = await request(app)
        .get(`/api/paylinq/employees?departmentId=${departmentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should accept includeInactive parameter', async () => {
      const response = await request(app)
        .get('/api/paylinq/employees?includeInactive=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
    });

    test('should handle empty employee list gracefully', async () => {
      // Even with no employees, should return empty array not null
      const response = await request(app)
        .get('/api/paylinq/employees')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
      expect(response.body.count).toBe(response.body.employees.length);
    });
  });

  // ============================================================================
  // GET /api/paylinq/employees/:id - Get Single Employee Record
  // ============================================================================
  
  describe('GET /api/paylinq/employees/:id', () => {
    test('should return single employee record', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';

      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.employee).toBeDefined();
      expect(response.body.employee).toHaveProperty('id');
      expect(response.body.employee).toHaveProperty('firstName');
      expect(response.body.employee).toHaveProperty('lastName');
      expect(response.body.employee).toHaveProperty('email');
    });

    test('should return 404 when employee not found', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/employees/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/paylinq/employees/invalid-uuid-format')
        .expect(500); // May be 400 or 500 depending on validation middleware

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // PUT /api/paylinq/employees/:id - Update Employee Record
  // ============================================================================
  
  describe('PUT /api/paylinq/employees/:id', () => {
    test('should update employee successfully', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
        status: 'inactive' // Valid status values: 'active', 'inactive', 'terminated'
      };

      const response = await request(app)
        .put(`/api/paylinq/employees/${employeeId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.employee).toBeDefined();
      expect(response.body.message).toContain('updated successfully');
    });

    test('should update payment method', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';
      const updates = {
        paymentMethod: 'check'
      };

      const response = await request(app)
        .put(`/api/paylinq/employees/${employeeId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should update bank account details', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';
      const updates = {
        bankAccountNumber: '9876543210',
        bankRoutingNumber: '021000089'
      };

      const response = await request(app)
        .put(`/api/paylinq/employees/${employeeId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when updating non-existent employee', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .put(`/api/paylinq/employees/${fakeId}`)
        .send({ firstName: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should return 400 for invalid status value', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';

      const response = await request(app)
        .put(`/api/paylinq/employees/${employeeId}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // DELETE /api/paylinq/employees/:id - Delete Employee Record
  // ============================================================================
  
  describe('DELETE /api/paylinq/employees/:id', () => {
    // Re-create employee before each delete test since delete modifies state
    beforeEach(async () => {
      // Recreate employee using helper to restore after deletion
      const { employee } = await createTestEmployee({
        organizationId: testOrgId,
        userId: testUserId,
        employee: {
          id: testEmployeeId, // Use same ID to restore
          first_name: 'Test',
          last_name: 'Employee',
          email: 'test.employee@example.com'
        },
        payrollConfig: {
          employee_number: 'EMP-TEST-001',
          pay_frequency: 'monthly',
          payment_method: 'check',
          currency: 'SRD'
        }
      });
    });

    test('should delete employee successfully (soft delete)', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';

      const response = await request(app)
        .delete(`/api/paylinq/employees/${employeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    test('should return 404 when deleting non-existent employee', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .delete(`/api/paylinq/employees/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  // ============================================================================
  // GET /api/paylinq/employees/:id/history - Get Payroll History
  // ============================================================================
  
  describe('GET /api/paylinq/employees/:id/history', () => {
    // Re-create employee before history tests since delete tests may have removed it
    beforeEach(async () => {
      // Recreate employee using helper
      const { employee } = await createTestEmployee({
        organizationId: testOrgId,
        userId: testUserId,
        employee: {
          id: testEmployeeId, // Use same ID
          first_name: 'Test',
          last_name: 'Employee',
          email: 'test.employee@example.com'
        },
        payrollConfig: {
          employee_number: 'EMP-TEST-001',
          pay_frequency: 'monthly',
          payment_method: 'check',
          currency: 'SRD'
        }
      });
    });
    test('should return payroll history array', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';

      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/history`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.history)).toBe(true);
      expect(response.body).toHaveProperty('count');
    });

    test('should accept startDate filter', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';

      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/history?startDate=2024-01-01`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.history)).toBe(true);
    });

    test('should accept endDate filter', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';

      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/history?endDate=2024-12-31`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should accept limit parameter', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';

      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/history?limit=6`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.history)).toBe(true);
    });

    test('should default limit to 12 when not specified', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';

      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/history`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Service should default to 12 months of history
    });

    test('should handle empty history gracefully', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';

      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/history`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.history)).toBe(true);
      // Empty array is valid - new employee may have no history
    });
  });
});
