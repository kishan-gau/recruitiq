/**
 * Provisioning API Routes
 * Handles client provisioning, VPS management, and deployment tracking
 * 
 * Integration with Deployment Service:
 * For shared VPS deployments, this service communicates with the deployment-service
 * which handles container orchestration, NGINX config, SSL, and database setup.
 */

import express from 'express';
import { authenticatePlatform, requirePlatformRole, requirePlatformPermission } from '../middleware/auth.js';
import vpsManager from '../services/vpsManager.js';
import transipService from '../services/transip/TransIPService.js';
import deploymentOrchestrator from '../services/deploymentOrchestrator.js';
import sharedVPSOrchestrator from '../services/sharedVPSOrchestrator.js';
import deploymentServiceClient from '../services/DeploymentServiceClient.js';
import { query as dbQuery } from '../config/database.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import config from '../config/index.js';
import crypto from 'crypto';

const router = express.Router();

// Feature flag: Use deployment service for shared VPS deployments
const USE_DEPLOYMENT_SERVICE = process.env.USE_DEPLOYMENT_SERVICE === 'true';

// License Manager Database Connection
const licenseManagerPool = new pg.Pool({
  host: process.env.PLATFORM_DATABASE_HOST || process.env.DATABASE_HOST || 'localhost',
  port: process.env.PLATFORM_DATABASE_PORT || process.env.DATABASE_PORT || 5432,
  database: process.env.PLATFORM_DATABASE_NAME || process.env.DATABASE_NAME,
  user: process.env.PLATFORM_DATABASE_USER || process.env.DATABASE_USER || 'postgres',
  password: process.env.PLATFORM_DATABASE_PASSWORD || process.env.DATABASE_PASSWORD || config.database.password,
  max: 5, // Smaller pool since we query infrequently
});

/**
 * Get tier limits from License Manager database
 * Queries the active tier_presets configuration
 * @param {string} tier - Tier name (starter, professional, enterprise)
 * @returns {Promise<Object>} Tier limits and features
 */
async function getTierLimits(tier) {
  try {
    const result = await licenseManagerPool.query(
      `SELECT 
        max_users,
        max_workspaces,
        max_jobs,
        max_candidates,
        features,
        monthly_price_per_user,
        annual_price_per_user,
        base_price
      FROM tier_presets
      WHERE tier_name = $1 
        AND is_active = true
        AND (effective_until IS NULL OR effective_until > NOW())
      ORDER BY version DESC
      LIMIT 1`,
      [tier]
    );

    if (result.rows.length === 0) {
      logger.warn(`⚠️  No active tier preset found for tier: ${tier}, using default limits`);
      // Fallback to basic limits if database query fails
      return {
        maxUsers: tier === 'starter' ? 10 : tier === 'professional' ? 50 : null,
        maxWorkspaces: tier === 'starter' ? 1 : tier === 'professional' ? 5 : null,
        maxJobs: tier === 'starter' ? 50 : tier === 'professional' ? 200 : null,
        maxCandidates: tier === 'starter' ? 500 : tier === 'professional' ? 2000 : null,
        features: [],
        pricing: {}
      };
    }

    const preset = result.rows[0];
    return {
      maxUsers: preset.max_users,
      maxWorkspaces: preset.max_workspaces,
      maxJobs: preset.max_jobs,
      maxCandidates: preset.max_candidates,
      features: preset.features || [],
      pricing: {
        monthlyPricePerUser: preset.monthly_price_per_user,
        annualPricePerUser: preset.annual_price_per_user,
        basePrice: preset.base_price
      }
    };
  } catch (_error) {
    logger.error('Error fetching tier limits from License Manager:', error);
    // Return fallback limits on error
    return {
      maxUsers: tier === 'starter' ? 10 : tier === 'professional' ? 50 : null,
      maxWorkspaces: tier === 'starter' ? 1 : tier === 'professional' ? 5 : null,
      maxJobs: tier === 'starter' ? 50 : tier === 'professional' ? 200 : null,
      maxCandidates: tier === 'starter' ? 500 : tier === 'professional' ? 2000 : null,
      features: [],
      pricing: {}
    };
  }
}

