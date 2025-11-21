import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Create mock service as CLASS with arrow function methods
class MockBenefitsService {
  createPlan = jest.fn();
  getPlan = jest.fn();
  listPlans = jest.fn();
  updatePlan = jest.fn();
  enrollEmployee = jest.fn();
  updateEnrollment = jest.fn();
  terminateEnrollment = jest.fn();
  getEnrollment = jest.fn();
  getEmployeeEnrollments = jest.fn();
  getActiveEnrollments = jest.fn();
}

// Mock the service module BEFORE importing controller
jest.unstable_mockModule('../../../../src/products/nexus/services/benefitsService.js', () => ({
  default: MockBenefitsService
}));

// Mock logger
const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import controller AFTER mocking (dynamic import)
const { default: BenefitsController } = await import('../../../../src/products/nexus/controllers/benefitsController.js');

describe('BenefitsController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Create new controller instance (creates new MockBenefitsService)
    controller = new BenefitsController();

    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request
    mockReq = {
      user: {
        organizationId: 'org-123',
        userId: 'user-123'
      },
      params: {},
      query: {},
      body: {}
    };

    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('createPlan', () => {
    it('should create a benefit plan successfully', async () => {
      const planData = {
        planName: 'Health Insurance',
        planType: 'health',
        description: 'Comprehensive health coverage',
        coverageAmount: 50000
      };

      // Service returns DB format (snake_case)
      const createdPlan = {
        id: 'plan-123',
        plan_name: 'Health Insurance',
        plan_type: 'health',
        description: 'Comprehensive health coverage',
        coverage_amount: 50000,
        organization_id: 'org-123'
      };

      mockReq.body = planData;
      controller.service.createPlan.mockResolvedValue(createdPlan);

      await controller.createPlan(mockReq, mockRes);

      // Controller transforms API data (camelCase) to DB format (snake_case)
      expect(controller.service.createPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_name: 'Health Insurance'
        }),
        'org-123',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        plan: expect.objectContaining({
          planName: 'Health Insurance'  // Transformed back to camelCase by DTO
        })
      });
    });

    it('should handle errors during plan creation', async () => {
      mockReq.body = { planName: 'Test Plan' };
      controller.service.createPlan.mockRejectedValue(new Error('Validation failed'));

      await controller.createPlan(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed'
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getPlan', () => {
    it('should get a plan by ID successfully', async () => {
      // Service returns DB format (snake_case)
      const plan = {
        id: 'plan-123',
        plan_name: 'Health Insurance',
        plan_type: 'health'
      };

      mockReq.params = { id: 'plan-123' };
      controller.service.getPlan.mockResolvedValue(plan);

      await controller.getPlan(mockReq, mockRes);

      expect(controller.service.getPlan).toHaveBeenCalledWith('plan-123', 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        plan: expect.objectContaining({
          planName: 'Health Insurance'  // Transformed to camelCase by DTO
        })
      });
    });

    it('should return 404 when plan not found', async () => {
      mockReq.params = { id: 'plan-123' };
      controller.service.getPlan.mockRejectedValue(new Error('Benefit plan not found'));

      await controller.getPlan(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Benefit plan not found'
      });
    });

    it('should return 500 for other errors', async () => {
      mockReq.params = { id: 'plan-123' };
      controller.service.getPlan.mockRejectedValue(new Error('Database error'));

      await controller.getPlan(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('listPlans', () => {
    it('should list plans with filters', async () => {
      // Service returns DB format (snake_case)
      const plans = [
        { id: 'plan-1', plan_name: 'Health', plan_type: 'health' },
        { id: 'plan-2', plan_name: 'Dental', plan_type: 'dental' }
      ];

      mockReq.query = {
        planType: 'health',
        isActive: 'true',
        limit: '20',
        offset: '0'
      };

      controller.service.listPlans.mockResolvedValue({
        plans,
        total: 2,
        limit: 20,
        offset: 0
      });

      await controller.listPlans(mockReq, mockRes);

      expect(controller.service.listPlans).toHaveBeenCalledWith(
        { planType: 'health', isActive: true },
        'org-123',
        { limit: 20, offset: 0 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        plans: expect.arrayContaining([
          expect.objectContaining({ planName: 'Health' }),  // Transformed to camelCase
          expect.objectContaining({ planName: 'Dental' })
        ]),
        total: 2,
        limit: 20,
        offset: 0
      });
    });

    it('should use default pagination when not provided', async () => {
      mockReq.query = {};
      controller.service.listPlans.mockResolvedValue([]);

      await controller.listPlans(mockReq, mockRes);

      expect(controller.service.listPlans).toHaveBeenCalledWith(
        {},
        'org-123',
        { limit: 50, offset: 0 }
      );
    });

    it('should handle errors during listing', async () => {
      controller.service.listPlans.mockRejectedValue(new Error('Database error'));

      await controller.listPlans(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('updatePlan', () => {
    it('should update a plan successfully', async () => {
      const updateData = { planName: 'Updated Plan', contributionFrequency: 'monthly' };
      const updatedPlan = {
        id: 'plan-123',
        plan_name: 'Updated Plan',
        contribution_frequency: 'monthly'
      };

      mockReq.params = { id: 'plan-123' };
      mockReq.body = updateData;
      controller.service.updatePlan.mockResolvedValue(updatedPlan);

      await controller.updatePlan(mockReq, mockRes);

      // Controller transforms API data (camelCase) to DB format (snake_case)
      expect(controller.service.updatePlan).toHaveBeenCalledWith(
        'plan-123',
        expect.objectContaining({
          plan_name: 'Updated Plan',
          contribution_frequency: 'monthly'
        }),
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        plan: expect.objectContaining({
          id: 'plan-123'
        })
      });
    });

    it('should handle errors during update', async () => {
      mockReq.params = { id: 'plan-123' };
      mockReq.body = { planName: 'Updated' };
      controller.service.updatePlan.mockRejectedValue(new Error('Plan not found'));

      await controller.updatePlan(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Plan not found'
      });
    });
  });

  describe('enrollEmployee', () => {
    it('should enroll an employee successfully', async () => {
      const enrollmentData = {
        employeeId: 'emp-123',
        planId: 'plan-123',
        startDate: '2025-01-01',
        coverageAmount: 50000
      };

      const createdEnrollment = {
        id: 'enrollment-123',
        ...enrollmentData
      };

      mockReq.body = enrollmentData;
      controller.service.enrollEmployee.mockResolvedValue(createdEnrollment);

      await controller.enrollEmployee(mockReq, mockRes);

      expect(controller.service.enrollEmployee).toHaveBeenCalledWith(
        enrollmentData,
        'org-123',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        enrollment: createdEnrollment
      });
    });

    it('should handle errors during enrollment', async () => {
      mockReq.body = { employeeId: 'emp-123' };
      controller.service.enrollEmployee.mockRejectedValue(new Error('Invalid plan'));

      await controller.enrollEmployee(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid plan'
      });
    });
  });

  describe('updateEnrollment', () => {
    it('should update an enrollment successfully', async () => {
      const updateData = { coverageAmount: 75000 };
      const updatedEnrollment = {
        id: 'enrollment-123',
        coverageAmount: 75000
      };

      mockReq.params = { id: 'enrollment-123' };
      mockReq.body = updateData;
      controller.service.updateEnrollment.mockResolvedValue(updatedEnrollment);

      await controller.updateEnrollment(mockReq, mockRes);

      expect(controller.service.updateEnrollment).toHaveBeenCalledWith(
        'enrollment-123',
        updateData,
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        enrollment: updatedEnrollment
      });
    });

    it('should return 404 when enrollment not found', async () => {
      mockReq.params = { id: 'enrollment-123' };
      mockReq.body = { coverageAmount: 75000 };
      controller.service.updateEnrollment.mockRejectedValue(new Error('Enrollment not found'));

      await controller.updateEnrollment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Enrollment not found'
      });
    });

    it('should return 400 for other errors', async () => {
      mockReq.params = { id: 'enrollment-123' };
      mockReq.body = { coverageAmount: -1000 };
      controller.service.updateEnrollment.mockRejectedValue(new Error('Invalid amount'));

      await controller.updateEnrollment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid amount'
      });
    });
  });

  describe('terminateEnrollment', () => {
    it('should terminate an enrollment successfully', async () => {
      const terminatedEnrollment = {
        id: 'enrollment-123',
        status: 'terminated',
        endDate: '2025-12-31'
      };

      mockReq.params = { id: 'enrollment-123' };
      mockReq.body = {
        endDate: '2025-12-31',
        reason: 'Employee resignation'
      };

      controller.service.terminateEnrollment.mockResolvedValue(terminatedEnrollment);

      await controller.terminateEnrollment(mockReq, mockRes);

      expect(controller.service.terminateEnrollment).toHaveBeenCalledWith(
        'enrollment-123',
        '2025-12-31',
        'Employee resignation',
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        enrollment: terminatedEnrollment
      });
    });

    it('should handle errors during termination', async () => {
      mockReq.params = { id: 'enrollment-123' };
      mockReq.body = { endDate: '2025-12-31' };
      controller.service.terminateEnrollment.mockRejectedValue(new Error('Cannot terminate'));

      await controller.terminateEnrollment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot terminate'
      });
    });
  });

  describe('getEnrollment', () => {
    it('should get an enrollment by ID successfully', async () => {
      const enrollment = {
        id: 'enrollment-123',
        employeeId: 'emp-123',
        planId: 'plan-123'
      };

      mockReq.params = { id: 'enrollment-123' };
      controller.service.getEnrollment.mockResolvedValue(enrollment);

      await controller.getEnrollment(mockReq, mockRes);

      expect(controller.service.getEnrollment).toHaveBeenCalledWith('enrollment-123', 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        enrollment
      });
    });

    it('should return 404 when enrollment not found', async () => {
      mockReq.params = { id: 'enrollment-123' };
      controller.service.getEnrollment.mockRejectedValue(new Error('Enrollment not found'));

      await controller.getEnrollment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Enrollment not found'
      });
    });

    it('should return 500 for other errors', async () => {
      mockReq.params = { id: 'enrollment-123' };
      controller.service.getEnrollment.mockRejectedValue(new Error('Database error'));

      await controller.getEnrollment(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getEmployeeEnrollments', () => {
    it('should get all enrollments for an employee', async () => {
      const enrollments = [
        { id: 'enrollment-1', planName: 'Health' },
        { id: 'enrollment-2', planName: 'Dental' }
      ];

      mockReq.params = { employeeId: 'emp-123' };
      controller.service.getEmployeeEnrollments.mockResolvedValue(enrollments);

      await controller.getEmployeeEnrollments(mockReq, mockRes);

      expect(controller.service.getEmployeeEnrollments).toHaveBeenCalledWith('emp-123', 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        enrollments
      });
    });

    it('should handle errors when getting employee enrollments', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      controller.service.getEmployeeEnrollments.mockRejectedValue(new Error('Employee not found'));

      await controller.getEmployeeEnrollments(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Employee not found'
      });
    });
  });

  describe('getActiveEnrollments', () => {
    it('should get active enrollments with optional planId filter', async () => {
      const enrollments = [
        { id: 'enrollment-1', status: 'active' },
        { id: 'enrollment-2', status: 'active' }
      ];

      mockReq.query = { planId: 'plan-123' };
      controller.service.getActiveEnrollments.mockResolvedValue(enrollments);

      await controller.getActiveEnrollments(mockReq, mockRes);

      expect(controller.service.getActiveEnrollments).toHaveBeenCalledWith('org-123', 'plan-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        enrollments
      });
    });

    it('should get active enrollments without planId filter', async () => {
      const enrollments = [{ id: 'enrollment-1', status: 'active' }];

      mockReq.query = {};
      controller.service.getActiveEnrollments.mockResolvedValue(enrollments);

      await controller.getActiveEnrollments(mockReq, mockRes);

      expect(controller.service.getActiveEnrollments).toHaveBeenCalledWith('org-123', undefined);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        enrollments
      });
    });

    it('should handle errors when getting active enrollments', async () => {
      controller.service.getActiveEnrollments.mockRejectedValue(new Error('Query failed'));

      await controller.getActiveEnrollments(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Query failed'
      });
    });
  });
});
