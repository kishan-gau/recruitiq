/**
 * User Access Controller for Nexus
 * Handles granting and revoking system access for employees in Nexus
 */

import EmployeeService from '../services/employeeService.js';
import logger from '../../../utils/logger.js';

const employeeService = new EmployeeService();

/**
 * Grant system access to an employee
 * Creates a user account in hris.user_account and links it to the employee
 */
export const grantAccess = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { email, password, sendEmail = true } = req.body;
    const organizationId = req.user.organizationId;
    const createdBy = req.user.userId;

    logger.info('Granting system access to employee', { 
      employeeId, 
      organizationId, 
      createdBy 
    });

    const result = await employeeService.grantSystemAccess(
      employeeId,
      organizationId,
      { email, password, sendEmail },
      createdBy
    );

    res.status(201).json({
      success: true,
      message: 'System access granted successfully',
      data: result
    });
  } catch (_error) {
    logger.error('Error granting system access', { error, employeeId: req.params.employeeId });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('already has')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('Email') || error.message.includes('Password')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to grant system access',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user account status for an employee
 */
export const getUserAccount = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const organizationId = req.user.organizationId;

    const userAccount = await employeeService.getUserAccountStatus(employeeId, organizationId);

    if (!userAccount) {
      return res.status(404).json({
        success: false,
        message: 'No user account found for this employee'
      });
    }

    res.json({
      success: true,
      data: userAccount
    });
  } catch (_error) {
    logger.error('Error fetching user account', { error, employeeId: req.params.employeeId });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch user account status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Revoke system access from an employee
 * Deactivates the user account and unlinks from employee
 */
export const revokeAccess = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const organizationId = req.user.organizationId;
    const revokedBy = req.user.userId;

    logger.info('Revoking system access from employee', { 
      employeeId, 
      organizationId, 
      revokedBy 
    });

    await employeeService.revokeSystemAccess(employeeId, organizationId, revokedBy);

    res.json({
      success: true,
      message: 'System access revoked successfully'
    });
  } catch (_error) {
    logger.error('Error revoking system access', { error, employeeId: req.params.employeeId });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to revoke system access',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user account settings
 */
export const updateAccess = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const organizationId = req.user.organizationId;
    const updatedBy = req.user.userId;
    const updates = req.body;

    logger.info('Updating employee access settings', { 
      employeeId, 
      organizationId, 
      updatedBy 
    });

    const result = await employeeService.updateEmployeeAccess(
      employeeId,
      organizationId,
      updates,
      updatedBy
    );

    res.json({
      success: true,
      message: 'Access settings updated successfully',
      data: result
    });
  } catch (_error) {
    logger.error('Error updating access settings', { error, employeeId: req.params.employeeId });

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update access settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  grantAccess,
  getUserAccount,
  revokeAccess,
  updateAccess
};
