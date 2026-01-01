/**
 * Pay Structure DTO Unit Tests
 * 
 * Tests for pay structure data transformation functions.
 * Validates snake_case (DB) to camelCase (API) conversion.
 * 
 * COMPLIANCE: 100% adherence to Testing Standards
 * - ES Modules with .js extensions
 * - Jest imports from @jest/globals
 * - Pure function testing
 * - EXACT function names from DTO (verified against source)
 * 
 * VERIFIED FUNCTIONS (from source analysis):
 * 1. mapPayStructureDbToApi(dbStructure)
 * 2. mapPayStructuresDbToApi(dbStructures)
 * 3. mapPayStructureApiToDb(apiData)
 * 4. mapPayStructureWithTemplateDbToApi(dbStructure)
 * 5. mapPayStructureWithTemplateSummaryDbToApi(dbStructure)
 * 6. mapPayStructureTemplateDbToApi(dbTemplate)
 * 7. mapPayStructureTemplatesDbToApi(dbTemplates)
 */

import { describe, it, expect } from '@jest/globals';
import {
  mapPayStructureDbToApi,
  mapPayStructuresDbToApi,
  mapPayStructureApiToDb,
  mapPayStructureWithTemplateDbToApi,
  mapPayStructureWithTemplateSummaryDbToApi,
  mapPayStructureTemplateDbToApi,
  mapPayStructureTemplatesDbToApi
} from '../../../../src/products/paylinq/dto/payStructureDto.js';

