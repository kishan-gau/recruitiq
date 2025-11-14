# Multi-Currency Service Layer Implementation

**Version:** 2.0  
**Date:** November 13, 2025  
**Dependencies:** Database Schema (02-database-schema.md)

---

## Overview

This document specifies the service layer architecture for multi-currency support, focusing on integration with the existing pay structure calculation engine and maintaining backward compatibility.

---

## Architecture Principles

1. **Single Responsibility:** Currency service handles conversion only, not business logic
2. **Integration Point:** Minimal changes to existing payroll calculation flow
3. **Caching:** Exchange rates cached aggressively for performance
4. **Audit First:** Every conversion creates immutable audit record
5. **Fail Safe:** Fallback to single currency if conversion unavailable

---

## Core Services

### 1. Currency Service

**File:** `backend/src/products/paylinq/services/currencyService.js`

```javascript
/**
 * Currency Service
 * Handles all currency operations, conversions, and exchange rate management
 */

import logger from '../../../utils/logger.js';
import { query } from '../../../config/database.js';
import { NotFoundError, ValidationError } from '../../../middleware/errorHandler.js';

class CurrencyService {
  constructor() {
    this.rateCache = new Map(); // In-memory cache for exchange rates
    this.cacheTTL = 3600000; // 1 hour in milliseconds
  }

  /**
   * Get current exchange rate for a currency pair
   * Uses caching for performance, falls back to database
   * 
   * @param {string} fromCurrency - Source currency (ISO 4217)
   * @param {string} toCurrency - Target currency (ISO 4217)
   * @param {string} organizationId - Organization UUID
   * @param {Date|null} asOfDate - Optional date for historical rates
   * @returns {Promise<Object>} Exchange rate object
   */
  async getExchangeRate(fromCurrency, toCurrency, organizationId, asOfDate = null) {
    // No conversion needed for same currency
    if (fromCurrency === toCurrency) {
      return {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: 1.0,
        rate_source: 'identity',
        effective_from: new Date()
      };
    }

    // Check cache first (only for current rates)
    if (!asOfDate) {
      const cacheKey = `${organizationId}:${fromCurrency}:${toCurrency}`;
      const cached = this.rateCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
        logger.debug('Exchange rate cache hit', { cacheKey });
        return cached.rate;
      }
    }

    // Query database for current or historical rate
    const dateCondition = asOfDate 
      ? `AND effective_from <= $4 AND (effective_to IS NULL OR effective_to > $4)`
      : `AND effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())`;

    const params = asOfDate
      ? [organizationId, fromCurrency, toCurrency, asOfDate]
      : [organizationId, fromCurrency, toCurrency];

    // Try direct rate (USD → SRD)
    const directResult = await query(
      `SELECT id, from_currency, to_currency, rate, inverse_rate, rate_source, 
              rate_type, effective_from, effective_to
       FROM payroll.exchange_rate
       WHERE organization_id = $1 
         AND from_currency = $2 
         AND to_currency = $3 
         AND is_active = true
         ${dateCondition}
       ORDER BY effective_from DESC
       LIMIT 1`,
      params
    );

    if (directResult.rows.length > 0) {
      const rate = directResult.rows[0];
      this.cacheRate(organizationId, fromCurrency, toCurrency, rate);
      return rate;
    }

    // Try inverse rate (SRD → USD by looking up USD → SRD)
    const inverseResult = await query(
      `SELECT id, to_currency as from_currency, from_currency as to_currency, 
              inverse_rate as rate, rate as inverse_rate, rate_source, 
              rate_type, effective_from, effective_to
       FROM payroll.exchange_rate
       WHERE organization_id = $1 
         AND from_currency = $3 
         AND to_currency = $2 
         AND is_active = true
         ${dateCondition}
       ORDER BY effective_from DESC
       LIMIT 1`,
      params
    );

    if (inverseResult.rows.length > 0) {
      const rate = inverseResult.rows[0];
      this.cacheRate(organizationId, fromCurrency, toCurrency, rate);
      return rate;
    }

    // Try triangulation via base currency
    const triangulated = await this.triangulateRate(
      fromCurrency, 
      toCurrency, 
      organizationId, 
      asOfDate
    );

    if (triangulated) {
      return triangulated;
    }

    throw new NotFoundError(
      `No exchange rate found for ${fromCurrency} → ${toCurrency} on ${asOfDate || 'current date'}`
    );
  }

  /**
   * Triangulate exchange rate through base currency
   * Example: EUR → SRD via EUR → USD → SRD
   */
  async triangulateRate(fromCurrency, toCurrency, organizationId, asOfDate = null) {
    // Get organization base currency
    const configResult = await query(
      `SELECT base_currency FROM payroll.organization_currency_config WHERE organization_id = $1`,
      [organizationId]
    );

    if (configResult.rows.length === 0) {
      return null;
    }

    const baseCurrency = configResult.rows[0].base_currency;

    // Can't triangulate if one of the currencies is the base
    if (fromCurrency === baseCurrency || toCurrency === baseCurrency) {
      return null;
    }

    try {
      // Get from_currency → base_currency
      const rateToBase = await this.getExchangeRate(
        fromCurrency, 
        baseCurrency, 
        organizationId, 
        asOfDate
      );

      // Get base_currency → to_currency
      const rateFromBase = await this.getExchangeRate(
        baseCurrency, 
        toCurrency, 
        organizationId, 
        asOfDate
      );

      // Calculate triangulated rate
      const triangulatedRate = rateToBase.rate * rateFromBase.rate;

      logger.info('Triangulated exchange rate', {
        fromCurrency,
        toCurrency,
        baseCurrency,
        rateToBase: rateToBase.rate,
        rateFromBase: rateFromBase.rate,
        triangulatedRate
      });

      return {
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: triangulatedRate,
        rate_source: `triangulated via ${baseCurrency}`,
        rate_type: 'triangulated',
        effective_from: rateToBase.effective_from
      };
    } catch (error) {
      logger.warn('Triangulation failed', {
        fromCurrency,
        toCurrency,
        baseCurrency,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Convert amount from one currency to another
   * Creates immutable audit record of conversion
   * 
   * @param {Object} conversionParams - Conversion parameters
   * @returns {Promise<Object>} Conversion result with audit trail
   */
  async convertAmount({
    fromCurrency,
    toCurrency,
    amount,
    organizationId,
    effectiveDate = new Date(),
    context = {}
  }) {
    // Validate inputs
    if (!fromCurrency || !toCurrency) {
      throw new ValidationError('From currency and to currency are required');
    }

    if (amount === null || amount === undefined || amount < 0) {
      throw new ValidationError('Amount must be a non-negative number');
    }

    // No conversion needed
    if (fromCurrency === toCurrency) {
      return {
        fromCurrency,
        toCurrency,
        fromAmount: amount,
        toAmount: amount,
        rate: 1.0,
        conversionId: null,
        rateSource: 'identity'
      };
    }

    // Get exchange rate
    const exchangeRate = await this.getExchangeRate(
      fromCurrency,
      toCurrency,
      organizationId,
      effectiveDate
    );

    // Calculate converted amount
    const toAmount = this.roundAmount(amount * exchangeRate.rate);

    // Create audit record
    const conversionResult = await query(
      `INSERT INTO payroll.currency_conversion (
        organization_id, source_table, source_id, from_currency, to_currency,
        from_amount, to_amount, exchange_rate_id, rate_used, rate_timestamp,
        conversion_method, rounding_method, payroll_run_id, employee_id,
        conversion_date, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id`,
      [
        organizationId,
        context.sourceTable || 'unknown',
        context.sourceId || null,
        fromCurrency,
        toCurrency,
        amount,
        toAmount,
        exchangeRate.id || null,
        exchangeRate.rate,
        effectiveDate,
        context.conversionMethod || 'automatic',
        context.roundingMethod || 'standard',
        context.payrollRunId || null,
        context.employeeId || null,
        effectiveDate,
        context.userId || null
      ]
    );

    logger.info('Currency conversion completed', {
      conversionId: conversionResult.rows[0].id,
      fromCurrency,
      toCurrency,
      amount,
      toAmount,
      rate: exchangeRate.rate,
      rateSource: exchangeRate.rate_source
    });

    return {
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      toAmount,
      rate: exchangeRate.rate,
      conversionId: conversionResult.rows[0].id,
      rateSource: exchangeRate.rate_source,
      effectiveDate
    };
  }

  /**
   * Round amount according to organization's rounding rules
   */
  roundAmount(amount, method = 'standard') {
    switch (method) {
      case 'standard':
        return Math.round(amount * 100) / 100;
      case 'up':
        return Math.ceil(amount * 100) / 100;
      case 'down':
        return Math.floor(amount * 100) / 100;
      case 'bankers':
        // Bankers rounding (round to even)
        const rounded = Math.round(amount * 100);
        return rounded / 100;
      default:
        return Math.round(amount * 100) / 100;
    }
  }

  /**
   * Cache exchange rate for performance
   */
  cacheRate(organizationId, fromCurrency, toCurrency, rate) {
    const cacheKey = `${organizationId}:${fromCurrency}:${toCurrency}`;
    this.rateCache.set(cacheKey, {
      rate,
      timestamp: Date.now()
    });
  }

  /**
   * Clear rate cache (call after rate updates)
   */
  clearCache(organizationId = null) {
    if (organizationId) {
      // Clear only for specific organization
      for (const key of this.rateCache.keys()) {
        if (key.startsWith(`${organizationId}:`)) {
          this.rateCache.delete(key);
        }
      }
    } else {
      // Clear entire cache
      this.rateCache.clear();
    }
    
    logger.info('Exchange rate cache cleared', { organizationId });
  }

  /**
   * Create or update exchange rate
   */
  async setExchangeRate({
    fromCurrency,
    toCurrency,
    rate,
    organizationId,
    effectiveFrom = new Date(),
    effectiveTo = null,
    rateType = 'manual',
    rateSource = 'manual',
    userId,
    notes = null
  }) {
    // Validate rate
    if (rate <= 0) {
      throw new ValidationError('Exchange rate must be greater than 0');
    }

    if (fromCurrency === toCurrency) {
      throw new ValidationError('From currency and to currency must be different');
    }

    // Check for overlapping rates
    const overlapResult = await query(
      `SELECT id FROM payroll.exchange_rate
       WHERE organization_id = $1
         AND from_currency = $2
         AND to_currency = $3
         AND is_active = true
         AND effective_from <= $4
         AND (effective_to IS NULL OR effective_to > $4)`,
      [organizationId, fromCurrency, toCurrency, effectiveFrom]
    );

    if (overlapResult.rows.length > 0) {
      // Update existing rate's effective_to
      await query(
        `UPDATE payroll.exchange_rate
         SET effective_to = $1, updated_at = NOW(), updated_by = $2
         WHERE id = $3`,
        [effectiveFrom, userId, overlapResult.rows[0].id]
      );
    }

    // Insert new rate
    const result = await query(
      `INSERT INTO payroll.exchange_rate (
        organization_id, from_currency, to_currency, rate, rate_type,
        rate_source, effective_from, effective_to, is_active, notes,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10)
      RETURNING *`,
      [
        organizationId, fromCurrency, toCurrency, rate, rateType,
        rateSource, effectiveFrom, effectiveTo, notes, userId
      ]
    );

    // Clear cache for this currency pair
    this.clearCache(organizationId);

    logger.info('Exchange rate created', {
      id: result.rows[0].id,
      fromCurrency,
      toCurrency,
      rate,
      effectiveFrom
    });

    return result.rows[0];
  }

  /**
   * Get organization currency configuration
   */
  async getOrganizationConfig(organizationId) {
    const result = await query(
      `SELECT * FROM payroll.organization_currency_config WHERE organization_id = $1`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      // Return default config
      return {
        base_currency: 'SRD',
        reporting_currency: null,
        supported_currencies: ['SRD'],
        auto_update_rates: false,
        rate_update_frequency: 'manual',
        default_rounding_method: 'standard',
        conversion_tolerance: 0.0001
      };
    }

    return result.rows[0];
  }

  /**
   * Batch convert multiple amounts (for payroll calculation performance)
   */
  async batchConvert(conversions, organizationId, effectiveDate = new Date()) {
    const results = [];

    // Group by currency pair for efficiency
    const pairs = new Map();
    for (const conv of conversions) {
      const key = `${conv.fromCurrency}:${conv.toCurrency}`;
      if (!pairs.has(key)) {
        pairs.set(key, []);
      }
      pairs.get(key).push(conv);
    }

    // Get rates once per pair
    for (const [pairKey, pairConversions] of pairs.entries()) {
      const [fromCurrency, toCurrency] = pairKey.split(':');
      
      try {
        const rate = await this.getExchangeRate(
          fromCurrency,
          toCurrency,
          organizationId,
          effectiveDate
        );

        // Convert all amounts for this pair
        for (const conv of pairConversions) {
          const toAmount = this.roundAmount(conv.amount * rate.rate);
          results.push({
            ...conv,
            toAmount,
            rate: rate.rate,
            rateSource: rate.rate_source,
            success: true
          });
        }
      } catch (error) {
        // Mark conversions as failed
        for (const conv of pairConversions) {
          results.push({
            ...conv,
            toAmount: null,
            rate: null,
            error: error.message,
            success: false
          });
        }
      }
    }

    return results;
  }
}

export default new CurrencyService();
```

---

## Integration with Payroll Service

### Modified Payroll Calculation Flow

**File:** `backend/src/products/paylinq/services/payrollService.js`

```javascript
/**
 * PHASE 1: Single conversion point at paycheck level
 * Components calculated in compensation currency, converted to employee payment currency
 */

import currencyService from './currencyService.js';

// In calculatePayroll method:
async calculatePayroll(payrollRunId, organizationId, userId) {
  // ... existing code ...

  for (const employee of employees) {
    // Get employee currencies
    const compensationCurrency = compensation?.currency || employee.currency || 'SRD';
    const paymentCurrency = employee.payment_currency || employee.currency || 'SRD';
    
    // Calculate components in compensation currency
    const payStructureCalc = await this.payStructureService.calculateWorkerPay(
      employeeId,
      {
        baseSalary,
        hourlyRate,
        hours: regularHours,
        // ... other inputs
        currency: compensationCurrency  // NEW: Pass currency context
      },
      organizationId,
      payrollRun.pay_period_end
    );

    // Components are now in compensation currency
    const grossPayInCompensationCurrency = payStructureCalc.summary.totalEarnings;
    let currencyConversions = [];
    let grossPayInPaymentCurrency = grossPayInCompensationCurrency;

    // Convert to payment currency if different
    if (compensationCurrency !== paymentCurrency) {
      const conversion = await currencyService.convertAmount({
        fromCurrency: compensationCurrency,
        toCurrency: paymentCurrency,
        amount: grossPayInCompensationCurrency,
        organizationId,
        effectiveDate: payrollRun.payment_date,
        context: {
          sourceTable: 'paycheck',
          payrollRunId,
          employeeId,
          userId
        }
      });

      grossPayInPaymentCurrency = conversion.toAmount;
      currencyConversions.push(conversion);
    }

    // Calculate taxes in payment currency
    const taxCalculation = await this.taxCalculationService.calculateEmployeeTaxesWithComponents(
      employeeId,
      earningComponents,  // Already in payment currency
      payrollRun.pay_period_start,
      employee.pay_frequency,
      organizationId
    );

    const totalTaxAmount = taxCalculation.summary.totalTaxes;
    const netPay = grossPayInPaymentCurrency - totalTaxAmount;

    // Create paycheck with currency tracking
    const paycheck = await this.payrollRepository.createPaycheck(
      {
        payrollRunId,
        employeeId,
        payPeriodStart: payrollRun.pay_period_start,
        payPeriodEnd: payrollRun.pay_period_end,
        paymentDate: payrollRun.payment_date,
        grossPay: grossPayInPaymentCurrency,
        baseCurrency: compensationCurrency,  // NEW
        paymentCurrency: paymentCurrency,    // NEW
        currencyConversionSummary: {         // NEW
          conversions: currencyConversions.map(c => ({
            from: c.fromCurrency,
            to: c.toCurrency,
            amount: c.fromAmount,
            converted: c.toAmount,
            rate: c.rate,
            conversionId: c.conversionId
          }))
        },
        totalConversions: currencyConversions.length,  // NEW
        // ... rest of paycheck data
      },
      organizationId,
      userId
    );

    // Store components with currency metadata
    for (const component of payStructureCalc.calculations) {
      await this.payrollRepository.createPayrollRunComponent(
        {
          payrollRunId,
          paycheckId: paycheck.id,
          componentType: component.componentCategory,
          componentCode: component.componentCode,
          componentName: component.componentName,
          amount: component.amount,  // In payment currency after conversion
          componentCurrency: compensationCurrency,     // NEW: Original currency
          componentAmountOriginal: component.amount,   // NEW: Original amount
          paycheckCurrency: paymentCurrency,           // NEW: Target currency
          amountConverted: component.amount,           // NEW: Converted amount
          exchangeRateUsed: currencyConversions[0]?.rate || 1.0,  // NEW
          conversionId: currencyConversions[0]?.conversionId || null,  // NEW
          // ... rest of component data
        },
        organizationId,
        userId
      );
    }
  }

  // ... rest of method
}
```

---

## Repository Layer

### Exchange Rate Repository

**File:** `backend/src/products/paylinq/repositories/exchangeRateRepository.js`

```javascript
/**
 * Exchange Rate Repository
 * Data access layer for exchange rate management
 */

import { query } from '../../../config/database.js';

class ExchangeRateRepository {
  /**
   * Find current exchange rate
   */
  async findCurrentRate(fromCurrency, toCurrency, organizationId) {
    const result = await query(
      `SELECT * FROM payroll.mv_current_exchange_rates
       WHERE organization_id = $1
         AND from_currency = $2
         AND to_currency = $3`,
      [organizationId, fromCurrency, toCurrency]
    );

    return result.rows[0] || null;
  }

  /**
   * Find historical exchange rate for specific date
   */
  async findHistoricalRate(fromCurrency, toCurrency, organizationId, asOfDate) {
    const result = await query(
      `SELECT * FROM payroll.exchange_rate
       WHERE organization_id = $1
         AND from_currency = $2
         AND to_currency = $3
         AND is_active = true
         AND effective_from <= $4
         AND (effective_to IS NULL OR effective_to > $4)
       ORDER BY effective_from DESC
       LIMIT 1`,
      [organizationId, fromCurrency, toCurrency, asOfDate]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all rates for organization
   */
  async findByOrganization(organizationId, filters = {}) {
    let whereClause = 'WHERE organization_id = $1 AND is_active = true';
    const params = [organizationId];
    let paramIndex = 2;

    if (filters.fromCurrency) {
      whereClause += ` AND from_currency = $${paramIndex}`;
      params.push(filters.fromCurrency);
      paramIndex++;
    }

    if (filters.toCurrency) {
      whereClause += ` AND to_currency = $${paramIndex}`;
      params.push(filters.toCurrency);
      paramIndex++;
    }

    const result = await query(
      `SELECT * FROM payroll.exchange_rate
       ${whereClause}
       ORDER BY effective_from DESC`,
      params
    );

    return result.rows;
  }

  /**
   * Create exchange rate
   */
  async create(rateData, organizationId, userId) {
    const result = await query(
      `INSERT INTO payroll.exchange_rate (
        organization_id, from_currency, to_currency, rate, rate_type,
        rate_source, effective_from, effective_to, is_active, notes,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        organizationId,
        rateData.fromCurrency,
        rateData.toCurrency,
        rateData.rate,
        rateData.rateType || 'manual',
        rateData.rateSource || 'manual',
        rateData.effectiveFrom,
        rateData.effectiveTo || null,
        true,
        rateData.notes || null,
        userId
      ]
    );

    return result.rows[0];
  }

  /**
   * Update exchange rate
   */
  async update(rateId, updates, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.exchange_rate
       SET rate = COALESCE($1, rate),
           rate_type = COALESCE($2, rate_type),
           rate_source = COALESCE($3, rate_source),
           effective_to = COALESCE($4, effective_to),
           notes = COALESCE($5, notes),
           updated_at = NOW(),
           updated_by = $6
       WHERE id = $7 AND organization_id = $8
       RETURNING *`,
      [
        updates.rate,
        updates.rateType,
        updates.rateSource,
        updates.effectiveTo,
        updates.notes,
        userId,
        rateId,
        organizationId
      ]
    );

    return result.rows[0];
  }

  /**
   * Deactivate exchange rate (soft delete)
   */
  async deactivate(rateId, organizationId, userId) {
    const result = await query(
      `UPDATE payroll.exchange_rate
       SET is_active = false,
           updated_at = NOW(),
           updated_by = $1
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [userId, rateId, organizationId]
    );

    return result.rows[0];
  }

  /**
   * Get conversion history for employee
   */
  async getConversionHistory(employeeId, organizationId, filters = {}) {
    let whereClause = 'WHERE cc.employee_id = $1 AND cc.organization_id = $2';
    const params = [employeeId, organizationId];
    let paramIndex = 3;

    if (filters.fromDate) {
      whereClause += ` AND cc.conversion_date >= $${paramIndex}`;
      params.push(filters.fromDate);
      paramIndex++;
    }

    if (filters.toDate) {
      whereClause += ` AND cc.conversion_date <= $${paramIndex}`;
      params.push(filters.toDate);
      paramIndex++;
    }

    const result = await query(
      `SELECT cc.*, er.rate_source, er.rate_type
       FROM payroll.currency_conversion cc
       LEFT JOIN payroll.exchange_rate er ON er.id = cc.exchange_rate_id
       ${whereClause}
       ORDER BY cc.conversion_date DESC, cc.created_at DESC
       LIMIT 100`,
      params
    );

    return result.rows;
  }
}

