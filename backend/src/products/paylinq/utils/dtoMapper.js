/**
 * DTO Mapper Utility
 * 
 * Maps between API field names and database schema field names.
 * Ensures consistency across all PayLinQ endpoints.
 * 
 * Industry Standard: Data Transfer Objects (DTOs) pattern
 * 
 * @module products/paylinq/utils/dtoMapper
 */

/**
 * Field name mappings from API to Database
 * API names are user-friendly, DB names match schema
 */
const API_TO_DB_MAPPINGS = {
  // Common mappings
  employeeId: 'employee_id',
  scheduleId: 'workScheduleId',
  componentId: 'payComponentId',
  ruleId: 'taxRuleSetId',
  
  // Deduction fields
  deductionType: 'deductionType',
  amount: 'deductionAmount',
  percentage: 'deductionPercentage',
  frequency: 'frequency',
  effectiveDate: 'effectiveFrom',
  endDate: 'effectiveTo',
  
  // Schedule fields
  startTime: 'startTime',
  endTime: 'endTime',
  scheduleDate: 'scheduleDate',
  scheduleType: 'scheduleType',
  
  // Pay component fields
  code: 'componentCode',
  name: 'componentName',
  type: 'componentType',
  calculationMethod: 'calculationType',
  defaultRate: 'defaultRate',
  defaultAmount: 'defaultAmount',
  isTaxable: 'isTaxable',
  affectsTaxableIncome: 'isTaxable',
  appliesToOvertime: 'appliesToGross',
  
  // Common metadata
  isActive: 'isActive',
  notes: 'notes',
  description: 'description',
  metadata: 'metadata',
};

/**
 * Reverse mapping from Database to API
 */
const DB_TO_API_MAPPINGS = Object.entries(API_TO_DB_MAPPINGS).reduce((acc, [apiKey, dbKey]) => {
  acc[dbKey] = apiKey;
  return acc;
}, {});

/**
 * Map API request data to database schema format
 * @param {Object} apiData - Data from API request
 * @param {Object} customMappings - Optional custom field mappings
 * @returns {Object} Mapped data for database operations
 */
export function mapApiToDb(apiData, customMappings = {}) {
  if (!apiData || typeof apiData !== 'object') {
    return apiData;
  }

  const mappings = { ...API_TO_DB_MAPPINGS, ...customMappings };
  const result = {};

  for (const [apiKey, value] of Object.entries(apiData)) {
    const dbKey = mappings[apiKey] || apiKey;
    result[dbKey] = value;
  }

  // Normalize calculation_type values to match database constraints
  if (result.calculationType) {
    const normalizedCalcType = {
      'fixed': 'fixed_amount',
      'hours_based': 'hourly_rate',
      'unit_based': 'fixed_amount', // Unit-based treated as fixed amount
    }[result.calculationType];
    
    if (normalizedCalcType) {
      result.calculationType = normalizedCalcType;
    }
  }

  // Normalize category values
  if (result.category === 'regular') {
    result.category = 'regular_pay';
  }

  // Normalize component_type values - DB only allows 'earning' and 'deduction'
  if (result.componentType) {
    const normalizedComponentType = {
      'benefit': 'deduction',      // Benefits are deductions
      'tax': 'deduction',           // Taxes are deductions
      'reimbursement': 'earning',   // Reimbursements are earnings
    }[result.componentType];
    
    if (normalizedComponentType) {
      result.componentType = normalizedComponentType;
    }
  }

  return result;
}

/**
 * Map database response data to API format
 * @param {Object} dbData - Data from database
 * @param {Object} customMappings - Optional custom field mappings
 * @returns {Object} Mapped data for API response
 */
export function mapDbToApi(dbData, customMappings = {}) {
  if (!dbData || typeof dbData !== 'object') {
    return dbData;
  }

  const mappings = { ...DB_TO_API_MAPPINGS, ...customMappings };
  const result = {};

  for (const [dbKey, value] of Object.entries(dbData)) {
    const apiKey = mappings[dbKey] || dbKey;
    result[apiKey] = value;
  }

  return result;
}

