/**
 * HRIS Event Handlers
 * 
 * Handles employee lifecycle events from Nexus HRIS system.
 * Synchronizes employee data between HRIS and Payroll systems.
 * 
 * @module products/paylinq/events/handlers/hrisHandlers
 */

import PayrollRepository from '../../repositories/payrollRepository.js';
import WorkerTypeRepository from '../../repositories/workerTypeRepository.js';
import logger from '../../../../utils/logger.js';
import { ValidationError, NotFoundError  } from '../../../../middleware/errorHandler.js';

const payrollRepository = new PayrollRepository();
const workerTypeRepository = new WorkerTypeRepository();

/**
 * Handle employee.created event from HRIS
 * Creates corresponding payroll record when employee is created in HRIS
 * 
 * @param {Object} event - Event object
 * @param {Object} event.data - Employee data from HRIS
 * @param {string} event.data.organizationId - Organization ID
 * @param {string} event.data.employeeId - Employee ID from HRIS
 * @param {string} event.data.firstName - Employee first name
 * @param {string} event.data.lastName - Employee last name
 * @param {string} event.data.email - Employee email
 * @param {string} event.data.startDate - Employee start date
 * @param {string} event.data.jobTitle - Job title
 * @param {string} event.data.departmentId - Department ID
 */
async function handleEmployeeCreated(event) {
  try {
    const { data } = event;
    const { organizationId, employeeId, firstName, lastName, email, startDate, jobTitle } = data;

    logger.info('Processing employee.created event', {
      organizationId,
      employeeId,
      eventId: event.eventId
    });

    // Check if employee payroll record already exists
    const existing = await payrollRepository.findByOrganization(organizationId, { employeeId });
    
    if (existing && existing.length > 0) {
      logger.warn('Employee payroll record already exists', {
        organizationId,
        employeeId
      });
      return {
        success: true,
        action: 'skipped',
        reason: 'Record already exists'
      };
    }

    // Create employee payroll record
    const employeeData = {
      employeeId: employeeId,
      employeeNumber: `EMP-${Date.now()}`, // Generate employee number
      payFrequency: 'monthly', // Default to monthly, can be updated later
      paymentMethod: 'ach', // Default to ACH
      currency: 'SRD',
      status: 'active',
      startDate: startDate || new Date().toISOString().split('T')[0],
      // Bank details will be added later when employee provides them
      bankName: null,
      accountNumber: null,
      routingNumber: null,
      accountType: null,
      // Tax details will be configured separately
      taxId: null,
      taxFilingStatus: null,
      taxAllowances: 0,
      additionalWithholding: 0
    };

    const employeeRecord = await payrollRepository.createEmployeeRecord(
      employeeData,
      organizationId,
      'system' // System-generated during HRIS sync
    );

    logger.info('Employee payroll record created from HRIS event', {
      organizationId,
      employeeId,
      employeeRecordId: employeeRecord.id
    });

    return {
      success: true,
      action: 'created',
      employeeRecordId: employeeRecord.id
    };
  } catch (error) {
    logger.error('Error handling employee.created event', {
      error: error.message,
      eventId: event.eventId,
      organizationId: event.data?.organizationId
    });
    throw error;
  }
}

/**
 * Handle employee.updated event from HRIS
 * Updates employee payroll record when employee data changes in HRIS
 * 
 * @param {Object} event - Event object
 * @param {Object} event.data - Updated employee data
 */
async function handleEmployeeUpdated(event) {
  try {
    const { data } = event;
    const { organizationId, employeeId, changes } = data;

    logger.info('Processing employee.updated event', {
      organizationId,
      employeeId,
      changes: Object.keys(changes || {})
    });

    // Find employee payroll record
    const employees = await payrollRepository.findByOrganization(organizationId, { employeeId });
    
    if (!employees || employees.length === 0) {
      logger.warn('Employee payroll record not found for update', {
        organizationId,
        employeeId
      });
      return {
        success: false,
        action: 'skipped',
        reason: 'Employee payroll record not found'
      };
    }

    const employeeRecord = employees[0];

    // Map HRIS changes to payroll updates (only if relevant fields changed)
    const updates = {};
    
    if (changes.status) {
      // Map HRIS status to payroll status
      const statusMap = {
        'active': 'active',
        'inactive': 'inactive',
        'terminated': 'terminated',
        'on_leave': 'inactive'
      };
      updates.status = statusMap[changes.status] || 'active';
    }

    // Only update if there are relevant changes
    if (Object.keys(updates).length === 0) {
      logger.info('No payroll-relevant changes in employee update', {
        organizationId,
        employeeId
      });
      return {
        success: true,
        action: 'skipped',
        reason: 'No payroll-relevant changes'
      };
    }

    const updated = await payrollRepository.updateEmployeeRecord(
      employeeRecord.id,
      updates,
      organizationId,
      'system'
    );

    logger.info('Employee payroll record updated from HRIS event', {
      organizationId,
      employeeId,
      employeeRecordId: employeeRecord.id,
      updates: Object.keys(updates)
    });

    return {
      success: true,
      action: 'updated',
      employeeRecordId: updated.id,
      changes: Object.keys(updates)
    };
  } catch (error) {
    logger.error('Error handling employee.updated event', {
      error: error.message,
      eventId: event.eventId,
      organizationId: event.data?.organizationId
    });
    throw error;
  }
}

