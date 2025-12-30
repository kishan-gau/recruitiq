/**
 * ScheduleHub Station Coverage Hooks
 * 
 * React Query hooks for station coverage analysis in ScheduleHub
 */

import { useQuery } from '@tanstack/react-query';

import { stationsService } from '../services';
import type { StationCoverage, CoverageAnalysis } from '../types';

// Query keys factory
export const stationCoverageKeys = {
  all: ['schedulehub', 'station-coverage'] as const,
  byDate: (date: Date) => [...stationCoverageKeys.all, date.toISOString().split('T')[0]] as const,
  analysis: (date: Date) => [...stationCoverageKeys.byDate(date), 'analysis'] as const,
};

/**
 * Hook for real-time station coverage analysis during scheduling
 */
export function useStationCoverage(selectedDate: Date = new Date()) {
  return useQuery({
    queryKey: stationCoverageKeys.analysis(selectedDate),
    queryFn: () => stationsService.getCoverageForDate(selectedDate),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
  });
}

/**
 * Calculates coverage impact when adding/removing a shift
 * Useful for real-time feedback during schedule editing
 */
export function calculateCoverageImpact(
  stationId: string,
  action: 'add' | 'remove',
  currentCoverage: CoverageAnalysis
): {
  newCoveragePercentage: number;
  statusChange: 'improved' | 'degraded' | 'unchanged';
  newStatus: 'optimal' | 'warning' | 'critical';
  message: string;
} {
  const stationCov = currentCoverage.stationCoverage.find(sc => sc.stationId === stationId);
  
  if (!stationCov) {
    return {
      newCoveragePercentage: 0,
      statusChange: 'unchanged',
      newStatus: 'critical',
      message: 'Station not found'
    };
  }

  const currentStaffing = stationCov.currentStaffing;
  const newStaffing = action === 'add' ? currentStaffing + 1 : Math.max(0, currentStaffing - 1);
  const newCoveragePercentage = stationCov.requiredStaffing > 0 
    ? Math.round((newStaffing / stationCov.requiredStaffing) * 100)
    : 0;

  // Determine new status
  let newStatus: 'optimal' | 'warning' | 'critical' = 'optimal';
  if (newStaffing === 0) {
    newStatus = 'critical';
  } else if (newStaffing < stationCov.minimumStaffing) {
    newStatus = 'critical';
  } else if (newStaffing < stationCov.requiredStaffing) {
    newStatus = 'warning';
  }

  // Determine change direction
  const statusPriority = { 'optimal': 3, 'warning': 2, 'critical': 1 };
  const currentPriority = statusPriority[stationCov.status];
  const newPriority = statusPriority[newStatus];
  
  let statusChange: 'improved' | 'degraded' | 'unchanged' = 'unchanged';
  if (newPriority > currentPriority) {
    statusChange = 'improved';
  } else if (newPriority < currentPriority) {
    statusChange = 'degraded';
  }

  // Generate user-friendly message
  let message = '';
  if (action === 'add') {
    if (statusChange === 'improved') {
      message = `Adding shift improves ${stationCov.stationName} from ${stationCov.status} to ${newStatus}`;
    } else {
      message = `${stationCov.stationName} will be at ${newCoveragePercentage}% capacity`;
    }
  } else {
    if (statusChange === 'degraded') {
      message = `Removing shift degrades ${stationCov.stationName} from ${stationCov.status} to ${newStatus}`;
    } else {
      message = `${stationCov.stationName} will be at ${newCoveragePercentage}% capacity`;
    }
  }

  return {
    newCoveragePercentage,
    statusChange,
    newStatus,
    message
  };
}