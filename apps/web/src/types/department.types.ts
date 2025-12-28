/**
 * Department types matching backend hris.department schema
 */

import type { AuditFields } from './common.types';

// Re-export ApiError for backward compatibility
export type { ApiError } from './api.types';

export interface Department extends AuditFields {
  id: string;
  organizationId: string;
  departmentCode: string;
  departmentName: string;
  description?: string;
  parentDepartmentId?: string;
  parentDepartment?: Department;
  costCenter?: string;
  isActive: boolean;
}

export interface CreateDepartmentDTO {
  departmentCode: string;
  departmentName: string;
  description?: string;
  parentDepartmentId?: string;
  costCenter?: string;
  isActive?: boolean;
}

export interface UpdateDepartmentDTO extends Partial<CreateDepartmentDTO> {}

export interface DepartmentFilters {
  search?: string;
  isActive?: boolean;
  parentDepartmentId?: string;
}

export interface DepartmentHierarchy extends Department {
  children?: DepartmentHierarchy[];
  employeeCount?: number;
}
