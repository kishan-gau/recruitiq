/**
 * TransIP Service - VPS Management
 * 
 * Provides methods to interact with TransIP API for VPS management
 */

import TransIP from 'transip-api';
import logger from '../../utils/logger.js';
import config from '../../config/index.js';
import fs from 'fs/promises';
import path from 'path';

class TransIPService {
  
  client: any;

  enabled: boolean;

  testMode: boolean;

  vpsName: any;

constructor() {
    this.client = null;
    this.enabled = config.transip?.enabled || false;
    this.vpsName = config.transip?.vpsName;
    this.testMode = config.transip?.testMode || false;
    
    if (!this.enabled) {
      logger.warn('TransIP integration is disabled. Set TRANSIP_ENABLED=true to enable.');
    }
  }

  /**
   * Initialize TransIP client
   */
  async initialize() {
    if (!this.enabled) {
      logger.warn('TransIP is disabled, skipping initialization');
      return null;
    }
    
    if (this.client) {
      return this.client;
    }

    try {
      // Read private key from file
      const privateKeyPath = path.resolve(process.cwd(), config.transip?.privateKeyPath || './transip-private.key');
      const privateKey = await fs.readFile(privateKeyPath, 'utf-8');

      // Create TransIP client
      this.client = new TransIP({
        login: config.transip.username,
        privateKey: privateKey,
        testMode: this.testMode
      });

      logger.info('TransIP client initialized', {
        username: config.transip.username,
        testMode: this.testMode,
        vpsName: this.vpsName
      });

      return this.client;
    } catch (_error) {
      logger.error('Failed to initialize TransIP client', {
        error: error.message,
        privateKeyPath: config.transip.privateKeyPath
      });
      throw new Error(`TransIP initialization failed: ${error.message}`);
    }
  }

  /**
   * Get VPS information
   */
  async getVPSInfo() {
    try {
      const client = await this.initialize();
      const vps = await client.vps.get(this.vpsName);

      logger.info('VPS information retrieved', {
        vpsName: this.vpsName,
        status: vps.status
      });

      return {
        name: vps.name,
        description: vps.description,
        status: vps.status,
        ipAddresses: vps.ipAddresses,
        diskSize: vps.diskSize,
        memorySize: vps.memorySize,
        cpus: vps.cpus,
        operatingSystem: vps.operatingSystem,
        isBlocked: vps.isBlocked,
        isCustomerLocked: vps.isCustomerLocked
      };
    } catch (_error) {
      logger.error('Failed to get VPS info', {
        error: error.message,
        vpsName: this.vpsName
      });
      throw error;
    }
  }

  /**
   * Get VPS metrics (CPU, memory, disk usage)
   */
  async getVPSMetrics() {
    try {
      const client = await this.initialize();
      const metrics = await client.vps.getUsage(this.vpsName, ['cpu', 'memory', 'disk']);

      logger.info('VPS metrics retrieved', {
        vpsName: this.vpsName
      });

      return metrics;
    } catch (_error) {
      logger.error('Failed to get VPS metrics', {
        error: error.message,
        vpsName: this.vpsName
      });
      throw error;
    }
  }

  /**
   * Start VPS
   */
  async startVPS() {
    try {
      const client = await this.initialize();
      await client.vps.start(this.vpsName);

      logger.info('VPS started', {
        vpsName: this.vpsName
      });

      return { success: true, message: 'VPS started successfully' };
    } catch (_error) {
      logger.error('Failed to start VPS', {
        error: error.message,
        vpsName: this.vpsName
      });
      throw error;
    }
  }

  /**
   * Stop VPS
   */
  async stopVPS() {
    try {
      const client = await this.initialize();
      await client.vps.stop(this.vpsName);

      logger.info('VPS stopped', {
        vpsName: this.vpsName
      });

      return { success: true, message: 'VPS stopped successfully' };
    } catch (_error) {
      logger.error('Failed to stop VPS', {
        error: error.message,
        vpsName: this.vpsName
      });
      throw error;
    }
  }

  /**
   * Reboot VPS
   */
  async rebootVPS() {
    try {
      const client = await this.initialize();
      await client.vps.reset(this.vpsName);

      logger.info('VPS rebooted', {
        vpsName: this.vpsName
      });

      return { success: true, message: 'VPS rebooted successfully' };
    } catch (_error) {
      logger.error('Failed to reboot VPS', {
        error: error.message,
        vpsName: this.vpsName
      });
      throw error;
    }
  }

  /**
   * Get VPS snapshots
   */
  async getSnapshots() {
    try {
      const client = await this.initialize();
      const snapshots = await client.vps.getSnapshots(this.vpsName);

      logger.info('VPS snapshots retrieved', {
        vpsName: this.vpsName,
        count: snapshots.length
      });

      return snapshots;
    } catch (_error) {
      logger.error('Failed to get VPS snapshots', {
        error: error.message,
        vpsName: this.vpsName
      });
      throw error;
    }
  }

  /**
   * Create VPS snapshot
   */
  async createSnapshot(description) {
    try {
      const client = await this.initialize();
      const snapshot = await client.vps.createSnapshot(this.vpsName, description);

      logger.info('VPS snapshot created', {
        vpsName: this.vpsName,
        snapshotId: snapshot.id,
        description
      });

      return snapshot;
    } catch (_error) {
      logger.error('Failed to create VPS snapshot', {
        error: error.message,
        vpsName: this.vpsName,
        description
      });
      throw error;
    }
  }

  /**
   * Revert VPS to snapshot
   */
  async revertToSnapshot(snapshotId) {
    try {
      const client = await this.initialize();
      await client.vps.revertSnapshot(this.vpsName, snapshotId);

      logger.info('VPS reverted to snapshot', {
        vpsName: this.vpsName,
        snapshotId
      });

      return { success: true, message: 'VPS reverted to snapshot successfully' };
    } catch (_error) {
      logger.error('Failed to revert VPS to snapshot', {
        error: error.message,
        vpsName: this.vpsName,
        snapshotId
      });
      throw error;
    }
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck() {
    try {
      const client = await this.initialize();
      
      // Try to get VPS info to verify connectivity
      await client.vps.get(this.vpsName);

      return {
        status: 'healthy',
        message: 'TransIP API connection successful',
        testMode: this.testMode,
        vpsName: this.vpsName
      };
    } catch (_error) {
      logger.error('TransIP health check failed', {
        error: error.message
      });

      return {
        status: 'unhealthy',
        message: error.message,
        testMode: this.testMode,
        vpsName: this.vpsName
      };
    }
  }
}

export default new TransIPService();
