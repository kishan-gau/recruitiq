/**
 * Validation Utilities
 * 
 * Common validation functions for forms and data
 */

/**
 * Validate email address format
 * 
 * @param email - Email address to validate
 * @returns True if valid, false otherwise
 * 
 * @example
 * validateEmail('user@example.com') // true
 * validateEmail('invalid-email') // false
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * 
 * @param password - Password to validate
 * @returns Object with validation result and message
 * 
 * @example
 * validatePassword('weak') // { valid: false, message: 'Password must be at least 8 characters' }
 * validatePassword('SecurePass123!') // { valid: true, message: '' }
 */
export const validatePassword = (
  password: string
): { valid: boolean; message: string; strength?: 'weak' | 'medium' | 'strong' } => {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strength =
    hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar
      ? 'strong'
      : hasUpperCase && hasLowerCase && (hasNumber || hasSpecialChar)
      ? 'medium'
      : 'weak';
  
  return { valid: true, message: '', strength };
};

/**
 * Validate phone number format
 * Accepts various formats: (123) 456-7890, 123-456-7890, 1234567890
 * 
 * @param phone - Phone number to validate
 * @returns True if valid, false otherwise
 */
export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
};

/**
 * Validate required field
 * 
 * @param value - Value to validate
 * @param fieldName - Name of the field (for error message)
 * @returns Error message if invalid, empty string if valid
 */
