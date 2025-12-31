import express, { Router } from 'express';
import CurrencyService from '../services/currencyService.js';
import { authenticateTenant, requirePermission } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validation.js';
import Joi from 'joi';
import logger from '../../../utils/logger.js';

const router: Router = express.Router();
const currencyService = new CurrencyService();

// ================================================================
// VALIDATION SCHEMAS
// ================================================================

const createRateSchema = Joi.object({
  fromCurrency: Joi.string().length(3).uppercase().required(),
  toCurrency: Joi.string().length(3).uppercase().required(),
  rate: Joi.number().positive().required(),
  effectiveFrom: Joi.date().iso().optional(),
  effectiveTo: Joi.date().iso().optional(),
  source: Joi.string().valid('manual', 'ecb', 'central_bank', 'api').default('manual'),
  metadata: Joi.object().optional()
});

const updateRateSchema = Joi.object({
  rate: Joi.number().positive().optional(),
  effectiveTo: Joi.date().iso().optional(),
  metadata: Joi.object().optional()
}).min(1);

const convertAmountSchema = Joi.object({
  amount: Joi.number().positive().required(),
  fromCurrency: Joi.string().length(3).uppercase().required(),
  toCurrency: Joi.string().length(3).uppercase().required(),
  roundingMethod: Joi.string().valid('up', 'down', 'half_up', 'half_down', 'half_even').optional(),
  decimalPlaces: Joi.number().integer().min(0).max(4).optional()
});

const bulkImportSchema = Joi.object({
  rates: Joi.array().items(Joi.object({
    fromCurrency: Joi.string().length(3).uppercase().required(),
    toCurrency: Joi.string().length(3).uppercase().required(),
    rate: Joi.number().positive().required(),
    effectiveFrom: Joi.date().iso().optional(),
    source: Joi.string().optional()
  })).min(1).required()
});

const updateConfigSchema = Joi.object({
  baseCurrency: Joi.string().length(3).uppercase().optional(),
  supportedCurrencies: Joi.array().items(Joi.string().length(3).uppercase()).optional(),
  autoUpdateRates: Joi.boolean().optional(),
  rateUpdateSource: Joi.string().valid('ecb', 'central_bank', 'manual').optional(),
  rateUpdateFrequency: Joi.string().valid('daily', 'weekly', 'manual').optional(),
  defaultRoundingMethod: Joi.string().valid('up', 'down', 'half_up', 'half_down', 'half_even').optional(),
  defaultDecimalPlaces: Joi.number().integer().min(0).max(4).optional(),
  requireApprovalThreshold: Joi.number().positive().allow(null).optional(),
  requireApprovalForRateChanges: Joi.boolean().optional()
}).min(1);

// ================================================================
// EXCHANGE RATE ROUTES
// ================================================================

/**
 * GET /api/paylinq/exchange-rates
 * Get all active exchange rates for the organization
 */
router.get('/', 
  async (req, res, next) => {
    try {
      const { organizationId } = req.user;

      const rates = await currencyService.getActiveRates(organizationId);

      res.json({
        success: true,
        data: rates,
        count: rates.length
      });
    } catch (_error) {
      logger.error('Error fetching exchange rates', { error, user: req.user });
      next(error);
    }
  }
);

/**
 * GET /api/paylinq/exchange-rates/current/:from/:to
 * Get current exchange rate for a specific currency pair
 */
router.get('/current/:from/:to',
  async (req, res, next) => {
    try {
      const { organizationId } = req.user;
      const { from, to } = req.params;
      const { date } = req.query;

      const effectiveDate = date ? new Date(date) : new Date();

      const rate = await currencyService.getExchangeRate(
        organizationId,
        from.toUpperCase(),
        to.toUpperCase(),
        effectiveDate
      );

      res.json({
        success: true,
        data: rate
      });
    } catch (_error) {
      logger.error('Error fetching current rate', { error, params: req.params });
      next(error);
    }
  }
);

/**
 * GET /api/paylinq/exchange-rates/historical/:from/:to
 * Get historical rates for a currency pair
 */
router.get('/historical/:from/:to',
  async (req, res, next) => {
    try {
      const { organizationId } = req.user;
      const { from, to } = req.params;
      const { startDate, endDate, limit, offset } = req.query;

      const options = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0
      };

      const rates = await currencyService.getHistoricalRates(
        organizationId,
        from.toUpperCase(),
        to.toUpperCase(),
        options
      );

      res.json({
        success: true,
        data: rates,
        count: rates.length,
        pagination: {
          limit: options.limit,
          offset: options.offset
        }
      });
    } catch (_error) {
      logger.error('Error fetching historical rates', { error, params: req.params });
      next(error);
    }
  }
);

/**
 * POST /api/paylinq/exchange-rates
 * Create a new exchange rate
 */
router.post('/',
  requirePermission('settings:currency'),
  validate(createRateSchema),
  async (req, res, next) => {
    try {
      const { organizationId, userId } = req.user;
      const rateData = {
        organizationId,
        ...req.body,
        createdBy: userId
      };

      const rate = await currencyService.createExchangeRate(rateData);

      res.status(201).json({
        success: true,
        data: rate,
        message: 'Exchange rate created successfully'
      });
    } catch (_error) {
      logger.error('Error creating exchange rate', { error, body: req.body });
      next(error);
    }
  }
);

