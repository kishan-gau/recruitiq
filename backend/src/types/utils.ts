/**
 * Date formatting options
 */
export interface DateFormatOptions {
  format?: 'short' | 'long' | 'iso' | 'custom';
  customFormat?: string;
  timezone?: string;
  locale?: string;
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Generic pagination result
 */
export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationInfo;
}

/**
 * DTO transformation options
 */
export interface FormatterOptions {
  recursive?: boolean;
  depth?: number;
  excludeFields?: string[];
  includeFields?: string[];
  nullableFields?: string[];
}

/**
 * Context for entity transformation
 */
export interface TransformationContext {
  operation: 'toApi' | 'toDb' | 'custom';
  includeFields?: string[];
  excludeFields?: string[];
  timezone?: string;
}

/**
 * File validation options
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[]; // MIME types
  allowedExtensions?: string[];
  scanForVirus?: boolean;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  fileInfo?: {
    size: number;
    type: string;
    extension: string;
  };
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
  suggestions?: string[];
}

/**
 * Email validation result
 */
export interface EmailValidationResult {
  isValid: boolean;
  normalized?: string;
  isDisposable?: boolean;
  domain?: string;
  error?: string;
}
