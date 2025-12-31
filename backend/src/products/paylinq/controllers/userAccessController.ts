/**
 * User Access Controller
 * 
 * Handles HTTP requests for granting/revoking system access to employees
 * 
 * @module products/paylinq/controllers/userAccessController
 */

import PayrollService from '../services/payrollService.js';

const payrollService = new PayrollService();
import logger from '../../../utils/logger.js';

/**
 * Grant system access to an employee
 * POST /api/paylinq/employees/:employeeId/grant-access
 */
async function grantAccess(req, res) {
  try {
    const { employeeId } = req.params;
    const { organizationId, userId } = req.user;
    const accessData = req.body;

    const result = await payrollService.grantSystemAccess(
      employeeId,
      accessData,
      organizationId,
      userId
    );

    logger.info('System access granted successfully', {
      employeeId,
      userAccountId: result.userAccount.id,
      organizationId,
      userId
    });

    res.status(201).json({
      success: true,
      message: 'System access granted successfully',
      data: result
    });
  } catch (_error) {
    logger.error('Error in grantAccess controller', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organizationId
    });
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    if (error.message.includes('already has system access')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    
    if (error.message.includes('must have an email')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to grant system access'
    });
  }
}

/**
 * Get user account status for an employee
 * GET /api/paylinq/employees/:employeeId/user-account
 */
async function getUserAccount(req, res) {
  try {
    const { employeeId } = req.params;
    const { organizationId } = req.user;

    const status = await payrollService.getUserAccountStatus(
      employeeId,
      organizationId
    );

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (_error) {
    logger.error('Error in getUserAccount controller', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organizationId
    });
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get user account status'
    });
  }
}

/**
 * Revoke system access from an employee
 * DELETE /api/paylinq/employees/:employeeId/revoke-access
 */
async function revokeAccess(req, res) {
  try {
    const { employeeId } = req.params;
    const { organizationId, userId } = req.user;

    const result = await payrollService.revokeSystemAccess(
      employeeId,
      organizationId,
      userId
    );

    logger.info('System access revoked successfully', {
      employeeId,
      organizationId,
      userId
    });

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (_error) {
    logger.error('Error in revokeAccess controller', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organizationId
    });
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to revoke system access'
    });
  }
}

/**
 * Update employee user access settings
 * PATCH /api/paylinq/employees/:employeeId/user-access
 */
async function updateAccess(req, res) {
  try {
    const { employeeId } = req.params;
    const { organizationId, userId } = req.user;
    const updates = req.body;

    const result = await payrollService.updateEmployeeAccess(
      employeeId,
      updates,
      organizationId,
      userId
    );

    logger.info('Employee access updated successfully', {
      employeeId,
      userAccountId: result.userAccountId,
      organizationId,
      userId
    });

    res.status(200).json({
      success: true,
      message: 'Access updated successfully',
      data: result
    });
  } catch (_error) {
    logger.error('Error in updateAccess controller', {
      error: error.message,
      employeeId: req.params.employeeId,
      organizationId: req.user?.organizationId
    });
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    if (error.message.includes('Invalid email') || error.message.includes('already in use')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update access'
    });
  }
}

export default {
  grantAccess,
  getUserAccount,
  revokeAccess,
  updateAccess
};
