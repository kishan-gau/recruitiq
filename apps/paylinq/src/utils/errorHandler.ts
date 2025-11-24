/**
 * Global Error Handler Utility
 * 
 * Centralized error handling for API responses
 * Provides user-friendly messages for common error scenarios
 * 
 * @module utils/errorHandler
 */

import type { AxiosError } from 'axios';

export interface ApiErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  message?: string;
  details?: any;
}

export interface ErrorHandlerOptions {
  /** Show toast notification */
  showToast?: boolean;
  /** Custom toast function */
  toast?: {
    error: (message: string) => void;
  };
  /** Default message if error message is not available */
  defaultMessage?: string;
  /** Whether to log to console */
  logToConsole?: boolean;
}

/**
 * Extract user-friendly error message from API error
 */
export function getErrorMessage(error: unknown, defaultMessage = 'An error occurred'): string {
  const axiosError = error as AxiosError<ApiErrorResponse>;

  // Check for network errors
  if (!axiosError.response) {
    if (axiosError.message === 'Network Error') {
      return 'Network error. Please check your internet connection.';
    }
    return axiosError.message || defaultMessage;
  }

  const { status, data } = axiosError.response;

  // Handle specific status codes with user-friendly messages
  switch (status) {
    case 400:
      return data?.error || data?.message || 'Invalid request. Please check your input.';
    
    case 401:
      return 'Your session has expired. Please log in again.';
    
    case 403:
      // Permission denied - provide helpful message
      if (data?.errorCode === 'RBAC_MANAGEMENT_REQUIRED') {
        return 'You need RBAC management permissions to perform this action.';
      }
      if (data?.errorCode === 'FORBIDDEN') {
        return data?.error || 'You do not have permission to perform this action.';
      }
      return data?.error || data?.message || 'Access denied. You do not have the required permissions.';
    
    case 404:
      return data?.error || 'The requested resource was not found.';
    
    case 409:
      return data?.error || data?.message || 'This resource already exists or conflicts with existing data.';
    
    case 422:
      return data?.error || 'Validation failed. Please check your input.';
    
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    
    case 500:
      return 'A server error occurred. Please try again later.';
    
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    
    default:
      return data?.error || data?.message || defaultMessage;
  }
}

/**
 * Check if error is a permission denied error
 */
export function isPermissionError(error: unknown): boolean {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.status === 403;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.status === 401;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  return axiosError.response?.status === 400 || axiosError.response?.status === 422;
}

/**
 * Handle API error with toast notification and console logging
 */
export function handleApiError(error: unknown, options: ErrorHandlerOptions = {}): string {
  const {
    showToast = true,
    toast,
    defaultMessage = 'An error occurred',
    logToConsole = true,
  } = options;

  const message = getErrorMessage(error, defaultMessage);

  // Log to console in development
  if (logToConsole && import.meta.env.DEV) {
    console.error('[API Error]:', {
      message,
      error,
      status: (error as AxiosError)?.response?.status,
      data: (error as AxiosError<ApiErrorResponse>)?.response?.data,
    });
  }

  // Show toast notification if toast function provided
  if (showToast && toast) {
    toast.error(message);
  }

  return message;
}

/**
 * Get permission-specific error message
 */
export function getPermissionErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  const data = axiosError.response?.data;

  if (data?.errorCode === 'RBAC_MANAGEMENT_REQUIRED') {
    return 'You need RBAC management permissions to access this feature. Please contact your administrator.';
  }

  if (data?.error) {
    return `Permission denied: ${data.error}`;
  }

  return 'You do not have permission to perform this action. Please contact your administrator if you believe this is an error.';
}

/**
 * Extract validation errors from API response
 */
export function getValidationErrors(error: unknown): Record<string, string> | null {
  const axiosError = error as AxiosError<ApiErrorResponse>;
  
  if (!isValidationError(error)) {
    return null;
  }

  const data = axiosError.response?.data;
  
  // Check for details object with field-specific errors
  if (data?.details && typeof data.details === 'object') {
    return data.details;
  }

  return null;
}
