import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PayStructureService from '../../../../../src/products/paylinq/services/PayStructureService.js';
import PayStructureRepository from '../../../../../src/products/paylinq/repositories/PayStructureRepository.js';
import PayComponentService from '../../../../../src/products/paylinq/services/PayComponentService.js';
import { ValidationError, NotFoundError } from '../../../../../src/utils/errors.js';

describe('PayStructureService - Template Composition', () => {
  let service;
  let mockRepository;
  let mockComponentService;

  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';

  // Helper to create DB format structure
  const createDbStructure = (overrides = {}) => ({
    id: 'struct-123e4567-e89b-12d3-a456-426614174000',
    organization_id: testOrgId,
    structure_code: 'TEST_STRUCT',
    structure_name: 'Test Structure',
    description: 'Test description',
    base_structure_id: null,
    included_templates: null,
    excluded_components: null,
    custom_components: null,
    is_template: false,
    is_active: true,
    created_by: testUserId,
    created_at: new Date(),
    updated_by: null,
    updated_at: new Date(),
    deleted_at: null,
    ...overrides
  });

  // Helper to create DB format component
  const createDbComponent = (overrides = {}) => ({
    id: 'comp-123e4567-e89b-12d3-a456-426614174000',
    organization_id: testOrgId,
    component_code: 'TEST_COMP',
    component_name: 'Test Component',
    component_type: 'earning',
    is_active: true,
    ...overrides
  });

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      getComponentsByStructure: jest.fn(),
      addComponentToStructure: jest.fn(),
      removeComponentFromStructure: jest.fn(),
      getTemplateInclusions: jest.fn(),
      getResolvedComponents: jest.fn()
    };

    mockComponentService = {
      getById: jest.fn()
    };

    service = new PayStructureService(mockRepository, mockComponentService);
  });

  describe('resolveStructureComponents', () => {
    it('should return components directly when no base structure', async () => {
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';
      const structure = createDbStructure({
        id: structureId,
        base_structure_id: null,
        included_templates: null
      });

      const directComponents = [
        createDbComponent({ id: 'comp1', component_code: 'COMP1' }),
        createDbComponent({ id: 'comp2', component_code: 'COMP2' })
      ];

      mockRepository.findById.mockResolvedValue(structure);
      mockRepository.getResolvedComponents.mockResolvedValue(directComponents);

      const result = await service.resolveStructureComponents(structureId, testOrgId);

      expect(result).toHaveLength(2);
      expect(result[0].componentCode).toBe('COMP1');
      expect(result[1].componentCode).toBe('COMP2');
      expect(mockRepository.getResolvedComponents).toHaveBeenCalledWith(
        structureId,
        testOrgId
      );
    });

    it('should include components from base structure', async () => {
      const baseId = 'base-123e4567-e89b-12d3-a456-426614174000';
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';

      const structure = createDbStructure({
        id: structureId,
        base_structure_id: baseId,
        included_templates: null
      });

      const baseComponents = [
        createDbComponent({ id: 'base1', component_code: 'BASE1' }),
        createDbComponent({ id: 'base2', component_code: 'BASE2' })
      ];

      const structComponents = [
        createDbComponent({ id: 'comp1', component_code: 'COMP1' })
      ];

      mockRepository.findById.mockResolvedValue(structure);
      mockRepository.getResolvedComponents
        .mockResolvedValueOnce(baseComponents) // Base structure call
        .mockResolvedValueOnce(structComponents); // Current structure call

      const result = await service.resolveStructureComponents(structureId, testOrgId);

      expect(result).toHaveLength(3);
      expect(result.map(c => c.componentCode)).toEqual(['BASE1', 'BASE2', 'COMP1']);
    });

    it('should include components from included templates', async () => {
      const template1Id = 'template1-123e4567-e89b-12d3-a456-426614174000';
      const template2Id = 'template2-123e4567-e89b-12d3-a456-426614174000';
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';

      const structure = createDbStructure({
        id: structureId,
        base_structure_id: null,
        included_templates: [template1Id, template2Id]
      });

      const template1Components = [
        createDbComponent({ id: 'temp1', component_code: 'TEMP1' })
      ];

      const template2Components = [
        createDbComponent({ id: 'temp2', component_code: 'TEMP2' })
      ];

      const structComponents = [
        createDbComponent({ id: 'comp1', component_code: 'COMP1' })
      ];

      mockRepository.findById.mockResolvedValue(structure);
      mockRepository.getResolvedComponents
        .mockResolvedValueOnce(template1Components) // Template 1 call
        .mockResolvedValueOnce(template2Components) // Template 2 call
        .mockResolvedValueOnce(structComponents); // Current structure call

      const result = await service.resolveStructureComponents(structureId, testOrgId);

      expect(result).toHaveLength(3);
      expect(result.map(c => c.componentCode)).toEqual(['TEMP1', 'TEMP2', 'COMP1']);
    });

    it('should exclude components specified in excluded_components', async () => {
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';
      const comp1Id = 'comp1-123e4567-e89b-12d3-a456-426614174000';
      const comp2Id = 'comp2-123e4567-e89b-12d3-a456-426614174000';
      const comp3Id = 'comp3-123e4567-e89b-12d3-a456-426614174000';

      const structure = createDbStructure({
        id: structureId,
        base_structure_id: null,
        included_templates: null,
        excluded_components: [comp2Id] // Exclude COMP2
      });

      const allComponents = [
        createDbComponent({ id: comp1Id, component_code: 'COMP1' }),
        createDbComponent({ id: comp2Id, component_code: 'COMP2' }),
        createDbComponent({ id: comp3Id, component_code: 'COMP3' })
      ];

      mockRepository.findById.mockResolvedValue(structure);
      mockRepository.getResolvedComponents.mockResolvedValue(allComponents);

      const result = await service.resolveStructureComponents(structureId, testOrgId);

      expect(result).toHaveLength(2);
      expect(result.map(c => c.componentCode)).toEqual(['COMP1', 'COMP3']);
      expect(result.map(c => c.id)).not.toContain(comp2Id);
    });

    it('should remove duplicate components keeping last occurrence', async () => {
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';
      const baseId = 'base-123e4567-e89b-12d3-a456-426614174000';
      const compId = 'comp-123e4567-e89b-12d3-a456-426614174000';

      const structure = createDbStructure({
        id: structureId,
        base_structure_id: baseId,
        included_templates: null
      });

      // Base has COMP1
      const baseComponents = [
        createDbComponent({ id: compId, component_code: 'COMP1', component_name: 'Old Name' })
      ];

      // Current structure also has COMP1 (should override)
      const structComponents = [
        createDbComponent({ id: compId, component_code: 'COMP1', component_name: 'New Name' })
      ];

      mockRepository.findById.mockResolvedValue(structure);
      mockRepository.getResolvedComponents
        .mockResolvedValueOnce(baseComponents)
        .mockResolvedValueOnce(structComponents);

      const result = await service.resolveStructureComponents(structureId, testOrgId);

      expect(result).toHaveLength(1);
      expect(result[0].componentName).toBe('New Name'); // Latest wins
    });

    it('should handle complex nested inheritance', async () => {
      const grandparentId = 'grandparent-123e4567-e89b-12d3-a456-426614174000';
      const parentId = 'parent-123e4567-e89b-12d3-a456-426614174000';
      const childId = 'child-123e4567-e89b-12d3-a456-426614174000';
      const template1Id = 'template1-123e4567-e89b-12d3-a456-426614174000';

      // Grandparent structure
      const grandparent = createDbStructure({
        id: grandparentId,
        base_structure_id: null,
        included_templates: null
      });

      // Parent inherits from grandparent
      const parent = createDbStructure({
        id: parentId,
        base_structure_id: grandparentId,
        included_templates: null
      });

      // Child inherits from parent and includes template
      const child = createDbStructure({
        id: childId,
        base_structure_id: parentId,
        included_templates: [template1Id],
        excluded_components: ['comp2-id']
      });

      const grandparentComponents = [
        createDbComponent({ id: 'comp1-id', component_code: 'COMP1' }),
        createDbComponent({ id: 'comp2-id', component_code: 'COMP2' })
      ];

      const parentComponents = [
        createDbComponent({ id: 'comp3-id', component_code: 'COMP3' })
      ];

      const templateComponents = [
        createDbComponent({ id: 'comp4-id', component_code: 'COMP4' })
      ];

      const childComponents = [
        createDbComponent({ id: 'comp5-id', component_code: 'COMP5' })
      ];

      mockRepository.findById
        .mockResolvedValueOnce(child)
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce(grandparent);

      mockRepository.getResolvedComponents
        .mockResolvedValueOnce(grandparentComponents) // Grandparent
        .mockResolvedValueOnce(parentComponents) // Parent
        .mockResolvedValueOnce(templateComponents) // Template
        .mockResolvedValueOnce(childComponents); // Child

      const result = await service.resolveStructureComponents(childId, testOrgId);

      // Should have COMP1 (from grandparent, not excluded), COMP3 (from parent),
      // COMP4 (from template), COMP5 (from child)
      // COMP2 should be excluded
      expect(result).toHaveLength(4);
      expect(result.map(c => c.componentCode)).toEqual(['COMP1', 'COMP3', 'COMP4', 'COMP5']);
      expect(result.map(c => c.componentCode)).not.toContain('COMP2');
    });

    it('should throw NotFoundError when structure not found', async () => {
      const structureId = 'nonexistent-id';
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.resolveStructureComponents(structureId, testOrgId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle circular inheritance gracefully', async () => {
      // Structure A -> B -> A (circular)
      const structAId = 'structA-123e4567-e89b-12d3-a456-426614174000';
      const structBId = 'structB-123e4567-e89b-12d3-a456-426614174000';

      const structA = createDbStructure({
        id: structAId,
        base_structure_id: structBId
      });

      const structB = createDbStructure({
        id: structBId,
        base_structure_id: structAId // Circular!
      });

      mockRepository.findById
        .mockResolvedValueOnce(structA)
        .mockResolvedValueOnce(structB);

      mockRepository.getResolvedComponents.mockResolvedValue([]);

      // Should handle circular reference without infinite loop
      await expect(
        service.resolveStructureComponents(structAId, testOrgId)
      ).rejects.toThrow(); // Should throw error for circular dependency
    });
  });

  describe('getStructureTemplateInclusions', () => {
    it('should return empty array when no templates included', async () => {
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';
      mockRepository.getTemplateInclusions.mockResolvedValue([]);

      const result = await service.getStructureTemplateInclusions(structureId, testOrgId);

      expect(result).toEqual([]);
      expect(mockRepository.getTemplateInclusions).toHaveBeenCalledWith(structureId, testOrgId);
    });

    it('should return list of included templates', async () => {
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';
      const templates = [
        createDbStructure({ id: 'temp1', structure_code: 'TEMPLATE1', is_template: true }),
        createDbStructure({ id: 'temp2', structure_code: 'TEMPLATE2', is_template: true })
      ];

      mockRepository.getTemplateInclusions.mockResolvedValue(templates);

      const result = await service.getStructureTemplateInclusions(structureId, testOrgId);

      expect(result).toHaveLength(2);
      expect(result[0].structureCode).toBe('TEMPLATE1');
      expect(result[1].structureCode).toBe('TEMPLATE2');
    });
  });

  describe('includeTemplate', () => {
    it('should add template to included_templates array', async () => {
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';
      const templateId = 'template-123e4567-e89b-12d3-a456-426614174000';

      const structure = createDbStructure({
        id: structureId,
        included_templates: null
      });

      const template = createDbStructure({
        id: templateId,
        is_template: true
      });

      const updatedStructure = createDbStructure({
        id: structureId,
        included_templates: [templateId]
      });

      mockRepository.findById
        .mockResolvedValueOnce(structure) // Structure check
        .mockResolvedValueOnce(template); // Template check

      mockRepository.update.mockResolvedValue(updatedStructure);

      const result = await service.includeTemplate(
        structureId,
        templateId,
        testOrgId,
        testUserId
      );

      expect(result.includedTemplates).toContain(templateId);
      expect(mockRepository.update).toHaveBeenCalledWith(
        structureId,
        expect.objectContaining({
          included_templates: [templateId],
          updated_by: testUserId
        }),
        testOrgId,
        testUserId
      );
    });

    it('should append to existing included_templates', async () => {
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';
      const existingTemplateId = 'existing-123e4567-e89b-12d3-a456-426614174000';
      const newTemplateId = 'new-123e4567-e89b-12d3-a456-426614174000';

      const structure = createDbStructure({
        id: structureId,
        included_templates: [existingTemplateId]
      });

      const template = createDbStructure({
        id: newTemplateId,
        is_template: true
      });

      const updatedStructure = createDbStructure({
        id: structureId,
        included_templates: [existingTemplateId, newTemplateId]
      });

      mockRepository.findById
        .mockResolvedValueOnce(structure)
        .mockResolvedValueOnce(template);

      mockRepository.update.mockResolvedValue(updatedStructure);

      const result = await service.includeTemplate(
        structureId,
        newTemplateId,
        testOrgId,
        testUserId
      );

      expect(result.includedTemplates).toEqual([existingTemplateId, newTemplateId]);
    });

    it('should throw ValidationError if template already included', async () => {
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';
      const templateId = 'template-123e4567-e89b-12d3-a456-426614174000';

      const structure = createDbStructure({
        id: structureId,
        included_templates: [templateId]
      });

      mockRepository.findById.mockResolvedValue(structure);

      await expect(
        service.includeTemplate(structureId, templateId, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if structure not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.includeTemplate('nonexistent', 'template-id', testOrgId, testUserId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if template not found', async () => {
      const structure = createDbStructure();
      mockRepository.findById
        .mockResolvedValueOnce(structure)
        .mockResolvedValueOnce(null); // Template not found

      await expect(
        service.includeTemplate('struct-id', 'nonexistent', testOrgId, testUserId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError if target is not a template', async () => {
      const structure = createDbStructure();
      const notTemplate = createDbStructure({ is_template: false });

      mockRepository.findById
        .mockResolvedValueOnce(structure)
        .mockResolvedValueOnce(notTemplate);

      await expect(
        service.includeTemplate('struct-id', 'not-template-id', testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('excludeTemplate', () => {
    it('should remove template from included_templates array', async () => {
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';
      const template1Id = 'template1-123e4567-e89b-12d3-a456-426614174000';
      const template2Id = 'template2-123e4567-e89b-12d3-a456-426614174000';

      const structure = createDbStructure({
        id: structureId,
        included_templates: [template1Id, template2Id]
      });

      const updatedStructure = createDbStructure({
        id: structureId,
        included_templates: [template2Id]
      });

      mockRepository.findById.mockResolvedValue(structure);
      mockRepository.update.mockResolvedValue(updatedStructure);

      const result = await service.excludeTemplate(
        structureId,
        template1Id,
        testOrgId,
        testUserId
      );

      expect(result.includedTemplates).toEqual([template2Id]);
      expect(result.includedTemplates).not.toContain(template1Id);
    });

    it('should throw ValidationError if template not included', async () => {
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';
      const templateId = 'template-123e4567-e89b-12d3-a456-426614174000';

      const structure = createDbStructure({
        id: structureId,
        included_templates: []
      });

      mockRepository.findById.mockResolvedValue(structure);

      await expect(
        service.excludeTemplate(structureId, templateId, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle null included_templates', async () => {
      const structure = createDbStructure({
        included_templates: null
      });

      mockRepository.findById.mockResolvedValue(structure);

      await expect(
        service.excludeTemplate('struct-id', 'template-id', testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('excludeComponent', () => {
    it('should add component to excluded_components array', async () => {
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';
      const componentId = 'comp-123e4567-e89b-12d3-a456-426614174000';

      const structure = createDbStructure({
        id: structureId,
        excluded_components: null
      });

      const component = createDbComponent({ id: componentId });

      const updatedStructure = createDbStructure({
        id: structureId,
        excluded_components: [componentId]
      });

      mockRepository.findById.mockResolvedValue(structure);
      mockComponentService.getById.mockResolvedValue(component);
      mockRepository.update.mockResolvedValue(updatedStructure);

      const result = await service.excludeComponent(
        structureId,
        componentId,
        testOrgId,
        testUserId
      );

      expect(result.excludedComponents).toContain(componentId);
    });

    it('should throw ValidationError if component already excluded', async () => {
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';
      const componentId = 'comp-123e4567-e89b-12d3-a456-426614174000';

      const structure = createDbStructure({
        id: structureId,
        excluded_components: [componentId]
      });

      mockRepository.findById.mockResolvedValue(structure);

      await expect(
        service.excludeComponent(structureId, componentId, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('includeComponent', () => {
    it('should remove component from excluded_components array', async () => {
      const structureId = 'struct-123e4567-e89b-12d3-a456-426614174000';
      const comp1Id = 'comp1-123e4567-e89b-12d3-a456-426614174000';
      const comp2Id = 'comp2-123e4567-e89b-12d3-a456-426614174000';

      const structure = createDbStructure({
        id: structureId,
        excluded_components: [comp1Id, comp2Id]
      });

      const updatedStructure = createDbStructure({
        id: structureId,
        excluded_components: [comp2Id]
      });

      mockRepository.findById.mockResolvedValue(structure);
      mockRepository.update.mockResolvedValue(updatedStructure);

      const result = await service.includeComponent(
        structureId,
        comp1Id,
        testOrgId,
        testUserId
      );

      expect(result.excludedComponents).toEqual([comp2Id]);
      expect(result.excludedComponents).not.toContain(comp1Id);
    });

    it('should throw ValidationError if component not excluded', async () => {
      const structure = createDbStructure({
        excluded_components: []
      });

      mockRepository.findById.mockResolvedValue(structure);

      await expect(
        service.includeComponent('struct-id', 'comp-id', testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });
});
