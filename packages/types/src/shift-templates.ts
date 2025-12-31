/**
 * Shift Template Type Definitions
 * Types for managing shift templates in ScheduleHub
 */

/**
 * Days of the week
 */
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/**
 * Shift template recurrence pattern
 */
export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly';
  interval?: number; // every N days/weeks/months
  daysOfWeek?: DayOfWeek[]; // for weekly recurrence
  dayOfMonth?: number; // for monthly recurrence
  endDate?: string; // ISO date string
}

/**
 * Time slot definition
 */
export interface TimeSlot {
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  breakDuration?: number; // minutes
}

/**
 * Role requirement for a shift template
 */
export interface ShiftTemplateRole {
  id: string;
  roleId: string;
  roleName: string;
  requiredCount: number;
  minExperience?: number; // years
  skills?: string[];
  notes?: string;
  // Additional properties used in UI components
  quantity?: number; // Alias for requiredCount
  minimumProficiency?: string;
  preferredProficiency?: string;
  isPrimaryRole?: boolean;
  priority?: number;
  isFlexible?: boolean;
}

/**
 * Station assignment for a shift template
 */
export interface ShiftTemplateStation {
  id: string;
  stationId: string;
  stationName: string;
  stationCode?: string;
  capacity?: number;
  notes?: string;
}

/**
 * Full shift template data
 */
export interface ShiftTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  
  // Timing
  timeSlots: TimeSlot[];
  duration: number; // total minutes
  shiftDuration: number; // alias for duration
  breakDuration: number; // total break minutes
  isFlexibleTiming?: boolean; // whether the timing can be adjusted
  
  // Staffing
  roles: ShiftTemplateRole[];
  stations: ShiftTemplateStation[];
  totalRequiredStaff: number; // sum of all role requirements
  
  // Recurrence
  recurrence: RecurrencePattern;
  
  // Settings
  isActive: boolean;
  color?: string; // hex color for calendar display
  priority?: number; // 1-10, higher = more important
  
  // Metadata
  tags?: string[];
  notes?: string;
  
  // Audit fields
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  
  // Additional properties used in UI components (aliases)
  templateName?: string; // Alias for name
  startTime?: string;
  endTime?: string;
  roleRequirements?: ShiftTemplateRole[]; // Alias for roles
}

/**
 * Summary version of shift template for list views
 */
export interface ShiftTemplateSummary {
  id: string;
  name: string;
  description?: string;
  duration: number; // total minutes (alias for shiftDuration)
  shiftDuration: number; // total minutes
  breakDuration: number; // total break minutes
  roleCount?: number; // total number of roles
  stationCount: number; // total number of stations
  totalRequiredStaff: number; // sum of all role requirements
  isActive: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
  // Additional properties used in UI components
  templateName?: string; // Alias for name
  startTime?: string;
  endTime?: string;
  stationName?: string;
}

/**
 * Input data for creating a shift template
 */
export interface CreateShiftTemplateInput {
  name: string;
  description?: string;
  timeSlots: TimeSlot[];
  roles: Omit<ShiftTemplateRole, 'id'>[];
  stations: Omit<ShiftTemplateStation, 'id'>[];
  recurrence: RecurrencePattern;
  isActive?: boolean;
  color?: string;
  priority?: number;
  tags?: string[];
  notes?: string;
}

/**
 * Input data for updating a shift template
 */
export interface UpdateShiftTemplateInput {
  name?: string;
  description?: string;
  timeSlots?: TimeSlot[];
  roles?: Omit<ShiftTemplateRole, 'id'>[];
  stations?: Omit<ShiftTemplateStation, 'id'>[];
  recurrence?: RecurrencePattern;
  isActive?: boolean;
  color?: string;
  priority?: number;
  tags?: string[];
  notes?: string;
}

/**
 * Filter options for shift templates
 */
export interface ShiftTemplateFilters {
  search?: string;
  isActive?: boolean;
  stationId?: string;
  roleId?: string;
  tags?: string[];
  hasRecurrence?: boolean;
  priority?: number;
  createdBy?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Sort options for shift templates
 */
export interface ShiftTemplateSortOptions {
  field: 'name' | 'duration' | 'roleCount' | 'stationCount' | 'priority' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

/**
 * Pagination result for shift templates
 */
export interface ShiftTemplatePaginatedResult {
  templates: ShiftTemplateSummary[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Bulk operation options
 */
export interface BulkShiftTemplateOperation {
  action: 'activate' | 'deactivate' | 'delete' | 'duplicate' | 'update-tags';
  templateIds: string[];
  data?: {
    isActive?: boolean;
    tags?: string[];
  };
}

/**
 * Result of bulk operation
 */
export interface BulkOperationResult {
  success: boolean;
  affected: number;
  errors?: Array<{
    templateId: string;
    error: string;
  }>;
}

/**
 * Validation result for shift template
 */
export interface ShiftTemplateValidation {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Sort field options
 */
export type ShiftTemplateSortField = 'name' | 'duration' | 'roleCount' | 'stationCount' | 'priority' | 'createdAt' | 'updatedAt';

/**
 * Sort order options
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Form data structure for shift template forms
 */
export interface ShiftTemplateFormData {
  templateName: string;
  description?: string;
  stationId?: string;
  shiftDuration: number;
  breakDuration: number;
  startTime?: string;
  endTime?: string;
  isFlexibleTiming?: boolean;
  roles: Array<{
    roleId: string;
    roleName?: string;
    requiredCount: number;
    minExperience?: number;
    skills?: string[];
    notes?: string;
  }>;
  isActive: boolean;
  color?: string;
  priority?: number;
  tags?: string[];
  notes?: string;
}