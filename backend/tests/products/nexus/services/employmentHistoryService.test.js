/**
 * EmploymentHistoryService Tests
 * Comprehensive tests for employee lifecycle management service
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

// Use Proxy to handle both function calls query() and property access query.getClient()
const mockDbQuery = new Proxy(jest.fn().mockResolvedValue({ rows: [] }), {
  get(target, prop) {
    if (prop === 'getClient') {
      return jest.fn().mockResolvedValue(mockClient);
    }
    return target[prop];
  },
  apply(target, thisArg, args) {
    return target.apply(thisArg, args);
  }
});

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  query: mockDbQuery
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

const { default: EmploymentHistoryService } = await import('../../../../src/products/nexus/services/employmentHistoryService.js');

describe('EmploymentHistoryService', () => {
  let service;
  const organizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
  const employeeId = 'emp-123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmploymentHistoryService();
  });

  describe('createInitialEmployment', () => {
    it('should create initial employment history record', async () => {
      const employeeData = {
        employeeId,
        hireDate: '2025-01-01',
        employmentStatus: 'active',
        employmentType: 'full-time',
        departmentId: 'dept-123',
        locationId: 'loc-123',
        managerId: 'mgr-123',
        jobTitle: 'Software Engineer'
      };

      const mockResult = {
        id: 'history-123',
        organization_id: organizationId,
        employee_id: employeeId,
        start_date: '2025-01-01',
        is_current: true,
        is_rehire: false,
        employment_status: 'active',
        employment_type: 'full-time',
        job_title: 'Software Engineer'
      };

      mockDbQuery.mockResolvedValue({ rows: [mockResult] });

      const result = await service.createInitialEmployment(employeeData, organizationId, userId);

      expect(result).toEqual(mockResult);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO hris.employment_history'),
        expect.arrayContaining([organizationId, employeeId, '2025-01-01']),
        organizationId,
        expect.objectContaining({ operation: 'createInitialEmployment' })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Initial employment history created',
        expect.objectContaining({ employeeId })
      );
    });

    it('should handle optional fields', async () => {
      const employeeData = {
        employeeId,
        hireDate: '2025-01-01',
        employmentType: 'part-time',
        jobTitle: 'Consultant'
      };

      mockDbQuery.mockResolvedValue({ rows: [{}] });

      await service.createInitialEmployment(employeeData, organizationId, userId);

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([organizationId, employeeId, '2025-01-01', 'active', 'part-time', null, null, null, 'Consultant', userId]),
        organizationId,
        expect.any(Object)
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Insert failed');
      mockDbQuery.mockRejectedValue(dbError);

      const employeeData = {
        employeeId,
        hireDate: '2025-01-01',
        employmentType: 'full-time',
        jobTitle: 'Engineer'
      };

      await expect(
        service.createInitialEmployment(employeeData, organizationId, userId)
      ).rejects.toThrow(dbError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating initial employment',
        expect.objectContaining({ error: dbError.message })
      );
    });
  });

  describe('terminateEmployee', () => {
    it('should terminate employee and update employment history', async () => {
      const terminationData = {
        terminationDate: '2025-12-31',
        terminationReason: 'resignation',
        terminationNotes: 'Moving to another company',
        isRehireEligible: true
      };

      const mockCurrentRecord = {
        id: 'history-123',
        employee_id: employeeId,
        is_current: true
      };

      const mockHistoryResult = {
        id: 'history-123',
        end_date: '2025-12-31',
        is_current: false,
        termination_reason: 'resignation'
      };

      const mockEmployeeResult = {
        id: employeeId,
        employment_status: 'terminated',
        termination_date: '2025-12-31'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCurrentRecord] }) // SELECT current record
        .mockResolvedValueOnce({ rows: [mockHistoryResult] }) // UPDATE history
        .mockResolvedValueOnce({ rows: [mockEmployeeResult] }) // UPDATE employee
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.terminateEmployee(employeeId, terminationData, organizationId, userId);

      expect(result.employee).toEqual(mockEmployeeResult);
      expect(result.employmentHistory).toEqual(mockHistoryResult);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Employee terminated',
        expect.objectContaining({ employeeId })
      );
    });

    it('should throw error if no active employment record found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // No current record

      const terminationData = {
        terminationDate: '2025-12-31',
        terminationReason: 'resignation'
      };

      await expect(
        service.terminateEmployee(employeeId, terminationData, organizationId, userId)
      ).rejects.toThrow('No active employment record found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should default isRehireEligible to true', async () => {
      const terminationData = {
        terminationDate: '2025-12-31',
        terminationReason: 'layoff'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'history-123' }] }) // SELECT
        .mockResolvedValueOnce({ rows: [{}] }) // UPDATE history
        .mockResolvedValueOnce({ rows: [{}] }) // UPDATE employee
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await service.terminateEmployee(employeeId, terminationData, organizationId, userId);

      // Check that the UPDATE history query was called with true for isRehireEligible (4th parameter)
      const historyUpdateCall = mockClient.query.mock.calls.find(call => 
        call[0] && call[0].includes('UPDATE hris.employment_history')
      );
      expect(historyUpdateCall[1][3]).toBe(true); // isRehireEligible parameter
    });

    it('should rollback on error', async () => {
      const dbError = new Error('Update failed');
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'history-123' }] }) // SELECT
        .mockRejectedValueOnce(dbError); // UPDATE fails

      const terminationData = {
        terminationDate: '2025-12-31',
        terminationReason: 'resignation'
      };

      await expect(
        service.terminateEmployee(employeeId, terminationData, organizationId, userId)
      ).rejects.toThrow(dbError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('rehireEmployee', () => {
    it('should rehire eligible employee', async () => {
      const rehireData = {
        rehireDate: '2026-01-01',
        employmentStatus: 'active',
        employmentType: 'full-time',
        departmentId: 'dept-456',
        locationId: 'loc-456',
        managerId: 'mgr-456',
        jobTitle: 'Senior Engineer',
        rehireNotes: 'Great performer, welcomed back'
      };

      const mockEmployee = {
        id: employeeId,
        employment_status: 'terminated',
        is_rehire_eligible: true,
        employment_type: 'full-time',
        department_id: 'dept-123',
        location_id: 'loc-123',
        manager_id: 'mgr-123',
        job_title: 'Engineer'
      };

      const mockUpdatedEmployee = {
        id: employeeId,
        employment_status: 'active',
        hire_date: '2026-01-01',
        termination_date: null
      };

      const mockHistoryResult = {
        id: 'history-456',
        employee_id: employeeId,
        start_date: '2026-01-01',
        is_current: true,
        is_rehire: true
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockEmployee] }) // SELECT check
        .mockResolvedValueOnce({ rows: [mockUpdatedEmployee] }) // UPDATE employee
        .mockResolvedValueOnce({ rows: [mockHistoryResult] }) // INSERT history
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.rehireEmployee(employeeId, rehireData, organizationId, userId);

      expect(result.employee).toEqual(mockUpdatedEmployee);
      expect(result.employmentHistory).toEqual(mockHistoryResult);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Employee rehired',
        expect.objectContaining({ employeeId })
      );
    });

    it('should throw error if employee not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // No employee found

      const rehireData = { rehireDate: '2026-01-01' };

      await expect(
        service.rehireEmployee(employeeId, rehireData, organizationId, userId)
      ).rejects.toThrow('Employee not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error if employee is not terminated', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ employment_status: 'active' }] });

      const rehireData = { rehireDate: '2026-01-01' };

      await expect(
        service.rehireEmployee(employeeId, rehireData, organizationId, userId)
      ).rejects.toThrow('Employee is not terminated');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw error if employee is not eligible for rehire', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{
          employment_status: 'terminated',
          is_rehire_eligible: false
        }] });

      const rehireData = { rehireDate: '2026-01-01' };

      await expect(
        service.rehireEmployee(employeeId, rehireData, organizationId, userId)
      ).rejects.toThrow('Employee is not eligible for rehire');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should use existing employee data for missing fields', async () => {
      const rehireData = {
        rehireDate: '2026-01-01'
      };

      const mockEmployee = {
        id: employeeId,
        employment_status: 'terminated',
        is_rehire_eligible: true,
        employment_type: 'contractor',
        department_id: 'dept-old',
        location_id: 'loc-old',
        manager_id: 'mgr-old',
        job_title: 'Old Title'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockEmployee] }) // SELECT
        .mockResolvedValueOnce({ rows: [{}] }) // UPDATE employee
        .mockResolvedValueOnce({ rows: [{}] }) // INSERT history
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      await service.rehireEmployee(employeeId, rehireData, organizationId, userId);

      // Verify UPDATE employee uses old values when not provided
      const updateCall = mockClient.query.mock.calls.find(call => 
        call[0] && call[0].includes('UPDATE hris.employee')
      );
      expect(updateCall[1]).toEqual(
        expect.arrayContaining(['active', '2026-01-01', 'contractor', 'dept-old', 'loc-old', 'mgr-old', 'Old Title'])
      );
    });

    it('should rollback on error', async () => {
      const dbError = new Error('Insert failed');
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ employment_status: 'terminated', is_rehire_eligible: true }] })
        .mockResolvedValueOnce({ rows: [{}] }) // UPDATE succeeds
        .mockRejectedValueOnce(dbError); // INSERT fails

      const rehireData = { rehireDate: '2026-01-01' };

      await expect(
        service.rehireEmployee(employeeId, rehireData, organizationId, userId)
      ).rejects.toThrow(dbError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getEmploymentHistory', () => {
    it('should get all employment history for employee', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          employee_id: employeeId,
          start_date: '2025-01-01',
          end_date: null,
          is_current: true,
          is_rehire: false
        },
        {
          id: 'history-2',
          employee_id: employeeId,
          start_date: '2020-01-01',
          end_date: '2024-12-31',
          is_current: false,
          is_rehire: false
        }
      ];

      mockDbQuery.mockResolvedValue({ rows: mockHistory });

      const result = await service.getEmploymentHistory(employeeId, organizationId);

      expect(result).toEqual(mockHistory);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY eh.start_date DESC'),
        [employeeId, organizationId],
        organizationId,
        expect.objectContaining({ operation: 'getEmploymentHistory' })
      );
    });

    it('should return empty array if no history', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.getEmploymentHistory(employeeId, organizationId);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query failed');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(
        service.getEmploymentHistory(employeeId, organizationId)
      ).rejects.toThrow(dbError);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getCurrentEmployment', () => {
    it('should get current employment record', async () => {
      const mockCurrent = {
        id: 'history-123',
        employee_id: employeeId,
        is_current: true,
        start_date: '2025-01-01'
      };

      mockDbQuery.mockResolvedValue({ rows: [mockCurrent] });

      const result = await service.getCurrentEmployment(employeeId, organizationId);

      expect(result).toEqual(mockCurrent);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE eh.employee_id = $1'),
        [employeeId, organizationId],
        organizationId,
        expect.any(Object)
      );
    });

    it('should return null if no current employment', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.getCurrentEmployment(employeeId, organizationId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(
        service.getCurrentEmployment(employeeId, organizationId)
      ).rejects.toThrow(dbError);
    });
  });

  describe('checkRehireEligibility', () => {
    it('should return eligible for terminated employee with eligibility', async () => {
      const mockRecord = {
        employment_status: 'terminated',
        is_rehire_eligible: true,
        termination_reason: 'resignation',
        termination_date: '2024-12-31'
      };

      mockDbQuery.mockResolvedValue({ rows: [mockRecord] });

      const result = await service.checkRehireEligibility(employeeId, organizationId);

      expect(result).toEqual({
        eligible: true,
        terminationReason: 'resignation',
        terminationDate: '2024-12-31'
      });
    });

    it('should return not eligible if employee not found', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      const result = await service.checkRehireEligibility(employeeId, organizationId);

      expect(result).toEqual({
        eligible: false,
        reason: 'Employee not found'
      });
    });

    it('should return not eligible if employee is not terminated', async () => {
      mockDbQuery.mockResolvedValue({ rows: [{ employment_status: 'active' }] });

      const result = await service.checkRehireEligibility(employeeId, organizationId);

      expect(result).toEqual({
        eligible: false,
        reason: 'Employee is not terminated'
      });
    });

    it('should return not eligible if is_rehire_eligible is false', async () => {
      const mockRecord = {
        employment_status: 'terminated',
        is_rehire_eligible: false,
        termination_reason: 'misconduct',
        termination_date: '2024-06-30'
      };

      mockDbQuery.mockResolvedValue({ rows: [mockRecord] });

      const result = await service.checkRehireEligibility(employeeId, organizationId);

      expect(result).toEqual({
        eligible: false,
        reason: 'Not eligible for rehire',
        terminationReason: 'misconduct',
        terminationDate: '2024-06-30'
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Query error');
      mockDbQuery.mockRejectedValue(dbError);

      await expect(
        service.checkRehireEligibility(employeeId, organizationId)
      ).rejects.toThrow(dbError);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('constructor', () => {
    it('should initialize with logger', () => {
      const newService = new EmploymentHistoryService();
      expect(newService.logger).toBeDefined();
    });
  });
});
