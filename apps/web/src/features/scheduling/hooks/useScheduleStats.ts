/**
 * Schedule Statistics Hooks
 * 
 * React Query hooks for schedule statistics and analytics
 * Used for dashboard metrics and reporting
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { statsService } from '../services';
import { ScheduleStatistics } from '../types';
import { useErrorHandler } from '@/hooks/useErrorHandler';

// ==================== Query Keys ====================

export const scheduleStatsKeys = {
  all: ['schedule-stats'] as const,
  lists: () => [...scheduleStatsKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...scheduleStatsKeys.lists(), { filters }] as const,
  details: () => [...scheduleStatsKeys.all, 'detail'] as const,
  detail: (period: string) => [...scheduleStatsKeys.details(), period] as const,
  coverage: () => [...scheduleStatsKeys.all, 'coverage'] as const,
  efficiency: () => [...scheduleStatsKeys.all, 'efficiency'] as const,
  trends: () => [...scheduleStatsKeys.all, 'trends'] as const,
};

// ==================== Query Hooks ====================

/**
 * Hook to fetch schedule statistics
 */
export function useScheduleStats(filters?: {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  stationId?: string;
}) {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: scheduleStatsKeys.list(filters || {}),
    queryFn: async () => {
      try {
        const stats = await statsService.getScheduleStats(filters);
        return stats;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch schedule statistics for a specific period
 */
export function useScheduleStatsByPeriod(
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  date?: string
) {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: scheduleStatsKeys.detail(period),
    queryFn: async () => {
      try {
        const stats = await statsService.getScheduleStatsByPeriod(period, date);
        return stats;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    enabled: !!period,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch station coverage statistics
 */
export function useStationCoverageStats(filters?: {
  startDate?: string;
  endDate?: string;
  stationIds?: string[];
}) {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: scheduleStatsKeys.coverage(),
    queryFn: async () => {
      try {
        const stats = await statsService.getStationCoverageStats(filters);
        return stats;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch schedule efficiency metrics
 */
export function useScheduleEfficiencyStats(filters?: {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}) {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: scheduleStatsKeys.efficiency(),
    queryFn: async () => {
      try {
        const stats = await statsService.getScheduleEfficiencyStats(filters);
        return stats;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch schedule trends and analytics
 */
export function useScheduleTrends(
  type: 'coverage' | 'efficiency' | 'utilization',
  period: 'week' | 'month' | 'quarter' | 'year' = 'month'
) {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: scheduleStatsKeys.trends(),
    queryFn: async () => {
      try {
        const trends = await statsService.getScheduleTrends(type, period);
        return trends;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    enabled: !!type,
    staleTime: 10 * 60 * 1000, // 10 minutes for trends
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch real-time schedule metrics
 */
export function useRealTimeScheduleMetrics() {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: [...scheduleStatsKeys.all, 'real-time'],
    queryFn: async () => {
      try {
        const metrics = await statsService.getRealTimeScheduleMetrics();
        return metrics;
      } catch (error) {
        handleError(error);
        throw error;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 0, // Always stale for real-time data
    gcTime: 5 * 60 * 1000,
  });
}

// ==================== Utility Hooks ====================

/**
 * Hook to invalidate schedule statistics cache
 */
export function useInvalidateScheduleStats() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: scheduleStatsKeys.all });
    },
    invalidateStats: (filters?: Record<string, any>) => {
      if (filters) {
        queryClient.invalidateQueries({ queryKey: scheduleStatsKeys.list(filters) });
      } else {
        queryClient.invalidateQueries({ queryKey: scheduleStatsKeys.lists() });
      }
    },
    invalidateCoverage: () => {
      queryClient.invalidateQueries({ queryKey: scheduleStatsKeys.coverage() });
    },
    invalidateEfficiency: () => {
      queryClient.invalidateQueries({ queryKey: scheduleStatsKeys.efficiency() });
    },
    invalidateTrends: () => {
      queryClient.invalidateQueries({ queryKey: scheduleStatsKeys.trends() });
    },
  };
}

/**
 * Hook to prefetch schedule statistics
 */
export function usePrefetchScheduleStats() {
  const queryClient = useQueryClient();

  return {
    prefetchStats: async (filters?: Record<string, any>) => {
      await queryClient.prefetchQuery({
        queryKey: scheduleStatsKeys.list(filters || {}),
        queryFn: async () => {
          const stats = await statsService.getScheduleStats(filters);
          return stats;
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    prefetchCoverage: async (filters?: Record<string, any>) => {
      await queryClient.prefetchQuery({
        queryKey: scheduleStatsKeys.coverage(),
        queryFn: async () => {
          const stats = await statsService.getStationCoverageStats(filters);
          return stats;
        },
        staleTime: 5 * 60 * 1000,
      });
    },
  };
}