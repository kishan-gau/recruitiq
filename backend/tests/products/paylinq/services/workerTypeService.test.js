/**
 * @jest-environment node
 * @group unit
 * @group paylinq
 * @group paylinq-services
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import WorkerTypeService from '../../../../src/products/paylinq/services/workerTypeService.js';
import { mapTemplateDbToApi, mapTemplatesDbToApi, mapAssignmentDbToApi, mapAssignmentsDbToApi } from '../../../../src/products/paylinq/dto/workerTypeDto.js';
import { ValidationError, NotFoundError, ConflictError } from '../../../../src/middleware/errorHandler.js';

jest.mock('../../../../src/utils/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('WorkerTypeService', () => {
  let service;
  let mockRepository;
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const orgId = '123e4567-e89b-12d3-a456-426614174001';
  const userId = '123e4567-e89b-12d3-a456-426614174002';
  const templateId = '123e4567-e89b-12d3-a456-426614174003';
  const employeeRecordId = '123e4567-e89b-12d3-a456-426614174004';

  // Helper to create DB format template data (snake_case)
  const createDbTemplate = (overrides = {}) => ({
    id: templateId,
    organization_id: orgId,
    name: 'Full-Time Employee',
    code: 'FT-EMP',
    description: 'Standard full-time employee',
    default_pay_frequency: 'bi-weekly',
    default_payment_method: 'ach',
    benefits_eligible: true,
    overtime_eligible: true,
    pto_eligible: true,
    sick_leave_eligible: true,
    vacation_accrual_rate: 0.05,
    status: 'active',
    created_at: new Date(),
    updated_at: null,
    deleted_at: null,
    created_by: userId,
    updated_by: null,
    deleted_by: null,
    ...overrides
  });

  // Helper to create API format template data (camelCase)
  const createApiTemplate = (overrides = {}) => ({
    name: 'Full-Time Employee',
    code: 'FT-EMP',
    description: 'Standard full-time employee',
    defaultPayFrequency: 'bi-weekly',
    defaultPaymentMethod: 'ach',
    benefitsEligible: true,
    overtimeEligible: true,
    ptoEligible: true,
    sickLeaveEligible: true,
    vacationAccrualRate: 0.05,
    ...overrides
  });

  // Helper to create DB format assignment data (snake_case)
  const createDbAssignment = (overrides = {}) => ({
    id: validUUID,
    organization_id: orgId,
    employee_id: employeeRecordId,
    worker_type_template_id: templateId,
    effective_from: new Date('2024-01-01'),
    effective_to: null,
    is_current: true,
    pay_frequency: null,
    payment_method: null,
    template_name: 'Full-Time Employee',
    template_code: 'FT-EMP',
    created_at: new Date(),
    updated_at: null,
    deleted_at: null,
    created_by: userId,
    updated_by: null,
    deleted_by: null,
    ...overrides
  });

  // Helper to create API format assignment data (camelCase)
  const createApiAssignment = (overrides = {}) => ({
    employeeRecordId,
    workerTypeTemplateId: templateId,
    effectiveFrom: new Date('2024-01-01'),
    effectiveTo: null,
    payFrequency: null,
    paymentMethod: null,
    notes: 'Initial assignment',
    ...overrides
  });

  beforeEach(() => {
    mockRepository = {
      createTemplate: jest.fn(),
      findTemplateByCode: jest.fn(),
      findTemplateById: jest.fn(),
      findTemplatesByOrganization: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      assignWorkerType: jest.fn(),
      findCurrentWorkerType: jest.fn(),
      findWorkerTypeHistory: jest.fn(),
      endCurrentAssignment: jest.fn(),
      countEmployeesByWorkerType: jest.fn(),
      findEmployeesByWorkerType: jest.fn(),
      countTemplates: jest.fn(),
      findAll: jest.fn(),
    };

    // Inject mock repository directly into service
    service = new WorkerTypeService(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== TEMPLATES ====================

  describe('createWorkerTypeTemplate', () => {
    it('should create worker type template with DTO transformation', async () => {
      const apiData = createApiTemplate();
      const dbTemplate = createDbTemplate();

      mockRepository.countTemplates.mockResolvedValue(5);
      mockRepository.findTemplateByCode.mockResolvedValue(null);
      mockRepository.createTemplate.mockResolvedValue(dbTemplate);

      const result = await service.createWorkerTypeTemplate(apiData, orgId, userId);

      // Assert: Result should be DTO-transformed (camelCase)
      expect(result).toEqual(mapTemplateDbToApi(dbTemplate));
      expect(result.defaultPayFrequency).toBe('bi-weekly'); // camelCase
      expect(result.benefitsEligible).toBe(true); // camelCase
      expect(result.default_pay_frequency).toBeUndefined(); // DB field should not exist
      expect(mockRepository.findTemplateByCode).toHaveBeenCalledWith('FT-EMP', orgId);
      expect(mockRepository.createTemplate).toHaveBeenCalledWith(apiData, orgId, userId);
    });

    it('should throw ValidationError for invalid template data', async () => {
      const invalidData = { name: 'X' }; // Too short

      await expect(
        service.createWorkerTypeTemplate(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError for duplicate template code', async () => {
      const apiData = createApiTemplate();
      const existingTemplate = createDbTemplate({ code: 'FT-EMP' });

      mockRepository.countTemplates.mockResolvedValue(5);
      mockRepository.findTemplateByCode.mockResolvedValue(existingTemplate);

      await expect(
        service.createWorkerTypeTemplate(apiData, orgId, userId)
      ).rejects.toThrow(ConflictError);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'Test',
        // Missing code
        defaultPayFrequency: 'bi-weekly',
        defaultPaymentMethod: 'ach'
      };

      await expect(
        service.createWorkerTypeTemplate(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate enum values for payFrequency', async () => {
      const invalidData = createApiTemplate({
        defaultPayFrequency: 'invalid-frequency'
      });

      await expect(
        service.createWorkerTypeTemplate(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate enum values for paymentMethod', async () => {
      const invalidData = createApiTemplate({
        defaultPaymentMethod: 'invalid-method'
      });

      await expect(
        service.createWorkerTypeTemplate(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });
  });



  describe('getWorkerTypeTemplates', () => {
    it('should return DTO-transformed templates array', async () => {
      const dbTemplates = [
        createDbTemplate({ code: 'FT' }),
        createDbTemplate({ code: 'PT', id: validUUID })
      ];

      mockRepository.findTemplatesByOrganization.mockResolvedValue(dbTemplates);

      const result = await service.getWorkerTypeTemplates(orgId);

      // Assert: Expect DTO-transformed array (camelCase)
      expect(result).toEqual(mapTemplatesDbToApi(dbTemplates));
      expect(result[0].defaultPayFrequency).toBe('bi-weekly'); // camelCase
      expect(result[0].default_pay_frequency).toBeUndefined(); // DB field should not exist
      expect(mockRepository.findTemplatesByOrganization).toHaveBeenCalledWith(orgId, {});
    });

    it('should pass filters to repository', async () => {
      const filters = { benefitsEligible: true };

      mockRepository.findTemplatesByOrganization.mockResolvedValue([]);

      await service.getWorkerTypeTemplates(orgId, filters);

      expect(mockRepository.findTemplatesByOrganization).toHaveBeenCalledWith(orgId, filters);
    });
  });

  describe('getWorkerTypeTemplateById', () => {
    it('should return DTO-transformed template', async () => {
      const dbTemplate = createDbTemplate();

      mockRepository.findTemplateById.mockResolvedValue(dbTemplate);

      const result = await service.getWorkerTypeTemplateById(templateId, orgId);

      // Assert: Expect DTO-transformed result (camelCase)
      expect(result).toEqual(mapTemplateDbToApi(dbTemplate));
      expect(result.defaultPayFrequency).toBe('bi-weekly'); // camelCase
      expect(result.benefitsEligible).toBe(true); // camelCase
      expect(result.default_pay_frequency).toBeUndefined(); // DB field should not exist
      expect(mockRepository.findTemplateById).toHaveBeenCalledWith(templateId, orgId);
    });

    it('should throw NotFoundError when template does not exist', async () => {
      mockRepository.findTemplateById.mockResolvedValue(null);

      await expect(
        service.getWorkerTypeTemplateById(templateId, orgId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateWorkerTypeTemplate', () => {
    it('should update and return DTO-transformed template', async () => {
      const updates = { name: 'Updated Full-Time', benefitsEligible: false };
      const dbTemplate = createDbTemplate({ name: 'Updated Full-Time', benefits_eligible: false });

      mockRepository.updateTemplate.mockResolvedValue(dbTemplate);

      const result = await service.updateWorkerTypeTemplate(templateId, updates, orgId, userId);

      // Assert: Expect DTO-transformed result (camelCase)
      expect(result).toEqual(mapTemplateDbToApi(dbTemplate));
      expect(result.benefitsEligible).toBe(false); // camelCase
      expect(result.benefits_eligible).toBeUndefined(); // DB field should not exist
      expect(mockRepository.updateTemplate).toHaveBeenCalled();
    });

    it('should throw error when no valid fields to update', async () => {
      const invalidUpdates = { invalidField: 'value' };

      await expect(
        service.updateWorkerTypeTemplate(templateId, invalidUpdates, orgId, userId)
      ).rejects.toThrow();
    });
  });

  describe('deleteWorkerTypeTemplate', () => {
    it('should delete worker type template successfully', async () => {
      mockRepository.deleteTemplate.mockResolvedValue(true);

      await service.deleteWorkerTypeTemplate(templateId, orgId, userId);

      expect(mockRepository.deleteTemplate).toHaveBeenCalledWith(templateId, orgId, userId);
    });
  });

  // ==================== ASSIGNMENTS ====================

  describe('assignWorkerType', () => {
    it('should assign and return DTO-transformed assignment', async () => {
      const apiData = createApiAssignment();
      const dbTemplate = createDbTemplate();
      const dbAssignment = createDbAssignment();

      mockRepository.findTemplateById.mockResolvedValue(dbTemplate);
      mockRepository.findWorkerTypeHistory.mockResolvedValue([]);
      mockRepository.assignWorkerType.mockResolvedValue(dbAssignment);

      const result = await service.assignWorkerType(apiData, orgId, userId);

      // Assert: Expect DTO-transformed result (camelCase)
      expect(result).toEqual(mapAssignmentDbToApi(dbAssignment));
      expect(result.employeeId).toBe(employeeRecordId); // camelCase
      expect(result.workerTypeTemplateId).toBe(templateId); // camelCase
      expect(result.employee_id).toBeUndefined(); // DB field should not exist
      expect(mockRepository.assignWorkerType).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid assignment data', async () => {
      const invalidData = { employeeRecordId: 'invalid-uuid' };

      await expect(
        service.assignWorkerType(invalidData, orgId, userId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when template does not exist', async () => {
      const apiData = createApiAssignment();

      mockRepository.findTemplateById.mockResolvedValue(null);

      await expect(
        service.assignWorkerType(apiData, orgId, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for effectiveTo before effectiveFrom', async () => {
      const apiData = createApiAssignment({
        effectiveFrom: new Date('2024-02-01'),
        effectiveTo: new Date('2024-01-01')
      });

      await expect(
        service.assignWorkerType(apiData, orgId, userId)
      ).rejects.toThrow();
    });
  });

  describe('getCurrentWorkerType', () => {
    it('should return DTO-transformed current assignment', async () => {
      const dbAssignment = createDbAssignment();

      mockRepository.findCurrentWorkerType.mockResolvedValue(dbAssignment);

      const result = await service.getCurrentWorkerType(employeeRecordId, orgId);

      // Assert: Expect DTO-transformed result (camelCase)
      expect(result).toEqual(mapAssignmentDbToApi(dbAssignment));
      expect(result.employeeId).toBe(employeeRecordId); // camelCase
      expect(result.isCurrent).toBe(true); // camelCase
      expect(result.employee_id).toBeUndefined(); // DB field should not exist
      expect(mockRepository.findCurrentWorkerType).toHaveBeenCalledWith(employeeRecordId, orgId);
    });

    it('should return null when no current assignment', async () => {
      mockRepository.findCurrentWorkerType.mockResolvedValue(null);

      const result = await service.getCurrentWorkerType(employeeRecordId, orgId);

      expect(result).toBeNull();
    });
  });

  describe('getWorkerTypeHistory', () => {
    it('should return DTO-transformed history array', async () => {
      const dbHistory = [
        createDbAssignment({ id: validUUID }),
        createDbAssignment({ id: templateId, effective_from: new Date('2023-01-01') })
      ];

      mockRepository.findWorkerTypeHistory.mockResolvedValue(dbHistory);

      const result = await service.getWorkerTypeHistory(employeeRecordId, orgId);

      // Assert: Expect DTO-transformed array (camelCase)
      expect(result).toEqual(mapAssignmentsDbToApi(dbHistory));
      expect(result[0].employeeId).toBe(employeeRecordId); // camelCase
      expect(result[0].employee_id).toBeUndefined(); // DB field should not exist
      expect(mockRepository.findWorkerTypeHistory).toHaveBeenCalledWith(employeeRecordId, orgId);
    });

    it('should return empty array when no history', async () => {
      mockRepository.findWorkerTypeHistory.mockResolvedValue([]);

      const result = await service.getWorkerTypeHistory(employeeRecordId, orgId);

      expect(result).toEqual([]);
    });
  });

  describe('getEmployeeCountByWorkerType', () => {
    it('should return employee counts grouped by worker type', async () => {
      const counts = [
        { worker_type_template_id: templateId, template_name: 'Full-Time', employee_count: 50 },
        { worker_type_template_id: validUUID, template_name: 'Part-Time', employee_count: 20 }
      ];

      mockRepository.countEmployeesByWorkerType.mockResolvedValue(counts);

      const result = await service.getEmployeeCountByWorkerType(orgId);

      expect(result).toEqual(counts);
      expect(mockRepository.countEmployeesByWorkerType).toHaveBeenCalledWith(orgId);
    });
  });

  describe('checkWorkerTypeLimit', () => {
    it('should pass when under tier limit', async () => {
      mockRepository.countTemplates.mockResolvedValue(5);

      await expect(
        service.checkWorkerTypeLimit(orgId)
      ).resolves.not.toThrow();
    });
  });
});
