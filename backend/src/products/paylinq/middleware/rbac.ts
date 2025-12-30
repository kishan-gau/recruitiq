/**
 * PayLinQ Product-Specific RBAC Middleware
 * 
 * Provides convenient middleware functions for PayLinQ permission checks.
 * Uses the centralized RBAC system with PayLinQ-specific permissions.
 * 
 * @module products/paylinq/middleware/rbac
 */

import { requirePermission, requireRole } from '../../../middleware/rbac.js';

/**
 * PayLinQ Permission Middleware Factories
 * 
 * Each method returns Express middleware that checks for specific PayLinQ permissions.
 * All permissions are prefixed with the resource name (e.g., 'payroll_runs:create').
 */
export const PayLinQPermissions = {
  // ========================================
  // Payroll Run Permissions
  // ========================================
  
  /**
   * Check if user can create payroll runs
   * @returns {Function} Express middleware
   */
  canCreatePayrollRun: () => requirePermission('payroll_runs:create'),
  
  /**
   * Check if user can view payroll runs
   * @returns {Function} Express middleware
   */
  canViewPayrollRun: () => requirePermission('payroll_runs:read'),
  
  /**
   * Check if user can update payroll runs
   * @returns {Function} Express middleware
   */
  canUpdatePayrollRun: () => requirePermission('payroll_runs:update'),
  
  /**
   * Check if user can delete payroll runs
   * @returns {Function} Express middleware
   */
  canDeletePayrollRun: () => requirePermission('payroll_runs:delete'),
  
  /**
   * Check if user can execute/process payroll runs
   * @returns {Function} Express middleware
   */
  canExecutePayrollRun: () => requirePermission('payroll_runs:execute'),
  
  // ========================================
  // Payroll Component Permissions
  // ========================================
  
  /**
   * Check if user can manage payroll components
   * @returns {Function} Express middleware
   */
  canManageComponents: () => requirePermission('payroll_components:manage'),
  
  /**
   * Check if user can create payroll components
   * @returns {Function} Express middleware
   */
  canCreateComponent: () => requirePermission('payroll_components:create'),
  
  /**
   * Check if user can view payroll components
   * @returns {Function} Express middleware
   */
  canViewComponent: () => requirePermission('payroll_components:read'),
  
  /**
   * Check if user can update payroll components
   * @returns {Function} Express middleware
   */
  canUpdateComponent: () => requirePermission('payroll_components:update'),
  
  /**
   * Check if user can delete payroll components
   * @returns {Function} Express middleware
   */
  canDeleteComponent: () => requirePermission('payroll_components:delete'),
  
  // ========================================
  // Worker Type Permissions
  // ========================================
  
  /**
   * Check if user can manage worker types
   * @returns {Function} Express middleware
   */
  canManageWorkerTypes: () => requirePermission('worker_types:manage'),
  
  /**
   * Check if user can create worker types
   * @returns {Function} Express middleware
   */
  canCreateWorkerType: () => requirePermission('worker_types:create'),
  
  /**
   * Check if user can view worker types
   * @returns {Function} Express middleware
   */
  canViewWorkerType: () => requirePermission('worker_types:read'),
  
  /**
   * Check if user can update worker types
   * @returns {Function} Express middleware
   */
  canUpdateWorkerType: () => requirePermission('worker_types:update'),
  
  /**
   * Check if user can delete worker types
   * @returns {Function} Express middleware
   */
  canDeleteWorkerType: () => requirePermission('worker_types:delete'),
  
  // ========================================
  // Tax & Compliance Permissions
  // ========================================
  
  /**
   * Check if user can manage tax rules
   * @returns {Function} Express middleware
   */
  canManageTaxRules: () => requirePermission('tax_rules:manage'),
  
  /**
   * Check if user can view tax rules
   * @returns {Function} Express middleware
   */
  canViewTaxRules: () => requirePermission('tax_rules:read'),
  
  /**
   * Check if user can manage deductions
   * @returns {Function} Express middleware
   */
  canManageDeductions: () => requirePermission('deductions:manage'),
  
  /**
   * Check if user can view compliance reports
   * @returns {Function} Express middleware
   */
  canViewComplianceReports: () => requirePermission('compliance:read'),
  
  // ========================================
  // Payment & Reconciliation Permissions
  // ========================================
  
  /**
   * Check if user can process payments
   * @returns {Function} Express middleware
   */
  canProcessPayments: () => requirePermission('payments:execute'),
  
  /**
   * Check if user can view payments
   * @returns {Function} Express middleware
   */
  canViewPayments: () => requirePermission('payments:read'),
  
  /**
   * Check if user can reconcile payments
   * @returns {Function} Express middleware
   */
  canReconcilePayments: () => requirePermission('reconciliation:manage'),
  
  // ========================================
  // Reporting Permissions
  // ========================================
  
  /**
   * Check if user can view payroll reports
   * @returns {Function} Express middleware
   */
  canViewReports: () => requirePermission('reports:read'),
  
  /**
   * Check if user can export payroll data
   * @returns {Function} Express middleware
   */
  canExportData: () => requirePermission('data:export'),
  
  // ========================================
  // Settings & Configuration Permissions
  // ========================================
  
  /**
   * Check if user can manage PayLinQ settings
   * @returns {Function} Express middleware
   */
  canManageSettings: () => requirePermission('settings:manage'),
  
  /**
   * Check if user can manage currency settings
   * @returns {Function} Express middleware
   */
  canManageCurrency: () => requirePermission('currency:manage'),
  
  // ========================================
  // Role-Based Shortcuts
  // ========================================
  
  /**
   * Check if user is PayLinQ administrator (or higher)
   * @returns {Function} Express middleware
   */
  isPayrollAdmin: () => requireRole('payroll_admin', 'org_admin', 'org_owner', 'super_admin'),
  
  /**
   * Check if user is PayLinQ processor (or higher)
   * @returns {Function} Express middleware
   */
  isPayrollProcessor: () => requireRole('payroll_processor', 'payroll_admin', 'org_admin', 'org_owner'),
  
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
 * import { canCreatePayrollRun } from './middleware/rbac.js';
 * router.post('/payroll-runs', authenticate, canCreatePayrollRun(), createPayrollRun);
 */
export const {
  canCreatePayrollRun,
  canViewPayrollRun,
  canUpdatePayrollRun,
  canDeletePayrollRun,
  canExecutePayrollRun,
  canManageComponents,
  canCreateComponent,
  canViewComponent,
  canUpdateComponent,
  canDeleteComponent,
  canManageWorkerTypes,
  canCreateWorkerType,
  canViewWorkerType,
  canUpdateWorkerType,
  canDeleteWorkerType,
  canManageTaxRules,
  canViewTaxRules,
  canManageDeductions,
  canViewComplianceReports,
  canProcessPayments,
  canViewPayments,
  canReconcilePayments,
  canViewReports,
  canExportData,
  canManageSettings,
  canManageCurrency,
  isPayrollAdmin,
  isPayrollProcessor,
  isOrgAdmin
} = PayLinQPermissions;

export default PayLinQPermissions;
