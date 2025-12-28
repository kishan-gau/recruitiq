import { PaylinqClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const payLinQClient = new PaylinqClient(apiClient);

export const taxService = {
  async getTaxRules(filters?: any) {
    const response = await payLinQClient.getTaxRules(filters);
    return response.data;
  },

  async getTaxRule(id: string) {
    const response = await payLinQClient.getTaxRule(id);
    return response.data;
  },

  async createTaxRule(data: any) {
    const response = await payLinQClient.createTaxRule(data);
    return response.data;
  },

  async updateTaxRule(id: string, data: any) {
    const response = await payLinQClient.updateTaxRule(id, data);
    return response.data;
  },

  async deleteTaxRule(id: string) {
    await payLinQClient.deleteTaxRule(id);
  },
};
