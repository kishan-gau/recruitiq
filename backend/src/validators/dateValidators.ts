/**
 * Centralized Date Validation Schemas
 * 
 * Use these validators across all services for consistency
 * 
 * @module validators/dateValidators
 */

import Joi from 'joi';

/**
 * Standard date validation (accepts YYYY-MM-DD or ISO 8601)
 * Use for: hire_date, birth_date, effective_date, etc.
 */
export const dateOnly = Joi.alternatives().try(
  Joi.date().iso(),
  Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
).messages({
  'alternatives.match': 'Date must be in YYYY-MM-DD or ISO 8601 format',
  'string.pattern.base': 'Date must be in YYYY-MM-DD format'
});

/**
 * Required date validation
 */
export const dateOnlyRequired = dateOnly.required();

/**
 * Optional date validation
 */
export const dateOnlyOptional = dateOnly.optional().allow(null);

/**
 * DateTime validation (ISO 8601 with timezone)
 * Use for: scheduled_at, created_at, updated_at, etc.
 */
export const dateTime = Joi.date().iso().messages({
  'date.format': 'DateTime must be in ISO 8601 format'
});

/**
 * Required datetime validation
 */
export const dateTimeRequired = dateTime.required();

/**
 * Optional datetime validation
 */
export const dateTimeOptional = dateTime.optional().allow(null);

/**
 * Future date validation
 * Use for: scheduled_at, expires_at, etc.
 */
export const futureDate = dateOnly.custom((value, helpers) => {
  const date = new Date(value);
  const now = new Date();
  
  // Set time to start of day for date-only comparison
  date.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  if (date <= now) {
    return helpers.error('date.future');
  }
  return value;
}).messages({
  'date.future': 'Date must be in the future'
});

/**
 * Future or today date validation
 */
export const futureDateOrToday = dateOnly.custom((value, helpers) => {
  const date = new Date(value);
  const now = new Date();
  
  // Set time to start of day for date-only comparison
  date.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  if (date < now) {
    return helpers.error('date.futureOrToday');
  }
  return value;
}).messages({
  'date.futureOrToday': 'Date must be today or in the future'
});

/**
 * Past date validation
 * Use for: birth_date, hire_date (in past), etc.
 */
export const pastDate = dateOnly.custom((value, helpers) => {
  const date = new Date(value);
  const now = new Date();
  
  // Set time to start of day for date-only comparison
  date.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  if (date >= now) {
    return helpers.error('date.past');
  }
  return value;
}).messages({
  'date.past': 'Date must be in the past'
});

/**
 * Past or today date validation
 */
export const pastDateOrToday = dateOnly.custom((value, helpers) => {
  const date = new Date(value);
  const now = new Date();
  
  // Set time to start of day for date-only comparison
  date.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  if (date > now) {
    return helpers.error('date.pastOrToday');
  }
  return value;
}).messages({
  'date.pastOrToday': 'Date must be today or in the past'
});

/**
 * Date range validation
 * Use for: start_date and end_date pairs
 */
export const dateRange = Joi.object({
  startDate: dateOnlyRequired.label('Start date'),
  endDate: dateOnlyRequired.label('End date')
}).custom((value, helpers) => {
  const start = new Date(value.startDate);
  const end = new Date(value.endDate);
  
  if (end < start) {
    return helpers.error('dateRange.order');
  }
  
  return value;
}).messages({
  'dateRange.order': 'End date must be after start date'
});

/**
 * Birth date validation (reasonable age range)
 */
export const birthDate = pastDate.custom((value, helpers) => {
  const date = new Date(value);
  const now = new Date();
  const age = now.getFullYear() - date.getFullYear();
  
  if (age < 16) {
    return helpers.error('birthDate.tooYoung');
  }
  
  if (age > 120) {
    return helpers.error('birthDate.tooOld');
  }
  
  return value;
}).messages({
  'birthDate.tooYoung': 'Employee must be at least 16 years old',
  'birthDate.tooOld': 'Invalid birth date (age exceeds 120 years)'
});

/**
 * Hire date validation (not too far in past, can be future)
 */
export const hireDate = dateOnly.custom((value, helpers) => {
  const date = new Date(value);
  const now = new Date();
  const yearsDiff = (now - date) / (365.25 * 24 * 60 * 60 * 1000);
  
  // Can't be more than 50 years in the past
  if (yearsDiff > 50) {
    return helpers.error('hireDate.tooOld');
  }
  
  // Can't be more than 1 year in the future
  if (yearsDiff < -1) {
    return helpers.error('hireDate.tooFuture');
  }
  
  return value;
}).messages({
  'hireDate.tooOld': 'Hire date cannot be more than 50 years in the past',
  'hireDate.tooFuture': 'Hire date cannot be more than 1 year in the future'
});

/**
 * Effective date validation (typically today or future)
 */
export const effectiveDate = futureDateOrToday;

/**
 * Expiration date validation (must be future)
 */
export const expirationDate = futureDate;

/**
 * Pre-built validation objects for common scenarios
 */
export const dateValidation = {
  // Basic
  dateOnly,
  dateOnlyRequired,
  dateOnlyOptional,
  dateTime,
  dateTimeRequired,
  dateTimeOptional,
  
  // Directional
  futureDate,
  futureDateOrToday,
  pastDate,
  pastDateOrToday,
  
  // Ranges
  dateRange,
  
  // Specific use cases
  birthDate,
  hireDate,
  effectiveDate,
  expirationDate
};

export default dateValidation;
