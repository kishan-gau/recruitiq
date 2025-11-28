/**
 * Paylinq Worker Type Controller
 * Handles HTTP requests for worker type/classification management
 */

import WorkerTypeService from '../services/workerTypeService.js';
import { mapApiToDb } from '../utils/dtoMapper.js';
import logger from '../../../utils/logger.js';

// Instantiate service
const workerTypeService = new WorkerTypeService();

/**
 * Create a new worker type template
 * POST /api/paylinq/worker-types
 */
async function createWorkerType(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;

    const workerType = await workerTypeService.createWorkerTypeTemplate(
      req.body,
      organizationId,
      userId
    );

    logger.info('Worker type created', {
      organizationId,
      workerTypeId: workerType.id,
      userId,
    });

    res.status(201).json({
      success: true,
      workerType: workerType,
      message: 'Worker type created successfully',
    });
  } catch (error) {
    logger.error('Error creating worker type', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('limit reached')) {
      return res.status(403).json({
        success: false,
        error: error.message,
        errorCode: 'TIER_LIMIT_REACHED',
      });
    }

    if (error.message.includes('Worker type') && error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: error.message,
        errorCode: 'CONFLICT',
      });
    }

    res.status(400).json({
      success: false,
      error: error.message,
      errorCode: 'VALIDATION_ERROR',
    });
  }
}

/**
 * Get all worker types for an organization
 * GET /api/paylinq/worker-types?page=1&limit=20&status=active&sortBy=name&sortOrder=asc
 */
async function getWorkerTypes(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    
    // Parse pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    
    // Parse filters
    const filters = {
      status: req.query.status, // active, inactive, all
      payType: req.query.payType,
      search: req.query.search, // Search by name or code
      benefitsEligible: req.query.benefitsEligible === 'true' ? true : req.query.benefitsEligible === 'false' ? false : undefined,
      overtimeEligible: req.query.overtimeEligible === 'true' ? true : req.query.overtimeEligible === 'false' ? false : undefined,
    };
    
    // Parse sorting
    const sortBy = req.query.sortBy || 'name'; // name, code, createdAt, updatedAt
    const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';

    const result = await workerTypeService.getWorkerTypes(
      organizationId,
      { page, limit },
      filters,
      { sortBy, sortOrder }
    );

    res.status(200).json({
      success: true,
      workerTypes: result.workerTypes,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error fetching worker types', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch worker types',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
}

/**
 * Get a single worker type by ID
 * GET /api/paylinq/worker-types/:id
 */
async function getWorkerTypeById(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const workerType = await workerTypeService.getWorkerTypeTemplateById(id, organizationId);

    res.status(200).json({
      success: true,
      workerType: workerType,
    });
  } catch (error) {
    logger.error('Error fetching worker type', {
      error: error.message,
      workerTypeId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    // Handle specific error types
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
        errorCode: 'NOT_FOUND',
      });
    }
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        errorCode: 'FORBIDDEN',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch worker type',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
}

/**
 * Update a worker type
 * PUT /api/paylinq/worker-types/:id
 */
async function updateWorkerType(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    logger.info('updateWorkerType - Request body:', {
      body: req.body,
      payStructureTemplateCode: req.body.payStructureTemplateCode
    });

    const workerType = await workerTypeService.updateWorkerTypeTemplate(
      id,
      req.body,
      organizationId,
      userId
    );

    logger.info('Worker type updated', {
      organizationId,
      workerTypeId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      workerType: workerType,
      message: 'Worker type updated successfully',
    });
  } catch (error) {
    logger.error('Error updating worker type', {
      error: error.message,
      workerTypeId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    // Handle specific error types
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
        errorCode: 'NOT_FOUND',
      });
    }
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        errorCode: 'FORBIDDEN',
      });
    }

    res.status(400).json({
      success: false,
      error: error.message,
      errorCode: 'VALIDATION_ERROR',
    });
  }
}

/**
 * Delete a worker type
 * DELETE /api/paylinq/worker-types/:id
 */
