/**
 * Base Service Class
 * 
 * Abstract base class for all business logic services.
 * Provides common patterns for:
 * - Input validation with Joi schemas
 * - Business rule enforcement
 * - Repository access with dependency injection
 * - Error handling with custom exceptions
 * - Logging with audit trail
 * - Transaction coordination
 * 
 * @module src/services/BaseService
 */

import { ObjectSchema } from 'joi';
import { BaseRepository, PaginationResult } from '../repositories/BaseRepository.js';
import { TransactionManager } from '../repositories/TransactionManager.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { Pool } from 'pg';

/**
 * Service options
 */
export interface ServiceOptions {
  auditBy?: string;
  organizationId: string;
  context?: Record<string, any>;
}

/**
 * Validation result
 */
export interface ValidationResult<T> {
  isValid: boolean;
  value?: T;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Base service class
 * 
 * Provides common service layer functionality:
 * - Input validation with Joi schemas
 * - Business rule enforcement
 * - Repository integration
 * - Error handling
 * - Audit logging
 * - Transaction support
 * 
 * All services should extend this class.
 * 
 * @template T - Entity type
 * 
 * @example
 * class JobService extends BaseService<Job> {
 *   constructor(jobRepository: JobRepository, pool: Pool) {
 *     super(pool);
 *     this.repository = jobRepository;
 *   }
 *   
 *   static createSchema = Joi.object({
 *     title: Joi.string().required().min(3).max(200),
 *     description: Joi.string().required().min(10),
 *     workspaceId: Joi.string().uuid().required()
 *   });
 *   
 *   async create(data: any, options: ServiceOptions): Promise<Job> {
 *     // 1. Validate
 *     const validated = await this.validate(data, JobService.createSchema);
 *     
 *     // 2. Check business rules
 *     const workspace = await this.repository.findById(validated.workspaceId, options.organizationId);
 *     if (!workspace) {
 *       throw new NotFoundError('Workspace not found');
 *     }
 *     
 *     // 3. Create
 *     const job = await this.repository.create(
 *       validated,
 *       options.organizationId,
 *       { auditBy: options.auditBy }
 *     );
 *     
 *     // 4. Log
 *     this.log('Job created', { jobId: job.id, ...options.context });
 *     
 *     return job;
 *   }
 * }
 */
export abstract class BaseService<T extends { id: string }> {
  protected pool: Pool;
  protected repository!: BaseRepository<T>;
  protected transactionManager: TransactionManager;

  /**
   * Constructor
   * 
   * @param pool - Database connection pool
   */
  constructor(pool: Pool) {
    this.pool = pool;
    this.transactionManager = new TransactionManager(pool);
  }