/**
 * PUT /api/paylinq/exchange-rates/:id
 * Update an exchange rate
 */
router.put('/:id',
  requirePermission('settings:currency'),
  validate(updateRateSchema),
  async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      const updateData = {
        ...req.body,
        updatedBy: userId
      };

      const rate = await currencyService.updateExchangeRate(parseInt(id), updateData);

      res.json({
        success: true,
        data: rate,
        message: 'Exchange rate updated successfully'
      });
    } catch (_error) {
      logger.error('Error updating exchange rate', { error, id: req.params.id });
      next(error);
    }
  }
);

/**
 * DELETE /api/paylinq/exchange-rates/:id
 * Delete (expire) an exchange rate
 */
router.delete('/:id',
  requirePermission('settings:currency'),
  async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { id } = req.params;

      const rate = await currencyService.deleteExchangeRate(parseInt(id), userId);

      res.json({
        success: true,
        data: rate,
        message: 'Exchange rate deleted successfully'
      });
    } catch (_error) {
      logger.error('Error deleting exchange rate', { error, id: req.params.id });
      next(error);
    }
  }
);

/**
 * POST /api/paylinq/exchange-rates/bulk-import
 * Bulk import exchange rates
 */
router.post('/bulk-import',
  requirePermission('settings:currency'),
  validate(bulkImportSchema),
  async (req, res, next) => {
    try {
      const { organizationId, userId } = req.user;
      const { rates } = req.body;

      // Add organization and user info to each rate
      const ratesWithMeta = rates.map(rate => ({
        ...rate,
        organizationId,
        createdBy: userId
      }));

      const createdRates = await currencyService.bulkImportRates(ratesWithMeta);

      res.status(201).json({
        success: true,
        data: createdRates,
        count: createdRates.length,
        message: `${createdRates.length} exchange rates imported successfully`
      });
    } catch (_error) {
      logger.error('Error bulk importing rates', { error, count: req.body.rates?.length });
      next(error);
    }
  }
);

// ================================================================
// CURRENCY CONVERSION ROUTES
// ================================================================

/**
 * POST /api/paylinq/currency/convert
 * Convert an amount from one currency to another
 */
router.post('/convert',
  validate(convertAmountSchema),
  async (req, res, next) => {
    try {
      const { organizationId, userId } = req.user;
      const { amount, fromCurrency, toCurrency, roundingMethod, decimalPlaces } = req.body;

      const result = await currencyService.convertAmount({
        organizationId,
        amount,
        fromCurrency,
        toCurrency,
        roundingMethod,
        decimalPlaces,
        createdBy: userId
      });

      res.json({
        success: true,
        data: result
      });
    } catch (_error) {
      logger.error('Error converting amount', { error, body: req.body });
      next(error);
    }
  }
);

/**
 * GET /api/paylinq/currency/conversions/:type/:id
 * Get conversion history for a reference
 */
router.get('/conversions/:type/:id',
  async (req, res, next) => {
    try {
      const { type, id } = req.params;

      const conversions = await currencyService.getConversionHistory(type, id);

      res.json({
        success: true,
        data: conversions,
        count: conversions.length
      });
    } catch (_error) {
      logger.error('Error fetching conversion history', { error, params: req.params });
      next(error);
    }
  }
);

// ================================================================
// CURRENCY CONFIGURATION ROUTES
// ================================================================

/**
 * GET /api/paylinq/currency/config
 * Get organization currency configuration
 */
router.get('/config',
  async (req, res, next) => {
    try {
      const { organizationId } = req.user;

      const config = await currencyService.getOrCreateOrgConfig(organizationId);

      res.json({
        success: true,
        data: config
      });
    } catch (_error) {
      logger.error('Error fetching currency config', { error, user: req.user });
      next(error);
    }
  }
);

/**
 * PUT /api/paylinq/currency/config
 * Update organization currency configuration
 */
router.put('/config',
  requirePermission('settings:currency'),
  validate(updateConfigSchema),
  async (req, res, next) => {
    try {
      const { organizationId, userId } = req.user;

      const configData = {
        ...req.body,
        updatedBy: userId
      };

      const config = await currencyService.updateOrgConfig(organizationId, configData);

      res.json({
        success: true,
        data: config,
        message: 'Currency configuration updated successfully'
      });
    } catch (_error) {
      logger.error('Error updating currency config', { error, body: req.body });
      next(error);
    }
  }
);

/**
 * GET /api/paylinq/currency/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats',
  async (req, res, next) => {
    try {
      const stats = currencyService.getCacheStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (_error) {
      logger.error('Error fetching cache stats', { error });
      next(error);
    }
  }
);

/**
 * POST /api/paylinq/currency/cache/clear
 * Clear exchange rate cache (admin only)
 */
router.post('/cache/clear',
  requirePermission('settings:manage'),
  async (req, res, next) => {
    try {
      currencyService.clearCache();

      res.json({
        success: true,
        message: 'Exchange rate cache cleared successfully'
      });
    } catch (_error) {
      logger.error('Error clearing cache', { error });
      next(error);
    }
  }
);

export default router;
