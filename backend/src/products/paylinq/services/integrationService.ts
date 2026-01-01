/**
 * Paylinq Integration Service
 * Handles cross-product integration from Nexus HRIS and ScheduleHub
 * Direct service-to-service calls for monolithic architecture
 */

import pool, { query } from '../../../config/database.js';
import logger from '../../../utils/logger.js';
import integrationErrorHandler from '../../../shared/utils/integrationErrorHandler.js';
import PayrollRepository from '../repositories/payrollRepository.js';

class PaylinqIntegrationService {
  
  errorHandler: any;

  logger: any;

  payrollRepository: any;

  /**
   * Constructor with dependency injection
   * @param {PayrollRepository} payrollRepository - Payroll repository instance
   * @param {Object} loggerInstance - Logger instance
   * @param {Object} errorHandlerInstance - Error handler instance
   */
  constructor(payrollRepository = null, loggerInstance = null, errorHandlerInstance = null) {
    this.payrollRepository = payrollRepository || new PayrollRepository();
    this.logger = loggerInstance || logger;
    this.errorHandler = errorHandlerInstance || integrationErrorHandler;
  }

  /**
   * CROSS-PRODUCT INTEGRATION: Nexus → Paylinq (with error handling)
   * Set up payroll for employee when contract is activated in Nexus
   * Wraps setupPayrollFromNexusContractInternal with retry and circuit breaker
   * 
   * @param {Object} contractData - Contract data from Nexus
   * @param {string} createdBy - UUID of user creating the record
   * @returns {Promise<Object>} Result with success flag and data
   */
  async setupPayrollFromNexusContract(contractData, createdBy) {
    const context = this.errorHandler.createContext({
      integration: 'nexus-to-paylinq-payroll',
      employeeId: contractData.employeeId,
      contractId: contractData.contractId,
      organizationId: contractData.organizationId
    });

    return this.errorHandler.executeNonBlocking(
      'nexus-to-paylinq-payroll',
      () => this.setupPayrollFromNexusContractInternal(contractData, createdBy),
      context
    );
  }

