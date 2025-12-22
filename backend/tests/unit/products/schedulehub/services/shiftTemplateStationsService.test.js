import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ShiftTemplateStationsService from '../../../../../src/products/schedulehub/services/ShiftTemplateStationsService.js';
import ShiftTemplateStationsRepository from '../../../../../src/products/schedulehub/repositories/ShiftTemplateStationsRepository.js';
import { ValidationError, NotFoundError } from '../../../../../src/utils/errors.js';
import logger from '../../../../../src/utils/logger.js';

// Mock the repository and logger
jest.mock('../../../../../src/products/schedulehub/repositories/ShiftTemplateStationsRepository.js');
jest.mock('../../../../../src/utils/logger.js');

describe('ShiftTemplateStationsService', () => {
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
      assignStation: jest.fn(),
      unassignStation: jest.fn(),
      getStationsForTemplate: jest.fn(),
      getTemplatesForStation: jest.fn(),
      bulkAssignStations: jest.fn(),
      updateTemplateStations: jest.fn(),
      removeAllStations: jest.fn(),
      isStationAssigned: jest.fn()
    };

    // Create service with mocked repository
    service = new ShiftTemplateStationsService(mockRepository);

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
    name: 'Security Station',
    description: 'Main security checkpoint',
    location: 'Building B, Entrance',
    is_active: true,
    organization_id: testOrganizationId,
    created_by: testUserId,
    created_at: new Date(),
    ...overrides
  });

  const createDbTemplate = (overrides = {}) => ({
    id: testTemplateId,
    name: 'Night Shift Template',
    start_time: '22:00',
    end_time: '06:00',
    organization_id: testOrganizationId,
    created_by: testUserId,
    created_at: new Date(),
    ...overrides
  });

  describe('assignStation', () => {
    it('should assign station to template successfully', async () => {
      // Arrange
      const assignmentData = {
        templateId: testTemplateId,
        stationId: testStationId
      };

      const mockAssignment = createDbAssignment();
      mockRepository.assignStation.mockResolvedValue(mockAssignment);

      // Act
      const result = await service.assignStation(assignmentData, testOrganizationId, testUserId);

      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.assignStation).toHaveBeenCalledWith(
        testTemplateId,
        testStationId,
        testOrganizationId,
        testUserId
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

    it('should throw ValidationError for missing templateId', async () => {
      // Arrange
      const incompleteData = {
        stationId: testStationId
      };

      // Act & Assert
      await expect(
        service.assignStation(incompleteData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing stationId', async () => {
      // Arrange
      const incompleteData = {
        templateId: testTemplateId
      };

      // Act & Assert
      await expect(
        service.assignStation(incompleteData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should log successful assignment', async () => {
      // Arrange
      const assignmentData = {
        templateId: testTemplateId,
        stationId: testStationId
      };

      const mockAssignment = createDbAssignment();
      mockRepository.assignStation.mockResolvedValue(mockAssignment);

      // Act
      await service.assignStation(assignmentData, testOrganizationId, testUserId);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        'Station assigned to template successfully',
        expect.objectContaining({
          templateId: testTemplateId,
          stationId: testStationId,
          organizationId: testOrganizationId,
          userId: testUserId
        })
      );
    });
  });

  describe('unassignStation', () => {
    it('should unassign station from template successfully', async () => {
      // Arrange
      const unassignData = {
        templateId: testTemplateId,
        stationId: testStationId
      };

      mockRepository.unassignStation.mockResolvedValue({ affectedRows: 1 });

      // Act
      const result = await service.unassignStation(unassignData, testOrganizationId, testUserId);

      // Assert
      expect(result).toEqual({ success: true });
      expect(mockRepository.unassignStation).toHaveBeenCalledWith(
        testTemplateId,
        testStationId,
        testOrganizationId,
        testUserId
      );
    });

    it('should throw NotFoundError when assignment does not exist', async () => {
      // Arrange
      const unassignData = {
        templateId: testTemplateId,
        stationId: testStationId
      };

      mockRepository.unassignStation.mockResolvedValue({ affectedRows: 0 });

      // Act & Assert
      await expect(
        service.unassignStation(unassignData, testOrganizationId, testUserId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for invalid templateId', async () => {
      // Arrange
      const invalidData = {
        templateId: 'not-a-uuid',
        stationId: testStationId
      };

      // Act & Assert
      await expect(
        service.unassignStation(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid stationId', async () => {
      // Arrange
      const invalidData = {
        templateId: testTemplateId,
        stationId: 'not-a-uuid'
      };

      // Act & Assert
      await expect(
        service.unassignStation(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should log successful unassignment', async () => {
      // Arrange
      const unassignData = {
        templateId: testTemplateId,
        stationId: testStationId
      };

      mockRepository.unassignStation.mockResolvedValue({ affectedRows: 1 });

      // Act
      await service.unassignStation(unassignData, testOrganizationId, testUserId);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        'Station unassigned from template successfully',
        expect.objectContaining({
          templateId: testTemplateId,
          stationId: testStationId,
          organizationId: testOrganizationId,
          userId: testUserId
        })
      );
    });
  });

  describe('getStationsForTemplate', () => {
    it('should return stations assigned to template', async () => {
      // Arrange
      const mockStations = [
        createDbStation({ id: testStationId }),
        createDbStation({ id: testStationId2, name: 'Loading Dock' })
      ];

      mockRepository.getStationsForTemplate.mockResolvedValue(mockStations);

      // Act
      const result = await service.getStationsForTemplate(testTemplateId, testOrganizationId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Security Station');
      expect(result[1].name).toBe('Loading Dock');
      expect(mockRepository.getStationsForTemplate).toHaveBeenCalledWith(
        testTemplateId,
        testOrganizationId
      );
    });

    it('should return empty array when no stations assigned', async () => {
      // Arrange
      mockRepository.getStationsForTemplate.mockResolvedValue([]);

      // Act
      const result = await service.getStationsForTemplate(testTemplateId, testOrganizationId);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      mockRepository.getStationsForTemplate.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.getStationsForTemplate(testTemplateId, testOrganizationId)
      ).rejects.toThrow('Database query failed');
    });
  });

  describe('getTemplatesForStation', () => {
    it('should return templates that include station', async () => {
      // Arrange
      const mockTemplates = [
        createDbTemplate({ id: testTemplateId }),
        createDbTemplate({ 
          id: '723e4567-e89b-12d3-a456-426614174006',
          name: 'Morning Shift Template',
          start_time: '06:00',
          end_time: '14:00'
        })
      ];

      mockRepository.getTemplatesForStation.mockResolvedValue(mockTemplates);

      // Act
      const result = await service.getTemplatesForStation(testStationId, testOrganizationId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Night Shift Template');
      expect(result[1].name).toBe('Morning Shift Template');
      expect(mockRepository.getTemplatesForStation).toHaveBeenCalledWith(
        testStationId,
        testOrganizationId
      );
    });

    it('should return empty array when station not assigned to any templates', async () => {
      // Arrange
      mockRepository.getTemplatesForStation.mockResolvedValue([]);

      // Act
      const result = await service.getTemplatesForStation(testStationId, testOrganizationId);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const queryError = new Error('Query execution failed');
      mockRepository.getTemplatesForStation.mockRejectedValue(queryError);

      // Act & Assert
      await expect(
        service.getTemplatesForStation(testStationId, testOrganizationId)
      ).rejects.toThrow('Query execution failed');
    });
  });

  describe('bulkAssignStations', () => {
    it('should assign multiple stations to template successfully', async () => {
      // Arrange
      const bulkData = {
        templateId: testTemplateId,
        stationIds: [testStationId, testStationId2]
      };

      const mockAssignments = [
        createDbAssignment({ station_id: testStationId }),
        createDbAssignment({ station_id: testStationId2 })
      ];

      mockRepository.bulkAssignStations.mockResolvedValue(mockAssignments);

      // Act
      const result = await service.bulkAssignStations(bulkData, testOrganizationId, testUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockRepository.bulkAssignStations).toHaveBeenCalledWith(
        testTemplateId,
        [testStationId, testStationId2],
        testOrganizationId,
        testUserId
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

    it('should throw ValidationError for too many stations', async () => {
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

    it('should throw ValidationError for invalid UUID in stationIds', async () => {
      // Arrange
      const invalidData = {
        templateId: testTemplateId,
        stationIds: [testStationId, 'invalid-station-id']
      };

      // Act & Assert
      await expect(
        service.bulkAssignStations(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should log successful bulk assignment', async () => {
      // Arrange
      const bulkData = {
        templateId: testTemplateId,
        stationIds: [testStationId, testStationId2]
      };

      const mockAssignments = [
        createDbAssignment({ station_id: testStationId }),
        createDbAssignment({ station_id: testStationId2 })
      ];

      mockRepository.bulkAssignStations.mockResolvedValue(mockAssignments);

      // Act
      await service.bulkAssignStations(bulkData, testOrganizationId, testUserId);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        'Bulk station assignment completed successfully',
        expect.objectContaining({
          templateId: testTemplateId,
          stationCount: 2,
          organizationId: testOrganizationId,
          userId: testUserId
        })
      );
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

      mockRepository.updateTemplateStations.mockResolvedValue(mockAssignments);

      // Act
      const result = await service.updateTemplateStations(updateData, testOrganizationId, testUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockRepository.updateTemplateStations).toHaveBeenCalledWith(
        testTemplateId,
        [testStationId, testStationId2],
        testOrganizationId,
        testUserId
      );
    });

    it('should allow empty stationIds array to remove all stations', async () => {
      // Arrange
      const updateData = {
        templateId: testTemplateId,
        stationIds: []
      };

      mockRepository.updateTemplateStations.mockResolvedValue([]);

      // Act
      const result = await service.updateTemplateStations(updateData, testOrganizationId, testUserId);

      // Assert
      expect(result).toHaveLength(0);
      expect(mockRepository.updateTemplateStations).toHaveBeenCalledWith(
        testTemplateId,
        [],
        testOrganizationId,
        testUserId
      );
    });

    it('should throw ValidationError for invalid templateId', async () => {
      // Arrange
      const invalidData = {
        templateId: 'not-valid-uuid',
        stationIds: [testStationId]
      };

      // Act & Assert
      await expect(
        service.updateTemplateStations(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when exceeding maximum station limit', async () => {
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

    it('should log successful template stations update', async () => {
      // Arrange
      const updateData = {
        templateId: testTemplateId,
        stationIds: [testStationId]
      };

      const mockAssignments = [createDbAssignment()];
      mockRepository.updateTemplateStations.mockResolvedValue(mockAssignments);

      // Act
      await service.updateTemplateStations(updateData, testOrganizationId, testUserId);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        'Template stations updated successfully',
        expect.objectContaining({
          templateId: testTemplateId,
          stationCount: 1,
          organizationId: testOrganizationId,
          userId: testUserId
        })
      );
    });
  });

  describe('removeAllStations', () => {
    it('should remove all stations from template successfully', async () => {
      // Arrange
      mockRepository.removeAllStations.mockResolvedValue({ affectedRows: 4 });

      // Act
      const result = await service.removeAllStations(testTemplateId, testOrganizationId, testUserId);

      // Assert
      expect(result).toEqual({ success: true, removedCount: 4 });
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

    it('should handle repository errors', async () => {
      // Arrange
      const dbError = new Error('Failed to remove stations');
      mockRepository.removeAllStations.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        service.removeAllStations(testTemplateId, testOrganizationId, testUserId)
      ).rejects.toThrow('Failed to remove stations');
    });

    it('should log successful removal of all stations', async () => {
      // Arrange
      mockRepository.removeAllStations.mockResolvedValue({ affectedRows: 3 });

      // Act
      await service.removeAllStations(testTemplateId, testOrganizationId, testUserId);

      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        'All stations removed from template successfully',
        expect.objectContaining({
          templateId: testTemplateId,
          removedCount: 3,
          organizationId: testOrganizationId,
          userId: testUserId
        })
      );
    });
  });

  describe('isStationAssigned', () => {
    it('should return true when station is assigned to template', async () => {
      // Arrange
      mockRepository.isStationAssigned.mockResolvedValue(true);

      // Act
      const result = await service.isStationAssigned(testTemplateId, testStationId, testOrganizationId);

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.isStationAssigned).toHaveBeenCalledWith(
        testTemplateId,
        testStationId,
        testOrganizationId
      );
    });

    it('should return false when station is not assigned to template', async () => {
      // Arrange
      mockRepository.isStationAssigned.mockResolvedValue(false);

      // Act
      const result = await service.isStationAssigned(testTemplateId, testStationId, testOrganizationId);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle repository errors', async () => {
      // Arrange
      const checkError = new Error('Assignment check failed');
      mockRepository.isStationAssigned.mockRejectedValue(checkError);

      // Act & Assert
      await expect(
        service.isStationAssigned(testTemplateId, testStationId, testOrganizationId)
      ).rejects.toThrow('Assignment check failed');
    });
  });
});