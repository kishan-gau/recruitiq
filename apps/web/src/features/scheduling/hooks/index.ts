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
  useAssignWorkerRoles,
} from './useRoles';

// Station Coverage Analysis Hooks
export {
  stationCoverageKeys,
  useStationCoverage,
  calculateCoverageImpact,
} from './useStationCoverage';

// Shift Swap Marketplace Hooks
export {
  shiftSwapKeys,
  useShiftSwapMarketplace,
  useShiftSwaps,
  useMyShiftSwapOffers,
  useShiftSwapOffer,
  useCreateShiftSwapOffer,
  useRequestShiftSwap,
  useShiftSwapRequests,
  useShiftSwapRequest,
  useAcceptShiftSwapRequest,
  useRejectShiftSwapRequest,
  usePendingShiftSwapApprovals,
  useApproveShiftSwap,
  useRejectShiftSwap,
  useCancelShiftSwap,
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
