/**
 * Service Layer Exports
 * 
 * Central export point for all service layer utilities.
 * Makes it easy to import services from a single location.
 * 
 * @module src/services
 */

// Base service and utilities
export { BaseService, serviceOptions } from './BaseService.ts';
export type { ServiceOptions, ValidationResult } from './BaseService.ts';

// Validation schemas
export {
  email,
  optionalEmail,
  password,
  uuid,
  optionalUuid,
  name,
  optionalName,
  phone,
  url,
  date,
  dateOnly,
  integer,
  positiveNumber,
  decimal,
  enumField,
  arrayOf,
  text,
  slug,
  boolean,
  createPartialSchema
} from './validationSchemas.ts';

// Job service
export { JobService } from './jobs/JobService.ts';
export type { Job, CreateJobInput, UpdateJobInput } from './jobs/JobService.ts';

// Candidate service
export { CandidateService } from './candidates/CandidateService.ts';
export type { Candidate, CreateCandidateInput, UpdateCandidateInput } from './candidates/CandidateService.ts';

// Service factory
export {
  ServiceFactory,
  initializeServiceFactory,
  getServiceFactory,
  getService
} from './ServiceFactory.ts';
export type { ServiceFactoryConfig } from './ServiceFactory.ts';

/**
 * Quick reference: Common import patterns
 * 
 * @example
 * // Import base service and create custom service
 * import { BaseService, serviceOptions } from '@services';
 * 
 * class CustomService extends BaseService {
 *   // Custom implementation
 * }
 * 
 * @example
 * // Use validation schemas
 * import { email, password, text, uuid } from '@services';
 * import Joi from 'joi';
 * 
 * const schema = Joi.object({
 *   email: email(),
 *   password: password(),
 *   bio: text(),
 *   organizationId: uuid()
 * });
 * 
 * @example
 * // Initialize and use services
 * import { initializeServiceFactory, getServiceFactory } from '@services';
 * import { Pool } from 'pg';
 * 
 * // At application startup
 * const pool = new Pool(config);
 * initializeServiceFactory(pool);
 * 
 * // In routes or controllers
 * const factory = getServiceFactory();
 * const jobService = factory.getJobService();
 * const jobs = await jobService.list({}, organizationId);
 * 
 * @example
 * // Use service types
 * import { Job, CreateJobInput } from '@services';
 * 
 * const jobData: CreateJobInput = {
 *   title: 'Senior Developer',
 *   description: 'We are looking for...',
 *   workspaceId: 'workspace-123'
 * };
 * 
 * const job = await jobService.create(jobData, options);
 */
