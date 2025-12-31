// Payroll Module Hooks
export * from './useCompensation';
export * from './useDeductions';
export * from './useTax';
export * from './usePayrollRuns';
export * from './useWorkers';
export * from './useDepartments';
export * from './useLocations';
export * from './usePayments';
export * from './useTemplateVersions';
export * from './useCurrency';

// Migrated from legacy shared/hooks/paylinq
// API hook
export { usePaylinqAPI, paylinqAPI, authAPI } from './usePaylinqAPI';

// Pay structure hooks
export { usePayStructureTemplates } from './usePayStructures';
export { usePayStructureTemplate } from './usePayStructures';
export { useCreatePayStructureTemplate } from './usePayStructures';
export { useUpdatePayStructureTemplate } from './usePayStructures';
export { usePublishPayStructureTemplate } from './usePayStructures';
export { useDeprecatePayStructureTemplate } from './usePayStructures';
export { useDeletePayStructureTemplate } from './usePayStructures';
export { useCreatePayStructureTemplateVersion } from './usePayStructures';
export { usePayStructureTemplateVersions } from './usePayStructures';
export { usePayStructureTemplateChangelog } from './usePayStructures';
export { usePayStructureComponents } from './usePayStructures';
export { useAddPayStructureComponent } from './usePayStructures';
export { useUpdatePayStructureComponent } from './usePayStructures';
export { useDeletePayStructureComponent } from './usePayStructures';
export { useReorderPayStructureComponents } from './usePayStructures';
export { useCurrentWorkerPayStructure } from './usePayStructures';
export { useWorkerPayStructureHistory } from './usePayStructures';
export { useAssignPayStructureToWorker } from './usePayStructures';
export { useUpgradeWorkerPayStructure } from './usePayStructures';
export { usePayStructureOverrides } from './usePayStructures';
export { useAddPayStructureOverride } from './usePayStructures';
export { useUpdatePayStructureOverride } from './usePayStructures';
export { useDeletePayStructureOverride } from './usePayStructures';
export { useTemplateInclusions } from './usePayStructures';
export { useResolvedPayStructureTemplate } from './usePayStructures';
export { useAddTemplateInclusion } from './usePayStructures';
export { useUpdateTemplateInclusion } from './usePayStructures';
export { useDeleteTemplateInclusion } from './usePayStructures';
export { useWorkersForManager } from './useWorkersForManager';

// Phase 2A - Pay Components
export * from './usePayComponents';

// Phase 2A - Employee Components
export * from './useEmployeeComponents';

// Phase 2A - Worker Types
export * from './useWorkerTypes';

// Types
export type { PayStructureTemplate } from './usePayStructures';
export type { PayStructureComponent } from './usePayStructures';
export type { TieredRate } from './usePayStructures';
export type { WorkerPayStructure } from './usePayStructures';
export type { ComponentOverride } from './usePayStructures';
export type { TemplateInclusion } from './usePayStructures';
export type { ResolvedPayStructureTemplate } from './usePayStructures';
export type { UseWorkersForManagerOptions } from './useWorkersForManager';
export type { ExchangeRate } from './useCurrency';
export type { ForfaitRule, ForfaitRuleTemplate } from '@recruitiq/api-client';
