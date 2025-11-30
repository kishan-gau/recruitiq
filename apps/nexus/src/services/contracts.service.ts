/**
 * Contracts API Service
 * NOW USES: @recruitiq/api-client for type-safe API calls
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';
import type {
  Contract,
  CreateContractDTO,
  UpdateContractDTO,
  ContractFilters,
} from '@/types/contract.types';

// Create singleton instance
const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

// Permission metadata for RBAC
export const contractsServicePermissions = {
  view: 'nexus.contracts.view',
  create: 'nexus.contracts.create',
  update: 'nexus.contracts.update',
  sign: 'nexus.contracts.sign',
  delete: 'nexus.contracts.delete',
};

export const contractsService = {
  /**
   * List all contracts with optional filters
   */
  list: async (filters?: ContractFilters): Promise<Contract[]> => {
    const response = await nexusClient.listContracts(filters);
    // Backend returns { success: true, data: { contracts: [...], total, limit, offset } }
    return response.data.contracts as Contract[];
  },

  /**
   * Get a single contract by ID
   */
  get: async (id: string): Promise<Contract> => {
    const response = await nexusClient.getContract(id);
    return response.data as Contract;
  },

  /**
   * Get all contracts for a specific employee
   */
  getByEmployee: async (employeeId: string): Promise<Contract[]> => {
    const response = await nexusClient.getEmployeeContracts(employeeId);
    return response.data as Contract[];
  },

  /**
   * Get the current active contract for an employee
   */
  getCurrentContract: async (employeeId: string): Promise<Contract | null> => {
    const response = await nexusClient.getCurrentContract(employeeId);
    return response.data as Contract | null;
  },

  /**
   * Create a new contract
   */
  create: async (contract: CreateContractDTO): Promise<Contract> => {
    const response = await nexusClient.createContract(contract);
    return response.data as Contract;
  },

  /**
   * Update an existing contract
   */
  update: async (id: string, updates: UpdateContractDTO): Promise<Contract> => {
    const response = await nexusClient.updateContract(id, updates);
    return response.data as Contract;
  },

  /**
   * Delete a contract
   */
  delete: async (id: string): Promise<void> => {
    await nexusClient.deleteContract(id);
  },

  /**
   * Activate a contract
   */
  activate: async (id: string): Promise<Contract> => {
    const response = await nexusClient.activateContract(id);
    return response.data as Contract;
  },

  /**
   * Terminate a contract
   */
  terminate: async (id: string, terminationDate: string): Promise<Contract> => {
    const response = await nexusClient.terminateContract(id, terminationDate);
    return response.data as Contract;
  },

  /**
   * Upload contract document
   */
  uploadDocument: async (id: string, file: File): Promise<{ documentUrl: string }> => {
    const response = await nexusClient.uploadContractDocument(id, file);
    return response.data as { documentUrl: string };
  },

  /**
   * Get contracts expiring within specified days
   */
  getExpiring: async (days: number = 30): Promise<Contract[]> => {
    const response = await nexusClient.getExpiringContracts(days);
    return response.data as Contract[];
  },

  /**
   * Progress contract to next sequence
   */
  progressSequence: async (id: string): Promise<Contract> => {
    const response = await nexusClient.progressContractSequence(id);
    return response.data as Contract;
  },

  /**
   * Renew a contract
   */
  renew: async (id: string, data: { startDate: string; endDate: string; terms?: string }): Promise<Contract> => {
    const response = await nexusClient.renewContract(id, data);
    return response.data as Contract;
  },
};
