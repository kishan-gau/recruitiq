/**
 * Unit Tests for StationService
 * Tests for ScheduleHub station management and role requirements functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import StationService from '../../../../../src/products/schedulehub/services/stationService.js';

// Mock database pool
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

const mockPool = {
  connect: jest.fn(),
  query: jest.fn()
};

// Mock database query function
const mockQuery = jest.fn();

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock DTO mappers
const mockMapStationDbToApi = jest.fn();
const mockMapStationsDbToApi = jest.fn();

// Mock ES modules
jest.unstable_mockModule('../../../../../src/config/database.js', () => ({
  default: mockPool,
  query: mockQuery
}));

jest.unstable_mockModule('../../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

jest.unstable_mockModule('../../../../../src/products/schedulehub/dto/stationDto.js', () => ({
  mapStationDbToApi: mockMapStationDbToApi,
  mapStationsDbToApi: mockMapStationsDbToApi
}));

describe('StationService', () => {
  let stationService;

  // Test constants
  const organizationId = '123e4567-e89b-12d3-a456-426614174000';
  const userId = '223e4567-e89b-12d3-a456-426614174001';
  const stationId = '323e4567-e89b-12d3-a456-426614174002';
  const roleId = '423e4567-e89b-12d3-a456-426614174003';
  const employeeId = '523e4567-e89b-12d3-a456-426614174004';
  const locationId = '623e4567-e89b-12d3-a456-426614174005';

  beforeEach(async () => {
    // Clear all mock calls
    jest.clearAllMocks();

    // Setup default mock implementations
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [] });
    mockQuery.mockResolvedValue({ rows: [] });
    mockMapStationDbToApi.mockImplementation(station => ({ ...station, mapped: true }));
    mockMapStationsDbToApi.mockImplementation(stations => stations.map(s => ({ ...s, mapped: true })));

    // Import service after mocking
    stationService = new StationService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with logger', () => {
      expect(stationService.logger).toBe(mockLogger);
    });

    it('should have validation schemas', () => {
      expect(stationService.createStationSchema).toBeDefined();
      expect(stationService.addRoleRequirementSchema).toBeDefined();
    });
  });

  describe('createStation', () => {
    const validStationData = {
      stationCode: 'ST001',
      stationName: 'Reception Station',
      description: 'Main reception area',
      locationId,
      floorLevel: 'Ground',
      zone: 'Front Office',
      capacity: 2,
      requiresSupervision: false,
      isActive: true
    };

    const mockDbStation = {
      id: stationId,
      organization_id: organizationId,
      station_code: 'ST001',
      station_name: 'Reception Station',
      description: 'Main reception area',
      location_id: locationId,
      floor_level: 'Ground',
      zone: 'Front Office',
      capacity: 2,
      requires_supervision: false,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should create station successfully', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockDbStation] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      mockMapStationDbToApi.mockReturnValue({
        id: stationId,
        stationCode: 'ST001',
        stationName: 'Reception Station',
        description: 'Main reception area',
        locationId,
        floorLevel: 'Ground',
        zone: 'Front Office',
        capacity: 2,
        requiresSupervision: false,
        isActive: true
      });

      // Act
      const result = await stationService.createStation(validStationData, organizationId, userId);

      // Assert
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.stations'),
        expect.arrayContaining([
          organizationId,
          'ST001',
          'Reception Station',
          'Main reception area',
          locationId,
          'Ground',
          'Front Office',
          2,
          false,
          true
        ])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Station created', {
        stationId: mockDbStation.id,
        organizationId
      });
      expect(result).toEqual(expect.objectContaining({
        id: stationId,
        stationCode: 'ST001',
        stationName: 'Reception Station'
      }));
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidData = {
        stationCode: '', // Required field empty
        stationName: 'Valid Name'
      };

      // Act & Assert
      await expect(
        stationService.createStation(invalidData, organizationId, userId)
      ).rejects.toThrow(/Validation error/);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors with rollback', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(dbError); // INSERT fails

      // Act & Assert
      await expect(
        stationService.createStation(validStationData, organizationId, userId)
      ).rejects.toThrow('Database connection failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Error creating station:', dbError);
    });

    it('should set default values correctly', async () => {
      // Arrange
      const minimalData = {
        stationCode: 'ST002',
        stationName: 'Basic Station',
        locationId
      };

      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockDbStation] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      await stationService.createStation(minimalData, organizationId, userId);

      // Assert
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.stations'),
        expect.arrayContaining([
          organizationId,
          'ST002',
          'Basic Station',
          null, // description default
          locationId,
          null, // floorLevel default
          null, // zone default
          null, // capacity default
          false, // requiresSupervision default
          true // isActive default
        ])
      );
    });
  });

  describe('listStations', () => {
    const mockDbStations = [
      {
        id: stationId,
        station_name: 'Station 1',
        location_name: 'Building A',
        shift_count: '5',
        is_active: true
      },
      {
        id: '423e4567-e89b-12d3-a456-426614174003',
        station_name: 'Station 2',
        location_name: 'Building B',
        shift_count: '3',
        is_active: true
      }
    ];

    it('should list active stations by default', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: mockDbStations });
      mockMapStationsDbToApi.mockReturnValue([
        { id: stationId, stationName: 'Station 1', mapped: true },
        { id: '423e4567-e89b-12d3-a456-426614174003', stationName: 'Station 2', mapped: true }
      ]);

      // Act
      const result = await stationService.listStations(organizationId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE s.organization_id = $1'),
        [organizationId],
        organizationId,
        {
          operation: 'SELECT',
          table: 'stations'
        }
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND s.deleted_at IS NULL'),
        expect.any(Array),
        organizationId,
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('mapped', true);
    });

    it('should include inactive stations when requested', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: mockDbStations });

      // Act
      await stationService.listStations(organizationId, true);

      // Assert
      const callArgs = mockQuery.mock.calls[0];
      const sql = callArgs[0];
      expect(sql).not.toContain('AND s.deleted_at IS NULL');
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        stationService.listStations(organizationId)
      ).rejects.toThrow('Database query failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Error listing stations:', dbError);
    });
  });

  describe('getStationById', () => {
    const mockDbStation = {
      id: stationId,
      station_name: 'Test Station',
      location_name: 'Building A',
      role_requirement_count: '2'
    };

    it('should return station when found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [mockDbStation] });
      mockMapStationDbToApi.mockReturnValue({ id: stationId, stationName: 'Test Station' });

      // Act
      const result = await stationService.getStationById(stationId, organizationId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE s.id = $1 AND s.organization_id = $2'),
        [stationId, organizationId],
        organizationId,
        {
          operation: 'SELECT',
          table: 'stations'
        }
      );
      expect(result).toEqual({ id: stationId, stationName: 'Test Station' });
    });

    it('should return null when station not found', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });

      // Act
      const result = await stationService.getStationById(stationId, organizationId);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        stationService.getStationById(stationId, organizationId)
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching station:', dbError);
    });
  });

  describe('updateStation', () => {
    const updateData = {
      stationName: 'Updated Station',
      description: 'Updated description',
      isActive: false
    };

    const mockUpdatedStation = {
      id: stationId,
      station_name: 'Updated Station',
      description: 'Updated description',
      is_active: false
    };

    it('should update station successfully', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUpdatedStation] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      mockMapStationDbToApi.mockReturnValue({
        id: stationId,
        stationName: 'Updated Station',
        description: 'Updated description',
        isActive: false
      });

      // Act
      const result = await stationService.updateStation(stationId, updateData, organizationId, userId);

      // Assert
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scheduling.stations'),
        expect.arrayContaining(['Updated Station', 'Updated description', false, stationId, organizationId])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({
        id: stationId,
        stationName: 'Updated Station'
      }));
    });

    it('should handle no fields to update', async () => {
      // Act & Assert
      await expect(
        stationService.updateStation(stationId, {}, organizationId, userId)
      ).rejects.toThrow('No valid fields to update');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle station not found', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // UPDATE returns no rows

      // Act & Assert
      await expect(
        stationService.updateStation(stationId, updateData, organizationId, userId)
      ).rejects.toThrow('Station not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors with rollback', async () => {
      // Arrange
      const dbError = new Error('Database update failed');
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(dbError); // UPDATE fails

      // Act & Assert
      await expect(
        stationService.updateStation(stationId, updateData, organizationId, userId)
      ).rejects.toThrow('Database update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Error updating station:', dbError);
    });
  });

  describe('getStationAssignments', () => {
    const mockAssignments = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        station_id: stationId,
        employee_id: employeeId,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        notes: 'Primary assignment',
        assigned_at: new Date('2025-01-01T10:00:00Z'),
        assigned_by: userId,
        assigned_by_name: 'Admin User'
      }
    ];

    it('should return formatted station assignments', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: mockAssignments });

      // Act
      const result = await stationService.getStationAssignments(stationId, organizationId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM scheduling.station_assignments sa'),
        [stationId, organizationId],
        organizationId,
        {
          operation: 'SELECT',
          table: 'station_assignments'
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Fetching assignments for station ${stationId}`
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        stationId,
        employeeId,
        employeeName: 'John Doe',
        employeeEmail: 'john.doe@example.com',
        notes: 'Primary assignment',
        assignedAt: mockAssignments[0].assigned_at,
        assignedBy: userId,
        assignedByName: 'Admin User'
      });
    });

    it('should handle employees without names', async () => {
      // Arrange
      const assignmentWithoutName = {
        ...mockAssignments[0],
        first_name: null,
        last_name: null
      };
      mockQuery.mockResolvedValue({ rows: [assignmentWithoutName] });

      // Act
      const result = await stationService.getStationAssignments(stationId, organizationId);

      // Assert
      expect(result[0].employeeName).toBe('Unknown Employee');
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        stationService.getStationAssignments(stationId, organizationId)
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching station assignments:', dbError);
    });
  });

  describe('assignEmployeeToStation', () => {
    const mockEmployee = {
      id: employeeId,
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com'
    };

    const mockAssignment = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      station_id: stationId,
      employee_id: employeeId,
      organization_id: organizationId,
      notes: 'Test assignment',
      assigned_by: userId,
      assigned_at: new Date()
    };

    it('should assign employee to station successfully', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: stationId }] }) // Station exists check
        .mockResolvedValueOnce({ rows: [mockEmployee] }) // Employee exists check
        .mockResolvedValueOnce({ rows: [] }) // Existing assignment check
        .mockResolvedValueOnce({ rows: [mockAssignment] }) // INSERT assignment
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      const result = await stationService.assignEmployeeToStation(
        stationId, employeeId, organizationId, userId, 'Test assignment'
      );

      // Assert
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM scheduling.stations'),
        [stationId, organizationId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, first_name, last_name, email FROM hris.employee'),
        [employeeId, organizationId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.station_assignments'),
        [stationId, employeeId, organizationId, 'Test assignment', userId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Employee ${employeeId} assigned to station ${stationId}`
      );

      expect(result).toEqual({
        id: mockAssignment.id,
        stationId,
        employeeId,
        employeeName: 'Jane Smith',
        employeeEmail: 'jane.smith@example.com',
        notes: 'Test assignment',
        assignedAt: mockAssignment.assigned_at,
        assignedBy: userId
      });
    });

    it('should handle station not found', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Station not found

      // Act & Assert
      await expect(
        stationService.assignEmployeeToStation(stationId, employeeId, organizationId, userId)
      ).rejects.toThrow('Station not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle employee not found', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: stationId }] }) // Station exists
        .mockResolvedValueOnce({ rows: [] }); // Employee not found

      // Act & Assert
      await expect(
        stationService.assignEmployeeToStation(stationId, employeeId, organizationId, userId)
      ).rejects.toThrow('Employee not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle existing assignment', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: stationId }] }) // Station exists
        .mockResolvedValueOnce({ rows: [mockEmployee] }) // Employee exists
        .mockResolvedValueOnce({ rows: [{ id: 'existing-assignment' }] }); // Existing assignment

      // Act & Assert
      await expect(
        stationService.assignEmployeeToStation(stationId, employeeId, organizationId, userId)
      ).rejects.toThrow('Employee is already assigned to this station');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors with rollback', async () => {
      // Arrange
      const dbError = new Error('Database error');
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(dbError); // Station check fails

      // Act & Assert
      await expect(
        stationService.assignEmployeeToStation(stationId, employeeId, organizationId, userId)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Error assigning employee to station:', dbError);
    });
  });

  describe('removeEmployeeAssignment', () => {
    const assignmentId = '123e4567-e89b-12d3-a456-426614174000';
    const mockAssignment = {
      id: assignmentId,
      station_id: stationId,
      employee_id: employeeId,
      organization_id: organizationId
    };

    it('should remove assignment successfully', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockAssignment] }) // Assignment exists check
        .mockResolvedValueOnce({ rows: [] }) // UPDATE (soft delete)
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      const result = await stationService.removeEmployeeAssignment(
        stationId, assignmentId, organizationId, userId
      );

      // Assert
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM scheduling.station_assignments'),
        [assignmentId, stationId, organizationId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scheduling.station_assignments'),
        [userId, assignmentId, organizationId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Assignment ${assignmentId} removed from station ${stationId}`
      );
      expect(result).toBe(true);
    });

    it('should handle assignment not found', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Assignment not found

      // Act & Assert
      await expect(
        stationService.removeEmployeeAssignment(stationId, assignmentId, organizationId, userId)
      ).rejects.toThrow('Assignment not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors with rollback', async () => {
      // Arrange
      const dbError = new Error('Database error');
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(dbError); // Check fails

      // Act & Assert
      await expect(
        stationService.removeEmployeeAssignment(stationId, assignmentId, organizationId, userId)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Error removing employee assignment:', dbError);
    });
  });

  describe('getStationRequirements', () => {
    const mockRequirements = [
      {
        station_id: stationId,
        role_id: roleId,
        min_workers: 2,
        max_workers: 4,
        priority: 1,
        created_at: new Date(),
        updated_at: new Date(),
        role_name: 'Supervisor',
        role_code: 'SUP',
        hourly_rate: 25.00
      },
      {
        station_id: stationId,
        role_id: '523e4567-e89b-12d3-a456-426614174005',
        min_workers: 1,
        max_workers: 2,
        priority: 2,
        created_at: new Date(),
        updated_at: new Date(),
        role_name: 'Worker',
        role_code: 'WRK',
        hourly_rate: 18.00
      }
    ];

    it('should return formatted station requirements', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: mockRequirements });

      // Act
      const result = await stationService.getStationRequirements(stationId, organizationId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM scheduling.station_role_requirements srr'),
        [stationId, organizationId],
        organizationId,
        {
          operation: 'SELECT',
          table: 'station_role_requirements'
        }
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Station requirements retrieved', {
        stationId,
        organizationId,
        count: 2
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        stationId,
        roleId,
        roleName: 'Supervisor',
        roleCode: 'SUP',
        hourlyRate: 25.00,
        minWorkers: 2,
        maxWorkers: 4,
        priority: 1,
        createdAt: mockRequirements[0].created_at,
        updatedAt: mockRequirements[0].updated_at
      });
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        stationService.getStationRequirements(stationId, organizationId)
      ).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith('Error getting station requirements:', dbError);
    });
  });

  describe('addRoleRequirement', () => {
    const mockRequirementResult = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      station_id: stationId,
      role_id: roleId,
      min_workers: 2,
      max_workers: 4,
      priority: 1
    };

    const mockRoleDetails = {
      station_id: stationId,
      role_id: roleId,
      min_workers: 2,
      max_workers: 4,
      priority: 1,
      created_at: new Date(),
      updated_at: new Date(),
      role_name: 'Supervisor',
      role_code: 'SUP',
      hourly_rate: 25.00
    };

    it('should add role requirement successfully', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: stationId }] }) // Station exists check
        .mockResolvedValueOnce({ rows: [{ id: roleId }] }) // Role exists check
        .mockResolvedValueOnce({ rows: [] }) // Existing requirement check
        .mockResolvedValueOnce({ rows: [mockRequirementResult] }) // INSERT requirement
        .mockResolvedValueOnce({ rows: [] }) // COMMIT
        .mockResolvedValueOnce({ rows: [mockRoleDetails] }); // Get requirement with role details

      // Act
      const result = await stationService.addRoleRequirement(
        stationId, roleId, organizationId, 2, 4, 1, userId
      );

      // Assert
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM scheduling.stations'),
        [stationId, organizationId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM scheduling.roles'),
        [roleId, organizationId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scheduling.station_role_requirements'),
        [stationId, roleId, organizationId, 2, 4, 1, userId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Role requirement added to station', {
        stationId,
        roleId,
        organizationId
      });

      expect(result).toEqual({
        stationId,
        roleId,
        roleName: 'Supervisor',
        roleCode: 'SUP',
        hourlyRate: 25.00,
        minWorkers: 2,
        maxWorkers: 4,
        priority: 1,
        createdAt: mockRoleDetails.created_at,
        updatedAt: mockRoleDetails.updated_at
      });
    });

    it('should handle validation errors', async () => {
      // Act & Assert
      await expect(
        stationService.addRoleRequirement(
          'invalid-uuid', roleId, organizationId, 2, 4, 1, userId
        )
      ).rejects.toThrow(/ValidationError/);
    });

    it('should handle station not found', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Station not found

      // Act & Assert
      await expect(
        stationService.addRoleRequirement(stationId, roleId, organizationId, 2, 4, 1, userId)
      ).rejects.toThrow('Station not found or access denied');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle role not found', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: stationId }] }) // Station exists
        .mockResolvedValueOnce({ rows: [] }); // Role not found

      // Act & Assert
      await expect(
        stationService.addRoleRequirement(stationId, roleId, organizationId, 2, 4, 1, userId)
      ).rejects.toThrow('Role not found or access denied');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle existing requirement', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: stationId }] }) // Station exists
        .mockResolvedValueOnce({ rows: [{ id: roleId }] }) // Role exists
        .mockResolvedValueOnce({ rows: [{ id: 'existing' }] }); // Existing requirement

      // Act & Assert
      await expect(
        stationService.addRoleRequirement(stationId, roleId, organizationId, 2, 4, 1, userId)
      ).rejects.toThrow('Role requirement already exists for this station');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors with rollback', async () => {
      // Arrange
      const dbError = new Error('Database error');
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(dbError); // Station check fails

      // Act & Assert
      await expect(
        stationService.addRoleRequirement(stationId, roleId, organizationId, 2, 4, 1, userId)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Error adding role requirement:', dbError);
    });
  });

  describe('removeRoleRequirement', () => {
    it('should remove role requirement successfully', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'requirement-id' }] }) // UPDATE (soft delete)
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Act
      const result = await stationService.removeRoleRequirement(stationId, roleId, organizationId);

      // Assert
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE scheduling.station_role_requirements'),
        [stationId, roleId, organizationId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Role requirement removed from station', {
        stationId,
        roleId,
        organizationId
      });
      expect(result).toBe(true);
    });

    it('should handle requirement not found', async () => {
      // Arrange
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // UPDATE returns no rows

      // Act & Assert
      await expect(
        stationService.removeRoleRequirement(stationId, roleId, organizationId)
      ).rejects.toThrow('Role requirement not found');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors with rollback', async () => {
      // Arrange
      const dbError = new Error('Database error');
      mockClient.query.mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(dbError); // UPDATE fails

      // Act & Assert
      await expect(
        stationService.removeRoleRequirement(stationId, roleId, organizationId)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Error removing role requirement:', dbError);
    });
  });

  describe('getStationCoverageStats', () => {
    const mockCoverageData = [
      {
        stationId: stationId,
        stationName: 'Station 1',
        requiredStaffing: 4,
        minimumStaffing: 2,
        currentStaffing: 3,
        coveragePercentage: 75,
        status: 'warning',
        unfilledSlots: 1,
        isActive: true,
        shifts: JSON.stringify([
          {
            id: 'shift1',
            employeeId: employeeId,
            employeeName: 'John Doe',
            roleId: roleId,
            roleName: 'Worker',
            startTime: '09:00',
            endTime: '17:00',
            status: 'confirmed',
            shiftDate: '2025-01-15'
          }
        ])
      }
    ];

    it('should return comprehensive coverage statistics', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: mockCoverageData });

      // Act
      const result = await stationService.getStationCoverageStats(organizationId, '2025-01-15');

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WITH station_requirements AS'),
        [organizationId, '2025-01-15'],
        organizationId,
        {
          operation: 'SELECT',
          table: 'scheduling.stations',
          userId: null
        }
      );

      expect(result).toEqual({
        totalStations: 1,
        optimalStations: 0,
        warningStations: 1,
        criticalStations: 0,
        overallCoveragePercentage: 75,
        stationCoverage: mockCoverageData,
        criticalPeriods: expect.any(Array)
      });
    });

    it('should use current date when no date provided', async () => {
      // Arrange
      mockQuery.mockResolvedValue({ rows: [] });
      const today = new Date().toISOString().split('T')[0];

      // Act
      await stationService.getStationCoverageStats(organizationId);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [organizationId, today],
        organizationId,
        expect.any(Object)
      );
    });

    it('should handle database errors with detailed logging', async () => {
      // Arrange
      const dbError = new Error('Complex database error');
      dbError.code = '42P01';
      dbError.detail = 'relation "scheduling.stations" does not exist';
      dbError.hint = 'Perhaps you meant to reference the table "public.stations"';
      dbError.position = '123';
      mockQuery.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        stationService.getStationCoverageStats(organizationId, '2025-01-15')
      ).rejects.toThrow('Complex database error');

      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching station coverage stats:', {
        error: 'Complex database error',
        code: '42P01',
        detail: 'relation "scheduling.stations" does not exist',
        hint: 'Perhaps you meant to reference the table "public.stations"',
        position: '123',
        organizationId,
        date: '2025-01-15'
      });
    });

    it('should calculate overall statistics correctly', async () => {
      // Arrange
      const multipleStationData = [
        { ...mockCoverageData[0], status: 'optimal', coveragePercentage: 100 },
        { ...mockCoverageData[0], stationId: 'station2', status: 'warning', coveragePercentage: 75 },
        { ...mockCoverageData[0], stationId: 'station3', status: 'critical', coveragePercentage: 25 }
      ];
      mockQuery.mockResolvedValue({ rows: multipleStationData });

      // Act
      const result = await stationService.getStationCoverageStats(organizationId, '2025-01-15');

      // Assert
      expect(result.totalStations).toBe(3);
      expect(result.optimalStations).toBe(1);
      expect(result.warningStations).toBe(1);
      expect(result.criticalStations).toBe(1);
      expect(result.overallCoveragePercentage).toBe(67); // (100+75+25)/3 = 66.67 rounded to 67
    });
  });

  describe('_identifyCriticalPeriods', () => {
    it('should identify critical periods correctly', () => {
      // Arrange
      const stationCoverage = [
        { stationName: 'Station 1', status: 'critical' },
        { stationName: 'Station 2', status: 'warning' },
        { stationName: 'Station 3', status: 'critical' }
      ];
      const date = '2025-01-15';

      // Act
      const result = stationService._identifyCriticalPeriods(stationCoverage, date);

      // Assert
      expect(result).toHaveLength(3); // Morning, Afternoon, Night
      expect(result[0]).toEqual({
        startTime: expect.stringContaining('2025-01-15T06:00:00'),
        endTime: expect.stringContaining('2025-01-15T14:00:00'),
        affectedStations: ['Station 1', 'Station 2', 'Station 3'],
        severity: 'critical' // 2 critical stations >= 2 threshold
      });
    });

    it('should not identify periods with insufficient affected stations', () => {
      // Arrange
      const stationCoverage = [
        { stationName: 'Station 1', status: 'optimal' }
      ];
      const date = '2025-01-15';

      // Act
      const result = stationService._identifyCriticalPeriods(stationCoverage, date);

      // Assert
      expect(result).toHaveLength(0);
    });
  });
});