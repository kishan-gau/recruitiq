/**
 * TransIP VPS Service
 * 
 * Handles VPS provisioning, management, and monitoring via TransIP API.
 * Automatically uses test mode in development environment.
 * 
 * Test Mode Features:
 * - All API calls are simulated (no real resources created)
 * - Returns realistic mock data
 * - Safe for unlimited testing
 * - No charges applied
 * 
 * Production Mode Features:
 * - Real VPS instances created
 * - Actual charges apply
 * - Full TransIP API integration
 * 
 * @module services/transip/TransIPVPSService
 */

import { getTransIPClient, getSSHKeys, validateSSHKey } from '../../config/transip.ts';
import logger from '../../utils/logger.ts';

class TransIPVPSService {
  constructor(client = null) {
    this.client = client || getTransIPClient();
    this.testMode = process.env.NODE_ENV !== 'production';
  }

  /**
   * Lists all available VPS products
   * 
   * @returns {Promise<Array>} Array of VPS product offerings
   */
  async listProducts() {
    try {
      logger.info('Fetching VPS products', { testMode: this.testMode });

      const products = await this.client.vps.getProducts();

      logger.info('VPS products fetched successfully', {
        count: products.length,
        testMode: this.testMode
      });

      return products;
    } catch (error) {
      logger.error('Error fetching VPS products', {
        error: error.message,
        stack: error.stack,
        testMode: this.testMode
      });
      throw error;
    }
  }

  /**
   * Lists all VPS instances for the account
   * 
   * @returns {Promise<Array>} Array of VPS instances
   */
  async listVPS() {
    try {
      logger.info('Fetching VPS instances', { testMode: this.testMode });

      const vpsList = await this.client.vps.list();

      logger.info('VPS instances fetched successfully', {
        count: vpsList.length,
        testMode: this.testMode
      });

      return vpsList;
    } catch (error) {
      logger.error('Error fetching VPS instances', {
        error: error.message,
        stack: error.stack,
        testMode: this.testMode
      });
      throw error;
    }
  }

  /**
   * Gets details of a specific VPS instance
   * 
   * @param {string} vpsName - VPS instance name
   * @returns {Promise<Object>} VPS instance details
   */
  async getVPS(vpsName) {
    try {
      logger.info('Fetching VPS details', { vpsName, testMode: this.testMode });

      const vps = await this.client.vps.get(vpsName);

      logger.info('VPS details fetched successfully', {
        vpsName,
        status: vps.status,
        testMode: this.testMode
      });

      return vps;
    } catch (error) {
      logger.error('Error fetching VPS details', {
        vpsName,
        error: error.message,
        stack: error.stack,
        testMode: this.testMode
      });
      throw error;
    }
  }

  /**
   * Orders a new VPS instance
   * 
   * @param {Object} orderData - VPS order configuration
   * @param {string} orderData.productName - Product name (e.g., 'vps-bladevps-x4')
   * @param {string} orderData.operatingSystem - OS to install (e.g., 'ubuntu-22.04')
   * @param {string} orderData.hostname - VPS hostname
   * @param {string} orderData.description - VPS description
   * @param {Array<string>} orderData.sshKeys - SSH keys to install (optional)
   * @returns {Promise<Object>} Order result with VPS details
   */
  async orderVPS(orderData) {
    try {
      const {
        productName,
        operatingSystem,
        hostname,
        description,
        sshKeys = []
      } = orderData;

      // Validate required fields
      if (!productName) {
        throw new Error('productName is required');
      }
      if (!operatingSystem) {
        throw new Error('operatingSystem is required');
      }
      if (!hostname) {
        throw new Error('hostname is required');
      }

      // Validate SSH keys if provided
      const invalidKeys = sshKeys.filter(key => !validateSSHKey(key));
      if (invalidKeys.length > 0) {
        throw new Error(`Invalid SSH key format for ${invalidKeys.length} key(s)`);
      }

      // Get SSH keys from environment if not provided
      const finalSSHKeys = sshKeys.length > 0 ? sshKeys : getSSHKeys();

      logger.info('Ordering VPS', {
        productName,
        operatingSystem,
        hostname,
        description,
        sshKeyCount: finalSSHKeys.length,
        testMode: this.testMode,
        message: this.testMode 
          ? '🧪 TEST MODE - No real VPS will be created' 
          : '⚠️  PRODUCTION - Real VPS will be created and charges will apply'
      });

      // Build order payload
      const orderPayload = {
        productName,
        operatingSystem,
        hostname,
        description: description || `RecruitIQ VPS - ${hostname}`,
        addons: [],
        availabilityZone: 'ams0', // Default to Amsterdam
      };

      // Add SSH keys if provided
      if (finalSSHKeys.length > 0) {
        orderPayload.installText = finalSSHKeys.join('\n');
      }

      // Place order
      const order = await this.client.vps.order(orderPayload);

      logger.info('VPS ordered successfully', {
        hostname,
        productName,
        testMode: this.testMode,
        orderDetails: order
      });

      return {
        success: true,
        vpsName: hostname,
        order,
        testMode: this.testMode,
        message: this.testMode 
          ? 'Test order completed successfully (no real VPS created)' 
          : 'VPS order placed successfully'
      };
    } catch (error) {
      logger.error('Error ordering VPS', {
        orderData,
        error: error.message,
        stack: error.stack,
        testMode: this.testMode
      });
      throw error;
    }
  }

