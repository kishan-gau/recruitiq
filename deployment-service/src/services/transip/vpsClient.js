const transipAuth = require('./auth');
const config = require('../../config');

/**
 * TransIP VPS API Client
 * Handles VPS-related operations
 */
class TransIPVpsClient {
  /**
   * List all VPS instances
   * @returns {Promise<Array>} List of VPS instances
   */
  async listVps() {
    console.log('[TransIP VPS] Fetching VPS list');
    const response = await transipAuth.request('GET', '/vps');
    return response.vpss || [];
  }

  /**
   * Get VPS details
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} VPS details
   */
  async getVps(vpsName) {
    console.log('[TransIP VPS] Fetching VPS details:', vpsName);
    const response = await transipAuth.request('GET', `/vps/${vpsName}`);
    return response.vps;
  }

  /**
   * Order a new VPS
   * @param {Object} orderData - VPS order data
   * @returns {Promise<Object>} Order response
   */
  async orderVps(orderData) {
    const {
      productName,
      addons = [],
      availabilityZone = 'ams0',
      operatingSystem = 'ubuntu-22.04',
      installFlavour = 'installer',
      hostname = null,
      description = null,
      base64InstallText = null,
    } = orderData;

    // Check guards
    if (config.deployment.dryRun) {
      console.log('[TransIP VPS] DRY RUN: Would order VPS:', orderData);
      return {
        dryRun: true,
        message: 'Dry run mode - no actual VPS created',
        estimatedVpsName: `dryrun-vps-${Date.now()}`,
        ...orderData,
      };
    }

    if (config.deployment.billingGuard) {
      throw new Error(
        'BILLING GUARD ACTIVE: Cannot create VPS that generates invoices. ' +
          'Disable DEPLOYMENT_BILLING_GUARD to proceed.'
      );
    }

    console.log('[TransIP VPS] Ordering VPS:', {
      productName,
      availabilityZone,
      operatingSystem,
    });

    const requestBody = {
      productName,
      addons,
      availabilityZone,
      operatingSystem,
      installFlavour,
      hostname,
      description,
      base64InstallText,
    };

    const response = await transipAuth.request('POST', '/vps', requestBody);
    return response;
  }

  /**
   * Start a VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Response
   */
  async startVps(vpsName) {
    console.log('[TransIP VPS] Starting VPS:', vpsName);

    if (config.deployment.dryRun) {
      console.log('[TransIP VPS] DRY RUN: Would start VPS:', vpsName);
      return { dryRun: true, message: 'Dry run mode - no action taken' };
    }

    const response = await transipAuth.request(
      'PATCH',
      `/vps/${vpsName}`,
      { action: 'start' }
    );
    return response;
  }

  /**
   * Stop a VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Response
   */
  async stopVps(vpsName) {
    console.log('[TransIP VPS] Stopping VPS:', vpsName);

    if (config.deployment.dryRun) {
      console.log('[TransIP VPS] DRY RUN: Would stop VPS:', vpsName);
      return { dryRun: true, message: 'Dry run mode - no action taken' };
    }

    const response = await transipAuth.request(
      'PATCH',
      `/vps/${vpsName}`,
      { action: 'stop' }
    );
    return response;
  }

  /**
   * Reset (reboot) a VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Response
   */
  async resetVps(vpsName) {
    console.log('[TransIP VPS] Resetting VPS:', vpsName);

    if (config.deployment.dryRun) {
      console.log('[TransIP VPS] DRY RUN: Would reset VPS:', vpsName);
      return { dryRun: true, message: 'Dry run mode - no action taken' };
    }

    const response = await transipAuth.request(
      'PATCH',
      `/vps/${vpsName}`,
      { action: 'reset' }
    );
    return response;
  }

  /**
   * Handoff a VPS (soft reset)
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Response
   */
  async handoffVps(vpsName) {
    console.log('[TransIP VPS] Handoff VPS:', vpsName);

    if (config.deployment.dryRun) {
      console.log('[TransIP VPS] DRY RUN: Would handoff VPS:', vpsName);
      return { dryRun: true, message: 'Dry run mode - no action taken' };
    }

    const response = await transipAuth.request(
      'PATCH',
      `/vps/${vpsName}`,
      { action: 'handoff' }
    );
    return response;
  }

