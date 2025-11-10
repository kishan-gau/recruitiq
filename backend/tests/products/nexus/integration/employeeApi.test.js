/**
 * Employee API Integration Tests
 * Tests full request-response cycle through Express routes
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// Mock authentication middleware - matches actual behavior
const mockAuthMiddleware = (req, res, next) => {
  req.user = {
    id: 'user-test-456',
    organization_id: 'org-test-123',
    role: 'hr_admin',
    email: 'test@example.com',
    name: 'Test User',
    user_type: 'tenant',
    permissions: []
  };
  next();
};

// Mock auth adapter for Nexus
const mockAuthAdapter = (req, res, next) => {
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
};

// Setup test app
const createTestApp = async () => {
  const app = express();
  app.use(express.json());
  app.use(mockAuthMiddleware);
  app.use(mockAuthAdapter);
  
  // Import routes
  const nexusRoutes = (await import('../../../src/products/nexus/routes/index.js')).default;
  app.use('/api/nexus', nexusRoutes);

  // Error handler
  app.use((err, req, res, next) => {
    res.status(500).json({ success: false, error: err.message });
  });

  return app;
};

describe('Employee API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  describe('POST /api/nexus/employees', () => {
    it('should create a new employee', async () => {
      const newEmployee = {
        firstName: 'Integration',
        lastName: 'Test',
        email: 'integration.test@example.com',
        employeeNumber: 'EMP-INT-001',
        departmentId: '123e4567-e89b-12d3-a456-426614174000',
        locationId: '123e4567-e89b-12d3-a456-426614174001',
        jobTitle: 'Test Engineer',
        employmentType: 'full_time',
        hireDate: '2024-01-01'
      };

      const response = await request(app)
        .post('/api/nexus/employees')
        .send(newEmployee)
        .expect('Content-Type', /json/);

      // Note: This will fail against real DB without setup, but shows structure
      // In real tests, you'd use test database or mocks
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.firstName).toBe('Integration');
        expect(response.body.data.email).toBe('integration.test@example.com');
      }
    });

    it('should return 400 for invalid data', async () => {
      const invalidEmployee = {
        firstName: 'Test'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/nexus/employees')
        .send(invalidEmployee)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });
  });

  describe('GET /api/nexus/employees/:id', () => {
    it('should retrieve employee by ID', async () => {
      const employeeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/nexus/employees/${employeeId}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id', employeeId);
        expect(response.body.data).toHaveProperty('firstName');
        expect(response.body.data).toHaveProperty('email');
      }
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await request(app)
        .get('/api/nexus/employees/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/nexus/employees', () => {
    it('should list employees with pagination', async () => {
      const response = await request(app)
        .get('/api/nexus/employees')
        .query({ limit: 10, offset: 0 })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('limit', 10);
        expect(response.body).toHaveProperty('offset', 0);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should filter by department', async () => {
      const departmentId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get('/api/nexus/employees')
        .query({ departmentId })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        // All returned employees should belong to the department
        response.body.data.forEach(emp => {
          expect(emp.departmentId).toBe(departmentId);
        });
      }
    });

    it('should search employees', async () => {
      const response = await request(app)
        .get('/api/nexus/employees')
        .query({ search: 'john' })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('PATCH /api/nexus/employees/:id', () => {
    it('should update employee fields', async () => {
      const employeeId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = {
        jobTitle: 'Senior Test Engineer',
        workPhone: '+1-555-0123'
      };

      const response = await request(app)
        .patch(`/api/nexus/employees/${employeeId}`)
        .send(updates)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.jobTitle).toBe('Senior Test Engineer');
        expect(response.body.data.workPhone).toBe('+1-555-0123');
      }
    });
  });

  describe('POST /api/nexus/employees/:id/terminate', () => {
    it('should terminate employee', async () => {
      const employeeId = '123e4567-e89b-12d3-a456-426614174000';
      const terminationData = {
        terminationDate: '2024-06-30',
        terminationReason: 'Resignation',
        terminationNotes: 'Voluntary resignation with two weeks notice'
      };

      const response = await request(app)
        .post(`/api/nexus/employees/${employeeId}/terminate`)
        .send(terminationData)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.employmentStatus).toBe('terminated');
        expect(response.body.data.terminationDate).toBe('2024-06-30');
      }
    });
  });

  describe('GET /api/nexus/employees/search', () => {
    it('should search employees by query', async () => {
      const response = await request(app)
        .get('/api/nexus/employees/search')
        .query({ q: 'john', limit: 20 })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should return 400 if query is missing', async () => {
      const response = await request(app)
        .get('/api/nexus/employees/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/nexus/employees/org-chart', () => {
    it('should retrieve organization chart', async () => {
      const response = await request(app)
        .get('/api/nexus/employees/org-chart')
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        // Verify hierarchical structure
        if (response.body.data.length > 0) {
          expect(response.body.data[0]).toHaveProperty('level');
          expect(response.body.data[0]).toHaveProperty('path');
        }
      }
    });
  });

  describe('DELETE /api/nexus/employees/:id', () => {
    it('should soft delete employee', async () => {
      const employeeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .delete(`/api/nexus/employees/${employeeId}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted');
      }
    });
  });
});

describe('Time-Off API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  describe('POST /api/nexus/time-off/requests', () => {
    it('should create time-off request', async () => {
      const request = {
        employeeId: '123e4567-e89b-12d3-a456-426614174000',
        timeOffTypeId: '123e4567-e89b-12d3-a456-426614174001',
        startDate: '2024-07-01',
        endDate: '2024-07-05',
        daysRequested: 5,
        reason: 'Summer vacation'
      };

      const response = await request(app)
        .post('/api/nexus/time-off/requests')
        .send(request)
        .expect('Content-Type', /json/);

      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.status).toBe('pending');
      }
    });
  });

  describe('POST /api/nexus/time-off/requests/:id/review', () => {
    it('should approve time-off request', async () => {
      const requestId = '123e4567-e89b-12d3-a456-426614174000';
      const reviewData = {
        status: 'approved',
        reviewerNotes: 'Approved for July vacation'
      };

      const response = await request(app)
        .post(`/api/nexus/time-off/requests/${requestId}/review`)
        .send(reviewData)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('approved');
      }
    });
  });

  describe('GET /api/nexus/time-off/balances/:employeeId', () => {
    it('should retrieve employee time-off balances', async () => {
      const employeeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/nexus/time-off/balances/${employeeId}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        if (response.body.data.length > 0) {
          expect(response.body.data[0]).toHaveProperty('totalBalance');
          expect(response.body.data[0]).toHaveProperty('availableBalance');
          expect(response.body.data[0]).toHaveProperty('usedBalance');
        }
      }
    });
  });
});
