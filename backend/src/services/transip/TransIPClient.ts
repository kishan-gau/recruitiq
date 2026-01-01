import axios from 'axios';
import jwt from 'jsonwebtoken';
import { readFileSync, existsSync } from 'fs';
import logger from '../../utils/logger.js';

/**
 * TransIP API client with test mode support
 * 
 * Test mode automatically enabled in development/staging environments
 * by appending ?test=1 to all API requests, ensuring no real resources
 * are created or modified.
 */
class TransIPClient {
  
  baseURL: string;

  privateKeyPath: string | undefined;

  username: string | undefined;

constructor() {
    this.baseURL = 'https://api.transip.nl/v6';
    this.username = process.env.TRANSIP_USERNAME;
    this.privateKeyPath = process.env.TRANSIP_PRIVATE_KEY;
    
    // Initialize axios client
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await this._generateToken();
          config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
          logger.error('Failed to generate TransIP token for request', {
            error: error.message
          });
          // Continue without token for now - will fail at API level
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Determine test mode based on environment
    this.isTestMode = process.env.NODE_ENV !== 'production';
    
    logger.info('TransIP Client initialized', {
      testMode: this.isTestMode,
      environment: process.env.NODE_ENV,
      username: this.username ? 'configured' : 'missing',
      privateKeyPath: this.privateKeyPath ? 'configured' : 'missing'
    });

    // Validate configuration
    this._validateConfig();
  }

  /**
   * Generate JWT token for TransIP API authentication
   */
  async _generateToken() {
    if (!this.username || !this.privateKeyPath) {
      throw new Error('TransIP credentials not configured');
    }

    try {
      // Check if private key file exists
      if (!existsSync(this.privateKeyPath)) {
        throw new Error(`Private key file not found: ${this.privateKeyPath}`);
      }

      // Read private key
      const privateKey = readFileSync(this.privateKeyPath, 'utf8');
      
      // Generate JWT token
      const token = jwt.sign(
        {
          login: this.username,
          nonce: Math.random().toString(36).substring(2, 15),
        },
        privateKey,
        {
          algorithm: 'RS256',
          expiresIn: '5m',
          header: {
            typ: 'JWT',
            alg: 'RS256',
          },
        }
      );

      return token;
    } catch (error) {
      logger.error('Failed to generate TransIP token', {
        error: error.message,
        username: this.username,
        privateKeyPath: this.privateKeyPath
      });
      throw new Error(`TransIP authentication failed: ${error.message}`);
    }
  }

  /**
   * Validate TransIP configuration
   * @private
   */
  _validateConfig() {
    if (!process.env.TRANSIP_USERNAME) {
      logger.warn('TRANSIP_USERNAME not configured - VPS features will not work');
    }
    
    if (!process.env.TRANSIP_PRIVATE_KEY) {
      logger.warn('TRANSIP_PRIVATE_KEY not configured - VPS features will not work');
    }
  }

