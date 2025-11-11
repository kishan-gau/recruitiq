/**
 * API Response Type Definitions
 * Standardized API response wrappers for Paylinq endpoints
 * 
 * IMPORTANT: These types follow the API standards documented in docs/API_STANDARDS.md
 * - Single resource: { success, resourceName: {...} } (e.g., { success, payComponent: {...} })
 * - Multiple resources: { success, resourceNames: [...], count, pagination } (e.g., { success, payComponents: [...] })
 * - NOT generic "data" key - always use resource-specific key names
 */

import { PaginationParams, PaginationMeta } from './common';

/**
 * Standard API Response (DEPRECATED - use resource-specific types instead)
 * @deprecated Use resource-specific response types like PayComponentResponse
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  meta?: ResponseMeta;
}

/**
 * Resource-specific single item response
 * Following API standards: { success, [resourceName]: {...} }
 */
export type ResourceResponse<TResource, TResourceKey extends string> = {
  success: boolean;
  message?: string;
  error?: ErrorResponse;
  meta?: ResponseMeta;
} & {
  [K in TResourceKey]: TResource;
};

/**
 * Resource-specific list response with pagination
 * Following API standards: { success, [resourceNames]: [...], count, pagination }
 */
export type ResourceListResponse<TResource, TResourceKey extends string> = {
  success: boolean;
  count: number;
  pagination?: PaginationMeta;
  error?: ErrorResponse;
  meta?: ResponseMeta;
} & {
  [K in TResourceKey]: TResource[];
};

/**
 * Error Response
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
  field?: string;
  validationErrors?: ValidationError[];
}

/**
 * Validation Error
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Response Meta
 */
export interface ResponseMeta {
  timestamp?: string;
  requestId?: string;
  version?: string;
  [key: string]: any;
}

/**
 * List Response (with pagination)
 */
export interface ListResponse<T> extends ApiResponse<T[]> {
  pagination?: PaginationMeta;
}

/**
 * Bulk Operation Response
 */
export interface BulkOperationResponse {
  success: boolean;
  totalCount: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Create/Update Response
 */
export interface MutationResponse<T> extends ApiResponse<T> {
  created?: boolean;
  updated?: boolean;
}

/**
 * Delete Response
 */
export interface DeleteResponse extends ApiResponse<void> {
  deleted: boolean;
}

/**
 * Stats Response
 */
export interface StatsResponse<T> extends ApiResponse<T> {
  period?: {
    start: string;
    end: string;
  };
}

// Re-export pagination params for convenience
export type { PaginationParams };
