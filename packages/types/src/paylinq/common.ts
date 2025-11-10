/**
 * Common Paylinq Types
 * Shared types and enums used across all Paylinq modules
 */

export type PayFrequency = 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';
export type PaymentMethod = 'ach' | 'check' | 'wire' | 'cash';
export type Currency = 'SRD' | 'USD' | 'EUR';
export type Status = 'active' | 'inactive';
export type EntityStatus = 'active' | 'inactive' | 'pending' | 'archived';

/**
 * Audit fields present on all entities
 */
export interface AuditFields {
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  deletedBy?: string;
}

/**
 * Base entity with common fields
 */
export interface BaseEntity extends AuditFields {
  id: string;
  organizationId: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Pagination response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

/**
 * Common filter options
 */
export interface CommonFilters extends PaginationParams, DateRangeFilter {
  status?: string;
  search?: string;
}
