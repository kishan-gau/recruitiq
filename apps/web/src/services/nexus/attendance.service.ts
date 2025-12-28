import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const attendanceService = {
  async listAttendanceRecords(filters?: any) {
    const response = await nexusClient.listAttendanceRecords(filters);
    return response.data.attendanceRecords || response.data;
  },

  async getAttendanceRecord(id: string) {
    const response = await nexusClient.getAttendanceRecord(id);
    return response.data.attendanceRecord || response.data;
  },

  async createAttendanceRecord(data: any) {
    const response = await nexusClient.createAttendanceRecord(data);
    return response.data.attendanceRecord || response.data;
  },

  async updateAttendanceRecord(id: string, data: any) {
    const response = await nexusClient.updateAttendanceRecord(id, data);
    return response.data.attendanceRecord || response.data;
  },

  async deleteAttendanceRecord(id: string) {
    await nexusClient.deleteAttendanceRecord(id);
  },

  async getAttendanceStatistics() {
    const response = await nexusClient.getAttendanceStatistics();
    return response.data?.statistics || response.data || {
      totalRecords: 0,
      present: 0,
      absent: 0,
      late: 0,
    };
  },
};
