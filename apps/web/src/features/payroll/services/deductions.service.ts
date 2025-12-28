import { PaylinqClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const payLinQClient = new PaylinqClient(apiClient);

export const deductionsService = {
  async getDeductions(filters?: any) {
    const response = await payLinQClient.getDeductions(filters);
    return response.data;
  },

  async getDeduction(id: string) {
    const response = await payLinQClient.getDeduction(id);
    return response.data;
  },

  async createDeduction(data: any) {
    const response = await payLinQClient.createDeduction(data);
    return response.data;
  },

  async updateDeduction(id: string, data: any) {
    const response = await payLinQClient.updateDeduction(id, data);
    return response.data;
  },

  async deleteDeduction(id: string) {
    await payLinQClient.deleteDeduction(id);
  },
};
