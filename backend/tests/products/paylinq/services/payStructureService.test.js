/**
 * PayStructureService Unit Tests
 * 
 * Tests the pay structure template management, versioning, worker assignments,
 * component calculations, and template composition (inclusive template system).
 * 
 * ARCHITECTURE: Reference-based system where worker structures reference templates
 * via FK (not snapshots). Components resolved via JOINs at runtime.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PayStructureService from '../../../../src/products/paylinq/services/PayStructureService.js';
import { ValidationError, NotFoundError, ConflictError } from '../../../../src/middleware/errorHandler.js';

describe('PayStructureService', () => {
  let service;
  let mockRepository;
  let mockFormulaEngine;
  let mockTemporalPatternService;

  // Valid UUID v4 format test constants
  const testOrgId = '9ee50aee-76c3-46ce-87ed-005c6dd893ef';
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  const testTemplateId = '123e4567-e89b-12d3-a456-426614174000';
  const testEmployeeId = '223e4567-e89b-12d3-a456-426614174001';
  const testComponentId = '323e4567-e89b-12d3-a456-426614174002';
  const testWorkerStructureId = '423e4567-e89b-12d3-a456-426614174003';

  /**
   * Helper to create DB format template data (snake_case)
   */
  const createDbTemplate = (overrides = {}) => ({
    id: testTemplateId,
    organization_id: testOrgId,
    template_code: 'STANDARD_PAY',
    template_name: 'Standard Pay Structure',
    description: 'Standard pay structure for full-time employees',
    version_major: 1,
    version_minor: 0,
    version_patch: 0,
    version: '1.0.0',
    status: 'draft',
    pay_frequency: 'monthly',
    currency: 'SRD',
    is_organization_default: false,
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: testUserId,
    ...overrides
  });

  /**
   * Helper to create DB format component data (snake_case)
   */
  const createDbComponent = (overrides = {}) => ({
    id: testComponentId,
    template_id: testTemplateId,
    pay_component_id: '523e4567-e89b-12d3-a456-426614174004',
    component_code: 'BASIC_SALARY',
    component_name: 'Basic Salary',
    component_category: 'earning',
    calculation_type: 'fixed',
    configuration: {
      defaultAmount: 5000.00,
      defaultCurrency: 'SRD'
    },
    default_amount: 5000.00,
    sequence_order: 1,
    is_mandatory: true,
    is_taxable: true,
    affects_gross_pay: true,
    affects_net_pay: true,
    display_on_payslip: true,
    created_at: new Date(),
    ...overrides
  });

  /**
   * Helper to create DB format worker structure (snake_case)
   */
  const createDbWorkerStructure = (overrides = {}) => ({
    id: testWorkerStructureId,
    employee_id: testEmployeeId,
    template_version_id: testTemplateId,
    organization_id: testOrgId,
    base_salary: 5000.00,
    hourly_rate: null,
    pay_frequency: 'monthly',
    currency: 'SRD',
    assignment_type: 'custom',
    assignment_source: 'manual',
    effective_from: new Date('2025-01-01'),
    effective_to: null,
    is_current: true,
    created_at: new Date(),
    created_by: testUserId,
    ...overrides
  });

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      createTemplate: jest.fn(),
      findTemplateById: jest.fn(),
      findTemplates: jest.fn(),
      updateTemplate: jest.fn(),
      publishTemplate: jest.fn(),
      deprecateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      addComponent: jest.fn(),
      getTemplateComponents: jest.fn(),
      updateComponent: jest.fn(),
      deleteComponent: jest.fn(),
      assignTemplateToWorker: jest.fn(),
      getCurrentWorkerStructure: jest.fn(),
      getWorkerStructureHistory: jest.fn(),
      getOverlappingWorkerStructures: jest.fn(),
      deleteWorkerStructure: jest.fn(),
      addComponentOverride: jest.fn(),
      getWorkerOverrides: jest.fn(),
      updateComponentOverride: jest.fn(),
      deleteComponentOverride: jest.fn(),
      getTemplateVersions: jest.fn(),
      getOrganizationDefault: jest.fn(),
      addChangelogEntry: jest.fn(),
      findTemplateInclusions: jest.fn(),
      resolveTemplateByConstraint: jest.fn(),
      saveTemplateResolutionCache: jest.fn(),
      findWorkspaceById: jest.fn(),
      // Template Composition Methods
      findLatestTemplateByCode: jest.fn(),
      detectCircularDependency: jest.fn(),
      createTemplateInclusion: jest.fn(),
      auditTemplateInclusionChange: jest.fn(),
      updateTemplateInclusion: jest.fn(),
      deleteTemplateInclusion: jest.fn(),
      query: jest.fn(),
      getResolvedHierarchy: jest.fn(),
      // Missing methods for resolveTemplateInheritance
      findById: jest.fn(),
      findTemplateByCode: jest.fn()
    };

    // Create mock formula engine
    mockFormulaEngine = {
      parseFormula: jest.fn(),
      evaluateFormula: jest.fn()
    };

    // Create mock temporal pattern service
    mockTemporalPatternService = {
      evaluatePattern: jest.fn()
    };

    // Inject mocks into service
    service = new PayStructureService(mockRepository);
    service.formulaEngine = mockFormulaEngine;
    service.temporalPatternService = mockTemporalPatternService;
  });

  // ==================== TEMPLATE MANAGEMENT ====================

  describe('createTemplate', () => {
    it('should create a new pay structure template with valid data', async () => {
      // Arrange
      const templateData = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay Structure',
        description: 'Standard structure',
        versionMajor: 1,
        versionMinor: 0,
        versionPatch: 0,
        status: 'draft',
        payFrequency: 'monthly',
        currency: 'SRD',
        effectiveFrom: new Date('2025-01-01')
      };

      const dbTemplate = createDbTemplate();
      mockRepository.findTemplates.mockResolvedValue([]);
      mockRepository.createTemplate.mockResolvedValue(dbTemplate);
      mockRepository.addChangelogEntry.mockResolvedValue({});

      // Act
      const result = await service.createTemplate(templateData, testOrgId, testUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(testTemplateId);
      expect(mockRepository.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          templateCode: 'STANDARD_PAY',
          templateName: 'Standard Pay Structure'
        }),
        testOrgId,
        testUserId
      );
      expect(mockRepository.addChangelogEntry).toHaveBeenCalled();
    });

    it('should throw ValidationError for missing required fields', async () => {
      // Arrange
      const invalidData = {
        templateName: 'Test' // Missing templateCode
      };

      // Act & Assert
      await expect(
        service.createTemplate(invalidData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError for duplicate template code and version', async () => {
      // Arrange
      const templateData = {
        templateCode: 'STANDARD_PAY',
        templateName: 'Standard Pay',
        versionMajor: 1,
        versionMinor: 0,
        versionPatch: 0,
        effectiveFrom: new Date()
      };

      const existingTemplate = createDbTemplate({
        version_major: 1,
        version_minor: 0,
        version_patch: 0,
        status: 'active'
      });

      mockRepository.findTemplates.mockResolvedValue([existingTemplate]);

      // Act & Assert
      await expect(
        service.createTemplate(templateData, testOrgId, testUserId)
      ).rejects.toThrow(ConflictError);
    });

    it('should validate templateCode pattern (uppercase alphanumeric + underscore)', async () => {
      // Arrange
      const invalidData = {
        templateCode: 'invalid-code', // Hyphens not allowed
        templateName: 'Test',
        effectiveFrom: new Date()
      };

      // Act & Assert
      await expect(
        service.createTemplate(invalidData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getTemplateById', () => {
    it('should return template with components', async () => {
      // Arrange
      const dbTemplate = createDbTemplate();
      const dbComponents = [createDbComponent()];

      mockRepository.findTemplateById.mockResolvedValue(dbTemplate);
      mockRepository.getTemplateComponents.mockResolvedValue(dbComponents);

      // Act
      const result = await service.getTemplateById(testTemplateId, testOrgId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(testTemplateId);
      expect(result.components).toBeDefined();
      expect(result.components.length).toBe(1);
      expect(mockRepository.findTemplateById).toHaveBeenCalledWith(testTemplateId, testOrgId);
      expect(mockRepository.getTemplateComponents).toHaveBeenCalledWith(testTemplateId, testOrgId);
    });

    it('should throw NotFoundError when template does not exist', async () => {
      // Arrange
      mockRepository.findTemplateById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getTemplateById(testTemplateId, testOrgId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getTemplates', () => {
    it('should return all templates for organization', async () => {
      // Arrange
      const dbTemplates = [
        createDbTemplate({ template_code: 'TEMPLATE1' }),
        createDbTemplate({ id: '623e4567-e89b-12d3-a456-426614174005', template_code: 'TEMPLATE2' })
      ];

      mockRepository.findTemplates.mockResolvedValue(dbTemplates);

      // Act
      const result = await service.getTemplates(testOrgId);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(mockRepository.findTemplates).toHaveBeenCalledWith(testOrgId, {});
    });

    it('should support filtering by status', async () => {
      // Arrange
      const activeTemplate = createDbTemplate({ status: 'active' });
      mockRepository.findTemplates.mockResolvedValue([activeTemplate]);

      // Act
      const result = await service.getTemplates(testOrgId, { status: 'active' });

      // Assert
      expect(result.length).toBe(1);
      expect(mockRepository.findTemplates).toHaveBeenCalledWith(testOrgId, { status: 'active' });
    });
  });

  describe('publishTemplate', () => {
    it('should publish a draft template', async () => {
      // Arrange
      const draftTemplate = createDbTemplate({ status: 'draft' });
      const publishedTemplate = createDbTemplate({ status: 'active' });
      const components = [createDbComponent()];

      mockRepository.findTemplateById.mockResolvedValue(draftTemplate);
      mockRepository.getTemplateComponents.mockResolvedValue(components);
      mockRepository.publishTemplate.mockResolvedValue(publishedTemplate);

      // Act
      const result = await service.publishTemplate(testTemplateId, testOrgId, testUserId);

      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.publishTemplate).toHaveBeenCalledWith(testTemplateId, testOrgId, testUserId);
    });

    it('should throw ValidationError when template is not draft', async () => {
      // Arrange
      const activeTemplate = createDbTemplate({ status: 'active' });
      mockRepository.findTemplateById.mockResolvedValue(activeTemplate);

      // Act & Assert
      await expect(
        service.publishTemplate(testTemplateId, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when template has no components', async () => {
      // Arrange
      const draftTemplate = createDbTemplate({ status: 'draft' });
      mockRepository.findTemplateById.mockResolvedValue(draftTemplate);
      mockRepository.getTemplateComponents.mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.publishTemplate(testTemplateId, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateTemplate', () => {
    it('should update a draft template', async () => {
      // Arrange
      const draftTemplate = createDbTemplate({ status: 'draft' });
      const updates = { templateName: 'Updated Name' };
      const updatedTemplate = createDbTemplate({ ...draftTemplate, template_name: 'Updated Name' });

      mockRepository.findTemplateById.mockResolvedValue(draftTemplate);
      mockRepository.updateTemplate.mockResolvedValue(updatedTemplate);

      // Act
      const result = await service.updateTemplate(testTemplateId, updates, testOrgId, testUserId);

      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.updateTemplate).toHaveBeenCalledWith(
        testTemplateId,
        updates,
        testOrgId,
        testUserId
      );
    });

    it('should throw ValidationError when updating non-draft template', async () => {
      // Arrange
      const activeTemplate = createDbTemplate({ status: 'active' });
      mockRepository.findTemplateById.mockResolvedValue(activeTemplate);

      // Act & Assert
      await expect(
        service.updateTemplate(testTemplateId, { templateName: 'New' }, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a draft template', async () => {
      // Arrange
      const draftTemplate = createDbTemplate({ status: 'draft' });
      mockRepository.findTemplateById.mockResolvedValue(draftTemplate);
      mockRepository.deleteTemplate.mockResolvedValue({});

      // Act
      await service.deleteTemplate(testTemplateId, testOrgId, testUserId);

      // Assert
      expect(mockRepository.deleteTemplate).toHaveBeenCalledWith(testTemplateId, testOrgId, testUserId);
    });

    it('should throw ValidationError when deleting non-draft template', async () => {
      // Arrange
      const activeTemplate = createDbTemplate({ status: 'active' });
      mockRepository.findTemplateById.mockResolvedValue(activeTemplate);

      // Act & Assert
      await expect(
        service.deleteTemplate(testTemplateId, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== COMPONENT MANAGEMENT ====================

  describe('addComponent', () => {
    it('should add component to draft template with valid data', async () => {
      // Arrange
      const draftTemplate = createDbTemplate({ status: 'draft' });
      const componentData = {
        componentCode: 'BASIC_SALARY',
        componentName: 'Basic Salary',
        componentCategory: 'earning',
        calculationType: 'fixed',
        defaultAmount: 5000.00,
        sequenceOrder: 1,
        isMandatory: true,
        isTaxable: true
      };

      const dbComponent = createDbComponent();
      mockRepository.findTemplateById.mockResolvedValue(draftTemplate);
      mockRepository.addComponent.mockResolvedValue(dbComponent);

      // Act
      const result = await service.addComponent(testTemplateId, componentData, testOrgId, testUserId);

      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.addComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          componentCode: 'BASIC_SALARY',
          componentName: 'Basic Salary'
        }),
        testTemplateId,
        testOrgId,
        testUserId
      );
    });

    it('should validate and parse formula for formula-based components', async () => {
      // Arrange
      const draftTemplate = createDbTemplate({ status: 'draft' });
      const componentData = {
        componentCode: 'BONUS',
        componentName: 'Performance Bonus',
        componentCategory: 'earning',
        calculationType: 'formula',
        formulaExpression: 'baseSalary * 0.1',
        sequenceOrder: 2,
        isMandatory: false
      };

      const parsedAst = { type: 'BinaryExpression', operator: '*' };
      mockRepository.findTemplateById.mockResolvedValue(draftTemplate);
      mockFormulaEngine.parseFormula.mockResolvedValue(parsedAst);
      mockRepository.addComponent.mockResolvedValue(createDbComponent({ ...componentData, formula_ast: parsedAst }));

      // Act
      await service.addComponent(testTemplateId, componentData, testOrgId, testUserId);

      // Assert
      expect(mockFormulaEngine.parseFormula).toHaveBeenCalledWith('baseSalary * 0.1');
      expect(mockRepository.addComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          formulaExpression: 'baseSalary * 0.1',
          formulaAst: parsedAst
        }),
        testTemplateId,
        testOrgId,
        testUserId
      );
    });

    it('should throw ValidationError for invalid formula', async () => {
      // Arrange
      const draftTemplate = createDbTemplate({ status: 'draft' });
      const componentData = {
        componentCode: 'BONUS',
        componentName: 'Bonus',
        componentCategory: 'earning',
        calculationType: 'formula',
        formulaExpression: 'invalid formula )',
        sequenceOrder: 2
      };

      mockRepository.findTemplateById.mockResolvedValue(draftTemplate);
      mockFormulaEngine.parseFormula.mockRejectedValue(new Error('Syntax error'));

      // Act & Assert
      await expect(
        service.addComponent(testTemplateId, componentData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when adding to non-draft template', async () => {
      // Arrange
      const activeTemplate = createDbTemplate({ status: 'active' });
      mockRepository.findTemplateById.mockResolvedValue(activeTemplate);

      // Act & Assert
      await expect(
        service.addComponent(testTemplateId, {}, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate componentCategory enum', async () => {
      // Arrange
      const componentData = {
        componentCode: 'TEST',
        componentName: 'Test',
        componentCategory: 'invalid_category', // Invalid enum
        calculationType: 'fixed',
        sequenceOrder: 1
      };

      const draftTemplate = createDbTemplate({ status: 'draft' });
      mockRepository.findTemplateById.mockResolvedValue(draftTemplate);

      // Act & Assert
      await expect(
        service.addComponent(testTemplateId, componentData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getTemplateComponents', () => {
    it('should return components with DTO transformation', async () => {
      // Arrange
      const dbComponents = [
        createDbComponent({ component_code: 'COMP1', sequence_order: 1 }),
        createDbComponent({ id: '623e4567-e89b-12d3-a456-426614174006', component_code: 'COMP2', sequence_order: 2 })
      ];

      mockRepository.getTemplateComponents.mockResolvedValue(dbComponents);

      // Act
      const result = await service.getTemplateComponents(testTemplateId, testOrgId);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      // DTO transformation should convert snake_case to camelCase
      expect(result[0].componentCode).toBeDefined();
      expect(result[0].sequenceOrder).toBeDefined();
    });
  });

  // ==================== WORKER ASSIGNMENTS ====================

  describe('assignTemplateToWorker', () => {
    it('should assign active template to worker', async () => {
      // Arrange
      const assignmentData = {
        employeeId: testEmployeeId,
        templateId: testTemplateId,
        assignmentType: 'custom',
        effectiveFrom: new Date('2025-01-01'),
        baseSalary: 5000.00,
        payFrequency: 'monthly'
      };

      const activeTemplate = createDbTemplate({ status: 'active' });
      const workerStructure = createDbWorkerStructure();

      mockRepository.findTemplateById.mockResolvedValue(activeTemplate);
      mockRepository.getOverlappingWorkerStructures.mockResolvedValue([]);
      mockRepository.assignTemplateToWorker.mockResolvedValue(workerStructure);

      // Act
      const result = await service.assignTemplateToWorker(assignmentData, testOrgId, testUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(testWorkerStructureId);
      expect(mockRepository.assignTemplateToWorker).toHaveBeenCalled();
    });

    it('should use organization default when templateId is null', async () => {
      // Arrange
      const assignmentData = {
        employeeId: testEmployeeId,
        templateId: null, // Use org default
        effectiveFrom: new Date('2025-01-01')
      };

      const defaultTemplate = createDbTemplate({ 
        id: testTemplateId,
        status: 'active',
        is_organization_default: true 
      });
      const workerStructure = createDbWorkerStructure();

      mockRepository.getOrganizationDefault.mockResolvedValue(defaultTemplate);
      mockRepository.findTemplateById.mockResolvedValue(defaultTemplate);
      mockRepository.getOverlappingWorkerStructures.mockResolvedValue([]);
      mockRepository.assignTemplateToWorker.mockResolvedValue(workerStructure);

      // Act
      const result = await service.assignTemplateToWorker(assignmentData, testOrgId, testUserId);

      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.getOrganizationDefault).toHaveBeenCalledWith(testOrgId);
    });

    it('should soft delete overlapping worker structures', async () => {
      // Arrange
      const assignmentData = {
        employeeId: testEmployeeId,
        templateId: testTemplateId,
        effectiveFrom: new Date('2025-01-01'),
        effectiveTo: new Date('2025-12-31')
      };

      const activeTemplate = createDbTemplate({ status: 'active' });
      const overlappingStructure = createDbWorkerStructure({ id: '723e4567-e89b-12d3-a456-426614174007' });
      const newStructure = createDbWorkerStructure();

      mockRepository.findTemplateById.mockResolvedValue(activeTemplate);
      mockRepository.getOverlappingWorkerStructures.mockResolvedValue([overlappingStructure]);
      mockRepository.deleteWorkerStructure.mockResolvedValue({});
      mockRepository.assignTemplateToWorker.mockResolvedValue(newStructure);

      // Act
      await service.assignTemplateToWorker(assignmentData, testOrgId, testUserId);

      // Assert
      expect(mockRepository.deleteWorkerStructure).toHaveBeenCalledWith(
        overlappingStructure.id,
        testOrgId,
        testUserId
      );
    });

    it('should throw ValidationError when assigning non-active template', async () => {
      // Arrange
      const assignmentData = {
        employeeId: testEmployeeId,
        templateId: testTemplateId,
        effectiveFrom: new Date()
      };

      const draftTemplate = createDbTemplate({ status: 'draft' });
      mockRepository.findTemplateById.mockResolvedValue(draftTemplate);

      // Act & Assert
      await expect(
        service.assignTemplateToWorker(assignmentData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate employeeId as UUID', async () => {
      // Arrange
      const assignmentData = {
        employeeId: 'invalid-uuid', // Not a valid UUID
        templateId: testTemplateId,
        effectiveFrom: new Date()
      };

      // Act & Assert
      await expect(
        service.assignTemplateToWorker(assignmentData, testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getCurrentWorkerStructure', () => {
    it('should return current worker structure with components and overrides', async () => {
      // Arrange
      const workerStructure = {
        ...createDbWorkerStructure(),
        components: [createDbComponent()],
        template: createDbTemplate(),
        overrides: []
      };

      mockRepository.getCurrentWorkerStructure.mockResolvedValue(workerStructure);

      // Act
      const result = await service.getCurrentWorkerStructure(testEmployeeId, testOrgId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(testWorkerStructureId);
      expect(result.overrides).toBeDefined();
      expect(mockRepository.getCurrentWorkerStructure).toHaveBeenCalledWith(testEmployeeId, testOrgId, null);
    });

    it('should support asOfDate for historical lookup', async () => {
      // Arrange
      const asOfDate = new Date('2025-06-01');
      const workerStructure = createDbWorkerStructure();

      mockRepository.getCurrentWorkerStructure.mockResolvedValue(workerStructure);
      mockRepository.getWorkerOverrides.mockResolvedValue([]);

      // Act
      await service.getCurrentWorkerStructure(testEmployeeId, testOrgId, asOfDate);

      // Assert
      expect(mockRepository.getCurrentWorkerStructure).toHaveBeenCalledWith(
        testEmployeeId,
        testOrgId,
        asOfDate
      );
    });

    it('should return null when worker has no structure', async () => {
      // Arrange
      mockRepository.getCurrentWorkerStructure.mockResolvedValue(null);

      // Act
      const result = await service.getCurrentWorkerStructure(testEmployeeId, testOrgId);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ==================== CALCULATION ENGINE ====================

  describe('calculateWorkerPay', () => {
    it('should calculate pay with base salary and components', async () => {
      // Arrange
      const workerStructure = {
        ...createDbWorkerStructure({ base_salary: 5000.00 }),
        components: [
          createDbComponent({
            component_code: 'HOUSING_ALLOWANCE',
            component_name: 'Housing Allowance',
            component_category: 'earning',
            component_type: 'earning',
            calculation_type: 'fixed',
            configuration: { defaultAmount: 1000.00 },
            default_amount: 1000.00,
            sequence_order: 2
          })
        ],
        overrides: []
      };

      mockRepository.getCurrentWorkerStructure.mockResolvedValue(workerStructure);

      const inputData = {
        baseSalary: 5000.00,
        payFrequency: 'monthly'
      };

      // Act
      const result = await service.calculateWorkerPay(testEmployeeId, inputData, testOrgId);

      // Assert
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalEarnings).toBe(6000.00); // Base + Housing
      expect(result.calculations.length).toBeGreaterThan(0);
    });

    it('should auto-include base salary from inputData', async () => {
      // Arrange
      const workerStructure = {
        ...createDbWorkerStructure(),
        components: [],
        overrides: []
      };

      mockRepository.getCurrentWorkerStructure.mockResolvedValue(workerStructure);

      const inputData = {
        baseSalary: 5000.00,
        payFrequency: 'monthly'
      };

      // Act
      const result = await service.calculateWorkerPay(testEmployeeId, inputData, testOrgId);

      // Assert
      expect(result.calculations).toContainEqual(
        expect.objectContaining({
          componentCode: 'BASE_SALARY',
          amount: 5000.00,
          componentCategory: 'earning'
        })
      );
      expect(result.summary.totalEarnings).toBe(5000.00);
    });

    it('should calculate percentage-based components', async () => {
      // Arrange
      const workerStructure = {
        ...createDbWorkerStructure({ base_salary: 5000.00 }),
        components: [
          createDbComponent({
            component_code: 'PENSION',
            component_name: 'Pension Contribution',
            component_category: 'deduction',
            component_type: 'deduction',
            calculation_type: 'percentage',
            configuration: {
              percentageOf: 'baseSalary',
              percentageRate: 0.05
            },
            percentage_of: 'baseSalary',
            percentage_rate: 0.05,
            sequence_order: 2
          })
        ],
        overrides: []
      };

      mockRepository.getCurrentWorkerStructure.mockResolvedValue(workerStructure);

      const inputData = { baseSalary: 5000.00 };

      // Act
      const result = await service.calculateWorkerPay(testEmployeeId, inputData, testOrgId);

      // Assert
      const pensionCalc = result.calculations.find(c => c.componentCode === 'PENSION');
      expect(pensionCalc).toBeDefined();
      expect(pensionCalc.amount).toBe(250.00); // 5% of 5000
      expect(result.summary.totalDeductions).toBe(250.00);
    });

    it('should apply component overrides', async () => {
      // Arrange
      const component = createDbComponent({
        component_code: 'ALLOWANCE',
        component_category: 'earning',
        component_type: 'earning',
        calculation_type: 'fixed',
        configuration: { defaultAmount: 1000.00 },
        default_amount: 1000.00
      });

      const override = {
        component_code: 'ALLOWANCE',
        override_type: 'amount',
        override_amount: 1500.00,
        is_disabled: false
      };

      const workerStructure = {
        ...createDbWorkerStructure({ base_salary: 5000.00 }),
        components: [component],
        overrides: [override]
      };

      mockRepository.getCurrentWorkerStructure.mockResolvedValue(workerStructure);

      // Act
      const result = await service.calculateWorkerPay(testEmployeeId, { baseSalary: 5000.00 }, testOrgId);

      // Assert
      const allowanceCalc = result.calculations.find(c => c.componentCode === 'ALLOWANCE');
      expect(allowanceCalc.amount).toBe(1500.00); // Override applied
      expect(allowanceCalc.calculationMetadata.overrideApplied).toBe(true);
    });

    it('should skip disabled components', async () => {
      // Arrange
      const component = createDbComponent({
        component_code: 'OPTIONAL_BENEFIT',
        component_category: 'benefit'
      });

      const override = {
        component_code: 'OPTIONAL_BENEFIT',
        is_disabled: true
      };

      const workerStructure = {
        ...createDbWorkerStructure({ base_salary: 5000.00 }),
        components: [component],
        overrides: [override]
      };

      mockRepository.getCurrentWorkerStructure.mockResolvedValue(workerStructure);

      // Act
      const result = await service.calculateWorkerPay(testEmployeeId, { baseSalary: 5000.00 }, testOrgId);

      // Assert
      const benefitCalc = result.calculations.find(c => c.componentCode === 'OPTIONAL_BENEFIT');
      expect(benefitCalc).toBeUndefined(); // Should be skipped
    });

    it('should throw NotFoundError when worker has no structure', async () => {
      // Arrange
      mockRepository.getCurrentWorkerStructure.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.calculateWorkerPay(testEmployeeId, { baseSalary: 5000 }, testOrgId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should calculate net pay correctly', async () => {
      // Arrange
      const workerStructure = {
        ...createDbWorkerStructure({ base_salary: 5000.00 }),
        components: [
          createDbComponent({
            component_code: 'ALLOWANCE',
            component_category: 'earning',
            component_type: 'earning',
            calculation_type: 'fixed',
            configuration: { defaultAmount: 1000.00 },
            default_amount: 1000.00,
            sequence_order: 2
          }),
          createDbComponent({
            id: '623e4567-e89b-12d3-a456-426614174008',
            component_code: 'TAX',
            component_category: 'tax',
            component_type: 'tax',
            calculation_type: 'percentage',
            configuration: {
              percentageOf: 'baseSalary',
              percentageRate: 0.10
            },
            percentage_of: 'baseSalary',
            percentage_rate: 0.10,
            sequence_order: 3
          }),
          createDbComponent({
            id: '723e4567-e89b-12d3-a456-426614174009',
            component_code: 'PENSION',
            component_category: 'deduction',
            component_type: 'deduction',
            calculation_type: 'percentage',
            configuration: {
              percentageOf: 'baseSalary',
              percentageRate: 0.05
            },
            percentage_of: 'baseSalary',
            percentage_rate: 0.05,
            sequence_order: 4
          })
        ],
        overrides: []
      };

      mockRepository.getCurrentWorkerStructure.mockResolvedValue(workerStructure);

      // Act
      const result = await service.calculateWorkerPay(testEmployeeId, { baseSalary: 5000.00 }, testOrgId);

      // Assert
      expect(result.summary.totalEarnings).toBe(6000.00); // Base + Allowance
      expect(result.summary.totalTaxes).toBe(500.00); // 10% of base
      expect(result.summary.totalDeductions).toBe(250.00); // 5% of base
      expect(result.summary.netPay).toBe(5250.00); // 6000 - 500 - 250
    });
  });

  // ==================== VERSIONING ====================

  describe('createNewVersion', () => {
    it('should create new major version', async () => {
      // Arrange
      const sourceTemplate = createDbTemplate({
        version_major: 1,
        version_minor: 2,
        version_patch: 3,
        version: '1.2.3'
      });

      const newTemplate = createDbTemplate({
        version_major: 2,
        version_minor: 0,
        version_patch: 0,
        status: 'draft'
      });

      const components = [createDbComponent()];

      mockRepository.findTemplateById.mockResolvedValueOnce(sourceTemplate); // For getTemplateById
      mockRepository.getTemplateComponents.mockResolvedValueOnce(components); // For getTemplateById
      mockRepository.findTemplateById.mockResolvedValueOnce(sourceTemplate); // For createNewVersion
      mockRepository.getTemplateComponents.mockResolvedValueOnce(components); // For createNewVersion
      mockRepository.createTemplate.mockResolvedValue(newTemplate);
      mockRepository.addComponent.mockResolvedValue(createDbComponent());
      mockRepository.addChangelogEntry.mockResolvedValue({});

      // Act
      const result = await service.createNewVersion(
        testTemplateId,
        'major',
        'Breaking changes',
        testOrgId,
        testUserId
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          versionMajor: 2,
          versionMinor: 0,
          versionPatch: 0
        }),
        testOrgId,
        testUserId
      );
    });

    it('should create new minor version', async () => {
      // Arrange
      const sourceTemplate = createDbTemplate({
        version_major: 1,
        version_minor: 2,
        version_patch: 3
      });

      const newTemplate = createDbTemplate({
        version_major: 1,
        version_minor: 3,
        version_patch: 0,
        status: 'draft'
      });

      mockRepository.findTemplateById.mockResolvedValueOnce(sourceTemplate);
      mockRepository.getTemplateComponents.mockResolvedValue([]);
      mockRepository.createTemplate.mockResolvedValue(newTemplate);
      mockRepository.addChangelogEntry.mockResolvedValue({});

      // Act
      const result = await service.createNewVersion(
        testTemplateId,
        'minor',
        'New features',
        testOrgId,
        testUserId
      );

      // Assert
      expect(mockRepository.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          versionMajor: 1,
          versionMinor: 3,
          versionPatch: 0
        }),
        testOrgId,
        testUserId
      );
    });

    it('should create new patch version', async () => {
      // Arrange
      const sourceTemplate = createDbTemplate({
        version_major: 1,
        version_minor: 2,
        version_patch: 3
      });

      const newTemplate = createDbTemplate({
        version_major: 1,
        version_minor: 2,
        version_patch: 4,
        status: 'draft'
      });

      mockRepository.findTemplateById.mockResolvedValueOnce(sourceTemplate);
      mockRepository.getTemplateComponents.mockResolvedValue([]);
      mockRepository.createTemplate.mockResolvedValue(newTemplate);
      mockRepository.addChangelogEntry.mockResolvedValue({});

      // Act
      const result = await service.createNewVersion(
        testTemplateId,
        'patch',
        'Bug fixes',
        testOrgId,
        testUserId
      );

      // Assert
      expect(mockRepository.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          versionMajor: 1,
          versionMinor: 2,
          versionPatch: 4
        }),
        testOrgId,
        testUserId
      );
    });

    it('should copy all components from source template', async () => {
      // Arrange
      const sourceTemplate = createDbTemplate();
      const components = [
        createDbComponent({ component_code: 'COMP1' }),
        createDbComponent({ id: '623e4567-e89b-12d3-a456-426614174010', component_code: 'COMP2' })
      ];

      const newTemplate = createDbTemplate({
        id: '723e4567-e89b-12d3-a456-426614174011',
        version_major: 2,
        version_minor: 0,
        version_patch: 0
      });

      mockRepository.findTemplateById.mockResolvedValueOnce(sourceTemplate);
      mockRepository.getTemplateComponents.mockResolvedValueOnce(components);
      mockRepository.createTemplate.mockResolvedValue(newTemplate);
      mockRepository.addComponent.mockResolvedValue(createDbComponent());
      mockRepository.addChangelogEntry.mockResolvedValue({});

      // Act
      await service.createNewVersion(testTemplateId, 'major', 'Changes', testOrgId, testUserId);

      // Assert
      expect(mockRepository.addComponent).toHaveBeenCalledTimes(2);
    });

    it('should throw ValidationError for invalid version type', async () => {
      // Arrange & Act & Assert
      await expect(
        service.createNewVersion(testTemplateId, 'invalid', 'Changes', testOrgId, testUserId)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==================== TEMPLATE COMPOSITION (INCLUSIVE SYSTEM) ====================

  describe('resolveTemplateInheritance', () => {
    it('should resolve template with no inclusions', async () => {
      // Arrange
      const template = createDbTemplate();
      const components = [createDbComponent()];

      mockRepository.findTemplateById.mockResolvedValue(template);
      mockRepository.findTemplateInclusions.mockResolvedValue([]);
      mockRepository.getTemplateComponents.mockResolvedValue(components);

      // Act
      const result = await service.resolveTemplateInheritance(testTemplateId, testOrgId);

      // Assert
      expect(result).toBeDefined();
      expect(result.templateId).toBe(testTemplateId);
      expect(result.components.length).toBe(1);
      expect(result.resolutionDepth).toBe(1);
    });

    it('should resolve template with single level inclusion', async () => {
      // Arrange
      const parentTemplate = createDbTemplate({ id: testTemplateId, template_code: 'PARENT' });
      const includedTemplate = createDbTemplate({ 
        id: '823e4567-e89b-12d3-a456-426614174012', 
        template_code: 'INCLUDED' 
      });

      const parentComponents = [createDbComponent({ component_code: 'COMP1' })];
      const includedComponents = [createDbComponent({ 
        id: '923e4567-e89b-12d3-a456-426614174013', 
        component_code: 'COMP2' 
      })];

      const inclusion = {
        included_template_code: 'INCLUDED',
        inclusion_priority: 1
      };

      mockRepository.findTemplateById.mockResolvedValueOnce(parentTemplate);
      mockRepository.findTemplateInclusions
        .mockResolvedValueOnce([inclusion])
        .mockResolvedValueOnce([]);
      mockRepository.findTemplateByCode.mockResolvedValue(includedTemplate);
      mockRepository.getTemplateComponents
        .mockResolvedValueOnce(includedComponents)
        .mockResolvedValueOnce(parentComponents);

      // Act
      const result = await service.resolveTemplateInheritance(testTemplateId, testOrgId);

      // Assert
      expect(result).toBeDefined();
      expect(result.resolvedComponentCount).toBe(2);
      expect(result.resolutionDepth).toBe(2);
    });

    it('should throw ValidationError for circular dependencies', async () => {
      // Arrange
      const template1 = createDbTemplate({ id: testTemplateId, template_code: 'TEMPLATE1' });
      const template2 = createDbTemplate({ 
        id: '823e4567-e89b-12d3-a456-426614174014', 
        template_code: 'TEMPLATE2' 
      });

      const inclusion1to2 = { included_template_code: 'TEMPLATE2', inclusion_priority: 1 };
      const inclusion2to1 = { included_template_code: 'TEMPLATE1', inclusion_priority: 1 };

      mockRepository.findTemplateById.mockResolvedValue(template1);
      mockRepository.findTemplateInclusions
        .mockResolvedValueOnce([inclusion1to2])
        .mockResolvedValueOnce([inclusion2to1]);
      mockRepository.findTemplateByCode
        .mockResolvedValueOnce(template2)
        .mockResolvedValueOnce(template1);
      mockRepository.getTemplateComponents.mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.resolveTemplateInheritance(testTemplateId, testOrgId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for excessive nesting depth', async () => {
      // Arrange
      const templates = Array.from({ length: 12 }, (_, i) => 
        createDbTemplate({ 
          id: `${i}23e4567-e89b-12d3-a456-426614174${String(i).padStart(3, '0')}`, 
          template_code: `TEMPLATE${i}` 
        })
      );

      mockRepository.findTemplateById.mockImplementation((id) => {
        const template = templates.find(t => t.id === id);
        return Promise.resolve(template);
      });

      mockRepository.findTemplateInclusions.mockImplementation((id) => {
        const currentIndex = templates.findIndex(t => t.id === id);
        if (currentIndex >= 10) return Promise.resolve([]);
        return Promise.resolve([{
          included_template_code: templates[currentIndex + 1].template_code,
          inclusion_priority: 1
        }]);
      });

      mockRepository.findById.mockResolvedValue(templates[0]);
      mockRepository.findTemplateByCode.mockImplementation((code) => {
        return Promise.resolve(templates.find(t => t.template_code === code));
      });

      mockRepository.getTemplateComponents.mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.resolveTemplateInheritance(templates[0].id, testOrgId)
      ).rejects.toThrow(ValidationError);
    });
  });

  /**
   * Template Composition Tests
   * Tests template inclusion and hierarchy management
   */
  describe('Template Composition', () => {
    describe('addIncludedTemplate', () => {
      it('should add template inclusion successfully', async () => {
        const parentTemplateId = '123e4567-e89b-12d3-a456-426614174000';
        const orgId = '223e4567-e89b-12d3-a456-426614174000';
        const userId = '323e4567-e89b-12d3-a456-426614174000';

        const inclusionData = {
          includedTemplateCode: 'TAX_TEMPLATE',
          inclusionPriority: 1,
          inclusionMode: 'merge',
          versionConstraint: 'latest'
        };

        const mockParentTemplate = createDbTemplate({ id: parentTemplateId, template_code: 'BASE_TEMPLATE' });
        const mockIncludedTemplate = createDbTemplate({ template_code: 'TAX_TEMPLATE' });
        const mockCreatedInclusion = {
          id: 'inc-123',
          parent_template_id: parentTemplateId,
          included_template_code: 'TAX_TEMPLATE',
          inclusion_priority: 1
        };

        mockRepository.findTemplateById.mockResolvedValue(mockParentTemplate);
        mockRepository.findLatestTemplateByCode.mockResolvedValue(mockIncludedTemplate);
        mockRepository.detectCircularDependency.mockResolvedValue(false);
        mockRepository.findTemplateInclusions.mockResolvedValue([]);
        mockRepository.createTemplateInclusion.mockResolvedValue(mockCreatedInclusion);

        const result = await service.addIncludedTemplate(parentTemplateId, inclusionData, orgId, userId);

        expect(result).toBeDefined();
        expect(mockRepository.findTemplateById).toHaveBeenCalledWith(parentTemplateId, orgId);
        expect(mockRepository.findLatestTemplateByCode).toHaveBeenCalledWith('TAX_TEMPLATE', orgId);
        expect(mockRepository.detectCircularDependency).toHaveBeenCalledWith(parentTemplateId, 'TAX_TEMPLATE', orgId);
        expect(mockRepository.createTemplateInclusion).toHaveBeenCalled();
      });

      it('should throw NotFoundError if parent template not found', async () => {
        const parentTemplateId = '123e4567-e89b-12d3-a456-426614174000';
        const orgId = '223e4567-e89b-12d3-a456-426614174000';
        const userId = '323e4567-e89b-12d3-a456-426614174000';

        const inclusionData = {
          includedTemplateCode: 'TAX_TEMPLATE',
          inclusionPriority: 1
        };

        mockRepository.findTemplateById.mockResolvedValue(null);

        await expect(
          service.addIncludedTemplate(parentTemplateId, inclusionData, orgId, userId)
        ).rejects.toThrow(NotFoundError);
      });

      it('should throw NotFoundError if included template not found', async () => {
        const parentTemplateId = '123e4567-e89b-12d3-a456-426614174000';
        const orgId = '223e4567-e89b-12d3-a456-426614174000';
        const userId = '323e4567-e89b-12d3-a456-426614174000';

        const inclusionData = {
          includedTemplateCode: 'NONEXISTENT_TEMPLATE',
          inclusionPriority: 1
        };

        const mockParentTemplate = createDbTemplate({ id: parentTemplateId });

        mockRepository.findTemplateById.mockResolvedValue(mockParentTemplate);
        mockRepository.findLatestTemplateByCode.mockResolvedValue(null);

        await expect(
          service.addIncludedTemplate(parentTemplateId, inclusionData, orgId, userId)
        ).rejects.toThrow(NotFoundError);
      });

      it('should throw ConflictError if circular dependency detected', async () => {
        const parentTemplateId = '123e4567-e89b-12d3-a456-426614174000';
        const orgId = '223e4567-e89b-12d3-a456-426614174000';
        const userId = '323e4567-e89b-12d3-a456-426614174000';

        const inclusionData = {
          includedTemplateCode: 'TAX_TEMPLATE',
          inclusionPriority: 1
        };

        const mockParentTemplate = createDbTemplate({ id: parentTemplateId, template_code: 'BASE_TEMPLATE' });
        const mockIncludedTemplate = createDbTemplate({ template_code: 'TAX_TEMPLATE' });

        mockRepository.findTemplateById.mockResolvedValue(mockParentTemplate);
        mockRepository.findLatestTemplateByCode.mockResolvedValue(mockIncludedTemplate);
        mockRepository.detectCircularDependency.mockResolvedValue(true);

        await expect(
          service.addIncludedTemplate(parentTemplateId, inclusionData, orgId, userId)
        ).rejects.toThrow(ConflictError);
      });

      it('should throw ConflictError if priority already used', async () => {
        const parentTemplateId = '123e4567-e89b-12d3-a456-426614174000';
        const orgId = '223e4567-e89b-12d3-a456-426614174000';
        const userId = '323e4567-e89b-12d3-a456-426614174000';

        const inclusionData = {
          includedTemplateCode: 'TAX_TEMPLATE',
          inclusionPriority: 1
        };

        const mockParentTemplate = createDbTemplate({ id: parentTemplateId });
        const mockIncludedTemplate = createDbTemplate({ template_code: 'TAX_TEMPLATE' });
        const existingInclusions = [
          { inclusion_priority: 1, included_template_code: 'OTHER_TEMPLATE' }
        ];

        mockRepository.findTemplateById.mockResolvedValue(mockParentTemplate);
        mockRepository.findLatestTemplateByCode.mockResolvedValue(mockIncludedTemplate);
        mockRepository.detectCircularDependency.mockResolvedValue(false);
        mockRepository.findTemplateInclusions.mockResolvedValue(existingInclusions);

        await expect(
          service.addIncludedTemplate(parentTemplateId, inclusionData, orgId, userId)
        ).rejects.toThrow(ConflictError);
      });
    });

    describe('getIncludedTemplates', () => {
      it('should return DTO-transformed template inclusions', async () => {
        const parentTemplateId = '123e4567-e89b-12d3-a456-426614174000';
        const orgId = '223e4567-e89b-12d3-a456-426614174000';

        const mockInclusions = [
          {
            id: 'inc-1',
            parent_template_id: parentTemplateId,
            included_template_code: 'TAX_TEMPLATE',
            inclusion_priority: 1,
            inclusion_mode: 'merge'
          },
          {
            id: 'inc-2',
            parent_template_id: parentTemplateId,
            included_template_code: 'BENEFITS_TEMPLATE',
            inclusion_priority: 2,
            inclusion_mode: 'additive'
          }
        ];

        mockRepository.findTemplateInclusions.mockResolvedValue(mockInclusions);

        const result = await service.getIncludedTemplates(parentTemplateId, orgId);

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
        expect(mockRepository.findTemplateInclusions).toHaveBeenCalledWith(parentTemplateId, orgId, null);
      });

      it('should support asOfDate parameter', async () => {
        const parentTemplateId = '123e4567-e89b-12d3-a456-426614174000';
        const orgId = '223e4567-e89b-12d3-a456-426614174000';
        const asOfDate = new Date('2025-01-01');

        mockRepository.findTemplateInclusions.mockResolvedValue([]);

        await service.getIncludedTemplates(parentTemplateId, orgId, asOfDate);

        expect(mockRepository.findTemplateInclusions).toHaveBeenCalledWith(parentTemplateId, orgId, asOfDate);
      });
    });

    describe('updateIncludedTemplate', () => {
      it('should update template inclusion successfully', async () => {
        const inclusionId = 'inc-123e4567-e89b-12d3-a456-426614174000';
        const orgId = '223e4567-e89b-12d3-a456-426614174000';
        const userId = '323e4567-e89b-12d3-a456-426614174000';

        const updates = {
          inclusionPriority: 3,
          inclusionMode: 'override'
        };

        const mockExistingInclusion = {
          id: inclusionId,
          parent_template_id: '123e4567-e89b-12d3-a456-426614174000',
          included_template_code: 'TAX_TEMPLATE',
          inclusion_priority: 1,
          inclusion_mode: 'merge'
        };

        mockRepository.query.mockResolvedValue({ rows: [mockExistingInclusion] });
        mockRepository.findTemplateInclusions.mockResolvedValue([]);
        mockRepository.updateTemplateInclusion.mockResolvedValue({
          ...mockExistingInclusion,
          ...updates
        });

        const result = await service.updateIncludedTemplate(inclusionId, updates, orgId, userId);

        expect(result).toBeDefined();
        expect(mockRepository.query).toHaveBeenCalled();
        expect(mockRepository.updateTemplateInclusion).toHaveBeenCalled();
      });

      it('should throw NotFoundError if inclusion not found', async () => {
        const inclusionId = 'inc-123e4567-e89b-12d3-a456-426614174000';
        const orgId = '223e4567-e89b-12d3-a456-426614174000';
        const userId = '323e4567-e89b-12d3-a456-426614174000';

        const updates = { inclusionPriority: 3 };

        mockRepository.query.mockResolvedValue({ rows: [] });

        await expect(
          service.updateIncludedTemplate(inclusionId, updates, orgId, userId)
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('removeIncludedTemplate', () => {
      it('should remove template inclusion successfully', async () => {
        const inclusionId = 'inc-123e4567-e89b-12d3-a456-426614174000';
        const orgId = '223e4567-e89b-12d3-a456-426614174000';
        const userId = '323e4567-e89b-12d3-a456-426614174000';
        const reason = 'Template no longer needed';

        const mockInclusion = {
          id: inclusionId,
          parent_template_id: '123e4567-e89b-12d3-a456-426614174000',
          included_template_code: 'TAX_TEMPLATE'
        };

        mockRepository.query.mockResolvedValue({ rows: [mockInclusion] });
        mockRepository.deleteTemplateInclusion.mockResolvedValue(true);
        mockRepository.auditTemplateInclusionChange.mockResolvedValue(true);

        const result = await service.removeIncludedTemplate(inclusionId, orgId, userId, reason);

        expect(result.success).toBe(true);
        expect(mockRepository.deleteTemplateInclusion).toHaveBeenCalledWith(inclusionId, orgId, userId);
        expect(mockRepository.auditTemplateInclusionChange).toHaveBeenCalled();
      });

      it('should throw NotFoundError if inclusion not found', async () => {
        const inclusionId = 'inc-123e4567-e89b-12d3-a456-426614174000';
        const orgId = '223e4567-e89b-12d3-a456-426614174000';
        const userId = '323e4567-e89b-12d3-a456-426614174000';

        mockRepository.query.mockResolvedValue({ rows: [] });

        await expect(
          service.removeIncludedTemplate(inclusionId, orgId, userId)
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('getCompositeStructure', () => {
      it('should return composite structure with resolved hierarchy', async () => {
        const templateId = '123e4567-e89b-12d3-a456-426614174000';
        const orgId = '223e4567-e89b-12d3-a456-426614174000';

        const mockTemplate = createDbTemplate({ id: templateId });
        const mockResolvedStructure = {
          components: [],
          includedTemplates: [],
          effectiveComponents: []
        };

        mockRepository.findTemplateById.mockResolvedValue(mockTemplate);
        jest.spyOn(service, 'resolveTemplateHierarchy').mockResolvedValue(mockResolvedStructure);

        const result = await service.getCompositeStructure(templateId, orgId);

        expect(result).toBeDefined();
        expect(result.template).toBeDefined();
        expect(result.resolvedStructure).toBeDefined();
        expect(mockRepository.findTemplateById).toHaveBeenCalledWith(templateId, orgId);
      });

      it('should throw NotFoundError if template not found', async () => {
        const templateId = '123e4567-e89b-12d3-a456-426614174000';
        const orgId = '223e4567-e89b-12d3-a456-426614174000';

        mockRepository.findTemplateById.mockResolvedValue(null);

        await expect(
          service.getCompositeStructure(templateId, orgId)
        ).rejects.toThrow(NotFoundError);
      });
    });
  });
});
