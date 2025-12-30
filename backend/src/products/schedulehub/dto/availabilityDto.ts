/**
 * Availability DTO
 * Maps worker_availability table between DB and API formats
 * 
 * @module products/schedulehub/dto/availabilityDto
 */

/**
 * Map single availability record from database to API format
 * @param {Object} dbAvailability - Availability record from database (snake_case)
 * @returns {Object} Availability in API format (camelCase)
 */
export function mapAvailabilityDbToApi(dbAvailability) {
  if (!dbAvailability) return null;

  return {
    id: dbAvailability.id,
    organizationId: dbAvailability.organization_id,
    workerId: dbAvailability.employee_id,
    availabilityType: dbAvailability.availability_type,
    dayOfWeek: dbAvailability.day_of_week,
    specificDate: dbAvailability.specific_date,
    startTime: dbAvailability.start_time,
    endTime: dbAvailability.end_time,
    effectiveFrom: dbAvailability.effective_from,
    effectiveTo: dbAvailability.effective_to,
    priority: dbAvailability.priority,
    reason: dbAvailability.reason,
    createdAt: dbAvailability.created_at,
    updatedAt: dbAvailability.updated_at,
    // Include employee details if joined
    firstName: dbAvailability.first_name,
    lastName: dbAvailability.last_name,
    email: dbAvailability.email
  };
}

/**
 * Map array of availability records from database to API format
 * @param {Array} dbAvailabilities - Array of availability records
 * @returns {Array} Array of availabilities in API format
 */
export function mapAvailabilitiesDbToApi(dbAvailabilities) {
  if (!Array.isArray(dbAvailabilities)) return [];
  return dbAvailabilities.map(mapAvailabilityDbToApi);
}

/**
 * Map availability from API format to database format
 * @param {Object} apiData - Availability data from API (camelCase)
 * @returns {Object} Availability in database format (snake_case)
 */
export function mapAvailabilityApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  // Only include fields present in API data
  if (apiData.workerId !== undefined) {
    dbData.employee_id = apiData.workerId;
  }
  if (apiData.availabilityType !== undefined) {
    dbData.availability_type = apiData.availabilityType;
  }
  if (apiData.dayOfWeek !== undefined) {
    dbData.day_of_week = apiData.dayOfWeek;
  }
  if (apiData.specificDate !== undefined) {
    dbData.specific_date = apiData.specificDate;
  }
  if (apiData.startTime !== undefined) {
    dbData.start_time = apiData.startTime;
  }
  if (apiData.endTime !== undefined) {
    dbData.end_time = apiData.endTime;
  }
  if (apiData.effectiveFrom !== undefined) {
    dbData.effective_from = apiData.effectiveFrom;
  }
  if (apiData.effectiveTo !== undefined) {
    dbData.effective_to = apiData.effectiveTo;
  }
  if (apiData.priority !== undefined) {
    dbData.priority = apiData.priority;
  }
  if (apiData.reason !== undefined) {
    dbData.reason = apiData.reason;
  }

  return dbData;
}
