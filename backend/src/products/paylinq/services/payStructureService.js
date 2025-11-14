/**
 * Pay Structure Service
 * 
 * Business logic for pay structure template management, versioning,
 * worker assignments, and payroll calculations based on pay structures.
 * 
 * @module products/paylinq/services/payStructureService
 */

import Joi from 'joi';
import PayStructureRepository from '../repositories/payStructureRepository.js';
import FormulaEngineService from './formulaEngineService.js';
import temporalPatternService from './temporalPatternService.js';
import dtoMapper from '../utils/dtoMapper.js';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError, ConflictError } from '../../../middleware/errorHandler.js';

class PayStructureService {
  constructor() {
    this.repository = new PayStructureRepository();
    this.formulaEngine = new FormulaEngineService();
    this.temporalPatternService = temporalPatternService;
  }

  // ==================== VALIDATION SCHEMAS ====================

  createTemplateSchema = Joi.object({
    templateCode: Joi.string().required().max(50).pattern(/^[A-Z0-9_]+$/),
    templateName: Joi.string().required().max(100),
    description: Joi.string().allow('', null),
    versionMajor: Joi.number().integer().min(1).default(1),
    versionMinor: Joi.number().integer().min(0).default(0),
    versionPatch: Joi.number().integer().min(0).default(0),
    status: Joi.string().valid('draft', 'active', 'deprecated', 'archived').default('draft'),
    applicableToWorkerTypes: Joi.array().items(Joi.string()),
    applicableToJurisdictions: Joi.array().items(Joi.string().length(2)),
    payFrequency: Joi.string().valid('weekly', 'biweekly', 'semimonthly', 'monthly'),
    currency: Joi.string().length(3).default('SRD'),
    isOrganizationDefault: Joi.boolean().default(false),
    effectiveFrom: Joi.date().required(),
    effectiveTo: Joi.date().allow(null),
    tags: Joi.array().items(Joi.string()),
    notes: Joi.string().allow('', null)
  });

  addComponentSchema = Joi.object({
    payComponentId: Joi.string().uuid().allow(null),
    componentCode: Joi.string().required().max(50).pattern(/^[A-Z0-9_]+$/),
    componentName: Joi.string().required().max(100),
    componentCategory: Joi.string().required().valid('earning', 'deduction', 'tax', 'benefit', 'employer_cost', 'reimbursement'),
    calculationType: Joi.string().required().valid('fixed', 'percentage', 'formula', 'hourly_rate', 'tiered', 'external'),
    defaultAmount: Joi.number().min(0).allow(null),
    defaultCurrency: Joi.string().length(3).allow(null),
    percentageOf: Joi.string().allow(null),
    percentageRate: Joi.number().min(0).max(1).allow(null),
    formulaExpression: Joi.string().allow('', null),
    formulaVariables: Joi.object().allow(null),
    rateMultiplier: Joi.number().min(0).allow(null),
    appliesToHoursType: Joi.string().allow(null),
    tierConfiguration: Joi.array().allow(null),
    tierBasis: Joi.string().allow(null),
    sequenceOrder: Joi.number().integer().required().min(1),
    dependsOnComponents: Joi.array().items(Joi.string()),
    isMandatory: Joi.boolean().default(false),
    isTaxable: Joi.boolean().default(true),
    affectsGrossPay: Joi.boolean().default(true),
    affectsNetPay: Joi.boolean().default(true),
    taxCategory: Joi.string().allow(null),
    accountingCode: Joi.string().allow(null),
    minAmount: Joi.number().allow(null),
    maxAmount: Joi.number().allow(null),
    minPercentage: Joi.number().allow(null),
    maxPercentage: Joi.number().allow(null),
    maxAnnual: Joi.number().allow(null),
    maxPerPeriod: Joi.number().allow(null),
    allowWorkerOverride: Joi.boolean().default(false),
    overrideAllowedFields: Joi.array().items(Joi.string()),
    requiresApproval: Joi.boolean().default(false),
    displayOnPayslip: Joi.boolean().default(true),
    displayName: Joi.string().allow(null),
    displayOrder: Joi.number().integer().allow(null),
    displayCategory: Joi.string().allow(null),
    conditions: Joi.object().allow(null),
    isConditional: Joi.boolean().default(false),
    description: Joi.string().allow('', null),
    notes: Joi.string().allow('', null)
  });

  assignTemplateSchema = Joi.object({
    employeeId: Joi.string().uuid().required(),
    templateId: Joi.string().uuid().allow(null), // Null uses org default
    assignmentType: Joi.string().valid('default', 'department', 'group', 'custom', 'temporary').default('custom'),
    assignmentReason: Joi.string().allow('', null),
    effectiveFrom: Joi.date().required(),
    effectiveTo: Joi.date().allow(null),
    baseSalary: Joi.number().min(0).allow(null),
    hourlyRate: Joi.number().min(0).allow(null),
    payFrequency: Joi.string().valid('weekly', 'biweekly', 'semimonthly', 'monthly').allow(null),
    currency: Joi.string().length(3).allow(null),
    notes: Joi.string().allow('', null)
  });

  addOverrideSchema = Joi.object({
    workerStructureId: Joi.string().uuid().required(),
    componentCode: Joi.string().required(),
    overrideType: Joi.string().required().valid('amount', 'percentage', 'formula', 'rate', 'disabled', 'custom', 'condition'),
    overrideAmount: Joi.number().allow(null),
    overridePercentage: Joi.number().min(0).max(1).allow(null),
    overrideFormula: Joi.string().allow(null),
    overrideFormulaVariables: Joi.object().allow(null),
    overrideRate: Joi.number().allow(null),
    isDisabled: Joi.boolean().default(false),
    customComponentDefinition: Joi.object().allow(null),
    overrideConditions: Joi.object().allow(null),
    overrideMinAmount: Joi.number().allow(null),
    overrideMaxAmount: Joi.number().allow(null),
    overrideMaxAnnual: Joi.number().allow(null),
    overrideReason: Joi.string().required(),
    businessJustification: Joi.string().allow('', null),
    requiresApproval: Joi.boolean().default(false),
    effectiveFrom: Joi.date().allow(null),
    effectiveTo: Joi.date().allow(null),
    notes: Joi.string().allow('', null)
  });