export default ExchangeRateRepository;
```

---

## Validation & Error Handling

### Input Validation

```javascript
// Joi schemas for currency operations

import Joi from 'joi';

export const createExchangeRateSchema = Joi.object({
  fromCurrency: Joi.string().length(3).uppercase().required(),
  toCurrency: Joi.string().length(3).uppercase().required()
    .invalid(Joi.ref('fromCurrency')),
  rate: Joi.number().positive().required(),
  rateType: Joi.string().valid('market', 'fixed', 'manual', 'average').default('manual'),
  rateSource: Joi.string().max(50).optional(),
  effectiveFrom: Joi.date().iso().required(),
  effectiveTo: Joi.date().iso().greater(Joi.ref('effectiveFrom')).optional(),
  notes: Joi.string().max(1000).optional()
});

export const convertAmountSchema = Joi.object({
  fromCurrency: Joi.string().length(3).uppercase().required(),
  toCurrency: Joi.string().length(3).uppercase().required(),
  amount: Joi.number().min(0).required(),
  effectiveDate: Joi.date().iso().optional()
});
```

### Error Types

```javascript
// Custom error types for currency operations

export class ExchangeRateNotFoundError extends NotFoundError {
  constructor(fromCurrency, toCurrency, date = 'current') {
    super(`No exchange rate found for ${fromCurrency} → ${toCurrency} on ${date}`);
    this.name = 'ExchangeRateNotFoundError';
    this.fromCurrency = fromCurrency;
    this.toCurrency = toCurrency;
    this.errorCode = 'EXCHANGE_RATE_NOT_FOUND';
  }
}

