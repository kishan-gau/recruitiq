import ExchangeRateRepository from '../repositories/ExchangeRateRepository.ts';
import ApprovalService from './approvalService.ts';
import logger from '../../../utils/logger.ts';
import NodeCache from 'node-cache';
import { createClient } from 'redis';
import pool from '../../../config/database.ts';

/**
 * Currency Service - Handles all currency conversion operations
 * Performance optimizations:
 * - Dual-layer caching (NodeCache L1 + Redis L2)
 * - Materialized view support for active rates
 * - Optimized batch conversions with parallel processing
 */
class CurrencyService {
  constructor() {
    this.repository = new ExchangeRateRepository();
    this.approvalService = new ApprovalService();
    
    // L1 Cache: NodeCache (in-memory, fast)
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes (shorter for L1)
      checkperiod: 60,
      useClones: false
    });

    // L2 Cache: Redis (distributed, persistent)
    this.redisClient = null;
    this.initializeRedis();

    // Performance flags
    this.useMaterializedViews = process.env.USE_MATERIALIZED_VIEWS !== 'false';
    this.useRedisCache = process.env.USE_REDIS_CACHE !== 'false';
    this.useApprovalWorkflow = process.env.USE_APPROVAL_WORKFLOW !== 'false';
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    if (!this.useRedisCache) {
      logger.info('Redis caching disabled via environment variable');
      return;
    }

    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection failed after 10 attempts');
              return new Error('Redis unavailable');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis connection error', { error: err.message });
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connected for currency caching');
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.warn('Redis initialization failed, falling back to NodeCache only', { error: error.message });
      this.redisClient = null;
    }
  }

  /**
   * Get exchange rate for a currency pair with dual-layer caching
   * @param {string} organizationId - Organization ID
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @param {Date} effectiveDate - Optional effective date
   * @returns {Object} Exchange rate object
   */
  async getExchangeRate(organizationId, fromCurrency, toCurrency, effectiveDate = new Date()) {
    // Same currency, rate is 1
    if (fromCurrency === toCurrency) {
      return {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: 1.0,
        source: 'identity',
        effective_from: new Date()
      };
    }

    const cacheKey = `rate:${organizationId}:${fromCurrency}:${toCurrency}`;

    // L1 Cache: NodeCache check
    const l1Cache = this.cache.get(cacheKey);
    if (l1Cache) {
      logger.debug('Exchange rate from L1 cache', { fromCurrency, toCurrency });
      return l1Cache;
    }

    // L2 Cache: Redis check
    if (this.redisClient && this.useRedisCache) {
      try {
        const redisData = await this.redisClient.get(cacheKey);
        if (redisData) {
          const rate = JSON.parse(redisData);
          // Populate L1 cache
          this.cache.set(cacheKey, rate);
          logger.debug('Exchange rate from L2 cache (Redis)', { fromCurrency, toCurrency });
          return rate;
        }
      } catch (error) {
        logger.warn('Redis cache read failed', { error: error.message });
      }
    }

    // Get from database (use materialized view if available)
    let rate;
    if (this.useMaterializedViews && !effectiveDate) {
      // Use materialized view for current rates (faster)
      rate = await this.getFromMaterializedView(organizationId, fromCurrency, toCurrency);
    }
    
    if (!rate) {
      // Fallback to regular table query
      rate = await this.repository.getCurrentRate(organizationId, fromCurrency, toCurrency, effectiveDate);
    }

    // If direct rate not found, try reverse and invert
    if (!rate) {
      rate = await this.repository.getCurrentRate(organizationId, toCurrency, fromCurrency, effectiveDate);
      
      if (rate) {
        // Invert the rate
        rate = {
          ...rate,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: 1 / rate.rate,
          source: `${rate.source}_inverted`
        };
        
        logger.info('Using inverted exchange rate', { fromCurrency, toCurrency, rate: rate.rate });
      }
    }

    // If still not found, try triangulation (via base currency)
    if (!rate) {
      rate = await this.triangulateRate(organizationId, fromCurrency, toCurrency, effectiveDate);
    }

    if (!rate) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    // Cache the rate in both layers
    this.cache.set(cacheKey, rate);
    
    if (this.redisClient && this.useRedisCache) {
      try {
        await this.redisClient.setEx(cacheKey, 3600, JSON.stringify(rate)); // 1 hour in Redis
      } catch (error) {
        logger.warn('Redis cache write failed', { error: error.message });
      }
    }

    return rate;
  }

  /**
   * Get active exchange rate from materialized view (performance optimization)
   * @param {string} organizationId - Organization ID
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @returns {Object|null} Exchange rate or null
   */
  async getFromMaterializedView(organizationId, fromCurrency, toCurrency) {
    try {
      const query = `
        SELECT 
          id, organization_id, from_currency, to_currency, rate,
          effective_from, source, metadata, updated_at
        FROM payroll.active_exchange_rates_mv
        WHERE organization_id = $1
          AND from_currency = $2
          AND to_currency = $3
        LIMIT 1
      `;
      
      const result = await pool.query(query, [organizationId, fromCurrency, toCurrency]);
      return result.rows[0] || null;
    } catch (error) {
      logger.warn('Materialized view query failed, falling back to regular table', { error: error.message });
      return null;
    }
  }

  /**
   * Triangulate exchange rate via base currency
   * @param {string} organizationId - Organization ID
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @param {Date} effectiveDate - Effective date
   * @returns {Object|null} Triangulated rate or null
   */
  async triangulateRate(organizationId, fromCurrency, toCurrency, effectiveDate) {
    try {
      // Get organization's base currency
      const configResult = await pool.query(
        'SELECT base_currency FROM payroll.organization_currency_config WHERE organization_id = $1',
        [organizationId]
      );

      if (configResult.rows.length === 0) {
        return null;
      }

      const baseCurrency = configResult.rows[0].base_currency;

      // If either currency is the base, we can't triangulate
      if (fromCurrency === baseCurrency || toCurrency === baseCurrency) {
        return null;
      }

      // Get rates: fromCurrency -> baseCurrency and baseCurrency -> toCurrency
      const fromToBase = await this.repository.getCurrentRate(
        organizationId, 
        fromCurrency, 
        baseCurrency, 
        effectiveDate
      );

      const baseToTarget = await this.repository.getCurrentRate(
        organizationId, 
        baseCurrency, 
        toCurrency, 
        effectiveDate
      );

      if (!fromToBase || !baseToTarget) {
        return null;
      }

      // Calculate triangulated rate
      const triangulatedRate = fromToBase.rate * baseToTarget.rate;

      logger.info('Triangulated exchange rate', {
        fromCurrency,
        toCurrency,
        baseCurrency,
        fromToBaseRate: fromToBase.rate,
        baseToTargetRate: baseToTarget.rate,
        triangulatedRate
      });

      return {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: triangulatedRate,
        source: 'triangulated',
        effective_from: effectiveDate,
        metadata: {
          via: baseCurrency,
          fromToBase: fromToBase.rate,
          baseToTarget: baseToTarget.rate
        }
      };
    } catch (error) {
      logger.error('Error triangulating exchange rate', { fromCurrency, toCurrency, error });
      return null;
    }
  }

  /**
   * Convert amount from one currency to another
   * @param {Object} params - Conversion parameters
   * @returns {Object} Conversion result
   */
  async convertAmount(params) {
    const {
      organizationId,
      amount,
      fromCurrency,
      toCurrency,
      roundingMethod = 'half_up',
      decimalPlaces = 2,
      effectiveDate = new Date(),
      referenceType = null,
      referenceId = null,
      createdBy = null
    } = params;

    // Get exchange rate
    const exchangeRate = await this.getExchangeRate(organizationId, fromCurrency, toCurrency, effectiveDate);

    // Convert amount
    const convertedAmount = amount * exchangeRate.rate;

    // Round according to method
    const roundedAmount = this.roundAmount(convertedAmount, decimalPlaces, roundingMethod);

    const result = {
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      toAmount: roundedAmount,
      rate: exchangeRate.rate,
      exchangeRateId: exchangeRate.id || null,
      source: exchangeRate.source,
      conversionDate: new Date()
    };

    // Log conversion if reference provided
    if (referenceType && referenceId) {
      try {
        const conversionRecord = await this.repository.logConversion({
          organizationId,
          fromCurrency,
          toCurrency,
          fromAmount: amount,
          toAmount: roundedAmount,
          exchangeRateId: exchangeRate.id,
          rateUsed: exchangeRate.rate,
          referenceType,
          referenceId,
          metadata: {
            roundingMethod,
            decimalPlaces,
            source: exchangeRate.source
          },
          createdBy
        });

        result.conversionId = conversionRecord.id;
      } catch (error) {
        logger.error('Error logging conversion', { params, error });
        // Don't fail the conversion if logging fails
      }
    }

    logger.info('Currency conversion completed', {
      fromCurrency,
      toCurrency,
      amount,
      convertedAmount: roundedAmount,
      rate: exchangeRate.rate
    });

    return result;
  }

  /**
   * Batch convert multiple amounts with optimized parallel processing
   * Performance improvements:
   * - Pre-fetch all required rates in single query
   * - Parallel conversion processing
   * - Reduced database round-trips
   * 
   * @param {string} organizationId - Organization ID
   * @param {Array} conversions - Array of conversion requests
   * @returns {Array} Array of conversion results
   */
  async batchConvert(organizationId, conversions) {
    if (!conversions || conversions.length === 0) {
      return [];
    }

    // Extract unique currency pairs
    const currencyPairs = new Map();
    conversions.forEach(conv => {
      const key = `${conv.fromCurrency}-${conv.toCurrency}`;
      if (!currencyPairs.has(key) && conv.fromCurrency !== conv.toCurrency) {
        currencyPairs.set(key, { from: conv.fromCurrency, to: conv.toCurrency });
      }
    });

    // Pre-fetch all required rates in parallel
    const rateFetchPromises = Array.from(currencyPairs.values()).map(pair =>
      this.getExchangeRate(organizationId, pair.from, pair.to).catch(err => ({
        error: err.message,
        from: pair.from,
        to: pair.to
      }))
    );

    const fetchedRates = await Promise.all(rateFetchPromises);
    const rateMap = new Map();
    
    fetchedRates.forEach(rate => {
      if (!rate.error) {
        const key = `${rate.from_currency}-${rate.to_currency}`;
        rateMap.set(key, rate);
      }
    });

    // Process conversions in parallel using pre-fetched rates
    const conversionPromises = conversions.map(async (conversion) => {
      try {
        // Same currency optimization
        if (conversion.fromCurrency === conversion.toCurrency) {
          return {
            success: true,
            fromCurrency: conversion.fromCurrency,
            toCurrency: conversion.toCurrency,
            fromAmount: conversion.amount,
            toAmount: conversion.amount,
            rate: 1.0,
            source: 'identity'
          };
        }

        const key = `${conversion.fromCurrency}-${conversion.toCurrency}`;
        const rate = rateMap.get(key);

        if (!rate) {
          throw new Error(`No exchange rate found for ${conversion.fromCurrency} to ${conversion.toCurrency}`);
        }

        const convertedAmount = conversion.amount * rate.rate;
        const roundedAmount = this.roundAmount(
          convertedAmount,
          conversion.decimalPlaces || 2,
          conversion.roundingMethod || 'half_up'
        );

        return {
          success: true,
          fromCurrency: conversion.fromCurrency,
          toCurrency: conversion.toCurrency,
          fromAmount: conversion.amount,
          toAmount: roundedAmount,
          rate: rate.rate,
          exchangeRateId: rate.id,
          source: rate.source
        };
      } catch (error) {
        logger.error('Batch conversion item error', { conversion, error });
        return {
          success: false,
          error: error.message,
          fromCurrency: conversion.fromCurrency,
          toCurrency: conversion.toCurrency,
          fromAmount: conversion.amount
        };
      }
    });

    const results = await Promise.all(conversionPromises);
    
    logger.info('Batch conversion completed', {
      total: conversions.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  /**
   * Round amount according to specified method
   * @param {number} amount - Amount to round
   * @param {number} decimalPlaces - Number of decimal places
   * @param {string} method - Rounding method
   * @returns {number} Rounded amount
   */
  roundAmount(amount, decimalPlaces, method = 'half_up') {
    const factor = Math.pow(10, decimalPlaces);

    switch (method) {
      case 'up':
        return Math.ceil(amount * factor) / factor;
      
      case 'down':
        return Math.floor(amount * factor) / factor;
      
      case 'half_up':
        return Math.round(amount * factor) / factor;
      
      case 'half_down':
        return Math.floor(amount * factor + 0.5) / factor;
      
      case 'half_even': // Banker's rounding
        const rounded = Math.round(amount * factor);
        if (Math.abs(rounded - amount * factor) === 0.5) {
          return (rounded % 2 === 0 ? rounded : rounded - 1) / factor;
        }
        return rounded / factor;
      
      default:
        return Math.round(amount * factor) / factor;
    }
  }

  /**
   * Create a new exchange rate
   * @param {Object} rateData - Exchange rate data
   * @returns {Object} Created exchange rate
   */
  async createExchangeRate(rateData) {
    const rate = await this.repository.createRate(rateData);
    
    // Invalidate both cache layers for this currency pair
    await this.invalidateRateCache(rateData.organizationId, rateData.fromCurrency, rateData.toCurrency);
    
    return rate;
  }

  /**
   * Update an exchange rate
   * @param {number} id - Rate ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated exchange rate
   */
  async updateExchangeRate(id, updateData) {
    const rate = await this.repository.updateRate(id, updateData);
    
    // Invalidate all caches (we don't know which pairs are affected)
    await this.invalidateAllCaches();
    
    return rate;
  }

  /**
   * Invalidate cache for specific currency pair
   */
  async invalidateRateCache(organizationId, fromCurrency, toCurrency) {
    const cacheKey = `rate:${organizationId}:${fromCurrency}:${toCurrency}`;
    
    // Clear L1 cache
    this.cache.del(cacheKey);
    
    // Clear L2 cache (Redis)
    if (this.redisClient && this.useRedisCache) {
      try {
        await this.redisClient.del(cacheKey);
      } catch (error) {
        logger.warn('Redis cache invalidation failed', { error: error.message });
      }
    }
  }

  /**
   * Invalidate all caches (use sparingly)
   */
  async invalidateAllCaches() {
    // Clear L1 cache
    this.cache.flushAll();
    
    // Clear L2 cache (Redis) - remove all rate keys
    if (this.redisClient && this.useRedisCache) {
      try {
        const keys = await this.redisClient.keys('rate:*');
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          logger.info('Redis rate cache cleared', { count: keys.length });
        }
      } catch (error) {
        logger.warn('Redis cache flush failed', { error: error.message });
      }
    }
  }

  /**
   * Delete an exchange rate
   * @param {number} id - Rate ID
   * @param {string} userId - User performing deletion
   * @returns {Object} Deleted exchange rate
   */
  async deleteExchangeRate(id, userId) {
    const rate = await this.repository.deleteRate(id, userId);
    
    // Invalidate cache
    this.cache.flushAll();
    
    return rate;
  }

  /**
   * Get all active exchange rates for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Array} Array of active rates
   */
  async getActiveRates(organizationId) {
    return await this.repository.getActiveRates(organizationId);
  }

  /**
   * Get historical rates for a currency pair
   * @param {string} organizationId - Organization ID
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @param {Object} options - Query options
   * @returns {Array} Historical rates
   */
  async getHistoricalRates(organizationId, fromCurrency, toCurrency, options = {}) {
    return await this.repository.getHistoricalRates(organizationId, fromCurrency, toCurrency, options);
  }

  /**
   * Get conversion history for a reference
   * @param {string} referenceType - Reference type
   * @param {string|number} referenceId - Reference ID
   * @returns {Array} Conversion history
   */
  async getConversionHistory(referenceType, referenceId) {
    return await this.repository.getConversionHistory(referenceType, referenceId);
  }

  /**
   * Bulk import exchange rates
   * @param {Array} rates - Array of rate data
   * @returns {Array} Created rates
   */
  async bulkImportRates(rates) {
    const createdRates = await this.repository.bulkCreateRates(rates);
    
    // Clear cache after bulk import
    this.cache.flushAll();
    
    return createdRates;
  }

  /**
   * Get or create organization currency config
   * @param {string} organizationId - Organization ID
   * @returns {Object} Currency configuration
   */
  async getOrCreateOrgConfig(organizationId) {
    try {
      let result = await pool.query(
        'SELECT * FROM payroll.organization_currency_config WHERE organization_id = $1',
        [organizationId]
      );

      if (result.rows.length === 0) {
        // Create default config
        result = await pool.query(
          `INSERT INTO payroll.organization_currency_config (
            organization_id, base_currency, supported_currencies
          ) VALUES ($1, $2, $3)
          RETURNING *`,
          [organizationId, 'SRD', ['SRD']]
        );
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting org currency config', { organizationId, error });
      throw error;
    }
  }

  /**
   * Update organization currency configuration
   * @param {string} organizationId - Organization ID
   * @param {Object} configData - Configuration data
   * @returns {Object} Updated configuration
   */
  async updateOrgConfig(organizationId, configData) {
    const {
      baseCurrency,
      supportedCurrencies,
      autoUpdateRates,
      rateUpdateSource,
      rateUpdateFrequency,
      defaultRoundingMethod,
      defaultDecimalPlaces,
      requireApprovalThreshold,
      requireApprovalForRateChanges,
      updatedBy
    } = configData;

    const query = `
      UPDATE payroll.organization_currency_config
      SET 
        base_currency = COALESCE($1, base_currency),
        supported_currencies = COALESCE($2, supported_currencies),
        auto_update_rates = COALESCE($3, auto_update_rates),
        rate_update_source = COALESCE($4, rate_update_source),
        rate_update_frequency = COALESCE($5, rate_update_frequency),
        default_rounding_method = COALESCE($6, default_rounding_method),
        default_decimal_places = COALESCE($7, default_decimal_places),
        require_approval_threshold = COALESCE($8, require_approval_threshold),
        require_approval_for_rate_changes = COALESCE($9, require_approval_for_rate_changes),
        updated_by = $10,
        updated_at = NOW()
      WHERE organization_id = $11
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [
        baseCurrency,
        supportedCurrencies,
        autoUpdateRates,
        rateUpdateSource,
        rateUpdateFrequency,
        defaultRoundingMethod,
        defaultDecimalPlaces,
        requireApprovalThreshold,
        requireApprovalForRateChanges,
        updatedBy,
        organizationId
      ]);

      if (result.rows.length === 0) {
        throw new Error(`Currency config for organization ${organizationId} not found`);
      }

      // Clear cache when config changes
      this.cache.flushAll();

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating org currency config', { organizationId, configData, error });
      throw error;
    }
  }

  /**
   * Clear exchange rate cache
   */
  clearCache() {
    this.cache.flushAll();
    logger.info('Exchange rate cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Convert payroll components with currency support
   * Handles component-level currency conversions for payroll calculations
   * 
   * @param {Array} components - Array of payroll components with amounts
   * @param {string} targetCurrency - Target currency for conversion
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} Converted components with summary
   */
  async convertPayrollComponents(components, targetCurrency, organizationId, options = {}) {
    const {
      date = new Date(),
      roundingMethod = 'half_up',
      decimalPlaces = 2,
      createdBy = 'system',
      paycheckId = null
    } = options;

    const convertedComponents = [];
    const conversions = [];
    let totalOriginalAmount = 0;
    let totalConvertedAmount = 0;

    for (const component of components) {
      const {
        id,
        name,
        componentType,
        amount,
        currency: componentCurrency = targetCurrency,
        ...rest
      } = component;

      // Track original amount
      totalOriginalAmount += amount;

      // Check if conversion is needed
      if (componentCurrency === targetCurrency) {
        // No conversion needed
        convertedComponents.push({
          id,
          name,
          componentType,
          amount,
          currency: componentCurrency,
          originalAmount: amount,
          originalCurrency: componentCurrency,
          exchangeRate: 1.0,
          conversionNeeded: false,
          ...rest
        });
        totalConvertedAmount += amount;
      } else {
        // Conversion needed
        try {
          const conversionResult = await this.convertAmount({
            organizationId,
            fromCurrency: componentCurrency,
            toCurrency: targetCurrency,
            amount,
            date,
            roundingMethod,
            decimalPlaces,
            referenceType: 'payroll_component',
            referenceId: id,
            logConversion: true,
            createdBy
          });

          convertedComponents.push({
            id,
            name,
            componentType,
            amount: conversionResult.toAmount,
            currency: targetCurrency,
            originalAmount: amount,
            originalCurrency: componentCurrency,
            exchangeRate: conversionResult.rate,
            conversionNeeded: true,
            conversionId: conversionResult.conversionId,
            ...rest
          });

          conversions.push({
            componentId: id,
            componentName: name,
            fromCurrency: componentCurrency,
            toCurrency: targetCurrency,
            fromAmount: amount,
            toAmount: conversionResult.toAmount,
            rate: conversionResult.rate
          });

          totalConvertedAmount += conversionResult.toAmount;
        } catch (error) {
          logger.error('Failed to convert payroll component', {
            componentId: id,
            componentName: name,
            fromCurrency: componentCurrency,
            toCurrency: targetCurrency,
            amount,
            error: error.message
          });
          throw new Error(`Failed to convert component "${name}": ${error.message}`);
        }
      }
    }

    return {
      components: convertedComponents,
      conversions,
      summary: {
        totalComponents: components.length,
        componentsConverted: conversions.length,
        targetCurrency,
        totalOriginalAmount,
        totalConvertedAmount,
        conversionDate: date,
        paycheckId
      }
    };
  }

  /**
   * Calculate paycheck with multi-currency support
   * Converts all components to target currency and generates paycheck summary
   * 
   * @param {Object} paycheckData - Paycheck data with components
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Paycheck with currency conversion details
   */
  async calculatePaycheckWithCurrency(paycheckData, organizationId, options = {}) {
    const {
      paymentCurrency,
      baseCurrency,
      components = [],
      employeeId,
      payrollRunId,
      createdBy = 'system'
    } = paycheckData;

    const {
      date = new Date(),
      roundingMethod = 'half_up',
      decimalPlaces = 2
    } = options;

    // If no conversion needed, return as is
    if (!paymentCurrency || paymentCurrency === baseCurrency) {
      const grossPay = components
        .filter(c => c.componentType === 'earning')
        .reduce((sum, c) => sum + c.amount, 0);
      
      const totalDeductions = components
        .filter(c => c.componentType === 'deduction')
        .reduce((sum, c) => sum + c.amount, 0);
      
      const totalTaxes = components
        .filter(c => c.componentType === 'tax')
        .reduce((sum, c) => sum + c.amount, 0);
      
      const netPay = grossPay - totalDeductions - totalTaxes;

      return {
        baseCurrency: baseCurrency || paymentCurrency,
        paymentCurrency: paymentCurrency || baseCurrency,
        grossPay,
        totalDeductions,
        totalTaxes,
        netPay,
        components,
        conversionApplied: false
      };
    }

    // Convert components
    const conversionResult = await this.convertPayrollComponents(
      components,
      paymentCurrency,
      organizationId,
      {
        date,
        roundingMethod,
        decimalPlaces,
        createdBy
      }
    );

    // Calculate totals in target currency
    const convertedComponents = conversionResult.components;
    
    const grossPay = convertedComponents
      .filter(c => c.componentType === 'earning')
      .reduce((sum, c) => sum + c.amount, 0);
    
    const totalDeductions = convertedComponents
      .filter(c => c.componentType === 'deduction')
      .reduce((sum, c) => sum + c.amount, 0);
    
    const totalTaxes = convertedComponents
      .filter(c => c.componentType === 'tax')
      .reduce((sum, c) => sum + c.amount, 0);
    
    const netPay = grossPay - totalDeductions - totalTaxes;

    // Calculate original amounts in base currency
    const originalGrossPay = components
      .filter(c => c.componentType === 'earning')
      .reduce((sum, c) => sum + c.amount, 0);
    
    const originalTotalDeductions = components
      .filter(c => c.componentType === 'deduction')
      .reduce((sum, c) => sum + c.amount, 0);
    
    const originalTotalTaxes = components
      .filter(c => c.componentType === 'tax')
      .reduce((sum, c) => sum + c.amount, 0);
    
    const originalNetPay = originalGrossPay - originalTotalDeductions - originalTotalTaxes;

    // Get the exchange rate used for gross pay conversion
    const grossConversion = conversionResult.conversions.find(c => 
      c.componentType === 'earning'
    );
    const exchangeRateUsed = grossConversion ? grossConversion.rate : 1.0;

    return {
      baseCurrency,
      paymentCurrency,
      grossPay,
      totalDeductions,
      totalTaxes,
      netPay,
      components: convertedComponents,
      conversionApplied: true,
      exchangeRateUsed,
      conversionSummary: {
        originalGrossPay,
        originalTotalDeductions,
        originalTotalTaxes,
        originalNetPay,
        conversionDate: date.toISOString(),
        roundingMethod,
        componentsConverted: conversionResult.summary.componentsConverted,
        source: 'payroll_calculation'
      },
      conversions: conversionResult.conversions
    };
  }

  /**
   * Refresh materialized views for currency data
   * Should be called periodically via cron/scheduler
   */
  async refreshMaterializedViews() {
    try {
      await pool.query('SELECT payroll.refresh_currency_materialized_views()');
      logger.info('Currency materialized views refreshed successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to refresh materialized views', { error });
      throw error;
    }
  }

  /**
   * Get cache statistics and health
   */
  getCacheStats() {
    const stats = {
      l1Cache: {
        type: 'NodeCache',
        enabled: true,
        keys: this.cache.keys().length,
        stats: this.cache.getStats()
      },
      l2Cache: {
        type: 'Redis',
        enabled: this.useRedisCache,
        connected: this.redisClient?.isOpen || false
      },
      materializedViews: {
        enabled: this.useMaterializedViews
      }
    };
    
    return stats;
  }

  /**
   * Cleanup resources (call on shutdown)
   */
  async cleanup() {
    if (this.redisClient && this.redisClient.isOpen) {
      await this.redisClient.quit();
      logger.info('Redis connection closed');
    }
  }

  /**
   * Check if conversion requires approval
   * @param {Object} conversionData - Conversion details
   * @returns {Object} { requiresApproval, approvalRequest }
   */
  async checkConversionApproval(conversionData) {
    if (!this.useApprovalWorkflow) {
      return { requiresApproval: false };
    }

    try {
      const result = await this.approvalService.createApprovalRequest({
        organizationId: conversionData.organizationId,
        requestType: 'conversion',
        referenceType: conversionData.referenceType || 'manual',
        referenceId: conversionData.referenceId,
        requestData: {
          from_currency: conversionData.fromCurrency,
          to_currency: conversionData.toCurrency,
          amount: conversionData.amount,
          rate: conversionData.rate
        },
        reason: conversionData.reason,
        priority: conversionData.priority || 'normal',
        createdBy: conversionData.userId
      });

      return result;
    } catch (error) {
      logger.error('Error checking conversion approval', { error, conversionData });
      throw error;
    }
  }

  /**
   * Check if rate change requires approval
   * @param {Object} rateChangeData - Rate change details
   * @returns {Object} { requiresApproval, approvalRequest }
   */
  async checkRateChangeApproval(rateChangeData) {
    if (!this.useApprovalWorkflow) {
      return { requiresApproval: false };
    }

    try {
      const result = await this.approvalService.createApprovalRequest({
        organizationId: rateChangeData.organizationId,
        requestType: 'rate_change',
        requestData: {
          from_currency: rateChangeData.fromCurrency,
          to_currency: rateChangeData.toCurrency,
          old_rate: rateChangeData.oldRate,
          new_rate: rateChangeData.newRate
        },
        reason: rateChangeData.reason,
        priority: rateChangeData.priority || 'normal',
        createdBy: rateChangeData.userId
      });

      return result;
    } catch (error) {
      logger.error('Error checking rate change approval', { error, rateChangeData });
      throw error;
    }
  }
}

export default CurrencyService;