  // ==================== TEMPLATE MANAGEMENT ====================

  /**
   * Create a new pay structure template
   */
  async createTemplate(templateData, organizationId, userId) {
    const { error, value } = this.createTemplateSchema.validate(templateData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      // Check for duplicate template code + version
      const existing = await this.repository.findTemplates(organizationId, {
        templateCode: value.templateCode,
        status: 'active'
      });

      if (existing.length > 0) {
        const sameVersion = existing.find(t => 
          t.version_major === value.versionMajor &&
          t.version_minor === value.versionMinor &&
          t.version_patch === value.versionPatch
        );
        
        if (sameVersion) {
          throw new ConflictError('A template with this code and version already exists');
        }
      }

      const template = await this.repository.createTemplate(value, organizationId, userId);

    // Add changelog entry
    await this.repository.addChangelogEntry({
      templateId: template.id,
      fromVersion: null,
      toVersion: template.version,
      changeType: 'created',
      changeSummary: 'Initial template creation',
      changelogEntries: [{ type: 'created', description: 'Template created' }]
    }, organizationId, userId);      logger.info('Pay structure template created', {
        templateId: template.id,
        templateCode: template.templateCode,
        version: template.version,
        organizationId,
        userId
      });

      return template;
    } catch (error) {
      logger.error('Failed to create pay structure template:', error);
      throw error;
    }
  }

  /**
   * Get template by ID with components
   */
  async getTemplateById(templateId, organizationId) {
    const template = await this.repository.findTemplateById(templateId, organizationId);
    if (!template) {
      throw new NotFoundError('Pay structure template not found');
    }

    const components = await this.repository.getTemplateComponents(templateId, organizationId);
    
    return {
      ...template,
      components
    };
  }

  /**
   * Get all templates for organization
   */
  async getTemplates(organizationId, filters = {}) {
    return await this.repository.findTemplates(organizationId, filters);
  }

  /**
   * Update template (only draft templates can be updated)
   */
  async updateTemplate(templateId, updates, organizationId, userId) {
    const template = await this.repository.findTemplateById(templateId, organizationId);
    if (!template) {
      throw new NotFoundError('Pay structure template not found');
    }

    if (template.status !== 'draft') {
      throw new ValidationError('Only draft templates can be updated. Create a new version instead.');
    }

    return await this.repository.updateTemplate(templateId, updates, organizationId, userId);
  }

  /**
   * Publish template (make it active)
   */
  async publishTemplate(templateId, organizationId, userId) {
    const template = await this.repository.findTemplateById(templateId, organizationId);
    if (!template) {
      throw new NotFoundError('Pay structure template not found');
    }

    if (template.status !== 'draft') {
      throw new ValidationError('Only draft templates can be published');
    }

    // Ensure template has at least one component
    const components = await this.repository.getTemplateComponents(templateId, organizationId);
    if (components.length === 0) {
      throw new ValidationError('Template must have at least one component before publishing');
    }

    const publishedTemplate = await this.repository.publishTemplate(templateId, organizationId, userId);

    logger.info('Pay structure template published', {
      templateId,
      templateCode: publishedTemplate.templateCode,
      version: publishedTemplate.version,
      organizationId,
      userId
    });

    return publishedTemplate;
  }

  /**
   * Deprecate template
   */
  async deprecateTemplate(templateId, reason, organizationId, userId) {
    const template = await this.repository.findTemplateById(templateId, organizationId);
    if (!template) {
      throw new NotFoundError('Pay structure template not found');
    }

    if (template.status !== 'active') {
      throw new ValidationError('Only active templates can be deprecated');
    }

    return await this.repository.deprecateTemplate(templateId, reason, organizationId, userId);
  }

  /**
   * Delete pay structure template (draft versions only)
   */
  async deleteTemplate(templateId, organizationId, userId) {
    const template = await this.repository.findTemplateById(templateId, organizationId);
    if (!template) {
      throw new NotFoundError('Pay structure template not found');
    }

    if (template.status !== 'draft') {
      throw new ValidationError('Only draft templates can be deleted');
    }

    return await this.repository.deleteTemplate(templateId, organizationId, userId);
  }