/**
 * Map array of database records to API format
 * @param {Array} dbDataArray - Array of database records
 * @param {Object} customMappings - Optional custom field mappings
 * @returns {Array} Mapped array for API response
 */
export function mapDbArrayToApi(dbDataArray, customMappings = {}) {
  if (!Array.isArray(dbDataArray)) {
    return dbDataArray;
  }

  return dbDataArray.map(item => mapDbToApi(item, customMappings));
}

/**
 * Deduction-specific mappings
 */
export const DEDUCTION_API_TO_DB = {
  employeeId: 'employee_id',
  name: 'deductionName',  // API 'name' -> DB 'deductionName'
  deductionType: 'deductionType',
  deductionName: 'deductionName',
  deductionCode: 'deductionCode',
  code: 'deductionCode',  // API 'code' -> DB 'deductionCode'
  calculationType: 'calculationType',
  calculationMethod: 'calculationType',  // API 'calculationMethod' -> DB 'calculationType'
  amount: 'deductionAmount',
  percentage: 'deductionPercentage',
  maxPerPayroll: 'maxPerPayroll',
  maxAnnual: 'maxAnnual',
  isPreTax: 'isPreTax',
  isRecurring: 'isRecurring',
  frequency: 'frequency',
  effectiveDate: 'effectiveFrom',
  endDate: 'effectiveTo',
  isActive: 'isActive',
  priority: 'priority',
  notes: 'notes',
  description: 'notes',  // API 'description' -> DB 'notes'
};

/**
 * Schedule-specific mappings
 */
export const SCHEDULE_API_TO_DB = {
  employeeId: 'employee_id',
  shiftTypeId: 'shift_type_id',
  scheduleDate: 'schedule_date',
  startTime: 'start_time',
  endTime: 'end_time',
  durationHours: 'duration_hours',
  breakMinutes: 'break_minutes',
  location: 'location',
  status: 'status',
  scheduleType: 'schedule_type',
  notes: 'notes',
  metadata: 'metadata',
};

/**
 * Reverse mapping from Database to API for schedules
 */
export const SCHEDULE_DB_TO_API = Object.entries(SCHEDULE_API_TO_DB).reduce((acc, [apiKey, dbKey]) => {
  acc[dbKey] = apiKey;
  return acc;
}, {});

/**
 * Schedule Change Request-specific mappings
 */
export const SCHEDULE_CHANGE_REQUEST_API_TO_DB = {
  scheduleId: 'workScheduleId',
  requestedDate: 'originalDate',
  requestType: 'requestType',
  requestReason: 'reason',
  reason: 'reason',
  proposedDate: 'proposedDate',
  originalShiftTypeId: 'originalShiftTypeId',
  proposedShiftTypeId: 'proposedShiftTypeId',
  swapWithEmployeeId: 'swapWithEmployeeId',
  metadata: 'metadata',
};

/**
 * Pay Component-specific mappings
 */
export const PAY_COMPONENT_API_TO_DB = {
  code: 'componentCode',
  name: 'componentName',
  type: 'componentType',
  category: 'category',
  calculationMethod: 'calculationType',
  defaultRate: 'defaultRate',
  defaultAmount: 'defaultAmount',
  isTaxable: 'isTaxable',
  affectsTaxableIncome: 'isTaxable',  // API field that maps to same DB field
  isRecurring: 'isRecurring',
  isPreTax: 'isPreTax',
  isSystemComponent: 'isSystemComponent',
  appliesToGross: 'appliesToGross',
  appliesToOvertime: 'appliesToGross',  // API field that maps to same DB field
  description: 'description',
};

/**
 * Compensation-specific mappings
 */
