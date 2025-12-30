import express, { Router } from 'express';
import { authenticateTenant, requirePermission } from '../../../middleware/auth.ts';
import { requireUserManagement } from '../middleware/rbacEnforcement.ts';
import {
  assignRole,
  revokeRole,
  getUserRoles,
  getRoleUsers,
  getUserPermissions,
  checkPermission,
  bulkAssignRoles
} from '../controllers/userRoleController.ts';

const router: Router = express.Router();

// All routes require tenant authentication
router.use(authenticateTenant);

// Assign/Revoke roles - Requires user management permission
router.post('/', requireUserManagement, assignRole);
router.delete('/', requireUserManagement, revokeRole);
router.post('/bulk-assign', requireUserManagement, bulkAssignRoles);

// View permissions - Requires 'rbac:view' or 'user:view' permission
router.get('/:userId', requirePermission('rbac:view', 'user:view'), getUserRoles);
router.get('/:userId/permissions', requirePermission('rbac:view', 'user:view'), getUserPermissions);

// Check permission - Requires 'rbac:view' permission
router.post('/check-permission', requirePermission('rbac:view'), checkPermission);

export default router;