export const validateRequired = (value: any, fieldName: string = 'Field'): string => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName} is required`;
  }
  return '';
};

/**
 * Validate number is within range
 * 
 * @param value - Number to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param fieldName - Name of the field (for error message)
 * @returns Error message if invalid, empty string if valid
 */
export const validateNumberRange = (
  value: number,
  min: number,
  max: number,
  fieldName: string = 'Value'
): string => {
  if (isNaN(value)) {
    return `${fieldName} must be a number`;
  }
  if (value < min) {
    return `${fieldName} must be at least ${min}`;
  }
  if (value > max) {
    return `${fieldName} must be at most ${max}`;
  }
  return '';
};

/**
 * Validate date is not in the past
 * 
 * @param date - Date to validate
 * @param fieldName - Name of the field (for error message)
 * @returns Error message if invalid, empty string if valid
 */
export const validateFutureDate = (date: Date | string, fieldName: string = 'Date'): string => {
  if (!date) return `${fieldName} is required`;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (dateObj < today) {
    return `${fieldName} cannot be in the past`;
  }
  
  return '';
};

/**
 * Validate date range
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Error message if invalid, empty string if valid
 */
export const validateDateRange = (startDate: Date | string, endDate: Date | string): string => {
  if (!startDate || !endDate) {
    return 'Both start and end dates are required';
  }
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  if (start > end) {
    return 'Start date must be before end date';
  }
  
  return '';
};

/**
 * Validate currency amount
 * 
 * @param amount - Amount to validate
 * @param min - Minimum value (default: 0)
 * @param max - Maximum value (optional)
 * @returns Error message if invalid, empty string if valid
 */
export const validateCurrency = (
  amount: number,
  min: number = 0,
  max?: number
): string => {
  if (isNaN(amount)) {
    return 'Amount must be a valid number';
  }
  
  if (amount < min) {
    return `Amount must be at least $${min.toFixed(2)}`;
  }
  
  if (max !== undefined && amount > max) {
    return `Amount cannot exceed $${max.toFixed(2)}`;
  }
  
  // Check for more than 2 decimal places
  if (!Number.isInteger(amount * 100)) {
    return 'Amount cannot have more than 2 decimal places';
  }
  
  return '';
};

/**
 * Validate percentage value
 * 
 * @param value - Percentage value (0-100)
 * @returns Error message if invalid, empty string if valid
 */
export const validatePercentage = (value: number): string => {
  if (isNaN(value)) {
    return 'Percentage must be a valid number';
  }
  
  if (value < 0) {
    return 'Percentage cannot be negative';
  }
  
  if (value > 100) {
    return 'Percentage cannot exceed 100%';
  }
  
  return '';
};

/**
 * Validate hours worked
 * 
 * @param hours - Number of hours
 * @param maxPerDay - Maximum hours per day (default: 24)
 * @returns Error message if invalid, empty string if valid
 */
export const validateHours = (hours: number, maxPerDay: number = 24): string => {
  if (isNaN(hours)) {
    return 'Hours must be a valid number';
  }
  
  if (hours < 0) {
    return 'Hours cannot be negative';
  }
  
  if (hours > maxPerDay) {
    return `Hours cannot exceed ${maxPerDay} per day`;
  }
  
  // Check for more than 2 decimal places (max 15-minute increments = 0.25)
  const rounded = Math.round(hours * 4) / 4;
  if (Math.abs(hours - rounded) > 0.01) {
    return 'Hours must be in 15-minute increments (0.25)';
  }
  
  return '';
};

/**
 * Validate file size
 * 
 * @param file - File object
 * @param maxSizeMB - Maximum size in megabytes
 * @returns Error message if invalid, empty string if valid
 */
export const validateFileSize = (file: File, maxSizeMB: number = 5): string => {
  if (!file) return 'File is required';
  
  const maxBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxBytes) {
    return `File size cannot exceed ${maxSizeMB}MB`;
  }
  
  return '';
};

/**
 * Validate file type
 * 
 * @param file - File object
 * @param allowedTypes - Array of allowed MIME types
 * @returns Error message if invalid, empty string if valid
 */
export const validateFileType = (file: File, allowedTypes: string[]): string => {
  if (!file) return 'File is required';
  
  if (!allowedTypes.includes(file.type)) {
    return `File type must be one of: ${allowedTypes.join(', ')}`;
  }
  
  return '';
};

/**
 * Validate string length
 * 
 * @param value - String to validate
 * @param min - Minimum length
 * @param max - Maximum length
 * @param fieldName - Name of the field (for error message)
 * @returns Error message if invalid, empty string if valid
 */
export const validateLength = (
  value: string,
  min: number,
  max: number,
  fieldName: string = 'Field'
): string => {
  if (!value) {
    return `${fieldName} is required`;
  }
  
  if (value.length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  
  if (value.length > max) {
    return `${fieldName} cannot exceed ${max} characters`;
  }
  
  return '';
};

/**
 * Validate array has minimum items
 * 
 * @param array - Array to validate
 * @param min - Minimum number of items
 * @param fieldName - Name of the field (for error message)
 * @returns Error message if invalid, empty string if valid
 */
export const validateArrayMinLength = (
  array: any[],
  min: number,
  fieldName: string = 'Items'
): string => {
  if (!Array.isArray(array)) {
    return `${fieldName} must be an array`;
  }
  
  if (array.length < min) {
    return `Must select at least ${min} ${fieldName.toLowerCase()}`;
  }
  
  return '';
};

/**
 * Validate URL format
 * 
 * @param url - URL to validate
 * @returns True if valid, false otherwise
 */
export const validateURL = (url: string): boolean => {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitize HTML string to prevent XSS
 * 
 * @param html - HTML string to sanitize
 * @returns Sanitized string with HTML tags removed
 */
export const sanitizeHTML = (html: string): string => {
  if (!html) return '';
  
  // Remove all HTML tags
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Validate Social Security Number (SSN)
 * Format: XXX-XX-XXXX
 * 
 * @param ssn - SSN to validate
 * @returns True if valid, false otherwise
 */
export const validateSSN = (ssn: string): boolean => {
  if (!ssn) return false;
  
  const cleaned = ssn.replace(/\D/g, '');
  return cleaned.length === 9;
};

/**
 * Validate Tax ID / EIN
 * Format: XX-XXXXXXX
 * 
 * @param ein - EIN to validate
 * @returns True if valid, false otherwise
 */
export const validateEIN = (ein: string): boolean => {
  if (!ein) return false;
  
  const cleaned = ein.replace(/\D/g, '');
  return cleaned.length === 9;
};
