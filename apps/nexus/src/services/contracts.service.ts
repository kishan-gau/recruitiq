/**
 * Contracts API Service
 */

import { apiClient } from './api';
import type {
  Contract,
  CreateContractDTO,
  UpdateContractDTO,
  ContractFilters,
} from '@/types/contract.types';

// API response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const contractsService = {
  /**
   * List all contracts with optional filters
   */
  list: async (filters?: ContractFilters): Promise<Contract[]> => {
    const { data } = await apiClient.get<ApiResponse<Contract[]>>('/contracts', {
      params: filters,
    });
    return data.data;
  },

  /**
   * Get a single contract by ID
   */
  get: async (id: string): Promise<Contract> => {
    const { data } = await apiClient.get<ApiResponse<Contract>>(`/contracts/${id}`);
    return data.data;
  },

  /**
   * Get all contracts for a specific employee
   */
  getByEmployee: async (employeeId: string): Promise<Contract[]> => {
    const { data } = await apiClient.get<ApiResponse<Contract[]>>(`/contracts/employee/${employeeId}`);
    return data.data;
  },

  /**
   * Get the current active contract for an employee
   */
  getCurrentContract: async (employeeId: string): Promise<Contract | null> => {
    const { data } = await apiClient.get<ApiResponse<Contract | null>>(`/contracts/employee/${employeeId}/current`);
    return data.data;
  },

  /**
   * Create a new contract
   */
  create: async (contract: CreateContractDTO): Promise<Contract> => {
    const { data } = await apiClient.post<ApiResponse<Contract>>('/contracts', contract);
    return data.data;
  },

  /**
   * Update an existing contract
   */
  update: async (id: string, updates: UpdateContractDTO): Promise<Contract> => {
    const { data } = await apiClient.patch<ApiResponse<Contract>>(`/contracts/${id}`, updates);
    return data.data;
  },

  /**
   * Delete a contract
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/contracts/${id}`);
  },

  /**
   * Activate a contract
   */
  activate: async (id: string): Promise<Contract> => {
    const { data } = await apiClient.post<ApiResponse<Contract>>(`/contracts/${id}/activate`);
    return data.data;
  },

  /**
   * Terminate a contract
   */
  terminate: async (id: string, terminationDate: string): Promise<Contract> => {
    const { data } = await apiClient.post<ApiResponse<Contract>>(`/contracts/${id}/terminate`, {
      terminationDate,
    });
    return data.data;
  },

  /**
   * Upload contract document
   */
  uploadDocument: async (id: string, file: File): Promise<{ documentUrl: string }> => {
    const formData = new FormData();
    formData.append('document', file);
    
    const { data } = await apiClient.post<ApiResponse<{ documentUrl: string }>>(
      `/contracts/${id}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data.data;
  },
};
