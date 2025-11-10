/**
 * Station Service Tests
 * Unit tests for StationService business logic
 */

import StationService from '../../../../src/products/schedulehub/services/stationService.js';
import pool from '../../../../src/config/database.js';
import { createMockStation, createMockPool } from '../factories/testData.js';

describe('StationService', () => {
  let service;
  let mockPool;
  const organizationId = 'org-123';
  const userId = 'user-456';

  beforeEach(() => {
    service = new StationService();
    mockPool = createMockPool();
    pool.query = mockPool.query;
    jest.clearAllMocks();
  });

  describe('createStation', () => {
    test('should create station successfully', async () => {
      const stationData = {
        name: 'Checkout Lane 1',
        code: 'LANE-01',
        description: 'Front checkout lane',
        locationId: 'loc-123',
        capacity: 2,
        requiresSupervision: false,
        floor: 'Ground',
        zone: 'Front End'
      };

      const mockStation = createMockStation(stationData);
      mockPool.query.mockResolvedValueOnce({ rows: [mockStation] });

      const result = await service.createStation(stationData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Checkout Lane 1');
      expect(result.data.code).toBe('LANE-01');
      expect(result.data.capacity).toBe(2);
    });

    test('should validate required fields', async () => {
      const invalidData = {
        description: 'Test station'
        // Missing name and code
      };

      await expect(
        service.createStation(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should validate capacity is positive', async () => {
      const invalidData = {
        name: 'Test',
        code: 'TEST-01',
        capacity: -1
      };

      await expect(
        service.createStation(invalidData, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should validate unique station code', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('duplicate key value'));

      await expect(
        service.createStation({
          name: 'Test',
          code: 'EXISTING-CODE'
        }, organizationId, userId)
      ).rejects.toThrow();
    });

    test('should default capacity to 1 if not specified', async () => {
      const mockStation = createMockStation({ capacity: 1 });
      mockPool.query.mockResolvedValueOnce({ rows: [mockStation] });

      const result = await service.createStation({
        name: 'Test',
        code: 'TEST-01'
      }, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.capacity).toBe(1);
    });
  });

  describe('updateStation', () => {
    test('should update station successfully', async () => {
      const stationId = 'station-123';
      const updateData = {
        name: 'Checkout Lane 1 - Updated',
        capacity: 3,
        requiresSupervision: true
      };

      const mockStation = createMockStation({
        id: stationId,
        ...updateData
      });

      mockPool.query.mockResolvedValueOnce({ rows: [mockStation] });

      const result = await service.updateStation(stationId, updateData, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Checkout Lane 1 - Updated');
      expect(result.data.capacity).toBe(3);
      expect(result.data.requires_supervision).toBe(true);
    });

    test('should not update non-existent station', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.updateStation('invalid-id', { name: 'Test' }, organizationId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should validate capacity if provided', async () => {
      const invalidData = {
        capacity: 0
      };

      await expect(
        service.updateStation('station-123', invalidData, organizationId, userId)
      ).rejects.toThrow();
    });
  });

  describe('listStations', () => {
    test('should list active stations', async () => {
      const mockStations = [
        createMockStation({ is_active: true }),
        createMockStation({ is_active: true }),
        createMockStation({ is_active: true })
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockStations });

      const result = await service.listStations(organizationId, true);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data.every(s => s.is_active)).toBe(true);
    });

    test('should filter by location', async () => {
      const locationId = 'loc-123';
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.listStations(organizationId, true, locationId);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('location_id');
      expect(queryCall[1]).toContain(locationId);
    });

    test('should include inactive stations when requested', async () => {
      const mockStations = [
        createMockStation({ is_active: true }),
        createMockStation({ is_active: false })
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockStations });

      const result = await service.listStations(organizationId, false);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    test('should order by name', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.listStations(organizationId);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('ORDER BY name');
    });
  });

  describe('getStationById', () => {
    test('should return station by ID', async () => {
      const mockStation = createMockStation();
      mockPool.query.mockResolvedValueOnce({ rows: [mockStation] });

      const result = await service.getStationById(mockStation.id, organizationId);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(mockStation.id);
    });

    test('should return error if not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getStationById('invalid-id', organizationId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('addRoleRequirement', () => {
    test('should add role requirement successfully', async () => {
      const stationId = 'station-123';
      const roleId = 'role-456';
      const minWorkers = 1;
      const maxWorkers = 2;
      const priority = 'required';

      const mockRequirement = createMockStationRequirement({
        station_id: stationId,
        role_id: roleId,
        min_workers: minWorkers,
        max_workers: maxWorkers,
        priority
      });

      mockPool.query.mockResolvedValueOnce({ rows: [mockRequirement] });

      const result = await service.addRoleRequirement(
        stationId,
        roleId,
        organizationId,
        minWorkers,
        maxWorkers,
        priority,
        userId
      );

      expect(result.success).toBe(true);
      expect(result.data.min_workers).toBe(1);
      expect(result.data.max_workers).toBe(2);
      expect(result.data.priority).toBe('required');
    });

    test('should validate min <= max workers', async () => {
      await expect(
        service.addRoleRequirement(
          'station-123',
          'role-456',
          organizationId,
          5, // min
          2, // max (less than min)
          'required',
          userId
        )
      ).rejects.toThrow();
    });

    test('should validate priority enum', async () => {
      await expect(
        service.addRoleRequirement(
          'station-123',
          'role-456',
          organizationId,
          1,
          2,
          'invalid_priority',
          userId
        )
      ).rejects.toThrow();
    });

    test('should handle duplicate requirement', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('duplicate key'));

      await expect(
        service.addRoleRequirement(
          'station-123',
          'role-456',
          organizationId,
          1,
          2,
          'required',
          userId
        )
      ).rejects.toThrow();
    });

    test('should default priority to required', async () => {
      const mockRequirement = createMockStationRequirement({
        priority: 'required'
      });

      mockPool.query.mockResolvedValueOnce({ rows: [mockRequirement] });

      const result = await service.addRoleRequirement(
        'station-123',
        'role-456',
        organizationId,
        1,
        2,
        undefined,
        userId
      );

      expect(result.success).toBe(true);
      expect(result.data.priority).toBe('required');
    });
  });

  describe('removeRoleRequirement', () => {
    test('should remove role requirement', async () => {
      const stationId = 'station-123';
      const roleId = 'role-456';

      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'req-123' }] });

      const result = await service.removeRoleRequirement(stationId, roleId, organizationId);

      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM'),
        expect.arrayContaining([organizationId, stationId, roleId])
      );
    });

    test('should return success even if requirement not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.removeRoleRequirement('station-123', 'role-456', organizationId);

      expect(result.success).toBe(true);
    });
  });

  describe('getStationRequirements', () => {
    test('should return station requirements with role details', async () => {
      const stationId = 'station-123';
      const mockRequirements = [
        {
          ...createMockStationRequirement(),
          role_name: 'Cashier',
          role_code: 'CASH-01'
        },
        {
          ...createMockStationRequirement(),
          role_name: 'Supervisor',
          role_code: 'SUP-01'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockRequirements });

      const result = await service.getStationRequirements(stationId, organizationId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].role_name).toBe('Cashier');
      expect(result.data[1].role_name).toBe('Supervisor');
    });

    test('should return empty array if no requirements', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getStationRequirements('station-123', organizationId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    test('should order by priority', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await service.getStationRequirements('station-123', organizationId);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('ORDER BY');
      expect(queryCall[0]).toContain('priority');
    });
  });
});
