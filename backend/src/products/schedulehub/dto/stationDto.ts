/**
 * Station DTO
 * Maps station records between database format (snake_case) and API format (camelCase)
 * 
 * @module products/schedulehub/dto/stationDto
 */

/**
 * Map single station from database to API format
 * @param {Object} dbStation - Station record from database (snake_case)
 * @returns {Object} Station in API format (camelCase)
 */
export function mapStationDbToApi(dbStation: any): Record<string, any> | null {
  if (!dbStation) return null;

  return {
    id: dbStation.id,
    organizationId: dbStation.organization_id,
    stationCode: dbStation.station_code,
    name: dbStation.station_name,
    description: dbStation.description || null,
    locationId: dbStation.location_id,
    locationName: dbStation.location_name || null,
    floorLevel: dbStation.floor_level || null,
    zone: dbStation.zone || null,
    capacity: dbStation.capacity || null,
    requiresSupervision: dbStation.requires_supervision || false,
    is_active: dbStation.is_active,
    shiftCount: dbStation.shift_count || 0,
    roleRequirementCount: dbStation.role_requirement_count || 0,
    createdBy: dbStation.created_by,
    createdAt: dbStation.created_at,
    updatedBy: dbStation.updated_by,
    updatedAt: dbStation.updated_at
  };
}

/**
 * Map array of stations from database to API format
 * @param {Array} dbStations - Array of station records
 * @returns {Array} Array of stations in API format
 */
export function mapStationsDbToApi(dbStations: any): Record<string, any> | null {
  if (!Array.isArray(dbStations)) return [];
  return dbStations.map(mapStationDbToApi);
}

/**
 * Map station from API format to database format
 * @param {Object} apiData - Station data from API (camelCase)
 * @returns {Object} Station in database format (snake_case)
 */
export function mapStationApiToDb(apiData: any): Record<string, any> | null {
  if (!apiData) return null;

  const dbData: Record<string, any> = {};

  // Only include fields present in API data
  if (apiData.stationCode !== undefined) {
    dbData.station_code = apiData.stationCode;
  }
  if (apiData.name !== undefined) {
    dbData.station_name = apiData.name;
  }
  if (apiData.description !== undefined) {
    dbData.description = apiData.description;
  }
  if (apiData.locationId !== undefined) {
    dbData.location_id = apiData.locationId;
  }
  if (apiData.floorLevel !== undefined) {
    dbData.floor_level = apiData.floorLevel;
  }
  if (apiData.zone !== undefined) {
    dbData.zone = apiData.zone;
  }
  if (apiData.capacity !== undefined) {
    dbData.capacity = apiData.capacity;
  }
  if (apiData.requiresSupervision !== undefined) {
    dbData.requires_supervision = apiData.requiresSupervision;
  }
  if (apiData.is_active !== undefined) {
    dbData.is_active = apiData.is_active;
  }

  return dbData;
}