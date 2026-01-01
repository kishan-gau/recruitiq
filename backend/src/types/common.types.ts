/**
 * Common types for services and repositories
 *
 * These types provide consistent interfaces for filters, pagination, sorting,
 * and options across all product modules (PayLinQ, ScheduleHub, Nexus, etc.)
 *
 * @module types/common
 */

// Re-export existing types for convenience
export { ListQueryParams, FilterParams } from './api.types.js';
export { PaginationParams, PaginationResult, QueryOptions } from './database.types.js';

/**
 * Base filter options used across repositories
 * Supports common date range and status filtering
 */
export interface BaseFilterOptions {
  startDate?: Date | string;
  endDate?: Date | string;
  status?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  search?: string;
  [key: string]: unknown;
}

/**
 * Common pagination options for list operations
 */
export interface CommonPaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Common sorting options for list operations
 */
export interface CommonSortOptions {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
  orderBy?: string;
  order?: 'asc' | 'desc' | 'ASC' | 'DESC';
}

/**
 * Combined query options for repository list methods
 * Combines pagination and sorting
 */
export interface CommonQueryOptions extends CommonPaginationOptions, CommonSortOptions {
  includeDeleted?: boolean;
  includeInactive?: boolean;
}

/**
 * Service-level filter options
 * Used in service layer methods that accept filters
 */
export interface ServiceFilterOptions extends BaseFilterOptions, CommonPaginationOptions, CommonSortOptions {}

/**
 * Repository-level filter options
 * Used in repository methods for database queries
 */
export interface RepositoryFilterOptions extends BaseFilterOptions {
  organizationId?: string;
}

/**
 * Date range filter for time-based queries
 */
export interface DateRangeFilter {
  startDate?: Date | string;
  endDate?: Date | string;
  dateField?: string;
}

/**
 * Generic options parameter type
 * Use when exact options shape is unknown or varies
 */
export type GenericOptions = Record<string, unknown>;

/**
 * Generic filter parameter type
 * Use when exact filter shape is unknown or varies
 */
export type GenericFilters = Record<string, unknown>;

// ============================================
// PayLinQ-specific filter types
// ============================================

/**
 * PayLinQ payroll run filters
 */
export interface PayrollRunFilterOptions extends BaseFilterOptions {
  runType?: string;
  payPeriodStart?: Date | string;
  payPeriodEnd?: Date | string;
  payDate?: Date | string;
}

/**
 * PayLinQ employee compensation filters
 */
export interface CompensationFilterOptions extends BaseFilterOptions {
  employeeRecordId?: string;
  compensationType?: string;
  effectiveDate?: Date | string;
}

/**
 * PayLinQ tax calculation filters
 */
export interface TaxFilterOptions extends BaseFilterOptions {
  taxYear?: number;
  taxType?: string;
  jurisdictionCode?: string;
}

/**
 * PayLinQ pay component filters
 */
export interface PayComponentFilterOptions extends BaseFilterOptions {
  componentType?: string;
  componentCategory?: string;
  isTaxable?: boolean;
}

// ============================================
// ScheduleHub-specific filter types
// ============================================

/**
 * ScheduleHub schedule filters
 */
export interface ScheduleFilterOptions extends BaseFilterOptions {
  employeeId?: string;
  stationId?: string;
  shiftType?: string;
  scheduleDate?: Date | string;
}

/**
 * ScheduleHub time-off filters
 */
export interface TimeOffFilterOptions extends BaseFilterOptions {
  employeeId?: string;
  requestType?: string;
  approvalStatus?: string;
}

// ============================================
// Nexus-specific filter types
// ============================================

/**
 * Nexus employee filters
 */
export interface EmployeeFilterOptions extends BaseFilterOptions {
  departmentId?: string;
  locationId?: string;
  employmentType?: string;
  hireDate?: Date | string;
}

/**
 * Nexus benefits filters
 */
export interface BenefitsFilterOptions extends BaseFilterOptions {
  planType?: string;
  enrollmentStatus?: string;
  effectiveDate?: Date | string;
}

/**
 * Nexus document filters
 */
export interface DocumentFilterOptions extends BaseFilterOptions {
  documentType?: string;
  folderId?: string;
  employeeId?: string;
}
