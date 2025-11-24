/**
 * Nexus Product-Specific RBAC Middleware
 * 
 * Provides convenient middleware functions for Nexus (HRIS) permission checks.
 * Uses the centralized RBAC system with Nexus-specific permissions.
 * 
 * @module products/nexus/middleware/rbac
 */

import { requirePermission, requireRole } from '../../../middleware/rbac.js';

/**
 * Nexus Permission Middleware Factories
 * 
 * Each method returns Express middleware that checks for specific Nexus permissions.
 * All permissions are prefixed with the resource name (e.g., 'employees:create').
 */
export const NexusPermissions = {
  // ========================================
  // Employee Permissions
  // ========================================
  
  /**
   * Check if user can create employees
   * @returns {Function} Express middleware
   */
  canCreateEmployee: () => requirePermission('employees:create'),
  
  /**
   * Check if user can view employees
   * @returns {Function} Express middleware
   */
  canViewEmployee: () => requirePermission('employees:read'),
  
  /**
   * Check if user can update employees
   * @returns {Function} Express middleware
   */
  canUpdateEmployee: () => requirePermission('employees:update'),
  
  /**
   * Check if user can delete employees
   * @returns {Function} Express middleware
   */
  canDeleteEmployee: () => requirePermission('employees:delete'),
  
  /**
   * Check if user can terminate employees
   * @returns {Function} Express middleware
   */
  canTerminateEmployee: () => requirePermission('employees:terminate'),
  
  // ========================================
  // Department Permissions
  // ========================================
  
  /**
   * Check if user can manage departments
   * @returns {Function} Express middleware
   */
  canManageDepartments: () => requirePermission('departments:manage'),
  
  /**
   * Check if user can create departments
   * @returns {Function} Express middleware
   */
  canCreateDepartment: () => requirePermission('departments:create'),
  
  /**
   * Check if user can view departments
   * @returns {Function} Express middleware
   */
  canViewDepartment: () => requirePermission('departments:read'),
  
  /**
   * Check if user can update departments
   * @returns {Function} Express middleware
   */
  canUpdateDepartment: () => requirePermission('departments:update'),
  
  /**
   * Check if user can delete departments
   * @returns {Function} Express middleware
   */
  canDeleteDepartment: () => requirePermission('departments:delete'),
  
  // ========================================
  // Location Permissions
  // ========================================
  
  /**
   * Check if user can manage locations
   * @returns {Function} Express middleware
   */
  canManageLocations: () => requirePermission('locations:manage'),
  
  /**
   * Check if user can create locations
   * @returns {Function} Express middleware
   */
  canCreateLocation: () => requirePermission('locations:create'),
  
  /**
   * Check if user can view locations
   * @returns {Function} Express middleware
   */
  canViewLocation: () => requirePermission('locations:read'),
  
  /**
   * Check if user can update locations
   * @returns {Function} Express middleware
   */
  canUpdateLocation: () => requirePermission('locations:update'),
  
  /**
   * Check if user can delete locations
   * @returns {Function} Express middleware
   */
  canDeleteLocation: () => requirePermission('locations:delete'),
  
  // ========================================
  // Time-Off Permissions
  // ========================================
  
  /**
   * Check if user can manage time-off policies
   * @returns {Function} Express middleware
   */
  canManageTimeOffPolicies: () => requirePermission('time_off:manage'),
  
  /**
   * Check if user can create time-off requests
   * @returns {Function} Express middleware
   */
  canCreateTimeOffRequest: () => requirePermission('time_off:create'),
  
  /**
   * Check if user can view time-off requests
   * @returns {Function} Express middleware
   */
  canViewTimeOffRequest: () => requirePermission('time_off:read'),
  
  /**
   * Check if user can approve time-off requests
   * @returns {Function} Express middleware
   */
  canApproveTimeOff: () => requirePermission('time_off:approve'),
  
  /**
   * Check if user can reject time-off requests
   * @returns {Function} Express middleware
   */
  canRejectTimeOff: () => requirePermission('time_off:reject'),
  
  // ========================================
  // Attendance Permissions
  // ========================================
  
  /**
   * Check if user can manage attendance policies
   * @returns {Function} Express middleware
   */
  canManageAttendance: () => requirePermission('attendance:manage'),
  
  /**
   * Check if user can view attendance records
   * @returns {Function} Express middleware
   */
  canViewAttendance: () => requirePermission('attendance:read'),
  
  /**
   * Check if user can update attendance records
   * @returns {Function} Express middleware
   */
  canUpdateAttendance: () => requirePermission('attendance:update'),
  
  // ========================================
  // Benefits Permissions
  // ========================================
  
  /**
   * Check if user can manage benefit plans
   * @returns {Function} Express middleware
   */
  canManageBenefits: () => requirePermission('benefits:manage'),
  
  /**
   * Check if user can view benefit plans
   * @returns {Function} Express middleware
   */
  canViewBenefits: () => requirePermission('benefits:read'),
  
  /**
   * Check if user can enroll employees in benefits
   * @returns {Function} Express middleware
   */
  canEnrollBenefits: () => requirePermission('benefits:enroll'),
  
  // ========================================
  // Document Permissions
  // ========================================
  
  /**
   * Check if user can manage documents
   * @returns {Function} Express middleware
   */
  canManageDocuments: () => requirePermission('documents:manage'),
  
  /**
   * Check if user can upload documents
   * @returns {Function} Express middleware
   */
  canUploadDocument: () => requirePermission('documents:create'),
  
  /**
   * Check if user can view documents
   * @returns {Function} Express middleware
   */
  canViewDocument: () => requirePermission('documents:read'),
  
  /**
   * Check if user can delete documents
   * @returns {Function} Express middleware
   */
  canDeleteDocument: () => requirePermission('documents:delete'),
  
  /**
   * Check if user can sign documents
   * @returns {Function} Express middleware
   */
  canSignDocument: () => requirePermission('documents:sign'),
  
  // ========================================
  // Contract Permissions
  // ========================================
  
  /**
   * Check if user can manage contracts
   * @returns {Function} Express middleware
   */
  canManageContracts: () => requirePermission('contracts:manage'),
  
  /**
   * Check if user can create contracts
   * @returns {Function} Express middleware
   */
  canCreateContract: () => requirePermission('contracts:create'),
  
  /**
   * Check if user can view contracts
   * @returns {Function} Express middleware
   */
  canViewContract: () => requirePermission('contracts:read'),
  
  /**
   * Check if user can terminate contracts
   * @returns {Function} Express middleware
   */
  canTerminateContract: () => requirePermission('contracts:terminate'),
  
  // ========================================
  // Performance Permissions
  // ========================================
  
  /**
   * Check if user can manage performance reviews
   * @returns {Function} Express middleware
   */
  canManagePerformance: () => requirePermission('performance:manage'),
  
  /**
   * Check if user can view performance reviews
   * @returns {Function} Express middleware
   */
  canViewPerformance: () => requirePermission('performance:read'),
  
  /**
   * Check if user can create performance goals
   * @returns {Function} Express middleware
   */
  canCreateGoal: () => requirePermission('performance:create_goal'),
  
  // ========================================
  // Reporting Permissions
  // ========================================
  
  /**
   * Check if user can view HR reports
   * @returns {Function} Express middleware
   */
  canViewReports: () => requirePermission('reports:read'),
  
  /**
   * Check if user can export HR data
   * @returns {Function} Express middleware
   */
  canExportData: () => requirePermission('data:export'),
  
  // ========================================
  // Role-Based Shortcuts
  // ========================================
  
  /**
   * Check if user is HR administrator (or higher)
   * @returns {Function} Express middleware
   */
  isHRAdmin: () => requireRole('hr_admin', 'org_admin', 'org_owner', 'super_admin'),
  
  /**
   * Check if user is HR manager (or higher)
   * @returns {Function} Express middleware
   */
  isHRManager: () => requireRole('hr_manager', 'hr_admin', 'org_admin', 'org_owner'),
  
  /**
   * Check if user is organization administrator (or higher)
   * @returns {Function} Express middleware
   */
  isOrgAdmin: () => requireRole('org_admin', 'org_owner', 'super_admin'),
};

