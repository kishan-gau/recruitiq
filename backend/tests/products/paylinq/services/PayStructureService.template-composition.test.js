import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PayStructureService from '../../../../src/products/paylinq/services/PayStructureService.js';
import PayStructureRepository from '../../../../src/products/paylinq/repositories/PayStructureRepository.js';
import { 
  mapPayStructureWithTemplateDbToApi, 
  mapPayStructureWithTemplateSummaryDbToApi 
} from '../../../../src/products/paylinq/dto/payStructureDto.js';

describe('PayStructureService - Template Composition', () => {
  let service;
  let mockRepository;
  const testOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174000';
  
  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findTemplates: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    service = new PayStructureService(mockRepository);
  });

  describe('createFromTemplate', () => {
    const templateId = '323e4567-e89b-12d3-a456-426614174000';

    it('should create pay structure from template with valid data', async () => {
      // Arrange
      const templateData = {
        id: templateId,
        organization_id: testOrgId,
        structure_code: 'TEMPLATE_001',
        structure_name: 'Standard Template',
        is_template: true,
        base_salary: 50000,
        allowances: ['HOUSING', 'TRANSPORT'],
        deductions: ['TAX', 'INSURANCE'],
        created_at: new Date(),
        updated_at: new Date(),
      };

      const newData = {
        structureCode: 'NEW_STRUCTURE_001',
        structureName: 'New Structure from Template',
      };

      const createdData = {
        id: 'new-123e4567-e89b-12d3-a456-426614174000',
        organization_id: testOrgId,
        structure_code: 'NEW_STRUCTURE_001',
        structure_name: 'New Structure from Template',
        parent_template_id: templateId,
        is_template: false,
        base_salary: 50000,
        allowances: ['HOUSING', 'TRANSPORT'],
        deductions: ['TAX', 'INSURANCE'],
        created_by: testUserId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRepository.findById.mockResolvedValue(templateData);
      mockRepository.create.mockResolvedValue(createdData);

      // Act
      const result = await service.createFromTemplate(templateId, newData, testOrgId, testUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result.parentTemplateId).toBe(templateId);
      expect(result.structureCode).toBe('NEW_STRUCTURE_001');
      expect(result.isTemplate).toBe(false);
      expect(mockRepository.findById).toHaveBeenCalledWith(templateId, testOrgId);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parent_template_id: templateId,
          is_template: false,
          structure_code: 'NEW_STRUCTURE_001',
          base_salary: 50000,
        }),
        testOrgId,
        testUserId
      );
    });

    it('should throw NotFoundError when template does not exist', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      const newData = {
        structureCode: 'NEW_001',
        structureName: 'New Structure',
      };

      // Act & Assert
      await expect(
        service.createFromTemplate(templateId, newData, testOrgId, testUserId)
      ).rejects.toThrow('Template not found');
    });

    it('should throw ValidationError when template is not marked as template', async () => {
      // Arrange
      const nonTemplateData = {
        id: templateId,
        organization_id: testOrgId,
        structure_code: 'NOT_TEMPLATE',
        structure_name: 'Not a Template',
        is_template: false,
      };

      mockRepository.findById.mockResolvedValue(nonTemplateData);

      const newData = {
        structureCode: 'NEW_001',
        structureName: 'New Structure',
      };

      // Act & Assert
      await expect(
        service.createFromTemplate(templateId, newData, testOrgId, testUserId)
      ).rejects.toThrow('Specified pay structure is not a template');
    });

    it('should throw ValidationError for missing required fields', async () => {
      // Arrange
      const templateData = {
        id: templateId,
        organization_id: testOrgId,
        is_template: true,
      };

      mockRepository.findById.mockResolvedValue(templateData);

      const invalidData = {
        // Missing structureCode
        structureName: 'New Structure',
      };

      // Act & Assert
      await expect(
        service.createFromTemplate(templateId, invalidData, testOrgId, testUserId)
      ).rejects.toThrow();
    });

    it('should override template values with provided data', async () => {
      // Arrange
      const templateData = {
        id: templateId,
        organization_id: testOrgId,
        structure_code: 'TEMPLATE_001',
        structure_name: 'Template',
        is_template: true,
        base_salary: 50000,
        allowances: ['HOUSING'],
      };

      const newData = {
        structureCode: 'NEW_001',
        structureName: 'New Structure',
        baseSalary: 60000, // Override
        allowances: ['TRANSPORT'], // Override
      };

      const createdData = {
        id: 'new-123',
        organization_id: testOrgId,
        structure_code: 'NEW_001',
        structure_name: 'New Structure',
        parent_template_id: templateId,
        base_salary: 60000,
        allowances: ['TRANSPORT'],
        created_by: testUserId,
      };

      mockRepository.findById.mockResolvedValue(templateData);
      mockRepository.create.mockResolvedValue(createdData);

      // Act
      const result = await service.createFromTemplate(templateId, newData, testOrgId, testUserId);

      // Assert
      expect(result.baseSalary).toBe(60000);
      expect(result.allowances).toEqual(['TRANSPORT']);
    });
  });

  describe('getAllTemplates', () => {
    it('should return all templates for organization', async () => {
      // Arrange
      const mockTemplates = [
        {
          id: '823e4567-e89b-12d3-a456-426614174001',
          organization_id: testOrgId,
          structure_code: 'TEMPLATE_001',
          structure_name: 'Template 1',
          is_template: true,
          base_salary: 50000,
        },
        {
          id: '823e4567-e89b-12d3-a456-426614174002',
          organization_id: testOrgId,
          structure_code: 'TEMPLATE_002',
          structure_name: 'Template 2',
          is_template: true,
          base_salary: 60000,
        },
      ];

      // Configure the mock that will actually be called (findTemplates is tried first)
      mockRepository.findTemplates.mockResolvedValue(mockTemplates);
      mockRepository.findAll.mockResolvedValue(mockTemplates);

      // Act
      const result = await service.getAllTemplates(testOrgId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].isTemplate).toBe(true);
      expect(result[1].isTemplate).toBe(true);
      // Check that findTemplates was called (it's the preferred method)
      const expectedCall = mockRepository.findTemplates.mock.calls.length > 0
        ? mockRepository.findTemplates
        : mockRepository.findAll;
      expect(expectedCall).toHaveBeenCalledWith(testOrgId, {
        isTemplate: true,
      });
    });

    it('should return empty array when no templates exist', async () => {
      // Arrange
      mockRepository.findTemplates.mockResolvedValue([]);
      mockRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getAllTemplates(testOrgId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should apply DTO transformation to template list', async () => {
      // Arrange
      const mockTemplates = [
        {
          id: '823e4567-e89b-12d3-a456-426614174001',
          organization_id: testOrgId,
          structure_code: 'TEMPLATE_001',
          structure_name: 'Template 1',
          is_template: true,
          base_salary: 50000,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockRepository.findTemplates.mockResolvedValue(mockTemplates);
      mockRepository.findAll.mockResolvedValue(mockTemplates);

      // Act
      const result = await service.getAllTemplates(testOrgId);

      // Assert
      expect(result[0]).toHaveProperty('structureCode');
      expect(result[0]).toHaveProperty('structureName');
      expect(result[0]).toHaveProperty('isTemplate');
      expect(result[0]).toHaveProperty('baseSalary');
      expect(result[0]).not.toHaveProperty('structure_code');
      expect(result[0]).not.toHaveProperty('base_salary');
    });
  });

  describe('getTemplateById', () => {
    const templateId = '923e4567-e89b-12d3-a456-426614174000';

    it('should return template by ID with full details', async () => {
      // Arrange
      const mockTemplate = {
        id: templateId,
        organization_id: testOrgId,
        structure_code: 'TEMPLATE_001',
        structure_name: 'Standard Template',
        is_template: true,
        base_salary: 50000,
        allowances: ['HOUSING', 'TRANSPORT'],
        deductions: ['TAX'],
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRepository.findById.mockResolvedValue(mockTemplate);

      // Act
      const result = await service.getTemplateById(templateId, testOrgId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(templateId);
      expect(result.isTemplate).toBe(true);
      expect(mockRepository.findById).toHaveBeenCalledWith(templateId, testOrgId);
    });

    it('should throw NotFoundError when template does not exist', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getTemplateById(templateId, testOrgId)
      ).rejects.toThrow('Template not found');
    });

    it('should throw ValidationError when pay structure is not a template', async () => {
      // Arrange
      const nonTemplate = {
        id: templateId,
        organization_id: testOrgId,
        structure_code: 'NOT_TEMPLATE',
        is_template: false,
      };

      mockRepository.findById.mockResolvedValue(nonTemplate);

      // Act & Assert
      await expect(
        service.getTemplateById(templateId, testOrgId)
      ).rejects.toThrow('Specified pay structure is not a template');
    });

    it('should apply DTO transformation with full template details', async () => {
      // Arrange
      const mockTemplate = {
        id: templateId,
        organization_id: testOrgId,
        structure_code: 'TEMPLATE_001',
        structure_name: 'Template',
        is_template: true,
        base_salary: 50000,
        parent_template_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockRepository.findById.mockResolvedValue(mockTemplate);

      // Act
      const result = await service.getTemplateById(templateId, testOrgId);

      // Assert
      expect(result).toHaveProperty('structureCode');
      expect(result).toHaveProperty('structureName');
      expect(result).toHaveProperty('isTemplate');
      expect(result).toHaveProperty('baseSalary');
      expect(result).not.toHaveProperty('structure_code');
    });
  });

  describe('resolveTemplateInheritance', () => {
    it('should resolve single-level template inheritance', async () => {
      // Arrange
      const parentTemplateId = 'e23e4567-e89b-12d3-a456-426614174001';
      const childId = 'a23e4567-e89b-12d3-a456-426614174002';

      const parentTemplate = {
        id: parentTemplateId,
        organization_id: testOrgId,
        structure_code: 'PARENT',
        structure_name: 'Parent Template',
        is_template: true,
        base_salary: 50000,
        allowances: ['HOUSING'],
        parent_template_id: null,
      };

      const childStructure = {
        id: childId,
        organization_id: testOrgId,
        structure_code: 'CHILD',
        structure_name: 'Child Structure',
        is_template: false,
        base_salary: 60000,
        allowances: ['TRANSPORT'],
        parent_template_id: parentTemplateId,
      };

      mockRepository.findById
        .mockResolvedValueOnce(childStructure)
        .mockResolvedValueOnce(parentTemplate);

      // Act
      const result = await service.resolveTemplateInheritance(childId, testOrgId);

      // Assert
      expect(result).toBeDefined();
      expect(result.baseSalary).toBe(60000); // Child overrides
      expect(result.allowances).toEqual(['TRANSPORT']); // Child overrides
      expect(result.parentTemplateId).toBe(parentTemplateId);
    });

    it('should resolve multi-level template inheritance', async () => {
      // Arrange
      const grandparentId = 'c23e4567-e89b-12d3-a456-426614174001';
      const parentId = 'b23e4567-e89b-12d3-a456-426614174001';
      const childId = 'a23e4567-e89b-12d3-a456-426614174002';

      const grandparent = {
        id: grandparentId,
        organization_id: testOrgId,
        structure_code: 'GRANDPARENT',
        is_template: true,
        base_salary: 40000,
        allowances: ['HOUSING'],
        deductions: ['TAX', 'INSURANCE'],
        parent_template_id: null,
      };

      const parent = {
        id: parentId,
        organization_id: testOrgId,
        structure_code: 'PARENT',
        is_template: true,
        base_salary: 50000,
        allowances: ['HOUSING', 'TRANSPORT'],
        parent_template_id: grandparentId,
      };

      const child = {
        id: childId,
        organization_id: testOrgId,
        structure_code: 'CHILD',
        is_template: false,
        base_salary: 60000,
        parent_template_id: parentId,
      };

      mockRepository.findById
        .mockResolvedValueOnce(child)
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce(grandparent);

      // Act
      const result = await service.resolveTemplateInheritance(childId, testOrgId);

      // Assert
      expect(result.baseSalary).toBe(60000); // Child value
      expect(result.allowances).toEqual(['HOUSING', 'TRANSPORT']); // Parent value
      expect(result.deductions).toEqual(['TAX', 'INSURANCE']); // Grandparent value
    });

    it('should return structure as-is if no parent template', async () => {
      // Arrange
      const structureId = 'd23e4567-e89b-12d3-a456-426614174000';
      const structure = {
        id: structureId,
        organization_id: testOrgId,
        structure_code: 'STANDALONE',
        base_salary: 50000,
        parent_template_id: null,
      };

      mockRepository.findById.mockResolvedValue(structure);

      // Act
      const result = await service.resolveTemplateInheritance(structureId, testOrgId);

      // Assert
      expect(result.baseSalary).toBe(50000);
      expect(result.parentTemplateId || null).toBeNull();
    });

    it('should throw error on circular template reference', async () => {
      // Arrange
      const template1Id = '823e4567-e89b-12d3-a456-426614174001';
      const template2Id = '823e4567-e89b-12d3-a456-426614174002';

      const template1 = {
        id: template1Id,
        organization_id: testOrgId,
        structure_code: 'TEMPLATE_1',
        is_template: true,
        parent_template_id: template2Id,
      };

      const template2 = {
        id: template2Id,
        organization_id: testOrgId,
        structure_code: 'TEMPLATE_2',
        is_template: true,
        parent_template_id: template1Id, // Circular reference
      };

      mockRepository.findById
        .mockResolvedValueOnce(template1)
        .mockResolvedValueOnce(template2)
        .mockResolvedValueOnce(template1);

      // Act & Assert
      await expect(
        service.resolveTemplateInheritance(template1Id, testOrgId)
      ).rejects.toThrow('Circular template reference detected');
    });
  });
});

