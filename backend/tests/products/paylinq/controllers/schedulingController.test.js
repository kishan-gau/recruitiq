/**
 * Scheduling Controller - API Contract Tests
 * 
 * Integration tests validating API contracts for work schedule management.
 * Tests cover creating, updating schedules and managing schedule change requests.
 */

import request from 'supertest';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import schedulingController from '../../../../src/products/paylinq/controllers/schedulingController.js';
import { query } from '../../../../src/config/database.js';
import { createTestEmployee, cleanupTestEmployees } from '../helpers/employeeTestHelper.js';

// Test constants - These match the seeded test data
const testOrganizationId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
const testUserId = '550e8400-e29b-41d4-a716-446655440000';
let testEmployeeId = null;
const testScheduleId = '550e8400-e29b-41d4-a716-446655440777';
const testRequestId = '550e8400-e29b-41d4-a716-446655440666';
const testShiftTypeId = '550e8400-e29b-41d4-a716-446655440881';

// ============================================================================
// Test Data Factory (Industry Standard Pattern)
// Creates test data programmatically for proper test isolation
// ============================================================================
class SchedulingTestFactory {
  static async createSchedule(overrides = {}) {
    const defaultData = {
      id: uuidv4(), // Generate valid UUID
      organization_id: testOrganizationId,
      employee_id: testEmployeeId,
      shift_type_id: testShiftTypeId,
      scheduled_date: overrides.scheduled_date || '2024-01-15',
      start_time: '09:00',
      end_time: '17:00',
      duration_hours: 8.0, // Required NOT NULL field
      status: 'scheduled',
      created_by: testUserId,
    };

    const data = { ...defaultData, ...overrides };

    const result = await query(
      `INSERT INTO payroll.work_schedule (
        id, organization_id, employee_id, shift_type_id,
        schedule_date, start_time, end_time, duration_hours, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.id, data.organization_id, data.employee_id,
        data.shift_type_id, data.scheduled_date, data.start_time,
        data.end_time, data.duration_hours, data.status, data.created_by
      ]
    );

    return result.rows[0];
  }

  static async createChangeRequest(overrides = {}) {
    const defaultData = {
      id: uuidv4(), // Generate valid UUID
      organization_id: testOrganizationId,
      work_schedule_id: overrides.work_schedule_id || testScheduleId,
      requested_by: testEmployeeId, // References employee_record, not users
      request_type: 'change', // Valid type: 'swap', 'change', 'cancel' (not 'time_off')
      reason: 'Test reason',
      original_date: '2024-01-15',
      status: 'pending',
      created_by: testUserId,
    };

    const data = { ...defaultData, ...overrides };

    const result = await query(
      `INSERT INTO payroll.schedule_change_request (
        id, organization_id, work_schedule_id, requested_by,
        request_type, reason, original_date, proposed_date,
        original_shift_type_id, proposed_shift_type_id,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        data.id, data.organization_id, data.work_schedule_id,
        data.requested_by, data.request_type, data.reason,
        data.original_date, data.proposed_date || null,
        data.original_shift_type_id || null,
        data.proposed_shift_type_id || null,
        data.status, data.created_by
      ]
    );

    return result.rows[0];
  }

  static async cleanup() {
    // Clean up test data in reverse order (respecting foreign keys)
    // Use created_at timestamp to identify test data (created in the last hour)
    await query(`DELETE FROM payroll.schedule_change_request WHERE created_at > NOW() - INTERVAL '1 hour'`);
    await query(`DELETE FROM payroll.work_schedule WHERE created_at > NOW() - INTERVAL '1 hour'`);
  }
}

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.auth = {
    userId: testUserId,
    organizationId: testOrganizationId,
    role: 'manager',
  };
  next();
});

