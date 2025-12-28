import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const performanceService = {
  /**
   * Lists performance reviews
   */
  async listPerformanceReviews(filters?: { search?: string; employeeId?: string; status?: string; year?: number }) {
    const response = await nexusClient.listPerformanceReviews?.(filters);
    return response?.data?.reviews || response?.data || [];
  },

  /**
   * Gets a single performance review
   */
  async getPerformanceReview(reviewId: string) {
    const response = await nexusClient.getPerformanceReview?.(reviewId);
    return response?.data?.review || response?.data;
  },

  /**
   * Creates a new performance review
   */
  async createPerformanceReview(data: any) {
    const response = await nexusClient.createPerformanceReview?.(data);
    return response?.data?.review || response?.data;
  },

  /**
   * Updates a performance review
   */
  async updatePerformanceReview(reviewId: string, data: any) {
    const response = await nexusClient.updatePerformanceReview?.(reviewId, data);
    return response?.data?.review || response?.data;
  },

  /**
   * Deletes a performance review
   */
  async deletePerformanceReview(reviewId: string) {
    await nexusClient.deletePerformanceReview?.(reviewId);
  },

  /**
   * Lists goals for an employee
   */
  async listGoals(employeeId?: string, filters?: any) {
    const response = await nexusClient.listGoals?.(employeeId, filters);
    return response?.data?.goals || response?.data || [];
  },

  /**
   * Creates a goal
   */
  async createGoal(data: any) {
    const response = await nexusClient.createGoal?.(data);
    return response?.data?.goal || response?.data;
  },

  /**
   * Updates goal progress
   */
  async updateGoalProgress(goalId: string, progress: number) {
    const response = await nexusClient.updateGoalProgress?.(goalId, progress);
    return response?.data?.goal || response?.data;
  },

  /**
   * Gets performance statistics for an employee
   */
  async getPerformanceStatistics(employeeId: string) {
    const response = await nexusClient.getPerformanceStatistics?.(employeeId);
    return response?.data?.statistics || response?.data;
  },
};