  /**
   * Validates input data against a Joi schema
   * 
   * @param data - Data to validate
   * @param schema - Joi schema
   * @param options - Validation options
   * @returns Validation result
   * @throws ValidationError if validation fails
   * 
   * @example
   * const validated = await this.validate(data, MyService.createSchema);
   * // OR with try-catch
   * try {
   *   const validated = await this.validate(data, schema);
   * } catch (error) {
   *   if (error instanceof ValidationError) {
   *     // Handle validation errors
   *   }
   * }
   */
  async validate<V extends any>(
    data: any,
    schema: ObjectSchema,
    options: { abortEarly?: boolean; stripUnknown?: boolean } = {}
  ): Promise<V> {
    try {
      const validated = await schema.validateAsync(data, {
        abortEarly: false,
        stripUnknown: true,
        ...options
      });

      return validated as V;
    } catch (error: any) {
      // Format validation errors
      const errors = error.details?.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, '\'')
      })) || [];

      logger.warn('Validation failed', {
        errors,
        dataKeys: Object.keys(data)
      });

      throw new ValidationError('Validation failed', errors);
    }
  }

  /**
   * Validates data and returns result instead of throwing
   * 
   * Useful for conditional logic that depends on validation state
   * 
   * @param data - Data to validate
   * @param schema - Joi schema
   * @returns Validation result with isValid flag
   * 
   * @example
   * const result = await this.tryValidate(data, schema);
   * if (result.isValid) {
   *   // Use result.value
   * } else {
   *   // Handle result.errors
   * }
   */
  async tryValidate<V extends any>(
    data: any,
    schema: ObjectSchema
  ): Promise<ValidationResult<V>> {
    try {
      const value = await this.validate<V>(data, schema);
      return { isValid: true, value };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          isValid: false,
          errors: (error as any).details
        };
      }
      throw error;
    }
  }

  /**
   * Checks if a record exists and is accessible
   * 
   * @param id - Record ID
   * @param organizationId - Organization ID
   * @returns Record or throws NotFoundError
   * 
   * @example
   * const job = await this.requireExists('job-123', 'org-456');
   */
  async requireExists(id: string, organizationId: string): Promise<T> {
    const record = await this.repository.findById(id, organizationId);

    if (!record) {
      throw new NotFoundError(`${this.getEntityName()} not found`);
    }

    return record;
  }

  /**
   * Checks if a record does NOT exist
   * 
   * Useful for preventing duplicates
   * 
   * @param criteria - Search criteria
   * @param organizationId - Organization ID
   * @throws ConflictError if record exists
   * 
   * @example
   * await this.requireNotExists({ email: 'test@example.com' }, organizationId);
   * // Will throw if email already exists
   */
  async requireNotExists(criteria: Partial<T>, organizationId: string): Promise<void> {
    const existing = await this.repository.findOne(criteria, organizationId);

    if (existing) {
      throw new ConflictError(`${this.getEntityName()} already exists`);
    }
  }

  /**
   * Gets all records with pagination
   * 
   * @param criteria - Filter criteria
   * @param organizationId - Organization ID
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated results
   * 
   * @example
   * const result = await this.list({ status: 'open' }, orgId, 1, 20);
   */
  async list(
    criteria: Partial<T> = {},
    organizationId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginationResult<T>> {
    return this.repository.paginate(criteria, organizationId, page, limit);
  }

  /**
   * Gets a single record by ID
   * 
   * @param id - Record ID
   * @param organizationId - Organization ID
   * @returns Record or null
   * 
   * @example
   * const job = await this.get('job-123', organizationId);
   */
  async get(id: string, organizationId: string): Promise<T | null> {
    return this.repository.findById(id, organizationId);
  }

  /**
   * Executes a service operation in a transaction
   * 
   * Ensures all-or-nothing semantics for operations with multiple steps
   * 
   * @param operation - Async operation to execute
   * @param options - Transaction options
   * @returns Operation result
   * 
   * @example
   * const result = await this.transaction(async (client) => {
   *   // Multiple database operations
   *   await client.query('INSERT INTO...');
   *   await client.query('UPDATE...');
   *   return { success: true };
   * });
   */
  async transaction<R>(
    operation: (manager: TransactionManager) => Promise<R>,
    options: { isolationLevel?: string; timeout?: number } = {}
  ): Promise<R> {
    return this.transactionManager.execute(async (client) => {
      return operation(this.transactionManager);
    }, options);
  }

  /**
   * Checks authorization for a record based on organization
   * 
   * Subclasses can override for more complex authorization
   * 
   * @param record - Record to check
   * @param organizationId - Organization ID
   * @param userId - User ID (optional)
   * @throws Error if unauthorized
   * 
   * @example
   * await this.authorize(job, organizationId, userId);
   */
  async authorize(
    record: any,
    organizationId: string,
    userId?: string
  ): Promise<void> {
    // Basic check: organization_id matches
    if (record.organizationId !== organizationId) {
      throw new Error('Access denied');
    }
  }

  /**
   * Handles creation with validation and logging
   * 
   * Template method for consistent create pattern
   * Subclasses override performCreate for custom logic
   * 
   * @param data - Create data
   * @param schema - Validation schema
   * @param options - Service options
   * @returns Created record
   * 
   * @example
   * async create(data: any, options: ServiceOptions): Promise<Job> {
   *   return this.performCreate(data, JobService.createSchema, options);
   * }
   */
  protected async performCreate<C extends Partial<T>>(
    data: any,
    schema: ObjectSchema,
    options: ServiceOptions
  ): Promise<T> {
    // 1. Validate
    const validated = await this.validate<C>(data, schema);

    // 2. Check for conflicts (subclasses may override)
    await this.checkCreateConflicts(validated as any, options.organizationId);

    // 3. Create
    const record = await this.repository.create(
      validated as any,
      options.organizationId,
      { auditBy: options.auditBy }
    );

    // 4. Log
    this.log('created', {
      id: record.id,
      ...options.context
    });

    return record;
  }

  /**
   * Check for conflicts before creating
   * 
   * Override in subclasses for custom conflict checking
   * 
   * @param data - Validated data
   * @param organizationId - Organization ID
   * @throws ConflictError if conflict found
   * 
   * @example
   * protected async checkCreateConflicts(data: CreateJobInput, orgId: string) {
   *   const existing = await this.repository.findOne({ email: data.email }, orgId);
   *   if (existing) {
   *     throw new ConflictError('Email already exists');
   *   }
   * }
   */
  protected async checkCreateConflicts(data: any, organizationId: string): Promise<void> {
    // Override in subclasses
  }

  /**
   * Handles update with validation and logging
   * 
   * Template method for consistent update pattern
   * 
   * @param id - Record ID
   * @param data - Update data
   * @param schema - Validation schema
   * @param options - Service options
   * @returns Updated record
   * 
   * @example
   * async update(id: string, data: any, options: ServiceOptions): Promise<Job> {
   *   return this.performUpdate(id, data, JobService.updateSchema, options);
   * }
   */
  protected async performUpdate<U extends Partial<T>>(
    id: string,
    data: any,
    schema: ObjectSchema,
    options: ServiceOptions
  ): Promise<T> {
    // 1. Validate
    const validated = await this.validate<U>(data, schema);

    // 2. Check exists
    const existing = await this.requireExists(id, options.organizationId);

    // 3. Check conflicts (subclasses may override)
    await this.checkUpdateConflicts(id, validated as any, options.organizationId);

    // 4. Check authorization (subclasses may override)
    await this.authorize(existing, options.organizationId, options.auditBy);

    // 5. Update
    const updated = await this.repository.update(
      id,
      validated as any,
      options.organizationId,
      { auditBy: options.auditBy }
    );

    if (!updated) {
      throw new NotFoundError(`${this.getEntityName()} not found`);
    }

    // 6. Log
    this.log('updated', {
      id,
      ...options.context
    });

    return updated;
  }

  /**
   * Check for conflicts before updating
   * 
   * Override in subclasses for custom conflict checking
   * 
   * @param id - Record ID
   * @param data - Update data
   * @param organizationId - Organization ID
   * @throws ConflictError if conflict found
   */
  protected async checkUpdateConflicts(
    id: string,
    data: any,
    organizationId: string
  ): Promise<void> {
    // Override in subclasses
  }

  /**
   * Handles deletion with authorization and logging
   * 
   * Template method for consistent delete pattern
   * Uses soft delete by default
   * 
   * @param id - Record ID
   * @param options - Service options
   * @returns true if deleted
   * 
   * @example
   * async delete(id: string, options: ServiceOptions): Promise<boolean> {
   *   return this.performDelete(id, options);
   * }
   */
  protected async performDelete(id: string, options: ServiceOptions): Promise<boolean> {
    // 1. Check exists
    const existing = await this.requireExists(id, options.organizationId);

    // 2. Check authorization (subclasses may override)
    await this.authorize(existing, options.organizationId, options.auditBy);

    // 3. Check delete constraints (subclasses may override)
    await this.checkDeleteConstraints(id, options.organizationId);

    // 4. Delete
    const deleted = await this.repository.softDelete(id, options.organizationId, {
      auditBy: options.auditBy
    });

    // 5. Log
    if (deleted) {
      this.log('deleted', {
        id,
        ...options.context
      });
    }

    return deleted;
  }

  /**
   * Check delete constraints
   * 
   * Override in subclasses for custom constraints
   * Example: prevent delete if job has applications
   * 
   * @param id - Record ID
   * @param organizationId - Organization ID
   * @throws Error if delete not allowed
   */
  protected async checkDeleteConstraints(id: string, organizationId: string): Promise<void> {
    // Override in subclasses
  }

  /**
   * Logs a service event
   * 
   * @param action - Action taken (created, updated, deleted, etc.)
   * @param context - Additional context
   */
  protected log(action: string, context?: Record<string, any>): void {
    logger.info(`${this.getEntityName()} ${action}`, context || {});
  }

  /**
   * Gets the entity name for logging
   * 
   * Override in subclasses for custom names
   * 
   * @returns Entity name
   * 
   * @example
   * // JobService returns "Job"
   * // CandidateService returns "Candidate"
   */
  protected getEntityName(): string {
    const className = this.constructor.name;
    return className.replace(/Service$/, '');
  }
}

/**
 * Helper to create service options object
 * 
 * @param organizationId - Organization ID
 * @param auditBy - User ID (optional)
 * @param context - Additional context
 * @returns Service options
 * 
 * @example
 * const options = serviceOptions('org-123', 'user-456', { ip: '192.168.1.1' });
 */
export function serviceOptions(
  organizationId: string,
  auditBy?: string,
  context?: Record<string, any>
): ServiceOptions {
  return {
    organizationId,
    auditBy,
    context
  };
}
