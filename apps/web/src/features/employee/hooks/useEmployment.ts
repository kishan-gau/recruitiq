/**
 * React Query hooks for Employment feature
 */

import { useQuery } from '@tanstack/react-query';
import { employmentService } from '../services';

/**
 * Hook to fetch current contract
 */
export const useCurrentContract = (employeeId: string) => {
  return useQuery({
    queryKey: ['employment', 'contract', employeeId],
    queryFn: () => employmentService.getCurrentContract(employeeId),
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!employeeId,
  });
};

/**
 * Hook to fetch employment history
 */
export const useEmploymentHistory = (employeeId: string) => {
  return useQuery({
    queryKey: ['employment', 'history', employeeId],
    queryFn: () => employmentService.getEmploymentHistory(employeeId),
    staleTime: 30 * 60 * 1000, // 30 minutes (historical data rarely changes)
    enabled: !!employeeId,
  });
};

/**
 * Hook to fetch manager info
 */
export const useManagerInfo = (employeeId: string) => {
  return useQuery({
    queryKey: ['employment', 'manager', employeeId],
    queryFn: () => employmentService.getManagerInfo(employeeId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!employeeId,
  });
};

/**
 * Hook to fetch employment details
 */
export const useEmploymentDetails = (employeeId: string) => {
  return useQuery({
    queryKey: ['employment', 'details', employeeId],
    queryFn: () => employmentService.getEmploymentDetails(employeeId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!employeeId,
  });
};
