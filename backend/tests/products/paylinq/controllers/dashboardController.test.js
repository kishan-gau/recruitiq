/**
 * Dashboard Controller Tests
 * 
 * API Contract tests for dashboard HTTP endpoints.
 * Validates response structures match frontend expectations.
 * 
 * Tests would have caught:
 * - ❌ 400 Bad Request (missing organization_id)
 * - ❌ Cannot read properties of undefined (missing summary object)
 * - ❌ Response structure mismatches
 */

import request from 'supertest';
import express from 'express';
import dashboardController from '../../../../src/products/paylinq/controllers/dashboardController.js';

// Note: Using real services to test full integration

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = {
    id: 'user-123',
    organization_id: '9ee50aee-76c3-46ce-87ed-005c6dd893ef',
    email: 'admin@recruitiq.com',
    role: 'admin'
  };
  next();
});

// Mount dashboard routes
app.get('/api/paylinq/dashboard', dashboardController.getDashboardOverview);
app.get('/api/paylinq/dashboard/payroll-stats', dashboardController.getPayrollStats);
app.get('/api/paylinq/dashboard/employee-stats', dashboardController.getEmployeeStats);
app.get('/api/paylinq/dashboard/recent-activity', dashboardController.getRecentActivity);

describe('Dashboard Controller - API Contract Tests', () => {

  // ============================================================================
  // GET /api/paylinq/dashboard - Dashboard Overview
  // ============================================================================
  
  describe('GET /api/paylinq/dashboard', () => {
    test('should return correct response structure with summary object', async () => {
      const response = await request(app)
        .get('/api/paylinq/dashboard')
        .expect(200);

      // Validate response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // CRITICAL: Validate summary object exists (would have caught the TypeError)
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary).toHaveProperty('totalWorkers');
      expect(response.body.data.summary).toHaveProperty('activeWorkers');
      expect(response.body.data.summary).toHaveProperty('workersTrend');
      expect(response.body.data.summary).toHaveProperty('pendingApprovals');
      expect(response.body.data.summary).toHaveProperty('daysUntilPayroll');
      expect(response.body.data.summary).toHaveProperty('monthlyCost');
      expect(response.body.data.summary).toHaveProperty('costTrend');

      // Validate other required objects
      expect(response.body.data).toHaveProperty('payroll');
      expect(response.body.data).toHaveProperty('employees');
      expect(response.body.data).toHaveProperty('timesheets');
      expect(response.body.data).toHaveProperty('upcomingPayrolls');
      expect(response.body.data).toHaveProperty('recentActivity');
      expect(response.body.data).toHaveProperty('pendingApprovals');
    });

    test('should return 400 when user has no organization_id', async () => {
      // Create separate app without organization_id
      const appNoOrg = express();
      appNoOrg.use(express.json());
      appNoOrg.use((req, res, next) => {
        req.user = {
          id: 'user-123',
          organization_id: null, // Platform user with no org
          email: 'platform@recruitiq.com',
          role: 'platform_admin'
        };
        next();
      });
      appNoOrg.get('/api/paylinq/dashboard', dashboardController.getDashboardOverview);

      const response = await request(appNoOrg)
        .get('/api/paylinq/dashboard')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Organization ID is required');
    });

    test('should handle empty database gracefully (returns 0 not null)', async () => {
      // Use a unique organization ID that has no data
      const appEmptyOrg = express();
      appEmptyOrg.use(express.json());
      appEmptyOrg.use((req, res, next) => {
        req.user = {
          id: 'user-empty-test',
          organization_id: '00000000-0000-0000-0000-000000000001', // Empty org
          email: 'empty@test.com',
          role: 'admin'
        };
        next();
      });
      appEmptyOrg.get('/api/paylinq/dashboard', dashboardController.getDashboardOverview);

      const response = await request(appEmptyOrg)
        .get('/api/paylinq/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Verify numbers are 0, not null or undefined
      expect(response.body.data.summary.totalWorkers).toBe(0);
      expect(response.body.data.summary.pendingApprovals).toBe(0);
      expect(response.body.data.summary.daysUntilPayroll).toBe(0);
      expect(response.body.data.summary.monthlyCost).toBe(0);
    });

    test('should accept period query parameter', async () => {
      const response = await request(app)
        .get('/api/paylinq/dashboard?period=60')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  // ============================================================================
  // GET /api/paylinq/dashboard/payroll-stats - Payroll Statistics
  // ============================================================================
  
  describe('GET /api/paylinq/dashboard/payroll-stats', () => {
    test('should return payroll statistics', async () => {
      const response = await request(app)
        .get('/api/paylinq/dashboard/payroll-stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should accept date range parameters', async () => {
      const response = await request(app)
        .get('/api/paylinq/dashboard/payroll-stats?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 400 when no organization_id', async () => {
      const appNoOrg = express();
      appNoOrg.use(express.json());
      appNoOrg.use((req, res, next) => {
        req.user = { id: 'user-123', organization_id: null };
        next();
      });
      appNoOrg.get('/api/paylinq/dashboard/payroll-stats', dashboardController.getPayrollStats);

      const response = await request(appNoOrg)
        .get('/api/paylinq/dashboard/payroll-stats')
        .expect(400);

      expect(response.body.message).toContain('Organization ID is required');
    });
  });

  // ============================================================================
  // GET /api/paylinq/dashboard/employee-stats - Employee Statistics
  // ============================================================================
  
  describe('GET /api/paylinq/dashboard/employee-stats', () => {
    test('should return employee statistics with correct structure', async () => {
      const response = await request(app)
        .get('/api/paylinq/dashboard/employee-stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalEmployees');
      expect(response.body.data).toHaveProperty('activeEmployees');
      expect(response.body.data).toHaveProperty('inactiveEmployees');
      expect(response.body.data).toHaveProperty('workerTypesCount');
      expect(response.body.data).toHaveProperty('workerTypeBreakdown');
      expect(Array.isArray(response.body.data.workerTypeBreakdown)).toBe(true);
    });
  });

  // ============================================================================
  // GET /api/paylinq/dashboard/recent-activity - Recent Activity
  // ============================================================================
  
  describe('GET /api/paylinq/dashboard/recent-activity', () => {
    test('should return recent activity list', async () => {
      const response = await request(app)
        .get('/api/paylinq/dashboard/recent-activity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should accept limit parameter', async () => {
      const response = await request(app)
        .get('/api/paylinq/dashboard/recent-activity?limit=25')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle empty activity list', async () => {
      const response = await request(app)
        .get('/api/paylinq/dashboard/recent-activity')
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});

