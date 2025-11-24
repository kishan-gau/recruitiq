import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PayComponentService from '../../../../src/products/paylinq/services/payComponentService.js';
import PayComponentRepository from '../../../../src/products/paylinq/repositories/payComponentRepository.js';

describe('PayComponentService - Employee Component Assignments', () => {
  let service;
  let mockRepository;

  const organizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const userId = 'user-223e4567-e89b-12d3-a456-426614174000';
  const employeeId = 'emp-323e4567-e89b-12d3-a456-426614174000';
  const componentId = 'comp-423e4567-e89b-12d3-a456-426614174000';
  const assignmentId = 'assign-523e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      assignComponentToEmployee: jest.fn(),
      findEmployeeComponents: jest.fn(),
      findEmployeeComponentAssignmentById: jest.fn(),
      updateEmployeeComponentAssignment: jest.fn(),
      removeEmployeeComponentAssignment: jest.fn(),
    };

    service = new PayComponentService(mockRepository);
  });

  describe('assignComponentToEmployee', () => {
    it('should assign component to employee with valid data', async () => {
      // Arrange
      const assignmentData = {
        employeeId,
        componentId,
        componentCode: 'BONUS',
        effectiveFrom: '2025-01-01',
        effectiveTo: '2025-12-31',
        configuration: { frequency: 'monthly' },
        overrideAmount: 1000,
        notes: 'Performance bonus',
      };

      const component = {
        id: componentId,
        component_code: 'BONUS',
        component_name: 'Performance Bonus',
        component_type: 'allowance',
      };

      const createdAssignment = {
        id: assignmentId,
        employee_id: employeeId,
        component_id: componentId,
        component_code: 'BONUS',
        effective_from: '2025-01-01',
        effective_to: '2025-12-31',
        configuration: { frequency: 'monthly' },
        override_amount: 1000,
        notes: 'Performance bonus',
        created_by: userId,
        created_at: new Date(),
      };

      mockRepository.findById.mockResolvedValue(component);
      mockRepository.assignComponentToEmployee.mockResolvedValue(createdAssignment);

      // Act
      const result = await service.assignComponentToEmployee(
        assignmentData,
        organizationId,
        userId
      );

      // Assert
      expect(result).toEqual(createdAssignment);
      expect(mockRepository.findById).toHaveBeenCalledWith(componentId, organizationId);
      expect(mockRepository.assignComponentToEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId,
          componentId,
          componentCode: 'BONUS',
          effectiveFrom: '2025-01-01',
          effectiveTo: '2025-12-31',
          configuration: { frequency: 'monthly' },
          overrideAmount: 1000,
          notes: 'Performance bonus',
          createdBy: userId,
        }),
        organizationId
      );
    });

    it('should throw error when component not found', async () => {
      // Arrange
      const assignmentData = {
        employeeId,
        componentId,
        effectiveFrom: '2025-01-01',
      };

      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.assignComponentToEmployee(assignmentData, organizationId, userId)
      ).rejects.toThrow('Pay component not found');

      expect(mockRepository.assignComponentToEmployee).not.toHaveBeenCalled();
    });

    it('should use component code from component if not provided', async () => {
      // Arrange
      const assignmentData = {
        employeeId,
        componentId,
        effectiveFrom: '2025-01-01',
      };

      const component = {
        id: componentId,
        component_code: 'AUTO_CODE',
        component_name: 'Auto Component',
      };

      mockRepository.findById.mockResolvedValue(component);
      mockRepository.assignComponentToEmployee.mockResolvedValue({
        id: assignmentId,
        component_code: 'AUTO_CODE',
      });

      // Act
      await service.assignComponentToEmployee(assignmentData, organizationId, userId);

      // Assert
      expect(mockRepository.assignComponentToEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          componentCode: 'AUTO_CODE',
        }),
        organizationId
      );
    });

    it('should handle optional fields correctly', async () => {
      // Arrange
      const assignmentData = {
        employeeId,
        componentId,
        effectiveFrom: '2025-01-01',
        // No effectiveTo, configuration, overrideAmount, overrideFormula, notes
      };

      const component = {
        id: componentId,
        component_code: 'BASE',
      };

      mockRepository.findById.mockResolvedValue(component);
      mockRepository.assignComponentToEmployee.mockResolvedValue({
        id: assignmentId,
      });

      // Act
      await service.assignComponentToEmployee(assignmentData, organizationId, userId);

      // Assert
      expect(mockRepository.assignComponentToEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          effectiveTo: undefined,
          configuration: {},
          overrideAmount: undefined,
          overrideFormula: undefined,
          notes: undefined,
        }),
        organizationId
      );
    });
  });

  describe('getEmployeeComponentAssignments', () => {
    it('should return all assignments for employee', async () => {
      // Arrange
      const assignments = [
        {
          id: assignmentId,
          employee_id: employeeId,
          component_id: componentId,
          component_name: 'Bonus',
          effective_from: '2025-01-01',
        },
        {
          id: 'assign-2',
          employee_id: employeeId,
          component_id: 'comp-2',
          component_name: 'Allowance',
          effective_from: '2025-02-01',
        },
      ];

      mockRepository.findEmployeeComponents.mockResolvedValue(assignments);

      // Act
      const result = await service.getEmployeeComponentAssignments(
        employeeId,
        organizationId
      );

      // Assert
      expect(result).toEqual(assignments);
      expect(mockRepository.findEmployeeComponents).toHaveBeenCalledWith(
        employeeId,
        organizationId,
        {}
      );
    });

    it('should pass filters to repository', async () => {
      // Arrange
      const filters = {
        effectiveDate: '2025-06-01',
        componentType: 'allowance',
        category: 'regular',
      };

      mockRepository.findEmployeeComponents.mockResolvedValue([]);

      // Act
      await service.getEmployeeComponentAssignments(employeeId, organizationId, filters);

      // Assert
      expect(mockRepository.findEmployeeComponents).toHaveBeenCalledWith(
        employeeId,
        organizationId,
        filters
      );
    });

    it('should return empty array when no assignments found', async () => {
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

  describe('getEmployeeComponentAssignment', () => {
    it('should return single assignment by ID', async () => {
      // Arrange
      const assignment = {
        id: assignmentId,
        employee_id: employeeId,
        component_id: componentId,
        component_name: 'Bonus',
        effective_from: '2025-01-01',
      };

      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(assignment);

      // Act
      const result = await service.getEmployeeComponentAssignment(
        assignmentId,
        organizationId
      );

      // Assert
      expect(result).toEqual(assignment);
      expect(mockRepository.findEmployeeComponentAssignmentById).toHaveBeenCalledWith(
        assignmentId,
        organizationId
      );
    });

    it('should return null when assignment not found', async () => {
      // Arrange
      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(null);

      // Act
      const result = await service.getEmployeeComponentAssignment(
        assignmentId,
        organizationId
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateEmployeeComponentAssignment', () => {
    it('should update assignment with valid data', async () => {
      // Arrange
      const updates = {
        effectiveTo: '2025-12-31',
        overrideAmount: 1500,
        notes: 'Updated bonus amount',
      };

      const existingAssignment = {
        id: assignmentId,
        employee_id: employeeId,
        component_id: componentId,
      };

      const updatedAssignment = {
        ...existingAssignment,
        effective_to: '2025-12-31',
        override_amount: 1500,
        notes: 'Updated bonus amount',
        updated_by: userId,
        updated_at: new Date(),
      };

      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(
        existingAssignment
      );
      mockRepository.updateEmployeeComponentAssignment.mockResolvedValue(
        updatedAssignment
      );

      // Act
      const result = await service.updateEmployeeComponentAssignment(
        assignmentId,
        updates,
        organizationId,
        userId
      );

      // Assert
      expect(result).toEqual(updatedAssignment);
      expect(mockRepository.findEmployeeComponentAssignmentById).toHaveBeenCalledWith(
        assignmentId,
        organizationId
      );
      expect(mockRepository.updateEmployeeComponentAssignment).toHaveBeenCalledWith(
        assignmentId,
        expect.objectContaining({
          effectiveTo: '2025-12-31',
          overrideAmount: 1500,
          notes: 'Updated bonus amount',
          updatedBy: userId,
        }),
        organizationId
      );
    });

    it('should throw error when assignment not found', async () => {
      // Arrange
      const updates = {
        overrideAmount: 1500,
      };

      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateEmployeeComponentAssignment(
          assignmentId,
          updates,
          organizationId,
          userId
        )
      ).rejects.toThrow('Component assignment not found');

      expect(mockRepository.updateEmployeeComponentAssignment).not.toHaveBeenCalled();
    });

    it('should update configuration object', async () => {
      // Arrange
      const updates = {
        configuration: {
          frequency: 'quarterly',
          prorated: true,
        },
      };

      const existingAssignment = {
        id: assignmentId,
        configuration: { frequency: 'monthly' },
      };

      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(
        existingAssignment
      );
      mockRepository.updateEmployeeComponentAssignment.mockResolvedValue({
        ...existingAssignment,
        configuration: updates.configuration,
      });

      // Act
      await service.updateEmployeeComponentAssignment(
        assignmentId,
        updates,
        organizationId,
        userId
      );

      // Assert
      expect(mockRepository.updateEmployeeComponentAssignment).toHaveBeenCalledWith(
        assignmentId,
        expect.objectContaining({
          configuration: {
            frequency: 'quarterly',
            prorated: true,
          },
        }),
        organizationId
      );
    });

    it('should update effective dates', async () => {
      // Arrange
      const updates = {
        effectiveFrom: '2025-02-01',
        effectiveTo: '2025-11-30',
      };

      const existingAssignment = {
        id: assignmentId,
        effective_from: '2025-01-01',
      };

      mockRepository.findEmployeeComponentAssignmentById.mockResolvedValue(
        existingAssignment
      );
      mockRepository.updateEmployeeComponentAssignment.mockResolvedValue({
        ...existingAssignment,
        ...updates,
      });

      // Act
      await service.updateEmployeeComponentAssignment(
        assignmentId,
        updates,
        organizationId,
        userId
      );

      // Assert
      expect(mockRepository.updateEmployeeComponentAssignment).toHaveBeenCalledWith(
        assignmentId,
        expect.objectContaining({
          effectiveFrom: '2025-02-01',
          effectiveTo: '2025-11-30',
        }),
        organizationId
      );
    });
  });

  describe('removeEmployeeComponentAssignment', () => {
    it('should remove assignment successfully', async () => {
      // Arrange
      mockRepository.removeEmployeeComponentAssignment.mockResolvedValue();

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

    it('should handle repository errors', async () => {
      // Arrange
      mockRepository.removeEmployeeComponentAssignment.mockRejectedValue(
        new Error('Database error')
      );

      // Act & Assert
      await expect(
        service.removeEmployeeComponentAssignment(assignmentId, organizationId, userId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle assignment with null effective_to', async () => {
      // Arrange
      const assignmentData = {
        employeeId,
        componentId,
        effectiveFrom: '2025-01-01',
        effectiveTo: null, // Open-ended assignment
      };

      const component = {
        id: componentId,
        component_code: 'PERMANENT',
      };

      mockRepository.findById.mockResolvedValue(component);
      mockRepository.assignComponentToEmployee.mockResolvedValue({
        id: assignmentId,
        effective_to: null,
      });

      // Act
      await service.assignComponentToEmployee(assignmentData, organizationId, userId);

      // Assert
      expect(mockRepository.assignComponentToEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          effectiveTo: null,
        }),
        organizationId
      );
    });

    it('should handle assignment with override formula', async () => {
      // Arrange
      const assignmentData = {
        employeeId,
        componentId,
        effectiveFrom: '2025-01-01',
        overrideFormula: 'baseSalary * 0.15',
      };

      const component = {
        id: componentId,
        component_code: 'CALC',
      };

      mockRepository.findById.mockResolvedValue(component);
      mockRepository.assignComponentToEmployee.mockResolvedValue({
        id: assignmentId,
        override_formula: 'baseSalary * 0.15',
      });

      // Act
      await service.assignComponentToEmployee(assignmentData, organizationId, userId);

      // Assert
      expect(mockRepository.assignComponentToEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          overrideFormula: 'baseSalary * 0.15',
        }),
        organizationId
      );
    });

    it('should handle complex configuration objects', async () => {
      // Arrange
      const assignmentData = {
        employeeId,
        componentId,
        effectiveFrom: '2025-01-01',
        configuration: {
          frequency: 'monthly',
          prorated: true,
          taxExempt: false,
          limits: {
            maxAmount: 5000,
            maxPercentage: 25,
          },
          conditions: [
            { field: 'tenure', operator: '>=', value: 12 },
            { field: 'performanceRating', operator: '>', value: 3 },
          ],
        },
      };

      const component = {
        id: componentId,
        component_code: 'COMPLEX',
      };

      mockRepository.findById.mockResolvedValue(component);
      mockRepository.assignComponentToEmployee.mockResolvedValue({
        id: assignmentId,
        configuration: assignmentData.configuration,
      });

      // Act
      await service.assignComponentToEmployee(assignmentData, organizationId, userId);

      // Assert
      expect(mockRepository.assignComponentToEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          configuration: assignmentData.configuration,
        }),
        organizationId
      );
    });
  });

  describe('Tenant Isolation', () => {
    it('should enforce organizationId in all repository calls', async () => {
      // Arrange
      const assignmentData = {
        employeeId,
        componentId,
        effectiveFrom: '2025-01-01',
      };

      const component = {
        id: componentId,
        component_code: 'TEST',
      };

      mockRepository.findById.mockResolvedValue(component);
      mockRepository.assignComponentToEmployee.mockResolvedValue({
        id: assignmentId,
      });

      // Act
      await service.assignComponentToEmployee(assignmentData, organizationId, userId);

      // Assert - organizationId should be passed to both calls
      expect(mockRepository.findById).toHaveBeenCalledWith(
        componentId,
        organizationId // Tenant isolation
      );
      expect(mockRepository.assignComponentToEmployee).toHaveBeenCalledWith(
        expect.any(Object),
        organizationId // Tenant isolation
      );
    });

    it('should not allow cross-organization component assignment', async () => {
      // Arrange
      const assignmentData = {
        employeeId,
        componentId,
        effectiveFrom: '2025-01-01',
      };

      // Component doesn't belong to organization
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.assignComponentToEmployee(assignmentData, organizationId, userId)
      ).rejects.toThrow('Pay component not found');
    });
  });
});
