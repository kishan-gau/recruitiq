/**
 * Contract Types
 * TypeScript definitions for employment contracts
 */

export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'pending';
export type ContractType = 'permanent' | 'fixed_term' | 'probation' | 'internship' | 'contractor';
export type PaymentFrequency = 'hourly' | 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'annually';

/**
 * Contract interface matching backend schema
 */
export interface Contract {
  id: string;
  organizationId: string;
  employeeId: string;
  contractNumber: string;
  contractType: ContractType;
  status: ContractStatus;
  sequenceNumber: number;
  
  // Contract Details
  title: string;
  startDate: string;
  endDate?: string;
  probationEndDate?: string;
  
  // Compensation
  salary?: number;
  currency?: string;
  paymentFrequency?: PaymentFrequency;
  
  // Work Details
  hoursPerWeek?: number;
  location?: string;
  department?: string;
  position?: string;
  
  // Document
  documentUrl?: string;
  signedDate?: string;
  signedBy?: string;
  
  // Additional Info
  notes?: string;
  termsAndConditions?: string;
  
  // Audit fields
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Populated fields
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeNumber: string;
  };
}

/**
 * DTO for creating a new contract
 */
export interface CreateContractDTO {
  employeeId: string;
  contractNumber: string;
  contractType: ContractType;
  status?: ContractStatus;
  sequenceNumber?: number;
  
  title: string;
  startDate: string;
  endDate?: string;
  probationEndDate?: string;
  
  salary?: number;
  currency?: string;
  paymentFrequency?: PaymentFrequency;
  
  hoursPerWeek?: number;
  location?: string;
  department?: string;
  position?: string;
  
  documentUrl?: string;
  signedDate?: string;
  signedBy?: string;
  
  notes?: string;
  termsAndConditions?: string;
}

/**
 * DTO for updating a contract
 */
export interface UpdateContractDTO extends Partial<Omit<CreateContractDTO, 'employeeId' | 'contractNumber'>> {}

/**
 * Contract filters for list queries
 */
export interface ContractFilters {
  employeeId?: string;
  status?: ContractStatus;
  contractType?: ContractType;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Contract timeline item for visualization
 */
export interface ContractTimelineItem {
  contract: Contract;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  sequenceNumber: number;
}
