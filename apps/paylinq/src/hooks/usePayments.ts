/**
 * Payments & Reconciliation Hooks
 * 
 * Custom React Query hooks for payment processing and reconciliation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaylinqAPI } from './usePaylinqAPI';
import { useToast } from '@/contexts/ToastContext';
import type {
  CreatePaymentTransactionRequest,
  UpdatePaymentTransactionRequest,
  PaymentTransactionFilters,
  ReconciliationFilters,
  PaginationParams,
} from '@recruitiq/types';

// Query keys
const PAYMENTS_KEY = ['payments'];
const RECONCILIATION_KEY = ['reconciliation'];

// ============================================================================
// Payments Queries
// ============================================================================

/**
 * Hook to fetch payment transactions with filters
 */
export function usePayments(params?: PaymentTransactionFilters & PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAYMENTS_KEY, 'list', params],
    queryFn: async () => {
      const response = await paylinq.getPaymentTransactions(params);
      return response.paymentTransactions || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch a single payment by ID
 */
export function usePayment(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAYMENTS_KEY, id],
    queryFn: async () => {
      const response = await paylinq.getPaymentTransaction(id);
      return response.paymentTransaction;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Auto-refetch if status is pending or processing
      if (query.state.data?.paymentStatus === 'pending' || query.state.data?.paymentStatus === 'processing') {
        return 5000; // 5 seconds
      }
      return false;
    },
  });
}

/**
 * Hook to fetch payments for a specific payroll run
 */
export function usePayrollRunPayments(payrollRunId: string, params?: PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAYMENTS_KEY, 'payroll-run', payrollRunId, params],
    queryFn: async () => {
      const response = await paylinq.getPaymentTransactions({ ...params, payrollRunId });
      return response.paymentTransactions || [];
    },
    enabled: !!payrollRunId,
  });
}

/**
 * Hook to fetch payments for an employee
 */
export function useEmployeePayments(employeeId: string, params?: PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAYMENTS_KEY, 'employee', employeeId, params],
    queryFn: async () => {
      const response = await paylinq.getPaymentTransactions({ ...params, employeeId });
      return response.paymentTransactions || [];
    },
    enabled: !!employeeId,
  });
}

// ============================================================================
// Payments Mutations
// ============================================================================

/**
 * Hook to create a payment transaction
 */
export function useCreatePayment() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: CreatePaymentTransactionRequest) => {
      const response = await paylinq.createPaymentTransaction(data);
      return response.paymentTransaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...PAYMENTS_KEY, 'list'] });
      if (data?.payrollRunId) {
        queryClient.invalidateQueries({ queryKey: [...PAYMENTS_KEY, 'payroll-run', data.payrollRunId] });
      }
      success('Payment created successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to create payment');
    },
  });
}

/**
 * Hook to update a payment transaction
 */
export function useUpdatePayment() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePaymentTransactionRequest }) => {
      const response = await paylinq.updatePaymentTransaction(id, data);
      return response.paymentTransaction;
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: [...PAYMENTS_KEY, data.id] });
      }
      queryClient.invalidateQueries({ queryKey: [...PAYMENTS_KEY, 'list'] });
      success('Payment updated successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to update payment');
    },
  });
}

/**
 * Hook to cancel a payment
 */
export function useCancelPayment() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await paylinq.updatePaymentTransaction(id, { paymentStatus: 'cancelled' });
      return response.paymentTransaction;
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: [...PAYMENTS_KEY, data.id] });
      }
      queryClient.invalidateQueries({ queryKey: [...PAYMENTS_KEY, 'list'] });
      success('Payment cancelled successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to cancel payment');
    },
  });
}

/**
 * Hook to retry a failed payment
 */
export function useRetryPayment() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await paylinq.retryPayment({ transactionId: id });
      return response.paymentTransaction;
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: [...PAYMENTS_KEY, data.id] });
      }
      queryClient.invalidateQueries({ queryKey: [...PAYMENTS_KEY, 'list'] });
      success('Payment retry initiated');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to retry payment');
    },
  });
}

// ============================================================================
// Reconciliation Queries
// ============================================================================

/**
 * Hook to fetch reconciliation records
 */
export function useReconciliations(params?: ReconciliationFilters & PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...RECONCILIATION_KEY, 'list', params],
    queryFn: async () => {
      try {
        const response = await paylinq.getReconciliations(params);
        return {
          reconciliations: response.reconciliations || [],
          count: response.count || 0,
        };
      } catch (error) {
        console.error('Error fetching reconciliations:', error);
        return { reconciliations: [], count: 0 };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single reconciliation record by ID
 */
export function useReconciliation(id: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...RECONCILIATION_KEY, id],
    queryFn: async () => {
      const response = await paylinq.getReconciliation(id);
      return response.reconciliation || null;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch unreconciled payments
 */
export function useUnreconciledPayments(params?: PaginationParams) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAYMENTS_KEY, 'unreconciled', params],
    queryFn: async () => {
      const response = await paylinq.getPaymentTransactions({ ...params, paymentStatus: 'processed' });
      return response.paymentTransactions || [];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// ============================================================================
// Reconciliation Mutations
// ============================================================================

/**
 * Hook to reconcile a payment
 */
export function useReconcilePayment() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: { transactionId: string; reconciliationId: string }) => {
      const response = await paylinq.updatePaymentTransaction(data.transactionId, { 
        paymentStatus: 'reconciled'
      });
      return response.paymentTransaction;
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: [...PAYMENTS_KEY, data.id] });
      }
      queryClient.invalidateQueries({ queryKey: [...RECONCILIATION_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...PAYMENTS_KEY, 'unreconciled'] });
      success('Payment reconciled successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to reconcile payment');
    },
  });
}

