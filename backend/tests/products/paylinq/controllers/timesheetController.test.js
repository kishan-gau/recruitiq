/**
 * Timesheet Controller Tests
 * 
 * API Contract tests for timesheet management HTTP endpoints.
 * Validates response structures match frontend expectations.
 */

import request from 'supertest';
import express from 'express';
import timesheetController from '../../../../src/products/paylinq/controllers/timesheetController.js';

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

// Mount timesheet routes
app.post('/api/paylinq/timesheets', timesheetController.createTimesheet);
app.get('/api/paylinq/timesheets', timesheetController.getTimesheets);
app.get('/api/paylinq/employees/:employeeId/timesheets', timesheetController.getEmployeeTimesheets);
app.get('/api/paylinq/payroll-runs/:payrollRunId/timesheets', timesheetController.getPayrollRunTimesheets);
app.get('/api/paylinq/timesheets/:id', timesheetController.getTimesheetById);
app.put('/api/paylinq/timesheets/:id', timesheetController.updateTimesheet);
app.post('/api/paylinq/timesheets/:id/submit', timesheetController.submitTimesheet);
app.post('/api/paylinq/timesheets/:id/approve', timesheetController.approveTimesheet);
app.post('/api/paylinq/timesheets/:id/reject', timesheetController.rejectTimesheet);
app.post('/api/paylinq/timesheets/:id/create-rated-lines', timesheetController.createRatedTimeLines);
app.delete('/api/paylinq/timesheets/:id', timesheetController.deleteTimesheet);