describe('Pay Structure DTO', () => {
  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  const testStructureId = '660e8400-e29b-41d4-a716-446655440002';
  const testTemplateId = '770e8400-e29b-41d4-a716-446655440003';

  // ==================== mapPayStructureDbToApi ====================

  describe('mapPayStructureDbToApi', () => {
    it('should map database pay structure to API format', () => {
      // Arrange
      const dbStructure = {
        id: testStructureId,
        organization_id: testOrgId,
        structure_code: 'STR001',
        structure_name: 'Standard Structure',
        description: 'Standard pay structure',
        is_template: false,
        parent_template_id: testTemplateId,
        base_salary: '50000.00',
        allowances: ['housing', 'transport'],
        deductions: ['tax', 'pension'],
        status: 'active',
        created_by: testUserId,
        created_at: new Date('2024-01-01'),
        updated_by: testUserId,
        updated_at: new Date('2024-01-01'),
        deleted_at: null
      };

      // Act
      const result = mapPayStructureDbToApi(dbStructure);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbStructure.id);
      expect(result.organizationId).toBe(dbStructure.organization_id);
      expect(result.structureCode).toBe(dbStructure.structure_code);
      expect(result.structureName).toBe(dbStructure.structure_name);
      expect(result.description).toBe(dbStructure.description);
      expect(result.isTemplate).toBe(dbStructure.is_template);
      expect(result.parentTemplateId).toBe(dbStructure.parent_template_id);
      expect(result.baseSalary).toBe(dbStructure.base_salary);
      expect(result.allowances).toEqual(dbStructure.allowances);
      expect(result.deductions).toEqual(dbStructure.deductions);
      expect(result.status).toBe(dbStructure.status);
      expect(result.createdBy).toBe(dbStructure.created_by);
      expect(result.createdAt).toBe(dbStructure.created_at);
      expect(result.updatedBy).toBe(dbStructure.updated_by);
      expect(result.updatedAt).toBe(dbStructure.updated_at);
      expect(result.deletedAt).toBeNull();
    });

    it('should return null for null input', () => {
      const result = mapPayStructureDbToApi(null);
      expect(result).toBeNull();
    });

    it('should handle structure with null optional fields', () => {
      // Arrange
      const dbStructure = {
        id: testStructureId,
        organization_id: testOrgId,
        structure_code: 'MIN001',
        structure_name: 'Minimal Structure',
        description: null,
        is_template: false,
        parent_template_id: null,
        base_salary: null,
        allowances: [],
        deductions: [],
        status: 'draft',
        created_by: testUserId,
        created_at: new Date('2024-01-01'),
        updated_by: testUserId,
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapPayStructureDbToApi(dbStructure);

      // Assert
      expect(result).toBeDefined();
      expect(result.description).toBeNull();
      expect(result.parentTemplateId).toBeNull();
      expect(result.baseSalary).toBeNull();
    });
  });

  // ==================== mapPayStructuresDbToApi ====================

  describe('mapPayStructuresDbToApi', () => {
    it('should map array of pay structures to API format', () => {
      // Arrange
      const dbStructures = [
        {
          id: testStructureId,
          organization_id: testOrgId,
          structure_code: 'STR001',
          structure_name: 'Structure 1',
          status: 'active',
          created_by: testUserId,
          created_at: new Date('2024-01-01'),
          updated_by: testUserId,
          updated_at: new Date('2024-01-01')
        },
        {
          id: '880e8400-e29b-41d4-a716-446655440004',
          organization_id: testOrgId,
          structure_code: 'STR002',
          structure_name: 'Structure 2',
          status: 'draft',
          created_by: testUserId,
          created_at: new Date('2024-01-01'),
          updated_by: testUserId,
          updated_at: new Date('2024-01-01')
        }
      ];

      // Act
      const result = mapPayStructuresDbToApi(dbStructures);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].structureName).toBe('Structure 1');
      expect(result[1].structureName).toBe('Structure 2');
    });

    it('should return empty array for non-array input', () => {
      const result = mapPayStructuresDbToApi(null);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  // ==================== mapPayStructureApiToDb ====================

  describe('mapPayStructureApiToDb', () => {
    it('should map API pay structure to database format', () => {
      // Arrange
      const apiData = {
        structureCode: 'API_STR',
        structureName: 'API Structure',
        description: 'From API',
        isTemplate: true,
        parentTemplateId: testTemplateId,
        baseSalary: 60000,
        allowances: ['housing'],
        deductions: ['tax'],
        status: 'active'
      };

      // Act
      const result = mapPayStructureApiToDb(apiData);

      // Assert
      expect(result).toBeDefined();
      expect(result.structure_code).toBe(apiData.structureCode);
      expect(result.structure_name).toBe(apiData.structureName);
      expect(result.description).toBe(apiData.description);
      expect(result.is_template).toBe(apiData.isTemplate);
      expect(result.parent_template_id).toBe(apiData.parentTemplateId);
      expect(result.base_salary).toBe(apiData.baseSalary);
      expect(result.allowances).toEqual(apiData.allowances);
      expect(result.deductions).toEqual(apiData.deductions);
      expect(result.status).toBe(apiData.status);
    });

    it('should return null for null input', () => {
      const result = mapPayStructureApiToDb(null);
      expect(result).toBeNull();
    });

    it('should only include defined fields', () => {
      // Arrange
      const apiData = {
        structureCode: 'PARTIAL',
        structureName: 'Partial Structure'
      };

      // Act
      const result = mapPayStructureApiToDb(apiData);

      // Assert
      expect(result.structure_code).toBe('PARTIAL');
      expect(result.structure_name).toBe('Partial Structure');
      expect(result.description).toBeUndefined();
    });
  });

  // ==================== mapPayStructureWithTemplateDbToApi ====================

  describe('mapPayStructureWithTemplateDbToApi', () => {
    it('should include template details when is_template is true', () => {
      // Arrange
      const dbStructure = {
        id: testStructureId,
        organization_id: testOrgId,
        structure_code: 'TMPL001',
        structure_name: 'Template Structure',
        is_template: true,
        component_count: 10,
        usage_count: 5,
        status: 'active',
        created_by: testUserId,
        created_at: new Date('2024-01-01'),
        updated_by: testUserId,
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapPayStructureWithTemplateDbToApi(dbStructure);

      // Assert
      expect(result).toBeDefined();
      expect(result.isTemplate).toBe(true);
      expect(result.componentCount).toBe(10);
      expect(result.usageCount).toBe(5);
    });

    it('should include parent template info when available', () => {
      // Arrange
      const dbStructure = {
        id: testStructureId,
        organization_id: testOrgId,
        structure_code: 'CHILD001',
        structure_name: 'Child Structure',
        is_template: false,
        parent_template_id: testTemplateId,
        parent_template_name: 'Parent Template',
        parent_template_code: 'PARENT001',
        status: 'active',
        created_by: testUserId,
        created_at: new Date('2024-01-01'),
        updated_by: testUserId,
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapPayStructureWithTemplateDbToApi(dbStructure);

      // Assert
      expect(result.parentTemplate).toBeDefined();
      expect(result.parentTemplate.id).toBe(testTemplateId);
      expect(result.parentTemplate.name).toBe('Parent Template');
      expect(result.parentTemplate.code).toBe('PARENT001');
    });

    it('should return null for null input', () => {
      const result = mapPayStructureWithTemplateDbToApi(null);
      expect(result).toBeNull();
    });
  });

  // ==================== mapPayStructureWithTemplateSummaryDbToApi ====================

  describe('mapPayStructureWithTemplateSummaryDbToApi', () => {
    it('should map structure to summary format', () => {
      // Arrange
      const dbStructure = {
        id: testStructureId,
        structure_code: 'SUM001',
        structure_name: 'Summary Structure',
        is_template: false,
        parent_template_id: testTemplateId,
        base_salary: '55000.00',
        status: 'active',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapPayStructureWithTemplateSummaryDbToApi(dbStructure);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(testStructureId);
      expect(result.structureCode).toBe('SUM001');
      expect(result.structureName).toBe('Summary Structure');
      expect(result.isTemplate).toBe(false);
      expect(result.parentTemplateId).toBe(testTemplateId);
      expect(result.baseSalary).toBe('55000.00');
      expect(result.status).toBe('active');
      expect(result.createdAt).toBe(dbStructure.created_at);
      expect(result.updatedAt).toBe(dbStructure.updated_at);
    });

    it('should return null for null input', () => {
      const result = mapPayStructureWithTemplateSummaryDbToApi(null);
      expect(result).toBeNull();
    });
  });

  // ==================== mapPayStructureTemplateDbToApi ====================

  describe('mapPayStructureTemplateDbToApi', () => {
    it('should map database template to API format', () => {
      // Arrange
      const dbTemplate = {
        id: testTemplateId,
        organization_id: testOrgId,
        template_code: 'TMPL_CODE',
        template_name: 'Template Name',
        description: 'Template description',
        version_major: 2,
        version_minor: 1,
        version_patch: 3,
        parent_version_id: null,
        status: 'published',
        is_organization_default: true,
        effective_from: new Date('2024-01-01'),
        effective_to: new Date('2024-12-31'),
        notes: 'Template notes',
        change_log: 'Version 2.1.3 changes',
        component_count: 15,
        assigned_worker_count: 25,
        created_by: testUserId,
        created_by_name: 'John Doe',
        created_at: new Date('2024-01-01'),
        updated_by: testUserId,
        updated_at: new Date('2024-01-01'),
        deleted_at: null,
        published_at: new Date('2024-01-15'),
        published_by: testUserId,
        deprecated_at: null
      };

      // Act
      const result = mapPayStructureTemplateDbToApi(dbTemplate);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(dbTemplate.id);
      expect(result.organizationId).toBe(dbTemplate.organization_id);
      expect(result.templateCode).toBe(dbTemplate.template_code);
      expect(result.templateName).toBe(dbTemplate.template_name);
      expect(result.description).toBe(dbTemplate.description);
      expect(result.versionMajor).toBe(2);
      expect(result.versionMinor).toBe(1);
      expect(result.versionPatch).toBe(3);
      expect(result.versionString).toBe('2.1.3');
      expect(result.status).toBe(dbTemplate.status);
      expect(result.isOrganizationDefault).toBe(true);
      expect(result.componentCount).toBe(15);
      expect(result.assignedWorkerCount).toBe(25);
    });

    it('should return null for null input', () => {
      const result = mapPayStructureTemplateDbToApi(null);
      expect(result).toBeNull();
    });

    it('should handle default version numbers', () => {
      // Arrange
      const dbTemplate = {
        id: testTemplateId,
        organization_id: testOrgId,
        template_code: 'V1_TMPL',
        template_name: 'Version 1 Template',
        status: 'draft',
        created_by: testUserId,
        created_at: new Date('2024-01-01'),
        updated_by: testUserId,
        updated_at: new Date('2024-01-01')
      };

      // Act
      const result = mapPayStructureTemplateDbToApi(dbTemplate);

      // Assert
      expect(result.versionMajor).toBe(1);
      expect(result.versionMinor).toBe(0);
      expect(result.versionPatch).toBe(0);
      expect(result.versionString).toBe('1.0.0');
    });
  });

  // ==================== mapPayStructureTemplatesDbToApi ====================

  describe('mapPayStructureTemplatesDbToApi', () => {
    it('should map array of templates to API format', () => {
      // Arrange
      const dbTemplates = [
        {
          id: testTemplateId,
          organization_id: testOrgId,
          template_code: 'TMPL1',
          template_name: 'Template 1',
          status: 'published',
          created_by: testUserId,
          created_at: new Date('2024-01-01'),
          updated_by: testUserId,
          updated_at: new Date('2024-01-01')
        },
        {
          id: '990e8400-e29b-41d4-a716-446655440005',
          organization_id: testOrgId,
          template_code: 'TMPL2',
          template_name: 'Template 2',
          status: 'draft',
          created_by: testUserId,
          created_at: new Date('2024-01-01'),
          updated_by: testUserId,
          updated_at: new Date('2024-01-01')
        }
      ];

      // Act
      const result = mapPayStructureTemplatesDbToApi(dbTemplates);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].templateName).toBe('Template 1');
      expect(result[1].templateName).toBe('Template 2');
    });

    it('should return empty array for non-array input', () => {
      const result = mapPayStructureTemplatesDbToApi(null);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });
});
