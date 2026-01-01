/**
 * Payroll Service
 * 
 * Business logic layer for payroll processing, employee management, and payroll run execution.
 * Handles payroll calculations, timesheet approval, and paycheck generation.
 * 
 * @module products/paylinq/services/payrollService
 */

import Joi from 'joi';
import PayrollRepository from '../repositories/payrollRepository.js';
import DeductionRepository from '../repositories/deductionRepository.js';
import taxCalculationService from './taxCalculationService.js';
import PayStructureService from './payStructureService.js';
import PayrollRunTypeService from './PayrollRunTypeService.js';
import logger from '../../../utils/logger.js';
import { ValidationError, NotFoundError, ConflictError  } from '../../../middleware/errorHandler.js';
import { nowUTC, toUTCDateString, formatForDatabase, parseDateInTimezone } from '../../../utils/timezone.js';
import compensationService from '../../../shared/services/compensationService.js';
import PayrollRunCalculationService from './PayrollRunCalculationService.js';
import type {
  EmployeeRecordData,
  CompensationData,
  PayrollRunData,
  TimesheetData
} from '../../../types/paylinq.types.js';

class PayrollService {
  payrollRepository: PayrollRepository;
  deductionRepository: DeductionRepository;
  taxCalculationService: typeof taxCalculationService;
  payStructureService: PayStructureService;
  payrollRunTypeService: PayrollRunTypeService;
  payrollRunCalculationService: PayrollRunCalculationService;
  employeeRecordSchema: Joi.ObjectSchema;
  compensationSchema: Joi.ObjectSchema;
  compensationUpdateSchema: Joi.ObjectSchema;
  payrollRunSchema: Joi.ObjectSchema;
  timesheetSchema: Joi.ObjectSchema;

  constructor(
    payrollRepository: PayrollRepository | null = null,
    deductionRepository: DeductionRepository | null = null,
    taxCalcService: typeof taxCalculationService | null = null,
    payStructureService: PayStructureService | null = null,
    payrollRunTypeService: PayrollRunTypeService | null = null,
    payrollRunCalcService: PayrollRunCalculationService | null = null
  ) {
    this.payrollRepository = payrollRepository || new PayrollRepository();
    this.deductionRepository = deductionRepository || new DeductionRepository();
    this.taxCalculationService = taxCalcService || taxCalculationService;
    this.payStructureService = payStructureService || new PayStructureService();
    this.payrollRunTypeService = payrollRunTypeService || new PayrollRunTypeService();
    this.payrollRunCalculationService = payrollRunCalcService || new PayrollRunCalculationService();
  }

  // ==================== VALIDATION SCHEMAS ====================

  /**
   * Employee Record Validation Schema
   * 
   * Note: As of Phase 1 migration (Nov 2025):
   * - nationalId/taxIdNumber → stored in payroll_config.tax_id
   * - phone → stored in hris.employee.phone
   * - dateOfBirth → stored in hris.employee.date_of_birth
   */
  employeeRecordSchema = Joi.object({
    // Allow both simple employee creation (from frontend) and detailed payroll config
    hrisEmployeeId: Joi.string().optional(),
    employeeId: Joi.string().uuid().optional(),
    employeeNumber: Joi.string().optional(),
    // Required fields for worker profile
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    hireDate: Joi.string().isoDate().required(),
    // PII fields (Phase 1 Migration - moved from metadata)
    phone: Joi.string().pattern(/^\+?[0-9\s\-()]+$/).max(20).allow(null, ''),
    nationalId: Joi.string().allow(null, ''),
    dateOfBirth: Joi.date()
      .max('now')  // Cannot be in the future
      .min('1900-01-01')  // Reasonable minimum date
      .allow(null, ''),
    // Phase 2: Organizational Structure (replaces text fields in metadata)
    departmentId: Joi.string().uuid().allow(null, ''),
    locationId: Joi.string().uuid().allow(null, ''),
    managerId: Joi.string().uuid().allow(null, ''),
    // Backward compatibility: Still accept text fields during migration
    department: Joi.string().allow(null, ''),
    location: Joi.string().allow(null, ''),
    // Payroll configuration fields
    payFrequency: Joi.string().valid('weekly', 'bi-weekly', 'biweekly', 'semi-monthly', 'semimonthly', 'monthly').optional(),
    paymentMethod: Joi.string().valid('ach', 'check', 'wire', 'cash', 'direct_deposit', 'card').optional(),
    currency: Joi.string().length(3).default('SRD'),
    status: Joi.string().valid('active', 'inactive', 'terminated').default('active'),
    startDate: Joi.alternatives().try(
      Joi.date().iso(),
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
    ).optional().allow(null),
    bankName: Joi.string().allow(null, ''),
    bankAccountNumber: Joi.string().allow(null, ''),
    accountNumber: Joi.string().allow(null, ''),
    routingNumber: Joi.string().allow(null, ''),
    accountType: Joi.string().valid('checking', 'savings').allow(null),
    taxIdNumber: Joi.string().allow(null, ''),
    taxId: Joi.string().allow(null, ''),
    taxFilingStatus: Joi.string().valid('single', 'married', 'head_of_household').allow(null),
    taxExemptions: Joi.number().integer().min(0).allow(null),
    taxAllowances: Joi.number().integer().min(0).allow(null),
    additionalWithholding: Joi.number().min(0).allow(null),
    metadata: Joi.object().allow(null).optional() // Worker metadata (department, position, compensation)
  }).or('hrisEmployeeId', 'employeeId').options({ stripUnknown: true }); // At least one identifier required, reject unknown fields

  compensationSchema = Joi.object({
    employeeId: Joi.string().uuid().required(),
    compensationType: Joi.string().valid('salary', 'hourly', 'commission', 'bonus').required(),
    amount: Joi.number().positive().required(),
    payPeriod: Joi.string().valid('hour', 'day', 'week', 'month', 'year').optional(),
    effectiveFrom: Joi.date().required(),
    effectiveTo: Joi.date().allow(null).optional(),
    isCurrent: Joi.boolean().default(true),
    currency: Joi.string().optional(),
    hourlyRate: Joi.number().positive().optional(),
    overtimeRate: Joi.number().positive().optional(),
    payPeriodAmount: Joi.number().positive().optional(),
    annualAmount: Joi.number().positive().optional()
  });
  
  compensationUpdateSchema = Joi.object({
    amount: Joi.number().positive().optional(),
    compensationType: Joi.string().valid('salary', 'hourly', 'commission', 'bonus').optional(),
    hourlyRate: Joi.number().positive().optional(),
    overtimeRate: Joi.number().positive().optional(),
    payPeriodAmount: Joi.number().positive().optional(),
    annualAmount: Joi.number().positive().optional(),
    currency: Joi.string().optional(),
    effectiveFrom: Joi.date().optional(),
    effectiveTo: Joi.date().optional(),
    isCurrent: Joi.boolean().optional()
  }).min(1);

  // Note: Pay period dates are date-only fields per TIMEZONE_ARCHITECTURE.md
  // They should be YYYY-MM-DD format strings, not Date objects
  payrollRunSchema = Joi.object({
    runNumber: Joi.string().required(),
    runName: Joi.string().required(),
    payPeriodStart: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    payPeriodEnd: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    paymentDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    runType: Joi.string().optional().default('REGULAR'),
    status: Joi.string().valid('draft', 'calculated', 'approved', 'paid', 'cancelled').default('draft')
  });

  timesheetSchema = Joi.object({
    employeeId: Joi.string().uuid().required(),
    periodStart: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    periodEnd: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    regularHours: Joi.number().min(0).required(),
    overtimeHours: Joi.number().min(0).default(0),
    ptoHours: Joi.number().min(0).default(0),
    sickHours: Joi.number().min(0).default(0),
    holidayHours: Joi.number().min(0).default(0),
    totalHours: Joi.number().min(0).required(),
    status: Joi.string().valid('draft', 'submitted', 'approved', 'rejected').default('draft'),
    notes: Joi.string().allow(null, '')
  });

  // ==================== EMPLOYEE RECORDS ====================

