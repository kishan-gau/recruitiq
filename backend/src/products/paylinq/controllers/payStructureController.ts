/**
 * Pay Structure Controller
 * Handles HTTP requests for pay structure template management, worker assignments, and component overrides
 * 
 * @module products/paylinq/controllers/payStructureController
 */

import PayStructureService from '../services/payStructureService.ts';
import logger from '../../../utils/logger.ts';
import { mapWorkerOverrideDbArrayToApi } from '../utils/dtoMapper.ts';

const payStructureService = new PayStructureService();

// ==================== TEMPLATE MANAGEMENT ====================

/**
 * Create new pay structure template
 * POST /api/paylinq/pay-structures/templates
 */
export async function createTemplate(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    console.log('=== CREATE TEMPLATE CONTROLLER ===');
    console.log('User:', { id: userId, email: req.user.email, organizationId });
    console.log('Template data:', req.body);

    const template = await payStructureService.createTemplate(req.body, organizationId, userId);

    res.status(201).json({
      success: true,
      template: template,  // Use 'template' key for consistency with API standards
      message: 'Pay structure template created successfully'
    });
  } catch (error) {
    logger.error('Error creating pay structure template', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    const statusCode = error.name === 'ValidationError' ? 400 
      : error.name === 'ConflictError' ? 409 
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Get all templates
 * GET /api/paylinq/pay-structures/templates
 */
export async function getTemplates(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { status, templateCode, isOrganizationDefault, search, sortField, sortOrder } = req.query;

    const filters = {
      status,
      templateCode,
      // Only include isOrganizationDefault filter if explicitly provided
      ...(isOrganizationDefault !== undefined && { isOrganizationDefault: isOrganizationDefault === 'true' }),
      search,
      sortField,
      sortOrder
    };

    logger.info('getTemplates controller called', { 
      organizationId, 
      queryParams: req.query,
      filters 
    });

    const templates = await payStructureService.getTemplates(organizationId, filters);

    logger.info('getTemplates controller response', {
      count: templates.length,
      templates: templates.map(t => ({ id: t.id, status: t.status, name: t.templateName }))
    });

    res.status(200).json({
      success: true,
      templates: templates,
      count: templates.length
    });
  } catch (error) {
    logger.error('Error fetching pay structure templates', {
      error: error.message,
      organizationId: req.user?.organization_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch pay structure templates'
    });
  }
}

/**
 * Get template by ID with components
 * GET /api/paylinq/pay-structures/templates/:id
 */
export async function getTemplateById(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { id } = req.params;

    const template = await payStructureService.getTemplateById(id, organizationId);

    res.status(200).json({
      success: true,
      template: template
    });
  } catch (error) {
    logger.error('Error fetching pay structure template', {
      error: error.message,
      templateId: req.params.id,
      organizationId: req.user?.organization_id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Update template
 * PUT /api/paylinq/pay-structures/templates/:id
 */
export async function updateTemplate(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;

    const template = await payStructureService.updateTemplate(id, req.body, organizationId, userId);

    res.status(200).json({
      success: true,
      template: template,
      message: 'Pay structure template updated successfully'
    });
  } catch (error) {
    logger.error('Error updating pay structure template', {
      error: error.message,
      templateId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 
      : error.name === 'ValidationError' ? 400 
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Publish template
 * POST /api/paylinq/pay-structures/templates/:id/publish
 */
export async function publishTemplate(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;

    const template = await payStructureService.publishTemplate(id, organizationId, userId);

    res.status(200).json({
      success: true,
      template: template,
      message: 'Pay structure template published successfully'
    });
  } catch (error) {
    logger.error('Error publishing pay structure template', {
      error: error.message,
      templateId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 
      : error.name === 'ValidationError' ? 400 
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Deprecate template
 * POST /api/paylinq/pay-structures/templates/:id/deprecate
 */
export async function deprecateTemplate(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const template = await payStructureService.deprecateTemplate(id, reason, organizationId, userId);

    res.status(200).json({
      success: true,
      template: template,
      message: 'Pay structure template deprecated successfully'
    });
  } catch (error) {
    logger.error('Error deprecating pay structure template', {
      error: error.message,
      templateId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 
      : error.name === 'ValidationError' ? 400 
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Delete pay structure template (draft versions only)
 * DELETE /api/paylinq/pay-structures/templates/:id
 */
export async function deleteTemplate(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;

    await payStructureService.deleteTemplate(id, organizationId, userId);

    res.status(200).json({
      success: true,
      message: 'Pay structure template deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting pay structure template', {
      error: error.message,
      templateId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 
      : error.name === 'ValidationError' ? 400 
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Create new version of template
 * POST /api/paylinq/pay-structures/templates/:id/versions
 */
export async function createNewVersion(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;
    const { versionType, changeSummary } = req.body;

    const newTemplate = await payStructureService.createNewVersion(
      id, 
      versionType, 
      changeSummary, 
      organizationId, 
      userId
    );

    res.status(201).json({
      success: true,
      template: newTemplate,
      message: `New ${versionType} version created successfully`
    });
  } catch (error) {
    logger.error('Error creating new template version', {
      error: error.message,
      templateId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 
      : error.name === 'ValidationError' ? 400 
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

// ==================== COMPONENT MANAGEMENT ====================

/**
 * Add component to template
 * POST /api/paylinq/pay-structures/templates/:id/components
 */
export async function addComponent(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;

    const component = await payStructureService.addComponent(id, req.body, organizationId, userId);

    res.status(201).json({
      success: true,
      component: component,
      message: 'Component added successfully'
    });
  } catch (error) {
    logger.error('Error adding component to template', {
      error: error.message,
      templateId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 
      : error.name === 'ValidationError' ? 400 
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Get template components
 * GET /api/paylinq/pay-structures/templates/:id/components
 */
export async function getTemplateComponents(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { id } = req.params;

    const components = await payStructureService.getTemplateComponents(id, organizationId);

    res.status(200).json({
      success: true,
      components: components,
      count: components.length
    });
  } catch (error) {
    logger.error('Error fetching template components', {
      error: error.message,
      templateId: req.params.id,
      organizationId: req.user?.organization_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch template components'
    });
  }
}

/**
 * Update component
 * PUT /api/paylinq/pay-structures/components/:componentId
 */
export async function updateComponent(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { componentId } = req.params;

    const component = await payStructureService.updateComponent(componentId, req.body, organizationId, userId);

    res.status(200).json({
      success: true,
      component: component,
      message: 'Component updated successfully'
    });
  } catch (error) {
    logger.error('Error updating component', {
      error: error.message,
      componentId: req.params.componentId,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    const statusCode = error.name === 'ValidationError' ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Delete component
 * DELETE /api/paylinq/pay-structures/components/:componentId
 */
export async function deleteComponent(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { componentId } = req.params;

    await payStructureService.deleteComponent(componentId, organizationId, userId);

    res.status(200).json({
      success: true,
      message: 'Component deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting component', {
      error: error.message,
      componentId: req.params.componentId,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete component'
    });
  }
}

/**
 * Reorder components
 * POST /api/paylinq/pay-structures/templates/:id/components/reorder
 */
export async function reorderComponents(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;
    const { componentOrders } = req.body; // Array of {componentId, sequenceOrder}

    const components = await payStructureService.reorderComponents(
      id, 
      componentOrders, 
      organizationId, 
      userId
    );

    res.status(200).json({
      success: true,
      components: components,
      message: 'Components reordered successfully'
    });
  } catch (error) {
    logger.error('Error reordering components', {
      error: error.message,
      templateId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to reorder components'
    });
  }
}

// ==================== WORKER ASSIGNMENTS ====================

/**
 * Assign template to worker
 * POST /api/paylinq/workers/:employeeId/pay-structure
 */
export async function assignTemplateToWorker(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { employeeId } = req.params;
    const { templateId, effectiveFrom, effectiveTo, baseSalary, hourlyRate, payFrequency } = req.body;

    const assignment = await payStructureService.assignTemplateToWorker(
      employeeId,
      templateId,
      { effectiveFrom, effectiveTo, baseSalary, hourlyRate, payFrequency },
      organizationId,
      userId
    );

    res.status(201).json({
      success: true,
      assignment: assignment,
      message: 'Pay structure assigned to worker successfully'
    });
  } catch (error) {
    logger.error('Error assigning pay structure to worker', {
      error: error.message,
      code: error.code,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    // Handle foreign key constraint violation for employee_id
    if (error.code === '23503' && error.message.includes('worker_pay_structure_employee_id_fkey')) {
      return res.status(404).json({
        success: false,
        error: 'EmployeeNotFound',
        message: `Employee with ID ${req.params.employeeId} does not exist in the organization`
      });
    }

    const statusCode = error.name === 'NotFoundError' ? 404 
      : error.name === 'ValidationError' ? 400 
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Get current worker pay structure
 * GET /api/paylinq/workers/:employeeId/pay-structure
 */
export async function getCurrentWorkerStructure(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { employeeId } = req.params;
    const { asOfDate } = req.query;

    const structure = await payStructureService.getCurrentWorkerStructure(
      employeeId, 
      organizationId, 
      asOfDate
    );

    // Return 200 with null if no structure exists (not an error - worker just doesn't have one assigned yet)
    res.status(200).json({
      success: true,
      workerPayStructure: structure || null
    });
  } catch (error) {
    logger.error('Error fetching worker pay structure', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch worker pay structure'
    });
  }
}

/**
 * Get worker pay structure history
 * GET /api/paylinq/workers/:employeeId/pay-structure/history
 */
export async function getWorkerStructureHistory(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { employeeId } = req.params;

    const history = await payStructureService.getWorkerStructureHistory(employeeId, organizationId);

    res.status(200).json({
      success: true,
      history: history,
      count: history.length
    });
  } catch (error) {
    logger.error('Error fetching worker pay structure history', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch worker pay structure history'
    });
  }
}

/**
 * Upgrade worker to new template version
 * POST /api/paylinq/workers/:employeeId/pay-structure/upgrade
 */
export async function upgradeWorkerToNewVersion(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { employeeId } = req.params;
    const { newTemplateId, effectiveFrom } = req.body;

    const assignment = await payStructureService.upgradeWorkerToNewVersion(
      employeeId,
      newTemplateId,
      effectiveFrom,
      organizationId,
      userId
    );

    res.status(201).json({
      success: true,
      assignment: assignment,
      message: 'Worker upgraded to new template version successfully'
    });
  } catch (error) {
    logger.error('Error upgrading worker template version', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 
      : error.name === 'ValidationError' ? 400 
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

// ==================== COMPONENT OVERRIDES ====================

/**
 * Add component override for worker
 * POST /api/paylinq/workers/:employeeId/pay-structure/overrides
 */
export async function addComponentOverride(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    const override = await payStructureService.addComponentOverride(req.body, organizationId, userId);

    res.status(201).json({
      success: true,
      override: override,
      message: 'Component override added successfully'
    });
  } catch (error) {
    logger.error('Error adding component override', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    // Handle duplicate override error
    if (error.code === '23505' && error.constraint === 'unique_worker_component_override') {
      return res.status(409).json({
        success: false,
        error: 'DuplicateOverride',
        message: 'An active override already exists for this component. Please edit or delete the existing override instead.'
      });
    }

    const statusCode = error.name === 'ValidationError' ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Get worker component overrides
 * GET /api/paylinq/pay-structures/worker-structures/:workerStructureId/overrides
 */
export async function getWorkerOverrides(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { workerStructureId } = req.params;

    const overrides = await payStructureService.getWorkerOverrides(workerStructureId, organizationId);

    // Transform snake_case to camelCase for frontend using DTO mapper
    const transformedOverrides = mapWorkerOverrideDbArrayToApi(overrides);

    res.status(200).json({
      success: true,
      overrides: transformedOverrides,
      count: transformedOverrides.length
    });
  } catch (error) {
    logger.error('Error fetching worker overrides', {
      error: error.message,
      workerStructureId: req.params.workerStructureId,
      organizationId: req.user?.organization_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch worker overrides'
    });
  }
}

/**
 * Update component override
 * PUT /api/paylinq/pay-structures/overrides/:overrideId
 */
export async function updateComponentOverride(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { overrideId } = req.params;

    const override = await payStructureService.updateComponentOverride(
      overrideId, 
      req.body, 
      organizationId, 
      userId
    );

    res.status(200).json({
      success: true,
      override: override,
      message: 'Component override updated successfully'
    });
  } catch (error) {
    logger.error('Error updating component override', {
      error: error.message,
      overrideId: req.params.overrideId,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update component override'
    });
  }
}

/**
 * Delete component override
 * DELETE /api/paylinq/pay-structures/overrides/:overrideId
 */
export async function deleteComponentOverride(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { overrideId } = req.params;

    await payStructureService.deleteComponentOverride(overrideId, organizationId, userId);

    res.status(200).json({
      success: true,
      message: 'Component override deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting component override', {
      error: error.message,
      overrideId: req.params.overrideId,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete component override'
    });
  }
}

// ==================== TEMPLATE VERSIONING ====================

/**
 * Get version history for a template code
 * GET /api/paylinq/pay-structures/templates/versions/:templateCode
 */
export async function getTemplateVersions(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { templateCode } = req.params;

    const versions = await payStructureService.getTemplateVersions(templateCode, organizationId);

    res.status(200).json({
      success: true,
      versions: versions,
      count: versions.length
    });
  } catch (error) {
    logger.error('Error fetching template versions', {
      error: error.message,
      templateCode: req.params.templateCode,
      organizationId: req.user?.organization_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch template versions'
    });
  }
}

/**
 * Get changelog between two template versions
 * GET /api/paylinq/pay-structures/templates/:id/changelog
 */
export async function getTemplateChangelog(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { id } = req.params;
    const { compareToId } = req.query;

    const changelog = await payStructureService.getTemplateChangelog(
      id,
      compareToId,
      organizationId
    );

    res.status(200).json({
      success: true,
      changelog: changelog
    });
  } catch (error) {
    logger.error('Error fetching template changelog', {
      error: error.message,
      templateId: req.params.id,
      compareToId: req.query.compareToId,
      organizationId: req.user?.organization_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch template changelog'
    });
  }
}

/**
 * Create new version of template
 * POST /api/paylinq/pay-structures/templates/:id/versions
 */
export async function createTemplateVersion(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;
    const { versionType, changes } = req.body; // versionType: 'major' | 'minor' | 'patch'

    const newVersion = await payStructureService.createTemplateVersion(
      id,
      versionType,
      changes,
      organizationId,
      userId
    );

    res.status(201).json({
      success: true,
      template: newVersion,
      message: 'New template version created successfully'
    });
  } catch (error) {
    logger.error('Error creating template version', {
      error: error.message,
      templateId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    const statusCode = error.name === 'ValidationError' ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Compare two template versions
 * GET /api/paylinq/pay-structures/templates/compare
 */
export async function compareTemplateVersions(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { fromId, toId } = req.query;

    if (!fromId || !toId) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Both fromId and toId are required'
      });
    }

    const comparison = await payStructureService.compareTemplateVersions(
      fromId,
      toId,
      organizationId
    );

    res.status(200).json({
      success: true,
      ...comparison
    });
  } catch (error) {
    logger.error('Error comparing template versions', {
      error: error.message,
      fromId: req.query.fromId,
      toId: req.query.toId,
      organizationId: req.user?.organization_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to compare template versions'
    });
  }
}

/**
 * Upgrade workers to new template version
 * POST /api/paylinq/pay-structures/templates/:id/upgrade-workers
 */
export async function upgradeWorkersToVersion(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;
    const { workerIds, effectiveFrom, upgradeReason } = req.body;

    if (!workerIds || !Array.isArray(workerIds) || workerIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'workerIds array is required and must not be empty'
      });
    }

    const results = await payStructureService.upgradeWorkersToVersion(
      id,
      workerIds,
      effectiveFrom,
      upgradeReason,
      organizationId,
      userId
    );

    res.status(200).json({
      success: true,
      results: results,
      message: `Successfully upgraded ${results.successful} of ${results.total} workers`
    });
  } catch (error) {
    logger.error('Error upgrading workers to new version', {
      error: error.message,
      templateId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to upgrade workers'
    });
  }
}

// ==================== TEMPLATE COMPOSITION ENDPOINTS ====================

/**
 * Add template inclusion to parent template
 * POST /api/paylinq/pay-structures/templates/:id/inclusions
 */
export async function addTemplateInclusion(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id: parentTemplateId } = req.params;

    const inclusion = await payStructureService.addTemplateInclusion(
      parentTemplateId,
      req.body,
      organizationId,
      userId
    );

    res.status(201).json({
      success: true,
      inclusion: inclusion,
      message: 'Template inclusion added successfully'
    });
  } catch (error) {
    logger.error('Error adding template inclusion', {
      error: error.message,
      parentTemplateId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    const statusCode = error.name === 'ValidationError' ? 400 
      : error.name === 'NotFoundError' ? 404
      : error.name === 'ConflictError' ? 409 
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Get template inclusions for a template
 * GET /api/paylinq/pay-structures/templates/:id/inclusions
 */
export async function getTemplateInclusions(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { id: parentTemplateId } = req.params;

    const inclusions = await payStructureService.getTemplateInclusions(
      parentTemplateId,
      organizationId
    );

    res.status(200).json({
      success: true,
      inclusions: inclusions,
      count: inclusions.length
    });
  } catch (error) {
    logger.error('Error fetching template inclusions', {
      error: error.message,
      parentTemplateId: req.params.id,
      organizationId: req.user?.organization_id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Update template inclusion
 * PATCH /api/paylinq/pay-structures/templates/:id/inclusions/:inclusionId
 */
export async function updateTemplateInclusion(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id: parentTemplateId, inclusionId } = req.params;

    const inclusion = await payStructureService.updateTemplateInclusion(
      inclusionId,
      req.body,
      organizationId,
      userId
    );

    res.status(200).json({
      success: true,
      inclusion: inclusion,
      message: 'Template inclusion updated successfully'
    });
  } catch (error) {
    logger.error('Error updating template inclusion', {
      error: error.message,
      inclusionId: req.params.inclusionId,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    const statusCode = error.name === 'ValidationError' ? 400 
      : error.name === 'NotFoundError' ? 404
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Remove template inclusion
 * DELETE /api/paylinq/pay-structures/templates/:id/inclusions/:inclusionId
 */
export async function removeTemplateInclusion(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id: parentTemplateId, inclusionId } = req.params;

    await payStructureService.removeTemplateInclusion(
      inclusionId,
      organizationId,
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Template inclusion removed successfully'
    });
  } catch (error) {
    logger.error('Error removing template inclusion', {
      error: error.message,
      inclusionId: req.params.inclusionId,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Resolve composite template (get fully merged template with all inclusions)
 * GET /api/paylinq/pay-structures/templates/:id/resolved
 */
export async function resolveCompositeTemplate(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { id: templateId } = req.params;

    const resolvedTemplate = await payStructureService.resolveCompositeTemplate(
      templateId,
      organizationId
    );

    res.status(200).json({
      success: true,
      resolved: resolvedTemplate
    });
  } catch (error) {
    logger.error('Error resolving composite template', {
      error: error.message,
      templateId: req.params.id,
      organizationId: req.user?.organization_id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

// ==================== TEMPLATE COMPOSITION ====================

/**
 * Create pay structure from template
 * POST /api/paylinq/pay-structures/templates/:templateId/create-from
 */
export async function createFromTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    const structure = await payStructureService.createFromTemplate(
      templateId,
      req.body,
      organizationId,
      userId
    );

    res.status(201).json({
      success: true,
      structure,
      message: 'Pay structure created from template successfully'
    });
  } catch (error) {
    logger.error('Error creating from template', {
      error: error.message,
      templateId: req.params.templateId,
      organizationId: req.user?.organization_id
    });

    const statusCode = error.name === 'ValidationError' ? 400
      : error.name === 'NotFoundError' ? 404
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Add template inclusion (nested template)
 * POST /api/products/paylinq/pay-structures/templates/:id/inclusions
 * @deprecated This is a duplicate - use the first addTemplateInclusion function instead
 */
export async function addIncludedTemplateController(req, res) {
  try {
    const { id } = req.params;
    const inclusionData = req.body;
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    const inclusion = await payStructureService.addIncludedTemplate(
      id,
      inclusionData,
      organizationId,
      userId
    );

    res.status(201).json({
      success: true,
      inclusion,
      message: 'Template inclusion added successfully'
    });
  } catch (error) {
    logger.error('Error adding template inclusion', {
      error: error.message,
      parentTemplateId: req.params.id,
      organizationId: req.user?.organization_id
    });

    const statusCode = error.name === 'ValidationError' ? 400
      : error.name === 'NotFoundError' ? 404
      : error.name === 'ConflictError' ? 409
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Get template inclusions
 * GET /api/products/paylinq/pay-structures/templates/:id/inclusions
 * @deprecated This is a duplicate - use the first getTemplateInclusions function instead
 */
export async function getIncludedTemplatesController(req, res) {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const inclusions = await payStructureService.getIncludedTemplates(
      id,
      organizationId
    );

    res.status(200).json({
      success: true,
      inclusions
    });
  } catch (error) {
    logger.error('Error getting template inclusions', {
      error: error.message,
      templateId: req.params.id,
      organizationId: req.user?.organization_id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Update template inclusion
 * PATCH /api/products/paylinq/pay-structures/templates/:id/inclusions/:inclusionId
 * @deprecated This is a duplicate - use the first updateTemplateInclusion function instead
 */
export async function updateIncludedTemplateController(req, res) {
  try {
    const { id, inclusionId } = req.params;
    const updates = req.body;
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    const updatedInclusion = await payStructureService.updateIncludedTemplate(
      inclusionId,
      updates,
      organizationId,
      userId
    );

    res.status(200).json({
      success: true,
      inclusion: updatedInclusion,
      message: 'Template inclusion updated successfully'
    });
  } catch (error) {
    logger.error('Error updating template inclusion', {
      error: error.message,
      inclusionId: req.params.inclusionId,
      organizationId: req.user?.organization_id
    });

    const statusCode = error.name === 'ValidationError' ? 400
      : error.name === 'NotFoundError' ? 404
      : error.name === 'ConflictError' ? 409
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Remove template inclusion
 * DELETE /api/products/paylinq/pay-structures/templates/:id/inclusions/:inclusionId
 * @deprecated This is a duplicate - use the first removeTemplateInclusion function instead
 */
export async function removeIncludedTemplateController(req, res) {
  try {
    const { id, inclusionId } = req.params;
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    await payStructureService.removeIncludedTemplate(
      inclusionId,
      organizationId,
      userId
    );

    res.status(200).json({
      success: true,
      message: 'Template inclusion removed successfully'
    });
  } catch (error) {
    logger.error('Error removing template inclusion', {
      error: error.message,
      inclusionId: req.params.inclusionId,
      organizationId: req.user?.organization_id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * Get resolved template with all inclusions merged
 * GET /api/products/paylinq/pay-structures/templates/:id/resolved
 */
export async function getResolvedTemplate(req, res) {
  try {
    const { id } = req.params;
    const { asOfDate } = req.query;
    const organizationId = req.user.organization_id;

    const resolvedTemplate = await payStructureService.resolveTemplateHierarchy(
      id,
      organizationId,
      asOfDate ? new Date(asOfDate) : undefined
    );

    res.status(200).json({
      success: true,
      resolvedTemplate
    });
  } catch (error) {
    logger.error('Error getting resolved template', {
      error: error.message,
      templateId: req.params.id,
      organizationId: req.user?.organization_id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

// ==================== DEPRECATED METHODS (for backward compatibility) ====================

/**
 * @deprecated Use addTemplateInclusion instead
 * Include template in another template
 * POST /api/paylinq/pay-structures/:id/include
 */
export async function includeTemplate(req, res) {
  try {
    const { id } = req.params;
    const { includedTemplateId, mergeStrategy, inclusionOrder, overrideRules } = req.body;
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    const inclusion = await payStructureService.includeTemplate(
      id,
      includedTemplateId,
      { mergeStrategy, inclusionOrder, overrideRules },
      organizationId,
      userId
    );

    res.status(201).json({
      success: true,
      inclusion,
      message: 'Template included successfully'
    });
  } catch (error) {
    logger.error('Error including template', {
      error: error.message,
      parentId: req.params.id,
      organizationId: req.user?.organization_id
    });

    const statusCode = error.name === 'ValidationError' ? 400
      : error.name === 'NotFoundError' ? 404
      : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

/**
 * @deprecated Use removeTemplateInclusion instead
 * Remove included template
 * DELETE /api/paylinq/pay-structures/:id/include/:includedId
 */
export async function removeIncludedTemplate(req, res) {
  try {
    const { id, includedId } = req.params;
    const organizationId = req.user.organization_id;
    const userId = req.user.id;

    await payStructureService.removeIncludedTemplate(id, includedId, organizationId, userId);

    res.status(200).json({
      success: true,
      message: 'Included template removed successfully'
    });
  } catch (error) {
    logger.error('Error removing included template', {
      error: error.message,
      parentId: req.params.id,
      includedId: req.params.includedId,
      organizationId: req.user?.organization_id
    });

    const statusCode = error.name === 'NotFoundError' ? 404 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message
    });
  }
}

