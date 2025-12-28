import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { locationsService } from '../services/locations.service';
import type {
  ApiError,
  Location,
  LocationFilters,
  CreateLocationDTO,
  UpdateLocationDTO,
} from '@/types/location.types';

export const locationKeys = {
  all: ['locations'] as const,
  lists: () => [...locationKeys.all, 'list'] as const,
  list: (filters?: LocationFilters) => [...locationKeys.lists(), filters] as const,
  details: () => [...locationKeys.all, 'detail'] as const,
  detail: (id: string) => [...locationKeys.details(), id] as const,
};

export function useLocations(
  filters?: LocationFilters,
  options?: Omit<UseQueryOptions<Location[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Location[], ApiError>({
    queryKey: locationKeys.list(filters),
    queryFn: () => locationsService.listLocations(filters),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useLocation(
  id: string,
  options?: Omit<UseQueryOptions<Location, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Location, ApiError>({
    queryKey: locationKeys.detail(id),
    queryFn: () => locationsService.getLocation(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation<Location, ApiError, CreateLocationDTO>({
    mutationFn: (data) => locationsService.createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation<Location, ApiError, { id: string; data: UpdateLocationDTO }>({
    mutationFn: ({ id, data }) => locationsService.updateLocation(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(locationKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => locationsService.deleteLocation(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: locationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });
}
