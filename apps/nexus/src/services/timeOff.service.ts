/**
 * Time Off API Service
 * NOW USES: @recruitiq/api-client for type-safe API calls
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';
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

// Create singleton instance
const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const timeOffService = {
  // ============ Requests ============
  
  /**
   * List all time-off requests with optional filters
   */
  listRequests: async (filters?: TimeOffRequestFilters): Promise<TimeOffRequest[]> => {
    const response = await nexusClient.listTimeOffRequests(filters);
    // Backend returns { success: true, data: { requests: [...], total, limit, offset } }
    return response.data.requests as TimeOffRequest[];
  },

  /**
   * Get a single time-off request by ID
   */
  getRequest: async (id: string): Promise<TimeOffRequest> => {
    const response = await nexusClient.getTimeOffRequest(id);
    return response.data as TimeOffRequest;
  },

  /**
   * Get all time-off requests for a specific employee
   */
  getEmployeeRequests: async (employeeId: string): Promise<TimeOffRequest[]> => {
    const response = await nexusClient.getEmployeeTimeOffRequests(employeeId);
    return response.data as TimeOffRequest[];
  },

  /**
   * Create a new time-off request
   */
  createRequest: async (request: CreateTimeOffRequestDTO): Promise<TimeOffRequest> => {
    const response = await nexusClient.createTimeOffRequest(request);
    return response.data as TimeOffRequest;
  },

  /**
   * Update a time-off request
   */
  updateRequest: async (id: string, updates: UpdateTimeOffRequestDTO): Promise<TimeOffRequest> => {
    const response = await nexusClient.updateTimeOffRequest(id, updates);
    return response.data as TimeOffRequest;
  },

  /**
   * Delete a time-off request
   */
  deleteRequest: async (id: string): Promise<void> => {
    await nexusClient.deleteTimeOffRequest(id);
  },

  /**
   * Approve or reject a time-off request
   */
  reviewRequest: async (
    id: string,
    review: ReviewTimeOffRequestDTO
  ): Promise<TimeOffRequest> => {
    const response = await nexusClient.reviewTimeOffRequest(id, review);
    return response.data as TimeOffRequest;
  },

  /**
   * Cancel a time-off request
   */
  cancelRequest: async (id: string): Promise<TimeOffRequest> => {
    const response = await nexusClient.cancelTimeOffRequest(id);
    return response.data as TimeOffRequest;
  },

  // ============ Balances ============

  /**
   * Get time-off balances for an employee
   */
  getEmployeeBalances: async (employeeId: string, year?: number): Promise<TimeOffBalance[]> => {
    const response = await nexusClient.getEmployeeTimeOffBalances(employeeId, year);
    return response.data as TimeOffBalance[];
  },

  /**
   * Get all balances for the organization
   */
  listBalances: async (year?: number): Promise<TimeOffBalance[]> => {
    const response = await nexusClient.listTimeOffBalances(year);
    return response.data as TimeOffBalance[];
  },

  // ============ Policies ============

  /**
   * List all time-off policies
   */
  listPolicies: async (): Promise<TimeOffPolicy[]> => {
    const response = await nexusClient.listTimeOffPolicies();
    return response.data as TimeOffPolicy[];
  },

  /**
   * Get a single policy by ID
   */
  getPolicy: async (id: string): Promise<TimeOffPolicy> => {
    const response = await nexusClient.getTimeOffPolicy(id);
    return response.data as TimeOffPolicy;
  },

  // ============ Calendar ============

  /**
   * Get calendar events for time-off requests
   */
  getCalendarEvents: async (startDate: string, endDate: string): Promise<TimeOffCalendarEvent[]> => {
    const response = await nexusClient.getTimeOffCalendarEvents(startDate, endDate);
    return response.data as TimeOffCalendarEvent[];
  },
};
