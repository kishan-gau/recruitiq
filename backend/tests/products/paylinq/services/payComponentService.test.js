/**
 * Pay Component Service - Business Logic Tests
 * 
 * Tests business rules and validations for pay component management
 * Following industry standards for payroll system validation
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import PayComponentService from '../../../../src/products/paylinq/services/payComponentService.js';
import { ValidationError, ConflictError } from '../../../../src/middleware/errorHandler.js';

// Mock the repository
jest.unstable_mockModule('../../../../src/products/paylinq/repositories/payComponentRepository.js', () => {
  const mockRepository = {
    createPayComponent: jest.fn(),
    findPayComponentByCode: jest.fn(),
    findPayComponents: jest.fn(),
    findPayComponentById: jest.fn(),
    updatePayComponent: jest.fn(),
    deletePayComponent: jest.fn(),
    deactivatePayComponent: jest.fn(),
  };
  
  return {
    default: class PayComponentRepository {
      constructor() {
        Object.assign(this, mockRepository);
      }
    }
  };
});

// Mock logger
jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

describe('PayComponentService - Business Logic', () => {
  const organizationId = '123e4567-e89b-12d3-a456-426614174000';
  const userId = '123e4567-e89b-12d3-a456-426614174001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayComponent', () => {
    describe('Code Format Validation', () => {
      it('should accept valid uppercase code with numbers and underscores', async () => {
        const validComponent = {
          componentCode: 'BASE_SALARY_2024',
          componentName: 'Base Salary',
          componentType: 'earning',
          category: 'regular_pay',
          calculationType: 'fixed_amount',
          defaultAmount: 5000,
        };

        PayComponentService.payComponentRepository.findPayComponentByCode.mockResolvedValue(null);
        PayComponentService.payComponentRepository.createPayComponent.mockResolvedValue({
          id: '123',
          ...validComponent,
        });

        await expect(
          PayComponentService.createPayComponent(validComponent, organizationId, userId)
        ).resolves.toBeDefined();
      });

      it('should reject lowercase code', async () => {
        const invalidComponent = {
          componentCode: 'base_salary',
          componentName: 'Base Salary',
          componentType: 'earning',
          category: 'regular_pay',
          calculationType: 'fixed_amount',
          defaultAmount: 5000,
        };

        await expect(
          PayComponentService.createPayComponent(invalidComponent, organizationId, userId)
        ).rejects.toThrow(ValidationError);
        
        await expect(
          PayComponentService.createPayComponent(invalidComponent, organizationId, userId)
        ).rejects.toThrow('uppercase letters, numbers, and underscores only');
      });

      it('should reject code with special characters', async () => {
        const invalidComponent = {
          componentCode: 'BASE-SALARY!',
          componentName: 'Base Salary',
          componentType: 'earning',
          category: 'regular_pay',
          calculationType: 'fixed_amount',
          defaultAmount: 5000,
        };

        await expect(
          PayComponentService.createPayComponent(invalidComponent, organizationId, userId)
        ).rejects.toThrow(ValidationError);
      });

      it('should reject code with spaces', async () => {
        const invalidComponent = {
          componentCode: 'BASE SALARY',
          componentName: 'Base Salary',
          componentType: 'earning',
          category: 'regular_pay',
          calculationType: 'fixed_amount',
          defaultAmount: 5000,
        };

        await expect(
          PayComponentService.createPayComponent(invalidComponent, organizationId, userId)
        ).rejects.toThrow(ValidationError);
      });
    });

    describe('Duplicate Code Prevention', () => {
      it('should prevent creating component with duplicate code', async () => {
        const existingComponent = {
          id: '456',
          component_code: 'BASE',
          component_name: 'Base Salary',
        };

        const newComponent = {
          componentCode: 'BASE',
          componentName: 'Base Pay',
          componentType: 'earning',
          category: 'regular_pay',
          calculationType: 'fixed_amount',
          defaultAmount: 5000,
        };

        PayComponentService.payComponentRepository.findPayComponentByCode
          .mockResolvedValue(existingComponent);

        await expect(
          PayComponentService.createPayComponent(newComponent, organizationId, userId)
        ).rejects.toThrow(ConflictError);

        await expect(
          PayComponentService.createPayComponent(newComponent, organizationId, userId)
        ).rejects.toThrow("already exists");
      });

      it('should provide helpful error message for duplicate code', async () => {
        const existingComponent = {
          id: '456',
          component_code: 'BONUS',
        };

        const newComponent = {
          componentCode: 'BONUS',
          componentName: 'Performance Bonus',
          componentType: 'earning',
          category: 'bonus',
          calculationType: 'fixed_amount',
          defaultAmount: 1000,
        };

        PayComponentService.payComponentRepository.findPayComponentByCode
          .mockResolvedValue(existingComponent);

        await expect(
          PayComponentService.createPayComponent(newComponent, organizationId, userId)
        ).rejects.toThrow("Component codes must be unique");
      });
    });

    describe('Category Validation for Component Type', () => {
      it('should accept valid earning categories for earning type', async () => {
        const earningCategories = ['regular', 'regular_pay', 'overtime', 'bonus', 'commission', 'allowance'];

        for (const category of earningCategories) {
          const component = {
            componentCode: `EARN_${category.toUpperCase()}`,
            componentName: `Test ${category}`,
            componentType: 'earning',
            category: category,
            calculationType: 'fixed_amount',
            defaultAmount: 100,
          };

          PayComponentService.payComponentRepository.findPayComponentByCode.mockResolvedValue(null);
          PayComponentService.payComponentRepository.createPayComponent.mockResolvedValue({
            id: '123',
            ...component,
          });

          await expect(
            PayComponentService.createPayComponent(component, organizationId, userId)
          ).resolves.toBeDefined();
        }
      });

      it('should accept valid deduction categories for deduction type', async () => {
        const deductionCategories = ['tax', 'benefit', 'garnishment', 'loan'];

        for (const category of deductionCategories) {
          const component = {
            componentCode: `DED_${category.toUpperCase()}`,
            componentName: `Test ${category}`,
            componentType: 'deduction',
            category: category,
            calculationType: 'fixed_amount',
            defaultAmount: 50,
          };

          PayComponentService.payComponentRepository.findPayComponentByCode.mockResolvedValue(null);
          PayComponentService.payComponentRepository.createPayComponent.mockResolvedValue({
            id: '123',
            ...component,
          });

          await expect(
            PayComponentService.createPayComponent(component, organizationId, userId)
          ).resolves.toBeDefined();
        }
      });

      it('should reject deduction category for earning type', async () => {
        const component = {
          componentCode: 'INVALID_EARN',
          componentName: 'Invalid Earning',
          componentType: 'earning',
          category: 'tax', // Tax is a deduction category
          calculationType: 'fixed_amount',
          defaultAmount: 100,
        };

        await expect(
          PayComponentService.createPayComponent(component, organizationId, userId)
        ).rejects.toThrow(ValidationError);

        await expect(
          PayComponentService.createPayComponent(component, organizationId, userId)
        ).rejects.toThrow("Invalid category 'tax' for earning component");
      });

      it('should reject earning category for deduction type', async () => {
        const component = {
          componentCode: 'INVALID_DED',
          componentName: 'Invalid Deduction',
          componentType: 'deduction',
          category: 'overtime', // Overtime is an earning category
          calculationType: 'fixed_amount',
          defaultAmount: 50,
        };

        await expect(
          PayComponentService.createPayComponent(component, organizationId, userId)
        ).rejects.toThrow(ValidationError);

        await expect(
          PayComponentService.createPayComponent(component, organizationId, userId)
        ).rejects.toThrow("Invalid category 'overtime' for deduction component");
      });

      it('should allow "other" category for both types', async () => {
        const earningComponent = {
          componentCode: 'OTHER_EARN',
          componentName: 'Other Earning',
          componentType: 'earning',
          category: 'other',
          calculationType: 'fixed_amount',
          defaultAmount: 100,
        };

        const deductionComponent = {
          componentCode: 'OTHER_DED',
          componentName: 'Other Deduction',
          componentType: 'deduction',
          category: 'other',
          calculationType: 'fixed_amount',
          defaultAmount: 50,
        };

        PayComponentService.payComponentRepository.findPayComponentByCode.mockResolvedValue(null);
        PayComponentService.payComponentRepository.createPayComponent.mockResolvedValue({
          id: '123',
        });

        await expect(
          PayComponentService.createPayComponent(earningComponent, organizationId, userId)
        ).resolves.toBeDefined();

        await expect(
          PayComponentService.createPayComponent(deductionComponent, organizationId, userId)
        ).resolves.toBeDefined();
      });
    });

    describe('Required Field Validation', () => {
      it('should reject component without code', async () => {
        const component = {
          componentName: 'Base Salary',
          componentType: 'earning',
          calculationType: 'fixed_amount',
          defaultAmount: 5000,
        };

        await expect(
          PayComponentService.createPayComponent(component, organizationId, userId)
        ).rejects.toThrow(ValidationError);
      });

      it('should reject component without name', async () => {
        const component = {
          componentCode: 'BASE',
          componentType: 'earning',
          calculationType: 'fixed_amount',
          defaultAmount: 5000,
        };

        await expect(
          PayComponentService.createPayComponent(component, organizationId, userId)
        ).rejects.toThrow(ValidationError);
      });

      it('should reject component without type', async () => {
        const component = {
          componentCode: 'BASE',
          componentName: 'Base Salary',
          calculationType: 'fixed_amount',
          defaultAmount: 5000,
        };

        await expect(
          PayComponentService.createPayComponent(component, organizationId, userId)
        ).rejects.toThrow(ValidationError);
      });

      it('should reject component without calculation type', async () => {
        const component = {
          componentCode: 'BASE',
          componentName: 'Base Salary',
          componentType: 'earning',
          defaultAmount: 5000,
        };

        await expect(
          PayComponentService.createPayComponent(component, organizationId, userId)
        ).rejects.toThrow(ValidationError);
      });
    });
  });

  describe('updatePayComponent', () => {
    const componentId = '123e4567-e89b-12d3-a456-426614174002';

    describe('System Component Protection', () => {
      it('should prevent updating system components', async () => {
        const systemComponent = {
          id: componentId,
          component_code: 'GROSS_PAY',
          component_name: 'Gross Pay',
          is_system_component: true,
        };

        PayComponentService.payComponentRepository.findPayComponentById
          .mockResolvedValue(systemComponent);

        const updates = {
          componentName: 'Modified Gross Pay',
        };

        await expect(
          PayComponentService.updatePayComponent(componentId, updates, organizationId, userId)
        ).rejects.toThrow(ValidationError);

        await expect(
          PayComponentService.updatePayComponent(componentId, updates, organizationId, userId)
        ).rejects.toThrow('System components cannot be modified');
      });
    });

    describe('Code Update Validation', () => {
      it('should validate code format when updating', async () => {
        const existingComponent = {
          id: componentId,
          component_code: 'OLD_CODE',
          is_system_component: false,
        };

        PayComponentService.payComponentRepository.findPayComponentById
          .mockResolvedValue(existingComponent);

        const updates = {
          componentCode: 'new-code', // Invalid: lowercase and hyphen
        };

        await expect(
          PayComponentService.updatePayComponent(componentId, updates, organizationId, userId)
        ).rejects.toThrow(ValidationError);

        await expect(
          PayComponentService.updatePayComponent(componentId, updates, organizationId, userId)
        ).rejects.toThrow('uppercase letters, numbers, and underscores only');
      });

      it('should prevent updating to duplicate code', async () => {
        const existingComponent = {
          id: componentId,
          component_code: 'OLD_CODE',
          is_system_component: false,
        };

        const duplicateComponent = {
          id: 'different-id',
          component_code: 'NEW_CODE',
        };

        PayComponentService.payComponentRepository.findPayComponentById
          .mockResolvedValue(existingComponent);
        PayComponentService.payComponentRepository.findPayComponentByCode
          .mockResolvedValue(duplicateComponent);

        const updates = {
          componentCode: 'NEW_CODE',
        };

        await expect(
          PayComponentService.updatePayComponent(componentId, updates, organizationId, userId)
        ).rejects.toThrow(ConflictError);
      });

      it('should allow updating to same code (no change)', async () => {
        const existingComponent = {
          id: componentId,
          component_code: 'SAME_CODE',
          is_system_component: false,
        };

        PayComponentService.payComponentRepository.findPayComponentById
          .mockResolvedValue(existingComponent);
        PayComponentService.payComponentRepository.findPayComponentByCode
          .mockResolvedValue(existingComponent); // Same component
        PayComponentService.payComponentRepository.updatePayComponent
          .mockResolvedValue(existingComponent);

        const updates = {
          componentCode: 'SAME_CODE',
          componentName: 'Updated Name',
        };

        await expect(
          PayComponentService.updatePayComponent(componentId, updates, organizationId, userId)
        ).resolves.toBeDefined();
      });
    });

    describe('Category Update Validation', () => {
      it('should validate category when updating', async () => {
        const existingComponent = {
          id: componentId,
          component_code: 'BONUS',
          component_type: 'earning',
          category: 'bonus',
          is_system_component: false,
        };

        PayComponentService.payComponentRepository.findPayComponentById
          .mockResolvedValue(existingComponent);

        const updates = {
          category: 'tax', // Invalid: tax is for deductions
        };

        await expect(
          PayComponentService.updatePayComponent(componentId, updates, organizationId, userId)
        ).rejects.toThrow(ValidationError);
      });
    });
  });

  describe('deletePayComponent', () => {
    const componentId = '123e4567-e89b-12d3-a456-426614174002';

    describe('System Component Protection', () => {
      it('should prevent deleting system components', async () => {
        const systemComponent = {
          id: componentId,
          component_code: 'NET_PAY',
          is_system_component: true,
        };

        PayComponentService.payComponentRepository.findPayComponentById
          .mockResolvedValue(systemComponent);

        await expect(
          PayComponentService.deletePayComponent(componentId, organizationId, userId)
        ).rejects.toThrow(ValidationError);

        await expect(
          PayComponentService.deletePayComponent(componentId, organizationId, userId)
        ).rejects.toThrow('System components cannot be deleted');
      });
    });

    describe('Usage Validation', () => {
      it('should prevent deleting component assigned to employees', async () => {
        const component = {
          id: componentId,
          component_code: 'CUSTOM',
          is_system_component: false,
        };

        PayComponentService.payComponentRepository.findPayComponentById
          .mockResolvedValue(component);
        PayComponentService.payComponentRepository.deletePayComponent
          .mockRejectedValue(new Error('assigned to employees'));

        await expect(
          PayComponentService.deletePayComponent(componentId, organizationId, userId)
        ).rejects.toThrow(ConflictError);

        await expect(
          PayComponentService.deletePayComponent(componentId, organizationId, userId)
        ).rejects.toThrow('remove all employee assignments');
      });

      it('should provide helpful error message when component is in use', async () => {
        const component = {
          id: componentId,
          component_code: 'USED',
          is_system_component: false,
        };

        PayComponentService.payComponentRepository.findPayComponentById
          .mockResolvedValue(component);
        PayComponentService.payComponentRepository.deletePayComponent
          .mockRejectedValue(new Error('assigned to employees'));

        try {
          await PayComponentService.deletePayComponent(componentId, organizationId, userId);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('deactivate the component instead');
        }
      });
    });

    describe('Successful Deletion', () => {
      it('should delete component when not in use', async () => {
        const component = {
          id: componentId,
          component_code: 'UNUSED',
          is_system_component: false,
        };

        PayComponentService.payComponentRepository.findPayComponentById
          .mockResolvedValue(component);
        PayComponentService.payComponentRepository.deletePayComponent
          .mockResolvedValue(true);

        const result = await PayComponentService.deletePayComponent(
          componentId,
          organizationId,
          userId
        );

        expect(result).toBe(true);
      });
    });
  });

  describe('validateCategoryForType', () => {
    it('should allow null/undefined category', () => {
      expect(() => {
        PayComponentService.validateCategoryForType('earning', null);
      }).not.toThrow();

      expect(() => {
        PayComponentService.validateCategoryForType('earning', undefined);
      }).not.toThrow();
    });

    it('should normalize benefit type to deduction', () => {
      expect(() => {
        PayComponentService.validateCategoryForType('benefit', 'benefit');
      }).not.toThrow();
    });

    it('should normalize tax type to deduction', () => {
      expect(() => {
        PayComponentService.validateCategoryForType('tax', 'tax');
      }).not.toThrow();
    });
  });
});
