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
   * Toggle the status (active/inactive) of a shift template
   */
  async toggleStatus(id: string, isActive: boolean) {
    return this.client.patch<ApiResponse<ShiftTemplate>>(
      `${this.basePath}/shift-templates/${id}/status`,
      { isActive }
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
  // Schedules
  // ============================================================================

  /**
   * Lists all schedules with optional filters
   */
  async listSchedules(filters?: { date?: string; status?: string }) {
    const queryParams = new URLSearchParams();
    if (filters?.date) queryParams.append('date', filters.date);
    if (filters?.status) queryParams.append('status', filters.status);

    const queryString = queryParams.toString();
    const url = `${this.basePath}/schedules${queryString ? `?${queryString}` : ''}`;
    
    return this.client.get<ApiResponse<any>>(url);
  }

  /**
   * Gets a single schedule by ID
   */
  async getSchedule(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/schedules/${id}`
    );
  }

  /**
   * Creates a new schedule
   */
  async createSchedule(data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/schedules`,
      data
    );
  }

  /**
   * Updates an existing schedule
   */
  async updateSchedule(id: string, data: any) {
    return this.client.put<ApiResponse<any>>(
      `${this.basePath}/schedules/${id}`,
      data
    );
  }

  /**
   * Deletes a schedule (soft delete)
   */
  async deleteSchedule(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/schedules/${id}`
    );
  }

  /**
   * Publishes a schedule to make it active
   */
  async publishSchedule(id: string) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/schedules/${id}/publish`,
      {}
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
  // Stations
  // ============================================================================

  /**
   * Get all stations with optional filters
   */
  async getAllStations(filters?: { search?: string; isActive?: boolean }) {
    const queryParams = new URLSearchParams();
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.isActive !== undefined) queryParams.append('isActive', String(filters.isActive));
    
    const queryString = queryParams.toString();
    const url = `${this.basePath}/stations${queryString ? `?${queryString}` : ''}`;
    
    return this.client.get<ApiResponse<any[]>>(url);
  }

  /**
   * Get a single station by ID
   */
  async getStation(id: string) {
    return this.client.get<ApiResponse<any>>(
      `${this.basePath}/stations/${id}`
    );
  }

  /**
   * Create a new station
   */
  async createStation(data: any) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/stations`,
      data
    );
  }

  /**
   * Update an existing station
   */
  async updateStation(id: string, updates: any) {
    return this.client.patch<ApiResponse<any>>(
      `${this.basePath}/stations/${id}`,
      updates
    );
  }

  /**
   * Delete a station (soft delete)
   */
  async deleteStation(id: string) {
    return this.client.delete<ApiResponse<void>>(
      `${this.basePath}/stations/${id}`
    );
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

  // ============================================================================
  // Employee Self-Service - Time & Attendance (Phase 2 & 3)
  // ============================================================================

  /**
   * Clock in (employee self-service)
   * @param location Optional geolocation coordinates
   */
  async clockIn(location?: { latitude: number; longitude: number }) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/clock-in`,
      { location }
    );
  }

  /**
   * Clock out (employee self-service)
   * @param location Optional geolocation coordinates
   */
  async clockOut(location?: { latitude: number; longitude: number }) {
    return this.client.post<ApiResponse<any>>(
      `${this.basePath}/clock-out`,
      { location }
    );
  }

  /**
   * Get current clock status for authenticated employee
   */
  async getClockStatus() {
    return this.client.get<ApiResponse<{
      isClockedIn: boolean;
      currentEvent: any | null;
      lastClockIn: string | null;
      lastClockOut: string | null;
    }>>(
      `${this.basePath}/clock-status`
    );
  }

  /**
   * Get employee shifts (employee self-service)
   * @param filters Optional date and range filters
   */
  async getEmployeeShifts(filters?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filters?.date) queryParams.append('date', filters.date);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.status) queryParams.append('status', filters.status);

    const queryString = queryParams.toString();
    const url = `${this.basePath}/employee-shifts${queryString ? `?${queryString}` : ''}`;
    
    return this.client.get<ApiResponse<Shift[]>>(url);
  }
}
