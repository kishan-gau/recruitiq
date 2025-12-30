/**
 * Repository Factory
 * 
 * Factory pattern for creating repository instances with shared configuration.
 * Manages dependency injection for database connections and logging.
 * 
 * @module src/repositories/RepositoryFactory
 */

import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository.js';
import logger from '../utils/logger.js';

/**
 * Repository factory class
 * 
 * Centralizes repository creation with shared configuration.
 * Ensures all repositories use the same database pool and settings.
 * 
 * @example
 * const factory = new RepositoryFactory(pool);
 * const jobRepository = factory.create<Job>('jobs', JobRepository);
 */
export class RepositoryFactory {
  private pool: Pool;
  private repositories = new Map<string, any>();

  /**
   * Constructor
   * 
   * @param pool - Database connection pool
   */
  
  pool: any;

constructor(pool: Pool) {
    this.pool = pool;
    logger.info('RepositoryFactory initialized', {
      poolSize: {
        min: (pool as any).options?.min || 'default',
        max: (pool as any).options?.max || 'default'
      }
    });
  }

  /**
   * Creates or retrieves a repository instance
   * 
   * Repositories are cached to ensure singleton pattern per table.
   * 
   * @param tableName - Table name for the repository
   * @param RepositoryClass - Repository class to instantiate
   * @returns Repository instance
   * 
   * @example
   * const jobRepository = factory.create('jobs', JobRepository);
   * const anotherRef = factory.create('jobs', JobRepository); // Returns same instance
   */
  create<T extends BaseRepository<any>>(
    tableName: string,
    RepositoryClass: new (pool: Pool, tableName: string) => T
  ): T {
    const cacheKey = tableName;

    // Return cached instance if available
    if (this.repositories.has(cacheKey)) {
      return this.repositories.get(cacheKey);
    }

    // Create new instance
    const repository = new RepositoryClass(this.pool, tableName);

    // Cache the instance
    this.repositories.set(cacheKey, repository);

    logger.debug('Repository created', {
      tableName,
      repositoryClass: RepositoryClass.name
    });

    return repository;
  }

  /**
   * Clears all cached repositories
   * 
   * Use when resetting repositories (e.g., in tests)
   * 
   * @example
   * factory.clearCache();
   */
  clearCache(): void {
    this.repositories.clear();
    logger.debug('Repository cache cleared');
  }

  /**
   * Gets the database pool
   * 
   * @returns Database connection pool
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Gets all created repositories
   * 
   * @returns Map of repository instances
   */
  getRepositories(): Map<string, any> {
    return new Map(this.repositories);
  }

  /**
   * Checks if a repository exists in cache
   * 
   * @param tableName - Table name
   * @returns true if repository is cached
   */
  has(tableName: string): boolean {
    return this.repositories.has(tableName);
  }

  /**
   * Gets a cached repository
   * 
   * @param tableName - Table name
   * @returns Repository instance or undefined
   */
  get<T extends BaseRepository<any>>(tableName: string): T | undefined {
    return this.repositories.get(tableName);
  }
}

/**
 * Global repository factory instance
 * 
 * Should be initialized once at application startup
 */
let globalFactory: RepositoryFactory | undefined;

/**
 * Initializes global repository factory
 * 
 * @param pool - Database connection pool
 * 
 * @example
 * ```typescript
 * import { initializeRepositoryFactory } from './repositories/RepositoryFactory.js';
 * 
 * const pool = new Pool({ ...config });
 * initializeRepositoryFactory(pool);
 * ```
 */
export function initializeRepositoryFactory(pool: Pool): RepositoryFactory {
  globalFactory = new RepositoryFactory(pool);
  logger.info('Global RepositoryFactory initialized');
  return globalFactory;
}

/**
 * Gets the global repository factory
 * 
 * Must be called after initializeRepositoryFactory
 * 
 * @returns Global RepositoryFactory instance
 * @throws Error if factory not initialized
 * 
 * @example
 * const factory = getRepositoryFactory();
 * const jobRepository = factory.create('jobs', JobRepository);
 */
export function getRepositoryFactory(): RepositoryFactory {
  if (!globalFactory) {
    throw new Error('RepositoryFactory not initialized. Call initializeRepositoryFactory first.');
  }
  return globalFactory;
}

/**
 * Helper to create a repository using global factory
 * 
 * @param tableName - Table name
 * @param RepositoryClass - Repository class to instantiate
 * @returns Repository instance
 * 
 * @example
 * const jobRepository = createRepository('jobs', JobRepository);
 */
export function createRepository<T extends BaseRepository<any>>(
  tableName: string,
  RepositoryClass: new (pool: Pool, tableName: string) => T
): T {
  return getRepositoryFactory().create(tableName, RepositoryClass);
}