  /**
   * Create employee payroll record
   * @param {Object} employeeData - Employee data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the record
   * @returns {Promise<Object>} Created employee record with original data
   */
  async createEmployeeRecord(employeeData, organizationId, userId) {
    // Debug: Log incoming data
    logger.info('Received employee data for creation', {
      employeeData: JSON.stringify(employeeData),
      hireDate: employeeData.hireDate,
      hireDateType: typeof employeeData.hireDate,
    });
    
    // Validate input
    const { error, value } = this.employeeRecordSchema.validate(employeeData);
    if (error) {
      logger.error('Validation error in createEmployeeRecord', {
        error: error.details[0].message,
        employeeData: JSON.stringify(employeeData),
      });
      throw new ValidationError(error.details[0].message);
    }

    // Transform simplified employee data to payroll record format
    const { v4: uuidv4 } = await import('uuid');
    
    // Create or link to existing employee
    let targetEmployeeId;
    if (value.employeeId) {
      // Use provided employeeId (existing employee from hris.employee)
      targetEmployeeId = value.employeeId;
    } else {
      // Create a new hris.employee record first
      const dbModule = await import('../../../config/database');
      const dbClient = dbModule.default;
      
      const newEmployeeId = uuidv4();
      const employeeNumber = value.employeeNumber || value.hrisEmployeeId || `EMP-${Date.now()}`;
      const hireDate = value.startDate || value.hireDate || toUTCDateString(nowUTC());
      
      // Phase 1: PII fields (no backwards compatibility needed in dev)
      const phoneValue = value.phone || null;
      const dobValue = value.dateOfBirth || null;
      
      // Phase 2: Organizational structure fields
      const departmentId = value.departmentId || null;
      const locationId = value.locationId || null;
      const managerId = value.managerId || null;
      
      // Insert into hris.employee table (which payroll.employee_payroll_config references)
      const employeeInsertQuery = `
        INSERT INTO hris.employee (
          id, organization_id, employee_number,
          first_name, last_name, email, phone,
          hire_date, date_of_birth, employment_status, employment_type,
          job_title, department_id, location_id, manager_id, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `;
      
      const employeeValues = [
        newEmployeeId,
        organizationId,
        employeeNumber,
        value.firstName,
        value.lastName,
        value.email?.toLowerCase(),
        phoneValue,
        hireDate,
        dobValue,
        value.status || 'active',
        value.employmentType || 'full_time',
        value.jobTitle || null,
        departmentId,   // Phase 2: Department FK
        locationId,     // Phase 2: Location FK
        managerId,      // Phase 2: Manager FK
        userId
      ];
      
      try {
        const result = await dbClient.query(employeeInsertQuery, employeeValues);
        targetEmployeeId = result.rows[0].id;
        
        logger.info('Created hris.employee record', {
          employeeId: targetEmployeeId,
          employeeNumber,
          organizationId
        });
      } catch (employeeError) {
        // If employee creation fails due to duplicate employee_number
        if (employeeError.code === '23505' && employeeError.constraint?.includes('employee_number')) {
          throw new ConflictError(`Employee with number ${employeeNumber} already exists`);
        }
        logger.error('Error creating hris.employee record', {
          error: employeeError.message,
          code: employeeError.code,
          constraint: employeeError.constraint
        });
        throw employeeError;
      }
    }
    
    // Metadata is now only for non-structured data
    const cleanMetadata = value.metadata || null;
    
    const payrollData = {
      employeeId: targetEmployeeId, // Use created or provided user ID
      employeeNumber: value.employeeNumber || value.hrisEmployeeId || `EMP-${Date.now()}`,
      firstName: value.firstName || 'Unknown',
      lastName: value.lastName || 'Unknown',
      payFrequency: value.payFrequency || 'monthly',
      // Payment method mapping: normalize to values accepted by DB constraint
      // DB constraint: ('direct_deposit', 'check', 'cash', 'card')
      paymentMethod: (value.paymentMethod === 'ach' || value.paymentMethod === 'wire') 
        ? 'direct_deposit' 
        : (value.paymentMethod || 'check'),
      currency: value.currency || 'SRD',
      status: value.status || 'active',
      startDate: value.startDate || value.hireDate || toUTCDateString(nowUTC()),
      bankName: value.bankName || null,
      accountNumber: value.accountNumber || value.bankAccountNumber || null,
      routingNumber: value.routingNumber || null,
      accountType: value.accountType || null,
      // Phase 1: National ID in tax_id field
      taxId: value.taxId || value.taxIdNumber || value.nationalId || null,
      taxFilingStatus: value.taxFilingStatus || null,
      taxAllowances: value.taxAllowances || value.taxExemptions || 0,
      additionalWithholding: value.additionalWithholding || 0,
      metadata: cleanMetadata // Clean metadata without PII
    };

    // Business rule: Validate payment method has required bank details
    if (payrollData.paymentMethod === 'ach' || payrollData.paymentMethod === 'wire' || payrollData.paymentMethod === 'direct_deposit') {
      if (!payrollData.accountNumber || !payrollData.routingNumber) {
        // Don't enforce bank details for now, just set defaults
        payrollData.accountNumber = payrollData.accountNumber || null;
        payrollData.routingNumber = payrollData.routingNumber || null;
      }
    }

    try {
      const employeeRecord = await this.payrollRepository.createEmployeeRecord(
        payrollData,
        organizationId,
        userId
      );

      // Create a default compensation record if compensation data is provided
      if (value.metadata?.compensation || value.compensation) {
        try {
          const compensationAmount = value.metadata?.compensation || value.compensation;
          const compensationData = {
            amount: compensationAmount,
            type: value.metadata?.compensationType || value.compensationType || 'salary',
            currency: payrollData.currency || 'SRD',
            effectiveFrom: payrollData.startDate || new Date().toISOString().split('T')[0],
            payFrequency: payrollData.payFrequency || 'monthly',
            overtimeRate: value.metadata?.overtimeRate || value.overtimeRate || null
          };

          await compensationService.createInitialCompensation(
            targetEmployeeId,
            compensationData,
            organizationId,
            userId
          );
          
          logger.info('Created initial compensation for employee via shared service', {
            employeeId: targetEmployeeId,
            amount: compensationData.amount,
            type: compensationData.type
          });
        } catch (compErr) {
          logger.warn('Failed to create default compensation', {
            employeeId: targetEmployeeId,
            error: compErr.message
          });
          // Don't fail the whole operation if compensation creation fails
        }
      }

      // Create worker type assignment if workerType is in metadata
      if (value.metadata?.workerType) {
        try {
          await this.payrollRepository.createOrUpdateWorkerType(
            targetEmployeeId,
            value.metadata.workerType,
            organizationId,
            userId
          );
          
          logger.info('Created worker type assignment for employee', {
            employeeId: targetEmployeeId,
            workerType: value.metadata.workerType
          });
        } catch (workerTypeErr) {
          logger.warn('Failed to create worker type assignment', {
            employeeId: targetEmployeeId,
            workerType: value.metadata.workerType,
            error: workerTypeErr.message
          });
          // Don't fail the whole operation if worker type assignment fails
        }
      }

      // Enrich response with original frontend data (firstName, lastName, email)
      // These aren't stored in payroll table but tests expect them
      const enrichedRecord = {
        ...employeeRecord,
        firstName: value.firstName || null,
        lastName: value.lastName || null,
        email: value.email || null,
        hrisEmployeeId: value.hrisEmployeeId || null
      };

      logger.info('Employee payroll record created', {
        employeeId: employeeRecord.id,
        employeeNumber: employeeRecord.employee_number,
        organizationId
      });

      return enrichedRecord;
    } catch (err) {
      logger.error('Error creating employee record', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get employees by organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters (including pagination)
   * @returns {Promise<Object>} Employee records with pagination
   */
  async getEmployeesByOrganization(organizationId, filters = {}) {
    try {
      const result = await this.payrollRepository.findByOrganization(organizationId, filters);
      
      // If pagination params were provided, return paginated result
      if (filters.page !== undefined || filters.limit !== undefined) {
        return result; // { employees: [], pagination: {} }
      }
      
      // Legacy: return array directly for backward compatibility
      return Array.isArray(result) ? result : result.employees || [];
    } catch (err) {
      logger.error('Error fetching employees', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get employee record by ID
   * @param {string} employeeRecordId - Employee record UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Employee record
   */
  async getEmployeeById(employeeRecordId, organizationId) {
    try {
      const employee = await this.payrollRepository.findEmployeeRecordById(
        employeeRecordId,
        organizationId
      );

      if (!employee) {
        throw new NotFoundError('Employee record not found');
      }

      // DTO Pattern: Enrich response with frontend-expected fields
      // Note: firstName, lastName, email are not in payroll table
      // Employee data already includes firstName, lastName, email from hris.employee table
      const enrichedRecord = {
        ...employee,
        hrisEmployeeId: employee.employee_number || null
      };

      return enrichedRecord;
    } catch (err) {
      logger.error('Error fetching employee record', {
        error: err.message,
        employeeRecordId,
        organizationId,
      });
      throw err;
    }
  }

  /**
   * Delete employee record (soft delete)
   * @param {string} employeeRecordId - Employee record UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing the deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteEmployeeRecord(employeeRecordId, organizationId, userId) {
    try {
      const employee = await this.payrollRepository.findEmployeeRecordById(
        employeeRecordId,
        organizationId
      );

      if (!employee) {
        throw new NotFoundError('Employee record not found');
      }

      await this.payrollRepository.deleteEmployeeRecord(
        employeeRecordId,
        organizationId,
        userId
      );

      logger.info('Employee record deleted', {
        employeeRecordId,
        organizationId,
        userId,
      });

      return true;
    } catch (err) {
      logger.error('Error deleting employee record', {
        error: err.message,
        employeeRecordId,
        organizationId,
        userId,
      });
      throw err;
    }
  }

  /**
   * Get employee payroll history
   * @param {string} employeeRecordId - Employee record UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters (startDate, endDate, limit)
   * @returns {Promise<Array>} Payroll history records
   */
  async getEmployeePayrollHistory(employeeRecordId, organizationId, filters = {}) {
    try {
      const employee = await this.payrollRepository.findEmployeeRecordById(
        employeeRecordId,
        organizationId
      );

      if (!employee) {
        throw new NotFoundError('Employee record not found');
      }

      // Get paycheck history for this employee
      const history = await this.payrollRepository.getEmployeePayrollHistory(
        employeeRecordId,
        organizationId,
        filters
      );

      return history;
    } catch (err) {
      logger.error('Error fetching employee payroll history', {
        error: err.message,
        employeeRecordId,
        organizationId,
      });
      throw err;
    }
  }

  /**
   * Update employee record
   * @param {string} employeeRecordId - Employee record UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated employee record
   */
  async updateEmployeeRecord(employeeRecordId, updates, organizationId, userId) {
    try {
      // Validate status if provided
      if (updates.status) {
        const validStatuses = ['active', 'inactive', 'terminated'];
        if (!validStatuses.includes(updates.status)) {
          throw new ValidationError(`Invalid status value. Must be one of: ${validStatuses.join(', ')}`);
        }
      }

      // Check if employee exists first
      const currentRecord = await this.payrollRepository.findEmployeeRecordById(
        employeeRecordId,
        organizationId
      );
      
      if (!currentRecord) {
        throw new NotFoundError('Employee record not found');
      }

      // Merge metadata if provided (preserve existing metadata fields)
      if (updates.metadata) {
        updates.metadata = {
          ...(currentRecord.metadata || {}),
          ...updates.metadata
        };
      }

      // Map camelCase to snake_case for database fields
      const fieldMapping = {
        firstName: 'first_name', // Not in payroll table but accept for compatibility
        lastName: 'last_name',   // Not in payroll table but accept for compatibility  
        payFrequency: 'pay_frequency',
        paymentMethod: 'payment_method',
        status: 'status',
        bankName: 'bank_name',
        bankAccountNumber: 'account_number',
        accountNumber: 'account_number',
        routingNumber: 'routing_number',
        accountType: 'account_type',
        taxFilingStatus: 'tax_filing_status',
        taxAllowances: 'tax_allowances',
        taxExemptions: 'tax_allowances', // Map to same field
        additionalWithholding: 'additional_withholding',
        metadata: 'metadata' // Allow metadata updates
      };

      // Transform updates to database field names
      const dbUpdates = {};
      Object.keys(updates).forEach(key => {
        if (fieldMapping[key]) {
          // Skip firstName/lastName as they're not in payroll table
          if (key !== 'firstName' && key !== 'lastName') {
            dbUpdates[fieldMapping[key]] = updates[key];
          }
        } else if (key.includes('_')) {
          // Already snake_case, pass through
          dbUpdates[key] = updates[key];
        }
      });

      // If no valid fields after filtering, just return current record
      if (Object.keys(dbUpdates).length === 0) {
        logger.info('No payroll fields to update (firstName/lastName ignored)', {
          employeeRecordId,
          organizationId
        });
        return currentRecord;
      }

      // Validate payment method changes
      const paymentMethod = dbUpdates.payment_method || updates.paymentMethod;
      if (paymentMethod === 'ach' || paymentMethod === 'wire' || paymentMethod === 'direct_deposit') {
        const bankAccount = dbUpdates.account_number || currentRecord.account_number;
        const routing = dbUpdates.routing_number || currentRecord.routing_number;

        if (!bankAccount || !routing) {
          // Don't enforce for now - just log warning
          logger.warn('Bank details missing for ACH/wire payment', {
            employeeRecordId,
            paymentMethod
          });
        }
      }

      const updatedRecord = await this.payrollRepository.updateEmployeeRecord(
        employeeRecordId,
        dbUpdates,
        organizationId,
        userId
      );

      // Check if compensation was updated in metadata - if so, sync to compensation table
      const metadata = updatedRecord.metadata || {};
      
      logger.debug('Checking for compensation sync', {
        employeeRecordId,
        hasMetadata: !!metadata,
        hasCompensationInMetadata: !!metadata.compensation,
        compensationValue: metadata.compensation,
        compensationType: typeof metadata.compensation
      });

      // Check if metadata has compensation (could be a number or an object)
      if (metadata.compensation !== undefined && metadata.compensation !== null) {
        // Check if compensation record exists
        const existingCompensation = await this.payrollRepository.findCurrentCompensation(
          employeeRecordId,
          organizationId
        );

        // Determine if compensation is a simple number or an object with details
        let compensationAmount;
        let compensationType = 'salary';
        let overtimeRate = null;

        if (typeof metadata.compensation === 'object') {
          // Structured compensation object
          compensationAmount = parseFloat(metadata.compensation.amount || metadata.compensation.compensation || 0);
          compensationType = metadata.compensation.compensationType || 'salary';
          overtimeRate = metadata.compensation.overtimeRate ? parseFloat(metadata.compensation.overtimeRate) : null;
        } else {
          // Simple number
          compensationAmount = parseFloat(metadata.compensation);
        }

        if (!existingCompensation && compensationAmount > 0) {
          // Create compensation record from metadata
          // CRITICAL: Use employee_id (HRIS ID), not employeeRecordId (payroll config ID)
          const newCompensation = {
            employeeId: currentRecord.employee_id, // HRIS employee ID from payroll config
            compensationType,
            amount: compensationAmount,
            currency: metadata.currency || 'SRD',
            effectiveFrom: new Date().toISOString().split('T')[0],
            payFrequency: dbUpdates.pay_frequency || currentRecord.pay_frequency || 'monthly',
            isCurrent: true
          };

          // Add overtime rate if provided
          if (overtimeRate) {
            newCompensation.overtimeRate = overtimeRate;
          }

          await this.payrollRepository.createCompensation(
            newCompensation,
            organizationId,
            userId
          );

          logger.info('Created compensation record from metadata during update', {
            employeeRecordId,
            hrisEmployeeId: currentRecord.employee_id,
            organizationId,
            compensationType,
            amount: newCompensation.amount
          });
        } else if (existingCompensation && compensationAmount > 0 && 
                   compensationAmount !== parseFloat(existingCompensation.amount)) {
          // Update existing compensation if amount changed
          await this.payrollRepository.updateCompensation(
            existingCompensation.id,
            {
              amount: compensationAmount,
              overtimeRate: overtimeRate || existingCompensation.overtime_rate
            },
            organizationId,
            userId
          );

          logger.info('Updated compensation record from metadata during update', {
            employeeRecordId,
            organizationId,
            previousAmount: parseFloat(existingCompensation.amount),
            newAmount: compensationAmount
          });
        }
      }

      // Check if worker type was updated in metadata - if so, sync to worker_type table
      if (metadata.workerType) {
        try {
          await this.payrollRepository.createOrUpdateWorkerType(
            employeeRecordId,
            metadata.workerType,
            organizationId,
            userId
          );
          
          logger.info('Updated worker type assignment from metadata during update', {
            employeeRecordId,
            organizationId,
            workerType: metadata.workerType
          });
        } catch (workerTypeErr) {
          logger.warn('Failed to update worker type assignment', {
            employeeRecordId,
            workerType: metadata.workerType,
            error: workerTypeErr.message
          });
          // Don't fail the whole operation
        }
      }

      logger.info('Employee record updated', {
        employeeRecordId,
        organizationId,
        updatedFields: Object.keys(dbUpdates)
      });

      return updatedRecord;
    } catch (err) {
      logger.error('Error updating employee record', { error: err.message, employeeRecordId });
      throw err;
    }
  }

  // ==================== COMPENSATION ====================

  /**
   * Create compensation record
   * @param {Object} compensationData - Compensation data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the record
   * @returns {Promise<Object>} Created compensation record
   */
  async createCompensation(compensationData, organizationId, userId) {
    const { error, value } = this.compensationSchema.validate(compensationData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Business rule: Validate effective dates
    if (value.effectiveTo && value.effectiveTo <= value.effectiveFrom) {
      throw new Error('Effective to date must be after effective from date');
    }

    try {
      const compensation = await this.payrollRepository.createCompensation(
        value,
        organizationId,
        userId
      );

      logger.info('Compensation record created', {
        compensationId: compensation.id,
        employeeId: compensation.employee_id,
        compensationType: compensation.compensation_type,
        organizationId
      });

      return compensation;
    } catch (err) {
      logger.error('Error creating compensation', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get current compensation for employee
   * @param {string} employeeRecordId - Employee record UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Current compensation
   */
  async getCurrentCompensation(employeeRecordId, organizationId) {
    try {
      return await this.payrollRepository.findCurrentCompensation(employeeRecordId, organizationId);
    } catch (err) {
      logger.error('Error fetching current compensation', { error: err.message, employeeRecordId });
      throw err;
    }
  }

  /**
   * Get compensation by ID
   * @param {string} compensationId - Compensation UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Compensation record or null
   */
  async getCompensationById(compensationId, organizationId) {
    try {
      return await this.payrollRepository.findCompensationById(compensationId, organizationId);
    } catch (err) {
      logger.error('Error fetching compensation by ID', { error: err.message, compensationId });
      throw err;
    }
  }

  /**
   * Get compensation history for employee
   * @param {string} employeeRecordId - Employee record UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Array of compensation records
   */
  async getCompensationHistory(employeeRecordId, organizationId) {
    try {
      return await this.payrollRepository.findCompensationHistory(employeeRecordId, organizationId);
    } catch (err) {
      logger.error('Error fetching compensation history', { error: err.message, employeeRecordId });
      throw err;
    }
  }

  /**
   * Get compensation summary for an employee
   * @param {string} employeeRecordId - Employee record UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Compensation summary with stats
   */
  async getCompensationSummary(employeeRecordId, organizationId) {
    try {
      const history = await this.payrollRepository.findCompensationHistory(employeeRecordId, organizationId);
      const current = await this.payrollRepository.findCurrentCompensation(employeeRecordId, organizationId);
      
      // Calculate summary stats
      const summary = {
        currentCompensation: current ? current.amount : 0,
        compensationType: current ? current.compensation_type : null,
        totalChanges: history.length,
        totalYearsOfService: 0,
        lastChangeDate: history.length > 0 ? history[0].effective_date : null,
        firstHireDate: history.length > 0 ? history[history.length - 1].effective_date : null,
      };

      // Calculate years of service
      if (summary.firstHireDate) {
        const hireDate = new Date(summary.firstHireDate);
        const now = new Date();
        summary.totalYearsOfService = (now - hireDate) / (1000 * 60 * 60 * 24 * 365.25);
      }

      return summary;
    } catch (err) {
      logger.error('Error fetching compensation summary', { error: err.message, employeeRecordId });
      throw err;
    }
  }

  /**
   * Update compensation record
   * @param {string} compensationId - Compensation UUID
   * @param {Object} updateData - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object|null>} Updated compensation or null
   */
  async updateCompensation(compensationId, updateData, organizationId, userId) {
    try {
      // Validate update data with update schema
      const { error, value } = this.compensationUpdateSchema.validate(updateData, { stripUnknown: true });
      if (error) {
        throw new ValidationError(error.details[0].message);
      }
      
      const updated = await this.payrollRepository.updateCompensation(compensationId, value, organizationId, userId);
      
      if (updated) {
        logger.info('Compensation record updated', {
          compensationId,
          organizationId,
          userId
        });
      }
      
      return updated;
    } catch (err) {
      logger.error('Error updating compensation', { error: err.message, compensationId });
      throw err;
    }
  }

  /**
   * Delete compensation record (soft delete)
   * @param {string} compensationId - Compensation UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the record
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteCompensation(compensationId, organizationId, userId) {
    try {
      const deleted = await this.payrollRepository.deleteCompensation(compensationId, organizationId, userId);
      
      if (deleted) {
        logger.info('Compensation record deleted', {
          compensationId,
          organizationId,
          userId
        });
      }
      
      return deleted;
    } catch (err) {
      logger.error('Error deleting compensation', { error: err.message, compensationId });
      throw err;
    }
  }

  // ==================== PAYROLL RUNS ====================

  /**
   * Create payroll run
   * @param {Object} runData - Payroll run data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the run
   * @returns {Promise<Object>} Created payroll run
   */
  async createPayrollRun(runData, organizationId, userId) {
    const { error, value } = this.payrollRunSchema.validate(runData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Validate run type exists and is active
    try {
      const runType = await this.payrollRunTypeService.getByCode(value.runType, organizationId);
      if (!runType) {
        throw new ValidationError(`Run type '${value.runType}' not found for this organization`);
      }
      if (!runType.isActive) {
        throw new ValidationError(`Run type '${value.runType}' is inactive and cannot be used`);
      }
      logger.info('Run type validated for payroll run creation', {
        runType: value.runType,
        runTypeName: runType.typeName,
        organizationId
      });
    } catch (err) {
      if (err instanceof ValidationError) {
        throw err;
      }
      logger.warn('Run type validation failed, proceeding with default', {
        runType: value.runType,
        error: err.message,
        organizationId
      });
    }

    // Business rule: Validate dates (dates are YYYY-MM-DD strings)
    if (value.payPeriodEnd <= value.payPeriodStart) {
      throw new Error('Pay period end must be after pay period start');
    }

    if (value.paymentDate < value.payPeriodEnd) {
      throw new Error('Payment date must be on or after pay period end');
    }

    try {
      const payrollRun = await this.payrollRepository.createPayrollRun(
        value,
        organizationId,
        userId
      );

      logger.info('Payroll run created', {
        payrollRunId: payrollRun.id,
        runNumber: payrollRun.run_number,
        runType: payrollRun.run_type,
        organizationId
      });

      return payrollRun;
    } catch (err) {
      logger.error('Error creating payroll run', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Calculate payroll (MVP version - simplified)
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User executing calculation
   * @returns {Promise<Object>} Payroll calculation results
   */
  async calculatePayroll(payrollRunId, organizationId, userId) {
    try {
      // Get payroll run
      const payrollRun = await this.payrollRepository.findPayrollRunById(payrollRunId, organizationId);
      if (!payrollRun) {
        throw new NotFoundError('Payroll run not found');
      }

      // Allow calculation from draft or calculating status (for recalculation)
      if (!['draft', 'calculating'].includes(payrollRun.status)) {
        throw new Error(`Cannot calculate payroll with status: ${payrollRun.status}. Must be draft or calculating.`);
      }

      // If recalculating, delete existing paychecks first
      if (payrollRun.status === 'calculating') {
        logger.info('Recalculating payroll - deleting existing paychecks', { payrollRunId, organizationId });
        await this.payrollRepository.deletePaychecksByPayrollRun(payrollRunId, organizationId);
      }

      // Set status to calculating (work in progress)
      await this.payrollRepository.updatePayrollRun(
        payrollRunId,
        { status: 'calculating' },
        organizationId
      );

      logger.info('Starting payroll calculation', { payrollRunId, organizationId });

      // Resolve allowed components for this run type
      let allowedComponents = null;
      try {
        allowedComponents = await this.payrollRunTypeService.resolveAllowedComponents(
          payrollRun.run_type,
          organizationId
        );
        logger.info('Components resolved for run type', {
          runType: payrollRun.run_type,
          componentCount: allowedComponents.length,
          components: allowedComponents,
          payrollRunId,
          organizationId
        });
      } catch (err) {
        logger.warn('Failed to resolve run type components, will include all components', {
          runType: payrollRun.run_type,
          error: err.message,
          payrollRunId,
          organizationId
        });
      }

      // Get all active employees
      const employees = await this.payrollRepository.findByOrganization(organizationId, {
        status: 'active'
      });

      logger.info('Found employees for payroll calculation', { 
        payrollRunId, 
        organizationId,
        employeeCount: employees.length,
        employeeIds: employees.map(e => ({ 
          configId: e.id, 
          employeeId: e.employee_id,
          number: e.employee_number, 
          name: `${e.first_name} ${e.last_name}` 
        }))
      });

      let totalEmployees = 0;
      let totalGrossPay = 0;
      let totalNetPay = 0;
      let totalTaxes = 0;
      const paychecks = [];

      // Calculate each employee's paycheck
      for (const employee of employees) {
        try {
          // Use employee_id (the actual employee ID) not id (the payroll config ID)
          const employeeId = employee.employee_id;
          
          // Get timesheets for pay period
          const timesheets = await this.payrollRepository.findTimesheets(
            {
              employeeId: employeeId,
              periodStart: payrollRun.pay_period_start,
              periodEnd: payrollRun.pay_period_end,
              status: 'approved'
            },
            organizationId
          );

          // Get current compensation
          const compensation = await this.payrollRepository.findCurrentCompensation(
            employeeId,
            organizationId
          );

          if (!compensation) {
            logger.warn('No compensation found for employee, will check if pay structure has base salary', {
              employeeRecordId: employee.id,
              employeeId: employeeId,
              payrollRunId,
              payPeriodEnd: payrollRun.pay_period_end
            });
          }

          // Calculate hours
          const totalHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.total_hours || 0), 0);
          const regularHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.regular_hours || 0), 0);
          const overtimeHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.overtime_hours || 0), 0);
          const ptoHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.pto_hours || 0), 0);

          let grossPay = 0;
          let regularPay = 0;
          let overtimePay = 0;
          let paycheckComponents = [];
          let workerStructureId = null;
          let templateVersion = null;

          // NEW ARCHITECTURE: Always pass compensation data to pay structure
          // This makes compensation the single source of truth
          // Prepare compensation data for pay structure calculation
          let baseSalary = null;
          let hourlyRate = null;
          
          if (compensation) {
            logger.info('Compensation data retrieved', {
              employeeId,
              compensationType: compensation.compensation_type,
              amount: compensation.amount,
              overtimeRate: compensation.overtime_rate
            });
            
            if (compensation.compensation_type === 'hourly') {
              hourlyRate = parseFloat(compensation.amount);
              logger.info('Set hourlyRate from compensation', { hourlyRate });
            } else if (compensation.compensation_type === 'salary') {
              // Use amount as the primary source (single source of truth)
              baseSalary = parseFloat(compensation.amount);
              logger.info('Set baseSalary from compensation', { baseSalary, payFrequency: employee.pay_frequency });
            }
          } else {
            logger.warn('No compensation found for employee', { employeeId });
          }

          // Try to use pay structure if available
          try {
            
            const payStructureCalc = await this.payStructureService.calculateWorkerPay(
              employeeId,
              {
                // Pass compensation data as input (NEW ARCHITECTURE)
                baseSalary,
                hourlyRate,
                // Other calculation inputs
                hours: regularHours,
                regularHours,
                overtimeHours,
                ptoHours,
                totalHours,
                payPeriodStart: payrollRun.pay_period_start,
                payPeriodEnd: payrollRun.pay_period_end,
                payFrequency: employee.pay_frequency,
                compensationType: compensation?.compensation_type || 'salary'
              },
              organizationId,
              payrollRun.pay_period_end
            );

            // Use pay structure calculations
            grossPay = payStructureCalc.summary.totalEarnings;
            workerStructureId = payStructureCalc.structureId;
            templateVersion = payStructureCalc.templateVersion;
            paycheckComponents = payStructureCalc.calculations;

            // Filter components based on run type (Component-Based Payroll Architecture)
            if (allowedComponents && allowedComponents.length > 0) {
              const originalCount = paycheckComponents.length;
              paycheckComponents = paycheckComponents.filter(comp => 
                allowedComponents.includes(comp.componentCode)
              );
              
              // Recalculate gross pay based on filtered components
              // CRITICAL FIX: Only sum earnings and benefits, exclude deductions and taxes
              grossPay = paycheckComponents.reduce((sum, comp) => {
                const category = comp.componentCategory || 'earning';
                if (category === 'earning' || category === 'benefit') {
                  return sum + (comp.amount || 0);
                }
                return sum;
              }, 0);
              
              logger.info('Filtered components by run type', {
                employeeId,
                originalComponentCount: originalCount,
                filteredComponentCount: paycheckComponents.length,
                excludedComponents: originalCount - paycheckComponents.length,
                originalGrossPay: payStructureCalc.summary.totalEarnings,
                filteredGrossPay: grossPay,
                runType: payrollRun.run_type
              });
            }

            // Extract regular and overtime pay from components
            const regularPayComp = paycheckComponents.find(c => c.componentCode === 'BASE_SALARY' || c.componentCode === 'REGULAR_PAY');
            const overtimePayComp = paycheckComponents.find(c => c.componentCode === 'OVERTIME');
            
            regularPay = regularPayComp ? regularPayComp.amount : grossPay;
            overtimePay = overtimePayComp ? overtimePayComp.amount : 0;

            logger.info('Using pay structure for calculation', {
              employeeId: employeeId,
              employeeConfigId: employee.id,
              structureId: workerStructureId,
              templateVersion,
              grossPay,
              componentCount: paycheckComponents.length
            });

          } catch (structureErr) {
            // If no pay structure and no compensation, skip this employee
            if (!compensation) {
              logger.warn('No pay structure or compensation found for employee, skipping', {
                employeeId: employeeId,
                employeeConfigId: employee.id,
                employeeNumber: employee.employee_number,
                employeeName: `${employee.first_name} ${employee.last_name}`,
                payrollRunId,
                payPeriodStart: payrollRun.pay_period_start,
                payPeriodEnd: payrollRun.pay_period_end,
                asOfDate: payrollRun.pay_period_end,
                error: structureErr.message
              });
              continue;
            }

            // Fallback to legacy calculation if pay structure not found but compensation exists
            logger.warn('Pay structure not found, using fallback calculation', {
              employeeId: employeeId,
              error: structureErr.message
            });

            // Legacy calculation logic (simplified to use amount as single source)
            if (compensation.compensation_type === 'hourly') {
              const hourlyRate = parseFloat(compensation.amount);
              regularPay = regularHours * hourlyRate;
              overtimePay = overtimeHours * hourlyRate * 1.5; // 1.5x for overtime
              grossPay = regularPay + overtimePay;
            } else if (compensation.compensation_type === 'salary') {
              // Use amount directly based on pay frequency
              const amountValue = parseFloat(compensation.amount);
              if (employee.pay_frequency === 'monthly') {
                // Amount is the monthly salary
                grossPay = amountValue;
              } else if (employee.pay_frequency === 'weekly') {
                // Amount is annual, divide by 52
                grossPay = amountValue / 52;
              } else if (employee.pay_frequency === 'bi-weekly') {
                grossPay = amountValue / 26;
              } else if (employee.pay_frequency === 'semi-monthly') {
                grossPay = amountValue / 24;
              } else {
                // Default to monthly
                grossPay = amountValue;
              }
              regularPay = grossPay;
            }
          }

          // PHASE 2: Build earning components array for component-based tax calculation
          const payPeriod = employee.pay_frequency || 'monthly'; // Default to monthly
          const earningComponents = [];

          if (paycheckComponents.length > 0) {
            // Use components from pay structure
            for (const comp of paycheckComponents) {
              if (comp.componentCategory === 'earning') {
                // Determine allowance type based on component code
                let allowanceType = null;
                if (comp.componentCode === 'REGULAR_SALARY' || comp.componentCode === 'BASE_SALARY' || comp.componentCode === 'REGULAR_PAY') {
                  allowanceType = 'tax_free_sum_monthly';
                } else if (comp.componentCode === 'VAKANTIEGELD' || comp.componentCode === 'HOLIDAY_ALLOWANCE') {
                  allowanceType = 'holiday_allowance';
                } else if (comp.componentCode === 'BONUS' || comp.componentCode === 'THIRTEENTH_MONTH') {
                  allowanceType = 'bonus_gratuity';
                }

                earningComponents.push({
                  componentCode: comp.componentCode,
                  componentName: comp.componentName,
                  amount: comp.amount,
                  isTaxable: true, // Most earnings are taxable
                  allowanceType
                });
              }
            }
          } else {
            // Fallback: Build components from gross pay breakdown
            if (regularPay > 0) {
              earningComponents.push({
                componentCode: 'REGULAR_PAY',
                componentName: 'Regular Pay',
                amount: regularPay,
                isTaxable: true,
                allowanceType: 'tax_free_sum_monthly'
              });
            }

            if (overtimePay > 0) {
              earningComponents.push({
                componentCode: 'OVERTIME',
                componentName: 'Overtime Pay',
                amount: overtimePay,
                isTaxable: true,
                allowanceType: null // Overtime doesn't get special allowance
              });
            }
          }

          // Calculate taxes using component-based approach (Phase 2)
          let taxCalculation;
          if (earningComponents.length > 0) {
            // LOONTIJDVAK INTEGRATION: Use enhanced calculation with loontijdvak period detection
            try {
              const loontijdvakResult = await this.payrollRunCalculationService.calculateEmployeePayWithLoontijdvak(
                employeeId,
                earningComponents,
                payrollRun.pay_period_start,
                payrollRun.pay_period_end,
                payPeriod,
                organizationId
              );
              
              // Use the enhanced tax calculation
              taxCalculation = loontijdvakResult.taxCalculation;
              
              // Log loontijdvak period info
              logger.info('Loontijdvak period detected for employee', {
                employeeId,
                loontijdvakType: loontijdvakResult.loontijdvakPeriod?.period_type,
                loontijdvakNumber: loontijdvakResult.loontijdvakPeriod?.period_number,
                isPartialPeriod: loontijdvakResult.isPartialPeriod,
                proration: loontijdvakResult.proration,
                payrollRunId
              });
            } catch (loontijdvakError) {
              // Fallback to standard calculation if loontijdvak fails
              logger.warn('Loontijdvak calculation failed, using standard tax calculation', {
                error: loontijdvakError.message,
                employeeId,
                payrollRunId
              });
              
              taxCalculation = await this.taxCalculationService.calculateEmployeeTaxesWithComponents(
                employeeId,
                earningComponents,
                payrollRun.pay_period_start,
                payPeriod,
                organizationId
              );
            }
          } else {
            // Fallback to Phase 1 method if no components
            taxCalculation = await this.taxCalculationService.calculateEmployeeTaxes(
              employeeId,
              grossPay,
              payrollRun.pay_period_start,
              payPeriod,
              organizationId
            );
            // Wrap in Phase 2 format
            taxCalculation = {
              summary: {
                totalGrossPay: grossPay,
                totalTaxFreeAllowance: taxCalculation.taxFreeAllowance || 0,
                totalTaxableIncome: taxCalculation.taxableIncome || 0,
                totalWageTax: taxCalculation.federalTax || 0,
                totalAovTax: taxCalculation.socialSecurity || 0,
                totalAwwTax: taxCalculation.medicare || 0,
                totalTaxes: taxCalculation.totalTaxes
              },
              componentTaxes: []
            };
          }

          const totalTaxAmount = taxCalculation.summary.totalTaxes;
          
          // Calculate total deductions from components (deduction category only)
          const totalDeductions = paycheckComponents
            .filter(comp => comp.componentCategory === 'deduction')
            .reduce((sum, comp) => sum + (comp.amount || 0), 0);
          
          // Calculate total tax amounts from tax category components
          // This includes any tax components that were calculated by the component formula
          const totalComponentTaxes = paycheckComponents
            .filter(comp => comp.componentCategory === 'tax')
            .reduce((sum, comp) => sum + (comp.amount || 0), 0);
          
          // DEBUG: Log component details
          console.log('=== PAYCHECK CALCULATION DEBUG ===');
          console.log('Gross Pay:', grossPay);
          console.log('Total Deductions:', totalDeductions);
          console.log('Total Tax Amount (from tax calculation service):', totalTaxAmount);
          console.log('Total Component Taxes (from template):', totalComponentTaxes);
          console.log('All paycheck components:', JSON.stringify(paycheckComponents, null, 2));
          console.log('Tax category components:', paycheckComponents.filter(c => c.componentCategory === 'tax'));
          
          // Use component taxes if provided (from template), otherwise use calculated taxes
          // This allows templates with tax components to override the tax calculation service
          const effectiveTaxAmount = totalComponentTaxes > 0 ? totalComponentTaxes : totalTaxAmount;
          
          // For individual tax breakdown, use component if available
          const componentWageTax = paycheckComponents
            .filter(comp => comp.componentCategory === 'tax' && 
                           (comp.componentCode === 'LOONBELASTING' || comp.componentCode === 'INCOME_TAX'))
            .reduce((sum, comp) => sum + (comp.amount || 0), 0);
          const wageTax = componentWageTax > 0 ? componentWageTax : (taxCalculation.summary.totalWageTax || 0);
          
          console.log('Wage Tax (to use):', wageTax);
          console.log('Effective Tax Amount:', effectiveTaxAmount);
          
          // Calculate net pay: gross pay - taxes - deductions
          const netPay = grossPay - effectiveTaxAmount - totalDeductions;
          
          console.log('Net Pay Calculation:', `${grossPay} - ${effectiveTaxAmount} - ${totalDeductions} = ${netPay}`);

          // Create paycheck
          const paycheck = await this.payrollRepository.createPaycheck(
            {
              payrollRunId,
              employeeId: employeeId,
              payPeriodStart: payrollRun.pay_period_start,
              payPeriodEnd: payrollRun.pay_period_end,
              paymentDate: payrollRun.payment_date,
              grossPay,
              regularPay,
              overtimePay,
              // PHASE 2: Use component-based totals
              taxFreeAllowance: taxCalculation.summary.totalTaxFreeAllowance || 0,
              taxableIncome: taxCalculation.summary.totalTaxableIncome || 0,
              // Surinamese taxes (primary) - use component tax if available, otherwise calculated
              wageTax: wageTax,
              aovTax: taxCalculation.summary.totalAovTax || 0,
              awwTax: taxCalculation.summary.totalAwwTax || 0,
              // US taxes (for backward compatibility, set to 0)
              federalTax: 0,
              stateTax: 0,
              socialSecurity: 0,
              medicare: 0,
              preTaxDeductions: 0, // Not used in component-based system
              postTaxDeductions: 0, // Not used in component-based system
              otherDeductions: totalDeductions, // Store total deductions (from deduction category components)
              netPay,
              paymentMethod: employee.payment_method,
              paymentStatus: 'pending'
            },
            organizationId,
            userId
          );

          // PHASE 2: Store earning components with calculation metadata
          if (paycheckComponents.length > 0) {
            for (const component of paycheckComponents) {
              // Find matching tax calculation for this component
              const componentTax = taxCalculation.componentTaxes?.find(
                ct => ct.componentCode === component.componentCode
              );

              // Merge tax calculation into component metadata
              const enhancedMetadata = {
                ...component.calculationMetadata,
                taxCalculation: componentTax || null
              };

              await this.payrollRepository.createPayrollRunComponent(
                {
                  payrollRunId,
                  paycheckId: paycheck.id,
                  componentType: component.componentType || 'earning', // Use componentType, not componentCategory
                  componentCode: component.componentCode,
                  componentName: component.componentName,
                  amount: component.amount,
                  workerStructureId,
                  structureTemplateVersion: templateVersion,
                  componentConfigSnapshot: component.configSnapshot,
                  calculationMetadata: enhancedMetadata // PHASE 2: Include tax calculation
                },
                organizationId,
                userId
              );
            }
          } else if (taxCalculation.componentTaxes && taxCalculation.componentTaxes.length > 0) {
            // Store tax components even if no pay structure components
            for (const compTax of taxCalculation.componentTaxes) {
              await this.payrollRepository.createPayrollRunComponent(
                {
                  payrollRunId,
                  paycheckId: paycheck.id,
                  componentType: 'earning',
                  componentCode: compTax.componentCode,
                  componentName: compTax.componentName,
                  amount: compTax.amount,
                  workerStructureId: null,
                  structureTemplateVersion: null,
                  componentConfigSnapshot: null,
                  calculationMetadata: {
                    taxCalculation: compTax
                  }
                },
                organizationId,
                userId
              );
            }
          }

          // Store tax components
          if (taxCalculation.summary.totalWageTax > 0) {
            logger.debug('Creating wage tax component', {
              employeeId,
              paycheckId: paycheck.id,
              amount: taxCalculation.summary.totalWageTax
            });
            await this.payrollRepository.createPayrollRunComponent(
              {
                payrollRunId,
                paycheckId: paycheck.id,
                componentType: 'tax',
                componentCode: 'WAGE_TAX',
                componentName: 'Wage Tax (Loonbelasting)',
                amount: taxCalculation.summary.totalWageTax,
                workerStructureId: null,
                structureTemplateVersion: null,
                componentConfigSnapshot: null,
                calculationMetadata: {
                  taxType: 'wage_tax',
                  taxableIncome: taxCalculation.summary.totalTaxableIncome,
                  taxRate: taxCalculation.summary.totalWageTax / taxCalculation.summary.totalTaxableIncome
                }
              },
              organizationId,
              userId
            );
          }

          if (taxCalculation.summary.totalAovTax > 0) {
            await this.payrollRepository.createPayrollRunComponent(
              {
                payrollRunId,
                paycheckId: paycheck.id,
                componentType: 'tax',
                componentCode: 'AOV',
                componentName: 'AOV (Old Age Pension)',
                amount: taxCalculation.summary.totalAovTax,
                workerStructureId: null,
                structureTemplateVersion: null,
                componentConfigSnapshot: null,
                calculationMetadata: {
                  taxType: 'aov',
                  taxableIncome: taxCalculation.summary.totalTaxableIncome
                }
              },
              organizationId,
              userId
            );
          }

          if (taxCalculation.summary.totalAwwTax > 0) {
            await this.payrollRepository.createPayrollRunComponent(
              {
                payrollRunId,
                paycheckId: paycheck.id,
                componentType: 'tax',
                componentCode: 'AWW',
                componentName: 'AWW (Widow/Orphan Insurance)',
                amount: taxCalculation.summary.totalAwwTax,
                workerStructureId: null,
                structureTemplateVersion: null,
                componentConfigSnapshot: null,
                calculationMetadata: {
                  taxType: 'aww',
                  taxableIncome: taxCalculation.summary.totalTaxableIncome
                }
              },
              organizationId,
              userId
            );
          }

          // Store deduction components (if any exist)
          try {
            logger.debug('Fetching deductions for employee', {
              employeeId: employeeId,
              payPeriodEnd: payrollRun.pay_period_end
            });
            const deductions = await this.deductionRepository.findActiveDeductionsForPayroll(
              employeeId,
              payrollRun.pay_period_end,
              organizationId
            );

            logger.debug('Deductions fetched', { count: deductions.length });

            for (const deduction of deductions) {
              let deductionAmount = 0;
              if (deduction.calculation_type === 'fixed_amount') {
                deductionAmount = parseFloat(deduction.deduction_amount || 0);
              } else if (deduction.calculation_type === 'percentage') {
                deductionAmount = grossPay * (parseFloat(deduction.deduction_percentage || 0) / 100);
              }

              if (deductionAmount > 0) {
                await this.payrollRepository.createPayrollRunComponent(
                  {
                    payrollRunId,
                    paycheckId: paycheck.id,
                    componentType: 'deduction',
                    componentCode: deduction.deduction_code,
                    componentName: deduction.deduction_name,
                    amount: deductionAmount,
                    workerStructureId: null,
                    structureTemplateVersion: null,
                    componentConfigSnapshot: null,
                    calculationMetadata: {
                      deductionType: deduction.deduction_type,
                      isPreTax: deduction.is_pre_tax,
                      calculationType: deduction.calculation_type
                    }
                  },
                  organizationId,
                  userId
                );
              }
            }
          } catch (deductionErr) {
            logger.error('Error processing deductions', {
              error: deductionErr.message,
              stack: deductionErr.stack,
              employeeId: employeeId
            });
            throw deductionErr;
          }

          paychecks.push(paycheck);
          totalEmployees++;
          totalGrossPay += grossPay;
          totalNetPay += netPay;
          totalTaxes += totalTaxAmount;

        } catch (empErr) {
          logger.error('Error calculating paycheck for employee', {
            employeeId: employeeId,
            employeeConfigId: employee.id,
            error: empErr.message
          });
          // Continue with next employee
        }
      }

      // Update payroll run summary (keep status as 'calculating' until user marks it for review)
      await this.payrollRepository.updatePayrollRunSummary(
        payrollRunId,
        {
          totalEmployees,
          totalGrossPay,
          totalNetPay,
          totalTaxes,
          status: 'calculating',
          calculatedAt: nowUTC()
        },
        organizationId,
        userId
      );

      logger.info('Payroll calculation completed', {
        payrollRunId,
        totalEmployees,
        totalGrossPay,
        totalNetPay,
        organizationId
      });

      // Get updated payroll run data
      const updatedPayrollRun = await this.payrollRepository.findPayrollRunById(payrollRunId, organizationId);

      return {
        payrollRunId,
        totalEmployees,
        totalGrossPay,
        totalNetPay,
        totalTaxes,
        paychecks
      };

    } catch (err) {
      logger.error('Error calculating payroll', { error: err.message, payrollRunId });
      throw err;
    }
  }

  /**
   * Get payroll runs
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Payroll runs
   */
  async getPayrollRuns(organizationId, filters = {}) {
    try {
      // FIX: Repository expects (organizationId, filters) not (filters, organizationId)
      return await this.payrollRepository.findPayrollRuns(organizationId, filters);
    } catch (err) {
      logger.error('Error fetching payroll runs', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Get paychecks for payroll run
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Paychecks
   */
  async getPaychecksByRun(payrollRunId, organizationId) {
    try {
      // Verify payroll run exists first
      const payrollRun = await this.payrollRepository.findPayrollRunById(payrollRunId, organizationId);
      if (!payrollRun) {
        throw new NotFoundError('Payroll run not found');
      }
      
      return await this.payrollRepository.findPaychecksByRun(payrollRunId, organizationId);
    } catch (err) {
      logger.error('Error fetching paychecks', { error: err.message, payrollRunId });
      throw err;
    }
  }

  // ==================== TIMESHEETS ====================

  /**
   * Create timesheet
   * @param {Object} timesheetData - Timesheet data
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User creating the timesheet
   * @returns {Promise<Object>} Created timesheet
   */
  async createTimesheet(timesheetData, organizationId, userId) {
    const { error, value } = this.timesheetSchema.validate(timesheetData);
    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Business rule: Validate total hours
    const calculatedTotal = 
      value.regularHours + 
      value.overtimeHours + 
      value.ptoHours + 
      value.sickHours + 
      value.holidayHours;

    if (Math.abs(calculatedTotal - value.totalHours) > 0.01) {
      throw new Error('Total hours must equal sum of all hour categories');
    }

    try {
      const timesheet = await this.payrollRepository.createTimesheet(
        value,
        organizationId,
        userId
      );

      logger.info('Timesheet created', {
        timesheetId: timesheet.id,
        employeeId: timesheet.employee_id,
        organizationId
      });

      return timesheet;
    } catch (err) {
      logger.error('Error creating timesheet', { error: err.message, organizationId });
      throw err;
    }
  }

  /**
   * Approve timesheet
   * @param {string} timesheetId - Timesheet UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User approving the timesheet
   * @returns {Promise<Object>} Updated timesheet
   */
  async approveTimesheet(timesheetId, organizationId, userId) {
    try {
      const timesheet = await this.payrollRepository.updateTimesheetStatus(
        timesheetId,
        'approved',
        organizationId,
        userId
      );

      logger.info('Timesheet approved', {
        timesheetId,
        approvedBy: userId,
        organizationId
      });

      return timesheet;
    } catch (err) {
      logger.error('Error approving timesheet', { error: err.message, timesheetId });
      throw err;
    }
  }

  /**
   * Reject timesheet
   * @param {string} timesheetId - Timesheet UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User rejecting the timesheet
   * @returns {Promise<Object>} Updated timesheet
   */
  async rejectTimesheet(timesheetId, organizationId, userId) {
    try {
      const timesheet = await this.payrollRepository.updateTimesheetStatus(
        timesheetId,
        'rejected',
        organizationId,
        userId
      );

      logger.info('Timesheet rejected', {
        timesheetId,
        rejectedBy: userId,
        organizationId
      });

      return timesheet;
    } catch (err) {
      logger.error('Error rejecting timesheet', { error: err.message, timesheetId });
      throw err;
    }
  }

  /**
   * Get timesheets for approval
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Timesheets pending approval
   */
  async getTimesheetsForApproval(organizationId, filters = {}) {
    try {
      return await this.payrollRepository.findTimesheetsForApproval(filters, organizationId);
    } catch (err) {
      logger.error('Error fetching timesheets for approval', { error: err.message, organizationId });
      throw err;
    }
  }

  // ==================== ALIAS METHODS FOR API COMPATIBILITY ====================

  /**
   * Alias: Get payroll runs by organization
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Payroll runs
   */
  async getPayrollRunsByOrganization(organizationId, filters = {}) {
    return this.getPayrollRuns(organizationId, filters);
  }

  /**
   * Alias: Get payroll run by ID
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} Payroll run
   */
  async getPayrollRunById(payrollRunId, organizationId) {
    try {
      const payrollRun = await this.payrollRepository.findPayrollRunById(payrollRunId, organizationId);
      
      if (!payrollRun) {
        throw new NotFoundError('Payroll run not found');
      }

      return payrollRun;
    } catch (err) {
      logger.error('Error fetching payroll run', { error: err.message, payrollRunId, organizationId });
      throw err;
    }
  }

  /**
   * Alias: Update payroll run
   * @param {string} payrollRunId - Payroll run UUID
   * @param {Object} updates - Fields to update
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User making the update
   * @returns {Promise<Object>} Updated payroll run
   */
  async updatePayrollRun(payrollRunId, updates, organizationId, userId) {
    try {
      const payrollRun = await this.payrollRepository.updatePayrollRun(
        payrollRunId,
        updates,
        organizationId,
        userId
      );

      if (!payrollRun) {
        throw new NotFoundError('Payroll run not found');
      }

      logger.info('Payroll run updated', { payrollRunId, organizationId });
      return payrollRun;
    } catch (err) {
      logger.error('Error updating payroll run', { error: err.message, payrollRunId, organizationId });
      throw err;
    }
  }

  /**
   * Mark payroll run as ready for review (calculating -> calculated)
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User marking for review
   * @returns {Promise<Object>} Updated payroll run
   */
  async markPayrollRunForReview(payrollRunId, organizationId, userId) {
    try {
      const payrollRun = await this.payrollRepository.findPayrollRunById(payrollRunId, organizationId);
      
      if (!payrollRun) {
        throw new NotFoundError('Payroll run not found');
      }

      if (payrollRun.status !== 'calculating') {
        throw new ValidationError('Payroll run must be in calculating status to mark for review');
      }

      // Verify that paychecks exist
      const paychecks = await this.payrollRepository.findPaychecksByRun(payrollRunId, organizationId);
      if (!paychecks || paychecks.length === 0) {
        throw new ValidationError('Cannot mark for review: No paychecks have been calculated yet');
      }

      const updated = await this.payrollRepository.updatePayrollRun(
        payrollRunId,
        { 
          status: 'calculated',
          updated_by: userId
        },
        organizationId
      );

      logger.info('Payroll run marked for review', { payrollRunId, organizationId, userId });
      return updated;
    } catch (err) {
      logger.error('Error marking payroll run for review', { error: err.message, payrollRunId, organizationId });
      throw err;
    }
  }

  /**
   * Alias: Finalize payroll run
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User finalizing the run
   * @returns {Promise<Object>} Finalized payroll run
   */
  async finalizePayrollRun(payrollRunId, organizationId, userId) {
    try {
      const payrollRun = await this.payrollRepository.findPayrollRunById(payrollRunId, organizationId);
      
      if (!payrollRun) {
        throw new NotFoundError('Payroll run not found');
      }

      if (payrollRun.status !== 'calculated') {
        throw new ValidationError('Payroll run must be in calculated status to finalize');
      }

      const finalized = await this.payrollRepository.updatePayrollRun(
        payrollRunId,
        { 
          status: 'approved',  // Valid status from schema: draft -> calculating -> calculated -> approved -> processing -> processed
          approved_by: userId,
          approved_at: nowUTC()
        },
        organizationId
      );

      logger.info('Payroll run finalized', { payrollRunId, organizationId, userId });
      return finalized;
    } catch (err) {
      logger.error('Error finalizing payroll run', { error: err.message, payrollRunId, organizationId });
      throw err;
    }
  }

  /**
   * Alias: Delete payroll run
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the run
   * @returns {Promise<boolean>} Success status
   */
  async deletePayrollRun(payrollRunId, organizationId, userId) {
    try {
      const payrollRun = await this.payrollRepository.findPayrollRunById(payrollRunId, organizationId);
      
      if (!payrollRun) {
        throw new NotFoundError('Payroll run not found');
      }

      if (payrollRun.status === 'finalized' || payrollRun.status === 'paid') {
        throw new ValidationError('Cannot delete finalized or paid payroll runs');
      }

      const deleted = await this.payrollRepository.deletePayrollRun(
        payrollRunId,
        organizationId,
        userId
      );

      logger.info('Payroll run deleted', { payrollRunId, organizationId, userId });
      return deleted;
    } catch (err) {
      logger.error('Error deleting payroll run', { error: err.message, payrollRunId, organizationId });
      throw err;
    }
  }

  /**
   * Alias: Get paychecks by payroll run
   * @param {string} payrollRunId - Payroll run UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Array>} Paychecks
   */
  async getPaychecksByPayrollRun(payrollRunId, organizationId) {
    return this.getPaychecksByRun(payrollRunId, organizationId);
  }

  // ==================== PAYCHECK MANAGEMENT ====================

  /**
   * Get all paychecks by organization with filters
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Paychecks
   */
  async getPaychecksByOrganization(organizationId, filters = {}) {
    try {
      return await this.payrollRepository.findPaychecksByOrganization(organizationId, filters);
    } catch (_error) {
      logger.error('Error fetching paychecks by organization', {
        error: _error.message,
        organizationId,
        filters,
      });
      throw new Error('Failed to fetch paychecks');
    }
  }

  /**
   * Get paycheck by ID
   * @param {string} paycheckId - Paycheck UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object|null>} Paycheck or null
   */
  async getPaycheckById(paycheckId, organizationId) {
    try {
      return await this.payrollRepository.findPaycheckById(paycheckId, organizationId);
    } catch (_error) {
      logger.error('Error fetching paycheck by ID', {
        error: _error.message,
        paycheckId,
        organizationId,
      });
      throw new Error('Failed to fetch paycheck');
    }
  }

  /**
   * Get paychecks by employee
   * @param {string} employeeId - Employee UUID (from HRIS)
   * @param {string} organizationId - Organization UUID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Paychecks
   */
  async getPaychecksByEmployee(employeeId, organizationId, filters = {}) {
    try {
      return await this.payrollRepository.findPaychecksByEmployee(employeeId, organizationId, filters);
    } catch (_error) {
      logger.error('Error fetching paychecks by employee', {
        error: _error.message,
        employeeId,
        organizationId,
        filters,
      });
      throw new Error('Failed to fetch employee paychecks');
    }
  }

  /**
   * Update paycheck
   * @param {string} paycheckId - Paycheck UUID
   * @param {string} organizationId - Organization UUID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object|null>} Updated paycheck or null
   */
  async updatePaycheck(paycheckId, organizationId, updateData) {
    try {
      // Validate paycheck exists
      const existingPaycheck = await this.payrollRepository.findPaycheckById(paycheckId, organizationId);
      if (!existingPaycheck) {
        return null;
      }

      // Prevent updating critical financial fields
      const { grossPay, netPay, federalTax, stateTax, ...allowedUpdates } = updateData;

      const updated = await this.payrollRepository.updatePaycheck(
        paycheckId,
        allowedUpdates,
        organizationId,
        updateData.updatedBy
      );

      logger.info('Paycheck updated', {
        paycheckId,
        organizationId,
        userId: updateData.updatedBy,
      });

      return updated;
    } catch (_error) {
      logger.error('Error updating paycheck', {
        error: _error.message,
        paycheckId,
        organizationId,
      });
      throw new Error('Failed to update paycheck');
    }
  }

  /**
   * Void a paycheck
   * @param {string} paycheckId - Paycheck UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User voiding the paycheck
   * @param {string} reason - Reason for voiding
   * @returns {Promise<Object>} Voided paycheck
   */
  async voidPaycheck(paycheckId, organizationId, userId, reason) {
    try {
      const paycheck = await this.payrollRepository.findPaycheckById(paycheckId, organizationId);
      
      if (!paycheck) {
        throw new Error('Paycheck not found');
      }

      if (paycheck.status === 'voided') {
        throw new Error('Paycheck is already voided');
      }

      if (paycheck.status === 'paid') {
        throw new Error('Paid paychecks cannot be voided directly - please contact accounting');
      }

      const updated = await this.payrollRepository.updatePaycheck(
        paycheckId,
        {
          status: 'voided',
        },
        organizationId,
        userId
      );

      logger.info('Paycheck voided', {
        paycheckId,
        organizationId,
        reason,
        userId,
      });

      return updated;
    } catch (_error) {
      logger.error('Error voiding paycheck', {
        error: _error.message,
        paycheckId,
        organizationId,
      });
      throw _error;
    }
  }

  /**
   * Reissue a paycheck (create a new one, void the old one)
   * @param {string} paycheckId - Original paycheck UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User reissuing the paycheck
   * @param {Object} adjustments - Adjustments to apply
   * @returns {Promise<Object>} New paycheck
   */
  async reissuePaycheck(paycheckId, organizationId, userId, adjustments = {}) {
    try {
      const originalPaycheck = await this.payrollRepository.findPaycheckById(paycheckId, organizationId);
      
      if (!originalPaycheck) {
        throw new Error('Paycheck not found');
      }

      // Business rule: Can only reissue voided paychecks
      if (originalPaycheck.status !== 'voided') {
        throw new Error('Cannot reissue paycheck - must be voided first. Use the void endpoint before reissuing.');
      }

      // Validate adjustments (prevent negative amounts)
      if (adjustments.grossPay !== undefined && adjustments.grossPay < 0) {
        throw new Error('Invalid adjustment: gross pay cannot be negative');
      }

      // Create new paycheck with adjustments
      const newPaycheckData = {
        payrollRunId: originalPaycheck.payroll_run_id,
        employeeId: originalPaycheck.employee_id,
        paymentDate: adjustments.paymentDate || originalPaycheck.payment_date,
        payPeriodStart: originalPaycheck.pay_period_start,
        payPeriodEnd: originalPaycheck.pay_period_end,
        grossPay: adjustments.grossPay !== undefined ? adjustments.grossPay : originalPaycheck.gross_pay,
        regularPay: adjustments.regularPay !== undefined ? adjustments.regularPay : originalPaycheck.regular_pay,
        overtimePay: adjustments.overtimePay !== undefined ? adjustments.overtimePay : originalPaycheck.overtime_pay,
        // PHASE 1: Preserve tax-free allowance and taxable income
        taxFreeAllowance: adjustments.taxFreeAllowance !== undefined ? adjustments.taxFreeAllowance : originalPaycheck.tax_free_allowance,
        taxableIncome: adjustments.taxableIncome !== undefined ? adjustments.taxableIncome : originalPaycheck.taxable_income,
        federalTax: adjustments.federalTax !== undefined ? adjustments.federalTax : originalPaycheck.federal_tax,
        stateTax: adjustments.stateTax !== undefined ? adjustments.stateTax : originalPaycheck.state_tax,
        socialSecurity: adjustments.socialSecurity !== undefined ? adjustments.socialSecurity : originalPaycheck.social_security,
        medicare: adjustments.medicare !== undefined ? adjustments.medicare : originalPaycheck.medicare,
        otherDeductions: adjustments.otherDeductions !== undefined ? adjustments.otherDeductions : originalPaycheck.other_deductions,
        netPay: adjustments.netPay !== undefined ? adjustments.netPay : originalPaycheck.net_pay,
        paymentMethod: adjustments.paymentMethod || originalPaycheck.payment_method,
      };

      const newPaycheck = await this.payrollRepository.createPaycheck(
        newPaycheckData,
        organizationId,
        userId
      );

      logger.info('Paycheck reissued', {
        originalPaycheckId: paycheckId,
        newPaycheckId: newPaycheck.id,
        organizationId,
        userId,
      });

      // Return the new paycheck
      return this.payrollRepository.findPaycheckById(newPaycheck.id, organizationId);
    } catch (_error) {
      logger.error('Error reissuing paycheck', {
        error: _error.message,
        paycheckId,
        organizationId,
      });
      throw _error;
    }
  }

  /**
   * Delete paycheck (soft delete)
   * @param {string} paycheckId - Paycheck UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User deleting the paycheck
   * @returns {Promise<boolean>} True if deleted
   */
  async deletePaycheck(paycheckId, organizationId, userId) {
    try {
      const paycheck = await this.payrollRepository.findPaycheckById(paycheckId, organizationId);
      
      if (!paycheck) {
        return false;
      }

      if (paycheck.status === 'paid') {
        throw new Error('Paid paychecks cannot be deleted');
      }

      const deleted = await this.payrollRepository.deletePaycheck(paycheckId, organizationId, userId);

      if (deleted) {
        logger.info('Paycheck deleted', {
          paycheckId,
          organizationId,
          userId,
        });
      }

      return deleted;
    } catch (_error) {
      logger.error('Error deleting paycheck', {
        error: _error.message,
        paycheckId,
        organizationId,
      });
      throw _error;
    }
  }

  // ==================== USER ACCESS MANAGEMENT ====================

  /**
   * Grant system access to an employee
   * Creates a hris.user_account and links it to the employee
   * @param {string} employeeId - Employee UUID
   * @param {Object} accessData - Access configuration
   * @param {string} [accessData.password] - Optional password (generates temp password if not provided)
   * @param {Object} [accessData.preferences] - User preferences
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User granting access
   * @returns {Promise<Object>} Created user account with temporary password if generated
   */
  async grantSystemAccess(employeeId, accessData, organizationId, userId) {
    try {
      // Import userAccountService
      const { default: userAccountService } = await import('../../../services/userAccountService');

      // Get employee record
      const employee = await this.payrollRepository.findEmployeeRecordById(employeeId, organizationId);
      
      if (!employee) {
        throw new NotFoundError('Employee not found');
      }

      // Check if employee already has user account
      const existingAccount = await userAccountService.getUserAccountByEmployeeId(
        employeeId,
        organizationId
      );

      if (existingAccount) {
        throw new ConflictError('Employee already has system access');
      }

      // Verify employee has email
      if (!employee.email) {
        throw new ValidationError('Employee must have an email address to grant system access');
      }

      // Create user account
      const userAccount = await userAccountService.createUserAccount(
        {
          organizationId,
          email: employee.email,
          password: accessData.password,
          preferences: accessData.preferences
        },
        userId
      );

      // Link user account to employee
      await userAccountService.linkUserAccountToEmployee(
        userAccount.id,
        employeeId,
        organizationId,
        userId
      );

      logger.info('System access granted to employee', {
        employeeId,
        userAccountId: userAccount.id,
        email: employee.email,
        organizationId
      });

      return {
        userAccount: {
          id: userAccount.id,
          email: userAccount.email,
          accountStatus: userAccount.account_status,
          isActive: userAccount.is_active
        },
        temporaryPassword: userAccount.temporaryPassword,
        requiresPasswordChange: userAccount.requiresPasswordChange
      };
    } catch (_error) {
      logger.error('Error granting system access', {
        error: _error.message,
        employeeId,
        organizationId
      });
      throw _error;
    }
  }

  /**
   * Revoke system access from an employee
   * Deactivates the user account and unlinks it from employee
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User revoking access
   * @returns {Promise<Object>} Result of revocation
   */
  async revokeSystemAccess(employeeId, organizationId, userId) {
    try {
      const { default: userAccountService } = await import('../../../services/userAccountService');

      // Get employee record
      const employee = await this.payrollRepository.findEmployeeRecordById(employeeId, organizationId);
      
      if (!employee) {
        throw new NotFoundError('Employee not found');
      }

      // Get user account
      const userAccount = await userAccountService.getUserAccountByEmployeeId(
        employeeId,
        organizationId
      );

      if (!userAccount) {
        throw new NotFoundError('Employee does not have system access');
      }

      // Deactivate user account
      await userAccountService.deactivateUserAccount(
        userAccount.id,
        organizationId,
        userId
      );

      // Unlink from employee
      await userAccountService.unlinkUserAccountFromEmployee(
        employeeId,
        organizationId,
        userId
      );

      logger.info('System access revoked from employee', {
        employeeId,
        userAccountId: userAccount.id,
        organizationId
      });

      return {
        success: true,
        message: 'System access revoked successfully'
      };
    } catch (_error) {
      logger.error('Error revoking system access', {
        error: _error.message,
        employeeId,
        organizationId
      });
      throw _error;
    }
  }

  /**
   * Get user account status for an employee
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @returns {Promise<Object>} User account status
   */
  async getUserAccountStatus(employeeId, organizationId) {
    try {
      const { default: userAccountService } = await import('../../../services/userAccountService');

      // Get employee record
      const employee = await this.payrollRepository.findEmployeeRecordById(employeeId, organizationId);
      
      if (!employee) {
        throw new NotFoundError('Employee not found');
      }

      // Get user account
      const userAccount = await userAccountService.getUserAccountByEmployeeId(
        employeeId,
        organizationId
      );

      if (!userAccount) {
        return {
          hasAccount: false,
          accountStatus: null,
          email: employee.email
        };
      }

      return {
        hasAccount: true,
        userAccountId: userAccount.id,
        email: userAccount.email,
        accountStatus: userAccount.account_status,
        isActive: userAccount.is_active,
        lastLoginAt: userAccount.last_login_at,
        createdAt: userAccount.created_at
      };
    } catch (_error) {
      logger.error('Error getting user account status', {
        error: _error.message,
        employeeId,
        organizationId
      });
      throw _error;
    }
  }

  /**
   * Update employee user access settings
   * @param {string} employeeId - Employee UUID
   * @param {Object} updates - Access updates
   * @param {string} organizationId - Organization UUID
   * @param {string} userId - User performing update
   * @returns {Promise<Object>} Updated user account
   */
  async updateEmployeeAccess(employeeId, updates, organizationId, userId) {
    try {
      const { default: userAccountService } = await import('../../../services/userAccountService');

      // Get user account
      const userAccount = await userAccountService.getUserAccountByEmployeeId(
        employeeId,
        organizationId
      );

      if (!userAccount) {
        throw new NotFoundError('Employee does not have system access');
      }

      // Update user account
      const updated = await userAccountService.updateUserAccount(
        userAccount.id,
        updates,
        organizationId,
        userId
      );

      logger.info('Employee access updated', {
        employeeId,
        userAccountId: userAccount.id,
        organizationId
      });

      return {
        userAccountId: updated.id,
        email: updated.email,
        accountStatus: updated.account_status,
        isActive: updated.is_active
      };
    } catch (_error) {
      logger.error('Error updating employee access', {
        error: _error.message,
        employeeId,
        organizationId
      });
      throw _error;
    }
  }

  /**
   * Get YTD (Year-to-Date) payroll summary for an employee
   * @param {string} employeeId - Employee UUID
   * @param {string} organizationId - Organization UUID
   * @param {number} year - Year for YTD summary (defaults to current year)
   * @returns {Promise<Object>} YTD summary with totals
   */
  async getEmployeeYtdSummary(employeeId, organizationId, year = null) {
    try {
      const targetYear = year || new Date().getFullYear();
      
      const sql = `
        SELECT 
          COUNT(*) as paycheck_count,
          SUM(gross_pay) as ytd_gross_pay,
          SUM(net_pay) as ytd_net_pay,
          SUM(total_taxes) as ytd_taxes,
          SUM(total_deductions) as ytd_deductions,
          MIN(pay_period_start_date) as first_pay_period,
          MAX(pay_period_end_date) as last_pay_period
        FROM payroll.paycheck
        WHERE employee_id = $1
          AND organization_id = $2
          AND EXTRACT(YEAR FROM pay_period_end_date) = $3
          AND status IN ('approved', 'paid')
          AND deleted_at IS NULL
      `;

      const result = await db(sql, [employeeId, organizationId, targetYear], organizationId);

      if (result.rows.length === 0 || result.rows[0].paycheck_count === 0) {
        return {
          year: targetYear,
          paycheckCount: 0,
          ytdGrossPay: 0,
          ytdNetPay: 0,
          ytdTaxes: 0,
          ytdDeductions: 0,
          firstPayPeriod: null,
          lastPayPeriod: null
        };
      }

      const row = result.rows[0];

      return {
        year: targetYear,
        paycheckCount: parseInt(row.paycheck_count) || 0,
        ytdGrossPay: parseFloat(row.ytd_gross_pay) || 0,
        ytdNetPay: parseFloat(row.ytd_net_pay) || 0,
        ytdTaxes: parseFloat(row.ytd_taxes) || 0,
        ytdDeductions: parseFloat(row.ytd_deductions) || 0,
        firstPayPeriod: row.first_pay_period,
        lastPayPeriod: row.last_pay_period
      };
    } catch (_error) {
      logger.error('Error fetching employee YTD summary', {
        error: _error.message,
        employeeId,
        organizationId,
        year: year || new Date().getFullYear()
      });
      throw new Error('Failed to fetch YTD summary');
    }
  }
}

export default PayrollService;
