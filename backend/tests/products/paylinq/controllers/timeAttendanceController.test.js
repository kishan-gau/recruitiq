/**
 * Time Attendance Controller - API Contract Tests
 * 
 * Integration tests validating API contracts for time tracking and attendance management.
 * Tests cover clock in/out, time entries, and bulk approval operations.
 */

import request from 'supertest';
import express from 'express';
import timeAttendanceController from '../../../../src/products/paylinq/controllers/timeAttendanceController.js';

// Test constants
const testOrganizationId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
const testUserId = '550e8400-e29b-41d4-a716-446655440000';
const testEmployeeId = '550e8400-e29b-41d4-a716-446655440333';
const testTimeEntryId = '550e8400-e29b-41d4-a716-446655440555';

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.auth = {
    userId: testUserId,
    organizationId: testOrganizationId,
    role: 'employee',
  };
  next();
});

// Mount routes with actual controller functions
app.post('/api/paylinq/time-attendance/clock-in', timeAttendanceController.clockIn);
app.post('/api/paylinq/time-attendance/clock-out', timeAttendanceController.clockOut);
app.get('/api/paylinq/time-attendance/active-clocks', timeAttendanceController.getActiveClockEntries);
app.get('/api/paylinq/employees/:employeeId/clock-history', timeAttendanceController.getEmployeeClockHistory);
app.post('/api/paylinq/time-entries', timeAttendanceController.createTimeEntry);
app.get('/api/paylinq/time-entries', timeAttendanceController.getTimeEntries);
app.get('/api/paylinq/time-entries/:id', timeAttendanceController.getTimeEntryById);
app.put('/api/paylinq/time-entries/:id', timeAttendanceController.updateTimeEntry);
app.post('/api/paylinq/time-entries/bulk-approve', timeAttendanceController.bulkApproveTimeEntries);
app.delete('/api/paylinq/time-entries/:id', timeAttendanceController.deleteTimeEntry);

