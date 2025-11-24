/**
 * Global Error Handler Utility
 * 
 * Centralized error handling for API responses
 * Provides user-friendly messages for common error scenarios
 * 
 * @module utils/errorHandler
 */

/**
 * Extract user-friendly error message from API error
 * @param {unknown} error - The error object
 * @param {string} defaultMessage - Default message if error message is not available
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error, defaultMessage = 'An error occurred') {
  const axiosError = error;

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
 * @param {unknown} error - The error object
 * @returns {boolean} True if error is a permission error
 */
export function isPermissionError(error) {
  const axiosError = error;
  return axiosError.response?.status === 403;
}

/**
 * Check if error is an authentication error
 * @param {unknown} error - The error object
 * @returns {boolean} True if error is an authentication error
 */
export function isAuthError(error) {
  const axiosError = error;
  return axiosError.response?.status === 401;
}

/**
 * Check if error is a validation error
 * @param {unknown} error - The error object
 * @returns {boolean} True if error is a validation error
 */
export function isValidationError(error) {
  const axiosError = error;
  return axiosError.response?.status === 400 || axiosError.response?.status === 422;
}

/**
 * Handle API error with toast notification and console logging
 * @param {unknown} error - The error object
 * @param {Object} options - Error handler options
 * @param {boolean} [options.showToast=true] - Show toast notification
 * @param {Object} [options.toast] - Toast function object with error method
 * @param {string} [options.defaultMessage='An error occurred'] - Default error message
 * @param {boolean} [options.logToConsole=true] - Whether to log to console
 * @returns {string} The error message
 */
export function handleApiError(error, options = {}) {
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
      status: error?.response?.status,
      data: error?.response?.data,
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
 * @param {unknown} error - The error object
 * @returns {string} Permission error message
 */
export function getPermissionErrorMessage(error) {
  const axiosError = error;
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
 * @param {unknown} error - The error object
 * @returns {Record<string, string> | null} Validation errors object or null
 */
export function getValidationErrors(error) {
  const axiosError = error;
  
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