async function deleteWorkerType(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const deleted = await workerTypeService.deleteWorkerTypeTemplate(id, organizationId, userId);

    logger.info('Worker type deleted', {
      organizationId,
      workerTypeId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Worker type deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting worker type', {
      error: error.message,
      workerTypeId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    // Handle specific error types
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
        errorCode: 'NOT_FOUND',
      });
    }
    
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        errorCode: 'FORBIDDEN',
      });
    }

    if (error.message.includes('has assigned employees')) {
      return res.status(409).json({
        success: false,
        error: error.message,
        errorCode: 'WORKER_TYPE_IN_USE',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete worker type',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
}

/**
 * Assign employees to a worker type
 * POST /api/paylinq/worker-types/:id/assign-employees
 */
async function assignEmployees(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;
    const { employeeIds } = req.body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'employeeIds must be a non-empty array',
        errorCode: 'VALIDATION_ERROR',
      });
    }

    const result = await workerTypeService.bulkAssignWorkerTypes(
      id,
      employeeIds,
      organizationId,
      userId
    );

    logger.info('Employees assigned to worker type', {
      organizationId,
      workerTypeId: id,
      employeeCount: employeeIds.length,
      userId,
    });

    res.status(200).json({
      success: true,
      assigned: result,
      message: 'Employees assigned successfully',
    });
  } catch (error) {
    logger.error('Error assigning employees', {
      error: error.message,
      workerTypeId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: error.message,
      errorCode: 'VALIDATION_ERROR',
    });
  }
}

/**
 * Get employees assigned to a worker type
 * GET /api/paylinq/worker-types/:id/employees?page=1&limit=20
 */
async function getWorkerTypeEmployees(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;
    
    // Parse pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const result = await workerTypeService.getEmployeesByWorkerType(
      id,
      organizationId,
      { page, limit }
    );

    res.status(200).json({
      success: true,
      employees: result.employees,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error fetching worker type employees', {
      error: error.message,
      workerTypeId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to fetch employees',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
}

// ============================================================================
// Template Inclusion Management
// ============================================================================

/**
 * Get all inclusions for a worker type template
 * GET /api/paylinq/worker-types/:id/inclusions
 */
async function getTemplateInclusions(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const inclusions = await workerTypeService.getTemplateInclusions(id, organizationId);

    res.status(200).json({
      success: true,
      inclusions,
    });
  } catch (error) {
    logger.error('Error fetching template inclusions', {
      error: error.message,
      workerTypeId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
        errorCode: 'NOT_FOUND',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch template inclusions',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
}

/**
 * Add an inclusion to a worker type template
 * POST /api/paylinq/worker-types/:id/inclusions
 */
async function addTemplateInclusion(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const inclusion = await workerTypeService.addTemplateInclusion(
      id,
      req.body,
      organizationId,
      userId
    );

    logger.info('Template inclusion added', {
      organizationId,
      workerTypeId: id,
      inclusionId: inclusion.id,
      componentType: req.body.componentType,
      userId,
    });

    res.status(201).json({
      success: true,
      inclusion,
      message: 'Inclusion added successfully',
    });
  } catch (error) {
    logger.error('Error adding template inclusion', {
      error: error.message,
      workerTypeId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
        errorCode: 'NOT_FOUND',
      });
    }

    if (error.message.includes('already included')) {
      return res.status(409).json({
        success: false,
        error: error.message,
        errorCode: 'CONFLICT',
      });
    }

    res.status(400).json({
      success: false,
      error: error.message,
      errorCode: 'VALIDATION_ERROR',
    });
  }
}

/**
 * Update a template inclusion
 * PUT /api/paylinq/worker-types/:id/inclusions/:inclusionId
 */
async function updateTemplateInclusion(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id, inclusionId } = req.params;

    const inclusion = await workerTypeService.updateTemplateInclusion(
      id,
      inclusionId,
      req.body,
      organizationId,
      userId
    );

    logger.info('Template inclusion updated', {
      organizationId,
      workerTypeId: id,
      inclusionId,
      userId,
    });

    res.status(200).json({
      success: true,
      inclusion,
      message: 'Inclusion updated successfully',
    });
  } catch (error) {
    logger.error('Error updating template inclusion', {
      error: error.message,
      workerTypeId: req.params.id,
      inclusionId: req.params.inclusionId,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
        errorCode: 'NOT_FOUND',
      });
    }

    res.status(400).json({
      success: false,
      error: error.message,
      errorCode: 'VALIDATION_ERROR',
    });
  }
}

