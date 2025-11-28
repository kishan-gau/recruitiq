/**
 * Time-Off Type Management Service
 * Handles time-off type configuration and accrual management
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';
import type {
  TimeOffTypeConfig,
  CreateTimeOffTypeDTO,
  UpdateTimeOffTypeDTO,
  AccrueTimeOffDTO,
  AccrualTransaction,
  TimeOffTypeFilters,
  TimeOffTypeStats
} from '../types/timeOffTypes.types';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const timeOffTypesService = {
  /**
   * List all time-off types with optional filters
   */
  async listTimeOffTypes(filters?: TimeOffTypeFilters): Promise<TimeOffTypeConfig[]> {
    const response = await nexusClient.listTimeOffTypes();
    let types = response.data.timeOffTypes || response.data || [];
    
    // Client-side filtering if needed
    if (filters) {
      if (filters.isActive !== undefined) {
        types = types.filter((type: TimeOffTypeConfig) => type.isActive === filters.isActive);
      }
      if (filters.accrualEnabled !== undefined) {
        types = types.filter((type: TimeOffTypeConfig) => type.accrualEnabled === filters.accrualEnabled);
      }
      if (filters.requiresApproval !== undefined) {
        types = types.filter((type: TimeOffTypeConfig) => type.requiresApproval === filters.requiresApproval);
      }
      if (filters.isPaid !== undefined) {
        types = types.filter((type: TimeOffTypeConfig) => type.isPaid === filters.isPaid);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        types = types.filter((type: TimeOffTypeConfig) => 
          type.typeName.toLowerCase().includes(searchLower) ||
          type.typeCode.toLowerCase().includes(searchLower) ||
          type.description?.toLowerCase().includes(searchLower)
        );
      }
    }
    
    return types;
  },

  /**
   * Get time-off type by ID
   */
  async getTimeOffType(id: string): Promise<TimeOffTypeConfig> {
    const response = await nexusClient.getTimeOffType(id);
    return response.data.timeOffType || response.data;
  },

  /**
   * Create new time-off type
   */
  async createTimeOffType(data: CreateTimeOffTypeDTO): Promise<TimeOffTypeConfig> {
    const response = await nexusClient.createTimeOffType(data);
    return response.data.timeOffType || response.data;
  },

  /**
   * Update time-off type
   */
  async updateTimeOffType(id: string, updates: UpdateTimeOffTypeDTO): Promise<TimeOffTypeConfig> {
    const response = await nexusClient.updateTimeOffType(id, updates);
    return response.data.timeOffType || response.data;
  },

  /**
   * Delete time-off type
   */
  async deleteTimeOffType(id: string): Promise<void> {
    await nexusClient.deleteTimeOffType(id);
  },

  /**
   * Accrue time-off for an employee
   */
  async accrueTimeOff(data: AccrueTimeOffDTO): Promise<AccrualTransaction> {
    const response = await nexusClient.accrueTimeOff(data);
    return response.data.accrual || response.data;
  },

  /**
   * Get employee time-off balances for all types
   */
  async getEmployeeBalances(employeeId: string, year?: number) {
    const response = await nexusClient.getEmployeeTimeOffBalances(employeeId, year);
    return response.data.balances || response.data;
  },

  /**
   * Get accrual history for an employee
   */
  async getAccrualHistory(employeeId: string, timeOffTypeId?: string) {
    // This would need a backend endpoint - placeholder for now
    // const response = await nexusClient.getAccrualHistory(employeeId, timeOffTypeId);
    // return response.data.transactions || response.data;
    return [];
  },

  /**
   * Get time-off type usage statistics
   */
  async getTypeStats(typeId: string, year: number): Promise<TimeOffTypeStats> {
    // This would need a backend endpoint - placeholder for now
    // const response = await nexusClient.getTimeOffTypeStats(typeId, year);
    // return response.data.stats || response.data;
    return {} as TimeOffTypeStats;
  }
};