  /**
   * Create new version of template
   */
  async createNewVersion(templateId, versionType, changeSummary, organizationId, userId) {
    if (!['major', 'minor', 'patch'].includes(versionType)) {
      throw new ValidationError('Version type must be major, minor, or patch');
    }

    const sourceTemplate = await this.getTemplateById(templateId, organizationId);
    if (!sourceTemplate) {
      throw new NotFoundError('Source template not found');
    }

    // Calculate new version numbers
    let newMajor = sourceTemplate.version_major;
    let newMinor = sourceTemplate.version_minor;
    let newPatch = sourceTemplate.version_patch;

    if (versionType === 'major') {
      newMajor += 1;
      newMinor = 0;
      newPatch = 0;
    } else if (versionType === 'minor') {
      newMinor += 1;
      newPatch = 0;
    } else {
      newPatch += 1;
    }

    // Create new template with incremented version
    const newTemplateData = {
      templateCode: sourceTemplate.templateCode,
      templateName: sourceTemplate.templateName,
      description: sourceTemplate.description,
      versionMajor: newMajor,
      versionMinor: newMinor,
      versionPatch: newPatch,
      status: 'draft',
      applicableToWorkerTypes: sourceTemplate.applicableToWorkerTypes,
      applicableToJurisdictions: sourceTemplate.applicableToJurisdictions,
      payFrequency: sourceTemplate.payFrequency,
      currency: sourceTemplate.currency,
      isOrganizationDefault: false, // New version is not default by default
      effectiveFrom: new Date(),
      tags: sourceTemplate.tags,
      notes: sourceTemplate.notes
    };

    const newTemplate = await this.repository.createTemplate(newTemplateData, organizationId, userId);

    // Copy all components from source template
    for (const component of sourceTemplate.components) {
      const componentData = {
        payComponentId: component.pay_component_id,
        componentCode: component.component_code,
        componentName: component.component_name,
        componentCategory: component.component_category,
        calculationType: component.calculation_type,
        defaultAmount: component.default_amount,
        defaultCurrency: component.default_currency,
        percentageOf: component.percentage_of,
        percentageRate: component.percentage_rate,
        formulaExpression: component.formula_expression,
        formulaVariables: component.formula_variables,
        formulaAst: component.formula_ast,
        rateMultiplier: component.rate_multiplier,
        appliesToHoursType: component.applies_to_hours_type,
        tierConfiguration: component.tier_configuration,
        tierBasis: component.tier_basis,
        sequenceOrder: component.sequence_order,
        dependsOnComponents: component.depends_on_components,
        isMandatory: component.is_mandatory,
        isTaxable: component.is_taxable,
        affectsGrossPay: component.affects_gross_pay,
        affectsNetPay: component.affects_net_pay,
        taxCategory: component.tax_category,
        accountingCode: component.accounting_code,
        minAmount: component.min_amount,
        maxAmount: component.max_amount,
        minPercentage: component.min_percentage,
        maxPercentage: component.max_percentage,
        maxAnnual: component.max_annual,
        maxPerPeriod: component.max_per_period,
        allowWorkerOverride: component.allow_worker_override,
        overrideAllowedFields: component.override_allowed_fields,
        requiresApproval: component.requires_approval,
        displayOnPayslip: component.display_on_payslip,
        displayName: component.display_name,
        displayOrder: component.display_order,
        displayCategory: component.display_category,
        conditions: component.conditions,
        isConditional: component.is_conditional,
        description: component.description,
        notes: component.notes
      };

      await this.repository.addComponent(componentData, newTemplate.id, organizationId, userId);
    }

    // Add changelog entry
    await this.repository.addChangelogEntry({
      templateId: newTemplate.id,
      fromVersion: sourceTemplate.version,
      toVersion: `${newMajor}.${newMinor}.${newPatch}`,
      changeType: `${versionType}_update`,
      changeSummary,
      breakingChanges: versionType === 'major',
      affectedWorkerCount: sourceTemplate.assignedWorkerCount || 0
    }, organizationId, userId);

    logger.info('New template version created', {
      sourceTemplateId: templateId,
      newTemplateId: newTemplate.id,
      fromVersion: sourceTemplate.version,
      toVersion: `${newMajor}.${newMinor}.${newPatch}`,
      versionType,
      organizationId,
      userId
    });

    return newTemplate;
  }

  // ==================== COMPONENT MANAGEMENT ====================

