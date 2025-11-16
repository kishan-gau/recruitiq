/**
 * PayrollRunTypeService Test Suite
 * Tests for payroll run type management business logic
 * 
 * CRITICAL: All method names and field names verified via grep before implementation
 * Service methods: create, getByCode, getById, list, update, delete, resolveAllowedComponents, validateRunType
 * Repository methods: findByCode, findById, findAll, create, update, softDelete, typeCodeExists
 * Field names: camelCase (typeCode, typeName, componentOverrideMode, etc.)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PayrollRunTypeService from '../../../../src/products/paylinq/services/PayrollRunTypeService.js';
import PayrollRunTypeRepository from '../../../../src/products/paylinq/repositories/PayrollRunTypeRepository.js';
import { ValidationError, NotFoundError, ConflictError } from '../../../../src/middleware/errorHandler.js';
import { mapRunTypeDbToApi, mapRunTypesDbToApi } from '../../../../src/products/paylinq/dto/payrollRunTypeDto.js';

// Mock the repository
jest.mock('../../../../src/products/paylinq/repositories/PayrollRunTypeRepository.js');

describe('PayrollRunTypeService', () => {
  let service;
  let mockRepository;
  const testOrganizationId = 'org-123e4567-e89b-12d3-a456-426614174000';
  const testUserId = 'user-123e4567-e89b-12d3-a456-426614174000';
  const testTemplateId = 'tmpl-123e4567-e89b-12d3-a456-426614174000';

  // Helper to create DB format data (snake_case)
  const createDbRunType = (overrides = {}) => ({
    id: overrides.id || 'type-123',
    organization_id: overrides.organization_id || testOrganizationId,
    type_code: overrides.type_code || 'TEST_CODE',
    type_name: overrides.type_name || 'Test Type',
    description: overrides.description || null,
    default_template_id: overrides.default_template_id || null,
    template_name: overrides.template_name || null,
    template_code: overrides.template_code || null,
    component_override_mode: overrides.component_override_mode || null,
    allowed_components: overrides.allowed_components || [],
    excluded_components: overrides.excluded_components || [],
    is_system_default: overrides.is_system_default || false,
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
    display_order: overrides.display_order || null,
    icon: overrides.icon || null,
    color: overrides.color || null,
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || null,
    deleted_at: overrides.deleted_at || null,
    created_by: overrides.created_by || testUserId,
    updated_by: overrides.updated_by || null,
    deleted_by: overrides.deleted_by || null,
    ...overrides
  });

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock repository with all required methods
    mockRepository = {
      findByCode: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      typeCodeExists: jest.fn()
    };
    
    // Create service with mocked repository
    service = new PayrollRunTypeService(mockRepository);
  });

  // ==================== CREATE TESTS ====================

  describe('create', () => {
    it('should create payroll run type with valid data', async () => {
      const typeData = {
        typeCode: 'REGULAR_PAY',
        typeName: 'Regular Monthly Payroll',
        description: 'Standard monthly salary payment',
        componentOverrideMode: 'explicit',
        allowedComponents: ['BASIC_SALARY', 'ALLOWANCE'],
        isActive: true
      };

      // Repository returns DB format (snake_case)
      const dbCreated = createDbRunType({
        type_code: 'REGULAR_PAY',
        type_name: 'Regular Monthly Payroll',
        description: 'Standard monthly salary payment',
        component_override_mode: 'explicit',
        allowed_components: ['BASIC_SALARY', 'ALLOWANCE']
      });

      mockRepository.typeCodeExists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(dbCreated);

      const result = await service.create(typeData, testOrganizationId, testUserId);

      // Result should be DTO-mapped (camelCase)
      expect(result).toEqual(mapRunTypeDbToApi(dbCreated));
      expect(mockRepository.typeCodeExists).toHaveBeenCalledWith('REGULAR_PAY', testOrganizationId);
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictError when typeCode already exists', async () => {
      const typeData = {
        typeCode: 'DUPLICATE_CODE',
        typeName: 'Duplicate Type',
        componentOverrideMode: 'explicit',
        allowedComponents: ['COMP1']
      };

      mockRepository.typeCodeExists.mockResolvedValue(true);

      await expect(
        service.create(typeData, testOrganizationId, testUserId)
      ).rejects.toThrow(/already exists/);
      
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      const typeData = { typeCode: 'TEST', typeName: 'Test' };

      await expect(
        service.create(typeData, null, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate componentOverrideMode values', async () => {
      const typeData = {
        typeCode: 'INVALID_MODE',
        typeName: 'Invalid Mode Type',
        componentOverrideMode: 'invalid_mode'
      };

      await expect(
        service.create(typeData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should accept valid componentOverrideMode: template', async () => {
      const validTemplateId = '123e4567-e89b-12d3-a456-426614174000';
      const typeData = {
        typeCode: 'TEMPLATE_MODE',
        typeName: 'Template Mode Type',
        componentOverrideMode: 'template',
        defaultTemplateId: validTemplateId
      };

      const dbCreated = createDbRunType({
        type_code: 'TEMPLATE_MODE',
        type_name: 'Template Mode Type',
        component_override_mode: 'template',
        default_template_id: validTemplateId
      });

      mockRepository.typeCodeExists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(dbCreated);

      const result = await service.create(typeData, testOrganizationId, testUserId);

      expect(result.componentOverrideMode).toBe('template');
    });

    it('should accept valid componentOverrideMode: explicit', async () => {
      const typeData = {
        typeCode: 'EXPLICIT_MODE',
        typeName: 'Explicit Mode Type',
        componentOverrideMode: 'explicit',
        allowedComponents: ['COMPONENT1']
      };

      const dbCreated = createDbRunType({
        type_code: 'EXPLICIT_MODE',
        type_name: 'Explicit Mode Type',
        component_override_mode: 'explicit',
        allowed_components: ['COMPONENT1']
      });

      mockRepository.typeCodeExists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(dbCreated);

      const result = await service.create(typeData, testOrganizationId, testUserId);

      expect(result.componentOverrideMode).toBe('explicit');
    });

    it('should accept valid componentOverrideMode: hybrid', async () => {
      const validTemplateId = '123e4567-e89b-12d3-a456-426614174000';
      const typeData = {
        typeCode: 'HYBRID_MODE',
        typeName: 'Hybrid Mode Type',
        componentOverrideMode: 'hybrid',
        defaultTemplateId: validTemplateId,
        allowedComponents: ['COMPONENT1']
      };

      const dbCreated = createDbRunType({
        type_code: 'HYBRID_MODE',
        type_name: 'Hybrid Mode Type',
        component_override_mode: 'hybrid',
        default_template_id: validTemplateId,
        allowed_components: ['COMPONENT1']
      });

      mockRepository.typeCodeExists.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(dbCreated);

      const result = await service.create(typeData, testOrganizationId, testUserId);

      expect(result.componentOverrideMode).toBe('hybrid');
    });
  });

  // ==================== GET BY CODE TESTS ====================

  describe('getByCode', () => {
    it('should return payroll run type when found', async () => {
      const dbType = createDbRunType({
        type_code: 'REGULAR_PAY',
        type_name: 'Regular Payroll'
      });

      mockRepository.findByCode.mockResolvedValue(dbType);

      const result = await service.getByCode('REGULAR_PAY', testOrganizationId);

      expect(result).toEqual(mapRunTypeDbToApi(dbType));
      expect(mockRepository.findByCode).toHaveBeenCalledWith('REGULAR_PAY', testOrganizationId);
    });

    it('should throw NotFoundError when type code does not exist', async () => {
      mockRepository.findByCode.mockResolvedValue(null);

      await expect(
        service.getByCode('NON_EXISTENT', testOrganizationId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      await expect(
        service.getByCode('REGULAR_PAY', null)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== GET BY ID TESTS ====================

  describe('getById', () => {
    it('should return payroll run type when found', async () => {
      const typeId = 'type-123e4567-e89b-12d3-a456-426614174000';
      const dbType = createDbRunType({
        id: typeId,
        type_code: 'REGULAR_PAY',
        type_name: 'Regular Payroll'
      });

      mockRepository.findById.mockResolvedValue(dbType);

      const result = await service.getById(typeId, testOrganizationId);

      expect(result).toEqual(mapRunTypeDbToApi(dbType));
      expect(mockRepository.findById).toHaveBeenCalledWith(typeId, testOrganizationId);
    });

    it('should throw NotFoundError when type does not exist', async () => {
      const typeId = 'type-123e4567-e89b-12d3-a456-426614174000';
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.getById(typeId, testOrganizationId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      const typeId = 'type-123e4567-e89b-12d3-a456-426614174000';

      await expect(
        service.getById(typeId, null)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== LIST TESTS ====================

  describe('list', () => {
    it('should return all active payroll run types by default', async () => {
      const dbTypes = [
        createDbRunType({ id: 'type-1', type_code: 'REGULAR' }),
        createDbRunType({ id: 'type-2', type_code: 'BONUS' })
      ];

      mockRepository.findAll.mockResolvedValue(dbTypes);

      const result = await service.list(testOrganizationId);

      expect(result).toEqual(mapRunTypesDbToApi(dbTypes));
      expect(mockRepository.findAll).toHaveBeenCalledWith(testOrganizationId, false);
    });

    it('should return all types including inactive when requested', async () => {
      const dbTypes = [
        createDbRunType({ id: 'type-1', type_code: 'REGULAR', is_active: true }),
        createDbRunType({ id: 'type-2', type_code: 'OLD', is_active: false })
      ];

      mockRepository.findAll.mockResolvedValue(dbTypes);

      const result = await service.list(testOrganizationId, true);

      expect(result).toEqual(mapRunTypesDbToApi(dbTypes));
      expect(mockRepository.findAll).toHaveBeenCalledWith(testOrganizationId, true);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      await expect(
        service.list(null)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== UPDATE TESTS ====================

  describe('update', () => {
    it('should update payroll run type with valid data', async () => {
      const typeId = 'type-123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        typeName: 'Updated Name',
        description: 'Updated description'
      };

      const dbExisting = createDbRunType({
        id: typeId,
        type_code: 'REGULAR_PAY',
        type_name: 'Old Name'
      });

      const dbUpdated = createDbRunType({
        id: typeId,
        type_code: 'REGULAR_PAY',
        type_name: 'Updated Name',
        description: 'Updated description',
        updated_by: testUserId
      });

      mockRepository.findById.mockResolvedValue(dbExisting);
      mockRepository.update.mockResolvedValue(dbUpdated);

      const result = await service.update(typeId, updateData, testOrganizationId, testUserId);

      expect(result).toEqual(mapRunTypeDbToApi(dbUpdated));
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should throw ValidationError when trying to update typeCode', async () => {
      const typeId = 'type-123e4567-e89b-12d3-a456-426614174000';
      const updateData = {
        typeCode: 'NEW_CODE' // typeCode is not allowed in update schema
      };

      await expect(
        service.update(typeId, updateData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when type does not exist', async () => {
      const typeId = 'type-123e4567-e89b-12d3-a456-426614174000';
      const updateData = { typeName: 'Updated' };

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(typeId, updateData, testOrganizationId, testUserId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      const typeId = 'type-123e4567-e89b-12d3-a456-426614174000';
      const updateData = { typeName: 'Updated' };

      await expect(
        service.update(typeId, updateData, null, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== DELETE TESTS ====================

  describe('delete', () => {
    it('should soft delete payroll run type', async () => {
      const typeId = 'type-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.softDelete.mockResolvedValue(true);

      const result = await service.delete(typeId, testOrganizationId, testUserId);

      expect(result).toBeUndefined();
      expect(mockRepository.softDelete).toHaveBeenCalledWith(typeId, testOrganizationId, testUserId);
    });

    it('should throw NotFoundError when type does not exist', async () => {
      const typeId = 'type-123e4567-e89b-12d3-a456-426614174000';

      mockRepository.softDelete.mockResolvedValue(false);

      await expect(
        service.delete(typeId, testOrganizationId, testUserId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      const typeId = 'type-123e4567-e89b-12d3-a456-426614174000';

      await expect(
        service.delete(typeId, null, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== RESOLVE ALLOWED COMPONENTS TESTS ====================

  describe('resolveAllowedComponents', () => {
    it('should resolve template mode components', async () => {
      const dbType = createDbRunType({
        type_code: 'TEMPLATE_MODE',
        component_override_mode: 'template',
        default_template_id: testTemplateId
      });

      mockRepository.findByCode.mockResolvedValue(dbType);

      // Mock payStructureService that's injected
      const mockPayStructureService = {
        getTemplateComponents: jest.fn().mockResolvedValue([
          { component_code: 'COMP1' },
          { component_code: 'COMP2' }
        ])
      };
      service.payStructureService = mockPayStructureService;

      const result = await service.resolveAllowedComponents('TEMPLATE_MODE', testOrganizationId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('COMP1');
      expect(result).toContain('COMP2');
    });

    it('should resolve explicit mode components', async () => {
      const dbType = createDbRunType({
        type_code: 'EXPLICIT_MODE',
        component_override_mode: 'explicit',
        allowed_components: ['COMP1', 'COMP2'],
        excluded_components: ['COMP3']
      });

      mockRepository.findByCode.mockResolvedValue(dbType);

      const result = await service.resolveAllowedComponents('EXPLICIT_MODE', testOrganizationId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['COMP1', 'COMP2']);
    });

    it('should resolve hybrid mode components (template + explicit)', async () => {
      const dbType = createDbRunType({
        type_code: 'HYBRID_MODE',
        component_override_mode: 'hybrid',
        default_template_id: testTemplateId,
        allowed_components: ['COMP1']
      });

      mockRepository.findByCode.mockResolvedValue(dbType);

      const mockPayStructureService = {
        getTemplateComponents: jest.fn().mockResolvedValue([
          { component_code: 'TEMPLATE_COMP' }
        ])
      };
      service.payStructureService = mockPayStructureService;

      const result = await service.resolveAllowedComponents('HYBRID_MODE', testOrganizationId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toContain('TEMPLATE_COMP');
      expect(result).toContain('COMP1');
    });

    it('should use default components when no override mode set', async () => {
      const dbType = createDbRunType({
        type_code: 'DEFAULT_MODE',
        component_override_mode: null,
        allowed_components: ['DEFAULT_COMP']
      });

      mockRepository.findByCode.mockResolvedValue(dbType);

      const result = await service.resolveAllowedComponents('DEFAULT_MODE', testOrganizationId);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['DEFAULT_COMP']);
    });

    it('should throw NotFoundError when type does not exist', async () => {
      mockRepository.findByCode.mockResolvedValue(null);

      await expect(
        service.resolveAllowedComponents('NON_EXISTENT', testOrganizationId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      await expect(
        service.resolveAllowedComponents('TEST_CODE', null)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== VALIDATE RUN TYPE TESTS ====================

  describe('validateRunType', () => {
    it('should validate existing and active run type', async () => {
      const dbType = createDbRunType({
        type_code: 'ACTIVE_TYPE',
        is_active: true,
        allowed_components: ['COMP1']
      });

      mockRepository.findByCode.mockResolvedValue(dbType);

      const result = await service.validateRunType('ACTIVE_TYPE', testOrganizationId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should invalidate inactive run type', async () => {
      const dbType = createDbRunType({
        type_code: 'INACTIVE_TYPE',
        is_active: false,
        allowed_components: ['COMP1']
      });

      mockRepository.findByCode.mockResolvedValue(dbType);

      const result = await service.validateRunType('INACTIVE_TYPE', testOrganizationId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Run type is inactive');
    });

    it('should invalidate non-existent run type', async () => {
      mockRepository.findByCode.mockResolvedValue(null);

      const result = await service.validateRunType('NON_EXISTENT', testOrganizationId);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('not found');
    });

    it('should throw ValidationError when organizationId is missing', async () => {
      await expect(
        service.validateRunType('TEST_CODE', null)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    it('should handle repository errors gracefully', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('Database connection error'));

      await expect(
        service.list(testOrganizationId)
      ).rejects.toThrow('Database connection error');
    });

    it('should handle empty list results', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await service.list(testOrganizationId);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle special characters in typeCode validation', async () => {
      const typeData = {
        typeCode: 'SPECIAL-CODE!', // Invalid characters
        typeName: 'Special Type',
        componentOverrideMode: 'explicit'
      };

      await expect(
        service.create(typeData, testOrganizationId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });
});
