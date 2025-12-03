/**
 * Employee DTO
 * Maps employee data between database format (snake_case) and API format (camelCase)
 * 
 * @module products/nexus/dto/employeeDto
 */

/**
 * Map single employee from database to API format
 * @param {Object} dbEmployee - Employee record from database (snake_case)
 * @returns {Object} Employee in API format (camelCase)
 */
export function mapEmployeeDbToApi(dbEmployee) {
  if (!dbEmployee) return null;

  return {
    id: dbEmployee.id,
    organizationId: dbEmployee.organization_id,
    employeeNumber: dbEmployee.employee_number,
    firstName: dbEmployee.first_name,
    middleName: dbEmployee.middle_name,
    lastName: dbEmployee.last_name,
    preferredName: dbEmployee.preferred_name,
    email: dbEmployee.email,
    phone: dbEmployee.phone,
    mobilePhone: dbEmployee.mobile_phone,
    hireDate: dbEmployee.hire_date,
    terminationDate: dbEmployee.termination_date,
    employmentStatus: dbEmployee.employment_status,
    employmentType: dbEmployee.employment_type,
    departmentId: dbEmployee.department_id,
    departmentName: dbEmployee.department_name,
    locationId: dbEmployee.location_id,
    locationName: dbEmployee.location_name,
    managerId: dbEmployee.manager_id,
    managerName: dbEmployee.manager_name,
    jobTitle: dbEmployee.job_title,
    enrollmentCount: dbEmployee.enrollment_count ? parseInt(dbEmployee.enrollment_count) : 0,
    // VIP fields
    isVip: dbEmployee.is_vip || false,
    isRestricted: dbEmployee.is_restricted || false,
    restrictionLevel: dbEmployee.restriction_level || null,
    restrictedBy: dbEmployee.restricted_by || null,
    restrictedAt: dbEmployee.restricted_at || null,
    restrictionReason: dbEmployee.restriction_reason || null,
    // Metadata
    createdBy: dbEmployee.created_by,
    createdAt: dbEmployee.created_at,
    updatedBy: dbEmployee.updated_by,
    updatedAt: dbEmployee.updated_at
  };
}

/**
 * Map array of employees from database to API format
 * @param {Array} dbEmployees - Array of employee records
 * @returns {Array} Array of employees in API format
 */
export function mapEmployeesDbToApi(dbEmployees) {
  if (!Array.isArray(dbEmployees)) return [];
  return dbEmployees.map(mapEmployeeDbToApi);
}

/**
 * Map employee from API format to database format
 * @param {Object} apiData - Employee data from API (camelCase)
 * @returns {Object} Employee in database format (snake_case)
 */
export function mapEmployeeApiToDb(apiData) {
  if (!apiData) return null;

  const dbData = {};

  // Only include fields present in API data
  // Support both camelCase (API) and snake_case (direct DB format)
  if (apiData.employeeNumber !== undefined || apiData.employee_number !== undefined) {
    dbData.employee_number = apiData.employee_number || apiData.employeeNumber;
  }
  if (apiData.firstName !== undefined || apiData.first_name !== undefined) {
    dbData.first_name = apiData.first_name || apiData.firstName;
  }
  if (apiData.middleName !== undefined || apiData.middle_name !== undefined) {
    dbData.middle_name = apiData.middle_name || apiData.middleName;
  }
  if (apiData.lastName !== undefined || apiData.last_name !== undefined) {
    dbData.last_name = apiData.last_name || apiData.lastName;
  }
  if (apiData.preferredName !== undefined || apiData.preferred_name !== undefined) {
    dbData.preferred_name = apiData.preferred_name || apiData.preferredName;
  }
  if (apiData.email !== undefined) {
    dbData.email = apiData.email;
  }
  if (apiData.phone !== undefined) {
    dbData.phone = apiData.phone;
  }
  if (apiData.mobilePhone !== undefined || apiData.mobile_phone !== undefined) {
    dbData.mobile_phone = apiData.mobile_phone || apiData.mobilePhone;
  }
  if (apiData.hireDate !== undefined || apiData.hire_date !== undefined) {
    dbData.hire_date = apiData.hire_date || apiData.hireDate;
  }
  if (apiData.terminationDate !== undefined || apiData.termination_date !== undefined) {
    dbData.termination_date = apiData.termination_date || apiData.terminationDate;
  }
  if (apiData.employmentStatus !== undefined || apiData.employment_status !== undefined) {
    dbData.employment_status = apiData.employment_status || apiData.employmentStatus;
  }
  if (apiData.employmentType !== undefined || apiData.employment_type !== undefined) {
    dbData.employment_type = apiData.employment_type || apiData.employmentType;
  }
  if (apiData.departmentId !== undefined || apiData.department_id !== undefined) {
    dbData.department_id = apiData.department_id || apiData.departmentId;
  }
  if (apiData.locationId !== undefined || apiData.location_id !== undefined) {
    dbData.location_id = apiData.location_id || apiData.locationId;
  }
  if (apiData.managerId !== undefined || apiData.manager_id !== undefined) {
    dbData.manager_id = apiData.manager_id || apiData.managerId;
  }
  if (apiData.jobTitle !== undefined || apiData.job_title !== undefined) {
    dbData.job_title = apiData.job_title || apiData.jobTitle;
  }

  // Compensation fields (for initial employee creation)
  if (apiData.compensation !== undefined) {
    dbData.compensation = apiData.compensation;
  }
  if (apiData.salary !== undefined) {
    dbData.salary = apiData.salary;
  }
  if (apiData.compensationType !== undefined) {
    dbData.compensation_type = apiData.compensationType;
  }
  if (apiData.salaryType !== undefined) {
    dbData.salary_type = apiData.salaryType;
  }
  if (apiData.currency !== undefined) {
    dbData.currency = apiData.currency;
  }
  if (apiData.payFrequency !== undefined) {
    dbData.pay_frequency = apiData.payFrequency;
  }
  if (apiData.overtimeRate !== undefined) {
    dbData.overtime_rate = apiData.overtimeRate;
  }

  // VIP fields
  if (apiData.isVip !== undefined || apiData.is_vip !== undefined) {
    dbData.is_vip = apiData.is_vip ?? apiData.isVip;
  }
  if (apiData.isRestricted !== undefined || apiData.is_restricted !== undefined) {
    dbData.is_restricted = apiData.is_restricted ?? apiData.isRestricted;
  }
  if (apiData.restrictionLevel !== undefined || apiData.restriction_level !== undefined) {
    dbData.restriction_level = apiData.restriction_level ?? apiData.restrictionLevel;
  }
  if (apiData.restrictedBy !== undefined || apiData.restricted_by !== undefined) {
    dbData.restricted_by = apiData.restricted_by ?? apiData.restrictedBy;
  }
  if (apiData.restrictedAt !== undefined || apiData.restricted_at !== undefined) {
    dbData.restricted_at = apiData.restricted_at ?? apiData.restrictedAt;
  }
  if (apiData.restrictionReason !== undefined || apiData.restriction_reason !== undefined) {
    dbData.restriction_reason = apiData.restriction_reason ?? apiData.restrictionReason;
  }

  return dbData;
}
