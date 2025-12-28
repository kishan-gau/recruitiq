import { ScheduleHubClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const schedulehubClient = new ScheduleHubClient(apiClient);

export const shiftsService = {
  /**
   * Lists all shifts with optional filters
   */
  async listShifts(filters?: { date?: string; stationId?: string; status?: string }) {
    const response = await schedulehubClient.getAllShifts(filters);
    return response.data?.shifts || response.data || [];
  },

  /**
   * Gets a single shift by ID
   */
  async getShift(id: string) {
    // Note: ScheduleHubClient doesn't have getShift yet, filter from list
    const response = await schedulehubClient.getAllShifts({});
    const shifts = response.data?.shifts || response.data || [];
    return shifts.find((s: any) => s.id === id) || null;
  },

  /**
   * Creates a new shift
   */
  async createShift(data: any) {
    // Direct API call since ScheduleHubClient doesn't have shift CRUD yet
    const response = await apiClient.post('/products/schedulehub/shifts', data);
    return response.data?.shift || response.data;
  },

  /**
   * Updates an existing shift
   */
  async updateShift(id: string, updates: any) {
    // Direct API call since ScheduleHubClient doesn't have shift CRUD yet
    const response = await apiClient.put(`/products/schedulehub/shifts/${id}`, updates);
    return response.data?.shift || response.data;
  },

  /**
   * Deletes a shift (soft delete)
   */
  async deleteShift(id: string) {
    // Direct API call since ScheduleHubClient doesn't have shift CRUD yet
    await apiClient.delete(`/products/schedulehub/shifts/${id}`);
  },
};
