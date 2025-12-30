/**
 * Payroll Run Type DTO
 * Maps database payroll_run_type records to API response format
 * Handles snake_case to camelCase conversion and JSONB field parsing
 */

/**
 * Map a single run type from database format to API format
 * @param {Object} dbRunType - Database record (snake_case)
 * @returns {Object|null} API-formatted run type (camelCase)
 */
export function mapRunTypeDbToApi(dbRunType: any): Record<string, any> | null {
  if (!dbRunType) return null;

  return {
    id: dbRunType.id,
    organizationId: dbRunType.organization_id,
    typeCode: dbRunType.type_code,
    typeName: dbRunType.type_name,
    description: dbRunType.description,
    
    // Template linking
    defaultTemplateId: dbRunType.default_template_id,
    templateName: dbRunType.template_name || null,
    templateCode: dbRunType.template_code || null,
    componentOverrideMode: dbRunType.component_override_mode,
    
    // Component specification (JSONB fields)
    allowedComponents: dbRunType.allowed_components || [],
    excludedComponents: dbRunType.excluded_components || [],
    
    // Configuration
    isSystemDefault: dbRunType.is_system_default,
    isActive: dbRunType.is_active,
    displayOrder: dbRunType.display_order,
    icon: dbRunType.icon,
    color: dbRunType.color,
    
    // Audit fields
    createdAt: dbRunType.created_at,
    updatedAt: dbRunType.updated_at,
    deletedAt: dbRunType.deleted_at,
    createdBy: dbRunType.created_by,
    updatedBy: dbRunType.updated_by,
    deletedBy: dbRunType.deleted_by
  };
}

/**
 * Map array of run types from database to API format
 * @param {Array} dbRunTypes - Array of database records
 * @returns {Array} Array of API-formatted run types
 */
export function mapRunTypesDbToApi(dbRunTypes: any): Record<string, any> | null {
  if (!Array.isArray(dbRunTypes)) return [];
  return dbRunTypes.map(mapRunTypeDbToApi);
}

/**
 * Map run type from API request format to database format
 * @param {Object} apiData - API request data (camelCase)
 * @returns {Object} Database format (snake_case)
 */
export function mapRunTypeApiToDb(apiData: any): Record<string, any> | null {
  if (!apiData) return null;

  const dbData: Record<string, any> = {};
  
  // Only map fields that are present in the API data
  if (apiData.typeCode !== undefined) dbData.type_code = apiData.typeCode;
  if (apiData.typeName !== undefined) dbData.type_name = apiData.typeName;
  if (apiData.description !== undefined) dbData.description = apiData.description;
  if (apiData.defaultTemplateId !== undefined) dbData.default_template_id = apiData.defaultTemplateId;
  if (apiData.componentOverrideMode !== undefined) dbData.component_override_mode = apiData.componentOverrideMode;
  if (apiData.allowedComponents !== undefined) dbData.allowed_components = apiData.allowedComponents;
  if (apiData.excludedComponents !== undefined) dbData.excluded_components = apiData.excludedComponents;
  if (apiData.isActive !== undefined) dbData.is_active = apiData.isActive;
  if (apiData.displayOrder !== undefined) dbData.display_order = apiData.displayOrder;
  if (apiData.icon !== undefined) dbData.icon = apiData.icon;
  if (apiData.color !== undefined) dbData.color = apiData.color;
  
  return dbData;
}

/**
 * Map run type summary (minimal fields for dropdowns/lists)
 * @param {Object} runType - Run type (can be DB format or already mapped)
 * @returns {Object} Minimal run type data
 */
export function mapRunTypeToSummary(runType) {
  if (!runType) return null;

  return {
    id: runType.id,
    typeCode: runType.typeCode || runType.type_code,
    typeName: runType.typeName || runType.type_name,
    description: runType.description,
    icon: runType.icon,
    color: runType.color,
    isActive: runType.isActive !== undefined ? runType.isActive : runType.is_active,
    componentCount: (runType.allowedComponents || runType.allowed_components)
      ? (runType.allowedComponents || runType.allowed_components).length 
      : 0
  };
}

/**
 * Map array to summary format
 * @param {Array} dbRunTypes - Array of database records
 * @returns {Array} Array of summary objects
 */
export function mapRunTypesToSummary(dbRunTypes) {
  if (!Array.isArray(dbRunTypes)) return [];
  return dbRunTypes.map(mapRunTypeToSummary);
}

export default {
  mapRunTypeDbToApi,
  mapRunTypesDbToApi,
  mapRunTypeApiToDb,
  mapRunTypeToSummary,
  mapRunTypesToSummary
};
