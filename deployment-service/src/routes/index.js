const express = require('express');
const deploymentController = require('../controllers/deploymentController');
const tenantManagementController = require('../controllers/tenantManagementController');
const approvalRoutes = require('./approvalRoutes');
const tenantRoutes = require('./tenantRoutes');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Approval workflow routes (with their own authentication)
router.use('/api', approvalRoutes);

// Tenant management routes
router.use('/tenants', tenantRoutes);

// Callback routes (no auth required - authenticated via API key in controller)
router.post('/deployments/callback', deploymentController.deploymentCallback.bind(deploymentController));
router.post('/deployments/add-tenant', authenticate, tenantManagementController.addTenant);

// All other routes require authentication
router.use(authenticate);

// Deployment routes
router.post('/deployments', deploymentController.createDeployment.bind(deploymentController));
router.get('/deployments/stats', deploymentController.getQueueStatistics.bind(deploymentController));
router.get('/deployments/:jobId', deploymentController.getDeploymentStatus.bind(deploymentController));
router.delete('/deployments/:jobId', deploymentController.cancelDeployment.bind(deploymentController));
router.get('/deployments/:deploymentId/logs', tenantManagementController.getDeploymentLogs);

// Instance management routes
router.get('/instances/:vpsName', deploymentController.getInstanceDetails.bind(deploymentController));
router.post('/instances/:vpsName/start', deploymentController.startInstance.bind(deploymentController));
router.post('/instances/:vpsName/stop', deploymentController.stopInstance.bind(deploymentController));
router.post('/instances/:vpsName/reboot', deploymentController.rebootInstance.bind(deploymentController));
router.delete('/instances/:vpsName', deploymentController.deleteInstance.bind(deploymentController));
router.post('/instances/:vpsName/snapshots', deploymentController.createSnapshot.bind(deploymentController));

module.exports = router;
