/**
 * Benefits Hooks
 * React Query hooks for benefits, enrollments, and dependents
 */

import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { benefitsService } from '@/services/benefits.service';
import type {
  BenefitPlan,
  CreateBenefitPlanDTO,
  UpdateBenefitPlanDTO,
  BenefitPlanFilters,
  BenefitEnrollment,
  CreateBenefitEnrollmentDTO,
  UpdateBenefitEnrollmentDTO,
  BenefitEnrollmentFilters,
  Dependent,
  CreateDependentDTO,
  UpdateDependentDTO,
  DependentFilters,
  BenefitStatistics,
  EnrollmentSummary,
} from '@/types/benefits.types';

// ============ Query Keys ============
export const benefitsKeys = {
  all: ['benefits'] as const,
  plans: () => [...benefitsKeys.all, 'plans'] as const,
  plan: (id: string) => [...benefitsKeys.plans(), id] as const,
  plansList: (filters?: BenefitPlanFilters) => [...benefitsKeys.plans(), 'list', filters] as const,
  enrollmentSummary: (planId: string) => [...benefitsKeys.plan(planId), 'enrollment-summary'] as const,
  enrollments: () => [...benefitsKeys.all, 'enrollments'] as const,
  enrollment: (id: string) => [...benefitsKeys.enrollments(), id] as const,
  enrollmentsList: (filters?: BenefitEnrollmentFilters) => [...benefitsKeys.enrollments(), 'list', filters] as const,
  employeeEnrollments: (employeeId: string) => [...benefitsKeys.enrollments(), 'employee', employeeId] as const,
  dependents: () => [...benefitsKeys.all, 'dependents'] as const,
  dependent: (id: string) => [...benefitsKeys.dependents(), id] as const,
  dependentsList: (filters?: DependentFilters) => [...benefitsKeys.dependents(), 'list', filters] as const,
  employeeDependents: (employeeId: string) => [...benefitsKeys.dependents(), 'employee', employeeId] as const,
  statistics: () => [...benefitsKeys.all, 'statistics'] as const,
};

// ============ Benefit Plans Hooks ============

export function useBenefitPlans(filters?: BenefitPlanFilters): UseQueryResult<BenefitPlan[]> {
  return useQuery({
    queryKey: benefitsKeys.plansList(filters),
    queryFn: () => benefitsService.listPlans(filters),
  });
}

export function useBenefitPlan(id: string): UseQueryResult<BenefitPlan> {
  return useQuery({
    queryKey: benefitsKeys.plan(id),
    queryFn: () => benefitsService.getPlan(id),
    enabled: !!id,
  });
}

export function useCreateBenefitPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateBenefitPlanDTO) => benefitsService.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: benefitsKeys.plans() });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.statistics() });
    },
  });
}

export function useUpdateBenefitPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateBenefitPlanDTO }) =>
      benefitsService.updatePlan(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: benefitsKeys.plan(id) });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.plans() });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.statistics() });
    },
  });
}

export function useDeleteBenefitPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => benefitsService.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: benefitsKeys.plans() });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.statistics() });
    },
  });
}

export function useBenefitStatistics(): UseQueryResult<BenefitStatistics> {
  return useQuery({
    queryKey: benefitsKeys.statistics(),
    queryFn: () => benefitsService.getStatistics(),
  });
}

export function useEnrollmentSummary(planId: string): UseQueryResult<EnrollmentSummary> {
  return useQuery({
    queryKey: benefitsKeys.enrollmentSummary(planId),
    queryFn: () => benefitsService.getEnrollmentSummary(planId),
    enabled: !!planId,
  });
}

// ============ Enrollment Hooks ============

export function useBenefitEnrollments(filters?: BenefitEnrollmentFilters): UseQueryResult<BenefitEnrollment[]> {
  return useQuery({
    queryKey: benefitsKeys.enrollmentsList(filters),
    queryFn: () => benefitsService.listEnrollments(filters),
  });
}

export function useBenefitEnrollment(id: string): UseQueryResult<BenefitEnrollment> {
  return useQuery({
    queryKey: benefitsKeys.enrollment(id),
    queryFn: () => benefitsService.getEnrollment(id),
    enabled: !!id,
  });
}

export function useEmployeeBenefitEnrollments(employeeId: string): UseQueryResult<BenefitEnrollment[]> {
  return useQuery({
    queryKey: benefitsKeys.employeeEnrollments(employeeId),
    queryFn: () => benefitsService.getEmployeeEnrollments(employeeId),
    enabled: !!employeeId,
  });
}

export function useCreateBenefitEnrollment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateBenefitEnrollmentDTO) => benefitsService.createEnrollment(data),
    onSuccess: (enrollment) => {
      queryClient.invalidateQueries({ queryKey: benefitsKeys.enrollments() });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.employeeEnrollments(enrollment.employeeId) });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.enrollmentSummary(enrollment.planId) });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.statistics() });
    },
  });
}

export function useUpdateBenefitEnrollment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateBenefitEnrollmentDTO }) =>
      benefitsService.updateEnrollment(id, updates),
    onSuccess: (enrollment, { id }) => {
      queryClient.invalidateQueries({ queryKey: benefitsKeys.enrollment(id) });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.enrollments() });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.employeeEnrollments(enrollment.employeeId) });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.enrollmentSummary(enrollment.planId) });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.statistics() });
    },
  });
}

export function useCancelBenefitEnrollment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      benefitsService.cancelEnrollment(id, reason),
    onSuccess: (enrollment, { id }) => {
      queryClient.invalidateQueries({ queryKey: benefitsKeys.enrollment(id) });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.enrollments() });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.employeeEnrollments(enrollment.employeeId) });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.enrollmentSummary(enrollment.planId) });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.statistics() });
    },
  });
}

export function useDeleteBenefitEnrollment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => benefitsService.deleteEnrollment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: benefitsKeys.enrollments() });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.statistics() });
    },
  });
}

// ============ Dependent Hooks ============

export function useDependents(filters?: DependentFilters): UseQueryResult<Dependent[]> {
  return useQuery({
    queryKey: benefitsKeys.dependentsList(filters),
    queryFn: () => benefitsService.listDependents(filters),
  });
}

export function useDependent(id: string): UseQueryResult<Dependent> {
  return useQuery({
    queryKey: benefitsKeys.dependent(id),
    queryFn: () => benefitsService.getDependent(id),
    enabled: !!id,
  });
}

export function useEmployeeDependents(employeeId: string): UseQueryResult<Dependent[]> {
  return useQuery({
    queryKey: benefitsKeys.employeeDependents(employeeId),
    queryFn: () => benefitsService.getEmployeeDependents(employeeId),
    enabled: !!employeeId,
  });
}

export function useCreateDependent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateDependentDTO) => benefitsService.createDependent(data),
    onSuccess: (dependent) => {
      queryClient.invalidateQueries({ queryKey: benefitsKeys.dependents() });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.employeeDependents(dependent.employeeId) });
    },
  });
}

export function useUpdateDependent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateDependentDTO }) =>
      benefitsService.updateDependent(id, updates),
    onSuccess: (dependent, { id }) => {
      queryClient.invalidateQueries({ queryKey: benefitsKeys.dependent(id) });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.dependents() });
      queryClient.invalidateQueries({ queryKey: benefitsKeys.employeeDependents(dependent.employeeId) });
    },
  });
}

export function useDeleteDependent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => benefitsService.deleteDependent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: benefitsKeys.dependents() });
    },
  });
}
