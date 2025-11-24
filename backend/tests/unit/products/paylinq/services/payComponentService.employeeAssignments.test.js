/**
 * Employee Component Assignment Tests
 * Tests for employee-specific pay component assignment feature
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PayComponentService from '../../../../../src/products/paylinq/services/payComponentService.js';
import PayComponentRepository from '../../../../../src/products/paylinq/repositories/payComponentRepository.js';
import { ValidationError, NotFoundError } from '../../../../../src/middleware/errorHandler.js';

describe('PayComponentService - Employee Component Assignments', () => {
  let service;
  let mockRepository;
  const organizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
  const employeeId = 'emp-123e4567-e89b-12d3-a456-426614174000';
  const componentId = 'comp-123e4567-e89b-12d3-a456-426614174000';

  // Helper function to create DB format pay component
  const createDbComponent = (overrides = {}) => ({
    id: componentId,
    organization_id: organizationId,
    component_code: 'TEST_COMP',
    component_name: 'Test Component',
    component_type: 'earning',
    category: 'regular',
    calculation_type: 'fixed_amount',
    default_amount: 1000,
    is_taxable: true,
    is_recurring: true,
    is_pre_tax: false,
    is_system_component: false,
    applies_to_gross: false,
    created_at: new Date(),
    created_by: userId,
    ...overrides
  });

  // Helper function to create assignment data
  const createAssignmentData = (overrides = {}) => ({
    employeeId,
    componentId,
    componentCode: 'TEST_COMP',
    effectiveFrom: new Date('2025-01-01'),
    effectiveTo: null,
    configuration: {},
    overrideAmount: null,
    overrideFormula: null,
    notes: 'Test assignment',
    ...overrides
  });

  // Helper function to create DB format assignment
  const createDbAssignment = (overrides = {}) => ({
    id: 'assignment-123e4567-e89b-12d3-a456-426614174000',
    employee_id: employeeId,
    component_id: componentId,
    component_code: 'TEST_COMP',
    organization_id: organizationId,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    configuration: {},
    override_amount: null,
    override_formula: null,
    notes: 'Test assignment',
    created_by: userId,
    created_at: new Date(),
    updated_by: null,
    updated_at: null,
    deleted_at: null,
    ...overrides
  });

  beforeEach(() => {
    // Setup: Create fresh mocks for each test
    mockRepository = {
      findPayComponentById: jest.fn(),
      assignComponentToEmployee: jest.fn(),
      findEmployeeComponents: jest.fn(),
      findEmployeeComponentAssignmentById: jest.fn(),
      updateEmployeeComponentAssignment: jest.fn(),
      removeEmployeeComponentAssignment: jest.fn()
    };

    // Inject mock repository
    service = new PayComponentService(mockRepository);
  });

  // ==================== ASSIGN COMPONENT TO EMPLOYEE ====================

  describe('assignComponentToEmployee', () => {
    it('should assign component to employee with valid data', async () => {
      // Arrange
      const assignmentData = createAssignmentData();
      const dbComponent = createDbComponent();
      const dbAssignment = createDbAssignment();

      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);
      mockRepository.assignComponentToEmployee.mockResolvedValue(dbAssignment);

      // Act
      const result = await service.assignComponentToEmployee(
        assignmentData,
        organizationId,
        userId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbAssignment.id);
      expect(result.employee_id).toBe(employeeId);
      expect(result.component_id).toBe(componentId);
      
      expect(mockRepository.findPayComponentById).toHaveBeenCalledWith(
        componentId,
        organizationId
      );
      expect(mockRepository.assignComponentToEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId,
          componentId,
          componentCode: 'TEST_COMP',
          effectiveFrom: assignmentData.effectiveFrom,
          createdBy: userId
        }),
        organizationId
      );
    });

    it('should throw NotFoundError when component does not exist', async () => {
      // Arrange
      const assignmentData = createAssignmentData();
      mockRepository.findPayComponentById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.assignComponentToEmployee(assignmentData, organizationId, userId)
      ).rejects.toThrow(NotFoundError);

      expect(mockRepository.assignComponentToEmployee).not.toHaveBeenCalled();
    });

    it('should use component code from DB if not provided', async () => {
      // Arrange
      const assignmentData = createAssignmentData({ componentCode: undefined });
      const dbComponent = createDbComponent({ component_code: 'DB_CODE' });
      const dbAssignment = createDbAssignment();

      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);
      mockRepository.assignComponentToEmployee.mockResolvedValue(dbAssignment);

      // Act
      await service.assignComponentToEmployee(assignmentData, organizationId, userId);

      // Assert
      expect(mockRepository.assignComponentToEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          componentCode: 'DB_CODE'
        }),
        organizationId
      );
    });

    it('should handle assignment with override amount', async () => {
      // Arrange
      const assignmentData = createAssignmentData({
        overrideAmount: 1500.00,
        notes: 'Custom amount for this employee'
      });
      const dbComponent = createDbComponent();
      const dbAssignment = createDbAssignment({
        override_amount: 1500.00
      });

      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);
      mockRepository.assignComponentToEmployee.mockResolvedValue(dbAssignment);

      // Act
      const result = await service.assignComponentToEmployee(
        assignmentData,
        organizationId,
        userId
      );

      // Assert
      expect(result.override_amount).toBe(1500.00);
      expect(mockRepository.assignComponentToEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          overrideAmount: 1500.00,
          notes: 'Custom amount for this employee'
        }),
        organizationId
      );
    });

    it('should handle assignment with override formula', async () => {
      // Arrange
      const assignmentData = createAssignmentData({
        overrideFormula: 'hours * 25.50',
        notes: 'Custom formula for overtime'
      });
      const dbComponent = createDbComponent();
      const dbAssignment = createDbAssignment({
        override_formula: 'hours * 25.50'
      });

      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);
      mockRepository.assignComponentToEmployee.mockResolvedValue(dbAssignment);

      // Act
      const result = await service.assignComponentToEmployee(
        assignmentData,
        organizationId,
        userId
      );

      // Assert
      expect(result.override_formula).toBe('hours * 25.50');
    });

    it('should handle assignment with configuration object', async () => {
      // Arrange
      const configuration = {
        payPeriod: 'monthly',
        paymentMethod: 'direct_deposit',
        bankAccount: '****1234'
      };
      const assignmentData = createAssignmentData({ configuration });
      const dbComponent = createDbComponent();
      const dbAssignment = createDbAssignment({ configuration });

      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);
      mockRepository.assignComponentToEmployee.mockResolvedValue(dbAssignment);

      // Act
      const result = await service.assignComponentToEmployee(
        assignmentData,
        organizationId,
        userId
      );

      // Assert
      expect(result.configuration).toEqual(configuration);
    });

    it('should handle assignment with effective date range', async () => {
      // Arrange
      const effectiveFrom = new Date('2025-01-01');
      const effectiveTo = new Date('2025-12-31');
      const assignmentData = createAssignmentData({
        effectiveFrom,
        effectiveTo
      });
      const dbComponent = createDbComponent();
      const dbAssignment = createDbAssignment({
        effective_from: effectiveFrom,
        effective_to: effectiveTo
      });

      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);
      mockRepository.assignComponentToEmployee.mockResolvedValue(dbAssignment);

      // Act
      const result = await service.assignComponentToEmployee(
        assignmentData,
        organizationId,
        userId
      );

      // Assert
      expect(result.effective_from).toEqual(effectiveFrom);
      expect(result.effective_to).toEqual(effectiveTo);
    });
  });

  // ==================== GET EMPLOYEE COMPONENT ASSIGNMENTS ====================

  describe('getEmployeeComponentAssignments', () => {
    it('should return all assignments for an employee', async () => {
      // Arrange
      const dbAssignments = [
        createDbAssignment({ id: 'assignment-1' }),
        createDbAssignment({ id: 'assignment-2' })
      ];
      mockRepository.findEmployeeComponents.mockResolvedValue(dbAssignments);

      // Act
      const result = await service.getEmployeeComponentAssignments(
        employeeId,
        organizationId
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(mockRepository.findEmployeeComponents).toHaveBeenCalledWith(
        employeeId,
        organizationId,
        {}
      );
    });

    it('should return filtered assignments when filters provided', async () => {
      // Arrange
      const filters = { effectiveDate: new Date('2025-06-01') };
      const dbAssignments = [createDbAssignment()];
      mockRepository.findEmployeeComponents.mockResolvedValue(dbAssignments);

      // Act
      const result = await service.getEmployeeComponentAssignments(
        employeeId,
        organizationId,
        filters
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(mockRepository.findEmployeeComponents).toHaveBeenCalledWith(
        employeeId,
        organizationId,
        filters
      );
    });

    it('should return empty array when employee has no assignments', async () => {
      // Arrange
      mockRepository.findEmployeeComponents.mockResolvedValue([]);

      // Act
      const result = await service.getEmployeeComponentAssignments(
        employeeId,
        organizationId
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ==================== GET SINGLE ASSIGNMENT ====================

  describe('getEmployeeComponentAssignment', () => {
    const assignmentId = 'assignment-123e4567-e89b-12d3-a456-426614174000';

    it('should return assignment when found', async () => {
      // Arrange
      const dbAssignment = createDbAssignment({ id: assignmentId });
      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(dbAssignment);

      // Act
      const result = await service.getEmployeeComponentAssignment(
        assignmentId,
        organizationId
      );

      // Assert
      expect(result).toEqual(dbAssignment);
      expect(mockRepository.findEmployeeComponentAssignmentById).toHaveBeenCalledWith(
        assignmentId,
        organizationId
      );
    });

    it('should throw NotFoundError when assignment does not exist', async () => {
      // Arrange
      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getEmployeeComponentAssignment(assignmentId, organizationId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ==================== UPDATE ASSIGNMENT ====================

  describe('updateEmployeeComponentAssignment', () => {
    const assignmentId = 'assignment-123e4567-e89b-12d3-a456-426614174000';

    it('should update assignment with valid data', async () => {
      // Arrange
      const updates = {
        overrideAmount: 2000.00,
        notes: 'Updated amount'
      };
      const existingAssignment = createDbAssignment({ id: assignmentId });
      const updatedAssignment = createDbAssignment({
        id: assignmentId,
        override_amount: 2000.00,
        notes: 'Updated amount',
        updated_by: userId
      });

      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(existingAssignment);
      mockRepository.updateEmployeeComponentAssignment.mockResolvedValue(updatedAssignment);

      // Act
      const result = await service.updateEmployeeComponentAssignment(
        assignmentId,
        updates,
        organizationId,
        userId
      );

      // Assert
      expect(result.override_amount).toBe(2000.00);
      expect(result.notes).toBe('Updated amount');
      expect(mockRepository.updateEmployeeComponentAssignment).toHaveBeenCalledWith(
        assignmentId,
        expect.objectContaining({
          overrideAmount: 2000.00,
          notes: 'Updated amount',
          updatedBy: userId
        }),
        organizationId
      );
    });

    it('should throw NotFoundError when assignment does not exist', async () => {
      // Arrange
      const updates = { overrideAmount: 2000.00 };
      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateEmployeeComponentAssignment(
          assignmentId,
          updates,
          organizationId,
          userId
        )
      ).rejects.toThrow(NotFoundError);

      expect(mockRepository.updateEmployeeComponentAssignment).not.toHaveBeenCalled();
    });

    it('should update configuration object', async () => {
      // Arrange
      const updates = {
        configuration: {
          payPeriod: 'bi-weekly',
          paymentMethod: 'check'
        }
      };
      const existingAssignment = createDbAssignment();
      const updatedAssignment = createDbAssignment({
        configuration: updates.configuration
      });

      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(existingAssignment);
      mockRepository.updateEmployeeComponentAssignment.mockResolvedValue(updatedAssignment);

      // Act
      const result = await service.updateEmployeeComponentAssignment(
        assignmentId,
        updates,
        organizationId,
        userId
      );

      // Assert
      expect(result.configuration).toEqual(updates.configuration);
    });

    it('should update effective date range', async () => {
      // Arrange
      const updates = {
        effectiveTo: new Date('2025-12-31')
      };
      const existingAssignment = createDbAssignment();
      const updatedAssignment = createDbAssignment({
        effective_to: updates.effectiveTo
      });

      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(existingAssignment);
      mockRepository.updateEmployeeComponentAssignment.mockResolvedValue(updatedAssignment);

      // Act
      const result = await service.updateEmployeeComponentAssignment(
        assignmentId,
        updates,
        organizationId,
        userId
      );

      // Assert
      expect(result.effective_to).toEqual(updates.effectiveTo);
    });
  });

  // ==================== REMOVE ASSIGNMENT ====================

  describe('removeEmployeeComponentAssignment', () => {
    const assignmentId = 'assignment-123e4567-e89b-12d3-a456-426614174000';

    it('should remove assignment successfully', async () => {
      // Arrange
      const existingAssignment = createDbAssignment({ id: assignmentId });
      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(existingAssignment);
      mockRepository.removeEmployeeComponentAssignment.mockResolvedValue(true);

      // Act
      const result = await service.removeEmployeeComponentAssignment(
        assignmentId,
        organizationId,
        userId
      );

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.removeEmployeeComponentAssignment).toHaveBeenCalledWith(
        assignmentId,
        organizationId,
        userId
      );
    });

    it('should throw NotFoundError when assignment does not exist', async () => {
      // Arrange
      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removeEmployeeComponentAssignment(
          assignmentId,
          organizationId,
          userId
        )
      ).rejects.toThrow(NotFoundError);

      expect(mockRepository.removeEmployeeComponentAssignment).not.toHaveBeenCalled();
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('Error Handling', () => {
    it('should propagate repository errors during assignment', async () => {
      // Arrange
      const assignmentData = createAssignmentData();
      const dbComponent = createDbComponent();
      
      mockRepository.findPayComponentById.mockResolvedValue(dbComponent);
      mockRepository.assignComponentToEmployee.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(
        service.assignComponentToEmployee(assignmentData, organizationId, userId)
      ).rejects.toThrow('Database connection failed');
    });

    it('should propagate repository errors during update', async () => {
      // Arrange
      const assignmentId = 'assignment-123e4567-e89b-12d3-a456-426614174000';
      const updates = { overrideAmount: 2000.00 };
      const existingAssignment = createDbAssignment();

      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(existingAssignment);
      mockRepository.updateEmployeeComponentAssignment.mockRejectedValue(
        new Error('Constraint violation')
      );

      // Act & Assert
      await expect(
        service.updateEmployeeComponentAssignment(
          assignmentId,
          updates,
          organizationId,
          userId
        )
      ).rejects.toThrow('Constraint violation');
    });
  });
});
