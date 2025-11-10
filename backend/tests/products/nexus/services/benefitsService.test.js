/**
 * BenefitsService Tests
 * Unit tests for benefits service
 */

import BenefitsService from '../../../../src/products/nexus/services/benefitsService.js';
import BenefitsRepository from '../../../../src/products/nexus/repositories/benefitsRepository.js';
import eventBus from '../../../../src/shared/events/eventBus.js';

describe('BenefitsService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      createPlan: jest.fn(),
      findPlanById: jest.fn(),
      findAllPlans: jest.fn(),
      updatePlan: jest.fn(),
      createEnrollment: jest.fn(),
      findEnrollmentById: jest.fn(),
      findEnrollmentsByEmployee: jest.fn(),
      findEnrollmentsByPlan: jest.fn(),
      updateEnrollment: jest.fn()
    };

    BenefitsRepository.mockImplementation(() => mockRepository);
    service = new BenefitsService();
    jest.clearAllMocks();
  });

  describe('createPlan', () => {
    it('should create a benefits plan with valid data', async () => {
      const mockPlan = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Health Insurance Premium',
        type: 'health',
        description: 'Comprehensive health coverage',
        cost: 500,
        isActive: true
      };

      mockRepository.createPlan.mockResolvedValue(mockPlan);

      const data = {
        name: 'Health Insurance Premium',
        type: 'health',
        description: 'Comprehensive health coverage',
        cost: 500,
        isActive: true
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const userId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await service.createPlan(data, organizationId, userId);

      expect(mockRepository.createPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Health Insurance Premium',
          type: 'health',
          organizationId
        })
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        'nexus.benefits.plan.created',
        expect.objectContaining({
          planId: mockPlan.id,
          organizationId,
          userId
        })
      );
      expect(result).toEqual(mockPlan);
    });

    it('should validate required fields', async () => {
      const data = {
        type: 'health'
        // Missing name
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const userId = '123e4567-e89b-12d3-a456-426614174002';

      await expect(
        service.createPlan(data, organizationId, userId)
      ).rejects.toThrow('Validation error');
    });

    it('should validate plan type', async () => {
      const data = {
        name: 'Invalid Plan',
        type: 'invalid_type',
        cost: 100
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const userId = '123e4567-e89b-12d3-a456-426614174002';

      await expect(
        service.createPlan(data, organizationId, userId)
      ).rejects.toThrow('Validation error');
    });

    it('should validate cost is positive', async () => {
      const data = {
        name: 'Health Plan',
        type: 'health',
        cost: -100
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const userId = '123e4567-e89b-12d3-a456-426614174002';

      await expect(
        service.createPlan(data, organizationId, userId)
      ).rejects.toThrow('Validation error');
    });
  });

  describe('getPlan', () => {
    it('should get plan by ID', async () => {
      const mockPlan = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Health Insurance',
        type: 'health'
      };

      mockRepository.findPlanById.mockResolvedValue(mockPlan);

      const planId = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      const result = await service.getPlan(planId, organizationId);

      expect(mockRepository.findPlanById).toHaveBeenCalledWith(planId, organizationId);
      expect(result).toEqual(mockPlan);
    });

    it('should throw error if plan not found', async () => {
      mockRepository.findPlanById.mockResolvedValue(null);

      const planId = '123e4567-e89b-12d3-a456-426614174000';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      await expect(
        service.getPlan(planId, organizationId)
      ).rejects.toThrow('Benefits plan not found');
    });
  });

  describe('updatePlan', () => {
    it('should update plan', async () => {
      const existingPlan = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Health Insurance',
        isActive: true
      };

      const updatedPlan = {
        ...existingPlan,
        name: 'Premium Health Insurance',
        cost: 600
      };

      mockRepository.findPlanById.mockResolvedValue(existingPlan);
      mockRepository.updatePlan.mockResolvedValue(updatedPlan);

      const planId = '123e4567-e89b-12d3-a456-426614174000';
      const data = { name: 'Premium Health Insurance', cost: 600 };
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const userId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await service.updatePlan(planId, data, organizationId, userId);

      expect(mockRepository.updatePlan).toHaveBeenCalledWith(planId, data, organizationId);
      expect(eventBus.publish).toHaveBeenCalledWith(
        'nexus.benefits.plan.updated',
        expect.any(Object)
      );
      expect(result).toEqual(updatedPlan);
    });

    it('should throw error if plan not found', async () => {
      mockRepository.findPlanById.mockResolvedValue(null);

      const planId = '123e4567-e89b-12d3-a456-426614174000';
      const data = { name: 'Updated Plan' };
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const userId = '123e4567-e89b-12d3-a456-426614174002';

      await expect(
        service.updatePlan(planId, data, organizationId, userId)
      ).rejects.toThrow('Benefits plan not found');
    });
  });

  describe('enrollEmployee', () => {
    it('should enroll employee in plan', async () => {
      const mockPlan = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Health Insurance',
        isActive: true
      };

      const mockEnrollment = {
        id: '123e4567-e89b-12d3-a456-426614174010',
        planId: mockPlan.id,
        employeeId: '123e4567-e89b-12d3-a456-426614174003',
        status: 'active',
        startDate: '2024-01-01'
      };

      mockRepository.findPlanById.mockResolvedValue(mockPlan);
      mockRepository.findEnrollmentsByEmployee.mockResolvedValue([]);
      mockRepository.createEnrollment.mockResolvedValue(mockEnrollment);

      const data = {
        planId: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: '123e4567-e89b-12d3-a456-426614174003',
        startDate: '2024-01-01',
        employeeContribution: 100
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const userId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await service.enrollEmployee(data, organizationId, userId);

      expect(mockRepository.createEnrollment).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        'nexus.benefits.enrollment.created',
        expect.any(Object)
      );
      expect(result).toEqual(mockEnrollment);
    });

    it('should throw error if plan is inactive', async () => {
      const mockPlan = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Health Insurance',
        isActive: false
      };

      mockRepository.findPlanById.mockResolvedValue(mockPlan);

      const data = {
        planId: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: '123e4567-e89b-12d3-a456-426614174003',
        startDate: '2024-01-01'
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const userId = '123e4567-e89b-12d3-a456-426614174002';

      await expect(
        service.enrollEmployee(data, organizationId, userId)
      ).rejects.toThrow('Cannot enroll in inactive plan');
    });

    it('should throw error if employee already enrolled', async () => {
      const mockPlan = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Health Insurance',
        isActive: true
      };

      const existingEnrollment = {
        id: '123e4567-e89b-12d3-a456-426614174010',
        planId: mockPlan.id,
        employeeId: '123e4567-e89b-12d3-a456-426614174003',
        status: 'active'
      };

      mockRepository.findPlanById.mockResolvedValue(mockPlan);
      mockRepository.findEnrollmentsByEmployee.mockResolvedValue([existingEnrollment]);

      const data = {
        planId: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: '123e4567-e89b-12d3-a456-426614174003',
        startDate: '2024-01-01'
      };
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const userId = '123e4567-e89b-12d3-a456-426614174002';

      await expect(
        service.enrollEmployee(data, organizationId, userId)
      ).rejects.toThrow('Employee already enrolled in this plan');
    });
  });

  describe('terminateEnrollment', () => {
    it('should terminate enrollment', async () => {
      const mockEnrollment = {
        id: '123e4567-e89b-12d3-a456-426614174010',
        planId: '123e4567-e89b-12d3-a456-426614174000',
        employeeId: '123e4567-e89b-12d3-a456-426614174003',
        status: 'active'
      };

      const terminatedEnrollment = {
        ...mockEnrollment,
        status: 'terminated',
        endDate: '2024-06-30'
      };

      mockRepository.findEnrollmentById.mockResolvedValue(mockEnrollment);
      mockRepository.updateEnrollment.mockResolvedValue(terminatedEnrollment);

      const enrollmentId = '123e4567-e89b-12d3-a456-426614174010';
      const endDate = '2024-06-30';
      const reason = 'Employment ended';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const userId = '123e4567-e89b-12d3-a456-426614174002';

      const result = await service.terminateEnrollment(
        enrollmentId,
        endDate,
        reason,
        organizationId,
        userId
      );

      expect(mockRepository.updateEnrollment).toHaveBeenCalledWith(
        enrollmentId,
        expect.objectContaining({
          status: 'terminated',
          endDate,
          terminationReason: reason
        }),
        organizationId
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        'nexus.benefits.enrollment.terminated',
        expect.any(Object)
      );
      expect(result).toEqual(terminatedEnrollment);
    });

    it('should throw error if enrollment not found', async () => {
      mockRepository.findEnrollmentById.mockResolvedValue(null);

      const enrollmentId = '123e4567-e89b-12d3-a456-426614174010';
      const endDate = '2024-06-30';
      const reason = 'Employment ended';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const userId = '123e4567-e89b-12d3-a456-426614174002';

      await expect(
        service.terminateEnrollment(enrollmentId, endDate, reason, organizationId, userId)
      ).rejects.toThrow('Enrollment not found');
    });

    it('should throw error if enrollment already terminated', async () => {
      const mockEnrollment = {
        id: '123e4567-e89b-12d3-a456-426614174010',
        status: 'terminated',
        endDate: '2024-05-31'
      };

      mockRepository.findEnrollmentById.mockResolvedValue(mockEnrollment);

      const enrollmentId = '123e4567-e89b-12d3-a456-426614174010';
      const endDate = '2024-06-30';
      const reason = 'Employment ended';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const userId = '123e4567-e89b-12d3-a456-426614174002';

      await expect(
        service.terminateEnrollment(enrollmentId, endDate, reason, organizationId, userId)
      ).rejects.toThrow('Enrollment already terminated');
    });
  });

  describe('getEmployeeEnrollments', () => {
    it('should get all enrollments for employee', async () => {
      const mockEnrollments = [
        {
          id: '123e4567-e89b-12d3-a456-426614174010',
          planId: '123e4567-e89b-12d3-a456-426614174000',
          employeeId: '123e4567-e89b-12d3-a456-426614174003',
          status: 'active'
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174011',
          planId: '123e4567-e89b-12d3-a456-426614174001',
          employeeId: '123e4567-e89b-12d3-a456-426614174003',
          status: 'active'
        }
      ];

      mockRepository.findEnrollmentsByEmployee.mockResolvedValue(mockEnrollments);

      const employeeId = '123e4567-e89b-12d3-a456-426614174003';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';

      const result = await service.getEmployeeEnrollments(employeeId, organizationId);

      expect(mockRepository.findEnrollmentsByEmployee).toHaveBeenCalledWith(
        employeeId,
        organizationId,
        {}
      );
      expect(result).toEqual(mockEnrollments);
    });

    it('should filter by status', async () => {
      mockRepository.findEnrollmentsByEmployee.mockResolvedValue([]);

      const employeeId = '123e4567-e89b-12d3-a456-426614174003';
      const organizationId = '123e4567-e89b-12d3-a456-426614174001';
      const filters = { status: 'active' };

      await service.getEmployeeEnrollments(employeeId, organizationId, filters);

      expect(mockRepository.findEnrollmentsByEmployee).toHaveBeenCalledWith(
        employeeId,
        organizationId,
        { status: 'active' }
      );
    });
  });
});
