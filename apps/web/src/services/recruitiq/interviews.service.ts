import { RecruitIQAPI, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const recruitiqClient = new RecruitIQAPI(apiClient);

export const interviewsService = {
  async listInterviews(filters?: any) {
    const response = await recruitiqClient.getInterviews(filters);
    return response.data.interviews || response.data;
  },

  async getInterview(id: string) {
    const response = await recruitiqClient.getInterview(id);
    return response.data.interview || response.data;
  },

  async createInterview(data: any) {
    const response = await recruitiqClient.createInterview(data);
    return response.data.interview || response.data;
  },

  async updateInterview(id: string, data: any) {
    const response = await recruitiqClient.updateInterview(id, data);
    return response.data.interview || response.data;
  },

  async deleteInterview(id: string) {
    await recruitiqClient.deleteInterview(id);
  },

  // Note: Using createInterview as scheduleInterview doesn't exist in RecruitIQAPI
  async scheduleInterview(data: any) {
    const response = await recruitiqClient.createInterview(data);
    return response.data.interview || response.data;
  },

  // Note: Using submitInterviewFeedback as recordFeedback doesn't exist in RecruitIQAPI
  async recordFeedback(interviewId: string, feedback: any) {
    const response = await recruitiqClient.submitInterviewFeedback(interviewId, feedback);
    return response.data;
  },
};
