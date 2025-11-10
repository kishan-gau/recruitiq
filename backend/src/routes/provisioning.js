/**
 * Provisioning API Routes
 * Handles client provisioning, VPS management, and deployment tracking
 */

import express from 'express';
import { authenticate, requireRole, requirePlatformUser, requirePermission } from '../middleware/auth.js';
import vpsManager from '../services/vpsManager.js';
import transipService from '../services/transip.js';
import pool from '../config/database.js';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const router = express.Router();

// License Manager Database Connection
const licenseManagerPool = new pg.Pool({
  host: process.env.LICENSE_MANAGER_DB_HOST || 'localhost',
  port: process.env.LICENSE_MANAGER_DB_PORT || 5432,
  database: process.env.LICENSE_MANAGER_DB_NAME || 'license_manager_db',
  user: process.env.LICENSE_MANAGER_DB_USER || process.env.DATABASE_USER,
  password: process.env.LICENSE_MANAGER_DB_PASSWORD || process.env.DATABASE_PASSWORD,
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
  } catch (error) {
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
 * Provision new client instance
 * POST /api/portal/instances
 */
router.post('/instances', 
  authenticate, 
  requireRole(['platform_admin']),
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

        // Create admin user
        const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
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

        // Create deployment record
        const deploymentResult = await client.query(
          `INSERT INTO instance_deployments (
            organization_id, deployment_model, status, subdomain, tier, vps_id
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id`,
          [organizationId, deploymentModel, 'active', slug, tier, selectedVPS.id]
        );

        await client.query('COMMIT');

        // TODO: Configure subdomain on VPS (NGINX config, SSL cert)

        res.json({
          success: true,
          deploymentId: deploymentResult.rows[0].id,
          organizationId,
          message: 'Shared hosting instance provisioned successfully',
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
            pool.query(
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

    } catch (error) {
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
 * Async function to create dedicated VPS
 */
async function createDedicatedVPSAsync(deploymentId, organizationId, slug, tier, adminEmail, adminName) {
  try {
    // Update status
    await pool.query(
      `UPDATE instance_deployments SET status = 'creating_vps' WHERE id = $1`,
      [deploymentId]
    );

    // Create VPS via TransIP API
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
    await pool.query(
      `UPDATE instance_deployments 
       SET vps_id = $1, status = 'configuring'
       WHERE id = $2`,
      [registeredVPS.id, deploymentId]
    );

    // Assign VPS to organization
    await pool.query(
      `UPDATE organizations SET vps_id = $1 WHERE id = $2`,
      [registeredVPS.id, organizationId]
    );

    // Wait for VPS to be ready (this would poll TransIP API in real implementation)
    // await waitForVPSReady(vpsDetails.vpsName);

    // Create admin user
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    // Split admin name into first and last name
    const nameParts = adminName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Admin';
    const lastName = nameParts.slice(1).join(' ') || 'User';
    
    await pool.query(
      `INSERT INTO users (organization_id, email, password_hash, name, first_name, last_name, legacy_role, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, 'owner', true)`,
      [organizationId, adminEmail, passwordHash, adminName, firstName, lastName]
    );

    // Mark as active
    await pool.query(
      `UPDATE instance_deployments 
       SET status = 'active', completed_at = NOW()
       WHERE id = $1`,
      [deploymentId]
    );

    // TODO: Send welcome email with credentials

    logger.info(`✅ Dedicated VPS provisioned for ${slug}`);

  } catch (error) {
    logger.error('VPS provisioning failed:', error);
    throw error;
  }
}

/**
 * Get deployment status
 * GET /api/portal/instances/:deploymentId/status
 */
router.get('/instances/:deploymentId/status',
  authenticate,
  requireRole(['platform_admin']),
  async (req, res) => {
    try {
      const { deploymentId } = req.params;

      const result = await pool.query(
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

      res.json(result.rows[0]);

    } catch (error) {
      logger.error('Status check error:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  }
);

/**
 * Get all clients
 * GET /api/portal/clients
 */
router.get('/clients',
  authenticate,
  requireRole(['platform_admin']),
  async (req, res) => {
    try {
      const result = await pool.query(
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

    } catch (error) {
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
  authenticate,
  requirePlatformUser,
  requirePermission('vps.view'),
  async (req, res) => {
    try {
      const availableVPS = await vpsManager.getAvailableSharedVPS();
      res.json(availableVPS);
    } catch (error) {
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
  authenticate,
  requirePlatformUser,
  requirePermission('vps.view'),
  async (req, res) => {
    try {
      const allVPS = await vpsManager.getAllVPS();
      res.json(allVPS);
    } catch (error) {
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
  authenticate,
  requirePlatformUser,
  requirePermission('vps.view'),
  async (req, res) => {
    try {
      const stats = await vpsManager.getVPSStatistics();
      res.json(stats);
    } catch (error) {
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
  authenticate,
  requirePlatformUser,
  requirePermission('vps.create'),
  async (req, res) => {
    try {
      const vps = await vpsManager.registerVPS(req.body);
      res.json({ success: true, vps });
    } catch (error) {
      logger.error('Error registering VPS:', error);
      res.status(500).json({ error: 'Failed to register VPS' });
    }
  }
);

export default router;
