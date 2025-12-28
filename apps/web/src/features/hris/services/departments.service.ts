import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const departmentsService = {
  async listDepartments(filters?: any) {
    const response = await nexusClient.listDepartments(filters);
    return response.data.departments || response.data;
  },

  async getDepartment(id: string) {
    const response = await nexusClient.getDepartment(id);
    return response.data.department || response.data;
  },

  async createDepartment(data: any) {
    const response = await nexusClient.createDepartment(data);
    return response.data.department || response.data;
  },

  async updateDepartment(id: string, data: any) {
    const response = await nexusClient.updateDepartment(id, data);
    return response.data.department || response.data;
  },

  async deleteDepartment(id: string) {
    await nexusClient.deleteDepartment(id);
  },
};
