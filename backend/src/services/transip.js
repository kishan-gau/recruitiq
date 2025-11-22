/**
 * TransIP VPS API Integration Service
 * Handles VPS provisioning via TransIP API
 */

import TransIP from 'transip-api';
import logger from '../utils/logger.js';

class TransIPService {
  constructor() {
    try {
      // Initialize TransIP client with credentials
      this.client = new TransIP({
        login: process.env.TRANSIP_USERNAME,
        privateKey: process.env.TRANSIP_PRIVATE_KEY,
        readOnly: false,
        testMode: process.env.NODE_ENV !== 'production',
        allowBilling: process.env.NODE_ENV === 'production'
      });
      
      logger.info('✅ TransIP service initialized', {
        testMode: process.env.NODE_ENV !== 'production',
        username: process.env.TRANSIP_USERNAME || 'NOT_SET'
      });
    } catch (error) {
      logger.error('❌ Failed to initialize TransIP client', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create a new dedicated VPS for a tenant
   * @param {Object} config - VPS configuration
   * @returns {Promise<Object>} VPS details
   */
  async createDedicatedVPS(config) {
    const { organizationId, slug, tier } = config;

    logger.info(`🚀 Creating VPS via TransIP API for ${slug}`, { tier });
    
    try {
      const vpsSpecs = this.getVPSSpecs(tier);
      const cloudInitScript = this.getCloudInitScript(config);
      
      // Create VPS via TransIP API
      const vpsData = {
        productName: vpsSpecs.productName,
        addons: vpsSpecs.addons,
        operatingSystem: 'ubuntu-22.04',
        hostname: `${slug}.recruitiq.nl`,
        description: `RecruitIQ - ${slug} (${tier})`,
        base64InstallText: Buffer.from(cloudInitScript).toString('base64')
      };
      
      logger.info('📤 Sending VPS creation request to TransIP', {
        productName: vpsData.productName,
        hostname: vpsData.hostname
      });
      
      const response = await this.client.vps.order(vpsData);
      
      // Wait for VPS to be provisioned
      const vpsName = response.vps?.name || `vps-${slug}`;
      await this.waitForVPSReady(vpsName);
      
      // Get VPS details
      const vpsDetails = await this.client.vps.get(vpsName);
      
      logger.info('✅ VPS created successfully', {
        vpsName: vpsDetails.name,
        ipAddress: vpsDetails.ipAddress,
        status: vpsDetails.status
      });
      
      return {
        vpsName: vpsDetails.name,
        ipAddress: vpsDetails.ipAddress,
        status: vpsDetails.status,
        hostname: vpsDetails.hostname || vpsData.hostname
      };
    } catch (error) {
      logger.error('❌ Failed to create VPS', {
        slug,
        tier,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to create VPS: ${error.message}`);
    }
  }

  /**
   * Get VPS specifications based on tier
   */
  getVPSSpecs(tier) {
    const specs = {
      'starter': {
        productName: 'vps-bladevps-x2',  // 1 CPU, 2GB RAM
        addons: ['vps-addon-50-gb-disk']
      },
      'professional': {
        productName: 'vps-bladevps-x4',  // 2 CPU, 4GB RAM
        addons: ['vps-addon-100-gb-disk']
      },
      'enterprise': {
        productName: 'vps-bladevps-x8',  // 4 CPU, 8GB RAM
        addons: ['vps-addon-200-gb-disk']
      }
    };

    return specs[tier] || specs['professional'];
  }

  /**
   * Generate cloud-init script for VPS auto-setup
   */
  getCloudInitScript(config) {
    const script = `#!/bin/bash
# RecruitIQ VPS Auto-Setup Script
# Organization: ${config.slug}

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create application directory
mkdir -p /opt/recruitiq
cd /opt/recruitiq

# Create .env file with generated secrets
cat > .env << 'EOF'
NODE_ENV=production
TENANT_ID=${config.slug}
INSTANCE_ID=${config.slug}-vps
DEPLOYMENT_TYPE=cloud
DATABASE_NAME=recruitiq_${config.slug}
DATABASE_USER=recruitiq
DATABASE_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
REDIS_PASSWORD=$(openssl rand -base64 32)
EOF

# TODO: Pull Docker images and start services
# docker-compose up -d

# Install and configure SSL
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d ${config.slug}.recruitiq.nl --non-interactive --agree-tos --email devops@recruitiq.nl

# Set up auto-renewal
echo "0 3 * * * certbot renew --quiet" | crontab -

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "✅ VPS setup complete for ${config.slug}"
`;

    return Buffer.from(script).toString('base64');
  }

  /**
   * Wait for VPS to be ready (polling)
   * @param {string} vpsName - VPS name
   * @param {number} timeout - Timeout in milliseconds (default 5 min)
   */
  async waitForVPSReady(vpsName, timeout = 300000) {
    const startTime = Date.now();
    const pollInterval = 10000; // Check every 10 seconds

    logger.info(`⏳ Waiting for VPS ${vpsName} to be ready...`);

    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.getVPSStatus(vpsName);

        // Check if VPS is ready: running, has IP, not locked, not blocked
        if (status.status === 'running' && 
            status.ipAddress && 
            !status.isLocked && 
            !status.isBlocked) {
          logger.info(`✅ VPS ${vpsName} is ready at ${status.ipAddress}`);
          return status;
        }

        // Log current status
        const issues = [];
        if (status.status !== 'running') issues.push(`status=${status.status}`);
        if (!status.ipAddress) issues.push('no IP');
        if (status.isLocked) issues.push('locked');
        if (status.isBlocked) issues.push('blocked');

        logger.info(`   VPS not ready: ${issues.join(', ')}, waiting...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        logger.warn(`Error checking VPS status: ${error.message}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error(`Timeout: VPS ${vpsName} did not become ready within ${timeout}ms`);
  }

  /**
   * Get VPS status
   */
  async getVPSStatus(vpsName) {
    logger.info(`📊 Getting VPS status from TransIP API: ${vpsName}`);
    
    try {
      const vps = await this.client.vps.get(vpsName);
      
      return {
        name: vps.name,
        status: vps.status,
        ipAddress: vps.ipAddress,
        cpus: vps.cpus,
        memoryInMb: vps.memoryInMb,
        diskInGb: vps.diskInGb,
        isLocked: vps.isLocked || false,
        isBlocked: vps.isBlocked || false
      };
    } catch (error) {
      logger.error(`❌ Failed to get VPS status for ${vpsName}`, {
        error: error.message
      });
      throw new Error(`Failed to get VPS status: ${error.message}`);
    }
  }

  /**
   * Stop VPS
   */
  async stopVPS(vpsName) {
    logger.info(`🛑 Stopping VPS via TransIP API: ${vpsName}`);
    
    try {
      await this.client.vps.stop(vpsName);
      logger.info(`✅ VPS ${vpsName} stopped successfully`);
    } catch (error) {
      logger.error(`❌ Failed to stop VPS ${vpsName}`, {
        error: error.message
      });
      throw new Error(`Failed to stop VPS: ${error.message}`);
    }
  }

  /**
   * Start VPS
   */
  async startVPS(vpsName) {
    logger.info(`▶️  Starting VPS via TransIP API: ${vpsName}`);
    
    try {
      await this.client.vps.start(vpsName);
      logger.info(`✅ VPS ${vpsName} started successfully`);
    } catch (error) {
      logger.error(`❌ Failed to start VPS ${vpsName}`, {
        error: error.message
      });
      throw new Error(`Failed to start VPS: ${error.message}`);
    }
  }

  /**
   * Delete VPS
   */
  async deleteVPS(vpsName) {
    logger.info(`🗑️  Deleting VPS via TransIP API: ${vpsName}`);
    
    try {
      // Cancel at end of billing period to avoid immediate termination
      await this.client.vps.cancel(vpsName, 'end');
      logger.info(`✅ VPS ${vpsName} scheduled for deletion at end of billing period`);
    } catch (error) {
      logger.error(`❌ Failed to delete VPS ${vpsName}`, {
        error: error.message
      });
      throw new Error(`Failed to delete VPS: ${error.message}`);
    }
  }

  /**
   * Create VPS snapshot (backup)
   */
  async createSnapshot(vpsName, description) {
    logger.info(`📸 Creating snapshot via TransIP API: ${vpsName}`);
    
    try {
      const snapshot = await this.client.vps.snapshots.create(vpsName, {
        description,
        shouldStartVps: true
      });
      
      logger.info(`✅ Snapshot created successfully`, {
        vpsName,
        snapshotId: snapshot.id,
        description
      });
      
      return {
        snapshotId: snapshot.id,
        description: snapshot.description,
        createdAt: snapshot.dateTimeCreate
      };
    } catch (error) {
      logger.error(`❌ Failed to create snapshot for ${vpsName}`, {
        error: error.message
      });
      throw new Error(`Failed to create snapshot: ${error.message}`);
    }
  }
}

export default new TransIPService();
