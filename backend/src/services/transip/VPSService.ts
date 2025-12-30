import transipClient from './TransIPClient.ts';
import logger from '../../utils/logger.ts';
import { ValidationError, NotFoundError } from '../../utils/errors.ts';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * VPS management service for Portal
 * 
 * Provides high-level VPS management functionality with automatic
 * test mode support for safe development and testing.
 */
class VPSService {
  /**
   * Get VPS tier specifications
   * @param {string} tier - VPS tier (starter, professional, enterprise)
   * @returns {Object} VPS specifications
   */
  getVPSTierSpecs(tier) {
    const specs = {
      starter: {
        productName: 'vps-bladevps-x2',
        description: 'Starter VPS - 1 CPU, 2GB RAM, 50GB Disk',
        cpus: 1,
        memory: 2048,
        disk: 50,
        addons: []
      },
      professional: {
        productName: 'vps-bladevps-x4',
        description: 'Professional VPS - 2 CPUs, 4GB RAM, 100GB Disk',
        cpus: 2,
        memory: 4096,
        disk: 100,
        addons: ['vps-addon-100-gb-disk']
      },
      enterprise: {
        productName: 'vps-bladevps-x8',
        description: 'Enterprise VPS - 4 CPUs, 8GB RAM, 200GB Disk',
        cpus: 4,
        memory: 8192,
        disk: 200,
        addons: ['vps-addon-200-gb-disk']
      }
    };

    if (!specs[tier]) {
      throw new ValidationError(`Invalid tier: ${tier}. Must be starter, professional, or enterprise`);
    }

    return specs[tier];
  }

