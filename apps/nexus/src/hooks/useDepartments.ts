import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsService } from '@/services/departments.service';
import { Department, CreateDepartmentDTO, UpdateDepartmentDTO, DepartmentFilters } from '@/types/department.types';

// Query keys
export const departmentKeys = {
  all: ['departments'] as const,
  lists: () => [...departmentKeys.all, 'list'] as const,
  list: (filters?: DepartmentFilters) => [...departmentKeys.lists(), filters] as const,
  details: () => [...departmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...departmentKeys.details(), id] as const,
  hierarchies: () => [...departmentKeys.all, 'hierarchy'] as const,
  hierarchy: (id?: string) => [...departmentKeys.hierarchies(), id] as const,
  structure: () => [...departmentKeys.all, 'structure'] as const,
  employees: (id: string) => [...departmentKeys.all, 'employees', id] as const,
};

// Hooks
export function useDepartments(filters?: DepartmentFilters) {
  return useQuery({
    queryKey: departmentKeys.list(filters),
    queryFn: () => departmentsService.list(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: departmentKeys.detail(id),
    queryFn: () => departmentsService.get(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDepartmentDTO) => departmentsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentDTO }) =>
      departmentsService.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: departmentKeys.detail(id) });

      // Snapshot previous value
      const previousDepartment = queryClient.getQueryData<Department>(departmentKeys.detail(id));

      // Optimistically update
      if (previousDepartment) {
        queryClient.setQueryData<Department>(departmentKeys.detail(id), {
          ...previousDepartment,
          ...data,
        });
      }

      return { previousDepartment };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousDepartment) {
        queryClient.setQueryData(departmentKeys.detail(id), context.previousDepartment);
      }
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => departmentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
    },
  });
}

export function useDepartmentHierarchy(id?: string) {
  return useQuery({
    queryKey: departmentKeys.hierarchy(id),
    queryFn: () => (id ? departmentsService.getHierarchy(id) : departmentsService.getOrganizationStructure().then(arr => arr[0])),
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrganizationStructure() {
  return useQuery({
    queryKey: departmentKeys.structure(),
    queryFn: () => departmentsService.getOrganizationStructure(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDepartmentEmployees(id: string) {
  return useQuery({
    queryKey: departmentKeys.employees(id),
    queryFn: () => departmentsService.getEmployees(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

