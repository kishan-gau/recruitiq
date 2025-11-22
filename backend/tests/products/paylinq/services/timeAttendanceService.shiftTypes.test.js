/**
 * @jest-environment node
 * @group unit
 * @group paylinq
 * @group paylinq-services
 * @group shift-types
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import TimeAttendanceService from '../../../../src/products/paylinq/services/timeAttendanceService.js';
import { ValidationError, NotFoundError, ConflictError } from '../../../../src/middleware/errorHandler.js';

jest.mock('../../../../src/utils/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('TimeAttendanceService - Shift Types', () => {
  let service;
  let mockRepository;
  const orgId = '123e4567-e89b-12d3-a456-426614174001';
  const userId = '123e4567-e89b-12d3-a456-426614174002';
  const shiftTypeId = '123e4567-e89b-12d3-a456-426614174003';

  // Helper to create DB format shift type data (snake_case)
  const createDbShiftType = (overrides = {}) => ({
    id: shiftTypeId,
    organization_id: orgId,
    shift_name: 'Morning Shift',
    shift_code: 'MORNING',
    start_time: '08:00',
    end_time: '16:00',
    duration_hours: 8.0,
    is_overnight: false,
    break_duration_minutes: 60,
    is_paid_break: false,
    shift_differential_rate: null,
    description: 'Standard morning shift',
    status: 'active',
    created_at: new Date(),
    updated_at: null,
    deleted_at: null,
    created_by: userId,
    updated_by: null,
    deleted_by: null,
    ...overrides
  });

  // Helper to create API format shift type data (camelCase)
  const createApiShiftType = (overrides = {}) => ({
    shiftName: 'Morning Shift',
    shiftCode: 'MORNING',
    startTime: '08:00',
    endTime: '16:00',
    durationHours: 8.0,
    isOvernight: false,
    breakDurationMinutes: 60,
    isPaidBreak: false,
    shiftDifferentialRate: null,
    description: 'Standard morning shift',
    ...overrides
  });

  beforeEach(() => {
    // Create mock repository with all shift type methods
    mockRepository = {
      createShiftType: jest.fn(),
      findShiftTypes: jest.fn(),
      findShiftTypeById: jest.fn(),
      updateShiftType: jest.fn(),
      deleteShiftType: jest.fn(),
    };

    // Inject mock repository
    service = new TimeAttendanceService();
    service.timeAttendanceRepository = mockRepository;
  });

  describe('createShiftType', () => {
    it('should create a shift type with valid data', async () => {
      // Arrange
      const validData = createApiShiftType();
      const dbShiftType = createDbShiftType();
      mockRepository.createShiftType.mockResolvedValue(dbShiftType);

      // Act
      const result = await service.createShiftType(validData, orgId, userId);

      // Assert
      expect(result).toEqual(dbShiftType);
      expect(mockRepository.createShiftType).toHaveBeenCalledWith(
        expect.objectContaining({
          shiftName: validData.shiftName,
          shiftCode: validData.shiftCode,
          startTime: validData.startTime,
          endTime: validData.endTime,
          durationHours: validData.durationHours,
        }),
        orgId,
        userId
      );
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidData = {
        shiftName: 'Morning',
        // Missing required fields: shiftCode, startTime, endTime, durationHours
      };

      // Act & Assert
      await expect(
        service.createShiftType(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate shift name minimum length', async () => {
      // Arrange
      const invalidData = createApiShiftType({
        shiftName: 'A', // Too short (min 2)
      });

      // Act & Assert
      await expect(
        service.createShiftType(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate shift name maximum length', async () => {
      // Arrange
      const invalidData = createApiShiftType({
        shiftName: 'A'.repeat(101), // Too long (max 100)
      });

      // Act & Assert
      await expect(
        service.createShiftType(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate shift code format', async () => {
      // Arrange
      const invalidData = createApiShiftType({
        shiftCode: 'A', // Too short (min 2)
      });

      // Act & Assert
      await expect(
        service.createShiftType(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate time format for startTime', async () => {
      // Arrange
      const invalidData = createApiShiftType({
        startTime: '25:00', // Invalid hour
      });

      // Act & Assert
      await expect(
        service.createShiftType(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate time format for endTime', async () => {
      // Arrange
      const invalidData = createApiShiftType({
        endTime: '8:00', // Missing leading zero
      });

      // Act & Assert
      await expect(
        service.createShiftType(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate durationHours range', async () => {
      // Arrange
      const invalidData = createApiShiftType({
        durationHours: 25, // Exceeds max 24
      });

      // Act & Assert
      await expect(
        service.createShiftType(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate negative durationHours', async () => {
      // Arrange
      const invalidData = createApiShiftType({
        durationHours: -1, // Cannot be negative
      });

      // Act & Assert
      await expect(
        service.createShiftType(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should apply default values for optional fields', async () => {
      // Arrange
      const minimalData = {
        shiftName: 'Evening Shift',
        shiftCode: 'EVENING',
        startTime: '16:00',
        endTime: '00:00',
        durationHours: 8.0,
      };
      const dbShiftType = createDbShiftType();
      mockRepository.createShiftType.mockResolvedValue(dbShiftType);

      // Act
      await service.createShiftType(minimalData, orgId, userId);

      // Assert - defaults should be applied
      expect(mockRepository.createShiftType).toHaveBeenCalledWith(
        expect.objectContaining({
          isOvernight: false,
          breakDurationMinutes: 0,
          isPaidBreak: false,
        }),
        orgId,
        userId
      );
    });

    it('should handle overnight shifts', async () => {
      // Arrange
      const overnightData = createApiShiftType({
        shiftName: 'Night Shift',
        shiftCode: 'NIGHT',
        startTime: '22:00',
        endTime: '06:00',
        durationHours: 8.0,
        isOvernight: true,
      });
      const dbShiftType = createDbShiftType({
        shift_name: 'Night Shift',
        shift_code: 'NIGHT',
        start_time: '22:00',
        end_time: '06:00',
        duration_hours: 8.0,
        is_overnight: true,
      });
      mockRepository.createShiftType.mockResolvedValue(dbShiftType);

      // Act
      const result = await service.createShiftType(overnightData, orgId, userId);

      // Assert
      expect(result.is_overnight).toBe(true);
      expect(mockRepository.createShiftType).toHaveBeenCalledWith(
        expect.objectContaining({
          isOvernight: true,
        }),
        orgId,
        userId
      );
    });

    it('should handle shift differential rates', async () => {
      // Arrange
      const dataWithDifferential = createApiShiftType({
        shiftDifferentialRate: 1.5, // 50% premium
      });
      const dbShiftType = createDbShiftType({ shift_differential_rate: 1.5 });
      mockRepository.createShiftType.mockResolvedValue(dbShiftType);

      // Act
      const result = await service.createShiftType(dataWithDifferential, orgId, userId);

      // Assert
      expect(result.shift_differential_rate).toBe(1.5);
    });

    it('should handle paid breaks', async () => {
      // Arrange
      const dataWithPaidBreak = createApiShiftType({
        breakDurationMinutes: 30,
        isPaidBreak: true,
      });
      const dbShiftType = createDbShiftType({
        break_duration_minutes: 30,
        is_paid_break: true,
      });
      mockRepository.createShiftType.mockResolvedValue(dbShiftType);

      // Act
      const result = await service.createShiftType(dataWithPaidBreak, orgId, userId);

      // Assert
      expect(result.break_duration_minutes).toBe(30);
      expect(result.is_paid_break).toBe(true);
    });
  });

  describe('getShiftTypes', () => {
    it('should retrieve all active shift types', async () => {
      // Arrange
      const dbShiftTypes = [
        createDbShiftType(),
        createDbShiftType({
          id: 'shift-2',
          shift_name: 'Afternoon Shift',
          shift_code: 'AFTERNOON',
          start_time: '14:00',
          end_time: '22:00',
        }),
      ];
      mockRepository.findShiftTypes.mockResolvedValue(dbShiftTypes);

      // Act
      const result = await service.getShiftTypes(orgId);

      // Assert
      expect(result).toEqual(dbShiftTypes);
      expect(result.length).toBe(2);
      expect(mockRepository.findShiftTypes).toHaveBeenCalledWith(orgId, {});
    });

    it('should filter shift types by status', async () => {
      // Arrange
      const filters = { status: 'active' };
      const dbShiftTypes = [createDbShiftType()];
      mockRepository.findShiftTypes.mockResolvedValue(dbShiftTypes);

      // Act
      const result = await service.getShiftTypes(orgId, filters);

      // Assert
      expect(mockRepository.findShiftTypes).toHaveBeenCalledWith(orgId, filters);
      expect(result).toEqual(dbShiftTypes);
    });

    it('should return empty array when no shift types exist', async () => {
      // Arrange
      mockRepository.findShiftTypes.mockResolvedValue([]);

      // Act
      const result = await service.getShiftTypes(orgId);

      // Assert
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('getShiftTypeById', () => {
    it('should retrieve shift type by ID', async () => {
      // Arrange
      const dbShiftType = createDbShiftType();
      mockRepository.findShiftTypeById.mockResolvedValue(dbShiftType);

      // Act
      const result = await service.getShiftTypeById(shiftTypeId, orgId);

      // Assert
      expect(result).toEqual(dbShiftType);
      expect(mockRepository.findShiftTypeById).toHaveBeenCalledWith(shiftTypeId, orgId);
    });

    it('should throw NotFoundError when shift type does not exist', async () => {
      // Arrange
      mockRepository.findShiftTypeById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getShiftTypeById(shiftTypeId, orgId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should enforce tenant isolation', async () => {
      // Arrange
      const differentOrgId = 'different-org-id';
      mockRepository.findShiftTypeById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getShiftTypeById(shiftTypeId, differentOrgId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateShiftType', () => {
    it('should update shift type with valid data', async () => {
      // Arrange
      const updateData = {
        shiftName: 'Updated Morning Shift',
        description: 'Updated description',
      };
      const existingShiftType = createDbShiftType();
      const updatedShiftType = createDbShiftType({
        shift_name: 'Updated Morning Shift',
        description: 'Updated description',
        updated_at: new Date(),
        updated_by: userId,
      });

      mockRepository.findShiftTypeById.mockResolvedValue(existingShiftType);
      mockRepository.updateShiftType.mockResolvedValue(updatedShiftType);

      // Act
      const result = await service.updateShiftType(shiftTypeId, updateData, orgId, userId);

      // Assert
      expect(result).toEqual(updatedShiftType);
      expect(mockRepository.updateShiftType).toHaveBeenCalledWith(
        shiftTypeId,
        expect.objectContaining({
          shiftName: updateData.shiftName,
          description: updateData.description,
        }),
        orgId,
        userId
      );
    });

    it('should throw NotFoundError when shift type does not exist', async () => {
      // Arrange
      const updateData = { shiftName: 'Updated' };
      mockRepository.findShiftTypeById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateShiftType(shiftTypeId, updateData, orgId, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should validate update data', async () => {
      // Arrange
      const invalidData = {
        startTime: 'invalid-time', // Invalid time format
      };
      const existingShiftType = createDbShiftType();
      mockRepository.findShiftTypeById.mockResolvedValue(existingShiftType);

      // Act & Assert
      await expect(
        service.updateShiftType(shiftTypeId, invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should allow partial updates', async () => {
      // Arrange
      const partialUpdate = {
        description: 'New description only',
      };
      const existingShiftType = createDbShiftType();
      const updatedShiftType = createDbShiftType({
        description: 'New description only',
        updated_at: new Date(),
        updated_by: userId,
      });

      mockRepository.findShiftTypeById.mockResolvedValue(existingShiftType);
      mockRepository.updateShiftType.mockResolvedValue(updatedShiftType);

      // Act
      const result = await service.updateShiftType(shiftTypeId, partialUpdate, orgId, userId);

      // Assert
      expect(result.description).toBe('New description only');
      expect(mockRepository.updateShiftType).toHaveBeenCalled();
    });

    it('should update shift differential rate', async () => {
      // Arrange
      const updateData = {
        shiftDifferentialRate: 2.0, // 100% premium
      };
      const existingShiftType = createDbShiftType();
      const updatedShiftType = createDbShiftType({
        shift_differential_rate: 2.0,
      });

      mockRepository.findShiftTypeById.mockResolvedValue(existingShiftType);
      mockRepository.updateShiftType.mockResolvedValue(updatedShiftType);

      // Act
      const result = await service.updateShiftType(shiftTypeId, updateData, orgId, userId);

      // Assert
      expect(result.shift_differential_rate).toBe(2.0);
    });

    it('should update break configuration', async () => {
      // Arrange
      const updateData = {
        breakDurationMinutes: 45,
        isPaidBreak: true,
      };
      const existingShiftType = createDbShiftType();
      const updatedShiftType = createDbShiftType({
        break_duration_minutes: 45,
        is_paid_break: true,
      });

      mockRepository.findShiftTypeById.mockResolvedValue(existingShiftType);
      mockRepository.updateShiftType.mockResolvedValue(updatedShiftType);

      // Act
      const result = await service.updateShiftType(shiftTypeId, updateData, orgId, userId);

      // Assert
      expect(result.break_duration_minutes).toBe(45);
      expect(result.is_paid_break).toBe(true);
    });
  });

  describe('deleteShiftType', () => {
    it.skip('should soft delete shift type', async () => {
      // TODO: This test needs database query() mocking which is difficult with dynamic imports
      // Arrange
      const existingShiftType = createDbShiftType();
      mockRepository.findShiftTypeById.mockResolvedValue(existingShiftType);
      mockRepository.deleteShiftType.mockResolvedValue(undefined);

      // Act
      await service.deleteShiftType(shiftTypeId, orgId, userId);

      // Assert
      expect(mockRepository.deleteShiftType).toHaveBeenCalledWith(
        shiftTypeId,
        orgId,
        userId
      );
    });

    it('should throw NotFoundError when shift type does not exist', async () => {
      // Arrange
      mockRepository.findShiftTypeById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.deleteShiftType(shiftTypeId, orgId, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should enforce tenant isolation on delete', async () => {
      // Arrange
      const differentOrgId = 'different-org-id';
      mockRepository.findShiftTypeById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.deleteShiftType(shiftTypeId, differentOrgId, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should not call delete if verification fails', async () => {
      // Arrange
      mockRepository.findShiftTypeById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.deleteShiftType(shiftTypeId, orgId, userId)
      ).rejects.toThrow(NotFoundError);

      expect(mockRepository.deleteShiftType).not.toHaveBeenCalled();
    });
  });
});
