/**
 * Pay Structure DTO
 * 
 * Data Transfer Object for pay structure records (pay_structures table).
 * Handles mapping between database schema and API format.
 * 
 * Database Format (snake_case):
 * - structure_code, structure_name, parent_template_id
 * - is_template, base_salary
 * 
 * API Format (camelCase):
 * - structureCode, structureName, parentTemplateId
 * - isTemplate, baseSalary
 * 
 * @module products/paylinq/dto/payStructureDto
 */

/**
 * Map a single pay structure from database format to API format
 * @param {Object} dbStructure - Pay structure record from database
 * @returns {Object} Pay structure in API format
 */
export function mapPayStructureDbToApi(dbStructure) {
  if (!dbStructure) return null;

  return {
    id: dbStructure.id,
    organizationId: dbStructure.organization_id,
    structureCode: dbStructure.structure_code,
    structureName: dbStructure.structure_name,
    description: dbStructure.description || null,
    
    // Template composition
    isTemplate: dbStructure.is_template || false,
    parentTemplateId: dbStructure.parent_template_id || null,
    
    // Structure configuration
    baseSalary: dbStructure.base_salary || null,
    allowances: dbStructure.allowances || [],
    deductions: dbStructure.deductions || [],
    
    // Status
    status: dbStructure.status || 'draft',
    
    // Audit
    createdBy: dbStructure.created_by,
    createdAt: dbStructure.created_at,
    updatedBy: dbStructure.updated_by,
    updatedAt: dbStructure.updated_at,
    deletedAt: dbStructure.deleted_at || null,
  };
}

/**
 * Map array of pay structures from database format to API format
 * @param {Array} dbStructures - Array of pay structure records
 * @returns {Array} Array of pay structures in API format
 */
export function mapPayStructuresDbToApi(dbStructures) {
  if (!Array.isArray(dbStructures)) return [];
  
  return dbStructures.map(mapPayStructureDbToApi);
}

/**
 * Map pay structure from API format to database format
 * @param {Object} apiData - Pay structure data from API request
 * @returns {Object} Pay structure in database format
 */
export function mapPayStructureApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  // Only include fields that are present in the API data
  if (apiData.structureCode !== undefined) {
    dbData.structure_code = apiData.structureCode;
  }
  if (apiData.structureName !== undefined) {
    dbData.structure_name = apiData.structureName;
  }
  if (apiData.description !== undefined) {
    dbData.description = apiData.description;
  }
  if (apiData.isTemplate !== undefined) {
    dbData.is_template = apiData.isTemplate;
  }
  if (apiData.parentTemplateId !== undefined) {
    dbData.parent_template_id = apiData.parentTemplateId;
  }
  if (apiData.baseSalary !== undefined) {
    dbData.base_salary = apiData.baseSalary;
  }
  if (apiData.allowances !== undefined) {
    dbData.allowances = apiData.allowances;
  }
  if (apiData.deductions !== undefined) {
    dbData.deductions = apiData.deductions;
  }
  if (apiData.status !== undefined) {
    dbData.status = apiData.status;
  }

  return dbData;
}

/**
 * Map pay structure with full template details (for single structure view)
 * @param {Object} dbStructure - Pay structure record from database
 * @returns {Object} Pay structure with full template details in API format
 */
export function mapPayStructureWithTemplateDbToApi(dbStructure) {
  if (!dbStructure) return null;

  const baseMapping = mapPayStructureDbToApi(dbStructure);
  
  // Add template-specific fields if this is a template
  if (dbStructure.is_template) {
    return {
      ...baseMapping,
      componentCount: dbStructure.component_count || 0,
      usageCount: dbStructure.usage_count || 0,
    };
  }
  
  // Add parent template info if this structure uses a template
  if (dbStructure.parent_template_id && dbStructure.parent_template_name) {
    return {
      ...baseMapping,
      parentTemplate: {
        id: dbStructure.parent_template_id,
        name: dbStructure.parent_template_name,
        code: dbStructure.parent_template_code,
      },
    };
  }
  
  return baseMapping;
}

/**
 * Map pay structure summary (for list views)
 * @param {Object} dbStructure - Pay structure record from database
 * @returns {Object} Pay structure summary in API format
 */
export function mapPayStructureWithTemplateSummaryDbToApi(dbStructure) {
  if (!dbStructure) return null;

  return {
    id: dbStructure.id,
    structureCode: dbStructure.structure_code,
    structureName: dbStructure.structure_name,
    isTemplate: dbStructure.is_template || false,
    parentTemplateId: dbStructure.parent_template_id || null,
    baseSalary: dbStructure.base_salary || null,
    status: dbStructure.status || 'draft',
    createdAt: dbStructure.created_at,
    updatedAt: dbStructure.updated_at,
  };
}
