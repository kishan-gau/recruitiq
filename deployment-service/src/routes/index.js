const express = require('express');
const deploymentController = require('../controllers/deploymentController');
const approvalRoutes = require('./approvalRoutes');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Approval workflow routes (with their own authentication)
router.use('/api', approvalRoutes);

// All other routes require authentication
router.use(authenticate);

// Deployment routes
router.post('/deployments', deploymentController.createDeployment.bind(deploymentController));
router.get('/deployments/stats', deploymentController.getQueueStatistics.bind(deploymentController));
router.get('/deployments/:jobId', deploymentController.getDeploymentStatus.bind(deploymentController));
router.delete('/deployments/:jobId', deploymentController.cancelDeployment.bind(deploymentController));

// Instance management routes
router.get('/instances/:vpsName', deploymentController.getInstanceDetails.bind(deploymentController));
router.post('/instances/:vpsName/start', deploymentController.startInstance.bind(deploymentController));
router.post('/instances/:vpsName/stop', deploymentController.stopInstance.bind(deploymentController));
router.post('/instances/:vpsName/reboot', deploymentController.rebootInstance.bind(deploymentController));
router.delete('/instances/:vpsName', deploymentController.deleteInstance.bind(deploymentController));
router.post('/instances/:vpsName/snapshots', deploymentController.createSnapshot.bind(deploymentController));

// Callback route (no auth required - authenticated via API key in controller)
router.post('/deployments/callback', deploymentController.deploymentCallback.bind(deploymentController));

module.exports = router;