/**
 * Remove an inclusion from a worker type template
 * DELETE /api/paylinq/worker-types/:id/inclusions/:inclusionId
 */
async function removeTemplateInclusion(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id, inclusionId } = req.params;

    await workerTypeService.removeTemplateInclusion(
      id,
      inclusionId,
      organizationId,
      userId
    );

    logger.info('Template inclusion removed', {
      organizationId,
      workerTypeId: id,
      inclusionId,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Inclusion removed successfully',
    });
  } catch (error) {
    logger.error('Error removing template inclusion', {
      error: error.message,
      workerTypeId: req.params.id,
      inclusionId: req.params.inclusionId,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
        errorCode: 'NOT_FOUND',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to remove inclusion',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
}

// ============================================================================
// Pay Structure Template Upgrade Management
// ============================================================================

/**
 * Get upgrade status for workers assigned to this worker type
 * Shows which workers need template updates
 * GET /api/products/paylinq/worker-types/:id/upgrade-status
 */
async function getUpgradeStatus(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const status = await workerTypeService.getUpgradeStatus(id, organizationId);

    res.status(200).json({
      success: true,
      upgradeStatus: status,
    });
  } catch (error) {
    logger.error('Error fetching upgrade status', {
      error: error.message,
      workerTypeId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
        errorCode: 'NOT_FOUND',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch upgrade status',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
}

/**
 * Preview template upgrade
 * Shows what will change when upgrading workers to new template
 * GET /api/products/paylinq/worker-types/:id/preview-upgrade
 */
async function previewUpgrade(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const preview = await workerTypeService.previewTemplateUpgrade(id, organizationId);

    res.status(200).json({
      success: true,
      preview,
    });
  } catch (error) {
    logger.error('Error previewing template upgrade', {
      error: error.message,
      workerTypeId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
        errorCode: 'NOT_FOUND',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to preview template upgrade',
      errorCode: 'INTERNAL_SERVER_ERROR',
    });
  }
}

/**
 * Upgrade workers to the pay structure template
 * Updates all or selected workers to the template specified in worker type
 * POST /api/products/paylinq/worker-types/:id/upgrade-workers
 * 
 * Body:
 * {
 *   workerIds: ['uuid1', 'uuid2'], // Optional - all if not provided
 *   effectiveDate: '2025-01-01' // Optional - now if not provided
 * }
 */
async function upgradeWorkers(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const result = await workerTypeService.upgradeWorkersToTemplate(
      id,
      req.body,
      organizationId,
      userId
    );

    logger.info('Workers upgraded to template', {
      organizationId,
      workerTypeId: id,
      upgradedCount: result.upgradedCount,
      userId,
    });

    res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error upgrading workers', {
      error: error.message,
      workerTypeId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
        errorCode: 'NOT_FOUND',
      });
    }

    if (error.message.includes('does not have a pay structure template')) {
      return res.status(400).json({
        success: false,
        error: error.message,
        errorCode: 'NO_TEMPLATE_ASSIGNED',
      });
    }

    res.status(400).json({
      success: false,
      error: error.message,
      errorCode: 'VALIDATION_ERROR',
    });
  }
}

export default {
  createWorkerType,
  getWorkerTypes,
  getWorkerTypeById,
  updateWorkerType,
  deleteWorkerType,
  assignEmployees,
  getWorkerTypeEmployees,
  getTemplateInclusions,
  addTemplateInclusion,
  updateTemplateInclusion,
  removeTemplateInclusion,
  getUpgradeStatus,
  previewUpgrade,
  upgradeWorkers,
};
