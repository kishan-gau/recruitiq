import transipAuth from './auth.js';
import { generateCloudInitConfig } from './cloudInit.js';
import config from '../../config/index.js';

class TransIPDeploymentService {
  constructor() {
    this.dryRun = config.deployment.dryRun;
    this.billingGuard = config.deployment.billingGuard;
  }

  /**
   * Deploy a new RecruitIQ instance
   * @param {object} options - Deployment options
   * @returns {Promise<object>} Deployment result
   */
  async deployInstance(options) {
    const {
      instanceId,
      customerId,
      customerName,
      licenseKey,
      tier,
      hostname,
      domain,
      email,
      productName,
      region,
    } = options;

    console.log('[Deployment] Starting deployment for instance:', instanceId);

    // Check billing guard
    if (this.billingGuard) {
      console.warn('[Deployment] BILLING GUARD ACTIVE - Deployment requires approval');
      throw new Error('Deployment requires billing approval. Set DEPLOYMENT_BILLING_GUARD=false to proceed.');
    }

    // Dry run mode
    if (this.dryRun) {
      console.log('[Deployment] DRY RUN MODE - Simulating deployment');
      return this.simulateDeployment(options);
    }

    try {
      // Step 1: Generate cloud-init configuration
      const cloudInitConfig = generateCloudInitConfig({
        instanceId,
        customerId,
        licenseKey,
        hostname: hostname || `recruitiq-${instanceId}`,
        domain,
        email: email || 'admin@example.com',
      });

      // Step 2: Create VPS with cloud-init
      const vpsName = `recruitiq-${instanceId}`;
      const vpsProduct = productName || this.getProductForTier(tier);
      
      const vps = await this.createVPS({
        vpsName,
        productName: vpsProduct,
        operatingSystem: 'ubuntu-22.04',
        installText: cloudInitConfig,
        hostname: hostname || vpsName,
        description: `RecruitIQ instance for ${customerName} (${customerId})`,
        region: region || config.deployment.defaultRegion,
      });

      console.log('[Deployment] VPS created:', vps.name);

      // Step 3: Wait for VPS to be ready
      await this.waitForVPSReady(vps.name);

      // Step 4: Get VPS details including IP address
      const vpsDetails = await this.getVPSDetails(vps.name);

      console.log('[Deployment] Deployment completed successfully:', {
        vpsName: vps.name,
        ipAddress: vpsDetails.ipAddress,
        status: vpsDetails.status,
      });

      return {
        success: true,
        vpsName: vps.name,
        ipAddress: vpsDetails.ipAddress,
        hostname: hostname || vpsName,
        fqdn: domain ? `${hostname || vpsName}.${domain}` : null,
        status: 'deployed',
        message: 'Instance deployed successfully',
      };
    } catch (error) {
      console.error('[Deployment] Deployment failed:', error.message);
      throw error;
    }
  }

  /**
   * Create a VPS using TransIP API
   * @param {object} options - VPS creation options
   * @returns {Promise<object>} Created VPS
   */
  async createVPS(options) {
    const {
      vpsName,
      productName,
      operatingSystem,
      installText,
      hostname,
      description,
      region,
    } = options;

    console.log('[TransIP] Creating VPS:', { vpsName, productName, operatingSystem, region });

    const requestBody = {
      productName,
      operatingSystem,
      hostname: hostname || vpsName,
      description: description || `RecruitIQ instance: ${vpsName}`,
      base64InstallText: installText,
    };

    // Add region if supported
    if (region) {
      requestBody.availabilityZone = region;
    }

    const response = await transipAuth.request('POST', '/vps', requestBody);
    
    return {
      name: vpsName,
      status: 'creating',
      ...response.vps,
    };
  }

  /**
   * Wait for VPS to become ready
   * @param {string} vpsName - VPS name
   * @param {number} maxWaitTime - Maximum wait time in milliseconds (default: 10 minutes)
   * @returns {Promise<void>}
   */
  async waitForVPSReady(vpsName, maxWaitTime = 600000) {
    const startTime = Date.now();
    const pollInterval = 10000; // 10 seconds

    console.log('[TransIP] Waiting for VPS to be ready:', vpsName);

    while (Date.now() - startTime < maxWaitTime) {
      const vps = await this.getVPSDetails(vpsName);

      if (vps.status === 'running') {
        console.log('[TransIP] VPS is ready:', vpsName);
        return;
      }

      if (vps.status === 'failed' || vps.status === 'error') {
        throw new Error(`VPS deployment failed with status: ${vps.status}`);
      }

      console.log('[TransIP] VPS status:', vps.status, '- waiting...');
      await this.sleep(pollInterval);
    }

    throw new Error(`VPS did not become ready within ${maxWaitTime / 1000} seconds`);
  }

  /**
   * Get VPS details
   * @param {string} vpsName - VPS name
   * @returns {Promise<object>} VPS details
   */
  async getVPSDetails(vpsName) {
    const response = await transipAuth.request('GET', `/vps/${vpsName}`);
    return response.vps;
  }

