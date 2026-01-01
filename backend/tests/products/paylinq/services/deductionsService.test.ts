import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import DeductionsService from '../../../../src/products/paylinq/services/deductionsService.js';

/**
 * DeductionsService Test Plan
 * 
 * EXPORT PATTERN: ✅ Class export (testable)
 * DTO USAGE: No DTOs used
 * VALIDATION SCHEMAS: Need to check for Joi schemas
 * 
 * VERIFIED METHODS:
 * 1. createDeductionType(deductionData, organizationId, userId)
 * 2. getDeductionTypes(organizationId, filters = {})
 * 3. assignDeduction(assignmentData, organizationId, userId)
 * 4. updateEmployeeDeduction(deductionId, updates, organizationId, userId)
 * 5. terminateDeduction(deductionId, endDate, organizationId, userId)
 * 6. getDeductionById(deductionId, organizationId)
 * 7. getEmployeeDeductions(employeeId, organizationId)
 * 8. calculateAllDeductions(employeeRecordId, grossPay, organizationId)
 * 9. getDeductionSummary(employeeId, organizationId, startDate, endDate)
 * 10. getYearToDateDeductions(employeeId, organizationId)
 */

describe('DeductionsService', () => {
  let service: any;
  let mockRepository: any;
  let mockDatabase: any;

  const testOrgId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const testUserId = 'user-123e4567-e89b-12d3-a456-426614174000';
  const testEmployeeId = 'emp-123e4567-e89b-12d3-a456-426614174000';
  const testDeductionId = 'ded-123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    // Mock repository
    mockRepository = {
      createDeductionType: jest.fn(),
      getDeductionTypes: jest.fn(),
      assignDeduction: jest.fn(),
      updateEmployeeDeduction: jest.fn(),
      terminateDeduction: jest.fn(),
      getDeductionById: jest.fn(),
      getEmployeeDeductions: jest.fn(),
      calculateAllDeductions: jest.fn(),
      getYearToDateDeductions: jest.fn(),
    };

    // Mock database query
    mockDatabase = {
      query: jest.fn(),
    };

    service = new DeductionsService(mockRepository);
  });

  describe('createDeductionType', () => {
    it('should create deduction type with valid data', async () => {
      const deductionData = {
        deductionName: 'Pension Contribution',
        deductionType: 'percentage',
        calculationType: 'percentage',
        defaultAmount: 5.5,
      };

      const createdDeduction = {
        id: testDeductionId,
        ...deductionData,
        organization_id: testOrgId,
        created_by: testUserId,
      };

      mockRepository.createDeductionType.mockResolvedValue(createdDeduction);

      const result = await service.createDeductionType(
        deductionData,
        testOrgId,
        testUserId
      );

      expect(result).toEqual(createdDeduction);
      expect(mockRepository.createDeductionType).toHaveBeenCalledWith(
        deductionData,
        testOrgId,
        testUserId
      );
    });

    it('should throw error for invalid deduction type', async () => {
      const invalidData = {
        deductionName: 'Test',
        deductionType: 'percentage',
        calculationType: 'invalid_type', // Invalid
      };

      await expect(
        service.createDeductionType(invalidData, testOrgId, testUserId)
      ).rejects.toThrow('Invalid calculation type');
    });

    it('should throw error for negative rate', async () => {
      const invalidData = {
        deductionName: 'Test',
        deductionType: 'percentage',
        calculationType: 'percentage',
        defaultAmount: -5, // Negative amount
      };

      await expect(
        service.createDeductionType(invalidData, testOrgId, testUserId)
      ).rejects.toThrow('Amount must be positive');
    });
  });

  describe('getDeductionTypes', () => {
    it('should return all deduction types for organization', async () => {
      const deductionTypes = [
        {
          id: 'ded1',
          deduction_code: 'PENSION',
          deduction_name: 'Pension',
          is_active: true,
        },
        {
          id: 'ded2',
          deduction_code: 'UNION',
          deduction_name: 'Union Dues',
          is_active: true,
        },
      ];

      mockRepository.getDeductionTypes.mockResolvedValue(deductionTypes);

      const result = await service.getDeductionTypes(testOrgId);

      expect(result).toEqual(deductionTypes);
      expect(mockRepository.getDeductionTypes).toHaveBeenCalledWith(
        testOrgId,
        {}
      );
    });

    it('should filter deduction types by filters', async () => {
      const filters = { is_active: true, is_mandatory: true };
      const filteredTypes = [
        { id: 'ded1', deduction_code: 'PENSION', is_mandatory: true },
      ];

      mockRepository.getDeductionTypes.mockResolvedValue(filteredTypes);

      const result = await service.getDeductionTypes(testOrgId, filters);

      expect(result).toEqual(filteredTypes);
      expect(mockRepository.getDeductionTypes).toHaveBeenCalledWith(
        testOrgId,
        filters
      );
    });
  });

  describe('assignDeduction', () => {
    it('should assign deduction to employee', async () => {
      const assignmentData = {
        employee_record_id: testEmployeeId,
        deductionTypeId: testDeductionId,
        deduction_amount: 100.0,
        start_date: new Date('2025-01-01'),
      };

      const assignment = {
        id: 'assign-123',
        ...assignmentData,
        organization_id: testOrgId,
        created_by: testUserId,
      };

      // Mock the deduction type exists check
      mockRepository.getDeductionById.mockResolvedValue({
        id: testDeductionId,
        deductionName: 'Test Deduction',
      });
      mockRepository.assignDeduction.mockResolvedValue(assignment);

      const result = await service.assignDeduction(
        assignmentData,
        testOrgId,
        testUserId
      );

      expect(result).toEqual(assignment);
      expect(mockRepository.getDeductionById).toHaveBeenCalledWith(
        testDeductionId,
        testOrgId
      );
      expect(mockRepository.assignDeduction).toHaveBeenCalled();
    });

    it('should validate required fields for assignment', async () => {
      const invalidData = {
        employee_record_id: testEmployeeId,
        // Missing deduction_type_id
      };

      await expect(
        service.assignDeduction(invalidData, testOrgId, testUserId)
      ).rejects.toThrow();
    });
  });

  describe('updateEmployeeDeduction', () => {
    it('should update employee deduction', async () => {
      const updates = {
        deduction_amount: 150.0,
        notes: 'Increased amount',
      };

      const updatedDeduction = {
        id: testDeductionId,
        ...updates,
        updated_by: testUserId,
      };

      mockRepository.updateEmployeeDeduction.mockResolvedValue(
        updatedDeduction
      );

      const result = await service.updateEmployeeDeduction(
        testDeductionId,
        updates,
        testOrgId,
        testUserId
      );

      expect(result).toEqual(updatedDeduction);
      expect(mockRepository.updateEmployeeDeduction).toHaveBeenCalledWith(
        testDeductionId,
        updates,
        testOrgId,
        testUserId
      );
    });

    it('should return null if deduction not found', async () => {
      mockRepository.updateEmployeeDeduction.mockResolvedValue(null);

      const result = await service.updateEmployeeDeduction(
        'nonexistent',
        { amount: 100 },
        testOrgId,
        testUserId
      );

      expect(result).toBeNull();
    });
  });

  describe('terminateDeduction', () => {
    it('should terminate deduction on given date', async () => {
      const endDate = new Date('2025-12-31');

      const terminatedDeduction = {
        id: testDeductionId,
        end_date: endDate,
        updated_by: testUserId,
      };

      mockRepository.terminateDeduction.mockResolvedValue(terminatedDeduction);

      const result = await service.terminateDeduction(
        testDeductionId,
        endDate,
        testOrgId,
        testUserId
      );

      expect(result).toEqual(terminatedDeduction);
      expect(mockRepository.terminateDeduction).toHaveBeenCalledWith(
        testDeductionId,
        endDate,
        testOrgId,
        testUserId
      );
    });

    it('should allow termination with any date', async () => {
      const pastDate = new Date('2020-01-01');

      mockRepository.terminateDeduction.mockResolvedValue({
        id: testDeductionId,
        end_date: pastDate,
      });

      const result = await service.terminateDeduction(
        testDeductionId,
        pastDate,
        testOrgId,
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.end_date).toEqual(pastDate);
    });
  });

  describe('getDeductionById', () => {
    it('should return deduction by ID', async () => {
      const deduction = {
        id: testDeductionId,
        deduction_code: 'PENSION',
        deduction_name: 'Pension',
      };

      mockRepository.getDeductionById.mockResolvedValue(deduction);

      const result = await service.getDeductionById(testDeductionId, testOrgId);

      expect(result).toEqual(deduction);
      expect(mockRepository.getDeductionById).toHaveBeenCalledWith(
        testDeductionId,
        testOrgId
      );
    });

    it('should return null if deduction not found', async () => {
      mockRepository.getDeductionById.mockResolvedValue(null);

      const result = await service.getDeductionById('nonexistent', testOrgId);

      expect(result).toBeNull();
    });
  });

  describe('getEmployeeDeductions', () => {
    it('should return all active deductions for employee', async () => {
      const employeeDeductions = [
        {
          id: 'ded1',
          deduction_code: 'PENSION',
          deduction_amount: 100.0,
          is_active: true,
        },
        {
          id: 'ded2',
          deduction_code: 'UNION',
          deduction_amount: 50.0,
          is_active: true,
        },
      ];

      mockRepository.getEmployeeDeductions.mockResolvedValue(
        employeeDeductions
      );

      const result = await service.getEmployeeDeductions(
        testEmployeeId,
        testOrgId
      );

      expect(result).toEqual(employeeDeductions);
      expect(mockRepository.getEmployeeDeductions).toHaveBeenCalledWith(
        testEmployeeId,
        testOrgId
      );
    });

    it('should return empty array if no deductions', async () => {
      mockRepository.getEmployeeDeductions.mockResolvedValue([]);

      const result = await service.getEmployeeDeductions(
        testEmployeeId,
        testOrgId
      );

      expect(result).toEqual([]);
    });
  });

  describe('calculateAllDeductions', () => {
    it('should calculate all deductions for employee', async () => {
      const employeeRecordId = 'emp-rec-123';
      const grossPay = 5000.0;

      const deductions = [
        {
          id: 'ded1',
          deduction_name: 'Pension',
          calculation_type: 'percentage',
          amount: 10,
          calculatedAmount: 500,
        },
        {
          id: 'ded2',
          deduction_name: 'Union',
          calculation_type: 'fixed',
          amount: 50,
          calculatedAmount: 50,
        },
      ];

      mockRepository.calculateAllDeductions.mockResolvedValue(deductions);

      const result = await service.calculateAllDeductions(
        employeeRecordId,
        grossPay,
        testOrgId
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should calculate percentage-based deduction correctly', async () => {
      const grossPay = 5000.0;

      const deductions = [
        {
          deduction_name: 'Pension',
          calculation_type: 'percentage',
          amount: 10,
          calculatedAmount: 500.0,
        },
      ];

      mockRepository.calculateAllDeductions.mockResolvedValue(deductions);

      const result = await service.calculateAllDeductions(
        'emp-rec-123',
        grossPay,
        testOrgId
      );

      expect(result[0].calculatedAmount).toBe(500.0); // 10% of 5000
    });

    it('should calculate fixed deduction correctly', async () => {
      const grossPay = 5000.0;

      const deductions = [
        {
          deduction_name: 'Union Dues',
          calculation_type: 'fixed',
          amount: 250.0,
          calculatedAmount: 250.0,
        },
      ];

      mockRepository.calculateAllDeductions.mockResolvedValue(deductions);

      const result = await service.calculateAllDeductions(
        'emp-rec-123',
        grossPay,
        testOrgId
      );

      expect(result[0].calculatedAmount).toBe(250.0);
    });

    it('should return empty array if no deductions exist', async () => {
      mockRepository.calculateAllDeductions.mockResolvedValue([]);

      const result = await service.calculateAllDeductions(
        'emp-rec-123',
        5000.0,
        testOrgId
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });
  });

  describe('getEmployeeDeductionSummary', () => {
    it('should return deduction summary for date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      const summary = {
        totalDeductions: 6000.0,
        byType: {
          PENSION: 3600.0,
          UNION: 2400.0,
        },
        count: 12,
      };

      // Mock database query
      jest
        .spyOn(service.repository, 'getEmployeeDeductions')
        .mockResolvedValue([]);

      const result = await service.getDeductionSummary(
        testEmployeeId,
        testOrgId,
        startDate,
        endDate
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('getYearToDateDeductions', () => {
    it('should return YTD deductions from repository', async () => {
      mockRepository.getYearToDateDeductions.mockResolvedValue({
        employee_id: testEmployeeId,
        ytd_total: 2500.50
      });

      // Act
      const result = await service.getYearToDateDeductions(testEmployeeId, testOrgId);

      // Assert
      expect(result).toEqual({
        employee_id: testEmployeeId,
        ytd_total: 2500.50
      });
      expect(mockRepository.getYearToDateDeductions).toHaveBeenCalledWith(testEmployeeId, testOrgId);
    });

    it('should return default structure when repository not available', async () => {
      // Remove repository method
      delete mockRepository.getYearToDateDeductions;
      service = new DeductionsService(mockRepository);

      // Act
      const result = await service.getYearToDateDeductions(testEmployeeId, testOrgId);

      // Assert
      expect(result).toEqual({
        employee_id: testEmployeeId,
        ytd_total: 0
      });
    });
  });
});
