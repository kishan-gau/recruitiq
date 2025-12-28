import { ScheduleHubClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const schedulehubClient = new ScheduleHubClient(apiClient);

export const workersService = {
  /**
   * Lists all workers with optional filters
   */
  async listWorkers(filters?: { status?: string; departmentId?: string }) {
    const response = await apiClient.get('/api/products/schedulehub/workers', { params: filters });
    return response.data?.workers || response.data || [];
  },

  /**
   * Gets a single worker by ID
   */
  async getWorker(id: string) {
    const response = await apiClient.get(`/api/products/schedulehub/workers/${id}`);
    return response.data?.worker || response.data;
  },

  /**
   * Creates a new worker
   */
  async createWorker(data: any) {
    const response = await apiClient.post('/api/products/schedulehub/workers', data);
    return response.data?.worker || response.data;
  },

  /**
   * Updates an existing worker
   */
  async updateWorker(id: string, data: any) {
    const response = await apiClient.put(`/api/products/schedulehub/workers/${id}`, data);
    return response.data?.worker || response.data;
  },

  /**
   * Deletes a worker (soft delete)
   */
  async deleteWorker(id: string) {
    await apiClient.delete(`/api/products/schedulehub/workers/${id}`);
  },

  /**
   * Assigns a worker to a shift
   */
  async assignToShift(workerId: string, shiftId: string) {
    const response = await apiClient.post(`/api/products/schedulehub/workers/${workerId}/assign`, { shiftId });
    return response.data;
  },

  /**
   * Gets availability for a worker (using ScheduleHubClient)
   */
  async getAvailability(employeeId: string) {
    const response = await schedulehubClient.getAvailability(employeeId);
    return response.data?.availability || response.data || [];
  },

  /**
   * Creates availability rule for a worker
   */
  async createAvailability(data: any) {
    const response = await schedulehubClient.createAvailability(data);
    return response.data?.availability || response.data;
  },

  /**
   * Updates availability rule
   */
  async updateAvailability(id: string, data: any) {
    const response = await schedulehubClient.updateAvailability(id, data);
    return response.data?.availability || response.data;
  },

  /**
   * Deletes availability rule
   */
  async deleteAvailability(id: string) {
    await schedulehubClient.deleteAvailability(id);
  },
};
