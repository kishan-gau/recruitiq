/**
 * ScheduleHub API Service
 * Handles all scheduling-related API calls for ScheduleHub integration within Nexus
 * Uses centralized API client for type-safe backend communication
 */

import { APIClient } from '@recruitiq/api-client';
import type { Shift } from '@/types/schedulehub';

// Create singleton instance for service-level usage
const apiClient = new APIClient();

// Station Coverage interfaces (matching backend response structure)
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

export interface ShiftFilters {
  date?: string; // YYYY-MM-DD format
  stationId?: string;
  roleId?: string;
  employeeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

// Permission metadata for RBAC
export const scheduleHubServicePermissions = {
  viewShifts: 'schedulehub.shifts.view',
  createShifts: 'schedulehub.shifts.create',
  updateShifts: 'schedulehub.shifts.update',
  deleteShifts: 'schedulehub.shifts.delete',
  viewStationCoverage: 'schedulehub.stations.coverage.view',
  manageSchedule: 'schedulehub.schedule.manage',
};

export const scheduleHubService = {
  /**
   * Get all shifts with optional filtering
   * Backend endpoint: GET /products/schedulehub/shifts (APIClient adds /api prefix)
   */
  getAllShifts: async (filters?: ShiftFilters): Promise<Shift[]> => {
    try {
      // Use direct API call since ScheduleHub endpoints aren't in NexusClient yet
      // TODO: Add ScheduleHub methods to NexusClient in @recruitiq/api-client
      const response = await apiClient.get('/products/schedulehub/shifts', {
        params: filters
      });
      
      // Backend returns { success: true, shifts: [...] }
      return (response.data?.shifts || []) as Shift[];
    } catch (error) {
      console.error('[ScheduleHub Service] Error fetching shifts:', error);
      throw new Error('Failed to fetch shifts');
    }
  },

  /**
   * Get station coverage statistics for timeline visualization
   * Backend endpoint: GET /products/schedulehub/stations/coverage/stats (APIClient adds /api prefix)
   */
  getStationCoverageStats: async (date?: string): Promise<CoverageAnalysis> => {
    try {
      const params = date ? { date } : {};
      
      const response = await apiClient.get('/products/schedulehub/stations/coverage/stats', {
        params
      });
      
      // Backend returns the CoverageAnalysis object directly
      return response.data || {
        totalStations: 0,
        optimalStations: 0,
        warningStations: 0,
        criticalStations: 0,
        overallCoveragePercentage: 0,
        stationCoverage: [],
        criticalPeriods: []
      };
    } catch (error) {
      console.error('[ScheduleHub Service] Error fetching coverage stats:', error);
      throw new Error('Failed to fetch station coverage statistics');
    }
  },

  /**
   * Get shifts for a specific date (convenience method)
   */
  getShiftsByDate: async (date: string): Promise<Shift[]> => {
    return scheduleHubService.getAllShifts({ date });
  },

  /**
   * Get shifts for a specific station (convenience method)
   */
  getShiftsByStation: async (stationId: string, date?: string): Promise<Shift[]> => {
    return scheduleHubService.getAllShifts({ stationId, date });
  },

  /**
   * Get shifts for a date range (convenience method)
   */
  getShiftsByDateRange: async (startDate: string, endDate: string): Promise<Shift[]> => {
    return scheduleHubService.getAllShifts({ startDate, endDate });
  },

  /**
   * Update shift time and date
   */
  updateShift: async (shiftId: string, updates: { startTime?: string; endTime?: string; date?: string }): Promise<Shift> => {
    try {
      const response = await apiClient.put(`/products/schedulehub/shifts/${shiftId}`, updates);
      return response.data.shift || response.data;
    } catch (error) {
      console.error('[ScheduleHub Service] Error updating shift:', error);
      throw new Error('Failed to update shift');
    }
  },

  /**
   * Real-time coverage analysis for a specific date
   * Combines shifts and coverage statistics for complete timeline data
   */
  getCoverageForDate: async (date: Date | string): Promise<CoverageAnalysis> => {
    try {
      // Convert Date object to YYYY-MM-DD string format
      const dateStr = date instanceof Date 
        ? date.toISOString().split('T')[0]
        : date;
      
      // Get coverage statistics which includes all necessary data
      const coverage = await scheduleHubService.getStationCoverageStats(dateStr);
      
      // Coverage stats already include shifts data from backend
      return coverage;
    } catch (error) {
      console.error('[ScheduleHub Service] Error getting coverage for date:', error);
      throw new Error(`Failed to get coverage data for ${date}`);
    }
  },

  // =============================================================================
  // SCHEDULE PUBLICATION METHODS
  // =============================================================================

  /**
   * Publish a schedule with comprehensive conflict detection
   * Processes ConflictError responses into UX-friendly format
   */
  publishSchedule: async (scheduleId: string): Promise<PublishResult> => {
    try {
      const response = await apiClient.put(`/api/products/schedulehub/schedules/${scheduleId}/publish`);
      
      return {
        success: true,
        message: 'Schedule published successfully',
        schedule: response.data.schedule
      };
    } catch (error: any) {
      console.error('[ScheduleHub Service] Error publishing schedule:', error);
      
      // Handle ConflictError from backend
      if (error.response?.status === 409 && error.response?.data?.errorCode === 'SCHEDULE_CONFLICTS') {
        const conflictData = error.response.data;
        
        return {
          success: false,
          hasConflicts: true,
          message: conflictData.error || 'Schedule has conflicts that must be resolved before publishing',
          conflicts: processConflictData(conflictData.conflicts || []),
          resolutionOptions: conflictData.resolutionOptions || []
        };
      }
      
      // Handle other errors
      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Failed to publish schedule'
      );
    }
  }
};

