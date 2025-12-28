// ========================================
// ScheduleHub Components - Central Exports
// ========================================

// Main Calendar Component
export { default as CalendarView } from './CalendarView';

// Supporting Components
export { default as StationDropdownFilter } from './StationDropdownFilter';
export { default as TemplateTimeSlots } from './TemplateTimeSlots';

// Shift Management Components
export { default as ShiftAssignmentModal } from './ShiftAssignmentModal';
export { default as ShiftSwapApprovalQueue } from './ShiftSwapApprovalQueue';

// Worker Scheduling Components
export { default as WorkerSchedulingConfig } from './WorkerSchedulingConfig';
export { default as WorkerRoleAssignment } from './WorkerRoleAssignment';
export { default as AssignWorkersToRole } from './AssignWorkersToRole';

// StationManagement components
export { default as StationsManagement } from './StationsManagement';
export { default as StationForm } from './StationForm';
export { default as StationDetails } from './StationDetails';

// RoleManagement components
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