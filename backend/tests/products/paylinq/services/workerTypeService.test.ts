/**
 * WorkerTypeService Test Suite
 * 
 * Tests for PayLinQ worker type service following TESTING_STANDARDS.md guidelines:
 * - ES modules with @jest/globals
 * - Dependency injection pattern
 * - DTO transformation validation
 * - Valid UUID v4 formats
 * - Comprehensive service method coverage
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import WorkerTypeService from '../../../../src/products/paylinq/services/workerTypeService.js';
import { 
  mapWorkerTypeDbToApi, 
  mapWorkerTypesDbToApi,
  mapAssignmentDbToApi,
  mapAssignmentsDbToApi 
} from '../../../../src/products/paylinq/dto/workerTypeDto.js';

describe('WorkerTypeService', () => {
  let service: any;
  let mockWorkerTypeRepository: any;
  let mockPayStructureRepository: any;

  // Valid UUID v4 test constants (industry standard format)
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testWorkerTypeId = '323e4567-e89b-12d3-a456-426614174002';
  const testEmployeeRecordId = '423e4567-e89b-12d3-a456-426614174003';

  /**
   * Helper to create DB format worker type (snake_case)
   * Matches actual database schema format
   */
  const createDbWorkerType = (overrides: any = {}) => ({
    id: testWorkerTypeId,
    organization_id: testOrganizationId,
    name: 'Full-Time Employee',
    code: 'FTE',
    description: 'Standard full-time employee',
    default_pay_frequency: 'monthly',
    default_payment_method: 'ach',
    pay_structure_template_code: 'STANDARD_PAY',
    benefits_eligible: true,
    overtime_eligible: true,
    pto_eligible: true,
    sick_leave_eligible: true,
    vacation_accrual_rate: 0.0769,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    created_by: testUserId,
    updated_by: testUserId,
    deleted_at: null,
    deleted_by: null,
    ...overrides
  });

  /**
   * Helper to create DB format assignment (snake_case)
   */
  const createDbAssignment = (overrides: any = {}) => ({
    id: '523e4567-e89b-12d3-a456-426614174004',
    organization_id: testOrganizationId,
    employee_record_id: testEmployeeRecordId,
    worker_type_template_id: testWorkerTypeId,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    pay_frequency: 'monthly',
    payment_method: 'ach',
    notes: null,
    is_current: true,
    created_at: new Date('2025-01-01'),
    created_by: testUserId,
    ...overrides
  });

  beforeEach(() => {
    // Create comprehensive mock repository
    mockWorkerTypeRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllWithPagination: jest.fn(),
      findTemplateByCode: jest.fn(),
      findTemplateById: jest.fn(),
      findTemplatesByOrganization: jest.fn(),
      createTemplate: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      assignWorkerType: jest.fn(),
      findCurrentWorkerType: jest.fn(),
      findWorkerTypeHistory: jest.fn(),
      countEmployeesByWorkerType: jest.fn(),
      getEmployeesByWorkerType: jest.fn(),
      getOrganizationTier: jest.fn(),
      getTemplateUpgradeStatus: jest.fn(),
      getEmployeesNeedingTemplateUpgrade: jest.fn(),
      bulkUpdateWorkerTemplates: jest.fn()
    };

    mockPayStructureRepository = {
      findTemplateByCode: jest.fn(),
      findTemplates: jest.fn(),
      findCurrentTemplateByCode: jest.fn(),
      getTemplateComponents: jest.fn()
    };

    // Inject mocks into service (dependency injection pattern)
    service = new WorkerTypeService(mockWorkerTypeRepository, mockPayStructureRepository);
  });

  // ==================== WORKER TYPE TEMPLATES ====================

  describe('createWorkerTypeTemplate', () => {
    it('should create worker type template with valid data', async () => {
      const templateData = {
        name: 'Full-Time Employee',
        code: 'FTE',
        description: 'Standard full-time employee',
        defaultPayFrequency: 'monthly',
        defaultPaymentMethod: 'ach',
        benefitsEligible: true,
        overtimeEligible: true,
        ptoEligible: true,
        sickLeaveEligible: true,
        vacationAccrualRate: 0.0769
      };

      const dbTemplate = createDbWorkerType();
      
      // Mock repository responses
      mockWorkerTypeRepository.findTemplateByCode.mockResolvedValue(null); // No duplicate
      mockWorkerTypeRepository.getOrganizationTier.mockResolvedValue('professional');
      mockWorkerTypeRepository.findTemplatesByOrganization.mockResolvedValue([]);
      mockWorkerTypeRepository.createTemplate.mockResolvedValue(dbTemplate);

      const result = await service.createWorkerTypeTemplate(
        templateData,
        testOrganizationId,
        testUserId
      );

      // Verify repository was called correctly
      expect(mockWorkerTypeRepository.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Full-Time Employee',
          code: 'FTE'
        }),
        testOrganizationId,
        testUserId
      );

      // Verify DTO transformation occurred (DB snake_case → API camelCase)
      expect(result).toEqual(mapWorkerTypeDbToApi(dbTemplate));
      expect(result.defaultPayFrequency).toBe('monthly'); // camelCase
      expect(result.benefitsEligible).toBe(true); // camelCase
      expect(result.default_pay_frequency).toBeUndefined(); // snake_case removed
    });

    it('should throw ValidationError for invalid data', async () => {
      const invalidData = {
        name: 'A', // Too short (min 2)
        code: '',  // Empty
        defaultPayFrequency: 'invalid',
        defaultPaymentMethod: 'invalid'
      };

      await expect(
        service.createWorkerTypeTemplate(invalidData, testOrganizationId, testUserId)
      ).rejects.toThrow();
    });

    it('should throw ConflictError for duplicate code', async () => {
      const templateData = {
        name: 'Full-Time Employee',
        code: 'FTE',
        defaultPayFrequency: 'monthly',
        defaultPaymentMethod: 'ach'
      };

      mockWorkerTypeRepository.findTemplateByCode.mockResolvedValue(
        createDbWorkerType({ code: 'FTE' })
      );
      mockWorkerTypeRepository.getOrganizationTier.mockResolvedValue('professional');
      mockWorkerTypeRepository.findTemplatesByOrganization.mockResolvedValue([]);

      await expect(
        service.createWorkerTypeTemplate(templateData, testOrganizationId, testUserId)
      ).rejects.toThrow(/already exists/);
    });

    it('should validate pay structure template code if provided', async () => {
      const templateData = {
        name: 'Full-Time Employee',
        code: 'FTE',
        defaultPayFrequency: 'monthly',
        defaultPaymentMethod: 'ach',
        payStructureTemplateCode: 'STANDARD_PAY'
      };

      const dbTemplate = createDbWorkerType();
      
      mockWorkerTypeRepository.findTemplateByCode.mockResolvedValue(null);
      mockWorkerTypeRepository.getOrganizationTier.mockResolvedValue('professional');
      mockWorkerTypeRepository.findTemplatesByOrganization.mockResolvedValue([]);
      mockWorkerTypeRepository.createTemplate.mockResolvedValue(dbTemplate);
      mockPayStructureRepository.findTemplateByCode.mockResolvedValue({ 
        id: '623e4567-e89b-12d3-a456-426614174005', 
        template_code: 'STANDARD_PAY' 
      });

      await service.createWorkerTypeTemplate(
        templateData,
        testOrganizationId,
        testUserId
      );

      expect(mockPayStructureRepository.findTemplateByCode).toHaveBeenCalledWith(
        'STANDARD_PAY',
        testOrganizationId
      );
    });
  });

  describe('getWorkerTypes', () => {
    it('should return paginated worker types with DTO transformation', async () => {
      const dbWorkerTypes = [
        createDbWorkerType({ code: 'FTE', name: 'Full-Time' }),
        createDbWorkerType({ 
          id: '723e4567-e89b-12d3-a456-426614174006',
          code: 'PTE', 
          name: 'Part-Time' 
        })
      ];

      const mockPaginationResult = {
        workerTypes: dbWorkerTypes,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      mockWorkerTypeRepository.findAllWithPagination.mockResolvedValue(mockPaginationResult);

      const result = await service.getWorkerTypes(
        testOrganizationId,
        { page: 1, limit: 20 },
        {},
        { sortBy: 'name', sortOrder: 'asc' }
      );

      expect(result.workerTypes).toEqual(mapWorkerTypesDbToApi(dbWorkerTypes));
      expect(result.pagination.total).toBe(2);
      expect(result.workerTypes[0].defaultPayFrequency).toBe('monthly'); // camelCase
      expect(result.workerTypes[0].default_pay_frequency).toBeUndefined(); // snake_case removed
    });

    it('should apply filters and pagination correctly', async () => {
      mockWorkerTypeRepository.findAllWithPagination.mockResolvedValue({
        workerTypes: [],
        pagination: { page: 2, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: true }
      });

      await service.getWorkerTypes(
        testOrganizationId,
        { page: 2, limit: 10 },
        { isActive: true },
        { sortBy: 'code', sortOrder: 'desc' }
      );

      expect(mockWorkerTypeRepository.findAllWithPagination).toHaveBeenCalledWith(
        testOrganizationId,
        { isActive: true },
        {
          page: 2,
          limit: 10,
          sortBy: 'code',
          sortOrder: 'desc'
        }
      );
    });

    it('should enforce maximum limit of 100', async () => {
      mockWorkerTypeRepository.findAllWithPagination.mockResolvedValue({
        workerTypes: [],
        pagination: { page: 1, limit: 100, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      });

      await service.getWorkerTypes(
        testOrganizationId,
        { page: 1, limit: 500 }, // Request more than max
        {},
        {}
      );

      expect(mockWorkerTypeRepository.findAllWithPagination).toHaveBeenCalledWith(
        testOrganizationId,
        {},
        expect.objectContaining({
          limit: 100 // Capped at 100
        })
      );
    });
  });

  describe('getWorkerTypeTemplateById', () => {
    it('should return DTO-transformed worker type by ID', async () => {
      const dbTemplate = createDbWorkerType();
      mockWorkerTypeRepository.findById.mockResolvedValue(dbTemplate);

      const result = await service.getWorkerTypeTemplateById(
        testWorkerTypeId,
        testOrganizationId
      );

      expect(result).toEqual(mapWorkerTypeDbToApi(dbTemplate));
      expect(result.id).toBe(testWorkerTypeId);
      expect(result.defaultPayFrequency).toBe('monthly'); // camelCase
      expect(mockWorkerTypeRepository.findById).toHaveBeenCalledWith(
        testWorkerTypeId,
        testOrganizationId
      );
    });

    it('should throw NotFoundError when worker type does not exist', async () => {
      mockWorkerTypeRepository.findById.mockResolvedValue(null);

      await expect(
        service.getWorkerTypeTemplateById(testWorkerTypeId, testOrganizationId)
      ).rejects.toThrow('Worker type template not found');
    });
  });

  describe('updateWorkerTypeTemplate', () => {
    it('should update worker type template with allowed fields', async () => {
      const existingTemplate = createDbWorkerType();
      const updates = {
        name: 'Updated Full-Time Employee',
        defaultPayFrequency: 'bi-weekly',
        benefitsEligible: false
      };

      const updatedTemplate = createDbWorkerType({
        name: 'Updated Full-Time Employee',
        default_pay_frequency: 'bi-weekly',
        benefits_eligible: false
      });

      mockWorkerTypeRepository.findById.mockResolvedValue(existingTemplate);
      mockWorkerTypeRepository.update.mockResolvedValue(updatedTemplate);

      const result = await service.updateWorkerTypeTemplate(
        testWorkerTypeId,
        updates,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual(mapWorkerTypeDbToApi(updatedTemplate));
      expect(result.name).toBe('Updated Full-Time Employee');
      expect(result.defaultPayFrequency).toBe('bi-weekly'); // camelCase
      expect(mockWorkerTypeRepository.update).toHaveBeenCalledWith(
        testWorkerTypeId,
        expect.objectContaining({
          name: 'Updated Full-Time Employee',
          default_pay_frequency: 'bi-weekly', // Converted to snake_case
          benefits_eligible: false
        }),
        testOrganizationId,
        testUserId
      );
    });

    it('should throw error when no valid fields to update', async () => {
      const existingTemplate = createDbWorkerType();
      mockWorkerTypeRepository.findById.mockResolvedValue(existingTemplate);

      await expect(
        service.updateWorkerTypeTemplate(
          testWorkerTypeId,
          { invalidField: 'value' }, // Not in allowed fields
          testOrganizationId,
          testUserId
        )
      ).rejects.toThrow('No valid fields to update');
    });

    it('should validate pay structure template code when updating', async () => {
      const existingTemplate = createDbWorkerType();
      const updates = {
        payStructureTemplateCode: 'NEW_PAY_STRUCTURE'
      };

      mockWorkerTypeRepository.findById.mockResolvedValue(existingTemplate);
      mockPayStructureRepository.findTemplateByCode.mockResolvedValue({
        id: '823e4567-e89b-12d3-a456-426614174007',
        template_code: 'NEW_PAY_STRUCTURE'
      });
      mockWorkerTypeRepository.update.mockResolvedValue(
        createDbWorkerType({ pay_structure_template_code: 'NEW_PAY_STRUCTURE' })
      );

      await service.updateWorkerTypeTemplate(
        testWorkerTypeId,
        updates,
        testOrganizationId,
        testUserId
      );

      expect(mockPayStructureRepository.findTemplateByCode).toHaveBeenCalledWith(
        'NEW_PAY_STRUCTURE',
        testOrganizationId
      );
    });
  });

  describe('deleteWorkerTypeTemplate', () => {
    it('should delete worker type template', async () => {
      const existingTemplate = createDbWorkerType();
      mockWorkerTypeRepository.findById.mockResolvedValue(existingTemplate);
      mockWorkerTypeRepository.delete.mockResolvedValue(true);

      const result = await service.deleteWorkerTypeTemplate(
        testWorkerTypeId,
        testOrganizationId,
        testUserId
      );

      expect(result).toBe(true);
      expect(mockWorkerTypeRepository.delete).toHaveBeenCalledWith(
        testWorkerTypeId,
        testOrganizationId,
        testUserId
      );
    });

    it('should throw NotFoundError when template does not exist', async () => {
      mockWorkerTypeRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteWorkerTypeTemplate(testWorkerTypeId, testOrganizationId, testUserId)
      ).rejects.toThrow('Worker type template not found');
    });
  });

  // ==================== WORKER TYPE ASSIGNMENTS ====================

  describe('assignWorkerType', () => {
    it('should assign worker type to employee with valid data', async () => {
      const assignmentData = {
        employeeRecordId: testEmployeeRecordId,
        workerTypeTemplateId: testWorkerTypeId,
        effectiveFrom: new Date('2025-01-01'),
        effectiveTo: null,
        payFrequency: 'monthly',
        paymentMethod: 'ach'
      };

      const template = createDbWorkerType();
      const dbAssignment = createDbAssignment();

      mockWorkerTypeRepository.findTemplateById.mockResolvedValue(template);
      mockWorkerTypeRepository.findWorkerTypeHistory.mockResolvedValue([]);
      mockWorkerTypeRepository.assignWorkerType.mockResolvedValue(dbAssignment);

      const result = await service.assignWorkerType(
        assignmentData,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual(mapAssignmentDbToApi(dbAssignment));
      expect(mockWorkerTypeRepository.assignWorkerType).toHaveBeenCalledWith(
        assignmentData,
        testOrganizationId,
        testUserId
      );
    });

    it('should throw ValidationError for invalid UUID formats', async () => {
      const invalidAssignment = {
        employeeRecordId: 'emp-123', // Invalid UUID
        workerTypeTemplateId: testWorkerTypeId,
        effectiveFrom: new Date('2025-01-01')
      };

      await expect(
        service.assignWorkerType(invalidAssignment, testOrganizationId, testUserId)
      ).rejects.toThrow();
    });

    it('should throw error when effectiveTo is before effectiveFrom', async () => {
      const invalidAssignment = {
        employeeRecordId: testEmployeeRecordId,
        workerTypeTemplateId: testWorkerTypeId,
        effectiveFrom: new Date('2025-01-15'),
        effectiveTo: new Date('2025-01-01') // Before effectiveFrom
      };

      await expect(
        service.assignWorkerType(invalidAssignment, testOrganizationId, testUserId)
      ).rejects.toThrow('Effective to date must be after effective from date');
    });

    it('should throw NotFoundError when template does not exist', async () => {
      const assignmentData = {
        employeeRecordId: testEmployeeRecordId,
        workerTypeTemplateId: testWorkerTypeId,
        effectiveFrom: new Date('2025-01-01')
      };

      mockWorkerTypeRepository.findTemplateById.mockResolvedValue(null);

      await expect(
        service.assignWorkerType(assignmentData, testOrganizationId, testUserId)
      ).rejects.toThrow('Worker type template not found');
    });
  });

  describe('getCurrentWorkerType', () => {
    it('should return current worker type for employee', async () => {
      const dbAssignment = createDbAssignment({ is_current: true });
      mockWorkerTypeRepository.findCurrentWorkerType.mockResolvedValue(dbAssignment);

      const result = await service.getCurrentWorkerType(
        testEmployeeRecordId,
        testOrganizationId
      );

      expect(result).toEqual(mapAssignmentDbToApi(dbAssignment));
      expect(mockWorkerTypeRepository.findCurrentWorkerType).toHaveBeenCalledWith(
        testEmployeeRecordId,
        testOrganizationId
      );
    });
  });

  describe('getWorkerTypeHistory', () => {
    it('should return worker type history for employee', async () => {
      const dbHistory = [
        createDbAssignment({ 
          effective_from: new Date('2025-01-01'),
          is_current: true 
        }),
        createDbAssignment({ 
          id: '923e4567-e89b-12d3-a456-426614174008',
          effective_from: new Date('2024-01-01'),
          effective_to: new Date('2024-12-31'),
          is_current: false 
        })
      ];

      mockWorkerTypeRepository.findWorkerTypeHistory.mockResolvedValue(dbHistory);

      const result = await service.getWorkerTypeHistory(
        testEmployeeRecordId,
        testOrganizationId
      );

      expect(result).toEqual(mapAssignmentsDbToApi(dbHistory));
      expect(result).toHaveLength(2);
      expect(mockWorkerTypeRepository.findWorkerTypeHistory).toHaveBeenCalledWith(
        testEmployeeRecordId,
        testOrganizationId
      );
    });
  });

  describe('bulkAssignWorkerTypes', () => {
    it('should handle bulk assignments with partial failures', async () => {
      const assignments = [
        {
          employeeRecordId: testEmployeeRecordId,
          workerTypeTemplateId: testWorkerTypeId,
          effectiveFrom: new Date('2025-01-01')
        },
        {
          employeeRecordId: 'a23e4567-e89b-12d3-a456-426614174009',
          workerTypeTemplateId: testWorkerTypeId,
          effectiveFrom: new Date('2025-01-01')
        }
      ];

      const template = createDbWorkerType();
      const dbAssignment = createDbAssignment();

      mockWorkerTypeRepository.findTemplateById.mockResolvedValue(template);
      mockWorkerTypeRepository.findWorkerTypeHistory.mockResolvedValue([]);
      
      // First succeeds, second fails
      mockWorkerTypeRepository.assignWorkerType
        .mockResolvedValueOnce(dbAssignment)
        .mockRejectedValueOnce(new Error('Database error'));

      const results = await service.bulkAssignWorkerTypes(
        assignments,
        testOrganizationId,
        testUserId
      );

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Database error');
    });
  });

  describe('getEmployeeCountByWorkerType', () => {
    it('should return employee count statistics', async () => {
      const mockCounts = [
        { id: testWorkerTypeId, name: 'Full-Time', code: 'FTE', employee_count: '15' },
        { id: 'b23e4567-e89b-12d3-a456-426614174010', name: 'Part-Time', code: 'PTE', employee_count: '8' }
      ];

      mockWorkerTypeRepository.countEmployeesByWorkerType.mockResolvedValue(mockCounts);

      const result = await service.getEmployeeCountByWorkerType(testOrganizationId);

      expect(result).toEqual(mockCounts);
      expect(mockWorkerTypeRepository.countEmployeesByWorkerType).toHaveBeenCalledWith(
        testOrganizationId
      );
    });
  });

  // ==================== TIER LIMIT VALIDATION ====================

  describe('checkWorkerTypeLimit', () => {
    it('should pass when limit is not exceeded', async () => {
      mockWorkerTypeRepository.getOrganizationTier.mockResolvedValue('professional');
      mockWorkerTypeRepository.findTemplatesByOrganization.mockResolvedValue([
        createDbWorkerType(),
        createDbWorkerType({ id: 'c23e4567-e89b-12d3-a456-426614174011' })
      ]);

      // Should not throw
      await expect(
        service.checkWorkerTypeLimit(testOrganizationId)
      ).resolves.toBeUndefined();
    });

    it('should handle organization not found', async () => {
      mockWorkerTypeRepository.getOrganizationTier.mockResolvedValue(null);

      await expect(
        service.checkWorkerTypeLimit(testOrganizationId)
      ).rejects.toThrow('Organization not found');
    });
  });
});
