/**
 * Location DTO
 * Maps location data between API format (camelCase) and database format (snake_case)
 * 
 * @module products/nexus/dto/locationDto
 */

/**
 * Map single location from database to API format
 * @param {Object} dbLocation - Location record from database (snake_case)
 * @returns {Object} Location in API format (camelCase)
 */
export function mapLocationDbToApi(dbLocation: any): Record<string, any> | null {
  if (!dbLocation) return null;

  return {
    id: dbLocation.id,
    organizationId: dbLocation.organization_id,
    locationCode: dbLocation.location_code,
    locationName: dbLocation.location_name,
    locationType: dbLocation.location_type,
    addressLine1: dbLocation.address_line1,
    addressLine2: dbLocation.address_line2,
    city: dbLocation.city,
    stateProvince: dbLocation.state_province,
    postalCode: dbLocation.postal_code,
    country: dbLocation.country,
    phone: dbLocation.phone,
    email: dbLocation.email,
    isActive: dbLocation.is_active,
    createdBy: dbLocation.created_by,
    createdAt: dbLocation.created_at,
    updatedBy: dbLocation.updated_by,
    updatedAt: dbLocation.updated_at
  };
}

/**
 * Map array of locations from database to API format
 * @param {Array} dbLocations - Array of location records
 * @returns {Array} Array of locations in API format
 */
export function mapLocationsDbToApi(dbLocations: any): Record<string, any> | null {
  if (!Array.isArray(dbLocations)) return [];
  return dbLocations.map(mapLocationDbToApi);
}

/**
 * Map location from API format to database format
 * @param {Object} apiData - Location data from API (camelCase)
 * @returns {Object} Location in database format (snake_case)
 */
export function mapLocationApiToDb(apiData: any): Record<string, any> | null {
  if (!apiData) return null;

  const dbData: Record<string, any> = {};

  // Only include fields present in API data
  if (apiData.locationCode !== undefined) {
    dbData.location_code = apiData.locationCode;
  }
  if (apiData.locationName !== undefined) {
    dbData.location_name = apiData.locationName;
  }
  if (apiData.locationType !== undefined) {
    dbData.location_type = apiData.locationType;
  }
  if (apiData.addressLine1 !== undefined) {
    dbData.address_line1 = apiData.addressLine1;
  }
  if (apiData.addressLine2 !== undefined) {
    dbData.address_line2 = apiData.addressLine2;
  }
  if (apiData.city !== undefined) {
    dbData.city = apiData.city;
  }
  if (apiData.stateProvince !== undefined) {
    dbData.state_province = apiData.stateProvince;
  }
  if (apiData.postalCode !== undefined) {
    dbData.postal_code = apiData.postalCode;
  }
  if (apiData.country !== undefined) {
    dbData.country = apiData.country;
  }
  if (apiData.phone !== undefined) {
    dbData.phone = apiData.phone;
  }
  if (apiData.email !== undefined) {
    dbData.email = apiData.email;
  }
  if (apiData.isActive !== undefined) {
    dbData.is_active = apiData.isActive;
  }

  return dbData;
}