/**
 * Global Hooks Re-export Layer
 * 
 * This layer provides a centralized point for accessing all application hooks.
 * It bridges component imports (using @/hooks/) with feature-based hook locations.
 * 
 * Architecture:
 * - Components import from @/hooks/ (application-wide namespace)
 * - Features define hooks in @/features/[feature]/hooks/
 * - This layer re-exports feature hooks to global namespace
 */

// Common application hooks (utilities for all features)
export { useToast, type Toast } from './useToast';
export { useErrorHandler } from './useErrorHandler';

// Payroll feature hooks (migrated from legacy shared/hooks/paylinq)
export {
  // API hook
  usePaylinqAPI,
  paylinqAPI,
  authAPI,
  // Pay structure hooks
  usePayStructureTemplates,
  usePayStructureTemplate,
  useCreatePayStructureTemplate,
  useUpdatePayStructureTemplate,
  usePublishPayStructureTemplate,
  useDeprecatePayStructureTemplate,
  useDeletePayStructureTemplate,
  useCreatePayStructureTemplateVersion,
  usePayStructureTemplateVersions,
  usePayStructureTemplateChangelog,
  usePayStructureComponents,
  useAddPayStructureComponent,
  useUpdatePayStructureComponent,
  useDeletePayStructureComponent,
  useReorderPayStructureComponents,
  useCurrentWorkerPayStructure,
  useWorkerPayStructureHistory,
  useAssignPayStructureToWorker,
  useUpgradeWorkerPayStructure,
  usePayStructureOverrides,
  useAddPayStructureOverride,
  useUpdatePayStructureOverride,
  useDeletePayStructureOverride,
  useTemplateInclusions,
  useResolvedPayStructureTemplate,
  useAddTemplateInclusion,
  useUpdateTemplateInclusion,
  useDeleteTemplateInclusion,
  // Manager utility hook
  useWorkersForManager,
  // Original payroll hooks (not yet migrated)
  useCompensation,
  useDeductions,
  useTaxRules,
  useTaxRule,
  useCreateTaxRule,
  useUpdateTaxRule,
  useDeleteTaxRule,
  usePayrollRuns,
  useWorkers,
  // Phase 2A: Newly migrated payroll hooks
  usePayComponents,
  useEmployeeComponentAssignments,
  useAssignComponent,
  useUpdateComponentAssignment,
  useRemoveComponentAssignment,
  useWorkerTypeTemplates,
  useWorkerTypeTemplate,
  useCreateWorkerTypeTemplate,
  useUpdateWorkerTypeTemplate,
  useDeleteWorkerTypeTemplate,
  useEmployeeWorkerTypeAssignments,
  useAssignWorkerType,
  useTerminateWorkerTypeAssignment,
  usePreviewWorkerTypeUpgrade,
  useExecuteWorkerTypeUpgrade,
  // Types
  type PayStructureTemplate,
  type PayStructureComponent,
  type TieredRate,
  type WorkerPayStructure,
  type ComponentOverride,
  type TemplateInclusion,
  type ResolvedPayStructureTemplate,
  type UseWorkersForManagerOptions,
} from '@/features/payroll/hooks';

// HRIS feature hooks (migrated from legacy shared/hooks/nexus)
export * from '@/features/hris/hooks';

// Recruitment feature hooks
export * from '@/features/recruitment/hooks';

// Scheduling feature hooks
export * from '@/features/scheduling/hooks';

// TODO: Add re-exports for other features as they migrate hooks
// export * from '@/features/organization/hooks';
