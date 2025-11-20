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
  if (apiData.employeeNumber !== undefined) {
    dbData.employee_number = apiData.employeeNumber;
  }
  if (apiData.firstName !== undefined) {
    dbData.first_name = apiData.firstName;
  }
  if (apiData.middleName !== undefined) {
    dbData.middle_name = apiData.middleName;
  }
  if (apiData.lastName !== undefined) {
    dbData.last_name = apiData.lastName;
  }
  if (apiData.preferredName !== undefined) {
    dbData.preferred_name = apiData.preferredName;
  }
  if (apiData.email !== undefined) {
    dbData.email = apiData.email;
  }
  if (apiData.phone !== undefined) {
    dbData.phone = apiData.phone;
  }
  if (apiData.mobilePhone !== undefined) {
    dbData.mobile_phone = apiData.mobilePhone;
  }
  if (apiData.hireDate !== undefined) {
    dbData.hire_date = apiData.hireDate;
  }
  if (apiData.terminationDate !== undefined) {
    dbData.termination_date = apiData.terminationDate;
  }
  if (apiData.employmentStatus !== undefined) {
    dbData.employment_status = apiData.employmentStatus;
  }
  if (apiData.employmentType !== undefined) {
    dbData.employment_type = apiData.employmentType;
  }
  if (apiData.departmentId !== undefined) {
    dbData.department_id = apiData.departmentId;
  }
  if (apiData.locationId !== undefined) {
    dbData.location_id = apiData.locationId;
  }
  if (apiData.managerId !== undefined) {
    dbData.manager_id = apiData.managerId;
  }
  if (apiData.jobTitle !== undefined) {
    dbData.job_title = apiData.jobTitle;
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

  return dbData;
}
