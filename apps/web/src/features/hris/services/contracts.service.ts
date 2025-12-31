import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const contractsService = {
  /**
   * Lists contracts with optional filtering
   */
  async listContracts(filters?: { search?: string; _employeeId?: string; status?: string; contractType?: string }) {
    const response = await nexusClient.listContracts?.(filters);
    return response?.data?.contracts || response?.data || [];
  },

  /**
   * Gets a single contract by ID
   */
  async getContract(contractId: string) {
    const response = await nexusClient.getContract?.(contractId);
    return response?.data?.contract || response?.data;
  },

  /**
   * Creates a new contract
   */
  async createContract(data: any) {
    const response = await nexusClient.createContract?.(data);
    return response?.data?.contract || response?.data;
  },

  /**
   * Updates a contract
   */
  async updateContract(contractId: string, data: any) {
    const response = await nexusClient.updateContract?.(contractId, data);
    return response?.data?.contract || response?.data;
  },

  /**
   * Deletes a contract
   */
  async deleteContract(contractId: string) {
    await nexusClient.deleteContract?.(contractId);
  },

  /**
   * Gets contracts for an employee
   */
  async getEmployeeContracts(_employeeId: string) {
    const response = await nexusClient.getEmployeeContracts?.(_employeeId);
    return response?.data?.contracts || response?.data || [];
  },

  /**
   * Generates contract from template
   */
  async generateFromTemplate(templateId: string, data: any) {
    const response = await nexusClient.generateFromTemplate(templateId, data);
    return response?.data?.contract || response?.data;
  },
};
