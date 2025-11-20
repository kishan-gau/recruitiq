import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PayComponentService from '../../../../src/products/paylinq/services/payComponentService.js';
import { mapComponentDbToApi, mapComponentsDbToApi } from '../../../../src/products/paylinq/dto/payComponentDto.js';

// Helper function to create DB format pay component (snake_case)
const createDbComponent = (overrides = {}) => ({
  id: overrides.id || '123e4567-e89b-12d3-a456-426614174001',
  organization_id: overrides.organization_id || '123e4567-e89b-12d3-a456-426614174000',
  component_code: 'TEST_CODE',
  component_name: 'Test Component',
  component_type: 'earning',
  description: 'Test description',
  calculation_type: 'fixed_amount',
  formula: null,
  category: 'regular_pay',
  is_taxable: true,
  is_system_defined: false,
  status: 'active',
  requires_amount_input: false,
  requires_hours_input: false,
  affects_provident_fund: false,
  affects_overtime: false,
  display_order: 1,
  calculation_metadata: {},
  compliance_tags: [],
  created_by: '123e4567-e89b-12d3-a456-426614174010',
  updated_by: '123e4567-e89b-12d3-a456-426614174010',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
  ...overrides
});

// Helper for component formula (DB format)
const createDbFormula = (overrides = {}) => ({
  id: overrides.id || '123e4567-e89b-12d3-a456-426614174005',
  pay_component_id: overrides.pay_component_id || '123e4567-e89b-12d3-a456-426614174001',
  organization_id: overrides.organization_id || '123e4567-e89b-12d3-a456-426614174000',
  formula_name: 'Test Formula',
  formula_expression: 'gross_pay * 0.10',
  version: 1,
  is_active: true,
  created_by: '123e4567-e89b-12d3-a456-426614174010',
  created_at: new Date('2024-01-01'),
  ...overrides
});

// Helper for custom component (DB format)
const createDbCustomComponent = (overrides = {}) => ({
  id: overrides.id || '123e4567-e89b-12d3-a456-426614174006',
  employee_id: overrides.employee_id || '123e4567-e89b-12d3-a456-426614174007',
  pay_component_id: overrides.pay_component_id || '123e4567-e89b-12d3-a456-426614174001',
  organization_id: overrides.organization_id || '123e4567-e89b-12d3-a456-426614174000',
  custom_rate: 25.50,
  custom_amount: null,
  effective_from: new Date('2024-01-01'),
  effective_to: null,
  is_active: true,
  created_by: '123e4567-e89b-12d3-a456-426614174010',
  created_at: new Date('2024-01-01'),
  ...overrides
});

