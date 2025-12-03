/**
 * Tenant Management Routes
 * 
 * API routes for tenant deployment and management.
 * These routes implement the Portal → Deployment Service communication.
 */

const express = require('express');
const tenantManagementController = require('../controllers/tenantManagementController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * Add tenant to VPS
 * POST /api/tenants/add
 * 
 * Called by Portal after approval to deploy a new tenant.
 */
router.post('/add', authenticate, tenantManagementController.addTenant);

/**
 * Remove tenant from VPS
 * DELETE /api/tenants/:tenantId
 */
router.delete('/:tenantId', authenticate, tenantManagementController.removeTenant);

/**
 * Get tenant health status
 * GET /api/tenants/:tenantId/health
 */
router.get('/:tenantId/health', authenticate, tenantManagementController.getTenantHealth);

/**
 * Get deployment logs
 * GET /api/tenants/deployments/:deploymentId/logs
 */
router.get('/deployments/:deploymentId/logs', authenticate, tenantManagementController.getDeploymentLogs);

/**
 * Get port allocation statistics
 * GET /api/tenants/ports/stats
 */
router.get('/ports/stats', authenticate, tenantManagementController.getPortStats);

/**
 * Tenant callback endpoint (from deployed tenant)
 * POST /api/tenants/callback
 * 
 * This endpoint receives callbacks from deployed tenants
 * confirming their operational status.
 */
router.post('/callback', tenantManagementController.handleTenantCallback);

module.exports = router;
