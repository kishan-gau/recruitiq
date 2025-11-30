import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulehubApi } from '@/lib/api/schedulehub';
import { useToast } from '@/contexts/ToastContext';

/**
 * Hook for fetching shift swap marketplace offers
 * @alias useShiftSwaps - For backward compatibility
 */
export function useShiftSwapMarketplace(params?: any) {
  return useQuery({
    queryKey: ['schedulehub', 'shift-swaps', 'marketplace', params],
    queryFn: () => schedulehubApi.shiftSwaps.getMarketplace(params),
  });
}

/**
 * Alias for useShiftSwapMarketplace for backward compatibility
 */
export const useShiftSwaps = useShiftSwapMarketplace;

/**
 * Hook for fetching user's own shift swap offers
 */
export function useMyShiftSwapOffers() {
  return useQuery({
    queryKey: ['schedulehub', 'shift-swaps', 'my-offers'],
    queryFn: () => schedulehubApi.shiftSwaps.getMyOffers(),
  });
}

/**
 * Hook for fetching a single shift swap offer
 */
export function useShiftSwapOffer(id: string | undefined) {
  return useQuery({
    queryKey: ['schedulehub', 'shift-swaps', id],
    queryFn: () => schedulehubApi.shiftSwaps.get(id!),
    enabled: !!id,
  });
}

/**
 * Hook for creating a new shift swap offer
 */
export function useCreateShiftSwapOffer() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: any) => schedulehubApi.shiftSwaps.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'shift-swaps'] });
      toast.success('Shift swap offer created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create shift swap offer');
    },
  });
}

/**
 * Hook for requesting a shift swap
 */
export function useRequestShiftSwap() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ offerId, data }: { offerId: string; data: any }) =>
      schedulehubApi.shiftSwaps.requestSwap(offerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'shift-swap-requests'] });
      toast.success('Swap request sent successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send swap request');
    },
  });
}

/**
 * Hook for fetching shift swap requests (received by user)
 */
export function useShiftSwapRequests(params?: any) {
  return useQuery({
    queryKey: ['schedulehub', 'shift-swap-requests', params],
    queryFn: () => schedulehubApi.shiftSwaps.getRequests(params),
  });
}

/**
 * Hook for fetching a single shift swap request
 */
export function useShiftSwapRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: ['schedulehub', 'shift-swap-requests', requestId],
    queryFn: () => schedulehubApi.shiftSwaps.getRequest(requestId!),
    enabled: !!requestId,
  });
}

/**
 * Hook for accepting a shift swap request
 */
export function useAcceptShiftSwapRequest() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (requestId: string) => schedulehubApi.shiftSwaps.acceptRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'shift-swap-requests'] });
      toast.success('Swap request accepted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to accept swap request');
    },
  });
}

/**
 * Hook for rejecting a shift swap request
 */
export function useRejectShiftSwapRequest() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) =>
      schedulehubApi.shiftSwaps.rejectRequest(requestId, reason ? { reason } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'shift-swap-requests'] });
      toast.success('Swap request rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reject swap request');
    },
  });
}

/**
 * Hook for fetching pending approval requests (manager view)
 */
export function usePendingShiftSwapApprovals(params?: any) {
  return useQuery({
    queryKey: ['schedulehub', 'shift-swaps', 'pending-approvals', params],
    queryFn: () => schedulehubApi.shiftSwaps.getPendingApprovals(params),
  });
}

/**
 * Hook for approving a shift swap (manager action)
 */
export function useApproveShiftSwap() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ offerId, notes }: { offerId: string; notes?: string }) =>
      schedulehubApi.shiftSwaps.approve(offerId, notes ? { notes } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'shift-swaps'] });
      toast.success('Shift swap approved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve shift swap');
    },
  });
}

/**
 * Hook for rejecting a shift swap (manager action)
 */
export function useRejectShiftSwap() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ offerId, reason }: { offerId: string; reason: string }) =>
      schedulehubApi.shiftSwaps.reject(offerId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'shift-swaps'] });
      toast.success('Shift swap rejected');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reject shift swap');
    },
  });
}

/**
 * Hook for canceling a shift swap offer
 */
export function useCancelShiftSwap() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ offerId, reason }: { offerId: string; reason?: string }) =>
      schedulehubApi.shiftSwaps.cancel(offerId, reason ? { reason } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulehub', 'shift-swaps'] });
      toast.success('Shift swap offer canceled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to cancel shift swap');
    },
  });
}
