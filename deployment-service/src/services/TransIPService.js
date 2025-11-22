import { createClient } from '@transip/node';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * TransIP VPS Management Service
 * 
 * Provides comprehensive VPS lifecycle management including:
 * - VPS creation and deletion
 * - Status monitoring and health checks
 * - SSH key management
 * - VPS operations (start, stop, reset)
 * - Firewall rule management
 * - Snapshot management
 * 
 * @class TransIPService
 */
class TransIPService {
  constructor() {
    // Initialize TransIP client with credentials from config
    this.client = createClient({
      username: config.transip.username,
      privateKey: config.transip.privateKey,
      whitelistOnlyMode: config.transip.whitelistOnlyMode || false,
    });

    logger.info('TransIP client initialized', {
      username: config.transip.username,
      whitelistMode: config.transip.whitelistOnlyMode || false,
    });
  }

  /**
   * Lists all VPS instances in the account
   * 
   * @returns {Promise<Array>} Array of VPS instances with details
   * @throws {Error} If API call fails
   */
  async listVPS() {
    try {
      logger.info('Fetching VPS list from TransIP');
      
      const vpsInstances = await this.client.vps.list();
      
      logger.info('VPS list retrieved', { count: vpsInstances.length });
      
      return vpsInstances;
    } catch (error) {
      logger.error('Failed to list VPS instances', {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Failed to list VPS: ${error.message}`);
    }
  }

  /**
   * Gets detailed information about a specific VPS
   * 
   * @param {string} vpsName - Name of the VPS
   * @returns {Promise<Object>} VPS details including IP, status, specs
   * @throws {Error} If VPS not found or API call fails
   */
  async getVPS(vpsName) {
    try {
      logger.info('Fetching VPS details', { vpsName });
      
      const vps = await this.client.vps.get(vpsName);
      
      logger.info('VPS details retrieved', {
        vpsName,
        status: vps.status,
        ipAddress: vps.ipAddress,
      });
      
      return vps;
    } catch (error) {
      logger.error('Failed to get VPS details', {
        vpsName,
        error: error.message,
      });
      throw new Error(`Failed to get VPS ${vpsName}: ${error.message}`);
    }
  }

  /**
   * Creates a new VPS instance
   * 
   * @param {Object} vpsConfig - VPS configuration
   * @param {string} vpsConfig.productName - Product name (e.g., 'vps-bladevps-x4')
   * @param {string} vpsConfig.operatingSystem - OS name (e.g., 'ubuntu-22.04')
   * @param {string} [vpsConfig.hostname] - Custom hostname
   * @param {string} [vpsConfig.description] - VPS description
   * @param {Array<string>} [vpsConfig.sshKeys] - SSH key fingerprints to install
   * @param {string} [vpsConfig.availabilityZone] - Availability zone
   * @returns {Promise<Object>} Created VPS details
   * @throws {Error} If creation fails
   */
  async createVPS(vpsConfig) {
    try {
      logger.info('Creating VPS', { config: vpsConfig });
      
      const vps = await this.client.vps.order({
        productName: vpsConfig.productName,
        operatingSystem: vpsConfig.operatingSystem,
        hostname: vpsConfig.hostname,
        description: vpsConfig.description,
        sshKeys: vpsConfig.sshKeys,
        availabilityZone: vpsConfig.availabilityZone,
      });
      
      logger.info('VPS created successfully', {
        vpsName: vps.name,
        ipAddress: vps.ipAddress,
        status: vps.status,
      });
      
      return vps;
    } catch (error) {
      logger.error('Failed to create VPS', {
        config: vpsConfig,
        error: error.message,
      });
      throw new Error(`Failed to create VPS: ${error.message}`);
    }
  }

  /**
   * Cancels (deletes) a VPS instance
   * 
   * @param {string} vpsName - Name of the VPS to cancel
   * @param {string} endTime - When to cancel ('end' or 'immediately')
   * @returns {Promise<void>}
   * @throws {Error} If cancellation fails
   */
  async cancelVPS(vpsName, endTime = 'immediately') {
    try {
      logger.info('Cancelling VPS', { vpsName, endTime });
      
      await this.client.vps.cancel(vpsName, endTime);
      
      logger.info('VPS cancelled successfully', { vpsName });
    } catch (error) {
      logger.error('Failed to cancel VPS', {
        vpsName,
        error: error.message,
      });
      throw new Error(`Failed to cancel VPS ${vpsName}: ${error.message}`);
    }
  }

  /**
   * Starts a stopped VPS
   * 
   * @param {string} vpsName - Name of the VPS
   * @returns {Promise<void>}
   * @throws {Error} If start operation fails
   */
  async startVPS(vpsName) {
    try {
      logger.info('Starting VPS', { vpsName });
      
      await this.client.vps.start(vpsName);
      
      logger.info('VPS start command sent', { vpsName });
    } catch (error) {
      logger.error('Failed to start VPS', {
        vpsName,
        error: error.message,
      });
      throw new Error(`Failed to start VPS ${vpsName}: ${error.message}`);
    }
  }

  /**
   * Stops a running VPS
   * 
   * @param {string} vpsName - Name of the VPS
   * @returns {Promise<void>}
   * @throws {Error} If stop operation fails
   */
  async stopVPS(vpsName) {
    try {
      logger.info('Stopping VPS', { vpsName });
      
      await this.client.vps.stop(vpsName);
      
      logger.info('VPS stop command sent', { vpsName });
    } catch (error) {
      logger.error('Failed to stop VPS', {
        vpsName,
        error: error.message,
      });
      throw new Error(`Failed to stop VPS ${vpsName}: ${error.message}`);
    }
  }

  /**
   * Resets (hard reboot) a VPS
   * 
   * @param {string} vpsName - Name of the VPS
   * @returns {Promise<void>}
   * @throws {Error} If reset operation fails
   */
  async resetVPS(vpsName) {
    try {
      logger.info('Resetting VPS', { vpsName });
      
      await this.client.vps.reset(vpsName);
      
      logger.info('VPS reset command sent', { vpsName });
    } catch (error) {
      logger.error('Failed to reset VPS', {
        vpsName,
        error: error.message,
      });
      throw new Error(`Failed to reset VPS ${vpsName}: ${error.message}`);
    }
  }

  /**
   * Gets current usage statistics for a VPS
   * 
   * @param {string} vpsName - Name of the VPS
   * @returns {Promise<Object>} Usage statistics (CPU, memory, disk, network)
   * @throws {Error} If API call fails
   */
  async getVPSUsage(vpsName) {
    try {
      logger.info('Fetching VPS usage statistics', { vpsName });
      
      const usage = await this.client.vps.getUsage(vpsName);
      
      logger.info('VPS usage retrieved', {
        vpsName,
        cpu: usage.cpu,
        memory: usage.memory,
      });
      
      return usage;
    } catch (error) {
      logger.error('Failed to get VPS usage', {
        vpsName,
        error: error.message,
      });
      throw new Error(`Failed to get VPS usage for ${vpsName}: ${error.message}`);
    }
  }

  /**
   * Lists SSH keys in the account
   * 
   * @returns {Promise<Array>} Array of SSH keys
   * @throws {Error} If API call fails
   */
  async listSSHKeys() {
    try {
      logger.info('Fetching SSH keys list');
      
      const keys = await this.client.sshKeys.list();
      
      logger.info('SSH keys retrieved', { count: keys.length });
      
      return keys;
    } catch (error) {
      logger.error('Failed to list SSH keys', {
        error: error.message,
      });
      throw new Error(`Failed to list SSH keys: ${error.message}`);
    }
  }

  /**
   * Adds a new SSH key to the account
   * 
   * @param {Object} keyData - SSH key data
   * @param {string} keyData.description - Key description
   * @param {string} keyData.sshKey - Public key content
   * @returns {Promise<Object>} Created SSH key with fingerprint
   * @throws {Error} If key creation fails
   */
  async addSSHKey(keyData) {
    try {
      logger.info('Adding SSH key', { description: keyData.description });
      
      const key = await this.client.sshKeys.create({
        description: keyData.description,
        sshKey: keyData.sshKey,
      });
      
      logger.info('SSH key added successfully', {
        description: keyData.description,
        fingerprint: key.fingerprint,
      });
      
      return key;
    } catch (error) {
      logger.error('Failed to add SSH key', {
        description: keyData.description,
        error: error.message,
      });
      throw new Error(`Failed to add SSH key: ${error.message}`);
    }
  }

  /**
   * Removes an SSH key from the account
   * 
   * @param {number} keyId - SSH key ID
   * @returns {Promise<void>}
   * @throws {Error} If key removal fails
   */
  async removeSSHKey(keyId) {
    try {
      logger.info('Removing SSH key', { keyId });
      
      await this.client.sshKeys.delete(keyId);
      
      logger.info('SSH key removed successfully', { keyId });
    } catch (error) {
      logger.error('Failed to remove SSH key', {
        keyId,
        error: error.message,
      });
      throw new Error(`Failed to remove SSH key ${keyId}: ${error.message}`);
    }
  }

  /**
   * Lists firewall rules for a VPS
   * 
   * @param {string} vpsName - Name of the VPS
   * @returns {Promise<Array>} Array of firewall rules
   * @throws {Error} If API call fails
   */
  async listFirewallRules(vpsName) {
    try {
      logger.info('Fetching firewall rules', { vpsName });
      
      const rules = await this.client.vps.getFirewall(vpsName);
      
      logger.info('Firewall rules retrieved', {
        vpsName,
        count: rules.length,
      });
      
      return rules;
    } catch (error) {
      logger.error('Failed to list firewall rules', {
        vpsName,
        error: error.message,
      });
      throw new Error(`Failed to list firewall rules for ${vpsName}: ${error.message}`);
    }
  }

  /**
   * Adds a firewall rule to a VPS
   * 
   * @param {string} vpsName - Name of the VPS
   * @param {Object} rule - Firewall rule configuration
   * @param {string} rule.protocol - Protocol ('tcp', 'udp', 'tcp_udp')
   * @param {number} rule.port - Port number or range
   * @param {string} [rule.whitelist] - IP whitelist (CIDR notation)
   * @param {string} [rule.description] - Rule description
   * @returns {Promise<void>}
   * @throws {Error} If rule creation fails
   */
  async addFirewallRule(vpsName, rule) {
    try {
      logger.info('Adding firewall rule', { vpsName, rule });
      
      await this.client.vps.addFirewallRule(vpsName, rule);
      
      logger.info('Firewall rule added', { vpsName, rule });
    } catch (error) {
      logger.error('Failed to add firewall rule', {
        vpsName,
        rule,
        error: error.message,
      });
      throw new Error(`Failed to add firewall rule to ${vpsName}: ${error.message}`);
    }
  }

  /**
   * Creates a snapshot of a VPS
   * 
   * @param {string} vpsName - Name of the VPS
   * @param {string} description - Snapshot description
   * @returns {Promise<Object>} Created snapshot details
   * @throws {Error} If snapshot creation fails
   */
  async createSnapshot(vpsName, description) {
    try {
      logger.info('Creating VPS snapshot', { vpsName, description });
      
      const snapshot = await this.client.vps.createSnapshot(vpsName, description);
      
      logger.info('Snapshot created', {
        vpsName,
        snapshotId: snapshot.id,
        description,
      });
      
      return snapshot;
    } catch (error) {
      logger.error('Failed to create snapshot', {
        vpsName,
        error: error.message,
      });
      throw new Error(`Failed to create snapshot for ${vpsName}: ${error.message}`);
    }
  }

  /**
   * Lists snapshots for a VPS
   * 
   * @param {string} vpsName - Name of the VPS
   * @returns {Promise<Array>} Array of snapshots
   * @throws {Error} If API call fails
   */
  async listSnapshots(vpsName) {
    try {
      logger.info('Fetching snapshots', { vpsName });
      
      const snapshots = await this.client.vps.listSnapshots(vpsName);
      
      logger.info('Snapshots retrieved', {
        vpsName,
        count: snapshots.length,
      });
      
      return snapshots;
    } catch (error) {
      logger.error('Failed to list snapshots', {
        vpsName,
        error: error.message,
      });
      throw new Error(`Failed to list snapshots for ${vpsName}: ${error.message}`);
    }
  }

  /**
   * Reverts a VPS to a snapshot
   * 
   * @param {string} vpsName - Name of the VPS
   * @param {string} snapshotId - Snapshot ID to revert to
   * @returns {Promise<void>}
   * @throws {Error} If revert operation fails
   */
  async revertToSnapshot(vpsName, snapshotId) {
    try {
      logger.info('Reverting VPS to snapshot', { vpsName, snapshotId });
      
      await this.client.vps.revertToSnapshot(vpsName, snapshotId);
      
      logger.info('VPS reverted to snapshot', { vpsName, snapshotId });
    } catch (error) {
      logger.error('Failed to revert to snapshot', {
        vpsName,
        snapshotId,
        error: error.message,
      });
      throw new Error(`Failed to revert ${vpsName} to snapshot: ${error.message}`);
    }
  }

  /**
   * Waits for VPS to reach 'running' status
   * 
   * @param {string} vpsName - Name of the VPS
   * @param {number} [timeoutMs=300000] - Timeout in milliseconds (default 5 minutes)
   * @param {number} [intervalMs=10000] - Check interval in milliseconds (default 10 seconds)
   * @returns {Promise<Object>} VPS details when ready
   * @throws {Error} If timeout or VPS fails to start
   */
  async waitForVPSReady(vpsName, timeoutMs = 300000, intervalMs = 10000) {
    const startTime = Date.now();
    
    logger.info('Waiting for VPS to be ready', {
      vpsName,
      timeoutMs,
      intervalMs,
    });

    while (Date.now() - startTime < timeoutMs) {
      try {
        const vps = await this.getVPS(vpsName);
        
        // Check for error states
        if (vps.isBlocked) {
          throw new Error(`VPS ${vpsName} is blocked`);
        }
        
        if (vps.isLocked) {
          logger.warn('VPS is locked, waiting...', { vpsName });
          await this.sleep(intervalMs);
          continue;
        }
        
        // Check if running
        if (vps.status === 'running') {
          logger.info('VPS is ready', {
            vpsName,
            ipAddress: vps.ipAddress,
            elapsedTime: Date.now() - startTime,
          });
          return vps;
        }
        
        logger.info('VPS not ready yet', {
          vpsName,
          status: vps.status,
          elapsedTime: Date.now() - startTime,
        });
        
        await this.sleep(intervalMs);
      } catch (error) {
        logger.error('Error checking VPS status', {
          vpsName,
          error: error.message,
        });
        throw error;
      }
    }
    
    throw new Error(`Timeout waiting for VPS ${vpsName} to be ready after ${timeoutMs}ms`);
  }

  /**
   * Helper method to sleep for specified milliseconds
   * 
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Checks if VPS is healthy and ready to accept connections
   * 
   * @param {string} vpsName - Name of the VPS
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck(vpsName) {
    try {
      const vps = await this.getVPS(vpsName);
      const usage = await this.getVPSUsage(vpsName);
      
      const isHealthy = 
        vps.status === 'running' &&
        !vps.isBlocked &&
        !vps.isLocked &&
        usage.cpu < 90 &&
        usage.memory < 90;
      
      return {
        isHealthy,
        vps,
        usage,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Health check failed', {
        vpsName,
        error: error.message,
      });
      return {
        isHealthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export default TransIPService;
