/**
 * Integration Error Handler
 * Provides comprehensive error handling, retry logic, and circuit breaker pattern
 * for cross-product integrations in monolithic architecture
 */

import logger from '../../utils/logger.ts';

class IntegrationErrorHandler {
  constructor() {
    this.logger = logger;
    this.circuitBreakers = new Map(); // Track circuit breaker state per integration
    this.integrationMetrics = new Map(); // Track success/failure metrics
    this.retryConfig = {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2
    };
    this.circuitBreakerConfig = {
      failureThreshold: 5, // Open circuit after 5 consecutive failures
      successThreshold: 2, // Close circuit after 2 consecutive successes
      timeout: 60000 // Reset circuit breaker after 60 seconds
    };
  }

  /**
   * Execute integration with retry logic and circuit breaker
   * 
   * @param {string} integrationName - Name of the integration (e.g., 'nexus-to-paylinq')
   * @param {Function} integrationFn - Async function to execute
   * @param {Object} context - Context data for logging
   * @param {Object} options - Override default retry/circuit breaker config
   * @returns {Promise<Object>} Result with success flag and data/error
   */
  async executeWithRetry(integrationName, integrationFn, context = {}, options = {}) {
    const config = { ...this.retryConfig, ...options };
    const startTime = Date.now();

    // Check circuit breaker
    if (this.isCircuitOpen(integrationName)) {
      const error = new Error(`Circuit breaker is OPEN for ${integrationName}`);
      this.logger.warn('[Integration] Circuit breaker blocked execution', {
        integration: integrationName,
        context
      });
      
      return {
        success: false,
        error: error.message,
        circuitBreakerOpen: true,
        executionTimeMs: Date.now() - startTime
      };
    }

    let lastError;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      attempt++;

      try {
        this.logger.info('[Integration] Executing integration', {
          integration: integrationName,
          attempt,
          maxRetries: config.maxRetries,
          context
        });

        const result = await integrationFn();

        // Success - record metrics and close circuit if needed
        this.recordSuccess(integrationName);
        this.updateCircuitBreaker(integrationName, true);

        const executionTimeMs = Date.now() - startTime;

        this.logger.info('[Integration] Execution successful', {
          integration: integrationName,
          attempt,
          executionTimeMs,
          context
        });

        return {
          success: true,
          data: result,
          attempt,
          executionTimeMs
        };

      } catch (error) {
        lastError = error;

        // Record failure
        this.recordFailure(integrationName, error);

        const shouldRetry = attempt <= config.maxRetries && this.isRetryableError(error);

        this.logger.error('[Integration] Execution failed', {
          integration: integrationName,
          attempt,
          maxRetries: config.maxRetries,
          shouldRetry,
          error: error.message,
          stack: error.stack,
          context
        });

        if (!shouldRetry) {
          break;
        }

        // Calculate delay with exponential backoff
        const delayMs = Math.min(
          config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs
        );

        this.logger.info('[Integration] Retrying after delay', {
          integration: integrationName,
          nextAttempt: attempt + 1,
          delayMs
        });

        await this.sleep(delayMs);
      }
    }

    // All retries exhausted - update circuit breaker
    this.updateCircuitBreaker(integrationName, false);

    const executionTimeMs = Date.now() - startTime;

