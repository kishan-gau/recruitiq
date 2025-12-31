import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { payrollRunsService } from '../services/payroll-runs.service';

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

  return useMutation({
    mutationFn: async (id: string) => {
      // TODO: Implement calculate payroll API endpoint
      throw new Error('Calculate payroll not yet implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
    },
  });
}

/**
 * Hook for approving a payroll run
 */
export function useApprovePayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // TODO: Implement approve payroll API endpoint
      throw new Error('Approve payroll not yet implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
    },
  });
}

/**
 * Hook for processing a payroll run  
 */
export function useProcessPayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // TODO: Implement process payroll API endpoint
      throw new Error('Process payroll not yet implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
    },
  });
}