describe('PayComponentService', () => {
  let service;
  let mockRepository;
  const orgId = '123e4567-e89b-12d3-a456-426614174000';
  const userId = '123e4567-e89b-12d3-a456-426614174010';

  beforeEach(() => {
    mockRepository = {
      createPayComponent: jest.fn(),
      findPayComponents: jest.fn(),
      findPayComponentById: jest.fn(),
      findPayComponentByCode: jest.fn(),
      updatePayComponent: jest.fn(),
      deletePayComponent: jest.fn(),
      createComponentFormula: jest.fn(),
      findFormulasByComponent: jest.fn(),
      assignCustomComponent: jest.fn(),
      findCustomComponentsByEmployee: jest.fn(),
      updateCustomComponent: jest.fn(),
      deactivateCustomComponent: jest.fn(),
      findActivePayComponentsForPayroll: jest.fn(),
    };

    service = new PayComponentService(mockRepository);
  });

  // ==================== PAY COMPONENT CRUD ====================

  describe('createPayComponent', () => {
    it('should create a pay component and return DTO-transformed result', async () => {
      const apiData = {
        componentCode: 'BASIC_PAY',
        componentName: 'Basic Pay',
        componentType: 'earning',
        calculationType: 'fixed_amount',
        category: 'regular_pay',
        isTaxable: true,
        description: 'Basic salary component'
      };

      const dbComponent = createDbComponent({
        component_code: 'BASIC_PAY',
        component_name: 'Basic Pay'
      });

      mockRepository.findPayComponentByCode.mockResolvedValue(null);
      mockRepository.createPayComponent.mockResolvedValue(dbComponent);

      const result = await service.createPayComponent(apiData, orgId, userId);

      expect(result).toEqual(mapComponentDbToApi(dbComponent));
      expect(result.componentCode).toBe('BASIC_PAY');
      expect(result.componentName).toBe('Basic Pay');
    });

    it('should throw ConflictError if component code already exists', async () => {
      const apiData = {
        componentCode: 'BASIC_PAY',
        componentName: 'Basic Pay',
        componentType: 'earning',
        calculationType: 'fixed_amount'
      };

      const existingComponent = createDbComponent({ component_code: 'BASIC_PAY' });
      mockRepository.findPayComponentByCode.mockResolvedValue(existingComponent);

      await expect(
        service.createPayComponent(apiData, orgId, userId)
      ).rejects.toThrow('already exists');
    });

    it('should throw ValidationError for invalid data', async () => {
      const invalidData = {
        componentCode: 'TEST',
        // Missing required componentName
        componentType: 'earning'
      };

      await expect(
        service.createPayComponent(invalidData, orgId, userId)
      ).rejects.toThrow('"componentName" is required');
    });

    it('should throw ValidationError for invalid formula', async () => {
      const apiData = {
        componentCode: 'FORMULA_PAY',
        componentName: 'Formula Pay',
        componentType: 'earning',
        calculationType: 'formula',
        formula: 'invalid formula syntax @@'
      };

      await expect(
        service.createPayComponent(apiData, orgId, userId)
      ).rejects.toThrow('Invalid formula');
    });
  });

  describe('getPayComponents', () => {
    it('should return DTO-transformed component list', async () => {
      const dbComponents = [
        createDbComponent({ component_code: 'BASIC_PAY' }),
        createDbComponent({ component_code: 'OVERTIME', component_type: 'earning' })
      ];

      mockRepository.findPayComponents.mockResolvedValue({
        components: dbComponents,
        total: 2
      });

      const result = await service.getPayComponents(orgId);

      expect(result.components).toEqual(mapComponentsDbToApi(dbComponents));
      expect(result.total).toBe(2);
      expect(result.components).toHaveLength(2);
      expect(result.components[0].componentCode).toBe('BASIC_PAY');
      expect(result.components[1].componentCode).toBe('OVERTIME');
    });

    it('should pass filters to repository', async () => {
      const filters = { componentType: 'earning', isActive: true };
      mockRepository.findPayComponents.mockResolvedValue({
        components: [],
        total: 0
      });

      await service.getPayComponents(orgId, filters);

      expect(mockRepository.findPayComponents).toHaveBeenCalledWith(orgId, filters);
    });

    it('should return empty array when no components found', async () => {
      mockRepository.findPayComponents.mockResolvedValue({
        components: [],
        total: 0
      });

      const result = await service.getPayComponents(orgId);

      expect(result.components).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getPayComponentById', () => {
    it('should return DTO-transformed component', async () => {
      const dbComponent = createDbComponent({ component_code: 'BASIC_PAY' });
      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);

      const result = await service.getPayComponentById('123e4567-e89b-12d3-a456-426614174001', orgId);

      expect(result).toEqual(mapComponentDbToApi(dbComponent));
      expect(result.componentCode).toBe('BASIC_PAY');
    });

    it('should throw NotFoundError when component not found', async () => {
      mockRepository.findPayComponentById.mockResolvedValue(null);

      await expect(
        service.getPayComponentById('nonexistent', orgId)
      ).rejects.toThrow('not found');
    });
  });

  describe('updatePayComponent', () => {
    it('should update component and return DTO-transformed result', async () => {
      const existingDb = createDbComponent({ is_system_defined: false });
      const updatedDb = createDbComponent({
        component_name: 'Updated Name',
        description: 'Updated description'
      });

      mockRepository.findPayComponentById.mockResolvedValue(existingDb);
      mockRepository.updatePayComponent.mockResolvedValue(updatedDb);

      const updates = {
        componentName: 'Updated Name',
        description: 'Updated description'
      };

      const result = await service.updatePayComponent('123e4567-e89b-12d3-a456-426614174001', updates, orgId, userId);

      expect(result).toEqual(mapComponentDbToApi(updatedDb));
      expect(result.componentName).toBe('Updated Name');
    });

    it('should throw ValidationError when updating system component', async () => {
      const systemComponent = createDbComponent({ is_system_defined: true });
      mockRepository.findPayComponentById.mockResolvedValue(systemComponent);

      await expect(
        service.updatePayComponent('123e4567-e89b-12d3-a456-426614174001', { componentName: 'New' }, orgId, userId)
      ).rejects.toThrow('System components cannot be modified');
    });

    it('should throw ConflictError when new code already exists', async () => {
      const existingDb = createDbComponent({
        id: '123e4567-e89b-12d3-a456-426614174001',
        component_code: 'OLD_CODE',
        is_system_defined: false
      });
      const duplicate = createDbComponent({
        id: '123e4567-e89b-12d3-a456-426614174002',
        component_code: 'NEW_CODE'
      });

      mockRepository.findPayComponentById.mockResolvedValue(existingDb);
      mockRepository.findPayComponentByCode.mockResolvedValue(duplicate);

      await expect(
        service.updatePayComponent('123e4567-e89b-12d3-a456-426614174001', { componentCode: 'NEW_CODE' }, orgId, userId)
      ).rejects.toThrow('already exists');
    });

    it('should allow updating code to same value', async () => {
      const existingDb = createDbComponent({
        id: '123e4567-e89b-12d3-a456-426614174001',
        component_code: 'SAME_CODE',
        is_system_defined: false
      });
      const updatedDb = createDbComponent({ component_code: 'SAME_CODE' });

      mockRepository.findPayComponentById.mockResolvedValue(existingDb);
      mockRepository.findPayComponentByCode.mockResolvedValue(existingDb);
      mockRepository.updatePayComponent.mockResolvedValue(updatedDb);

      const result = await service.updatePayComponent(
        '123e4567-e89b-12d3-a456-426614174001',
        { componentCode: 'SAME_CODE' },
        orgId,
        userId
      );

      expect(result.componentCode).toBe('SAME_CODE');
    });

    it('should throw ValidationError for invalid component code format', async () => {
      const existingDb = createDbComponent({ is_system_defined: false });
      mockRepository.findPayComponentById.mockResolvedValue(existingDb);

      await expect(
        service.updatePayComponent('123e4567-e89b-12d3-a456-426614174001', { componentCode: 'invalid code!' }, orgId, userId)
      ).rejects.toThrow('uppercase letters, numbers, and underscores only');
    });

    it('should validate category for component type', async () => {
      const existingDb = createDbComponent({
        component_type: 'earning',
        is_system_defined: false
      });
      mockRepository.findPayComponentById.mockResolvedValue(existingDb);

      await expect(
        service.updatePayComponent('123e4567-e89b-12d3-a456-426614174001', { category: 'invalid_category' }, orgId, userId)
      ).rejects.toThrow();
    });
  });

  describe('deletePayComponent', () => {
    it('should delete non-system component', async () => {
      const existingDb = createDbComponent({ is_system_defined: false });
      mockRepository.findPayComponentById.mockResolvedValue(existingDb);
      mockRepository.deletePayComponent.mockResolvedValue(true);

      const result = await service.deletePayComponent('123e4567-e89b-12d3-a456-426614174001', orgId, userId);

      expect(result).toBe(true);
      expect(mockRepository.deletePayComponent).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174001', orgId, userId);
    });

    it('should throw ValidationError when deleting system component', async () => {
      const systemComponent = createDbComponent({ is_system_defined: true });
      mockRepository.findPayComponentById.mockResolvedValue(systemComponent);

      await expect(
        service.deletePayComponent('123e4567-e89b-12d3-a456-426614174001', orgId, userId)
      ).rejects.toThrow('System components cannot be deleted');
    });

    it('should return false when delete fails', async () => {
      const existingDb = createDbComponent({ is_system_defined: false });
      mockRepository.findPayComponentById.mockResolvedValue(existingDb);
      mockRepository.deletePayComponent.mockResolvedValue(false);

      const result = await service.deletePayComponent('123e4567-e89b-12d3-a456-426614174001', orgId, userId);

      expect(result).toBe(false);
    });

    it('should throw ConflictError when component is assigned to employees', async () => {
      const existingDb = createDbComponent({ is_system_defined: false });
      mockRepository.findPayComponentById.mockResolvedValue(existingDb);
      mockRepository.deletePayComponent.mockRejectedValue(
        new Error('Cannot delete: assigned to employees')
      );

      await expect(
        service.deletePayComponent('123e4567-e89b-12d3-a456-426614174001', orgId, userId)
      ).rejects.toThrow('assigned to');
    });
  });

  // ==================== BULK OPERATIONS ====================

  describe('bulkCreatePayComponents', () => {
    it('should create multiple components successfully', async () => {
      const components = [
        { componentCode: 'COMP1', componentName: 'Component 1', componentType: 'earning', calculationType: 'fixed_amount' },
        { componentCode: 'COMP2', componentName: 'Component 2', componentType: 'deduction', calculationType: 'fixed_amount' }
      ];

      const dbComp1 = createDbComponent({ component_code: 'COMP1' });
      const dbComp2 = createDbComponent({ component_code: 'COMP2', component_type: 'deduction' });

      mockRepository.findPayComponentByCode.mockResolvedValue(null);
      mockRepository.createPayComponent
        .mockResolvedValueOnce(dbComp1)
        .mockResolvedValueOnce(dbComp2);

      const result = await service.bulkCreatePayComponents(components, orgId, userId);

      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[0].data.componentCode).toBe('COMP1');
      expect(result[1].success).toBe(true);
      expect(result[1].data.componentCode).toBe('COMP2');
    });

    it('should handle partial failures', async () => {
      const components = [
        { componentCode: 'COMP1', componentName: 'Component 1', componentType: 'earning', calculationType: 'fixed_amount' },
        { componentCode: 'INVALID' } // Missing required fields
      ];

      const dbComp1 = createDbComponent({ component_code: 'COMP1' });
      mockRepository.findPayComponentByCode.mockResolvedValue(null);
      mockRepository.createPayComponent.mockResolvedValue(dbComp1);

      const result = await service.bulkCreatePayComponents(components, orgId, userId);

      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(false);
      expect(result[1].error).toBeDefined();
    });

    it('should return empty array for empty input', async () => {
      const result = await service.bulkCreatePayComponents([], orgId, userId);

      expect(result).toEqual([]);
    });
  });

  // ==================== FORMULA OPERATIONS ====================

  describe('createComponentFormula', () => {
    it('should create formula for existing component', async () => {
      const formulaData = {
        payComponentId: '123e4567-e89b-12d3-a456-426614174001',
        formulaName: 'Bonus Formula',
        formulaExpression: 'gross_pay * 0.10'
      };

      const dbComponent = createDbComponent();
      const dbFormula = createDbFormula();

      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);
      mockRepository.createComponentFormula.mockResolvedValue(dbFormula);

      const result = await service.createComponentFormula(formulaData, orgId, userId);

      expect(result).toEqual(dbFormula);
      expect(mockRepository.createComponentFormula).toHaveBeenCalled();
    });

    it('should validate formula expression', async () => {
      const dbComponent = createDbComponent();
      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);

      const formulaData = {
        payComponentId: '123e4567-e89b-12d3-a456-426614174001',
        formulaName: 'Invalid Formula',
        formulaExpression: 'invalid@@formula'
      };

      await expect(
        service.createComponentFormula(formulaData, orgId, userId)
      ).rejects.toThrow('Invalid formula expression');
    });

    it('should check for balanced parentheses', async () => {
      const dbComponent = createDbComponent();
      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);

      const formulaData = {
        payComponentId: '123e4567-e89b-12d3-a456-426614174001',
        formulaName: 'Unbalanced Formula',
        formulaExpression: '(gross_pay * 0.10'
      };

      await expect(
        service.createComponentFormula(formulaData, orgId, userId)
      ).rejects.toThrow('Unbalanced parentheses');
    });
  });

  describe('getFormulasByComponent', () => {
    it('should return formulas for component', async () => {
      const formulas = [createDbFormula(), createDbFormula({ id: '123e4567-e89b-12d3-a456-426614174008' })];
      mockRepository.findFormulasByComponent.mockResolvedValue(formulas);

      const result = await service.getFormulasByComponent('123e4567-e89b-12d3-a456-426614174001', orgId);

      expect(result).toEqual(formulas);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no formulas found', async () => {
      mockRepository.findFormulasByComponent.mockResolvedValue([]);

      const result = await service.getFormulasByComponent('123e4567-e89b-12d3-a456-426614174001', orgId);

      expect(result).toEqual([]);
    });
  });

  describe('validateFormulaExpression', () => {
    it('should validate simple arithmetic expressions', () => {
      expect(() => service.validateFormulaExpression('5 + 10')).not.toThrow();
      expect(() => service.validateFormulaExpression('gross_pay * 0.15')).not.toThrow();
      expect(() => service.validateFormulaExpression('(hours * rate) + 100')).not.toThrow();
    });

    it('should reject expressions with invalid characters', () => {
      expect(() => service.validateFormulaExpression('5 @ 10')).toThrow();
      expect(() => service.validateFormulaExpression('test$variable')).toThrow();
    });

    it('should detect unbalanced parentheses', () => {
      expect(() => service.validateFormulaExpression('(5 + 10')).toThrow('Unbalanced');
      expect(() => service.validateFormulaExpression('5 + 10)')).toThrow('Unbalanced');
      expect(() => service.validateFormulaExpression(')5 + 10(')).toThrow('Unbalanced');
    });
  });

  // ==================== CUSTOM COMPONENT OPERATIONS ====================

  describe('assignCustomComponent', () => {
    it('should assign custom component to employee', async () => {
      const customData = {
        payComponentId: '123e4567-e89b-12d3-a456-426614174001',
        employeeRecordId: '123e4567-e89b-12d3-a456-426614174007',
        customRate: 25.50,
        effectiveFrom: new Date('2024-01-01')
      };

      const dbComponent = createDbComponent();
      const dbCustom = createDbCustomComponent();

      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);
      mockRepository.assignCustomComponent.mockResolvedValue(dbCustom);

      const result = await service.assignCustomComponent(customData, orgId, userId);

      expect(result).toEqual(dbCustom);
      expect(mockRepository.assignCustomComponent).toHaveBeenCalled();
    });

    it('should throw ValidationError if effectiveTo is before effectiveFrom', async () => {
      const customData = {
        payComponentId: '123e4567-e89b-12d3-a456-426614174001',
        employeeRecordId: '123e4567-e89b-12d3-a456-426614174007',
        customRate: 25.50,
        effectiveFrom: new Date('2024-02-01'),
        effectiveTo: new Date('2024-01-01')
      };

      await expect(
        service.assignCustomComponent(customData, orgId, userId)
      ).rejects.toThrow('Effective to date must be after effective from date');
    });

    it('should throw ValidationError if neither customRate nor customAmount provided', async () => {
      const customData = {
        payComponentId: '123e4567-e89b-12d3-a456-426614174001',
        employeeRecordId: '123e4567-e89b-12d3-a456-426614174007',
        effectiveFrom: new Date('2024-01-01')
      };

      await expect(
        service.assignCustomComponent(customData, orgId, userId)
      ).rejects.toThrow('must have either custom rate or custom amount');
    });
  });

  describe('getCustomComponentsByEmployee', () => {
    it('should return custom components for employee', async () => {
      const customComponents = [
        createDbCustomComponent(),
        createDbCustomComponent({ id: '123e4567-e89b-12d3-a456-426614174009' })
      ];
      mockRepository.findCustomComponentsByEmployee.mockResolvedValue(customComponents);

      const result = await service.getCustomComponentsByEmployee('123e4567-e89b-12d3-a456-426614174007', orgId);

      expect(result).toEqual(customComponents);
      expect(result).toHaveLength(2);
    });

    it('should pass filters to repository', async () => {
      const filters = { isActive: true };
      mockRepository.findCustomComponentsByEmployee.mockResolvedValue([]);

      await service.getCustomComponentsByEmployee('123e4567-e89b-12d3-a456-426614174007', orgId, filters);

      expect(mockRepository.findCustomComponentsByEmployee).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174007',
        orgId,
        filters
      );
    });
  });

  describe('updateCustomComponent', () => {
    it('should update custom component', async () => {
      const updates = { customRate: 30.00 };
      const updatedDb = createDbCustomComponent({ custom_rate: 30.00 });

      mockRepository.updateCustomComponent.mockResolvedValue(updatedDb);

      const result = await service.updateCustomComponent('123e4567-e89b-12d3-a456-426614174006', updates, orgId, userId);

      expect(result).toEqual(updatedDb);
      expect(mockRepository.updateCustomComponent).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174006',
        updates,
        orgId,
        userId
      );
    });
  });

  describe('deactivateCustomComponent', () => {
    it('should deactivate custom component', async () => {
      const deactivatedDb = createDbCustomComponent({ is_active: false });
      mockRepository.deactivateCustomComponent.mockResolvedValue(deactivatedDb);

      const result = await service.deactivateCustomComponent('123e4567-e89b-12d3-a456-426614174006', orgId, userId);

      expect(result).toEqual(deactivatedDb);
      expect(result.is_active).toBe(false);
    });
  });

  // ==================== PAYROLL OPERATIONS ====================

  describe('getActivePayComponentsForPayroll', () => {
    it('should return DTO-transformed active components', async () => {
      const dbComponents = [
        createDbComponent({ component_code: 'BASIC' }),
        createDbComponent({ component_code: 'OVERTIME' })
      ];

      mockRepository.findActivePayComponentsForPayroll.mockResolvedValue(dbComponents);

      const result = await service.getActivePayComponentsForPayroll(orgId);

      expect(result).toEqual(mapComponentsDbToApi(dbComponents));
      expect(result).toHaveLength(2);
      expect(result[0].isActive).toBe(true);
      expect(result[1].isActive).toBe(true);
    });

    it('should return empty array when no active components', async () => {
      mockRepository.findActivePayComponentsForPayroll.mockResolvedValue([]);

      const result = await service.getActivePayComponentsForPayroll(orgId);

      expect(result).toEqual([]);
    });
  });

  describe('executeComponentFormula', () => {
    it('should execute formula with variables', async () => {
      const dbComponent = createDbComponent({
        component_code: 'BONUS',
        calculation_type: 'formula',
        formula: 'gross_pay * 0.10'
      });

      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);

      const variables = { gross_pay: 5000 };
      const result = await service.executeComponentFormula('123e4567-e89b-12d3-a456-426614174001', variables, orgId);

      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('executionTime');
      expect(result).toHaveProperty('variablesUsed');
      expect(result.componentCode).toBe('BONUS');
    });

    it('should throw ValidationError for non-formula component', async () => {
      const dbComponent = createDbComponent({
        calculation_type: 'fixed_amount',
        formula: null
      });

      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);

      await expect(
        service.executeComponentFormula('123e4567-e89b-12d3-a456-426614174001', {}, orgId)
      ).rejects.toThrow('Component is not a formula-based component');
    });

    it('should throw ValidationError when formula is not defined', async () => {
      const dbComponent = createDbComponent({
        component_code: 'BONUS',
        calculation_type: 'formula',
        formula: null
      });

      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);

      await expect(
        service.executeComponentFormula('123e4567-e89b-12d3-a456-426614174001', {}, orgId)
      ).rejects.toThrow('does not have a formula defined');
    });
  });

  describe('validateFormula', () => {
    it('should validate valid formula', () => {
      const result = service.validateFormula('gross_pay * 0.15');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return errors for invalid formula', () => {
      const result = service.validateFormula('invalid syntax @@');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('testFormula', () => {
    it('should test formula with sample data', async () => {
      const result = service.testFormula('gross_pay * 0.10');

      expect(result).toHaveProperty('formula');
      expect(result.formula).toBe('gross_pay * 0.10');
      expect(result).toHaveProperty('testCases');
      expect(result.testCases.length).toBeGreaterThan(0);
    });

    it('should return error for invalid formula', () => {
      const result = service.testFormula('@@@invalid');
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });
  });

  // ==================== ALIAS METHODS ====================

  describe('getPayComponentsByOrganization', () => {
    it('should call getPayComponents', async () => {
      const dbComponents = [createDbComponent()];
      mockRepository.findPayComponents.mockResolvedValue({
        components: dbComponents,
        total: 1
      });

      const result = await service.getPayComponentsByOrganization(orgId);

      expect(result).toEqual({
        components: mapComponentsDbToApi(dbComponents),
        total: 1
      });
      expect(mockRepository.findPayComponents).toHaveBeenCalledWith(orgId, {});
    });
  });

  describe('createEmployeePayComponent', () => {
    it('should map employeeId to employeeRecordId', async () => {
      const componentData = {
        organizationId: orgId,
        createdBy: userId,
        employeeId: '123e4567-e89b-12d3-a456-426614174007',
        payComponentId: '123e4567-e89b-12d3-a456-426614174001',
        customRate: 25.00,
        effectiveFrom: new Date('2024-01-01')
      };

      const dbComponent = createDbComponent();
      const dbCustom = createDbCustomComponent();

      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);
      mockRepository.assignCustomComponent.mockResolvedValue(dbCustom);

      const result = await service.createEmployeePayComponent(componentData);

      expect(result).toEqual(dbCustom);
      expect(mockRepository.assignCustomComponent).toHaveBeenCalled();
    });
  });

  describe('getPayComponentsByEmployee', () => {
    it('should call getCustomComponentsByEmployee', async () => {
      const customComponents = [createDbCustomComponent()];
      mockRepository.findCustomComponentsByEmployee.mockResolvedValue(customComponents);

      const result = await service.getPayComponentsByEmployee('123e4567-e89b-12d3-a456-426614174007', orgId);

      expect(result).toEqual(customComponents);
    });
  });

  describe('updateEmployeePayComponent', () => {
    it('should call updateCustomComponent', async () => {
      const updates = { customRate: 30.00 };
      const updatedDb = createDbCustomComponent({ custom_rate: 30.00 });

      mockRepository.updateCustomComponent.mockResolvedValue(updatedDb);

      const result = await service.updateEmployeePayComponent('123e4567-e89b-12d3-a456-426614174006', orgId, updates, userId);

      expect(result).toEqual(updatedDb);
    });
  });

  describe('deleteEmployeePayComponent', () => {
    it('should call deactivateCustomComponent', async () => {
      const deactivatedDb = createDbCustomComponent({ is_active: false });
      mockRepository.deactivateCustomComponent.mockResolvedValue(deactivatedDb);

      const result = await service.deleteEmployeePayComponent('123e4567-e89b-12d3-a456-426614174006', orgId, userId);

      expect(result).toEqual(deactivatedDb);
    });
  });
});