/**
 * Configure shared tenant asynchronously
 * Handles NGINX subdomain configuration and SSL certificate setup
 * @param {string} deploymentId - Deployment ID
 * @param {string} organizationId - Organization UUID
 * @param {string} slug - Organization slug
 * @param {Object} vps - VPS object with connection details
 */
async function configureSharedTenantAsync(deploymentId, organizationId, slug, vps) {
  try {
    logger.info(`Starting shared tenant configuration for ${slug} on VPS ${vps.vps_name}`);

    // Get VPS connection details
    const sshKey = process.env.VPS_SSH_KEY_PATH || '/root/.ssh/id_rsa';
    const baseDomain = process.env.BASE_DOMAIN || 'recruitiq.nl';

    // Run onboarding orchestration
    await sharedVPSOrchestrator.onboardTenantToSharedVPS({
      deploymentId,
      organizationId,
      slug,
      vpsIp: vps.ip_address,
      vpsName: vps.vps_name,
      sshKey,
      baseDomain
    });

    logger.info(`✅ Shared tenant ${slug} configured successfully`);
  } catch (_error) {
    logger.error(`❌ Shared tenant configuration failed for ${slug}:`, error);
    // Error is already logged in orchestrator
  }
}

/**
 * Deploy tenant via Deployment Service
 * Uses the deployment-service for container orchestration, NGINX, SSL, and database setup
 * 
 * @param {string} deploymentId - Deployment ID
 * @param {string} organizationId - Organization UUID
 * @param {string} organizationName - Organization display name
 * @param {string} slug - Organization slug (used for container naming)
 * @param {string} tier - Tier (starter, professional, enterprise)
 * @param {Object} vps - VPS object with connection details
 * @param {string} adminEmail - Admin email
 * @param {string} adminName - Admin name
 * @param {string} tempPassword - Temporary password for admin
 */
async function deployTenantViaDeploymentService(deploymentId, organizationId, organizationName, slug, tier, vps, adminEmail, adminName, tempPassword) {
  try {
    logger.info(`🚀 Starting tenant deployment via Deployment Service for ${slug}`);

    // Update status to show we're deploying
    await dbQuery(
      `UPDATE instance_deployments 
       SET status = 'provisioning', 
           status_message = 'Initiating deployment via Deployment Service...'
       WHERE id = $1`,
      [deploymentId]
    );

    // Call deployment service
    const result = await deploymentServiceClient.deployTenant({
      vpsId: vps.id,
      vpsIp: vps.ip_address || vps.vps_ip,
      tenantId: organizationId,
      organizationName: organizationName,
      organizationSlug: slug,
      tier,
      adminEmail,
      adminName
    });

    logger.info(`✅ Deployment Service accepted tenant ${slug}`, {
      deploymentId: result.deploymentId,
      status: result.status
    });

    // The deployment service will send a callback to /api/portal/deployments/callback
    // when deployment completes or fails

  } catch (_error) {
    logger.error(`❌ Deployment Service deployment failed for ${slug}:`, error);
    
    // Update deployment status to failed
    await dbQuery(
      `UPDATE instance_deployments 
       SET status = 'failed', 
           error_message = $1,
           status_message = 'Deployment Service failed'
       WHERE id = $2`,
      [error.message, deploymentId]
    );

    // If deployment service is unavailable, fall back to legacy orchestrator
    if (error.isConnectionError) {
      logger.warn(`⚠️ Deployment Service unavailable, falling back to legacy orchestrator for ${slug}`);
      await configureSharedTenantAsync(deploymentId, organizationId, slug, vps);
    }
  }
}

/**
 * Provision new client instance
 * POST /api/portal/instances
 */