  /**
   * Stop a VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<object>} Result
   */
  async stopVPS(vpsName) {
    console.log('[TransIP] Stopping VPS:', vpsName);
    
    if (this.dryRun) {
      return { success: true, message: 'DRY RUN: VPS stop simulated' };
    }

    await transipAuth.request('PATCH', `/vps/${vpsName}`, { action: 'stop' });
    return { success: true, message: 'VPS stopped' };
  }

  /**
   * Start a VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<object>} Result
   */
  async startVPS(vpsName) {
    console.log('[TransIP] Starting VPS:', vpsName);
    
    if (this.dryRun) {
      return { success: true, message: 'DRY RUN: VPS start simulated' };
    }

    await transipAuth.request('PATCH', `/vps/${vpsName}`, { action: 'start' });
    return { success: true, message: 'VPS started' };
  }

  /**
   * Reboot a VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<object>} Result
   */
  async rebootVPS(vpsName) {
    console.log('[TransIP] Rebooting VPS:', vpsName);
    
    if (this.dryRun) {
      return { success: true, message: 'DRY RUN: VPS reboot simulated' };
    }

    await transipAuth.request('PATCH', `/vps/${vpsName}`, { action: 'reset' });
    return { success: true, message: 'VPS rebooted' };
  }

  /**
   * Delete a VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<object>} Result
   */
  async deleteVPS(vpsName) {
    console.log('[TransIP] Deleting VPS:', vpsName);
    
    if (this.dryRun) {
      return { success: true, message: 'DRY RUN: VPS deletion simulated' };
    }

    if (this.billingGuard) {
      throw new Error('VPS deletion requires billing approval when billing guard is active');
    }

    await transipAuth.request('DELETE', `/vps/${vpsName}`, { endTime: 'end' });
    return { success: true, message: 'VPS deleted' };
  }

  /**
   * Create a snapshot of a VPS
   * @param {string} vpsName - VPS name
   * @param {string} description - Snapshot description
   * @returns {Promise<object>} Snapshot details
   */
  async createSnapshot(vpsName, description) {
    console.log('[TransIP] Creating snapshot for VPS:', vpsName);
    
    if (this.dryRun) {
      return { success: true, message: 'DRY RUN: Snapshot creation simulated', snapshotId: 'dry-run-snapshot-id' };
    }

    const response = await transipAuth.request('POST', `/vps/${vpsName}/snapshots`, {
      description: description || `Snapshot of ${vpsName} at ${new Date().toISOString()}`,
    });

    return {
      success: true,
      snapshot: response.snapshot,
    };
  }

  /**
   * Attach block storage to VPS
   * @param {string} vpsName - VPS name
   * @param {string} blockStorageName - Block storage name
   * @returns {Promise<object>} Result
   */
  async attachBlockStorage(vpsName, blockStorageName) {
    console.log('[TransIP] Attaching block storage to VPS:', { vpsName, blockStorageName });
    
    if (this.dryRun) {
      return { success: true, message: 'DRY RUN: Block storage attachment simulated' };
    }

    await transipAuth.request('POST', `/vps/${vpsName}/block-storages`, {
      blockStorageName,
    });

    return { success: true, message: 'Block storage attached' };
  }

  /**
   * Create a private network
   * @param {string} description - Network description
   * @returns {Promise<object>} Network details
   */
  async createPrivateNetwork(description) {
    console.log('[TransIP] Creating private network');
    
    if (this.dryRun) {
      return { success: true, message: 'DRY RUN: Private network creation simulated', networkName: 'dry-run-network' };
    }

    const response = await transipAuth.request('POST', '/private-networks', {
      description: description || 'RecruitIQ private network',
    });

    return {
      success: true,
      network: response.privateNetwork,
    };
  }

  /**
   * Get product name based on tier
   * @param {string} tier - Customer tier (starter, professional, enterprise)
   * @returns {string} TransIP product name
   */
  getProductForTier(tier) {
    const productMap = {
      starter: 'vps-bladevps-x4',      // 2 vCPU, 4GB RAM
      professional: 'vps-bladevps-x8',  // 4 vCPU, 8GB RAM
      enterprise: 'vps-bladevps-x16',   // 8 vCPU, 16GB RAM
    };

    return productMap[tier?.toLowerCase()] || config.deployment.defaultProductName;
  }

  /**
   * Simulate deployment (dry run mode)
   * @param {object} options - Deployment options
   * @returns {object} Simulated result
   */
  simulateDeployment(options) {
    const { instanceId, hostname, domain } = options;
    const vpsName = `recruitiq-${instanceId}`;
    const simulatedIP = `192.0.2.${Math.floor(Math.random() * 254) + 1}`; // TEST-NET-1 range

    return {
      success: true,
      vpsName,
      ipAddress: simulatedIP,
      hostname: hostname || vpsName,
      fqdn: domain ? `${hostname || vpsName}.${domain}` : null,
      status: 'simulated',
      message: 'DRY RUN: Deployment simulated successfully',
    };
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new TransIPDeploymentService();