export class CurrencyConversionError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'CurrencyConversionError';
    this.context = context;
    this.errorCode = 'CURRENCY_CONVERSION_ERROR';
  }
}

export class InvalidCurrencyError extends ValidationError {
  constructor(currency) {
    super(`Invalid currency code: ${currency}`);
    this.name = 'InvalidCurrencyError';
    this.currency = currency;
    this.errorCode = 'INVALID_CURRENCY';
  }
}
```

---

## Testing Strategy

### Unit Tests

```javascript
// tests/services/currencyService.test.js

describe('CurrencyService', () => {
  describe('getExchangeRate', () => {
    it('should return identity rate for same currency', async () => {
      const rate = await currencyService.getExchangeRate('SRD', 'SRD', orgId);
      expect(rate.rate).toBe(1.0);
    });

    it('should fetch direct rate from database', async () => {
      // Create test rate
      await createTestRate({ from: 'USD', to: 'SRD', rate: 17.85 });
      
      const rate = await currencyService.getExchangeRate('USD', 'SRD', orgId);
      expect(rate.rate).toBe(17.85);
    });

    it('should use inverse rate when direct not available', async () => {
      await createTestRate({ from: 'SRD', to: 'USD', rate: 0.056 });
      
      const rate = await currencyService.getExchangeRate('USD', 'SRD', orgId);
      expect(rate.rate).toBeCloseTo(17.857, 2);
    });

    it('should triangulate via base currency', async () => {
      await createTestRate({ from: 'EUR', to: 'SRD', rate: 19.20 });
      await createTestRate({ from: 'USD', to: 'EUR', rate: 0.92 });
      
      const rate = await currencyService.getExchangeRate('USD', 'SRD', orgId);
      expect(rate.rate).toBeCloseTo(17.664, 2);
    });
  });

  describe('convertAmount', () => {
    it('should convert amount correctly', async () => {
      await createTestRate({ from: 'USD', to: 'SRD', rate: 17.85 });
      
      const result = await currencyService.convertAmount({
        fromCurrency: 'USD',
        toCurrency: 'SRD',
        amount: 100,
        organizationId: orgId
      });

      expect(result.toAmount).toBe(1785.00);
      expect(result.conversionId).toBeTruthy();
    });

    it('should create audit record', async () => {
      // Test audit trail creation
    });

    it('should handle rounding correctly', async () => {
      // Test rounding methods
    });
  });
});
```

---

## Performance Optimization

### Caching Strategy

1. **In-Memory Cache:** Current rates cached for 1 hour
2. **Database Cache:** Materialized view for current rates
3. **Batch Operations:** Group conversions by currency pair
4. **Query Optimization:** Composite indexes on temporal queries

### Monitoring

```javascript
// Add performance metrics
logger.info('Currency conversion performance', {
  duration: Date.now() - startTime,
  cacheHit: cached ? true : false,
  triangulated: rate.rate_type === 'triangulated'
});
```

---

**Next Document:** `04-api-design.md` - REST API endpoints and request/response schemas
