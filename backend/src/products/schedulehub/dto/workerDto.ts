/**
 * Worker DTO
 * Maps worker records between database format (snake_case) and API format (camelCase)
 * 
 * @module products/schedulehub/dto/workerDto
 */

/**
 * Map single worker from database to API format
 * @param {Object} dbWorker - Worker record from database (snake_case)
 * @returns {Object} Worker in API format (camelCase)
 */
export function mapWorkerDbToApi(dbWorker: any): Record<string, any> | null {
  if (!dbWorker) return null;

  return {
    id: dbWorker.id,
    organizationId: dbWorker.organization_id,
    employeeId: dbWorker.employee_id || dbWorker.id, // Handle both cases
    workerNumber: dbWorker.worker_number || dbWorker.employee_number,
    firstName: dbWorker.first_name,
    lastName: dbWorker.last_name,
    email: dbWorker.email,
    phone: dbWorker.phone || null,
    employmentType: dbWorker.employment_type,
    status: dbWorker.status || dbWorker.employment_status,
    departmentId: dbWorker.department_id || dbWorker.primary_department_id,
    locationId: dbWorker.location_id,
    hireDate: dbWorker.hire_date,
    terminationDate: dbWorker.termination_date || null,
    
    // Scheduling configuration fields
    maxHoursPerWeek: dbWorker.max_hours_per_week || null,
    minHoursPerWeek: dbWorker.min_hours_per_week || null,
    maxConsecutiveDays: dbWorker.max_consecutive_days || null,
    minRestHoursBetweenShifts: dbWorker.min_rest_hours_between_shifts || null,
    isSchedulable: dbWorker.is_schedulable !== false, // Default to true if null
    schedulingStatus: dbWorker.scheduling_status || 'available',
    preferredShiftTypes: dbWorker.preferred_shift_types || [],
    blockedDays: dbWorker.blocked_days || [],
    schedulingNotes: dbWorker.scheduling_notes || null,
    
    // Additional computed fields
    totalShifts: dbWorker.total_shifts || 0,
    
    // Audit fields
    createdBy: dbWorker.created_by || null,
    createdAt: dbWorker.created_at || null,
    updatedBy: dbWorker.updated_by || null,
    updatedAt: dbWorker.updated_at || null
  };
}

/**
 * Map array of workers from database to API format
 * @param {Array} dbWorkers - Array of worker records
 * @returns {Array} Array of workers in API format
 */
export function mapWorkersDbToApi(dbWorkers: any): Record<string, any> | null {
  if (!Array.isArray(dbWorkers)) return [];
  return dbWorkers.map(mapWorkerDbToApi);
}

/**
 * Map worker from API format to database format for worker_scheduling_config table
 * @param {Object} apiData - Worker data from API (camelCase)
 * @returns {Object} Worker config in database format (snake_case)
 */
export function mapWorkerApiToDb(apiData: any): Record<string, any> | null {
  if (!apiData) return null;

  const dbData: Record<string, any> = {};

  // Only include fields that are present in API data (for updates)
  if (apiData.maxHoursPerWeek !== undefined) {
    dbData.max_hours_per_week = apiData.maxHoursPerWeek;
  }
  if (apiData.minHoursPerWeek !== undefined) {
    dbData.min_hours_per_week = apiData.minHoursPerWeek;
  }
  if (apiData.maxConsecutiveDays !== undefined) {
    dbData.max_consecutive_days = apiData.maxConsecutiveDays;
  }
  if (apiData.minRestHoursBetweenShifts !== undefined) {
    dbData.min_rest_hours_between_shifts = apiData.minRestHoursBetweenShifts;
  }
  if (apiData.isSchedulable !== undefined) {
    dbData.is_schedulable = apiData.isSchedulable;
  }
  if (apiData.schedulingStatus !== undefined) {
    dbData.scheduling_status = apiData.schedulingStatus;
  }
  if (apiData.preferredShiftTypes !== undefined) {
    dbData.preferred_shift_types = apiData.preferredShiftTypes;
  }
  if (apiData.blockedDays !== undefined) {
    dbData.blocked_days = apiData.blockedDays;
  }
  if (apiData.unavailableDays !== undefined) {
    dbData.blocked_days = apiData.unavailableDays;
  }
  if (apiData.schedulingNotes !== undefined) {
    dbData.scheduling_notes = apiData.schedulingNotes;
  }
  // Handle notes as alias for schedulingNotes
  if (apiData.notes !== undefined) {
    dbData.scheduling_notes = apiData.notes;
  }

  return dbData;
}

/**
 * Map worker to summary format (for dropdowns and lists)
 * @param {Object} dbWorker - Worker record from database
 * @returns {Object} Worker summary in API format
 */
export function mapWorkerToSummary(dbWorker) {
  if (!dbWorker) return null;

  return {
    id: dbWorker.id,
    workerNumber: dbWorker.worker_number || dbWorker.employee_number,
    firstName: dbWorker.first_name,
    lastName: dbWorker.last_name,
    fullName: `${dbWorker.first_name} ${dbWorker.last_name}`,
    email: dbWorker.email,
    isSchedulable: dbWorker.is_schedulable !== false,
    schedulingStatus: dbWorker.scheduling_status || 'available'
  };
}

/**
 * Map array of workers to summary format
 * @param {Array} dbWorkers - Array of worker records
 * @returns {Array} Array of worker summaries in API format
 */
export function mapWorkersToSummary(dbWorkers) {
  if (!Array.isArray(dbWorkers)) return [];
  return dbWorkers.map(mapWorkerToSummary);
}