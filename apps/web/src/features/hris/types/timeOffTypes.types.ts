/**
 * Time Off Types - Re-exports from main types
 * This file provides backward compatibility for components that import from feature-specific types
 */

export type {
  TimeOffType,
  TimeOffStatus,
  TimeOffRequest,
  CreateTimeOffRequestDTO,
  UpdateTimeOffRequestDTO,
  TimeOffBalance,
  TimeOffFilters,
} from '../../../types/timeoff.types';
