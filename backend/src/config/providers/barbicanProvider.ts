/**
 * Barbican Secrets Provider
 * Integrates with OpenStack Barbican for secure secrets management
 * 
 * Features:
 * - Retrieve secrets from Barbican vault
 * - Cache secrets in memory with TTL
 * - Automatic secret rotation support
 * - Fail-fast on missing/invalid secrets
 * - Production-grade error handling
 */

import axios from 'axios';
import logger from '../../utils/logger.js';
import { BarbicanConfig } from '../../types/models.types.js';

/**
 * Barbican API Client
 */
class BarbicanProvider {
  config: {
    endpoint?: string;
    authEndpoint?: string;
    username?: string;
    password?: string;
    projectName?: string;
    projectDomain: string;
    userDomain: string;
    cacheTTL: number;
  };
  cache: Map<string, { value: string; expiry: number }>;
  authToken: string | null;
  tokenExpiry: number | null;

  constructor(config: Partial<BarbicanConfig> = {}) {
    this.config = {
      endpoint: config.endpoint || process.env.BARBICAN_ENDPOINT,
      authEndpoint: config.authEndpoint || process.env.OPENSTACK_AUTH_URL,
      username: config.username || process.env.OPENSTACK_USERNAME,
      password: config.password || process.env.OPENSTACK_PASSWORD,
      projectName: config.projectName || process.env.OPENSTACK_PROJECT_NAME,
      projectDomain: config.projectDomain || process.env.OPENSTACK_PROJECT_DOMAIN || 'default',
      userDomain: config.userDomain || process.env.OPENSTACK_USER_DOMAIN || 'default',
      cacheTTL: config.cacheTTL || 3600000, // 1 hour default
    };

    // Validate required configuration
    this.validateConfig();

    // In-memory cache for secrets
    this.cache = new Map();
    
    // Authentication token
    this.authToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Validate Barbican configuration
   */
  validateConfig() {
    const required = ['endpoint', 'authEndpoint', 'username', 'password', 'projectName'];
    const missing = required.filter(key => !this.config[key]);

    if (missing.length > 0) {
      throw new Error(
        `Barbican configuration incomplete. Missing: ${missing.join(', ')}\n` +
        `Set environment variables: BARBICAN_ENDPOINT, OPENSTACK_AUTH_URL, OPENSTACK_USERNAME, etc.`
      );
    }

    logger.info('Barbican provider initialized', {
      endpoint: this.config.endpoint,
      projectName: this.config.projectName,
    });
  }

  /**
   * Authenticate with OpenStack Keystone
   */
  async authenticate() {
    // Return cached token if still valid
    if (this.authToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.authToken;
    }

    try {
      logger.info('Authenticating with OpenStack Keystone...');

      const response = await axios.post(
        `${this.config.authEndpoint}/auth/tokens`,
        {
          auth: {
            identity: {
              methods: ['password'],
              password: {
                user: {
                  name: this.config.username,
                  domain: { name: this.config.userDomain },
                  password: this.config.password,
                },
              },
            },
            scope: {
              project: {
                name: this.config.projectName,
                domain: { name: this.config.projectDomain },
              },
            },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      this.authToken = response.headers['x-subject-token'];
      
      // Parse token expiry from response
      const expiresAt = response.data.token.expires_at;
      this.tokenExpiry = new Date(expiresAt).getTime() - 60000; // 1 min buffer

      logger.info('Successfully authenticated with OpenStack', {
        expiresAt: new Date(this.tokenExpiry).toISOString(),
      });

      return this.authToken;
    } catch (error) {
      logger.error('Barbican authentication failed', {
        error: error.message,
        endpoint: this.config.authEndpoint,
      });
      throw new Error(`Barbican authentication failed: ${error.message}`);
    }
  }

  /**
   * Retrieve a secret from Barbican
   * @param {string} secretName - Name/reference of the secret
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Decrypted secret value
   */
  async getSecret(secretName, options = {}) {
    try {
      // Check cache first
      const cached = this.getCachedSecret(secretName);
      if (cached && !options.refresh) {
        logger.debug(`Using cached secret: ${secretName}`);
        return cached;
      }

      // Authenticate
      const token = await this.authenticate();

      // Determine secret reference (UUID or name-based lookup)
      const secretRef = await this.resolveSecretReference(secretName, token);

      // Retrieve secret payload
      logger.info(`Retrieving secret from Barbican: ${secretName}`);
      
      const response = await axios.get(`${secretRef}/payload`, {
        headers: {
          'X-Auth-Token': token,
          Accept: 'text/plain',
        },
      });

      const secretValue = response.data;

      // Cache the secret
      this.cacheSecret(secretName, secretValue);

      logger.info(`Successfully retrieved secret: ${secretName}`);
      return secretValue;
    } catch (error) {
      logger.error(`Failed to retrieve secret: ${secretName}`, {
        error: error.message,
      });
      throw new Error(`Barbican secret retrieval failed: ${error.message}`);
    }
  }

  /**
   * Resolve secret reference (UUID) from name
   * @param {string} secretName - Human-readable secret name
   * @param {string} token - Auth token
   * @returns {Promise<string>} - Secret reference URL
   */
  async resolveSecretReference(secretName, token) {
    // If secretName is already a full URL, return it
    if (secretName.startsWith('http')) {
      return secretName;
    }

    // If secretName is a UUID, construct URL
    if (this.isUUID(secretName)) {
      return `${this.config.endpoint}/secrets/${secretName}`;
    }

    // Otherwise, search by name
    try {
      const response = await axios.get(`${this.config.endpoint}/secrets`, {
        headers: {
          'X-Auth-Token': token,
        },
        params: {
          name: secretName,
          limit: 1,
        },
      });

      const secrets = response.data.secrets || [];
      
      if (secrets.length === 0) {
        throw new Error(`Secret not found: ${secretName}`);
      }

      return secrets[0].secret_ref;
    } catch (error) {
      throw new Error(`Failed to resolve secret reference: ${error.message}`);
    }
  }

  /**
   * Store/update a secret in Barbican
   * @param {string} secretName - Name for the secret
   * @param {string} secretValue - Value to store
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Secret reference URL
   */
  async storeSecret(secretName, secretValue, options = {}) {
    try {
      const token = await this.authenticate();

      logger.info(`Storing secret in Barbican: ${secretName}`);

      const response = await axios.post(
        `${this.config.endpoint}/secrets`,
        {
          name: secretName,
          payload: secretValue,
          payload_content_type: options.contentType || 'text/plain',
          payload_content_encoding: options.encoding || 'base64',
          algorithm: options.algorithm || 'aes',
          bit_length: options.bitLength || 256,
          mode: options.mode || 'cbc',
          expiration: options.expiration || null,
        },
        {
          headers: {
            'X-Auth-Token': token,
            'Content-Type': 'application/json',
          },
        }
      );

      const secretRef = response.data.secret_ref;

      // Clear cache for this secret
      this.cache.delete(secretName);

      logger.info(`Successfully stored secret: ${secretName}`, {
        secretRef,
      });

      return secretRef;
    } catch (error) {
      logger.error(`Failed to store secret: ${secretName}`, {
        error: error.message,
      });
      throw new Error(`Barbican secret storage failed: ${error.message}`);
    }
  }

  /**
   * Delete a secret from Barbican
   * @param {string} secretName - Name/reference of the secret
   */
  async deleteSecret(secretName) {
    try {
      const token = await this.authenticate();
      const secretRef = await this.resolveSecretReference(secretName, token);

      logger.info(`Deleting secret from Barbican: ${secretName}`);

      await axios.delete(secretRef, {
        headers: {
          'X-Auth-Token': token,
        },
      });

      // Clear cache
      this.cache.delete(secretName);

      logger.info(`Successfully deleted secret: ${secretName}`);
    } catch (error) {
      logger.error(`Failed to delete secret: ${secretName}`, {
        error: error.message,
      });
      throw new Error(`Barbican secret deletion failed: ${error.message}`);
    }
  }

  /**
   * Rotate a secret (store new version)
   * @param {string} secretName - Name of the secret to rotate
   * @param {string} newValue - New secret value
   */
  async rotateSecret(secretName, newValue) {
    try {
      // Delete old secret
      await this.deleteSecret(secretName);
      
      // Store new secret
      const secretRef = await this.storeSecret(secretName, newValue);
      
      logger.info(`Successfully rotated secret: ${secretName}`);
      
      return secretRef;
    } catch (error) {
      logger.error(`Failed to rotate secret: ${secretName}`, {
        error: error.message,
      });
      throw new Error(`Secret rotation failed: ${error.message}`);
    }
  }

  /**
   * Generate a cryptographically secure secret
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Secret reference URL
   */
  async generateSecret(secretName, options = {}) {
    try {
      const token = await this.authenticate();

      logger.info(`Generating secret in Barbican: ${secretName}`);

      const response = await axios.post(
        `${this.config.endpoint}/secrets`,
        {
          name: secretName,
          algorithm: options.algorithm || 'aes',
          bit_length: options.bitLength || 256,
          mode: options.mode || 'cbc',
          secret_type: options.secretType || 'symmetric',
          expiration: options.expiration || null,
        },
        {
          headers: {
            'X-Auth-Token': token,
            'Content-Type': 'application/json',
          },
        }
      );

      const secretRef = response.data.secret_ref;

      logger.info(`Successfully generated secret: ${secretName}`, {
        secretRef,
        algorithm: options.algorithm || 'aes',
        bitLength: options.bitLength || 256,
      });

      return secretRef;
    } catch (error) {
      logger.error(`Failed to generate secret: ${secretName}`, {
        error: error.message,
      });
      throw new Error(`Secret generation failed: ${error.message}`);
    }
  }

  /**
   * Get cached secret
   */
  getCachedSecret(secretName) {
    const cached = this.cache.get(secretName);
    
    if (!cached) {
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() > cached.expiry) {
      this.cache.delete(secretName);
      return null;
    }

    return cached.value;
  }

  /**
   * Cache a secret with TTL
   */
  cacheSecret(secretName, value) {
    this.cache.set(secretName, {
      value,
      expiry: Date.now() + this.config.cacheTTL,
      cachedAt: new Date().toISOString(),
    });
  }

  /**
   * Clear all cached secrets
   */
  clearCache() {
    logger.info('Clearing Barbican secrets cache');
    this.cache.clear();
  }

  /**
   * Check if string is a UUID
   */
  isUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Health check for Barbican connection
   */
  async healthCheck() {
    try {
      const token = await this.authenticate();
      
      // Try to list secrets (limit 1 for performance)
      await axios.get(`${this.config.endpoint}/secrets`, {
        headers: {
          'X-Auth-Token': token,
        },
        params: {
          limit: 1,
        },
      });

      return {
        status: 'healthy',
        provider: 'barbican',
        endpoint: this.config.endpoint,
        authenticated: true,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: 'barbican',
        error: error.message,
      };
    }
  }
}

export default BarbicanProvider;
