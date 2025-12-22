/**
 * Unit Tests for WorkerService
 * ScheduleHub Worker Management Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the database pool before importing the service
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
  query: jest.fn()
};

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock the database and logger modules
jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  default: mockPool
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import after mocking
const { default: WorkerService } = await import('../../../../src/products/schedulehub/services/workerService.js');
const { ValidationError } = await import('../../../../src/utils/errors.js');

describe('WorkerService', () => {
  let workerService;
  let organizationId;
  let userId;

  beforeEach(() => {
    workerService = new WorkerService();
    organizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
    userId = 'user-123e4567-e89b-12d3-a456-426614174000';
    
    // Reset all mocks
    jest.clearAllMocks();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createWorker', () => {
    const validWorkerData = {
      employeeId: 'emp-123e4567-e89b-12d3-a456-426614174000',
      workerNumber: 'W001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@company.com',
      phone: '+1234567890',
      employmentType: 'full_time',
      departmentId: 'dept-123e4567-e89b-12d3-a456-426614174000',
      departmentName: 'Engineering',
      locationId: 'loc-123e4567-e89b-12d3-a456-426614174000',
      locationName: 'Main Office',
      maxHoursPerWeek: 40,
      minHoursPerWeek: 0,
      maxConsecutiveDays: 6,
      minRestHoursBetweenShifts: 11,
      hireDate: '2025-01-01'
    };

    const mockEmployeeCheckResult = {
      rows: [{
        id: 'emp-123e4567-e89b-12d3-a456-426614174000',
        employment_status: 'active'
      }]
    };

    const mockExistingConfigResult = { rows: [] };

    const mockCreatedConfig = {
      rows: [{
        id: 'config-123e4567-e89b-12d3-a456-426614174000',
        organization_id: 'org-123e4567-e89b-12d3-a456-426614174000',
        employee_id: 'emp-123e4567-e89b-12d3-a456-426614174000',
        max_hours_per_week: 40,
        min_hours_per_week: 0,
        max_consecutive_days: 6,
        min_rest_hours_between_shifts: 11,
        is_schedulable: true,
        scheduling_status: 'active',
        created_by: 'user-123e4567-e89b-12d3-a456-426614174000',
        updated_by: 'user-123e4567-e89b-12d3-a456-426614174000'
      }]
    };

    const mockWorkerData = {
      id: 'emp-123e4567-e89b-12d3-a456-426614174000',
      worker_number: 'W001',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@company.com',
      phone: '+1234567890',
      employment_type: 'full_time',
      department_id: 'dept-123e4567-e89b-12d3-a456-426614174000',
      department_name: 'Engineering',
      location_id: 'loc-123e4567-e89b-12d3-a456-426614174000',
      location_name: 'Main Office',
      max_hours_per_week: 40,
      min_hours_per_week: 0,
      max_consecutive_days: 6,
      min_rest_hours_between_shifts: 11,
      is_schedulable: true,
      scheduling_status: 'active'
    };

    beforeEach(() => {
      // Mock getWorkerByEmployeeId method
      jest.spyOn(workerService, 'getWorkerByEmployeeId').mockResolvedValue(mockWorkerData);
    });

    it('should create worker scheduling config successfully', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockEmployeeCheckResult) // Employee check
        .mockResolvedValueOnce(mockExistingConfigResult) // Existing config check
        .mockResolvedValueOnce(mockCreatedConfig) // INSERT config
        .mockResolvedValueOnce(undefined); // COMMIT

      // Act
      const result = await workerService.createWorker(validWorkerData, organizationId, userId);

      // Assert
      expect(result).toEqual({
        success: true,
        data: mockWorkerData
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        `SELECT id, employment_status FROM hris.employee 
         WHERE id = $1 AND organization_id = $2`,
        [validWorkerData.employeeId, organizationId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.worker_scheduling_config'),
        expect.arrayContaining([
          organizationId,
          validWorkerData.employeeId,
          40, // maxHoursPerWeek
          0,  // minHoursPerWeek
          6,  // maxConsecutiveDays
          11, // minRestHoursBetweenShifts
          true, // is_schedulable
          'active', // scheduling_status
          userId,
          userId
        ])
      );
      expect(workerService.getWorkerByEmployeeId).toHaveBeenCalledWith(validWorkerData.employeeId, organizationId);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Worker scheduling config created successfully',
        expect.objectContaining({
          configId: mockCreatedConfig.rows[0].id,
          employeeId: validWorkerData.employeeId,
          organizationId
        })
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should validate input data', async () => {
      // Arrange
      const invalidData = {
        employeeId: 'invalid-uuid', // Invalid UUID
        firstName: 'John',
        lastName: 'Doe',
        employmentType: 'full_time'
      };

      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN

      // Act & Assert
      await expect(
        workerService.createWorker(invalidData, organizationId, userId)
      ).rejects.toThrow(ValidationError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if employee does not exist in HRIS', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Employee not found

      // Act & Assert
      await expect(
        workerService.createWorker(validWorkerData, organizationId, userId)
      ).rejects.toThrow('Employee not found in HRIS');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if worker scheduling config already exists', async () => {
      // Arrange
      const existingConfigResult = {
        rows: [{ id: 'existing-config-id' }]
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockEmployeeCheckResult) // Employee check
        .mockResolvedValueOnce(existingConfigResult); // Existing config found

      // Act & Assert
      await expect(
        workerService.createWorker(validWorkerData, organizationId, userId)
      ).rejects.toThrow('Scheduling configuration already exists for this employee');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database transaction rollback on error', async () => {
      // Arrange
      const databaseError = new Error('Database connection failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(databaseError); // Employee check fails

      // Act & Assert
      await expect(
        workerService.createWorker(validWorkerData, organizationId, userId)
      ).rejects.toThrow('Database connection failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockLogger.error).toHaveBeenCalledWith('Error creating worker:', databaseError);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should use default values for optional scheduling parameters', async () => {
      // Arrange
      const minimalData = {
        employeeId: 'emp-123e4567-e89b-12d3-a456-426614174000',
        workerNumber: 'W001',
        firstName: 'John',
        lastName: 'Doe',
        employmentType: 'full_time'
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockEmployeeCheckResult) // Employee check
        .mockResolvedValueOnce(mockExistingConfigResult) // Existing config check
        .mockResolvedValueOnce(mockCreatedConfig) // INSERT config
        .mockResolvedValueOnce(undefined); // COMMIT

      // Act
      await workerService.createWorker(minimalData, organizationId, userId);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.worker_scheduling_config'),
        expect.arrayContaining([
          organizationId,
          minimalData.employeeId,
          40, // default maxHoursPerWeek
          0,  // default minHoursPerWeek
          6,  // default maxConsecutiveDays
          11, // default minRestHoursBetweenShifts
          true, // is_schedulable
          'active', // scheduling_status
          userId,
          userId
        ])
      );
    });
  });

  describe('getWorkerById', () => {
    const workerId = 'worker-123e4567-e89b-12d3-a456-426614174000';

    const mockWorkerResult = {
      rows: [{
        id: 'worker-123e4567-e89b-12d3-a456-426614174000',
        worker_number: 'W001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@company.com',
        phone: '+1234567890',
        employment_type: 'full_time',
        department_id: 'dept-123e4567-e89b-12d3-a456-426614174000',
        department_name: 'Engineering',
        location_id: 'loc-123e4567-e89b-12d3-a456-426614174000',
        location_name: 'Main Office',
        max_hours_per_week: 40,
        min_hours_per_week: 0,
        max_consecutive_days: 6,
        min_rest_hours_between_shifts: 11,
        is_schedulable: true,
        scheduling_status: 'active'
      }]
    };

    it('should retrieve worker by ID successfully', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce(mockWorkerResult);

      // Act
      const result = await workerService.getWorkerById(workerId, organizationId);

      // Assert
      expect(result).toEqual({
        success: true,
        data: mockWorkerResult.rows[0]
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([workerId, organizationId])
      );
    });

    it('should return null if worker not found', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await workerService.getWorkerById(workerId, organizationId);

      // Assert
      expect(result).toEqual({
        success: true,
        data: null
      });
    });

    it('should handle database errors', async () => {
      // Arrange
      const databaseError = new Error('Database query failed');
      mockPool.query.mockRejectedValueOnce(databaseError);

      // Act & Assert
      await expect(
        workerService.getWorkerById(workerId, organizationId)
      ).rejects.toThrow('Database query failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching worker by ID:', databaseError);
    });
  });

  describe('getWorkerByEmployeeId', () => {
    const employeeId = 'emp-123e4567-e89b-12d3-a456-426614174000';

    const mockWorkerResult = {
      rows: [{
        id: 'emp-123e4567-e89b-12d3-a456-426614174000',
        worker_number: 'W001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@company.com'
      }]
    };

    it('should retrieve worker by employee ID successfully', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce(mockWorkerResult);

      // Act
      const result = await workerService.getWorkerByEmployeeId(employeeId, organizationId);

      // Assert
      expect(result).toEqual(mockWorkerResult.rows[0]);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([employeeId, organizationId])
      );
    });

    it('should return null if worker not found', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await workerService.getWorkerByEmployeeId(employeeId, organizationId);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      const databaseError = new Error('Database query failed');
      mockPool.query.mockRejectedValueOnce(databaseError);

      // Act & Assert
      await expect(
        workerService.getWorkerByEmployeeId(employeeId, organizationId)
      ).rejects.toThrow('Database query failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching worker by employee ID:', databaseError);
    });
  });

  describe('listWorkers', () => {
    const mockWorkersResult = {
      rows: [
        {
          id: 'worker1-123e4567-e89b-12d3-a456-426614174000',
          worker_number: 'W001',
          first_name: 'John',
          last_name: 'Doe',
          employment_type: 'full_time',
          scheduling_status: 'active'
        },
        {
          id: 'worker2-123e4567-e89b-12d3-a456-426614174000',
          worker_number: 'W002',
          first_name: 'Jane',
          last_name: 'Smith',
          employment_type: 'part_time',
          scheduling_status: 'active'
        }
      ]
    };

    it('should list workers successfully with default filters', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce(mockWorkersResult);

      // Act
      const result = await workerService.listWorkers(organizationId);

      // Assert
      expect(result).toEqual({
        success: true,
        data: mockWorkersResult.rows
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([organizationId])
      );
    });

    it('should apply status filter', async () => {
      // Arrange
      const filters = { status: 'active' };
      mockPool.query.mockResolvedValueOnce(mockWorkersResult);

      // Act
      const result = await workerService.listWorkers(organizationId, filters);

      // Assert
      expect(result).toEqual({
        success: true,
        data: mockWorkersResult.rows
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('scheduling_status = $2'),
        expect.arrayContaining([organizationId, 'active'])
      );
    });

    it('should apply department filter', async () => {
      // Arrange
      const filters = { departmentId: 'dept-123e4567-e89b-12d3-a456-426614174000' };
      mockPool.query.mockResolvedValueOnce(mockWorkersResult);

      // Act
      const result = await workerService.listWorkers(organizationId, filters);

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('department_id = $2'),
        expect.arrayContaining([organizationId, filters.departmentId])
      );
    });

    it('should apply employment type filter', async () => {
      // Arrange
      const filters = { employmentType: 'full_time' };
      mockPool.query.mockResolvedValueOnce(mockWorkersResult);

      // Act
      await workerService.listWorkers(organizationId, filters);

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('employment_type = $2'),
        expect.arrayContaining([organizationId, 'full_time'])
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      const databaseError = new Error('Database query failed');
      mockPool.query.mockRejectedValueOnce(databaseError);

      // Act & Assert
      await expect(
        workerService.listWorkers(organizationId)
      ).rejects.toThrow('Database query failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching workers:', databaseError);
    });
  });

  describe('updateWorker', () => {
    const workerId = 'worker-123e4567-e89b-12d3-a456-426614174000';
    const updateData = {
      firstName: 'John Updated',
      lastName: 'Doe Updated',
      maxHoursPerWeek: 35,
      status: 'active'
    };

    const mockUpdatedResult = {
      rows: [{
        id: workerId,
        first_name: 'John Updated',
        last_name: 'Doe Updated',
        max_hours_per_week: 35,
        scheduling_status: 'active'
      }]
    };

    beforeEach(() => {
      jest.spyOn(workerService, 'getWorkerById').mockResolvedValue({
        success: true,
        data: { id: workerId, first_name: 'John', last_name: 'Doe' }
      });
    });

    it('should update worker successfully', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockUpdatedResult) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      // Act
      const result = await workerService.updateWorker(workerId, updateData, organizationId, userId);

      // Assert
      expect(result).toEqual({
        success: true,
        data: mockUpdatedResult.rows[0]
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining([workerId, organizationId])
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Worker updated successfully',
        expect.objectContaining({
          workerId,
          organizationId,
          userId
        })
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should validate update data', async () => {
      // Arrange
      const invalidData = {
        maxHoursPerWeek: -5 // Invalid negative value
      };

      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN

      // Act & Assert
      await expect(
        workerService.updateWorker(workerId, invalidData, organizationId, userId)
      ).rejects.toThrow(ValidationError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if worker not found', async () => {
      // Arrange
      jest.spyOn(workerService, 'getWorkerById').mockResolvedValue({
        success: true,
        data: null
      });

      // Act & Assert
      await expect(
        workerService.updateWorker(workerId, updateData, organizationId, userId)
      ).rejects.toThrow('Worker not found');
    });

    it('should handle database transaction rollback on error', async () => {
      // Arrange
      const databaseError = new Error('Database update failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(databaseError); // UPDATE fails

      // Act & Assert
      await expect(
        workerService.updateWorker(workerId, updateData, organizationId, userId)
      ).rejects.toThrow('Database update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockLogger.error).toHaveBeenCalledWith('Error updating worker:', databaseError);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('terminateWorker', () => {
    const workerId = 'worker-123e4567-e89b-12d3-a456-426614174000';
    const terminationDate = '2025-12-31';

    beforeEach(() => {
      jest.spyOn(workerService, 'getWorkerById').mockResolvedValue({
        success: true,
        data: { id: workerId, scheduling_status: 'active' }
      });
    });

    it('should terminate worker successfully', async () => {
      // Arrange
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: workerId }] }) // UPDATE worker
        .mockResolvedValueOnce(undefined); // COMMIT

      // Act
      const result = await workerService.terminateWorker(workerId, organizationId, terminationDate, userId);

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Worker terminated successfully'
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining([userId, workerId, organizationId])
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Worker terminated successfully',
        expect.objectContaining({
          workerId,
          terminationDate,
          organizationId
        })
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if worker not found', async () => {
      // Arrange
      jest.spyOn(workerService, 'getWorkerById').mockResolvedValue({
        success: true,
        data: null
      });

      // Act & Assert
      await expect(
        workerService.terminateWorker(workerId, organizationId, terminationDate, userId)
      ).rejects.toThrow('Worker not found');
    });

    it('should handle database transaction rollback on error', async () => {
      // Arrange
      const databaseError = new Error('Database update failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(databaseError); // UPDATE fails

      // Act & Assert
      await expect(
        workerService.terminateWorker(workerId, organizationId, terminationDate, userId)
      ).rejects.toThrow('Database update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockLogger.error).toHaveBeenCalledWith('Error terminating worker:', databaseError);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getWorkerAvailabilitySummary', () => {
    const workerId = 'worker-123e4567-e89b-12d3-a456-426614174000';
    const startDate = '2025-01-01';
    const endDate = '2025-01-07';

    const mockAvailabilityResult = {
      rows: [{
        total_available_hours: 40,
        scheduled_hours: 32,
        remaining_hours: 8,
        availability_percentage: 80
      }]
    };

    it('should get worker availability summary successfully', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce(mockAvailabilityResult);

      // Act
      const result = await workerService.getWorkerAvailabilitySummary(workerId, organizationId, startDate, endDate);

      // Assert
      expect(result).toEqual({
        success: true,
        data: mockAvailabilityResult.rows[0]
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([workerId, organizationId, startDate, endDate])
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      const databaseError = new Error('Database query failed');
      mockPool.query.mockRejectedValueOnce(databaseError);

      // Act & Assert
      await expect(
        workerService.getWorkerAvailabilitySummary(workerId, organizationId, startDate, endDate)
      ).rejects.toThrow('Database query failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching worker availability summary:',
        databaseError
      );
    });
  });

  describe('getWorkerShiftHistory', () => {
    const workerId = 'worker-123e4567-e89b-12d3-a456-426614174000';

    const mockShiftHistoryResult = {
      rows: [
        {
          shift_id: 'shift-123e4567-e89b-12d3-a456-426614174000',
          shift_date: '2025-01-01',
          start_time: '09:00:00',
          end_time: '17:00:00',
          station_name: 'Front Desk',
          role_name: 'Receptionist',
          hours_worked: 8
        }
      ]
    };

    it('should get worker shift history successfully', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce(mockShiftHistoryResult);

      // Act
      const result = await workerService.getWorkerShiftHistory(workerId, organizationId);

      // Assert
      expect(result).toEqual({
        success: true,
        data: mockShiftHistoryResult.rows
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([workerId, organizationId])
      );
    });

    it('should apply date range filter', async () => {
      // Arrange
      const filters = {
        startDate: '2025-01-01',
        endDate: '2025-01-07'
      };
      mockPool.query.mockResolvedValueOnce(mockShiftHistoryResult);

      // Act
      await workerService.getWorkerShiftHistory(workerId, organizationId, filters);

      // Assert
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('shift_date >= $3 AND shift_date <= $4'),
        expect.arrayContaining([workerId, organizationId, filters.startDate, filters.endDate])
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      const databaseError = new Error('Database query failed');
      mockPool.query.mockRejectedValueOnce(databaseError);

      // Act & Assert
      await expect(
        workerService.getWorkerShiftHistory(workerId, organizationId)
      ).rejects.toThrow('Database query failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching worker shift history:', databaseError);
    });
  });
});