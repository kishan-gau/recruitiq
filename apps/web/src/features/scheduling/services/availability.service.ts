import { APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();

export const availabilityService = {
  /**
   * Gets worker availability for a date range
   */
  async getWorkerAvailability(workerId: string, startDate: string, endDate: string) {
    try {
      const response = await apiClient.get(`/api/products/schedulehub/workers/${workerId}/availability`, {
        params: { startDate, endDate },
      });
      return response.data.availability || response.data || [];
    } catch (error) {
      console.error(`Failed to get worker ${workerId} availability:`, error);
      throw error;
    }
  },

  /**
   * Updates worker availability
   */
  async updateWorkerAvailability(workerId: string, availability: any) {
    try {
      const response = await apiClient.put(
        `/api/products/schedulehub/workers/${workerId}/availability`,
        availability
      );
      return response.data.availability || response.data;
    } catch (error) {
      console.error(`Failed to update worker ${workerId} availability:`, error);
      throw error;
    }
  },

  /**
   * Gets availability conflicts for scheduling
   */
  async checkAvailabilityConflicts(workerId: string, shiftData: any) {
    try {
      const response = await apiClient.post(
        `/api/products/schedulehub/workers/${workerId}/availability/check`,
        shiftData
      );
      return response.data.conflicts || response.data || [];
    } catch (error) {
      console.error(`Failed to check availability conflicts for worker ${workerId}:`, error);
      throw error;
    }
  },

  /**
   * Bulk availability check for multiple workers
   */
  async bulkCheckAvailability(shiftData: any) {
    try {
      const response = await apiClient.post(
        '/api/products/schedulehub/availability/bulk-check',
        shiftData
      );
      return response.data.results || response.data || [];
    } catch (error) {
      console.error('Failed to bulk check availability:', error);
      throw error;
    }
  },
};
