/**
 * Comprehensive TypeScript types for Shift Template Management
 * 
 * These types align with the backend API implementation and provide
 * type safety for the complete shift template management system.
 */

// Base Entity Types
// Updated to align with backend API structure
export interface ShiftTemplate {
  id: string;
  organizationId: string;
  templateName: string; // Backend uses templateName, not name
  description?: string;
  startTime: string;
  endTime: string;
  shiftDuration?: number; // Total shift duration in minutes
  breakDuration?: number; // Backend uses breakDuration, not breakDurationMinutes
  totalHours?: number;
  totalRequiredStaff?: number; // Total staff required across all roles
  isFlexible?: boolean;
  flexibilityMinutes?: number;
  isRecurring?: boolean;
  recurrencePattern?: string;
  validityStartDate?: string;
  validityEndDate?: string;
  priority?: number;
  isActive: boolean;
  isFlexibleTiming?: boolean; // Whether shift timing can be adjusted
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  
  // Additional fields from JOINs
  stationId?: string;
  stationName?: string;
  roleCount?: number;
  totalWorkers?: number;
  usageCount?: number;
  roleRequirements?: ShiftTemplateRole[];
  roles?: ShiftTemplateRole[]; // Alias for roleRequirements - form expects this property name
}

export interface ShiftTemplateRole {
  id: string;
  templateId: string;
  roleId: string;
  roleName: string;
  roleCode: string;
  quantity: number;
  minimumProficiency?: number;
  preferredProficiency?: number;
  isPrimaryRole: boolean;
  priority: number;
  isFlexible: boolean;
  roleDescription?: string;
  roleColor?: string;
  requiresCertification?: boolean;
  certificationTypes?: string[];
  skillLevel?: string;
  hourlyRate?: number;
  createdAt: string;
}

// Detailed template with roles - aligned with backend API
export interface ShiftTemplateDetails extends ShiftTemplate {
  roleRequirements: ShiftTemplateRole[];
  totalMinWorkers?: number;
  totalMaxWorkers?: number;
}

// Summary type for lists and dropdowns - aligned with backend API
export interface ShiftTemplateSummary {
  id: string;
  templateName: string; // Backend uses templateName
  description?: string;
  startTime: string;
  endTime: string;
  shiftDuration?: number; // Total shift duration in minutes
  breakDuration?: number; // Break duration in minutes
  totalHours?: number;
  isActive: boolean;
  roleCount?: number;
  totalWorkers?: number;
  totalRequiredStaff?: number; // Total staff required across all roles
  priority?: number;
  stationName?: string;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
}

// Usage statistics type
export interface ShiftTemplateUsage {
  templateId: string;
  templateName: string;
  totalUsage: number;
  lastUsedDate?: string;
  popularDays: Array<{
    dayOfWeek: number;
    dayName: string;
    count: number;
  }>;
  avgWorkersAssigned: number;
  departments: Array<{
    id: string;
    name: string;
    usageCount: number;
  }>;
  roles: Array<{
    id: string;
    name: string;
    usageCount: number;
  }>;
}

// Validation result type
export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  warnings: Array<{
    field: string;
    message: string;
    suggestion?: string;
  }>;
}

// Request Types for API calls
export interface CreateShiftTemplateRequest {
  templateName: string;
  description?: string;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  breakPaid?: boolean;
  colorCode?: string;
  requiresAllRoles?: boolean;
  autoAssignByProficiency?: boolean;
  maxCapacity?: number;
  tags?: string[];
  notes?: string;
  isFlexible?: boolean;
  flexibilityMinutes?: number;
  isRecurring?: boolean;
  recurrencePattern?: object;
  validityStartDate?: string;
  validityEndDate?: string;
  priority?: number;
  stationId?: string; // Legacy field for backward compatibility
  stationIds?: string[]; // New field for multi-station support
  roles: CreateShiftTemplateRoleRequest[];
}

// Input types for form handling (aliases for better component compatibility)
export type CreateShiftTemplateInput = CreateShiftTemplateRequest;
export type UpdateShiftTemplateInput = UpdateShiftTemplateRequest;

export interface CreateShiftTemplateRoleRequest {
  roleId: string;
  quantity: number;
  minimumProficiency?: number;
  preferredProficiency?: number;
  isPrimaryRole?: boolean;
  priority?: number;
  isFlexible?: boolean;
}

export interface UpdateShiftTemplateRequest {
  templateName?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  breakDuration?: number;
  breakPaid?: boolean;
  colorCode?: string;
  isActive?: boolean;
  requiresAllRoles?: boolean;
  autoAssignByProficiency?: boolean;
  maxCapacity?: number;
  tags?: string[];
  notes?: string;
  isFlexible?: boolean;
  flexibilityMinutes?: number;
  isRecurring?: boolean;
  recurrencePattern?: object;
  validityStartDate?: string;
  validityEndDate?: string;
  priority?: number;
  stationId?: string; // Legacy field for backward compatibility
  stationIds?: string[]; // New field for multi-station support
  roles?: UpdateShiftTemplateRoleRequest[];
}

export interface UpdateShiftTemplateRoleRequest {
  id?: string; // For existing roles
  roleId: string;
  quantity: number;
  minimumProficiency?: number;
  preferredProficiency?: number;
  isPrimaryRole?: boolean;
  priority?: number;
  isFlexible?: boolean;
  _action?: 'create' | 'update' | 'delete'; // For role management
}

export interface CloneShiftTemplateRequest {
  id: string;  // Template ID to clone
  name?: string;  // New name for the cloned template
}

