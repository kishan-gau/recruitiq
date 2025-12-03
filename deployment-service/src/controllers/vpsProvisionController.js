import { VpsProvisionRequest, VpsProvisionApprover } from '../models/index.js';
import vpsProvisioningService from '../services/vpsProvisioningService.js';

/**
 * VPS Provision Request Controller
 * Handles approval workflow for VPS provisioning
 */
class VpsProvisionController {
  /**
   * Create a new VPS provision request
   * POST /api/vps-provision/requests
   */
  async createRequest(req, res) {
    try {
      const {
        customerId,
        customerName,
        productName,
        vpsName,
        hostname,
        domain,
        region,
        operatingSystem,
        licenseKey,
        licenseTier,
        adminEmail,
        priority,
        estimatedMonthlyCost,
        estimatedSetupCost,
        businessJustification,
        projectCode,
        costCenter,
        tags,
        customConfig,
        notes,
      } = req.body;

      // Get requester info from JWT or session
      const requesterId = req.user?.id;
      const requesterEmail = req.user?.email;
      const requesterName = req.user?.name || req.user?.email;
      const organizationId = req.user?.organizationId;

      // Validate required fields
      if (!customerId || !customerName || !productName || !vpsName || !adminEmail) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: customerId, customerName, productName, vpsName, adminEmail',
        });
      }

      // Create the request
      const request = await VpsProvisionRequest.create({
        requesterId,
        requesterEmail,
        requesterName,
        organizationId,
        customerId,
        customerName,
        productName,
        vpsName,
        hostname,
        domain,
        region,
        operatingSystem,
        licenseKey,
        licenseTier,
        adminEmail,
        priority: priority || 'normal',
        estimatedMonthlyCost,
        estimatedSetupCost,
        businessJustification,
        projectCode,
        costCenter,
        tags: tags || [],
        customConfig: customConfig || {},
        notes,
      });

      res.status(201).json({
        success: true,
        message: 'VPS provision request created successfully',
        request: {
          id: request.id,
          requestNumber: request.request_number,
          status: request.status,
          vpsName: request.vps_name,
          customerName: request.customer_name,
          priority: request.priority,
          estimatedMonthlyCost: request.estimated_monthly_cost,
          currency: request.currency,
          createdAt: request.created_at,
        },
      });
    } catch (error) {
      console.error('[VPS Provision] Error creating request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create VPS provision request',
        message: error.message,
      });
    }
  }

  /**
   * Get a specific request
   * GET /api/vps-provision/requests/:id
   */
  async getRequest(req, res) {
    try {
      const { id } = req.params;

      const request = await VpsProvisionRequest.findById(id);

      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Request not found',
        });
      }

      // Get comments and audit log
      const comments = await VpsProvisionRequest.getComments(id);
      const auditLog = await VpsProvisionRequest.getAuditLog(id);

      res.json({
        success: true,
        request,
        comments,
        auditLog,
      });
    } catch (error) {
      console.error('[VPS Provision] Error fetching request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch request',
        message: error.message,
      });
    }
  }

  /**
   * List requests with filters
   * GET /api/vps-provision/requests
   */
  async listRequests(req, res) {
    try {
      const {
        status,
        priority,
        requesterId,
        organizationId,
        limit = 50,
        offset = 0,
      } = req.query;

      const requests = await VpsProvisionRequest.list({
        status,
        priority,
        requesterId,
        organizationId,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });

      res.json({
        success: true,
        count: requests.length,
        requests,
      });
    } catch (error) {
      console.error('[VPS Provision] Error listing requests:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list requests',
        message: error.message,
      });
    }
  }

  /**
   * Get pending requests (for approvers)
   * GET /api/vps-provision/requests/pending
   */
  async getPendingRequests(req, res) {
    try {
      const requests = await VpsProvisionRequest.getPending();

      res.json({
        success: true,
        count: requests.length,
        requests,
      });
    } catch (error) {
      console.error('[VPS Provision] Error fetching pending requests:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending requests',
        message: error.message,
      });
    }
  }

  /**
   * Approve a request
   * POST /api/vps-provision/requests/:id/approve
   */
  async approveRequest(req, res) {
    try {
      const { id } = req.params;

      // Get approver info
      const approverId = req.user?.id;
      const approverEmail = req.user?.email;
      const approverName = req.user?.name || req.user?.email;

      // Check if user is an authorized approver
      const approver = await VpsProvisionApprover.findByUserId(approverId);
      if (!approver || !approver.is_active) {
        return res.status(403).json({
          success: false,
          error: 'User is not authorized to approve requests',
        });
      }

      // Get the request
      const request = await VpsProvisionRequest.findById(id);
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Request not found',
        });
      }

      // Check if approver can approve this specific request
      const canApprove = await VpsProvisionApprover.canApprove(approverId, request);
      if (!canApprove.canApprove) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to approve this request',
          reason: canApprove.reason,
        });
      }

      // Approve the request
      const approvedRequest = await VpsProvisionRequest.approve(id, {
        approverId,
        approverEmail,
        approverName,
      });

      // Trigger provisioning workflow
      try {
        // Queue provisioning job (non-blocking)
        vpsProvisioningService.provisionViaQueue(id).catch((error) => {
          console.error('[VPS Provision] Failed to queue provisioning:', error);
        });
      } catch (error) {
        console.warn('[VPS Provision] Error triggering provisioning:', error);
        // Don't fail the approval if provisioning queue fails
      }

      res.json({
        success: true,
        message: 'Request approved successfully',
        request: {
          id: approvedRequest.id,
          requestNumber: approvedRequest.request_number,
          status: approvedRequest.status,
          approvedBy: approvedRequest.approved_by_name,
          approvedAt: approvedRequest.approved_at,
        },
      });
    } catch (error) {
      console.error('[VPS Provision] Error approving request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve request',
        message: error.message,
      });
    }
  }

  /**
   * Reject a request
   * POST /api/vps-provision/requests/:id/reject
   */
  async rejectRequest(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required',
        });
      }

      // Get approver info
      const rejectorId = req.user?.id;
      const rejectorEmail = req.user?.email;
      const rejectorName = req.user?.name || req.user?.email;

      // Check if user is an authorized approver
      const approver = await VpsProvisionApprover.findByUserId(rejectorId);
      if (!approver || !approver.is_active) {
        return res.status(403).json({
          success: false,
          error: 'User is not authorized to reject requests',
        });
      }

      // Reject the request
      const rejectedRequest = await VpsProvisionRequest.reject(id, {
        rejectorId,
        rejectorEmail,
        rejectorName,
        reason,
      });

      res.json({
        success: true,
        message: 'Request rejected successfully',
        request: {
          id: rejectedRequest.id,
          requestNumber: rejectedRequest.request_number,
          status: rejectedRequest.status,
          rejectedBy: rejectedRequest.rejected_by_name,
          rejectedAt: rejectedRequest.rejected_at,
          rejectionReason: rejectedRequest.rejection_reason,
        },
      });
    } catch (error) {
      console.error('[VPS Provision] Error rejecting request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject request',
        message: error.message,
      });
    }
  }

  /**
   * Add comment to a request
   * POST /api/vps-provision/requests/:id/comments
   */
  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { commentText, isInternal } = req.body;

      if (!commentText) {
        return res.status(400).json({
          success: false,
          error: 'Comment text is required',
        });
      }

      const userId = req.user?.id;
      const userEmail = req.user?.email;
      const userName = req.user?.name || req.user?.email;

      const comment = await VpsProvisionRequest.addComment({
        requestId: id,
        userId,
        userEmail,
        userName,
        commentText,
        isInternal: isInternal || false,
      });

      res.status(201).json({
        success: true,
        message: 'Comment added successfully',
        comment,
      });
    } catch (error) {
      console.error('[VPS Provision] Error adding comment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add comment',
        message: error.message,
      });
    }
  }

  /**
   * Get request statistics
   * GET /api/vps-provision/statistics
   */
  async getStatistics(req, res) {
    try {
      const statistics = await VpsProvisionRequest.getStatistics();

      res.json({
        success: true,
        statistics,
      });
    } catch (error) {
      console.error('[VPS Provision] Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
        message: error.message,
      });
    }
  }

  /**
   * Cancel a request
   * POST /api/vps-provision/requests/:id/cancel
   */
  async cancelRequest(req, res) {
    try {
      const { id } = req.params;

      const request = await VpsProvisionRequest.findById(id);
      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Request not found',
        });
      }

      // Only pending or approved requests can be cancelled
      if (!['pending', 'approved'].includes(request.status)) {
        return res.status(400).json({
          success: false,
          error: `Cannot cancel request in ${request.status} status`,
        });
      }

      // Check if user owns the request or is an approver
      const userId = req.user?.id;
      const isOwner = request.requester_id === userId;
      const approver = await VpsProvisionApprover.findByUserId(userId);
      const isApprover = approver && approver.is_active;

      if (!isOwner && !isApprover) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to cancel this request',
        });
      }

      const cancelledRequest = await VpsProvisionRequest.updateStatus(
        id,
        'cancelled'
      );

      res.json({
        success: true,
        message: 'Request cancelled successfully',
        request: {
          id: cancelledRequest.id,
          requestNumber: cancelledRequest.request_number,
          status: cancelledRequest.status,
          cancelledAt: cancelledRequest.cancelled_at,
        },
      });
    } catch (error) {
      console.error('[VPS Provision] Error cancelling request:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel request',
        message: error.message,
      });
    }
  }
}

export default new VpsProvisionController();
