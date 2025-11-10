/**
 * Benefits Service Tests
 * 
 * Unit tests for BenefitsService business logic.
 */

import BenefitsService from '../../../../src/products/paylinq/services/benefitsService.js';
import PayrollRepository from '../../../../src/products/paylinq/repositories/payrollRepository.js';

// Mock dependencies

describe('BenefitsService', () => {
  let service;
  let mockPayrollRepository;

  beforeEach(() => {
    service = new BenefitsService();
    mockPayrollRepository = PayrollRepository.mock.instances[0];
    jest.clearAllMocks();
  });

  describe('Benefit Plan Management', () => {
    describe('createBenefitPlan', () => {
      test('should create health insurance plan', async () => {
        const planData = {
          planName: 'Premium Health Insurance',
          planType: 'health',
          description: 'Comprehensive health coverage',
          employerCost: 500.0,
          employeeCost: 200.0,
          isActive: true
        };

        mockPayrollRepository.createBenefitPlan = jest.fn().mockResolvedValue({
          id: 'plan-123',
          ...planData
        });

        const result = await service.createBenefitPlan(
          planData,
          'org-789',
          'user-123'
        );

        expect(result).toBeDefined();
        expect(result.plan_name).toBe('Premium Health Insurance');
        expect(result.employer_cost).toBe(500.0);
      });

      test('should validate required fields', async () => {
        const invalidData = {
          planName: 'Test Plan'
          // Missing required fields
        };

        await expect(
          service.createBenefitPlan(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });

      test('should validate plan type', async () => {
        const invalidData = {
          planName: 'Test Plan',
          planType: 'invalid_type',
          employerCost: 100,
          employeeCost: 50,
          isActive: true
        };

        await expect(
          service.createBenefitPlan(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });

      test('should validate positive costs', async () => {
        const invalidData = {
          planName: 'Test Plan',
          planType: 'health',
          employerCost: -100,
          employeeCost: 50,
          isActive: true
        };

        await expect(
          service.createBenefitPlan(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow(/positive/i);
      });
    });

    describe('updateBenefitPlan', () => {
      test('should update benefit plan', async () => {
        const updates = {
          employerCost: 550.0,
          employeeCost: 220.0
        };

        mockPayrollRepository.updateBenefitPlan = jest.fn().mockResolvedValue({
          id: 'plan-123',
          ...updates
        });

        const result = await service.updateBenefitPlan(
          'plan-123',
          updates,
          'org-789',
          'user-123'
        );

        expect(result.employer_cost).toBe(550.0);
      });
    });

    describe('getBenefitPlans', () => {
      test('should retrieve all benefit plans', async () => {
        const mockPlans = [
          { id: 'plan-1', plan_type: 'health', is_active: true },
          { id: 'plan-2', plan_type: 'dental', is_active: true }
        ];

        mockPayrollRepository.findBenefitPlans = jest.fn().mockResolvedValue(mockPlans);

        const result = await service.getBenefitPlans('org-789');

        expect(result).toEqual(mockPlans);
        expect(result).toHaveLength(2);
      });

      test('should filter by plan type', async () => {
        const mockHealthPlans = [
          { id: 'plan-1', plan_type: 'health', is_active: true }
        ];

        mockPayrollRepository.findBenefitPlans = jest.fn().mockResolvedValue(mockHealthPlans);

        const result = await service.getBenefitPlans('org-789', { planType: 'health' });

        expect(result.every(p => p.plan_type === 'health')).toBe(true);
      });
    });
  });

  describe('Benefit Enrollment', () => {
    describe('enrollEmployee', () => {
      test('should enroll employee in benefit plan', async () => {
        const enrollmentData = {
          employeeRecordId: 'record-123',
          benefitPlanId: 'plan-456',
          coverageLevel: 'employee_only',
          enrollmentDate: '2024-01-01'
        };

        mockPayrollRepository.createBenefitEnrollment = jest.fn().mockResolvedValue({
          id: 'enrollment-789',
          ...enrollmentData
        });

        const result = await service.enrollEmployee(
          enrollmentData,
          'org-789',
          'user-123'
        );

        expect(result).toBeDefined();
        expect(result.coverage_level).toBe('employee_only');
      });

      test('should validate coverage level', async () => {
        const invalidData = {
          employeeRecordId: 'record-123',
          benefitPlanId: 'plan-456',
          coverageLevel: 'invalid_level',
          enrollmentDate: '2024-01-01'
        };

        await expect(
          service.enrollEmployee(invalidData, 'org-789', 'user-123')
        ).rejects.toThrow();
      });

      test('should calculate employee cost based on coverage level', async () => {
        const mockPlan = {
          id: 'plan-123',
          employee_cost: 200.0
        };

        mockPayrollRepository.findBenefitPlanById = jest.fn().mockResolvedValue(mockPlan);
        mockPayrollRepository.createBenefitEnrollment = jest.fn().mockResolvedValue({
          id: 'enrollment-123',
          employee_cost: 400.0 // Family coverage = 2x base
        });

        const enrollmentData = {
          employeeRecordId: 'record-123',
          benefitPlanId: 'plan-123',
          coverageLevel: 'family',
          enrollmentDate: '2024-01-01'
        };

        const result = await service.enrollEmployee(
          enrollmentData,
          'org-789',
          'user-123'
        );

        expect(result.employee_cost).toBe(400.0);
      });
    });

    describe('unenrollEmployee', () => {
      test('should unenroll employee from benefit plan', async () => {
        mockPayrollRepository.updateBenefitEnrollment = jest.fn().mockResolvedValue({
          id: 'enrollment-123',
          status: 'inactive',
          termination_date: '2024-06-30'
        });

        const result = await service.unenrollEmployee(
          'enrollment-123',
          '2024-06-30',
          'org-789',
          'user-123'
        );

        expect(result.status).toBe('inactive');
        expect(result.termination_date).toBeDefined();
      });
    });

    describe('getEmployeeEnrollments', () => {
      test('should retrieve active enrollments for employee', async () => {
        const mockEnrollments = [
          { id: 'enroll-1', plan_type: 'health', status: 'active' },
          { id: 'enroll-2', plan_type: 'dental', status: 'active' }
        ];

        mockPayrollRepository.findBenefitEnrollments = jest.fn().mockResolvedValue(mockEnrollments);

        const result = await service.getEmployeeEnrollments(
          'record-123',
          'org-789'
        );

        expect(result).toEqual(mockEnrollments);
      });
    });
  });

  describe('Benefit Cost Calculations', () => {
    describe('calculateBenefitCosts', () => {
      test('should calculate total benefit costs for employee', async () => {
        const mockEnrollments = [
          { employee_cost: 200.0, employer_cost: 500.0 }, // Health
          { employee_cost: 50.0, employer_cost: 100.0 }   // Dental
        ];

        mockPayrollRepository.findBenefitEnrollments = jest.fn().mockResolvedValue(mockEnrollments);

        const result = await service.calculateBenefitCosts('record-123', 'org-789');

        expect(result.totalEmployeeCost).toBe(250.0);
        expect(result.totalEmployerCost).toBe(600.0);
        expect(result.totalCost).toBe(850.0);
      });

      test('should handle employee with no benefits', async () => {
        mockPayrollRepository.findBenefitEnrollments = jest.fn().mockResolvedValue([]);

        const result = await service.calculateBenefitCosts('record-123', 'org-789');

        expect(result.totalEmployeeCost).toBe(0);
        expect(result.totalEmployerCost).toBe(0);
      });
    });

    describe('calculateOrganizationBenefitCosts', () => {
      test('should calculate total benefit costs for organization', async () => {
        const mockEnrollments = [
          { employee_cost: 200.0, employer_cost: 500.0 },
          { employee_cost: 200.0, employer_cost: 500.0 },
          { employee_cost: 50.0, employer_cost: 100.0 }
        ];

        mockPayrollRepository.findAllBenefitEnrollments = jest.fn().mockResolvedValue(mockEnrollments);

        const result = await service.calculateOrganizationBenefitCosts('org-789');

        expect(result.totalEmployeeCost).toBe(450.0);
        expect(result.totalEmployerCost).toBe(1100.0);
        expect(result.enrollmentCount).toBe(3);
      });
    });
  });

  describe('Coverage Level Multipliers', () => {
    test('should apply employee_only multiplier (1x)', () => {
      const baseCost = 200.0;
      const cost = service.applyCoverageLevelMultiplier(baseCost, 'employee_only');
      expect(cost).toBe(200.0);
    });

    test('should apply employee_spouse multiplier (1.5x)', () => {
      const baseCost = 200.0;
      const cost = service.applyCoverageLevelMultiplier(baseCost, 'employee_spouse');
      expect(cost).toBe(300.0);
    });

    test('should apply employee_children multiplier (1.75x)', () => {
      const baseCost = 200.0;
      const cost = service.applyCoverageLevelMultiplier(baseCost, 'employee_children');
      expect(cost).toBe(350.0);
    });

    test('should apply family multiplier (2x)', () => {
      const baseCost = 200.0;
      const cost = service.applyCoverageLevelMultiplier(baseCost, 'family');
      expect(cost).toBe(400.0);
    });
  });

  describe('Benefit Reporting', () => {
    describe('getBenefitUtilizationReport', () => {
      test('should generate benefit utilization report', async () => {
        const mockPlans = [
          { id: 'plan-1', plan_name: 'Health', plan_type: 'health' },
          { id: 'plan-2', plan_name: 'Dental', plan_type: 'dental' }
        ];

        const mockEnrollments = [
          { benefit_plan_id: 'plan-1', status: 'active' },
          { benefit_plan_id: 'plan-1', status: 'active' },
          { benefit_plan_id: 'plan-2', status: 'active' }
        ];

        mockPayrollRepository.findBenefitPlans = jest.fn().mockResolvedValue(mockPlans);
        mockPayrollRepository.findAllBenefitEnrollments = jest.fn().mockResolvedValue(mockEnrollments);

        const result = await service.getBenefitUtilizationReport('org-789');

        expect(result.plans).toHaveLength(2);
        expect(result.totalEnrollments).toBe(3);
      });
    });

    describe('getBenefitCostSummary', () => {
      test('should generate cost summary by plan type', async () => {
        const mockEnrollments = [
          { plan_type: 'health', employee_cost: 200, employer_cost: 500 },
          { plan_type: 'health', employee_cost: 200, employer_cost: 500 },
          { plan_type: 'dental', employee_cost: 50, employer_cost: 100 }
        ];

        mockPayrollRepository.findAllBenefitEnrollments = jest.fn().mockResolvedValue(mockEnrollments);

        const result = await service.getBenefitCostSummary('org-789');

        expect(result.byType).toBeDefined();
        expect(result.byType.health.totalEmployeeCost).toBe(400);
        expect(result.byType.health.totalEmployerCost).toBe(1000);
        expect(result.byType.dental.totalEmployeeCost).toBe(50);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle repository errors', async () => {
      mockPayrollRepository.createBenefitPlan = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        service.createBenefitPlan({
          planName: 'Test',
          planType: 'health',
          employerCost: 100,
          employeeCost: 50,
          isActive: true
        }, 'org-789', 'user-123')
      ).rejects.toThrow('Database error');
    });

    test('should handle plan not found', async () => {
      mockPayrollRepository.findBenefitPlanById = jest.fn().mockResolvedValue(null);

      await expect(
        service.enrollEmployee({
          employeeRecordId: 'record-123',
          benefitPlanId: 'nonexistent',
          coverageLevel: 'employee_only',
          enrollmentDate: '2024-01-01'
        }, 'org-789', 'user-123')
      ).rejects.toThrow(/not found/i);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero-cost benefits', async () => {
      const planData = {
        planName: 'Free Gym Membership',
        planType: 'wellness',
        employerCost: 0,
        employeeCost: 0,
        isActive: true
      };

      mockPayrollRepository.createBenefitPlan = jest.fn().mockResolvedValue({
        id: 'plan-123',
        ...planData
      });

      const result = await service.createBenefitPlan(
        planData,
        'org-789',
        'user-123'
      );

      expect(result.employer_cost).toBe(0);
      expect(result.employee_cost).toBe(0);
    });

    test('should handle organization with no benefit plans', async () => {
      mockPayrollRepository.findBenefitPlans = jest.fn().mockResolvedValue([]);

      const result = await service.getBenefitPlans('org-789');

      expect(result).toEqual([]);
    });
  });
});
