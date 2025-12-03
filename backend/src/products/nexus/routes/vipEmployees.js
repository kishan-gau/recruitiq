/**
 * VIP Employee Routes
 * 
 * API routes for VIP employee management and access control.
 * All routes require tenant authentication and product access.
 * 
 * @module products/nexus/routes/vipEmployees
 */

import express from 'express';
import VIPEmployeeController from '../controllers/vipEmployeeController.js';
import { requirePermission } from '../../../middleware/auth.js';

const router = express.Router();

// Initialize controller
const vipEmployeeController = new VIPEmployeeController();

// ========== VIP EMPLOYEE ROUTES ==========

/**
 * @route   GET /api/products/nexus/vip-employees/count
 * @desc    Get count of VIP employees
 * @access  Private - requires 'vip:read' permission
 */
router.get(
  '/count',
  requirePermission('vip:read'),
  vipEmployeeController.getVIPCount
);

/**
 * @route   GET /api/products/nexus/vip-employees
 * @desc    List all VIP employees with optional filters
 * @access  Private - requires 'vip:read' permission
 */
router.get(
  '/',
  requirePermission('vip:read'),
  vipEmployeeController.listVIPEmployees
);

/**
 * @route   GET /api/products/nexus/vip-employees/:employeeId
 * @desc    Get VIP status for an employee
 * @access  Private - requires 'vip:read' permission
 */
router.get(
  '/:employeeId',
  requirePermission('vip:read'),
  vipEmployeeController.getVIPStatus
);

/**
 * @route   GET /api/products/nexus/vip-employees/:employeeId/audit-log
 * @desc    Get audit log for VIP employee access
 * @access  Private - requires 'vip:read' permission
 */
router.get(
  '/:employeeId/audit-log',
  requirePermission('vip:read'),
  vipEmployeeController.getAuditLog
);

/**
 * @route   GET /api/products/nexus/vip-employees/:employeeId/check-access
 * @desc    Check if current user has access to VIP employee
 * @access  Private - any authenticated user can check their own access
 */
router.get(
  '/:employeeId/check-access',
  vipEmployeeController.checkAccess
);

/**
 * @route   POST /api/products/nexus/vip-employees/:employeeId
 * @desc    Mark employee as VIP
 * @access  Private - requires 'vip:manage' permission
 */
router.post(
  '/:employeeId',
  requirePermission('vip:manage'),
  vipEmployeeController.markAsVIP
);

/**
 * @route   PATCH /api/products/nexus/vip-employees/:employeeId
 * @desc    Update VIP status settings
 * @access  Private - requires 'vip:manage' permission
 */
router.patch(
  '/:employeeId',
  requirePermission('vip:manage'),
  vipEmployeeController.updateVIPStatus
);

/**
 * @route   PATCH /api/products/nexus/vip-employees/:employeeId/access-control
 * @desc    Update access control rules for VIP employee
 * @access  Private - requires 'vip:manage' permission
 */
router.patch(
  '/:employeeId/access-control',
  requirePermission('vip:manage'),
  vipEmployeeController.updateAccessControl
);

/**
 * @route   DELETE /api/products/nexus/vip-employees/:employeeId
 * @desc    Remove VIP status from employee
 * @access  Private - requires 'vip:manage' permission
 */
router.delete(
  '/:employeeId',
  requirePermission('vip:manage'),
  vipEmployeeController.removeVIPStatus
);

export default router;
