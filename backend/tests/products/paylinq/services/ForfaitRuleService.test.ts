/**
 * ForfaitRuleService Test Suite
 * 
 * Tests for PayLinQ forfait rule service following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Dependency injection pattern
 * - Focus on validation schemas and business logic
 * 
 * VERIFIED METHODS (from grep analysis):
 * 1. setForfaitRule(componentCode, forfaitRule, organizationId, userId)
 * 2. getForfaitRule(componentCode, organizationId)
 * 3. removeForfaitRule(componentCode, organizationId, userId)
 * 4. autoCreateForfaitAssignment(benefitAssignment, organizationId, userId)
 * 5. updateLinkedForfaitAssignment(benefitAssignmentId, newData, organizationId, userId)
 * 6. deleteLinkedForfaitAssignment(benefitAssignmentId, organizationId, userId)
 * 7. calculateForfaitForPayroll(payrollRunId, organizationId)
 * 8. _calculateForfaitForEmployee(employeeId, payPeriodStart, payPeriodEnd, organizationId)
 * 9. _calculateForfaitAmount(assignment, component, forfaitConfig, payPeriodStart, payPeriodEnd)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ForfaitRuleService from '../../../../src/products/paylinq/services/ForfaitRuleService.js';

describe('ForfaitRuleService', () => {
  let service: any;
  let mockRepository: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testComponentId = '323e4567-e89b-12d3-a456-426614174002';
  const testBenefitAssignmentId = '423e4567-e89b-12d3-a456-426614174003';

  beforeEach(() => {
    // Create comprehensive mock repository
    mockRepository = {
      findPayComponentByCode: jest.fn(),
      updatePayComponent: jest.fn(),
      findPayComponentById: jest.fn(),
      createAssignment: jest.fn(),
      updateAssignment: jest.fn(),
      deleteAssignment: jest.fn(),
      findAssignmentsByEmployee: jest.fn()
    };

    // Inject mock repository using DI pattern
    service = new ForfaitRuleService(mockRepository);
  });

  // ==================== Validation Schemas ====================

  describe('forfaitRuleSchema validation', () => {
    it('should accept valid forfait rule with all fields', async () => {
      // Arrange
      const validRule = {
        enabled: true,
        forfaitComponentCode: 'FORFAIT_CAR',
        valueMapping: {
          catalogValue: {
            sourceField: 'catalog_value',
            targetField: 'base_amount',
            required: true
          }
        },
        conditions: {
          minValue: 0,
          maxValue: 100000,
          requiresApproval: false
        },
        description: 'Company car forfait rule'
      };

      // Act
      const { error } = await ForfaitRuleService.forfaitRuleSchema.validate(validRule);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should accept disabled forfait rule without forfaitComponentCode', async () => {
      // Arrange
      const disabledRule = {
        enabled: false
      };

      // Act
      const { error } = await ForfaitRuleService.forfaitRuleSchema.validate(disabledRule);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should reject enabled rule without forfaitComponentCode', async () => {
      // Arrange
      const invalidRule = {
        enabled: true,
        valueMapping: {}
      };

      // Act
      const { error } = await ForfaitRuleService.forfaitRuleSchema.validate(invalidRule);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('forfaitComponentCode');
    });

    it('should reject rule with invalid enabled type', async () => {
      // Arrange
      const invalidRule = {
        enabled: 'yes' // Should be boolean
      };

      // Act
      const { error } = await ForfaitRuleService.forfaitRuleSchema.validate(invalidRule);

      // Assert
      expect(error).toBeDefined();
    });

    it('should accept minimal valid enabled rule', async () => {
      // Arrange
      const minimalRule = {
        enabled: true,
        forfaitComponentCode: 'FORFAIT_CAR',
        valueMapping: {}
      };

      // Act
      const { error } = await ForfaitRuleService.forfaitRuleSchema.validate(minimalRule);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should strip unknown fields from rule', async () => {
      // Arrange
      const ruleWithExtra = {
        enabled: true,
        forfaitComponentCode: 'FORFAIT_CAR',
        valueMapping: {},
        unknownField: 'should be removed'
      };

      // Act
      const { error, value } = await ForfaitRuleService.forfaitRuleSchema.validate(ruleWithExtra);

      // Assert
      expect(error).toBeUndefined();
      expect(value).not.toHaveProperty('unknownField');
    });
  });

  describe('catalogValueSchema validation', () => {
    it('should accept valid catalog value configuration', async () => {
      // Arrange
      const validConfig = {
        catalogValue: 50000,
        makeModel: 'Toyota Camry 2024',
        licensePlate: 'ABC-123',
        yearOfManufacture: 2024,
        acquisitionDate: new Date('2024-01-15'),
        notes: 'Company car for sales team'
      };

      // Act
      const { error } = await ForfaitRuleService.catalogValueSchema.validate(validConfig);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should require catalogValue', async () => {
      // Arrange
      const invalidConfig = {
        makeModel: 'Toyota Camry'
      };

      // Act
      const { error } = await ForfaitRuleService.catalogValueSchema.validate(invalidConfig);

      // Assert
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('catalogValue');
    });

    it('should reject negative catalogValue', async () => {
      // Arrange
      const invalidConfig = {
        catalogValue: -1000
      };

      // Act
      const { error } = await ForfaitRuleService.catalogValueSchema.validate(invalidConfig);

      // Assert
      expect(error).toBeDefined();
    });

    it('should reject invalid yearOfManufacture', async () => {
      // Arrange
      const currentYear = new Date().getFullYear();
      const invalidConfig = {
        catalogValue: 50000,
        yearOfManufacture: currentYear + 5 // Future year
      };

      // Act
      const { error } = await ForfaitRuleService.catalogValueSchema.validate(invalidConfig);

      // Assert
      expect(error).toBeDefined();
    });

    it('should accept minimal valid configuration', async () => {
      // Arrange
      const minimalConfig = {
        catalogValue: 25000
      };

      // Act
      const { error } = await ForfaitRuleService.catalogValueSchema.validate(minimalConfig);

      // Assert
      expect(error).toBeUndefined();
    });
  });

  describe('housingValueSchema validation', () => {
    it('should accept valid housing configuration', async () => {
      // Arrange
      const validConfig = {
        rentalValue: 1500,
        address: '123 Main St, Paramaribo',
        propertyType: 'house',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        notes: 'Furnished house near office'
      };

      // Act
      const { error } = await ForfaitRuleService.housingValueSchema.validate(validConfig);

      // Assert
      expect(error).toBeUndefined();
    });

    it('should require rentalValue and startDate', async () => {
      // Arrange
      const invalidConfig = {
        address: '123 Main St'
      };

      // Act
      const { error } = await ForfaitRuleService.housingValueSchema.validate(invalidConfig);

      // Assert
      expect(error).toBeDefined();
    });

    it('should accept valid property types', async () => {
      // Arrange
      const propertyTypes = ['house', 'apartment', 'furnished', 'unfurnished'];

      // Act & Assert
      for (const propType of propertyTypes) {
        const config = {
          rentalValue: 1500,
          propertyType: propType,
          startDate: new Date('2024-01-01')
        };
        const { error } = await ForfaitRuleService.housingValueSchema.validate(config);
        expect(error).toBeUndefined();
      }
    });

    it('should reject invalid property type', async () => {
      // Arrange
      const invalidConfig = {
        rentalValue: 1500,
        propertyType: 'invalid_type',
        startDate: new Date('2024-01-01')
      };

      // Act
      const { error } = await ForfaitRuleService.housingValueSchema.validate(invalidConfig);

      // Assert
      expect(error).toBeDefined();
    });

    it('should reject negative rentalValue', async () => {
      // Arrange
      const invalidConfig = {
        rentalValue: -500,
        startDate: new Date('2024-01-01')
      };

      // Act
      const { error } = await ForfaitRuleService.housingValueSchema.validate(invalidConfig);

      // Assert
      expect(error).toBeDefined();
    });
  });

  // ==================== Business Logic Tests (with Mocks) ====================

  describe('setForfaitRule', () => {
    it('should validate forfait rule before setting', async () => {
      // Arrange
      const invalidRule = {
        enabled: true
        // Missing required forfaitComponentCode
      };

      // Act & Assert
      await expect(
        service.setForfaitRule('BENEFIT_CAR', invalidRule, testOrganizationId, testUserId)
      ).rejects.toThrow();
    });

    it('should throw NotFoundError when component does not exist', async () => {
      // Arrange
      const validRule = {
        enabled: true,
        forfaitComponentCode: 'FORFAIT_CAR',
        valueMapping: {}
      };

      mockRepository.findPayComponentByCode.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.setForfaitRule('NONEXISTENT_COMPONENT', validRule, testOrganizationId, testUserId)
      ).rejects.toThrow('Component \'NONEXISTENT_COMPONENT\' not found');
    });

    it('should throw NotFoundError when forfait component does not exist', async () => {
      // Arrange
      const validRule = {
        enabled: true,
        forfaitComponentCode: 'NONEXISTENT_FORFAIT',
        valueMapping: {}
      };

      const mockComponent = {
        id: testComponentId,
        component_code: 'BENEFIT_CAR',
        component_type: 'benefit'
      };

      mockRepository.findPayComponentByCode
        .mockResolvedValueOnce(mockComponent) // Benefit component found
        .mockResolvedValueOnce(null); // Forfait component not found

      // Act & Assert
      await expect(
        service.setForfaitRule('BENEFIT_CAR', validRule, testOrganizationId, testUserId)
      ).rejects.toThrow('Forfait component \'NONEXISTENT_FORFAIT\' not found');
    });

    it('should validate forfait component type', async () => {
      // Arrange
      const validRule = {
        enabled: true,
        forfaitComponentCode: 'INVALID_TYPE_COMPONENT',
        valueMapping: {}
      };

      const mockBenefitComponent = {
        id: testComponentId,
        component_code: 'BENEFIT_CAR',
        component_type: 'benefit'
      };

      const mockInvalidForfaitComponent = {
        id: '523e4567-e89b-12d3-a456-426614174004',
        component_code: 'INVALID_TYPE_COMPONENT',
        component_type: 'earning' // Invalid for forfait
      };

      mockRepository.findPayComponentByCode
        .mockResolvedValueOnce(mockBenefitComponent)
        .mockResolvedValueOnce(mockInvalidForfaitComponent);

      // Act & Assert
      await expect(
        service.setForfaitRule('BENEFIT_CAR', validRule, testOrganizationId, testUserId)
      ).rejects.toThrow('Forfait component must be of type: tax, deduction, or benefit');
    });

    it('should successfully set forfait rule', async () => {
      // Arrange
      const validRule = {
        enabled: true,
        forfaitComponentCode: 'FORFAIT_CAR',
        valueMapping: {
          catalogValue: {
            sourceField: 'catalog_value',
            targetField: 'base_amount',
            required: true
          }
        },
        description: 'Company car forfait'
      };

      const mockBenefitComponent = {
        id: testComponentId,
        component_code: 'BENEFIT_CAR',
        component_type: 'benefit',
        calculation_metadata: {}
      };

      const mockForfaitComponent = {
        id: '523e4567-e89b-12d3-a456-426614174004',
        component_code: 'FORFAIT_CAR',
        component_type: 'tax'
      };

      mockRepository.findPayComponentByCode
        .mockResolvedValueOnce(mockBenefitComponent)
        .mockResolvedValueOnce(mockForfaitComponent);
      
      mockRepository.updatePayComponent.mockResolvedValue(true);

      // Act
      const result = await service.setForfaitRule('BENEFIT_CAR', validRule, testOrganizationId, testUserId);

      // Assert
      expect(result).toHaveProperty('componentCode', 'BENEFIT_CAR');
      expect(result).toHaveProperty('forfaitRule');
      expect(result.forfaitRule.enabled).toBe(true);
      expect(result.forfaitRule.forfaitComponentCode).toBe('FORFAIT_CAR');
      expect(mockRepository.updatePayComponent).toHaveBeenCalledWith(
        testComponentId,
        expect.objectContaining({
          calculation_metadata: expect.objectContaining({
            forfaitRule: expect.objectContaining({
              enabled: true,
              forfaitComponentCode: 'FORFAIT_CAR'
            })
          })
        }),
        testOrganizationId,
        testUserId
      );
    });

    it('should disable forfait rule when enabled is false', async () => {
      // Arrange
      const disableRule = {
        enabled: false
      };

      const mockComponent = {
        id: testComponentId,
        component_code: 'BENEFIT_CAR',
        component_type: 'benefit',
        calculation_metadata: {
          forfaitRule: {
            enabled: true,
            forfaitComponentCode: 'FORFAIT_CAR'
          }
        }
      };

      mockRepository.findPayComponentByCode.mockResolvedValue(mockComponent);
      mockRepository.updatePayComponent.mockResolvedValue(true);

      // Act
      const result = await service.setForfaitRule('BENEFIT_CAR', disableRule, testOrganizationId, testUserId);

      // Assert
      expect(result.forfaitRule.enabled).toBe(false);
      expect(mockRepository.updatePayComponent).toHaveBeenCalledWith(
        testComponentId,
        expect.objectContaining({
          calculation_metadata: expect.objectContaining({
            forfaitRule: expect.objectContaining({
              enabled: false
            })
          })
        }),
        testOrganizationId,
        testUserId
      );
    });
  });
});
