import { NexusClient, APIClient } from '@recruitiq/api-client';
import type { TimeOffRequest, CreateTimeOffRequestDTO, UpdateTimeOffRequestDTO, TimeOffBalance } from '@/types/timeoff.types';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const timeoffService = {
  async listTimeOffRequests(filters?: any): Promise<TimeOffRequest[]> {
    const response = await nexusClient.listTimeOffRequests(filters);
    return response.data;
  },

  async getTimeOffRequest(id: string): Promise<TimeOffRequest> {
    const response = await nexusClient.getTimeOffRequest(id);
    return response.data;
  },

  async createTimeOffRequest(data: CreateTimeOffRequestDTO): Promise<TimeOffRequest> {
    const response = await nexusClient.createTimeOffRequest(data);
    return response.data;
  },

  async updateTimeOffRequest(id: string, data: UpdateTimeOffRequestDTO): Promise<TimeOffRequest> {
    const response = await nexusClient.updateTimeOffRequest(id, data);
    return response.data;
  },

  async deleteTimeOffRequest(id: string): Promise<void> {
    await nexusClient.deleteTimeOffRequest(id);
  },

  async reviewTimeOffRequest(id: string, review: { status: 'approved' | 'rejected'; reviewNotes?: string }): Promise<TimeOffRequest> {
    const response = await nexusClient.reviewTimeOffRequest(id, review);
    return response.data;
  },

  async approveTimeOffRequest(id: string, reviewNotes?: string): Promise<TimeOffRequest> {
    return this.reviewTimeOffRequest(id, { status: 'approved', reviewNotes });
  },

  async rejectTimeOffRequest(id: string, reviewNotes?: string): Promise<TimeOffRequest> {
    return this.reviewTimeOffRequest(id, { status: 'rejected', reviewNotes });
  },

  async getEmployeeTimeOffBalance(employeeId: string, year?: number): Promise<TimeOffBalance[]> {
    const response = await nexusClient.getEmployeeTimeOffBalances(employeeId, year);
    return response.data;
  },
};
