import {
  createDeploymentJob,
  getDeploymentJobStatus,
  cancelDeploymentJob,
  getQueueStats,
} from '../queue/deploymentQueue.js';
import deploymentService from '../services/transip/deploymentService.js';

class DeploymentController {
  /**
   * Create a new deployment
   * POST /api/deployments
   */
  async createDeployment(req, res) {
    try {
      const {
        instanceId,
        customerId,
        customerName,
        licenseKey,
        tier,
        hostname,
        domain,
        email,
        productName,
        region,
      } = req.body;

      // Validate required fields
      if (!instanceId || !customerId || !licenseKey) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: instanceId, customerId, licenseKey',
        });
      }

      // Create deployment job
      const job = await createDeploymentJob({
        instanceId,
        customerId,
        customerName,
        licenseKey,
        tier,
        hostname,
        domain,
        email,
        productName,
        region,
      });

      res.status(202).json({
        success: true,
        message: 'Deployment job created',
        job,
      });
    } catch (error) {
      console.error('[Controller] Create deployment failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get deployment status
   * GET /api/deployments/:jobId
   */
  async getDeploymentStatus(req, res) {
    try {
      const { jobId } = req.params;

      const status = await getDeploymentJobStatus(jobId);

      if (!status.found) {
        return res.status(404).json({
          success: false,
          error: 'Deployment job not found',
        });
      }

      res.json({
        success: true,
        deployment: status,
      });
    } catch (error) {
      console.error('[Controller] Get deployment status failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Cancel a deployment
   * DELETE /api/deployments/:jobId
   */
  async cancelDeployment(req, res) {
    try {
      const { jobId } = req.params;

      const result = await cancelDeploymentJob(jobId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message,
        });
      }

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('[Controller] Cancel deployment failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Stop a VPS instance
   * POST /api/instances/:vpsName/stop
   */
  async stopInstance(req, res) {
    try {
      const { vpsName } = req.params;

      const result = await deploymentService.stopVPS(vpsName);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('[Controller] Stop instance failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Start a VPS instance
   * POST /api/instances/:vpsName/start
   */
  async startInstance(req, res) {
    try {
      const { vpsName } = req.params;

      const result = await deploymentService.startVPS(vpsName);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('[Controller] Start instance failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Reboot a VPS instance
   * POST /api/instances/:vpsName/reboot
   */
  async rebootInstance(req, res) {
    try {
      const { vpsName } = req.params;

      const result = await deploymentService.rebootVPS(vpsName);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('[Controller] Reboot instance failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Delete a VPS instance
   * DELETE /api/instances/:vpsName
   */
  async deleteInstance(req, res) {
    try {
      const { vpsName } = req.params;

      const result = await deploymentService.deleteVPS(vpsName);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('[Controller] Delete instance failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get instance details
   * GET /api/instances/:vpsName
   */
  async getInstanceDetails(req, res) {
    try {
      const { vpsName } = req.params;

      const details = await deploymentService.getVPSDetails(vpsName);

      res.json({
        success: true,
        instance: details,
      });
    } catch (error) {
      console.error('[Controller] Get instance details failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Create a snapshot
   * POST /api/instances/:vpsName/snapshots
   */
  async createSnapshot(req, res) {
    try {
      const { vpsName } = req.params;
      const { description } = req.body;

      const result = await deploymentService.createSnapshot(vpsName, description);

      res.json({
        success: true,
        snapshot: result.snapshot,
      });
    } catch (error) {
      console.error('[Controller] Create snapshot failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get queue statistics
   * GET /api/deployments/stats
   */
  async getQueueStatistics(req, res) {
    try {
      const stats = await getQueueStats();

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error('[Controller] Get queue stats failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Deployment callback (called by cloud-init after deployment)
   * POST /api/deployments/callback
   */
  async deploymentCallback(req, res) {
    try {
      const { instanceId, status, hostname, error } = req.body;

      console.log('[Controller] Deployment callback received:', {
        instanceId,
        status,
        hostname,
        error,
      });

      // TODO: Update instance status in license manager database
      // This would typically make a call back to the license manager API
      // to update the instance record with the deployment status

      res.json({
        success: true,
        message: 'Callback received',
      });
    } catch (error) {
      console.error('[Controller] Deployment callback failed:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new DeploymentController();
