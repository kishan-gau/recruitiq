/**
 * API Response Type Definitions
 * Standardized API response wrappers for Paylinq endpoints
 */

import { PaginationParams, PaginationMeta } from './common';

/**
 * Standard API Response
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  meta?: ResponseMeta;
}

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
