/**
 * Validation Schema Builder
 * 
 * Reusable Joi schema patterns for common field types.
 * Ensures consistent validation across all services.
 * 
 * @module src/services/validationSchemas
 */

import Joi from 'joi';

/**
 * Email validation schema
 * 
 * - Required, lowercase, max 255 chars
 * - Validates email format
 * - Trims whitespace
 * 
 * @returns Joi.StringSchema
 * 
 * @example
 * const schema = Joi.object({
 *   email: email()
 * });
 */
export const email = (): Joi.StringSchema =>
  Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .max(255)
    .messages({
      'string.email': 'Email must be a valid email address',
      'string.max': 'Email cannot exceed 255 characters'
    });

/**
 * Optional email validation schema
 * 
 * @returns Joi.StringSchema
 */
export const optionalEmail = (): Joi.StringSchema =>
  email().optional().allow(null, '');

/**
 * Password validation schema
 * 
 * Requirements:
 * - Minimum 12 characters
 * - Maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (@$!%*?&)
 * 
 * @returns Joi.StringSchema
 * 
 * @example
 * const schema = Joi.object({
 *   password: password()
 * });
 */
export const password = (): Joi.StringSchema =>
  Joi.string()
    .required()
    .min(12)
    .max(128)
    .pattern(/^(?=.*[a-z])/)
    .pattern(/^(?=.*[A-Z])/)
    .pattern(/^(?=.*\d)/)
    .pattern(/^(?=.*[@$!%*?&])/)
    .messages({
      'string.min': 'Password must be at least 12 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base':
        'Password must contain uppercase, lowercase, number, and special character'
    });

/**
 * UUID v4 validation schema
 * 
 * @returns Joi.StringSchema
 * 
 * @example
 * const schema = Joi.object({
 *   organizationId: uuid()
 * });
 */
export const uuid = (): Joi.StringSchema =>
  Joi.string()
    .uuid({ version: 'uuidv4' })
    .required()
    .messages({
      'string.guid': 'Must be a valid UUID'
    });

/**
 * Optional UUID validation schema
 * 
 * @returns Joi.StringSchema
 */
export const optionalUuid = (): Joi.StringSchema =>
  uuid().optional().allow(null);

/**
 * String name validation schema
 * 
 * - 2-100 characters
 * - Trimmed
 * - Required
 * 
 * @param minLength - Minimum length (default: 2)
 * @param maxLength - Maximum length (default: 100)
 * @returns Joi.StringSchema
 * 
 * @example
 * const schema = Joi.object({
 *   firstName: name(),
 *   lastName: name()
 * });
 */
export const name = (minLength: number = 2, maxLength: number = 100): Joi.StringSchema =>
  Joi.string()
    .required()
    .trim()
    .min(minLength)
    .max(maxLength)
    .messages({
      'string.min': `Name must be at least ${minLength} characters`,
      'string.max': `Name cannot exceed ${maxLength} characters`
    });

/**
 * Optional name validation schema
 * 
 * @returns Joi.StringSchema
 */
export const optionalName = (minLength: number = 2, maxLength: number = 100): Joi.StringSchema =>
  name(minLength, maxLength).optional().allow(null, '');

/**
 * Phone number validation schema
 * 
 * Accepts international format: +1-555-0100
 * Also accepts: 1-555-0100, 5550100, +15550100
 * 
 * @returns Joi.StringSchema
 * 
 * @example
 * const schema = Joi.object({
 *   phone: phone()
 * });
 */
export const phone = (): Joi.StringSchema =>
  Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Phone must be a valid international number'
    });

/**
 * URL validation schema
 * 
 * Accepts http and https URLs
 * 
 * @param optional - Whether URL is optional
 * @returns Joi.StringSchema
 * 
 * @example
 * const schema = Joi.object({
 *   website: url()
 * });
 */
export const url = (optional: boolean = true): Joi.StringSchema => {
  const baseSchema = Joi.string().uri({ scheme: ['http', 'https'] }).messages({
    'string.uri': 'Must be a valid URL'
  });

  return optional ? baseSchema.optional().allow(null, '') : baseSchema.required();
};

/**
 * Date validation schema
 * 
 * - ISO 8601 format
 * - Optional timezone
 * - Can validate min/max dates
 * 
 * @param options - Validation options
 * @returns Joi.DateSchema
 * 
 * @example
 * // Past dates only (e.g., birth date)
 * const birthDate = date({ max: 'now', pastOnly: true });
 * 
 * // Future dates only (e.g., expiration date)
 * const expiryDate = date({ min: 'now' });
 */
