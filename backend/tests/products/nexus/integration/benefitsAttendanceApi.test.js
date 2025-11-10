/**
 * Benefits & Attendance API Integration Tests
 * Tests for benefits and attendance endpoints
 */

import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../../../../src/server.js';
import pool from '../../../../src/config/database.js';

// Mock the database
jest.mock('../../../../src/config/database.js');

// Mock authentication middleware - MUST match actual middleware behavior
jest.mock('../../../../src/middleware/auth.js', () => ({
  authenticate: (req, res, next) => {
    // Actual middleware sets req.user, NOT req.auth
    req.user = {
      id: '123e4567-e89b-12d3-a456-426614174010',
      organization_id: '123e4567-e89b-12d3-a456-426614174011',
      role: 'admin',
      email: 'test@example.com',
      name: 'Test User',
      user_type: 'tenant',
      permissions: []
    };
    next();
  }
}));

// Mock auth adapter middleware for Nexus
jest.mock('../../../../src/products/nexus/middleware/authAdapter.js', () => ({
  adaptAuthForNexus: (req, res, next) => {
    if (req.user) {
      req.auth = {
        userId: req.user.id,
        organizationId: req.user.organization_id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        permissions: req.user.permissions,
        userType: req.user.user_type
      };
    }
    next();
  }
}));

