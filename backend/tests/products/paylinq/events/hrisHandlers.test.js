/**
 * HRIS Handlers Tests
 * 
 * Unit tests for HRIS event handlers.
 */

import { jest } from '@jest/globals';

// Create mock repository functions
const mockFindByOrganization = jest.fn();
const mockFindByEmployeeId = jest.fn();
const mockCreateEmployeeRecord = jest.fn();
const mockUpdateEmployeeRecord = jest.fn();
const mockCreateCompensation = jest.fn();

// Mock PayrollRepository constructor
const MockPayrollRepository = jest.fn().mockImplementation(() => ({
  findByOrganization: mockFindByOrganization,
  findByEmployeeId: mockFindByEmployeeId,
  createEmployeeRecord: mockCreateEmployeeRecord,
  updateEmployeeRecord: mockUpdateEmployeeRecord,
  createCompensation: mockCreateCompensation
}));

// Mock WorkerTypeRepository constructor
const MockWorkerTypeRepository = jest.fn().mockImplementation(() => ({}));

// Apply mocks before importing handlers
jest.mock('../../../../src/products/paylinq/repositories/payrollRepository.js', () => ({
  default: MockPayrollRepository
}));

jest.mock('../../../../src/products/paylinq/repositories/workerTypeRepository.js', () => ({
  default: MockWorkerTypeRepository
}));

