/**
 * RecruitIQ Jobs Service
 * 
 * Wraps RecruitIQAPI jobs methods
 */
import { RecruitIQAPI, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const recruitiqClient = new RecruitIQAPI(apiClient);

export const jobsService = {
  /**
   * Get all jobs with filters
   */
  async getJobs(params = {}) {
    const response = await recruitiqClient.getJobs(params);
    return response.jobs || response.data;
  },

  /**
   * Get job by ID
   */
  async getJob(id: string) {
    const response = await recruitiqClient.getJob(id);
    return response.job || response.data;
  },

  /**
   * Create new job
   */
  async createJob(data: any) {
    const response = await recruitiqClient.createJob(data);
    return response.job || response.data;
  },

  /**
   * Update job
   */
  async updateJob(id: string, data: any) {
    const response = await recruitiqClient.updateJob(id, data);
    return response.job || response.data;
  },

  /**
   * Delete job
   */
  async deleteJob(id: string) {
    const response = await recruitiqClient.deleteJob(id);
    return response;
  },

  /**
   * Get public jobs (no auth required)
   */
  async getPublicJobs() {
    const response = await recruitiqClient.getPublicJobs();
    return response.jobs || response.data;
  },

  /**
   * Get public job by ID (no auth required)
   */
  async getPublicJob(id: string) {
    const response = await recruitiqClient.getPublicJob(id);
    return response.job || response.data;
  },
};
