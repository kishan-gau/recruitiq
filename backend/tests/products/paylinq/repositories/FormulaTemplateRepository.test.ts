/**
 * FormulaTemplateRepository Test Suite
 * 
 * Tests for PayLinQ formula template repository following TESTING_STANDARDS.md:
 * - ES modules with @jest/globals  
 * - Repository layer data access validation
 * - Database mocking via dependency injection
 * - Valid UUID v4 formats
 * - Multi-tenant isolation validation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import FormulaTemplateRepository from '../../../../src/products/paylinq/repositories/FormulaTemplateRepository.js';

describe('FormulaTemplateRepository', () => {
  let repository: any;
  let mockQuery: any;

  // Valid UUID v4 test constants
  const testOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = '223e4567-e89b-12d3-a456-426614174001';
  const testTemplateId = '323e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    // Create mock database with query method
    mockQuery = jest.fn();
    const mockDatabase = { query: mockQuery };
    
    // Inject mock database into repository
    repository = new FormulaTemplateRepository(mockDatabase);
  });

  describe('findAll', () => {
    it('should return all templates for organization', async () => {
      const mockTemplates = [
        { id: testTemplateId, template_name: 'Test Template', organization_id: testOrganizationId }
      ];
      mockQuery.mockResolvedValue({ rows: mockTemplates });

      const result = await repository.findAll(testOrganizationId);

      expect(result).toEqual(mockTemplates);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should apply filters', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.findAll(testOrganizationId, { category: 'overtime' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND category = $2'),
        expect.arrayContaining([testOrganizationId, 'overtime']),
        testOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('findById', () => {
    it('should return template by ID', async () => {
      const mockTemplate = { id: testTemplateId, template_name: 'Test' };
      mockQuery.mockResolvedValue({ rows: [mockTemplate] });

      const result = await repository.findById(testTemplateId, testOrganizationId);

      expect(result).toEqual(mockTemplate);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [testTemplateId, testOrganizationId],
        testOrganizationId,
        expect.any(Object)
      );
    });

    it('should return null when template not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.findById(testTemplateId, testOrganizationId);

      expect(result).toBeNull();
    });
  });

  describe('existsByCode', () => {
    it('should return true when template code exists', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testTemplateId }] });

      const result = await repository.existsByCode('TEST_CODE', testOrganizationId);

      expect(result).toBe(true);
    });

    it('should return false when template code does not exist', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await repository.existsByCode('TEST_CODE', testOrganizationId);

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create new template', async () => {
      const templateData = {
        template_code: 'TEST_CODE',
        template_name: 'Test Template',
        category: 'overtime',
        description: 'Test description',
        formula_expression: 'x * 2',
        formula_ast: JSON.stringify({ type: 'multiply' }),
        parameters: JSON.stringify([]),
        example_values: JSON.stringify({}),
        example_calculation: 'example',
        tags: ['test'],
        complexity_level: 'simple'
      };

      const mockCreated = { id: testTemplateId, ...templateData };
      mockQuery.mockResolvedValue({ rows: [mockCreated] });

      const result = await repository.create(templateData, testOrganizationId, testUserId);

      expect(result).toEqual(mockCreated);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll.formula_template'),
        expect.arrayContaining([testOrganizationId, 'TEST_CODE']),
        testOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('update', () => {
    it('should update template', async () => {
      const updates = { template_name: 'Updated Name' };
      const mockUpdated = { id: testTemplateId, template_name: 'Updated Name' };
      mockQuery.mockResolvedValue({ rows: [mockUpdated] });

      const result = await repository.update(testTemplateId, updates, testOrganizationId, testUserId);

      expect(result).toEqual(mockUpdated);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll.formula_template'),
        expect.arrayContaining(['Updated Name', testUserId, testTemplateId]),
        testOrganizationId,
        expect.any(Object)
      );
    });

    it('should return null when no fields to update', async () => {
      const result = await repository.update(testTemplateId, {}, testOrganizationId, testUserId);

      expect(result).toBeNull();
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft delete template', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: testTemplateId }] });

      const result = await repository.delete(testTemplateId, testOrganizationId, testUserId);

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET is_active = false, deleted_at = NOW()'),
        [testUserId, testTemplateId],
        testOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('incrementUsageCount', () => {
    it('should increment usage count', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await repository.incrementUsageCount(testTemplateId, testOrganizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET usage_count = usage_count + 1'),
        [testTemplateId],
        testOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('findPopular', () => {
    it('should return popular templates', async () => {
      const mockTemplates = [{ id: testTemplateId, is_popular: true }];
      mockQuery.mockResolvedValue({ rows: mockTemplates });

      const result = await repository.findPopular(testOrganizationId, 10);

      expect(result).toEqual(mockTemplates);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE is_active = true'),
        [testOrganizationId, 10],
        testOrganizationId,
        expect.any(Object)
      );
    });
  });

  describe('findByTags', () => {
    it('should return templates matching tags', async () => {
      const tags = ['overtime', 'hourly'];
      const mockTemplates = [{ id: testTemplateId, tags }];
      mockQuery.mockResolvedValue({ rows: mockTemplates });

      const result = await repository.findByTags(tags, testOrganizationId);

      expect(result).toEqual(mockTemplates);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('tags && $2::text[]'),
        [testOrganizationId, tags],
        testOrganizationId,
        expect.any(Object)
      );
    });
  });
});
