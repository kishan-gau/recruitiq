import { useState, useEffect, useMemo } from 'react';
import { scheduleHubService } from '../../services/schedulehub.service';
import { Shift } from '../../types/schedulehub';

// Simplified station interface for coverage analysis
interface SimpleStation {
  id: string;
  name: string;
  requirements?: Array<{
    requiredStaffing: number;
    minimumStaffing: number;
    timeSlots: Array<{ start: string; end: string }>;
  }>;
}

export interface StationCoverage {
  stationId: string;
  stationName: string;
  requiredStaffing: number;
  currentStaffing: number;
  minimumStaffing: number;
  coveragePercentage: number;
  status: 'optimal' | 'warning' | 'critical';
  shifts: Shift[];
  unfilledSlots: number;
  nextShiftStart?: string;
  isActive: boolean;
}

export interface CoverageAnalysis {
  totalStations: number;
  optimalStations: number;
  warningStations: number;
  criticalStations: number;
  overallCoveragePercentage: number;
  stationCoverage: StationCoverage[];
  criticalPeriods: Array<{
    startTime: string;
    endTime: string;
    affectedStations: string[];
    severity: 'warning' | 'critical';
  }>;
}

/**
 * Hook for real-time station coverage analysis during scheduling
 * Provides comprehensive coverage feedback for calendar interface
 * Now uses API integration instead of local processing
 */
export function useStationCoverage(selectedDate: Date = new Date()) {
  // Create a stable date string to prevent infinite re-renders
  const stableDateKey = useMemo(() => {
    return selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  }, [selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()]);

  const [coverageData, setCoverageData] = useState<CoverageAnalysis>({
    totalStations: 0,
    optimalStations: 0,
    warningStations: 0,
    criticalStations: 0,
    overallCoveragePercentage: 0,
    stationCoverage: [],
    criticalPeriods: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoverageData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await scheduleHubService.getCoverageForDate(selectedDate);
        setCoverageData(data);
      } catch (err) {
        console.error('Error fetching station coverage:', err);
        setError(err instanceof Error ? err.message : 'Failed to load station coverage data');
        
        // Set fallback empty data
        setCoverageData({
          totalStations: 0,
          optimalStations: 0,
          warningStations: 0,
          criticalStations: 0,
          overallCoveragePercentage: 0,
          stationCoverage: [],
          criticalPeriods: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCoverageData();
  }, [stableDateKey]); // Re-fetch when date actually changes (using stable date string)

  // Return coverage data with loading/error states
  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await scheduleHubService.getCoverageForDate(selectedDate);
      setCoverageData(data);
    } catch (err) {
      console.error('Error refetching station coverage:', err);
      setError(err instanceof Error ? err.message : 'Failed to reload station coverage data');
    } finally {
      setLoading(false);
    }
  };

  return {
    ...coverageData,
    loading,
    error,
    refetch
  };
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