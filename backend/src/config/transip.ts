/**
 * TransIP Configuration
 * 
 * Configures TransIP API client for VPS provisioning in Portal.
 * Automatically enables test mode in development environment.
 * 
 * Test Mode (NODE_ENV !== 'production'):
 * - All API calls append ?test=1 parameter
 * - Simulates API responses without creating real resources
 * - No charges or actual VPS instances created
 * - Safe for unlimited testing
 * 
 * Production Mode (NODE_ENV === 'production'):
 * - Real API calls that create/modify/delete VPS instances
 * - Charges apply for resources
 * - Test mode disabled
 * 
 * @module config/transip
 */

import TransIP from 'transip-api';
import logger from '../utils/logger.ts';

/**
 * Validates TransIP configuration
 * @returns {Object} Validation result with { valid, errors }
 */
export function validateTransIPConfig() {
  const errors = [];

  if (!process.env.TRANSIP_USERNAME) {
    errors.push('TRANSIP_USERNAME is required');
  }

  if (!process.env.TRANSIP_PRIVATE_KEY) {
    errors.push('TRANSIP_PRIVATE_KEY is required');
  }

  // Validate private key format (basic check)
  if (process.env.TRANSIP_PRIVATE_KEY) {
    const privateKey = process.env.TRANSIP_PRIVATE_KEY;
    if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) {
      errors.push('TRANSIP_PRIVATE_KEY appears to be in invalid format (should be RSA private key)');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Creates TransIP API client instance
 * 
 * @returns {TransIP} Configured TransIP client
 * @throws {Error} If configuration is invalid
 */
export function createTransIPClient() {
  // Validate configuration
  const validation = validateTransIPConfig();
  if (!validation.valid) {
    const errorMsg = `TransIP configuration invalid: ${validation.errors.join(', ')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Determine if test mode should be enabled
  const isProduction = process.env.NODE_ENV === 'production';
  const testMode = !isProduction;

  // Create client configuration
  const config = {
    username: process.env.TRANSIP_USERNAME,
    privateKey: process.env.TRANSIP_PRIVATE_KEY,
    testMode, // Automatically enabled in development
  };

  // Log configuration (without exposing sensitive data)
  logger.info('TransIP client configuration', {
    username: config.username,
    testMode,
    environment: process.env.NODE_ENV || 'development',
    message: testMode 
      ? '🧪 TEST MODE enabled - API calls will be simulated (no real resources created)'
      : '⚠️  PRODUCTION MODE - API calls will create real VPS instances and charges will apply'
  });

  try {
    const client = new TransIP(config);
    
    logger.info('TransIP client initialized successfully', {
      testMode,
      username: config.username
    });

    return client;
  } catch (error) {
    logger.error('Failed to initialize TransIP client', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Gets SSH keys from environment configuration
 * 
 * @returns {string[]} Array of SSH public keys
 */
export function getSSHKeys() {
  const sshKeysEnv = process.env.TRANSIP_SSH_KEYS || '';
  
  if (!sshKeysEnv) {
    return [];
  }

  // Split by comma and trim whitespace
  const keys = sshKeysEnv
    .split(',')
    .map(key => key.trim())
    .filter(key => key.length > 0);

  return keys;
}

/**
 * Validates SSH key format
 * 
 * @param {string} key - SSH public key to validate
 * @returns {boolean} True if key appears valid
 */
export function validateSSHKey(key) {
  // Basic validation - check for common SSH key prefixes
  const validPrefixes = ['ssh-rsa', 'ssh-ed25519', 'ecdsa-sha2-nistp256', 'ssh-dss'];
  return validPrefixes.some(prefix => key.startsWith(prefix));
}

/**
 * TransIP configuration object
 */
export const transipConfig = {
  username: process.env.TRANSIP_USERNAME,
  testMode: process.env.NODE_ENV !== 'production',
  sshKeys: getSSHKeys(),
};

// Export singleton client instance (lazy initialization)
let clientInstance = null;

/**
 * Gets or creates TransIP client instance
 * 
 * @returns {TransIP} TransIP client instance
 */
export function getTransIPClient() {
  if (!clientInstance) {
    clientInstance = createTransIPClient();
  }
  return clientInstance;
}

export default {
  validateTransIPConfig,
  createTransIPClient,
  getTransIPClient,
  getSSHKeys,
  validateSSHKey,
  transipConfig,
};