  /**
   * Add component to template
   */
  async addComponent(templateId, componentData, organizationId, userId) {
    const { error, value } = this.addComponentSchema.validate(componentData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    const template = await this.repository.findTemplateById(templateId, organizationId);
    if (!template) {
      throw new NotFoundError('Pay structure template not found');
    }

    if (template.status !== 'draft') {
      throw new ValidationError('Components can only be added to draft templates');
    }

    // Validate formula if provided
    if (value.calculationType === 'formula' && value.formulaExpression) {
      try {
        // Parse and validate formula
        const parsed = await this.formulaEngine.parseFormula(value.formulaExpression);
        value.formulaAst = parsed;
      } catch (err) {
        throw new ValidationError(`Invalid formula: ${err.message}`);
      }
    }

    const component = await this.repository.addComponent(value, templateId, organizationId, userId);
    return dtoMapper.mapPayStructureComponentDbToApi(component);
  }

  /**
   * Get template components
   */
  async getTemplateComponents(templateId, organizationId) {
    const components = await this.repository.getTemplateComponents(templateId, organizationId);
    const mapped = components.map(component => {
      const result = dtoMapper.mapPayStructureComponentDbToApi(component);
      // Debug log to check override fields
      if (result.allowWorkerOverride) {
        logger.debug('Component with overrides', {
          code: result.componentCode,
          allowWorkerOverride: result.allowWorkerOverride,
          overrideAllowedFields: result.overrideAllowedFields,
          overrideAllowedFieldsType: typeof result.overrideAllowedFields,
          overrideAllowedFieldsRaw: component.override_allowed_fields
        });
      }
      return result;
    });
    return mapped;
  }

  /**
   * Update component
   */
  async updateComponent(componentId, updates, organizationId, userId) {
    // Validate formula if being updated
    if (updates.calculationType === 'formula' && updates.formulaExpression) {
      try {
        const parsed = await this.formulaEngine.parseFormula(updates.formulaExpression);
        updates.formulaAst = parsed;
      } catch (err) {
        throw new ValidationError(`Invalid formula: ${err.message}`);
      }
    }

    return await this.repository.updateComponent(componentId, updates, organizationId, userId);
  }

  /**
   * Delete component
   */
  async deleteComponent(componentId, organizationId, userId) {
    return await this.repository.deleteComponent(componentId, organizationId, userId);
  }

  /**
   * Reorder components
   */
  async reorderComponents(templateId, componentOrders, organizationId, userId) {
    // componentOrders is an array of {componentId, sequenceOrder}
    for (const item of componentOrders) {
      await this.repository.updateComponent(
        item.componentId,
        { sequenceOrder: item.sequenceOrder },
        organizationId,
        userId
      );
    }

    return await this.repository.getTemplateComponents(templateId, organizationId);
  }

  // ==================== WORKER ASSIGNMENTS ====================

  /**
   * Assign template to worker
   */
  async assignTemplateToWorker(assignmentData, organizationId, userId) {
    const { error, value } = this.assignTemplateSchema.validate(assignmentData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    let template;
    
    // If no templateId provided, use organization default
    if (!value.templateId) {
      template = await this.repository.getOrganizationDefault(organizationId);
      if (!template) {
        throw new NotFoundError('No organization default template found');
      }
      value.templateId = template.template_id;
      value.assignmentType = 'default';
    } else {
      // Use findTemplateById which returns camelCase after DTO mapping
      template = await this.repository.findTemplateById(value.templateId, organizationId);
      if (!template) {
        throw new NotFoundError('Template not found');
      }
    }

    if (template.status !== 'active') {
      throw new ValidationError('Only active templates can be assigned to workers');
    }

    // Check for any existing assignments that would overlap with the new date range
    const overlappingStructures = await this.repository.getOverlappingWorkerStructures(
      value.employeeId,
      organizationId,
      value.effectiveFrom,
      value.effectiveTo
    );
    
    if (overlappingStructures && overlappingStructures.length > 0) {
      logger.info('Found overlapping structures to delete', {
        count: overlappingStructures.length,
        structureIds: overlappingStructures.map(s => s.id),
        newEffectiveFrom: value.effectiveFrom,
        newEffectiveTo: value.effectiveTo
      });
      
      // Soft delete all overlapping structures
      for (const structure of overlappingStructures) {
        await this.repository.deleteWorkerStructure(
          structure.id,
          organizationId,
          userId
        );
      }
    }

    try {
      // Create new assignment (reference-based: only FK to template + worker-specific data)
      const assignment = await this.repository.assignTemplateToWorker(
        {
          ...value,
          templateVersionId: template.id, // FK to specific template version
          baseSalary: value.baseSalary || null,
          assignmentSource: value.assignmentType === 'default' ? 'org_default' : 'manual',
          isCurrent: true
        },
        organizationId,
        userId
      );

      logger.info('Template assigned to worker', {
        assignmentId: assignment.id,
        employeeId: value.employeeId,
        templateId: template.id,
        templateVersion: template.version,
        organizationId,
        userId
      });

      return assignment;
    } catch (error) {
      // Handle constraint violation for overlapping assignments
      if (error.message && error.message.includes('unique_current_worker_structure')) {
        throw new ValidationError(
          'This worker already has a pay structure assigned for this date range. ' +
          'Please choose a different effective date or the assignment will replace the existing one.'
        );
      }
      throw error;
    }
  }

  /**
   * Get current worker pay structure
   */
  async getCurrentWorkerStructure(employeeId, organizationId, asOfDate = null) {
    const structure = await this.repository.getCurrentWorkerStructure(employeeId, organizationId, asOfDate);
    if (!structure) {
      return null;
    }

    // Get overrides for the worker structure
    const overrides = await this.repository.getWorkerOverrides(structure.id, organizationId);

    return {
      ...structure,
      overrides
    };
  }

  /**
   * Get worker pay structure history
   */
  async getWorkerStructureHistory(employeeId, organizationId) {
    return await this.repository.getWorkerStructureHistory(employeeId, organizationId);
  }

  /**
   * Upgrade worker to new template version
   */
  async upgradeWorkerToNewVersion(employeeId, newTemplateId, effectiveFrom, organizationId, userId) {
    return await this.assignTemplateToWorker(
      {
        employeeId,
        templateId: newTemplateId,
        assignmentType: 'custom',
        assignmentReason: 'Template version upgrade',
        effectiveFrom
      },
      organizationId,
      userId
    );
  }

  // ==================== WORKER COMPONENT OVERRIDES ====================

  /**
   * Add component override for worker
   */
  async addComponentOverride(overrideData, organizationId, userId) {
    const { error, value } = this.addOverrideSchema.validate(overrideData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Validate formula if provided
    if (value.overrideType === 'formula' && value.overrideFormula) {
      try {
        await this.formulaEngine.parseFormula(value.overrideFormula);
      } catch (err) {
        throw new ValidationError(`Invalid override formula: ${err.message}`);
      }
    }

    return await this.repository.addComponentOverride(value, organizationId, userId);
  }

  /**
   * Get worker component overrides
   */
  async getWorkerOverrides(workerStructureId, organizationId) {
    return await this.repository.getWorkerOverrides(workerStructureId, organizationId);
  }

  /**
   * Update component override
   */
  async updateComponentOverride(overrideId, updates, organizationId, userId) {
    return await this.repository.updateComponentOverride(overrideId, updates, organizationId, userId);
  }

  /**
   * Delete component override
   */
  async deleteComponentOverride(overrideId, organizationId, userId) {
    return await this.repository.deleteComponentOverride(overrideId, organizationId, userId);
  }

  // ==================== CALCULATION ENGINE ====================

  /**
   * Calculate worker pay based on pay structure
   * This is called by PayrollService during payroll processing
   * ARCHITECTURE: Reference-based - template resolved via JOIN, overrides applied at runtime
   */
  async calculateWorkerPay(employeeId, inputData, organizationId, asOfDate = null) {
    // Get worker's current pay structure (with template JOINed)
    const structure = await this.getCurrentWorkerStructure(employeeId, organizationId, asOfDate);
    if (!structure) {
      throw new NotFoundError('No pay structure found for worker');
    }

    logger.info('Calculate worker pay - structure retrieved', {
      employeeId,
      structureId: structure.id,
      templateId: structure.template?.id,
      componentsCount: structure.components?.length || 0
    });

    // ARCHITECTURE: Components come from template JOIN, not snapshot
    const components = structure.components || [];
    const overrides = structure.overrides || [];

    // Base salary/hourly rate comes from inputData (passed from compensation table)
    // This makes compensation the single source of truth
    // Legacy: Fall back to structure fields if not provided in input (for backward compatibility)
    const baseSalary = inputData.baseSalary || structure.baseSalary || structure.base_salary;
    const hourlyRate = inputData.hourlyRate || structure.hourlyRate || structure.hourly_rate;
    const payFrequency = inputData.payFrequency || structure.payFrequency || structure.pay_frequency;
    
    // Validate that we have required compensation data from either source
    if (!baseSalary && !hourlyRate) {
      throw new NotFoundError(
        'No compensation data provided. Please provide baseSalary or hourlyRate in inputData, ' +
        'or ensure worker pay structure has these values set.'
      );
    }
    
    // Build context with BOTH camelCase and snake_case for backward compatibility
    // ARCHITECTURE NOTE: Component configurations reference other fields (e.g., percentageOf: "base_salary")
    // While the DTO mapper converts top-level fields (base_salary -> baseSalary),
    // it does NOT transform field references INSIDE configuration objects.
    // Therefore, we provide both formats in context so components can reference either:
    //   - baseSalary (for future camelCase configs and programmatic access)
    //   - base_salary (for existing snake_case references in configs)
    const context = {
      // Compensation values in both formats for JSONB config compatibility
      baseSalary,
      base_salary: baseSalary, // Required for components with percentageOf: "base_salary"
      hourlyRate,
      hourly_rate: hourlyRate, // Required for components with rateOf: "hourly_rate"
      payFrequency,
      pay_frequency: payFrequency, // Required for frequency-based calculations
      currency: structure.currency,
      ...inputData // hours, overtime_hours, etc.
    };

    const calculations = [];
    const calculatedValues = {}; // Store calculated values for dependent components

    // ARCHITECTURE: Automatically include base compensation as the first earning
    // This ensures the base salary/hourly rate is always part of gross pay
    // Components in the template then add/subtract from this base
    if (baseSalary) {
      calculations.push({
        componentCode: 'BASE_SALARY',
        componentName: 'Base Salary',
        componentCategory: 'earning',
        amount: baseSalary,
        configSnapshot: { 
          source: 'compensation_table',
          note: 'Automatically included from payroll.compensation.amount'
        },
        calculationMetadata: {
          calculationType: 'auto_base_compensation',
          inputs: { baseSalary },
          overrideApplied: false
        }
      });
      calculatedValues['BASE_SALARY'] = baseSalary;
      calculatedValues['base_salary'] = baseSalary; // Both formats for component references
      context.grossEarnings = baseSalary;
    } else if (hourlyRate) {
      const hours = context.hours || context.regularHours || 0;
      const regularPay = hourlyRate * hours;
      calculations.push({
        componentCode: 'REGULAR_PAY',
        componentName: 'Regular Pay',
        componentCategory: 'earning',
        amount: regularPay,
        configSnapshot: { 
          source: 'compensation_table',
          hourlyRate,
          hours,
          note: 'Automatically calculated from payroll.compensation.amount * hours'
        },
        calculationMetadata: {
          calculationType: 'auto_base_compensation',
          inputs: { hourlyRate, hours },
          overrideApplied: false
        }
      });
      calculatedValues['REGULAR_PAY'] = regularPay;
      calculatedValues['regular_pay'] = regularPay;
      context.grossEarnings = regularPay;
    }

    // Sort components by sequence order
    const sortedComponents = components.sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    for (const component of sortedComponents) {
      try {
        // Check if component has an override (handle both camelCase and snake_case)
        const override = overrides.find(o => 
          (o.componentCode === component.code || o.component_code === component.code)
        );
        
        // Skip if disabled by override (handle both camelCase and snake_case)
        if (override && (override.isDisabled || override.is_disabled)) {
          continue;
        }

        // NEW: Check temporal pattern conditions if configured
        // Pattern conditions are stored in component.conditions JSONB field
        if (component.conditions && component.conditions.pattern) {
          const patternConfig = component.conditions.pattern;
          
          logger.debug('Evaluating temporal pattern condition for component', {
            componentCode: component.code,
            patternType: patternConfig.patternType,
            employeeId,
          });

          try {
            const patternResult = await this.temporalPatternService.evaluatePattern(
              employeeId,
              patternConfig,
              organizationId,
              asOfDate
            );

            if (!patternResult.qualified) {
              logger.info('Component skipped - pattern condition not met', {
                componentCode: component.code,
                employeeId,
                patternType: patternConfig.patternType,
                patternMetadata: patternResult.metadata,
              });
              continue; // Skip this component - pattern not qualified
            }

            logger.info('Component pattern condition met', {
              componentCode: component.code,
              employeeId,
              patternType: patternConfig.patternType,
            });
          } catch (patternError) {
            logger.error('Pattern evaluation failed for component', {
              componentCode: component.code,
              employeeId,
              error: patternError.message,
            });
            // Decision: Skip component if pattern evaluation fails (fail-safe)
            continue;
          }
        }

        // Calculate component value
        const value = await this.calculateComponent(component, override, context, calculatedValues);

        calculatedValues[component.code] = value;

        calculations.push({
          componentCode: component.code,
          componentName: component.name,
          componentCategory: component.category,
          amount: value,
          configSnapshot: override || component.configuration,
          calculationMetadata: {
            calculationType: component.calculationType,
            inputs: context,
            overrideApplied: !!override
          }
        });

        // Update context for dependent components
        if (component.category === 'earning' && component.configuration.affectsGrossPay) {
          context.grossEarnings = (context.grossEarnings || 0) + value;
        }
      } catch (err) {
        logger.error('Component calculation failed', {
          component: component.code,
          error: err.message,
          employeeId,
          organizationId
        });
        throw new Error(`Failed to calculate component ${component.code}: ${err.message}`);
      }
    }

    // Calculate totals
    const totalEarnings = calculations
      .filter(c => c.componentCategory === 'earning')
      .reduce((sum, c) => sum + c.amount, 0);

    const totalDeductions = calculations
      .filter(c => c.componentCategory === 'deduction')
      .reduce((sum, c) => sum + c.amount, 0);

    const totalTaxes = calculations
      .filter(c => c.componentCategory === 'tax')
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      structureId: structure.id || structure.structure_id,
      templateVersion: structure.templateVersion || structure.template_version,
      calculations,
      summary: {
        totalEarnings,
        totalDeductions,
        totalTaxes,
        netPay: totalEarnings - totalDeductions - totalTaxes
      }
    };
  }

  /**
   * Calculate individual component value
   */
  async calculateComponent(component, override, context, calculatedValues) {
    const config = component.configuration;
    const calculationType = component.calculationType;

    logger.debug('Calculating component', {
      componentCode: component.code,
      calculationType,
      hasConfiguration: !!component.configuration,
      hasOverride: !!override,
      overrideData: override,
      defaultAmount: component.configuration?.defaultAmount
    });

    let value = 0;

    switch (calculationType) {
      case 'fixed':
        // Use override amount if it exists, otherwise use configuration default amount
        value = override?.overrideAmount ?? parseFloat(config?.defaultAmount) ?? 0;
        logger.debug('Fixed calculation', {
          componentCode: component.code,
          overrideAmount: override?.overrideAmount,
          configDefaultAmount: config?.defaultAmount,
          parsedDefaultAmount: parseFloat(config?.defaultAmount),
          finalValue: value
        });
        break;

      case 'percentage':
        const baseValue = calculatedValues[config.percentageOf] || context[config.percentageOf] || 0;
        const rate = override?.overridePercentage ?? config.percentageRate ?? 0;
        value = baseValue * rate;
        break;

      case 'hourly_rate':
        const hours = context.hours || context.regularHours || 0;
        const hourlyRate = override?.overrideRate ?? context.hourlyRate ?? 0;
        const multiplier = config.rateMultiplier || 1.0;
        value = hours * hourlyRate * multiplier;
        break;

      case 'formula':
        const formula = override?.overrideFormula ?? config.formulaExpression;
        const variables = { ...context, ...calculatedValues };
        value = await this.formulaEngine.evaluateFormula(formula, variables);
        break;

      case 'tiered':
        value = this.calculateTiered(config.tierConfiguration, config.tierBasis, context, calculatedValues);
        break;

      default:
        throw new Error(`Unsupported calculation type: ${calculationType}`);
    }

    // Apply limits
    if (config.minAmount && value < config.minAmount) {
      value = config.minAmount;
    }
    if (config.maxAmount && value > config.maxAmount) {
      value = config.maxAmount;
    }

    return parseFloat(value.toFixed(2));
  }

  /**
   * Calculate tiered value
   */
  calculateTiered(tierConfig, tierBasis, context, calculatedValues) {
    if (!tierConfig || !Array.isArray(tierConfig)) {
      return 0;
    }

    const basisValue = calculatedValues[tierBasis] || context[tierBasis] || 0;
    let total = 0;

    const sortedTiers = tierConfig.sort((a, b) => a.threshold - b.threshold);

    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];
      const nextTier = sortedTiers[i + 1];
      
      if (basisValue > tier.threshold) {
        const applicableAmount = nextTier 
          ? Math.min(basisValue, nextTier.threshold) - tier.threshold
          : basisValue - tier.threshold;
        
        total += applicableAmount * tier.rate;
      }
    }

    return total;
  }

