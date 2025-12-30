/**
 * ScheduleHub Product-Specific RBAC Middleware
 * 
 * Provides convenient middleware functions for ScheduleHub permission checks.
 * Uses the centralized RBAC system with ScheduleHub-specific permissions.
 * 
 * @module products/schedulehub/middleware/rbac
 */

import { requirePermission, requireRole } from '../../../middleware/rbac.ts';

/**
 * ScheduleHub Permission Middleware Factories
 * 
 * Each method returns Express middleware that checks for specific ScheduleHub permissions.
 * All permissions are prefixed with the resource name (e.g., 'schedules:create').
 */
export const ScheduleHubPermissions = {
  // ========================================
  // Schedule Permissions
  // ========================================
  
  /**
   * Check if user can create schedules
   * @returns {Function} Express middleware
   */
  canCreateSchedule: () => requirePermission('schedules:create'),
  
  /**
   * Check if user can view schedules
   * @returns {Function} Express middleware
   */
  canViewSchedule: () => requirePermission('schedules:read'),
  
  /**
   * Check if user can update schedules
   * @returns {Function} Express middleware
   */
  canUpdateSchedule: () => requirePermission('schedules:update'),
  
  /**
   * Check if user can delete schedules
   * @returns {Function} Express middleware
   */
  canDeleteSchedule: () => requirePermission('schedules:delete'),
  
  /**
   * Check if user can publish schedules
   * @returns {Function} Express middleware
   */
  canPublishSchedule: () => requirePermission('schedules:publish'),
  
  // ========================================
  // Shift Permissions
  // ========================================
  
  /**
   * Check if user can manage shifts
   * @returns {Function} Express middleware
   */
  canManageShifts: () => requirePermission('shifts:manage'),
  
  /**
   * Check if user can create shifts
   * @returns {Function} Express middleware
   */
  canCreateShift: () => requirePermission('shifts:create'),
  
  /**
   * Check if user can view shifts
   * @returns {Function} Express middleware
   */
  canViewShift: () => requirePermission('shifts:read'),
  
  /**
   * Check if user can update shifts
   * @returns {Function} Express middleware
   */
  canUpdateShift: () => requirePermission('shifts:update'),
  
  /**
   * Check if user can delete shifts
   * @returns {Function} Express middleware
   */
  canDeleteShift: () => requirePermission('shifts:delete'),
  
  /**
   * Check if user can assign shifts
   * @returns {Function} Express middleware
   */
  canAssignShift: () => requirePermission('shifts:assign'),
  
  // ========================================
  // Station Permissions
  // ========================================
  
  /**
   * Check if user can manage stations
   * @returns {Function} Express middleware
   */
  canManageStations: () => requirePermission('stations:manage'),
  
  /**
   * Check if user can create stations
   * @returns {Function} Express middleware
   */
  canCreateStation: () => requirePermission('stations:create'),
  
  /**
   * Check if user can view stations
   * @returns {Function} Express middleware
   */
  canViewStation: () => requirePermission('stations:read'),
  
  /**
   * Check if user can update stations
   * @returns {Function} Express middleware
   */
  canUpdateStation: () => requirePermission('stations:update'),
  
  /**
   * Check if user can delete stations
   * @returns {Function} Express middleware
   */
  canDeleteStation: () => requirePermission('stations:delete'),
  
  // ========================================
  // Time Tracking Permissions
  // ========================================
  
  /**
   * Check if user can manage time tracking
   * @returns {Function} Express middleware
   */
  canManageTimeTracking: () => requirePermission('time_tracking:manage'),
  
  /**
   * Check if user can clock in/out
   * @returns {Function} Express middleware
   */
  canClockInOut: () => requirePermission('time_tracking:clock'),
  
  /**
   * Check if user can view time tracking records
   * @returns {Function} Express middleware
   */
  canViewTimeTracking: () => requirePermission('time_tracking:read'),
  
  /**
   * Check if user can edit time tracking records
   * @returns {Function} Express middleware
   */
  canEditTimeTracking: () => requirePermission('time_tracking:update'),
  
  /**
   * Check if user can approve time tracking records
   * @returns {Function} Express middleware
   */
  canApproveTimeTracking: () => requirePermission('time_tracking:approve'),
  
  // ========================================
  // Availability Permissions
  // ========================================
  
  /**
   * Check if user can manage availability
   * @returns {Function} Express middleware
   */
  canManageAvailability: () => requirePermission('availability:manage'),
  
  /**
   * Check if user can set their own availability
   * @returns {Function} Express middleware
   */
  canSetAvailability: () => requirePermission('availability:set'),
  
  /**
   * Check if user can view availability
   * @returns {Function} Express middleware
   */
  canViewAvailability: () => requirePermission('availability:read'),
  
  // ========================================
  // Shift Swap Permissions
  // ========================================
  
  /**
   * Check if user can request shift swaps
   * @returns {Function} Express middleware
   */
  canRequestShiftSwap: () => requirePermission('shift_swaps:request'),
  
  /**
   * Check if user can approve shift swaps
   * @returns {Function} Express middleware
   */
  canApproveShiftSwap: () => requirePermission('shift_swaps:approve'),
  
  /**
   * Check if user can view shift swap requests
   * @returns {Function} Express middleware
   */
  canViewShiftSwaps: () => requirePermission('shift_swaps:read'),
  
  // ========================================
  // Break Management Permissions
  // ========================================
  
  /**
   * Check if user can manage break rules
   * @returns {Function} Express middleware
   */
  canManageBreaks: () => requirePermission('breaks:manage'),
  
  /**
   * Check if user can take breaks
   * @returns {Function} Express middleware
   */
  canTakeBreak: () => requirePermission('breaks:take'),
  
  /**
   * Check if user can view break records
   * @returns {Function} Express middleware
   */
  canViewBreaks: () => requirePermission('breaks:read'),
  
  // ========================================
  // Overtime Permissions
  // ========================================
  
  /**
   * Check if user can manage overtime rules
   * @returns {Function} Express middleware
   */
  canManageOvertime: () => requirePermission('overtime:manage'),
  
  /**
   * Check if user can approve overtime
   * @returns {Function} Express middleware
   */
  canApproveOvertime: () => requirePermission('overtime:approve'),
  
  /**
   * Check if user can view overtime records
   * @returns {Function} Express middleware
   */
  canViewOvertime: () => requirePermission('overtime:read'),
  
  // ========================================
  // Reporting Permissions
  // ========================================
  
  /**
   * Check if user can view scheduling reports
   * @returns {Function} Express middleware
   */
  canViewReports: () => requirePermission('reports:read'),
  
  /**
   * Check if user can export scheduling data
   * @returns {Function} Express middleware
   */
  canExportData: () => requirePermission('data:export'),
  
  /**
   * Check if user can view labor cost reports
   * @returns {Function} Express middleware
   */
  canViewLaborCost: () => requirePermission('labor_cost:read'),
  
  // ========================================
  // Settings Permissions
  // ========================================
  
  /**
   * Check if user can manage ScheduleHub settings
   * @returns {Function} Express middleware
   */
  canManageSettings: () => requirePermission('settings:manage'),
  
  /**
   * Check if user can manage shift templates
   * @returns {Function} Express middleware
   */
  canManageShiftTemplates: () => requirePermission('scheduling:shift_templates:manage'),
  
  // ========================================
  // Role-Based Shortcuts
  // ========================================
  
  /**
   * Check if user is scheduling administrator (or higher)
   * @returns {Function} Express middleware
   */
  isSchedulingAdmin: () => requireRole('scheduling_admin', 'org_admin', 'org_owner', 'super_admin'),
  
  /**
   * Check if user is scheduling manager (or higher)
   * @returns {Function} Express middleware
   */
  isSchedulingManager: () => requireRole('scheduling_manager', 'scheduling_admin', 'org_admin', 'org_owner'),
  
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
 * import { canCreateSchedule } from './middleware/rbac.ts';
 * router.post('/schedules', authenticate, canCreateSchedule(), createSchedule);
 */
export const {
  canCreateSchedule,
  canViewSchedule,
  canUpdateSchedule,
  canDeleteSchedule,
  canPublishSchedule,
  canManageShifts,
  canCreateShift,
  canViewShift,
  canUpdateShift,
  canDeleteShift,
  canAssignShift,
  canManageStations,
  canCreateStation,
  canViewStation,
  canUpdateStation,
  canDeleteStation,
  canManageTimeTracking,
  canClockInOut,
  canViewTimeTracking,
  canEditTimeTracking,
  canApproveTimeTracking,
  canManageAvailability,
  canSetAvailability,
  canViewAvailability,
  canRequestShiftSwap,
  canApproveShiftSwap,
  canViewShiftSwaps,
  canManageBreaks,
  canTakeBreak,
  canViewBreaks,
  canManageOvertime,
  canApproveOvertime,
  canViewOvertime,
  canViewReports,
  canExportData,
  canViewLaborCost,
  canManageSettings,
  canManageShiftTemplates,
  isSchedulingAdmin,
  isSchedulingManager,
  isOrgAdmin
} = ScheduleHubPermissions;

export default ScheduleHubPermissions;
