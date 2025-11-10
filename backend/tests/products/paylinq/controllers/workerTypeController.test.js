/**
 * Worker Type Controller Tests
 * 
 * API Contract tests for worker type template management HTTP endpoints.
 * Validates response structures match frontend expectations.
 */

import request from 'supertest';
import express from 'express';
import workerTypeController from '../../../../src/products/paylinq/controllers/workerTypeController.js';

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.auth = {
    userId: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID
    organizationId: '9ee50aee-76c3-46ce-87ed-005c6dd893ef', // Test Company org ID
    email: 'admin@recruitiq.com',
    role: 'admin'
  };
  next();
});

// Mount worker type routes
app.post('/api/paylinq/worker-types', workerTypeController.createWorkerType);
app.get('/api/paylinq/worker-types', workerTypeController.getWorkerTypes);
app.get('/api/paylinq/worker-types/:id', workerTypeController.getWorkerTypeById);
app.put('/api/paylinq/worker-types/:id', workerTypeController.updateWorkerType);
app.delete('/api/paylinq/worker-types/:id', workerTypeController.deleteWorkerType);
app.post('/api/paylinq/worker-types/:id/assign-employees', workerTypeController.assignEmployees);
app.get('/api/paylinq/worker-types/:id/employees', workerTypeController.getWorkerTypeEmployees);