export const COMPENSATION_API_TO_DB = {
  employeeId: 'employee_id',
  compensationType: 'compensationType',
  amount: 'payRate',  // API 'amount' -> Service 'payRate'
  currency: 'currency',
  effectiveDate: 'effectiveFrom',
  endDate: 'effectiveTo',
  payFrequency: 'payPeriod',  // API 'payFrequency' (bi_weekly) -> Service 'payPeriod' (week, month)
  hoursPerWeek: 'hoursPerWeek',
  metadata: 'metadata',
};

/**
 * Map deduction API data to DB format
 * @param {Object} apiData - Deduction data from API
 * @returns {Object} Mapped data for database
 */
export function mapDeductionApiToDb(apiData) {
  const dbData = mapApiToDb(apiData, DEDUCTION_API_TO_DB);
  
  // Auto-generate deductionName if not provided but name or deductionType exists
  if (!dbData.deductionName) {
    if (apiData.name) {
      dbData.deductionName = apiData.name;
    } else if (dbData.deductionType) {
      // Convert deduction_type to readable name: health_insurance -> Health Insurance
      dbData.deductionName = dbData.deductionType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }
  
  // Auto-generate deductionCode if not provided
  if (!dbData.deductionCode) {
    if (apiData.code) {
      dbData.deductionCode = apiData.code;
    } else if (dbData.deductionType) {
      // Convert to uppercase code: health_insurance -> HI
      dbData.deductionCode = dbData.deductionType
        .split('_')
        .map(word => word.charAt(0).toUpperCase())
        .join('');
    }
  }
  
  // Map calculationType - default to fixed_amount if amount is provided
  if (!dbData.calculationType && (apiData.amount !== undefined || dbData.deductionAmount !== undefined)) {
    dbData.calculationType = 'fixed_amount';
  }
  
  return dbData;
}

/**
 * Map schedule API data to DB format
 * @param {Object} apiData - Schedule data from API
 * @returns {Object} Mapped data for database
 */
export function mapScheduleApiToDb(apiData) {
  return mapApiToDb(apiData, SCHEDULE_API_TO_DB);
}

/**
 * Map pay component API data to DB format
 * @param {Object} apiData - Pay component data from API
 * @returns {Object} Mapped data for database
 */
export function mapPayComponentApiToDb(apiData) {
  return mapApiToDb(apiData, PAY_COMPONENT_API_TO_DB);
}

/**
 * Map pay component DB data to API format
 * Transforms backend field names to match frontend interface
 * @param {Object} dbData - Pay component data from database
 * @returns {Object} Mapped data for API response
 */
export function mapPayComponentDbToApi(dbData) {
  if (!dbData) return dbData;
  
  return {
    id: dbData.id,
    name: dbData.componentName || dbData.name,
    code: dbData.componentCode || dbData.code,
    type: dbData.componentType || dbData.type,
    category: dbData.category,
    calculationType: dbData.calculationType || dbData.calculationMethod,
    defaultValue: dbData.defaultAmount || dbData.defaultRate,
    isRecurring: dbData.isRecurring,
    isTaxable: dbData.isTaxable,
    status: dbData.isActive ? 'active' : 'inactive',
    description: dbData.description || '',
    createdAt: dbData.createdAt,
    updatedAt: dbData.updatedAt,
  };
}

/**
 * Map array of pay component DB data to API format
 * @param {Array} dbDataArray - Array of pay component data from database
 * @returns {Array} Mapped array for API response
 */
export function mapPayComponentDbArrayToApi(dbDataArray) {
  if (!Array.isArray(dbDataArray)) return dbDataArray;
  return dbDataArray.map(item => mapPayComponentDbToApi(item));
}

/**
 * Map schedule change request API data to DB format
 * @param {Object} apiData - Schedule change request data from API
 * @returns {Object} Mapped data for database
 */
export function mapScheduleChangeRequestApiToDb(apiData) {
  return mapApiToDb(apiData, SCHEDULE_CHANGE_REQUEST_API_TO_DB);
}

/**
 * Map compensation API data to DB/Service format
 * @param {Object} apiData - Compensation data from API
 * @returns {Object} Mapped data for service/database
 */
export function mapCompensationApiToDb(apiData) {
  const mapped = {};
  
  // Map standard fields
  if (apiData.employeeId) mapped.employee_id = apiData.employeeId;
  if (apiData.compensationType) mapped.compensationType = apiData.compensationType;
  
  // Keep amount as-is for repository
  if (apiData.amount !== undefined) mapped.amount = apiData.amount;
  
  // Map payFrequency to payPeriod
  // API: bi_weekly, weekly, monthly, semi_monthly
  // Service expects: hour, day, week, month, year
  if (apiData.payFrequency) {
    const periodMapping = {
      'weekly': 'week',
      'bi_weekly': 'week',
      'semi_monthly': 'month',
      'monthly': 'month',
    };
    mapped.payPeriod = periodMapping[apiData.payFrequency] || 'month';
  }
  
  // Map effectiveDate to effectiveFrom
  if (apiData.effectiveDate) mapped.effectiveFrom = apiData.effectiveDate;
  if (apiData.endDate !== undefined) mapped.effectiveTo = apiData.endDate;
  
  // isCurrent defaults to true if not specified
  if (apiData.isCurrent !== undefined) mapped.isCurrent = apiData.isCurrent;
  else if (apiData.effectiveDate && !apiData.endDate) mapped.isCurrent = true;
  
  // Map optional fields
  if (apiData.currency) mapped.currency = apiData.currency;
  
  return mapped;
}

/**
 * Map schedule DB data to API format
 * @param {Object} dbData - Schedule data from database
 * @returns {Object} Mapped data for API response
 */
export function mapScheduleDbToApi(dbData) {
  return mapDbToApi(dbData, SCHEDULE_DB_TO_API);
}

/**
 * Map array of schedule DB data to API format
 * @param {Array} dbDataArray - Array of schedule data from database
 * @returns {Array} Mapped array for API response
 */
export function mapScheduleDbArrayToApi(dbDataArray) {
  return mapDbArrayToApi(dbDataArray, SCHEDULE_DB_TO_API);
}

/**
 * Payroll run field mappings
 */
export const PAYROLL_RUN_API_TO_DB = {
  payrollName: 'runName',
  periodStart: 'payPeriodStart',
  periodEnd: 'payPeriodEnd',
  paymentDate: 'paymentDate',
  status: 'status',
};

/**
 * Paycheck field mappings (DB -> API)
 */
export const PAYCHECK_DB_TO_API = {
  id: 'id',
  organization_id: 'organizationId',
  payroll_run_id: 'payrollRunId',
  employee_id: 'employeeId',
  payment_date: 'paymentDate',
  pay_period_start: 'payPeriodStart',
  pay_period_end: 'payPeriodEnd',
  gross_pay: 'grossPay',
  regular_pay: 'regularPay',
  overtime_pay: 'overtimePay',
  bonus_pay: 'bonusPay',
  commission_pay: 'commissionPay',
  federal_tax: 'federalTax',
  state_tax: 'stateTax',
  local_tax: 'localTax',
  social_security: 'socialSecurity',
  medicare: 'medicare',
  wage_tax: 'wageTax',
  aov_tax: 'aovTax',
  aww_tax: 'awwTax',
  pre_tax_deductions: 'preTaxDeductions',
  post_tax_deductions: 'postTaxDeductions',
  other_deductions: 'otherDeductions',
  net_pay: 'netPay',
  payment_method: 'paymentMethod',
  check_number: 'checkNumber',
  status: 'status',
  paid_at: 'paidAt',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  deleted_at: 'deletedAt',
  created_by: 'createdBy',
  updated_by: 'updatedBy',
  deleted_by: 'deletedBy',
  // Joined fields from hris.employee
  employee_number: 'employeeNumber',
  first_name: 'firstName',
  last_name: 'lastName',
  email: 'email',
  // Joined fields from payroll_run
  run_number: 'runNumber',
  run_name: 'runName',
};

/**
 * Employee Record field mappings (DB -> API)
 * Note: This now maps from employee_payroll_config + hris.employee fields
 */
export const EMPLOYEE_RECORD_DB_TO_API = {
  id: 'id',
  organization_id: 'organizationId',
  employee_id: 'employeeId',
  employee_number: 'employeeNumber',
  worker_type_template_id: 'workerTypeId',
  worker_type_name: 'workerTypeName',
  pay_frequency: 'payFrequency',
  payment_method: 'paymentMethod',
  currency: 'currency',
  status: 'status',
  hire_date: 'hireDate',
  termination_date: 'terminationDate',
  bank_name: 'bankName',
  account_number: 'bankAccountNumber',
  routing_number: 'bankRoutingNumber',
  account_type: 'accountType',
  tax_id: 'taxId',
  tax_filing_status: 'taxFilingStatus',
  tax_allowances: 'taxAllowances',
  additional_withholding: 'additionalWithholding',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  created_by: 'createdBy',
  updated_by: 'updatedBy',
  deleted_at: 'deletedAt',
  deleted_by: 'deletedBy',
  compensation_type: 'compensationType',
  current_compensation: 'currentCompensation',
  compensation_effective_from: 'compensationEffectiveFrom',
  // Fields from hris.employee
  first_name: 'firstName',
  last_name: 'lastName',
  email: 'email',
  phone: 'phone',
  employment_status: 'employmentStatus',
  employment_type: 'employmentType',
  department_id: 'departmentId',
  location_id: 'locationId',
  manager_id: 'managerId',
  job_title: 'jobTitle',
};

/**
 * Reconciliation field mappings (API <-> DB)
 */
export const RECONCILIATION_DB_TO_API = {
  payroll_run_id: 'payrollRunId',
  reconciliation_type: 'reconciliationType',
  reconciliation_date: 'reconciliationDate',
  period_start: 'periodStart',
  period_end: 'periodEnd',
  expected_amount: 'expectedAmount',
  actual_amount: 'actualAmount',
  variance_amount: 'varianceAmount',
  // Support both field naming conventions
  expected_total: 'expectedTotal',
  actual_total: 'actualTotal',
  is_reconciled: 'isReconciled',
  reconciliation_notes: 'notes',
  reconciled_by: 'reconciledBy',
  reconciled_at: 'reconciledAt',
  status: 'status',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  created_by: 'createdBy',
  updated_by: 'updatedBy',
  organization_id: 'organizationId',
  // Joined fields from payroll_run
  run_number: 'runNumber',
  run_name: 'runName',
  pay_period_start: 'payPeriodStart',
  pay_period_end: 'payPeriodEnd',
};

/**
 * Reconciliation item field mappings (API <-> DB)
 */
export const RECONCILIATION_ITEM_DB_TO_API = {
  reconciliation_id: 'reconciliationId',
  item_type: 'itemType',
  item_reference: 'itemReference',
  expected_amount: 'expectedAmount',
  actual_amount: 'actualAmount',
  variance_amount: 'varianceAmount',
  is_reconciled: 'isReconciled',
  reconciliation_notes: 'notes',
  reconciled_by: 'reconciledBy',
  reconciled_at: 'reconciledAt',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  created_by: 'createdBy',
  organization_id: 'organizationId',
};

/**
 * Map payroll run API data to service format (for creates)
 * @param {Object} apiData - Payroll run data from API
 * @returns {Object} Mapped data for service layer
 */
export function mapPayrollRunApiToDb(apiData) {
  const mapped = {};
  
  // Map API fields to service field names
  if (apiData.payrollName) mapped.runName = apiData.payrollName;
  if (apiData.periodStart) mapped.payPeriodStart = apiData.periodStart;
  if (apiData.periodEnd) mapped.payPeriodEnd = apiData.periodEnd;
  if (apiData.paymentDate) mapped.paymentDate = apiData.paymentDate;
  if (apiData.status) mapped.status = apiData.status;
  
  // Generate runNumber if not provided (required by service)
  if (!mapped.runNumber && apiData.periodStart) {
    const date = new Date(apiData.periodStart);
    mapped.runNumber = `PR-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-6)}`;
  }
  
  return mapped;
}

/**
 * Map payroll run API update data to DB format (snake_case for updates)
 * @param {Object} apiData - Payroll run update data from API
 * @returns {Object} Mapped data for repository layer
 */
export function mapPayrollRunUpdateApiToDb(apiData) {
  const mapped = {};
  
  // Map API fields to database column names (snake_case)
  if (apiData.payrollName !== undefined) mapped.run_name = apiData.payrollName;
  if (apiData.periodStart !== undefined) mapped.pay_period_start = apiData.periodStart;
  if (apiData.periodEnd !== undefined) mapped.pay_period_end = apiData.periodEnd;
  if (apiData.paymentDate !== undefined) mapped.payment_date = apiData.paymentDate;
  if (apiData.status !== undefined) mapped.status = apiData.status;
  
  return mapped;
}

/**
 * Map payroll run DB data to API format (for responses)
 * @param {Object} dbData - Payroll run data from database
 * @returns {Object} Mapped data for API response
 */
export function mapPayrollRunDbToApi(dbData) {
  if (!dbData) return null;
  
  const mapped = {
    id: dbData.id,
    organizationId: dbData.organization_id,
    runNumber: dbData.run_number,
    payrollName: dbData.run_name,
    payPeriodStart: dbData.pay_period_start instanceof Date 
      ? dbData.pay_period_start.toISOString().split('T')[0]
      : (typeof dbData.pay_period_start === 'string' ? dbData.pay_period_start.split('T')[0] : dbData.pay_period_start),
    payPeriodEnd: dbData.pay_period_end instanceof Date
      ? dbData.pay_period_end.toISOString().split('T')[0]
      : (typeof dbData.pay_period_end === 'string' ? dbData.pay_period_end.split('T')[0] : dbData.pay_period_end),
    paymentDate: dbData.payment_date instanceof Date
      ? dbData.payment_date.toISOString().split('T')[0]
      : (typeof dbData.payment_date === 'string' ? dbData.payment_date.split('T')[0] : dbData.payment_date),
    status: dbData.status,
    totalGrossPay: dbData.total_gross_pay,
    totalNetPay: dbData.total_net_pay,
    totalTaxes: dbData.total_taxes,
    totalDeductions: dbData.total_deductions,
    employeeCount: dbData.employee_count,
    paycheckCount: dbData.paycheck_count,
    description: dbData.description,
    metadata: dbData.metadata,
    calculatedAt: dbData.calculated_at,
    calculatedBy: dbData.calculated_by,
    finalizedAt: dbData.finalized_at,
    finalizedBy: dbData.finalized_by,
    createdAt: dbData.created_at,
    createdBy: dbData.created_by,
    updatedAt: dbData.updated_at,
    updatedBy: dbData.updated_by,
    deletedAt: dbData.deleted_at,
  };
  
  // Remove undefined fields
  Object.keys(mapped).forEach(key => {
    if (mapped[key] === undefined) {
      delete mapped[key];
    }
  });
  
  return mapped;
}

/**
 * Map reconciliation DB data to API format (for responses)
 * @param {Object} dbData - Reconciliation data from database
 * @returns {Object} Mapped data for API response
 */
/**
 * Map paycheck DB data to API format (for responses)
 * @param {Object} dbData - Paycheck data from database
 * @returns {Object} Mapped data for API response
 */
export function mapPaycheckDbToApi(dbData) {
  if (!dbData) return null;
  
  return mapDbToApi(dbData, PAYCHECK_DB_TO_API);
}

/**
 * Map array of paycheck DB data to API format
 * @param {Array} dbDataArray - Array of paycheck data from database
 * @returns {Array} Mapped array for API response
 */
export function mapPaycheckDbArrayToApi(dbDataArray) {
  if (!Array.isArray(dbDataArray)) return dbDataArray;
  
  return dbDataArray.map(item => mapPaycheckDbToApi(item));
}

export function mapReconciliationDbToApi(dbData) {
  if (!dbData) return null;
  
  return mapDbToApi(dbData, RECONCILIATION_DB_TO_API);
}

/**
 * Map reconciliation item DB data to API format (for responses)
 * @param {Object} dbData - Reconciliation item data from database
 * @returns {Object} Mapped data for API response
 */
export function mapReconciliationItemDbToApi(dbData) {
  if (!dbData) return null;
  
  const mapped = mapDbToApi(dbData, RECONCILIATION_ITEM_DB_TO_API);
  
  // Add derived status field from is_reconciled boolean
  if (dbData.is_reconciled !== undefined) {
    mapped.status = dbData.is_reconciled ? 'resolved' : 'unresolved';
  }
  
  return mapped;
}

/**
 * Map array of reconciliation DB data to API format
 * @param {Array} dbDataArray - Array of reconciliation data from database
 * @returns {Array} Mapped array for API response
 */
export function mapReconciliationDbArrayToApi(dbDataArray) {
  if (!Array.isArray(dbDataArray)) return dbDataArray;
  
  return dbDataArray.map(item => mapReconciliationDbToApi(item));
}

/**
 * Map array of reconciliation item DB data to API format
 * @param {Array} dbDataArray - Array of reconciliation item data from database
 * @returns {Array} Mapped array for API response
 */
export function mapReconciliationItemDbArrayToApi(dbDataArray) {
  if (!Array.isArray(dbDataArray)) return dbDataArray;
  
  return dbDataArray.map(item => mapReconciliationItemDbToApi(item));
}

/**
 * Map employee record DB data to API format
 * @param {Object} dbData - Employee payroll config + hris.employee data from database
 * @returns {Object} Mapped data for API response
 */
export function mapEmployeeDbToApi(dbData) {
  if (!dbData || typeof dbData !== 'object') {
    return dbData;
  }
  
  const mapped = mapDbToApi(dbData, EMPLOYEE_RECORD_DB_TO_API);
  
  // Construct fullName from first and last name
  if (dbData.first_name || dbData.last_name) {
    mapped.fullName = [dbData.first_name, dbData.last_name].filter(Boolean).join(' ');
  }
  
  return mapped;
}

/**
 * Map array of employee record DB data to API format
 * @param {Array} dbDataArray - Array of employee record data from database
 * @returns {Array} Mapped array for API response
 */
export function mapEmployeeDbArrayToApi(dbDataArray) {
  if (!Array.isArray(dbDataArray)) return dbDataArray;
  
  return dbDataArray.map(item => mapEmployeeDbToApi(item));
}

export default {
  mapApiToDb,
  mapDbToApi,
  mapDbArrayToApi,
  mapDeductionApiToDb,
  mapScheduleApiToDb,
  mapScheduleDbToApi,
  mapScheduleDbArrayToApi,
  mapPayComponentApiToDb,
  mapScheduleChangeRequestApiToDb,
  mapCompensationApiToDb,
  mapPayrollRunApiToDb,
  mapPayrollRunUpdateApiToDb,
  mapPayrollRunDbToApi,
  mapEmployeeDbToApi,
  mapEmployeeDbArrayToApi,
  mapReconciliationDbToApi,
  mapReconciliationItemDbToApi,
  mapReconciliationDbArrayToApi,
  mapReconciliationItemDbArrayToApi,
  DEDUCTION_API_TO_DB,
  SCHEDULE_API_TO_DB,
  SCHEDULE_DB_TO_API,
  PAY_COMPONENT_API_TO_DB,
  SCHEDULE_CHANGE_REQUEST_API_TO_DB,
  COMPENSATION_API_TO_DB,
  EMPLOYEE_RECORD_DB_TO_API,
  PAYROLL_RUN_API_TO_DB,
  RECONCILIATION_DB_TO_API,
  RECONCILIATION_ITEM_DB_TO_API,
};
