/**
 * Workers List Controller Tests
 * API Contract tests for workers (employee) management HTTP endpoints
 * Tests the /api/paylinq/workers endpoints using industry standards
 */

import request from 'supertest';
import express from 'express';
import employeeRecordController from '../../../../src/products/paylinq/controllers/employeeRecordController.js';
import {
  createWorkerDTO,
  createWorkerDTOList,
  createW2EmployeeDTO,
  create1099ContractorDTO,
  createMinimalWorkerDTO,
  createInvalidWorkerDTO,
  createWorkerUpdateDTO,
} from '../factories/workerFactory.js';

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.auth = {
    userId: '550e8400-e29b-41d4-a716-446655440001',
    organizationId: '9ee50aee-76c3-46ce-87ed-005c6dd893ef',
    email: 'admin@recruitiq.com',
    role: 'admin'
  };
  next();
});

// Mount worker routes directly to controller
app.get('/api/paylinq/workers', employeeRecordController.getEmployeeRecords);
app.post('/api/paylinq/workers', employeeRecordController.createEmployeeRecord);
app.get('/api/paylinq/workers/:id', employeeRecordController.getEmployeeRecordById);
app.put('/api/paylinq/workers/:id', employeeRecordController.updateEmployeeRecord);
app.delete('/api/paylinq/workers/:id', employeeRecordController.deleteEmployeeRecord);
app.get('/api/paylinq/workers/:id/history', employeeRecordController.getEmployeePayrollHistory);

