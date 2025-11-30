import { APIClient } from '../core/client';
import type { ApiResponse } from '@recruitiq/types';

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
}
