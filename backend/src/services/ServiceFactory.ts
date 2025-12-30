/**
 * Service Factory
 * 
 * Factory pattern for creating service instances with proper dependency injection.
 * Ensures:
 * - Consistent service instantiation
 * - Proper repository injection
 * - Connection pool sharing
 * - Single responsibility principle
 * 
 * @module src/services/ServiceFactory
 */

import { Pool } from 'pg';
import { JobService } from './jobs/JobService.js';
import { CandidateService } from './candidates/CandidateService.js';
import { JobRepository } from '../repositories/jobs/JobRepository.js';
import { CandidateRepository } from '../repositories/candidates/CandidateRepository.js';
import logger from '../utils/logger.js';

/**
 * Service Factory
 * 
 * Creates service instances with proper dependency injection.
 * 
 * Pattern:
 * 1. Services receive pool and repository in constructor
 * 2. Services are stateless (all state is in repositories)
 * 3. Factory handles wiring of dependencies
 * 4. Services are cached to avoid duplication (optional)
 * 
 * @example
 * // Create factory
 * const factory = new ServiceFactory(pool);
 * 
 * // Get service
 * const jobService = factory.getJobService();
 *
 * // Use service
 * const job = await jobService.create(data, options);
 */
export class ServiceFactory {
  private pool: Pool;
  private jobService: JobService | null = null;
  private candidateService: CandidateService | null = null;
  private jobRepository: JobRepository | null = null;
  private candidateRepository: CandidateRepository | null = null;

  /**
   * Constructor
   * 
   * @param pool - Database connection pool
   */
  
  pool: any;

constructor(pool: Pool) {
    this.pool = pool;
    logger.info('Service factory created');
  }

  /**
   * Gets or creates JobService instance
   * 
   * Caches instance to avoid duplication
   * 
   * @returns JobService instance
   * 
   * @example
   * const jobService = factory.getJobService();
   * const job = await jobService.create(data, options);
   */
  getJobService(): JobService {
    if (!this.jobService) {
      const repository = this.getJobRepository();
      this.jobService = new JobService(this.pool, repository);
      logger.debug('JobService instance created');
    }
    return this.jobService;
  }

  /**
   * Gets or creates CandidateService instance
   * 
   * @returns CandidateService instance
   */
  getCandidateService(): CandidateService {
    if (!this.candidateService) {
      const repository = this.getCandidateRepository();
      this.candidateService = new CandidateService(this.pool, repository);
      logger.debug('CandidateService instance created');
    }
    return this.candidateService;
  }

  /**
   * Gets or creates JobRepository instance
   * 
   * Caches instance to share across services
   * 
   * @returns JobRepository instance
   */
  private getJobRepository(): JobRepository {
    if (!this.jobRepository) {
      this.jobRepository = new JobRepository(this.pool);
    }
    return this.jobRepository;
  }

  /**
   * Gets or creates CandidateRepository instance
   * 
   * @returns CandidateRepository instance
   */
  private getCandidateRepository(): CandidateRepository {
    if (!this.candidateRepository) {
      this.candidateRepository = new CandidateRepository(this.pool);
    }
    return this.candidateRepository;
  }

  /**
   * Clears all cached instances
   * 
   * Useful for testing or when pool changes
   * 
   * @example
   * factory.clearCache();
   */
  clearCache(): void {
    this.jobService = null;
    this.candidateService = null;
    this.jobRepository = null;
    this.candidateRepository = null;
    logger.debug('Service factory cache cleared');
  }

  /**
   * Creates new instances (bypasses cache)
   * 
   * Useful for testing in isolation
   * 
   * @returns Factory instance in non-caching mode
   * 
   * @example
   * // Create a fresh factory for each test
   * const testFactory = ServiceFactory.create(pool);
   */
  static create(pool: Pool): ServiceFactory {
    return new ServiceFactory(pool);
  }
}

/**
 * Global service factory instance
 * 
 * Should be initialized once at application startup
 * 
 * @example
 * // Initialize at startup
 * const pool = new Pool(config);
 * globalServiceFactory = new ServiceFactory(pool);
 * 
 * // Use throughout application
 * const jobService = globalServiceFactory.getJobService();
 */
let globalServiceFactory: ServiceFactory | null = null;

/**
 * Initializes the global service factory
 * 
 * Should be called once at application startup
 * 
 * @param pool - Database connection pool
 * @returns Service factory instance
 * 
 * @example
 * import { initializeServiceFactory } from './services/ServiceFactory';
 * 
 * // In main.ts or server initialization
 * const pool = new Pool(databaseConfig);
 * initializeServiceFactory(pool);
 * 
 * // Later, access global factory
 * const jobService = getServiceFactory().getJobService();
 */
export function initializeServiceFactory(pool: Pool): ServiceFactory {
  if (globalServiceFactory) {
    logger.warn('Service factory already initialized, clearing old instance');
    globalServiceFactory.clearCache();
  }

  globalServiceFactory = new ServiceFactory(pool);
  logger.info('Global service factory initialized');

  return globalServiceFactory;
}

/**
 * Gets the global service factory instance
 * 
 * Must call initializeServiceFactory first
 * 
 * @returns Global service factory
 * @throws Error if factory not initialized
 * 
 * @example
 * const factory = getServiceFactory();
 * const jobService = factory.getJobService();
 */
export function getServiceFactory(): ServiceFactory {
  if (!globalServiceFactory) {
    throw new Error(
      'Service factory not initialized. Call initializeServiceFactory(pool) first.'
    );
  }

  return globalServiceFactory;
}

/**
 * Gets a service directly from global factory
 * 
 * Shorthand for common pattern
 * 
 * @param serviceType - Type of service to get
 * @returns Service instance
 * 
 * @example
 * const jobService = getService('job');
 * const candidateService = getService('candidate');
 */
export function getService(serviceType: 'job' | 'candidate'): any {
  const factory = getServiceFactory();

  switch (serviceType) {
    case 'job':
      return factory.getJobService();
    case 'candidate':
      return factory.getCandidateService();
    default:
      throw new Error(`Unknown service type: ${serviceType}`);
  }
}

/**
 * Service factory options
 */
export interface ServiceFactoryConfig {
  pool: Pool;
  cacheServices?: boolean; // Default: true
  logger?: any; // Custom logger instance
}
