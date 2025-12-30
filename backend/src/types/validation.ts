import { ObjectSchema } from 'joi';

/**
 * Interface for all validators in the system
 * Ensures consistent validation patterns across validators
 */
export interface IValidator<T = any> {
  validate(data: any): Promise<{ value: T; error?: Error }>;
  validatePartial(data: any): Promise<{ value: Partial<T>; error?: Error }>;
}

/**
 * Type alias for Joi validation schemas
 */
export type ValidationSchema<T> = ObjectSchema<T>;

/**
 * Standardized validation result object
 */
export interface ValidationResult<T> {
  value: T;
  error?: { message: string; details?: any[] };
  isValid: boolean;
}

/**
 * Type for validator functions
 */
export type ValidatorFunction<T> = (data: any) => Promise<ValidationResult<T>>;

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  constraint?: string;
  value?: any;
}

/**
 * Detailed validation failure info
 */
export interface ValidationFailure {
  errors: ValidationErrorDetail[];
  failedAt: Date;
  context?: Record<string, any>;
}
