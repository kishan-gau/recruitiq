/**
 * Scheduling Hooks Index
 * 
 * Central export point for all scheduling-related React Query hooks
 * Provides a clean API for components to import scheduling functionality
 */

// Station Management Hooks
export {
  stationKeys,
  useStations,
  useStation,
  useCreateStation,
  useUpdateStation,
  useDeleteStation,
  useStationsByDepartment,
  useActiveStations,
  useInvalidateStations,
  usePrefetchStation,
} from './useStations';

// Role Management Hooks
export {
  roleKeys,
  useRoles,
  useRole,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useRolesByDepartment,
  useActiveRoles,
  useWorkerRoles,
  useAssignWorkerRole,
  useRemoveWorkerRole,
  useInvalidateRoles,
  usePrefetchRole,
} from './useRoles';

// Station Coverage Analysis Hooks
export {
  stationCoverageKeys,
  useStationCoverage,
  useStationCoverageAnalysis,
  useStationCoverageImpact,
  useInvalidateStationCoverage,
} from './useStationCoverage';

// Shift Swap Marketplace Hooks
export {
  shiftSwapKeys,
  useShiftSwaps,
  useShiftSwap,
  useAvailableShiftsForSwap,
  useMyShiftSwapRequests,
  useMyShiftSwapOffers,
  useCreateShiftSwapRequest,
  useCreateShiftSwapOffer,
  useApproveShiftSwap,
  useRejectShiftSwap,
  useCancelShiftSwapRequest,
  useCancelShiftSwapOffer,
  useInvalidateShiftSwaps,
  usePrefetchShiftSwap,
  // Additional hooks for ShiftSwapApprovalQueue component
  usePendingSwaps,
  useBulkApproveSwaps,
  useBulkRejectSwaps,
} from './useShiftSwaps';

// Shift Template Management Hooks
export {
  shiftTemplateKeys,
  useShiftTemplates,
  useShiftTemplate,
  useCreateShiftTemplate,
  useUpdateShiftTemplate,
  useDeleteShiftTemplate,
  useCloneShiftTemplate,
  useValidateShiftTemplate,
  useActiveShiftTemplates,
  useShiftTemplatesByDepartment,
  useShiftTemplatesByStation,
  useSearchShiftTemplates,
  useToggleShiftTemplateStatus,
  useOptimisticShiftTemplateUpdate,
  useBulkShiftTemplateOperations,
  useShiftTemplateUsage,
  useInvalidateShiftTemplates,
  usePrefetchShiftTemplate,
} from './useShiftTemplates';

// Schedule Statistics Hooks
export {
  scheduleStatsKeys,
  useScheduleStats,
  useScheduleStatsByPeriod,
  useStationCoverageStats,
  useScheduleEfficiencyStats,
  useScheduleTrends,
  useRealTimeScheduleMetrics,
  useInvalidateScheduleStats,
  usePrefetchScheduleStats,
} from './useScheduleStats';

// Worker Availability Hooks
export {
  availabilityKeys,
  useAvailability,
  useAvailabilityRecord,
  useAvailabilityExceptions,
  useCheckWorkerAvailability,
  useCreateAvailability,
  useUpdateAvailability,
  useDeleteAvailability,
  useCreateAvailabilityException,
  useDeleteAvailabilityException,
  useInvalidateAvailability,
  usePrefetchAvailability,
} from './useAvailability';

// Future hooks (to be migrated)
export * from './useSchedules';
export * from './useShifts';
