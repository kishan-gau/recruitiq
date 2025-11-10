/**
 * Reports Hooks
 * 
 * Custom React Query hooks for payroll reports and analytics
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import type {
  PayrollSummaryReport,
  EmployeePayReport,
  DeductionReport,
  TaxReport,
  CompensationReport,
  TimesheetReport,
  PaycheckReport,
  AuditLog,
  ReportFilters,
  PaginationParams,
  ExportFormat,
} from '@recruitiq/types';

// Query keys
const REPORTS_KEY = ['reports'];
const AUDIT_LOGS_KEY = ['auditLogs'];
const EXPORTS_KEY = ['exports'];

// ============================================================================
// Payroll Summary Reports
// ============================================================================

/**
 * Hook to fetch payroll summary report
 */
export function usePayrollSummaryReport(filters?: ReportFilters) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...REPORTS_KEY, 'payroll-summary', filters],
    queryFn: async () => {
      const response = await paylinq.getPayrollSummaryReport(filters);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch payroll summary by period
 */
export function usePayrollSummaryByPeriod(startDate: string, endDate: string) {
  return usePayrollSummaryReport({ startDate, endDate });
}

// ============================================================================
// Employee Pay Reports
// ============================================================================

/**
 * Hook to fetch employee pay report
 */
export function useEmployeePayReport(filters?: ReportFilters) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...REPORTS_KEY, 'employee-pay', filters],
    queryFn: async () => {
      const response = await paylinq.getEmployeePayReport(filters);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch pay report for a specific employee
 */
export function useEmployeePayDetails(employeeId: string, filters?: ReportFilters) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...REPORTS_KEY, 'employee-pay', employeeId, filters],
    queryFn: async () => {
      const response = await paylinq.getEmployeePayReport({ 
        ...filters, 
        employeeId 
      });
      return response.data;
    },
    enabled: !!employeeId,
  });
}

// ============================================================================
// Deduction Reports
// ============================================================================

/**
 * Hook to fetch deduction summary report
 */
export function useDeductionReport(filters?: ReportFilters) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...REPORTS_KEY, 'deductions', filters],
    queryFn: async () => {
      const response = await paylinq.getDeductionReport(filters);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch deductions by type
 */
export function useDeductionsByType(deductionType: string, filters?: ReportFilters) {
  return useDeductionReport({ ...filters, deductionType });
}

// ============================================================================
// Tax Reports
// ============================================================================

/**
 * Hook to fetch tax summary report
 */
export function useTaxReport(filters?: ReportFilters) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...REPORTS_KEY, 'taxes', filters],
    queryFn: async () => {
      const response = await paylinq.getTaxReport(filters);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch quarterly tax report
 */
export function useQuarterlyTaxReport(year: number, quarter: number) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...REPORTS_KEY, 'taxes', 'quarterly', year, quarter],
    queryFn: async () => {
      const response = await paylinq.getQuarterlyTaxReport(year, quarter);
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - historical data
  });
}

/**
 * Hook to fetch year-end tax report
 */
export function useYearEndTaxReport(year: number) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...REPORTS_KEY, 'taxes', 'year-end', year],
    queryFn: async () => {
      const response = await paylinq.getYearEndTaxReport(year);
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - historical data
  });
}

// ============================================================================
// Compensation Reports
// ============================================================================

/**
 * Hook to fetch compensation analysis report
 */
export function useCompensationReport(filters?: ReportFilters) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...REPORTS_KEY, 'compensation', filters],
    queryFn: async () => {
      const response = await paylinq.getCompensationReport(filters);
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch compensation comparison by worker type
 */
export function useCompensationByWorkerType(workerTypeTemplateId: string) {
  return useCompensationReport({ workerTypeTemplateId });
}

// ============================================================================
// Timesheet Reports
// ============================================================================

/**
 * Hook to fetch timesheet summary report
 */
export function useTimesheetReport(filters?: ReportFilters) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...REPORTS_KEY, 'timesheets', filters],
    queryFn: async () => {
      const response = await paylinq.getTimesheetReport(filters);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch attendance summary
 */
export function useAttendanceReport(filters?: ReportFilters) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...REPORTS_KEY, 'attendance', filters],
    queryFn: async () => {
      const response = await paylinq.getAttendanceReport(filters);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Paycheck Reports
// ============================================================================

/**
 * Hook to fetch paycheck register report
 */
export function usePaycheckReport(filters?: ReportFilters) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...REPORTS_KEY, 'paychecks', filters],
    queryFn: async () => {
      const response = await paylinq.getPaycheckReport(filters);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Audit Logs
// ============================================================================

/**
 * Hook to fetch audit logs
 */
export function useAuditLogs(params?: PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...AUDIT_LOGS_KEY, 'list', params],
    queryFn: async () => {
      const response = await paylinq.getAuditLogs(params);
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch audit logs for a specific entity
 */
export function useEntityAuditLogs(entityType: string, entityId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...AUDIT_LOGS_KEY, entityType, entityId],
    queryFn: async () => {
      const response = await paylinq.getEntityAuditLogs(entityType, entityId);
      return response.data;
    },
    enabled: !!entityType && !!entityId,
  });
}

// ============================================================================
// Export Mutations
// ============================================================================

/**
 * Hook to export a report
 */
export function useExportReport() {
  const { paylinq } = usePaylinqAPI();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ 
      reportType, 
      format, 
      filters 
    }: { 
      reportType: string; 
      format: ExportFormat; 
      filters?: ReportFilters;
    }) => {
      const response = await paylinq.exportReport(reportType, format, filters);
      return response;
    },
    onSuccess: (data, variables) => {
      success(`Report exported successfully as ${variables.format.toUpperCase()}`);
      
      // Trigger download
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to export report');
    },
  });
}

/**
 * Hook to export payroll summary
 */
export function useExportPayrollSummary() {
  const exportReport = useExportReport();
  
  return {
    ...exportReport,
    exportAs: (format: ExportFormat, filters?: ReportFilters) => 
      exportReport.mutate({ reportType: 'payroll-summary', format, filters }),
  };
}

/**
 * Hook to export employee pay report
 */
export function useExportEmployeePayReport() {
  const exportReport = useExportReport();
  
  return {
    ...exportReport,
    exportAs: (format: ExportFormat, filters?: ReportFilters) => 
      exportReport.mutate({ reportType: 'employee-pay', format, filters }),
  };
}

/**
 * Hook to export tax report
 */
export function useExportTaxReport() {
  const exportReport = useExportReport();
  
  return {
    ...exportReport,
    exportAs: (format: ExportFormat, filters?: ReportFilters) => 
      exportReport.mutate({ reportType: 'tax-summary', format, filters }),
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to fetch current pay period summary
 */
export function useCurrentPayPeriodSummary() {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...REPORTS_KEY, 'current-period'],
    queryFn: async () => {
      const response = await paylinq.getCurrentPayPeriodSummary();
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch year-to-date summary
 */
export function useYearToDateSummary() {
  const year = new Date().getFullYear();
  const startDate = `${year}-01-01`;
  const endDate = new Date().toISOString().split('T')[0];
  
  return usePayrollSummaryReport({ startDate, endDate });
}

/**
 * Hook to check for pending approvals (timesheets, payroll runs)
 */
export function usePendingApprovals() {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...REPORTS_KEY, 'pending-approvals'],
    queryFn: async () => {
      const response = await paylinq.getPendingApprovals();
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute - check frequently
  });
}
