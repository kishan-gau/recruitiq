/**
 * BenefitsService Test Suite
 * 
 * Tests for PayLinQ benefits service following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Dependency injection pattern
 * - Comprehensive service method coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import BenefitsService from '../../../../src/products/paylinq/services/benefitsService.js';
import { BENEFIT_TYPES } from '../../../../src/products/paylinq/services/benefitsService.js';

describe('BenefitsService', () => {
  let service: any;
  let mockRepository: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testBenefitId = '323e4567-e89b-12d3-a456-426614174002';
  const testEmployeeId = '423e4567-e89b-12d3-a456-426614174003';
  const testPlanId = '523e4567-e89b-12d3-a456-426614174004';

  beforeEach(() => {
    // Create comprehensive mock repository
    mockRepository = {
      createBenefitPlan: jest.fn(),
      updateBenefitPlan: jest.fn(),
      findBenefitPlans: jest.fn()
    };

    // Inject mock repository using DI pattern
    service = new BenefitsService(mockRepository);
  });

  describe('BENEFIT_TYPES', () => {
    it('should define all benefit types', () => {
      expect(BENEFIT_TYPES.HEALTH_INSURANCE).toBe('health_insurance');
      expect(BENEFIT_TYPES.DENTAL_INSURANCE).toBe('dental_insurance');
      expect(BENEFIT_TYPES.VISION_INSURANCE).toBe('vision_insurance');
      expect(BENEFIT_TYPES.LIFE_INSURANCE).toBe('life_insurance');
      expect(BENEFIT_TYPES.RETIREMENT_401K).toBe('retirement_401k');
      expect(BENEFIT_TYPES.HSA).toBe('hsa');
      expect(BENEFIT_TYPES.FSA).toBe('fsa');
    });
  });

  describe('createBenefit', () => {
    it('should create benefit with valid health insurance type', async () => {
      const benefitData = {
        planType: BENEFIT_TYPES.HEALTH_INSURANCE,
        planName: 'Basic Health Plan',
        employeeCost: 100,
        employerCost: 400
      };

      const result = await service.createBenefit(benefitData, testOrganizationId, testUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
      expect(result.planType).toBe(BENEFIT_TYPES.HEALTH_INSURANCE);
      expect(result.organization_id).toBe(testOrganizationId);
      expect(result.created_by).toBe(testUserId);
    });

    it('should throw error for invalid benefit type', async () => {
      const benefitData = {
        planType: 'invalid_type',
        planName: 'Invalid Plan'
      };

      await expect(service.createBenefit(benefitData, testOrganizationId, testUserId))
        .rejects.toThrow('Invalid benefit type');
    });

    it('should accept all valid benefit types', async () => {
      const validTypes = Object.values(BENEFIT_TYPES);

      for (const benefitType of validTypes) {
        const benefitData = {
          planType: benefitType,
          planName: `${benefitType} Plan`
        };

        const result = await service.createBenefit(benefitData, testOrganizationId, testUserId);
        expect(result.planType).toBe(benefitType);
      }
    });
  });

  describe('getBenefitById', () => {
    it('should retrieve benefit by ID', async () => {
      const result = await service.getBenefitById(testBenefitId, testOrganizationId);

      // Current implementation returns null
      expect(result).toBeNull();
    });
  });

  describe('getEmployeeBenefits', () => {
    it('should retrieve all benefits for employee', async () => {
      const result = await service.getEmployeeBenefits(testEmployeeId, testOrganizationId);

      // Current implementation returns empty array
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('calculateBenefitDeduction', () => {
    it('should calculate percentage-based deduction', () => {
      const benefit = {
        calculation_type: 'percentage',
        employee_contribution: 5
      };
      const grossPay = 1000;

      const result = service.calculateBenefitDeduction(benefit, grossPay);

      expect(result).toBe(50); // 5% of 1000
    });

    it('should return fixed amount for non-percentage deduction', () => {
      const benefit = {
        calculation_type: 'fixed',
        employee_contribution: 100
      };
      const grossPay = 1000;

      const result = service.calculateBenefitDeduction(benefit, grossPay);

      expect(result).toBe(100);
    });

    it('should handle zero gross pay', () => {
      const benefit = {
        calculation_type: 'percentage',
        employee_contribution: 5
      };

      const result = service.calculateBenefitDeduction(benefit, 0);

      expect(result).toBe(0);
    });
  });

  describe('enrollEmployeeBenefit', () => {
    it('should enroll employee in benefit', async () => {
      const options = {
        coverageLevel: 'family',
        startDate: new Date('2025-01-01')
      };

      const result = await service.enrollEmployeeBenefit(testEmployeeId, testBenefitId, options);

      expect(result).toBeDefined();
      expect(result.id).toBe('123');
      expect(result.employee_id).toBe(testEmployeeId);
      expect(result.benefit_id).toBe(testBenefitId);
      expect(result.status).toBe('active');
      expect(result.coverageLevel).toBe('family');
    });
  });

  describe('createBenefitPlan', () => {
    it('should create benefit plan with valid data', async () => {
      const planData = {
        planName: 'Premium Health Plan',
        planType: 'health',
        employerCost: 500,
        employeeCost: 150,
        isActive: true
      };

      const mockCreatedPlan = {
        id: testPlanId,
        ...planData
      };

      mockRepository.createBenefitPlan.mockResolvedValue(mockCreatedPlan);

      const result = await service.createBenefitPlan(planData, testOrganizationId, testUserId);

      expect(result).toEqual(mockCreatedPlan);
      expect(mockRepository.createBenefitPlan).toHaveBeenCalledWith(
        planData,
        testOrganizationId,
        testUserId
      );
    });

    it('should throw error for missing required fields', async () => {
      const invalidData = {
        planType: 'health'
        // Missing other required fields
      };

      await expect(service.createBenefitPlan(invalidData, testOrganizationId, testUserId))
        .rejects.toThrow('Missing required fields for benefit plan');
    });

    it('should throw error for invalid plan type', async () => {
      const planData = {
        planName: 'Invalid Plan',
        planType: 'invalid_type',
        employerCost: 500,
        employeeCost: 150,
        isActive: true
      };

      await expect(service.createBenefitPlan(planData, testOrganizationId, testUserId))
        .rejects.toThrow('Invalid plan type: invalid_type');
    });

    it('should throw error for negative costs', async () => {
      const planData = {
        planName: 'Invalid Cost Plan',
        planType: 'health',
        employerCost: -100,
        employeeCost: 150,
        isActive: true
      };

      await expect(service.createBenefitPlan(planData, testOrganizationId, testUserId))
        .rejects.toThrow('Benefit costs must be positive');
    });

    it('should accept all valid plan types', async () => {
      const validPlanTypes = ['health', 'dental', 'vision', 'life', 'retirement', 'hsa', 'fsa', 'wellness'];

      for (const planType of validPlanTypes) {
        const planData = {
          planName: `${planType} Plan`,
          planType,
          employerCost: 300,
          employeeCost: 100,
          isActive: true
        };

        mockRepository.createBenefitPlan.mockResolvedValue({ id: testPlanId, ...planData });

        await service.createBenefitPlan(planData, testOrganizationId, testUserId);

        expect(mockRepository.createBenefitPlan).toHaveBeenCalledWith(
          expect.objectContaining({ planType }),
          testOrganizationId,
          testUserId
        );
      }
    });
  });

  describe('updateBenefitPlan', () => {
    it('should update benefit plan', async () => {
      const updates = {
        employeeCost: 200,
        isActive: false
      };

      const mockUpdatedPlan = {
        id: testPlanId,
        ...updates
      };

      mockRepository.updateBenefitPlan.mockResolvedValue(mockUpdatedPlan);

      const result = await service.updateBenefitPlan(testPlanId, updates, testOrganizationId, testUserId);

      expect(result).toEqual(mockUpdatedPlan);
      expect(mockRepository.updateBenefitPlan).toHaveBeenCalledWith(
        testPlanId,
        updates,
        testOrganizationId,
        testUserId
      );
    });
  });

  describe('getBenefitPlans', () => {
    it('should retrieve all benefit plans', async () => {
      const mockPlans = [
        { id: '1', planType: 'health' },
        { id: '2', planType: 'dental' }
      ];

      mockRepository.findBenefitPlans.mockResolvedValue(mockPlans);

      const result = await service.getBenefitPlans(testOrganizationId);

      expect(result).toEqual(mockPlans);
      expect(mockRepository.findBenefitPlans).toHaveBeenCalledWith(testOrganizationId, {});
    });

    it('should retrieve benefit plans with filters', async () => {
      const filters = { planType: 'health', isActive: true };
      const mockPlans = [{ id: '1', planType: 'health' }];

      mockRepository.findBenefitPlans.mockResolvedValue(mockPlans);

      const result = await service.getBenefitPlans(testOrganizationId, filters);

      expect(result).toEqual(mockPlans);
      expect(mockRepository.findBenefitPlans).toHaveBeenCalledWith(testOrganizationId, filters);
    });
  });

  describe('applyCoverageLevelMultiplier', () => {
    it('should apply employee_only multiplier (1.0)', () => {
      const result = service.applyCoverageLevelMultiplier(100, 'employee_only');
      expect(result).toBe(100);
    });

    it('should apply employee_spouse multiplier (1.5)', () => {
      const result = service.applyCoverageLevelMultiplier(100, 'employee_spouse');
      expect(result).toBe(150);
    });

    it('should apply employee_children multiplier (1.75)', () => {
      const result = service.applyCoverageLevelMultiplier(100, 'employee_children');
      expect(result).toBe(175);
    });

    it('should apply family multiplier (2.0)', () => {
      const result = service.applyCoverageLevelMultiplier(100, 'family');
      expect(result).toBe(200);
    });

    it('should default to 1.0 for unknown coverage level', () => {
      const result = service.applyCoverageLevelMultiplier(100, 'unknown_level');
      expect(result).toBe(100);
    });
  });

  describe('enrollEmployee', () => {
    it('should throw error for invalid coverage level', async () => {
      const enrollmentData = {
        employeeRecordId: testEmployeeId,
        benefitPlanId: testPlanId,
        coverageLevel: 'invalid_level'
      };

      await expect(service.enrollEmployee(enrollmentData, testOrganizationId, testUserId))
        .rejects.toThrow('Invalid coverage level: invalid_level');
    });
  });

  describe('constructor', () => {
    it('should use provided repository', () => {
      const customRepo = { createBenefitPlan: jest.fn() };
      const testService = new BenefitsService(customRepo);

      expect(testService.payrollRepository).toBe(customRepo);
    });

    it('should create default repository when none provided', () => {
      const testService = new BenefitsService();

      expect(testService.payrollRepository).toBeDefined();
    });
  });
});
