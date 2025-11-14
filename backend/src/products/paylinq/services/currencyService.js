import ExchangeRateRepository from '../repositories/ExchangeRateRepository.js';
import logger from '../../../utils/logger.js';
import NodeCache from 'node-cache';
import { pool } from '../../../config/database.js';

/**
 * Currency Service - Handles all currency conversion operations
 */
class CurrencyService {
  constructor() {
    this.repository = new ExchangeRateRepository();
    
    // Cache exchange rates for 1 hour
    this.cache = new NodeCache({
      stdTTL: 3600, // 1 hour
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false
    });
  }

  /**
   * Get exchange rate for a currency pair
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

    // Check cache first
    const cacheKey = `rate:${organizationId}:${fromCurrency}:${toCurrency}`;
    const cachedRate = this.cache.get(cacheKey);
    
    if (cachedRate) {
      logger.debug('Exchange rate retrieved from cache', { fromCurrency, toCurrency });
      return cachedRate;
    }

    // Get from database
    let rate = await this.repository.getCurrentRate(organizationId, fromCurrency, toCurrency, effectiveDate);

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

    // Cache the rate
    this.cache.set(cacheKey, rate);

    return rate;
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
   * Batch convert multiple amounts
   * @param {string} organizationId - Organization ID
   * @param {Array} conversions - Array of conversion requests
   * @returns {Array} Array of conversion results
   */
  async batchConvert(organizationId, conversions) {
    const results = [];

    for (const conversion of conversions) {
      try {
        const result = await this.convertAmount({
          organizationId,
          ...conversion
        });
        results.push({ success: true, ...result });
      } catch (error) {
        logger.error('Batch conversion error', { conversion, error });
        results.push({
          success: false,
          error: error.message,
          ...conversion
        });
      }
    }

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
    
    // Invalidate cache for this currency pair
    const cacheKey = `rate:${rateData.organizationId}:${rateData.fromCurrency}:${rateData.toCurrency}`;
    this.cache.del(cacheKey);
    
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
    
    // Invalidate cache
    this.cache.flushAll();
    
    return rate;
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
}

export default CurrencyService;
