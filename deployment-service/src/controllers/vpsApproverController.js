import { VpsProvisionApprover, VpsProvisionRequest } from '../models/index.js';

/**
 * VPS Provision Approver Controller
 * Manages approvers and their permissions
 */
class VpsApproverController {
  /**
   * Create a new approver
   * POST /api/vps-provision/approvers
   */
  async createApprover(req, res) {
    try {
      const {
        userId,
        email,
        name,
        role,
        canApproveAll,
        maxMonthlyCost,
        allowedProducts,
        allowedRegions,
      } = req.body;

      // Validate required fields
      if (!userId || !email || !name || !role) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, email, name, role',
        });
      }

      // Check if approver already exists
      const existing = await VpsProvisionApprover.findByEmail(email);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Approver with this email already exists',
        });
      }

      const approver = await VpsProvisionApprover.create({
        userId,
        email,
        name,
        role,
        canApproveAll: canApproveAll || false,
        maxMonthlyCost: maxMonthlyCost || null,
        allowedProducts: allowedProducts || null,
        allowedRegions: allowedRegions || null,
      });

      res.status(201).json({
        success: true,
        message: 'Approver created successfully',
        approver,
      });
    } catch (error) {
      console.error('[VPS Approver] Error creating approver:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create approver',
        message: error.message,
      });
    }
  }

  /**
   * Get approver by ID
   * GET /api/vps-provision/approvers/:id
   */
  async getApprover(req, res) {
    try {
      const { id } = req.params;

      const approver = await VpsProvisionApprover.findById(id);

      if (!approver) {
        return res.status(404).json({
          success: false,
          error: 'Approver not found',
        });
      }

      // Get approver statistics
      const stats = await VpsProvisionApprover.getStatistics(approver.user_id);

      res.json({
        success: true,
        approver,
        statistics: stats,
      });
    } catch (error) {
      console.error('[VPS Approver] Error fetching approver:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch approver',
        message: error.message,
      });
    }
  }

  /**
   * List all approvers
   * GET /api/vps-provision/approvers
   */
  async listApprovers(req, res) {
    try {
      const { isActive, role } = req.query;

      const filters = {};
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }
      if (role) {
        filters.role = role;
      }

      const approvers = await VpsProvisionApprover.list(filters);

      res.json({
        success: true,
        count: approvers.length,
        approvers,
      });
    } catch (error) {
      console.error('[VPS Approver] Error listing approvers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list approvers',
        message: error.message,
      });
    }
  }

  /**
   * Update approver
   * PATCH /api/vps-provision/approvers/:id
   */
  async updateApprover(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const approver = await VpsProvisionApprover.update(id, updates);

      if (!approver) {
        return res.status(404).json({
          success: false,
          error: 'Approver not found',
        });
      }

      res.json({
        success: true,
        message: 'Approver updated successfully',
        approver,
      });
    } catch (error) {
      console.error('[VPS Approver] Error updating approver:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update approver',
        message: error.message,
      });
    }
  }

  /**
   * Delete approver
   * DELETE /api/vps-provision/approvers/:id
   */
  async deleteApprover(req, res) {
    try {
      const { id } = req.params;

      const deleted = await VpsProvisionApprover.delete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Approver not found',
        });
      }

      res.json({
        success: true,
        message: 'Approver deleted successfully',
      });
    } catch (error) {
      console.error('[VPS Approver] Error deleting approver:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete approver',
        message: error.message,
      });
    }
  }

  /**
   * Deactivate approver
   * POST /api/vps-provision/approvers/:id/deactivate
   */
  async deactivateApprover(req, res) {
    try {
      const { id } = req.params;

      const approver = await VpsProvisionApprover.deactivate(id);

      if (!approver) {
        return res.status(404).json({
          success: false,
          error: 'Approver not found',
        });
      }

      res.json({
        success: true,
        message: 'Approver deactivated successfully',
        approver,
      });
    } catch (error) {
      console.error('[VPS Approver] Error deactivating approver:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate approver',
        message: error.message,
      });
    }
  }

  /**
   * Activate approver
   * POST /api/vps-provision/approvers/:id/activate
   */
  async activateApprover(req, res) {
    try {
      const { id } = req.params;

      const approver = await VpsProvisionApprover.activate(id);

      if (!approver) {
        return res.status(404).json({
          success: false,
          error: 'Approver not found',
        });
      }

      res.json({
        success: true,
        message: 'Approver activated successfully',
        approver,
      });
    } catch (error) {
      console.error('[VPS Approver] Error activating approver:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to activate approver',
        message: error.message,
      });
    }
  }

  /**
   * Check if current user can approve a request
   * POST /api/vps-provision/approvers/check-approval
   */
  async checkApproval(req, res) {
    try {
      const { requestId } = req.body;
      const userId = req.user?.id;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: 'Request ID is required',
        });
      }

      // Get the request
      const request = await VpsProvisionRequest.findById(requestId);

      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Request not found',
        });
      }

      const result = await VpsProvisionApprover.canApprove(userId, request);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('[VPS Approver] Error checking approval:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check approval eligibility',
        message: error.message,
      });
    }
  }
}

export default new VpsApproverController();