  /**
   * Create VPS for organization
   * @param {string} organizationId - Organization UUID
   * @param {string} slug - Organization slug
   * @param {string} tier - VPS tier (default: professional)
   * @returns {Promise<Object>} Created VPS details
   */
  async createVPS(organizationId, slug, tier = 'professional') {
    logger.info('VPS creation requested', {
      organizationId,
      slug,
      tier,
      testMode: transipClient.isInTestMode()
    });

    // Validate inputs
    if (!slug || slug.length < 3) {
      throw new ValidationError('Slug must be at least 3 characters');
    }

    if (!organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    const specs = this.getVPSTierSpecs(tier);
    
    // Generate VPS name (max 32 chars for TransIP)
    const timestamp = Date.now();
    const vpsName = `vps-${slug}-${timestamp}`.substring(0, 32);

    // Build VPS configuration
    const vpsConfig = {
      productName: specs.productName,
      addons: specs.addons,
      availabilityZone: 'ams0', // Amsterdam datacenter
      description: `${specs.description} - ${slug}`,
      operatingSystem: 'ubuntu-22.04',
      hostname: `${slug}.recruitiq.nl`,
      installFlavour: 'cloudinit',
      username: 'recruitiq',
      // In test mode, password doesn't matter
      // In production, generate secure password
      hashedPassword: await this._generateHashedPassword(),
      sshKeys: process.env.TRANSIP_SSH_KEYS?.split(',') || [],
      base64InstallText: this._generateCloudInitConfig(slug, organizationId)
    };

    try {
      const result = await transipClient.createVPS(vpsConfig);

      logger.info('VPS created successfully', {
        organizationId,
        vpsName,
        testMode: transipClient.isInTestMode(),
        result
      });

      return {
        vpsName,
        ipAddress: result.vps?.ipAddress || 'pending',
        status: result.vps?.status || 'creating',
        hostname: vpsConfig.hostname,
        tier,
        specs,
        testMode: transipClient.isInTestMode(),
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('VPS creation failed', {
        organizationId,
        slug,
        error: error.message,
        testMode: transipClient.isInTestMode()
      });
      throw error;
    }
  }

  /**
   * Get VPS status
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} VPS status details
   */
  async getVPSStatus(vpsName) {
    try {
      const result = await transipClient.getVPS(vpsName);
      
      return {
        name: result.vps.name,
        status: result.vps.status,
        ipAddress: result.vps.ipAddress,
        cpus: result.vps.cpus,
        memory: result.vps.memorySize,
        disk: result.vps.diskSize,
        isLocked: result.vps.isLocked,
        isBlocked: result.vps.isBlocked,
        operatingSystem: result.vps.operatingSystem,
        hostname: result.vps.hostname
      };
    } catch (error) {
      if (error.response?.status === 404) {
        throw new NotFoundError(`VPS not found: ${vpsName}`);
      }
      throw error;
    }
  }

  /**
   * List all VPS instances
   * @returns {Promise<Array>} List of VPS instances
   */
  async listVPS() {
    const result = await transipClient.listVPS();
    return result.vpss || [];
  }

  /**
   * VPS operations
   */
  
  /**
   * Start VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Operation response
   */
  async startVPS(vpsName) {
    logger.info('Starting VPS', { vpsName, testMode: transipClient.isInTestMode() });
    return await transipClient.startVPS(vpsName);
  }

  /**
   * Stop VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Operation response
   */
  async stopVPS(vpsName) {
    logger.info('Stopping VPS', { vpsName, testMode: transipClient.isInTestMode() });
    return await transipClient.stopVPS(vpsName);
  }

  /**
   * Reboot VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Operation response
   */
  async rebootVPS(vpsName) {
    logger.info('Rebooting VPS', { vpsName, testMode: transipClient.isInTestMode() });
    return await transipClient.rebootVPS(vpsName);
  }

  /**
   * Delete VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Deletion response
   */
  async deleteVPS(vpsName) {
    logger.warn('Deleting VPS', { vpsName, testMode: transipClient.isInTestMode() });
    return await transipClient.deleteVPS(vpsName);
  }

  /**
   * Snapshot management
   */
  
  /**
   * Create VPS snapshot
   * @param {string} vpsName - VPS name
   * @param {string} description - Snapshot description
   * @returns {Promise<Object>} Snapshot details
   */
  async createSnapshot(vpsName, description) {
    return await transipClient.createSnapshot(vpsName, description);
  }

  /**
   * List VPS snapshots
   * @param {string} vpsName - VPS name
   * @returns {Promise<Array>} List of snapshots
   */
  async listSnapshots(vpsName) {
    const result = await transipClient.listSnapshots(vpsName);
    return result.snapshots || [];
  }

  /**
   * Delete snapshot
   * @param {string} vpsName - VPS name
   * @param {string} snapshotId - Snapshot ID
   * @returns {Promise<Object>} Deletion response
   */
  async deleteSnapshot(vpsName, snapshotId) {
    return await transipClient.deleteSnapshot(vpsName, snapshotId);
  }

  /**
   * Revert to snapshot
   * @param {string} vpsName - VPS name
   * @param {string} snapshotId - Snapshot ID
   * @returns {Promise<Object>} Operation response
   */
  async revertToSnapshot(vpsName, snapshotId) {
    return await transipClient.revertToSnapshot(vpsName, snapshotId);
  }

  /**
   * Firewall management
   */
  
  /**
   * Get VPS firewall configuration
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Firewall configuration
   */
  async getFirewall(vpsName) {
    const result = await transipClient.getFirewall(vpsName);
    return result.vpsFirewall;
  }

  /**
   * Update VPS firewall
   * @param {string} vpsName - VPS name
   * @param {Array} rules - Firewall rules
   * @returns {Promise<Object>} Update response
   */
  async updateFirewall(vpsName, rules) {
    // Build firewall configuration
    const firewallConfig = {
      isEnabled: true,
      ruleSet: rules.map(rule => ({
        description: rule.description,
        startPort: rule.port,
        endPort: rule.port,
        protocol: rule.protocol || 'tcp',
        whitelist: rule.whitelist || ['0.0.0.0/0']
      }))
    };

    return await transipClient.updateFirewall(vpsName, firewallConfig);
  }

  /**
   * Usage statistics
   */
  
  /**
   * Get VPS usage statistics
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats(vpsName) {
    return await transipClient.getUsageStats(vpsName);
  }

  /**
   * Test mode helpers
   */
  
  /**
   * Get test mode status
   * @returns {Object} Test mode status
   */
  getTestModeStatus() {
    return transipClient.getTestModeStatus();
  }

  /**
   * Private helpers
   */
  
  /**
   * Generate hashed password for VPS
   * @returns {Promise<string>} Bcrypt hashed password
   * @private
   */
  async _generateHashedPassword() {
    // In test mode, use dummy password
    if (transipClient.isInTestMode()) {
      return '$2y$10$dummyhashedpasswordfortesting';
    }
    
    // In production, generate secure random password
    const password = crypto.randomBytes(32).toString('hex');
    return await bcrypt.hash(password, 10);
  }

  /**
   * Generate cloud-init configuration
   * @param {string} slug - Organization slug
   * @param {string} organizationId - Organization UUID
   * @returns {string} Base64 encoded cloud-init config
   * @private
   */
  _generateCloudInitConfig(slug, organizationId) {
    // Cloud-init configuration for automatic setup
    const config = `#cloud-config
hostname: ${slug}
fqdn: ${slug}.recruitiq.nl

# Install Docker and other dependencies
packages:
  - docker.io
  - docker-compose
  - git
  - nginx
  - certbot
  - python3-certbot-nginx

# Setup RecruitIQ deployment
runcmd:
  - systemctl enable docker
  - systemctl start docker
  - usermod -aG docker recruitiq
  - echo "VPS ready for ${slug}" > /root/provisioning-complete.txt
  - echo "Organization ID: ${organizationId}" >> /root/provisioning-complete.txt
  - echo "Provisioned at: $(date)" >> /root/provisioning-complete.txt
`;

    return Buffer.from(config).toString('base64');
  }
}

export default new VPSService();
