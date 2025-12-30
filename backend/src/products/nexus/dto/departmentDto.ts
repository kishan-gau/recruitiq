/**
 * Department DTO
 * Maps department records between DB and API formats
 * 
 * @module products/nexus/dto/departmentDto
 */

/**
 * Map single department from database to API format
 * @param {Object} dbDepartment - Department record from database (snake_case)
 * @returns {Object} Department in API format (camelCase)
 */
export function mapDepartmentDbToApi(dbDepartment) {
  if (!dbDepartment) return null;

  return {
    id: dbDepartment.id,
    organizationId: dbDepartment.organization_id,
    departmentCode: dbDepartment.department_code,
    departmentName: dbDepartment.department_name,
    description: dbDepartment.description || null,
    parentDepartmentId: dbDepartment.parent_department_id || null,
    parentDepartmentName: dbDepartment.parent_department_name || null,
    costCenter: dbDepartment.cost_center || null,
    isActive: dbDepartment.is_active,
    employeeCount: dbDepartment.employee_count || 0,
    level: dbDepartment.level || null,
    path: dbDepartment.path || null,
    createdBy: dbDepartment.created_by,
    createdAt: dbDepartment.created_at,
    updatedBy: dbDepartment.updated_by,
    updatedAt: dbDepartment.updated_at
  };
}

/**
 * Map array of departments from database to API format
 * @param {Array} dbDepartments - Array of department records
 * @returns {Array} Array of departments in API format
 */
export function mapDepartmentsDbToApi(dbDepartments) {
  if (!Array.isArray(dbDepartments)) return [];
  return dbDepartments.map(mapDepartmentDbToApi);
}

/**
 * Map department from API format to database format
 * @param {Object} apiData - Department data from API (camelCase)
 * @returns {Object} Department in database format (snake_case)
 */
export function mapDepartmentApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  // Only include fields present in API data
  if (apiData.departmentCode !== undefined) {
    dbData.department_code = apiData.departmentCode;
  }
  if (apiData.departmentName !== undefined) {
    dbData.department_name = apiData.departmentName;
  }
  if (apiData.description !== undefined) {
    dbData.description = apiData.description;
  }
  if (apiData.parentDepartmentId !== undefined) {
    dbData.parent_department_id = apiData.parentDepartmentId;
  }
  if (apiData.costCenter !== undefined) {
    dbData.cost_center = apiData.costCenter;
  }
  if (apiData.isActive !== undefined) {
    dbData.is_active = apiData.isActive;
  }

  return dbData;
}