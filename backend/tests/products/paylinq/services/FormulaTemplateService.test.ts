/**
 * @jest-environment node
 * @group unit
 * @group paylinq
 * @group paylinq-services
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ValidationError } from '../../../../src/middleware/errorHandler.js';

// Mock dependencies before importing service
const mockPool = {
  query: jest.fn()
};

const mockFormulaEngine = {
  validate: jest.fn(),
  parse: jest.fn()
};

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  default: mockPool,
  query: mockPool.query,
  getClient: jest.fn(),
  transaction: jest.fn(),
  healthCheck: jest.fn(),
  closePool: jest.fn()
}));

jest.unstable_mockModule('../../../../src/services/formula/FormulaEngine.js', () => ({
  default: mockFormulaEngine
}));

// Import service after mocks are set up
const { default: FormulaTemplateService } = await import('../../../../src/products/paylinq/services/FormulaTemplateService.js');

describe('FormulaTemplateService', () => {
  let service;
  const orgId = '123e4567-e89b-12d3-a456-426614174000';
  const userId = '123e4567-e89b-12d3-a456-426614174010';
  const templateId = '123e4567-e89b-12d3-a456-426614174001';

  // Helper to create DB format template (snake_case)
  const createDbTemplate = (overrides = {}) => ({
    id: templateId,
    organization_id: orgId,
    template_code: 'OVERTIME_CALC',
    template_name: 'Overtime Calculation',
    category: 'overtime',
    description: 'Calculate overtime pay at 1.5x rate',
    formula_expression: 'hours * rate * 1.5',
    formula_ast: JSON.stringify({ type: 'multiply', args: [] }),
    parameters: JSON.stringify([
      { name: 'hours', type: 'numeric', description: 'Overtime hours' },
      { name: 'rate', type: 'fixed', description: 'Base hourly rate' }
    ]),
    example_values: JSON.stringify({ hours: 10, rate: 25 }),
    example_calculation: '10 * 25 * 1.5 = 375',
    usage_count: 42,
    is_popular: true,
    is_recommended: true,
    tags: ['overtime', 'hourly'],
    complexity_level: 'simple',
    is_global: false,
    is_active: true,
    created_at: new Date('2024-01-01'),
    created_by: userId,
    updated_at: null,
    updated_by: null,
    deleted_at: null,
    deleted_by: null,
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock behavior for formulaEngine
    mockFormulaEngine.validate.mockResolvedValue({ valid: true, errors: [] });
    mockFormulaEngine.parse.mockResolvedValue({ type: 'multiply', args: [] });
    
    // Create service instance with mocked formulaEngine
    service = new FormulaTemplateService(mockFormulaEngine);
  });

  // ==================== GET TEMPLATES ====================

  describe('getTemplates', () => {
    it('should return all templates (global + org-specific)', async () => {
      const templates = [
        createDbTemplate({ template_code: 'TEMPLATE1', is_global: true }),
        createDbTemplate({ template_code: 'TEMPLATE2', is_global: false })
      ];

      mockPool.query.mockResolvedValue({ rows: templates });

      const result = await service.getTemplates(orgId);

      expect(result).toEqual(templates);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_global = true OR organization_id = $1'),
        [orgId]
      );
    });

    it('should filter by category', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.getTemplates(orgId, { category: 'overtime' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND category = $2'),
        [orgId, 'overtime']
      );
    });

    it('should filter by complexity level', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.getTemplates(orgId, { complexity_level: 'advanced' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND complexity_level = $2'),
        [orgId, 'advanced']
      );
    });

    it('should filter by popularity', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.getTemplates(orgId, { is_popular: true });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND is_popular = $2'),
        [orgId, true]
      );
    });

    it('should filter by tags', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.getTemplates(orgId, { tags: ['overtime', 'hourly'] });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND tags && $2::text[]'),
        [orgId, ['overtime', 'hourly']]
      );
    });

    it('should search by text', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.getTemplates(orgId, { search: 'overtime' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        [orgId, '%overtime%']
      );
    });

    it('should apply multiple filters together', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.getTemplates(orgId, {
        category: 'overtime',
        complexity_level: 'simple',
        is_popular: true,
        search: 'calculation'
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND category = $2'),
        [orgId, 'overtime', 'simple', true, '%calculation%']
      );
    });

    it('should order by popularity and usage count', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.getTemplates(orgId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY is_popular DESC, usage_count DESC'),
        [orgId]
      );
    });
  });

  // ==================== GET TEMPLATE BY ID ====================

  describe('getTemplateById', () => {
    it('should return template by ID', async () => {
      const template = createDbTemplate();
      mockPool.query.mockResolvedValue({ rows: [template] });

      const result = await service.getTemplateById(templateId, orgId);

      expect(result).toEqual(template);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [templateId, orgId]
      );
    });

    it('should allow access to global templates', async () => {
      const globalTemplate = createDbTemplate({ is_global: true });
      mockPool.query.mockResolvedValue({ rows: [globalTemplate] });

      const result = await service.getTemplateById(templateId, orgId);

      expect(result.is_global).toBe(true);
    });

    it('should throw ValidationError when template not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        service.getTemplateById('nonexistent', orgId)
      ).rejects.toThrow('Template not found or access denied');
    });

    it('should not return inactive templates', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        service.getTemplateById(templateId, orgId)
      ).rejects.toThrow();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
        [templateId, orgId]
      );
    });
  });

  // ==================== GET TEMPLATE BY CODE ====================

  describe('getTemplateByCode', () => {
    it('should return template by code', async () => {
      const template = createDbTemplate();
      mockPool.query.mockResolvedValue({ rows: [template] });

      const result = await service.getTemplateByCode('OVERTIME_CALC', orgId);

      expect(result).toEqual(template);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE template_code = $1'),
        ['OVERTIME_CALC', orgId]
      );
    });

    it('should throw ValidationError when template not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        service.getTemplateByCode('NONEXISTENT', orgId)
      ).rejects.toThrow('Template not found');
    });
  });

  // ==================== CREATE TEMPLATE ====================

  describe('createTemplate', () => {
    const validData = {
      template_code: 'BONUS_CALC',
      template_name: 'Bonus Calculation',
      category: 'bonus',
      description: 'Calculate performance bonus',
      formula_expression: 'base_salary * 0.10',
      parameters: [
        { name: 'base_salary', type: 'fixed', description: 'Base salary amount' }
      ],
      example_values: { base_salary: 5000 },
      example_calculation: '5000 * 0.10 = 500',
      tags: ['bonus', 'performance'],
      complexity_level: 'simple'
    };

    it('should create template successfully', async () => {
      const createdTemplate = createDbTemplate({
        template_code: 'BONUS_CALC',
        template_name: 'Bonus Calculation'
      });

      mockFormulaEngine.validate.mockResolvedValue({ valid: true, errors: [] });
      mockFormulaEngine.parse.mockResolvedValue({
        ast: { type: 'multiply', args: [] }
      });
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // Check for duplicates
        .mockResolvedValueOnce({ rows: [createdTemplate] }); // Insert

      const result = await service.createTemplate(validData, orgId, userId);

      expect(result).toEqual(createdTemplate);
      expect(mockFormulaEngine.validate).toHaveBeenCalledWith('base_salary * 0.10');
      expect(mockFormulaEngine.parse).toHaveBeenCalledWith('base_salary * 0.10');
    });

    it('should throw ValidationError for missing required fields', async () => {
      const invalidData = { template_code: 'TEST' };

      await expect(
        service.createTemplate(invalidData, orgId, userId)
      ).rejects.toThrow('Missing required fields');
    });

    it('should validate formula expression', async () => {
      mockFormulaEngine.validate.mockResolvedValue({
        valid: false,
        errors: [{ message: 'Syntax error' }]
      });

      await expect(
        service.createTemplate(validData, orgId, userId)
      ).rejects.toThrow('Invalid formula: Syntax error');
    });

    it('should check for duplicate template code', async () => {
      mockFormulaEngine.validate.mockResolvedValue({ valid: true, errors: [] });
      mockPool.query.mockResolvedValue({
        rows: [{ id: 'existing-id' }]
      });

      await expect(
        service.createTemplate(validData, orgId, userId)
      ).rejects.toThrow('Template code already exists');
    });

    it('should set is_global to false for org templates', async () => {
      const createdTemplate = createDbTemplate({ is_global: false });

      mockFormulaEngine.validate.mockResolvedValue({ valid: true, errors: [] });
      mockFormulaEngine.parse.mockResolvedValue({
        ast: { type: 'multiply', args: [] }
      });
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [createdTemplate] });

      const result = await service.createTemplate(validData, orgId, userId);

      expect(result.is_global).toBe(false);
    });

    it('should store formula AST', async () => {
      const ast = { type: 'multiply', left: 'base_salary', right: 0.10 };
      mockFormulaEngine.validate.mockResolvedValue({ valid: true, errors: [] });
      mockFormulaEngine.parse.mockResolvedValue(ast); // Return AST directly, not wrapped
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [createDbTemplate()] });

      await service.createTemplate(validData, orgId, userId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('formula_ast'),
        expect.arrayContaining([JSON.stringify(ast)])
      );
    });

    it('should apply default complexity level', async () => {
      const dataWithoutComplexity = { ...validData };
      delete dataWithoutComplexity.complexity_level;

      const createdTemplate = createDbTemplate();
      mockFormulaEngine.validate.mockResolvedValue({ valid: true, errors: [] });
      mockFormulaEngine.parse.mockResolvedValue({});
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [createdTemplate] });

      await service.createTemplate(dataWithoutComplexity, orgId, userId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['simple'])
      );
    });
  });

  // ==================== UPDATE TEMPLATE ====================

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const updates = {
        template_name: 'Updated Name',
        description: 'Updated description'
      };

      const existingTemplate = createDbTemplate({ is_global: false });
      const updatedTemplate = createDbTemplate({ ...updates });

      mockPool.query
        .mockResolvedValueOnce({ rows: [existingTemplate] }) // Check existence
        .mockResolvedValueOnce({ rows: [updatedTemplate] }); // Update

      const result = await service.updateTemplate(templateId, updates, orgId, userId);

      expect(result).toEqual(updatedTemplate);
    });

    it('should throw ValidationError when template not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        service.updateTemplate(templateId, {}, orgId, userId)
      ).rejects.toThrow('Template not found or access denied');
    });

    it('should throw ValidationError when updating global template', async () => {
      const globalTemplate = createDbTemplate({ is_global: true });
      mockPool.query.mockResolvedValue({ rows: [globalTemplate] });

      await expect(
        service.updateTemplate(templateId, { template_name: 'New' }, orgId, userId)
      ).rejects.toThrow('Cannot modify global templates');
    });

    it('should validate updated formula expression', async () => {
      const existingTemplate = createDbTemplate({ is_global: false });
      mockPool.query.mockResolvedValue({ rows: [existingTemplate] });

      mockFormulaEngine.validate.mockResolvedValue({
        valid: false,
        errors: [{ message: 'Invalid syntax' }]
      });

      await expect(
        service.updateTemplate(
          templateId,
          { formula_expression: 'invalid@@formula' },
          orgId,
          userId
        )
      ).rejects.toThrow('Invalid formula');
    });

    it('should update formula AST when formula changes', async () => {
      const existingTemplate = createDbTemplate({ is_global: false });
      const newAst = { type: 'divide', args: [] };

      mockPool.query
        .mockResolvedValueOnce({ rows: [existingTemplate] })
        .mockResolvedValueOnce({ rows: [createDbTemplate()] });

      mockFormulaEngine.validate.mockResolvedValue({ valid: true, errors: [] });
      mockFormulaEngine.parse.mockResolvedValue(newAst); // Return AST directly

      await service.updateTemplate(
        templateId,
        { formula_expression: 'gross_pay / hours' },
        orgId,
        userId
      );

      expect(mockFormulaEngine.parse).toHaveBeenCalledWith('gross_pay / hours');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('formula_ast'),
        expect.arrayContaining([JSON.stringify(newAst)])
      );
    });

    it('should throw ValidationError when no fields to update', async () => {
      const existingTemplate = createDbTemplate({ is_global: false });
      mockPool.query.mockResolvedValue({ rows: [existingTemplate] });

      await expect(
        service.updateTemplate(templateId, {}, orgId, userId)
      ).rejects.toThrow('No fields to update');
    });

    it('should update timestamp and user', async () => {
      const existingTemplate = createDbTemplate({ is_global: false });
      mockPool.query
        .mockResolvedValueOnce({ rows: [existingTemplate] })
        .mockResolvedValueOnce({ rows: [createDbTemplate()] });

      await service.updateTemplate(
        templateId,
        { template_name: 'New Name' },
        orgId,
        userId
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.arrayContaining([userId])
      );
    });

    it('should allow updating multiple fields', async () => {
      const existingTemplate = createDbTemplate({ is_global: false });
      const updates = {
        template_name: 'New Name',
        description: 'New description',
        tags: ['new', 'tags'],
        complexity_level: 'advanced'
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [existingTemplate] })
        .mockResolvedValueOnce({ rows: [createDbTemplate()] });

      await service.updateTemplate(templateId, updates, orgId, userId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('template_name'),
        expect.arrayContaining(['New Name', 'New description'])
      );
    });
  });

  // ==================== DELETE TEMPLATE ====================

  describe('deleteTemplate', () => {
    it('should soft delete template successfully', async () => {
      const existingTemplate = createDbTemplate({ is_global: false });
      mockPool.query
        .mockResolvedValueOnce({ rows: [existingTemplate] })
        .mockResolvedValueOnce({ rows: [{ id: templateId }] });

      const result = await service.deleteTemplate(templateId, orgId, userId);

      expect(result).toEqual({ success: true, id: templateId });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = false'),
        [userId, templateId]
      );
    });

    it('should throw ValidationError when template not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        service.deleteTemplate(templateId, orgId, userId)
      ).rejects.toThrow('Template not found or access denied');
    });

    it('should throw ValidationError when deleting global template', async () => {
      const globalTemplate = createDbTemplate({ is_global: true });
      mockPool.query.mockResolvedValue({ rows: [globalTemplate] });

      await expect(
        service.deleteTemplate(templateId, orgId, userId)
      ).rejects.toThrow('Cannot delete global templates');
    });

    it('should set deleted_at and deleted_by', async () => {
      const existingTemplate = createDbTemplate({ is_global: false });
      mockPool.query
        .mockResolvedValueOnce({ rows: [existingTemplate] })
        .mockResolvedValueOnce({ rows: [{ id: templateId }] });

      await service.deleteTemplate(templateId, orgId, userId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at = NOW()'),
        [userId, templateId]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_by = $1'),
        [userId, templateId]
      );
    });
  });

  // ==================== APPLY TEMPLATE ====================

  describe('applyTemplate', () => {
    it('should apply template with parameter substitution', async () => {
      const template = createDbTemplate({
        formula_expression: '{hours} * {rate} * 1.5',
        parameters: JSON.stringify([
          { name: 'hours', type: 'fixed', description: 'Hours worked', min: 0 },
          { name: 'rate', type: 'fixed', description: 'Hourly rate', min: 0 }
        ])
      });

      // Simulate PostgreSQL JSONB parsing
      const parsedTemplate = { ...template, parameters: JSON.parse(template.parameters) };

      mockPool.query
        .mockResolvedValueOnce({ rows: [parsedTemplate] }) // getTemplateById
        .mockResolvedValueOnce({ rows: [] }); // Update usage count

      mockFormulaEngine.validate.mockResolvedValue({ valid: true, errors: [] });

      const result = await service.applyTemplate(
        templateId,
        { hours: 40, rate: 25 },
        orgId
      );

      expect(result.formula).toBe('40 * 25 * 1.5');
      expect(result.template_code).toBe('OVERTIME_CALC');
      expect(result.parameters).toEqual({ hours: 40, rate: 25 });
    });

    it('should increment usage count', async () => {
      const template = createDbTemplate({
        formula_expression: '{base} * 1.1',
        parameters: JSON.stringify([{ name: 'base', type: 'fixed' }])
      });

      // Simulate PostgreSQL JSONB parsing
      const parsedTemplate = { ...template, parameters: JSON.parse(template.parameters) };

      mockPool.query
        .mockResolvedValueOnce({ rows: [parsedTemplate] })
        .mockResolvedValueOnce({ rows: [] });

      mockFormulaEngine.validate.mockResolvedValue({ valid: true, errors: [] });

      await service.applyTemplate(templateId, { base: 100 }, orgId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('usage_count = usage_count + 1'),
        [templateId]
      );
    });

    it('should throw ValidationError for missing required parameter', async () => {
      const template = createDbTemplate({
        formula_expression: '{hours} * {rate}',
        parameters: JSON.stringify([
          { name: 'hours', type: 'fixed' },
          { name: 'rate', type: 'fixed' }
        ])
      });

      // Simulate PostgreSQL JSONB parsing
      const parsedTemplate = { ...template, parameters: JSON.parse(template.parameters) };

      mockPool.query.mockResolvedValueOnce({ rows: [parsedTemplate] });

      await expect(
        service.applyTemplate(templateId, { hours: 10 }, orgId)
      ).rejects.toThrow('Missing required parameter: rate');
    });

    it('should validate percentage parameter range', async () => {
      const template = createDbTemplate({
        formula_expression: '{base} * {percent} / 100',
        parameters: JSON.stringify([
          { name: 'base', type: 'fixed' },
          { name: 'percent', type: 'percentage', min: 0, max: 100 }
        ])
      });

      // Simulate PostgreSQL JSONB parsing
      const parsedTemplate = { ...template, parameters: JSON.parse(template.parameters) };

      mockPool.query.mockResolvedValueOnce({ rows: [parsedTemplate] });

      await expect(
        service.applyTemplate(templateId, { base: 1000, percent: 150 }, orgId)
      ).rejects.toThrow('must be between 0 and 100');
    });

    it('should validate fixed parameter minimum', async () => {
      const template = createDbTemplate({
        formula_expression: '{amount} * 1.1',
        parameters: JSON.stringify([
          { name: 'amount', type: 'fixed', min: 100 }
        ])
      });

      // Simulate PostgreSQL JSONB parsing
      const parsedTemplate = { ...template, parameters: JSON.parse(template.parameters) };

      mockPool.query.mockResolvedValueOnce({ rows: [parsedTemplate] });

      await expect(
        service.applyTemplate(templateId, { amount: 50 }, orgId)
      ).rejects.toThrow('must be at least 100');
    });

    it('should throw ValidationError if generated formula is invalid', async () => {
      const template = createDbTemplate({
        formula_expression: '{value} @@ invalid',
        parameters: JSON.stringify([
          { name: 'value', type: 'fixed' }
        ])
      });

      // Simulate PostgreSQL JSONB parsing
      const parsedTemplate = { ...template, parameters: JSON.parse(template.parameters) };

      mockPool.query
        .mockResolvedValueOnce({ rows: [parsedTemplate] })
        .mockResolvedValueOnce({ rows: [] });

      mockFormulaEngine.validate.mockResolvedValue({
        valid: false,
        errors: [{ message: 'Invalid operator' }]
      });

      await expect(
        service.applyTemplate(templateId, { value: 10 }, orgId)
      ).rejects.toThrow('Generated formula is invalid');
    });

    it('should replace multiple occurrences of same parameter', async () => {
      const template = createDbTemplate({
        formula_expression: '{rate} * {hours} + {rate} * {overtime}',
        parameters: JSON.stringify([
          { name: 'rate', type: 'fixed' },
          { name: 'hours', type: 'fixed' },
          { name: 'overtime', type: 'fixed' }
        ])
      });

      // Simulate PostgreSQL JSONB parsing
      const parsedTemplate = { ...template, parameters: JSON.parse(template.parameters) };

      mockPool.query
        .mockResolvedValueOnce({ rows: [parsedTemplate] })
        .mockResolvedValueOnce({ rows: [] });

      mockFormulaEngine.validate.mockResolvedValue({ valid: true, errors: [] });

      const result = await service.applyTemplate(
        templateId,
        { rate: 20, hours: 40, overtime: 5 },
        orgId
      );

      expect(result.formula).toBe('20 * 40 + 20 * 5');
    });
  });

  // ==================== GET POPULAR TEMPLATES ====================

  describe('getPopularTemplates', () => {
    it('should return popular templates with default limit', async () => {
      const templates = [
        createDbTemplate({ is_popular: true, usage_count: 100 }),
        createDbTemplate({ is_popular: true, usage_count: 80 })
      ];

      mockPool.query.mockResolvedValue({ rows: templates });

      const result = await service.getPopularTemplates(orgId);

      expect(result).toEqual(templates);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_popular = true'),
        [orgId, 10]
      );
    });

    it('should accept custom limit', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.getPopularTemplates(orgId, 5);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2'),
        [orgId, 5]
      );
    });

    it('should order by usage count', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.getPopularTemplates(orgId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY usage_count DESC'),
        [orgId, 10]
      );
    });
  });

  // ==================== GET RECOMMENDED TEMPLATES ====================

  describe('getRecommendedTemplates', () => {
    it('should return recommended templates for category', async () => {
      const templates = [
        createDbTemplate({ category: 'overtime', is_recommended: true }),
        createDbTemplate({ category: 'overtime', is_recommended: true })
      ];

      mockPool.query.mockResolvedValue({ rows: templates });

      const result = await service.getRecommendedTemplates('overtime', orgId);

      expect(result).toEqual(templates);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('category = $1'),
        ['overtime', orgId]
      );
    });

    it('should filter by recommended flag', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.getRecommendedTemplates('bonus', orgId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_recommended = true'),
        ['bonus', orgId]
      );
    });

    it('should return empty array when no recommendations', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.getRecommendedTemplates('custom', orgId);

      expect(result).toEqual([]);
    });
  });

  // ==================== SEARCH BY TAGS ====================

  describe('searchByTags', () => {
    it('should search templates by tags', async () => {
      const templates = [
        createDbTemplate({ tags: ['overtime', 'hourly'] }),
        createDbTemplate({ tags: ['overtime', 'salaried'] })
      ];

      mockPool.query.mockResolvedValue({ rows: templates });

      const result = await service.searchByTags(['overtime'], orgId);

      expect(result).toEqual(templates);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('tags && $2::text[]'),
        [orgId, ['overtime']]
      );
    });

    it('should prioritize popular templates', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.searchByTags(['bonus'], orgId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('CASE WHEN is_popular THEN 0 ELSE 1 END'),
        [orgId, ['bonus']]
      );
    });

    it('should search with multiple tags', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await service.searchByTags(['overtime', 'hourly', 'premium'], orgId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        [orgId, ['overtime', 'hourly', 'premium']]
      );
    });

    it('should return empty array when no matches', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.searchByTags(['nonexistent'], orgId);

      expect(result).toEqual([]);
    });
  });
});
