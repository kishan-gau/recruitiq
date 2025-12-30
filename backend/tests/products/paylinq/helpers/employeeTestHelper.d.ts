/**
 * Create a complete test employee with both HRIS and payroll records
 * @param {Object} options - Configuration options
 * @param {string} options.organizationId - Organization ID
 * @param {string} options.userId - User ID for audit fields
 * @param {Object} options.employee - Employee data overrides
 * @param {Object} options.payrollConfig - Payroll config overrides
 * @returns {Object} Created employee and config data
 */
export function createTestEmployee(options?: {
    organizationId: string;
    userId: string;
    employee: Object;
    payrollConfig: Object;
}): Object;
/**
 * Create multiple test employees
 * @param {number} count - Number of employees to create
 * @param {Object} options - Base configuration options
 * @returns {Array} Array of created employee records
 */
export function createTestEmployees(count: number, options?: Object): any[];
/**
 * Delete a test employee and all related payroll data
 * @param {string} employeeId - Employee ID to delete
 */
export function deleteTestEmployee(employeeId: string): Promise<void>;
/**
 * Delete all test employees for an organization created recently
 * @param {string} organizationId - Organization ID
 * @param {string} hoursAgo - Hours to look back (default: 1)
 */
export function cleanupTestEmployees(organizationId: string, hoursAgo?: string): Promise<void>;
/**
 * Get employee with payroll config
 * @param {string} employeeId - Employee ID
 * @returns {Object} Employee and payroll config data
 */
export function getTestEmployee(employeeId: string): Object;
/**
 * Update employee employment status
 * @param {string} employeeId - Employee ID
 * @param {string} status - New employment status
 */
export function updateEmployeeStatus(employeeId: string, status: string): Promise<void>;
/**
 * Update employee payroll status
 * @param {string} employeeId - Employee ID
 * @param {string} status - New payroll status
 */
export function updatePayrollStatus(employeeId: string, status: string): Promise<void>;
declare namespace _default {
    export { createTestEmployee };
    export { createTestEmployees };
    export { deleteTestEmployee };
    export { cleanupTestEmployees };
    export { getTestEmployee };
    export { updateEmployeeStatus };
    export { updatePayrollStatus };
}
export default _default;
//# sourceMappingURL=employeeTestHelper.d.ts.map