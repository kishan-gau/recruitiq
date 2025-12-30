/**
 * Role DTO
 * Maps role data between database format (snake_case) and API format (camelCase)
 * 
 * @module products/schedulehub/dto/roleDto
 */

/**
 * Map single role from database to API format
 * @param {Object} dbRole - Role record from database (snake_case)
 * @returns {Object} Role in API format (camelCase)
 */
export function mapRoleDbToApi(dbRole: any): Record<string, any> | null {
  if (!dbRole) return null;

  return {
    id: dbRole.id,
    organizationId: dbRole.organization_id,
    roleCode: dbRole.role_code,
    name: dbRole.role_name,  // Map role_name -> name (frontend expects 'name')
    description: dbRole.description || null,
    colorCode: dbRole.color || null,  // Map color -> colorCode (frontend expects camelCase)
    requiresCertification: dbRole.requires_certification || false,
    certificationTypes: dbRole.certification_types || [],
    skillLevel: dbRole.skill_level || null,
    hourlyRate: dbRole.hourly_rate ? parseFloat(dbRole.hourly_rate) : null,
    isActive: dbRole.is_active,  // Map is_active -> isActive (frontend expects camelCase)
    createdAt: dbRole.created_at,
    updatedAt: dbRole.updated_at,
    
    // Additional fields that may come from JOINs
    workerCount: dbRole.worker_count ? parseInt(dbRole.worker_count) : undefined,
    shiftCount: dbRole.shift_count ? parseInt(dbRole.shift_count) : undefined
  };
}

/**
 * Map array of roles from database to API format
 * @param {Array} dbRoles - Array of role records from database
 * @returns {Array} Array of roles in API format
 */
export function mapRolesDbToApi(dbRoles: any): Record<string, any> | null {
  if (!Array.isArray(dbRoles)) return [];
  return dbRoles.map(mapRoleDbToApi);
}

/**
 * Map role from API format to database format
 * @param {Object} apiData - Role data from API (camelCase)
 * @returns {Object} Role in database format (snake_case)
 */
export function mapRoleApiToDb(apiData: any): Record<string, any> | null {
  if (!apiData) return null;

  const dbData: Record<string, any> = {};

  // Only include fields present in API data
  if (apiData.organizationId !== undefined) {
    dbData.organization_id = apiData.organizationId;
  }
  if (apiData.roleCode !== undefined) {
    dbData.role_code = apiData.roleCode;
  }
  if (apiData.roleName !== undefined) {
    dbData.role_name = apiData.roleName;
  }
  if (apiData.description !== undefined) {
    dbData.description = apiData.description;
  }
  if (apiData.color !== undefined) {
    dbData.color = apiData.color;
  }
  if (apiData.requiresCertification !== undefined) {
    dbData.requires_certification = apiData.requiresCertification;
  }
  if (apiData.certificationTypes !== undefined) {
    dbData.certification_types = apiData.certificationTypes;
  }
  if (apiData.skillLevel !== undefined) {
    dbData.skill_level = apiData.skillLevel;
  }
  if (apiData.hourlyRate !== undefined && apiData.hourlyRate !== '' && apiData.hourlyRate !== null) {
    dbData.hourly_rate = apiData.hourlyRate;
  }
  if (apiData.isActive !== undefined) {
    dbData.is_active = apiData.isActive;
  }

  return dbData;
}

/**
 * Map role to summary format (for dropdowns/lists)
 * @param {Object} dbRole - Role record from database
 * @returns {Object} Role summary
 */
export function mapRoleToSummary(dbRole) {
  if (!dbRole) return null;

  return {
    id: dbRole.id,
    roleCode: dbRole.role_code,
    roleName: dbRole.role_name,
    color: dbRole.color || null,
    isActive: dbRole.is_active,
    requiresCertification: dbRole.requires_certification || false
  };
}

/**
 * Map array of roles to summary format
 * @param {Array} dbRoles - Array of role records from database
 * @returns {Array} Array of role summaries
 */
export function mapRolesToSummary(dbRoles) {
  if (!Array.isArray(dbRoles)) return [];
  return dbRoles.map(mapRoleToSummary);
}

/**
 * Map single role worker from database to API format
 * @param {Object} dbWorker - Worker record from database (snake_case)
 * @returns {Object} Worker in API format (camelCase)
 */
export function mapRoleWorkerDbToApi(dbWorker: any): Record<string, any> | null {
  if (!dbWorker) return null;

  return {
    id: dbWorker.id,  // employee.id
    employeeId: dbWorker.employee_id,  // from worker_roles table
    firstName: dbWorker.first_name,
    lastName: dbWorker.last_name,
    workerNumber: dbWorker.worker_number,
    status: dbWorker.status,
    roleId: dbWorker.role_id,
    assignedDate: dbWorker.assigned_date,
    removedDate: dbWorker.removed_date,
    createdAt: dbWorker.created_at,
    updatedAt: dbWorker.updated_at
  };
}

/**
 * Map array of role workers from database to API format
 * @param {Array} dbWorkers - Array of worker records from database
 * @returns {Array} Array of workers in API format
 */
export function mapRoleWorkersDbToApi(dbWorkers: any): Record<string, any> | null {
  if (!Array.isArray(dbWorkers)) return [];
  return dbWorkers.map(mapRoleWorkerDbToApi);
}

/**
 * Map role from frontend format to API format for validation
 * Handles frontend format: { role_name, description, hourly_rate }
 * @param {Object} frontendData - Role data from frontend (mixed format)
 * @returns {Object} Role in API format (camelCase) ready for validation
 */
export function mapRoleFrontendToApi(frontendData) {
  if (!frontendData) return null;

  // Generate roleCode from role_name if not provided
  const generatedRoleCode = frontendData.role_name
    ? frontendData.role_name
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special chars except spaces
        .trim()
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .toUpperCase() // Convert to uppercase
    : 'ROLE_' + Date.now();

  // Helper function to properly convert undefined to null
  const toNullIfUndefined = (value) => value === undefined ? null : value;

  // Helper function to map frontend skillLevel values to backend validation values
  const mapSkillLevel = (rawSkillLevel) => {
    if (!rawSkillLevel || rawSkillLevel === undefined) return null;
    
    // Map frontend display values to backend validation values
    const skillLevelMap = {
      'Beginner': 'entry',
      'beginner': 'entry',
      'entry': 'entry',
      'Intermediate': 'intermediate', 
      'intermediate': 'intermediate',
      'Advanced': 'advanced',
      'advanced': 'advanced',
      'Expert': 'expert',
      'expert': 'expert'
    };
    
    return skillLevelMap[rawSkillLevel] || null;
  };

  return {
    roleCode: frontendData.role_code || generatedRoleCode,
    roleName: frontendData.role_name || frontendData.name,
    description: toNullIfUndefined(frontendData.description),
    color: toNullIfUndefined(frontendData.color || frontendData.colorCode),
    requiresCertification: frontendData.requires_certification || frontendData.requiresCertification || false,
    certificationTypes: toNullIfUndefined(frontendData.certification_types || frontendData.certificationTypes),
    skillLevel: mapSkillLevel(frontendData.skill_level || frontendData.skillLevel),
    hourlyRate: toNullIfUndefined(frontendData.hourly_rate || frontendData.hourlyRate)
  };
}