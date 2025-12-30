/**
 * Pay Period Controller
 * Handles pay period configuration endpoints
 */

import PayPeriodService from '../services/payPeriodService.ts';
import logger from '../../../utils/logger.ts';

// Instantiate service
const payPeriodService = new PayPeriodService();

/**
 * Get pay period configuration
 * @route GET /api/paylinq/settings/pay-period-config
 */
export const getPayPeriodConfig = async (req, res) => {
  try {
    const { organizationId } = req;

    const config = await payPeriodService.getPayPeriodConfig(organizationId);

    if (!config) {
      return res.json({
        success: true,
        payPeriodConfig: null,
        message: 'No pay period configuration found'
      });
    }

    res.json({
      success: true,
      payPeriodConfig: config
    });
  } catch (error) {
    logger.error('Error getting pay period config:', { error: error.message, organizationId: req.organizationId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve pay period configuration',
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: error.message
    });
  }
};

/**
 * Save pay period configuration
 * @route PUT /api/paylinq/settings/pay-period-config
 */
export const savePayPeriodConfig = async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const data = req.body;

    const config = await payPeriodService.savePayPeriodConfig(data, organizationId, userId);

    logger.info('Pay period config saved', { organizationId, userId });

    res.json({
      success: true,
      payPeriodConfig: config,
      message: 'Pay period configuration saved successfully'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        message: error.message
      });
    }

    logger.error('Error saving pay period config:', { error: error.message, organizationId: req.organizationId });
    res.status(500).json({
      success: false,
      error: 'Failed to save pay period configuration',
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: error.message
    });
  }
};

/**
 * Get current pay period
 * @route GET /api/paylinq/settings/pay-period/current
 */
export const getCurrentPayPeriod = async (req, res) => {
  try {
    const { organizationId } = req;

    const payPeriod = await payPeriodService.getCurrentPayPeriod(organizationId);

    res.json({
      success: true,
      payPeriod
    });
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Pay period configuration not found',
        errorCode: 'PAY_PERIOD_CONFIG_NOT_FOUND',
        message: 'Please configure pay periods first'
      });
    }

    logger.error('Error getting current pay period:', { error: error.message, organizationId: req.organizationId });
    res.status(500).json({
      success: false,
      error: 'Failed to calculate current pay period',
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: error.message
    });
  }
};

/**
 * Get next pay period
 * @route GET /api/paylinq/settings/pay-period/next
 */
export const getNextPayPeriod = async (req, res) => {
  try {
    const { organizationId } = req;

    const payPeriod = await payPeriodService.getNextPayPeriod(organizationId);

    res.json({
      success: true,
      payPeriod
    });
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Pay period configuration not found',
        errorCode: 'PAY_PERIOD_CONFIG_NOT_FOUND',
        message: 'Please configure pay periods first'
      });
    }

    logger.error('Error getting next pay period:', { error: error.message, organizationId: req.organizationId });
    res.status(500).json({
      success: false,
      error: 'Failed to calculate next pay period',
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: error.message
    });
  }
};

/**
 * Get company holidays
 * @route GET /api/paylinq/settings/holidays
 */
export const getHolidays = async (req, res) => {
  try {
    const { organizationId } = req;
    const { year } = req.query;

    const holidays = await payPeriodService.getHolidays(organizationId, year ? parseInt(year) : null);

    res.json({
      success: true,
      holidays
    });
  } catch (error) {
    logger.error('Error getting holidays:', { error: error.message, organizationId: req.organizationId });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve holidays',
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: error.message
    });
  }
};

/**
 * Create company holiday
 * @route POST /api/paylinq/settings/holidays
 */
export const createHoliday = async (req, res) => {
  try {
    const { organizationId, userId } = req;
    const data = req.body;

    const holiday = await payPeriodService.createHoliday(data, organizationId, userId);

    res.status(201).json({
      success: true,
      holiday,
      message: 'Holiday created successfully'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
        message: error.message
      });
    }

    logger.error('Error creating holiday:', { error: error.message, organizationId: req.organizationId });
    res.status(500).json({
      success: false,
      error: 'Failed to create holiday',
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: error.message
    });
  }
};

/**
 * Delete company holiday
 * @route DELETE /api/paylinq/settings/holidays/:id
 */
export const deleteHoliday = async (req, res) => {
  try {
    const { organizationId } = req;
    const { id } = req.params;

    await payPeriodService.deleteHoliday(id, organizationId);

    res.json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Holiday not found',
        errorCode: 'HOLIDAY_NOT_FOUND',
        message: error.message
      });
    }

    logger.error('Error deleting holiday:', { error: error.message, organizationId: req.organizationId });
    res.status(500).json({
      success: false,
      error: 'Failed to delete holiday',
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: error.message
    });
  }
};

export default {
  getPayPeriodConfig,
  savePayPeriodConfig,
  getCurrentPayPeriod,
  getNextPayPeriod,
  getHolidays,
  createHoliday,
  deleteHoliday,
};
