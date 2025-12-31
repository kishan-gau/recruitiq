/**
 * Scheduling Service
 * General scheduling operations and utilities
 */

import { apiClient } from '@recruitiq/api-client';

export const schedulingService = {
  /**
   * Get available workers for a shift
   */
  async getAvailableWorkers(params: {
    shiftId?: string;
    startTime?: string;
    endTime?: string;
    roleId?: string;
    stationId?: string;
    date?: string;
  }) {
    try {
      const response = await apiClient.get('/api/products/schedulehub/scheduling/available-workers', {
        params,
      });
      return response.data.workers || response.data;
    } catch (error) {
      console.error('Failed to get available workers:', error);
      throw error;
    }
  },

  /**
   * Assign worker to shift
   */
  async assignWorkerToShift(shiftId: string, workerId: string) {
    try {
      const response = await apiClient.post(`/api/products/schedulehub/scheduling/shifts/${shiftId}/assign`, {
        workerId,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to assign worker to shift:', error);
      throw error;
    }
  },

  /**
   * Unassign worker from shift
   */
  async unassignWorkerFromShift(shiftId: string) {
    try {
      const response = await apiClient.post(`/api/products/schedulehub/scheduling/shifts/${shiftId}/unassign`);
      return response.data;
    } catch (error) {
      console.error('Failed to unassign worker from shift:', error);
      throw error;
    }
  },

  /**
   * Check for scheduling conflicts
   */
  async checkConflicts(params: {
    workerId: string;
    startTime: string;
    endTime: string;
    excludeShiftId?: string;
  }) {
    try {
      const response = await apiClient.post('/api/products/schedulehub/scheduling/check-conflicts', params);
      return response.data;
    } catch (error) {
      console.error('Failed to check scheduling conflicts:', error);
      throw error;
    }
  },

  /**
   * Generate optimal schedule
   */
  async generateSchedule(params: {
    startDate: string;
    endDate: string;
    stationIds?: string[];
    roleIds?: string[];
  }) {
    try {
      const response = await apiClient.post('/api/products/schedulehub/scheduling/generate', params);
      return response.data;
    } catch (error) {
      console.error('Failed to generate schedule:', error);
      throw error;
    }
  },

  /**
   * Publish schedule
   */
  async publishSchedule(scheduleId: string) {
    try {
      const response = await apiClient.post(`/api/products/schedulehub/scheduling/schedules/${scheduleId}/publish`);
      return response.data;
    } catch (error) {
      console.error('Failed to publish schedule:', error);
      throw error;
    }
  },
};
