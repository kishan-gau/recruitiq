import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ShiftTemplateService from '../../../../../src/products/schedulehub/services/shiftTemplateService.js';
import ShiftTemplateRepository from '../../../../../src/products/schedulehub/repositories/ShiftTemplateRepository.js';
import { ValidationError, NotFoundError } from '../../../../../src/utils/errors.js';

describe('ShiftTemplateService', () => {
  let service;
  let mockRepository;

  // Helper function to generate DB format data (snake_case)
  const createDbShiftTemplate = (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    organization_id: 'org-123e4567-e89b-12d3-a456-426614174000',
    name: 'Morning Shift Template',
    description: 'Standard morning shift',
    start_time: '09:00:00',
    end_time: '17:00:00',
    break_duration_minutes: 30,
    is_overnight: false,
    required_workers: 5,
    days_of_week: [1, 2, 3, 4, 5], // Monday to Friday
    color: '#3498DB',
    is_active: true,
    created_at: new Date('2025-01-01T10:00:00Z'),
    updated_at: new Date('2025-01-01T10:00:00Z'),
    created_by: 'user-123e4567-e89b-12d3-a456-426614174000',
    updated_by: null,
    ...overrides
  });

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findByName: jest.fn(),
      findByOrganization: jest.fn(),
      clone: jest.fn()
    };
    service = new ShiftTemplateService(mockRepository);
  });

  describe('create', () => {
    it('should create shift template with valid data', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const validData = {
        name: 'Evening Shift',
        description: 'Standard evening shift',
        startTime: '17:00',
        endTime: '01:00',
        breakDurationMinutes: 30,
        isOvernight: true,
        requiredWorkers: 3,
        daysOfWeek: [1, 2, 3, 4, 5],
        color: '#E74C3C'
      };

      const dbTemplate = createDbShiftTemplate({
        name: validData.name,
        description: validData.description,
        start_time: validData.startTime + ':00',
        end_time: validData.endTime + ':00',
        break_duration_minutes: validData.breakDurationMinutes,
        is_overnight: validData.isOvernight,
        required_workers: validData.requiredWorkers,
        days_of_week: validData.daysOfWeek,
        color: validData.color
      });

      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(dbTemplate);

      const result = await service.create(validData, orgId, userId);

      expect(mockRepository.findByName).toHaveBeenCalledWith(validData.name, orgId);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validData.name,
          start_time: validData.startTime + ':00',
          end_time: validData.endTime + ':00',
          is_overnight: validData.isOvernight,
          required_workers: validData.requiredWorkers,
          organization_id: orgId
        }),
        orgId,
        userId
      );
      expect(result).toBeDefined();
      expect(result.name).toBe(validData.name);
      expect(result.isOvernight).toBe(validData.isOvernight);
    });

    it('should throw ValidationError for missing required fields', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const invalidData = {};

      await expect(
        service.create(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for duplicate template name', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const validData = {
        name: 'Existing Template',
        startTime: '09:00',
        endTime: '17:00'
      };

      const existingTemplate = createDbShiftTemplate({ name: validData.name });
      mockRepository.findByName.mockResolvedValue(existingTemplate);

      await expect(
        service.create(validData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid time format', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const invalidData = {
        name: 'Test Template',
        startTime: '25:00', // Invalid hour
        endTime: '17:00'
      };

      await expect(
        service.create(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for negative required workers', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const invalidData = {
        name: 'Test Template',
        startTime: '09:00',
        endTime: '17:00',
        requiredWorkers: -1
      };

      await expect(
        service.create(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('should return shift template when found', async () => {
      const templateId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const dbTemplate = createDbShiftTemplate();

      mockRepository.findById.mockResolvedValue(dbTemplate);

      const result = await service.getById(templateId, orgId);

      expect(mockRepository.findById).toHaveBeenCalledWith(templateId, orgId);
      expect(result).toBeDefined();
      expect(result.name).toBe(dbTemplate.name);
      expect(result.startTime).toBe(dbTemplate.start_time);
      expect(result.daysOfWeek).toEqual(dbTemplate.days_of_week);
    });

    it('should throw NotFoundError when template not found', async () => {
      const templateId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.getById(templateId, orgId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('should return all shift templates for organization', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const dbTemplates = [
        createDbShiftTemplate({ name: 'Morning Shift', start_time: '09:00:00' }),
        createDbShiftTemplate({ name: 'Evening Shift', start_time: '17:00:00' })
      ];

      mockRepository.findByOrganization.mockResolvedValue(dbTemplates);

      const result = await service.list(orgId);

      expect(mockRepository.findByOrganization).toHaveBeenCalledWith(orgId);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Morning Shift');
      expect(result[0].startTime).toBe('09:00:00');
      expect(result[1].name).toBe('Evening Shift');
      expect(result[1].startTime).toBe('17:00:00');
    });

    it('should return empty array when no templates found', async () => {
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findByOrganization.mockResolvedValue([]);

      const result = await service.list(orgId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update shift template with valid data', async () => {
      const templateId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        name: 'Updated Template',
        startTime: '08:00',
        endTime: '16:00',
        requiredWorkers: 4
      };

      const existingTemplate = createDbShiftTemplate();
      const updatedTemplate = {
        ...existingTemplate,
        name: updateData.name,
        start_time: updateData.startTime + ':00',
        end_time: updateData.endTime + ':00',
        required_workers: updateData.requiredWorkers
      };

      mockRepository.findById.mockResolvedValue(existingTemplate);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue(updatedTemplate);

      const result = await service.update(templateId, updateData, orgId, userId);

      expect(mockRepository.findById).toHaveBeenCalledWith(templateId, orgId);
      expect(mockRepository.update).toHaveBeenCalledWith(
        templateId,
        expect.objectContaining({
          name: updateData.name,
          start_time: updateData.startTime + ':00',
          end_time: updateData.endTime + ':00',
          required_workers: updateData.requiredWorkers
        }),
        orgId,
        userId
      );
      expect(result.name).toBe(updateData.name);
      expect(result.startTime).toBe(updateData.startTime + ':00');
    });

    it('should throw NotFoundError when template not found', async () => {
      const templateId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(templateId, { name: 'Updated Template' }, orgId, userId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should soft delete shift template when found', async () => {
      const templateId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const existingTemplate = createDbShiftTemplate();

      mockRepository.findById.mockResolvedValue(existingTemplate);
      mockRepository.softDelete.mockResolvedValue();

      await service.delete(templateId, orgId, userId);

      expect(mockRepository.findById).toHaveBeenCalledWith(templateId, orgId);
      expect(mockRepository.softDelete).toHaveBeenCalledWith(templateId, orgId, userId);
    });

    it('should throw NotFoundError when template not found', async () => {
      const templateId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.delete(templateId, orgId, userId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('clone', () => {
    it('should clone existing shift template with new name', async () => {
      const templateId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const newName = 'Cloned Template';

      const originalTemplate = createDbShiftTemplate({ name: 'Original Template' });
      const clonedTemplate = createDbShiftTemplate({ name: newName });

      mockRepository.findById.mockResolvedValue(originalTemplate);
      mockRepository.findByName.mockResolvedValue(null);
      mockRepository.clone.mockResolvedValue(clonedTemplate);

      const result = await service.clone(templateId, newName, orgId, userId);

      expect(mockRepository.findById).toHaveBeenCalledWith(templateId, orgId);
      expect(mockRepository.findByName).toHaveBeenCalledWith(newName, orgId);
      expect(mockRepository.clone).toHaveBeenCalledWith(templateId, newName, orgId, userId);
      expect(result).toBeDefined();
      expect(result.name).toBe(newName);
    });

    it('should throw NotFoundError when original template not found', async () => {
      const templateId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const newName = 'Cloned Template';

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.clone(templateId, newName, orgId, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when clone name already exists', async () => {
      const templateId = '123e4567-e89b-12d3-a456-426614174000';
      const orgId = 'org-123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123e4567-e89b-12d3-a456-426614174000';
      const newName = 'Existing Template';

      const originalTemplate = createDbShiftTemplate();
      const existingTemplate = createDbShiftTemplate({ name: newName });

      mockRepository.findById.mockResolvedValue(originalTemplate);
      mockRepository.findByName.mockResolvedValue(existingTemplate);

      await expect(
        service.clone(templateId, newName, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });
  });
});