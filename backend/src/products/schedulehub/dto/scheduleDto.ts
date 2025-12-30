/**
 * Schedule DTO
 * Maps schedule data between database format (snake_case) and API format (camelCase)
 * 
 * @module products/schedulehub/dto/scheduleDto
 */

/**
 * Formats a PostgreSQL DATE value to ISO string for JavaScript Date compatibility
 * @param {string|Date} dateValue - Date value from PostgreSQL DATE column
 * @returns {string|null} ISO date string or null
 */
function formatDate(dateValue) {
  if (!dateValue) return null;
  
  // If it's already a Date object, convert to ISO string
  if (dateValue instanceof Date) {
    return dateValue.toISOString();
  }
  
  // If it's a string in YYYY-MM-DD format (PostgreSQL DATE), convert to ISO
  if (typeof dateValue === 'string') {
    // For DATE columns, append time to avoid timezone issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return `${dateValue}T00:00:00.000Z`;
    }
    
    // For TIMESTAMP columns, ensure it's a valid date
    const date = new Date(dateValue);
    return !isNaN(date.getTime()) ? date.toISOString() : null;
  }
  
  return null;
}

/**
 * Formats a PostgreSQL TIMESTAMP value to ISO string
 * @param {string|Date} timestampValue - Timestamp value from PostgreSQL TIMESTAMP column
 * @returns {string|null} ISO timestamp string or null
 */
function formatTimestamp(timestampValue) {
  if (!timestampValue) return null;
  
  if (timestampValue instanceof Date) {
    return timestampValue.toISOString();
  }
  
  if (typeof timestampValue === 'string') {
    const date = new Date(timestampValue);
    return !isNaN(date.getTime()) ? date.toISOString() : null;
  }
  
  return null;
}

/**
 * Map single schedule from database to API format
 * @param {Object} dbSchedule - Schedule record from database (snake_case)
 * @returns {Object} Schedule in API format (camelCase)
 */
export function mapScheduleDbToApi(dbSchedule: any): Record<string, any> | null {
  if (!dbSchedule) return null;

  return {
    id: dbSchedule.id,
    organizationId: dbSchedule.organization_id,
    name: dbSchedule.schedule_name,
    description: dbSchedule.description || null,
    startDate: formatDate(dbSchedule.start_date),
    endDate: formatDate(dbSchedule.end_date),
    status: dbSchedule.status,
    createdBy: dbSchedule.created_by,
    updatedBy: dbSchedule.updated_by,
    createdAt: formatTimestamp(dbSchedule.created_at),
    updatedAt: formatTimestamp(dbSchedule.updated_at),
    
    // Additional fields that may come from JOINs
    shiftCount: dbSchedule.shift_count ? parseInt(dbSchedule.shift_count) : undefined,
    workerCount: dbSchedule.worker_count ? parseInt(dbSchedule.worker_count) : undefined
  };
}

/**
 * Map array of schedules from database to API format
 * @param {Array} dbSchedules - Array of schedule records from database
 * @returns {Array} Array of schedules in API format
 */
export function mapSchedulesDbToApi(dbSchedules: any): Record<string, any> | null {
  if (!Array.isArray(dbSchedules)) return [];
  return dbSchedules.map(mapScheduleDbToApi);
}

/**
 * Map schedule from API format to database format
 * @param {Object} apiData - Schedule data from API (camelCase)
 * @returns {Object} Schedule in database format (snake_case)
 */
export function mapScheduleApiToDb(apiData: any): Record<string, any> | null {
  if (!apiData) return null;

  const dbData: Record<string, any> = {};

  // Only include fields present in API data
  if (apiData.name !== undefined) {
    dbData.schedule_name = apiData.name;
  }
  if (apiData.description !== undefined) {
    dbData.description = apiData.description;
  }
  if (apiData.startDate !== undefined) {
    dbData.start_date = apiData.startDate;
  }
  if (apiData.endDate !== undefined) {
    dbData.end_date = apiData.endDate;
  }
  if (apiData.status !== undefined) {
    dbData.status = apiData.status;
  }
  if (apiData.createdBy !== undefined) {
    dbData.created_by = apiData.createdBy;
  }
  if (apiData.updatedBy !== undefined) {
    dbData.updated_by = apiData.updatedBy;
  }

  return dbData;
}

/**
 * Map schedule summary data for list views
 * @param {Object} dbSchedule - Schedule record from database
 * @returns {Object} Minimal schedule data for lists
 */
export function mapScheduleToSummary(dbSchedule) {
  if (!dbSchedule) return null;

  return {
    id: dbSchedule.id,
    name: dbSchedule.schedule_name,
    startDate: dbSchedule.start_date,
    endDate: dbSchedule.end_date,
    status: dbSchedule.status,
    shiftCount: dbSchedule.shift_count ? parseInt(dbSchedule.shift_count) : 0,
    workerCount: dbSchedule.worker_count ? parseInt(dbSchedule.worker_count) : 0,
    createdAt: dbSchedule.created_at
  };
}