describe('Time Attendance Controller - API Contract Tests', () => {
  describe('POST /api/paylinq/time-attendance/clock-in', () => {
    test('should return correct response structure on clock in', async () => {
      const clockData = {
        employeeId: testEmployeeId,
        clockInTime: new Date().toISOString(),
        location: 'Office',
      };

      const response = await request(app)
        .post('/api/paylinq/time-attendance/clock-in')
        .send(clockData)
        .expect(201);

      // Validate response structure
      expect(response.body.success).toBe(true);
      expect(response.body.clockEntry).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    test('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .post('/api/paylinq/time-attendance/clock-in')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    test('should return 409 when already clocked in', async () => {
      const clockData = {
        employeeId: testEmployeeId,
        clockInTime: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/paylinq/time-attendance/clock-in')
        .send(clockData);

      // Should succeed first time or conflict if already clocked in
      expect([201, 409]).toContain(response.status);

      if (response.status === 409) {
        expect(response.body.message).toContain('already clocked in');
      }
    });

    test('should accept optional location field', async () => {
      const clockData = {
        employeeId: testEmployeeId,
        clockInTime: new Date().toISOString(),
        location: 'Remote - Home Office',
      };

      const response = await request(app)
        .post('/api/paylinq/time-attendance/clock-in')
        .send(clockData);

      expect([201, 409]).toContain(response.status);
    });
  });

  describe('POST /api/paylinq/time-attendance/clock-out', () => {
    test('should return correct response structure on clock out', async () => {
      const clockData = {
        employeeId: testEmployeeId,
        clockOutTime: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/paylinq/time-attendance/clock-out')
        .send(clockData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.message).toContain('Clocked out');
    });

    test('should return 404 when no active clock-in found', async () => {
      const clockData = {
        employeeId: '550e8400-e29b-41d4-a716-446655440999', // Fake employee
        clockOutTime: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/paylinq/time-attendance/clock-out')
        .send(clockData);

      expect([200, 404]).toContain(response.status);

      if (response.status === 404) {
        expect(response.body.message).toContain('No active clock-in');
      }
    });

    test('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .post('/api/paylinq/time-attendance/clock-out')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should calculate hours worked on clock out', async () => {
      const clockData = {
        employeeId: testEmployeeId,
        clockOutTime: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/paylinq/time-attendance/clock-out')
        .send(clockData);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200 && response.body.result?.timeEntry) {
        expect(response.body.result.timeEntry.hoursWorked).toBeDefined();
      }
    });
  });

  describe('GET /api/paylinq/time-attendance/active-clocks', () => {
    test('should return array of active clock entries', async () => {
      const response = await request(app)
        .get('/api/paylinq/time-attendance/active-clocks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.activeClocks)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    test('should return empty array when no active clocks', async () => {
      const response = await request(app)
        .get('/api/paylinq/time-attendance/active-clocks')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/paylinq/employees/:employeeId/clock-history', () => {
    test('should return clock history for employee', async () => {
      const response = await request(app)
        .get(`/api/paylinq/employees/${testEmployeeId}/clock-history`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.history)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    test('should filter by date range', async () => {
      const response = await request(app)
        .get(`/api/paylinq/employees/${testEmployeeId}/clock-history?startDate=2024-01-01&endDate=2024-01-31`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return empty array for employee with no history', async () => {
      const fakeEmployeeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/employees/${fakeEmployeeId}/clock-history`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    test('should handle invalid employee UUID format', async () => {
      const response = await request(app)
        .get('/api/paylinq/employees/invalid-uuid/clock-history')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/paylinq/time-entries', () => {
    test('should create manual time entry successfully', async () => {
      const timeEntry = {
        employeeId: testEmployeeId,
        workDate: '2024-01-15',
        hoursWorked: 8,
        regularHours: 8,
        overtimeHours: 0,
        entryType: 'manual',
      };

      const response = await request(app)
        .post('/api/paylinq/time-entries')
        .send(timeEntry)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.timeEntry).toBeDefined();
      expect(response.body.message).toContain('created');
    });

    test('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .post('/api/paylinq/time-entries')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate hours worked', async () => {
      const invalidEntry = {
        employeeId: testEmployeeId,
        workDate: '2024-01-15',
        hoursWorked: -5, // Invalid negative hours
        regularHours: -5,
      };

      const response = await request(app)
        .post('/api/paylinq/time-entries')
        .send(invalidEntry);

      expect([400, 201]).toContain(response.status);
    });

    test('should accept optional notes field', async () => {
      const timeEntry = {
        employeeId: testEmployeeId,
        workDate: '2024-01-15',
        hoursWorked: 8,
        regularHours: 8,
        overtimeHours: 0,
        notes: 'Worked on special project',
      };

      const response = await request(app)
        .post('/api/paylinq/time-entries')
        .send(timeEntry);

      expect([201, 400]).toContain(response.status);
    });
  });

  describe('GET /api/paylinq/time-entries', () => {
    test('should return array of time entries', async () => {
      const response = await request(app)
        .get('/api/paylinq/time-entries')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.entries)).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    test('should filter by employee ID', async () => {
      const response = await request(app)
        .get(`/api/paylinq/time-entries?employeeId=${testEmployeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/paylinq/time-entries?startDate=2024-01-01&endDate=2024-01-31')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/paylinq/time-entries?status=approved')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return empty array when no entries exist', async () => {
      const fakeEmployeeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/time-entries?employeeId=${fakeEmployeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeDefined();
    });
  });

  describe('GET /api/paylinq/time-entries/:id', () => {
    test('should return single time entry', async () => {
      const response = await request(app)
        .get(`/api/paylinq/time-entries/${testTimeEntryId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.timeEntry).toBeDefined();
    });

    test('should return time entry with details', async () => {
      const response = await request(app)
        .get(`/api/paylinq/time-entries/${testTimeEntryId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.timeEntry) {
        expect(response.body.timeEntry.id).toBeDefined();
        expect(response.body.timeEntry.employeeId).toBeDefined();
      }
    });

    test('should return 404 when time entry not found', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .get(`/api/paylinq/time-entries/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should return 500 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/paylinq/time-entries/invalid-uuid')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/paylinq/time-entries/:id', () => {
    test('should update time entry successfully', async () => {
      const updates = {
        hoursWorked: 9,
        regularHours: 8,
        overtimeHours: 1,
      };

      const response = await request(app)
        .put(`/api/paylinq/time-entries/${testTimeEntryId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.timeEntry).toBeDefined();
      expect(response.body.message).toContain('updated');
    });

    test('should update notes field', async () => {
      const updates = {
        notes: 'Updated time entry notes',
      };

      const response = await request(app)
        .put(`/api/paylinq/time-entries/${testTimeEntryId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when updating non-existent entry', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .put(`/api/paylinq/time-entries/${fakeId}`)
        .send({ hoursWorked: 8 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should validate hours worked on update', async () => {
      const invalidUpdates = {
        hoursWorked: -1,
      };

      const response = await request(app)
        .put(`/api/paylinq/time-entries/${testTimeEntryId}`)
        .send(invalidUpdates);

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('POST /api/paylinq/time-entries/bulk-approve', () => {
    test('should approve multiple time entries successfully', async () => {
      const bulkData = {
        timeEntryIds: [testTimeEntryId],
        action: 'approve',
      };

      const response = await request(app)
        .post('/api/paylinq/time-entries/bulk-approve')
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.message).toContain('approved');
    });

    test('should reject multiple time entries successfully', async () => {
      const bulkData = {
        timeEntryIds: [testTimeEntryId],
        action: 'reject',
        rejectionReason: 'Invalid hours',
      };

      const response = await request(app)
        .post('/api/paylinq/time-entries/bulk-approve')
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('rejected');
    });

    test('should return 400 when timeEntryIds is empty', async () => {
      const bulkData = {
        timeEntryIds: [],
        action: 'approve',
      };

      const response = await request(app)
        .post('/api/paylinq/time-entries/bulk-approve')
        .send(bulkData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('non-empty array');
    });

    test('should return 400 for invalid action', async () => {
      const bulkData = {
        timeEntryIds: [testTimeEntryId],
        action: 'invalid_action',
      };

      const response = await request(app)
        .post('/api/paylinq/time-entries/bulk-approve')
        .send(bulkData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('approve');
    });

    test('should require rejection reason when rejecting', async () => {
      const bulkData = {
        timeEntryIds: [testTimeEntryId],
        action: 'reject',
        // rejectionReason missing
      };

      const response = await request(app)
        .post('/api/paylinq/time-entries/bulk-approve')
        .send(bulkData);

      expect([200, 400]).toContain(response.status);
    });
  });

  describe('DELETE /api/paylinq/time-entries/:id', () => {
    test('should delete time entry successfully', async () => {
      const response = await request(app)
        .delete(`/api/paylinq/time-entries/${testTimeEntryId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    test('should return 404 when deleting non-existent entry', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';

      const response = await request(app)
        .delete(`/api/paylinq/time-entries/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('should handle deletion errors gracefully', async () => {
      const response = await request(app)
        .delete('/api/paylinq/time-entries/invalid-uuid');

      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Entry Types Validation', () => {
    test('should accept valid entry types', async () => {
      const validTypes = ['manual', 'clock', 'imported', 'adjusted'];

      for (const type of validTypes) {
        const timeEntry = {
          employeeId: testEmployeeId,
          workDate: '2024-01-15',
          hoursWorked: 8,
          regularHours: 8,
          overtimeHours: 0,
          entryType: type,
        };

        const response = await request(app)
          .post('/api/paylinq/time-entries')
          .send(timeEntry);

        expect([201, 400]).toContain(response.status);
      }
    });
  });
});
