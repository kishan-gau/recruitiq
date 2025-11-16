/**
 * Worker Type DTO Mappers
 * 
 * Transforms data between database format (snake_case) and API format (camelCase)
 * for worker type templates and assignments.
 * 
 * @module products/paylinq/dto/workerTypeDto
 */

/**
 * Map worker type template from DB to API format
 * @param {Object} dbTemplate - Database worker type template (snake_case)
 * @returns {Object|null} API-formatted worker type template (camelCase)
 */
export function mapTemplateDbToApi(dbTemplate) {
  if (!dbTemplate) return null;

  return {
    id: dbTemplate.id,
    organizationId: dbTemplate.organization_id,
    
    // Template details
    name: dbTemplate.name,
    code: dbTemplate.code,
    description: dbTemplate.description || null,
    
    // Default settings
    defaultPayFrequency: dbTemplate.default_pay_frequency,
    defaultPaymentMethod: dbTemplate.default_payment_method,
    
    // Eligibility flags
    benefitsEligible: dbTemplate.benefits_eligible,
    overtimeEligible: dbTemplate.overtime_eligible,
    ptoEligible: dbTemplate.pto_eligible,
    sickLeaveEligible: dbTemplate.sick_leave_eligible,
    vacationAccrualRate: dbTemplate.vacation_accrual_rate,
    
    // Status
    status: dbTemplate.status,
    
    // Audit fields
    createdAt: dbTemplate.created_at,
    updatedAt: dbTemplate.updated_at,
    deletedAt: dbTemplate.deleted_at,
    createdBy: dbTemplate.created_by,
    updatedBy: dbTemplate.updated_by,
    deletedBy: dbTemplate.deleted_by
  };
}

/**
 * Map multiple worker type templates from DB to API format
 * @param {Array} dbTemplates - Array of database worker type templates
 * @returns {Array} Array of API-formatted worker type templates
 */
export function mapTemplatesDbToApi(dbTemplates) {
  if (!Array.isArray(dbTemplates)) return [];
  return dbTemplates.map(mapTemplateDbToApi);
}

/**
 * Map worker type template from API to DB format
 * @param {Object} apiData - API worker type template data (camelCase)
 * @returns {Object} Database-formatted worker type template (snake_case)
 */
export function mapTemplateApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  // Map only provided fields (for updates)
  if (apiData.name !== undefined) {
    dbData.name = apiData.name;
  }
  if (apiData.code !== undefined) {
    dbData.code = apiData.code;
  }
  if (apiData.description !== undefined) {
    dbData.description = apiData.description;
  }
  if (apiData.defaultPayFrequency !== undefined) {
    dbData.default_pay_frequency = apiData.defaultPayFrequency;
  }
  if (apiData.defaultPaymentMethod !== undefined) {
    dbData.default_payment_method = apiData.defaultPaymentMethod;
  }
  if (apiData.benefitsEligible !== undefined) {
    dbData.benefits_eligible = apiData.benefitsEligible;
  }
  if (apiData.overtimeEligible !== undefined) {
    dbData.overtime_eligible = apiData.overtimeEligible;
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
  if (apiData.status !== undefined) {
    dbData.status = apiData.status;
  }

  return dbData;
}

/**
 * Map worker type assignment from DB to API format
 * @param {Object} dbAssignment - Database worker type assignment (snake_case)
 * @returns {Object|null} API-formatted worker type assignment (camelCase)
 */
export function mapAssignmentDbToApi(dbAssignment) {
  if (!dbAssignment) return null;

  return {
    id: dbAssignment.id,
    organizationId: dbAssignment.organization_id,
    employeeId: dbAssignment.employee_id,
    workerTypeTemplateId: dbAssignment.worker_type_template_id,
    
    // Assignment details
    effectiveFrom: dbAssignment.effective_from,
    effectiveTo: dbAssignment.effective_to,
    isCurrent: dbAssignment.is_current,
    
    // Overrides
    payFrequency: dbAssignment.pay_frequency,
    paymentMethod: dbAssignment.payment_method,
    
    // Template details (if joined)
    templateName: dbAssignment.template_name,
    templateCode: dbAssignment.template_code,
    
    // Audit fields
    createdAt: dbAssignment.created_at,
    updatedAt: dbAssignment.updated_at,
    deletedAt: dbAssignment.deleted_at,
    createdBy: dbAssignment.created_by,
    updatedBy: dbAssignment.updated_by,
    deletedBy: dbAssignment.deleted_by
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
 * Map worker type assignment from API to DB format
 * @param {Object} apiData - API worker type assignment data (camelCase)
 * @returns {Object} Database-formatted worker type assignment (snake_case)
 */
export function mapAssignmentApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  if (apiData.employeeRecordId !== undefined) {
    dbData.employee_id = apiData.employeeRecordId;
  }
  if (apiData.workerTypeTemplateId !== undefined) {
    dbData.worker_type_template_id = apiData.workerTypeTemplateId;
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
  if (apiData.notes !== undefined) {
    dbData.notes = apiData.notes;
  }

  return dbData;
}
