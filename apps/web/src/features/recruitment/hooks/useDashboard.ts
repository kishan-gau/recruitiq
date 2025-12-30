import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import { dashboardService } from '../services';

// Types
export interface DashboardMetrics {
  totalJobs: number;
  openJobs: number;
  totalCandidates: number;
  activeCandidates: number;
  totalApplications: number;
  totalHired: number;
  conversionRate: number;
  avgTimeToHire: number;
  costPerHire: number;
  sourcingEfficiency: number;
}

export interface DashboardInsights {
  trends: {
    jobsThisMonth: number;
    candidatesThisMonth: number;
    hiresThisMonth: number;
    growthRate: number;
  };
  topPerformers: {
    recruiters: Array<{
      name: string;
      hires: number;
      conversionRate: number;
    }>;
    sources: Array<{
      source: string;
      candidates: number;
      hires: number;
    }>;
  };
  alerts: Array<{
    type: 'warning' | 'info' | 'success';
    message: string;
    actionRequired: boolean;
  }>;
}

export interface PerformanceData {
  timeToHire: {
    current: number;
    target: number;
    trend: 'up' | 'down' | 'stable';
  };
  pipelineHealth: {
    score: number;
    bottlenecks: string[];
    recommendations: string[];
  };
  diversityMetrics: {
    genderDistribution: Record<string, number>;
    ethnicityDistribution: Record<string, number>;
    ageDistribution: Record<string, number>;
  };
}

// Dashboard metrics hook
export function useDashboard(): UseQueryResult<DashboardMetrics, Error> {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: dashboardService.getMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Dashboard insights hook
export function useDashboardInsights(): UseQueryResult<DashboardInsights, Error> {
  return useQuery({
    queryKey: ['dashboard', 'insights'],
    queryFn: dashboardService.getInsights,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Performance data hook
export function useDashboardPerformance(): UseQueryResult<PerformanceData, Error> {
  return useQuery({
    queryKey: ['dashboard', 'performance'],
    queryFn: dashboardService.getPerformanceData,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Activity feed hook
export function useDashboardActivities(limit: number = 10): UseQueryResult<any[], Error> {
  return useQuery({
    queryKey: ['dashboard', 'activities', limit],
    queryFn: () => dashboardService.getRecentActivities(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Team statistics hook
export function useDashboardTeamStats(): UseQueryResult<any, Error> {
  return useQuery({
    queryKey: ['dashboard', 'team-stats'],
    queryFn: dashboardService.getTeamStatistics,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Real-time notifications hook
export function useDashboardNotifications(): UseQueryResult<any[], Error> {
  return useQuery({
    queryKey: ['dashboard', 'notifications'],
    queryFn: dashboardService.getNotifications,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // Poll every 2 minutes
  });
}

// Export all hooks
export {
  useDashboard as default,
  useDashboard,
  useDashboardInsights,
  useDashboardPerformance,
  useDashboardActivities,
  useDashboardTeamStats,
  useDashboardNotifications,
};