describe('Benefits & Attendance API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== BENEFITS ENDPOINTS ==========

  describe('POST /api/nexus/benefits/plans', () => {
    it('should create a new benefits plan', async () => {
      const mockPlan = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Health Insurance Premium',
        type: 'health',
        description: 'Comprehensive health coverage',
        cost: 500,
        is_active: true,
        organization_id: '123e4567-e89b-12d3-a456-426614174011',
        created_at: '2024-01-15T10:00:00Z'
      };

      pool.query.mockResolvedValue({ rows: [mockPlan] });

      const response = await request(app)
        .post('/api/nexus/benefits/plans')
        .send({
          name: 'Health Insurance Premium',
          type: 'health',
          description: 'Comprehensive health coverage',
          cost: 500,
          isActive: true
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', 'Health Insurance Premium');
    });

    it('should return 400 for invalid plan data', async () => {
      const response = await request(app)
        .post('/api/nexus/benefits/plans')
        .send({
          type: 'health'
          // Missing required name field
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/nexus/benefits/plans', () => {
    it('should get all benefits plans', async () => {
      const mockPlans = [
        {
          id: '1',
          name: 'Health Insurance',
          type: 'health',
          cost: 500,
          is_active: true,
          organization_id: '123e4567-e89b-12d3-a456-426614174011'
        },
        {
          id: '2',
          name: '401k Plan',
          type: 'retirement',
          cost: 0,
          is_active: true,
          organization_id: '123e4567-e89b-12d3-a456-426614174011'
        }
      ];

      pool.query.mockResolvedValue({ rows: mockPlans });

      const response = await request(app)
        .get('/api/nexus/benefits/plans');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter plans by type', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/nexus/benefits/plans')
        .query({ type: 'health' });

      expect(response.status).toBe(200);
      expect(pool.query).toHaveBeenCalled();
    });
  });

  describe('POST /api/nexus/benefits/enrollments', () => {
    it('should enroll employee in benefits plan', async () => {
      const mockPlan = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Health Insurance',
        is_active: true,
        organization_id: '123e4567-e89b-12d3-a456-426614174011'
      };

      const mockEnrollment = {
        id: '123e4567-e89b-12d3-a456-426614174020',
        plan_id: mockPlan.id,
        employee_id: '123e4567-e89b-12d3-a456-426614174003',
        status: 'active',
        start_date: '2024-01-01',
        employee_contribution: 100,
        organization_id: '123e4567-e89b-12d3-a456-426614174011',
        created_at: '2024-01-15T10:00:00Z'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockPlan] }) // findPlanById
        .mockResolvedValueOnce({ rows: [] }) // findEnrollmentsByEmployee
        .mockResolvedValueOnce({ rows: [mockEnrollment] }); // createEnrollment

      const response = await request(app)
        .post('/api/nexus/benefits/enrollments')
        .send({
          planId: mockPlan.id,
          employeeId: '123e4567-e89b-12d3-a456-426614174003',
          startDate: '2024-01-01',
          employeeContribution: 100
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'active');
    });

    it('should return 400 when enrolling in inactive plan', async () => {
      const mockPlan = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Health Insurance',
        is_active: false,
        organization_id: '123e4567-e89b-12d3-a456-426614174011'
      };

      pool.query.mockResolvedValue({ rows: [mockPlan] });

      const response = await request(app)
        .post('/api/nexus/benefits/enrollments')
        .send({
          planId: mockPlan.id,
          employeeId: '123e4567-e89b-12d3-a456-426614174003',
          startDate: '2024-01-01'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/nexus/benefits/enrollments/:id/terminate', () => {
    it('should terminate benefits enrollment', async () => {
      const mockEnrollment = {
        id: '123e4567-e89b-12d3-a456-426614174020',
        status: 'active',
        organization_id: '123e4567-e89b-12d3-a456-426614174011'
      };

      const mockTerminated = {
        ...mockEnrollment,
        status: 'terminated',
        end_date: '2024-06-30'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockEnrollment] }) // findEnrollmentById
        .mockResolvedValueOnce({ rows: [mockTerminated] }); // updateEnrollment

      const response = await request(app)
        .post('/api/nexus/benefits/enrollments/123e4567-e89b-12d3-a456-426614174020/terminate')
        .send({
          endDate: '2024-06-30',
          reason: 'Employment ended'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'terminated');
    });
  });

  // ========== ATTENDANCE ENDPOINTS ==========

  describe('POST /api/nexus/attendance/clock-in', () => {
    it('should clock in employee', async () => {
      const mockAttendance = {
        id: '123e4567-e89b-12d3-a456-426614174030',
        employee_id: '123e4567-e89b-12d3-a456-426614174003',
        clock_in: '2024-01-15T09:00:00Z',
        location: 'Office HQ',
        organization_id: '123e4567-e89b-12d3-a456-426614174011',
        created_at: '2024-01-15T09:00:00Z'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [] }) // getCurrentClockIn
        .mockResolvedValueOnce({ rows: [mockAttendance] }); // clockIn

      const response = await request(app)
        .post('/api/nexus/attendance/clock-in')
        .send({
          employeeId: '123e4567-e89b-12d3-a456-426614174003',
          clockIn: '2024-01-15T09:00:00Z',
          location: 'Office HQ'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('clockIn');
      expect(response.body.data).toHaveProperty('location', 'Office HQ');
    });

    it('should return 400 when employee already clocked in', async () => {
      const existingClockIn = {
        id: '123e4567-e89b-12d3-a456-426614174030',
        employee_id: '123e4567-e89b-12d3-a456-426614174003',
        clock_in: '2024-01-15T08:00:00Z',
        clock_out: null
      };

      pool.query.mockResolvedValue({ rows: [existingClockIn] });

      const response = await request(app)
        .post('/api/nexus/attendance/clock-in')
        .send({
          employeeId: '123e4567-e89b-12d3-a456-426614174003',
          clockIn: '2024-01-15T09:00:00Z'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/nexus/attendance/clock-out', () => {
    it('should clock out employee', async () => {
      const mockUpdated = {
        id: '123e4567-e89b-12d3-a456-426614174030',
        employee_id: '123e4567-e89b-12d3-a456-426614174003',
        clock_in: '2024-01-15T09:00:00Z',
        clock_out: '2024-01-15T17:00:00Z',
        hours_worked: 8.0,
        organization_id: '123e4567-e89b-12d3-a456-426614174011'
      };

      pool.query.mockResolvedValue({ rows: [mockUpdated] });

      const response = await request(app)
        .post('/api/nexus/attendance/clock-out')
        .send({
          employeeId: '123e4567-e89b-12d3-a456-426614174003',
          clockOut: '2024-01-15T17:00:00Z'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('clockOut');
      expect(response.body.data).toHaveProperty('hoursWorked', 8.0);
    });

    it('should return 400 when no active clock-in', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/nexus/attendance/clock-out')
        .send({
          employeeId: '123e4567-e89b-12d3-a456-426614174003',
          clockOut: '2024-01-15T17:00:00Z'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/nexus/attendance/manual', () => {
    it('should create manual attendance record', async () => {
      const mockAttendance = {
        id: '123e4567-e89b-12d3-a456-426614174030',
        employee_id: '123e4567-e89b-12d3-a456-426614174003',
        clock_in: '2024-01-15T09:00:00Z',
        clock_out: '2024-01-15T17:00:00Z',
        hours_worked: 8.0,
        notes: 'Manual entry - system issue',
        organization_id: '123e4567-e89b-12d3-a456-426614174011'
      };

      pool.query.mockResolvedValue({ rows: [mockAttendance] });

      const response = await request(app)
        .post('/api/nexus/attendance/manual')
        .send({
          employeeId: '123e4567-e89b-12d3-a456-426614174003',
          clockIn: '2024-01-15T09:00:00Z',
          clockOut: '2024-01-15T17:00:00Z',
          hoursWorked: 8.0,
          notes: 'Manual entry - system issue'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('hoursWorked', 8.0);
      expect(response.body.data).toHaveProperty('notes');
    });

    it('should return 400 for invalid time range', async () => {
      const response = await request(app)
        .post('/api/nexus/attendance/manual')
        .send({
          employeeId: '123e4567-e89b-12d3-a456-426614174003',
          clockIn: '2024-01-15T17:00:00Z',
          clockOut: '2024-01-15T09:00:00Z', // Before clock in
          hoursWorked: 8.0
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/nexus/attendance/employee/:employeeId/summary', () => {
    it('should get attendance summary for employee', async () => {
      const mockRecords = [
        {
          id: '1',
          employee_id: '123e4567-e89b-12d3-a456-426614174003',
          clock_in: '2024-01-15T09:00:00Z',
          clock_out: '2024-01-15T17:00:00Z',
          hours_worked: 8.0
        },
        {
          id: '2',
          employee_id: '123e4567-e89b-12d3-a456-426614174003',
          clock_in: '2024-01-16T09:00:00Z',
          clock_out: '2024-01-16T17:00:00Z',
          hours_worked: 8.0
        }
      ];

      pool.query.mockResolvedValue({ rows: mockRecords });

      const response = await request(app)
        .get('/api/nexus/attendance/employee/123e4567-e89b-12d3-a456-426614174003/summary')
        .query({
          startDate: '2024-01-15',
          endDate: '2024-01-16'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalDays', 2);
      expect(response.body.data).toHaveProperty('totalHours', 16);
    });

    it('should return 400 when date range not provided', async () => {
      const response = await request(app)
        .get('/api/nexus/attendance/employee/123e4567-e89b-12d3-a456-426614174003/summary');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/nexus/attendance/employee/:employeeId', () => {
    it('should get all attendance records for employee', async () => {
      const mockRecords = [
        {
          id: '1',
          employee_id: '123e4567-e89b-12d3-a456-426614174003',
          clock_in: '2024-01-15T09:00:00Z',
          hours_worked: 8.0
        },
        {
          id: '2',
          employee_id: '123e4567-e89b-12d3-a456-426614174003',
          clock_in: '2024-01-16T09:00:00Z',
          hours_worked: 8.0
        }
      ];

      pool.query.mockResolvedValue({ rows: mockRecords });

      const response = await request(app)
        .get('/api/nexus/attendance/employee/123e4567-e89b-12d3-a456-426614174003')
        .query({ limit: 50, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });
});