export const date = (options: {
  min?: string | 'now';
  max?: string | 'now';
  pastOnly?: boolean;
  futureOnly?: boolean;
  required?: boolean;
} = {}): Joi.DateSchema => {
  const { required = false, min, max, pastOnly, futureOnly } = options;

  let schema = Joi.date().iso();

  if (required) {
    schema = schema.required();
  } else {
    schema = schema.optional().allow(null);
  }

  if (pastOnly || max === 'now') {
    schema = schema.max('now').messages({
      'date.max': 'Date cannot be in the future'
    });
  }

  if (futureOnly || min === 'now') {
    schema = schema.min('now').messages({
      'date.min': 'Date must be in the future'
    });
  }

  if (min && min !== 'now') {
    schema = schema.min(min);
  }

  if (max && max !== 'now') {
    schema = schema.max(max);
  }

  return schema;
};

/**
 * Date-only field validation schema (YYYY-MM-DD format)
 * 
 * Use for fields that don't need time component (birth date, hire date)
 * Stored as DATE type in database, not TIMESTAMP
 * 
 * @param options - Validation options
 * @returns Joi.StringSchema
 * 
 * @example
 * const schema = Joi.object({
 *   birthDate: dateOnly({ max: 'now' }),
 *   hireDate: dateOnly()
 * });
 */
export const dateOnly = (options: {
  min?: string;
  max?: string;
  pastOnly?: boolean;
  required?: boolean;
} = {}): Joi.StringSchema => {
  const { required = false, min, max, pastOnly } = options;

  let schema = Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .custom((value, helpers) => {
      const date = new Date(value + 'T00:00:00.000Z');
      
      if (isNaN(date.getTime())) {
        return helpers.error('any.invalid');
      }

      if (pastOnly && date > new Date()) {
        return helpers.error('date.max');
      }

      if (min && date < new Date(min + 'T00:00:00.000Z')) {
        return helpers.error('date.min');
      }

      if (max && date > new Date(max + 'T00:00:00.000Z')) {
        return helpers.error('date.max');
      }

      return value;
    })
    .messages({
      'string.pattern.base': 'Date must be in YYYY-MM-DD format',
      'date.max': 'Date cannot be in the future',
      'date.min': 'Date must be after minimum date'
    });

  return required ? schema.required() : schema.optional().allow(null, '');
};

/**
 * Integer validation schema
 * 
 * - Whole numbers only
 * - Optional min/max validation
 * 
 * @param options - Validation options
 * @returns Joi.NumberSchema
 * 
 * @example
 * const schema = Joi.object({
 *   yearsExperience: integer({ min: 0, max: 70 }),
 *   salary: integer({ min: 0 })
 * });
 */
export const integer = (options: {
  min?: number;
  max?: number;
  required?: boolean;
} = {}): Joi.NumberSchema => {
  const { min, max, required = false } = options;

  let schema = Joi.number().integer();

  if (min !== undefined) {
    schema = schema.min(min);
  }

  if (max !== undefined) {
    schema = schema.max(max);
  }

  return required ? schema.required() : schema.optional().allow(null);
};

/**
 * Positive number validation schema
 * 
 * For numeric values that must be > 0
 * 
 * @param required - Whether value is required
 * @returns Joi.NumberSchema
 * 
 * @example
 * const schema = Joi.object({
 *   amount: positiveNumber(),
 *   price: positiveNumber()
 * });
 */
export const positiveNumber = (required: boolean = true): Joi.NumberSchema => {
  let schema = Joi.number().positive().messages({
    'number.positive': 'Must be a positive number'
  });

  return required ? schema.required() : schema.optional().allow(null);
};

/**
 * Decimal number validation schema (for money)
 * 
 * Allows decimal places, validates min/max
 * 
 * @param options - Validation options
 * @returns Joi.NumberSchema
 * 
 * @example
 * const schema = Joi.object({
 *   salary: decimal({ min: 0, max: 10000000 }),
 *   hourlyRate: decimal({ min: 0 })
 * });
 */
export const decimal = (options: {
  min?: number;
  max?: number;
  precision?: number;
  required?: boolean;
} = {}): Joi.NumberSchema => {
  const { min, max, required = false } = options;

  let schema = Joi.number();

  if (min !== undefined) {
    schema = schema.min(min);
  }

  if (max !== undefined) {
    schema = schema.max(max);
  }

  return required ? schema.required() : schema.optional().allow(null);
};

