/**
 * Tenant Deployment Service
 * 
 * Orchestrates the complete tenant deployment flow with rollback support.
 * Coordinates between Port, Docker, NGINX, SSL, and Database services.
 * 
 * This implements the Pattern 2 architecture from PORTAL_TO_TENANT_DEPLOYMENT_FLOW.md:
 * Shared VPS with Separate Docker Instances per tenant.
 */

import PortManagementService from './PortManagementService.js';
import CapacityService from './CapacityService.js';
import DockerService from './DockerService.js';
import NginxService from './NginxService.js';
import SSLService from './SSLService.js';
import DatabaseService from './DatabaseService.js';
import crypto from 'crypto';

class TenantDeploymentService {
  constructor(options = {}) {
    // Initialize sub-services
    this.portService = options.portService || new PortManagementService();
    this.capacityService = options.capacityService || new CapacityService();
    this.dockerService = options.dockerService || new DockerService(options);
    this.nginxService = options.nginxService || new NginxService(options);
    this.sslService = options.sslService || new SSLService(options);
    this.databaseService = options.databaseService || new DatabaseService(options);

    // Configuration
    this.baseDomain = options.baseDomain || 'recruitiq.nl';
    this.sshKey = options.sshKey;

    // Deployment logs
    this.deploymentLogs = new Map();
  }

  /**
   * Add log entry for deployment
   * @param {string} deploymentId - Deployment ID
   * @param {string} message - Log message
   * @param {string} level - Log level (info, warn, error)
   */
  addLog(deploymentId, message, level = 'info') {
    if (!this.deploymentLogs.has(deploymentId)) {
      this.deploymentLogs.set(deploymentId, []);
    }
    
    const log = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    
    this.deploymentLogs.get(deploymentId).push(log);
    console.log(`[TenantDeployment:${deploymentId}] [${level.toUpperCase()}] ${message}`);
  }

  /**
   * Get deployment logs
   * @param {string} deploymentId - Deployment ID
   * @returns {Array} Deployment logs
   */
  getLogs(deploymentId) {
    return this.deploymentLogs.get(deploymentId) || [];
  }

  /**
   * Clear deployment logs
   * @param {string} deploymentId - Deployment ID
   */
  clearLogs(deploymentId) {
    this.deploymentLogs.delete(deploymentId);
  }

