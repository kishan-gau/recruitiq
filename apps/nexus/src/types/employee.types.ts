/**
 * Employee types matching backend hris.employee schema
 */

import type { AuditFields } from './common.types';
import type { Department } from './department.types';
import type { Location } from './location.types';

export type EmploymentStatus = 'active' | 'on_leave' | 'terminated' | 'suspended';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'intern';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface Employee extends AuditFields {
  id: string;
  organizationId: string;
  userAccountId?: string;
  
  // Identification
  employeeNumber: string;
  
  // Personal Information
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  nationality?: string;
  residenceStatus?: 'resident' | 'non_resident' | 'partial_year_resident';
  
  // Contact Information
  email: string;
  phone?: string;
  mobilePhone?: string;
  
  // Address
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  
  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  
  // Employment Information
  hireDate: string;
  terminationDate?: string;
  employmentStatus: EmploymentStatus;
  employmentType: EmploymentType;
  
  // Organizational Assignment
  departmentId?: string;
  department?: Department;
  locationId?: string;
  location?: Location;
  managerId?: string;
  manager?: Employee;
  jobTitle?: string;
  
  // Work Schedule
  workSchedule?: string;
  ftePercentage?: number;
  
  // Profile
  profilePhotoUrl?: string;
  bio?: string;
  skills?: string[];
}

export interface CreateEmployeeDTO {
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  nationality?: string;
  residenceStatus?: 'resident' | 'non_resident' | 'partial_year_resident';
  email: string;
  phone?: string;
  mobilePhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  hireDate: string;
  employmentType: EmploymentType;
  departmentId?: string;
  locationId?: string;
  managerId?: string;
  jobTitle?: string;
  workSchedule?: string;
  ftePercentage?: number;
  bio?: string;
  skills?: string[];
}

export interface UpdateEmployeeDTO extends Partial<CreateEmployeeDTO> {}

export interface TerminateEmployeeDTO {
  terminationDate: string;
  reason?: string;
  notes?: string;
}

export interface EmployeeFilters {
  search?: string;
  employmentStatus?: EmploymentStatus;
  employmentType?: EmploymentType;
  departmentId?: string;
  locationId?: string;
  managerId?: string;
  hiredAfter?: string;
  hiredBefore?: string;
}

export interface EmployeeListItem {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  departmentName?: string;
  locationName?: string;
  employmentStatus: EmploymentStatus;
  employmentType: EmploymentType;
  hireDate: string;
  profilePhotoUrl?: string;
  // VIP fields (optional, present when employee has VIP status)
  isVip?: boolean;
  isRestricted?: boolean;
}

export interface OrgChartNode {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  departmentName?: string;
  profilePhotoUrl?: string;
  managerId?: string;
  children?: OrgChartNode[];
}
