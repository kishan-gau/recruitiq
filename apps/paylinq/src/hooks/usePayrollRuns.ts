/**
 * Payroll Runs Hooks
 * 
 * Custom React Query hooks for payroll run management and processing
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import type {
  PayrollRun,
  Paycheck,
  CreatePayrollRunRequest,
  UpdatePayrollRunRequest,
  CalculatePayrollRequest,
  ApprovePayrollRequest,
  ProcessPayrollRequest,
  PayrollRunFilters,
  PaycheckFilters,
  PaginationParams,
  PayrollSummary,
  PaycheckHistory,
  PayrollCalculationResult,
} from '@recruitiq/types';

// Query keys
const PAYROLL_RUNS_KEY = ['payrollRuns'];
const PAYCHECKS_KEY = ['paychecks'];

// ============================================================================
// Payroll Runs Queries
// ============================================================================

/**
 * Hook to fetch all payroll runs with filters
 */
export function usePayrollRuns(params?: PayrollRunFilters & PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAYROLL_RUNS_KEY, 'list', params],
    queryFn: async () => {
      const response = await paylinq.getPayrollRuns(params);
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch a single payroll run by ID
 */
export function usePayrollRun(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAYROLL_RUNS_KEY, id],
    queryFn: async () => {
      const response = await paylinq.getPayrollRun(id);
      return response.data;
    },
    enabled: !!id,
    refetchInterval: (data) => {
      // Auto-refetch if status is calculating or processing
      if (data?.status === 'calculating' || data?.status === 'processing') {
        return 5000; // 5 seconds
      }
      return false;
    },
  });
}

/**
 * Hook to fetch payroll run summary
 */
export function usePayrollRunSummary(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAYROLL_RUNS_KEY, id, 'summary'],
    queryFn: async () => {
      const response = await paylinq.getPayrollRunSummary(id);
      return response.data;
    },
    enabled: !!id,
  });
}

// ============================================================================
// Payroll Run Mutations
// ============================================================================

/**
 * Hook to create a new payroll run
 */
export function useCreatePayrollRun() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreatePayrollRunRequest) => {
      const response = await paylinq.createPayrollRun(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...PAYROLL_RUNS_KEY, 'list'] });
      success(`Payroll run "${data.runName}" created successfully`);
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to create payroll run');
    },
  });
}

/**
 * Hook to update a payroll run
 */
export function useUpdatePayrollRun() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePayrollRunRequest }) => {
      const response = await paylinq.updatePayrollRun(id, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...PAYROLL_RUNS_KEY, data.id] });
      queryClient.invalidateQueries({ queryKey: [...PAYROLL_RUNS_KEY, 'list'] });
      success(`Payroll run "${data.runName}" updated successfully`);
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to update payroll run');
    },
  });
}

/**
 * Hook to calculate payroll
 */
export function useCalculatePayroll() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CalculatePayrollRequest) => {
      const response = await paylinq.calculatePayroll(data);
      return response;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: [...PAYROLL_RUNS_KEY, variables.payrollRunId] });
      queryClient.invalidateQueries({ queryKey: PAYCHECKS_KEY });
      
      if (result.status === 'success') {
        success(`Payroll calculated successfully. ${result.paychecksCreated} paychecks created.`);
      } else if (result.status === 'partial') {
        error(`Payroll partially calculated. ${result.paychecksFailed} paychecks failed.`);
      }
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to calculate payroll');
    },
  });
}

/**
 * Hook to approve a payroll run
 */
export function useApprovePayrollRun() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: ApprovePayrollRequest) => {
      const response = await paylinq.approvePayrollRun(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...PAYROLL_RUNS_KEY, data.id] });
      queryClient.invalidateQueries({ queryKey: [...PAYROLL_RUNS_KEY, 'list'] });
      success(`Payroll run "${data.runName}" approved successfully`);
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to approve payroll run');
    },
  });
}

/**
 * Hook to process a payroll run
 */
export function useProcessPayrollRun() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: ProcessPayrollRequest) => {
      const response = await paylinq.processPayrollRun(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...PAYROLL_RUNS_KEY, data.id] });
      queryClient.invalidateQueries({ queryKey: [...PAYROLL_RUNS_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: PAYCHECKS_KEY });
      success(`Payroll run "${data.runName}" processed successfully`);
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to process payroll run');
    },
  });
}

/**
 * Hook to cancel a payroll run
 */
export function useCancelPayrollRun() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await paylinq.cancelPayrollRun(id);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...PAYROLL_RUNS_KEY, data.id] });
      queryClient.invalidateQueries({ queryKey: [...PAYROLL_RUNS_KEY, 'list'] });
      success('Payroll run cancelled successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to cancel payroll run');
    },
  });
}

// ============================================================================
// Paychecks Queries
// ============================================================================

/**
 * Hook to fetch paychecks with filters
 */
export function usePaychecks(params?: PaycheckFilters & PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAYCHECKS_KEY, 'list', params],
    queryFn: async () => {
      const response = await paylinq.getPaychecks(params);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch a single paycheck by ID
 */
export function usePaycheck(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAYCHECKS_KEY, id],
    queryFn: async () => {
      const response = await paylinq.getPaycheck(id);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch employee paychecks
 */
export function useEmployeePaychecks(employeeId: string, params?: PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAYCHECKS_KEY, 'employee', employeeId, params],
    queryFn: async () => {
      const response = await paylinq.getEmployeePaychecks(employeeId, params);
      return response.data;
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to fetch paycheck history for an employee
 */
export function usePaycheckHistory(employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAYCHECKS_KEY, 'employee', employeeId, 'history'],
    queryFn: async () => {
      const response = await paylinq.getPaycheckHistory(employeeId);
      return response.data;
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to fetch paycheck components breakdown
 */
export function usePaycheckComponents(paycheckId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAYCHECKS_KEY, paycheckId, 'components'],
    queryFn: async () => {
      const response = await paylinq.getPaycheckComponents(paycheckId);
      return response.data;
    },
    enabled: !!paycheckId,
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to fetch payroll runs by status
 */
export function usePayrollRunsByStatus(status: string, params?: PaginationParams) {
  return usePayrollRuns({ ...params, status });
}

/**
 * Hook to fetch draft payroll runs
 */
export function useDraftPayrollRuns(params?: PaginationParams) {
  return usePayrollRunsByStatus('draft', params);
}

/**
 * Hook to fetch approved payroll runs
 */
export function useApprovedPayrollRuns(params?: PaginationParams) {
  return usePayrollRunsByStatus('approved', params);
}

/**
 * Hook to fetch processed payroll runs
 */
export function useProcessedPayrollRuns(params?: PaginationParams) {
  return usePayrollRunsByStatus('processed', params);
}
