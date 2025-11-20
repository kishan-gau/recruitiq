/**
 * Paylinq Hooks Export
 * 
 * Central export for all Paylinq React Query hooks
 */

// API Client
export { usePaylinqAPI } from './usePaylinqAPI';

// Worker Types & Assignments
export {
  useWorkerTypeTemplates,
  useWorkerTypeTemplate,
  useCreateWorkerTypeTemplate,
  useUpdateWorkerTypeTemplate,
  useDeleteWorkerTypeTemplate,
  useEmployeeWorkerTypes,
  useCurrentWorkerType,
  useWorkerTypeHistory,
  useAssignWorkerType,
  useUpdateWorkerTypeAssignment,
  useTerminateWorkerTypeAssignment,
  useActiveWorkerTypeTemplates,
} from './useWorkerTypes';

// Compensation
export {
  useCompensation,
  useCompensationById,
  useEmployeeCompensation,
  useCurrentCompensation,
  useCompensationHistory,
  useCompensationSummary,
  useCreateCompensation,
  useUpdateCompensation,
  useDeleteCompensation,
  useHourlyCompensation,
  useSalaryCompensation,
  useHasCurrentCompensation,
} from './useCompensation';

// Deductions
export {
  useDeductions,
  useDeduction,
  useEmployeeDeductions,
  useActiveDeductions,
  useDeductionHistory,
  useCreateDeduction,
  useUpdateDeduction,
  useDeleteDeduction,
  useTerminateDeduction,
  useDeductionsByType,
  useHasActiveDeductions,
  useBenefitDeductions,
  useStatutoryDeductions,
} from './useDeductions';

// Timesheets & Time Entries
export {
  useTimeEntries,
  useTimeEntry,
  useEmployeeTimeEntries,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  useTimesheets,
  useTimesheet,
  useEmployeeTimesheets,
  useCreateTimesheet,
  useUpdateTimesheet,
  useSubmitTimesheet,
  useApproveTimesheet,
  useShiftTypes,
  useShiftType,
  useCreateShiftType,
  useUpdateShiftType,
  useDeleteShiftType,
  useAttendanceEvents,
  useCreateAttendanceEvent,
  usePendingTimesheets,
  useApprovedTimesheets,
  useHasPendingTimesheets,
} from './useTimesheets';

// Formulas & Pay Components
export {
  useFormulas,
  useFormula,
  usePayComponentFormulas,
  useActiveFormulas,
  useCreateFormula,
  useUpdateFormula,
  useDeleteFormula,
  useTestFormula,
  useActivateFormula,
  useDeactivateFormula,
  useFormulaVariables,
  useFormulaVariablesByContext,
  useValidateFormula,
  useFormulaExecutionHistory,
  useFormulaDependencies,
  useCanDeleteFormula,
} from './useFormulas';

// Payroll Runs & Paychecks
export {
  usePayrollRuns,
  usePayrollRun,
  usePayrollRunSummary,
  useCreatePayrollRun,
  useUpdatePayrollRun,
  useCalculatePayroll,
  useApprovePayrollRun,
  useProcessPayrollRun,
  useCancelPayrollRun,
  usePaychecks,
  usePaycheck,
  useEmployeePaychecks,
  usePaycheckHistory,
  usePaycheckComponents,
  usePayrollRunsByStatus,
  useDraftPayrollRuns,
  useApprovedPayrollRuns,
  useProcessedPayrollRuns,
} from './usePayrollRuns';

// Payments & Reconciliation
export {
  usePayments,
  usePayment,
  usePayrollRunPayments,
  useEmployeePayments,
  useCreatePayment,
  useUpdatePayment,
  useCancelPayment,
  useRetryPayment,
  useReconciliations,
  useReconciliation,
  useUnreconciledPayments,
  useReconcilePayment,
  useBulkReconcilePayments,
  useVoidReconciliation,
  useCreateReconciliation,
  useUpdateReconciliation,
  useDeleteReconciliation,
  useAddReconciliationItem,
  useUpdateReconciliationItem,
  usePaymentStatusSummary,
  useReconciliationStatus,
  useFailedPayments,
  usePendingPayments,
  useHasUnreconciledPayments,
} from './usePayments';

// Reports & Analytics
export {
  usePayrollSummaryReport,
  usePayrollSummaryByPeriod,
  useEmployeePayReport,
  useEmployeePayDetails,
  useDeductionReport,
  useDeductionsByType as useDeductionReportByType,
  useTaxReport,
  useQuarterlyTaxReport,
  useYearEndTaxReport,
  useCompensationReport,
  useCompensationByWorkerType,
  useTimesheetReport,
  useAttendanceReport,
  usePaycheckReport,
  useAuditLogs,
  useEntityAuditLogs,
  useExportReport,
  useExportPayrollSummary,
  useExportEmployeePayReport,
  useExportTaxReport,
  useCurrentPayPeriodSummary,
  useYearToDateSummary,
  usePendingApprovals,
} from './useReports';

// Settings & Configuration
export {
  useSettings,
  usePayPeriodConfig,
  useTaxConfig,
  useUpdateSettings,
  useUpdatePayPeriodConfig,
  useUpdateTaxConfig,
  useIsPaylinqConfigured,
  useCurrentPayPeriod,
  useNextPayPeriod,
} from './useSettings';

// Pay Components (existing)
export {
  usePayComponents,
  usePayComponent,
  useCreatePayComponent,
  useUpdatePayComponent,
  useDeletePayComponent,
} from './usePayComponents';

// Workers
export {
  useWorkers,
} from './useWorkers';

// Template Versioning
export {
  useTemplateVersions,
} from './useTemplateVersions';

export {
  useCompareVersions,
} from './useCompareVersions';

