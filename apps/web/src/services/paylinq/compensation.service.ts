import { PaylinqClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const payLinQClient = new PaylinqClient(apiClient);

export const compensationService = {
  async getCompensation(filters?: any) {
    const response = await payLinQClient.getCompensation(filters);
    return response.data;
  },

  async getCompensationById(id: string) {
    const response = await payLinQClient.getCompensationById(id);
    return response.data;
  },

  async createCompensation(data: any) {
    const response = await payLinQClient.createCompensation(data);
    return response.data;
  },

  async updateCompensation(id: string, data: any) {
    const response = await payLinQClient.updateCompensation(id, data);
    return response.data;
  },

  async deleteCompensation(id: string) {
    await payLinQClient.deleteCompensation(id);
  },
};