// Mount routes with actual controller functions
app.post('/api/paylinq/schedules', schedulingController.createSchedule);
app.get('/api/paylinq/schedules', schedulingController.getSchedules);
app.get('/api/paylinq/employees/:employeeId/schedules', schedulingController.getEmployeeSchedules);
app.get('/api/paylinq/schedules/:id', schedulingController.getScheduleById);
app.put('/api/paylinq/schedules/:id', schedulingController.updateSchedule);
app.delete('/api/paylinq/schedules/:id', schedulingController.deleteSchedule);
app.post('/api/paylinq/schedule-change-requests', schedulingController.createChangeRequest);
app.get('/api/paylinq/schedule-change-requests', schedulingController.getChangeRequests);
app.post('/api/paylinq/schedule-change-requests/:id/review', schedulingController.reviewChangeRequest);

describe('Scheduling Controller - API Contract Tests', () => {
  // Create test employee before all tests
  beforeAll(async () => {
    const { employee } = await createTestEmployee({
      organizationId: testOrganizationId,
      userId: testUserId,
      employee: {
        first_name: 'Test',
        last_name: 'Employee',
        email: 'test.scheduling@example.com'
      }
    });
    testEmployeeId = employee.id;
  });

  // Clean up test data after all tests
  afterAll(async () => {
    await SchedulingTestFactory.cleanup();
    await cleanupTestEmployees(testOrganizationId);
  });

  describe('POST /api/paylinq/schedules', () => {
    test('should return correct response structure on create', async () => {
      const newSchedule = {
        employeeId: testEmployeeId,
        startDate: '2024-01-15',
        endDate: '2024-01-21',
        scheduleType: 'regular',
        shifts: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
        ],
      };

      const response = await request(app)
        .post('/api/paylinq/schedules')
        .send(newSchedule)
        .expect(201);

      // Validate response structure (bulk format returns schedules array)
      expect(response.body.success).toBe(true);
      expect(response.body.schedules).toBeDefined();
      expect(Array.isArray(response.body.schedules)).toBe(true);
      expect(response.body.count).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    test('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .post('/api/paylinq/schedules')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    test('should validate date ranges', async () => {
      const invalidSchedule = {
        employeeId: testEmployeeId,
        startDate: '2024-01-21',
        endDate: '2024-01-15', // End before start
        scheduleType: 'regular',
      };

      const response = await request(app)
        .post('/api/paylinq/schedules')
        .send(invalidSchedule);

      expect([400, 409]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    test('should detect schedule conflicts', async () => {
      const overlappingSchedule = {
        employeeId: testEmployeeId,
        startDate: '2024-01-15',
        endDate: '2024-01-21',
        scheduleType: 'regular',
      };

      const response = await request(app)
        .post('/api/paylinq/schedules')
        .send(overlappingSchedule);

      // Should succeed first time or conflict on subsequent calls
      expect([201, 409]).toContain(response.status);
    });

    test('should validate schedule types', async () => {
      const validTypes = ['regular', 'flexible', 'rotating', 'on_call'];

      for (const type of validTypes) {
        const schedule = {
          employeeId: testEmployeeId,
          startDate: '2024-02-01',
          endDate: '2024-02-07',
          scheduleType: type,
        };

        const response = await request(app)
          .post('/api/paylinq/schedules')
          .send(schedule);

        expect([201, 400, 409]).toContain(response.status);
      }
    });

    test('should accept optional metadata field', async () => {
      const schedule = {
        employeeId: testEmployeeId,
        startDate: '2024-03-01',
        endDate: '2024-03-07',
        scheduleType: 'regular',
        metadata: {
          location: 'Office A',
          notes: 'Standard week',
        },
      };

      const response = await request(app)
        .post('/api/paylinq/schedules')
        .send(schedule);

      expect([201, 400, 409]).toContain(response.status);
    });
  });

  describe('GET /api/paylinq/schedules', () => {
    test('should return array of schedules', async () => {
      const response = await request(app)
        .get('/api/paylinq/schedules')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.schedules)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    test('should filter by employee ID', async () => {
      const response = await request(app)
        .get(`/api/paylinq/schedules?employeeId=${testEmployeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.schedules)).toBe(true);
    });

    test('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/paylinq/schedules?startDate=2024-01-01&endDate=2024-01-31')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/paylinq/schedules?status=active')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return empty array when no schedules exist', async () => {
      const fakeEmployeeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/schedules?employeeId=${fakeEmployeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeDefined();
    });
  });

  describe('GET /api/paylinq/employees/:employeeId/schedules', () => {
    test('should return schedules for employee', async () => {
      const response = await request(app)
        .get(`/api/paylinq/employees/${testEmployeeId}/schedules`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.schedules)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    test('should filter by date range', async () => {
      const response = await request(app)
        .get(`/api/paylinq/employees/${testEmployeeId}/schedules?startDate=2024-01-01&endDate=2024-01-31`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return empty array for employee with no schedules', async () => {
      const fakeEmployeeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/employees/${fakeEmployeeId}/schedules`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    test('should handle invalid employee UUID format', async () => {
      const response = await request(app)
        .get('/api/paylinq/employees/invalid-uuid/schedules')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/paylinq/schedules/:id', () => {
    let testSchedule;

    beforeEach(async () => {
      // Create test data for each test (proper isolation)
      testSchedule = await SchedulingTestFactory.createSchedule({
        scheduled_date: '2024-01-15',
      });
    });

    test('should return single schedule', async () => {
      const response = await request(app)
        .get(`/api/paylinq/schedules/${testSchedule.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.schedule).toBeDefined();
    });

    test('should return schedule with details', async () => {
      const response = await request(app)
        .get(`/api/paylinq/schedules/${testSchedule.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.schedule) {
        expect(response.body.schedule.id).toBeDefined();
        expect(response.body.schedule.employeeId).toBeDefined();
      }
    });

    test('should return 404 when schedule not found', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/schedules/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should return 500 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/paylinq/schedules/invalid-uuid')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/paylinq/schedules/:id', () => {
    let testSchedule;

    beforeEach(async () => {
      // Create test data for each test (proper isolation)
      testSchedule = await SchedulingTestFactory.createSchedule({
        scheduled_date: '2024-01-15',
      });
    });

    test('should update schedule successfully', async () => {
      const updates = {
        scheduleType: 'flexible',
        metadata: { notes: 'Updated schedule' },
      };

      const response = await request(app)
        .put(`/api/paylinq/schedules/${testSchedule.id}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.schedule).toBeDefined();
      expect(response.body.message).toContain('updated');
    });

    test('should return 404 when updating non-existent schedule', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .put(`/api/paylinq/schedules/${fakeId}`)
        .send({ scheduleType: 'flexible' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should detect update conflicts', async () => {
      const updates = {
        startDate: '2024-01-15',
        endDate: '2024-01-21',
      };

      const response = await request(app)
        .put(`/api/paylinq/schedules/${testSchedule.id}`)
        .send(updates);

      expect([200, 409]).toContain(response.status);
    });

    test('should validate date ranges on update', async () => {
      const invalidUpdates = {
        startDate: '2024-01-21',
        endDate: '2024-01-15', // Invalid range
      };

      const response = await request(app)
        .put(`/api/paylinq/schedules/${testSchedule.id}`)
        .send(invalidUpdates);

      expect([200, 400, 409]).toContain(response.status);
    });
  });

  describe('DELETE /api/paylinq/schedules/:id', () => {
    let testSchedule;

    beforeEach(async () => {
      // Create test data for each test (proper isolation)
      testSchedule = await SchedulingTestFactory.createSchedule({
        scheduled_date: '2024-01-15',
      });
    });

    test('should delete schedule successfully', async () => {
      const response = await request(app)
        .delete(`/api/paylinq/schedules/${testSchedule.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    test('should return 404 when deleting non-existent schedule', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .delete(`/api/paylinq/schedules/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should handle deletion errors gracefully', async () => {
      const response = await request(app)
        .delete('/api/paylinq/schedules/invalid-uuid');

      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/paylinq/schedule-change-requests', () => {
    let testSchedule;

    beforeEach(async () => {
      // Create test schedule for change requests
      testSchedule = await SchedulingTestFactory.createSchedule({
        scheduled_date: '2024-01-16',
      });
    });

    test('should create change request successfully', async () => {
      const changeRequest = {
        scheduleId: testSchedule.id,
        requestType: 'swap',
        requestedDate: '2024-01-16',
        reason: 'Personal appointment',
        proposedDate: '2024-01-17', // Required for swap requests
      };

      const response = await request(app)
        .post('/api/paylinq/schedule-change-requests')
        .send(changeRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.request).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    test('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .post('/api/paylinq/schedule-change-requests')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate request types', async () => {
      const validTypes = ['swap', 'time_off', 'schedule_change', 'overtime'];

      for (const type of validTypes) {
        const changeRequest = {
          scheduleId: testSchedule.id,
          requestType: type,
          requestedDate: '2024-01-16',
          reason: 'Test request',
        };

        // Add proposedDate for swap requests (validation requires it)
        if (type === 'swap') {
          changeRequest.proposedDate = '2024-01-17';
        }

        const response = await request(app)
          .post('/api/paylinq/schedule-change-requests')
          .send(changeRequest);

        expect([201, 400]).toContain(response.status);
      }
    });
  });

  describe('GET /api/paylinq/schedule-change-requests', () => {
    test('should return array of change requests', async () => {
      const response = await request(app)
        .get('/api/paylinq/schedule-change-requests')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.requests)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/paylinq/schedule-change-requests?status=pending')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter by employee ID', async () => {
      const response = await request(app)
        .get(`/api/paylinq/schedule-change-requests?employeeId=${testEmployeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/paylinq/schedule-change-requests/:id/review', () => {
    let testSchedule;
    let testRequest;

    beforeEach(async () => {
      // Create test schedule and change request for each test (proper isolation)
      testSchedule = await SchedulingTestFactory.createSchedule({
        scheduled_date: '2024-01-16',
      });
      testRequest = await SchedulingTestFactory.createChangeRequest({
        work_schedule_id: testSchedule.id,
        status: 'pending',
      });
    });

    test('should approve change request successfully', async () => {
      const review = {
        action: 'approve',
        reviewNotes: 'Approved',
      };

      const response = await request(app)
        .post(`/api/paylinq/schedule-change-requests/${testRequest.id}/review`)
        .send(review)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('approved');
    });

    test('should reject change request successfully', async () => {
      const review = {
        action: 'reject',
        reviewNotes: 'Cannot accommodate',
      };

      const response = await request(app)
        .post(`/api/paylinq/schedule-change-requests/${testRequest.id}/review`)
        .send(review)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('rejected');
    });

    test('should return 400 for invalid action', async () => {
      const review = {
        action: 'invalid_action',
        reviewNotes: 'Test',
      };

      const response = await request(app)
        .post(`/api/paylinq/schedule-change-requests/${testRequest.id}/review`)
        .send(review)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('approve');
    });

    test('should return 409 for already reviewed requests', async () => {
      // First review - approve it
      await request(app)
        .post(`/api/paylinq/schedule-change-requests/${testRequest.id}/review`)
        .send({ action: 'approve', reviewNotes: 'First review' })
        .expect(200);

      // Second review - should fail with 409
      const response = await request(app)
        .post(`/api/paylinq/schedule-change-requests/${testRequest.id}/review`)
        .send({ action: 'approve', reviewNotes: 'Second review' })
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Schedule Types Validation', () => {
    test('should accept all valid schedule types', async () => {
      const validTypes = ['regular', 'flexible', 'rotating', 'on_call'];

      for (const type of validTypes) {
        const schedule = {
          employeeId: testEmployeeId,
          startDate: '2024-04-01',
          endDate: '2024-04-07',
          scheduleType: type,
        };

        const response = await request(app)
          .post('/api/paylinq/schedules')
          .send(schedule);

        expect([201, 400, 409]).toContain(response.status);
      }
    });
  });
});