  /**
   * Deploy a new tenant to the VPS
   * Implements full deployment with automatic rollback on failure.
   * 
   * @param {Object} config - Deployment configuration
   * @param {string} config.vpsId - VPS identifier
   * @param {string} config.vpsIp - VPS IP address
   * @param {string} config.tenantId - Tenant UUID
   * @param {string} config.organizationName - Organization name
   * @param {string} config.organizationSlug - Organization slug (subdomain)
   * @param {string} config.customerId - Customer UUID
   * @param {string} config.licenseId - License UUID
   * @param {string} config.licenseKey - License key
   * @param {string} config.tier - Subscription tier (starter, professional, enterprise)
   * @param {Array} config.products - Products to enable
   * @param {string} config.adminEmail - Admin email
   * @param {string} config.adminName - Admin name (optional)
   * @param {string} config.domain - Custom domain (optional)
   * @param {Object} config.ports - Pre-allocated ports (optional)
   * @returns {Promise<Object>} Deployment result
   */
  async deployTenant(config) {
    const {
      vpsIp,
      tenantId,
      organizationSlug,
      organizationName,
      customerId,
      licenseId,
      licenseKey,
      tier,
      products,
      adminEmail,
      adminName = 'Admin',
      domain
    } = config;

    const deploymentId = config.deploymentId || crypto.randomUUID();
    const sshKey = config.sshKey || this.sshKey;
    const fullDomain = domain || `${organizationSlug}.${this.baseDomain}`;
    
    // Rollback stack - functions to call in reverse order on failure
    const rollbackStack = [];
    
    this.addLog(deploymentId, `Starting deployment for ${organizationSlug}`, 'info');

    try {
      // ========================================
      // Step 1: Check VPS Capacity
      // ========================================
      this.addLog(deploymentId, 'Step 1/7: Checking VPS capacity', 'info');
      
      const capacity = await this.capacityService.checkVPSCapacity({
        vpsIp,
        sshKey
      });

      if (!capacity.hasCapacity) {
        throw new Error(`Insufficient VPS capacity. Available RAM: ${capacity.available.ram}GB, CPU: ${capacity.available.cpu} cores`);
      }

      this.addLog(deploymentId, `VPS has sufficient capacity (${capacity.available.ram}GB RAM, ${capacity.available.cpu} CPU cores available)`, 'info');

      // ========================================
      // Step 2: Allocate Ports
      // ========================================
      this.addLog(deploymentId, 'Step 2/7: Allocating ports', 'info');
      
      const ports = config.ports || this.portService.allocatePortSet(tenantId);
      rollbackStack.push(async () => {
        this.addLog(deploymentId, 'Rollback: Releasing ports', 'warn');
        this.portService.releasePorts(ports);
      });

      this.addLog(deploymentId, `Allocated ports - Backend: ${ports.backend}, Frontend: ${ports.frontend}, Database: ${ports.database}`, 'info');

      // ========================================
      // Step 3: Create Docker Compose Configuration
      // ========================================
      this.addLog(deploymentId, 'Step 3/7: Creating Docker configuration', 'info');
      
      const databasePassword = this.databaseService.generatePassword(32);
      
      const dockerConfig = {
        tenantId,
        organizationSlug,
        ports,
        tier,
        databasePassword,
        licenseKey,
        domain: fullDomain
      };

      await this.dockerService.createComposeFile(dockerConfig, vpsIp, sshKey);
      rollbackStack.push(async () => {
        this.addLog(deploymentId, 'Rollback: Removing Docker compose file', 'warn');
        await this.dockerService.deleteComposeFile(organizationSlug, vpsIp, sshKey);
      });

      this.addLog(deploymentId, 'Docker compose file created', 'info');

      // ========================================
      // Step 4: Start Docker Containers
      // ========================================
      this.addLog(deploymentId, 'Step 4/7: Starting Docker containers', 'info');
      
      await this.dockerService.startContainers(organizationSlug, vpsIp, sshKey);
      rollbackStack.push(async () => {
        this.addLog(deploymentId, 'Rollback: Stopping and removing containers', 'warn');
        await this.dockerService.stopAndRemoveContainers(organizationSlug, vpsIp, sshKey);
      });

      // Wait for containers to be healthy
      const backendContainer = `backend-${organizationSlug}`;
      const postgresContainer = `postgres-${organizationSlug}`;

      this.addLog(deploymentId, 'Waiting for PostgreSQL to be ready...', 'info');
      const pgReady = await this.databaseService.waitForPostgresReady(postgresContainer, vpsIp, sshKey);
      if (!pgReady) {
        throw new Error('PostgreSQL container failed to start');
      }

      this.addLog(deploymentId, 'Waiting for backend to be healthy...', 'info');
      const backendHealthy = await this.dockerService.waitForContainerHealthy(backendContainer, vpsIp, sshKey, 180000);
      if (!backendHealthy) {
        // Get container logs for debugging
        const logs = await this.dockerService.getContainerLogs(backendContainer, vpsIp, sshKey, 50);
        this.addLog(deploymentId, `Backend logs: ${logs}`, 'error');
        throw new Error('Backend container failed health check');
      }

      this.addLog(deploymentId, 'All containers are running and healthy', 'info');

      // ========================================
      // Step 5: Configure NGINX
      // ========================================
      this.addLog(deploymentId, 'Step 5/7: Configuring NGINX', 'info');
      
      const nginxConfig = {
        organizationSlug,
        domain: fullDomain,
        backendPort: ports.backend,
        frontendPort: ports.frontend
      };

      await this.nginxService.createSiteConfig(nginxConfig, vpsIp, sshKey);
      rollbackStack.push(async () => {
        this.addLog(deploymentId, 'Rollback: Removing NGINX configuration', 'warn');
        await this.nginxService.removeSiteConfig(fullDomain, vpsIp, sshKey).catch(() => {});
      });

      // Reload NGINX to apply config
      await this.nginxService.reload(vpsIp, sshKey);

      this.addLog(deploymentId, 'NGINX configured and reloaded', 'info');

      // ========================================
      // Step 6: Obtain SSL Certificate
      // ========================================
      this.addLog(deploymentId, 'Step 6/7: Obtaining SSL certificate', 'info');
      
      try {
        await this.sslService.obtainCertificate(fullDomain, vpsIp, sshKey);
        rollbackStack.push(async () => {
          this.addLog(deploymentId, 'Rollback: Revoking SSL certificate', 'warn');
          await this.sslService.revokeCertificate(fullDomain, vpsIp, sshKey).catch(() => {});
        });
        this.addLog(deploymentId, 'SSL certificate obtained', 'info');
      } catch (sslError) {
        // SSL error is not fatal - tenant can still be accessed via HTTP
        this.addLog(deploymentId, `SSL certificate failed: ${sslError.message}. Tenant will be accessible via HTTP only.`, 'warn');
      }

      // ========================================
      // Step 7: Initialize Database and Onboard Tenant
      // ========================================
      this.addLog(deploymentId, 'Step 7/7: Initializing database and onboarding tenant', 'info');
      
      // Run migrations
      await this.databaseService.runMigrations(organizationSlug, vpsIp, sshKey);
      rollbackStack.push(async () => {
        this.addLog(deploymentId, 'Rollback: Database cleanup', 'warn');
        await this.databaseService.dropDatabase(organizationSlug, vpsIp, sshKey);
      });

      // Onboard tenant with initial data
      const onboardingResult = await this.databaseService.onboardTenant({
        tenantId,
        organizationSlug,
        organizationName,
        customerId,
        licenseId,
        licenseKey,
        tier,
        products,
        adminEmail,
        adminName
      }, vpsIp, sshKey);

      this.addLog(deploymentId, 'Database initialized and tenant onboarded', 'info');

      // ========================================
      // Deployment Complete!
      // ========================================
      this.addLog(deploymentId, `✅ Deployment completed successfully for ${organizationSlug}`, 'info');

      return {
        success: true,
        deploymentId,
        tenantId,
        organizationId: tenantId,
        organizationSlug,
        endpoints: {
          web: `https://${fullDomain}`,
          api: `https://${fullDomain}/api`,
          backend_port: ports.backend,
          frontend_port: ports.frontend
        },
        containers: {
          backend: `backend-${organizationSlug}`,
          frontend: `frontend-${organizationSlug}`,
          database: `postgres-${organizationSlug}`
        },
        credentials: {
          adminEmail,
          tempPassword: onboardingResult.tempPassword,
          databaseUser: `tenant_${organizationSlug}`,
          databaseName: `tenant_${organizationSlug}`
        },
        resources: capacity.required,
        startedAt: this.deploymentLogs.get(deploymentId)?.[0]?.timestamp,
        completedAt: new Date().toISOString()
      };

    } catch (error) {
      // ========================================
      // Rollback on Failure
      // ========================================
      this.addLog(deploymentId, `❌ Deployment failed: ${error.message}`, 'error');
      this.addLog(deploymentId, 'Starting rollback...', 'warn');

      // Execute rollback in reverse order
      for (let i = rollbackStack.length - 1; i >= 0; i--) {
        try {
          await rollbackStack[i]();
        } catch (rollbackError) {
          this.addLog(deploymentId, `Rollback step failed: ${rollbackError.message}`, 'error');
        }
      }

      this.addLog(deploymentId, 'Rollback completed', 'warn');

      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  /**
   * Remove a tenant from the VPS
   * @param {Object} config - Removal configuration
   * @returns {Promise<Object>} Removal result
   */
  async removeTenant(config) {
    const { vpsIp, organizationSlug, domain, sshKey } = config;
    const key = sshKey || this.sshKey;
    const fullDomain = domain || `${organizationSlug}.${this.baseDomain}`;

    console.log(`[TenantDeployment] Removing tenant: ${organizationSlug}`);

    const results = {
      containers: false,
      nginx: false,
      ssl: false,
      ports: false
    };

    try {
      // Stop and remove containers
      await this.dockerService.stopAndRemoveContainers(organizationSlug, vpsIp, key);
      results.containers = true;
    } catch (e) {
      console.error(`Failed to remove containers: ${e.message}`);
    }

    try {
      // Remove Docker compose file
      await this.dockerService.deleteComposeFile(organizationSlug, vpsIp, key);
    } catch (e) {
      console.error(`Failed to remove compose file: ${e.message}`);
    }

    try {
      // Remove NGINX config
      await this.nginxService.removeSiteConfig(fullDomain, vpsIp, key);
      results.nginx = true;
    } catch (e) {
      console.error(`Failed to remove NGINX config: ${e.message}`);
    }

    try {
      // Revoke SSL certificate
      await this.sslService.revokeCertificate(fullDomain, vpsIp, key);
      results.ssl = true;
    } catch (e) {
      console.error(`Failed to revoke SSL: ${e.message}`);
    }

    // Release ports
    const released = this.portService.releasePortsForTenant(config.tenantId);
    results.ports = released;

    console.log(`[TenantDeployment] Tenant removed: ${organizationSlug}`, results);

    return {
      success: true,
      organizationSlug,
      results
    };
  }

  /**
   * Check health of a deployed tenant
   * @param {Object} config - Health check configuration
   * @returns {Promise<Object>} Health status
   */
  async checkTenantHealth(config) {
    const { vpsIp, organizationSlug, sshKey } = config;
    const key = sshKey || this.sshKey;

    const backendContainer = `backend-${organizationSlug}`;
    const frontendContainer = `frontend-${organizationSlug}`;
    const postgresContainer = `postgres-${organizationSlug}`;

    const [backendHealth, frontendHealth, postgresHealth] = await Promise.all([
      this.dockerService.checkContainerHealth(backendContainer, vpsIp, key),
      this.dockerService.checkContainerHealth(frontendContainer, vpsIp, key),
      this.dockerService.checkContainerHealth(postgresContainer, vpsIp, key)
    ]);

    const allHealthy = backendHealth.isHealthy && 
                       frontendHealth.isHealthy && 
                       postgresHealth.isHealthy;

    return {
      isHealthy: allHealthy,
      containers: {
        backend: backendHealth,
        frontend: frontendHealth,
        database: postgresHealth
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get status of port allocations
   * @returns {Object} Port statistics
   */
  getPortStatistics() {
    return this.portService.getStatistics();
  }
}

export default TenantDeploymentService;