// =============================================================================
// CONFLICT RESOLUTION INTERFACES & HELPERS
// =============================================================================

/**
 * Result of schedule publication attempt
 */
export interface PublishResult {
  success: boolean;
  message: string;
  schedule?: any;
  hasConflicts?: boolean;
  conflicts?: ProcessedConflict[];
  resolutionOptions?: ResolutionOption[];
}

/**
 * Processed conflict data for UX display
 */
export interface ProcessedConflict {
  employeeId: string;
  employeeName: string;
  conflictType: 'overlap' | 'double_booking' | 'availability';
  severity: 'warning' | 'error';
  description: string;
  affectedShifts: ConflictShift[];
  suggestedActions: string[];
}

/**
 * Shift information in conflict context
 */
export interface ConflictShift {
  id: string;
  startTime: string;
  endTime: string;
  stationName: string;
  roleName: string;
  scheduleId: string;
  scheduleName: string;
  isPublished: boolean;
}

/**
 * Resolution option provided by backend
 */
export interface ResolutionOption {
  type: 'modify_shifts' | 'reassign_workers' | 'unpublish_conflicts';
  label: string;
  description: string;
  canAutoResolve: boolean;
}

/**
 * Process raw conflict data from backend into UX-friendly format
 */
function processConflictData(rawConflicts: any[]): ProcessedConflict[] {
  return rawConflicts.map((conflict: any) => ({
    employeeId: conflict.employeeId,
    employeeName: `${conflict.employee?.firstName || ''} ${conflict.employee?.lastName || ''}`.trim() || 'Unknown Employee',
    conflictType: determineConflictType(conflict.overlapType),
    severity: conflict.overlapType === 'complete_overlap' ? 'error' : 'warning',
    description: generateConflictDescription(conflict),
    affectedShifts: processAffectedShifts(conflict.shifts || []),
    suggestedActions: generateSuggestedActions(conflict)
  }));
}

/**
 * Determine conflict type based on backend overlap type
 */
function determineConflictType(overlapType: string): 'overlap' | 'double_booking' | 'availability' {
  switch (overlapType) {
    case 'complete_overlap':
    case 'partial_overlap':
      return 'overlap';
    case 'back_to_back':
      return 'availability';
    default:
      return 'double_booking';
  }
}

/**
 * Generate user-friendly conflict description
 */
function generateConflictDescription(conflict: any): string {
  const employeeName = `${conflict.employee?.firstName || ''} ${conflict.employee?.lastName || ''}`.trim();
  
  switch (conflict.overlapType) {
    case 'complete_overlap':
      return `${employeeName} is already scheduled for the exact same time period in another published schedule`;
    case 'partial_overlap':
      return `${employeeName} has a conflicting shift that partially overlaps with this schedule`;
    case 'back_to_back':
      return `${employeeName} has back-to-back shifts with insufficient break time`;
    default:
      return `${employeeName} has a scheduling conflict that needs resolution`;
  }
}

/**
 * Process affected shifts into UX-friendly format
 */
function processAffectedShifts(shifts: any[]): ConflictShift[] {
  return shifts.map((shift: any) => ({
    id: shift.id,
    startTime: shift.startTime,
    endTime: shift.endTime,
    stationName: shift.station?.name || 'Unknown Station',
    roleName: shift.role?.name || 'Unknown Role',
    scheduleId: shift.scheduleId,
    scheduleName: shift.schedule?.name || 'Unknown Schedule',
    isPublished: shift.schedule?.status === 'published'
  }));
}

/**
 * Generate suggested actions based on conflict data
 */
function generateSuggestedActions(conflict: any): string[] {
  const actions = [];
  
  switch (conflict.overlapType) {
    case 'complete_overlap':
      actions.push('Remove this worker from one of the conflicting shifts');
      actions.push('Assign a different worker to this shift');
      actions.push('Modify shift times to avoid overlap');
      break;
    case 'partial_overlap':
      actions.push('Adjust shift start or end times');
      actions.push('Split the shift into non-overlapping periods');
      actions.push('Reassign conflicting portions to other workers');
      break;
    case 'back_to_back':
      actions.push('Add break time between shifts');
      actions.push('Combine shifts if appropriate');
      actions.push('Assign different workers to maintain proper breaks');
      break;
    default:
      actions.push('Review and resolve the scheduling conflict');
      actions.push('Contact scheduling manager if needed');
  }
  
  return actions;
}

export default scheduleHubService;