import { RecruitIQAPI, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const recruitiqClient = new RecruitIQAPI(apiClient);

export const jobsService = {
  async listJobs(params: Record<string, any> = {}) {
    const response = await recruitiqClient.getJobs(params);
    return response.data.jobs || response.data;
  },

  async getJob(id: string) {
    const response = await recruitiqClient.getJob(id);
    return response.data.job || response.data;
  },

  async createJob(data: any) {
    const response = await recruitiqClient.createJob(data);
    return response.data.job || response.data;
  },
};