/**
 * Export individual permission checks for direct use
 * 
 * @example
 * import { canCreateEmployee } from './middleware/rbac.js';
 * router.post('/employees', authenticate, canCreateEmployee(), createEmployee);
 */
export const {
  canCreateEmployee,
  canViewEmployee,
  canUpdateEmployee,
  canDeleteEmployee,
  canTerminateEmployee,
  canManageDepartments,
  canCreateDepartment,
  canViewDepartment,
  canUpdateDepartment,
  canDeleteDepartment,
  canManageLocations,
  canCreateLocation,
  canViewLocation,
  canUpdateLocation,
  canDeleteLocation,
  canManageTimeOffPolicies,
  canCreateTimeOffRequest,
  canViewTimeOffRequest,
  canApproveTimeOff,
  canRejectTimeOff,
  canManageAttendance,
  canViewAttendance,
  canUpdateAttendance,
  canManageBenefits,
  canViewBenefits,
  canEnrollBenefits,
  canManageDocuments,
  canUploadDocument,
  canViewDocument,
  canDeleteDocument,
  canSignDocument,
  canManageContracts,
  canCreateContract,
  canViewContract,
  canTerminateContract,
  canManagePerformance,
  canViewPerformance,
  canCreateGoal,
  canViewReports,
  canExportData,
  isHRAdmin,
  isHRManager,
  isOrgAdmin
} = NexusPermissions;

export default NexusPermissions;
