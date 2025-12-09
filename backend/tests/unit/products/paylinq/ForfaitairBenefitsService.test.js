/**
 * Unit Tests: ForfaitairBenefitsService
 * 
 * Tests the tenant-specific forfaitair benefits system:
 * - Tenant component library access (organization-specific components)
 * - Employee-level benefit assignments
 * - Benefit calculations with employee overrides
 * 
 * Test Coverage:
 * - Tenant benefit library retrieval (getTenantBenefitLibrary)
 * - Employee benefit assignment and management
 * - Benefit calculation with employee-specific values
 * - Assignment removal and deactivation
 * - Statistics and reporting
 * 
 * Architecture Note: All forfait components are tenant-specific.
 * No global components (organization_id IS NULL) are allowed.
 * 
 * Industry Standard: AAA pattern (Arrange, Act, Assert)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ForfaitairBenefitsService from '../../../../src/products/paylinq/services/ForfaitairBenefitsService.js';
import { ValidationError } from '../../../../src/utils/errors.js';

describe('ForfaitairBenefitsService', () => {
  let service;
  let mockRepository;
  let mockFormulaEngine;

  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testEmployeeId = '323e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    // Mock repository
    mockRepository = {
      findGlobalComponents: jest.fn(),
      findGlobalComponentByCode: jest.fn(),
      findByCode: jest.fn(),
      createPayComponent: jest.fn(),
      assignComponentToEmployee: jest.fn(),
      findEmployeeComponentAssignment: jest.fn(),
      findEmployeeComponents: jest.fn(),
      removeEmployeeComponentAssignment: jest.fn(),
      getComponentStatistics: jest.fn(),
      findAll: jest.fn()
    };

    // Mock formula engine
    mockFormulaEngine = {
      parseFormula: jest.fn(),
      calculateSafe: jest.fn()
    };

    service = new ForfaitairBenefitsService(mockRepository, mockFormulaEngine);
  });

  // ==================== TENANT BENEFIT LIBRARY TESTS ====================

  describe('getTenantBenefitLibrary', () => {
    it('should fetch all forfaitair benefit components for specific tenant', async () => {
      // Arrange
      const organizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const mockTenantBenefits = [
        {
          id: 'tenant-1',
          componentCode: 'CAR_FORFAIT_2PCT',
          componentName: 'Auto Forfait (2%)',
          category: 'benefit',
          organizationId,
          isTaxable: true
        },
        {
          id: 'tenant-2',
          componentCode: 'HOUSING_FORFAIT_7_5PCT',
          componentName: 'Huisvesting Forfait (7.5%)',
          category: 'benefit',
          formula: '{annual_salary} * 0.075 / 12',
          isTaxable: true
        }
      ];

      mockRepository.findAll.mockResolvedValue(mockTenantBenefits);

      // Act
      const result = await service.getTenantBenefitLibrary(organizationId);

      // Assert
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('tenantComponents');
      expect(result.tenantComponents).toHaveLength(2);
      expect(result.tenantComponents[0]).toHaveProperty('componentCode', 'CAR_FORFAIT_2PCT');
      expect(result.tenantComponents[1]).toHaveProperty('componentCode', 'HOUSING_FORFAIT_7_5PCT');

      // Verify repository was called correctly with tenant filtering
      expect(mockRepository.findAll).toHaveBeenCalledWith(
        organizationId,
        {
          category: 'benefit',
          type: 'deduction'
        }
      );
    });

    it('should return empty array when no tenant benefits exist', async () => {
      // Arrange
      const organizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
      mockRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getTenantBenefitLibrary(organizationId);

      // Assert
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('tenantComponents');
      expect(result.tenantComponents).toHaveLength(0);
    });

    it('should validate organizationId parameter', async () => {
      // Act & Assert
      await expect(service.getTenantBenefitLibrary()).rejects.toThrow(ValidationError);
      await expect(service.getTenantBenefitLibrary(null)).rejects.toThrow(ValidationError);
      await expect(service.getTenantBenefitLibrary('')).rejects.toThrow(ValidationError);
      await expect(service.getTenantBenefitLibrary('invalid-uuid')).rejects.toThrow(ValidationError);
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const organizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
      mockRepository.findAll.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.getTenantBenefitLibrary(organizationId)).rejects.toThrow('Database connection failed');
    });
  });

  describe('getGlobalBenefitByCode', () => {
    it('should fetch specific global benefit by code', async () => {
      // Arrange
      const mockBenefit = {
        id: 'global-1',
        componentCode: 'FORFAITAIR_CAR_2PCT',
        componentName: 'Company Car Benefit (2% Standard)',
        formula: '{car_catalog_value} * 0.02 / 12'
      };

      mockRepository.findGlobalComponentByCode.mockResolvedValue(mockBenefit);

      // Act
      const result = await service.getGlobalBenefitByCode('FORFAITAIR_CAR_2PCT');

      // Assert
      expect(result).toEqual(mockBenefit);
      expect(mockRepository.findGlobalComponentByCode).toHaveBeenCalledWith('FORFAITAIR_CAR_2PCT');
    });

    it('should throw NotFoundError when global benefit does not exist', async () => {
      // Arrange
      mockRepository.findGlobalComponentByCode.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getGlobalBenefitByCode('NONEXISTENT_CODE')
      ).rejects.toThrow('Global benefit component \'NONEXISTENT_CODE\' not found');
    });
  });

  // ==================== TIER 2: ORGANIZATION CUSTOM COMPONENTS ====================

  describe('createCustomBenefit', () => {
    it('should create organization-specific custom benefit', async () => {
      // Arrange
      const customBenefitData = {
        componentCode: 'CUSTOM_CAR_BENEFIT',
        componentName: 'Custom Car Benefit',
        category: 'benefit',
        calculationType: 'formula',
        formula: '{car_value} * 0.025 / 12',
        isTaxable: true,
        isRecurring: true,
        description: 'Organization-specific car benefit at 2.5%'
      };

      const createdBenefit = {
        id: 'custom-1',
        ...customBenefitData,
        organizationId: testOrgId,
        componentType: 'earning',
        isSystemComponent: false
      };

      mockRepository.findByCode.mockResolvedValue(null); // No existing component
      mockFormulaEngine.parseFormula.mockResolvedValue(true); // Formula valid
      mockRepository.createPayComponent.mockResolvedValue(createdBenefit);

      // Act
      const result = await service.createCustomBenefit(customBenefitData, testOrgId, testUserId);

      // Assert
      expect(result).toEqual(createdBenefit);
      expect(mockRepository.findByCode).toHaveBeenCalledWith('CUSTOM_CAR_BENEFIT', testOrgId);
      expect(mockFormulaEngine.parseFormula).toHaveBeenCalledWith('{car_value} * 0.025 / 12');
      expect(mockRepository.createPayComponent).toHaveBeenCalled();
    });

    it('should throw ValidationError if component code already exists', async () => {
      // Arrange
      const customBenefitData = {
        componentCode: 'EXISTING_CODE',
        componentName: 'Test',
        category: 'benefit',
        calculationType: 'fixed_amount',
        defaultAmount: 500
      };

      mockRepository.findByCode.mockResolvedValue({ id: 'existing' });

      // Act & Assert
      await expect(
        service.createCustomBenefit(customBenefitData, testOrgId, testUserId)
      ).rejects.toThrow('Component code \'EXISTING_CODE\' already exists');
    });

    it('should throw ValidationError if formula is invalid', async () => {
      // Arrange
      const customBenefitData = {
        componentCode: 'INVALID_FORMULA',
        componentName: 'Test',
        category: 'benefit',
        calculationType: 'formula',
        formula: 'INVALID SYNTAX HERE'
      };

      mockRepository.findByCode.mockResolvedValue(null);
      mockFormulaEngine.parseFormula.mockRejectedValue(new Error('Syntax error'));

      // Act & Assert
      await expect(
        service.createCustomBenefit(customBenefitData, testOrgId, testUserId)
      ).rejects.toThrow('Invalid formula: Syntax error');
    });
  });

  describe('cloneAndCustomizeGlobalBenefit', () => {
    it('should clone global benefit and apply organization overrides', async () => {
      // Arrange
      const globalBenefit = {
        id: 'global-1',
        componentCode: 'FORFAITAIR_CAR_2PCT',
        componentName: 'Company Car Benefit (2% Standard)',
        category: 'benefit',
        calculationType: 'formula',
        formula: '{car_catalog_value} * 0.02 / 12',
        isTaxable: true,
        isRecurring: true,
        metadata: { benefit_type: 'company_car' }
      };

      const overrides = {
        componentCode: 'ORG_CAR_BENEFIT_3PCT',
        componentName: 'Company Car Benefit (3% Custom)',
        formula: '{car_catalog_value} * 0.03 / 12'
      };

      const clonedBenefit = {
        id: 'cloned-1',
        componentCode: 'ORG_CAR_BENEFIT_3PCT',
        componentName: 'Company Car Benefit (3% Custom)',
        formula: '{car_catalog_value} * 0.03 / 12',
        organizationId: testOrgId
      };

      mockRepository.findGlobalComponentByCode.mockResolvedValue(globalBenefit);
      mockRepository.findByCode.mockResolvedValue(null);
      mockFormulaEngine.parseFormula.mockResolvedValue(true);
      mockRepository.createPayComponent.mockResolvedValue(clonedBenefit);

      // Act
      const result = await service.cloneAndCustomizeGlobalBenefit(
        'FORFAITAIR_CAR_2PCT',
        overrides,
        testOrgId,
        testUserId
      );

      // Assert
      expect(result).toEqual(clonedBenefit);
      expect(mockRepository.findGlobalComponentByCode).toHaveBeenCalledWith('FORFAITAIR_CAR_2PCT');
      expect(mockRepository.createPayComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          componentCode: 'ORG_CAR_BENEFIT_3PCT',
          formula: '{car_catalog_value} * 0.03 / 12',
          metadata: expect.objectContaining({
            cloned_from: 'FORFAITAIR_CAR_2PCT'
          })
        }),
        testOrgId,
        testUserId
      );
    });
  });

  describe('getAvailableBenefits', () => {
    it('should return both global and org-specific benefits', async () => {
      // Arrange
      const globalBenefits = [
        { id: 'global-1', componentCode: 'FORFAITAIR_CAR_2PCT' },
        { id: 'global-2', componentCode: 'FORFAITAIR_HOUSING_7_5PCT' }
      ];

      const orgBenefits = [
        { id: 'org-1', componentCode: 'CUSTOM_CAR_BENEFIT' }
      ];

      mockRepository.findGlobalComponents.mockResolvedValue(globalBenefits);
      mockRepository.findAll.mockResolvedValue(orgBenefits);

      // Act
      const result = await service.getAvailableBenefits(testOrgId);

      // Assert
      expect(result).toEqual({
        globalComponents: globalBenefits,
        orgComponents: orgBenefits,
        totalAvailable: 3
      });
    });
  });

  // ==================== TIER 3: EMPLOYEE BENEFIT ASSIGNMENT ====================

  describe('assignBenefitToEmployee', () => {
    it('should assign global benefit to employee', async () => {
      // Arrange
      const assignmentData = {
        employeeId: testEmployeeId,
        componentCode: 'FORFAITAIR_CAR_2PCT',
        effectiveFrom: new Date('2025-01-01'),
        configuration: { car_catalog_value: 120000 }
      };

      const globalBenefit = {
        id: 'global-1',
        componentCode: 'FORFAITAIR_CAR_2PCT',
        componentName: 'Company Car Benefit (2% Standard)'
      };

      const createdAssignment = {
        id: 'assignment-1',
        employeeId: testEmployeeId,
        componentId: 'global-1',
        componentCode: 'FORFAITAIR_CAR_2PCT',
        effectiveFrom: new Date('2025-01-01'),
        configuration: { car_catalog_value: 120000 }
      };

      mockRepository.findGlobalComponentByCode.mockResolvedValue(globalBenefit);
      mockRepository.assignComponentToEmployee.mockResolvedValue(createdAssignment);

      // Act
      const result = await service.assignBenefitToEmployee(assignmentData, testOrgId, testUserId);

      // Assert
      expect(result).toEqual(createdAssignment);
      expect(mockRepository.assignComponentToEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: testEmployeeId,
          componentId: 'global-1',
          componentCode: 'FORFAITAIR_CAR_2PCT',
          configuration: { car_catalog_value: 120000 }
        }),
        testOrgId
      );
    });

    it('should assign benefit with employee-specific override amount', async () => {
      // Arrange
      const assignmentData = {
        employeeId: testEmployeeId,
        componentCode: 'FORFAITAIR_HOUSING_FIXED',
        effectiveFrom: new Date('2025-01-01'),
        overrideAmount: 2000, // Employee gets SRD 2000 instead of default 1500
        notes: 'Executive housing package'
      };

      const globalBenefit = {
        id: 'global-2',
        componentCode: 'FORFAITAIR_HOUSING_FIXED',
        defaultAmount: 1500
      };

      const createdAssignment = {
        id: 'assignment-2',
        employeeId: testEmployeeId,
        componentId: 'global-2',
        overrideAmount: 2000
      };

      mockRepository.findGlobalComponentByCode.mockResolvedValue(globalBenefit);
      mockRepository.assignComponentToEmployee.mockResolvedValue(createdAssignment);

      // Act
      const result = await service.assignBenefitToEmployee(assignmentData, testOrgId, testUserId);

      // Assert
      expect(result.overrideAmount).toBe(2000);
    });

    it('should throw NotFoundError if component does not exist', async () => {
      // Arrange
      const assignmentData = {
        employeeId: testEmployeeId,
        componentCode: 'NONEXISTENT',
        effectiveFrom: new Date('2025-01-01')
      };

      mockRepository.findGlobalComponentByCode.mockResolvedValue(null);
      mockRepository.findByCode.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.assignBenefitToEmployee(assignmentData, testOrgId, testUserId)
      ).rejects.toThrow('Component \'NONEXISTENT\' not found');
    });
  });

  describe('getEmployeeBenefits', () => {
    it('should fetch all benefits assigned to employee', async () => {
      // Arrange
      const mockBenefits = [
        {
          id: 'assignment-1',
          employeeId: testEmployeeId,
          componentCode: 'FORFAITAIR_CAR_2PCT',
          componentName: 'Company Car Benefit'
        },
        {
          id: 'assignment-2',
          employeeId: testEmployeeId,
          componentCode: 'FORFAITAIR_HOUSING_7_5PCT',
          componentName: 'Housing Benefit'
        }
      ];

      mockRepository.findEmployeeComponents.mockResolvedValue(mockBenefits);

      // Act
      const result = await service.getEmployeeBenefits(testEmployeeId, testOrgId);

      // Assert
      expect(result).toEqual(mockBenefits);
      expect(mockRepository.findEmployeeComponents).toHaveBeenCalledWith(
        testEmployeeId,
        testOrgId,
        expect.objectContaining({
          componentType: 'earning',
          category: 'benefit'
        })
      );
    });
  });

  describe('calculateEmployeeBenefit', () => {
    it('should calculate benefit using component formula', async () => {
      // Arrange
      const component = {
        id: 'global-1',
        componentCode: 'FORFAITAIR_CAR_2PCT',
        componentName: 'Company Car Benefit',
        formula: '{car_catalog_value} * 0.02 / 12',
        isTaxable: true
      };

      const variables = { car_catalog_value: 120000 };
      const calculatedAmount = 200; // (120000 * 0.02) / 12 = 200

      mockRepository.findGlobalComponentByCode.mockResolvedValue(component);
      mockRepository.findEmployeeComponentAssignment.mockResolvedValue(null); // No override
      mockFormulaEngine.calculateSafe.mockResolvedValue(calculatedAmount);

      // Act
      const result = await service.calculateEmployeeBenefit(
        testEmployeeId,
        'FORFAITAIR_CAR_2PCT',
        variables,
        testOrgId
      );

      // Assert
      expect(result).toEqual({
        employeeId: testEmployeeId,
        componentCode: 'FORFAITAIR_CAR_2PCT',
        componentName: 'Company Car Benefit',
        calculatedAmount: 200,
        isTaxable: true,
        calculationMethod: 'component_formula',
        variables: variables,
        calculatedAt: expect.any(Date)
      });
    });

    it('should use employee override amount if present', async () => {
      // Arrange
      const component = {
        id: 'global-1',
        componentCode: 'FORFAITAIR_HOUSING_FIXED',
        defaultAmount: 1500
      };

      const employeeOverride = {
        employeeId: testEmployeeId,
        componentId: 'global-1',
        overrideAmount: 2000 // Employee-specific override
      };

      mockRepository.findGlobalComponentByCode.mockResolvedValue(component);
      mockRepository.findEmployeeComponentAssignment.mockResolvedValue(employeeOverride);

      // Act
      const result = await service.calculateEmployeeBenefit(
        testEmployeeId,
        'FORFAITAIR_HOUSING_FIXED',
        {},
        testOrgId
      );

      // Assert
      expect(result.calculatedAmount).toBe(2000);
      expect(result.calculationMethod).toBe('employee_override_amount');
    });

    it('should use employee override formula if present', async () => {
      // Arrange
      const component = {
        id: 'global-1',
        componentCode: 'FORFAITAIR_HOUSING_7_5PCT',
        formula: '{annual_salary} * 0.075 / 12'
      };

      const employeeOverride = {
        employeeId: testEmployeeId,
        componentId: 'global-1',
        overrideFormula: '{annual_salary} * 0.10 / 12' // 10% instead of 7.5%
      };

      const variables = { annual_salary: 60000 };
      const calculatedAmount = 500; // (60000 * 0.10) / 12 = 500

      mockRepository.findGlobalComponentByCode.mockResolvedValue(component);
      mockRepository.findEmployeeComponentAssignment.mockResolvedValue(employeeOverride);
      mockFormulaEngine.calculateSafe.mockResolvedValue(calculatedAmount);

      // Act
      const result = await service.calculateEmployeeBenefit(
        testEmployeeId,
        'FORFAITAIR_HOUSING_7_5PCT',
        variables,
        testOrgId
      );

      // Assert
      expect(result.calculatedAmount).toBe(500);
      expect(result.calculationMethod).toBe('employee_override_formula');
    });
  });

  describe('removeBenefitFromEmployee', () => {
    it('should remove benefit assignment (soft delete)', async () => {
      // Arrange
      const assignmentId = 'assignment-1';
      mockRepository.removeEmployeeComponentAssignment.mockResolvedValue();

      // Act
      await service.removeBenefitFromEmployee(assignmentId, testOrgId, testUserId);

      // Assert
      expect(mockRepository.removeEmployeeComponentAssignment).toHaveBeenCalledWith(
        assignmentId,
        testOrgId,
        testUserId
      );
    });
  });

  // ==================== TRACKING & REPORTING ====================

  describe('getBenefitStatistics', () => {
    it('should fetch benefit usage statistics', async () => {
      // Arrange
      const mockStats = {
        total_components: 10,
        system_components: 7,
        custom_components: 3,
        earnings: 10,
        deductions: 0,
        benefits: 10
      };

      mockRepository.getComponentStatistics.mockResolvedValue(mockStats);

      // Act
      const result = await service.getBenefitStatistics(testOrgId);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockRepository.getComponentStatistics).toHaveBeenCalledWith(
        testOrgId,
        expect.objectContaining({
          componentType: 'earning',
          category: 'benefit'
        })
      );
    });
  });
});