  // ==================== TEMPLATE VERSIONING ====================

  /**
   * Get all versions of a template by code
   */
  async getTemplateVersions(templateCode, organizationId) {
    logger.info('Fetching template versions', { templateCode, organizationId });

    const versions = await this.repository.getTemplateVersions(templateCode, organizationId);

    return versions.map(version => ({
      ...version,
      versionString: `${version.versionMajor}.${version.versionMinor}.${version.versionPatch}`
    }));
  }

  /**
   * Get changelog for a template (what changed from previous version)
   */
  async getTemplateChangelog(templateId, compareToId, organizationId) {
    logger.info('Fetching template changelog', { templateId, compareToId, organizationId });

    const template = await this.repository.findTemplateById(templateId, organizationId);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    // If no compareToId, compare with previous version
    if (!compareToId) {
      const versions = await this.repository.getTemplateVersions(template.templateCode, organizationId);
      const sortedVersions = versions.sort((a, b) => {
        if (a.versionMajor !== b.versionMajor) return b.versionMajor - a.versionMajor;
        if (a.versionMinor !== b.versionMinor) return b.versionMinor - a.versionMinor;
        return b.versionPatch - a.versionPatch;
      });

      const currentIndex = sortedVersions.findIndex(v => v.id === templateId);
      if (currentIndex < sortedVersions.length - 1) {
        compareToId = sortedVersions[currentIndex + 1].id;
      } else {
        // This is the first version, no comparison
        return {
          template,
          previousVersion: null,
          changes: {
            added: [],
            modified: [],
            removed: []
          }
        };
      }
    }

    const previousVersion = await this.repository.findTemplateById(compareToId, organizationId);
    if (!previousVersion) {
      throw new NotFoundError('Comparison template not found');
    }

    const currentComponents = await this.repository.getTemplateComponents(templateId, organizationId);
    const previousComponents = await this.repository.getTemplateComponents(compareToId, organizationId);

    const changes = this.compareComponents(currentComponents, previousComponents);

    return {
      template: {
        ...template,
        versionString: `${template.version_major}.${template.version_minor}.${template.version_patch}`
      },
      previousVersion: {
        ...previousVersion,
        versionString: `${previousVersion.version_major}.${previousVersion.version_minor}.${previousVersion.version_patch}`
      },
      changes
    };
  }

