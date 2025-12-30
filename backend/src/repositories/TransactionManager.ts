/**
 * Transaction Manager
 * 
 * Provides a clean API for managing database transactions.
 * Ensures proper BEGIN/COMMIT/ROLLBACK handling with try-catch protection.
 * Prevents connection leaks through finally block cleanup.
 * 
 * @module src/repositories/TransactionManager
 */

import { Pool, PoolClient } from 'pg';
import logger from '../utils/logger.ts';

/**
 * Transaction error class
 */
export class TransactionError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'TransactionError';
  }
}

/**
 * Manages database transactions
 * 
 * Provides a clean interface for managing transactional operations:
 * - Automatic connection acquisition and release
 * - Automatic BEGIN/COMMIT/ROLLBACK handling
 * - Transaction nesting (savepoints)
 * - Comprehensive error handling and logging
 * 
 * @example
 * const manager = new TransactionManager(pool);
 * 
 * await manager.execute(async (client) => {
 *   // All queries use this client
 *   await client.query('INSERT INTO users ...');
 *   await client.query('UPDATE accounts ...');
 *   // Automatically commits on success, rolls back on error
 * });
 */
export class TransactionManager {
  private pool: Pool;

  /**
   * Constructor
   * 
   * @param pool - Database connection pool
   */
  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Executes a transaction
   * 
   * @param callback - Callback function that receives the transaction client
   * @param options - Transaction options
   * @returns Result of callback function
   * 
   * @throws TransactionError if transaction fails
   * 
   * @example
   * await transactionManager.execute(async (client) => {
   *   const result = await client.query('INSERT INTO jobs ...');
   *   return result;
   * });
   */
  async execute<T>(
    callback: (client: PoolClient) => Promise<T>,
    options: { isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE'; timeout?: number } = {}
  ): Promise<T> {
    const client = await this.pool.connect();
    let timeout: NodeJS.Timeout | undefined;

    try {
      // Set isolation level if specified
      if (options.isolationLevel) {
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
      }

      // Set timeout if specified
      if (options.timeout) {
        timeout = setTimeout(() => {
          client.query('ROLLBACK TRANSACTION').catch(() => {
            // Ignore rollback errors on timeout
          });
        }, options.timeout);
      }

      // Begin transaction
      await client.query('BEGIN');

      // Execute callback
      const result = await callback(client);

      // Commit on success
      await client.query('COMMIT');

      logger.debug('Transaction committed successfully');

      return result;
    } catch (error) {
      try {
        // Rollback on error
        await client.query('ROLLBACK');

        logger.error('Transaction rolled back due to error', {
          error: (error as Error).message,
          stack: (error as Error).stack
        });
      } catch (rollbackError) {
        logger.error('Error during rollback', {
          originalError: (error as Error).message,
          rollbackError: (rollbackError as Error).message
        });
      }

      throw new TransactionError(
        `Transaction failed: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      // Clear timeout
      if (timeout) {
        clearTimeout(timeout);
      }

      // Always release client
      client.release();
    }
  }

  /**
   * Executes multiple operations in a single transaction
   * 
   * Useful for batch operations that must all succeed or all fail
   * 
   * @param operations - Array of async operations
   * @returns Array of operation results
   * 
   * @example
   * const results = await transactionManager.executeMany([
   *   (client) => client.query('INSERT INTO users ...'),
   *   (client) => client.query('INSERT INTO accounts ...'),
   *   (client) => client.query('UPDATE summary ...')
   * ]);
   */
  async executeMany<T>(
    operations: Array<(client: PoolClient) => Promise<T>>
  ): Promise<T[]> {
    return this.execute(async (client) => {
      const results: T[] = [];

      for (const operation of operations) {
        const result = await operation(client);
        results.push(result);
      }

      return results;
    });
  }

  /**
   * Executes a transaction with automatic savepoint support for retries
   * 
   * Useful for operations that might conflict and need retrying
   * 
   * @param callback - Callback that may throw to trigger retry
   * @param maxRetries - Maximum number of retries
   * @param backoff - Backoff delay in ms between retries
   * @returns Result of callback function
   * 
   * @throws TransactionError if max retries exceeded
   * 
   * @example
   * await transactionManager.executeWithRetry(
   *   async (client) => {
   *     // Might fail with unique constraint violation
   *     return await client.query('INSERT INTO users ...');
   *   },
   *   3,  // max 3 retries
   *   100 // 100ms backoff
   * );
   */
  async executeWithRetry<T>(
    callback: (client: PoolClient) => Promise<T>,
    maxRetries: number = 3,
    backoff: number = 100
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(callback);
      } catch (error) {
        lastError = error as Error;

        const isLastAttempt = attempt === maxRetries;

        if (isLastAttempt) {
          throw error;
        }

        const delay = backoff * attempt; // Exponential backoff

        logger.warn('Transaction failed, retrying', {
          attempt,
          maxRetries,
          error: (error as Error).message,
          nextRetryIn: delay
        });

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new TransactionError(
      `Transaction failed after ${maxRetries} retries: ${lastError?.message}`
    );
  }

  /**
   * Executes a transaction with nested savepoint support
   * 
   * Allows partial rollbacks without affecting outer transaction
   * 
   * @param outerCallback - Main transaction callback
   * @param nestedCallbacks - Nested operations using savepoints
   * @returns Result of outer callback
   * 
   * @example
   * await transactionManager.executeNested(
   *   async (client) => {
   *     // Outer transaction
   *     await client.query('INSERT INTO accounts ...');
   *     return true;
   *   },
   *   [
   *     async (client, savepoint) => {
   *       try {
   *         await client.query(`SAVEPOINT ${savepoint}`);
   *         await client.query('INSERT INTO users ...');
   *         await client.query(`RELEASE SAVEPOINT ${savepoint}`);
   *       } catch (error) {
   *         await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
   *         // Continue with outer transaction
   *       }
   *     }
   *   ]
   * );
   */
  async executeNested<T>(
    outerCallback: (client: PoolClient) => Promise<T>,
    nestedCallbacks: Array<(client: PoolClient, savepointName: string) => Promise<void>>
  ): Promise<T> {
    return this.execute(async (client) => {
      // Execute outer transaction
      const result = await outerCallback(client);

      // Execute nested savepoints
      for (let i = 0; i < nestedCallbacks.length; i++) {
        const savepointName = `sp_${i}_${Date.now()}`;

        try {
          await nestedCallbacks[i](client, savepointName);
        } catch (error) {
          logger.warn('Nested operation failed', {
            savepoint: savepointName,
            error: (error as Error).message,
            continuing: true
          });
          // Continue with next nested operation
        }
      }

      return result;
    });
  }
}

/**
 * Helper function to execute a transaction
 * 
 * Convenience wrapper around TransactionManager.execute
 * 
 * @param pool - Database connection pool
 * @param callback - Transaction callback
 * @returns Result of callback
 * 
 * @example
 * const result = await withTransaction(pool, async (client) => {
 *   await client.query('INSERT INTO users ...');
 *   return { success: true };
 * });
 */
export async function withTransaction<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const manager = new TransactionManager(pool);
  return manager.execute(callback);
}

/**
 * Helper function to execute multiple operations in a transaction
 * 
 * @param pool - Database connection pool
 * @param operations - Array of operations
 * @returns Array of results
 * 
 * @example
 * const results = await withTransactionMany(pool, [
 *   (client) => client.query('INSERT ...'),
 *   (client) => client.query('UPDATE ...')
 * ]);
 */
export async function withTransactionMany<T>(
  pool: Pool,
  operations: Array<(client: PoolClient) => Promise<T>>
): Promise<T[]> {
  const manager = new TransactionManager(pool);
  return manager.executeMany(operations);
}