    return {
      success: false,
      error: lastError.message,
      stack: lastError.stack,
      attempts: attempt,
      executionTimeMs
    };
  }

  /**
   * Execute integration without blocking main workflow
   * Logs errors but always returns success to prevent blocking
   * 
   * @param {string} integrationName - Name of the integration
   * @param {Function} integrationFn - Async function to execute
   * @param {Object} context - Context data for logging
   * @param {Object} options - Override default config
   * @returns {Promise<Object>} Always returns success with integration result
   */
  async executeNonBlocking(integrationName, integrationFn, context = {}, options = {}) {
    try {
      const result = await this.executeWithRetry(integrationName, integrationFn, context, options);
      
      if (!result.success) {
        this.logger.warn('[Integration] Non-blocking integration failed', {
          integration: integrationName,
          result,
          context,
          note: 'Main workflow will continue'
        });
      }

      return {
        mainWorkflowSuccess: true,
        integrationResult: result
      };

    } catch (error) {
      // Should never happen since executeWithRetry catches all errors
      this.logger.error('[Integration] Unexpected error in non-blocking execution', {
        integration: integrationName,
        error: error.message,
        stack: error.stack,
        context
      });

      return {
        mainWorkflowSuccess: true,
        integrationResult: {
          success: false,
          error: error.message
        }
      };
    }
  }

  /**
   * Determine if error is retryable
   * Network errors, timeouts, and temporary failures should be retried
   * Validation errors and permanent failures should not
   */
  isRetryableError(error) {
    const nonRetryableMessages = [
      'not found',
      'already exists',
      'validation error',
      'invalid',
      'unauthorized',
      'forbidden',
      'duplicate'
    ];

    const errorMessage = error.message.toLowerCase();
    
    // Don't retry validation or business logic errors
    if (nonRetryableMessages.some(msg => errorMessage.includes(msg))) {
      return false;
    }

    // Retry network errors, timeouts, database errors
    const retryableMessages = [
      'timeout',
      'econnrefused',
      'enotfound',
      'network',
      'connection',
      'database',
      'deadlock',
      'lock timeout'
    ];

    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Circuit Breaker: Check if circuit is open (too many failures)
   */
  isCircuitOpen(integrationName) {
    const breaker = this.circuitBreakers.get(integrationName);
    
    if (!breaker) {
      return false;
    }

    // If circuit is open, check if timeout has passed
    if (breaker.state === 'open') {
      const now = Date.now();
      if (now - breaker.openedAt > this.circuitBreakerConfig.timeout) {
        // Move to half-open state
        breaker.state = 'half-open';
        breaker.consecutiveFailures = 0;
        this.logger.info('[Integration] Circuit breaker moved to HALF-OPEN', {
          integration: integrationName
        });
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Update circuit breaker state based on success/failure
   */
  updateCircuitBreaker(integrationName, success) {
    let breaker = this.circuitBreakers.get(integrationName);
    
    if (!breaker) {
      breaker = {
        state: 'closed',
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        openedAt: null
      };
      this.circuitBreakers.set(integrationName, breaker);
    }

    if (success) {
      breaker.consecutiveFailures = 0;
      breaker.consecutiveSuccesses++;

      // Close circuit if in half-open and enough successes
      if (breaker.state === 'half-open' && 
          breaker.consecutiveSuccesses >= this.circuitBreakerConfig.successThreshold) {
        breaker.state = 'closed';
        this.logger.info('[Integration] Circuit breaker CLOSED', {
          integration: integrationName
        });
      }
    } else {
      breaker.consecutiveSuccesses = 0;
      breaker.consecutiveFailures++;

      // Open circuit if too many failures
      if (breaker.consecutiveFailures >= this.circuitBreakerConfig.failureThreshold) {
        breaker.state = 'open';
        breaker.openedAt = Date.now();
        this.logger.error('[Integration] Circuit breaker OPENED', {
          integration: integrationName,
          consecutiveFailures: breaker.consecutiveFailures,
          willResetIn: `${this.circuitBreakerConfig.timeout / 1000}s`
        });
      }
    }
  }

  /**
   * Record successful integration execution
   */
  recordSuccess(integrationName) {
    let metrics = this.integrationMetrics.get(integrationName);
    
    if (!metrics) {
      metrics = {
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        lastSuccess: null,
        lastFailure: null
      };
      this.integrationMetrics.set(integrationName, metrics);
    }

    metrics.totalExecutions++;
    metrics.successCount++;
    metrics.lastSuccess = new Date();
  }

  /**
   * Record failed integration execution
   */
  recordFailure(integrationName, error) {
    let metrics = this.integrationMetrics.get(integrationName);
    
    if (!metrics) {
      metrics = {
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        lastSuccess: null,
        lastFailure: null,
        recentErrors: []
      };
      this.integrationMetrics.set(integrationName, metrics);
    }

    metrics.totalExecutions++;
    metrics.failureCount++;
    metrics.lastFailure = new Date();
    
    // Keep last 10 errors
    if (!metrics.recentErrors) {
      metrics.recentErrors = [];
    }
    metrics.recentErrors.unshift({
      timestamp: new Date(),
      message: error.message
    });
    metrics.recentErrors = metrics.recentErrors.slice(0, 10);
  }

  /**
   * Get health status for all integrations
   */
  getHealthStatus() {
    const health = {};

    for (const [name, metrics] of this.integrationMetrics.entries()) {
      const breaker = this.circuitBreakers.get(name);
      const successRate = metrics.totalExecutions > 0
        ? (metrics.successCount / metrics.totalExecutions) * 100
        : 100;

      health[name] = {
        totalExecutions: metrics.totalExecutions,
        successCount: metrics.successCount,
        failureCount: metrics.failureCount,
        successRate: successRate.toFixed(2) + '%',
        lastSuccess: metrics.lastSuccess,
        lastFailure: metrics.lastFailure,
        circuitBreakerState: breaker?.state || 'closed',
        recentErrors: metrics.recentErrors || []
      };
    }

    return health;
  }

  /**
   * Reset metrics for an integration
   */
  resetMetrics(integrationName) {
    this.integrationMetrics.delete(integrationName);
    this.circuitBreakers.delete(integrationName);
    
    this.logger.info('[Integration] Metrics reset', {
      integration: integrationName
    });
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics() {
    this.integrationMetrics.clear();
    this.circuitBreakers.clear();
    
    this.logger.info('[Integration] All metrics reset');
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create integration context for logging
   */
  createContext(data) {
    return {
      timestamp: new Date().toISOString(),
      ...data
    };
  }
}

// Export singleton instance
const integrationErrorHandler = new IntegrationErrorHandler();
export default integrationErrorHandler;