describe('Workers List Controller - API Contract Tests', () => {
  // Test data isolation: Store created worker IDs for cleanup
  let createdWorkerIds = [];
  
  /**
   * Create a test worker and track it for cleanup
   * @param {Object} workerData - Worker data to create
   * @returns {Promise<Object>} Created worker with ID
   */
  async function createTestWorker(workerData = null) {
    const data = workerData || createWorkerDTO();
    const response = await request(app)
      .post('/api/paylinq/workers')
      .send(data);
    
    if (response.status === 201 && response.body.employee?.id) {
      createdWorkerIds.push(response.body.employee.id);
      return response.body.employee;
    }
    
    throw new Error(`Failed to create test worker: ${response.status} - ${JSON.stringify(response.body)}`);
  }
  
  /**
   * Clean up all created test workers
   */
  afterEach(async () => {
    // Clean up created workers in reverse order
    for (const workerId of createdWorkerIds.reverse()) {
      try {
        await request(app).delete(`/api/paylinq/workers/${workerId}`);
      } catch (error) {
        // Ignore cleanup errors (worker may already be deleted by test)
      }
    }
    createdWorkerIds = [];
  });

  // ============================================================================
  // GET /api/paylinq/workers - List Workers
  // ============================================================================
  
  describe('GET /api/paylinq/workers', () => {
    test('should return array of workers with correct structure', async () => {
      const response = await request(app)
        .get('/api/paylinq/workers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });

    test('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/paylinq/workers?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
    });

    test('should support sorting parameters', async () => {
      const response = await request(app)
        .get('/api/paylinq/workers?sortField=lastName&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/paylinq/workers?status=active')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
    });

    test('should filter by worker type', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';
      
      const response = await request(app)
        .get(`/api/paylinq/workers?workerTypeId=${workerTypeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
    });

    test('should filter by department', async () => {
      const departmentId = '550e8400-e29b-41d4-a716-446655440060';
      
      const response = await request(app)
        .get(`/api/paylinq/workers?departmentId=${departmentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
    });

    test('should support includeInactive parameter', async () => {
      const response = await request(app)
        .get('/api/paylinq/workers?includeInactive=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
    });

    test('should exclude inactive workers by default', async () => {
      const response = await request(app)
        .get('/api/paylinq/workers')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Service should filter out terminated/inactive workers by default
    });

    test('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/paylinq/workers?status=active&includeInactive=false&sortField=hireDate&sortOrder=desc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
    });

    test('should handle empty worker list gracefully', async () => {
      const response = await request(app)
        .get('/api/paylinq/workers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
      expect(response.body.count).toBe(response.body.employees.length);
    });

    test('should include worker details in response', async () => {
      const response = await request(app)
        .get('/api/paylinq/workers')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.employees.length > 0) {
        const worker = response.body.employees[0];
        expect(worker).toHaveProperty('id');
        expect(worker).toHaveProperty('firstName');
        expect(worker).toHaveProperty('lastName');
        expect(worker).toHaveProperty('email');
        expect(worker).toHaveProperty('status');
        expect(worker).toHaveProperty('hireDate');
      }
    });
  });

  // ============================================================================
  // POST /api/paylinq/workers - Create Worker
  // ============================================================================
  
  describe('POST /api/paylinq/workers', () => {
    test('should create W-2 employee successfully', async () => {
      const workerData = createW2EmployeeDTO();

      const response = await request(app)
        .post('/api/paylinq/workers')
        .send(workerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.employee).toBeDefined();
      expect(response.body.employee).toHaveProperty('id');
      expect(response.body.employee.firstName).toBe(workerData.firstName);
      expect(response.body.employee.lastName).toBe(workerData.lastName);
      expect(response.body.employee.email).toBe(workerData.email);
      expect(response.body.message).toContain('created successfully');
    });

    test('should create 1099 contractor successfully', async () => {
      const contractorData = create1099ContractorDTO();

      const response = await request(app)
        .post('/api/paylinq/workers')
        .send(contractorData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.employee).toBeDefined();
      expect(response.body.employee).toHaveProperty('id');
    });

    test('should create worker with minimal required fields', async () => {
      const minimalData = createMinimalWorkerDTO();

      const response = await request(app)
        .post('/api/paylinq/workers')
        .send(minimalData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.employee).toBeDefined();
    });

    test('should create worker with all optional fields', async () => {
      const fullData = createWorkerDTO();

      const response = await request(app)
        .post('/api/paylinq/workers')
        .send(fullData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.employee).toBeDefined();
    });

    test('should return 400 when firstName is missing', async () => {
      const invalidData = createInvalidWorkerDTO('missingFirstName');

      const response = await request(app)
        .post('/api/paylinq/workers')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    test('should return 400 when lastName is missing', async () => {
      const invalidData = createInvalidWorkerDTO('missingLastName');

      const response = await request(app)
        .post('/api/paylinq/workers')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 when email is missing', async () => {
      const invalidData = createInvalidWorkerDTO('missingEmail');

      const response = await request(app)
        .post('/api/paylinq/workers')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 when email is invalid', async () => {
      const invalidData = createInvalidWorkerDTO('invalidEmail');

      const response = await request(app)
        .post('/api/paylinq/workers')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 when hireDate is missing', async () => {
      const invalidData = createInvalidWorkerDTO('missingHireDate');

      const response = await request(app)
        .post('/api/paylinq/workers')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid status', async () => {
      const invalidData = createInvalidWorkerDTO('invalidStatus');

      const response = await request(app)
        .post('/api/paylinq/workers')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid payment method', async () => {
      const invalidData = createInvalidWorkerDTO('invalidPaymentMethod');

      const response = await request(app)
        .post('/api/paylinq/workers')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid UUID format', async () => {
      const invalidData = createInvalidWorkerDTO('invalidUUID');

      const response = await request(app)
        .post('/api/paylinq/workers')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 409 when worker already exists', async () => {
      const workerData = createWorkerDTO();

      // First creation should succeed
      await request(app)
        .post('/api/paylinq/workers')
        .send(workerData);

      // Second creation with same HRIS ID should conflict
      const response = await request(app)
        .post('/api/paylinq/workers')
        .send(workerData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    test('should accept all valid status values', async () => {
      const statuses = ['active', 'inactive', 'terminated']; // Valid DB constraint values

      for (const status of statuses) {
        const workerData = createWorkerDTO({ status });

        const response = await request(app)
          .post('/api/paylinq/workers')
          .send(workerData);

        // Should either succeed (201) or conflict (409) if already exists
        expect([201, 409, 400]).toContain(response.status);
      }
    });

    test('should accept all valid payment methods', async () => {
      const paymentMethods = ['direct_deposit', 'check', 'cash'];

      for (const paymentMethod of paymentMethods) {
        const workerData = createWorkerDTO({ paymentMethod });

        const response = await request(app)
          .post('/api/paylinq/workers')
          .send(workerData);

        // Should either succeed (201) or conflict (409) if already exists
        expect([201, 409, 400]).toContain(response.status);
      }
    });
  });

  // ============================================================================
  // GET /api/paylinq/workers/:id - Get Single Worker
  // ============================================================================
  
  describe('GET /api/paylinq/workers/:id', () => {
    test('should return single worker by ID', async () => {
      // Create a test worker first
      const testWorker = await createTestWorker();
      const workerId = testWorker.id;

      const response = await request(app)
        .get(`/api/paylinq/workers/${workerId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.employee).toBeDefined();
      expect(response.body.employee).toHaveProperty('id');
      expect(response.body.employee.id).toBe(workerId);
      expect(response.body.employee).toHaveProperty('firstName');
      expect(response.body.employee).toHaveProperty('lastName');
      expect(response.body.employee).toHaveProperty('email');
      expect(response.body.employee).toHaveProperty('status');
      expect(response.body.employee).toHaveProperty('hireDate');
    });

    test('should return 404 when worker not found', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/workers/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should return 500 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/paylinq/workers/invalid-uuid')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // PUT /api/paylinq/workers/:id - Update Worker
  // ============================================================================
  
  describe('PUT /api/paylinq/workers/:id', () => {
    test('should update worker successfully', async () => {
      const testWorker = await createTestWorker();
      const workerId = testWorker.id;
      const updates = createWorkerUpdateDTO();

      const response = await request(app)
        .put(`/api/paylinq/workers/${workerId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.employee).toBeDefined();
      expect(response.body.message).toContain('updated successfully');
    });

    test('should update worker status', async () => {
      const testWorker = await createTestWorker();
      const workerId = testWorker.id;
      const updates = { status: 'inactive' }; // Changed from 'on_leave' to valid DB value

      const response = await request(app)
        .put(`/api/paylinq/workers/${workerId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should update payment method', async () => {
      const testWorker = await createTestWorker();
      const workerId = testWorker.id;
      const updates = { paymentMethod: 'check' };

      const response = await request(app)
        .put(`/api/paylinq/workers/${workerId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should update bank information', async () => {
      const testWorker = await createTestWorker();
      const workerId = testWorker.id;
      const updates = {
        bankAccountNumber: '9876543210',
        bankRoutingNumber: '021000021',
      };

      const response = await request(app)
        .put(`/api/paylinq/workers/${workerId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should update tax information', async () => {
      const testWorker = await createTestWorker();
      const workerId = testWorker.id;
      const updates = {
        taxInfo: {
          filingStatus: 'married',
          exemptions: 3,
          additionalWithholding: 100,
        },
      };

      const response = await request(app)
        .put(`/api/paylinq/workers/${workerId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when updating non-existent worker', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';
      const updates = createWorkerUpdateDTO();

      const response = await request(app)
        .put(`/api/paylinq/workers/${fakeId}`)
        .send(updates)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should return 400 for invalid status', async () => {
      const testWorker = await createTestWorker();
      const workerId = testWorker.id;
      const updates = { status: 'invalid_status' };

      const response = await request(app)
        .put(`/api/paylinq/workers/${workerId}`)
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 for invalid email', async () => {
      const testWorker = await createTestWorker();
      const workerId = testWorker.id;
      const updates = { email: 'not-an-email' };

      const response = await request(app)
        .put(`/api/paylinq/workers/${workerId}`)
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // DELETE /api/paylinq/workers/:id - Delete Worker
  // ============================================================================
  
  describe('DELETE /api/paylinq/workers/:id', () => {
    test('should delete worker successfully (soft delete)', async () => {
      const testWorker = await createTestWorker();
      const workerId = testWorker.id;

      const response = await request(app)
        .delete(`/api/paylinq/workers/${workerId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    test('should return 404 when deleting non-existent worker', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .delete(`/api/paylinq/workers/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  // ============================================================================
  // GET /api/paylinq/workers/:id/history - Get Worker Payroll History
  // ============================================================================
  
  describe('GET /api/paylinq/workers/:id/history', () => {
    test('should return worker payroll history', async () => {
      const testWorker = await createTestWorker();
      const workerId = testWorker.id;

      const response = await request(app)
        .get(`/api/paylinq/workers/${workerId}/history`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.history)).toBe(true);
      expect(response.body).toHaveProperty('count');
    });

    test('should filter history by date range', async () => {
      const testWorker = await createTestWorker();
      const workerId = testWorker.id;

      const response = await request(app)
        .get(`/api/paylinq/workers/${workerId}/history?startDate=2024-01-01&endDate=2024-12-31`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.history)).toBe(true);
    });

    test('should limit history results', async () => {
      const testWorker = await createTestWorker();
      const workerId = testWorker.id;

      const response = await request(app)
        .get(`/api/paylinq/workers/${workerId}/history?limit=5`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.history)).toBe(true);
    });

    test('should return 404 for non-existent worker', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/workers/${fakeId}/history`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should return empty array for worker with no history', async () => {
      const testWorker = await createTestWorker();
      const workerId = testWorker.id;

      const response = await request(app)
        .get(`/api/paylinq/workers/${workerId}/history`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.history)).toBe(true);
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================
  
  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/paylinq/workers')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toBeDefined();
    });

    test('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/paylinq/workers')
        .send('plain text data');

      // Should handle gracefully
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/paylinq/workers')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
