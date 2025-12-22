/**
 * Shift Template Stations DTO
 * Maps shift_template_stations junction table between DB and API formats
 * 
 * @module products/schedulehub/dto/shiftTemplateStationsDto
 */

/**
 * Map single shift template station from database to API format
 * @param {Object} dbRecord - Junction record from database (snake_case)
 * @returns {Object} Junction record in API format (camelCase)
 */
export function mapShiftTemplateStationDbToApi(dbRecord) {
  if (!dbRecord) return null;

  return {
    id: dbRecord.id,
    shiftTemplateId: dbRecord.shift_template_id,
    stationId: dbRecord.station_id,
    organizationId: dbRecord.organization_id,
    createdBy: dbRecord.created_by,
    createdAt: dbRecord.created_at,
    updatedBy: dbRecord.updated_by,
    updatedAt: dbRecord.updated_at,
    deletedBy: dbRecord.deleted_by,
    deletedAt: dbRecord.deleted_at
  };
}

/**
 * Map array of shift template stations from database to API format
 * @param {Array} dbRecords - Array of junction records
 * @returns {Array} Array of junction records in API format
 */
export function mapShiftTemplateStationsDbToApi(dbRecords) {
  if (!Array.isArray(dbRecords)) return [];
  return dbRecords.map(mapShiftTemplateStationDbToApi);
}

/**
 * Map shift template station from API format to database format
 * @param {Object} apiData - Junction data from API (camelCase)
 * @returns {Object} Junction data in database format (snake_case)
 */
export function mapShiftTemplateStationApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  // Only include fields present in API data
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
  if (apiData.updatedBy !== undefined) {
    dbData.updated_by = apiData.updatedBy;
  }
  if (apiData.deletedBy !== undefined) {
    dbData.deleted_by = apiData.deletedBy;
  }

  return dbData;
}