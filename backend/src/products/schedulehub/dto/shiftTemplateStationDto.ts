/**
 * Shift Template Station Junction DTO
 * Maps shift_template_stations table between DB and API formats
 * 
 * @module products/schedulehub/dto/shiftTemplateStationDto
 */

/**
 * Map single shift template station from database to API format
 * @param {Object} dbRecord - Record from database (snake_case)
 * @returns {Object} Record in API format (camelCase)
 */
export function mapShiftTemplateStationDbToApi(dbRecord: any): Record<string, any> | null {
  if (!dbRecord) return null;

  return {
    id: dbRecord.id,
    shiftTemplateId: dbRecord.shift_template_id,
    stationId: dbRecord.station_id,
    organizationId: dbRecord.organization_id,
    createdBy: dbRecord.created_by,
    createdAt: dbRecord.created_at
  };
}

/**
 * Map array of shift template stations from database to API format
 * @param {Array} dbRecords - Array of records from database
 * @returns {Array} Array of records in API format
 */
export function mapShiftTemplateStationsDbToApi(dbRecords: any): Record<string, any> | null {
  if (!Array.isArray(dbRecords)) return [];
  return dbRecords.map(mapShiftTemplateStationDbToApi);
}

/**
 * Map shift template station from API format to database format
 * @param {Object} apiData - Data from API (camelCase)
 * @returns {Object} Data in database format (snake_case)
 */
export function mapShiftTemplateStationApiToDb(apiData: any): Record<string, any> | null {
  if (!apiData) return null;

  const dbData: Record<string, any> = {};

  if (apiData.shiftTemplateId !== undefined) {
    dbData.shift_template_id = apiData.shiftTemplateId;
  }
  if (apiData.stationId !== undefined) {
    dbData.station_id = apiData.stationId;
  }
  if (apiData.organizationId !== undefined) {
    dbData.organization_id = apiData.organizationId;
  }
  if (apiData.createdBy !== undefined) {
    dbData.created_by = apiData.createdBy;
  }
  if (apiData.createdAt !== undefined) {
    dbData.created_at = apiData.createdAt;
  }

  return dbData;
}