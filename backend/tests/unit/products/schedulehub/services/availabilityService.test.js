/**
 * AvailabilityService Unit Tests
 * 
 * Tests for ScheduleHub worker availability management service
 * 
 * @group unit
 * @group schedulehub
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock database pool before importing service
const mockClient = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  release: jest.fn().mockResolvedValue(undefined)
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
  query: jest.fn().mockResolvedValue({ rows: [] })
};

jest.unstable_mockModule('../../../../../src/config/database.js', () => ({
  default: mockPool
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.unstable_mockModule('../../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Mock DTO mappers
const mockMapAvailabilityDbToApi = jest.fn();
const mockMapAvailabilitiesDbToApi = jest.fn();

jest.unstable_mockModule('../../../../../src/products/schedulehub/dto/availabilityDto.js', () => ({
  mapAvailabilityDbToApi: mockMapAvailabilityDbToApi,
  mapAvailabilitiesDbToApi: mockMapAvailabilitiesDbToApi
}));

// Import service after mocking
const { default: AvailabilityService } = await import('../../../../../src/products/schedulehub/services/availabilityService.js');

describe('AvailabilityService', () => {
  let service;
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testWorkerId = '323e4567-e89b-12d3-a456-426614174002';
  const testAvailabilityId = '423e4567-e89b-12d3-a456-426614174003';

  // Test data helpers
  const createValidAvailabilityData = (overrides = {}) => ({
    workerId: testWorkerId,
    availabilityType: 'recurring',
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '17:00',
    priority: 'preferred',
    ...overrides
  });

  const createDbAvailability = (overrides = {}) => ({
    id: testAvailabilityId,
    employee_id: testWorkerId, // Maps to workerId in API via DTO
    organization_id: testOrganizationId,
    availability_type: 'recurring',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    priority: 'preferred',
    created_by: testUserId,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  });

  // Mock repository for newer service methods
  const mockRepository = {
    getEmployeeAvailabilityForDate: jest.fn(),
    checkShiftConflicts: jest.fn(),
    findAvailabilityGaps: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AvailabilityService(mockPool);
    
    // Ensure mockPool.connect returns mockClient
    mockPool.connect.mockResolvedValue(mockClient);
    
    // Default successful transaction mocking
    mockClient.query.mockImplementation((query) => {
      if (query.includes('BEGIN')) return Promise.resolve();
      if (query.includes('COMMIT')) return Promise.resolve();
      if (query.includes('ROLLBACK')) return Promise.resolve();
      return Promise.resolve({ rows: [createDbAvailability()], rowCount: 1 });
    });

    mockMapAvailabilityDbToApi.mockImplementation(data => ({ ...data, mapped: true }));
    mockMapAvailabilitiesDbToApi.mockImplementation(data => data.map(item => ({ ...item, mapped: true })));
  });

  describe('createAvailability', () => {
    it('should create recurring availability successfully', async () => {
      const availabilityData = createValidAvailabilityData();
      const dbResult = createDbAvailability();
      
      mockClient.query.mockImplementation((query) => {
        if (query.includes('BEGIN')) return Promise.resolve();
        if (query.includes('SELECT id FROM hris.employee')) return Promise.resolve({ rows: [{ id: testWorkerId }] });
        if (query.includes('INSERT INTO scheduling.worker_availability')) return Promise.resolve({ rows: [dbResult] });
        if (query.includes('COMMIT')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      const result = await service.createAvailability(availabilityData, testOrganizationId, testUserId);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockMapAvailabilityDbToApi).toHaveBeenCalledWith(dbResult);
      expect(mockClient.release).toHaveBeenCalled();
      expect(result.mapped).toBe(true);
    });

    it('should create one-time availability successfully', async () => {
      const availabilityData = createValidAvailabilityData({
        availabilityType: 'one_time',
        specificDate: new Date('2025-01-15'),
        dayOfWeek: undefined
      });

      const result = await service.createAvailability(availabilityData, testOrganizationId, testUserId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result.mapped).toBe(true);
    });

    it('should create unavailable period successfully', async () => {
      const availabilityData = createValidAvailabilityData({
        availabilityType: 'unavailable',
        specificDate: new Date('2025-01-15'),
        priority: 'unavailable',
        reason: 'Personal time off',
        dayOfWeek: undefined
      });

      const result = await service.createAvailability(availabilityData, testOrganizationId, testUserId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result.mapped).toBe(true);
    });

    it('should validate required fields', async () => {
      const invalidData = { workerId: 'invalid-uuid' };

      await expect(
        service.createAvailability(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow();

      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should validate time format', async () => {
      const invalidData = createValidAvailabilityData({
        startTime: '25:00', // Invalid time
        endTime: '17:00'
      });

      await expect(
        service.createAvailability(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow();
    });

    it('should validate recurring availability requires dayOfWeek', async () => {
      const invalidData = createValidAvailabilityData({
        availabilityType: 'recurring',
        dayOfWeek: undefined
      });

      await expect(
        service.createAvailability(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow();
    });

    it('should validate one-time availability requires specificDate', async () => {
      const invalidData = createValidAvailabilityData({
        availabilityType: 'one_time',
        dayOfWeek: undefined,
        specificDate: undefined
      });

      await expect(
        service.createAvailability(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow();
    });

    it('should handle database transaction rollback on error', async () => {
      const availabilityData = createValidAvailabilityData();
      
      mockClient.query.mockImplementation((query) => {
        if (query.includes('BEGIN')) return Promise.resolve();
        if (query.includes('SELECT id FROM hris.employee')) return Promise.resolve({ rows: [{ id: 'worker-123' }] });
        if (query.includes('INSERT')) throw new Error('Database error');
        if (query.includes('ROLLBACK')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      await expect(
        service.createAvailability(availabilityData, testOrganizationId, testUserId)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('listAvailability', () => {
    it('should list all availabilities with default pagination', async () => {
      const dbAvailabilities = [
        createDbAvailability({ id: 'av1' }),
        createDbAvailability({ id: 'av2' })
      ];

      mockPool.query.mockResolvedValueOnce({ rows: [{ total_count: '2' }] });
      mockPool.query.mockResolvedValueOnce({ rows: dbAvailabilities });

      const result = await service.listAvailability(testOrganizationId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*)'),
        [testOrganizationId]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [testOrganizationId, 20, 0]
      );
      expect(mockMapAvailabilitiesDbToApi).toHaveBeenCalledWith(dbAvailabilities);
      expect(result.availabilities).toBeDefined();
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should apply worker filter', async () => {
      const filters = { workerId: testWorkerId };
      
      mockPool.query.mockResolvedValueOnce({ rows: [{ total_count: '1' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [createDbAvailability()] });

      await service.listAvailability(testOrganizationId, filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('employee_id = $2'),
        [testOrganizationId, testWorkerId]
      );
    });

    it('should apply availability type filter', async () => {
      const filters = { availabilityType: 'recurring' };
      
      mockPool.query.mockResolvedValueOnce({ rows: [{ total_count: '1' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [createDbAvailability()] });

      await service.listAvailability(testOrganizationId, filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('availability_type = $2'),
        [testOrganizationId, 'recurring']
      );
    });

    it('should apply pagination correctly', async () => {
      const filters = { page: 2, limit: 10 };
      
      mockPool.query.mockResolvedValueOnce({ rows: [{ total_count: '25' }] });
      mockPool.query.mockResolvedValueOnce({ rows: [createDbAvailability()] });

      const result = await service.listAvailability(testOrganizationId, filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [testOrganizationId, 10, 10] // limit 10, offset 10 (page 2)
      );
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(
        service.listAvailability(testOrganizationId)
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getWorkerAvailability', () => {
    it('should get worker availability for specific date range', async () => {
      const filters = {
        fromDate: new Date('2025-01-01'),
        toDate: new Date('2025-01-31')
      };
      const dbAvailabilities = [createDbAvailability()];

      mockPool.query.mockResolvedValue({ rows: dbAvailabilities });

      const result = await service.getWorkerAvailability(testWorkerId, testOrganizationId, filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('employee_id = $1'),
        expect.arrayContaining([testWorkerId, testOrganizationId])
      );
      expect(mockMapAvailabilitiesDbToApi).toHaveBeenCalledWith(dbAvailabilities);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by day of week', async () => {
      const filters = { dayOfWeek: 1 }; // Monday
      
      mockPool.query.mockResolvedValue({ rows: [createDbAvailability()] });

      await service.getWorkerAvailability(testWorkerId, testOrganizationId, filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('day_of_week = $3'),
        expect.arrayContaining([testWorkerId, testOrganizationId, 1])
      );
    });

    it('should handle empty results', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.getWorkerAvailability(testWorkerId, testOrganizationId);

      expect(mockMapAvailabilitiesDbToApi).toHaveBeenCalledWith([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('updateAvailability', () => {
    it('should update availability successfully', async () => {
      const updateData = {
        startTime: '10:00',
        endTime: '18:00',
        priority: 'required'
      };
      const updatedAvailability = createDbAvailability(updateData);

      mockClient.query.mockImplementation((query) => {
        if (query.includes('BEGIN')) return Promise.resolve();
        if (query.includes('SELECT')) return Promise.resolve({ rows: [createDbAvailability()] }); // Return availability exists
        if (query.includes('UPDATE')) return Promise.resolve({ rows: [updatedAvailability], rowCount: 1 });
        if (query.includes('COMMIT')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      const result = await service.updateAvailability(testAvailabilityId, updateData, testOrganizationId, testUserId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockMapAvailabilityDbToApi).toHaveBeenCalledWith(updatedAvailability);
      expect(result.mapped).toBe(true);
    });

    it('should validate update data', async () => {
      const invalidData = { startTime: '25:00' }; // Invalid time

      await expect(
        service.updateAvailability(testAvailabilityId, invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow();

      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should handle availability not found', async () => {
      const updateData = { startTime: '10:00' };

      mockClient.query.mockImplementation((query) => {
        if (query.includes('BEGIN')) return Promise.resolve();
        if (query.includes('UPDATE')) return Promise.resolve({ rows: [], rowCount: 0 });
        if (query.includes('ROLLBACK')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      await expect(
        service.updateAvailability(testAvailabilityId, updateData, testOrganizationId, testUserId)
      ).rejects.toThrow('Availability record not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle transaction rollback on error', async () => {
      const updateData = { startTime: '10:00' };

      mockClient.query.mockImplementation((query) => {
        if (query.includes('BEGIN')) return Promise.resolve();
        if (query.includes('SELECT') && query.includes('scheduling.worker_availability')) {
          return Promise.resolve({ rows: [createDbAvailability()] });
        }
        if (query.includes('UPDATE')) throw new Error('Database error');
        if (query.includes('ROLLBACK')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      await expect(
        service.updateAvailability(testAvailabilityId, updateData, testOrganizationId, testUserId)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deleteAvailability', () => {
    it('should soft delete availability successfully', async () => {
      mockClient.query.mockImplementation((query) => {
        if (query.includes('BEGIN')) return Promise.resolve();
        if (query.includes('DELETE')) return Promise.resolve({ rows: [createDbAvailability()], rowCount: 1 });
        if (query.includes('COMMIT')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      const result = await service.deleteAvailability(testAvailabilityId, testOrganizationId, testUserId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM scheduling.worker_availability'),
        expect.arrayContaining([testAvailabilityId, testOrganizationId])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result.mapped).toBe(true);
    });

    it('should handle availability not found', async () => {
      mockClient.query.mockImplementation((query) => {
        if (query.includes('BEGIN')) return Promise.resolve();
        if (query.includes('DELETE')) return Promise.resolve({ rows: [], rowCount: 0 });
        if (query.includes('ROLLBACK')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      await expect(
        service.deleteAvailability(testAvailabilityId, testOrganizationId, testUserId)
      ).rejects.toThrow('Availability record not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('createDefaultAvailability', () => {
    it('should create default availability for all weekdays', async () => {
      mockClient.query.mockImplementation((query) => {
        if (query.includes('BEGIN')) return Promise.resolve();
        if (query.includes('INSERT')) return Promise.resolve({ rows: [createDbAvailability()], rowCount: 1 });
        if (query.includes('COMMIT')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      const result = await service.createDefaultAvailability(testWorkerId, testOrganizationId, testUserId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(5); // Monday to Friday
      expect(result.data.every(av => av.mapped === true)).toBe(true);
    });

    it('should handle database errors during batch creation', async () => {
      mockClient.query.mockImplementation((query) => {
        if (query.includes('BEGIN')) return Promise.resolve();
        if (query.includes('INSERT')) throw new Error('Database error');
        if (query.includes('ROLLBACK')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      await expect(
        service.createDefaultAvailability(testWorkerId, testOrganizationId, testUserId)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('checkWorkerAvailable', () => {
    it('should return true when worker is available', async () => {
      const date = new Date('2025-01-13'); // Monday
      const startTime = '10:00';
      const endTime = '16:00';

      // Mock recurring availability query result (service checks multiple queries)
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // unavailableCheck
        .mockResolvedValueOnce({ rows: [] }) // oneTimeCheck
        .mockResolvedValueOnce({ rows: [{ id: 'avail-1', priority: 'preferred' }] }); // recurringCheck

      const result = await service.checkWorkerAvailable(
        testWorkerId, 
        testOrganizationId, 
        date, 
        startTime, 
        endTime
      );

      expect(result.success).toBe(true);
      expect(result.available).toBe(true);
      expect(result.priority).toBe('preferred');
      expect(result.type).toBe('recurring');
      // Service makes multiple queries - check that queries were called
      expect(mockPool.query).toHaveBeenCalledTimes(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('worker_availability'),
        expect.arrayContaining([testWorkerId, testOrganizationId])
      );
    });

    it('should return false when worker has conflicts', async () => {
      const date = new Date('2025-01-13'); // Monday
      const startTime = '10:00';
      const endTime = '16:00';

      // Mock unavailable worker (has unavailability record)
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ id: 'unavail-1' }] 
      });

      const result = await service.checkWorkerAvailable(
        testWorkerId, 
        testOrganizationId, 
        date, 
        startTime, 
        endTime
      );

      expect(result.success).toBe(true);
      expect(result.available).toBe(false);
      expect(result.reason).toBe('Worker marked as unavailable for this time');
    });

    it('should handle invalid date input', async () => {
      await expect(
        service.checkWorkerAvailable(testWorkerId, testOrganizationId, 'invalid-date', '10:00', '16:00')
      ).rejects.toThrow();
    });
  });

  describe('getAvailableWorkers', () => {
    it('should return available workers for time period', async () => {
      const date = new Date('2025-01-13'); // Monday
      const startTime = '09:00';
      const endTime = '17:00';
      
      const availableWorkers = [
        {
          id: testWorkerId,
          worker_number: 'EMP001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          employment_type: 'full-time',
          status: 'active',
          priority: 'preferred',
          availability_type: 'recurring'
        }
      ];

      mockPool.query.mockResolvedValue({ rows: availableWorkers });

      const result = await service.getAvailableWorkers(
        testOrganizationId, 
        date, 
        startTime, 
        endTime
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data[0].id).toBe(testWorkerId);
      expect(result.data[0].worker_number).toBe('EMP001');
      expect(result.data[0].first_name).toBe('John');
      expect(result.data[0].last_name).toBe('Doe');
      expect(result.data[0].priority).toBe('preferred');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT'),
        expect.arrayContaining([testOrganizationId])
      );
    });

    it('should filter by role when specified', async () => {
      const date = new Date('2025-01-13');
      const startTime = '09:00';
      const endTime = '17:00';
      const roleId = '523e4567-e89b-12d3-a456-426614174004';

      mockPool.query.mockResolvedValue({ rows: [] });

      await service.getAvailableWorkers(
        testOrganizationId, 
        date, 
        startTime, 
        endTime, 
        roleId
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('wr.role_id = $6'),
        expect.arrayContaining([testOrganizationId, expect.any(String), startTime, endTime, roleId])
      );
    });

    it('should return empty array when no workers available', async () => {
      const date = new Date('2025-01-13');
      const startTime = '09:00';
      const endTime = '17:00';

      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.getAvailableWorkers(
        testOrganizationId, 
        date, 
        startTime, 
        endTime
      );

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
    });

    it('should handle database errors', async () => {
      const date = new Date('2025-01-13');
      
      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getAvailableWorkers(testOrganizationId, date, '09:00', '17:00')
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('error handling and logging', () => {
    it('should log info messages for successful operations', async () => {
      const availabilityData = createValidAvailabilityData();

      await service.createAvailability(availabilityData, testOrganizationId, testUserId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Availability created successfully',
        expect.objectContaining({
          workerId: testWorkerId,
          organizationId: testOrganizationId,
          availabilityId: expect.any(String)
        })
      );
    });

    it('should log errors for database failures', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection failed'));

      await expect(
        service.listAvailability(testOrganizationId)
      ).rejects.toThrow('Connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error listing availability:',
        expect.any(Error)
      );
    });
  });

  // COMMENTED OUT: Method getEmployeeAvailabilityStatus does not exist in actual AvailabilityService
  // describe('getEmployeeAvailabilityStatus', () => {
  //   it('should get employee availability status for specific date', async () => {
  //     // Arrange
  //     const employeeId = '456e4567-e89b-12d3-a456-426614174002';
  //     const checkDate = new Date('2025-01-15');
  //     const availabilityStatus = {
  //       employee_id: employeeId,
  //       date: checkDate,
  //       is_available: true,
  //       availability_type: 'available',
  //       working_hours: {
  //         start: '09:00:00',
  //         end: '17:00:00'
  //       },
  //       conflicts: []
  //     };
  //     mockRepository.getEmployeeAvailabilityForDate.mockResolvedValue(availabilityStatus);

  //     // Act
  //     const result = await service.getEmployeeAvailabilityStatus(
  //       employeeId,
  //       checkDate,
  //       testOrganizationId
  //     );

  //     // Assert
  //     expect(result).toEqual(availabilityStatus);
  //     expect(mockRepository.getEmployeeAvailabilityForDate).toHaveBeenCalledWith(
  //       employeeId,
  //       checkDate,
  //       testOrganizationId
  //     );
  //   });

  //   it('should handle unavailable status with conflicts', async () => {
  //     // Arrange
  //     const employeeId = '456e4567-e89b-12d3-a456-426614174002';
  //     const checkDate = new Date('2025-01-15');
  //     const unavailableStatus = {
  //       employee_id: employeeId,
  //       date: checkDate,
  //       is_available: false,
  //       availability_type: 'unavailable',
  //       reason: 'time_off_request',
  //       conflicts: ['Approved time-off request']
  //     };
  //     mockRepository.getEmployeeAvailabilityForDate.mockResolvedValue(unavailableStatus);

  //     // Act
  //     const result = await service.getEmployeeAvailabilityStatus(
  //       employeeId,
  //       checkDate,
  //       testOrganizationId
  //     );

  //     // Assert
  //     expect(result.is_available).toBe(false);
  //     expect(result.reason).toBe('time_off_request');
  //     expect(result.conflicts).toContain('Approved time-off request');
  //   });
  // });

  // COMMENTED OUT: Method getShiftConflicts does not exist in actual AvailabilityService
  // describe('getShiftConflicts', () => {
  //   it('should identify scheduling conflicts', async () => {
  //     // Arrange
  //     const employeeId = '456e4567-e89b-12d3-a456-426614174002';
  //     const proposedShift = {
  //       start_time: new Date('2025-01-15T14:00:00Z'),
  //       end_time: new Date('2025-01-15T22:00:00Z'),
  //       station_id: '321e4567-e89b-12d3-a456-426614174001'
  //     };
  //     const conflicts = [
  //       {
  //         type: 'availability_conflict',
  //         message: 'Employee not available during requested hours',
  //         details: {
  //           available_until: '13:00:00',
  //           conflict_period: '14:00:00-17:00:00'
  //         }
  //       },
  //       {
  //         type: 'overlapping_shift',
  //         message: 'Employee already scheduled for overlapping shift',
  //         details: {
  //           existing_shift_id: '111e4567-e89b-12d3-a456-426614174004',
  //           overlap_period: '14:00:00-18:00:00'
  //         }
  //       }
  //     ];
  //     mockRepository.checkShiftConflicts.mockResolvedValue(conflicts);

  //     // Act
  //     const result = await service.getShiftConflicts(
  //       employeeId,
  //       proposedShift,
  //       testOrganizationId
  //     );

  //     // Assert
  //     expect(result).toEqual(conflicts);
  //     expect(result).toHaveLength(2);
  //     expect(result[0].type).toBe('availability_conflict');
  //     expect(result[1].type).toBe('overlapping_shift');
  //     expect(mockRepository.checkShiftConflicts).toHaveBeenCalledWith(
  //       employeeId,
  //       proposedShift,
  //       testOrganizationId
  //     );
  //   });

  //   it('should return empty array when no conflicts exist', async () => {
  //     // Arrange
  //     const employeeId = '456e4567-e89b-12d3-a456-426614174002';
  //     const proposedShift = {
  //       start_time: new Date('2025-01-15T09:00:00Z'),
  //       end_time: new Date('2025-01-15T17:00:00Z'),
  //       station_id: '321e4567-e89b-12d3-a456-426614174001'
  //     };
  //     mockRepository.checkShiftConflicts.mockResolvedValue([]);

  //     // Act
  //     const result = await service.getShiftConflicts(
  //       employeeId,
  //       proposedShift,
  //       testOrganizationId
  //     );

  //     // Assert
  //     expect(result).toEqual([]);
  //     expect(result).toHaveLength(0);
  //   });
  // });

  // COMMENTED OUT: Method getAvailabilityGaps does not exist in actual AvailabilityService
  // describe('getAvailabilityGaps', () => {
  //   it('should identify availability gaps in schedule', async () => {
  //     // Arrange
  //     const employeeId = '456e4567-e89b-12d3-a456-426614174002';
  //     const dateRange = {
  //       start_date: new Date('2025-01-15'),
  //       end_date: new Date('2025-01-21')
  //     };
  //     const gaps = [
  //       {
  //         date: '2025-01-16',
  //         gap_type: 'no_availability',
  //         period: 'full_day',
  //         impact: 'high',
  //         suggested_action: 'Add availability rule or request coverage'
  //       },
  //       {
  //         date: '2025-01-18',
  //         gap_type: 'partial_coverage',
  //         period: '18:00:00-22:00:00',
  //         impact: 'medium',
  //         suggested_action: 'Extend availability hours or find backup'
  //       }
  //     ];
  //     mockRepository.findAvailabilityGaps.mockResolvedValue(gaps);

  //     // Act
  //     const result = await service.getAvailabilityGaps(
  //       employeeId,
  //       dateRange,
  //       testOrganizationId
  //     );

  //     // Assert
  //     expect(result).toEqual(gaps);
  //     expect(result).toHaveLength(2);
  //     expect(result[0].gap_type).toBe('no_availability');
  //     expect(result[1].gap_type).toBe('partial_coverage');
  //     expect(mockRepository.findAvailabilityGaps).toHaveBeenCalledWith(
  //       employeeId,
  //       dateRange,
  //       testOrganizationId
  //     );
  //   });

  //   it('should return empty array when no gaps found', async () => {
  //     // Arrange
  //     const employeeId = '456e4567-e89b-12d3-a456-426614174002';
  //     const dateRange = {
  //       start_date: new Date('2025-01-15'),
  //       end_date: new Date('2025-01-21')
  //     };
  //     mockRepository.findAvailabilityGaps.mockResolvedValue([]);

  //     // Act
  //     const result = await service.getAvailabilityGaps(
  //       employeeId,
  //       dateRange,
  //       testOrganizationId
  //     );

  //     // Assert
  //     expect(result).toEqual([]);
  //     expect(result).toHaveLength(0);
  //   });
  // });

  // COMMENTED OUT: Method updateAvailabilityStatus does not exist in actual AvailabilityService
  // describe('updateAvailabilityStatus', () => {
  //   it('should update employee availability status', async () => {
  //     // Arrange
  //     const employeeId = '456e4567-e89b-12d3-a456-426614174002';
  //     const statusUpdate = {
  //       date: new Date('2025-01-15'),
  //       availability_type: 'unavailable',
  //       reason: 'sick_leave',
  //       notes: 'Employee called in sick'
  //     };
  //     const updatedStatus = {
  //       id: '999e4567-e89b-12d3-a456-426614174009',
  //       employee_id: employeeId,
  //       organization_id: testOrganizationId,
  //       ...statusUpdate,
  //       updated_by: testUserId,
  //       updated_at: new Date()
  //     };
  //     mockRepository.updateAvailabilityStatus.mockResolvedValue(updatedStatus);

  //     // Act
  //     const result = await service.updateAvailabilityStatus(
  //       employeeId,
  //       statusUpdate,
  //       testOrganizationId,
  //       testUserId
  //     );

  //     // Assert
  //     expect(result).toEqual(updatedStatus);
  //     expect(mockRepository.updateAvailabilityStatus).toHaveBeenCalledWith(
  //       employeeId,
  //       expect.objectContaining({
  //         ...statusUpdate,
  //         updated_by: testUserId,
  //         updated_at: expect.any(Date)
  //       }),
  //       testOrganizationId
  //     );
  //   });

  //   it('should handle temporary availability changes', async () => {
  //     // Arrange
  //     const employeeId = '456e4567-e89b-12d3-a456-426614174002';
  //     const temporaryChange = {
  //       date: new Date('2025-01-15'),
  //       availability_type: 'limited',
  //       start_time: '10:00:00',
  //       end_time: '14:00:00',
  //       reason: 'doctor_appointment',
  //       is_temporary: true
  //     };
  //     const updatedStatus = {
  //       id: '888e4567-e89b-12d3-a456-426614174008',
  //       employee_id: employeeId,
  //       organization_id: testOrganizationId,
  //       ...temporaryChange,
  //       updated_by: testUserId,
  //       updated_at: new Date()
  //     };
  //     mockRepository.updateAvailabilityStatus.mockResolvedValue(updatedStatus);

  //     // Act
  //     const result = await service.updateAvailabilityStatus(
  //       employeeId,
  //       temporaryChange,
  //       testOrganizationId,
  //       testUserId
  //     );

  //     // Assert
  //     expect(result.availability_type).toBe('limited');
  //     expect(result.is_temporary).toBe(true);
  //     expect(result.reason).toBe('doctor_appointment');
  //   });

  //   it('should throw error for invalid status update', async () => {
  //     // Arrange
  //     const employeeId = '456e4567-e89b-12d3-a456-426614174002';
  //     const invalidUpdate = {
  //       date: new Date('2025-01-15'),
  //       availability_type: 'invalid_type'
  //     };
  //     mockRepository.updateAvailabilityStatus.mockRejectedValue(
  //       new Error('Invalid availability type')
  //     );

  //     // Act & Assert
  //     await expect(
  //       service.updateAvailabilityStatus(
  //         employeeId,
  //         invalidUpdate,
  //         testOrganizationId,
  //         testUserId
  //       )
  //     ).rejects.toThrow('Invalid availability type');
  //   });
  // });
});