  /**
   * Create new version of a template
   */
  async createTemplateVersion(templateId, versionType, changes, organizationId, userId) {
    logger.info('Creating new template version', { templateId, versionType, organizationId });

    if (!['major', 'minor', 'patch'].includes(versionType)) {
      throw new ValidationError('versionType must be major, minor, or patch');
    }

    // First get the template to find its template_code
    const requestedTemplate = await this.repository.findTemplateById(templateId, organizationId);
    if (!requestedTemplate) {
      throw new NotFoundError('Source template not found');
    }

    // Always get the latest version by version numbers, not the requested one
    const allVersions = await this.repository.getTemplateVersions(requestedTemplate.templateCode, organizationId);
    if (!allVersions || allVersions.length === 0) {
      throw new NotFoundError('No versions found for this template');
    }

    // Sort to get the actual latest version (in case frontend sorting changes)
    const sortedVersions = allVersions.sort((a, b) => {
      if (a.versionMajor !== b.versionMajor) return b.versionMajor - a.versionMajor;
      if (a.versionMinor !== b.versionMinor) return b.versionMinor - a.versionMinor;
      return b.versionPatch - a.versionPatch;
    });

    const sourceTemplate = sortedVersions[0]; // Latest version

    // Calculate new version numbers
    let newMajor = sourceTemplate.versionMajor;
    let newMinor = sourceTemplate.versionMinor;
    let newPatch = sourceTemplate.versionPatch;

    if (versionType === 'major') {
      newMajor += 1;
      newMinor = 0;
      newPatch = 0;
    } else if (versionType === 'minor') {
      newMinor += 1;
      newPatch = 0;
    } else {
      newPatch += 1;
    }

    // Check if this version already exists
    const existingVersions = await this.repository.getTemplateVersions(sourceTemplate.templateCode, organizationId);
    const versionExists = existingVersions.some(v => 
      v.versionMajor === newMajor && 
      v.versionMinor === newMinor && 
      v.versionPatch === newPatch
    );

    if (versionExists) {
      const existingVersion = existingVersions.find(v => 
        v.versionMajor === newMajor && 
        v.versionMinor === newMinor && 
        v.versionPatch === newPatch
      );
      throw new ValidationError(`Version ${newMajor}.${newMinor}.${newPatch} already exists with status "${existingVersion.status}". Please delete the existing version first or choose a different version type.`);
    }

    // Create new template version
    const newTemplateData = {
      ...sourceTemplate,
      versionMajor: newMajor,
      versionMinor: newMinor,
      versionPatch: newPatch,
      status: 'draft', // New versions start as draft
      isOrganizationDefault: false, // Must be explicitly set
      effectiveFrom: new Date(),
      effectiveTo: null,
      publishedAt: null,
      publishedBy: null,
      notes: changes || `Version ${newMajor}.${newMinor}.${newPatch} created from ${sourceTemplate.versionMajor}.${sourceTemplate.versionMinor}.${sourceTemplate.versionPatch}`
    };

    delete newTemplateData.id;
    delete newTemplateData.created_at;
    delete newTemplateData.updated_at;

    const newTemplate = await this.repository.createTemplate(newTemplateData, organizationId, userId);

    // Copy components from source template
    const sourceComponents = await this.repository.getTemplateComponents(templateId, organizationId);
    
    for (const component of sourceComponents) {
      // Clean up the component data - keep it in DB format
      const componentCopy = { ...component };
      
      // Remove fields that should not be copied
      delete componentCopy.id;
      delete componentCopy.template_id;
      delete componentCopy.created_at;
      delete componentCopy.updated_at;
      delete componentCopy.created_by;
      delete componentCopy.updated_by;
      delete componentCopy.deleted_at;
      delete componentCopy.pay_component_name; // This is from the JOIN

      // Use the raw DB format directly to avoid double conversion
      // The addComponent method expects camelCase API format, so we need to map field names
      const apiFormat = {
        payComponentId: componentCopy.pay_component_id,
        componentCode: componentCopy.component_code,
        componentName: componentCopy.component_name,
        componentCategory: componentCopy.component_category,
        calculationType: componentCopy.calculation_type,
        defaultAmount: componentCopy.default_amount,
        defaultCurrency: componentCopy.default_currency,
        percentageOf: componentCopy.percentage_of,
        percentageRate: componentCopy.percentage_rate,
        formulaExpression: componentCopy.formula_expression,
        // Pass arrays directly without double-stringifying
        formulaVariables: componentCopy.formula_variables,
        formulaAst: componentCopy.formula_ast,
        rateMultiplier: componentCopy.rate_multiplier,
        appliesToHoursType: componentCopy.applies_to_hours_type,
        tierConfiguration: componentCopy.tier_configuration,
        tierBasis: componentCopy.tier_basis,
        sequenceOrder: componentCopy.sequence_order,
        // Arrays should be passed as-is from DB
        dependsOnComponents: componentCopy.depends_on_components,
        isMandatory: componentCopy.is_mandatory,
        isTaxable: componentCopy.is_taxable,
        affectsGrossPay: componentCopy.affects_gross_pay,
        affectsNetPay: componentCopy.affects_net_pay,
        taxCategory: componentCopy.tax_category,
        accountingCode: componentCopy.accounting_code,
        minAmount: componentCopy.min_amount,
        maxAmount: componentCopy.max_amount,
        minPercentage: componentCopy.min_percentage,
        maxPercentage: componentCopy.max_percentage,
        maxAnnual: componentCopy.max_annual,
        maxPerPeriod: componentCopy.max_per_period,
        allowWorkerOverride: componentCopy.allow_worker_override,
        // Pass array as-is
        overrideAllowedFields: componentCopy.override_allowed_fields,
        requiresApproval: componentCopy.requires_approval,
        displayOnPayslip: componentCopy.display_on_payslip,
        displayName: componentCopy.display_name,
        displayOrder: componentCopy.display_order,
        displayCategory: componentCopy.display_category,
        conditions: componentCopy.conditions,
        isConditional: componentCopy.is_conditional,
        description: componentCopy.description,
        notes: componentCopy.notes
      };

      await this.repository.addComponent(apiFormat, newTemplate.id, organizationId, userId);
    }

    return await this.repository.findTemplateById(newTemplate.id, organizationId);
  }

