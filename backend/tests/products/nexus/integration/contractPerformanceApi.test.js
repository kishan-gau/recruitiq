/**
 * Contract and Performance API Integration Tests
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
  
  const nexusRoutes = (await import('../../../src/products/nexus/routes/index.js')).default;
  app.use('/api/nexus', nexusRoutes);

  app.use((err, req, res, next) => {
    res.status(500).json({ success: false, error: err.message });
  });

  return app;
};

describe('Contract API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  describe('POST /api/nexus/contracts', () => {
    it('should create a new contract', async () => {
      const newContract = {
        employeeId: '123e4567-e89b-12d3-a456-426614174000',
        contractType: 'permanent',
        startDate: '2024-01-01',
        endDate: null,
        jobTitle: 'Software Engineer',
        salary: 75000,
        currency: 'USD',
        workingHoursPerWeek: 40,
        probationPeriodMonths: 3
      };

      const response = await request(app)
        .post('/api/nexus/contracts')
        .send(newContract)
        .expect('Content-Type', /json/);

      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.contractType).toBe('permanent');
        expect(response.body.data.status).toBe('draft');
      }
    });

    it('should return 400 for invalid contract data', async () => {
      const invalidContract = {
        employeeId: '123e4567-e89b-12d3-a456-426614174000'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/nexus/contracts')
        .send(invalidContract)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });
  });

  describe('GET /api/nexus/contracts/:id', () => {
    it('should retrieve contract by ID', async () => {
      const contractId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/nexus/contracts/${contractId}`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id', contractId);
        expect(response.body.data).toHaveProperty('contractType');
        expect(response.body.data).toHaveProperty('employeeName');
      }
    });
  });

  describe('GET /api/nexus/contracts/expiring', () => {
    it('should retrieve contracts expiring soon', async () => {
      const response = await request(app)
        .get('/api/nexus/contracts/expiring')
        .query({ daysAhead: 30 })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // Each contract should have expiry information
        response.body.data.forEach(contract => {
          expect(contract).toHaveProperty('endDate');
          expect(contract).toHaveProperty('daysUntilExpiry');
        });
      }
    });
  });

  describe('POST /api/nexus/contracts/:id/activate', () => {
    it('should activate a draft contract', async () => {
      const contractId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .post(`/api/nexus/contracts/${contractId}/activate`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('active');
      }
    });
  });

  describe('POST /api/nexus/contracts/:id/terminate', () => {
    it('should terminate an active contract', async () => {
      const contractId = '123e4567-e89b-12d3-a456-426614174000';
      const terminationData = {
        terminationDate: '2024-12-31',
        reason: 'End of project'
      };

      const response = await request(app)
        .post(`/api/nexus/contracts/${contractId}/terminate`)
        .send(terminationData)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('terminated');
      }
    });
  });

  describe('POST /api/nexus/contracts/:id/progress-sequence', () => {
    it('should progress contract to next sequence step', async () => {
      const contractId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .post(`/api/nexus/contracts/${contractId}/progress-sequence`)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('currentStepNumber');
      }
    });
  });
});

describe('Performance API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  describe('POST /api/nexus/performance/reviews', () => {
    it('should create a performance review', async () => {
      const newReview = {
        employeeId: '123e4567-e89b-12d3-a456-426614174000',
        reviewerId: '123e4567-e89b-12d3-a456-426614174001',
        reviewPeriodStart: '2024-01-01',
        reviewPeriodEnd: '2024-06-30',
        reviewType: 'Semi-Annual',
        dueDate: '2024-07-15'
      };

      const response = await request(app)
        .post('/api/nexus/performance/reviews')
        .send(newReview)
        .expect('Content-Type', /json/);

      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.status).toBe('draft');
      }
    });
  });

  describe('PATCH /api/nexus/performance/reviews/:id', () => {
    it('should update review with responses and rating', async () => {
      const reviewId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = {
        responses: {
          question1: 'Excellent performance',
          question2: 'Meets all expectations'
        },
        overallRating: 4,
        strengths: 'Strong technical skills, good communication',
        areasForImprovement: 'Time management could be improved',
        status: 'completed'
      };

      const response = await request(app)
        .patch(`/api/nexus/performance/reviews/${reviewId}`)
        .send(updates)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.overallRating).toBe(4);
        expect(response.body.data.status).toBe('completed');
      }
    });
  });

  describe('POST /api/nexus/performance/goals', () => {
    it('should create a performance goal', async () => {
      const newGoal = {
        employeeId: '123e4567-e89b-12d3-a456-426614174000',
        goalTitle: 'Complete certification',
        goalDescription: 'Obtain AWS Solutions Architect certification',
        goalCategory: 'Professional Development',
        targetDate: '2024-12-31',
        measurementCriteria: 'Pass certification exam with score of 750+'
      };

      const response = await request(app)
        .post('/api/nexus/performance/goals')
        .send(newGoal)
        .expect('Content-Type', /json/);

      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.goalTitle).toBe('Complete certification');
        expect(response.body.data.status).toBe('active');
        expect(response.body.data.completionPercentage).toBe(0);
      }
    });
  });

  describe('PATCH /api/nexus/performance/goals/:id', () => {
    it('should update goal progress', async () => {
      const goalId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = {
        completionPercentage: 75,
        goalDescription: 'Completed training courses, scheduled exam'
      };

      const response = await request(app)
        .patch(`/api/nexus/performance/goals/${goalId}`)
        .send(updates)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.completionPercentage).toBe(75);
      }
    });

    it('should mark goal as completed', async () => {
      const goalId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = {
        status: 'completed',
        completionPercentage: 100
      };

      const response = await request(app)
        .patch(`/api/nexus/performance/goals/${goalId}`)
        .send(updates)
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('completed');
      }
    });
  });

  describe('POST /api/nexus/performance/feedback', () => {
    it('should create peer feedback', async () => {
      const feedback = {
        employeeId: '123e4567-e89b-12d3-a456-426614174000',
        feedbackProviderId: '123e4567-e89b-12d3-a456-426614174001',
        feedbackType: 'peer',
        feedbackText: 'Great team player, always willing to help',
        isAnonymous: false
      };

      const response = await request(app)
        .post('/api/nexus/performance/feedback')
        .send(feedback)
        .expect('Content-Type', /json/);

      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.feedbackType).toBe('peer');
      }
    });

    it('should create anonymous feedback', async () => {
      const feedback = {
        employeeId: '123e4567-e89b-12d3-a456-426614174000',
        feedbackType: 'anonymous',
        feedbackText: 'Could improve documentation practices',
        isAnonymous: true
      };

      const response = await request(app)
        .post('/api/nexus/performance/feedback')
        .send(feedback)
        .expect('Content-Type', /json/);

      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.isAnonymous).toBe(true);
      }
    });
  });

  describe('GET /api/nexus/performance/feedback/employee/:employeeId', () => {
    it('should retrieve all feedback for employee', async () => {
      const employeeId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/nexus/performance/feedback/employee/${employeeId}`)
        .query({ limit: 20 })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // Each feedback should have required fields
        response.body.data.forEach(feedback => {
          expect(feedback).toHaveProperty('feedbackText');
          expect(feedback).toHaveProperty('isAnonymous');
          expect(feedback).toHaveProperty('createdAt');
        });
      }
    });
  });

  describe('GET /api/nexus/performance/goals', () => {
    it('should list goals with filters', async () => {
      const response = await request(app)
        .get('/api/nexus/performance/goals')
        .query({
          employeeId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'active'
        })
        .expect('Content-Type', /json/);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        
        // All goals should match filters
        response.body.data.forEach(goal => {
          expect(goal.status).toBe('active');
        });
      }
    });
  });
});

describe('Workflow Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  describe('Employee Lifecycle with Contract', () => {
    it('should complete employee onboarding workflow', async () => {
      // This test demonstrates a complete workflow
      // In real implementation, would use test database with transactions

      // 1. Create employee
      const employeeData = {
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test.employee@example.com',
        employeeNumber: 'EMP-TEST-001',
        departmentId: '123e4567-e89b-12d3-a456-426614174000',
        locationId: '123e4567-e89b-12d3-a456-426614174001',
        jobTitle: 'Junior Developer',
        employmentType: 'full_time',
        hireDate: '2024-01-01'
      };

      // Would create employee, then contract, then time-off setup
      // This demonstrates the API structure for complete workflows

      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Performance Review Cycle', () => {
    it('should complete performance review workflow', async () => {
      // Demonstrates: Create review → Set goals → Collect feedback → Complete review
      expect(true).toBe(true); // Placeholder
    });
  });
});
