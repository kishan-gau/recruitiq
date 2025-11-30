/**
 * ScheduleHub Availability Service
 * Handles worker availability management API calls
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export interface AvailabilityRule {
  id?: string;
  employeeId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:mm format
  endTime: string;
  isRecurring: boolean;
  effectiveDate?: string;
  expirationDate?: string;
}

export interface AvailabilityException {
  id?: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  reason?: string;
}

export const availabilityService = {
  /**
   * List all availability rules with optional filters
   */
  async listAvailability(filters?: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    dayOfWeek?: number;
  }) {
    const response = await nexusClient.listAvailability(filters);
    return response.data;
  },

  /**
   * Get a specific availability rule by ID
   */
  async getAvailability(id: string) {
    const response = await nexusClient.getAvailability(id);
    return response.data;
  },

  /**
   * Create a new availability rule
   */
  async createAvailability(data: AvailabilityRule) {
    const response = await nexusClient.createAvailability(data);
    return response.data;
  },

  /**
   * Update an existing availability rule
   */
  async updateAvailability(id: string, updates: Partial<AvailabilityRule>) {
    const response = await nexusClient.updateAvailability(id, updates);
    return response.data;
  },

  /**
   * Delete an availability rule
   */
  async deleteAvailability(id: string) {
    await nexusClient.deleteAvailability(id);
  },

  /**
   * Bulk update availability rules for an employee
   */
  async bulkUpdateAvailability(employeeId: string, rules: AvailabilityRule[]) {
    const response = await nexusClient.bulkUpdateAvailability(employeeId, { rules });
    return response.data;
  },

  /**
   * Check worker availability for a specific date range
   */
  async checkWorkerAvailability(workerId: string, startDate: string, endDate: string) {
    const response = await nexusClient.checkWorkerAvailability(workerId, startDate, endDate);
    return response.data;
  },

  /**
   * List availability exceptions
   */
  async listAvailabilityExceptions(filters?: {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await nexusClient.listAvailabilityExceptions(filters);
    return response.data;
  },

  /**
   * Create an availability exception (one-time override)
   */
  async createAvailabilityException(data: AvailabilityException) {
    const response = await nexusClient.createAvailabilityException(data);
    return response.data;
  },

  /**
   * Delete an availability exception
   */
  async deleteAvailabilityException(id: string) {
    await nexusClient.deleteAvailabilityException(id);
  },

  /**
   * Export availability data (returns CSV or JSON)
   */
  async exportAvailability(filters?: any) {
    // This would call a specific export endpoint when implemented
    const data = await this.listAvailability(filters);
    return data;
  },

  /**
   * Import availability data from CSV or JSON
   */
  async importAvailability(file: File) {
    // This would parse the file and bulk import
    // For now, we'll just log the action
    console.log('Importing availability from file:', file.name);
    throw new Error('Import functionality not yet implemented on backend');
  },
};
