/**
 * TransIP Service
 * Handles VPS provisioning and management via TransIP API
 * 
 * @module services/TransIPService
 */

import TransIP from 'transip-api';
import logger from '../utils/logger.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

/**
 * TransIP Service Class
 * Manages VPS creation, configuration, and monitoring
 */
class TransIPService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize TransIP API client
   * @private
   */
  async initialize() {
    if (this.initialized) return;

    const { TRANSIP_USERNAME, TRANSIP_PRIVATE_KEY } = process.env;

    if (!TRANSIP_USERNAME || !TRANSIP_PRIVATE_KEY) {
      throw new Error('TransIP credentials not configured. Set TRANSIP_USERNAME and TRANSIP_PRIVATE_KEY environment variables.');
    }

    try {
      this.client = new TransIP({
        username: TRANSIP_USERNAME,
        privateKey: TRANSIP_PRIVATE_KEY,
        apiEndpoint: 'https://api.transip.nl/v6'
      });

      // Test connection
      await this.client.vps.list();
      this.initialized = true;

      logger.info('TransIP API client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize TransIP API client', {
        error: error.message
      });
      throw new Error(`TransIP initialization failed: ${error.message}`);
    }
  }

  /**
   * Create a new VPS instance
   * @param {Object} config - VPS configuration
   * @param {string} config.organizationId - Organization UUID
   * @param {string} config.productName - Product name (e.g., 'vps-bladevps-x4')
   * @param {string} config.operatingSystem - OS name (e.g., 'ubuntu-22.04')
   * @param {string} config.hostname - VPS hostname
   * @param {string} config.description - VPS description
   * @param {Array<string>} config.addons - Optional addons
   * @param {string} config.availabilityZone - Availability zone
   * @returns {Promise<Object>} Created VPS details
   */
  async createVPS(config) {
    await this.initialize();

    // Validate required fields
    const { organizationId, productName, operatingSystem, hostname } = config;

    if (!organizationId || !productName || !operatingSystem || !hostname) {
      throw new ValidationError('Missing required VPS configuration fields');
    }

    try {
      logger.info('Creating VPS via TransIP API', {
        organizationId,
        hostname,
        productName,
        operatingSystem
      });

      // Call TransIP API to create VPS
      const response = await this.client.vps.create({
        productName: productName,
        operatingSystem: operatingSystem,
        hostname: hostname,
        description: config.description || `VPS for ${organizationId}`,
        addons: config.addons || [],
        availabilityZone: config.availabilityZone || 'ams0'
      });

      const vpsData = {
        vpsId: response.vps.name,
        name: response.vps.name,
        hostname: hostname,
        operatingSystem: operatingSystem,
        status: 'creating',
        ipAddress: null, // Will be assigned after provisioning
        organizationId: organizationId,
        productName: productName,
        availabilityZone: config.availabilityZone || 'ams0',
        createdAt: new Date().toISOString()
      };

      logger.info('VPS creation initiated', {
        vpsId: vpsData.vpsId,
        organizationId
      });

      return vpsData;
    } catch (error) {
      logger.error('Failed to create VPS', {
        error: error.message,
        organizationId,
        hostname
      });
      throw new Error(`VPS creation failed: ${error.message}`);
    }
  }

  /**
   * Get VPS details by ID
   * @param {string} vpsId - VPS identifier (name)
   * @returns {Promise<Object>} VPS details
   */
  async getVPS(vpsId) {
    await this.initialize();

    try {
      const vps = await this.client.vps.get(vpsId);

      return {
        vpsId: vps.name,
        name: vps.name,
        hostname: vps.name,
        operatingSystem: vps.operatingSystem,
        status: this.mapVPSStatus(vps.status),
        ipAddress: vps.ipAddress || null,
        isLocked: vps.isLocked || false,
        isBlocked: vps.isBlocked || false,
        description: vps.description || '',
        diskSize: vps.diskSize,
        memorySize: vps.memorySize,
        cpus: vps.cpus,
        macAddress: vps.macAddress
      };
    } catch (error) {
      if (error.response?.status === 404) {
        throw new NotFoundError(`VPS ${vpsId} not found`);
      }
      logger.error('Failed to get VPS details', {
        error: error.message,
        vpsId
      });
      throw new Error(`Failed to get VPS details: ${error.message}`);
    }
  }

  /**
   * List all VPS instances
   * @returns {Promise<Array>} List of VPS instances
   */
  async listVPS() {
    await this.initialize();

    try {
      const vpsList = await this.client.vps.list();

      return vpsList.vpss.map(vps => ({
        vpsId: vps.name,
        name: vps.name,
        hostname: vps.name,
        operatingSystem: vps.operatingSystem,
        status: this.mapVPSStatus(vps.status),
        ipAddress: vps.ipAddress || null,
        isLocked: vps.isLocked || false,
        isBlocked: vps.isBlocked || false
      }));
    } catch (error) {
      logger.error('Failed to list VPS instances', {
        error: error.message
      });
      throw new Error(`Failed to list VPS: ${error.message}`);
    }
  }

  /**
   * Start a VPS instance
   * @param {string} vpsId - VPS identifier
   * @returns {Promise<Object>} Operation result
   */
  async startVPS(vpsId) {
    await this.initialize();

    try {
      await this.client.vps.start(vpsId);

      logger.info('VPS start initiated', { vpsId });

      return {
        success: true,
        message: `VPS ${vpsId} start initiated`,
        vpsId
      };
    } catch (error) {
      logger.error('Failed to start VPS', {
        error: error.message,
        vpsId
      });
      throw new Error(`Failed to start VPS: ${error.message}`);
    }
  }

  /**
   * Stop a VPS instance
   * @param {string} vpsId - VPS identifier
   * @returns {Promise<Object>} Operation result
   */
  async stopVPS(vpsId) {
    await this.initialize();

    try {
      await this.client.vps.stop(vpsId);

      logger.info('VPS stop initiated', { vpsId });

      return {
        success: true,
        message: `VPS ${vpsId} stop initiated`,
        vpsId
      };
    } catch (error) {
      logger.error('Failed to stop VPS', {
        error: error.message,
        vpsId
      });
      throw new Error(`Failed to stop VPS: ${error.message}`);
    }
  }

  /**
   * Reset a VPS instance (hard reboot)
   * @param {string} vpsId - VPS identifier
   * @returns {Promise<Object>} Operation result
   */
  async resetVPS(vpsId) {
    await this.initialize();

    try {
      await this.client.vps.reset(vpsId);

      logger.info('VPS reset initiated', { vpsId });

      return {
        success: true,
        message: `VPS ${vpsId} reset initiated`,
        vpsId
      };
    } catch (error) {
      logger.error('Failed to reset VPS', {
        error: error.message,
        vpsId
      });
      throw new Error(`Failed to reset VPS: ${error.message}`);
    }
  }

  /**
   * Get available VPS products
   * @returns {Promise<Array>} List of available products
   */
  async getAvailableProducts() {
    await this.initialize();

    try {
      const products = await this.client.products.list('vps');

      return products.products.map(product => ({
        name: product.name,
        description: product.description,
        price: product.price,
        recurringPrice: product.recurringPrice,
        specifications: {
          cpus: product.elements?.cpu || 'N/A',
          memory: product.elements?.memory || 'N/A',
          diskSize: product.elements?.disk || 'N/A'
        }
      }));
    } catch (error) {
      logger.error('Failed to get available products', {
        error: error.message
      });
      throw new Error(`Failed to get products: ${error.message}`);
    }
  }

  /**
   * Get available operating systems
   * @returns {Promise<Array>} List of available operating systems
   */
  async getAvailableOperatingSystems() {
    await this.initialize();

    try {
      const osList = await this.client.operatingSystems.list();

      return osList.operatingSystems.map(os => ({
        name: os.name,
        description: os.description,
        version: os.version,
        price: os.price || 0
      }));
    } catch (error) {
      logger.error('Failed to get available operating systems', {
        error: error.message
      });
      throw new Error(`Failed to get operating systems: ${error.message}`);
    }
  }

  /**
   * Wait for VPS to be ready (status: running and not locked)
   * @param {string} vpsId - VPS identifier
   * @param {number} timeout - Maximum wait time in milliseconds (default: 10 minutes)
   * @param {number} pollInterval - Polling interval in milliseconds (default: 10 seconds)
   * @returns {Promise<Object>} VPS details when ready
   */
  async waitForVPSReady(vpsId, timeout = 600000, pollInterval = 10000) {
    await this.initialize();

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const vps = await this.getVPS(vpsId);

        logger.info('VPS status check', {
          vpsId,
          status: vps.status,
          isLocked: vps.isLocked,
          isBlocked: vps.isBlocked,
          ipAddress: vps.ipAddress
        });

        // Check if VPS is blocked (security issue)
        if (vps.isBlocked) {
          throw new Error(`VPS ${vpsId} is blocked. Contact TransIP support.`);
        }

        // Check if VPS is ready (running and not locked)
        if (vps.status === 'running' && !vps.isLocked && vps.ipAddress) {
          logger.info('VPS is ready', {
            vpsId,
            ipAddress: vps.ipAddress
          });
          return vps;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        if (error instanceof NotFoundError) {
          // VPS not found yet, keep waiting
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        } else {
          throw error;
        }
      }
    }

    throw new Error(`Timeout waiting for VPS ${vpsId} to be ready`);
  }

  /**
   * Map TransIP VPS status to our internal status
   * @private
   */
  mapVPSStatus(transipStatus) {
    const statusMap = {
      'running': 'running',
      'stopped': 'stopped',
      'installing': 'creating',
      'paused': 'stopped',
      'unknown': 'unknown'
    };

    return statusMap[transipStatus] || 'unknown';
  }

  /**
   * Get VPS usage statistics (if available)
   * @param {string} vpsId - VPS identifier
   * @returns {Promise<Object>} Usage statistics
   */
  async getVPSUsageStatistics(vpsId) {
    await this.initialize();

    try {
      const usage = await this.client.vps.getUsage(vpsId);

      return {
        cpu: usage.cpu || [],
        memory: usage.memory || [],
        disk: usage.disk || [],
        network: usage.network || []
      };
    } catch (error) {
      logger.warn('Failed to get VPS usage statistics', {
        error: error.message,
        vpsId
      });
      // Return empty statistics if not available
      return {
        cpu: [],
        memory: [],
        disk: [],
        network: []
      };
    }
  }
}

export default TransIPService;
