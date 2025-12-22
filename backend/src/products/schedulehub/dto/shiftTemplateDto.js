/**
 * Shift Template DTO
 * Maps shift template data between database format (snake_case) and API format (camelCase)
 * 
 * @module products/schedulehub/dto/shiftTemplateDto
 */

/**
 * Map single shift template from database to API format
 * @param {Object} dbTemplate - Shift template record from database (snake_case)
 * @returns {Object} Shift template in API format (camelCase)
 */
export function mapShiftTemplateDbToApi(dbTemplate) {
  if (!dbTemplate) return null;

  return {
    id: dbTemplate.id,
    organizationId: dbTemplate.organization_id,
    templateName: dbTemplate.template_name,
    description: dbTemplate.description || null,
    startTime: dbTemplate.start_time,
    endTime: dbTemplate.end_time,
    durationMinutes: dbTemplate.duration_minutes || 0,
    totalHours: dbTemplate.duration_minutes ? (dbTemplate.duration_minutes / 60) : null,  // Calculate from minutes
    breakDuration: dbTemplate.break_duration_minutes || 0,  // Match DB schema
    breakPaid: dbTemplate.break_paid,
    templateType: dbTemplate.template_type || 'regular',
    isActive: dbTemplate.is_active,
    colorCode: dbTemplate.color_code || null,
    createdAt: dbTemplate.created_at,
    updatedAt: dbTemplate.updated_at,
    createdBy: dbTemplate.created_by,
    updatedBy: dbTemplate.updated_by,
    
    // Additional fields from JOINs
    stations: mapStationsFromJunctionTable(dbTemplate.stations || []),
    stationIds: (dbTemplate.stations || []).map(s => s.station_id || s.stationId || s.id).filter(Boolean),  // Extract IDs for form
    roleCount: dbTemplate.role_count ? parseInt(dbTemplate.role_count) : 0,
    totalWorkers: dbTemplate.total_workers ? parseInt(dbTemplate.total_workers) : 0,
    usageCount: dbTemplate.usage_count ? parseInt(dbTemplate.usage_count) : 0,
    
    // Role requirements (handle both snake_case from DB and camelCase from service)
    roleRequirements: (() => {
      const roles = dbTemplate.roleRequirements || dbTemplate.role_requirements || [];
      console.log('🔍 [DTO] dbTemplate keys:', Object.keys(dbTemplate));
      console.log('🔍 [DTO] dbTemplate.roleRequirements:', dbTemplate.roleRequirements);
      console.log('🔍 [DTO] dbTemplate.role_requirements:', dbTemplate.role_requirements);
      console.log('🔍 [DTO] dbTemplate type:', typeof dbTemplate);
      console.log('🔍 [DTO] Final roles:', roles);
      return roles;
    })()
  };
}

/**
 * Map stations from junction table format to API format
 * Handles station data retrieved via many-to-many relationship
 * @param {Array} junctionData - Station data from shift_template_stations junction table
 * @returns {Array} Array of stations in API format
 */
function mapStationsFromJunctionTable(junctionData) {
  if (!Array.isArray(junctionData)) return [];
  
  return junctionData.map(junction => {
    // Handle different possible formats from repository queries
    if (junction.station_id || junction.stationId) {
      return {
        id: junction.station_id || junction.stationId,
        name: junction.station_name || junction.stationName || junction.name,
        description: junction.station_description || junction.stationDescription || junction.description,
        isActive: junction.station_is_active !== undefined ? junction.station_is_active : 
                 junction.stationIsActive !== undefined ? junction.stationIsActive : 
                 junction.isActive !== undefined ? junction.isActive : true,
        
        // Junction table specific fields
        assignedAt: junction.assigned_at || junction.assignedAt,
        assignedBy: junction.assigned_by || junction.assignedBy,
        
        // Additional station metadata if available
        location: junction.station_location || junction.stationLocation || junction.location,
        capacity: junction.station_capacity || junction.stationCapacity || junction.capacity,
        equipment: junction.station_equipment || junction.stationEquipment || junction.equipment || [],
        shiftCount: junction.shift_count || junction.shiftCount || 0
      };
    } else if (junction.id) {
      // Direct station object format
      return {
        id: junction.id,
        name: junction.name,
        description: junction.description,
        isActive: junction.is_active !== undefined ? junction.is_active : junction.isActive !== undefined ? junction.isActive : true,
        location: junction.location,
        capacity: junction.capacity,
        equipment: junction.equipment || [],
        shiftCount: junction.shift_count || junction.shiftCount || 0
      };
    } else {
      // Fallback for unexpected format
      return junction;
    }
  });
}