  /**
   * Compare two template versions
   */
  async compareTemplateVersions(fromId, toId, organizationId) {
    logger.info('Comparing template versions', { fromId, toId, organizationId });

    const fromTemplate = await this.repository.findTemplateById(fromId, organizationId);
    const toTemplate = await this.repository.findTemplateById(toId, organizationId);

    if (!fromTemplate || !toTemplate) {
      throw new NotFoundError('One or both templates not found');
    }

    const fromComponents = await this.repository.getTemplateComponents(fromId, organizationId);
    const toComponents = await this.repository.getTemplateComponents(toId, organizationId);

    const changes = this.compareComponents(toComponents, fromComponents);

    // Map templates to API format
    const fromMapped = dtoMapper.mapPayStructureTemplateDbToApi(fromTemplate);
    const toMapped = dtoMapper.mapPayStructureTemplateDbToApi(toTemplate);

    // Map components to API format
    const fromComponentsMapped = fromComponents.map(c => dtoMapper.mapPayStructureComponentDbToApi(c));
    const toComponentsMapped = toComponents.map(c => dtoMapper.mapPayStructureComponentDbToApi(c));

    // Transform changes structure for frontend
    const changesArray = [
      ...changes.added.map(c => ({
        ...dtoMapper.mapPayStructureComponentDbToApi(c),
        changeType: 'added'
      })),
      ...changes.modified.map(m => ({
        ...dtoMapper.mapPayStructureComponentDbToApi(m.component),
        changeType: 'modified',
        differences: m.differences.map(d => ({
          field: dtoMapper.convertFieldName(d.field, dtoMapper.PAY_STRUCTURE_COMPONENT_DB_TO_API),
          oldValue: d.oldValue,
          newValue: d.newValue
        }))
      })),
      ...changes.removed.map(c => ({
        ...dtoMapper.mapPayStructureComponentDbToApi(c),
        changeType: 'removed'
      }))
    ];

    return {
      fromVersion: {
        ...fromMapped,
        versionString: `${fromMapped.versionMajor}.${fromMapped.versionMinor}.${fromMapped.versionPatch}`,
        components: fromComponentsMapped
      },
      toVersion: {
        ...toMapped,
        versionString: `${toMapped.versionMajor}.${toMapped.versionMinor}.${toMapped.versionPatch}`,
        components: toComponentsMapped
      },
      changes: changesArray,
      summary: {
        addedCount: changes.added.length,
        modifiedCount: changes.modified.length,
        removedCount: changes.removed.length
      }
    };
  }