  /**
   * CROSS-PRODUCT INTEGRATION: Nexus → Paylinq (Internal implementation)
   * Set up payroll for employee when contract is activated in Nexus
   * Called directly by Nexus contractService when contract status changes to 'active'
   * 
   * @param {Object} contractData - Contract data from Nexus
   * @param {string} contractData.employeeId - Employee UUID from hris.employee
   * @param {string} contractData.contractId - Contract UUID from hris.contract
   * @param {string} contractData.organizationId - Organization UUID
   * @param {Object} contractData.employee - Employee details from Nexus
   * @param {number} contractData.salary - Salary amount
   * @param {string} contractData.currency - Currency code (USD, EUR, etc.)
   * @param {string} contractData.salaryFrequency - Pay frequency (monthly, biweekly, etc.)
   * @param {Date} contractData.startDate - Contract start date
   * @param {string} contractData.jobTitle - Job title
   * @param {string} contractData.employmentType - Employment type (full_time, part_time, etc.)
   * @param {string} createdBy - UUID of user creating the record
   * @returns {Promise<Object>} Updated payroll records
   */
  async updatePayrollFromNexusContractInternal(contractData, updatedBy) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        employeeId,
        contractId,
        organizationId,
        employee,
        salary,
        currency,
        salaryFrequency,
        startDate,
        jobTitle,
        employmentType
      } = contractData;

      this.logger.info('[Paylinq] Setting up payroll from Nexus contract', {
        employeeId,
        contractId,
        organizationId
      });

      // Check if employee already has payroll config
      const existingRecord = await client.query(
        `SELECT epc.id, e.id as employee_id 
         FROM payroll.employee_payroll_config epc
         JOIN hris.employee e ON e.id = epc.employee_id
         WHERE epc.organization_id = $1 
         AND (e.id = $2 OR e.employee_number = $3)
         AND epc.deleted_at IS NULL
         LIMIT 1`,
        [organizationId, employeeId, employee.employeeNumber]
      );

      let employeePayrollConfigId;

      if (existingRecord.rows.length > 0) {
        // Update existing payroll config
        employeePayrollConfigId = existingRecord.rows[0].id;
        
        await client.query(
          `UPDATE payroll.employee_payroll_config 
           SET pay_frequency = $1,
               currency = $2,
               updated_at = NOW(),
               updated_by = $3
           WHERE id = $4`,
          [
            this.mapSalaryFrequency(salaryFrequency),
            currency || 'USD',
            createdBy,
            employeePayrollConfigId
          ]
        );

        this.logger.info('[Paylinq] Updated existing employee payroll config', { employeePayrollConfigId });
      } else {
        // Create new employee payroll config
        const employeePayrollConfigResult = await client.query(
          `INSERT INTO payroll.employee_payroll_config (
            organization_id,
            employee_id,
            pay_frequency,
            payment_method,
            currency,
            tax_filing_status,
            tax_allowances,
            additional_withholding,
            payroll_start_date,
            created_at,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
          RETURNING *`,
          [
            organizationId,
            employeeId,
            this.mapSalaryFrequency(salaryFrequency),
            'direct_deposit', // Default payment method
            currency || 'USD',
            'single', // Default tax status
            0, // Default allowances
            0, // Default additional withholding
            new Date().toISOString().split('T')[0], // payroll_start_date
            createdBy
          ]
        );

        employeePayrollConfigId = employeePayrollConfigResult.rows[0].id;
        this.logger.info('[Paylinq] Created new employee payroll config', { employeePayrollConfigId });
      }

      // Create or update compensation record
      // End any previous current compensation
      await client.query(
        `UPDATE payroll.compensation 
         SET is_current = false,
             effective_to = $1,
             updated_at = NOW()
         WHERE employee_id = $2 
         AND is_current = true
         AND deleted_at IS NULL`,
        [startDate, employeeId]
      );

      // Determine compensation type based on employment type and salary frequency
      const compensationType = this.determineCompensationType(employmentType, salaryFrequency);
      const overtimeRate = 1.5; // Standard overtime multiplier

      const compensationResult = await client.query(
        `INSERT INTO payroll.compensation (
          organization_id,
          employee_id,
          compensation_type,
          amount,
          overtime_rate,
          effective_from,
          is_current,
          currency,
          created_at,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW(), $8)
        RETURNING *`,
        [
          organizationId,
          employeeId,
          compensationType,
          salary, // amount is the single source of truth
          overtimeRate,
          startDate,
          currency || 'USD',
          createdBy
        ]
      );

      const compensation = compensationResult.rows[0];
      this.logger.info('[Paylinq] Created compensation record', {
        compensationId: compensation.id,
        type: compensationType,
        amount: salary
      });

      await client.query('COMMIT');

      return {
        employeePayrollConfigId,
        compensation,
        message: 'Payroll successfully set up from Nexus contract'
      };

    } catch (_error) {
      await client.query('ROLLBACK');
      this.logger.error('[Paylinq] Error setting up payroll from Nexus contract', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * CROSS-PRODUCT INTEGRATION: Nexus → Paylinq (with error handling)
   * Update payroll when benefits enrollment is created/updated in Nexus
   * Wraps addBenefitsDeductionFromNexusInternal with retry and circuit breaker
   * 
   * @param {Object} enrollmentData - Benefits enrollment data from Nexus
   * @param {string} createdBy - UUID of user creating the deduction
   * @returns {Promise<Object>} Result with success flag and data
   */
  async addBenefitsDeductionFromNexus(enrollmentData, createdBy) {
    const context = this.errorHandler.createContext({
      integration: 'nexus-to-paylinq-benefits',
      employeeId: enrollmentData.employeeId,
      enrollmentId: enrollmentData.enrollmentId,
      organizationId: enrollmentData.organizationId
    });

    return this.errorHandler.executeNonBlocking(
      'nexus-to-paylinq-benefits',
      () => this.addBenefitsDeductionFromNexusInternal(enrollmentData, createdBy),
      context
    );
  }

  /**
   * CROSS-PRODUCT INTEGRATION: Nexus → Paylinq (Internal implementation)
   * Update payroll when benefits enrollment is created/updated in Nexus
   * 
   * @param {Object} enrollmentData - Benefits enrollment data from Nexus
   * @param {string} enrollmentData.employeeId - Employee UUID
   * @param {string} enrollmentData.enrollmentId - Enrollment UUID from hris.employee_benefit_enrollment
   * @param {string} enrollmentData.organizationId - Organization UUID
   * @param {string} enrollmentData.planName - Benefits plan name
   * @param {number} enrollmentData.employeeContribution - Employee's monthly contribution
   * @param {Date} enrollmentData.startDate - Coverage start date
   * @param {string} createdBy - UUID of user creating the deduction
   * @returns {Promise<Object>} Created deduction record
   */
  async addBenefitsDeductionFromNexusInternal(enrollmentData, createdBy) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        employeeId,
        enrollmentId,
        organizationId,
        planName,
        employeeContribution,
        startDate
      } = enrollmentData;

      this.logger.info('[Paylinq] Adding benefits deduction from Nexus', {
        employeeId,
        enrollmentId,
        amount: employeeContribution
      });

      // Find employee in HRIS (payroll config is optional)
      const employeeResult = await client.query(
        `SELECT id FROM hris.employee 
         WHERE organization_id = $1 
         AND id = $2 
         AND deleted_at IS NULL
         LIMIT 1`,
        [organizationId, employeeId]
      );

      if (employeeResult.rows.length === 0) {
        throw new Error(`Employee ${employeeId} not found in HRIS system`);
      }

      // Check if deduction already exists for this enrollment
      const existingDeduction = await client.query(
        `SELECT id FROM payroll.employee_deduction 
         WHERE employee_id = $1 
         AND source_reference_id = $2 
         AND deleted_at IS NULL`,
        [employeeId, enrollmentId]
      );

      if (existingDeduction.rows.length > 0) {
        this.logger.warn('[Paylinq] Deduction already exists for this enrollment', {
          enrollmentId
        });
        await client.query('COMMIT');
        return { deductionId: existingDeduction.rows[0].id, message: 'Deduction already exists' };
      }

      // Create deduction record
      const deductionResult = await client.query(
        `INSERT INTO payroll.employee_deduction (
          organization_id,
          employee_id,
          deduction_name,
          deduction_code,
          deduction_type,
          calculation_type,
          deduction_amount,
          frequency,
          effective_from,
          is_pre_tax,
          is_active,
          source_system,
          source_reference_id,
          notes,
          created_at,
          created_by
        ) VALUES ($1, $2, $3, $4, 'health_insurance', 'fixed_amount', $5, 'per_pay_period', $6, true, true, 'nexus', $7, $8, NOW(), $9)
        RETURNING *`,
        [
          organizationId,
          employeeId,
          `Benefits: ${planName}`,
          `BEN-${enrollmentId.substring(0, 8)}`, // Generate deduction code
          employeeContribution,
          startDate,
          enrollmentId,
          `Auto-created from Nexus benefits enrollment`,
          createdBy
        ]
      );

      const deduction = deductionResult.rows[0];
      this.logger.info('[Paylinq] Created benefits deduction', {
        deductionId: deduction.id,
        amount: employeeContribution
      });

      await client.query('COMMIT');

      return {
        deductionId: deduction.id,
        deduction,
        message: 'Benefits deduction successfully added to payroll'
      };

    } catch (_error) {
      await client.query('ROLLBACK');
      this.logger.error('[Paylinq] Error adding benefits deduction', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * CROSS-PRODUCT INTEGRATION: ScheduleHub → Paylinq (with error handling)
   * Record time entry when employee clocks out in ScheduleHub
   * Wraps recordTimeEntryFromScheduleHubInternal with retry and circuit breaker
   * 
   * @param {Object} timeData - Time tracking data from ScheduleHub
   * @param {string} createdBy - UUID of user creating the record
   * @returns {Promise<Object>} Result with success flag and data
   */
  async recordTimeEntryFromScheduleHub(timeData, createdBy) {
    const context = this.errorHandler.createContext({
      integration: 'schedulehub-to-paylinq-timeentry',
      employeeId: timeData.employeeId,
      shiftId: timeData.shiftId,
      organizationId: timeData.organizationId,
      workDate: timeData.workDate
    });

    return this.errorHandler.executeNonBlocking(
      'schedulehub-to-paylinq-timeentry',
      () => this.recordTimeEntryFromScheduleHubInternal(timeData, createdBy),
      context
    );
  }

  /**
   * CROSS-PRODUCT INTEGRATION: ScheduleHub → Paylinq (Internal implementation)
   * Record time entry when employee clocks out in ScheduleHub
   * 
   * @param {Object} timeData - Time tracking data from ScheduleHub
   * @param {string} timeData.employeeId - Employee UUID
   * @param {string} timeData.shiftId - Shift UUID from ScheduleHub
   * @param {string} timeData.organizationId - Organization UUID
   * @param {Date} timeData.workDate - Date of work
   * @param {number} timeData.regularHours - Regular hours worked
   * @param {number} timeData.overtimeHours - Overtime hours worked
   * @param {Date} timeData.clockIn - Clock in timestamp
   * @param {Date} timeData.clockOut - Clock out timestamp
   * @param {string} createdBy - UUID of user creating the record
   * @returns {Promise<Object>} Created time entry
   */
  async recordTimeEntryFromScheduleHubInternal(timeData, createdBy) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        employeeId,
        shiftId,
        organizationId,
        workDate,
        regularHours,
        overtimeHours = 0,
        clockIn,
        clockOut
      } = timeData;

      this.logger.info('[Paylinq] Recording time entry from ScheduleHub', {
        employeeId,
        shiftId,
        workDate,
        regularHours,
        overtimeHours
      });

      // Find employee in HRIS
      const employeeResult = await client.query(
        `SELECT id FROM hris.employee 
         WHERE organization_id = $1 
         AND id = $2 
         AND deleted_at IS NULL
         LIMIT 1`,
        [organizationId, employeeId]
      );

      if (employeeResult.rows.length === 0) {
        throw new Error(`Employee ${employeeId} not found in HRIS system`);
      }

      // Check if time entry already exists for this shift
      const existingEntry = await client.query(
        `SELECT id FROM payroll.time_entry 
         WHERE employee_id = $1 
         AND entry_date = $2 
         AND source_reference_id = $3 
         AND deleted_at IS NULL`,
        [employeeId, workDate, shiftId]
      );

      if (existingEntry.rows.length > 0) {
        this.logger.warn('[Paylinq] Time entry already exists for this shift', {
          shiftId
        });
        await client.query('COMMIT');
        return { timeEntryId: existingEntry.rows[0].id, message: 'Time entry already exists' };
      }

      // Create time entry
      const totalHours = regularHours + overtimeHours;
      const timeEntryResult = await client.query(
        `INSERT INTO payroll.time_entry (
          organization_id,
          employee_id,
          entry_date,
          clock_in,
          clock_out,
          worked_hours,
          regular_hours,
          overtime_hours,
          entry_type,
          status,
          source_system,
          source_reference_id,
          created_at,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'regular', 'approved', 'schedulehub', $9, NOW(), $10)
        RETURNING *`,
        [
          organizationId,
          employeeId,
          workDate,
          clockIn,
          clockOut,
          totalHours,
          regularHours,
          overtimeHours,
          shiftId,
          createdBy
        ]
      );

      const timeEntry = timeEntryResult.rows[0];
      this.logger.info('[Paylinq] Created time entry', {
        timeEntryId: timeEntry.id,
        hours: totalHours
      });

      await client.query('COMMIT');

      return {
        timeEntryId: timeEntry.id,
        timeEntry,
        message: 'Time entry successfully recorded in payroll'
      };

    } catch (_error) {
      await client.query('ROLLBACK');
      this.logger.error('[Paylinq] Error recording time entry', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Helper: Map Nexus salary frequency to Paylinq pay frequency
   */
  mapSalaryFrequency(nexusFrequency) {
    const mapping = {
      'hourly': 'weekly',
      'daily': 'weekly',
      'weekly': 'weekly',
      'biweekly': 'biweekly',
      'monthly': 'monthly',
      'annually': 'monthly'
    };
    return mapping[nexusFrequency] || 'monthly';
  }

  /**
   * Helper: Determine compensation type based on employment details
   */
  determineCompensationType(employmentType, salaryFrequency) {
    if (salaryFrequency === 'hourly') return 'hourly';
    if (employmentType === 'part_time') return 'hourly';
    if (employmentType === 'contractor' || employmentType === 'contract') return 'hourly';
    return 'salary';
  }

  /**
   * Helper: Calculate hourly rate from salary
   */
  calculateHourlyRate(salary, frequency) {
    const annualHours = 2080; // Standard work year
    switch (frequency) {
      case 'hourly': return salary;
      case 'weekly': return (salary * 52) / annualHours;
      case 'biweekly': return (salary * 26) / annualHours;
      case 'monthly': return (salary * 12) / annualHours;
      case 'annually': return salary / annualHours;
      default: return null;
    }
  }

  /**
   * Helper: Calculate annual amount from salary
   */
  calculateAnnualAmount(salary, frequency) {
    switch (frequency) {
      case 'hourly': return salary * 2080; // Assuming 40 hours/week, 52 weeks
      case 'weekly': return salary * 52;
      case 'biweekly': return salary * 26;
      case 'monthly': return salary * 12;
      case 'annually': return salary;
      default: return salary * 12; // Default to monthly
    }
  }

  /**
   * Helper: Calculate pay period amount
   */
  calculatePayPeriodAmount(salary, frequency) {
    switch (frequency) {
      case 'weekly': return salary;
      case 'biweekly': return salary;
      case 'monthly': return salary;
      case 'annually': return salary / 12; // Convert to monthly
      case 'hourly': return salary * 80; // Assuming 40 hours/week biweekly
      default: return salary;
    }
  }
}

export default PaylinqIntegrationService;