/**
 * Hook to bulk reconcile payments
 */
export function useBulkReconcilePayments() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (paymentIds: string[]) => {
      const response = await paylinq.bulkProcessPayments(paymentIds);
      return response;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: RECONCILIATION_KEY });
      
      if (result.successCount > 0) {
        success(`Successfully reconciled ${result.successCount} payment(s)`);
      }
      if (result.failureCount > 0) {
        error(`Failed to reconcile ${result.failureCount} payment(s)`);
      }
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to reconcile payments');
    },
  });
}

/**
 * Hook to void a reconciliation
 */
export function useVoidReconciliation() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await paylinq.updateReconciliation(id, { status: 'failed' });
      return response.reconciliation;
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: [...RECONCILIATION_KEY, data.id] });
      }
      queryClient.invalidateQueries({ queryKey: [...RECONCILIATION_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...PAYMENTS_KEY] });
      success('Reconciliation voided successfully');
    },
    onError: (err: any) => {
      error(err?.response?.data?.message || 'Failed to void reconciliation');
    },
  });
}

/**
 * Hook to create a new reconciliation
 */
export function useCreateReconciliation() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await paylinq.createReconciliation(data);
      return response.reconciliation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...RECONCILIATION_KEY, 'list'] });
      success('Reconciliation created successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to create reconciliation');
    },
  });
}

/**
 * Hook to update a reconciliation
 */
export function useUpdateReconciliation() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await paylinq.updateReconciliation(id, data);
      return response.reconciliation;
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: [...RECONCILIATION_KEY, data.id] });
      }
      queryClient.invalidateQueries({ queryKey: [...RECONCILIATION_KEY, 'list'] });
      success('Reconciliation updated successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to update reconciliation');
    },
  });
}

/**
 * Hook to delete a reconciliation
 */
export function useDeleteReconciliation() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await (paylinq as any).deleteReconciliation(id);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...RECONCILIATION_KEY, 'list'] });
      success('Reconciliation deleted successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to delete reconciliation');
    },
  });
}

/**
 * Hook to add a reconciliation item
 */
export function useAddReconciliationItem() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ reconciliationId, data }: { reconciliationId: string; data: any }) => {
      const response = await paylinq.addReconciliationItem(reconciliationId, data);
      return response.item;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [...RECONCILIATION_KEY, variables.reconciliationId] });
      success('Item added successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to add item');
    },
  });
}

/**
 * Hook to update a reconciliation item
 */
export function useUpdateReconciliationItem() {
  const { paylinq } = usePaylinqAPI();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: any }) => {
      const response = await paylinq.updateReconciliationItem(itemId, data);
      return response.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECONCILIATION_KEY });
      success('Item updated successfully');
    },
    onError: (err: any) => {
      error(err?.message || 'Failed to update item');
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to fetch payment status summary
 */
export function usePaymentStatusSummary(payrollRunId?: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...PAYMENTS_KEY, 'status-summary', payrollRunId],
    queryFn: async () => {
      if (!payrollRunId) return null;
      const response = await paylinq.getPaymentSummary(payrollRunId);
      return response.summary;
    },
    enabled: !!payrollRunId,
  });
}

/**
 * Hook to check reconciliation status
 */
export function useReconciliationStatus(startDate?: string, endDate?: string) {
  const { paylinq } = usePaylinqAPI();

  return useQuery({
    queryKey: [...RECONCILIATION_KEY, 'status', startDate, endDate],
    queryFn: async () => {
      const response = await paylinq.getReconciliations({
        reconciliationDate: startDate,
      });
      return response.reconciliations || [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch failed payments
 */
export function useFailedPayments(params?: PaginationParams) {
  return usePayments({ ...params, paymentStatus: 'failed' });
}

/**
 * Hook to fetch pending payments
 */
export function usePendingPayments(params?: PaginationParams) {
  return usePayments({ ...params, paymentStatus: 'pending' });
}

/**
 * Hook to check if there are unreconciled payments
 */
export function useHasUnreconciledPayments() {
  const { data, isLoading } = useUnreconciledPayments({ page: 1, limit: 1 });
  
  return {
    hasUnreconciled: data && data.length > 0,
    count: data?.length || 0,
    isLoading,
  };
}
