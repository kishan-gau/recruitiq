import express, { Router } from 'express';
import { authenticateTenant, requirePermission } from '../../../middleware/auth.js';
import {
  listPermissions,
  getGroupedPermissions,
  getPermissionsByProduct
} from '../controllers/permissionController.js';

const router: Router = express.Router();

// All routes require tenant authentication
router.use(authenticateTenant);

// All permission routes require 'rbac:view' permission
router.use(requirePermission('rbac:view'));

// List all permissions with optional filters
router.get('/', listPermissions);

// Get permissions grouped by product and category
router.get('/grouped', getGroupedPermissions);

// Get permissions for specific product
router.get('/product/:product', getPermissionsByProduct);

export default router;
