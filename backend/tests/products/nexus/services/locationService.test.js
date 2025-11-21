/**
 * LocationService Unit Tests
 * Tests for location management business logic
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  query: mockQuery
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import service after mocking
const { default: LocationService } = await import('../../../../src/products/nexus/services/locationService.js');

describe('LocationService', () => {
  let service;
  const organizationId = '123e4567-e89b-12d3-a456-426614174000';
  const userId = '223e4567-e89b-12d3-a456-426614174001';
  const locationId = '323e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LocationService();
  });

  describe('createLocation', () => {
    it('should create location successfully', async () => {
      const locationData = {
        location_name: 'Main Office',
        location_code: 'HQ001',
        address_line1: '123 Main St',
        city: 'New York',
        state_province: 'NY',
        postal_code: '10001',
        country: 'USA',
        timezone: 'America/New_York',
        is_active: true
      };

      // Mock check for duplicate
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Mock insert
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: locationId, ...locationData, organization_id: organizationId }]
      });

      const result = await service.createLocation(locationData, organizationId, userId);

      expect(result.id).toBe(locationId);
      expect(result.location_name).toBe(locationData.location_name);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw error if location name is missing', async () => {
      const locationData = {
        address_line1: '123 Main St'
      };

      await expect(
        service.createLocation(locationData, organizationId, userId)
      ).rejects.toThrow('Location name is required');
    });

    it('should throw error if location name already exists', async () => {
      const locationData = {
        location_name: 'Main Office'
      };

      // Mock existing location
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: locationId }]
      });

      await expect(
        service.createLocation(locationData, organizationId, userId)
      ).rejects.toThrow("Location with name 'Main Office' already exists");
    });

    it('should default is_active to true', async () => {
      const locationData = {
        location_name: 'Branch Office'
      };

      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: locationId, ...locationData, is_active: true }]
      });

      const result = await service.createLocation(locationData, organizationId, userId);

      expect(result.is_active).toBe(true);
    });

    it('should default timezone to UTC', async () => {
      const locationData = {
        location_name: 'Remote Office'
      };

      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: locationId, ...locationData, timezone: 'UTC' }]
      });

      const result = await service.createLocation(locationData, organizationId, userId);

      expect(result.timezone).toBe('UTC');
    });

    it.skip('should handle JSON facilities field', async () => {
      const locationData = {
        location_name: 'Tech Hub',
        facilities: ['parking', 'gym', 'cafeteria']
      };

      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: locationId, ...locationData }]
      });

      await service.createLocation(locationData, organizationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.stringContaining('"parking"')
        ]),
        organizationId,
        expect.any(Object)
      );
    });
  });

  describe('getLocation', () => {
    it('should get location with employee count', async () => {
      const location = {
        id: locationId,
        location_name: 'Main Office',
        employee_count: '5'
      };

      mockQuery.mockResolvedValueOnce({ rows: [location] });

      const result = await service.getLocation(locationId, organizationId);

      expect(result).toEqual(location);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT e.id) as employee_count'),
        [locationId, organizationId],
        organizationId,
        expect.any(Object)
      );
    });

    it('should throw error if location not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.getLocation(locationId, organizationId)
      ).rejects.toThrow('Location not found');
    });
  });

  describe('listLocations', () => {
    it('should list all locations with pagination', async () => {
      const locations = [
        { id: locationId, location_name: 'Office 1', employee_count: '5' },
        { id: '456', location_name: 'Office 2', employee_count: '3' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: locations });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await service.listLocations({}, organizationId);

      expect(result.locations).toEqual(locations);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should filter by isActive', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.listLocations({ isActive: true }, organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('l.is_active = $2'),
        expect.arrayContaining([organizationId, true]),
        organizationId,
        expect.any(Object)
      );
    });

    it('should filter by country', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.listLocations({ country: 'USA' }, organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('l.country = $2'),
        expect.arrayContaining([organizationId, 'USA']),
        organizationId,
        expect.any(Object)
      );
    });

    it('should filter by state/province', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.listLocations({ stateProvince: 'NY' }, organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('l.state_province = $2'),
        expect.arrayContaining([organizationId, 'NY']),
        organizationId,
        expect.any(Object)
      );
    });

    it('should filter by city', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.listLocations({ city: 'New York' }, organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('l.city = $2'),
        expect.arrayContaining([organizationId, 'New York']),
        organizationId,
        expect.any(Object)
      );
    });

    it('should filter by isPrimary', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.listLocations({ isPrimary: true }, organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('l.is_primary = $2'),
        expect.arrayContaining([organizationId, true]),
        organizationId,
        expect.any(Object)
      );
    });

    it('should apply custom pagination', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.listLocations({}, organizationId, { limit: 10, offset: 20 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        expect.arrayContaining([organizationId, 10, 20]),
        organizationId,
        expect.any(Object)
      );
    });

    it('should order by is_primary DESC and location_name ASC', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.listLocations({}, organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY l.is_primary DESC, l.location_name ASC'),
        expect.any(Array),
        organizationId,
        expect.any(Object)
      );
    });
  });

  describe('updateLocation', () => {
    it('should update location successfully', async () => {
      const existingLocation = {
        id: locationId,
        location_name: 'Old Name',
        organization_id: organizationId
      };

      const updateData = {
        location_name: 'New Name',
        city: 'Boston'
      };

      mockQuery.mockResolvedValueOnce({ rows: [existingLocation] }); // Get existing
      mockQuery.mockResolvedValueOnce({ rows: [] }); // Duplicate check (no duplicates)
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...existingLocation, ...updateData }]
      }); // Update query

      const result = await service.updateLocation(locationId, updateData, organizationId, userId);

      expect(result.location_name).toBe('New Name');
      expect(result.city).toBe('Boston');
    });

    it('should throw error if location not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.updateLocation(locationId, { location_name: 'New Name' }, organizationId, userId)
      ).rejects.toThrow('Location not found');
    });

    it('should check for duplicate name when name is changed', async () => {
      const existingLocation = {
        id: locationId,
        location_name: 'Old Name'
      };

      const updateData = {
        location_name: 'Duplicate Name'
      };

      mockQuery.mockResolvedValueOnce({ rows: [existingLocation] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: '999' }] });

      await expect(
        service.updateLocation(locationId, updateData, organizationId, userId)
      ).rejects.toThrow("Location with name 'Duplicate Name' already exists");
    });

    it('should return existing location if no updates', async () => {
      const existingLocation = {
        id: locationId,
        location_name: 'Office'
      };

      mockQuery.mockResolvedValueOnce({ rows: [existingLocation] });

      const result = await service.updateLocation(locationId, {}, organizationId, userId);

      expect(result).toEqual(existingLocation);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it.skip('should update JSON facilities field', async () => {
      const existingLocation = {
        id: locationId,
        location_name: 'Office'
      };

      const updateData = {
        facilities: ['parking', 'gym']
      };

      mockQuery.mockResolvedValueOnce({ rows: [existingLocation] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...existingLocation, facilities: updateData.facilities }]
      });

      await service.updateLocation(locationId, updateData, organizationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('facilities = $'),
        expect.arrayContaining([expect.stringContaining('parking')]),
        organizationId,
        expect.any(Object)
      );
    });
  });

  describe('deleteLocation', () => {
    it('should soft delete location successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: locationId }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.deleteLocation(locationId, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Location deleted successfully');
    });

    it('should throw error if location not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.deleteLocation(locationId, organizationId, userId)
      ).rejects.toThrow('Location not found');
    });

    it('should throw error if location has active employees', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: locationId }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] });

      await expect(
        service.deleteLocation(locationId, organizationId, userId)
      ).rejects.toThrow('Cannot delete location with active employees');
    });
  });

  describe('getPrimaryLocation', () => {
    it('should get primary location', async () => {
      const primaryLocation = {
        id: locationId,
        location_name: 'HQ',
        is_primary: true
      };

      mockQuery.mockResolvedValueOnce({ rows: [primaryLocation] });

      const result = await service.getPrimaryLocation(organizationId);

      expect(result).toEqual(primaryLocation);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_primary = true'),
        [organizationId],
        organizationId,
        expect.any(Object)
      );
    });

    it('should return null if no primary location', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getPrimaryLocation(organizationId);

      expect(result).toBeNull();
    });
  });

  describe('setPrimaryLocation', () => {
    it('should set location as primary', async () => {
      const location = {
        id: locationId,
        location_name: 'New HQ',
        is_primary: true
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ id: locationId }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [location] });

      const result = await service.setPrimaryLocation(locationId, organizationId, userId);

      expect(result.is_primary).toBe(true);
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should throw error if location not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.setPrimaryLocation(locationId, organizationId, userId)
      ).rejects.toThrow('Location not found');
    });

    it('should unset current primary before setting new', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: locationId }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: locationId, is_primary: true }] });

      await service.setPrimaryLocation(locationId, organizationId, userId);

      expect(mockQuery).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('is_primary = false'),
        [organizationId, userId],
        organizationId
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors in createLocation', async () => {
      const locationData = {
        location_name: 'Test Office'
      };

      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        service.createLocation(locationData, organizationId, userId)
      ).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle database errors in getLocation', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(
        service.getLocation(locationId, organizationId)
      ).rejects.toThrow('Query timeout');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