/**
 * Enum validation schema
 * 
 * Validates that value is one of allowed values
 * 
 * @param allowedValues - Array of allowed values
 * @param required - Whether value is required
 * @returns Joi.StringSchema
 * 
 * @example
 * const schema = Joi.object({
 *   status: enumField(['active', 'inactive', 'archived']),
 *   role: enumField(['admin', 'user', 'viewer'])
 * });
 */
export const enumField = (
  allowedValues: readonly string[],
  required: boolean = true
): Joi.StringSchema => {
  let schema = Joi.string().valid(...allowedValues);

  return required
    ? schema.required()
    : schema.optional().allow(null);
};

/**
 * Array validation schema
 * 
 * Validates array with item constraints
 * 
 * @param options - Validation options
 * @returns Joi.ArraySchema
 * 
 * @example
 * const schema = Joi.object({
 *   skills: arrayOf({ items: 'string', min: 1, max: 50 }),
 *   tags: arrayOf({ items: 'string', max: 100 })
 * });
 */
export const arrayOf = (options: {
  items?: 'string' | 'number' | Joi.Schema;
  min?: number;
  max?: number;
  unique?: boolean;
  required?: boolean;
} = {}): Joi.ArraySchema => {
  const { items = 'string', min, max, unique = false, required = false } = options;

  let itemSchema: Joi.Schema;

  if (items === 'string') {
    itemSchema = Joi.string().trim();
  } else if (items === 'number') {
    itemSchema = Joi.number();
  } else {
    itemSchema = items;
  }

  let schema = Joi.array().items(itemSchema);

  if (min !== undefined) {
    schema = schema.min(min);
  }

  if (max !== undefined) {
    schema = schema.max(max);
  }

  if (unique) {
    schema = schema.unique();
  }

  return required ? schema.required() : schema.optional();
};

/**
 * Text validation schema
 * 
 * For longer text fields (description, content)
 * 
 * @param options - Validation options
 * @returns Joi.StringSchema
 * 
 * @example
 * const schema = Joi.object({
 *   description: text({ min: 10, max: 5000 }),
 *   bio: text({ max: 1000 })
 * });
 */
export const text = (options: {
  min?: number;
  max?: number;
  required?: boolean;
} = {}): Joi.StringSchema => {
  const { min = 10, max = 5000, required = true } = options;

  let schema = Joi.string().trim().min(min).max(max);

  return required ? schema.required() : schema.optional().allow(null, '');
};

/**
 * Slug validation schema (for URL-safe names)
 * 
 * Only lowercase letters, numbers, hyphens, underscores
 * 
 * @param required - Whether slug is required
 * @returns Joi.StringSchema
 * 
 * @example
 * const schema = Joi.object({
 *   slug: slug()
 * });
 */
export const slug = (required: boolean = true): Joi.StringSchema => {
  let schema = Joi.string()
    .lowercase()
    .pattern(/^[a-z0-9_-]+$/)
    .messages({
      'string.pattern.base': 'Slug can only contain lowercase letters, numbers, hyphens, and underscores'
    });

  return required ? schema.required() : schema.optional().allow(null, '');
};

/**
 * Boolean validation schema
 * 
 * @param defaultValue - Default value if not provided
 * @returns Joi.BooleanSchema
 * 
 * @example
 * const schema = Joi.object({
 *   isActive: boolean(true),
 *   isPublished: boolean(false)
 * });
 */
export const boolean = (defaultValue?: boolean): Joi.BooleanSchema => {
  let schema = Joi.boolean();

  if (defaultValue !== undefined) {
    schema = schema.default(defaultValue);
  }

  return schema;
};

/**
 * Creates a schema with all fields optional (for PATCH/update requests)
 * 
 * Useful for partial update operations
 * 
 * @param fullSchema - Original schema
 * @returns Schema with all fields optional
 * 
 * @example
 * class UserService extends BaseService {
 *   static updateSchema = createPartialSchema(UserService.createSchema);
 * }
 */
export const createPartialSchema = (fullSchema: Joi.ObjectSchema): Joi.ObjectSchema => {
  return fullSchema.fork(Object.keys(fullSchema.describe().keys), (schema) =>
    schema.optional()
  );
};
