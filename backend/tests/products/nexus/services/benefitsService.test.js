/**
 * BenefitsService Unit Tests
 * Tests business logic for employee benefits management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  query: mockQuery
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import service after mocks
const { default: BenefitsService } = await import('../../../../src/products/nexus/services/benefitsService.js');

describe('BenefitsService', () => {
  let service;
  const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = 'user-123e4567-e89b-12d3-a456-426614174000';
  const mockEmployeeId = 'emp-123e4567-e89b-12d3-a456-426614174000';
  const mockPlanId = 'plan-123e4567-e89b-12d3-a456-426614174000';
  const mockEnrollmentId = 'enr-123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BenefitsService();
  });

  describe('createPlan', () => {
    it('should create a benefit plan successfully', async () => {
      // Arrange
      const planData = {
        plan_name: 'Health Insurance',
        plan_type: 'health',
        description: 'Comprehensive health coverage',
        provider_name: 'Acme Insurance',
        employee_contribution: 100,
        employer_contribution: 200
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockPlanId, ...planData }] });

      // Act
      const result = await service.createPlan(planData, mockOrganizationId, mockUserId);

      // Assert
      expect(result.id).toBe(mockPlanId);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO hris.benefits_plan'),
        expect.any(Array),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should throw error when plan_name is missing', async () => {
      // Arrange
      const planData = { plan_type: 'health' };

      // Act & Assert
      await expect(
        service.createPlan(planData, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Plan name is required');
    });

    it('should throw error when plan_type is missing', async () => {
      // Arrange
      const planData = { plan_name: 'Health Plan' };

      // Act & Assert
      await expect(
        service.createPlan(planData, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Plan type is required');
    });

    it('should use default values for optional fields', async () => {
      // Arrange
      const planData = {
        plan_name: 'Basic Plan',
        plan_type: 'health'
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockPlanId }] });

      // Act
      await service.createPlan(planData, mockOrganizationId, mockUserId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          mockOrganizationId,
          'Basic Plan',
          'health',
          null, // description default
          null, // provider_name default
          null, // provider_contact default
          null, // policy_number default
          null, // coverage_start_date default
          null, // coverage_end_date default
          0, // employee_contribution default
          0, // employer_contribution default
          'monthly', // contribution_frequency default
          null, // eligibility_criteria default
          true, // is_active default
          mockUserId,
          mockUserId
        ]),
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('getPlan', () => {
    it('should return benefit plan by ID', async () => {
      // Arrange
      const mockPlan = {
        id: mockPlanId,
        plan_name: 'Health Insurance',
        plan_type: 'health'
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockPlan] });

      // Act
      const result = await service.getPlan(mockPlanId, mockOrganizationId);

      // Assert
      expect(result).toEqual(mockPlan);
    });

    it('should throw error when plan not found', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(
        service.getPlan(mockPlanId, mockOrganizationId)
      ).rejects.toThrow('Benefit plan not found');
    });
  });

  describe('listPlans', () => {
    it('should return paginated benefit plans', async () => {
      // Arrange
      const mockPlans = [
        { id: 'plan-1', plan_name: 'Health', enrollment_count: '5' },
        { id: 'plan-2', plan_name: 'Dental', enrollment_count: '3' }
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockPlans }) // SELECT
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // COUNT

      // Act
      const result = await service.listPlans({}, mockOrganizationId);

      // Assert
      expect(result.plans).toEqual(mockPlans);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should filter by plan type', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listPlans({ planType: 'health' }, mockOrganizationId);

      // Assert
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('bp.plan_type ='),
        expect.arrayContaining([mockOrganizationId, 'health']),
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should filter by active status', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      // Act
      await service.listPlans({ isActive: true }, mockOrganizationId);

      // Assert
      expect(mockQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('bp.is_active ='),
        expect.arrayContaining([mockOrganizationId, true]),
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('updatePlan', () => {
    it('should update benefit plan successfully', async () => {
      // Arrange
      const updateData = {
        plan_name: 'Updated Health Plan',
        employee_contribution: 150
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: mockPlanId }] }) // Check
        .mockResolvedValueOnce({ rows: [{ id: mockPlanId, ...updateData }] }); // Update

      // Act
      const result = await service.updatePlan(mockPlanId, updateData, mockOrganizationId, mockUserId);

      // Assert
      expect(result).toMatchObject(updateData);
    });

    it('should throw error when plan not found', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(
        service.updatePlan(mockPlanId, {}, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Benefit plan not found');
    });

    it('should return existing plan when no updates provided', async () => {
      // Arrange
      const existingPlan = { id: mockPlanId, plan_name: 'Existing' };
      
      mockQuery
        .mockResolvedValueOnce({ rows: [existingPlan] })
        .mockResolvedValueOnce({ rows: [existingPlan] });

      // Act
      const result = await service.updatePlan(mockPlanId, {}, mockOrganizationId, mockUserId);

      // Assert
      expect(result).toEqual(existingPlan);
    });
  });

  describe('enrollEmployee', () => {
    it('should enroll employee in benefit plan successfully', async () => {
      // Arrange
      const enrollmentData = {
        employee_id: mockEmployeeId,
        plan_id: mockPlanId,
        enrollment_date: new Date(),
        employee_contribution_amount: 100
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Check existing
        .mockResolvedValueOnce({ rows: [{ id: mockEnrollmentId }] }); // Insert

      // Act
      const result = await service.enrollEmployee(enrollmentData, mockOrganizationId, mockUserId);

      // Assert
      expect(result.id).toBe(mockEnrollmentId);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Employee enrolled successfully',
        expect.any(Object)
      );
    });

    it('should throw error when employee_id is missing', async () => {
      // Arrange
      const enrollmentData = { plan_id: mockPlanId };

      // Act & Assert
      await expect(
        service.enrollEmployee(enrollmentData, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Employee ID is required');
    });

    it('should throw error when plan_id is missing', async () => {
      // Arrange
      const enrollmentData = { employee_id: mockEmployeeId };

      // Act & Assert
      await expect(
        service.enrollEmployee(enrollmentData, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Plan ID is required');
    });

    it('should throw error when employee already enrolled', async () => {
      // Arrange
      const enrollmentData = {
        employee_id: mockEmployeeId,
        plan_id: mockPlanId
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-enrollment' }] });

      // Act & Assert
      await expect(
        service.enrollEmployee(enrollmentData, mockOrganizationId, mockUserId)
      ).rejects.toThrow('Employee is already enrolled in this plan');
    });

    it('should use default values for optional fields', async () => {
      // Arrange
      const enrollmentData = {
        employee_id: mockEmployeeId,
        plan_id: mockPlanId
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: mockEnrollmentId }] });

      // Act
      await service.enrollEmployee(enrollmentData, mockOrganizationId, mockUserId);

      // Assert
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.arrayContaining([
          mockOrganizationId,
          mockEmployeeId,
          mockPlanId,
          expect.any(Date), // enrollment_date default
          expect.any(Date), // coverage_start_date default
          null, // coverage_end_date default
          0, // employee_contribution_amount default
          0, // employer_contribution_amount default
          null, // beneficiaries default
          'active',
          mockUserId,
          mockUserId
        ]),
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('updateEnrollment', () => {
    it('should update enrollment successfully', async () => {
      // Arrange
      const updateData = {
        status: 'suspended',
        employee_contribution_amount: 200
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: mockEnrollmentId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockEnrollmentId, ...updateData }] });

      // Act
      const result = await service.updateEnrollment(mockEnrollmentId, updateData, mockOrganizationId, mockUserId);

      // Assert
      expect(result).toMatchObject(updateData);
    });

    it('should handle beneficiaries JSON serialization', async () => {
      // Arrange
      const updateData = {
        beneficiaries: [{ name: 'Jane Doe', relationship: 'spouse' }]
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: mockEnrollmentId }] })
        .mockResolvedValueOnce({ rows: [{ id: mockEnrollmentId }] });

      // Act
      await service.updateEnrollment(mockEnrollmentId, updateData, mockOrganizationId, mockUserId);

      // Assert
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.arrayContaining([
          JSON.stringify(updateData.beneficiaries),
          mockUserId,
          mockEnrollmentId,
          mockOrganizationId
        ]),
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('terminateEnrollment', () => {
    it('should terminate enrollment successfully', async () => {
      // Arrange
      const endDate = '2025-12-31';
      const reason = 'Employment ended';

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: mockEnrollmentId, status: 'active' }] })
        .mockResolvedValueOnce({ rows: [{ id: mockEnrollmentId, status: 'terminated' }] });

      // Act
      const result = await service.terminateEnrollment(
        mockEnrollmentId,
        endDate,
        reason,
        mockOrganizationId,
        mockUserId
      );

      // Assert
      expect(result.status).toBe('terminated');
      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("status = 'terminated'"),
        [mockEnrollmentId, mockOrganizationId, endDate, reason, mockUserId],
        mockOrganizationId,
        expect.any(Object)
      );
    });

    it('should throw error when enrollment not found', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(
        service.terminateEnrollment(mockEnrollmentId, '2025-12-31', 'Reason', mockOrganizationId, mockUserId)
      ).rejects.toThrow('Enrollment not found');
    });

    it('should throw error when enrollment already terminated', async () => {
      // Arrange
      mockQuery.mockResolvedValueOnce({ rows: [{ id: mockEnrollmentId, status: 'terminated' }] });

      // Act & Assert
      await expect(
        service.terminateEnrollment(mockEnrollmentId, '2025-12-31', 'Reason', mockOrganizationId, mockUserId)
      ).rejects.toThrow('Enrollment is already terminated');
    });
  });

  describe('getEmployeeEnrollments', () => {
    it('should return employee enrollments with plan details', async () => {
      // Arrange
      const mockEnrollments = [
        {
          id: 'enr-1',
          employee_id: mockEmployeeId,
          plan_name: 'Health Insurance',
          plan_type: 'health'
        },
        {
          id: 'enr-2',
          employee_id: mockEmployeeId,
          plan_name: 'Dental Insurance',
          plan_type: 'dental'
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockEnrollments });

      // Act
      const result = await service.getEmployeeEnrollments(mockEmployeeId, mockOrganizationId);

      // Assert
      expect(result).toEqual(mockEnrollments);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('JOIN hris.benefits_plan'),
        [mockEmployeeId, mockOrganizationId],
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('getPlanEnrollments', () => {
    it('should return plan enrollments with employee details', async () => {
      // Arrange
      const mockEnrollments = [
        {
          id: 'enr-1',
          plan_id: mockPlanId,
          employee_name: 'John Doe',
          employee_email: 'john@example.com'
        },
        {
          id: 'enr-2',
          plan_id: mockPlanId,
          employee_name: 'Jane Smith',
          employee_email: 'jane@example.com'
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockEnrollments });

      // Act
      const result = await service.getPlanEnrollments(mockPlanId, mockOrganizationId);

      // Assert
      expect(result).toEqual(mockEnrollments);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('JOIN hris.employee'),
        [mockPlanId, mockOrganizationId],
        mockOrganizationId,
        expect.any(Object)
      );
    });
  });
});