  /**
   * Cancel a VPS
   * @param {string} vpsName - VPS name
   * @param {string} endTime - When to cancel ('end' or 'immediately')
   * @returns {Promise<Object>} Response
   */
  async cancelVps(vpsName, endTime = 'end') {
    console.log('[TransIP VPS] Cancelling VPS:', vpsName, endTime);

    if (config.deployment.billingGuard) {
      throw new Error(
        'BILLING GUARD ACTIVE: Cannot cancel VPS. ' +
          'Disable DEPLOYMENT_BILLING_GUARD to proceed.'
      );
    }

    if (config.deployment.dryRun) {
      console.log('[TransIP VPS] DRY RUN: Would cancel VPS:', vpsName);
      return { dryRun: true, message: 'Dry run mode - no action taken' };
    }

    const response = await transipAuth.request(
      'DELETE',
      `/vps/${vpsName}`,
      null,
      { endTime }
    );
    return response;
  }

  /**
   * Get VPS usage data
   * @param {string} vpsName - VPS name
   * @param {Object} params - Query parameters (types, dateTimeStart, dateTimeEnd)
   * @returns {Promise<Object>} Usage data
   */
  async getVpsUsage(vpsName, params = {}) {
    console.log('[TransIP VPS] Fetching usage for:', vpsName);
    const response = await transipAuth.request(
      'GET',
      `/vps/${vpsName}/usage`,
      null,
      params
    );
    return response.usage;
  }

  /**
   * Get VPS VNC data (for console access)
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} VNC connection data
   */
  async getVpsVnc(vpsName) {
    console.log('[TransIP VPS] Fetching VNC data for:', vpsName);
    const response = await transipAuth.request('GET', `/vps/${vpsName}/vnc-data`);
    return response.vncData;
  }

  /**
   * List available VPS products
   * @returns {Promise<Array>} Available products
   */
  async listProducts() {
    console.log('[TransIP VPS] Fetching available products');
    const response = await transipAuth.request('GET', '/products', null, {
      productType: 'vps',
    });
    return response.products || [];
  }

  /**
   * Get addons for a VPS product
   * @param {string} productName - Product name
   * @returns {Promise<Array>} Available addons
   */
  async listAddons(productName) {
    console.log('[TransIP VPS] Fetching addons for:', productName);
    const response = await transipAuth.request(
      'GET',
      `/products/${productName}/addons`
    );
    return response.addons || [];
  }

  /**
   * List available operating systems
   * @returns {Promise<Array>} Available operating systems
   */
  async listOperatingSystems() {
    console.log('[TransIP VPS] Fetching operating systems');
    const response = await transipAuth.request('GET', '/vps/operating-systems');
    return response.operatingSystems || [];
  }

  /**
   * Install operating system on VPS
   * @param {string} vpsName - VPS name
   * @param {Object} installData - Installation data
   * @returns {Promise<Object>} Response
   */
  async installOperatingSystem(vpsName, installData) {
    const {
      operatingSystemName,
      hostname = null,
      installFlavour = 'installer',
      username = null,
      sshKeys = [],
      base64InstallText = null,
    } = installData;

    console.log('[TransIP VPS] Installing OS on:', vpsName, operatingSystemName);

    if (config.deployment.dryRun) {
      console.log('[TransIP VPS] DRY RUN: Would install OS');
      return { dryRun: true, message: 'Dry run mode - no action taken' };
    }

    const requestBody = {
      operatingSystemName,
      hostname,
      installFlavour,
      username,
      sshKeys,
      base64InstallText,
    };

    const response = await transipAuth.request(
      'POST',
      `/vps/${vpsName}/operating-systems`,
      requestBody
    );
    return response;
  }

