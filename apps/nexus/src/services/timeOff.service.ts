/**
 * Time Off API Service
 */

import { apiClient } from './api';
import type {
  TimeOffRequest,
  TimeOffBalance,
  TimeOffPolicy,
  CreateTimeOffRequestDTO,
  UpdateTimeOffRequestDTO,
  ReviewTimeOffRequestDTO,
  TimeOffRequestFilters,
  TimeOffCalendarEvent,
} from '@/types/timeOff.types';

// API response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const timeOffService = {
  // ============ Requests ============
  
  /**
   * List all time-off requests with optional filters
   */
  listRequests: async (filters?: TimeOffRequestFilters): Promise<TimeOffRequest[]> => {
    const { data } = await apiClient.get<ApiResponse<TimeOffRequest[]>>('/time-off/requests', {
      params: filters,
    });
    return data.data;
  },

  /**
   * Get a single time-off request by ID
   */
  getRequest: async (id: string): Promise<TimeOffRequest> => {
    const { data } = await apiClient.get<ApiResponse<TimeOffRequest>>(`/time-off/requests/${id}`);
    return data.data;
  },

  /**
   * Get all time-off requests for a specific employee
   */
  getEmployeeRequests: async (employeeId: string): Promise<TimeOffRequest[]> => {
    const { data } = await apiClient.get<ApiResponse<TimeOffRequest[]>>(
      `/time-off/requests/employee/${employeeId}`
    );
    return data.data;
  },

  /**
   * Create a new time-off request
   */
  createRequest: async (request: CreateTimeOffRequestDTO): Promise<TimeOffRequest> => {
    const { data } = await apiClient.post<ApiResponse<TimeOffRequest>>(
      '/time-off/requests',
      request
    );
    return data.data;
  },

  /**
   * Update a time-off request
   */
  updateRequest: async (id: string, updates: UpdateTimeOffRequestDTO): Promise<TimeOffRequest> => {
    const { data } = await apiClient.patch<ApiResponse<TimeOffRequest>>(
      `/time-off/requests/${id}`,
      updates
    );
    return data.data;
  },

  /**
   * Delete a time-off request
   */
  deleteRequest: async (id: string): Promise<void> => {
    await apiClient.delete(`/time-off/requests/${id}`);
  },

  /**
   * Approve or reject a time-off request
   */
  reviewRequest: async (
    id: string,
    review: ReviewTimeOffRequestDTO
  ): Promise<TimeOffRequest> => {
    const { data } = await apiClient.post<ApiResponse<TimeOffRequest>>(
      `/time-off/requests/${id}/review`,
      review
    );
    return data.data;
  },

  /**
   * Cancel a time-off request
   */
  cancelRequest: async (id: string): Promise<TimeOffRequest> => {
    const { data } = await apiClient.post<ApiResponse<TimeOffRequest>>(
      `/time-off/requests/${id}/cancel`
    );
    return data.data;
  },

  // ============ Balances ============

  /**
   * Get time-off balances for an employee
   */
  getEmployeeBalances: async (employeeId: string, year?: number): Promise<TimeOffBalance[]> => {
    const { data } = await apiClient.get<ApiResponse<TimeOffBalance[]>>(
      `/time-off/balances/employee/${employeeId}`,
      {
        params: { year },
      }
    );
    return data.data;
  },

  /**
   * Get all balances for the organization
   */
  listBalances: async (year?: number): Promise<TimeOffBalance[]> => {
    const { data } = await apiClient.get<ApiResponse<TimeOffBalance[]>>('/time-off/balances', {
      params: { year },
    });
    return data.data;
  },

  // ============ Policies ============

  /**
   * List all time-off policies
   */
  listPolicies: async (): Promise<TimeOffPolicy[]> => {
    const { data } = await apiClient.get<ApiResponse<TimeOffPolicy[]>>('/time-off/policies');
    return data.data;
  },

  /**
   * Get a single policy by ID
   */
  getPolicy: async (id: string): Promise<TimeOffPolicy> => {
    const { data } = await apiClient.get<ApiResponse<TimeOffPolicy>>(`/time-off/policies/${id}`);
    return data.data;
  },

  // ============ Calendar ============

  /**
   * Get calendar events for time-off requests
   */
  getCalendarEvents: async (startDate: string, endDate: string): Promise<TimeOffCalendarEvent[]> => {
    const { data } = await apiClient.get<ApiResponse<TimeOffCalendarEvent[]>>(
      '/time-off/calendar',
      {
        params: { startDate, endDate },
      }
    );
    return data.data;
  },
};
