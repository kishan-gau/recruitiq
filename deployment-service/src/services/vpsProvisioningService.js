import vpsClient from './transip/vpsClient.js';
import cloudInitService from './transip/cloudInit.js';
import { VpsProvisionRequest, TransipVpsInventory } from '../models/index.js';
import { createDeploymentJob } from '../queue/deploymentQueue.js';

/**
 * VPS Provisioning Service
 * Handles the full lifecycle of VPS provisioning with approval workflow
 */
class VpsProvisioningService {
  /**
   * Process an approved VPS provision request
   * This is called after a request is approved
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Provisioning result
   */
  async provisionApprovedRequest(requestId) {
    console.log('[VPS Provisioning] Starting provisioning for request:', requestId);

    try {
      // Get the request
      const request = await VpsProvisionRequest.findById(requestId);

      if (!request) {
        throw new Error('Request not found');
      }

      if (request.status !== 'approved') {
        throw new Error(`Request is not approved (status: ${request.status})`);
      }

      // Update status to provisioning
      await VpsProvisionRequest.updateStatus(requestId, 'provisioning');

      // Generate cloud-init configuration
      const cloudInitConfig = this.generateCloudInit(request);

      // Prepare VPS order data
      const orderData = {
        productName: request.product_name,
        availabilityZone: request.region,
        operatingSystem: request.operating_system,
        hostname: request.hostname || request.vps_name,
        description: `VPS for ${request.customer_name} - ${request.request_number}`,
        base64InstallText: Buffer.from(cloudInitConfig).toString('base64'),
      };

      // Order VPS from TransIP
      console.log('[VPS Provisioning] Ordering VPS from TransIP');
      const orderResult = await vpsClient.orderVps(orderData);

      // Handle dry run mode
      if (orderResult.dryRun) {
        console.log('[VPS Provisioning] DRY RUN - Simulated VPS creation');
        await VpsProvisionRequest.updateStatus(requestId, 'completed', {
          transipVpsName: orderResult.estimatedVpsName,
          vpsIpAddress: '192.0.2.1', // Example IP
        });

        return {
          success: true,
          dryRun: true,
          message: 'Dry run completed successfully',
          request,
          vpsName: orderResult.estimatedVpsName,
        };
      }

      // Extract VPS name from order result
      const vpsName = orderResult.vps?.name || request.vps_name;

      // Update request with VPS details
      await VpsProvisionRequest.updateStatus(requestId, 'provisioning', {
        transipVpsName: vpsName,
      });

      // Wait for VPS to be ready (polling)
      const vpsDetails = await this.waitForVpsReady(vpsName);

      // Update request with final details
      await VpsProvisionRequest.updateStatus(requestId, 'completed', {
        vpsIpAddress: vpsDetails.ipAddress,
      });

      // Add to inventory
      await TransipVpsInventory.upsert({
        vpsName: vpsDetails.name,
        provisionRequestId: requestId,
        productName: request.product_name,
        region: request.region,
        operatingSystem: request.operating_system,
        ipAddress: vpsDetails.ipAddress,
        customerId: request.customer_id,
        customerName: request.customer_name,
        organizationId: request.organization_id,
        instanceId: request.instance_id,
        status: vpsDetails.status,
        hostname: request.hostname,
        domain: request.domain,
        fqdn: request.domain ? `${request.hostname}.${request.domain}` : null,
        monthlyCost: request.estimated_monthly_cost,
        provisionedAt: new Date(),
        tags: request.tags || [],
        metadata: {
          requestNumber: request.request_number,
          licenseKey: request.license_key,
          licenseTier: request.license_tier,
        },
      });

      console.log('[VPS Provisioning] Provisioning completed successfully');

      // Log audit entry
      await VpsProvisionRequest.logAudit({
        requestId,
        action: 'provisioning_completed',
        metadata: {
          vpsName: vpsDetails.name,
          ipAddress: vpsDetails.ipAddress,
        },
      });

      return {
        success: true,
        message: 'VPS provisioned successfully',
        request,
        vps: vpsDetails,
      };
    } catch (error) {
      console.error('[VPS Provisioning] Provisioning failed:', error);

      // Update request status to failed
      await VpsProvisionRequest.updateStatus(requestId, 'failed');

      // Log audit entry
      await VpsProvisionRequest.logAudit({
        requestId,
        action: 'provisioning_failed',
        metadata: {
          error: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Generate cloud-init configuration for VPS
   * @param {Object} request - Provision request
   * @returns {string} Cloud-init YAML configuration
   */
  generateCloudInit(request) {
    // Use existing cloud-init service or create basic config
    const config = {
      hostname: request.hostname || request.vps_name,
      domain: request.domain,
      email: request.admin_email,
      licenseKey: request.license_key,
      instanceId: request.instance_id,
      customerName: request.customer_name,
      ...request.custom_config,
    };

    // If cloudInit service has a method to generate config, use it
    if (typeof cloudInitService.generateCloudInit === 'function') {
      return cloudInitService.generateCloudInit(config);
    }

    // Otherwise, create a basic cloud-init config
    return `#cloud-config
hostname: ${config.hostname}
fqdn: ${config.hostname}${config.domain ? '.' + config.domain : ''}

# Update packages
package_update: true
package_upgrade: true

# Install basic packages
packages:
  - curl
  - wget
  - git
  - docker.io
  - docker-compose

# Configure timezone
timezone: UTC

# Create admin user
users:
  - name: recruitiq
    groups: sudo, docker
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']

# Run commands
runcmd:
  - echo "VPS provisioned via RecruitIQ Deployment Service"
  - echo "Request Number: ${request.request_number}"
  - echo "Customer: ${config.customerName}"
  - systemctl enable docker
  - systemctl start docker

# Final message
final_message: "VPS provisioning completed at $TIMESTAMP"
`;
  }

  /**
   * Wait for VPS to be ready
   * @param {string} vpsName - VPS name
   * @param {number} maxAttempts - Maximum polling attempts
   * @param {number} delayMs - Delay between attempts in milliseconds
   * @returns {Promise<Object>} VPS details when ready
   */
  async waitForVpsReady(vpsName, maxAttempts = 60, delayMs = 10000) {
    console.log('[VPS Provisioning] Waiting for VPS to be ready:', vpsName);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const vps = await vpsClient.getVps(vpsName);

        console.log(`[VPS Provisioning] Attempt ${attempt}/${maxAttempts} - Status: ${vps.status}`);

        if (vps.status === 'running') {
          console.log('[VPS Provisioning] VPS is ready');
          return vps;
        }

        if (vps.status === 'blocked' || vps.status === 'locked') {
          throw new Error(`VPS is in ${vps.status} state`);
        }

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`VPS did not become ready after ${maxAttempts} attempts: ${error.message}`);
        }
        console.warn(`[VPS Provisioning] Error checking VPS status (attempt ${attempt}):`, error.message);
      }
    }

    throw new Error('VPS provisioning timeout');
  }

  /**
   * Provision VPS using existing deployment queue
   * This integrates with the existing deployment system
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Job details
   */
  async provisionViaQueue(requestId) {
    console.log('[VPS Provisioning] Queueing provisioning job for request:', requestId);

    try {
      const request = await VpsProvisionRequest.findById(requestId);

      if (!request) {
        throw new Error('Request not found');
      }

      if (request.status !== 'approved') {
        throw new Error(`Request is not approved (status: ${request.status})`);
      }

      // Create deployment job using existing queue
      const job = await createDeploymentJob({
        instanceId: request.instance_id || request.id,
        customerId: request.customer_id,
        customerName: request.customer_name,
        licenseKey: request.license_key,
        tier: request.license_tier,
        hostname: request.hostname,
        domain: request.domain,
        email: request.admin_email,
        productName: request.product_name,
        region: request.region,
        vpsName: request.vps_name,
        provisionRequestId: requestId,
      });

      // Update request with job ID
      await VpsProvisionRequest.updateStatus(requestId, 'provisioning', {
        deploymentJobId: job.id,
      });

      console.log('[VPS Provisioning] Job queued:', job.id);

      return {
        success: true,
        message: 'Provisioning job queued',
        jobId: job.id,
        requestId,
      };
    } catch (error) {
      console.error('[VPS Provisioning] Failed to queue job:', error);
      throw error;
    }
  }

  /**
   * Cancel provisioning
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelProvisioning(requestId) {
    console.log('[VPS Provisioning] Cancelling provisioning for request:', requestId);

    const request = await VpsProvisionRequest.findById(requestId);

    if (!request) {
      throw new Error('Request not found');
    }

    // If VPS was created, attempt to delete it
    if (request.transip_vps_name) {
      try {
        await vpsClient.cancelVps(request.transip_vps_name, 'immediately');
        console.log('[VPS Provisioning] VPS cancelled in TransIP');
      } catch (error) {
        console.warn('[VPS Provisioning] Failed to cancel VPS in TransIP:', error.message);
      }
    }

    // Update request status
    await VpsProvisionRequest.updateStatus(requestId, 'cancelled');

    return {
      success: true,
      message: 'Provisioning cancelled',
    };
  }

  /**
   * Get provisioning status
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Status details
   */
  async getProvisioningStatus(requestId) {
    const request = await VpsProvisionRequest.findById(requestId);

    if (!request) {
      throw new Error('Request not found');
    }

    const result = {
      requestId: request.id,
      requestNumber: request.request_number,
      status: request.status,
      vpsName: request.transip_vps_name,
      ipAddress: request.vps_ip_address,
      createdAt: request.created_at,
      approvedAt: request.approved_at,
      completedAt: request.completed_at,
    };

    // If provisioning and we have a VPS name, get live status
    if (request.status === 'provisioning' && request.transip_vps_name) {
      try {
        const vps = await vpsClient.getVps(request.transip_vps_name);
        result.liveStatus = vps.status;
        result.liveIpAddress = vps.ipAddress;
      } catch (error) {
        result.liveStatusError = error.message;
      }
    }

    return result;
  }
}

export default new VpsProvisioningService();
