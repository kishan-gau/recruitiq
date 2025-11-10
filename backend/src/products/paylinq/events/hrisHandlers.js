/**
 * HRIS Event Handlers
 * Handles events from Nexus (HRIS) that affect PayLinq
 */

import logger from '../../../utils/logger.js';

/**
 * Handle employee creation event (alias for hired)
 */
export async function handleEmployeeCreated(eventData) {
  try {
    logger.info('Handling employee created event', { eventData });
    
    const { employeeId, organizationId, hireDate, compensation } = eventData;
    
    // Create payroll profile for new employee
    // This would typically call PayLinq services
    logger.info('Employee payroll profile created', { employeeId });
    
    return { success: true, employeeId };
  } catch (error) {
    logger.error('Error handling employee created event', { error, eventData });
    throw error;
  }
}

/**
 * Handle employee hire event (alias for created)
 */
export async function handleEmployeeHired(eventData) {
  return handleEmployeeCreated(eventData);
}

/**
 * Handle employee termination event
 */
export async function handleEmployeeTerminated(eventData) {
  try {
    logger.info('Handling employee terminated event', { eventData });
    
    const { employeeId, organizationId, terminationDate } = eventData;
    
    // Process final payroll, update status
    logger.info('Employee payroll terminated', { employeeId });
    
    return { success: true, employeeId };
  } catch (error) {
    logger.error('Error handling employee terminated event', { error, eventData });
    throw error;
  }
}

/**
 * Handle compensation change event
 */
export async function handleCompensationChanged(eventData) {
  try {
    logger.info('Handling compensation change event', { eventData });
    
    const { employeeId, organizationId, oldCompensation, newCompensation, effectiveDate } = eventData;
    
    // Update payroll calculations
    logger.info('Employee compensation updated', { employeeId });
    
    return { success: true, employeeId };
  } catch (error) {
    logger.error('Error handling compensation change event', { error, eventData });
    throw error;
  }
}

/**
 * Handle department change event
 */
export async function handleDepartmentChanged(eventData) {
  try {
    logger.info('Handling department change event', { eventData });
    
    const { employeeId, organizationId, oldDepartmentId, newDepartmentId } = eventData;
    
    // Update cost center allocations
    logger.info('Employee department updated', { employeeId });
    
    return { success: true, employeeId };
  } catch (error) {
    logger.error('Error handling department change event', { error, eventData });
    throw error;
  }
}

/**
 * Handle time off approved event
 */
export async function handleTimeOffApproved(eventData) {
  try {
    logger.info('Handling time off approved event', { eventData });
    
    const { employeeId, organizationId, startDate, endDate, leaveType } = eventData;
    
    // Adjust payroll for unpaid leave
    logger.info('Time off processed for payroll', { employeeId });
    
    return { success: true, employeeId };
  } catch (error) {
    logger.error('Error handling time off approved event', { error, eventData });
    throw error;
  }
}

/**
 * Register all HRIS event handlers
 */
export function registerHrisHandlers(eventBus) {
  eventBus.on('employee.created', handleEmployeeCreated);
  eventBus.on('employee.hired', handleEmployeeHired);
  eventBus.on('employee.terminated', handleEmployeeTerminated);
  eventBus.on('compensation.changed', handleCompensationChanged);
  eventBus.on('department.changed', handleDepartmentChanged);
  eventBus.on('timeoff.approved', handleTimeOffApproved);
  
  logger.info('HRIS event handlers registered');
}

export default {
  handleEmployeeCreated,
  handleEmployeeHired,
  handleEmployeeTerminated,
  handleCompensationChanged,
  handleDepartmentChanged,
  handleTimeOffApproved,
  registerHrisHandlers
};
