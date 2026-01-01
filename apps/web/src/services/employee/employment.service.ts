/**
 * Employment Service
 * Handles employee contract and employment status information
 * 
 * Features:
 * - View current contract details
 * - Access employment history
 * - View compensation and benefits summary
 * - Track contract renewal dates
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

// Types
export interface EmploymentContract {
  id: string;
  contractType: 'permanent' | 'fixed-term' | 'probation' | 'temporary';
  startDate: string;
  endDate?: string;
  jobTitle: string;
  department: string;
  location: string;
  workingHours: number;
  salaryAmount: number;
  salaryCurrency: string;
  salaryFrequency: 'hourly' | 'monthly' | 'annually';
  status: 'active' | 'expired' | 'terminated';
  renewalDate?: string;
  signedAt: string;
  documentId?: string;
}

export interface EmploymentHistory {
  id: string;
  action: 'hired' | 'promoted' | 'transferred' | 'salary_change' | 'terminated';
  date: string;
  description: string;
  fromJobTitle?: string;
  toJobTitle?: string;
  fromDepartment?: string;
  toDepartment?: string;
  fromSalary?: number;
  toSalary?: number;
  reason?: string;
}

export interface EmploymentStatus {
  employeeId: string;
  status: 'active' | 'on_leave' | 'suspended' | 'terminated';
  statusDate: string;
  hireDate: string;
  yearsOfService: number;
  probationEndDate?: string;
  isProbation: boolean;
  nextReviewDate?: string;
}

export interface CompensationPackage {
  baseSalary: number;
  currency: string;
  frequency: 'hourly' | 'monthly' | 'annually';
  allowances: Array<{
    name: string;
    amount: number;
    frequency: string;
  }>;
  benefits: Array<{
    name: string;
    value?: number;
    description: string;
  }>;
  totalPackageValue: number;
}

/**
 * Employment Service
 * Provides methods for employment information management
 */
export const employmentService = {
  /**
   * Gets current employment contract
   */
  async getCurrentContract(): Promise<EmploymentContract> {
    const response = await nexusClient.getCurrentContract();
    return response.data.contract || response.data;
  },

  /**
   * Lists all employment contracts (current and historical)
   */
  async listContracts(): Promise<EmploymentContract[]> {
    const response = await nexusClient.listContracts();
    return response.data.contracts || response.data;
  },

  /**
   * Gets employment history timeline
   */
  async getEmploymentHistory(): Promise<EmploymentHistory[]> {
    const response = await nexusClient.getEmploymentHistory();
    return response.data.history || response.data;
  },

  /**
   * Gets current employment status
   */
  async getEmploymentStatus(): Promise<EmploymentStatus> {
    const response = await nexusClient.getEmploymentStatus();
    return response.data.status || response.data;
  },

  /**
   * Gets compensation package details
   */
  async getCompensationPackage(): Promise<CompensationPackage> {
    const response = await nexusClient.getCompensationPackage();
    return response.data.package || response.data;
  },

  /**
   * Downloads contract document
   */
  async downloadContract(contractId: string): Promise<Blob> {
    const response = await nexusClient.downloadContract(contractId);
    return response.data;
  },
};
