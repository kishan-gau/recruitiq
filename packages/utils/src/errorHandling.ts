/**
 * Error Handling Utilities
 * Standardized error parsing and display across all applications
 */

export interface ValidationError {
  field: string;
  message: string;
  type?: string;
}

export interface ParsedError {
  message: string;
  validationErrors?: Record<string, string>;
  isValidationError: boolean;
}

/**
 * Parse API error response and extract validation errors
 * 
 * @param error - The error object from axios or fetch
 * @param fallbackMessage - Fallback message if no error details found
 * @returns Parsed error with validation details
 * 
 * @example
 * ```ts
 * try {
 *   await api.createUser(data);
 * } catch (err) {
 *   const parsed = parseApiError(err, 'Failed to create user');
 *   if (parsed.isValidationError && parsed.validationErrors) {
 *     setFieldErrors(parsed.validationErrors);
 *   }
 *   showToast(parsed.message);
 * }
 * ```
 */
export function parseApiError(error: any, fallbackMessage: string = 'An error occurred'): ParsedError {
  // Check for axios error response
  if (error.response?.data) {
    const data = error.response.data;
    
    // Handle validation errors (400 with errors array)
    if (error.response.status === 400 && Array.isArray(data.errors)) {
      const validationErrors: Record<string, string> = {};
      
      data.errors.forEach((err: ValidationError) => {
        if (err.field && err.message) {
          validationErrors[err.field] = err.message;
        }
      });
      
      return {
        message: data.message || 'Please fix the validation errors',
        validationErrors,
        isValidationError: true,
      };
    }
    
    // Handle other API errors with message
    if (data.message) {
      return {
        message: data.message,
        isValidationError: false,
      };
    }
    
    // Handle error property
    if (data.error) {
      return {
        message: data.error,
        isValidationError: false,
      };
    }
  }
  
  // Handle standard Error objects
  if (error.message) {
    return {
      message: error.message,
      isValidationError: false,
    };
  }
  
  // Fallback
  return {
    message: fallbackMessage,
    isValidationError: false,
  };
}

/**
 * Map API validation errors to form field names
 * Useful when API field names differ from form field names
 * 
 * @param validationErrors - Validation errors from API
 * @param fieldMap - Mapping of API field names to form field names
 * @returns Mapped validation errors
 * 
 * @example
 * ```ts
 * const mapped = mapValidationErrors(errors, {
 *   'periodStart': 'payPeriodStart',
 *   'periodEnd': 'payPeriodEnd',
 * });
 * setErrors(mapped);
 * ```
 */
export function mapValidationErrors(
  validationErrors: Record<string, string>,
  fieldMap: Record<string, string>
): Record<string, string> {
  const mapped: Record<string, string> = {};
  
  Object.entries(validationErrors).forEach(([field, message]) => {
    const mappedField = fieldMap[field] || field;
    mapped[mappedField] = message;
  });
  
  return mapped;
}

/**
 * Handle form submission errors with proper UX
 * Sets field errors and shows toast notification
 * 
 * @param error - The error from API
 * @param setFieldErrors - Function to set field-level errors
 * @param showToast - Function to show toast notification
 * @param fallbackMessage - Fallback error message
 * @param fieldMap - Optional field name mapping
 * 
 * @example
 * ```ts
 * try {
 *   await api.createItem(data);
 * } catch (err) {
 *   handleFormError(err, setErrors, error, 'Failed to create item', {
 *     'apiFieldName': 'formFieldName'
 *   });
 * }
 * ```
 */
export function handleFormError(
  error: any,
  setFieldErrors: (errors: Record<string, string>) => void,
  showToast: (message: string) => void,
  fallbackMessage: string,
  fieldMap?: Record<string, string>
): void {
  const parsed = parseApiError(error, fallbackMessage);
  
  if (parsed.isValidationError && parsed.validationErrors) {
    const errors = fieldMap 
      ? mapValidationErrors(parsed.validationErrors, fieldMap)
      : parsed.validationErrors;
    
    setFieldErrors(errors);
  }
  
  showToast(parsed.message);
}