/**
 * Map array of shift templates from database to API format
 * @param {Array} dbTemplates - Array of shift template records from database
 * @returns {Array} Array of shift templates in API format
 */
export function mapShiftTemplatesDbToApi(dbTemplates) {
  if (!Array.isArray(dbTemplates)) return [];
  return dbTemplates.map(mapShiftTemplateDbToApi);
}

/**
 * Map shift template from API format to database format
 * @param {Object} apiData - Shift template data from API (camelCase)
 * @returns {Object} Shift template in database format (snake_case)
 */
export function mapShiftTemplateApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  // Only include fields present in API data
  if (apiData.organizationId !== undefined) {
    dbData.organization_id = apiData.organizationId;
  }
  if (apiData.templateName !== undefined) {
    dbData.template_name = apiData.templateName;
  }
  // Basic info
  if (apiData.description !== undefined) {
    dbData.description = apiData.description;
  }
  
  // Time details
  if (apiData.startTime !== undefined) {
    dbData.start_time = apiData.startTime;
  }
  if (apiData.endTime !== undefined) {
    dbData.end_time = apiData.endTime;
  }
  if (apiData.durationMinutes !== undefined) {
    dbData.duration_minutes = apiData.durationMinutes;
  }
  if (apiData.totalHours !== undefined) {
    dbData.duration_minutes = Math.round(apiData.totalHours * 60);  // Convert hours to minutes for DB
  }
  
  // Break configuration
  if (apiData.breakDuration !== undefined) {
    dbData.break_duration_minutes = apiData.breakDuration;  // Match DB schema
  }
  if (apiData.breakPaid !== undefined) {
    dbData.break_paid = apiData.breakPaid;
  }
  
  // Template configuration
  if (apiData.templateType !== undefined) {
    dbData.template_type = apiData.templateType;
  } else {
    dbData.template_type = 'regular'; // Default to regular template type
  }
  if (apiData.isActive !== undefined) {
    dbData.is_active = apiData.isActive;
  }
  if (apiData.colorCode !== undefined) {
    dbData.color_code = apiData.colorCode;
  }
  // Note: Stations are now handled via junction table, not direct mapping
  if (apiData.createdBy !== undefined) {
    dbData.created_by = apiData.createdBy;
  }
  if (apiData.updatedBy !== undefined) {
    dbData.updated_by = apiData.updatedBy;
  }

  return dbData;
}

/**
 * Map single shift template role from database to API format
 * @param {Object} dbRole - Template role record from database (snake_case)
 * @returns {Object} Template role in API format (camelCase)
 */
export function mapTemplateRoleDbToApi(dbRole) {
  if (!dbRole) return null;

  return {
    id: dbRole.id,
    templateId: dbRole.template_id,
    roleId: dbRole.role_id,
    roleName: dbRole.role_name,
    roleCode: dbRole.role_code,
    quantity: dbRole.required_count,
    minimumProficiency: convertProficiencyToInteger(dbRole.min_proficiency),
    preferredProficiency: null, // Not implemented in current schema
    isPrimaryRole: dbRole.is_supervisor || false,
    priority: dbRole.priority || 1,
    isFlexible: false, // Not implemented in current schema
    createdAt: dbRole.created_at,
    
    // Additional role details from JOINs
    roleDescription: dbRole.role_description || null,
    roleColor: dbRole.role_color || null,
    requiresCertification: dbRole.requires_certification || false,
    certificationTypes: dbRole.certification_types || [],
    skillLevel: dbRole.skill_level || null,
    hourlyRate: dbRole.hourly_rate ? parseFloat(dbRole.hourly_rate) : null
  };
}

/**
 * Map array of template roles from database to API format
 * @param {Array} dbRoles - Array of template role records from database
 * @returns {Array} Array of template roles in API format
 */
export function mapTemplateRolesDbToApi(dbRoles) {
  if (!Array.isArray(dbRoles)) return [];
  return dbRoles.map(mapTemplateRoleDbToApi);
}

/**
 * Map template role from API format to database format
 * @param {Object} apiData - Template role data from API (camelCase)
 * @returns {Object} Template role in database format (snake_case)
 */
