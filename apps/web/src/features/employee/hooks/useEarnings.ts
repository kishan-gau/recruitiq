/**
 * React Query hooks for Earnings feature
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { earningsService } from '@/services/employee/earnings.service';

// Query Keys
const earningsKeys = {
  all: ['earnings'] as const,
  compensation: () => [...earningsKeys.all, 'compensation'] as const,
  payComponents: () => [...earningsKeys.all, 'pay-components'] as const,
  ytd: (year?: number) => [...earningsKeys.all, 'ytd', year] as const,
  breakdown: (payrollRunId: string) => [...earningsKeys.all, 'breakdown', payrollRunId] as const,
  byPeriod: (period: string, year: number) => [...earningsKeys.all, 'period', period, year] as const,
};

/**
 * Hook for compensation summary
 */
export function useCompensationSummary() {
  return useQuery({
    queryKey: earningsKeys.compensation(),
    queryFn: () => earningsService.getCompensationSummary(),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for pay components
 */
export function usePayComponents() {
  return useQuery({
    queryKey: earningsKeys.payComponents(),
    queryFn: () => earningsService.listPayComponents(),
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Hook for year-to-date earnings
 */
export function useYTDEarnings(year?: number) {
  return useQuery({
    queryKey: earningsKeys.ytd(year),
    queryFn: () => earningsService.getYTDEarnings(year),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for earnings breakdown by payroll run
 */
export function useEarningsBreakdown(payrollRunId: string) {
  return useQuery({
    queryKey: earningsKeys.breakdown(payrollRunId),
    queryFn: () => earningsService.getEarningsBreakdown(payrollRunId),
    staleTime: 30 * 60 * 1000, // Historical data rarely changes
    enabled: !!payrollRunId,
  });
}

/**
 * Hook for earnings by period
 */
export function useEarningsByPeriod(period: 'monthly' | 'quarterly' | 'yearly', year: number) {
  return useQuery({
    queryKey: earningsKeys.byPeriod(period, year),
    queryFn: () => earningsService.getEarningsByPeriod(period, year),
    staleTime: 10 * 60 * 1000,
    enabled: !!period && !!year,
  });
}

/**
 * Mutation hook for downloading pay statement
 */
export function useDownloadStatement() {
  return useMutation({
    mutationFn: (payrollRunId: string) => earningsService.downloadStatement(payrollRunId),
  });
}
