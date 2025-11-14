import { pool } from '../../../config/database.js';
import logger from '../../../utils/logger.js';

/**
 * Repository for exchange rate database operations
 */
class ExchangeRateRepository {
  /**
   * Get current exchange rate for a currency pair
   * @param {string} organizationId - Organization ID
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @param {Date} effectiveDate - Optional effective date (defaults to now)
   * @returns {Object|null} Exchange rate or null if not found
   */
  async getCurrentRate(organizationId, fromCurrency, toCurrency, effectiveDate = new Date()) {
    const query = `
      SELECT 
        id, organization_id, from_currency, to_currency, rate,
        effective_from, effective_to, source, metadata,
        created_at, updated_at, created_by, updated_by
      FROM payroll.exchange_rate
      WHERE organization_id = $1
        AND from_currency = $2
        AND to_currency = $3
        AND effective_from <= $4
        AND (effective_to IS NULL OR effective_to > $4)
      ORDER BY effective_from DESC
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [organizationId, fromCurrency, toCurrency, effectiveDate]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting current exchange rate', { organizationId, fromCurrency, toCurrency, error });
      throw error;
    }
  }

  /**
   * Get all active exchange rates for an organization
   * @param {string} organizationId - Organization ID
   * @returns {Array} Array of active exchange rates
   */
  async getActiveRates(organizationId) {
    const query = `
      SELECT 
        id, organization_id, from_currency, to_currency, rate,
        effective_from, effective_to, source, metadata,
        created_at, updated_at
      FROM payroll.exchange_rate
      WHERE organization_id = $1
        AND effective_to IS NULL
      ORDER BY from_currency, to_currency
    `;

    try {
      const result = await pool.query(query, [organizationId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting active exchange rates', { organizationId, error });
      throw error;
    }
  }

  /**
   * Get historical rates for a currency pair
   * @param {string} organizationId - Organization ID
   * @param {string} fromCurrency - Source currency code
   * @param {string} toCurrency - Target currency code
   * @param {Object} options - Query options
   * @returns {Array} Array of historical rates
   */
  async getHistoricalRates(organizationId, fromCurrency, toCurrency, options = {}) {
    const { startDate, endDate, limit = 100, offset = 0 } = options;

    let query = `
      SELECT 
        id, organization_id, from_currency, to_currency, rate,
        effective_from, effective_to, source, metadata,
        created_at, updated_at
      FROM payroll.exchange_rate
      WHERE organization_id = $1
        AND from_currency = $2
        AND to_currency = $3
    `;

    const params = [organizationId, fromCurrency, toCurrency];
    let paramIndex = 4;

    if (startDate) {
      query += ` AND effective_from >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND effective_from <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY effective_from DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting historical rates', { organizationId, fromCurrency, toCurrency, error });
      throw error;
    }
  }

  /**
   * Create a new exchange rate
   * @param {Object} rateData - Exchange rate data
   * @returns {Object} Created exchange rate
   */
  async createRate(rateData) {
    const {
      organizationId,
      fromCurrency,
      toCurrency,
      rate,
      effectiveFrom = new Date(),
      effectiveTo = null,
      source = 'manual',
      metadata = {},
      createdBy
    } = rateData;

    const query = `
      INSERT INTO payroll.exchange_rate (
        organization_id, from_currency, to_currency, rate,
        effective_from, effective_to, source, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id, organization_id, from_currency, to_currency, rate,
        effective_from, effective_to, source, metadata,
        created_at, updated_at, created_by
    `;

    try {
      const result = await pool.query(query, [
        organizationId, fromCurrency, toCurrency, rate,
        effectiveFrom, effectiveTo, source, metadata, createdBy
      ]);
      
      logger.info('Exchange rate created', { 
        id: result.rows[0].id,
        fromCurrency, 
        toCurrency, 
        rate 
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating exchange rate', { rateData, error });
      throw error;
    }
  }

  /**
   * Update an existing exchange rate
   * @param {number} id - Rate ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated exchange rate
   */
  async updateRate(id, updateData) {
    const { rate, effectiveTo, metadata, updatedBy } = updateData;

    const query = `
      UPDATE payroll.exchange_rate
      SET 
        rate = COALESCE($1, rate),
        effective_to = COALESCE($2, effective_to),
        metadata = COALESCE($3, metadata),
        updated_by = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING 
        id, organization_id, from_currency, to_currency, rate,
        effective_from, effective_to, source, metadata,
        created_at, updated_at
    `;

    try {
      const result = await pool.query(query, [rate, effectiveTo, metadata, updatedBy, id]);
      
      if (result.rows.length === 0) {
        throw new Error(`Exchange rate with id ${id} not found`);
      }

      logger.info('Exchange rate updated', { id, updateData });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating exchange rate', { id, updateData, error });
      throw error;
    }
  }

  /**
   * Delete an exchange rate (soft delete by setting effective_to)
   * @param {number} id - Rate ID
   * @param {string} userId - User performing the deletion
   * @returns {Object} Deleted exchange rate
   */
  async deleteRate(id, userId) {
    const query = `
      UPDATE payroll.exchange_rate
      SET 
        effective_to = NOW(),
        updated_by = $1,
        updated_at = NOW()
      WHERE id = $2
        AND effective_to IS NULL
      RETURNING 
        id, organization_id, from_currency, to_currency, rate,
        effective_from, effective_to
    `;

    try {
      const result = await pool.query(query, [userId, id]);
      
      if (result.rows.length === 0) {
        throw new Error(`Active exchange rate with id ${id} not found`);
      }

      logger.info('Exchange rate deleted', { id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting exchange rate', { id, error });
      throw error;
    }
  }

  /**
   * Bulk create exchange rates
   * @param {Array} rates - Array of rate data objects
   * @returns {Array} Created exchange rates
   */
  async bulkCreateRates(rates) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const createdRates = [];
      for (const rateData of rates) {
        const query = `
          INSERT INTO payroll.exchange_rate (
            organization_id, from_currency, to_currency, rate,
            effective_from, effective_to, source, metadata, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING 
            id, organization_id, from_currency, to_currency, rate,
            effective_from, effective_to, source, created_at
        `;

        const result = await client.query(query, [
          rateData.organizationId,
          rateData.fromCurrency,
          rateData.toCurrency,
          rateData.rate,
          rateData.effectiveFrom || new Date(),
          rateData.effectiveTo || null,
          rateData.source || 'manual',
          rateData.metadata || {},
          rateData.createdBy
        ]);

        createdRates.push(result.rows[0]);
      }

      await client.query('COMMIT');
      logger.info('Bulk exchange rates created', { count: createdRates.length });
      return createdRates;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error bulk creating exchange rates', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Log a currency conversion
   * @param {Object} conversionData - Conversion data
   * @returns {Object} Created conversion record
   */
  async logConversion(conversionData) {
    const {
      organizationId,
      fromCurrency,
      toCurrency,
      fromAmount,
      toAmount,
      exchangeRateId,
      rateUsed,
      referenceType,
      referenceId,
      metadata = {},
      createdBy
    } = conversionData;

    const query = `
      INSERT INTO payroll.currency_conversion (
        organization_id, from_currency, to_currency, from_amount, to_amount,
        exchange_rate_id, rate_used, reference_type, reference_id,
        metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        id, organization_id, from_currency, to_currency, from_amount, to_amount,
        rate_used, reference_type, reference_id, conversion_date
    `;

    try {
      const result = await pool.query(query, [
        organizationId, fromCurrency, toCurrency, fromAmount, toAmount,
        exchangeRateId, rateUsed, referenceType, referenceId,
        metadata, createdBy
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('Error logging currency conversion', { conversionData, error });
      throw error;
    }
  }

  /**
   * Get conversion history for a reference
   * @param {string} referenceType - Type of reference (paycheck, component, etc.)
   * @param {number|string} referenceId - Reference ID
   * @returns {Array} Array of conversions
   */
  async getConversionHistory(referenceType, referenceId) {
    const query = `
      SELECT 
        cc.id, cc.from_currency, cc.to_currency, cc.from_amount, cc.to_amount,
        cc.rate_used, cc.conversion_date, cc.metadata,
        er.effective_from as rate_effective_from, er.source as rate_source
      FROM payroll.currency_conversion cc
      LEFT JOIN payroll.exchange_rate er ON cc.exchange_rate_id = er.id
      WHERE cc.reference_type = $1
        AND cc.reference_id = $2
      ORDER BY cc.conversion_date DESC
    `;

    try {
      const result = await pool.query(query, [referenceType, referenceId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting conversion history', { referenceType, referenceId, error });
      throw error;
    }
  }
}

export default ExchangeRateRepository;
