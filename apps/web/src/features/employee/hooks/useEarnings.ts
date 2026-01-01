/**
 * React Query hooks for Earnings feature
 */

import { useQuery } from '@tanstack/react-query';
import { earningsService } from '../services';

/**
 * Hook to fetch pay structure
 */
export const usePayStructure = (employeeId: string) => {
  return useQuery({
    queryKey: ['earnings', 'pay-structure', employeeId],
    queryFn: () => earningsService.getPayStructure(employeeId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!employeeId,
  });
};

/**
 * Hook to fetch year-to-date earnings
 */
export const useYTDEarnings = (employeeId: string) => {
  return useQuery({
    queryKey: ['earnings', 'ytd', employeeId],
    queryFn: () => earningsService.getYTDEarnings(employeeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!employeeId,
  });
};

/**
 * Hook to fetch deductions
 */
export const useDeductions = (employeeId: string) => {
  return useQuery({
    queryKey: ['earnings', 'deductions', employeeId],
    queryFn: () => earningsService.getDeductions(employeeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!employeeId,
  });
};

/**
 * Hook to fetch payroll run breakdown
 */
export const usePayrollRunBreakdown = (runId: string) => {
  return useQuery({
    queryKey: ['earnings', 'payroll-run', runId],
    queryFn: () => earningsService.getPayrollRunBreakdown(runId),
    staleTime: 30 * 60 * 1000, // 30 minutes (historical data rarely changes)
    enabled: !!runId,
  });
};

/**
 * Hook to fetch earnings trends
 */
export const useEarningsTrends = (employeeId: string, period?: string) => {
  return useQuery({
    queryKey: ['earnings', 'trends', employeeId, period],
    queryFn: () => earningsService.getEarningsTrends(employeeId, period),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!employeeId,
  });
};

/**
 * Hook to fetch allowances
 */
export const useAllowances = (employeeId: string) => {
  return useQuery({
    queryKey: ['earnings', 'allowances', employeeId],
    queryFn: () => earningsService.getAllowances(employeeId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!employeeId,
  });
};
