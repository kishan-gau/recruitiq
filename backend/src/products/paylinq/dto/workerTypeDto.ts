/**
 * Worker Type DTO Mappers
 * 
 * ARCHITECTURE NOTE: Worker types are now owned by HRIS (hris.worker_type).
 * This DTO combines HRIS worker type data with PayLinQ-specific pay configurations.
 * 
 * Transforms data between database format (snake_case) and API format (camelCase)
 * for worker types, pay configurations, and historical assignments.
 * 
 * @module products/paylinq/dto/workerTypeDto
 */

/**
 * Map worker type from DB to API format
 * Combines hris.worker_type with payroll.worker_type_pay_config
 * @param {Object} dbWorkerType - Combined database record (snake_case)
 * @returns {Object|null} API-formatted worker type (camelCase)
 */
export function mapWorkerTypeDbToApi(dbWorkerType) {
  if (!dbWorkerType) return null;

  return {
    id: dbWorkerType.id,
    organizationId: dbWorkerType.organization_id,
    
    // Worker Type Identity (from hris.worker_type)
    name: dbWorkerType.name,
    code: dbWorkerType.code,
    description: dbWorkerType.description || null,
    
    // HRIS Settings (from hris.worker_type)
    benefitsEligible: dbWorkerType.benefits_eligible,
    ptoEligible: dbWorkerType.pto_eligible,
    sickLeaveEligible: dbWorkerType.sick_leave_eligible,
    vacationAccrualRate: dbWorkerType.vacation_accrual_rate ? parseFloat(dbWorkerType.vacation_accrual_rate) : null,
    
    // PayLinQ Pay Settings (from payroll.worker_type_pay_config - may be null)
    defaultPayFrequency: dbWorkerType.default_pay_frequency || null,
    defaultPaymentMethod: dbWorkerType.default_payment_method || null,
    overtimeEligible: dbWorkerType.overtime_eligible !== undefined ? dbWorkerType.overtime_eligible : true,
    payStructureTemplateCode: dbWorkerType.pay_structure_template_code || null,
    
    // Status
    isActive: dbWorkerType.is_active,
    
    // Audit fields
    createdAt: dbWorkerType.created_at,
    updatedAt: dbWorkerType.updated_at,
    deletedAt: dbWorkerType.deleted_at,
    createdBy: dbWorkerType.created_by,
    updatedBy: dbWorkerType.updated_by,
    deletedBy: dbWorkerType.deleted_by
  };
}

/**
 * Map multiple worker types from DB to API format
 * @param {Array} dbWorkerTypes - Array of database worker types
 * @returns {Array} Array of API-formatted worker types
 */
export function mapWorkerTypesDbToApi(dbWorkerTypes) {
  if (!Array.isArray(dbWorkerTypes)) return [];
  return dbWorkerTypes.map(mapWorkerTypeDbToApi);
}

/**
 * Map worker type from API to DB format
 * Returns a flat object with all fields in snake_case
 * The repository layer handles the separation into multiple tables
 * 
 * @param {Object} apiData - API worker type data (camelCase)
 * @returns {Object} Flat database-formatted object (snake_case)
 */
export function mapWorkerTypeApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  // HRIS Worker Type fields (hris.worker_type)
  if (apiData.name !== undefined) {
    dbData.name = apiData.name;
  }
  if (apiData.code !== undefined) {
    dbData.code = apiData.code;
  }
  if (apiData.description !== undefined) {
    dbData.description = apiData.description;
  }
  if (apiData.benefitsEligible !== undefined) {
    dbData.benefits_eligible = apiData.benefitsEligible;
  }
  if (apiData.ptoEligible !== undefined) {
    dbData.pto_eligible = apiData.ptoEligible;
  }
  if (apiData.sickLeaveEligible !== undefined) {
    dbData.sick_leave_eligible = apiData.sickLeaveEligible;
  }
  if (apiData.vacationAccrualRate !== undefined) {
    dbData.vacation_accrual_rate = apiData.vacationAccrualRate;
  }
  if (apiData.isActive !== undefined) {
    dbData.is_active = apiData.isActive;
  }

  // PayLinQ Pay Config fields (payroll.worker_type_pay_config)
  if (apiData.defaultPayFrequency !== undefined) {
    dbData.default_pay_frequency = apiData.defaultPayFrequency;
  }
  if (apiData.defaultPaymentMethod !== undefined) {
    dbData.default_payment_method = apiData.defaultPaymentMethod;
  }
  if (apiData.overtimeEligible !== undefined) {
    dbData.overtime_eligible = apiData.overtimeEligible;
  }
  if (apiData.payStructureTemplateCode !== undefined) {
    dbData.pay_structure_template_code = apiData.payStructureTemplateCode;
  }

  return dbData;
}

/**
 * Map worker type history/assignment from DB to API format
 * @param {Object} dbHistory - Database worker type history record (snake_case)
 * @returns {Object|null} API-formatted worker type history (camelCase)
 */
export function mapAssignmentDbToApi(dbHistory) {
  if (!dbHistory) return null;

  return {
    id: dbHistory.id,
    organizationId: dbHistory.organization_id,
    employeeId: dbHistory.employee_id,
    workerTypeId: dbHistory.worker_type_id,
    
    // Assignment details
    effectiveFrom: dbHistory.effective_from,
    effectiveTo: dbHistory.effective_to || null,
    isCurrent: dbHistory.is_current,
    
    // Optional overrides
    payFrequency: dbHistory.pay_frequency || null,
    paymentMethod: dbHistory.payment_method || null,
    
    // Change tracking
    changeReason: dbHistory.change_reason || null,
    recordedAt: dbHistory.recorded_at,
    recordedBy: dbHistory.recorded_by,
    
    // Worker Type details (if joined from hris.worker_type)
    workerTypeName: dbHistory.worker_type_name || null,
    workerTypeCode: dbHistory.worker_type_code || null,
    
    // Audit fields
    createdAt: dbHistory.created_at,
    updatedAt: dbHistory.updated_at,
    deletedAt: dbHistory.deleted_at
  };
}

/**
 * Map multiple worker type assignments from DB to API format
 * @param {Array} dbAssignments - Array of database worker type assignments
 * @returns {Array} Array of API-formatted worker type assignments
 */
export function mapAssignmentsDbToApi(dbAssignments) {
  if (!Array.isArray(dbAssignments)) return [];
  return dbAssignments.map(mapAssignmentDbToApi);
}

/**
 * Map worker type history from API to DB format
 * @param {Object} apiData - API worker type history data (camelCase)
 * @returns {Object} Database-formatted worker type history (snake_case)
 */
export function mapAssignmentApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  if (apiData.employeeId !== undefined) {
    dbData.employee_id = apiData.employeeId;
  }
  if (apiData.workerTypeId !== undefined) {
    dbData.worker_type_id = apiData.workerTypeId;
  }
  if (apiData.effectiveFrom !== undefined) {
    dbData.effective_from = apiData.effectiveFrom;
  }
  if (apiData.effectiveTo !== undefined) {
    dbData.effective_to = apiData.effectiveTo;
  }
  if (apiData.isCurrent !== undefined) {
    dbData.is_current = apiData.isCurrent;
  }
  if (apiData.payFrequency !== undefined) {
    dbData.pay_frequency = apiData.payFrequency;
  }
  if (apiData.paymentMethod !== undefined) {
    dbData.payment_method = apiData.paymentMethod;
  }
  if (apiData.changeReason !== undefined) {
    dbData.change_reason = apiData.changeReason;
  }

  return dbData;
}
