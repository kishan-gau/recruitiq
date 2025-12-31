/**
 * Contract types for HRIS contract management
 */

import type { AuditFields } from './common.types';

export type ContractType = 
  | 'permanent'
  | 'fixed_term'
  | 'probation'
  | 'internship'
  | 'contractor';

export type ContractStatus = 
  | 'draft'
  | 'active'
  | 'pending'
  | 'expired'
  | 'terminated';

export interface Contract extends AuditFields {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName?: string; // For UI display
  contractNumber: string;
  contractType: ContractType;
  status: ContractStatus;
  title: string;
  startDate: string;
  endDate?: string;
  probationEndDate?: string;
  salary?: number;
  currency?: string;
  paymentFrequency?: 'monthly' | 'bi-weekly' | 'weekly' | 'hourly';
  hoursPerWeek?: number;
  location?: string;
  department?: string;
  position?: string;
  terms?: string;
  termsAndConditions?: string;
  notes?: string;
  signedDate?: string;
  terminationDate?: string;
  terminationReason?: string;
}

export interface CreateContractDTO {
  employeeId: string;
  contractNumber: string;
  contractType: ContractType;
  status: ContractStatus;
  title: string;
  startDate: string;
  endDate?: string;
  salary?: number;
  currency?: string;
  hoursPerWeek?: number;
  terms?: string;
  notes?: string;
}

export interface UpdateContractDTO extends Partial<CreateContractDTO> {
  signedDate?: string;
  terminationDate?: string;
  terminationReason?: string;
}

export interface ContractFilters {
  employeeId?: string;
  contractType?: ContractType;
  status?: ContractStatus;
  startDateFrom?: string;
  startDateTo?: string;
}
