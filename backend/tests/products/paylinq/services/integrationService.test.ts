/**
 * PaylinqIntegrationService Test Suite
 * 
 * Tests for PayLinQ cross-product integration service following TESTING_STANDARDS.md:
 * - ES modules with @jest/globals
 * - Dependency injection pattern
 * - Focus on business logic and integration workflows
 * 
 * VERIFIED METHODS (from grep analysis):
 * 1. setupPayrollFromNexusContract(contractData, createdBy)
 * 2. updatePayrollFromNexusContractInternal(contractData, updatedBy)
 * 3. addBenefitsDeductionFromNexus(enrollmentData, createdBy)
 * 4. addBenefitsDeductionFromNexusInternal(enrollmentData, createdBy)
 * 5. recordTimeEntryFromScheduleHub(timeData, createdBy)
 * 6. recordTimeEntryFromScheduleHubInternal(timeData, createdBy)
 * 7. mapSalaryFrequency(nexusFrequency)
 * 8. determineCompensationType(employmentType, salaryFrequency)
 * 9. calculateHourlyRate(salary, frequency)
 * 10. calculatePayPeriodAmount(salary, frequency)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PaylinqIntegrationService from '../../../../src/products/paylinq/services/integrationService.js';

describe('PaylinqIntegrationService', () => {
  let service: any;
  let mockPayrollRepository: any;
  let mockErrorHandler: any;
  let mockLogger: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testEmployeeId = '323e4567-e89b-12d3-a456-426614174002';
  const testContractId = '423e4567-e89b-12d3-a456-426614174003';
  const testEnrollmentId = '523e4567-e89b-12d3-a456-426614174004';
  const testShiftId = '623e4567-e89b-12d3-a456-426614174005';

  beforeEach(() => {
    // Create comprehensive mock repository
    mockPayrollRepository = {
      findEmployeePayrollConfig: jest.fn(),
      createEmployeePayrollConfig: jest.fn(),
      updateEmployeePayrollConfig: jest.fn(),
      createCompensation: jest.fn(),
      createDeduction: jest.fn(),
      createTimeEntry: jest.fn()
    };

    // Mock error handler
    mockErrorHandler = {
      createContext: jest.fn((data) => ({ ...data })),
      executeNonBlocking: jest.fn((key, fn, context) => fn())
    };

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    // Create service instance (uses pool directly, no full DI)
    service = new PaylinqIntegrationService();
    service.payrollRepository = mockPayrollRepository;
    service.errorHandler = mockErrorHandler;
    service.logger = mockLogger;
  });

  // ==================== Helper Methods (Pure Logic - Fully Testable) ====================

  describe('mapSalaryFrequency', () => {
    it('should map hourly to weekly', () => {
      const result = service.mapSalaryFrequency('hourly');
      expect(result).toBe('weekly');
    });

    it('should map daily to weekly', () => {
      const result = service.mapSalaryFrequency('daily');
      expect(result).toBe('weekly');
    });

    it('should map weekly to weekly', () => {
      const result = service.mapSalaryFrequency('weekly');
      expect(result).toBe('weekly');
    });

    it('should map biweekly to biweekly', () => {
      const result = service.mapSalaryFrequency('biweekly');
      expect(result).toBe('biweekly');
    });

    it('should map monthly to monthly', () => {
      const result = service.mapSalaryFrequency('monthly');
      expect(result).toBe('monthly');
    });

    it('should map annually to monthly', () => {
      const result = service.mapSalaryFrequency('annually');
      expect(result).toBe('monthly');
    });

    it('should default unknown frequency to monthly', () => {
      const result = service.mapSalaryFrequency('unknown');
      expect(result).toBe('monthly');
    });
  });

  describe('determineCompensationType', () => {
    it('should return hourly for hourly frequency', () => {
      const result = service.determineCompensationType('full_time', 'hourly');
      expect(result).toBe('hourly');
    });

    it('should return hourly for part_time employment', () => {
      const result = service.determineCompensationType('part_time', 'monthly');
      expect(result).toBe('hourly');
    });

    it('should return hourly for contractor employment', () => {
      const result = service.determineCompensationType('contractor', 'weekly');
      expect(result).toBe('hourly');
    });

    it('should return hourly for contract employment', () => {
      const result = service.determineCompensationType('contract', 'biweekly');
      expect(result).toBe('hourly');
    });

    it('should return salary for full_time with monthly frequency', () => {
      const result = service.determineCompensationType('full_time', 'monthly');
      expect(result).toBe('salary');
    });

    it('should return salary for full_time with weekly frequency', () => {
      const result = service.determineCompensationType('full_time', 'weekly');
      expect(result).toBe('salary');
    });
  });

  describe('calculateHourlyRate', () => {
    it('should return salary as-is for hourly frequency', () => {
      const result = service.calculateHourlyRate(25.50, 'hourly');
      expect(result).toBe(25.50);
    });

    it('should calculate hourly rate from weekly salary', () => {
      const result = service.calculateHourlyRate(1000, 'weekly');
      expect(result).toBeCloseTo(25.00, 2); // (1000 * 52) / 2080
    });

    it('should calculate hourly rate from biweekly salary', () => {
      const result = service.calculateHourlyRate(2000, 'biweekly');
      expect(result).toBeCloseTo(25.00, 2); // (2000 * 26) / 2080
    });

    it('should calculate hourly rate from monthly salary', () => {
      const result = service.calculateHourlyRate(4333.33, 'monthly');
      expect(result).toBeCloseTo(25.00, 2); // (4333.33 * 12) / 2080
    });

    it('should calculate hourly rate from annual salary', () => {
      const result = service.calculateHourlyRate(52000, 'annually');
      expect(result).toBeCloseTo(25.00, 2); // 52000 / 2080
    });

    it('should return null for unknown frequency', () => {
      const result = service.calculateHourlyRate(1000, 'unknown');
      expect(result).toBeNull();
    });

    it('should handle zero salary', () => {
      const result = service.calculateHourlyRate(0, 'monthly');
      expect(result).toBe(0);
    });
  });

  describe('calculatePayPeriodAmount', () => {
    it('should return salary as-is for weekly frequency', () => {
      const result = service.calculatePayPeriodAmount(1000, 'weekly');
      expect(result).toBe(1000);
    });

    it('should return salary as-is for biweekly frequency', () => {
      const result = service.calculatePayPeriodAmount(2000, 'biweekly');
      expect(result).toBe(2000);
    });

    it('should return salary as-is for monthly frequency', () => {
      const result = service.calculatePayPeriodAmount(4000, 'monthly');
      expect(result).toBe(4000);
    });

    it('should convert annual to monthly', () => {
      const result = service.calculatePayPeriodAmount(48000, 'annually');
      expect(result).toBe(4000); // 48000 / 12
    });

    it('should calculate biweekly amount from hourly rate', () => {
      const result = service.calculatePayPeriodAmount(25, 'hourly');
      expect(result).toBe(2000); // 25 * 80 hours
    });

    it('should return salary as-is for unknown frequency', () => {
      const result = service.calculatePayPeriodAmount(1000, 'unknown');
      expect(result).toBe(1000);
    });
  });

  // ==================== setupPayrollFromNexusContract ====================

  describe('setupPayrollFromNexusContract', () => {
    it('should wrap internal method with error handler', async () => {
      // Arrange
      const contractData = {
        employeeId: testEmployeeId,
        contractId: testContractId,
        organizationId: testOrganizationId,
        employee: {
          employeeNumber: 'EMP001',
          firstName: 'John',
          lastName: 'Doe'
        },
        salary: 50000,
        currency: 'USD',
        salaryFrequency: 'monthly',
        startDate: new Date('2025-01-01'),
        jobTitle: 'Software Engineer',
        employmentType: 'full_time'
      };

      mockErrorHandler.executeNonBlocking.mockResolvedValue({
        success: true,
        data: { employeePayrollConfigId: 'test-id' }
      });

      // Act
      const result = await service.setupPayrollFromNexusContract(contractData, testUserId);

      // Assert
      expect(mockErrorHandler.createContext).toHaveBeenCalledWith({
        integration: 'nexus-to-paylinq-payroll',
        employeeId: testEmployeeId,
        contractId: testContractId,
        organizationId: testOrganizationId
      });

      expect(mockErrorHandler.executeNonBlocking).toHaveBeenCalledWith(
        'nexus-to-paylinq-payroll',
        expect.any(Function),
        expect.objectContaining({
          integration: 'nexus-to-paylinq-payroll'
        })
      );

      expect(result).toEqual({
        success: true,
        data: { employeePayrollConfigId: 'test-id' }
      });
    });

    it('should pass through errors from error handler', async () => {
      // Arrange
      const contractData = {
        employeeId: testEmployeeId,
        contractId: testContractId,
        organizationId: testOrganizationId
      };

      mockErrorHandler.executeNonBlocking.mockRejectedValue(new Error('Integration error'));

      // Act & Assert
      await expect(
        service.setupPayrollFromNexusContract(contractData, testUserId)
      ).rejects.toThrow('Integration error');
    });
  });

  // ==================== addBenefitsDeductionFromNexus ====================

  describe('addBenefitsDeductionFromNexus', () => {
    it('should wrap internal method with error handler', async () => {
      // Arrange
      const enrollmentData = {
        employeeId: testEmployeeId,
        enrollmentId: testEnrollmentId,
        organizationId: testOrganizationId,
        planName: 'Health Insurance Premium',
        employeeContribution: 150.00,
        startDate: new Date('2025-01-01')
      };

      mockErrorHandler.executeNonBlocking.mockResolvedValue({
        success: true,
        data: { deductionId: 'test-deduction-id' }
      });

      // Act
      const result = await service.addBenefitsDeductionFromNexus(enrollmentData, testUserId);

      // Assert
      expect(mockErrorHandler.createContext).toHaveBeenCalledWith({
        integration: 'nexus-to-paylinq-benefits',
        employeeId: testEmployeeId,
        enrollmentId: testEnrollmentId,
        organizationId: testOrganizationId
      });

      expect(mockErrorHandler.executeNonBlocking).toHaveBeenCalledWith(
        'nexus-to-paylinq-benefits',
        expect.any(Function),
        expect.objectContaining({
          integration: 'nexus-to-paylinq-benefits'
        })
      );

      expect(result).toEqual({
        success: true,
        data: { deductionId: 'test-deduction-id' }
      });
    });

    it('should pass through errors from error handler', async () => {
      // Arrange
      const enrollmentData = {
        employeeId: testEmployeeId,
        enrollmentId: testEnrollmentId,
        organizationId: testOrganizationId
      };

      mockErrorHandler.executeNonBlocking.mockRejectedValue(new Error('Benefits integration error'));

      // Act & Assert
      await expect(
        service.addBenefitsDeductionFromNexus(enrollmentData, testUserId)
      ).rejects.toThrow('Benefits integration error');
    });
  });

  // ==================== recordTimeEntryFromScheduleHub ====================

  describe('recordTimeEntryFromScheduleHub', () => {
    it('should wrap internal method with error handler', async () => {
      // Arrange
      const timeData = {
        employeeId: testEmployeeId,
        shiftId: testShiftId,
        organizationId: testOrganizationId,
        workDate: new Date('2025-01-15'),
        regularHours: 8.0,
        overtimeHours: 1.5,
        clockIn: new Date('2025-01-15T09:00:00Z'),
        clockOut: new Date('2025-01-15T18:30:00Z')
      };

      mockErrorHandler.executeNonBlocking.mockResolvedValue({
        success: true,
        data: { timeEntryId: 'test-time-entry-id' }
      });

      // Act
      const result = await service.recordTimeEntryFromScheduleHub(timeData, testUserId);

      // Assert
      expect(mockErrorHandler.createContext).toHaveBeenCalledWith({
        integration: 'schedulehub-to-paylinq-timeentry',
        employeeId: testEmployeeId,
        shiftId: testShiftId,
        organizationId: testOrganizationId,
        workDate: timeData.workDate
      });

      expect(mockErrorHandler.executeNonBlocking).toHaveBeenCalledWith(
        'schedulehub-to-paylinq-timeentry',
        expect.any(Function),
        expect.objectContaining({
          integration: 'schedulehub-to-paylinq-timeentry'
        })
      );

      expect(result).toEqual({
        success: true,
        data: { timeEntryId: 'test-time-entry-id' }
      });
    });

    it('should pass through errors from error handler', async () => {
      // Arrange
      const timeData = {
        employeeId: testEmployeeId,
        shiftId: testShiftId,
        organizationId: testOrganizationId,
        workDate: new Date('2025-01-15')
      };

      mockErrorHandler.executeNonBlocking.mockRejectedValue(new Error('Time entry integration error'));

      // Act & Assert
      await expect(
        service.recordTimeEntryFromScheduleHub(timeData, testUserId)
      ).rejects.toThrow('Time entry integration error');
    });
  });

  // ==================== Edge Cases and Error Handling ====================

  describe('Edge Cases', () => {
    it('should handle zero hours in calculateHourlyRate', () => {
      const result = service.calculateHourlyRate(0, 'annually');
      expect(result).toBe(0);
    });

    it('should handle negative salary gracefully in calculateHourlyRate', () => {
      const result = service.calculateHourlyRate(-1000, 'monthly');
      expect(result).toBeLessThan(0);
    });

    it('should handle zero pay period amount', () => {
      const result = service.calculatePayPeriodAmount(0, 'monthly');
      expect(result).toBe(0);
    });

    it('should handle null frequency in mapSalaryFrequency', () => {
      const result = service.mapSalaryFrequency(null as any);
      expect(result).toBe('monthly');
    });

    it('should handle empty string frequency in mapSalaryFrequency', () => {
      const result = service.mapSalaryFrequency('');
      expect(result).toBe('monthly');
    });
  });

  // ==================== Integration Context Creation ====================

  describe('Error Handler Integration', () => {
    it('should create proper context for payroll setup', async () => {
      // Arrange
      const contractData = {
        employeeId: testEmployeeId,
        contractId: testContractId,
        organizationId: testOrganizationId,
        salary: 50000
      };

      mockErrorHandler.executeNonBlocking.mockResolvedValue({ success: true });

      // Act
      await service.setupPayrollFromNexusContract(contractData, testUserId);

      // Assert
      expect(mockErrorHandler.createContext).toHaveBeenCalledWith(
        expect.objectContaining({
          integration: 'nexus-to-paylinq-payroll',
          employeeId: testEmployeeId,
          contractId: testContractId,
          organizationId: testOrganizationId
        })
      );
    });

    it('should create proper context for benefits deduction', async () => {
      // Arrange
      const enrollmentData = {
        employeeId: testEmployeeId,
        enrollmentId: testEnrollmentId,
        organizationId: testOrganizationId,
        planName: 'Health Plan'
      };

      mockErrorHandler.executeNonBlocking.mockResolvedValue({ success: true });

      // Act
      await service.addBenefitsDeductionFromNexus(enrollmentData, testUserId);

      // Assert
      expect(mockErrorHandler.createContext).toHaveBeenCalledWith(
        expect.objectContaining({
          integration: 'nexus-to-paylinq-benefits',
          employeeId: testEmployeeId,
          enrollmentId: testEnrollmentId,
          organizationId: testOrganizationId
        })
      );
    });

    it('should create proper context for time entry', async () => {
      // Arrange
      const timeData = {
        employeeId: testEmployeeId,
        shiftId: testShiftId,
        organizationId: testOrganizationId,
        workDate: new Date('2025-01-15')
      };

      mockErrorHandler.executeNonBlocking.mockResolvedValue({ success: true });

      // Act
      await service.recordTimeEntryFromScheduleHub(timeData, testUserId);

      // Assert
      expect(mockErrorHandler.createContext).toHaveBeenCalledWith(
        expect.objectContaining({
          integration: 'schedulehub-to-paylinq-timeentry',
          employeeId: testEmployeeId,
          shiftId: testShiftId,
          organizationId: testOrganizationId,
          workDate: timeData.workDate
        })
      );
    });
  });
});
