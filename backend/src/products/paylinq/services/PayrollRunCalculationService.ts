/**
 * PayrollRunCalculationService
 * 
 * Wet Loonbelasting Article 13.3 Compliance Service
 * Handles proper loontijdvak (wage period) determination and prorating of wage components
 * 
 * Key Responsibilities:
 * 1. Determine correct loontijdvak for each payroll run
 * 2. Prorate wages correctly based on actual work days in period
 * 3. Handle special cases (multiple runs in same period, short periods, etc.)
 * 4. Ensure tax calculations use correct period-based values
 * 
 * @module PayrollRunCalculationService
 */

import LoontijdvakService from './loontijdvakService.ts';
import logger from '../../../utils/logger.ts';
import { ValidationError } from '../../../middleware/errorHandler.ts';

class PayrollRunCalculationService {
  constructor(loontijdvakService = null) {
    this.loontijdvakService = loontijdvakService || new LoontijdvakService();
  }

  /**
   * Calculate loontijdvak-aware wage components for payroll run
   * Per Article 13.3: Proper period determination is critical for correct tax calculation
   * 
   * @param {Object} payrollRunData - Payroll run data
   * @param {Date} payrollRunData.payPeriodStart - Pay period start date
   * @param {Date} payrollRunData.payPeriodEnd - Pay period end date
   * @param {Date} payrollRunData.payDate - Actual pay date
   * @param {string} payrollRunData.configuredFrequency - Configured pay frequency (monthly, biweekly, weekly, etc.)
   * @param {Array<Object>} employeeComponents - Array of employee wage components
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Calculated components with loontijdvak metadata
   */
  async calculatePayrollRunComponents(payrollRunData, employeeComponents, organizationId) {
    try {
      logger.info('Starting loontijdvak-aware payroll run calculation', {
        payPeriodStart: payrollRunData.payPeriodStart,
        payPeriodEnd: payrollRunData.payPeriodEnd,
        payDate: payrollRunData.payDate,
        configuredFrequency: payrollRunData.configuredFrequency,
        employeeCount: employeeComponents.length,
        organizationId
      });

      // STEP 1: Determine loontijdvak for this payroll run
      const loontijdvak = await this.loontijdvakService.determineLoontijdvak(
        new Date(payrollRunData.payPeriodStart),
        new Date(payrollRunData.payPeriodEnd),
        new Date(payrollRunData.payDate),
        payrollRunData.configuredFrequency
      );

      logger.info('Loontijdvak determined', {
        loontijdvak: loontijdvak.type,
        reason: loontijdvak.reason,
        organizationId
      });

      // STEP 2: Calculate prorating factor if needed
      const proratingMetadata = await this._calculateProratingFactor(
        loontijdvak,
        new Date(payrollRunData.payPeriodStart),
        new Date(payrollRunData.payPeriodEnd)
      );

      // STEP 3: Process each employee's components
      const processedComponents = await Promise.all(
        employeeComponents.map(employee => 
          this._processEmployeeComponents(
            employee,
            loontijdvak,
            proratingMetadata,
            organizationId
          )
        )
      );

      logger.info('Payroll run components calculated', {
        loontijdvak: loontijdvak.type,
        employeeCount: processedComponents.length,
        totalGrossPay: processedComponents.reduce((sum, e) => sum + e.grossPay, 0),
        organizationId
      });

      return {
        loontijdvak: loontijdvak.type,
        loontijdvakMetadata: loontijdvak,
        proratingMetadata,
        employeeComponents: processedComponents,
        calculatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error calculating payroll run components', {
        error: error.message,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Calculate prorating factor for partial periods
   * Per Article 13.3: Wages must be prorated if employment period differs from standard loontijdvak
   * 
   * @param {Object} loontijdvak - Determined loontijdvak
   * @param {Date} actualPeriodStart - Actual work period start
   * @param {Date} actualPeriodEnd - Actual work period end
   * @returns {Promise<Object>} Prorating metadata
   * @private
   */
  async _calculateProratingFactor(loontijdvak, actualPeriodStart, actualPeriodEnd) {
    // Get standard period days for this loontijdvak
    const standardDays = this.loontijdvakService.getStandardPeriodDays(loontijdvak.type);
    
    // Calculate actual working days in period
    const actualDays = await this._calculateWorkingDays(actualPeriodStart, actualPeriodEnd);

    // Prorating factor = actual days / standard days
    const proratingFactor = standardDays > 0 ? actualDays / standardDays : 1.0;

    const needsProrating = Math.abs(proratingFactor - 1.0) > 0.001; // Allow for rounding

    logger.info('Prorating calculation', {
      loontijdvak: loontijdvak.type,
      standardDays,
      actualDays,
      proratingFactor: proratingFactor.toFixed(4),
      needsProrating
    });

    return {
      standardDays,
      actualDays,
      proratingFactor,
      needsProrating,
      reason: needsProrating 
        ? `Actual period (${actualDays} days) differs from standard ${loontijdvak.type} period (${standardDays} days)`
        : 'No prorating needed - full period worked'
    };
  }

  /**
   * Calculate working days between two dates
   * For now, uses calendar days. Can be enhanced to exclude weekends/holidays
   * 
   * @param {Date} startDate - Start date (inclusive)
   * @param {Date} endDate - End date (inclusive)
   * @returns {Promise<number>} Number of working days
   * @private
   */
  async _calculateWorkingDays(startDate, endDate) {
    // MVP: Use calendar days (inclusive)
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive
    
    return diffDays;
  }

  /**
   * Process individual employee's wage components with loontijdvak awareness
   * 
   * @param {Object} employee - Employee data with components
   * @param {Object} loontijdvak - Determined loontijdvak
   * @param {Object} proratingMetadata - Prorating metadata
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Processed employee components
   * @private
   */
  async _processEmployeeComponents(employee, loontijdvak, proratingMetadata, organizationId) {
    try {
      const components = employee.components || [];
      
      // Process each component with prorating if needed
      const processedComponents = components.map(component => {
        const originalAmount = component.amount;
        
        // Apply prorating if needed
        let finalAmount = originalAmount;
        let wasProrated = false;
        
        if (proratingMetadata.needsProrating && component.shouldProrate !== false) {
          finalAmount = originalAmount * proratingMetadata.proratingFactor;
          wasProrated = true;
        }

        return {
          ...component,
          originalAmount,
          finalAmount: Math.round(finalAmount * 100) / 100, // Round to 2 decimals
          wasProrated,
          proratingFactor: wasProrated ? proratingMetadata.proratingFactor : 1.0,
          loontijdvak: loontijdvak.type
        };
      });

      // Calculate totals
      const grossPay = processedComponents
        .filter(c => c.componentType === 'earning')
        .reduce((sum, c) => sum + c.finalAmount, 0);

      const deductions = processedComponents
        .filter(c => c.componentType === 'deduction')
        .reduce((sum, c) => sum + c.finalAmount, 0);

      return {
        employeeRecordId: employee.employeeRecordId,
        employeeName: employee.employeeName,
        employeeNumber: employee.employeeNumber,
        components: processedComponents,
        grossPay: Math.round(grossPay * 100) / 100,
        deductions: Math.round(deductions * 100) / 100,
        netPay: Math.round((grossPay - deductions) * 100) / 100,
        loontijdvak: loontijdvak.type,
        wasProrated: proratingMetadata.needsProrating
      };
    } catch (error) {
      logger.error('Error processing employee components', {
        error: error.message,
        employeeRecordId: employee.employeeRecordId,
        organizationId
      });
      throw error;
    }
  }

  /**
   * Validate payroll run data for loontijdvak calculations
   * 
   * @param {Object} payrollRunData - Payroll run data
   * @throws {ValidationError} If validation fails
   */
  validatePayrollRunData(payrollRunData) {
    if (!payrollRunData.payPeriodStart) {
      throw new ValidationError('Pay period start date is required');
    }

    if (!payrollRunData.payPeriodEnd) {
      throw new ValidationError('Pay period end date is required');
    }

    if (!payrollRunData.payDate) {
      throw new ValidationError('Pay date is required');
    }

    if (!payrollRunData.configuredFrequency) {
      throw new ValidationError('Configured pay frequency is required');
    }

    const startDate = new Date(payrollRunData.payPeriodStart);
    const endDate = new Date(payrollRunData.payPeriodEnd);

    if (isNaN(startDate.getTime())) {
      throw new ValidationError('Invalid pay period start date');
    }

    if (isNaN(endDate.getTime())) {
      throw new ValidationError('Invalid pay period end date');
    }

    if (startDate > endDate) {
      throw new ValidationError('Pay period start date must be before end date');
    }
  }
}

export default PayrollRunCalculationService;
