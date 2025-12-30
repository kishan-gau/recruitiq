/**
 * ScheduleHub Type Definitions
 * Type system for scheduling and workforce management
 */

// ==================== Type Literals ====================

export type ShiftStatus = 'draft' | 'published' | 'completed' | 'cancelled';
export type ScheduleStatus = 'draft' | 'published' | 'locked' | 'archived';
export type WorkerEmploymentType = 'full_time' | 'part_time' | 'casual' | 'contractor';
export type AvailabilityType = 'available' | 'unavailable' | 'preferred';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type ShiftTradeStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type StationType = 'workstation' | 'service_area' | 'equipment' | 'location';
export type StationStatus = 'active' | 'inactive' | 'maintenance';
export type RoleLevel = 'entry' | 'intermediate' | 'senior' | 'lead' | 'manager';

// ==================== Schedule Management ====================

export interface ScheduleData {
  id?: string;
  organizationId?: string;
  scheduleName: string;
  startDate: Date | string;
  endDate: Date | string;
  status?: ScheduleStatus;
  description?: string | null;
  departmentId?: string | null;
  locationId?: string | null;
  totalShifts?: number;
  totalHours?: number;
  publishedAt?: Date | string | null;
  publishedBy?: string | null;
  lockedAt?: Date | string | null;
  lockedBy?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: Date | string | null;
  deletedBy?: string | null;
}

export interface ShiftData {
  id?: string;
  organizationId?: string;
  scheduleId: string;
  workerId?: string | null;
  workerName?: string | null;
  roleId?: string | null;
  roleName?: string | null;
  stationId?: string | null;
  stationName?: string | null;
  shiftDate: Date | string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  status?: ShiftStatus;
  notes?: string | null;
  isOvertime?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdBy?: string;
  updatedBy?: string;
}

// ==================== Shift Templates ====================

export interface ShiftTemplateData {
  id?: string;
  organizationId?: string;
  templateName: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  isActive?: boolean;
  tags?: string[] | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdBy?: string;
  updatedBy?: string;
}

export interface TemplateRoleData {
  id?: string;
  shiftTemplateId: string;
  roleId: string;
  roleName?: string;
  requiredWorkers: number;
  minWorkers?: number;
  maxWorkers?: number;
  preferredSkills?: string[] | null;
  createdAt?: Date | string;
}

export interface TemplateStationData {
  id?: string;
  shiftTemplateId: string;
  stationId: string;
  stationName?: string;
  requiredWorkers: number;
  priority?: number;
  createdAt?: Date | string;
}

// ==================== Workers ====================

export interface WorkerData {
  id?: string;
  organizationId?: string;
  employeeId: string;
  workerNumber: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  employmentType: WorkerEmploymentType;
  departmentId?: string | null;
  departmentName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  maxHoursPerWeek?: number;
  minHoursPerWeek?: number;
  maxConsecutiveDays?: number;
  minRestHoursBetweenShifts?: number;
  hireDate?: Date | string | null;
  isActive?: boolean;
  lastSyncedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface WorkerAvailabilityData {
  id?: string;
  workerId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  availabilityType: AvailabilityType;
  effectiveFrom?: Date | string | null;
  effectiveTo?: Date | string | null;
  notes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface WorkerSkillData {
  id?: string;
  workerId: string;
  skillName: string;
  proficiencyLevel?: number;
  certificationDate?: Date | string | null;
  expirationDate?: Date | string | null;
  createdAt?: Date | string;
}

// ==================== Roles & Stations ====================

export interface RoleData {
  id?: string;
  organizationId?: string;
  roleName: string;
  description?: string | null;
  level?: RoleLevel;
  requiredSkills?: string[] | null;
  hourlyRate?: number | null;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface StationData {
  id?: string;
  organizationId?: string;
  stationNumber: string;
  stationName: string;
  stationType?: StationType;
  locationId?: string | null;
  locationName?: string | null;
  capacity?: number;
  status?: StationStatus;
  description?: string | null;
  equipment?: Record<string, unknown> | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ==================== Shift Trades ====================

export interface ShiftTradeData {
  id?: string;
  organizationId?: string;
  shiftId: string;
  fromWorkerId: string;
  fromWorkerName?: string;
  toWorkerId?: string | null;
  toWorkerName?: string | null;
  requestDate: Date | string;
  status: ShiftTradeStatus;
  reason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | string | null;
  reviewNotes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ==================== Availability & Time Off ====================

export interface TimeOffRequestData {
  id?: string;
  organizationId?: string;
  workerId: string;
  workerName?: string;
  startDate: Date | string;
  endDate: Date | string;
  reason?: string | null;
  status?: string;
  approvedBy?: string | null;
  approvedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ==================== Search & Filter Interfaces ====================

export interface ScheduleSearchFilters {
  status?: ScheduleStatus;
  departmentId?: string;
  locationId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface ShiftSearchFilters {
  scheduleId?: string;
  workerId?: string;
  roleId?: string;
  stationId?: string;
  status?: ShiftStatus;
  shiftDate?: Date | string;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface WorkerSearchFilters {
  employmentType?: WorkerEmploymentType;
  departmentId?: string;
  locationId?: string;
  isActive?: boolean;
  hasRole?: string;
}

// ==================== Analytics & Reporting ====================

export interface ScheduleStatistics {
  totalSchedules: number;
  totalShifts: number;
  totalHours: number;
  filledShifts: number;
  openShifts: number;
  fillRate: number;
  averageShiftDuration: number;
  overtimeHours: number;
}

export interface WorkerScheduleSummary {
  workerId: string;
  workerName: string;
  totalShifts: number;
  totalHours: number;
  scheduledDays: number;
  averageHoursPerShift: number;
  overtimeHours: number;
}

export interface ShiftConflict {
  type: 'overlap' | 'consecutive' | 'availability' | 'max_hours' | 'rest_period';
  workerId: string;
  workerName?: string;
  shiftDate: Date | string;
  conflictDetails: string;
  severity: 'warning' | 'error';
}

// ==================== Integration ====================

export interface WorkerSyncData {
  employeeId: string;
  organizationId: string;
  workerData: WorkerData;
  syncedAt: Date | string;
}
