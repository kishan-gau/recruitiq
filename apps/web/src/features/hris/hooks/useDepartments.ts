import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { departmentsService } from '../services/departments.service';
import type {
  ApiError,
  Department,
  DepartmentFilters,
  CreateDepartmentDTO,
  UpdateDepartmentDTO,
} from '@/types/department.types';

export const departmentKeys = {
  all: ['departments'] as const,
  lists: () => [...departmentKeys.all, 'list'] as const,
  list: (filters?: DepartmentFilters) => [...departmentKeys.lists(), filters] as const,
  details: () => [...departmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...departmentKeys.details(), id] as const,
};

export function useDepartments(
  filters?: DepartmentFilters,
  options?: Omit<UseQueryOptions<Department[], ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Department[], ApiError>({
    queryKey: departmentKeys.list(filters),
    queryFn: () => departmentsService.listDepartments(filters),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useDepartment(
  id: string,
  options?: Omit<UseQueryOptions<Department, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Department, ApiError>({
    queryKey: departmentKeys.detail(id),
    queryFn: () => departmentsService.getDepartment(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation<Department, ApiError, CreateDepartmentDTO>({
    mutationFn: (data) => departmentsService.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation<Department, ApiError, { id: string; data: UpdateDepartmentDTO }>({
    mutationFn: ({ id, data }) => departmentsService.updateDepartment(id, data),
    onSuccess: (data) => {
      queryClient.setQueryData(departmentKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => departmentsService.deleteDepartment(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: departmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
    },
  });
}