router.post('/instances', 
  authenticatePlatform, 
  requirePlatformRole(['platform_admin']),
  async (req, res) => {
    const client = await pool.connect();
    
    try {
      const { 
        organizationName, 
        slug, 
        tier,
        deploymentModel,
        vpsId,  // Optional: manual VPS selection for shared hosting
        adminEmail,
        adminName
      } = req.body;

      // Validate inputs
      if (!organizationName || !slug || !tier || !deploymentModel || !adminEmail || !adminName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Validate tier
      if (!['starter', 'professional', 'enterprise'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid tier' });
      }

      // Validate deployment model
      if (!['shared', 'dedicated'].includes(deploymentModel)) {
        return res.status(400).json({ error: 'Invalid deployment model' });
      }

      await client.query('BEGIN');

      // Get tier limits
      const limits = getTierLimits(tier);

      // 1. Create organization
      const orgResult = await client.query(
        `INSERT INTO organizations (
          name, slug, tier, deployment_model,
          max_users, max_workspaces, max_jobs, max_candidates
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          organizationName, 
          slug, 
          tier, 
          deploymentModel,
          limits.maxUsers, 
          limits.maxWorkspaces, 
          limits.maxJobs, 
          limits.maxCandidates
        ]
      );
      const organizationId = orgResult.rows[0].id;

      let selectedVPS;

      // 2. Handle based on deployment model
      if (deploymentModel === 'shared') {
        // Select VPS (manual or automatic)
        if (vpsId && vpsId !== 'auto') {
          selectedVPS = await vpsManager.getVPSById(vpsId);
        } else {
          selectedVPS = await vpsManager.getOptimalSharedVPS();
        }

        // Assign organization to VPS
        await vpsManager.assignOrganizationToVPS(organizationId, selectedVPS.id);

        // Create admin user with secure password (16 bytes = strong entropy)
        // Generate a password that meets complexity requirements naturally
        const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        const passwordBytes = crypto.randomBytes(16);
        let tempPassword = '';
        for (let i = 0; i < 16; i++) {
          tempPassword += randomChars[passwordBytes[i] % randomChars.length];
        }
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        
        // Split admin name into first and last name
        const nameParts = adminName.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Admin';
        const lastName = nameParts.slice(1).join(' ') || 'User';
        
        await client.query(
          `INSERT INTO users (organization_id, email, password_hash, name, first_name, last_name, legacy_role, email_verified)
           VALUES ($1, $2, $3, $4, $5, $6, 'owner', true)`,
          [organizationId, adminEmail, passwordHash, adminName, firstName, lastName]
        );

        // Create deployment record - status depends on whether we're using deployment service
        const initialStatus = USE_DEPLOYMENT_SERVICE ? 'provisioning' : 'active';
        const deploymentResult = await client.query(
          `INSERT INTO instance_deployments (
            organization_id, deployment_model, status, subdomain, tier, vps_id
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id`,
          [organizationId, deploymentModel, initialStatus, slug, tier, selectedVPS.id]
        );

        await client.query('COMMIT');

        const deploymentId = deploymentResult.rows[0].id;

        // Return immediately to avoid timeout, then configure VPS asynchronously
        res.json({
          success: true,
          deploymentId,
          organizationId,
          message: USE_DEPLOYMENT_SERVICE 
            ? 'Tenant deployment initiated via Deployment Service' 
            : 'Tenant onboarding initiated',
          url: `https://${slug}.recruitiq.nl`,
          deploymentModel: 'shared',
          tier,
          credentials: {
            email: adminEmail,
            password: tempPassword
          },
          vps: {
            name: selectedVPS.vps_name,
            location: selectedVPS.location,
            tenantCount: selectedVPS.current_tenants + 1,
            maxTenants: selectedVPS.max_tenants
          }
        });

        // Configure subdomain on VPS asynchronously
        if (USE_DEPLOYMENT_SERVICE) {
          // Use deployment-service for container orchestration
          deployTenantViaDeploymentService(deploymentId, organizationId, organizationName, slug, tier, selectedVPS, adminEmail, adminName, tempPassword)
            .catch(error => {
              logger.error('Deployment service tenant configuration failed:', error);
            });
        } else {
          // Use legacy local orchestrator (NGINX config, SSL cert only)
          configureSharedTenantAsync(deploymentId, organizationId, slug, selectedVPS).catch(error => {
            logger.error('Shared tenant configuration failed:', error);
          });
        }

      } else if (deploymentModel === 'dedicated') {
        // Create deployment record first
        const deploymentResult = await client.query(
          `INSERT INTO instance_deployments (
            organization_id, deployment_model, status, subdomain, tier
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id`,
          [organizationId, deploymentModel, 'provisioning', slug, tier]
        );
        const deploymentId = deploymentResult.rows[0].id;

        await client.query('COMMIT');

        // Create dedicated VPS (async - takes 3-5 minutes)
        createDedicatedVPSAsync(deploymentId, organizationId, slug, tier, adminEmail, adminName)
          .catch(error => {
            logger.error('VPS creation failed:', error);
            dbQuery(
              `UPDATE instance_deployments 
               SET status = 'failed', error_message = $1 WHERE id = $2`,
              [error.message, deploymentId]
            );
          });

        res.json({
          success: true,
          deploymentId,
          organizationId,
          message: 'Dedicated VPS provisioning started',
          estimatedTime: '3-5 minutes',
          deploymentModel: 'dedicated',
          tier
        });
      }

    } catch (_error) {
      await client.query('ROLLBACK');
      logger.error('Provisioning error:', error);
      res.status(500).json({ 
        error: 'Provisioning failed', 
        message: error.message 
      });
    } finally {
      client.release();
    }
  }
);

/**
 * Async function to create dedicated VPS and deploy applications
 */
async function createDedicatedVPSAsync(deploymentId, organizationId, slug, tier, adminEmail, adminName) {
  try {
    // Update status
    await dbQuery(
      `UPDATE instance_deployments SET status = 'creating_vps', status_message = 'Provisioning VPS via TransIP API...' WHERE id = $1`,
      [deploymentId]
    );

    // Create VPS via TransIP API
    logger.info(`🚀 Creating dedicated VPS for ${slug}...`);
    const vpsDetails = await transipService.createDedicatedVPS({
      organizationId,
      slug,
      tier
    });

    // Register VPS in database
    const vpsSpecs = transipService.getVPSSpecs(tier);
    const registeredVPS = await vpsManager.registerVPS({
      vpsName: vpsDetails.vpsName,
      vpsIp: vpsDetails.ipAddress,
      hostname: vpsDetails.hostname,
      deploymentType: 'dedicated',
      organizationId: organizationId,
      location: 'Amsterdam',  // TODO: Make configurable
      cpuCores: tier === 'enterprise' ? 4 : (tier === 'professional' ? 2 : 1),
      memoryMb: tier === 'enterprise' ? 8192 : (tier === 'professional' ? 4096 : 2048),
      diskGb: tier === 'enterprise' ? 200 : (tier === 'professional' ? 100 : 50),
      maxTenants: 1
    });

    // Update deployment with VPS details
    await dbQuery(
      `UPDATE instance_deployments 
       SET vps_id = $1, status = 'configuring'
       WHERE id = $2`,
      [registeredVPS.id, deploymentId]
    );

    // Assign VPS to organization
    await dbQuery(
      `UPDATE organizations SET vps_id = $1 WHERE id = $2`,
      [registeredVPS.id, organizationId]
    );

    // Wait for VPS to be ready
    logger.info(`⏳ Waiting for VPS ${vpsDetails.vpsName} to be ready...`);
    await transipService.waitForVPSReady(vpsDetails.vpsName, 300000); // 5 minute timeout

    // Deploy applications to VPS
    await dbQuery(
      `UPDATE instance_deployments SET status = 'deploying', status_message = 'Deploying applications to VPS...' WHERE id = $1`,
      [deploymentId]
    );

    logger.info(`📦 Starting deployment orchestration for ${slug}...`);
    await deploymentOrchestrator.deployToVPS({
      deploymentId,
      organizationId,
      slug,
      tier,
      vpsIp: vpsDetails.ipAddress,
      vpsName: vpsDetails.vpsName,
      sshKey: process.env.VPS_SSH_PRIVATE_KEY
    });

    // Create admin user
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    // Split admin name into first and last name
    const nameParts = adminName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Admin';
    const lastName = nameParts.slice(1).join(' ') || 'User';
    
    await dbQuery(
      `INSERT INTO users (organization_id, email, password_hash, name, first_name, last_name, legacy_role, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, 'owner', true)`,
      [organizationId, adminEmail, passwordHash, adminName, firstName, lastName]
    );

    // Mark as active (deployment orchestrator already set this if successful)
    await dbQuery(
      `UPDATE instance_deployments 
       SET status = 'active', completed_at = NOW(), 
           access_url = $1, status_message = 'Deployment completed successfully'
       WHERE id = $2`,
      [`https://${slug}.recruitiq.nl`, deploymentId]
    );

    // Send welcome email with credentials
    // TODO: Implement email service
    logger.info(`📧 TODO: Send welcome email to ${adminEmail} with credentials`);
    logger.info(`   URL: https://${slug}.recruitiq.nl`);
    logger.info(`   Email: ${adminEmail}`);
    logger.info(`   Password: ${tempPassword}`);

    logger.info(`✅ Dedicated VPS fully provisioned and deployed for ${slug}`);

    // Clear deployment logs after success
    setTimeout(() => {
      deploymentOrchestrator.clearDeploymentLogs(deploymentId);
    }, 3600000); // Keep logs for 1 hour

  } catch (_error) {
    logger.error('VPS provisioning failed:', error);
    throw error;
  }
}

/**
 * Get deployment status
 * GET /api/portal/instances/:deploymentId/status
 */
router.get('/instances/:deploymentId/status',
  authenticatePlatform,
  requirePlatformRole(['platform_admin']),
  async (req, res) => {
    try {
      const { deploymentId } = req.params;

      const result = await dbQuery(
        `SELECT 
          id.*, 
          o.name as organization_name,
          o.slug,
          v.vps_name,
          v.vps_ip,
          v.status as vps_status
         FROM instance_deployments id
         JOIN organizations o ON id.organization_id = o.id
         LEFT JOIN vps_instances v ON id.vps_id = v.id
         WHERE id.id = $1`,
        [deploymentId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Deployment not found' });
      }

      const deployment = result.rows[0];

      // Add deployment logs if available
      const logs = deploymentOrchestrator.getDeploymentLogs(deploymentId);

      res.json({
        ...deployment,
        logs: logs.length > 0 ? logs : null
      });

    } catch (_error) {
      logger.error('Status check error:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  }
);

/**
 * Get deployment logs in real-time
 * GET /api/portal/instances/:deploymentId/logs
 */
router.get('/instances/:deploymentId/logs',
  authenticatePlatform,
  requirePlatformRole(['platform_admin']),
  async (req, res) => {
    try {
      const { deploymentId } = req.params;

      const logs = deploymentOrchestrator.getDeploymentLogs(deploymentId);

      res.json({
        success: true,
        logs
      });

    } catch (_error) {
      logger.error('Error fetching logs:', error);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  }
);

/**
 * Get all clients
 * GET /api/portal/clients
 */
router.get('/clients',
  authenticatePlatform,
  requirePlatformRole(['platform_admin']),
  async (req, res) => {
    try {
      const result = await dbQuery(
        `SELECT 
          o.*,
          v.vps_name,
          v.vps_ip,
          v.location as vps_location,
          (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count,
          (SELECT COUNT(*) FROM workspaces WHERE organization_id = o.id) as workspace_count
         FROM organizations o
         LEFT JOIN vps_instances v ON o.vps_id = v.id
         WHERE o.deleted_at IS NULL
         ORDER BY o.created_at DESC`
      );

      res.json(result.rows);

    } catch (_error) {
      logger.error('Error fetching clients:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  }
);

/**
 * Get available VPS instances for selection
 * GET /api/portal/vps/available
 */
router.get('/vps/available',
  authenticatePlatform,
  requirePlatformPermission('vps.view'),
  async (req, res) => {
    try {
      const availableVPS = await vpsManager.getAvailableSharedVPS();
      res.json(availableVPS);
    } catch (_error) {
      logger.error('Error getting available VPS:', error);
      res.status(500).json({ error: 'Failed to get VPS list' });
    }
  }
);

/**
 * Get all VPS instances
 * GET /api/portal/vps
 */
router.get('/vps',
  authenticatePlatform,
  requirePlatformPermission('vps.view'),
  async (req, res) => {
    try {
      const allVPS = await vpsManager.getAllVPS();
      res.json(allVPS);
    } catch (_error) {
      logger.error('Error getting VPS:', error);
      res.status(500).json({ error: 'Failed to get VPS list' });
    }
  }
);

/**
 * Get VPS statistics
 * GET /api/portal/vps/stats
 */
router.get('/vps/stats',
  authenticatePlatform,
  requirePlatformPermission('vps.view'),
  async (req, res) => {
    try {
      const stats = await vpsManager.getVPSStatistics();
      res.json(stats);
    } catch (_error) {
      logger.error('Error getting VPS stats:', error);
      res.status(500).json({ error: 'Failed to get VPS statistics' });
    }
  }
);

/**
 * Register new VPS manually
 * POST /api/portal/vps
 */
router.post('/vps',
  authenticatePlatform,
  requirePlatformPermission('vps.create'),
  async (req, res) => {
    try {
      const vps = await vpsManager.registerVPS(req.body);
      res.json({ success: true, vps });
    } catch (_error) {
      logger.error('Error registering VPS:', error);
      res.status(500).json({ error: 'Failed to register VPS' });
    }
  }
);

/**
 * Get deployment logs (supports both dedicated and shared deployments)
 * GET /api/portal/deployments/:id/logs
 */
router.get('/deployments/:id/logs',
  authenticatePlatform,
  requirePlatformPermission('deployment.view'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // First check which deployment model this is
      const deploymentResult = await dbQuery(
        'SELECT deployment_model FROM instance_deployments WHERE id = $1',
        [id]
      );
      
      if (deploymentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Deployment not found' });
      }
      
      const deploymentModel = deploymentResult.rows[0].deployment_model;
      
      // Get logs from appropriate orchestrator
      const logs = deploymentModel === 'dedicated' 
        ? deploymentOrchestrator.getLogs(id)
        : sharedVPSOrchestrator.getLogs(id);
      
      res.json({ logs });
    } catch (_error) {
      logger.error('Error fetching deployment logs:', error);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  }
);

/**
 * Get deployment service health status
 * GET /api/portal/deployment-service/health
 */
router.get('/deployment-service/health',
  authenticatePlatform,
  requirePlatformPermission('vps.view'),
  async (req, res) => {
    try {
      const health = await deploymentServiceClient.healthCheck();
      
      res.json({
        success: true,
        enabled: USE_DEPLOYMENT_SERVICE,
        ...health
      });
    } catch (_error) {
      logger.error('Error checking deployment service health:', error);
      res.status(500).json({ 
        success: false,
        enabled: USE_DEPLOYMENT_SERVICE,
        status: 'error',
        error: error.message 
      });
    }
  }
);

/**
 * Get port allocation statistics from deployment service
 * GET /api/portal/deployment-service/ports
 */
router.get('/deployment-service/ports',
  authenticatePlatform,
  requirePlatformPermission('vps.view'),
  async (req, res) => {
    try {
      if (!USE_DEPLOYMENT_SERVICE) {
        return res.json({
          success: true,
          enabled: false,
          message: 'Deployment service not enabled'
        });
      }

      const stats = await deploymentServiceClient.getPortStats();
      res.json({
        success: true,
        enabled: true,
        ...stats
      });
    } catch (_error) {
      logger.error('Error getting port stats:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

export default router;