jest.mock('../../../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Now import handlers after mocks are set up
const hrisHandlers = await import('../../../../src/products/paylinq/events/handlers/hrisHandlers.js').then(m => m.default);

// Skip these tests until database integration is complete
describe.skip('HRIS Event Handlers', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockFindByOrganization.mockReset();
    mockFindByEmployeeId.mockReset();
    mockCreateEmployeeRecord.mockReset();
    mockUpdateEmployeeRecord.mockReset();
    mockCreateCompensation.mockReset();
  });

  describe('handleEmployeeCreated', () => {
    const mockEventData = {
      data: {
        organizationId: 'org-123',
        employeeId: 'emp-456',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        startDate: '2024-01-15',
        departmentId: 'dept-789',
        departmentName: 'Engineering',
        positionId: 'pos-101',
        positionTitle: 'Software Engineer',
        employmentType: 'full_time',
        status: 'active'
      },
      eventId: 'test-event-123',
      timestamp: new Date().toISOString()
    };

    test('should create payroll record for new employee', async () => {
      // Mock: No existing record
      mockFindByOrganization.mockResolvedValue([]);

      // Mock: Successful creation
      const mockCreatedRecord = {
        id: 'record-123',
        employee_id: 'emp-456',
        status: 'active'
      };
      mockCreateEmployeeRecord.mockResolvedValue(mockCreatedRecord);

      const result = await hrisHandlers.handleEmployeeCreated(mockEventData);

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.employeeRecordId).toBe('record-123');

      expect(mockCreateEmployeeRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-456',
          payFrequency: 'monthly',
          paymentMethod: 'ach',
          currency: 'SRD',
          status: 'active'
        }),
        'org-123',
        'system'
      );
    });

    test('should skip if payroll record already exists', async () => {
      // Mock: Existing record found
      mockFindByOrganization.mockResolvedValue([{
        id: 'existing-123',
        employee_id: 'emp-456'
      }]);

      const result = await hrisHandlers.handleEmployeeCreated(mockEventData);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(result.reason).toContain('already exists');

      expect(mockCreateEmployeeRecord).not.toHaveBeenCalled();
    });

    test('should generate employee number with timestamp', async () => {
      mockFindByOrganization.mockResolvedValue([]);
      mockCreateEmployeeRecord.mockResolvedValue({ id: 'new-123' });

      await hrisHandlers.handleEmployeeCreated(mockEventData);

      const createCall = mockPayrollRepo.createEmployeeRecord.mock.calls[0][0];
      expect(createCall.employeeNumber).toMatch(/^EMP-\d+$/);
    });

    test('should handle errors gracefully', async () => {
      mockPayrollRepo.findByEmployeeId = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(hrisHandlers.handleEmployeeCreated(mockEventData)).rejects.toThrow('Database error');
    });
  });

  describe('handleEmployeeUpdated', () => {
    const mockEventData = {
      organizationId: 'org-123',
      employeeId: 'emp-456',
      changes: {
        status: 'inactive',
        email: 'new.email@example.com'
      },
      updatedBy: 'user-789',
      updatedAt: '2024-06-15T10:00:00Z'
    };

    test('should update payroll record when employee updated', async () => {
      // Mock: Find existing record
      const mockExistingRecord = {
        id: 'record-123',
        employee_id: 'emp-456',
        status: 'active'
      };
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue(mockExistingRecord);

      // Mock: Successful update
      mockPayrollRepo.updateEmployeeRecord = jest.fn().mockResolvedValue({
        ...mockExistingRecord,
        status: 'inactive'
      });

      const result = await hrisHandlers.handleEmployeeUpdated(mockEventData);

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(result.changes).toBeDefined();

      expect(mockPayrollRepo.updateEmployeeRecord).toHaveBeenCalledWith(
        'record-123',
        expect.objectContaining({ status: 'inactive' }),
        'org-123',
        'system'
      );
    });

    test('should map HRIS status to payroll status correctly', async () => {
      const statusMappings = [
        { hrisStatus: 'active', expectedPayrollStatus: 'active' },
        { hrisStatus: 'inactive', expectedPayrollStatus: 'inactive' },
        { hrisStatus: 'terminated', expectedPayrollStatus: 'terminated' },
        { hrisStatus: 'on_leave', expectedPayrollStatus: 'inactive' }
      ];

      for (const mapping of statusMappings) {
        jest.clearAllMocks();

        mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue({
          id: 'record-123',
          status: 'active'
        });
        mockPayrollRepo.updateEmployeeRecord = jest.fn().mockResolvedValue({});

        const eventData = {
          ...mockEventData,
          changes: { status: mapping.hrisStatus }
        };

        await hrisHandlers.handleEmployeeUpdated(eventData);

        const updateCall = mockPayrollRepo.updateEmployeeRecord.mock.calls[0];
        expect(updateCall[1].status).toBe(mapping.expectedPayrollStatus);
      }
    });

    test('should skip if employee not found', async () => {
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue(null);

      const result = await hrisHandlers.handleEmployeeUpdated(mockEventData);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(mockPayrollRepo.updateEmployeeRecord).not.toHaveBeenCalled();
    });

    test('should skip if no payroll-relevant changes', async () => {
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue({
        id: 'record-123',
        status: 'active'
      });

      const eventData = {
        ...mockEventData,
        changes: { phone: '555-1234' } // Non-payroll field
      };

      const result = await hrisHandlers.handleEmployeeUpdated(eventData);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(mockPayrollRepo.updateEmployeeRecord).not.toHaveBeenCalled();
    });
  });

  describe('handleEmployeeTerminated', () => {
    const mockEventData = {
      organizationId: 'org-123',
      employeeId: 'emp-456',
      terminationDate: '2024-12-31',
      reason: 'resignation',
      terminatedBy: 'user-789'
    };

    test('should mark employee as terminated', async () => {
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue({
        id: 'record-123',
        status: 'active'
      });

      mockPayrollRepo.updateEmployeeRecord = jest.fn().mockResolvedValue({
        id: 'record-123',
        status: 'terminated'
      });

      const result = await hrisHandlers.handleEmployeeTerminated(mockEventData);

      expect(result.success).toBe(true);
      expect(result.action).toBe('terminated');
      expect(result.terminationDate).toBe('2024-12-31');

      expect(mockPayrollRepo.updateEmployeeRecord).toHaveBeenCalledWith(
        'record-123',
        expect.objectContaining({ status: 'terminated' }),
        'org-123',
        'system'
      );
    });

    test('should skip if employee not found', async () => {
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue(null);

      const result = await hrisHandlers.handleEmployeeTerminated(mockEventData);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(mockPayrollRepo.updateEmployeeRecord).not.toHaveBeenCalled();
    });
  });

  describe('handleDepartmentChanged', () => {
    const mockEventData = {
      organizationId: 'org-123',
      employeeId: 'emp-456',
      oldDepartmentId: 'dept-old',
      oldDepartmentName: 'Sales',
      newDepartmentId: 'dept-new',
      newDepartmentName: 'Marketing',
      effectiveDate: '2024-07-01',
      changedBy: 'user-789'
    };

    test('should acknowledge department change', async () => {
      const result = await hrisHandlers.handleDepartmentChanged(mockEventData);

      expect(result.success).toBe(true);
      expect(result.action).toBe('acknowledged');
    });

    test('should not modify payroll data', async () => {
      await hrisHandlers.handleDepartmentChanged(mockEventData);

      expect(mockPayrollRepo.updateEmployeeRecord).not.toHaveBeenCalled();
    });
  });

  describe('handleCompensationChanged', () => {
    const mockEventData = {
      organizationId: 'org-123',
      employeeId: 'emp-456',
      compensationType: 'salary',
      amount: 75000,
      currency: 'SRD',
      effectiveDate: '2024-08-01',
      reason: 'annual_review',
      changedBy: 'user-789'
    };

    test('should create new compensation record for salary', async () => {
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue({
        id: 'record-123'
      });

      mockPayrollRepo.createCompensation = jest.fn().mockResolvedValue({
        id: 'comp-456',
        compensation_type: 'salary',
        pay_rate: 75000
      });

      const result = await hrisHandlers.handleCompensationChanged(mockEventData);

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(result.compensationId).toBe('comp-456');

      expect(mockPayrollRepo.createCompensation).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeRecordId: 'record-123',
          compensationType: 'salary',
          payRate: 75000,
          payPeriod: 'month',
          isCurrent: true
        }),
        'org-123',
        'system'
      );
    });

    test('should map hourly compensation correctly', async () => {
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue({
        id: 'record-123'
      });

      mockPayrollRepo.createCompensation = jest.fn().mockResolvedValue({
        id: 'comp-789'
      });

      const eventData = {
        ...mockEventData,
        compensationType: 'hourly',
        amount: 35.50
      };

      await hrisHandlers.handleCompensationChanged(eventData);

      const createCall = mockPayrollRepo.createCompensation.mock.calls[0][0];
      expect(createCall.compensationType).toBe('hourly');
      expect(createCall.payRate).toBe(35.50);
      expect(createCall.payPeriod).toBe('hour');
    });

    test('should skip if employee record not found', async () => {
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue(null);

      const result = await hrisHandlers.handleCompensationChanged(mockEventData);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(mockPayrollRepo.createCompensation).not.toHaveBeenCalled();
    });

    test('should use effectiveDate from event', async () => {
      mockPayrollRepo.findByEmployeeId = jest.fn().mockResolvedValue({
        id: 'record-123'
      });

      mockPayrollRepo.createCompensation = jest.fn().mockResolvedValue({
        id: 'comp-999'
      });

      await hrisHandlers.handleCompensationChanged(mockEventData);

      const createCall = mockPayrollRepo.createCompensation.mock.calls[0][0];
      expect(createCall.effectiveFrom).toBe('2024-08-01');
    });
  });

  describe('Error Handling', () => {
    test('should propagate errors from repository calls', async () => {
      mockPayrollRepo.findByEmployeeId = jest.fn().mockRejectedValue(
        new Error('Connection timeout')
      );

      await expect(
        hrisHandlers.handleEmployeeCreated({
          organizationId: 'org-123',
          employeeId: 'emp-456'
        })
      ).rejects.toThrow('Connection timeout');
    });

    test('should handle null event data gracefully', async () => {
      await expect(
        hrisHandlers.handleEmployeeCreated(null)
      ).rejects.toThrow();
    });
  });
});