/**
 * Handle employee.terminated event from HRIS
 * Marks employee payroll record as terminated
 * 
 * @param {Object} event - Event object
 * @param {Object} event.data - Termination data
 * @param {string} event.data.employeeId - Employee ID
 * @param {string} event.data.terminationDate - Termination date
 * @param {string} event.data.terminationReason - Reason for termination
 */
async function handleEmployeeTerminated(event) {
  try {
    const { data } = event;
    const { organizationId, employeeId, terminationDate, terminationReason } = data;

    logger.info('Processing employee.terminated event', {
      organizationId,
      employeeId,
      terminationDate
    });

    // Find employee payroll record
    const employees = await payrollRepository.findByOrganization(organizationId, { employeeId });
    
    if (!employees || employees.length === 0) {
      logger.warn('Employee payroll record not found for termination', {
        organizationId,
        employeeId
      });
      return {
        success: false,
        action: 'skipped',
        reason: 'Employee payroll record not found'
      };
    }

    const employeeRecord = employees[0];

    // Update employee status to terminated
    const updated = await payrollRepository.updateEmployeeRecord(
      employeeRecord.id,
      { status: 'terminated' },
      organizationId,
      'system'
    );

    logger.info('Employee payroll record terminated from HRIS event', {
      organizationId,
      employeeId,
      employeeRecordId: employeeRecord.id,
      terminationDate
    });

    return {
      success: true,
      action: 'terminated',
      employeeRecordId: updated.id,
      terminationDate
    };
  } catch (error) {
    logger.error('Error handling employee.terminated event', {
      error: error.message,
      eventId: event.eventId,
      organizationId: event.data?.organizationId
    });
    throw error;
  }
}

/**
 * Handle department.changed event from HRIS
 * Updates employee assignments when department structure changes
 * 
 * @param {Object} event - Event object
 * @param {Object} event.data - Department change data
 */
async function handleDepartmentChanged(event) {
  try {
    const { data } = event;
    const { organizationId, departmentId, changes, affectedEmployees } = data;

    logger.info('Processing department.changed event', {
      organizationId,
      departmentId,
      affectedEmployeeCount: affectedEmployees?.length || 0
    });

    // For payroll, department changes may affect cost center allocations
    // This is primarily informational - actual updates would be handled
    // through employee.updated events for individual employees

    logger.info('Department change noted for payroll', {
      organizationId,
      departmentId,
      changes: Object.keys(changes || {})
    });

    return {
      success: true,
      action: 'acknowledged',
      departmentId
    };
  } catch (error) {
    logger.error('Error handling department.changed event', {
      error: error.message,
      eventId: event.eventId,
      organizationId: event.data?.organizationId
    });
    throw error;
  }
}

/**
 * Handle compensation.changed event from HRIS
 * Updates employee compensation in payroll when changed in HRIS
 * 
 * @param {Object} event - Event object
 * @param {Object} event.data - Compensation change data
 * @param {string} event.data.employeeId - Employee ID
 * @param {string} event.data.compensationType - Type (hourly/salary)
 * @param {number} event.data.amount - New compensation amount
 * @param {string} event.data.effectiveDate - When change takes effect
 */
async function handleCompensationChanged(event) {
  try {
    const { data } = event;
    const { organizationId, employeeId, compensationType, amount, effectiveDate, currency } = data;

    logger.info('Processing compensation.changed event', {
      organizationId,
      employeeId,
      compensationType,
      amount
    });

    // Find employee payroll record
    const employees = await payrollRepository.findByOrganization(organizationId, { employeeId });
    
    if (!employees || employees.length === 0) {
      logger.warn('Employee payroll record not found for compensation update', {
        organizationId,
        employeeId
      });
      return {
        success: false,
        action: 'skipped',
        reason: 'Employee payroll record not found'
      };
    }

    const employeeRecord = employees[0];

    // Create new compensation record
    const compensationData = {
      employeeRecordId: employeeRecord.id,
      compensationType: compensationType || 'salary',
      payRate: amount,
      payPeriod: compensationType === 'hourly' ? 'hour' : 'month',
      effectiveFrom: effectiveDate || new Date().toISOString().split('T')[0],
      effectiveTo: null,
      isCurrent: true
    };

    const compensation = await payrollRepository.createCompensation(
      compensationData,
      organizationId,
      'system'
    );

    logger.info('Compensation updated from HRIS event', {
      organizationId,
      employeeId,
      compensationId: compensation.id,
      amount
    });

    return {
      success: true,
      action: 'updated',
      compensationId: compensation.id,
      employeeRecordId: employeeRecord.id
    };
  } catch (error) {
    logger.error('Error handling compensation.changed event', {
      error: error.message,
      eventId: event.eventId,
      organizationId: event.data?.organizationId
    });
    throw error;
  }
}

export default {
  handleEmployeeCreated,
  handleEmployeeUpdated,
  handleEmployeeTerminated,
  handleDepartmentChanged,
  handleCompensationChanged
};
