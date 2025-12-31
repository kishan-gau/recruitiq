/**
 * Loontijdvak (Tax Period) Controller
 * Handles HTTP requests for managing Dutch payroll tax periods
 */

import LoontijdvakService from '../services/loontijdvakService.js';
import logger from '../../../utils/logger.js';

const loontijdvakService = new LoontijdvakService();

/**
 * Create a loontijdvak period
 * POST /api/products/paylinq/loontijdvak
 */
async function create(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;

    const loontijdvak = await loontijdvakService.create(
      req.body,
      organizationId,
      userId
    );

    logger.info('Loontijdvak period created', {
      organizationId,
      loontijdvakId: loontijdvak.id,
      periodType: loontijdvak.period_type,
      year: loontijdvak.year,
      userId
    });

    res.status(201).json({
      success: true,
      loontijdvak,
      message: 'Loontijdvak period created successfully'
    });
  } catch (_error) {
    logger.error('Error creating loontijdvak period', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
      requestBody: req.body
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message
    });
  }
}

/**
 * List loontijdvak periods with filters
 * GET /api/products/paylinq/loontijdvak
 */
async function list(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { year, periodType, isActive, page, limit } = req.query;

    const filters = {
      year: year ? parseInt(year) : undefined,
      periodType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    };

    const pagination = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    };

    const result = await loontijdvakService.list(
      organizationId,
      filters,
      pagination
    );

    res.status(200).json({
      success: true,
      loontijdvakken: result.loontijdvakken,
      pagination: result.pagination
    });
  } catch (_error) {
    logger.error('Error listing loontijdvak periods', {
      error: error.message,
      organizationId: req.user?.organization_id,
      filters: req.query
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch loontijdvak periods'
    });
  }
}

/**
 * Get a single loontijdvak period by ID
 * GET /api/products/paylinq/loontijdvak/:id
 */
async function getById(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { id } = req.params;

    const loontijdvak = await loontijdvakService.getById(id, organizationId);

    if (!loontijdvak) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Loontijdvak period not found'
      });
    }

    res.status(200).json({
      success: true,
      loontijdvak
    });
  } catch (_error) {
    logger.error('Error fetching loontijdvak period', {
      error: error.message,
      loontijdvakId: req.params.id,
      organizationId: req.user?.organization_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch loontijdvak period'
    });
  }
}

/**
 * Update a loontijdvak period
 * PUT /api/products/paylinq/loontijdvak/:id
 */
async function update(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const loontijdvak = await loontijdvakService.update(
      id,
      req.body,
      organizationId,
      userId
    );

    if (!loontijdvak) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Loontijdvak period not found'
      });
    }

    logger.info('Loontijdvak period updated', {
      organizationId,
      loontijdvakId: id,
      userId
    });

    res.status(200).json({
      success: true,
      loontijdvak,
      message: 'Loontijdvak period updated successfully'
    });
  } catch (_error) {
    logger.error('Error updating loontijdvak period', {
      error: error.message,
      loontijdvakId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message
    });
  }
}

/**
 * Delete a loontijdvak period (soft delete)
 * DELETE /api/products/paylinq/loontijdvak/:id
 */
async function deleteLoontijdvak(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { id } = req.params;

    const deleted = await loontijdvakService.delete(id, organizationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Loontijdvak period not found'
      });
    }

    logger.info('Loontijdvak period deleted', {
      organizationId,
      loontijdvakId: id,
      userId
    });

    res.status(200).json({
      success: true,
      message: 'Loontijdvak period deleted successfully'
    });
  } catch (_error) {
    logger.error('Error deleting loontijdvak period', {
      error: error.message,
      loontijdvakId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete loontijdvak period'
    });
  }
}

/**
 * Find loontijdvak period by date
 * GET /api/products/paylinq/loontijdvak/lookup/by-date?date=2025-01-15&periodType=week
 */
async function findByDate(req, res) {
  try {
    const { organization_id: organizationId } = req.user;
    const { date, periodType } = req.query;

    const loontijdvak = await loontijdvakService.findByDate(
      new Date(date),
      organizationId,
      periodType
    );

    if (!loontijdvak) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `No loontijdvak period found for date ${date}${periodType ? ` and period type ${periodType}` : ''}`
      });
    }

    res.status(200).json({
      success: true,
      loontijdvak
    });
  } catch (_error) {
    logger.error('Error finding loontijdvak by date', {
      error: error.message,
      date: req.query.date,
      periodType: req.query.periodType,
      organizationId: req.user?.organization_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to find loontijdvak period'
    });
  }
}

/**
 * Bulk generate loontijdvak periods for a year
 * POST /api/products/paylinq/loontijdvak/bulk/generate
 * Body: { year: 2025, periodTypes: ['week', '4_weeks', 'month'] }
 */
async function bulkGenerate(req, res) {
  try {
    const { organization_id: organizationId, id: userId } = req.user;
    const { year, periodTypes } = req.body;

    const result = await loontijdvakService.bulkGeneratePeriods(
      year,
      periodTypes,
      organizationId,
      userId
    );

    logger.info('Loontijdvak periods bulk generated', {
      organizationId,
      year,
      periodTypes,
      count: result.created.length,
      userId
    });

    res.status(201).json({
      success: true,
      result,
      message: `Successfully generated ${result.created.length} loontijdvak periods for ${year}`
    });
  } catch (_error) {
    logger.error('Error bulk generating loontijdvak periods', {
      error: error.message,
      organizationId: req.user?.organization_id,
      year: req.body?.year,
      periodTypes: req.body?.periodTypes,
      userId: req.user?.id
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message
    });
  }
}

/**
 * Check for overlapping periods
 * GET /api/products/paylinq/loontijdvak/validation/overlaps
 */
async function checkOverlaps(req, res) {
  try {
    const { organization_id: organizationId } = req.user;

    const overlaps = await loontijdvakService.findOverlappingPeriods(organizationId);

    res.status(200).json({
      success: true,
      overlaps,
      hasOverlaps: overlaps.length > 0,
      count: overlaps.length
    });
  } catch (_error) {
    logger.error('Error checking loontijdvak overlaps', {
      error: error.message,
      organizationId: req.user?.organization_id
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to check for overlapping periods'
    });
  }
}

export default {
  create,
  list,
  getById,
  update,
  delete: deleteLoontijdvak,
  findByDate,
  bulkGenerate,
  checkOverlaps
};
