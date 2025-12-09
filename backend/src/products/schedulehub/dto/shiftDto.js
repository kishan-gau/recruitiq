/**
 * Shift DTO
 * Maps shift data between database format (snake_case) and API format (camelCase)
 * 
 * @module products/schedulehub/dto/shiftDto
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
 * Formats a PostgreSQL TIME value to HH:MM format
 * @param {string} timeValue - Time value from PostgreSQL TIME column (e.g., "09:00:00")
 * @returns {string|null} Time in HH:MM format or null
 */
function formatTime(timeValue) {
  if (!timeValue) return null;
  
  if (typeof timeValue === 'string') {
    // Handle PostgreSQL TIME format (HH:MM:SS or HH:MM:SS.sss)
    const timeParts = timeValue.split(':');
    if (timeParts.length >= 2) {
      const hours = timeParts[0].padStart(2, '0');
      const minutes = timeParts[1].padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  }
  
  return timeValue;
}

/**
 * Map single shift from database to API format
 * @param {Object} dbShift - Shift record from database (snake_case)
 * @returns {Object} Shift in API format (camelCase)
 */
export function mapShiftDbToApi(dbShift) {
  if (!dbShift) return null;

  const shift = {
    id: dbShift.id,
    scheduleId: dbShift.schedule_id,
    employeeId: dbShift.employee_id,
    roleId: dbShift.role_id,
    stationId: dbShift.station_id,
    shiftDate: formatDate(dbShift.shift_date),
    startTime: formatTime(dbShift.start_time),
    endTime: formatTime(dbShift.end_time),
    breakDurationMinutes: dbShift.break_duration_minutes,
    breakPaid: dbShift.break_paid,
    shiftType: dbShift.shift_type,
    status: dbShift.status,
    notes: dbShift.notes,
    actualStartTime: formatTime(dbShift.actual_start_time),
    actualEndTime: formatTime(dbShift.actual_end_time),
    createdAt: formatTimestamp(dbShift.created_at),
    updatedAt: formatTimestamp(dbShift.updated_at)
  };

  // Add worker information if available from JOIN
  if (dbShift.worker_name) {
    const [firstName, ...lastNameParts] = dbShift.worker_name.split(' ');
    shift.worker = {
      id: dbShift.employee_id,
      firstName: firstName || '',
      lastName: lastNameParts.join(' ') || '',
      employeeNumber: dbShift.worker_number || null
    };
  }

  // Add role information if available from JOIN
  if (dbShift.role_name) {
    shift.role = {
      id: dbShift.role_id,
      name: dbShift.role_name,
      color: dbShift.role_color || null
    };
  }

  // Add station information if available from JOIN
  if (dbShift.station_name) {
    shift.station = {
      id: dbShift.station_id,
      name: dbShift.station_name
    };
  }

  return shift;
}

/**
 * Map array of shifts from database to API format
 * @param {Array} dbShifts - Array of shift records from database
 * @returns {Array} Array of shifts in API format
 */
export function mapShiftsDbToApi(dbShifts) {
  if (!Array.isArray(dbShifts)) return [];
  return dbShifts.map(mapShiftDbToApi);
}

/**
 * Map shift from API format to database format
 * @param {Object} apiData - Shift data from API (camelCase)
 * @returns {Object} Shift in database format (snake_case)
 */
export function mapShiftApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  // Only include fields present in API data
  if (apiData.scheduleId !== undefined) {
    dbData.schedule_id = apiData.scheduleId;
  }
  if (apiData.employeeId !== undefined) {
    dbData.employee_id = apiData.employeeId;
  }
  if (apiData.roleId !== undefined) {
    dbData.role_id = apiData.roleId;
  }
  if (apiData.stationId !== undefined) {
    dbData.station_id = apiData.stationId;
  }
  if (apiData.shiftDate !== undefined) {
    dbData.shift_date = apiData.shiftDate;
  }
  if (apiData.startTime !== undefined) {
    dbData.start_time = apiData.startTime;
  }
  if (apiData.endTime !== undefined) {
    dbData.end_time = apiData.endTime;
  }
  if (apiData.breakDurationMinutes !== undefined) {
    dbData.break_duration_minutes = apiData.breakDurationMinutes;
  }
  if (apiData.breakPaid !== undefined) {
    dbData.break_paid = apiData.breakPaid;
  }
  if (apiData.shiftType !== undefined) {
    dbData.shift_type = apiData.shiftType;
  }
  if (apiData.status !== undefined) {
    dbData.status = apiData.status;
  }
  if (apiData.notes !== undefined) {
    dbData.notes = apiData.notes;
  }
  if (apiData.actualStartTime !== undefined) {
    dbData.actual_start_time = apiData.actualStartTime;
  }
  if (apiData.actualEndTime !== undefined) {
    dbData.actual_end_time = apiData.actualEndTime;
  }

  return dbData;
}