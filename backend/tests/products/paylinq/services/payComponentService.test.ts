/**
 * PayComponentService Test Suite
 * 
 * Tests for PayLinQ pay component service following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Dependency injection pattern
 * - DTO transformation validation  
 * - Component formula validation
 * - Employee-specific component assignments
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PayComponentService from '../../../../src/products/paylinq/services/payComponentService.js';
import { mapComponentDbToApi, mapComponentsDbToApi } from '../../../../src/products/paylinq/dto/payComponentDto.js';

describe('PayComponentService', () => {
  let service: any;
  let mockRepository: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testComponentId = '323e4567-e89b-12d3-a456-426614174002';
  const testEmployeeId = '423e4567-e89b-12d3-a456-426614174003';

  /**
   * Helper to create DB format pay component (snake_case)
   */
  const createDbComponent = (overrides: any = {}) => ({
    id: testComponentId,
    organization_id: testOrganizationId,
    component_code: 'BASIC_PAY',
    component_name: 'Basic Pay',
    component_type: 'earning',
    category: 'regular',
    calculation_type: 'hourly_rate',
    default_rate: 25.00,
    default_amount: null,
    formula: null,
    is_taxable: true,
    is_recurring: true,
    is_pre_tax: false,
    is_active: true,
    is_system_component: false,
    applies_to_gross: true,
    applies_to_overtime: false,
    affects_taxable_income: true,
    description: 'Standard hourly rate',
    metadata: null,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    created_by: testUserId,
    updated_by: testUserId,
    deleted_at: null,
    deleted_by: null,
    ...overrides
  });

  beforeEach(() => {
    // Create comprehensive mock repository
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createFormula: jest.fn(),
      getFormulas: jest.fn(),
      createCustomComponent: jest.fn(),
      getCustomComponents: jest.fn(),
      assignComponentToEmployee: jest.fn(),
      getEmployeeComponents: jest.fn(),
      calculateComponent: jest.fn()
    };

    // Inject mock via constructor (dependency injection)
    service = new PayComponentService(mockRepository);
  });

  // ==================== PAY COMPONENT CRUD ====================

  describe('createPayComponent', () => {
    it('should create pay component with valid data', async () => {
      const componentData = {
        componentCode: 'BASIC_PAY',
        componentName: 'Basic Pay',
        componentType: 'earning',
        category: 'regular',
        calculationType: 'hourly_rate',
        defaultRate: 25.00,
        isTaxable: true,
        isRecurring: true,
        description: 'Standard hourly rate'
      };

      const dbComponent = createDbComponent();
      mockRepository.create.mockResolvedValue(dbComponent);

      const result = await service.createPayComponent(
        componentData,
        testOrganizationId,
        testUserId
      );

      // Verify DTO transformation (DB snake_case → API camelCase)
      expect(result).toEqual(mapComponentDbToApi(dbComponent));
      expect(result.componentCode).toBe('BASIC_PAY'); // camelCase
      expect(result.calculationType).toBe('hourly_rate'); // camelCase
      expect(result.component_code).toBeUndefined(); // snake_case removed

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          componentCode: 'BASIC_PAY',
          componentType: 'earning'
        }),
        testOrganizationId,
        testUserId
      );
    });

    it('should throw ValidationError for invalid component code format', async () => {
      const invalidData = {
        componentCode: 'basic-pay', // Lowercase with hyphen (invalid)
        componentName: 'Basic Pay',
        componentType: 'earning',
        calculationType: 'hourly_rate'
      };

      await expect(
        service.createPayComponent(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(/uppercase/);
    });

    it('should validate category matches component type', async () => {
      const invalidData = {
        componentCode: 'TEST_COMP',
        componentName: 'Test Component',
        componentType: 'earning',
        category: 'tax', // Invalid: tax is deduction category
        calculationType: 'fixed_amount',
        defaultAmount: 100
      };

      await expect(
        service.createPayComponent(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(/Invalid category/);
    });

    it('should require rate or amount based on calculation type', async () => {
      const invalidData = {
        componentCode: 'TEST_COMP',
        componentName: 'Test Component',
        componentType: 'earning',
        calculationType: 'fixed_amount'
        // Missing defaultAmount
      };

      await expect(
        service.createPayComponent(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow();
    });

    it('should validate formula when calculation type is formula', async () => {
      const componentData = {
        componentCode: 'BONUS_PAY',
        componentName: 'Bonus Pay',
        componentType: 'earning',
        calculationType: 'formula',
        formula: 'basePay * 0.10',
        isTaxable: true
      };

      const dbComponent = createDbComponent({ 
        calculation_type: 'formula',
        formula: 'basePay * 0.10'
      });
      mockRepository.create.mockResolvedValue(dbComponent);

      const result = await service.createPayComponent(
        componentData,
        testOrganizationId,
        testUserId
      );

      expect(result.calculationType).toBe('formula');
      expect(result.formula).toBe('basePay * 0.10');
    });
  });

  describe('getPayComponentById', () => {
    it('should return DTO-transformed component by ID', async () => {
      const dbComponent = createDbComponent();
      mockRepository.findById.mockResolvedValue(dbComponent);

      const result = await service.getPayComponentById(
        testComponentId,
        testOrganizationId
      );

      expect(result).toEqual(mapComponentDbToApi(dbComponent));
      expect(result.componentCode).toBe('BASIC_PAY'); // camelCase
      expect(mockRepository.findById).toHaveBeenCalledWith(
        testComponentId,
        testOrganizationId
      );
    });

    it('should throw NotFoundError when component not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.getPayComponentById(testComponentId, testOrganizationId)
      ).rejects.toThrow('Pay component not found');
    });
  });

  describe('getPayComponents', () => {
    it('should return DTO-transformed components list', async () => {
      const dbComponents = [
        createDbComponent({ component_code: 'BASIC_PAY' }),
        createDbComponent({
          id: '523e4567-e89b-12d3-a456-426614174004',
          component_code: 'OVERTIME_PAY',
          component_name: 'Overtime Pay',
          category: 'overtime'
        })
      ];

      mockRepository.findAll.mockResolvedValue(dbComponents);

      const result = await service.getPayComponents(
        testOrganizationId,
        { isActive: true, componentType: 'earning' }
      );

      expect(result).toEqual(mapComponentsDbToApi(dbComponents));
      expect(result).toHaveLength(2);
      expect(result[0].componentCode).toBe('BASIC_PAY'); // camelCase
      expect(result[1].componentCode).toBe('OVERTIME_PAY');
    });

    it('should apply filters correctly', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      await service.getPayComponents(
        testOrganizationId,
        { 
          isActive: true, 
          componentType: 'deduction',
          category: 'tax'
        }
      );

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        testOrganizationId,
        expect.objectContaining({
          isActive: true,
          componentType: 'deduction',
          category: 'tax'
        })
      );
    });
  });

  describe('updatePayComponent', () => {
    it('should update pay component with allowed fields', async () => {
      const existingComponent = createDbComponent();
      const updates = {
        componentName: 'Updated Basic Pay',
        defaultRate: 28.00,
        description: 'Updated description'
      };

      const updatedComponent = createDbComponent({
        component_name: 'Updated Basic Pay',
        default_rate: 28.00,
        description: 'Updated description'
      });

      mockRepository.findById.mockResolvedValue(existingComponent);
      mockRepository.update.mockResolvedValue(updatedComponent);

      const result = await service.updatePayComponent(
        testComponentId,
        updates,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual(mapComponentDbToApi(updatedComponent));
      expect(result.componentName).toBe('Updated Basic Pay');
      expect(result.defaultRate).toBe(28.00);
    });

    it('should prevent updating component code', async () => {
      const existingComponent = createDbComponent();
      mockRepository.findById.mockResolvedValue(existingComponent);

      await expect(
        service.updatePayComponent(
          testComponentId,
          { componentCode: 'NEW_CODE' }, // Should not be allowed
          testOrganizationId,
          testUserId
        )
      ).rejects.toThrow();
    });

    it('should prevent updating system components', async () => {
      const systemComponent = createDbComponent({ is_system_component: true });
      mockRepository.findById.mockResolvedValue(systemComponent);

      await expect(
        service.updatePayComponent(
          testComponentId,
          { componentName: 'New Name' },
          testOrganizationId,
          testUserId
        )
      ).rejects.toThrow(/system component/);
    });
  });

  describe('deletePayComponent', () => {
    it('should soft delete pay component', async () => {
      const existingComponent = createDbComponent();
      mockRepository.findById.mockResolvedValue(existingComponent);
      mockRepository.delete.mockResolvedValue(true);

      const result = await service.deletePayComponent(
        testComponentId,
        testOrganizationId,
        testUserId
      );

      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith(
        testComponentId,
        testOrganizationId,
        testUserId
      );
    });

    it('should prevent deleting system components', async () => {
      const systemComponent = createDbComponent({ is_system_component: true });
      mockRepository.findById.mockResolvedValue(systemComponent);

      await expect(
        service.deletePayComponent(testComponentId, testOrganizationId, testUserId)
      ).rejects.toThrow(/system component/);
    });

    it('should check for active employee assignments before deleting', async () => {
      const component = createDbComponent();
      mockRepository.findById.mockResolvedValue(component);
      mockRepository.getEmployeeComponents.mockResolvedValue([
        { employee_id: testEmployeeId }
      ]);

      await expect(
        service.deletePayComponent(testComponentId, testOrganizationId, testUserId)
      ).rejects.toThrow(/active employee assignments/);
    });
  });

  // ==================== COMPONENT FORMULAS ====================

  describe('createComponentFormula', () => {
    it('should create formula for component', async () => {
      const formulaData = {
        payComponentId: testComponentId,
        formulaName: 'Bonus Calculation',
        formulaExpression: 'baseSalary * 0.10',
        formulaType: 'arithmetic',
        description: 'Monthly bonus formula'
      };

      const dbFormula = {
        id: '623e4567-e89b-12d3-a456-426614174005',
        pay_component_id: testComponentId,
        formula_name: 'Bonus Calculation',
        formula_expression: 'baseSalary * 0.10',
        formula_type: 'arithmetic',
        description: 'Monthly bonus formula',
        created_at: new Date(),
        created_by: testUserId
      };

      mockRepository.createFormula.mockResolvedValue(dbFormula);

      const result = await service.createComponentFormula(
        formulaData,
        testOrganizationId,
        testUserId
      );

      expect(result.formulaName).toBe('Bonus Calculation');
      expect(mockRepository.createFormula).toHaveBeenCalledWith(
        formulaData,
        testOrganizationId,
        testUserId
      );
    });

    it('should validate formula expression syntax', async () => {
      const invalidFormula = {
        payComponentId: testComponentId,
        formulaName: 'Invalid Formula',
        formulaExpression: 'baseSalary *** 0.10', // Invalid syntax
        formulaType: 'arithmetic'
      };

      await expect(
        service.createComponentFormula(invalidFormula, testOrganizationId, testUserId)
      ).rejects.toThrow(/invalid formula/);
    });
  });

  describe('getComponentFormulas', () => {
    it('should return formulas for component', async () => {
      const mockFormulas = [
        {
          id: '623e4567-e89b-12d3-a456-426614174005',
          formula_name: 'Bonus Formula',
          formula_expression: 'baseSalary * 0.10'
        }
      ];

      mockRepository.getFormulas.mockResolvedValue(mockFormulas);

      const result = await service.getComponentFormulas(
        testComponentId,
        testOrganizationId
      );

      expect(result).toEqual(mockFormulas);
      expect(mockRepository.getFormulas).toHaveBeenCalledWith(
        testComponentId,
        testOrganizationId
      );
    });
  });

  // ==================== EMPLOYEE COMPONENT ASSIGNMENTS ====================

  describe('assignComponentToEmployee', () => {
    it('should assign component to employee', async () => {
      const assignmentData = {
        employeeId: testEmployeeId,
        componentId: testComponentId,
        componentCode: 'BASIC_PAY',
        effectiveFrom: new Date('2025-01-01'),
        effectiveTo: null,
        configuration: { customRate: 30.00 },
        notes: 'Custom rate for senior employee'
      };

      const dbAssignment = {
        id: '723e4567-e89b-12d3-a456-426614174006',
        employee_id: testEmployeeId,
        component_id: testComponentId,
        component_code: 'BASIC_PAY',
        effective_from: new Date('2025-01-01'),
        effective_to: null,
        configuration: { customRate: 30.00 },
        notes: 'Custom rate for senior employee',
        created_at: new Date(),
        created_by: testUserId
      };

      mockRepository.assignComponentToEmployee.mockResolvedValue(dbAssignment);

      const result = await service.assignComponentToEmployee(
        assignmentData,
        testOrganizationId,
        testUserId
      );

      expect(result.employeeId).toBe(testEmployeeId);
      expect(result.componentCode).toBe('BASIC_PAY');
      expect(mockRepository.assignComponentToEmployee).toHaveBeenCalledWith(
        assignmentData,
        testOrganizationId,
        testUserId
      );
    });

    it('should throw ValidationError for invalid UUID formats', async () => {
      const invalidAssignment = {
        employeeId: 'emp-123', // Invalid UUID
        componentId: testComponentId,
        componentCode: 'BASIC_PAY',
        effectiveFrom: new Date()
      };

      await expect(
        service.assignComponentToEmployee(invalidAssignment, testOrganizationId, testUserId)
      ).rejects.toThrow();
    });

    it('should validate effectiveTo is after effectiveFrom', async () => {
      const invalidAssignment = {
        employeeId: testEmployeeId,
        componentId: testComponentId,
        componentCode: 'BASIC_PAY',
        effectiveFrom: new Date('2025-02-01'),
        effectiveTo: new Date('2025-01-01') // Before effectiveFrom
      };

      await expect(
        service.assignComponentToEmployee(invalidAssignment, testOrganizationId, testUserId)
      ).rejects.toThrow(/after/);
    });
  });

  describe('getEmployeeComponents', () => {
    it('should return all components assigned to employee', async () => {
      const mockComponents = [
        {
          id: '723e4567-e89b-12d3-a456-426614174006',
          employee_id: testEmployeeId,
          component_code: 'BASIC_PAY',
          component_name: 'Basic Pay',
          is_active: true
        },
        {
          id: '823e4567-e89b-12d3-a456-426614174007',
          employee_id: testEmployeeId,
          component_code: 'HEALTH_INS',
          component_name: 'Health Insurance',
          is_active: true
        }
      ];

      mockRepository.getEmployeeComponents.mockResolvedValue(mockComponents);

      const result = await service.getEmployeeComponents(
        testEmployeeId,
        testOrganizationId
      );

      expect(result).toEqual(mockComponents);
      expect(result).toHaveLength(2);
      expect(mockRepository.getEmployeeComponents).toHaveBeenCalledWith(
        testEmployeeId,
        testOrganizationId
      );
    });
  });

  // ==================== COMPONENT CALCULATIONS ====================

  describe('calculateComponentValue', () => {
    it('should calculate fixed amount component', async () => {
      const component = createDbComponent({
        calculation_type: 'fixed_amount',
        default_amount: 500.00
      });

      mockRepository.findById.mockResolvedValue(component);

      const result = await service.calculateComponentValue(
        testComponentId,
        testEmployeeId,
        {},
        testOrganizationId
      );

      expect(result.calculatedAmount).toBe(500.00);
      expect(result.calculationType).toBe('fixed_amount');
    });

    it('should calculate hourly rate component', async () => {
      const component = createDbComponent({
        calculation_type: 'hourly_rate',
        default_rate: 25.00
      });

      mockRepository.findById.mockResolvedValue(component);

      const result = await service.calculateComponentValue(
        testComponentId,
        testEmployeeId,
        { hoursWorked: 40 },
        testOrganizationId
      );

      expect(result.calculatedAmount).toBe(1000.00); // 25 * 40
      expect(result.hoursWorked).toBe(40);
    });

    it('should calculate percentage component', async () => {
      const component = createDbComponent({
        calculation_type: 'percentage',
        default_rate: 0.05 // 5%
      });

      mockRepository.findById.mockResolvedValue(component);

      const result = await service.calculateComponentValue(
        testComponentId,
        testEmployeeId,
        { baseAmount: 5000 },
        testOrganizationId
      );

      expect(result.calculatedAmount).toBe(250.00); // 5000 * 0.05
    });

    it('should use custom rate from employee assignment if available', async () => {
      const component = createDbComponent({
        calculation_type: 'hourly_rate',
        default_rate: 25.00
      });

      const employeeAssignment = {
        configuration: { customRate: 30.00 } // Employee has custom rate
      };

      mockRepository.findById.mockResolvedValue(component);
      mockRepository.getEmployeeComponents.mockResolvedValue([employeeAssignment]);

      const result = await service.calculateComponentValue(
        testComponentId,
        testEmployeeId,
        { hoursWorked: 40 },
        testOrganizationId
      );

      expect(result.calculatedAmount).toBe(1200.00); // 30 * 40 (custom rate)
    });
  });
});