  /**
   * Starts a VPS instance
   * 
   * @param {string} vpsName - VPS instance name
   * @returns {Promise<Object>} Start operation result
   */
  async startVPS(vpsName) {
    try {
      logger.info('Starting VPS', { vpsName, testMode: this.testMode });

      await this.client.vps.start(vpsName);

      logger.info('VPS start command sent successfully', {
        vpsName,
        testMode: this.testMode
      });

      return {
        success: true,
        vpsName,
        action: 'start',
        testMode: this.testMode,
        message: this.testMode 
          ? 'Test start command completed (no real VPS affected)' 
          : 'VPS start command sent'
      };
    } catch (error) {
      logger.error('Error starting VPS', {
        vpsName,
        error: error.message,
        stack: error.stack,
        testMode: this.testMode
      });
      throw error;
    }
  }

  /**
   * Stops a VPS instance
   * 
   * @param {string} vpsName - VPS instance name
   * @returns {Promise<Object>} Stop operation result
   */
  async stopVPS(vpsName) {
    try {
      logger.info('Stopping VPS', { vpsName, testMode: this.testMode });

      await this.client.vps.stop(vpsName);

      logger.info('VPS stop command sent successfully', {
        vpsName,
        testMode: this.testMode
      });

      return {
        success: true,
        vpsName,
        action: 'stop',
        testMode: this.testMode,
        message: this.testMode 
          ? 'Test stop command completed (no real VPS affected)' 
          : 'VPS stop command sent'
      };
    } catch (error) {
      logger.error('Error stopping VPS', {
        vpsName,
        error: error.message,
        stack: error.stack,
        testMode: this.testMode
      });
      throw error;
    }
  }

  /**
   * Reboots a VPS instance
   * 
   * @param {string} vpsName - VPS instance name
   * @returns {Promise<Object>} Reboot operation result
   */
  async rebootVPS(vpsName) {
    try {
      logger.info('Rebooting VPS', { vpsName, testMode: this.testMode });

      await this.client.vps.reboot(vpsName);

      logger.info('VPS reboot command sent successfully', {
        vpsName,
        testMode: this.testMode
      });

      return {
        success: true,
        vpsName,
        action: 'reboot',
        testMode: this.testMode,
        message: this.testMode 
          ? 'Test reboot command completed (no real VPS affected)' 
          : 'VPS reboot command sent'
      };
    } catch (error) {
      logger.error('Error rebooting VPS', {
        vpsName,
        error: error.message,
        stack: error.stack,
        testMode: this.testMode
      });
      throw error;
    }
  }

  /**
   * Cancels a VPS instance
   * 
   * @param {string} vpsName - VPS instance name
   * @param {string} endTime - When to cancel ('end' or 'immediately')
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelVPS(vpsName, endTime = 'end') {
    try {
      logger.warn('Cancelling VPS', {
        vpsName,
        endTime,
        testMode: this.testMode,
        message: this.testMode 
          ? '🧪 TEST MODE - No real VPS will be cancelled' 
          : '⚠️  PRODUCTION - Real VPS will be cancelled'
      });

      await this.client.vps.cancel(vpsName, endTime);

      logger.info('VPS cancellation request sent successfully', {
        vpsName,
        endTime,
        testMode: this.testMode
      });

      return {
        success: true,
        vpsName,
        action: 'cancel',
        endTime,
        testMode: this.testMode,
        message: this.testMode 
          ? 'Test cancellation completed (no real VPS cancelled)' 
          : `VPS cancellation scheduled (${endTime})`
      };
    } catch (error) {
      logger.error('Error cancelling VPS', {
        vpsName,
        endTime,
        error: error.message,
        stack: error.stack,
        testMode: this.testMode
      });
      throw error;
    }
  }

  /**
   * Gets available operating systems for VPS
   * 
   * @returns {Promise<Array>} Array of available operating systems
   */
  async getOperatingSystems() {
    try {
      logger.info('Fetching available operating systems', {
        testMode: this.testMode
      });

      const operatingSystems = await this.client.vps.getOperatingSystems();

      logger.info('Operating systems fetched successfully', {
        count: operatingSystems.length,
        testMode: this.testMode
      });

      return operatingSystems;
    } catch (error) {
      logger.error('Error fetching operating systems', {
        error: error.message,
        stack: error.stack,
        testMode: this.testMode
      });
      throw error;
    }
  }

  /**
   * Gets usage statistics for a VPS instance
   * 
   * @param {string} vpsName - VPS instance name
   * @param {Object} options - Query options
   * @param {Date} options.startDate - Start date for statistics
   * @param {Date} options.endDate - End date for statistics
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStatistics(vpsName, options = {}) {
    try {
      const { startDate, endDate } = options;

      logger.info('Fetching VPS usage statistics', {
        vpsName,
        startDate,
        endDate,
        testMode: this.testMode
      });

      const statistics = await this.client.vps.getUsageData(vpsName, {
        types: ['cpu', 'disk', 'network'],
        dateTimeStart: startDate,
        dateTimeEnd: endDate
      });

      logger.info('VPS usage statistics fetched successfully', {
        vpsName,
        testMode: this.testMode
      });

      return statistics;
    } catch (error) {
      logger.error('Error fetching VPS usage statistics', {
        vpsName,
        error: error.message,
        stack: error.stack,
        testMode: this.testMode
      });
      throw error;
    }
  }

  /**
   * Gets current test mode status
   * 
   * @returns {Object} Test mode information
   */
  getTestModeInfo() {
    return {
      enabled: this.testMode,
      environment: process.env.NODE_ENV || 'development',
      message: this.testMode
        ? '🧪 Test mode active - All operations are simulated'
        : '⚠️  Production mode active - Operations will affect real resources',
      warning: !this.testMode
        ? 'WARNING: All operations will create/modify/delete real VPS instances and charges will apply'
        : null
    };
  }
}

export default TransIPVPSService;
