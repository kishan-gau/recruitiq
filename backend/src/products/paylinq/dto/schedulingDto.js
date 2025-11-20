/**
 * Scheduling DTO
 * Maps work_schedule table between DB and API formats
 * 
 * @module products/paylinq/dto/schedulingDto
 */

/**
 * Map single work schedule from database to API format
 * @param {Object} dbSchedule - Work schedule record from database (snake_case)
 * @returns {Object} Work schedule in API format (camelCase)
 */
export function mapScheduleDbToApi(dbSchedule) {
  if (!dbSchedule) return null;

  return {
    id: dbSchedule.id,
    organizationId: dbSchedule.organization_id,
    employeeId: dbSchedule.employee_id,
    shiftTypeId: dbSchedule.shift_type_id,
    scheduleDate: dbSchedule.schedule_date,
    startTime: dbSchedule.start_time,
    endTime: dbSchedule.end_time,
    durationHours: dbSchedule.duration_hours,
    breakMinutes: dbSchedule.break_minutes,
    location: dbSchedule.location,
    status: dbSchedule.status,
    scheduleType: dbSchedule.schedule_type,
    notes: dbSchedule.notes,
    metadata: dbSchedule.metadata,
    
    // Joined fields from employee table
    employeeNumber: dbSchedule.employee_number,
    firstName: dbSchedule.first_name,
    lastName: dbSchedule.last_name,
    
    // Joined fields from shift_type table
    shiftName: dbSchedule.shift_name,
    shiftCode: dbSchedule.shift_code,
    
    // Audit fields
    createdBy: dbSchedule.created_by,
    createdAt: dbSchedule.created_at,
    updatedBy: dbSchedule.updated_by,
    updatedAt: dbSchedule.updated_at,
    deletedAt: dbSchedule.deleted_at,
  };
}

/**
 * Map array of work schedules from database to API format
 * @param {Array} dbSchedules - Array of work schedule records
 * @returns {Array} Array of work schedules in API format
 */
export function mapSchedulesDbToApi(dbSchedules) {
  if (!Array.isArray(dbSchedules)) return [];
  return dbSchedules.map(mapScheduleDbToApi);
}

/**
 * Map work schedule from API format to database format
 * @param {Object} apiData - Work schedule data from API (camelCase)
 * @returns {Object} Work schedule in database format (snake_case)
 */
export function mapScheduleApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  // Only include fields present in API data
  if (apiData.employeeId !== undefined) {
    dbData.employee_id = apiData.employeeId;
  }
  if (apiData.shiftTypeId !== undefined) {
    dbData.shift_type_id = apiData.shiftTypeId;
  }
  if (apiData.scheduleDate !== undefined) {
    dbData.schedule_date = apiData.scheduleDate;
  }
  if (apiData.startTime !== undefined) {
    dbData.start_time = apiData.startTime;
  }
  if (apiData.endTime !== undefined) {
    dbData.end_time = apiData.endTime;
  }
  if (apiData.durationHours !== undefined) {
    dbData.duration_hours = apiData.durationHours;
  }
  if (apiData.breakMinutes !== undefined) {
    dbData.break_minutes = apiData.breakMinutes;
  }
  if (apiData.location !== undefined) {
    dbData.location = apiData.location;
  }
  if (apiData.status !== undefined) {
    dbData.status = apiData.status;
  }
  if (apiData.scheduleType !== undefined) {
    dbData.schedule_type = apiData.scheduleType;
  }
  if (apiData.notes !== undefined) {
    dbData.notes = apiData.notes;
  }
  if (apiData.metadata !== undefined) {
    dbData.metadata = apiData.metadata;
  }

  return dbData;
}

/**
 * Map schedule change request from database to API format
 * @param {Object} dbRequest - Schedule change request record from database
 * @returns {Object} Schedule change request in API format
 */
export function mapScheduleChangeRequestDbToApi(dbRequest) {
  if (!dbRequest) return null;

  return {
    id: dbRequest.id,
    organizationId: dbRequest.organization_id,
    scheduleId: dbRequest.schedule_id,
    requestedBy: dbRequest.requested_by,
    requestType: dbRequest.request_type,
    requestedChanges: dbRequest.requested_changes,
    reason: dbRequest.reason,
    status: dbRequest.status,
    reviewedBy: dbRequest.reviewed_by,
    reviewedAt: dbRequest.reviewed_at,
    reviewNotes: dbRequest.review_notes,
    createdAt: dbRequest.created_at,
    updatedAt: dbRequest.updated_at,
  };
}

/**
 * Map array of schedule change requests from database to API format
 * @param {Array} dbRequests - Array of schedule change request records
 * @returns {Array} Array of schedule change requests in API format
 */
export function mapScheduleChangeRequestsDbToApi(dbRequests) {
  if (!Array.isArray(dbRequests)) return [];
  return dbRequests.map(mapScheduleChangeRequestDbToApi);
}

/**
 * Map schedule change request from API format to database format
 * @param {Object} apiData - Schedule change request data from API
 * @returns {Object} Schedule change request in database format
 */
export function mapScheduleChangeRequestApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  if (apiData.scheduleId !== undefined) {
    dbData.schedule_id = apiData.scheduleId;
  }
  if (apiData.requestedBy !== undefined) {
    dbData.requested_by = apiData.requestedBy;
  }
  if (apiData.requestType !== undefined) {
    dbData.request_type = apiData.requestType;
  }
  if (apiData.requestedChanges !== undefined) {
    dbData.requested_changes = apiData.requestedChanges;
  }
  if (apiData.reason !== undefined) {
    dbData.reason = apiData.reason;
  }
  if (apiData.status !== undefined) {
    dbData.status = apiData.status;
  }
  if (apiData.reviewedBy !== undefined) {
    dbData.reviewed_by = apiData.reviewedBy;
  }
  if (apiData.reviewedAt !== undefined) {
    dbData.reviewed_at = apiData.reviewedAt;
  }
  if (apiData.reviewNotes !== undefined) {
    dbData.review_notes = apiData.reviewNotes;
  }

  return dbData;
}
