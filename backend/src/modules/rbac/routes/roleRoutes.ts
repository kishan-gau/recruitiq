import express, { Router } from 'express';
import { authenticateTenant, requirePermission } from '../../../middleware/auth.ts';
import { requireRBACManagement, preventSystemRoleModification } from '../middleware/rbacEnforcement.ts';
import {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  assignPermissions
} from '../controllers/roleController.ts';

const router: Router = express.Router();

// All routes require tenant authentication
router.use(authenticateTenant);

// List/View - Requires 'rbac:view' permission
router.get('/', requirePermission('rbac:view'), listRoles);
router.get('/:id', requirePermission('rbac:view'), getRole);

// Create - Requires 'rbac:manage' permission
router.post('/', requireRBACManagement, createRole);

// Update - Requires 'rbac:manage' + prevent system role modification
router.patch('/:id', 
  requireRBACManagement,
  preventSystemRoleModification,
  updateRole
);

// Delete - Requires 'rbac:manage' + prevent system role modification
router.delete('/:id',
  requireRBACManagement,
  preventSystemRoleModification,
  deleteRole
);

// Assign permissions - Requires 'rbac:manage'
router.post('/:id/permissions',
  requireRBACManagement,
  preventSystemRoleModification,
  assignPermissions
);

export default router;
