/**
 * Formulas & Pay Components Hooks
 * 
 * Custom React Query hooks for pay component formulas and calculations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import type {
  PayComponentFormula,
  FormulaVariable,
  CreateFormulaRequest,
  UpdateFormulaRequest,
  TestFormulaRequest,
  FormulaFilters,
  PaginationParams,
} from '@recruitiq/types';

// Query keys
const FORMULAS_KEY = ['formulas'];
const FORMULA_VARIABLES_KEY = ['formulaVariables'];

// ============================================================================
// Pay Component Formulas Queries
// ============================================================================

/**
 * Hook to fetch all pay component formulas
 */
export function useFormulas(params?: FormulaFilters & PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...FORMULAS_KEY, 'list', params],
    queryFn: async () => {
      const response = await paylinq.getFormulas(params);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single formula by ID
 */
export function useFormula(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...FORMULAS_KEY, id],
    queryFn: async () => {
      const response = await paylinq.getFormula(id);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch formulas by pay component
 */
export function usePayComponentFormulas(payComponentId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...FORMULAS_KEY, 'pay-component', payComponentId],
    queryFn: async () => {
      const response = await paylinq.getPayComponentFormulas(payComponentId);
      return response.data;
    },
    enabled: !!payComponentId,
  });
}

/**
 * Hook to fetch active formulas
 */
export function useActiveFormulas(params?: PaginationParams) {
  return useFormulas({ ...params, isActive: true });
}

// ============================================================================
// Pay Component Formulas Mutations
// ============================================================================

/**
 * Hook to create a new formula
 */
export function useCreateFormula() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreateFormulaRequest) => {
      const response = await paylinq.createFormula(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...FORMULAS_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...FORMULAS_KEY, 'pay-component', data.payComponentId] });
      success(`Formula "${data.name}" created successfully`);
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to create formula');
    },
  });
}

/**
 * Hook to update a formula
 */
export function useUpdateFormula() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFormulaRequest }) => {
      const response = await paylinq.updateFormula(id, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...FORMULAS_KEY, data.id] });
      queryClient.invalidateQueries({ queryKey: [...FORMULAS_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...FORMULAS_KEY, 'pay-component', data.payComponentId] });
      success(`Formula "${data.name}" updated successfully`);
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to update formula');
    },
  });
}

/**
 * Hook to delete a formula
 */
export function useDeleteFormula() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await paylinq.deleteFormula(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...FORMULAS_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...FORMULAS_KEY, 'pay-component'] });
      success('Formula deleted successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to delete formula');
    },
  });
}

/**
 * Hook to test a formula with sample data
 */
export function useTestFormula() {
  const { paylinq } = usePaylinqAPI();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: TestFormulaRequest) => {
      const response = await paylinq.testFormula(data);
      return response;
    },
    onSuccess: (result) => {
      if (result.success) {
        success(`Formula test passed. Result: ${result.calculatedValue}`);
      } else {
        error(`Formula test failed: ${result.error}`);
      }
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to test formula');
    },
  });
}

/**
 * Hook to activate a formula
 */
export function useActivateFormula() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await paylinq.activateFormula(id);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...FORMULAS_KEY, data.id] });
      queryClient.invalidateQueries({ queryKey: [...FORMULAS_KEY, 'list'] });
      success(`Formula "${data.name}" activated successfully`);
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to activate formula');
    },
  });
}

/**
 * Hook to deactivate a formula
 */
export function useDeactivateFormula() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await paylinq.deactivateFormula(id);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...FORMULAS_KEY, data.id] });
      queryClient.invalidateQueries({ queryKey: [...FORMULAS_KEY, 'list'] });
      success(`Formula "${data.name}" deactivated successfully`);
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to deactivate formula');
    },
  });
}

// ============================================================================
// Formula Variables Queries
// ============================================================================

/**
 * Hook to fetch available formula variables
 */
export function useFormulaVariables() {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: FORMULA_VARIABLES_KEY,
    queryFn: async () => {
      const response = await paylinq.getFormulaVariables();
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - variables change rarely
  });
}

/**
 * Hook to fetch variables for a specific context
 */
export function useFormulaVariablesByContext(context: string) {
  const { data: allVariables, ...query } = useFormulaVariables();
  
  const filteredVariables = allVariables?.filter(
    (v: FormulaVariable) => v.context === context
  );

  return {
    ...query,
    data: filteredVariables,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to validate formula syntax
 */
export function useValidateFormula() {
  const { paylinq } = usePaylinqAPI();
  const { error } = useToast();

  return useMutation({
    mutationFn: async (expression: string) => {
      const response = await paylinq.validateFormula(expression);
      return response;
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to validate formula');
    },
  });
}

/**
 * Hook to fetch formula execution history
 */
export function useFormulaExecutionHistory(formulaId: string, params?: PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...FORMULAS_KEY, formulaId, 'execution-history', params],
    queryFn: async () => {
      const response = await paylinq.getFormulaExecutionHistory(formulaId, params);
      return response.data;
    },
    enabled: !!formulaId,
  });
}

/**
 * Hook to get formula dependencies
 */
export function useFormulaDependencies(formulaId: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...FORMULAS_KEY, formulaId, 'dependencies'],
    queryFn: async () => {
      const response = await paylinq.getFormulaDependencies(formulaId);
      return response.data;
    },
    enabled: !!formulaId,
  });
}

/**
 * Hook to check if formula can be deleted safely
 */
export function useCanDeleteFormula(formulaId: string) {
  const { data: dependencies, isLoading } = useFormulaDependencies(formulaId);
  
  return {
    canDelete: dependencies && dependencies.length === 0,
    dependencyCount: dependencies?.length || 0,
    isLoading,
  };
}
