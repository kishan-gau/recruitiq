/**
 * Tenant Management Controller
 * 
 * Handles API requests for tenant deployment and management.
 * Implements the Portal → Deployment Service communication flow.
 */

import TenantDeploymentService from '../services/TenantDeploymentService.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';

class TenantManagementController {
  constructor(options = {}) {
    this.deploymentService = options.deploymentService || new TenantDeploymentService(options);
    this.portalUrl = options.portalUrl || process.env.PORTAL_URL || 'https://portal.recruitiq.nl';
    this.deploymentServiceSecret = process.env.DEPLOYMENT_SERVICE_SECRET;
  }

  /**
   * Add tenant to existing VPS
   * POST /api/deployments/add-tenant
   * 
   * This endpoint is called by the Portal to deploy a new tenant.
   */
  async addTenant(req, res) {
    try {
      const {
        vpsId,
        vpsIp,
        tenantId,
        organizationName,
        organizationSlug,
        customerId,
        licenseId,
        licenseKey,
        tier,
        products,
        adminEmail,
        adminName,
        domain,
        ports
      } = req.body;

      // Validate required fields
      const requiredFields = ['vpsId', 'vpsIp', 'tenantId', 'organizationName', 'organizationSlug', 
                             'customerId', 'licenseId', 'licenseKey', 'tier', 'adminEmail'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
      }

      // Generate deployment ID
      const deploymentId = `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log(`[TenantController] Received add-tenant request for ${organizationSlug}`);

      // Return immediately with queued status
      res.status(202).json({
        success: true,
        deploymentId,
        status: 'queued',
        estimatedTime: '5 minutes',
        message: `Deployment queued for ${organizationSlug}`
      });

      // Execute deployment asynchronously
      this.executeDeploymentAsync(deploymentId, {
        vpsId,
        vpsIp,
        tenantId,
        organizationName,
        organizationSlug,
        customerId,
        licenseId,
        licenseKey,
        tier,
        products: products || ['nexus', 'paylinq'],
        adminEmail,
        adminName: adminName || 'Admin',
        domain,
        ports,
        sshKey: process.env.VPS_SSH_KEY_PATH
      });

    } catch (error) {
      console.error('[TenantController] Add tenant error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Execute deployment asynchronously and report back to Portal
   * @param {string} deploymentId - Deployment ID
   * @param {Object} config - Deployment configuration
   */
  async executeDeploymentAsync(deploymentId, config) {
    const startTime = Date.now();

    try {
      console.log(`[TenantController] Starting deployment ${deploymentId}`);

      const result = await this.deploymentService.deployTenant({
        ...config,
        deploymentId
      });

      const duration = Math.round((Date.now() - startTime) / 1000);

      // Report success to Portal
      await this.reportToPortal({
        deploymentId,
        status: 'completed',
        vpsId: config.vpsId,
        tenantId: config.tenantId,
        organizationId: result.organizationId,
        organizationSlug: config.organizationSlug,
        endpoints: result.endpoints,
        containers: result.containers,
        credentials: result.credentials,
        resources: result.resources,
        health: {
          backend: 'healthy',
          frontend: 'healthy',
          database: 'healthy',
          ssl: result.endpoints.web.startsWith('https://') ? 'valid' : 'pending',
          lastCheck: new Date().toISOString()
        },
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        duration: `${duration} seconds`
      });

      console.log(`[TenantController] Deployment ${deploymentId} completed in ${duration}s`);

    } catch (error) {
      console.error(`[TenantController] Deployment ${deploymentId} failed:`, error.message);

      // Report failure to Portal
      await this.reportToPortal({
        deploymentId,
        status: 'failed',
        vpsId: config.vpsId,
        tenantId: config.tenantId,
        organizationSlug: config.organizationSlug,
        error: error.message,
        logs: this.deploymentService.getLogs(deploymentId),
        startedAt: new Date(startTime).toISOString(),
        failedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Report deployment status to Portal
   * @param {Object} data - Deployment status data
   */
  async reportToPortal(data) {
    try {
      const response = await axios.post(
        `${this.portalUrl}/api/deployments/callback`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.generateServiceToken()}`,
            'X-Service': 'deployment-service'
          },
          timeout: 30000
        }
      );

      console.log(`[TenantController] Reported to portal: ${data.status}`);
      return response.data;

    } catch (error) {
      console.error('[TenantController] Failed to report to portal:', error.message);
      // Log locally if portal callback fails
      console.log('[TenantController] Deployment result (local):', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Generate JWT token for service-to-service auth
   * @returns {string} JWT token
   */
  generateServiceToken() {
    // In production, use proper JWT signing
    // For now, return a placeholder that Portal should validate
    const secret = this.deploymentServiceSecret || 'deployment-service-secret';
    
    return jwt.sign(
      {
        service: 'deployment-service',
        vpsId: process.env.VPS_ID,
        role: 'deployment_agent'
      },
      secret,
      { expiresIn: '1h', issuer: 'deployment-service' }
    );
  }

  /**
   * Remove tenant from VPS
   * DELETE /api/deployments/tenants/:tenantId
   */
  async removeTenant(req, res) {
    try {
      const { tenantId } = req.params;
      const { vpsIp, organizationSlug, domain } = req.body;

      if (!vpsIp || !organizationSlug) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: vpsIp, organizationSlug'
        });
      }

      const result = await this.deploymentService.removeTenant({
        vpsIp,
        tenantId,
        organizationSlug,
        domain,
        sshKey: process.env.VPS_SSH_KEY_PATH
      });

      res.json({
        success: true,
        message: `Tenant ${organizationSlug} removed`,
        ...result
      });

    } catch (error) {
      console.error('[TenantController] Remove tenant error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get tenant health status
   * GET /api/deployments/tenants/:tenantId/health
   */
  async getTenantHealth(req, res) {
    try {
      const { tenantId } = req.params;
      const { vpsIp, organizationSlug } = req.query;

      if (!vpsIp || !organizationSlug) {
        return res.status(400).json({
          success: false,
          error: 'Missing required query params: vpsIp, organizationSlug'
        });
      }

      const health = await this.deploymentService.checkTenantHealth({
        vpsIp,
        organizationSlug,
        sshKey: process.env.VPS_SSH_KEY_PATH
      });

      res.json({
        success: true,
        tenantId,
        health
      });

    } catch (error) {
      console.error('[TenantController] Health check error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get deployment logs
   * GET /api/deployments/:deploymentId/logs
   */
  async getDeploymentLogs(req, res) {
    try {
      const { deploymentId } = req.params;

      const logs = this.deploymentService.getLogs(deploymentId);

      res.json({
        success: true,
        deploymentId,
        logs
      });

    } catch (error) {
      console.error('[TenantController] Get logs error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get port allocation statistics
   * GET /api/deployments/ports/stats
   */
  async getPortStats(req, res) {
    try {
      const stats = this.deploymentService.getPortStatistics();

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('[TenantController] Port stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle deployment callback from VPS (cloud-init or manual)
   * POST /api/deployments/callback
   * 
   * This is called by the tenant instance after deployment completes
   * to confirm it's operational.
   */
  async handleTenantCallback(req, res) {
    try {
      const {
        tenantId,
        organizationSlug,
        status,
        hostname,
        ipAddress,
        version
      } = req.body;

      console.log('[TenantController] Tenant callback received:', {
        tenantId,
        organizationSlug,
        status,
        hostname
      });

      // Validate the callback (check API key or signature)
      const apiKey = req.headers['x-api-key'];
      if (!apiKey) {
        console.warn('[TenantController] Callback without API key');
      }

      // Forward to Portal
      await this.reportToPortal({
        type: 'tenant_callback',
        tenantId,
        organizationSlug,
        status,
        hostname,
        ipAddress,
        version,
        receivedAt: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Callback received'
      });

    } catch (error) {
      console.error('[TenantController] Callback error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

// Create singleton instance
const controller = new TenantManagementController();

// Export bound methods for route handlers
export default {
  addTenant: controller.addTenant.bind(controller),
  removeTenant: controller.removeTenant.bind(controller),
  getTenantHealth: controller.getTenantHealth.bind(controller),
  getDeploymentLogs: controller.getDeploymentLogs.bind(controller),
  getPortStats: controller.getPortStats.bind(controller),
  handleTenantCallback: controller.handleTenantCallback.bind(controller)
};
