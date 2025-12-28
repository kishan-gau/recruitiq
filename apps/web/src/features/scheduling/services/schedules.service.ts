import { ScheduleHubClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const schedulehubClient = new ScheduleHubClient(apiClient);

export const schedulesService = {
  /**
   * Lists all schedules with optional filters
   */
  async listSchedules(filters?: { date?: string; status?: string }) {
    const response = await schedulehubClient.listSchedules(filters);
    return response.data?.schedules || response.data || [];
  },

  /**
   * Gets a single schedule by ID
   */
  async getSchedule(id: string) {
    const response = await schedulehubClient.getSchedule(id);
    return response.data?.schedule || response.data;
  },

  /**
   * Creates a new schedule
   */
  async createSchedule(data: any) {
    const response = await schedulehubClient.createSchedule(data);
    return response.data?.schedule || response.data;
  },

  /**
   * Updates an existing schedule
   */
  async updateSchedule(id: string, data: any) {
    const response = await schedulehubClient.updateSchedule(id, data);
    return response.data?.schedule || response.data;
  },

  /**
   * Deletes a schedule (soft delete)
   */
  async deleteSchedule(id: string) {
    await schedulehubClient.deleteSchedule(id);
  },

  /**
   * Publishes a schedule to make it active
   */
  async publishSchedule(id: string) {
    const response = await schedulehubClient.publishSchedule(id);
    return response.data?.schedule || response.data;
  },
};
