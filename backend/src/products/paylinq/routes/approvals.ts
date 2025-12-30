import express from 'express';
import Joi from 'joi';
import ApprovalService from '../services/approvalService.js';
import logger from '../../../utils/logger.js';
import { requirePermission } from '../../../middleware/auth.js';

const router = express.Router();
const approvalService = new ApprovalService();

/**
 * Validation schemas
 */
const createApprovalSchema = Joi.object({
  requestType: Joi.string()
    .valid('conversion', 'rate_change', 'bulk_rate_import', 'configuration_change')
    .required(),
  referenceType: Joi.string().optional(),
  referenceId: Joi.number().integer().optional(),
  requestData: Joi.object().required(),
  reason: Joi.string().max(1000).optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal')
});

const approvalActionSchema = Joi.object({
  comments: Joi.string().max(1000).optional().allow(null, '')
});

const rejectActionSchema = Joi.object({
  comments: Joi.string().max(1000).required()
});

/**
 * @route   POST /api/paylinq/approvals
 * @desc    Create a new approval request
 * @access  Private (Payroll Admin, Finance Manager)
 */
router.post('/', requirePermission('approvals:create'), async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createApprovalSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    const approvalData = {
      organizationId: req.user.organizationId,
      ...value,
      createdBy: req.user.id
    };

    const result = await approvalService.createApprovalRequest(approvalData);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error creating approval request', { error, userId: req.userId });
    res.status(500).json({
      success: false,
      message: 'Failed to create approval request',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/paylinq/approvals/pending
 * @desc    Get pending approval requests for organization
 * @access  Private (Approvers)
 */
router.get('/pending', requirePermission('approvals:read'), async (req, res) => {
  try {
    const { requestType, priority } = req.query;

    const approvals = await approvalService.getPendingApprovals(req.user.organizationId, {
      requestType,
      priority,
      userId: req.user.id
    });

    res.json({
      success: true,
      data: approvals,
      count: approvals.length
    });
  } catch (error) {
    logger.error('Error fetching pending approvals', { error, userId: req.userId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approvals',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/paylinq/approvals/:id
 * @desc    Get approval request details
 * @access  Private
 */
router.get('/:id', requirePermission('approvals:read'), async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        ar.*,
        creator_emp.first_name || ' ' || creator_emp.last_name as requested_by_name,
        creator_ua.email as requested_by_email,
        json_agg(
          json_build_object(
            'id', aa.id,
            'action', aa.action,
            'comments', aa.comments,
            'created_at', aa.created_at,
            'created_by', approver_emp.first_name || ' ' || approver_emp.last_name,
            'created_by_email', approver_ua.email
          ) ORDER BY aa.created_at
        ) FILTER (WHERE aa.id IS NOT NULL) as actions
      FROM payroll.currency_approval_request ar
      LEFT JOIN payroll.currency_approval_action aa ON ar.id = aa.approval_request_id
      LEFT JOIN hris.user_account creator_ua ON ar.created_by = creator_ua.id
      LEFT JOIN hris.employee creator_emp ON creator_ua.employee_id = creator_emp.id AND creator_emp.deleted_at IS NULL
      LEFT JOIN hris.user_account approver_ua ON aa.created_by = approver_ua.id
      LEFT JOIN hris.employee approver_emp ON approver_ua.employee_id = approver_emp.id AND approver_emp.deleted_at IS NULL
      WHERE ar.id = $1 AND ar.organization_id = $2
      GROUP BY ar.id, creator_emp.first_name, creator_emp.last_name, creator_ua.email
    `;

    const { pool } = await import('../../../config/database');
    const result = await pool.query(query, [id, req.user.organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching approval request', { error, requestId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval request',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/paylinq/approvals/:id/approve
 * @desc    Approve an approval request
 * @access  Private (Approvers)
 */
router.post('/:id/approve', requirePermission('approvals:approve'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = approvalActionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    const request = await approvalService.approveRequest(
      parseInt(id),
      req.user.id,
      value.comments
    );

    res.json({
      success: true,
      message: 'Approval request approved successfully',
      data: request
    });
  } catch (error) {
    logger.error('Error approving request', { error, requestId: req.params.id, userId: req.userId });
    
    if (error.message.includes('not authorized') || error.message.includes('already approved')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to approve request',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/paylinq/approvals/:id/reject
 * @desc    Reject an approval request
 * @access  Private (Approvers)
 */
router.post('/:id/reject', requirePermission('approvals:approve'), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = rejectActionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message)
      });
    }

    const request = await approvalService.rejectRequest(
      parseInt(id),
      req.user.id,
      value.comments
    );

    res.json({
      success: true,
      message: 'Approval request rejected successfully',
      data: request
    });
  } catch (error) {
    logger.error('Error rejecting request', { error, requestId: req.params.id, userId: req.userId });
    
    if (error.message.includes('not authorized')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to reject request',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/paylinq/approvals/history/:referenceType/:referenceId
 * @desc    Get approval history for a reference
 * @access  Private
 */
router.get('/history/:referenceType/:referenceId', requirePermission('approvals:read'), async (req, res) => {
  try {
    const { referenceType, referenceId } = req.params;

    const history = await approvalService.getApprovalHistory(
      referenceType,
      parseInt(referenceId)
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error fetching approval history', { error, params: req.params });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval history',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/paylinq/approvals/expire
 * @desc    Expire old pending approval requests (admin/cron)
 * @access  Private (Admin only)
 */
router.post('/expire', requirePermission('system:admin'), async (req, res) => {
  try {
    const expiredCount = await approvalService.expireOldRequests();

    res.json({
      success: true,
      message: `Expired ${expiredCount} old approval requests`,
      data: { expiredCount }
    });
  } catch (error) {
    logger.error('Error expiring old requests', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to expire old requests',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/paylinq/approvals/statistics
 * @desc    Get approval statistics for organization
 * @access  Private (Admin, Finance Manager)
 */
router.get('/statistics', requirePermission('approvals:read'), async (req, res) => {
  try {
    const query = `
      SELECT * FROM payroll.approval_statistics
      WHERE organization_id = $1
      ORDER BY request_type
    `;

    const { pool } = await import('../../../config/database');
    const result = await pool.query(query, [req.user.organizationId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching approval statistics', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval statistics',
      error: error.message
    });
  }
});

export default router;
