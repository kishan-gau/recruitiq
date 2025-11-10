import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationsService } from '@/services/locations.service';
import { Location, CreateLocationDTO, UpdateLocationDTO } from '@/types/location.types';

// Query keys
export const locationKeys = {
  all: ['locations'] as const,
  lists: () => [...locationKeys.all, 'list'] as const,
  list: (filters?: any) => [...locationKeys.lists(), filters] as const,
  details: () => [...locationKeys.all, 'detail'] as const,
  detail: (id: string) => [...locationKeys.details(), id] as const,
};

// Hooks
export function useLocations() {
  return useQuery({
    queryKey: locationKeys.lists(),
    queryFn: () => locationsService.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: locationKeys.detail(id),
    queryFn: () => locationsService.get(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLocationDTO) => locationsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLocationDTO }) =>
      locationsService.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: locationKeys.detail(id) });

      // Snapshot previous value
      const previousLocation = queryClient.getQueryData<Location>(locationKeys.detail(id));

      // Optimistically update
      if (previousLocation) {
        queryClient.setQueryData<Location>(locationKeys.detail(id), {
          ...previousLocation,
          ...data,
        });
      }

      return { previousLocation };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousLocation) {
        queryClient.setQueryData(locationKeys.detail(id), context.previousLocation);
      }
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => locationsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });
}
