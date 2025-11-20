/**
 * Compensation Hooks
 * 
 * Custom React Query hooks for employee compensation management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import type {
  CreateCompensationRequest,
  UpdateCompensationRequest,
  CompensationFilters,
  PaginationParams,
} from '@recruitiq/types';

// Query keys
const COMPENSATION_KEY = ['compensation'];

// ============================================================================
// Compensation Queries
// ============================================================================

/**
 * Hook to fetch compensation records with filters
 */
export function useCompensation(params?: CompensationFilters & PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...COMPENSATION_KEY, 'list', params],
    queryFn: async () => {
      const response = await paylinq.getCompensation(params);
      return response.data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch a single compensation record by ID
 */
export function useCompensationById(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...COMPENSATION_KEY, id],
    queryFn: async () => {
      const response = await paylinq.getCompensationById(id);
      return response.data || null;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch all compensation records for an employee
 */
export function useEmployeeCompensation(employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...COMPENSATION_KEY, 'active', employeeId],
    queryFn: async () => {
      const response = await paylinq.getEmployeeCompensation(employeeId);
      return response.data || [];
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to fetch current compensation for an employee
 */
export function useCurrentCompensation(employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...COMPENSATION_KEY, 'employee', employeeId, 'current'],
    queryFn: async () => {
      const response = await paylinq.getCurrentCompensation(employeeId);
      return response.data || null;
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes - current compensation doesn't change often
  });
}

/**
 * Hook to fetch compensation history for an employee
 */
export function useCompensationHistory(employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...COMPENSATION_KEY, 'employee', employeeId, 'history'],
    queryFn: async () => {
      const response = await paylinq.getCompensationHistory(employeeId);
      return response.data || [];
    },
    enabled: !!employeeId,
  });
}

/**
 * Hook to fetch compensation summary for an employee
 */
export function useCompensationSummary(employeeId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...COMPENSATION_KEY, 'summary', employeeId],
    queryFn: async () => {
      const response = await paylinq.getCompensationSummary(employeeId);
      return response.data || null;
    },
    enabled: !!employeeId,
  });
}

// ============================================================================
// Compensation Mutations
// ============================================================================

/**
 * Hook to create a new compensation record
 */
export function useCreateCompensation() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreateCompensationRequest) => {
      const response = await paylinq.createCompensation(data);
      return response.data;
    },
    onSuccess: (data: any) => {
      // Invalidate all compensation queries for this employee
      queryClient.invalidateQueries({ 
        queryKey: [...COMPENSATION_KEY, 'employee', data.employeeId] 
      });
      queryClient.invalidateQueries({ queryKey: [...COMPENSATION_KEY, 'list'] });
      success('Compensation record created successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to create compensation record');
    },
  });
}

/**
 * Hook to update a compensation record
 */
export function useUpdateCompensation() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCompensationRequest }) => {
      const response = await paylinq.updateCompensation(id, data);
      return response.data;
    },
    onSuccess: (data: any) => {
      // Invalidate specific compensation record
      queryClient.invalidateQueries({ queryKey: [...COMPENSATION_KEY, data.id] });
      // Invalidate employee compensation queries
      queryClient.invalidateQueries({ 
        queryKey: [...COMPENSATION_KEY, 'employee', data.employeeId] 
      });
      success('Compensation record updated successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to update compensation record');
    },
  });
}

/**
 * Hook to delete a compensation record
 */
export function useDeleteCompensation() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await paylinq.deleteCompensation(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPENSATION_KEY });
      success('Compensation record deleted successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to delete compensation record');
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to fetch hourly compensation records
 */
export function useHourlyCompensation(params?: PaginationParams) {
  return useCompensation({ 
    ...params, 
    compensationType: 'hourly' 
  });
}

/**
 * Hook to fetch salary compensation records
 */
export function useSalaryCompensation(params?: PaginationParams) {
  return useCompensation({ 
    ...params, 
    compensationType: 'salary' 
  });
}

/**
 * Hook to check if employee has current compensation
 */
export function useHasCurrentCompensation(employeeId: string) {
  const { data, isLoading } = useCurrentCompensation(employeeId);
  
  return {
    hasCompensation: !!data,
    isLoading,
    compensation: data,
  };
}
