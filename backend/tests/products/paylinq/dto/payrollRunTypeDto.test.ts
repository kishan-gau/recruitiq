/**
 * Payroll Run Type DTO Unit Tests
 * 
 * Tests for payroll run type data transformation functions.
 * Validates snake_case (DB) to camelCase (API) conversion.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Pure function testing
 * - EXACT function names from DTO (verified against source)
 * 
 * VERIFIED FUNCTIONS (from source analysis):
 * 1. mapRunTypeDbToApi(dbRunType)
 * 2. mapRunTypesDbToApi(dbRunTypes)
 * 3. mapRunTypeApiToDb(apiData)
 * 4. mapRunTypeToSummary(runType)
 * 5. mapRunTypesToSummary(dbRunTypes)
 */

import { describe, it, expect } from '@jest/globals';
import {
  mapRunTypeDbToApi,
  mapRunTypesDbToApi,
  mapRunTypeApiToDb,
  mapRunTypeToSummary,
  mapRunTypesToSummary
} from '../../../../src/products/paylinq/dto/payrollRunTypeDto.js';

describe('Payroll Run Type DTO', () => {
  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  const testRunTypeId = '660e8400-e29b-41d4-a716-446655440002';
  const testTemplateId = '770e8400-e29b-41d4-a716-446655440003';

  // ==================== mapRunTypeDbToApi ====================

  describe('mapRunTypeDbToApi', () => {
    it('should map database run type to API format', () => {
      // Arrange
      const dbRunType = {
        id: testRunTypeId,
        organization_id: testOrgId,
        type_code: 'REGULAR',
        type_name: 'Regular Payroll',
        description: 'Standard bi-weekly payroll',
        default_template_id: testTemplateId,
        template_name: 'Standard Template',
        template_code: 'STD_001',
        component_override_mode: 'allow',
        allowed_components: ['BASE', 'OT', 'BONUS'],
        excluded_components: ['ADVANCE'],
        is_system_default: true,
        is_active: true,
        display_order: 1,
        icon: 'calendar',
        color: 'blue',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        deleted_at: null,
        created_by: testUserId,
        updated_by: testUserId,
        deleted_by: null
      };

      // Act
      const result = mapRunTypeDbToApi(dbRunType);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbRunType.id);
      expect(result.organizationId).toBe(dbRunType.organization_id);
      expect(result.typeCode).toBe(dbRunType.type_code);
      expect(result.typeName).toBe(dbRunType.type_name);
      expect(result.description).toBe(dbRunType.description);
      expect(result.defaultTemplateId).toBe(dbRunType.default_template_id);
      expect(result.templateName).toBe(dbRunType.template_name);
      expect(result.templateCode).toBe(dbRunType.template_code);
      expect(result.componentOverrideMode).toBe(dbRunType.component_override_mode);
      expect(result.allowedComponents).toEqual(dbRunType.allowed_components);
      expect(result.excludedComponents).toEqual(dbRunType.excluded_components);
      expect(result.isSystemDefault).toBe(dbRunType.is_system_default);
      expect(result.isActive).toBe(dbRunType.is_active);
      expect(result.displayOrder).toBe(dbRunType.display_order);
      expect(result.icon).toBe(dbRunType.icon);
      expect(result.color).toBe(dbRunType.color);
      expect(result.createdAt).toBe(dbRunType.created_at);
      expect(result.updatedAt).toBe(dbRunType.updated_at);
      expect(result.deletedAt).toBeNull();
    });

    it('should return null for null input', () => {
      const result = mapRunTypeDbToApi(null);
      expect(result).toBeNull();
    });

    it('should handle run type with null optional fields', () => {
      // Arrange
      const dbRunType = {
        id: testRunTypeId,
        organization_id: testOrgId,
        type_code: 'CUSTOM',
        type_name: 'Custom Run',
        description: 'Custom payroll run',
        default_template_id: null,
        template_name: null,
        template_code: null,
        component_override_mode: 'none',
        allowed_components: [],
        excluded_components: [],
        is_system_default: false,
        is_active: true,
        display_order: 99,
        icon: null,
        color: null,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapRunTypeDbToApi(dbRunType);

      // Assert
      expect(result).toBeDefined();
      expect(result.defaultTemplateId).toBeNull();
      expect(result.templateName).toBeNull();
      expect(result.templateCode).toBeNull();
      expect(result.allowedComponents).toEqual([]);
      expect(result.excludedComponents).toEqual([]);
    });
  });

  // ==================== mapRunTypesDbToApi ====================

  describe('mapRunTypesDbToApi', () => {
    it('should map array of run types to API format', () => {
      // Arrange
      const dbRunTypes = [
        {
          id: testRunTypeId,
          organization_id: testOrgId,
          type_code: 'TYPE1',
          type_name: 'Type 1',
          description: 'First type',
          is_system_default: false,
          is_active: true,
          display_order: 1,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        },
        {
          id: '880e8400-e29b-41d4-a716-446655440004',
          organization_id: testOrgId,
          type_code: 'TYPE2',
          type_name: 'Type 2',
          description: 'Second type',
          is_system_default: false,
          is_active: true,
          display_order: 2,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        }
      ];

      // Act
      const result = mapRunTypesDbToApi(dbRunTypes);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].typeName).toBe('Type 1');
      expect(result[1].typeName).toBe('Type 2');
    });

    it('should return empty array for non-array input', () => {
      const result = mapRunTypesDbToApi(null);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  // ==================== mapRunTypeApiToDb ====================

  describe('mapRunTypeApiToDb', () => {
    it('should map API run type to database format', () => {
      // Arrange
      const apiData = {
        typeCode: 'NEW_TYPE',
        typeName: 'New Type',
        description: 'New run type',
        defaultTemplateId: testTemplateId,
        componentOverrideMode: 'restrict',
        allowedComponents: ['BASE', 'BONUS'],
        excludedComponents: [],
        isActive: true,
        displayOrder: 5,
        icon: 'star',
        color: 'green'
      };

      // Act
      const result = mapRunTypeApiToDb(apiData);

      // Assert
      expect(result).toBeDefined();
      expect(result.type_code).toBe(apiData.typeCode);
      expect(result.type_name).toBe(apiData.typeName);
      expect(result.description).toBe(apiData.description);
      expect(result.default_template_id).toBe(apiData.defaultTemplateId);
      expect(result.component_override_mode).toBe(apiData.componentOverrideMode);
      expect(result.allowed_components).toEqual(apiData.allowedComponents);
      expect(result.excluded_components).toEqual(apiData.excludedComponents);
      expect(result.is_active).toBe(apiData.isActive);
      expect(result.display_order).toBe(apiData.displayOrder);
      expect(result.icon).toBe(apiData.icon);
      expect(result.color).toBe(apiData.color);
    });

    it('should return null for null input', () => {
      const result = mapRunTypeApiToDb(null);
      expect(result).toBeNull();
    });

    it('should only include defined fields', () => {
      // Arrange
      const apiData = {
        typeCode: 'PARTIAL',
        typeName: 'Partial Type'
      };

      // Act
      const result = mapRunTypeApiToDb(apiData);

      // Assert
      expect(result.type_code).toBe('PARTIAL');
      expect(result.type_name).toBe('Partial Type');
      expect(result.description).toBeUndefined();
    });
  });

  // ==================== mapRunTypeToSummary ====================

  describe('mapRunTypeToSummary', () => {
    it('should map run type to summary format', () => {
      // Arrange
      const runType = {
        id: testRunTypeId,
        typeCode: 'SUMMARY',
        typeName: 'Summary Type',
        description: 'Test summary',
        icon: 'check',
        color: 'purple',
        isActive: true,
        allowedComponents: ['COMP1', 'COMP2', 'COMP3']
      };

      // Act
      const result = mapRunTypeToSummary(runType);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(runType.id);
      expect(result.typeCode).toBe(runType.typeCode);
      expect(result.typeName).toBe(runType.typeName);
      expect(result.description).toBe(runType.description);
      expect(result.icon).toBe(runType.icon);
      expect(result.color).toBe(runType.color);
      expect(result.isActive).toBe(true);
      expect(result.componentCount).toBe(3);
    });

    it('should handle database format', () => {
      // Arrange
      const runType = {
        id: testRunTypeId,
        type_code: 'DB_FORMAT',
        type_name: 'DB Format Type',
        description: 'From DB',
        icon: 'db',
        color: 'gray',
        is_active: true,
        allowed_components: ['A', 'B']
      };

      // Act
      const result = mapRunTypeToSummary(runType);

      // Assert
      expect(result.typeCode).toBe('DB_FORMAT');
      expect(result.typeName).toBe('DB Format Type');
      expect(result.isActive).toBe(true);
      expect(result.componentCount).toBe(2);
    });

    it('should return null for null input', () => {
      const result = mapRunTypeToSummary(null);
      expect(result).toBeNull();
    });
  });

  // ==================== mapRunTypesToSummary ====================

  describe('mapRunTypesToSummary', () => {
    it('should map array to summary format', () => {
      // Arrange
      const dbRunTypes = [
        {
          id: testRunTypeId,
          type_code: 'SUM1',
          type_name: 'Summary 1',
          is_active: true,
          allowed_components: ['A']
        },
        {
          id: '990e8400-e29b-41d4-a716-446655440005',
          type_code: 'SUM2',
          type_name: 'Summary 2',
          is_active: false,
          allowed_components: []
        }
      ];

      // Act
      const result = mapRunTypesToSummary(dbRunTypes);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].typeName).toBe('Summary 1');
      expect(result[1].typeName).toBe('Summary 2');
    });

    it('should return empty array for non-array input', () => {
      const result = mapRunTypesToSummary(null);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });
});
