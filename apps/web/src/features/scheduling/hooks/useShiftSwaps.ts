/**
 * ScheduleHub Shift Swap Hooks
 * 
 * React Query hooks for managing shift swaps in ScheduleHub
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '../../../contexts/ToastContext';
import { handleApiError } from '../../../utils/errorHandler';
import { shiftSwapsService } from '../services';
import type { ShiftSwapOffer, CreateShiftSwapOffer, ShiftSwapRequest } from '../types';

// Query keys factory
export const shiftSwapKeys = {
  all: ['schedulehub', 'shift-swaps'] as const,
  marketplace: () => [...shiftSwapKeys.all, 'marketplace'] as const,
  marketplaceFiltered: (params?: any) => [...shiftSwapKeys.marketplace(), params] as const,
  myOffers: () => [...shiftSwapKeys.all, 'my-offers'] as const,
  offer: (id: string) => [...shiftSwapKeys.all, id] as const,
  requests: () => [...shiftSwapKeys.all, 'requests'] as const,
  requestsFiltered: (params?: any) => [...shiftSwapKeys.requests(), params] as const,
  request: (id: string) => [...shiftSwapKeys.requests(), id] as const,
  pendingApprovals: () => [...shiftSwapKeys.all, 'pending-approvals'] as const,
  pendingApprovalsFiltered: (params?: any) => [...shiftSwapKeys.pendingApprovals(), params] as const,
};

/**
 * Hook for fetching shift swap marketplace offers
 */
export function useShiftSwapMarketplace(params?: any) {
  return useQuery({
    queryKey: shiftSwapKeys.marketplaceFiltered(params),
    queryFn: () => shiftSwapsService.getMarketplace(params),
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
    queryKey: shiftSwapKeys.myOffers(),
    queryFn: () => shiftSwapsService.getMyOffers(),
  });
}

/**
 * Hook for fetching a single shift swap offer
 */
export function useShiftSwapOffer(id: string, enabled = true) {
  return useQuery({
    queryKey: shiftSwapKeys.offer(id),
    queryFn: () => shiftSwapsService.getOffer(id),
    enabled: enabled && !!id,
  });
}

/**
 * Hook for creating a new shift swap offer
 */
export function useCreateShiftSwapOffer() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: CreateShiftSwapOffer) => shiftSwapsService.createOffer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.all });
      toast.success('Shift swap offer created successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to create shift swap offer',
      });
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
      shiftSwapsService.requestSwap(offerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.all });
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.requests() });
      toast.success('Swap request sent successfully');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to send swap request',
      });
    },
  });
}

/**
 * Hook for fetching shift swap requests (received by user)
 */
export function useShiftSwapRequests(params?: any) {
  return useQuery({
    queryKey: shiftSwapKeys.requestsFiltered(params),
    queryFn: () => shiftSwapsService.getRequests(params),
  });
}

/**
 * Hook for fetching a single shift swap request
 */
export function useShiftSwapRequest(requestId: string, enabled = true) {
  return useQuery({
    queryKey: shiftSwapKeys.request(requestId),
    queryFn: () => shiftSwapsService.getRequest(requestId),
    enabled: enabled && !!requestId,
  });
}

/**
 * Hook for accepting a shift swap request
 */
export function useAcceptShiftSwapRequest() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (requestId: string) => shiftSwapsService.acceptRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.all });
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.requests() });
      toast.success('Swap request accepted');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to accept swap request',
      });
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
      shiftSwapsService.rejectRequest(requestId, reason ? { reason } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.all });
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.requests() });
      toast.success('Swap request rejected');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to reject swap request',
      });
    },
  });
}

/**
 * Hook for fetching pending approval requests (manager view)
 */
export function usePendingShiftSwapApprovals(params?: any) {
  return useQuery({
    queryKey: shiftSwapKeys.pendingApprovalsFiltered(params),
    queryFn: () => shiftSwapsService.getPendingApprovals(params),
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
      shiftSwapsService.approve(offerId, notes ? { notes } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.all });
      toast.success('Shift swap approved');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to approve shift swap',
      });
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
      shiftSwapsService.reject(offerId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.all });
      toast.success('Shift swap rejected');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to reject shift swap',
      });
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
      shiftSwapsService.cancel(offerId, reason ? { reason } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.all });
      toast.success('Shift swap offer canceled');
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to cancel shift swap',
      });
    },
  });
}

/**
 * Alias for pending swap approvals - used by ShiftSwapApprovalQueue
 */
export const usePendingSwaps = usePendingShiftSwapApprovals;

/**
 * Hook for bulk approving multiple shift swaps
 */
export function useBulkApproveSwaps() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ swapIds, notes }: { swapIds: string[]; notes?: string }) => {
      const results = await Promise.allSettled(
        swapIds.map(swapId => 
          shiftSwapsService.approve(swapId, notes ? { notes } : undefined)
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { successful, failed, total: swapIds.length };
    },
    onSuccess: ({ successful, failed, total }) => {
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.all });
      
      if (failed === 0) {
        toast.success(`Successfully approved ${successful} shift swap${successful !== 1 ? 's' : ''}`);
      } else if (successful === 0) {
        toast.error(`Failed to approve all ${total} shift swaps`);
      } else {
        toast.warning(`Approved ${successful} of ${total} shift swaps. ${failed} failed.`);
      }
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to approve shift swaps',
      });
    },
  });
}

/**
 * Hook for bulk rejecting multiple shift swaps
 */
export function useBulkRejectSwaps() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ swapIds, reason }: { swapIds: string[]; reason: string }) => {
      const results = await Promise.allSettled(
        swapIds.map(swapId => 
          shiftSwapsService.reject(swapId, { reason })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { successful, failed, total: swapIds.length };
    },
    onSuccess: ({ successful, failed, total }) => {
      queryClient.invalidateQueries({ queryKey: shiftSwapKeys.all });
      
      if (failed === 0) {
        toast.success(`Successfully rejected ${successful} shift swap${successful !== 1 ? 's' : ''}`);
      } else if (successful === 0) {
        toast.error(`Failed to reject all ${total} shift swaps`);
      } else {
        toast.warning(`Rejected ${successful} of ${total} shift swaps. ${failed} failed.`);
      }
    },
    onError: (error) => {
      handleApiError(error, {
        toast,
        defaultMessage: 'Failed to reject shift swaps',
      });
    },
  });
}