/**
 * Paylinq Worker Type Controller
 * Handles HTTP requests for worker type/classification management
 */

import workerTypeService from '../services/workerTypeService.js';
import { mapApiToDb } from '../utils/dtoMapper.js';
import logger from '../../../utils/logger.js';

/**
 * Create a new worker type template
 * POST /api/paylinq/worker-types
 */
async function createWorkerType(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const workerTypeData = {
      ...req.body,
      organizationId,
      createdBy: userId,
    };

    const workerType = await workerTypeService.createWorkerType(workerTypeData);

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
        errorCode: 'WORKER_TYPE_ALREADY_EXISTS',
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

    const workerType = await workerTypeService.getWorkerTypeById(id, organizationId);

    if (!workerType) {
      return res.status(404).json({
        success: false,
        error: 'Worker type not found',
        errorCode: 'WORKER_TYPE_NOT_FOUND',
      });
    }

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

    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    const workerType = await workerTypeService.updateWorkerType(id, organizationId, updateData);

    if (!workerType) {
      return res.status(404).json({
        success: false,
        error: 'Worker type not found',
        errorCode: 'WORKER_TYPE_NOT_FOUND',
      });
    }

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

    const deleted = await workerTypeService.deleteWorkerType(id, organizationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Worker type not found',
        errorCode: 'WORKER_TYPE_NOT_FOUND',
      });
    }

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

    const result = await workerTypeService.assignEmployeesToWorkerType(
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

export default {
  createWorkerType,
  getWorkerTypes,
  getWorkerTypeById,
  updateWorkerType,
  deleteWorkerType,
  assignEmployees,
  getWorkerTypeEmployees,
};
