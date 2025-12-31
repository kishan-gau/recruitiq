/**
 * Secrets Loader Utility
 * 
 * Provides convenient functions to load secrets from the secrets manager
 * with fallback to environment variables during development.
 * 
 * Usage:
 *   import { loadSecret, loadSecrets } from './utils/secrets.js';
 *   
 *   const dbPassword = await loadSecret('DATABASE_PASSWORD');
 *   const { JWT_SECRET } = await loadSecrets(['JWT_SECRET']);
 */

import secretsManager from '../services/secretsManager.js';
import logger from './logger.js';

/**
 * Load a single secret
 * 
 * @param {string} secretName - Name of the secret to load
 * @param {string} [fallback] - Optional fallback value if secret not found
 * @param {boolean} [required=true] - Whether the secret is required
 * @returns {Promise<string|object>} The secret value
 */
export async function loadSecret(secretName, fallback = null, required = true) {
  try {
    const value = await secretsManager.getSecret(secretName);
    return value;
  } catch (_error) {
    if (fallback !== null) {
      logger.warn(`Secret ${secretName} not found, using fallback`);
      return fallback;
    }
    
    if (required) {
      logger.error(`Required secret ${secretName} not found`, {
        error: error.message,
      });
      throw new Error(`Required secret ${secretName} not found`);
    }
    
    return null;
  }
}

/**
 * Load multiple secrets at once
 * 
 * @param {Array<string>} secretNames - Array of secret names to load
 * @param {boolean} [continueOnError=false] - Continue loading even if some fail
 * @returns {Promise<Object>} Object with secret names as keys and values
 */
export async function loadSecrets(secretNames, continueOnError = false) {
  const secrets = {};
  const errors = [];
  
  await Promise.all(
    secretNames.map(async (name) => {
      try {
        secrets[name] = await secretsManager.getSecret(name);
      } catch (_error) {
        errors.push({ name, error: error.message });
        
        if (!continueOnError) {
          throw error;
        }
      }
    })
  );
  
  if (errors.length > 0 && continueOnError) {
    logger.warn('Some secrets failed to load', { errors });
  }
  
  return secrets;
}

/**
 * Load JWT secrets specifically
 * These are critical for application security
 * 
 * @returns {Promise<Object>} JWT secrets
 */
export async function loadJWTSecrets() {
  try {
    const secrets = await loadSecrets([
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
    ]);
    
    // Validate JWT secrets
    if (!secrets.JWT_SECRET || secrets.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
    
    if (!secrets.JWT_REFRESH_SECRET || secrets.JWT_REFRESH_SECRET.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
    }
    
    return secrets;
  } catch (_error) {
    logger.error('Failed to load JWT secrets', { error: error.message });
    throw error;
  }
}

/**
 * Load database secrets
 * 
 * @returns {Promise<Object>} Database secrets
 */
export async function loadDatabaseSecrets() {
  try {
    // Try to load a database secrets object
    try {
      const dbSecrets = await loadSecret('DATABASE_SECRETS');
      if (typeof dbSecrets === 'object') {
        return dbSecrets;
      }
    } catch {
      // Fall through to individual secrets
    }
    
    // Load individual secrets
    const secrets = await loadSecrets(
      ['DATABASE_PASSWORD', 'DATABASE_USER', 'DATABASE_HOST'],
      true // Continue on error
    );
    
    return secrets;
  } catch (_error) {
    logger.warn('Failed to load database secrets from secrets manager, using environment variables');
    return null;
  }
}

/**
 * Load AWS secrets
 * 
 * @returns {Promise<Object>} AWS secrets
 */
export async function loadAWSSecrets() {
  try {
    // Try to load AWS secrets as a single object
    try {
      const awsSecrets = await loadSecret('AWS_CREDENTIALS');
      if (typeof awsSecrets === 'object') {
        return awsSecrets;
      }
    } catch {
      // Fall through to individual secrets
    }
    
    const secrets = await loadSecrets(
      ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
      true
    );
    
    return secrets;
  } catch (_error) {
    logger.warn('Failed to load AWS secrets');
    return null;
  }
}

/**
 * Load email/SMTP secrets
 * 
 * @returns {Promise<Object>} Email secrets
 */
export async function loadEmailSecrets() {
  try {
    const secrets = await loadSecrets(
      ['SMTP_PASSWORD', 'SMTP_USER'],
      true
    );
    
    return secrets;
  } catch (_error) {
    logger.warn('Failed to load email secrets');
    return null;
  }
}

/**
 * Rotate a secret
 * Generate new value and update in secrets manager
 * 
 * @param {string} secretName - Name of the secret to rotate
 * @param {Function} generator - Function that generates new secret value
 * @returns {Promise<void>}
 */
export async function rotateSecret(secretName, generator) {
  try {
    // Generate new value
    const newValue = await generator();
    
    // Store in secrets manager
    await secretsManager.setSecret(secretName, newValue);
    
    logger.info(`Secret ${secretName} rotated successfully`);
  } catch (_error) {
    logger.error(`Failed to rotate secret ${secretName}`, {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Generate a random secret
 * Useful for JWT secrets, API keys, etc.
 * 
 * @param {number} [length=64] - Length of the secret
 * @returns {string} Random hex string
 */
export function generateRandomSecret(length = 64) {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Initialize secrets manager on application startup
 * Pre-loads critical secrets
 * 
 * @returns {Promise<void>}
 */
export async function initializeSecrets() {
  logger.info('Initializing secrets manager...');
  
  try {
    await secretsManager.initialize();
    
    // Pre-load critical secrets (this will cache them)
    const criticalSecrets = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
    ];
    
    for (const secretName of criticalSecrets) {
      try {
        await secretsManager.getSecret(secretName);
        logger.debug(`Pre-loaded secret: ${secretName}`);
      } catch (_error) {
        logger.warn(`Could not pre-load secret: ${secretName}`, {
          error: error.message,
        });
      }
    }
    
    logger.info('Secrets manager initialized successfully', {
      provider: secretsManager.provider?.name,
      cacheSize: secretsManager.getCacheStats().size,
    });
  } catch (_error) {
    logger.error('Failed to initialize secrets manager', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Health check for secrets manager
 * Tests connectivity to the secrets provider
 * 
 * @returns {Promise<Object>} Health status
 */
export async function secretsHealthCheck() {
  try {
    await secretsManager.initialize();
    
    // Try to load a test secret or check cache
    const stats = secretsManager.getCacheStats();
    
    return {
      status: 'healthy',
      provider: secretsManager.provider?.name,
      cacheSize: stats.size,
      cacheTTL: stats.ttl,
    };
  } catch (_error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}

export default {
  loadSecret,
  loadSecrets,
  loadJWTSecrets,
  loadDatabaseSecrets,
  loadAWSSecrets,
  loadEmailSecrets,
  rotateSecret,
  generateRandomSecret,
  initializeSecrets,
  secretsHealthCheck,
};
