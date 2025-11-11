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

  // ==================== NEW COMPREHENSIVE VALIDATION TESTS ====================
  
  describe('isActive Field Validation', () => {
    it('should accept isActive=true', async () => {
      const component = {
        componentCode: 'TEST_ACTIVE',
        componentName: 'Test Active',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        isActive: true,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should accept isActive=false', async () => {
      const component = {
        componentCode: 'TEST_INACTIVE',
        componentName: 'Test Inactive',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        isActive: false,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should default isActive to true when not provided', async () => {
      const component = {
        componentCode: 'TEST_DEFAULT',
        componentName: 'Test Default',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
      };

      const { error, value } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
      expect(value.isActive).toBe(true);
    });

    it('should reject non-boolean isActive values', async () => {
      const component = {
        componentCode: 'TEST_INVALID',
        componentName: 'Test Invalid',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        isActive: 'yes', // Invalid: string instead of boolean
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('boolean');
    });
  });

  describe('componentType Field Validation', () => {
    const validTypes = ['earning', 'deduction', 'benefit', 'tax', 'reimbursement'];

    validTypes.forEach(type => {
      it(`should accept valid componentType: ${type}`, async () => {
        const component = {
          componentCode: `TEST_${type.toUpperCase()}`,
          componentName: `Test ${type}`,
          componentType: type,
          category: type === 'earning' ? 'regular_pay' : 'other',
          calculationType: 'fixed_amount',
          defaultAmount: 1000,
        };

        const { error } = PayComponentService.payComponentSchema.validate(component);
        expect(error).toBeUndefined();
      });
    });

    it('should reject invalid componentType', async () => {
      const component = {
        componentCode: 'TEST_INVALID',
        componentName: 'Test Invalid',
        componentType: 'invalid_type',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must be one of');
    });

    it('should require componentType field', async () => {
      const component = {
        componentCode: 'TEST_MISSING',
        componentName: 'Test Missing Type',
        // componentType: missing
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('componentType');
    });
  });

  describe('formula Field Validation', () => {
    it('should accept valid formula with calculationType=formula', async () => {
      const component = {
        componentCode: 'FORMULA_TEST',
        componentName: 'Formula Test',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'formula',
        formula: 'hours * rate',
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should accept null formula for non-formula calculationType', async () => {
      const component = {
        componentCode: 'FIXED_TEST',
        componentName: 'Fixed Test',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        formula: null,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should accept empty string formula', async () => {
      const component = {
        componentCode: 'EMPTY_FORMULA',
        componentName: 'Empty Formula',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        formula: '',
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should reject formula exceeding 1000 characters', async () => {
      const longFormula = 'a'.repeat(1001);
      const component = {
        componentCode: 'LONG_FORMULA',
        componentName: 'Long Formula',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'formula',
        formula: longFormula,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('less than or equal to 1000');
    });

    it('should accept complex formula expressions', async () => {
      const component = {
        componentCode: 'COMPLEX_FORMULA',
        componentName: 'Complex Formula',
        componentType: 'earning',
        category: 'bonus',
        calculationType: 'formula',
        formula: '(hours * rate) + (overtime_hours * rate * 1.5)',
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });
  });

  describe('metadata Field Validation', () => {
    it('should accept null metadata', async () => {
      const component = {
        componentCode: 'NULL_META',
        componentName: 'Null Metadata',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        metadata: null,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should accept empty metadata object', async () => {
      const component = {
        componentCode: 'EMPTY_META',
        componentName: 'Empty Metadata',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        metadata: {},
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should accept metadata with string values', async () => {
      const component = {
        componentCode: 'STRING_META',
        componentName: 'String Metadata',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        metadata: {
          description: 'Additional info',
          department: 'Engineering',
        },
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should accept metadata with number values', async () => {
      const component = {
        componentCode: 'NUMBER_META',
        componentName: 'Number Metadata',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        metadata: {
          priority: 1,
          order: 100,
        },
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should accept metadata with boolean values', async () => {
      const component = {
        componentCode: 'BOOL_META',
        componentName: 'Boolean Metadata',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        metadata: {
          isVisible: true,
          requiresApproval: false,
        },
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should accept metadata with nested objects', async () => {
      const component = {
        componentCode: 'NESTED_META',
        componentName: 'Nested Metadata',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        metadata: {
          settings: {
            displayName: 'Base Pay',
            icon: 'dollar-sign',
          },
          validation: {
            minValue: 0,
            maxValue: 100000,
          },
        },
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should accept metadata with arrays', async () => {
      const component = {
        componentCode: 'ARRAY_META',
        componentName: 'Array Metadata',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        metadata: {
          tags: ['salary', 'monthly', 'fixed'],
          allowedRoles: ['employee', 'contractor'],
        },
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should reject non-object metadata', async () => {
      const component = {
        componentCode: 'INVALID_META',
        componentName: 'Invalid Metadata',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        metadata: 'invalid string',
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('object');
    });
  });

  describe('calculationType Field Validation', () => {
    const validCalculationTypes = [
      'fixed', 'fixed_amount', 'percentage', 
      'hours_based', 'hourly_rate', 'formula', 'unit_based'
    ];

    validCalculationTypes.forEach(calcType => {
      it(`should accept valid calculationType: ${calcType}`, async () => {
        const component = {
          componentCode: `CALC_${calcType.toUpperCase()}`,
          componentName: `Calculation ${calcType}`,
          componentType: 'earning',
          category: 'regular_pay',
          calculationType: calcType,
          defaultAmount: calcType.includes('formula') ? undefined : 1000,
          formula: calcType.includes('formula') ? 'hours * rate' : undefined,
        };

        const { error } = PayComponentService.payComponentSchema.validate(component);
        expect(error).toBeUndefined();
      });
    });

    it('should reject invalid calculationType', async () => {
      const component = {
        componentCode: 'INVALID_CALC',
        componentName: 'Invalid Calculation',
        componentType: 'earning',
        category: 'regular_pay',
        calculationType: 'invalid_type',
        defaultAmount: 5000,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('must be one of');
    });
  });

  describe('Combined Field Validation', () => {
    it('should accept component with all optional fields', async () => {
      const component = {
        componentCode: 'FULL_COMPONENT',
        componentName: 'Full Component',
        componentType: 'earning',
        category: 'bonus',
        calculationType: 'percentage',
        defaultRate: 10.5,
        defaultAmount: 1000,
        formula: '',
        isTaxable: true,
        isRecurring: false,
        isPreTax: false,
        isActive: true,
        isSystemComponent: false,
        appliesToGross: true,
        appliesToOvertime: true,
        affectsTaxableIncome: true,
        description: 'A comprehensive test component',
        metadata: {
          category: 'performance',
          frequency: 'quarterly',
        },
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should accept component with minimum required fields', async () => {
      const component = {
        componentCode: 'MIN_COMPONENT',
        componentName: 'Minimal Component',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should validate earning type with deduction category combination', async () => {
      const component = {
        componentCode: 'INVALID_COMBO',
        componentName: 'Invalid Combination',
        componentType: 'earning',
        category: 'tax', // tax is deduction category
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
      };

      // Schema validation passes, but business logic should reject
      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
      
      // Business rule validation should catch this
      expect(() => {
        PayComponentService.validateCategoryForType(component.componentType, component.category);
      }).toThrow(ValidationError);
    });

    it('should accept benefit type (normalized to deduction) with benefit category', async () => {
      const component = {
        componentCode: 'BENEFIT_TEST',
        componentName: 'Benefit Test',
        componentType: 'benefit',
        category: 'benefit',
        calculationType: 'fixed_amount',
        defaultAmount: 500,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should accept tax type (normalized to deduction) with tax category', async () => {
      const component = {
        componentCode: 'TAX_TEST',
        componentName: 'Tax Test',
        componentType: 'tax',
        category: 'tax',
        calculationType: 'percentage',
        defaultRate: 15,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });
  });

  describe('Edge Cases and Boundary Testing', () => {
    it('should accept componentCode at minimum length (2 characters)', async () => {
      const component = {
        componentCode: 'AB',
        componentName: 'Short Code',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should accept componentCode at maximum length (50 characters)', async () => {
      const component = {
        componentCode: 'A'.repeat(50),
        componentName: 'Long Code',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should reject componentCode below minimum length', async () => {
      const component = {
        componentCode: 'A',
        componentName: 'Too Short',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('at least 2 characters');
    });

    it('should reject componentCode exceeding maximum length', async () => {
      const component = {
        componentCode: 'A'.repeat(51),
        componentName: 'Too Long',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('less than or equal to 50');
    });

    it('should accept defaultAmount of 0', async () => {
      const component = {
        componentCode: 'ZERO_AMOUNT',
        componentName: 'Zero Amount',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        defaultAmount: 0,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should reject negative defaultAmount', async () => {
      const component = {
        componentCode: 'NEG_AMOUNT',
        componentName: 'Negative Amount',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        defaultAmount: -100,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('greater than or equal to 0');
    });

    it('should accept defaultRate of 0', async () => {
      const component = {
        componentCode: 'ZERO_RATE',
        componentName: 'Zero Rate',
        componentType: 'earning',
        calculationType: 'percentage',
        defaultRate: 0,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should reject negative defaultRate', async () => {
      const component = {
        componentCode: 'NEG_RATE',
        componentName: 'Negative Rate',
        componentType: 'earning',
        calculationType: 'percentage',
        defaultRate: -5,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('greater than or equal to 0');
    });

    it('should accept very large defaultAmount', async () => {
      const component = {
        componentCode: 'LARGE_AMOUNT',
        componentName: 'Large Amount',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        defaultAmount: 9999999.99,
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should accept description at maximum length (500 characters)', async () => {
      const component = {
        componentCode: 'MAX_DESC',
        componentName: 'Max Description',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        description: 'A'.repeat(500),
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeUndefined();
    });

    it('should reject description exceeding maximum length', async () => {
      const component = {
        componentCode: 'LONG_DESC',
        componentName: 'Long Description',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        defaultAmount: 5000,
        description: 'A'.repeat(501),
      };

      const { error } = PayComponentService.payComponentSchema.validate(component);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('less than or equal to 500');
    });
  });
});
