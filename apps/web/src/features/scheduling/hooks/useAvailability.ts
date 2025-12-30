/**
 * Worker Availability Hooks
 * 
 * React Query hooks for managing worker availability, exceptions,
 * and availability checking across the scheduling system
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useToast } from '@/hooks/useToast';

import { availabilityService } from '../services';
import { WorkerAvailability, AvailabilityException } from '../types';

// ==================== Query Keys ====================

export const availabilityKeys = {
  all: ['availability'] as const,
  lists: () => [...availabilityKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...availabilityKeys.lists(), { filters }] as const,
  details: () => [...availabilityKeys.all, 'detail'] as const,
  detail: (id: string) => [...availabilityKeys.details(), id] as const,
  exceptions: (filters: Record<string, any>) => [...availabilityKeys.all, 'exceptions', { filters }] as const,
  check: (workerId: string, params: Record<string, any>) => [...availabilityKeys.all, 'check', workerId, params] as const,
};

// ==================== Query Hooks ====================

/**
 * Hook to fetch availability records
 */
export function useAvailability(filters?: {
  workerId?: string;
  availabilityType?: 'recurring' | 'one_time' | 'unavailable';
  effectiveFrom?: string;
  effectiveTo?: string;
}) {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: availabilityKeys.list(filters || {}),
    queryFn: async () => {
      try {
        const availability = await availabilityService.listAvailability(filters);
        return availability;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single availability record
 */
export function useAvailabilityRecord(id: string) {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: availabilityKeys.detail(id),
    queryFn: async () => {
      try {
        const record = await availabilityService.getAvailabilityRecord(id);
        return record;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch availability exceptions
 */
export function useAvailabilityExceptions(filters?: {
  workerId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: availabilityKeys.exceptions(filters || {}),
    queryFn: async () => {
      try {
        const exceptions = await availabilityService.listAvailabilityExceptions(filters);
        return exceptions;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to check worker availability for date range
 */
export function useCheckWorkerAvailability(
  workerId: string,
  startDate: string,
  endDate: string,
  enabled = true
) {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: availabilityKeys.check(workerId, { startDate, endDate }),
    queryFn: async () => {
      try {
        const availability = await availabilityService.checkWorkerAvailability(
          workerId,
          startDate,
          endDate
        );
        return availability;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    enabled: enabled && !!workerId && !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000, // 2 minutes for availability checks
    gcTime: 5 * 60 * 1000,
  });
}

// ==================== Mutation Hooks ====================

/**
 * Hook to create availability
 */
export function useCreateAvailability() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (data: 
      | {
          workerId: string;
          availabilityType: 'recurring';
          dayOfWeek: number; // Required for recurring
          startTime: string;
          endTime: string;
          effectiveFrom?: string;
          effectiveTo?: string;
          priority?: 'preferred' | 'required' | 'unavailable';
        }
      | {
          workerId: string;
          availabilityType: 'one_time' | 'unavailable';
          specificDate: string; // Required for one_time/unavailable
          startTime: string;
          endTime: string;
          effectiveFrom?: string;
          effectiveTo?: string;
          priority?: 'preferred' | 'required' | 'unavailable';
        }
    ) => {
      const availability = await availabilityService.createAvailability(data);
      return availability;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.lists() });
      toast.success('Availability created successfully');
    },
    onError: (error) => {
      handleError(error, { 
        toast, 
        defaultMessage: 'Failed to create availability' 
      });
    },
  });
}

/**
 * Hook to update availability
 */
export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: {
        availabilityType?: 'recurring' | 'one_time' | 'unavailable';
        dayOfWeek?: number;
        specificDate?: string;
        startTime?: string;
        endTime?: string;
        effectiveFrom?: string;
        effectiveTo?: string;
        priority?: 'preferred' | 'required' | 'unavailable';
      } 
    }) => {
      const availability = await availabilityService.updateAvailability(id, updates);
      return availability;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: availabilityKeys.lists() });
      toast.success('Availability updated successfully');
    },
    onError: (error) => {
      handleError(error, { 
        toast, 
        defaultMessage: 'Failed to update availability' 
      });
    },
  });
}

/**
 * Hook to delete availability
 */
export function useDeleteAvailability() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (id: string) => {
      await availabilityService.deleteAvailability(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.lists() });
      toast.success('Availability deleted successfully');
    },
    onError: (error) => {
      handleError(error, { 
        toast, 
        defaultMessage: 'Failed to delete availability' 
      });
    },
  });
}

/**
 * Hook to create availability exception
 */
export function useCreateAvailabilityException() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (data: {
      workerId: string;
      date: string;
      isAvailable: boolean;
      startTime?: string;
      endTime?: string;
      reason?: string;
    }) => {
      const exception = await availabilityService.createAvailabilityException(data);
      return exception;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
      toast.success('Availability exception created successfully');
    },
    onError: (error) => {
      handleError(error, { 
        toast, 
        defaultMessage: 'Failed to create availability exception' 
      });
    },
  });
}

/**
 * Hook to delete availability exception
 */
export function useDeleteAvailabilityException() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (id: string) => {
      await availabilityService.deleteAvailabilityException(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
      toast.success('Availability exception deleted successfully');
    },
    onError: (error) => {
      handleError(error, { 
        toast, 
        defaultMessage: 'Failed to delete availability exception' 
      });
    },
  });
}

// ==================== Utility Hooks ====================

/**
 * Hook to invalidate availability cache
 */
export function useInvalidateAvailability() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
    },
    invalidateList: (filters?: Record<string, any>) => {
      if (filters) {
        queryClient.invalidateQueries({ queryKey: availabilityKeys.list(filters) });
      } else {
        queryClient.invalidateQueries({ queryKey: availabilityKeys.lists() });
      }
    },
    invalidateRecord: (id: string) => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.detail(id) });
    },
    invalidateExceptions: (filters?: Record<string, any>) => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.exceptions(filters || {}) });
    },
  };
}

/**
 * Hook to prefetch availability data
 */
export function usePrefetchAvailability() {
  const queryClient = useQueryClient();

  return {
    prefetchAvailability: async (filters?: Record<string, any>) => {
      await queryClient.prefetchQuery({
        queryKey: availabilityKeys.list(filters || {}),
        queryFn: async () => {
          const availability = await availabilityService.listAvailability(filters);
          return availability;
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    prefetchRecord: async (id: string) => {
      await queryClient.prefetchQuery({
        queryKey: availabilityKeys.detail(id),
        queryFn: async () => {
          const record = await availabilityService.getAvailabilityRecord(id);
          return record;
        },
        staleTime: 5 * 60 * 1000,
      });
    },
  };
}