// API Response Types
export interface ShiftTemplateListResponse {
  success: true;
  templates: ShiftTemplateSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ShiftTemplateResponse {
  success: true;
  template: ShiftTemplateDetails;
}

export interface ShiftTemplateSummaryResponse {
  success: true;
  summaries: ShiftTemplateSummary[];
}

export interface ShiftTemplateUsageResponse {
  success: true;
  usage: ShiftTemplateUsage[];
}

export interface ShiftTemplateValidationResponse {
  success: true;
  validation: ValidationResult;
}

// Filter and Search Types
export interface ShiftTemplateFilters {
  search?: string;
  isActive?: boolean;
  tags?: string[];
  startTimeFrom?: string;
  startTimeTo?: string;
  endTimeFrom?: string;
  endTimeTo?: string;
  minDuration?: number;
  maxDuration?: number;
  hasRoles?: boolean;
  roleIds?: string[];
  departmentIds?: string[];
  createdBy?: string;
  createdAfter?: string;
  createdBefore?: string;
  sortBy?: 'templateName' | 'createdAt' | 'updatedAt' | 'startTime' | 'duration';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Sort field type for components
export type ShiftTemplateSortField = 'templateName' | 'createdAt' | 'updatedAt' | 'startTime' | 'duration' | 'priority' | 'roleCount';

// Sort order type for components
export type SortOrder = 'asc' | 'desc';

// Form Types for UI Components
export interface ShiftTemplateFormData {
  templateName: string;
  description: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  breakPaid: boolean;
  colorCode: string;
  requiresAllRoles: boolean;
  autoAssignByProficiency: boolean;
  maxCapacity: number;
  tags: string[];
  notes: string;
  isFlexible?: boolean;
  flexibilityMinutes?: number;
  isRecurring?: boolean;
  recurrencePattern?: string;
  validityStartDate?: string;
  validityEndDate?: string;
  priority?: number;
  stationId?: string;
  roles: ShiftTemplateRoleFormData[];
}

export interface ShiftTemplateRoleFormData {
  id?: string; // For editing existing roles
  templateId?: string;
  roleId: string;
  roleName: string;
  roleCode: string;
  quantity: number;
  minimumProficiency: 'trainee' | 'competent' | 'proficient' | 'expert';
  preferredProficiency?: 'trainee' | 'competent' | 'proficient' | 'expert';
  isPrimaryRole: boolean;
  priority: number;
  isFlexible: boolean;
  roleDescription?: string;
  roleColor?: string;
  requiresCertification?: boolean;
  certificationTypes?: string[];
  skillLevel?: string;
  hourlyRate?: number;
  _isNew?: boolean; // For form state management
  _toDelete?: boolean; // For form state management
}

// UI Component Props Types
export interface ShiftTemplateCardProps {
  template: ShiftTemplateSummary;
  onEdit?: (template: ShiftTemplateSummary) => void;
  onDelete?: (template: ShiftTemplateSummary) => void;
  onClone?: (template: ShiftTemplateSummary) => void;
  onToggleActive?: (template: ShiftTemplateSummary) => void;
  showActions?: boolean;
  compact?: boolean;
}

export interface ShiftTemplateFormProps {
  template?: ShiftTemplateDetails;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ShiftTemplateFormData) => Promise<void>;
  mode: 'create' | 'edit' | 'clone';
  loading?: boolean;
}

export interface ShiftTemplateListProps {
  templates: ShiftTemplateSummary[];
  loading?: boolean;
  onEdit?: (template: ShiftTemplateSummary) => void;
  onDelete?: (template: ShiftTemplateSummary) => void;
  onClone?: (template: ShiftTemplateSummary) => void;
  onCreateNew?: () => void;
  showFilters?: boolean;
  compactView?: boolean;
}

export interface ShiftTemplateFiltersProps {
  filters: ShiftTemplateFilters;
  onFiltersChange: (filters: ShiftTemplateFilters) => void;
  availableRoles: Array<{ id: string; name: string }>;
  availableDepartments: Array<{ id: string; name: string }>;
  availableTags: string[];
  onReset: () => void;
}

// Error Types
export interface ShiftTemplateError extends Error {
  code?: string;
  details?: Record<string, any>;
  statusCode?: number;
}

// Constants for UI and validation
export const PROFICIENCY_LEVELS = [
  { value: 'trainee', label: 'Trainee', description: 'Learning the role' },
  { value: 'competent', label: 'Competent', description: 'Can perform independently' },
  { value: 'proficient', label: 'Proficient', description: 'Skilled and efficient' },
  { value: 'expert', label: 'Expert', description: 'Advanced skills, can train others' }
] as const;

export const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6B7280'  // Gray
] as const;

export const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hours = i;
  const minutes = 0;
  const time24 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const time12 = new Date(`2000-01-01T${time24}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
  return {
    value: time24,
    label: time12,
    minutes: i * 60
  };
});

// Type guards
export const isShiftTemplate = (obj: any): obj is ShiftTemplate => {
  return obj && typeof obj === 'object' && typeof obj.id === 'string' && typeof obj.templateName === 'string';
};

export const isShiftTemplateDetails = (obj: any): obj is ShiftTemplateDetails => {
  return isShiftTemplate(obj) && Array.isArray(obj.roleRequirements);
};

export const isValidProficiencyLevel = (level: string): level is 'trainee' | 'competent' | 'proficient' | 'expert' => {
  return ['trainee', 'competent', 'proficient', 'expert'].includes(level);
};

// Utility functions
export const calculateTemplateDuration = (startTime: string, endTime: string): number => {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const getProficiencyLevelColor = (level: 'trainee' | 'competent' | 'proficient' | 'expert'): string => {
  const colors = {
    trainee: '#F59E0B',    // Yellow
    competent: '#10B981',  // Green
    proficient: '#3B82F6', // Blue
    expert: '#8B5CF6'      // Purple
  };
  return colors[level];
};