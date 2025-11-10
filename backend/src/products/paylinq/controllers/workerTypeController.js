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
        error: 'Tier Limit Reached',
        message: error.message,
      });
    }

    if (error.message.includes('Worker type') && error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Get all worker types for an organization
 * GET /api/paylinq/worker-types
 */
async function getWorkerTypes(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { includeInactive } = req.query;

    const workerTypes = await workerTypeService.getWorkerTypesByOrganization(
      organizationId,
      includeInactive === 'true'
    );

    res.status(200).json({
      success: true,
      workerTypes: workerTypes,
      count: workerTypes.length,
    });
  } catch (error) {
    logger.error('Error fetching worker types', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch worker types',
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
        error: 'Not Found',
        message: 'Worker type not found',
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
      error: 'Internal Server Error',
      message: 'Failed to fetch worker type',
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
        error: 'Not Found',
        message: 'Worker type not found',
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
      error: 'Bad Request',
      message: error.message,
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
        error: 'Not Found',
        message: 'Worker type not found',
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
        error: 'Conflict',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete worker type',
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
        error: 'Bad Request',
        message: 'employeeIds must be a non-empty array',
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
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Get employees assigned to a worker type
 * GET /api/paylinq/worker-types/:id/employees
 */
async function getWorkerTypeEmployees(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const employees = await workerTypeService.getEmployeesByWorkerType(id, organizationId);

    res.status(200).json({
      success: true,
      employees: employees,
      count: employees.length,
    });
  } catch (error) {
    logger.error('Error fetching worker type employees', {
      error: error.message,
      workerTypeId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch employees',
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
