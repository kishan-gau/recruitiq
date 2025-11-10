/**
 * Department & Location API Integration Tests
 * Tests for department and location management endpoints
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

describe('Department & Location API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== DEPARTMENT ENDPOINTS ==========

  describe('POST /api/nexus/departments', () => {
    it('should create a new department', async () => {
      const mockDepartment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Engineering',
        code: 'ENG',
        location_id: '123e4567-e89b-12d3-a456-426614174001',
        manager_id: '123e4567-e89b-12d3-a456-426614174002',
        description: 'Engineering department',
        organization_id: '123e4567-e89b-12d3-a456-426614174011',
        created_at: '2024-01-15T10:00:00Z'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [] }) // findByCode
        .mockResolvedValueOnce({ rows: [mockDepartment] }); // create

      const response = await request(app)
        .post('/api/nexus/departments')
        .send({
          name: 'Engineering',
          code: 'ENG',
          locationId: '123e4567-e89b-12d3-a456-426614174001',
          managerId: '123e4567-e89b-12d3-a456-426614174002',
          description: 'Engineering department'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', 'Engineering');
      expect(response.body.data).toHaveProperty('code', 'ENG');
    });

    it('should return 400 for duplicate department code', async () => {
      const existingDept = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        code: 'ENG'
      };

      pool.query.mockResolvedValue({ rows: [existingDept] });

      const response = await request(app)
        .post('/api/nexus/departments')
        .send({
          name: 'Engineering',
          code: 'ENG'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/nexus/departments', () => {
    it('should list all departments', async () => {
      const mockDepartments = [
        {
          id: '1',
          department_name: 'Engineering',
          department_code: 'ENG',
          location_id: null,
          manager_id: null,
          employee_count: 15,
          organization_id: '123e4567-e89b-12d3-a456-426614174011'
        },
        {
          id: '2',
          department_name: 'Sales',
          department_code: 'SALES',
          location_id: null,
          manager_id: null,
          employee_count: 8,
          organization_id: '123e4567-e89b-12d3-a456-426614174011'
        }
      ];

      pool.query.mockResolvedValue({ rows: mockDepartments });

      const response = await request(app)
        .get('/api/nexus/departments');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('departmentName', 'Engineering');
    });

    it('should filter departments by locationId', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/nexus/departments')
        .query({ locationId: 'loc-123' });

      expect(response.status).toBe(200);
      expect(pool.query).toHaveBeenCalled();
      // Verify the query included the filter
      const queryCall = pool.query.mock.calls[0];
      expect(queryCall[1]).toContain('loc-123');
    });

    it('should support pagination', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/nexus/departments')
        .query({ limit: 10, offset: 20 });

      expect(response.status).toBe(200);
      const queryCall = pool.query.mock.calls[0];
      expect(queryCall[1]).toContain(10);
      expect(queryCall[1]).toContain(20);
    });
  });

  describe('GET /api/nexus/departments/:id/hierarchy', () => {
    it('should get department hierarchy', async () => {
      const mockHierarchy = [
        {
          id: '1',
          name: 'Engineering',
          code: 'ENG',
          parent_id: null,
          level: 0,
          path: 'Engineering'
        },
        {
          id: '2',
          name: 'Backend Team',
          code: 'ENG-BE',
          parent_id: '1',
          level: 1,
          path: 'Engineering > Backend Team'
        }
      ];

      pool.query.mockResolvedValue({ rows: mockHierarchy });

      const response = await request(app)
        .get('/api/nexus/departments/1/hierarchy');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('level', 0);
      expect(response.body.data[1]).toHaveProperty('level', 1);
    });
  });

  describe('GET /api/nexus/departments/structure/full', () => {
    it('should get full organization structure', async () => {
      const mockDepartments = [
        {
          id: '1',
          name: 'Engineering',
          code: 'ENG',
          parent_id: null,
          employee_count: 25
        },
        {
          id: '2',
          name: 'Sales',
          code: 'SALES',
          parent_id: null,
          employee_count: 15
        },
        {
          id: '3',
          name: 'Backend',
          code: 'ENG-BE',
          parent_id: '1',
          employee_count: 10
        }
      ];

      pool.query.mockResolvedValue({ rows: mockDepartments });

      const response = await request(app)
        .get('/api/nexus/departments/structure/full');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('DELETE /api/nexus/departments/:id', () => {
    it('should delete department with no employees', async () => {
      const mockDepartment = {
        id: '1',
        name: 'Engineering',
        employee_count: 0,
        organization_id: '123e4567-e89b-12d3-a456-426614174011'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockDepartment] }) // findById
        .mockResolvedValueOnce({ rows: [] }) // getEmployees
        .mockResolvedValueOnce({ rowCount: 1 }); // delete

      const response = await request(app)
        .delete('/api/nexus/departments/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when department has employees', async () => {
      const mockDepartment = {
        id: '1',
        name: 'Engineering'
      };

      const mockEmployees = [
        { id: '1', firstName: 'John' },
        { id: '2', firstName: 'Jane' }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: [mockDepartment] })
        .mockResolvedValueOnce({ rows: mockEmployees });

      const response = await request(app)
        .delete('/api/nexus/departments/1');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('employees');
    });
  });

  // ========== LOCATION ENDPOINTS ==========

  describe('POST /api/nexus/locations', () => {
    it('should create a new location', async () => {
      const mockLocation = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Headquarters',
        code: 'HQ',
        type: 'headquarters',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
          country: 'USA'
        },
        timezone: 'America/Los_Angeles',
        capacity: 200,
        is_active: true,
        organization_id: '123e4567-e89b-12d3-a456-426614174011',
        created_at: '2024-01-15T10:00:00Z'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [] }) // findByCode
        .mockResolvedValueOnce({ rows: [mockLocation] }); // create

      const response = await request(app)
        .post('/api/nexus/locations')
        .send({
          name: 'Headquarters',
          code: 'HQ',
          type: 'headquarters',
          address: {
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94105',
            country: 'USA'
          },
          timezone: 'America/Los_Angeles',
          capacity: 200
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', 'Headquarters');
      expect(response.body.data).toHaveProperty('code', 'HQ');
    });

    it('should return 400 for duplicate location code', async () => {
      const existingLocation = {
        id: '1',
        code: 'HQ'
      };

      pool.query.mockResolvedValue({ rows: [existingLocation] });

      const response = await request(app)
        .post('/api/nexus/locations')
        .send({
          name: 'Headquarters',
          code: 'HQ',
          type: 'headquarters'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/nexus/locations', () => {
    it('should get all locations', async () => {
      const mockLocations = [
        {
          id: '1',
          name: 'Headquarters',
          code: 'HQ',
          type: 'headquarters',
          employee_count: 45,
          is_active: true
        },
        {
          id: '2',
          name: 'Branch Office',
          code: 'BR01',
          type: 'branch',
          employee_count: 12,
          is_active: true
        }
      ];

      pool.query.mockResolvedValue({ rows: mockLocations });

      const response = await request(app)
        .get('/api/nexus/locations');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter locations by type', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/nexus/locations')
        .query({ type: 'headquarters' });

      expect(response.status).toBe(200);
      expect(pool.query).toHaveBeenCalled();
    });
  });

  describe('GET /api/nexus/locations/code/:code', () => {
    it('should find location by code', async () => {
      const mockLocation = {
        id: '1',
        name: 'Headquarters',
        code: 'HQ',
        type: 'headquarters'
      };

      pool.query.mockResolvedValue({ rows: [mockLocation] });

      const response = await request(app)
        .get('/api/nexus/locations/code/HQ');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('code', 'HQ');
    });

    it('should return 404 for non-existent code', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/nexus/locations/code/NOTFOUND');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/nexus/locations/:id/stats', () => {
    it('should get location statistics', async () => {
      const mockLocation = {
        id: '1',
        name: 'Headquarters'
      };

      const mockStats = {
        location_id: '1',
        employee_count: 45,
        department_count: 8,
        active_employee_count: 42,
        capacity: 200,
        utilization_rate: 0.21
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockLocation] })
        .mockResolvedValueOnce({ rows: [mockStats] });

      const response = await request(app)
        .get('/api/nexus/locations/1/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('employeeCount', 45);
      expect(response.body.data).toHaveProperty('utilizationRate', 0.21);
    });
  });

  describe('GET /api/nexus/locations/stats/all', () => {
    it('should get statistics for all locations', async () => {
      const mockStats = [
        {
          location_id: '1',
          location_name: 'Headquarters',
          employee_count: 45,
          department_count: 8
        },
        {
          location_id: '2',
          location_name: 'Branch',
          employee_count: 12,
          department_count: 3
        }
      ];

      pool.query.mockResolvedValue({ rows: mockStats });

      const response = await request(app)
        .get('/api/nexus/locations/stats/all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('DELETE /api/nexus/locations/:id', () => {
    it('should delete location with no dependencies', async () => {
      const mockLocation = {
        id: '1',
        name: 'Branch Office'
      };

      const mockStats = {
        employee_count: 0,
        department_count: 0
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockLocation] }) // findById
        .mockResolvedValueOnce({ rows: [mockStats] }) // getLocationStats
        .mockResolvedValueOnce({ rowCount: 1 }); // delete

      const response = await request(app)
        .delete('/api/nexus/locations/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 when location has employees', async () => {
      const mockLocation = {
        id: '1',
        name: 'Headquarters'
      };

      const mockStats = {
        employee_count: 45,
        department_count: 0
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockLocation] })
        .mockResolvedValueOnce({ rows: [mockStats] });

      const response = await request(app)
        .delete('/api/nexus/locations/1');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('employee');
    });
  });
});