/**
 * Convert integer proficiency level to string format
 * @param {number} level - Integer proficiency level (1-5)
 * @returns {string} String proficiency level
 */
function convertProficiencyToString(level) {
  const mapping = {
    1: 'trainee',
    2: 'competent', 
    3: 'proficient',
    4: 'expert',
    5: 'expert' // Level 5 maps to expert as well
  };
  return mapping[level] || 'trainee';
}

/**
 * Convert string proficiency to integer for frontend
 * @param {string} proficiency - String proficiency level
 * @returns {number} Integer proficiency level (1-5)
 */
function convertProficiencyToInteger(proficiency) {
  const mapping = {
    'trainee': 1,
    'competent': 2,
    'proficient': 3,
    'expert': 4 // Expert maps to level 4 for consistency
  };
  return mapping[proficiency] || 1;
}

export function mapTemplateRoleApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  // Only include fields present in API data
  if (apiData.templateId !== undefined) {
    dbData.template_id = apiData.templateId;
  }
  if (apiData.roleId !== undefined) {
    dbData.role_id = apiData.roleId;
  }
  if (apiData.quantity !== undefined) {
    dbData.required_count = apiData.quantity;
  }
  if (apiData.minimumProficiency !== undefined) {
    // Convert integer proficiency to string format for database
    dbData.min_proficiency = convertProficiencyToString(apiData.minimumProficiency);
  }
  // preferredProficiency not implemented in current schema
  // if (apiData.preferredProficiency !== undefined) {
  //   dbData.preferred_proficiency = apiData.preferredProficiency;
  // }
  if (apiData.isPrimaryRole !== undefined) {
    dbData.is_supervisor = apiData.isPrimaryRole;
  }
  if (apiData.priority !== undefined) {
    dbData.priority = apiData.priority;
  }
  // isFlexible not implemented in current schema
  // if (apiData.isFlexible !== undefined) {
  //   dbData.is_flexible = apiData.isFlexible;
  // }

  return dbData;
}

/**
 * Map shift template to summary format (for dropdowns/lists)
 * @param {Object} dbTemplate - Template record from database
 * @returns {Object} Template summary
 */
export function mapTemplateToSummary(dbTemplate) {
  if (!dbTemplate) return null;

  return {
    id: dbTemplate.id,
    templateName: dbTemplate.template_name,
    description: dbTemplate.description,
    startTime: dbTemplate.start_time,
    endTime: dbTemplate.end_time,
    totalHours: dbTemplate.total_hours ? parseFloat(dbTemplate.total_hours) : null,
    isActive: dbTemplate.is_active,
    roleCount: dbTemplate.role_count ? parseInt(dbTemplate.role_count) : 0,
    totalWorkers: dbTemplate.total_workers ? parseInt(dbTemplate.total_workers) : 0,
    priority: dbTemplate.priority || 1
  };
}

/**
 * Map templates to summary format
 * @param {Array} dbTemplates - Array of template records
 * @returns {Array} Array of template summaries
 */
export function mapTemplatesToSummary(dbTemplates) {
  if (!Array.isArray(dbTemplates)) return [];
  return dbTemplates.map(mapTemplateToSummary);
}

/**
 * Map frontend format to API format (handles UI form submissions)
 * @param {Object} frontendData - Data from frontend forms
 * @returns {Object} Data in API format
 */
export function mapTemplateFrontendToApi(frontendData) {
  if (!frontendData) return null;

  return {
    templateName: frontendData.templateName || frontendData.name,
    description: frontendData.description,
    startTime: frontendData.startTime,
    endTime: frontendData.endTime,
    breakDuration: parseInt(frontendData.breakDuration) || 0,
    totalHours: parseFloat(frontendData.totalHours) || null,
    isFlexible: Boolean(frontendData.isFlexible),
    flexibilityMinutes: parseInt(frontendData.flexibilityMinutes) || 0,
    isRecurring: Boolean(frontendData.isRecurring),
    recurrencePattern: frontendData.recurrencePattern || null,
    validityStartDate: frontendData.validityStartDate || null,
    validityEndDate: frontendData.validityEndDate || null,
    priority: parseInt(frontendData.priority) || 1,
    isActive: frontendData.isActive !== undefined ? Boolean(frontendData.isActive) : true,
    stationId: frontendData.stationId || null,
    
    // Role requirements
    roleRequirements: frontendData.roleRequirements || frontendData.roles || []
  };
}