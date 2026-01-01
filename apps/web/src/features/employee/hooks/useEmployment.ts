/**
 * React Query hooks for Employment feature
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { employmentService } from '@/services/employee/employment.service';

// Query Keys
const employmentKeys = {
  all: ['employment'] as const,
  currentContract: () => [...employmentKeys.all, 'current-contract'] as const,
  contracts: () => [...employmentKeys.all, 'contracts'] as const,
  history: () => [...employmentKeys.all, 'history'] as const,
  status: () => [...employmentKeys.all, 'status'] as const,
  compensation: () => [...employmentKeys.all, 'compensation'] as const,
};

/**
 * Hook for current contract
 */
export function useCurrentContract() {
  return useQuery({
    queryKey: employmentKeys.currentContract(),
    queryFn: () => employmentService.getCurrentContract(),
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Hook for all contracts
 */
export function useContracts() {
  return useQuery({
    queryKey: employmentKeys.contracts(),
    queryFn: () => employmentService.listContracts(),
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Hook for employment history
 */
export function useEmploymentHistory() {
  return useQuery({
    queryKey: employmentKeys.history(),
    queryFn: () => employmentService.getEmploymentHistory(),
    staleTime: 30 * 60 * 1000, // Historical data rarely changes
  });
}

/**
 * Hook for employment status
 */
export function useEmploymentStatus() {
  return useQuery({
    queryKey: employmentKeys.status(),
    queryFn: () => employmentService.getEmploymentStatus(),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for compensation package
 */
export function useCompensationPackage() {
  return useQuery({
    queryKey: employmentKeys.compensation(),
    queryFn: () => employmentService.getCompensationPackage(),
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Mutation hook for downloading contract document
 */
export function useDownloadContract() {
  return useMutation({
    mutationFn: (contractId: string) => employmentService.downloadContract(contractId),
  });
}
