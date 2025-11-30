/**
 * Unit tests for ForfaitRuleService
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ForfaitRuleService from '../../../../../src/products/paylinq/services/forfaitRuleService.js';

describe('ForfaitRuleService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      createForfaitRule: jest.fn(),
      updateForfaitRule: jest.fn(),
      getForfaitRule: jest.fn(),
      listForfaitRules: jest.fn(),
      deleteForfaitRule: jest.fn(),
    };
    service = new ForfaitRuleService(mockRepository);
  });

  describe('createForfaitRule', () => {
    const organizationId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should create a forfait rule with valid data', async () => {
      const ruleData = {
        componentCode: 'BONUS',
        enabled: true,
        forfaitComponentCode: 'VACATION_ALLOWANCE',
        valueMapping: {
          amount: {
            sourceField: 'amount',
            targetField: 'calculatedAmount',
            required: true
          }
        },
        conditions: {
          minValue: 100,
          maxValue: 10000,
          requiresApproval: false
        },
        description: 'Auto-generate 5% vacation allowance on bonuses'
      };

      const expectedRule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...ruleData,
        organizationId,
        createdBy: userId,
        createdAt: new Date()
      };

      mockRepository.createForfaitRule.mockResolvedValue(expectedRule);

      const result = await service.createForfaitRule(
        ruleData,
        organizationId,
        userId
      );

      expect(result).toEqual(expectedRule);
      expect(mockRepository.createForfaitRule).toHaveBeenCalledWith(
        expect.objectContaining({
          componentCode: 'BONUS',
          enabled: true,
          forfaitComponentCode: 'VACATION_ALLOWANCE'
        }),
        organizationId,
        userId
      );
    });

    it('should throw validation error for invalid data', async () => {
      const invalidData = {
        componentCode: 'BONUS',
        enabled: true,
        // Missing required forfaitComponentCode
      };

      await expect(
        service.createForfaitRule(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });
  });

  describe('getForfaitRule', () => {
    const organizationId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
    const componentCode = 'BONUS';

    it('should return forfait rule when found', async () => {
      const mockRule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        componentCode,
        enabled: true,
        forfaitComponentCode: 'VACATION_ALLOWANCE',
        organizationId
      };

      mockRepository.getForfaitRule.mockResolvedValue(mockRule);

      const result = await service.getForfaitRule(componentCode, organizationId);

      expect(result).toEqual(mockRule);
      expect(mockRepository.getForfaitRule).toHaveBeenCalledWith(
        componentCode,
        organizationId
      );
    });

    it('should return null when forfait rule not found', async () => {
      mockRepository.getForfaitRule.mockResolvedValue(null);

      const result = await service.getForfaitRule(componentCode, organizationId);

      expect(result).toBeNull();
    });
  });

  describe('updateForfaitRule', () => {
    const organizationId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const componentCode = 'BONUS';

    it('should update forfait rule with valid data', async () => {
      const updateData = {
        enabled: false,
        description: 'Disabled temporarily'
      };

      const updatedRule = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        componentCode,
        enabled: false,
        description: 'Disabled temporarily',
        organizationId,
        updatedBy: userId
      };

      mockRepository.updateForfaitRule.mockResolvedValue(updatedRule);

      const result = await service.updateForfaitRule(
        componentCode,
        updateData,
        organizationId,
        userId
      );

      expect(result).toEqual(updatedRule);
      expect(mockRepository.updateForfaitRule).toHaveBeenCalledWith(
        componentCode,
        expect.objectContaining(updateData),
        organizationId,
        userId
      );
    });
  });

  describe('deleteForfaitRule', () => {
    const organizationId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const componentCode = 'BONUS';

    it('should delete forfait rule', async () => {
      mockRepository.deleteForfaitRule.mockResolvedValue(true);

      await service.deleteForfaitRule(componentCode, organizationId, userId);

      expect(mockRepository.deleteForfaitRule).toHaveBeenCalledWith(
        componentCode,
        organizationId,
        userId
      );
    });
  });

  describe('previewForfaitCalculation', () => {
    it('should calculate forfait based on configuration', async () => {
      const componentCode = 'BONUS';
      const configuration = {
        enabled: true,
        forfaitComponentCode: 'VACATION_ALLOWANCE',
        valueMapping: {
          amount: {
            sourceField: 'amount',
            targetField: 'calculatedAmount',
            required: true
          }
        },
        conditions: {
          percentage: 5
        }
      };
      const organizationId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';

      const result = await service.previewForfaitCalculation(
        componentCode,
        configuration,
        organizationId
      );

      expect(result).toHaveProperty('calculationPreview');
      expect(result.calculationPreview).toHaveProperty('forfaitComponentCode');
    });
  });

  describe('getForfaitRuleTemplates', () => {
    it('should return predefined templates', async () => {
      const templates = await service.getForfaitRuleTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('description');
    });
  });
});
