/**
 * Pay Period Service
 * Handles pay period configuration and calculations
 */

import { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError } from '../../../middleware/errorHandler.js';
import Joi from 'joi';

class PayPeriodService {
  /**
   * @param {Object} database - Optional database instance for testing
   */
  constructor(database = null) {
    this.db = database || { query };
  }

  // Validation schemas
  payPeriodConfigSchema = Joi.object({
    payFrequency: Joi.string().valid('weekly', 'bi-weekly', 'semi-monthly', 'monthly').required(),
    periodStartDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    payDayOffset: Joi.number().integer().min(0).max(30).default(0),
    firstPayDay: Joi.number().integer().min(1).max(31).allow(null),
    secondPayDay: Joi.number().integer().min(1).max(31).allow(null),
    notes: Joi.string().allow(null, ''),
  });

  holidaySchema = Joi.object({
    holidayName: Joi.string().max(100).required(),
    holidayDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    isRecurring: Joi.boolean().default(false),
    affectsPaySchedule: Joi.boolean().default(true),
    affectsWorkSchedule: Joi.boolean().default(true),
  });

  /**
   * Get pay period configuration
   */
  async getPayPeriodConfig(organizationId) {
    try {
      const result = await this.db.query(
        `SELECT 
           id,
           pay_frequency as "payFrequency",
           period_start_date as "periodStartDate",
           pay_day_offset as "payDayOffset",
           first_pay_day as "firstPayDay",
           second_pay_day as "secondPayDay",
           is_active as "isActive",
           notes,
           created_at as "createdAt",
           updated_at as "updatedAt"
         FROM payroll.pay_period_config
         WHERE organization_id = $1 AND is_active = true`,
        [organizationId],
        organizationId,
        { operation: 'SELECT', table: 'pay_period_config' }
      );

      return result.rows[0] || null;
    } catch (err) {
      logger.error('Error fetching pay period config', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Create or update pay period configuration
   */
  async savePayPeriodConfig(data, organizationId, userId) {
    const { error, value } = this.payPeriodConfigSchema.validate(data);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      // Check if config exists
      const existing = await this.getPayPeriodConfig(organizationId);

      if (existing) {
        // Update existing
        const result = await this.db.query(
          `UPDATE payroll.pay_period_config
           SET pay_frequency = $1,
               period_start_date = $2,
               pay_day_offset = $3,
               first_pay_day = $4,
               second_pay_day = $5,
               notes = $6,
               updated_at = NOW(),
               updated_by = $7
           WHERE organization_id = $8 AND is_active = true
           RETURNING 
             id,
             pay_frequency as "payFrequency",
             period_start_date as "periodStartDate",
             pay_day_offset as "payDayOffset",
             first_pay_day as "firstPayDay",
             second_pay_day as "secondPayDay",
             is_active as "isActive",
             notes,
             created_at as "createdAt",
             updated_at as "updatedAt"`,
          [
            value.payFrequency,
            value.periodStartDate,
            value.payDayOffset,
            value.firstPayDay,
            value.secondPayDay,
            value.notes,
            userId,
            organizationId
          ],
          organizationId,
          { operation: 'UPDATE', table: 'pay_period_config' }
        );

        logger.info('Pay period config updated', { organizationId, configId: result.rows[0].id });
        return result.rows[0];
      } else {
        // Create new
        const result = await this.db.query(
          `INSERT INTO payroll.pay_period_config (
             organization_id,
             pay_frequency,
             period_start_date,
             pay_day_offset,
             first_pay_day,
             second_pay_day,
             notes,
             created_by,
             updated_by
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
           RETURNING 
             id,
             pay_frequency as "payFrequency",
             period_start_date as "periodStartDate",
             pay_day_offset as "payDayOffset",
             first_pay_day as "firstPayDay",
             second_pay_day as "secondPayDay",
             is_active as "isActive",
             notes,
             created_at as "createdAt",
             updated_at as "updatedAt"`,
          [
            organizationId,
            value.payFrequency,
            value.periodStartDate,
            value.payDayOffset,
            value.firstPayDay,
            value.secondPayDay,
            value.notes,
            userId
          ],
          organizationId,
          { operation: 'INSERT', table: 'pay_period_config' }
        );

        logger.info('Pay period config created', { organizationId, configId: result.rows[0].id });
        return result.rows[0];
      }
    } catch (err) {
      logger.error('Error saving pay period config', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Calculate current pay period based on configuration
   */
  async getCurrentPayPeriod(organizationId) {
    const config = await this.getPayPeriodConfig(organizationId);
    if (!config) {
      throw new NotFoundError('Pay period configuration not found');
    }

    const today = new Date();
    const startDate = new Date(config.periodStartDate);
    
    return this.calculatePayPeriod(config, today, startDate);
  }

  /**
   * Calculate next pay period
   */
  async getNextPayPeriod(organizationId) {
    const current = await this.getCurrentPayPeriod(organizationId);
    const config = await this.getPayPeriodConfig(organizationId);
    
    // Parse dates with time component to avoid timezone shift issues
    const nextPeriodStart = this.addDays(new Date(current.periodEnd + 'T12:00:00'), 1);
    const startDate = new Date(config.periodStartDate + 'T12:00:00');
    
    return this.calculatePayPeriod(config, nextPeriodStart, startDate);
  }

  /**
   * Calculate pay period for a given date
   */
  calculatePayPeriod(config, targetDate, anchorDate) {
    const { payFrequency, payDayOffset } = config;
    let periodStart, periodEnd;

    switch (payFrequency) {
      case 'weekly': {
        const daysSinceAnchor = Math.floor((targetDate - anchorDate) / (1000 * 60 * 60 * 24));
        const weeksSinceAnchor = Math.floor(daysSinceAnchor / 7);
        periodStart = this.addDays(anchorDate, weeksSinceAnchor * 7);
        periodEnd = this.addDays(periodStart, 6);
        break;
      }

      case 'bi-weekly': {
        const daysSinceAnchor = Math.floor((targetDate - anchorDate) / (1000 * 60 * 60 * 24));
        const biWeeksSinceAnchor = Math.floor(daysSinceAnchor / 14);
        periodStart = this.addDays(anchorDate, biWeeksSinceAnchor * 14);
        periodEnd = this.addDays(periodStart, 13);
        break;
      }

      case 'semi-monthly': {
        const day = targetDate.getDate();
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        
        if (day <= 15) {
          periodStart = new Date(year, month, 1);
          periodEnd = new Date(year, month, 15);
        } else {
          periodStart = new Date(year, month, 16);
          periodEnd = new Date(year, month + 1, 0); // Last day of month
        }
        break;
      }

      case 'monthly': {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        periodStart = new Date(year, month, 1);
        periodEnd = new Date(year, month + 1, 0); // Last day of month
        break;
      }

      default:
        throw new ValidationError(`Invalid pay frequency: ${payFrequency}`);
    }

    const payDate = this.addDays(periodEnd, payDayOffset);

    return {
      periodStart: this.formatDate(periodStart),
      periodEnd: this.formatDate(periodEnd),
      payDate: this.formatDate(payDate),
      frequency: payFrequency,
    };
  }

  /**
   * Get company holidays
   */
  async getHolidays(organizationId, year = null) {
    try {
      let sql = `
        SELECT 
          id,
          holiday_name as "holidayName",
          holiday_date as "holidayDate",
          is_recurring as "isRecurring",
          affects_pay_schedule as "affectsPaySchedule",
          affects_work_schedule as "affectsWorkSchedule",
          is_active as "isActive",
          created_at as "createdAt"
        FROM payroll.company_holiday
        WHERE organization_id = $1 AND is_active = true
      `;
      
      const params = [organizationId];
      
      if (year) {
        sql += ` AND EXTRACT(YEAR FROM holiday_date) = $2`;
        params.push(year);
      }
      
      sql += ` ORDER BY holiday_date ASC`;

      const result = await this.db.query(sql, params, organizationId, { operation: 'SELECT', table: 'company_holiday' });
      
      return result.rows;
    } catch (err) {
      logger.error('Error fetching holidays', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Create company holiday
   */
  async createHoliday(data, organizationId, userId) {
    const { error, value } = this.holidaySchema.validate(data);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    try {
      const result = await this.db.query(
        `INSERT INTO payroll.company_holiday (
           organization_id,
           holiday_name,
           holiday_date,
           is_recurring,
           affects_pay_schedule,
           affects_work_schedule,
           created_by,
           updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
         RETURNING 
           id,
           holiday_name as "holidayName",
           holiday_date as "holidayDate",
           is_recurring as "isRecurring",
           affects_pay_schedule as "affectsPaySchedule",
           affects_work_schedule as "affectsWorkSchedule",
           is_active as "isActive",
           created_at as "createdAt"`,
        [
          organizationId,
          value.holidayName,
          value.holidayDate,
          value.isRecurring,
          value.affectsPaySchedule,
          value.affectsWorkSchedule,
          userId
        ],
        organizationId,
        { operation: 'INSERT', table: 'company_holiday' }
      );

      logger.info('Holiday created', { organizationId, holidayId: result.rows[0].id });
      return result.rows[0];
    } catch (err) {
      logger.error('Error creating holiday', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Delete company holiday
   */
  async deleteHoliday(holidayId, organizationId) {
    try {
      const result = await this.db.query(
        `UPDATE payroll.company_holiday
         SET is_active = false, updated_at = NOW()
         WHERE id = $1 AND organization_id = $2
         RETURNING id`,
        [holidayId, organizationId],
        organizationId,
        { operation: 'UPDATE', table: 'company_holiday' }
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Holiday not found');
      }

      logger.info('Holiday deleted', { organizationId, holidayId });
      return { success: true };
    } catch (err) {
      logger.error('Error deleting holiday', { error: err.message, organizationId, holidayId });
      throw err;
    }
  }

  // Helper methods
  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  formatDate(date) {
    return date.toISOString().split('T')[0];
  }
}

export default PayPeriodService;
