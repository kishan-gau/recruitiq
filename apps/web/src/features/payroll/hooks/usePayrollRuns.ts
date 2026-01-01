import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { payrollRunsService } from '../services/payroll-runs.service';
import { usePaylinqAPI } from './usePaylinqAPI';

/**
 * Hook for fetching payroll runs list
 */
export function usePayrollRuns(filters?: any) {
  return useQuery({
    queryKey: ['payrollRuns', filters],
    queryFn: () => payrollRunsService.getPayrollRuns(filters),
  });
}

/**
 * Hook for fetching a single payroll run
 */
export function usePayrollRun(id?: string) {
  return useQuery({
    queryKey: ['payrollRuns', id],
    queryFn: () => payrollRunsService.getPayrollRun(id!),
    enabled: !!id,
  });
}

/**
 * Hook for creating a payroll run
 */
export function useCreatePayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: payrollRunsService.createPayrollRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
    },
  });
}

/**
 * Hook for updating a payroll run
 */
export function useUpdatePayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      payrollRunsService.updatePayrollRun(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns', id] });
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
    },
  });
}

/**
 * Hook for executing a payroll run
 */
export function useExecutePayrollRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: payrollRunsService.processPayrollRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
    },
  });
}

/**
 * Hook for calculating a payroll run
 */
export function useCalculatePayroll() {
  const queryClient = useQueryClient();
  const { paylinq } = usePaylinqAPI();

  return useMutation({
    mutationFn: async ({ payrollRunId, ...options }: { payrollRunId: string; employeeIds?: string[]; includeTimesheets?: boolean; includeDeductions?: boolean; includeTaxes?: boolean }) => {
      return await paylinq.calculatePayroll({ payrollRunId, ...options });
    },
    onSuccess: (_, { payrollRunId }) => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      queryClient.invalidateQueries({ queryKey: ['payrollRuns', payrollRunId] });
    },
  });
}

/**
 * Hook for approving a payroll run
 */
export function useApprovePayroll() {
  const queryClient = useQueryClient();
  const { paylinq } = usePaylinqAPI();

  return useMutation({
    mutationFn: async ({ payrollRunId, approvalNotes }: { payrollRunId: string; approvalNotes?: string }) => {
      return await paylinq.approvePayrollRun({ payrollRunId, approvalNotes });
    },
    onSuccess: (_, { payrollRunId }) => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      queryClient.invalidateQueries({ queryKey: ['payrollRuns', payrollRunId] });
    },
  });
}

/**
 * Hook for processing a payroll run  
 */
export function useProcessPayroll() {
  const queryClient = useQueryClient();
  const { paylinq } = usePaylinqAPI();

  return useMutation({
    mutationFn: async ({ payrollRunId, paymentDate }: { payrollRunId: string; paymentDate?: string }) => {
      return await paylinq.processPayrollRun({ payrollRunId, paymentDate });
    },
    onSuccess: (_, { payrollRunId }) => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      queryClient.invalidateQueries({ queryKey: ['payrollRuns', payrollRunId] });
    },
  });
}
