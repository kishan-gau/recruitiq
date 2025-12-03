/**
 * Deployment Service Client
 * 
 * Client for communicating with the Deployment Service API
 * Handles tenant deployment, management, and status queries
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

class DeploymentServiceClient {
  constructor() {
    this.baseUrl = process.env.DEPLOYMENT_SERVICE_URL || 'http://localhost:5001/api';
    this.secret = process.env.DEPLOYMENT_SERVICE_SECRET || 'deployment-service-secret';
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Generate service token for authentication
   * @returns {string} JWT token
   */
  generateServiceToken() {
    return jwt.sign(
      {
        service: 'portal',
        iat: Math.floor(Date.now() / 1000)
      },
      this.secret,
      { expiresIn: '5m' }
    );
  }

  /**
   * Get axios instance with auth headers
   * @returns {Object} Configured axios instance
   */
  getClient() {
    const token = this.generateServiceToken();
    return axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Service': 'portal'
      }
    });
  }

  /**
   * Deploy a new tenant to a VPS
   * This is the main entry point for shared VPS deployments
   * 
   * @param {Object} config - Deployment configuration
   * @param {string} config.vpsId - Target VPS ID
   * @param {string} config.vpsIp - VPS IP address
   * @param {string} config.tenantId - Tenant/Organization ID
   * @param {string} config.organizationName - Organization name
   * @param {string} config.organizationSlug - Organization slug
   * @param {string} config.tier - Tier (starter, professional, enterprise)
   * @param {string} config.adminEmail - Admin email
   * @param {string} config.adminName - Admin name
   * @param {string} config.licenseKey - License key (optional)
   * @returns {Promise<Object>} Deployment result
   */
  async deployTenant(config) {
    try {
      logger.info('[DeploymentServiceClient] Initiating tenant deployment', {
        organizationSlug: config.organizationSlug,
        tier: config.tier
      });

      const client = this.getClient();
      const response = await client.post('/deployments/add-tenant', {
        vpsId: config.vpsId,
        vpsIp: config.vpsIp,
        tenantId: config.tenantId,
        organizationName: config.organizationName,
        organizationSlug: config.organizationSlug,
        tier: config.tier,
        adminEmail: config.adminEmail,
        adminName: config.adminName,
        licenseKey: config.licenseKey
      });

      logger.info('[DeploymentServiceClient] Deployment initiated', {
        deploymentId: response.data.deploymentId,
        status: response.data.status
      });

      return response.data;
    } catch (error) {
      logger.error('[DeploymentServiceClient] Deployment failed', {
        error: error.message,
        organizationSlug: config.organizationSlug
      });
      throw this.handleError(error);
    }
  }

  /**
   * Remove a tenant from a VPS
   * 
   * @param {string} tenantId - Tenant/Organization ID
   * @returns {Promise<Object>} Removal result
   */
  async removeTenant(tenantId) {
    try {
      logger.info('[DeploymentServiceClient] Removing tenant', { tenantId });

      const client = this.getClient();
      const response = await client.delete(`/tenants/${tenantId}`);

      return response.data;
    } catch (error) {
      logger.error('[DeploymentServiceClient] Tenant removal failed', {
        error: error.message,
        tenantId
      });
      throw this.handleError(error);
    }
  }

  /**
   * Get tenant health status
   * 
   * @param {string} tenantId - Tenant/Organization ID
   * @returns {Promise<Object>} Health status
   */
  async getTenantHealth(tenantId) {
    try {
      const client = this.getClient();
      const response = await client.get(`/tenants/${tenantId}/health`);
      return response.data;
    } catch (error) {
      logger.error('[DeploymentServiceClient] Health check failed', {
        error: error.message,
        tenantId
      });
      throw this.handleError(error);
    }
  }

  /**
   * Get deployment logs
   * 
   * @param {string} deploymentId - Deployment ID
   * @returns {Promise<Object>} Deployment logs
   */
  async getDeploymentLogs(deploymentId) {
    try {
      const client = this.getClient();
      const response = await client.get(`/tenants/deployments/${deploymentId}/logs`);
      return response.data;
    } catch (error) {
      logger.error('[DeploymentServiceClient] Failed to get deployment logs', {
        error: error.message,
        deploymentId
      });
      throw this.handleError(error);
    }
  }

  /**
   * Get port allocation statistics
   * 
   * @returns {Promise<Object>} Port statistics
   */
  async getPortStats() {
    try {
      const client = this.getClient();
      const response = await client.get('/tenants/ports/stats');
      return response.data;
    } catch (error) {
      logger.error('[DeploymentServiceClient] Failed to get port stats', {
        error: error.message
      });
      throw this.handleError(error);
    }
  }

  /**
   * Check deployment service health
   * 
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      // Health check doesn't require auth
      const response = await axios.get(`${this.baseUrl.replace('/api', '')}/health`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      logger.warn('[DeploymentServiceClient] Health check failed', {
        error: error.message
      });
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Handle and format errors
   * @param {Error} error - Original error
   * @returns {Error} Formatted error
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.error || error.response.data?.message || 'Deployment service error';
      const err = new Error(message);
      err.status = error.response.status;
      err.data = error.response.data;
      return err;
    } else if (error.request) {
      // No response received
      const err = new Error('Deployment service unavailable');
      err.status = 503;
      err.isConnectionError = true;
      return err;
    }
    return error;
  }
}

// Export singleton instance
export default new DeploymentServiceClient();
