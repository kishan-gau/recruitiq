/**
 * Paylinq Reconciliation Controller
 * Handles HTTP requests for payment reconciliation management
 */

import ReconciliationService from '../services/reconciliationService.js';
import { 
  mapApiToDb, 
  mapReconciliationDbToApi,
  mapReconciliationDbArrayToApi,
  mapReconciliationItemDbToApi,
  mapReconciliationItemDbArrayToApi
} from '../utils/dtoMapper.js';
import logger from '../../../utils/logger.js';

const reconciliationService = new ReconciliationService();

/**
 * Create a reconciliation record
 * POST /api/paylinq/reconciliations
 */
async function createReconciliation(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;

    const reconciliation = await reconciliationService.createReconciliation(
      req.body,
      organizationId,
      userId
    );

    logger.info('Reconciliation created', {
      organizationId,
      reconciliationId: reconciliation.id,
      payrollRunId: reconciliation.payroll_run_id,
      userId,
    });

    res.status(201).json({
      success: true,
      reconciliation: mapReconciliationDbToApi(reconciliation),
      message: 'Reconciliation created successfully',
    });
  } catch (error) {
    logger.error('Error creating reconciliation', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    // Handle validation errors as 400
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create reconciliation',
    });
  }
}

/**
 * Get reconciliations
 * GET /api/paylinq/reconciliations
 */
async function getReconciliations(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { payrollRunId, status, reconciliationType, startDate, endDate, page, limit } = req.query;

    const filters = {
      payrollRunId,
      status,
      reconciliationType,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };

    const reconciliations = await reconciliationService.getReconciliationsByOrganization(
      organizationId,
      filters
    );

    res.status(200).json({
      success: true,
      reconciliations: mapReconciliationDbArrayToApi(reconciliations),
      count: reconciliations.length,
    });
  } catch (error) {
    logger.error('Error fetching reconciliations', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch reconciliations',
    });
  }
}

/**
 * Get a single reconciliation by ID
 * GET /api/paylinq/reconciliations/:id
 */
async function getReconciliationById(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const reconciliation = await reconciliationService.getReconciliationById(id, organizationId);

    res.status(200).json({
      success: true,
      reconciliation: mapReconciliationDbToApi(reconciliation),
    });
  } catch (error) {
    logger.error('Error fetching reconciliation', {
      error: error.message,
      reconciliationId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    // Handle NotFoundError as 404
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch reconciliation',
    });
  }
}

/**
 * Update a reconciliation
 * PUT /api/paylinq/reconciliations/:id
 */
async function updateReconciliation(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    const reconciliation = await reconciliationService.updateReconciliation(
      id,
      organizationId,
      updateData
    );

    logger.info('Reconciliation updated', {
      organizationId,
      reconciliationId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      reconciliation: mapReconciliationDbToApi(reconciliation),
      message: 'Reconciliation updated successfully',
    });
  } catch (error) {
    logger.error('Error updating reconciliation', {
      error: error.message,
      reconciliationId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    // Handle NotFoundError as 404
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    // Handle validation errors as 400
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update reconciliation',
    });
  }
}

/**
 * Complete a reconciliation
 * POST /api/paylinq/reconciliations/:id/complete
 */
async function completeReconciliation(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;
    const { notes } = req.body;

    const reconciliation = await reconciliationService.completeReconciliation(
      id,
      organizationId,
      userId,
      notes
    );

    logger.info('Reconciliation completed', {
      organizationId,
      reconciliationId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      reconciliation: mapReconciliationDbToApi(reconciliation),
      message: 'Reconciliation completed successfully',
    });
  } catch (error) {
    logger.error('Error completing reconciliation', {
      error: error.message,
      reconciliationId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    // Handle ConflictError (unresolved items) as 409
    if (error.name === 'ConflictError' || error.message.includes('unresolved items')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      });
    }

    // Handle NotFoundError as 404
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to complete reconciliation',
    });
  }
}

/**
 * Delete a reconciliation
 * DELETE /api/paylinq/reconciliations/:id
 */
async function deleteReconciliation(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const deleted = await reconciliationService.deleteReconciliation(id, organizationId, userId);

    logger.info('Reconciliation deleted', {
      organizationId,
      reconciliationId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Reconciliation deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting reconciliation', {
      error: error.message,
      reconciliationId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    // Handle NotFoundError as 404
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete reconciliation',
    });
  }
}

/**
 * Add a reconciliation item
 * POST /api/paylinq/reconciliations/:id/items
 */
async function addReconciliationItem(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const itemData = {
      ...req.body,
      reconciliationId: id,
      createdBy: userId,
    };

    const item = await reconciliationService.addReconciliationItem(itemData, organizationId);

    logger.info('Reconciliation item added', {
      organizationId,
      reconciliationId: id,
      itemId: item.id,
      userId,
    });

    res.status(201).json({
      success: true,
      item: mapReconciliationItemDbToApi(item),
      message: 'Reconciliation item added successfully',
    });
  } catch (error) {
    logger.error('Error adding reconciliation item', {
      error: error.message,
      reconciliationId: req.params.id,
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
 * Get reconciliation items
 * GET /api/paylinq/reconciliations/:id/items
 */
async function getReconciliationItems(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;
    const { status } = req.query;

    const items = await reconciliationService.getReconciliationItems(
      id,
      organizationId,
      status
    );

    res.status(200).json({
      success: true,
      items: mapReconciliationItemDbArrayToApi(items),
      count: items.length,
    });
  } catch (error) {
    logger.error('Error fetching reconciliation items', {
      error: error.message,
      reconciliationId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch reconciliation items',
    });
  }
}

/**
 * Update a reconciliation item
 * PUT /api/paylinq/reconciliation-items/:id
 */
async function updateReconciliationItem(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const updateData = {
      ...req.body,
      updatedBy: userId,
    };

    const item = await reconciliationService.updateReconciliationItem(
      id,
      organizationId,
      updateData
    );

    logger.info('Reconciliation item updated', {
      organizationId,
      itemId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      item: mapReconciliationItemDbToApi(item),
      message: 'Reconciliation item updated successfully',
    });
  } catch (error) {
    logger.error('Error updating reconciliation item', {
      error: error.message,
      itemId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    // Handle NotFoundError as 404
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    // Handle validation errors as 400
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update reconciliation item',
    });
  }
}

/**
 * Resolve a reconciliation item
 * POST /api/paylinq/reconciliation-items/:id/resolve
 */
async function resolveReconciliationItem(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;
    const { resolution } = req.body;

    const item = await reconciliationService.resolveReconciliationItem(
      id,
      organizationId,
      userId,
      resolution
    );

    logger.info('Reconciliation item resolved', {
      organizationId,
      itemId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      item: mapReconciliationItemDbToApi(item),
      message: 'Reconciliation item resolved successfully',
    });
  } catch (error) {
    logger.error('Error resolving reconciliation item', {
      error: error.message,
      itemId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    // Handle NotFoundError as 404
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: error.message,
      });
    }

    // Handle validation errors as 400
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to resolve reconciliation item',
    });
  }
}

export default {
  createReconciliation,
  getReconciliations,
  getReconciliationById,
  updateReconciliation,
  completeReconciliation,
  deleteReconciliation,
  addReconciliationItem,
  getReconciliationItems,
  updateReconciliationItem,
  resolveReconciliationItem,
};
