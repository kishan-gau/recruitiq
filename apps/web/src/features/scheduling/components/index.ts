/**
 * ScheduleHub Components Export
 * 
 * All ScheduleHub feature components organized by domain
 * 
 * @module @/features/scheduling/components
 * @public
 */

// Shared Components (used across multiple ScheduleHub features)
export * from './shared';

// Core Scheduling Components
export { default as CalendarView } from './CalendarView';

// Filtering and Selection
export { default as StationDropdownFilter } from './StationDropdownFilter';
export { default as TemplateTimeSlots } from './TemplateTimeSlots';

// Shift Management
export { default as ShiftAssignmentModal } from './ShiftAssignmentModal';
export { default as ShiftSwapApprovalQueue } from './ShiftSwapApprovalQueue';

// Worker Scheduling
export { default as WorkerSchedulingConfig } from './WorkerSchedulingConfig';
export { default as WorkerRoleAssignment } from './WorkerRoleAssignment';
export { default as AssignWorkersToRole } from './AssignWorkersToRole';

// Station Management
export { default as StationsManagement } from './StationsManagement';
export { default as StationForm } from './StationForm';
export { default as StationDetails } from './StationDetails';

// Role Management
export { default as RolesManagement } from './RolesManagement';
export { default as RoleForm } from './RoleForm';
export { default as RoleDetails } from './RoleDetails';
export { default as RolesList } from './RolesList';


// Analytics Components
export { default as ScheduleAnalytics } from './ScheduleAnalytics';

// Type exports for component props
export type { CalendarViewProps } from './CalendarView';
export type { StationDropdownFilterProps } from './StationDropdownFilter';
export type { TemplateTimeSlotsProps } from './TemplateTimeSlots';