import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NexusClient, APIClient } from '@recruitiq/api-client';
import { handleApiError } from '@/utils/errorHandler';
import { useToast } from '@/contexts/ToastContext';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

// Query Keys
export const availabilityKeys = {
  all: ['schedulehub', 'availability'] as const,
  lists: () => [...availabilityKeys.all, 'list'] as const,
  list: (filters: any) => [...availabilityKeys.lists(), filters] as const,
  details: () => [...availabilityKeys.all, 'detail'] as const,
  detail: (id: string) => [...availabilityKeys.details(), id] as const,
  exceptions: (filters: any) => [...availabilityKeys.all, 'exceptions', filters] as const,
  check: (workerId: string, dateRange: { startDate: string; endDate: string }) =>
    [...availabilityKeys.all, 'check', workerId, dateRange] as const,
};

// ==================== Queries ====================

/**
 * Hook to fetch worker availability
 */
export function useAvailability(filters?: {
  workerId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: availabilityKeys.list(filters || {}),
    queryFn: async () => {
      const response = await nexusClient.listAvailability(filters);
      return response.availabilities || [];
    },
  });
}

/**
 * Hook to fetch single availability record
 */
export function useAvailabilityRecord(id: string) {
  return useQuery({
    queryKey: availabilityKeys.detail(id),
    queryFn: async () => {
      const response = await nexusClient.getAvailability(id);
      return response.data?.availability || response.data || null;
    },
    enabled: !!id,
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
  return useQuery({
    queryKey: availabilityKeys.exceptions(filters || {}),
    queryFn: async () => {
      const response = await nexusClient.listAvailabilityExceptions(filters);
      return response.data?.exceptions || response.data || [];
    },
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
  return useQuery({
    queryKey: availabilityKeys.check(workerId, { startDate, endDate }),
    queryFn: async () => {
      const response = await nexusClient.checkWorkerAvailability(workerId, startDate, endDate);
      return response.data || { isAvailable: false };
    },
    enabled: enabled && !!workerId && !!startDate && !!endDate,
  });
}

// ==================== Mutations ====================

/**
 * Hook to create availability
 */
export function useCreateAvailability() {
  const queryClient = useQueryClient();
  const toast = useToast();

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
      const response = await nexusClient.createAvailability(data);
      return response.data?.availability || response.data || null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.lists() });
      toast.success('Availability created successfully');
    },
    onError: (error) => {
      handleApiError(error, { toast, defaultMessage: 'Failed to create availability' });
    },
  });
}

/**
 * Hook to update availability
 */
export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: {
        availabilityType?: 'recurring' | 'one_time' | 'unavailable';
        dayOfWeek?: number;
        startTime?: string;
        endTime?: string;
        effectiveFrom?: string;
        effectiveTo?: string;
        priority?: 'preferred' | 'required' | 'unavailable';
      } 
    }) => {
      const response = await nexusClient.updateAvailability(id, updates);
      return response.data?.availability || response.data || null;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: availabilityKeys.lists() });
      toast.success('Availability updated successfully');
    },
    onError: (error) => {
      handleApiError(error, { toast, defaultMessage: 'Failed to update availability' });
    },
  });
}

/**
 * Hook to delete availability
 */
export function useDeleteAvailability() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await nexusClient.deleteAvailability(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.lists() });
      toast.success('Availability deleted successfully');
    },
    onError: (error) => {
      handleApiError(error, { toast, defaultMessage: 'Failed to delete availability' });
    },
  });
}

/**
 * Hook to create availability exception
 */
export function useCreateAvailabilityException() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: {
      workerId: string;
      date: string;
      isAvailable: boolean;
      startTime?: string;
      endTime?: string;
      reason?: string;
    }) => {
      const response = await nexusClient.createAvailabilityException(data);
      return response.data?.exception || response.data || null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
      toast.success('Availability exception created successfully');
    },
    onError: (error) => {
      handleApiError(error, { toast, defaultMessage: 'Failed to create availability exception' });
    },
  });
}

/**
 * Hook to delete availability exception
 */
export function useDeleteAvailabilityException() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await nexusClient.deleteAvailabilityException(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: availabilityKeys.all });
      toast.success('Availability exception deleted successfully');
    },
    onError: (error) => {
      handleApiError(error, { toast, defaultMessage: 'Failed to delete availability exception' });
    },
  });
}
