import { RecruitIQAPI, APIClient } from '@recruitiq/api-client';

// Singleton instances
const apiClient = new APIClient();
const recruitiqClient = new RecruitIQAPI(apiClient);

export const jobsService = {
  /**
   * Lists all jobs with optional filters and pagination
   */
  async listJobs(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    location?: string;
    employmentType?: string;
    workspaceId?: string;
  }) {
    const response = await recruitiqClient.getJobs(filters);
    return response.jobs || response.data;
  },

  /**
   * Gets a single job by ID
   */
  async getJob(id: string) {
    const response = await recruitiqClient.getJob(id);
    return response.job || response.data;
  },

  /**
   * Creates a new job
   */
  async createJob(data: {
    title: string;
    description: string;
    workspaceId: string;
    location?: string;
    employmentType?: string;
    salaryMin?: number;
    salaryMax?: number;
    requirements?: string[];
    skills?: string[];
  }) {
    const response = await recruitiqClient.createJob(data);
    return response.job || response.data;
  },

  /**
   * Updates an existing job
   */
  async updateJob(id: string, updates: Partial<any>) {
    const response = await recruitiqClient.updateJob(id, updates);
    return response.job || response.data;
  },

  /**
   * Deletes a job (soft delete)
   */
  async deleteJob(id: string) {
    await recruitiqClient.deleteJob(id);
  },

  /**
   * Gets job statistics for dashboard
   */
  async getJobStatistics() {
    const response = await recruitiqClient.getJobStatistics();
    return response.data || response;
  },

  /**
   * Gets public jobs (for career page)
   */
  async getPublicJobs(filters?: any) {
    const response = await recruitiqClient.getPublicJobs(filters);
    return response.jobs || response.data;
  },

  /**
   * Publishes a job
   */
  async publishJob(id: string) {
    const response = await recruitiqClient.publishJob(id);
    return response.job || response.data;
  },

  /**
   * Unpublishes a job
   */
  async unpublishJob(id: string) {
    const response = await recruitiqClient.unpublishJob(id);
    return response.job || response.data;
  }
};