  /**
   * Clone a VPS
   * @param {string} vpsName - Source VPS name
   * @param {string} availabilityZone - Target availability zone
   * @returns {Promise<Object>} Response
   */
  async cloneVps(vpsName, availabilityZone) {
    console.log('[TransIP VPS] Cloning VPS:', vpsName);

    if (config.deployment.billingGuard) {
      throw new Error(
        'BILLING GUARD ACTIVE: Cannot clone VPS (creates new resources). ' +
          'Disable DEPLOYMENT_BILLING_GUARD to proceed.'
      );
    }

    if (config.deployment.dryRun) {
      console.log('[TransIP VPS] DRY RUN: Would clone VPS');
      return { dryRun: true, message: 'Dry run mode - no action taken' };
    }

    const response = await transipAuth.request(
      'POST',
      `/vps/${vpsName}/clone`,
      { availabilityZone }
    );
    return response;
  }

  /**
   * Create snapshot of VPS
   * @param {string} vpsName - VPS name
   * @param {string} description - Snapshot description
   * @returns {Promise<Object>} Response
   */
  async createSnapshot(vpsName, description = null) {
    console.log('[TransIP VPS] Creating snapshot for:', vpsName);

    if (config.deployment.billingGuard) {
      console.warn('[TransIP VPS] WARNING: Snapshots may incur costs');
    }

    if (config.deployment.dryRun) {
      console.log('[TransIP VPS] DRY RUN: Would create snapshot');
      return { dryRun: true, message: 'Dry run mode - no action taken' };
    }

    const requestBody = description ? { description } : {};
    const response = await transipAuth.request(
      'POST',
      `/vps/${vpsName}/snapshots`,
      requestBody
    );
    return response;
  }

  /**
   * List snapshots for a VPS
   * @param {string} vpsName - VPS name
   * @returns {Promise<Array>} List of snapshots
   */
  async listSnapshots(vpsName) {
    console.log('[TransIP VPS] Listing snapshots for:', vpsName);
    const response = await transipAuth.request('GET', `/vps/${vpsName}/snapshots`);
    return response.snapshots || [];
  }

  /**
   * Revert VPS to snapshot
   * @param {string} vpsName - VPS name
   * @param {string} snapshotName - Snapshot name
   * @returns {Promise<Object>} Response
   */
  async revertToSnapshot(vpsName, snapshotName) {
    console.log('[TransIP VPS] Reverting to snapshot:', vpsName, snapshotName);

    if (config.deployment.dryRun) {
      console.log('[TransIP VPS] DRY RUN: Would revert to snapshot');
      return { dryRun: true, message: 'Dry run mode - no action taken' };
    }

    const response = await transipAuth.request(
      'PATCH',
      `/vps/${vpsName}/snapshots/${snapshotName}`,
      { action: 'revert' }
    );
    return response;
  }

  /**
   * Delete a snapshot
   * @param {string} vpsName - VPS name
   * @param {string} snapshotName - Snapshot name
   * @returns {Promise<Object>} Response
   */
  async deleteSnapshot(vpsName, snapshotName) {
    console.log('[TransIP VPS] Deleting snapshot:', vpsName, snapshotName);

    if (config.deployment.dryRun) {
      console.log('[TransIP VPS] DRY RUN: Would delete snapshot');
      return { dryRun: true, message: 'Dry run mode - no action taken' };
    }

    const response = await transipAuth.request(
      'DELETE',
      `/vps/${vpsName}/snapshots/${snapshotName}`
    );
    return response;
  }

  /**
   * Get VPS firewall settings
   * @param {string} vpsName - VPS name
   * @returns {Promise<Object>} Firewall settings
   */
  async getFirewall(vpsName) {
    console.log('[TransIP VPS] Fetching firewall for:', vpsName);
    const response = await transipAuth.request('GET', `/vps/${vpsName}/firewall`);
    return response.firewall;
  }

  /**
   * Update VPS firewall
   * @param {string} vpsName - VPS name
   * @param {Object} firewallData - Firewall configuration
   * @returns {Promise<Object>} Response
   */
  async updateFirewall(vpsName, firewallData) {
    console.log('[TransIP VPS] Updating firewall for:', vpsName);

    if (config.deployment.dryRun) {
      console.log('[TransIP VPS] DRY RUN: Would update firewall');
      return { dryRun: true, message: 'Dry run mode - no action taken' };
    }

    const response = await transipAuth.request(
      'PUT',
      `/vps/${vpsName}/firewall`,
      { firewall: firewallData }
    );
    return response;
  }
}

// Export singleton instance
module.exports = new TransIPVpsClient();