  /**
   * Append test parameter to URL if in test mode
   * @param {string} url - API endpoint URL
   * @returns {string} URL with test parameter if applicable
   * @private
   */
  _addTestParam(url) {
    if (!this.isTestMode) {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}test=1`;
  }

  /**
   * Make API request with test mode support
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Promise<Object>} API response
   * @private
   */
  async _request(method, endpoint, data = null) {
    const url = this._addTestParam(endpoint);
    
    logger.debug('TransIP API Request', {
      method,
      endpoint,
      testMode: this.isTestMode,
      finalUrl: url
    });

    try {
      const response = await this.client.request({
        method,
        url,
        data
      });

      logger.debug('TransIP API Response', {
        method,
        endpoint,
        testMode: this.isTestMode,
        statusCode: response.status
      });

      return response.data;
    } catch (error) {
      logger.error('TransIP API Error', {
        method,
        endpoint,
        testMode: this.isTestMode,
        error: error.message,
        statusCode: error.response?.status,
        responseData: error.response?.data
      });
      
      // Rethrow with more context
      const apiError = new Error(
        `TransIP API request failed: ${error.response?.data?.error || error.message}`
      );
      apiError.statusCode = error.response?.status;
      apiError.originalError = error;
      throw apiError;
    }
  }

  /**
   * VPS Management Methods
   */
  
  /**
   * List all VPS instances
   * @returns {Promise<Object>} VPS list response
   */
  async listVPS() {
    return this._request('GET', '/v6/vps');
  }

  /**
   * Get VPS details
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} VPS details
   */
  async getVPS(vpsName) {
    return this._request('GET', `/v6/vps/${vpsName}`);
  }

  /**
   * Create new VPS
   * @param {Object} config - VPS configuration
   * @returns {Promise<Object>} Created VPS details
   */
  async createVPS(config) {
    logger.info('Creating VPS', {
      testMode: this.isTestMode,
      config: {
        productName: config.productName,
        description: config.description,
        hostname: config.hostname
      }
    });

    return this._request('POST', '/v6/vps', config);
  }

  /**
   * Delete VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Deletion response
   */
  async deleteVPS(vpsName) {
    logger.warn('Deleting VPS', {
      testMode: this.isTestMode,
      vpsName
    });

    return this._request('DELETE', `/v6/vps/${vpsName}`);
  }

  /**
   * Start VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Operation response
   */
  async startVPS(vpsName) {
    return this._request('PATCH', `/v6/vps/${vpsName}`, {
      action: 'start'
    });
  }

  /**
   * Stop VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Operation response
   */
  async stopVPS(vpsName) {
    return this._request('PATCH', `/v6/vps/${vpsName}`, {
      action: 'stop'
    });
  }

  /**
   * Reboot VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Operation response
   */
  async rebootVPS(vpsName) {
    return this._request('PATCH', `/v6/vps/${vpsName}`, {
      action: 'reset'
    });
  }

  /**
   * Snapshot Management
   */
  
  /**
   * Create VPS snapshot
   * @param {string} vpsName - VPS name
   * @param {string} description - Snapshot description
   * @returns {Promise<Object>} Snapshot details
   */
  async createSnapshot(vpsName, description) {
    logger.info('Creating VPS snapshot', {
      testMode: this.isTestMode,
      vpsName,
      description
    });

    return this._request('POST', `/v6/vps/${vpsName}/snapshots`, {
      description,
      shouldStartVps: true
    });
  }

  /**
   * List VPS snapshots
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Snapshots list
   */
  async listSnapshots(vpsName) {
    return this._request('GET', `/v6/vps/${vpsName}/snapshots`);
  }

  /**
   * Delete snapshot
   * @param {string} vpsName - VPS name
   * @param {string} snapshotId - Snapshot ID
   * @returns {Promise<Object>} Deletion response
   */
  async deleteSnapshot(vpsName, snapshotId) {
    return this._request('DELETE', `/v6/vps/${vpsName}/snapshots/${snapshotId}`);
  }

  /**
   * Revert to snapshot
   * @param {string} vpsName - VPS name
   * @param {string} snapshotId - Snapshot ID
   * @returns {Promise<Object>} Operation response
   */
  async revertToSnapshot(vpsName, snapshotId) {
    return this._request('PATCH', `/v6/vps/${vpsName}/snapshots/${snapshotId}`, {
      action: 'revert'
    });
  }

  /**
   * Firewall Management
   */
  
  /**
   * Get VPS firewall configuration
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Firewall configuration
   */
  async getFirewall(vpsName) {
    return this._request('GET', `/v6/vps/${vpsName}/firewall`);
  }

  /**
   * Update VPS firewall
   * @param {string} vpsName - VPS name
   * @param {Object} firewallConfig - Firewall configuration
   * @returns {Promise<Object>} Update response
   */
  async updateFirewall(vpsName, firewallConfig) {
    logger.info('Updating VPS firewall', {
      testMode: this.isTestMode,
      vpsName,
      rulesCount: firewallConfig.ruleSet?.length || 0
    });

    return this._request('PUT', `/v6/vps/${vpsName}/firewall`, {
      vpsFirewall: firewallConfig
    });
  }

  /**
   * IP Address Management
   */
  
  /**
   * List VPS IP addresses
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} IP addresses list
   */
  async listIPAddresses(vpsName) {
    return this._request('GET', `/v6/vps/${vpsName}/ip-addresses`);
  }

  /**
   * Add IPv6 address
   * @param {string} vpsName - VPS name
   * @param {string} ipAddress - IPv6 address
   * @returns {Promise<Object>} Operation response
   */
  async addIPv6(vpsName, ipAddress) {
    return this._request('POST', `/v6/vps/${vpsName}/ip-addresses`, {
      ipAddress
    });
  }

  /**
   * Update reverse DNS
   * @param {string} vpsName - VPS name
   * @param {string} ipAddress - IP address
   * @param {string} reverseDns - Reverse DNS name
   * @returns {Promise<Object>} Update response
   */
  async updateReverseDNS(vpsName, ipAddress, reverseDns) {
    return this._request('PUT', `/v6/vps/${vpsName}/ip-addresses/${ipAddress}`, {
      ipAddress: {
        address: ipAddress,
        reverseDns
      }
    });
  }

  /**
   * Usage Statistics
   */
  
  /**
   * Get VPS usage statistics
   * @param {string} vpsName - VPS name
   * @param {string} types - Comma-separated usage types (cpu,disk,network)
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats(vpsName, types = 'cpu,disk,network') {
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - (24 * 60 * 60);

    return this._request('GET', `/v6/vps/${vpsName}/usage?types=${types}&dateTimeStart=${dayAgo}&dateTimeEnd=${now}`);
  }

  /**
   * Test mode helpers
   */
  
  /**
   * Check if test mode is enabled
   * @returns {boolean} True if test mode is enabled
   */
  isInTestMode() {
    return this.isTestMode;
  }

  /**
   * Get test mode status details
   * @returns {Object} Test mode status
   */
  getTestModeStatus() {
    return {
      enabled: this.isTestMode,
      environment: process.env.NODE_ENV,
      warning: this.isTestMode 
        ? 'Test mode enabled - no real resources will be created' 
        : 'PRODUCTION MODE - real resources will be created and charged'
    };
  }
}

export default new TransIPClient();