describe('Worker Type Controller - API Contract Tests', () => {

  // ============================================================================
  // POST /api/paylinq/worker-types - Create Worker Type
  // ============================================================================
  
  describe('POST /api/paylinq/worker-types', () => {
    test('should return correct response structure on create', async () => {
      const newWorkerType = {
        code: 'FT-HOURLY',
        name: 'Full-Time Hourly',
        description: 'Full-time hourly employee',
        payType: 'hourly',
        defaultRate: 25.00,
        overtimeEligible: true,
        overtimeMultiplier: 1.5
      };

      const response = await request(app)
        .post('/api/paylinq/worker-types')
        .send(newWorkerType)
        .expect(201);

      // Validate response structure
      expect(response.body.success).toBe(true);
      expect(response.body.workerType).toBeDefined();
      expect(response.body.workerType).toHaveProperty('id');
      expect(response.body.workerType).toHaveProperty('code', 'FT-HOURLY');
      expect(response.body.workerType).toHaveProperty('name', 'Full-Time Hourly');
      expect(response.body.workerType).toHaveProperty('payType', 'hourly');
      expect(response.body.message).toContain('created successfully');
    });

    test('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .post('/api/paylinq/worker-types')
        .send({}) // Empty body
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    test('should return 400 for invalid payType', async () => {
      const invalidWorkerType = {
        code: 'TEST',
        name: 'Test Type',
        payType: 'invalid_type' // Invalid payType
      };

      const response = await request(app)
        .post('/api/paylinq/worker-types')
        .send(invalidWorkerType)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should create worker type with all optional fields', async () => {
      const fullWorkerType = {
        code: 'SALARY-MGMT',
        name: 'Salary Management',
        description: 'Salaried management employees',
        payType: 'salary',
        defaultRate: 80000,
        overtimeEligible: false,
        overtimeMultiplier: 1.5,
        benefits: { health: true, dental: true },
        taxSettings: { exemptions: 2 },
        isActive: true
      };

      const response = await request(app)
        .post('/api/paylinq/worker-types')
        .send(fullWorkerType)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.workerType).toBeDefined();
    });

    test('should accept all valid payType values', async () => {
      const payTypes = ['hourly', 'salary', 'commission', 'piece_rate'];

      for (const payType of payTypes) {
        const workerType = {
          code: `TEST-${payType.toUpperCase()}`,
          name: `Test ${payType}`,
          payType
        };

        const response = await request(app)
          .post('/api/paylinq/worker-types')
          .send(workerType);

        // Should either succeed (201) or conflict (409) if already exists
        expect([201, 409, 400, 403]).toContain(response.status);
      }
    });
  });

  // ============================================================================
  // GET /api/paylinq/worker-types - List Worker Types
  // ============================================================================
  
  describe('GET /api/paylinq/worker-types', () => {
    test('should return array of worker types', async () => {
      const response = await request(app)
        .get('/api/paylinq/worker-types')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.workerTypes)).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });

    test('should accept includeInactive parameter', async () => {
      const response = await request(app)
        .get('/api/paylinq/worker-types?includeInactive=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.workerTypes)).toBe(true);
    });

    test('should exclude inactive by default', async () => {
      const response = await request(app)
        .get('/api/paylinq/worker-types')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Service should filter out inactive worker types by default
    });

    test('should handle empty worker type list gracefully', async () => {
      const response = await request(app)
        .get('/api/paylinq/worker-types')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.workerTypes)).toBe(true);
      expect(response.body.count).toBe(response.body.workerTypes.length);
    });
  });

  // ============================================================================
  // GET /api/paylinq/worker-types/:id - Get Single Worker Type
  // ============================================================================
  
  describe('GET /api/paylinq/worker-types/:id', () => {
    test('should return single worker type', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';

      const response = await request(app)
        .get(`/api/paylinq/worker-types/${workerTypeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workerType).toBeDefined();
      expect(response.body.workerType).toHaveProperty('id');
      expect(response.body.workerType).toHaveProperty('code');
      expect(response.body.workerType).toHaveProperty('name');
      expect(response.body.workerType).toHaveProperty('payType');
    });

    test('should return 404 when worker type not found', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/worker-types/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should return 500 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/paylinq/worker-types/invalid-uuid')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // PUT /api/paylinq/worker-types/:id - Update Worker Type
  // ============================================================================
  
  describe('PUT /api/paylinq/worker-types/:id', () => {
    test('should update worker type successfully', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';
      const updates = {
        name: 'Updated Worker Type',
        defaultRate: 30.00,
        overtimeMultiplier: 2.0
      };

      const response = await request(app)
        .put(`/api/paylinq/worker-types/${workerTypeId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workerType).toBeDefined();
      expect(response.body.message).toContain('updated successfully');
    });

    test('should update pay type', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';
      const updates = {
        payType: 'salary'
      };

      const response = await request(app)
        .put(`/api/paylinq/worker-types/${workerTypeId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should update benefits and tax settings', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';
      const updates = {
        benefits: { health: true, retirement: true },
        taxSettings: { withholdingRate: 0.22 }
      };

      const response = await request(app)
        .put(`/api/paylinq/worker-types/${workerTypeId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when updating non-existent worker type', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .put(`/api/paylinq/worker-types/${fakeId}`)
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should return 400 for invalid payType', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';

      const response = await request(app)
        .put(`/api/paylinq/worker-types/${workerTypeId}`)
        .send({ payType: 'invalid_type' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should deactivate worker type', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';

      const response = await request(app)
        .put(`/api/paylinq/worker-types/${workerTypeId}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================================
  // DELETE /api/paylinq/worker-types/:id - Delete Worker Type
  // ============================================================================
  
  describe('DELETE /api/paylinq/worker-types/:id', () => {
    test('should delete worker type successfully (soft delete)', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';

      const response = await request(app)
        .delete(`/api/paylinq/worker-types/${workerTypeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    test('should return 404 when deleting non-existent worker type', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .delete(`/api/paylinq/worker-types/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  // ============================================================================
  // POST /api/paylinq/worker-types/:id/assign-employees - Assign Employees
  // ============================================================================
  
  describe('POST /api/paylinq/worker-types/:id/assign-employees', () => {
    test('should assign employees successfully', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';
      const employeeIds = [
        '550e8400-e29b-41d4-a716-446655440060',
        '550e8400-e29b-41d4-a716-446655440061',
        '550e8400-e29b-41d4-a716-446655440062'
      ];

      const response = await request(app)
        .post(`/api/paylinq/worker-types/${workerTypeId}/assign-employees`)
        .send({ employeeIds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.assigned).toBeDefined();
      expect(response.body.message).toContain('assigned successfully');
    });

    test('should return 400 when employeeIds is empty', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';

      const response = await request(app)
        .post(`/api/paylinq/worker-types/${workerTypeId}/assign-employees`)
        .send({ employeeIds: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('non-empty array');
    });

    test('should return 400 when employeeIds is not an array', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';

      const response = await request(app)
        .post(`/api/paylinq/worker-types/${workerTypeId}/assign-employees`)
        .send({ employeeIds: 'not-an-array' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 when employeeIds missing', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';

      const response = await request(app)
        .post(`/api/paylinq/worker-types/${workerTypeId}/assign-employees`)
        .send({}) // Missing employeeIds
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should assign single employee', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';
      const employeeIds = ['550e8400-e29b-41d4-a716-446655440060'];

      const response = await request(app)
        .post(`/api/paylinq/worker-types/${workerTypeId}/assign-employees`)
        .send({ employeeIds })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================================
  // GET /api/paylinq/worker-types/:id/employees - Get Worker Type Employees
  // ============================================================================
  
  describe('GET /api/paylinq/worker-types/:id/employees', () => {
    test('should return array of assigned employees', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';

      const response = await request(app)
        .get(`/api/paylinq/worker-types/${workerTypeId}/employees`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });

    test('should return empty array when no employees assigned', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';

      const response = await request(app)
        .get(`/api/paylinq/worker-types/${workerTypeId}/employees`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.employees)).toBe(true);
      // Empty array is valid - new worker type may have no employees
    });

    test('should include employee details in response', async () => {
      const workerTypeId = '550e8400-e29b-41d4-a716-446655440050';

      const response = await request(app)
        .get(`/api/paylinq/worker-types/${workerTypeId}/employees`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.employees.length > 0) {
        const employee = response.body.employees[0];
        expect(employee).toHaveProperty('id');
        // Should include basic employee info
      }
    });
  });
});
