import { APIClient } from '../core/client';
import type { ApiResponse } from '@recruitiq/types';
import type {
  ShiftTemplate,
  ShiftTemplateSummary,
  CreateShiftTemplateInput,
  UpdateShiftTemplateInput,
  ShiftTemplateFilters,
  BulkShiftTemplateOperation,
  BulkOperationResult,
  ShiftTemplateValidation
} from '@recruitiq/types';

/**
 * Availability types
 */
export type AvailabilityType = 'recurring' | 'one_time' | 'unavailable';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface AvailabilityRule {
  id: string;
  employeeId: string;
  organizationId: string;
  availabilityType: AvailabilityType;
  dayOfWeek?: DayOfWeek;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: string | null;
}

export interface CreateAvailabilityRequest {
  employeeId: string;
  availabilityType: AvailabilityType;
  dayOfWeek?: DayOfWeek;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface UpdateAvailabilityRequest extends Partial<CreateAvailabilityRequest> {}

/**
 * Shift and Station Coverage types
 */
export interface Shift {
  id: string;
  scheduleId: string;
  employeeId?: string;
  roleId: string;
  stationId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  templateId?: string;
  templateName?: string;
  templateStart?: string;
  templateEnd?: string;
  employeeName?: string;
  roleName: string;
  stationName: string;
}

export interface StationCoverage {
  stationId: string;
  stationName: string;
  requiredStaffing: number;
  currentStaffing: number;
  pendingStaffing: number;
  totalScheduled: number;
  status: 'adequate' | 'pending' | 'understaffed';
  shifts: Array<{
    shiftId: string;
    employeeId?: string;
    employeeName?: string;
    roleName: string;
    startTime: string;
    endTime: string;
    status: string;
  }>;
}

export interface GetShiftsFilters {
  date?: string;
  stationId?: string;
  status?: string;
}

/**
 * ScheduleHub Product API Client
 * Scheduling and shift management system endpoints
 * 
 * ARCHITECTURE: basePath is relative to APIClient's baseURL ('/api')
 * Final URLs: /api + /products/schedulehub/* = /api/products/schedulehub/*
 */
export class ScheduleHubClient {
  private readonly basePath = 'products/schedulehub';

  constructor(private client: APIClient) {}

  // ============================================================================
  // Availability
  // ============================================================================

  /**
   * Get all availability rules for an employee
   */
  async getAvailability(employeeId: string) {
    return this.client.get<ApiResponse<AvailabilityRule[]>>(
      `${this.basePath}/availability?employeeId=${employeeId}`
    );
  }

  /**
   * Create a new availability rule
   */
  async createAvailability(data: CreateAvailabilityRequest) {
    return this.client.post<ApiResponse<AvailabilityRule>>(
      `${this.basePath}/availability`,
      data
    );
  }

  /**
   * Update an existing availability rule
   */
  async updateAvailability(id: string, data: UpdateAvailabilityRequest) {
    return this.client.patch<ApiResponse<AvailabilityRule>>(
      `${this.basePath}/availability/${id}`,
      data
    );
  }

  /**
   * Delete an availability rule
   */
  async deleteAvailability(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/availability/${id}`
    );
  }

  // ============================================================================
  // Shift Templates
  // ============================================================================

  /**
   * Get all shift templates with optional filtering and pagination
   */
  async getShiftTemplates(filters?: ShiftTemplateFilters & {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const queryParams = new URLSearchParams();
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.isActive !== undefined) queryParams.append('isActive', String(filters.isActive));
    if (filters?.stationId) queryParams.append('stationId', filters.stationId);
    if (filters?.roleId) queryParams.append('roleId', filters.roleId);
    if (filters?.tags) filters.tags.forEach((tag: string) => queryParams.append('tags', tag));
    if (filters?.page) queryParams.append('page', String(filters.page));
    if (filters?.limit) queryParams.append('limit', String(filters.limit));
    if (filters?.sortBy) queryParams.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) queryParams.append('sortOrder', filters.sortOrder);

    const queryString = queryParams.toString();
    const url = `${this.basePath}/shift-templates${queryString ? `?${queryString}` : ''}`;
    
    return this.client.get<ApiResponse<ShiftTemplateSummary[]>>(url);
  }

  /**
   * Get a shift template by ID
   */
  async getShiftTemplate(id: string) {
    return this.client.get<ApiResponse<ShiftTemplate>>(
      `${this.basePath}/shift-templates/${id}`
    );
  }

  /**
   * Create a new shift template
   */
  async createShiftTemplate(data: CreateShiftTemplateInput) {
    return this.client.post<ApiResponse<ShiftTemplate>>(
      `${this.basePath}/shift-templates`,
      data
    );
  }

  /**
   * Update an existing shift template
   */
  async updateShiftTemplate(id: string, data: UpdateShiftTemplateInput) {
    return this.client.patch<ApiResponse<ShiftTemplate>>(
      `${this.basePath}/shift-templates/${id}`,
      data
    );
  }

  /**
   * Delete a shift template
   */
  async deleteShiftTemplate(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/shift-templates/${id}`
    );
  }

  /**
   * Duplicate a shift template
   */
  async duplicateShiftTemplate(id: string, name?: string) {
    const data = name ? { name } : {};
    return this.client.post<ApiResponse<ShiftTemplate>>(
      `${this.basePath}/shift-templates/${id}/duplicate`,
      data
    );
  }

  /**
   * Validate a shift template
   */
  async validateShiftTemplate(data: CreateShiftTemplateInput | UpdateShiftTemplateInput) {
    return this.client.post<ApiResponse<ShiftTemplateValidation>>(
      `${this.basePath}/shift-templates/validate`,
      data
    );
  }

  /**
   * Perform bulk operations on shift templates
   */
  async bulkUpdateShiftTemplates(operation: BulkShiftTemplateOperation) {
    return this.client.post<ApiResponse<BulkOperationResult>>(
      `${this.basePath}/shift-templates/bulk`,
      operation
    );
  }

  // ============================================================================
  // Shifts
  // ============================================================================

  /**
   * Get all shifts with optional filtering
   */
  async getAllShifts(filters?: GetShiftsFilters) {
    const queryParams = new URLSearchParams();
    if (filters?.date) queryParams.append('date', filters.date);
    if (filters?.stationId) queryParams.append('stationId', filters.stationId);
    if (filters?.status) queryParams.append('status', filters.status);

    const queryString = queryParams.toString();
    const url = `${this.basePath}/shifts${queryString ? `?${queryString}` : ''}`;
    
    return this.client.get<ApiResponse<Shift[]>>(url);
  }

  // ============================================================================
  // Station Coverage
  // ============================================================================

  /**
   * Get station coverage statistics for a specific date
   */
  async getStationCoverageStats(date: string) {
    return this.client.get<ApiResponse<StationCoverage[]>>(
      `${this.basePath}/stations/coverage/stats?date=${date}`
    );
  }
}