  /**
   * Upgrade multiple workers to new template version
   */
  async upgradeWorkersToVersion(templateId, workerIds, effectiveFrom, upgradeReason, organizationId, userId) {
    logger.info('Upgrading workers to new version', { 
      templateId, 
      workerCount: workerIds.length, 
      organizationId 
    });

    const template = await this.repository.findTemplateById(templateId, organizationId);
    if (!template) {
      throw new NotFoundError('Template not found');
    }

    if (template.status !== 'active') {
      throw new ValidationError('Can only upgrade to active templates');
    }

    const results = {
      total: workerIds.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const workerId of workerIds) {
      try {
        // Get current worker assignment
        const currentAssignment = await this.repository.getCurrentWorkerPayStructure(workerId, organizationId);

        if (currentAssignment) {
          // End current assignment
          await this.repository.updateWorkerPayStructureEndDate(
            currentAssignment.id,
            effectiveFrom || new Date(),
            organizationId,
            userId
          );
        }

        // Create new assignment
        await this.repository.assignTemplateToWorker(
          {
            employeeId: workerId,
            templateId,
            assignmentType: 'upgrade',
            assignmentReason: upgradeReason || `Upgraded to version ${template.version_major}.${template.version_minor}.${template.version_patch}`,
            effectiveFrom: effectiveFrom || new Date(),
            effectiveTo: null,
            baseSalary: currentAssignment?.base_salary,
            hourlyRate: currentAssignment?.hourly_rate,
            payFrequency: currentAssignment?.pay_frequency || template.pay_frequency,
            currency: currentAssignment?.currency || template.currency
          },
          organizationId,
          userId
        );

        results.successful++;
      } catch (error) {
        logger.error('Error upgrading worker', { workerId, error: error.message });
        results.failed++;
        results.errors.push({
          workerId,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Compare components between versions
   */
  compareComponents(currentComponents, previousComponents) {
    const changes = {
      added: [],
      modified: [],
      removed: []
    };

    const prevMap = new Map(previousComponents.map(c => [c.component_code, c]));
    const currMap = new Map(currentComponents.map(c => [c.component_code, c]));

    // Find added and modified
    for (const current of currentComponents) {
      const previous = prevMap.get(current.component_code);
      
      if (!previous) {
        changes.added.push(current);
      } else {
        const differences = this.findComponentDifferences(current, previous);
        if (differences.length > 0) {
          changes.modified.push({
            component: current,
            differences
          });
        }
      }
    }

    // Find removed
    for (const previous of previousComponents) {
      if (!currMap.has(previous.component_code)) {
        changes.removed.push(previous);
      }
    }

    return changes;
  }

  /**
   * Find differences between two components
   */
  findComponentDifferences(current, previous) {
    const differences = [];
    const fieldsToCompare = [
      'component_name', 'component_category', 'calculation_type',
      'default_amount', 'percentage_rate', 'formula_expression',
      'sequence_order', 'is_mandatory', 'is_taxable'
    ];

    for (const field of fieldsToCompare) {
      if (current[field] !== previous[field]) {
        differences.push({
          field,
          oldValue: previous[field],
          newValue: current[field]
        });
      }
    }

    return differences;
  }
}

export default PayStructureService;
