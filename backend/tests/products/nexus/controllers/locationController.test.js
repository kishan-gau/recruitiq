/**
 * LocationController Tests
 * Tests for location management HTTP handlers
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Step 1: Create mock SERVICE as a CLASS (critical for ES6 class controllers)
class MockLocationService {
  createLocation = jest.fn();
  getLocation = jest.fn();
  updateLocation = jest.fn();
  deleteLocation = jest.fn();
  listLocations = jest.fn();
  getLocationByCode = jest.fn();
  getLocationStats = jest.fn();
  getAllLocationStats = jest.fn();
}

// Step 2: Mock the service module BEFORE importing controller
jest.unstable_mockModule('../../../../src/products/nexus/services/locationService.js', () => ({
  default: MockLocationService
}));

// Step 3: Mock logger
const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Step 4: Import controller AFTER mocking dependencies
const { default: LocationController } = await import('../../../../src/products/nexus/controllers/locationController.js');

describe('LocationController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create controller instance (instantiates MockLocationService)
    controller = new LocationController();

    // Mock request
    mockReq = {
      user: {
        organizationId: 'org-123',
        userId: 'user-456'
      },
      params: {},
      query: {},
      body: {}
    };

    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('createLocation', () => {
    it('should create location and return 201', async () => {
      const locationData = {
        code: 'LOC001',
        name: 'Main Office',
        type: 'office'
      };
      const createdLocation = { id: 'loc-123', ...locationData };

      mockReq.body = locationData;
      controller.service.createLocation.mockResolvedValue(createdLocation);

      await controller.createLocation(mockReq, mockRes);

      expect(controller.service.createLocation).toHaveBeenCalledWith(
        locationData,
        'org-123',
        'user-456'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: createdLocation
      });
    });

    it('should handle validation errors with 400', async () => {
      const error = new Error('Validation failed');
      mockReq.body = {};
      controller.service.createLocation.mockRejectedValue(error);

      await controller.createLocation(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed'
      });
    });
  });

  describe('getLocation', () => {
    it('should get location by id', async () => {
      mockReq.params = { id: 'loc-123' };
      const location = { id: 'loc-123', code: 'LOC001', name: 'Main Office' };
      controller.service.getLocation.mockResolvedValue(location);

      await controller.getLocation(mockReq, mockRes);

      expect(controller.service.getLocation).toHaveBeenCalledWith('loc-123', 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: location
      });
    });

    it('should return 404 when location not found', async () => {
      mockReq.params = { id: 'loc-999' };
      const error = new Error('Location not found');
      controller.service.getLocation.mockRejectedValue(error);

      await controller.getLocation(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Location not found'
      });
    });

    it('should return 500 for other errors', async () => {
      mockReq.params = { id: 'loc-123' };
      const error = new Error('Database error');
      controller.service.getLocation.mockRejectedValue(error);

      await controller.getLocation(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('updateLocation', () => {
    it('should update location', async () => {
      mockReq.params = { id: 'loc-123' };
      mockReq.body = { name: 'Updated Office' };
      const updatedLocation = { id: 'loc-123', name: 'Updated Office' };
      controller.service.updateLocation.mockResolvedValue(updatedLocation);

      await controller.updateLocation(mockReq, mockRes);

      expect(controller.service.updateLocation).toHaveBeenCalledWith(
        'loc-123',
        { name: 'Updated Office' },
        'org-123',
        'user-456'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: updatedLocation
      });
    });

    it('should return 404 when location not found', async () => {
      mockReq.params = { id: 'loc-999' };
      mockReq.body = { name: 'Updated Office' };
      const error = new Error('Location not found');
      controller.service.updateLocation.mockRejectedValue(error);

      await controller.updateLocation(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Location not found'
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.params = { id: 'loc-123' };
      mockReq.body = { invalid: 'data' };
      const error = new Error('Validation failed');
      controller.service.updateLocation.mockRejectedValue(error);

      await controller.updateLocation(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteLocation', () => {
    it('should delete location', async () => {
      mockReq.params = { id: 'loc-123' };
      controller.service.deleteLocation.mockResolvedValue();

      await controller.deleteLocation(mockReq, mockRes);

      expect(controller.service.deleteLocation).toHaveBeenCalledWith(
        'loc-123',
        'org-123',
        'user-456'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Location deleted successfully'
      });
    });

    it('should return 404 when location not found', async () => {
      mockReq.params = { id: 'loc-999' };
      const error = new Error('Location not found');
      controller.service.deleteLocation.mockRejectedValue(error);

      await controller.deleteLocation(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Location not found'
      });
    });
  });

  describe('getLocations', () => {
    it('should get locations with default pagination', async () => {
      const locations = [
        { id: 'loc-1', name: 'Office 1' },
        { id: 'loc-2', name: 'Office 2' }
      ];
      const result = {
        locations,
        total: 2,
        limit: 50,
        offset: 0
      };

      controller.service.listLocations.mockResolvedValue(result);

      await controller.getLocations(mockReq, mockRes);

      expect(controller.service.listLocations).toHaveBeenCalledWith(
        {},
        'org-123',
        { limit: 50, offset: 0 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: locations,
        total: 2,
        limit: 50,
        offset: 0
      });
    });

    it('should get locations with type filter and custom pagination', async () => {
      mockReq.query = { type: 'office', limit: '20', offset: '10' };
      const locations = [{ id: 'loc-1', name: 'Office 1', type: 'office' }];
      const result = {
        locations,
        total: 1,
        limit: 20,
        offset: 10
      };

      controller.service.listLocations.mockResolvedValue(result);

      await controller.getLocations(mockReq, mockRes);

      expect(controller.service.listLocations).toHaveBeenCalledWith(
        { type: 'office' },
        'org-123',
        { limit: 20, offset: 10 }
      );
    });

    it('should get locations with isActive filter', async () => {
      mockReq.query = { isActive: 'true' };
      const locations = [{ id: 'loc-1', name: 'Office 1', isActive: true }];
      const result = {
        locations,
        total: 1,
        limit: 50,
        offset: 0
      };

      controller.service.listLocations.mockResolvedValue(result);

      await controller.getLocations(mockReq, mockRes);

      expect(controller.service.listLocations).toHaveBeenCalledWith(
        { isActive: true },
        'org-123',
        { limit: 50, offset: 0 }
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      controller.service.listLocations.mockRejectedValue(error);

      await controller.getLocations(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getLocationByCode', () => {
    it('should get location by code', async () => {
      mockReq.params = { code: 'LOC001' };
      const location = { id: 'loc-123', code: 'LOC001', name: 'Main Office' };
      controller.service.getLocationByCode.mockResolvedValue(location);

      await controller.getLocationByCode(mockReq, mockRes);

      expect(controller.service.getLocationByCode).toHaveBeenCalledWith('LOC001', 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: location
      });
    });

    it('should return 404 when location not found', async () => {
      mockReq.params = { code: 'LOC999' };
      const error = new Error('Location not found');
      controller.service.getLocationByCode.mockRejectedValue(error);

      await controller.getLocationByCode(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getLocationStats', () => {
    it('should get location statistics', async () => {
      mockReq.params = { id: 'loc-123' };
      const stats = {
        employeeCount: 50,
        departmentCount: 5,
        activeCount: 48
      };
      controller.service.getLocationStats.mockResolvedValue(stats);

      await controller.getLocationStats(mockReq, mockRes);

      expect(controller.service.getLocationStats).toHaveBeenCalledWith('loc-123', 'org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: stats
      });
    });

    it('should return 404 when location not found', async () => {
      mockReq.params = { id: 'loc-999' };
      const error = new Error('Location not found');
      controller.service.getLocationStats.mockRejectedValue(error);

      await controller.getLocationStats(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 for other errors', async () => {
      mockReq.params = { id: 'loc-123' };
      const error = new Error('Database error');
      controller.service.getLocationStats.mockRejectedValue(error);

      await controller.getLocationStats(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllLocationStats', () => {
    it('should get all location statistics', async () => {
      const stats = {
        totalLocations: 10,
        activeLocations: 8,
        totalEmployees: 500,
        byType: { office: 5, warehouse: 3, remote: 2 }
      };
      controller.service.getAllLocationStats.mockResolvedValue(stats);

      await controller.getAllLocationStats(mockReq, mockRes);

      expect(controller.service.getAllLocationStats).toHaveBeenCalledWith('org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: stats
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      controller.service.getAllLocationStats.mockRejectedValue(error);

      await controller.getAllLocationStats(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
