/**
 * ScheduleHub Types - Re-exports from main types
 * This file provides backward compatibility for components that import from feature-specific types
 */

export type {
  Station,
  Role,
  Worker,
  WorkerRole,
  Schedule,
  Shift,
  StationRequirement,
  PublishResult,
  ProcessedConflict,
  ConflictShift,
  ResolutionOption,
} from '../../../types/schedulehub';

// Additional types for calendar and templates
export interface CalendarTimeSlot {
  hour: number;
  slots: Shift[];
}

export interface ShiftTemplate {
  id: string;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  stationId?: string;
  roleId?: string;
  color?: string;
  isActive: boolean;
}
