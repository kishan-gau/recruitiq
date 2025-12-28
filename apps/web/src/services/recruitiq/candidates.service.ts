import { RecruitIQAPI, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const recruitiqClient = new RecruitIQAPI(apiClient);

export const candidatesService = {
  async listCandidates(filters?: any) {
    const response = await recruitiqClient.getCandidates(filters);
    return response.data.candidates || response.data;
  },

  async getCandidate(id: string) {
    const response = await recruitiqClient.getCandidate(id);
    return response.data.candidate || response.data;
  },

  async createCandidate(data: any) {
    const response = await recruitiqClient.createCandidate(data);
    return response.data.candidate || response.data;
  },

  async updateCandidate(id: string, data: any) {
    const response = await recruitiqClient.updateCandidate(id, data);
    return response.data.candidate || response.data;
  },

  async deleteCandidate(id: string) {
    await recruitiqClient.deleteCandidate(id);
  },
};
