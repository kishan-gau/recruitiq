/**
 * Time Attendance Service Tests
 * Tests for shift type management functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import TimeAttendanceService from '../../../../src/products/paylinq/services/timeAttendanceService.js';
import TimeAttendanceRepository from '../../../../src/products/paylinq/repositories/timeAttendanceRepository.js';
import { ValidationError, NotFoundError } from '../../../../src/utils/errors.js';

describe('TimeAttendanceService - Shift Type Management', () => {
  let service;
  let mockRepository;

  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      createShiftType: jest.fn(),
      findShiftTypeById: jest.fn(),
      findShiftTypeByCode: jest.fn(),
      findShiftTypes: jest.fn(),  // Changed from findAllShiftTypes
      updateShiftType: jest.fn(),
      deleteShiftType: jest.fn(),
    };

    // Inject mock repository
    service = new TimeAttendanceService(mockRepository);
  });

  describe('createShiftType', () => {
    const validShiftTypeData = {
      shiftCode: 'MORNING',
      shiftName: 'Morning Shift',
      startTime: '08:00',
      endTime: '16:00',
      durationHours: 8,
      isOvernight: false,
      breakDurationMinutes: 60,
      isPaidBreak: false,
    };

    it('should create a shift type with valid data', async () => {
      const mockCreated = {
        id: 'shift-uuid',
        ...validShiftTypeData,
        organization_id: testOrgId,
        created_by: testUserId,
        created_at: new Date(),
      };

      mockRepository.createShiftType.mockResolvedValue(mockCreated);

      const result = await service.createShiftType(validShiftTypeData, testOrgId, testUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe('shift-uuid');
      expect(mockRepository.createShiftType).toHaveBeenCalledWith(
        expect.objectContaining({
          shiftCode: 'MORNING',
          shiftName: 'Morning Shift',
          startTime: '08:00',
          endTime: '16:00',
          durationHours: 8,
        }),
        testOrgId,
        testUserId
      );
    });

    it('should throw ValidationError for missing required fields', async () => {
      const invalidData = {
        shiftCode: 'MORNING',
        // Missing shiftName, startTime, endTime, durationHours
      };

      await expect(
        service.createShiftType(invalidData, testOrgId, testUserId)
      ).rejects.toThrow('is required');
    });

    it('should throw ValidationError for invalid time format', async () => {
      const invalidTimeData = {
        ...validShiftTypeData,
        startTime: '25:00', // Invalid hour
      };

      await expect(
        service.createShiftType(invalidTimeData, testOrgId, testUserId)
      ).rejects.toThrow('fails to match the required pattern');
    });

    it('should apply default values correctly', async () => {
      const minimalData = {
        shiftCode: 'NIGHT',
        shiftName: 'Night Shift',
        startTime: '22:00',
        endTime: '06:00',
        durationHours: 8,
      };

      mockRepository.createShiftType.mockResolvedValue({
        id: 'shift-uuid',
        ...minimalData,
        break_duration_minutes: 0, // Default
        is_overnight: false, // Default
        is_paid_break: false, // Default
        organization_id: testOrgId,
      });

      await service.createShiftType(minimalData, testOrgId, testUserId);

      expect(mockRepository.createShiftType).toHaveBeenCalledWith(
        expect.objectContaining({
          shiftCode: 'NIGHT',
          shiftName: 'Night Shift',
          breakDurationMinutes: 0, // Joi default
          isOvernight: false, // Joi default
          isPaidBreak: false, // Joi default
        }),
        testOrgId,
        testUserId
      );
    });

    it('should reject unknown fields', async () => {
      const dataWithUnknownFields = {
        ...validShiftTypeData,
        unknownField: 'should be rejected',
        anotherUnknown: 'also rejected',
      };

      await expect(
        service.createShiftType(dataWithUnknownFields, testOrgId, testUserId)
      ).rejects.toThrow('is not allowed');
    });
  });

  describe('getShiftTypeById', () => {
    const shiftTypeId = '323e4567-e89b-12d3-a456-426614174000';

    it('should return shift type when found', async () => {
      const mockShiftType = {
        id: shiftTypeId,
        shift_code: 'MORNING',
        shift_name: 'Morning Shift',
        start_time: '08:00',
        end_time: '16:00',
        organization_id: testOrgId,
      };

      mockRepository.findShiftTypeById.mockResolvedValue(mockShiftType);

      const result = await service.getShiftTypeById(shiftTypeId, testOrgId);

      expect(result).toEqual(mockShiftType);
      expect(mockRepository.findShiftTypeById).toHaveBeenCalledWith(shiftTypeId, testOrgId);
    });

    it('should throw NotFoundError when shift type does not exist', async () => {
      mockRepository.findShiftTypeById.mockResolvedValue(null);

      await expect(
        service.getShiftTypeById(shiftTypeId, testOrgId)
      ).rejects.toThrow('Shift type not found');
    });
  });

  describe('getShiftTypeByCode', () => {
    it('should return shift type when found by code', async () => {
      const mockShiftType = {
        id: 'shift-uuid',
        shift_code: 'MORNING',
        shift_name: 'Morning Shift',
        organization_id: testOrgId,
      };

      mockRepository.findShiftTypeByCode.mockResolvedValue(mockShiftType);

      const result = await service.getShiftTypeByCode('MORNING', testOrgId);

      expect(result).toEqual(mockShiftType);
      expect(mockRepository.findShiftTypeByCode).toHaveBeenCalledWith('MORNING', testOrgId);
    });

    it('should throw NotFoundError when shift type code does not exist', async () => {
      mockRepository.findShiftTypeByCode.mockResolvedValue(null);

      await expect(
        service.getShiftTypeByCode('NONEXISTENT', testOrgId)
      ).rejects.toThrow('Shift type not found');
    });
  });

  describe('getAllShiftTypes', () => {
    it('should return all shift types for organization', async () => {
      const mockShiftTypes = [
        {
          id: 'shift-1',
          shift_code: 'MORNING',
          shift_name: 'Morning Shift',
          is_active: true,
        },
        {
          id: 'shift-2',
          shift_code: 'AFTERNOON',
          shift_name: 'Afternoon Shift',
          is_active: true,
        },
      ];

      mockRepository.findShiftTypes.mockResolvedValue(mockShiftTypes);

      const result = await service.getAllShiftTypes(testOrgId);

      expect(result).toEqual(mockShiftTypes);
      expect(result.length).toBe(2);
      expect(mockRepository.findShiftTypes).toHaveBeenCalledWith(testOrgId, {});
    });

    it('should filter by status when provided', async () => {
      const activeShiftTypes = [
        {
          id: 'shift-1',
          shift_code: 'MORNING',
          is_active: true,
        },
      ];

      mockRepository.findShiftTypes.mockResolvedValue(activeShiftTypes);

      const result = await service.getAllShiftTypes(testOrgId, { status: 'active' });

      expect(result).toEqual(activeShiftTypes);
      expect(mockRepository.findShiftTypes).toHaveBeenCalledWith(testOrgId, {
        status: 'active',
      });
    });

    it('should return empty array when no shift types exist', async () => {
      mockRepository.findShiftTypes.mockResolvedValue([]);

      const result = await service.getAllShiftTypes(testOrgId);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('updateShiftType', () => {
    const shiftTypeId = '323e4567-e89b-12d3-a456-426614174000';
    const existingShiftType = {
      id: shiftTypeId,
      shift_code: 'MORNING',
      shift_name: 'Morning Shift',
      start_time: '08:00',
      end_time: '16:00',
      duration_hours: 8,
      break_duration_minutes: 60,
      organization_id: testOrgId,
    };

    it('should update shift type with valid data', async () => {
      const updateData = {
        shiftName: 'Updated Morning Shift',
      };

      mockRepository.findShiftTypeById.mockResolvedValue(existingShiftType);
      mockRepository.updateShiftType.mockResolvedValue({
        ...existingShiftType,
        shift_name: 'Updated Morning Shift',
      });

      const result = await service.updateShiftType(shiftTypeId, updateData, testOrgId, testUserId);

      expect(result.shift_name).toBe('Updated Morning Shift');
      expect(mockRepository.updateShiftType).toHaveBeenCalledWith(
        shiftTypeId,
        expect.objectContaining({
          shiftName: 'Updated Morning Shift',
        }),
        testOrgId,
        testUserId
      );
    });

    it('should throw NotFoundError when shift type does not exist', async () => {
      mockRepository.findShiftTypeById.mockResolvedValue(null);

      await expect(
        service.updateShiftType(shiftTypeId, { shiftName: 'Updated' }, testOrgId, testUserId)
      ).rejects.toThrow('Shift type not found');

      expect(mockRepository.updateShiftType).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid field values', async () => {
      const updateData = { durationHours: -1 }; // Invalid negative value

      mockRepository.findShiftTypeById.mockResolvedValue(existingShiftType);

      await expect(
        service.updateShiftType(shiftTypeId, updateData, testOrgId, testUserId)
      ).rejects.toThrow('must be greater than or equal to 0');
    });

    it('should allow updating to same shift code (no change)', async () => {
      const updateData = { 
        shiftCode: 'MORNING',
        shiftName: 'Updated Name'
      };

      mockRepository.findShiftTypeById.mockResolvedValue(existingShiftType);
      mockRepository.findShiftTypeByCode.mockResolvedValue(existingShiftType); // Same record
      mockRepository.updateShiftType.mockResolvedValue({
        ...existingShiftType,
        shift_name: 'Updated Name',
      });

      await service.updateShiftType(shiftTypeId, updateData, testOrgId, testUserId);

      expect(mockRepository.updateShiftType).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid time format on update', async () => {
      const invalidTimeUpdate = {
        startTime: '25:00', // Invalid hour
      };

      mockRepository.findShiftTypeById.mockResolvedValue(existingShiftType);

      await expect(
        service.updateShiftType(shiftTypeId, invalidTimeUpdate, testOrgId, testUserId)
      ).rejects.toThrow('fails to match the required pattern');
    });
  });

  describe('deleteShiftType', () => {
    const shiftTypeId = '323e4567-e89b-12d3-a456-426614174000';

    it.skip('should delete shift type when found', async () => {
      // TODO: This test needs database mocking for the usage check query
      // The service dynamically imports query() which is difficult to mock
      const mockShiftType = {
        id: shiftTypeId,
        shift_code: 'MORNING',
        organization_id: testOrgId,
      };

      mockRepository.findShiftTypeById.mockResolvedValue(mockShiftType);
      mockRepository.deleteShiftType.mockResolvedValue();

      await service.deleteShiftType(shiftTypeId, testOrgId, testUserId);

      expect(mockRepository.findShiftTypeById).toHaveBeenCalledWith(shiftTypeId, testOrgId);
      expect(mockRepository.deleteShiftType).toHaveBeenCalledWith(
        shiftTypeId,
        testOrgId,
        testUserId
      );
    });

    it('should throw NotFoundError when shift type does not exist', async () => {
      mockRepository.findShiftTypeById.mockResolvedValue(null);

      await expect(
        service.deleteShiftType(shiftTypeId, testOrgId, testUserId)
      ).rejects.toThrow('Shift type not found');

      expect(mockRepository.deleteShiftType).not.toHaveBeenCalled();
    });
  });
});
