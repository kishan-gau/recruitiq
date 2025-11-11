/**
 * Deductions Hooks
 * 
 * Custom React Query hooks for employee deduction management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import type {
  EmployeeDeduction,
  CreateDeductionRequest,
  UpdateDeductionRequest,
  DeductionFilters,
  PaginationParams,
} from '@recruitiq/types';

// Query keys
const DEDUCTIONS_KEY = ['deductions'];

// ============================================================================
// Deductions Queries
// ============================================================================

/**
 * Hook to fetch all employee deductions with filters
 */
export function useDeductions(params?: DeductionFilters & PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...DEDUCTIONS_KEY, 'list', params],
    queryFn: async () => {
      const response = await paylinq.getDeductions(params);
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single deduction by ID
 */
export function useDeduction(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...DEDUCTIONS_KEY, id],
    queryFn: async () => {
      const response = await paylinq.getDeduction(id);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch deductions for a specific employee
 */
export function useEmployeeDeductions(employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...DEDUCTIONS_KEY, 'benefits', employeeId],
    queryFn: async () => {
      const response = await paylinq.getDeductions({ employeeId });
      return response.data || [];
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to fetch active deductions for an employee
 */
export function useActiveDeductions(employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...DEDUCTIONS_KEY, 'employee', employeeId, 'active'],
    queryFn: async () => {
      const response = await paylinq.getActiveDeductions(employeeId);
      return response.data || [];
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes - active deductions change less frequently
  });
}

/**
 * Hook to fetch deduction history for an employee
 * Note: Uses getEmployeeDeductions with status filter for historical data
 */
export function useDeductionHistory(employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...DEDUCTIONS_KEY, 'statutory', employeeId],
    queryFn: async () => {
      const response = await paylinq.getDeductions({ employeeId });
      return response.data || [];
    },
    enabled: !!employeeId,
  });
}

// ============================================================================
// Deductions Mutations
// ============================================================================

/**
 * Hook to create a new employee deduction
 */
export function useCreateDeduction() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreateDeductionRequest) => {
      const response = await paylinq.createDeduction(data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [...DEDUCTIONS_KEY, 'list'] });
        queryClient.invalidateQueries({ queryKey: [...DEDUCTIONS_KEY, 'employee', data.employeeId] });
        success(`${data.deductionType} deduction created successfully`);
      }
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to create deduction');
    },
  });
}

/**
 * Hook to update an employee deduction
 */
export function useUpdateDeduction() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDeductionRequest }) => {
      const response = await paylinq.updateDeduction(id, data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [...DEDUCTIONS_KEY, data.id] });
        queryClient.invalidateQueries({ queryKey: [...DEDUCTIONS_KEY, 'list'] });
        queryClient.invalidateQueries({ queryKey: [...DEDUCTIONS_KEY, 'employee', data.employeeId] });
        success(`${data.deductionType} deduction updated successfully`);
      }
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to update deduction');
    },
  });
}

/**
 * Hook to delete an employee deduction
 */
export function useDeleteDeduction() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await paylinq.deleteDeduction(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...DEDUCTIONS_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...DEDUCTIONS_KEY, 'employee'] });
      success('Deduction deleted successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to delete deduction');
    },
  });
}

/**
 * Hook to terminate an employee deduction
 * Note: Terminating is done by updating the deduction with an effectiveTo date
 */
export function useTerminateDeduction() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, endDate }: { id: string; endDate: string }) => {
      const response = await paylinq.updateDeduction(id, { effectiveTo: endDate });
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: [...DEDUCTIONS_KEY, data.id] });
        queryClient.invalidateQueries({ queryKey: [...DEDUCTIONS_KEY, 'list'] });
        queryClient.invalidateQueries({ queryKey: [...DEDUCTIONS_KEY, 'employee', data.employeeId] });
      }
      success('Deduction terminated successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to terminate deduction');
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to fetch deductions by type
 */
export function useDeductionsByType(deductionType: string, params?: PaginationParams) {
  return useDeductions({ ...params, deductionType: deductionType as any });
}

/**
 * Hook to check if employee has active deductions
 */
export function useHasActiveDeductions(employeeId: string) {
  const { data, isLoading } = useActiveDeductions(employeeId);
  return {
    hasActiveDeductions: data && data.length > 0,
    count: data?.length || 0,
    isLoading,
  };
}

/**
 * Hook to fetch benefit deductions (health insurance, retirement, etc.)
 */
export function useBenefitDeductions(employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...DEDUCTIONS_KEY, 'employee', employeeId, 'benefits'],
    queryFn: async () => {
      const response = await paylinq.getDeductions({ employeeId });
      // Filter for benefit types
      const benefitTypes = [
        'health_insurance',
        'dental_insurance',
        'vision_insurance',
        'retirement_401k',
        'retirement_pension',
      ];
      return (response.data || []).filter((d: EmployeeDeduction) => 
        benefitTypes.includes(d.deductionType)
      );
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to fetch statutory deductions (taxes, wage garnishments)
 */
export function useStatutoryDeductions(employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...DEDUCTIONS_KEY, 'employee', employeeId, 'statutory'],
    queryFn: async () => {
      const response = await paylinq.getDeductions({ employeeId });
      // Filter for statutory types
      const statutoryTypes = [
        'wage_garnishment',
        'child_support',
        'tax_levy',
      ];
      return (response.data || []).filter((d: EmployeeDeduction) => 
        statutoryTypes.includes(d.deductionType)
      );
    },
    enabled: !!employeeId,
  });
}