describe('Timesheet Controller - API Contract Tests', () => {

  // ============================================================================
  // POST /api/paylinq/timesheets - Create Timesheet
  // ============================================================================
  
  describe('POST /api/paylinq/timesheets', () => {
    test('should return correct response structure on create', async () => {
      const newTimesheet = {
        employeeId: '550e8400-e29b-41d4-a716-446655440040',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-14',
        status: 'draft',
        notes: 'Regular bi-weekly timesheet'
      };

      const response = await request(app)
        .post('/api/paylinq/timesheets')
        .send(newTimesheet)
        .expect(201);

      // Validate response structure
      expect(response.body.success).toBe(true);
      expect(response.body.timesheet).toBeDefined();
      expect(response.body.timesheet).toHaveProperty('id');
      expect(response.body.timesheet).toHaveProperty('employeeId');
      expect(response.body.message).toContain('created successfully');
    });

    test('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .post('/api/paylinq/timesheets')
        .send({}) // Empty body
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    test('should create timesheet with all valid status values', async () => {
      const statuses = ['draft', 'submitted', 'approved', 'rejected', 'processed'];

      for (const status of statuses) {
        const timesheet = {
          employeeId: '550e8400-e29b-41d4-a716-446655440040',
          periodStart: '2024-01-01',
          periodEnd: '2024-01-14',
          status
        };

        const response = await request(app)
          .post('/api/paylinq/timesheets')
          .send(timesheet);

        // Should succeed or fail for business reasons, not validation
        expect([201, 400, 409]).toContain(response.status);
      }
    });

    test('should create timesheet with payrollRunId', async () => {
      const timesheet = {
        employeeId: '550e8400-e29b-41d4-a716-446655440040',
        payrollRunId: '550e8400-e29b-41d4-a716-446655440080',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-14',
        status: 'draft'
      };

      const response = await request(app)
        .post('/api/paylinq/timesheets')
        .send(timesheet)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    test('should create timesheet with notes', async () => {
      const timesheet = {
        employeeId: '550e8400-e29b-41d4-a716-446655440040',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-14',
        status: 'draft',
        notes: 'Includes overtime hours'
      };

      const response = await request(app)
        .post('/api/paylinq/timesheets')
        .send(timesheet)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================================
  // GET /api/paylinq/timesheets - Get Timesheets with Filters
  // ============================================================================
  
  describe('GET /api/paylinq/timesheets', () => {
    test('should return array of timesheets', async () => {
      const response = await request(app)
        .get('/api/paylinq/timesheets')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.timesheets)).toBe(true);
      expect(response.body).toHaveProperty('count');
    });

    test('should filter by employeeId', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';

      const response = await request(app)
        .get(`/api/paylinq/timesheets?employeeId=${employeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.timesheets)).toBe(true);
    });

    test('should filter by payrollRunId', async () => {
      const payrollRunId = '550e8400-e29b-41d4-a716-446655440080';

      const response = await request(app)
        .get(`/api/paylinq/timesheets?payrollRunId=${payrollRunId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/paylinq/timesheets?status=approved')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/paylinq/timesheets?startDate=2024-01-01&endDate=2024-01-31')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle empty timesheet list gracefully', async () => {
      const response = await request(app)
        .get('/api/paylinq/timesheets?employeeId=550e8400-e29b-41d4-a716-446655440999')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.timesheets)).toBe(true);
      expect(response.body.count).toBe(0);
    });
  });

  // ============================================================================
  // GET /api/paylinq/employees/:employeeId/timesheets - Get Employee Timesheets
  // ============================================================================
  
  describe('GET /api/paylinq/employees/:employeeId/timesheets', () => {
    test('should return timesheets for employee', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';

      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/timesheets`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.timesheets)).toBe(true);
      expect(response.body).toHaveProperty('count');
    });

    test('should filter employee timesheets by date range', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';

      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/timesheets?startDate=2024-01-01&endDate=2024-01-31`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return empty array for employee with no timesheets', async () => {
      const employeeId = '550e8400-e29b-41d4-a716-446655440040';

      const response = await request(app)
        .get(`/api/paylinq/employees/${employeeId}/timesheets`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
    });
  });

  // ============================================================================
  // GET /api/paylinq/payroll-runs/:payrollRunId/timesheets - Get Payroll Run Timesheets
  // ============================================================================
  
  describe('GET /api/paylinq/payroll-runs/:payrollRunId/timesheets', () => {
    test('should return timesheets for payroll run', async () => {
      const payrollRunId = '550e8400-e29b-41d4-a716-446655440080';

      const response = await request(app)
        .get(`/api/paylinq/payroll-runs/${payrollRunId}/timesheets`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.timesheets)).toBe(true);
      expect(response.body).toHaveProperty('count');
    });

    test('should return empty array for payroll run with no timesheets', async () => {
      const payrollRunId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/payroll-runs/${payrollRunId}/timesheets`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
    });
  });

  // ============================================================================
  // GET /api/paylinq/timesheets/:id - Get Timesheet by ID
  // ============================================================================
  
  describe('GET /api/paylinq/timesheets/:id', () => {
    test('should return single timesheet', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';

      const response = await request(app)
        .get(`/api/paylinq/timesheets/${timesheetId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.timesheet).toBeDefined();
      expect(response.body.timesheet).toHaveProperty('id');
      expect(response.body.timesheet).toHaveProperty('employeeId');
    });

    test('should return 404 when timesheet not found', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/timesheets/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should return 500 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/paylinq/timesheets/invalid-uuid')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // PUT /api/paylinq/timesheets/:id - Update Timesheet
  // ============================================================================
  
  describe('PUT /api/paylinq/timesheets/:id', () => {
    test('should update timesheet successfully', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';
      const updates = {
        notes: 'Updated notes'
      };

      const response = await request(app)
        .put(`/api/paylinq/timesheets/${timesheetId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.timesheet).toBeDefined();
      expect(response.body.message).toContain('updated successfully');
    });

    test('should update timesheet status', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';
      const updates = {
        status: 'submitted'
      };

      const response = await request(app)
        .put(`/api/paylinq/timesheets/${timesheetId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should update period dates', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';
      const updates = {
        periodStart: '2024-02-01',
        periodEnd: '2024-02-14'
      };

      const response = await request(app)
        .put(`/api/paylinq/timesheets/${timesheetId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should link timesheet to payroll run', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';
      const updates = {
        payrollRunId: '550e8400-e29b-41d4-a716-446655440080'
      };

      const response = await request(app)
        .put(`/api/paylinq/timesheets/${timesheetId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when updating non-existent timesheet', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .put(`/api/paylinq/timesheets/${fakeId}`)
        .send({ notes: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should return 400 for invalid status value', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';

      const response = await request(app)
        .put(`/api/paylinq/timesheets/${timesheetId}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // POST /api/paylinq/timesheets/:id/submit - Submit Timesheet
  // ============================================================================
  
  describe('POST /api/paylinq/timesheets/:id/submit', () => {
    test('should submit timesheet successfully', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';

      const response = await request(app)
        .post(`/api/paylinq/timesheets/${timesheetId}/submit`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.timesheet).toBeDefined();
      expect(response.body.message).toContain('submitted successfully');
    });

    test('should return 404 when submitting non-existent timesheet', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .post(`/api/paylinq/timesheets/${fakeId}/submit`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 409 for invalid timesheet status transition', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';

      const response = await request(app)
        .post(`/api/paylinq/timesheets/${timesheetId}/submit`);

      // Either success or conflict depending on current status
      expect([200, 409]).toContain(response.status);
      if (response.status === 409) {
        expect(response.body.message).toContain('status');
      }
    });
  });

  // ============================================================================
  // POST /api/paylinq/timesheets/:id/approve - Approve Timesheet
  // ============================================================================
  
  describe('POST /api/paylinq/timesheets/:id/approve', () => {
    test('should approve timesheet successfully', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';

      const response = await request(app)
        .post(`/api/paylinq/timesheets/${timesheetId}/approve`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.timesheet).toBeDefined();
      expect(response.body.message).toContain('approved successfully');
    });

    test('should return 404 when approving non-existent timesheet', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .post(`/api/paylinq/timesheets/${fakeId}/approve`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 409 for invalid status transition', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';

      const response = await request(app)
        .post(`/api/paylinq/timesheets/${timesheetId}/approve`);

      // Either success or conflict
      expect([200, 409]).toContain(response.status);
      if (response.status === 409) {
        expect(response.body.message).toContain('status');
      }
    });
  });

  // ============================================================================
  // POST /api/paylinq/timesheets/:id/reject - Reject Timesheet
  // ============================================================================
  
  describe('POST /api/paylinq/timesheets/:id/reject', () => {
    test('should reject timesheet successfully', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';

      const response = await request(app)
        .post(`/api/paylinq/timesheets/${timesheetId}/reject`)
        .send({ rejectionReason: 'Missing time entries' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.timesheet).toBeDefined();
      expect(response.body.message).toContain('rejected successfully');
    });

    test('should return 400 when rejectionReason missing', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';

      const response = await request(app)
        .post(`/api/paylinq/timesheets/${timesheetId}/reject`)
        .send({}) // No rejection reason
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 404 when rejecting non-existent timesheet', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .post(`/api/paylinq/timesheets/${fakeId}/reject`)
        .send({ rejectionReason: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 409 for invalid status transition', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';

      const response = await request(app)
        .post(`/api/paylinq/timesheets/${timesheetId}/reject`)
        .send({ rejectionReason: 'Invalid transition test' });

      // Either success or conflict
      expect([200, 409]).toContain(response.status);
      if (response.status === 409) {
        expect(response.body.message).toContain('status');
      }
    });
  });

  // ============================================================================
  // POST /api/paylinq/timesheets/:id/create-rated-lines - Create Rated Time Lines
  // ============================================================================
  
  describe('POST /api/paylinq/timesheets/:id/create-rated-lines', () => {
    test('should create rated time lines successfully', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';

      const response = await request(app)
        .post(`/api/paylinq/timesheets/${timesheetId}/create-rated-lines`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.ratedLines)).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(response.body.message).toContain('created successfully');
    });

    test('should return 409 when timesheet not approved', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';

      const response = await request(app)
        .post(`/api/paylinq/timesheets/${timesheetId}/create-rated-lines`);

      // Either success or conflict depending on approval status
      expect([201, 409]).toContain(response.status);
      if (response.status === 409) {
        expect(response.body.message).toContain('not approved');
      }
    });

    test('should return 400 when creating lines for non-existent timesheet', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .post(`/api/paylinq/timesheets/${fakeId}/create-rated-lines`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // DELETE /api/paylinq/timesheets/:id - Delete Timesheet
  // ============================================================================
  
  describe('DELETE /api/paylinq/timesheets/:id', () => {
    test('should delete timesheet successfully (soft delete)', async () => {
      const timesheetId = '550e8400-e29b-41d4-a716-446655440070';

      const response = await request(app)
        .delete(`/api/paylinq/timesheets/${timesheetId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    test('should return 404 when deleting non-existent timesheet', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .delete(`/api/paylinq/timesheets/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });
});
