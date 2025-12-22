import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ShiftTemplateStationService from '../../../../../src/products/schedulehub/services/ShiftTemplateStationService.js';
import ShiftTemplateStationRepository from '../../../../../src/products/schedulehub/repositories/ShiftTemplateStationRepository.js';
import { ValidationError, NotFoundError, ConflictError } from '../../../../../src/utils/errors.js';
import logger from '../../../../../src/utils/logger.js';

// Mock the repository and logger
jest.mock('../../../../../src/products/schedulehub/repositories/ShiftTemplateStationRepository.js');
jest.mock('../../../../../src/utils/logger.js');

describe('ShiftTemplateStationService', () => {
  let service;
  let mockRepository;
  let consoleErrorSpy;

  // Test constants - valid UUID v4 format
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testTemplateId = '323e4567-e89b-12d3-a456-426614174002';
  const testStationId = '423e4567-e89b-12d3-a456-426614174003';
  const testStationId2 = '523e4567-e89b-12d3-a456-426614174004';

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      findAssignment: jest.fn(),
      assignStation: jest.fn(),
      assignStations: jest.fn(),
      getStationsByTemplate: jest.fn(),
      getTemplatesByStation: jest.fn(),
      removeStation: jest.fn(),
      removeAllStations: jest.fn(),
      isAssigned: jest.fn(),
      countAssignments: jest.fn(),
      replaceStations: jest.fn()
    };

    // Create service with mocked repository
    service = new ShiftTemplateStationService(mockRepository);

    // Mock console.error to avoid noise in test output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  // Helper functions for test data
  const createDbAssignment = (overrides = {}) => ({
    id: '623e4567-e89b-12d3-a456-426614174005',
    shift_template_id: testTemplateId,
    station_id: testStationId,
    organization_id: testOrganizationId,
    created_by: testUserId,
    created_at: new Date(),
    ...overrides
  });

  const createDbStation = (overrides = {}) => ({
    id: testStationId,
    name: 'Reception',
    description: 'Main reception desk',
    location: 'Building A, Floor 1',
    is_active: true,
    organization_id: testOrganizationId,
    created_by: testUserId,
    created_at: new Date(),
    ...overrides
  });

  describe('assignStation', () => {
    it('should assign a station to a template successfully', async () => {
      // Arrange
      const assignmentData = {
        templateId: testTemplateId,
        stationId: testStationId
      };

      const mockAssignment = createDbAssignment();
      mockRepository.findAssignment.mockResolvedValue(null); // Not already assigned
      mockRepository.assignStation.mockResolvedValue(mockAssignment);

      // Act
      const result = await service.assignStation(assignmentData, testOrganizationId, testUserId);

      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.findAssignment).toHaveBeenCalledWith(
        testTemplateId,
        testStationId,
        testOrganizationId
      );
      expect(mockRepository.assignStation).toHaveBeenCalledWith(
        testTemplateId,
        testStationId,
        testOrganizationId,
        testUserId,
        null
      );
    });

    it('should throw ValidationError for invalid templateId', async () => {
      // Arrange
      const invalidData = {
        templateId: 'invalid-uuid',
        stationId: testStationId
      };

      // Act & Assert
      await expect(
        service.assignStation(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid stationId', async () => {
      // Arrange
      const invalidData = {
        templateId: testTemplateId,
        stationId: 'invalid-uuid'
      };

      // Act & Assert
      await expect(
        service.assignStation(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError when station already assigned to template', async () => {
      // Arrange
      const assignmentData = {
        templateId: testTemplateId,
        stationId: testStationId
      };

      const existingAssignment = createDbAssignment();
      mockRepository.findAssignment.mockResolvedValue(existingAssignment);

      // Act & Assert
      await expect(
        service.assignStation(assignmentData, testOrganizationId, testUserId)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ValidationError for missing required fields', async () => {
      // Arrange
      const incompleteData = {
        templateId: testTemplateId
        // Missing stationId
      };

      // Act & Assert
      await expect(
        service.assignStation(incompleteData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('bulkAssignStations', () => {
    it('should bulk assign multiple stations to a template', async () => {
      // Arrange
      const bulkData = {
        templateId: testTemplateId,
        stationIds: [testStationId, testStationId2]
      };

      const mockAssignments = [
        createDbAssignment({ station_id: testStationId }),
        createDbAssignment({ station_id: testStationId2 })
      ];

      mockRepository.assignStations.mockResolvedValue(mockAssignments);

      // Act
      const result = await service.bulkAssignStations(bulkData, testOrganizationId, testUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockRepository.assignStations).toHaveBeenCalledWith(
        testTemplateId,
        [testStationId, testStationId2],
        testOrganizationId,
        testUserId,
        null
      );
    });

    it('should throw ValidationError for empty stationIds array', async () => {
      // Arrange
      const invalidData = {
        templateId: testTemplateId,
        stationIds: []
      };

      // Act & Assert
      await expect(
        service.bulkAssignStations(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for too many stationIds', async () => {
      // Arrange
      const tooManyStations = Array.from({ length: 51 }, (_, i) => 
        `${i.toString().padStart(8, '0')}-e89b-12d3-a456-426614174000`
      );
      const invalidData = {
        templateId: testTemplateId,
        stationIds: tooManyStations
      };

      // Act & Assert
      await expect(
        service.bulkAssignStations(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for duplicate stationIds', async () => {
      // Arrange
      const invalidData = {
        templateId: testTemplateId,
        stationIds: [testStationId, testStationId] // Duplicate
      };

      // Act & Assert
      await expect(
        service.bulkAssignStations(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid UUID in stationIds array', async () => {
      // Arrange
      const invalidData = {
        templateId: testTemplateId,
        stationIds: [testStationId, 'invalid-uuid']
      };

      // Act & Assert
      await expect(
        service.bulkAssignStations(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateTemplateStations', () => {
    it('should update template stations by replacing all assignments', async () => {
      // Arrange
      const updateData = {
        templateId: testTemplateId,
        stationIds: [testStationId, testStationId2]
      };

      const mockAssignments = [
        createDbAssignment({ station_id: testStationId }),
        createDbAssignment({ station_id: testStationId2 })
      ];

      mockRepository.replaceStations.mockResolvedValue(mockAssignments);

      // Act
      const result = await service.updateTemplateStations(updateData, testOrganizationId, testUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockRepository.replaceStations).toHaveBeenCalledWith(
        testTemplateId,
        [testStationId, testStationId2],
        testOrganizationId,
        testUserId,
        null
      );
    });

    it('should allow empty stationIds to remove all assignments', async () => {
      // Arrange
      const updateData = {
        templateId: testTemplateId,
        stationIds: []
      };

      mockRepository.replaceStations.mockResolvedValue([]);

      // Act
      const result = await service.updateTemplateStations(updateData, testOrganizationId, testUserId);

      // Assert
      expect(result).toHaveLength(0);
      expect(mockRepository.replaceStations).toHaveBeenCalledWith(
        testTemplateId,
        [],
        testOrganizationId,
        testUserId,
        null
      );
    });

    it('should throw ValidationError for invalid templateId', async () => {
      // Arrange
      const invalidData = {
        templateId: 'invalid-uuid',
        stationIds: [testStationId]
      };

      // Act & Assert
      await expect(
        service.updateTemplateStations(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when stationIds exceed maximum limit', async () => {
      // Arrange
      const tooManyStations = Array.from({ length: 51 }, (_, i) => 
        `${i.toString().padStart(8, '0')}-e89b-12d3-a456-426614174000`
      );
      const invalidData = {
        templateId: testTemplateId,
        stationIds: tooManyStations
      };

      // Act & Assert
      await expect(
        service.updateTemplateStations(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getStationsByTemplate', () => {
    it('should return stations assigned to a template', async () => {
      // Arrange
      const mockStations = [
        createDbStation({ id: testStationId }),
        createDbStation({ id: testStationId2, name: 'Security Desk' })
      ];

      mockRepository.getStationsByTemplate.mockResolvedValue(mockStations);

      // Act
      const result = await service.getStationsByTemplate(testTemplateId, testOrganizationId);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockRepository.getStationsByTemplate).toHaveBeenCalledWith(
        testTemplateId,
        testOrganizationId
      );
    });

    it('should return empty array when no stations assigned', async () => {
      // Arrange
      mockRepository.getStationsByTemplate.mockResolvedValue([]);

      // Act
      const result = await service.getStationsByTemplate(testTemplateId, testOrganizationId);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const dbError = new Error('Database error');
      mockRepository.getStationsByTemplate.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.getStationsByTemplate(testTemplateId, testOrganizationId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getTemplatesByStation', () => {
    it('should return templates that include a station', async () => {
      // Arrange
      const mockTemplates = [
        {
          id: testTemplateId,
          name: 'Morning Shift',
          start_time: '08:00',
          end_time: '16:00',
          organization_id: testOrganizationId,
          created_at: new Date()
        }
      ];

      mockRepository.getTemplatesByStation.mockResolvedValue(mockTemplates);

      // Act
      const result = await service.getTemplatesByStation(testStationId, testOrganizationId);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockRepository.getTemplatesByStation).toHaveBeenCalledWith(
        testStationId,
        testOrganizationId
      );
    });

    it('should return empty array when station not assigned to any templates', async () => {
      // Arrange
      mockRepository.getTemplatesByStation.mockResolvedValue([]);

      // Act
      const result = await service.getTemplatesByStation(testStationId, testOrganizationId);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('removeStation', () => {
    it('should remove station from template successfully', async () => {
      // Arrange
      const mockAssignment = createDbAssignment();
      mockRepository.findAssignment.mockResolvedValue(mockAssignment);
      mockRepository.removeStation.mockResolvedValue({ affectedRows: 1 });

      // Act
      const result = await service.removeStation(testTemplateId, testStationId, testOrganizationId, testUserId);

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockRepository.findAssignment).toHaveBeenCalledWith(
        testTemplateId,
        testStationId,
        testOrganizationId
      );
      expect(mockRepository.removeStation).toHaveBeenCalledWith(
        testTemplateId,
        testStationId,
        testOrganizationId,
        testUserId
      );
    });

    it('should throw NotFoundError when assignment does not exist', async () => {
      // Arrange
      mockRepository.findAssignment.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removeStation(testTemplateId, testStationId, testOrganizationId, testUserId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should log successful removal', async () => {
      // Arrange
      const mockAssignment = createDbAssignment();
      mockRepository.findAssignment.mockResolvedValue(mockAssignment);
      mockRepository.removeStation.mockResolvedValue({ affectedRows: 1 });

      // Act
      await service.removeStation(testTemplateId, testStationId, testOrganizationId, testUserId);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        'Station removed from template successfully',
        expect.objectContaining({
          templateId: testTemplateId,
          stationId: testStationId,
          organizationId: testOrganizationId,
          userId: testUserId
        })
      );
    });
  });

  describe('removeAllStations', () => {
    it('should remove all stations from template successfully', async () => {
      // Arrange
      mockRepository.removeAllStations.mockResolvedValue({ affectedRows: 3 });

      // Act
      const result = await service.removeAllStations(testTemplateId, testOrganizationId, testUserId);

      // Assert
      expect(result).toEqual({ success: true, removedCount: 3 });
      expect(mockRepository.removeAllStations).toHaveBeenCalledWith(
        testTemplateId,
        testOrganizationId,
        testUserId
      );
    });

    it('should return zero count when no stations were assigned', async () => {
      // Arrange
      mockRepository.removeAllStations.mockResolvedValue({ affectedRows: 0 });

      // Act
      const result = await service.removeAllStations(testTemplateId, testOrganizationId, testUserId);

      // Assert
      expect(result).toEqual({ success: true, removedCount: 0 });
    });

    it('should log successful bulk removal', async () => {
      // Arrange
      mockRepository.removeAllStations.mockResolvedValue({ affectedRows: 2 });

      // Act
      await service.removeAllStations(testTemplateId, testOrganizationId, testUserId);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        'All stations removed from template successfully',
        expect.objectContaining({
          templateId: testTemplateId,
          organizationId: testOrganizationId,
          userId: testUserId,
          removedCount: 2
        })
      );
    });
  });

  describe('isStationAssigned', () => {
    it('should return true when station is assigned to template', async () => {
      // Arrange
      mockRepository.isAssigned.mockResolvedValue(true);

      // Act
      const result = await service.isStationAssigned(testTemplateId, testStationId, testOrganizationId);

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.isAssigned).toHaveBeenCalledWith(
        testTemplateId,
        testStationId,
        testOrganizationId
      );
    });

    it('should return false when station is not assigned to template', async () => {
      // Arrange
      mockRepository.isAssigned.mockResolvedValue(false);

      // Act
      const result = await service.isStationAssigned(testTemplateId, testStationId, testOrganizationId);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockRepository.isAssigned.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.isStationAssigned(testTemplateId, testStationId, testOrganizationId)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getAssignmentCount', () => {
    it('should return the number of stations assigned to template', async () => {
      // Arrange
      mockRepository.countAssignments.mockResolvedValue(5);

      // Act
      const result = await service.getAssignmentCount(testTemplateId, testOrganizationId);

      // Assert
      expect(result).toBe(5);
      expect(mockRepository.countAssignments).toHaveBeenCalledWith(
        testTemplateId,
        testOrganizationId
      );
    });

    it('should return zero when no stations assigned', async () => {
      // Arrange
      mockRepository.countAssignments.mockResolvedValue(0);

      // Act
      const result = await service.getAssignmentCount(testTemplateId, testOrganizationId);

      // Assert
      expect(result).toBe(0);
    });

    it('should handle repository counting errors', async () => {
      // Arrange
      const countError = new Error('Count query failed');
      mockRepository.countAssignments.mockRejectedValue(countError);

      // Act & Assert
      await expect(
        service.getAssignmentCount(testTemplateId, testOrganizationId)
      ).rejects.toThrow('Count query failed');
    });
  });
});