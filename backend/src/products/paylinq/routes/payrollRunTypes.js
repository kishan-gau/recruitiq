/**
 * Payroll Run Type Routes
 * 
 * Routes for payroll run type management.
 * All routes require authentication and organization context.
 * 
 * @module products/paylinq/routes/payrollRunTypes
 */

import express from 'express';
import * as controller from '../controllers/PayrollRunTypeController.js';
import { requirePermission } from '../../../middleware/auth.js';

const router = express.Router();

// GET /api/paylinq/payroll-run-types/summary - Get summary for dropdowns
router.get(
  '/summary',
  requirePermission('run-types:read'),
  controller.getRunTypesSummary
);

// GET /api/paylinq/payroll-run-types/:typeCode/components - Resolve allowed components
router.get(
  '/:typeCode/components',
  requirePermission('run-types:read'),
  controller.resolveAllowedComponents
);

// POST /api/paylinq/payroll-run-types/:typeCode/validate - Validate run type
router.post(
  '/:typeCode/validate',
  requirePermission('run-types:read'),
  controller.validateRunType
);

// GET /api/paylinq/payroll-run-types/id/:id - Get by ID
router.get(
  '/id/:id',
  requirePermission('run-types:read'),
  controller.getRunTypeById
);

// GET /api/paylinq/payroll-run-types/:typeCode - Get by code
router.get(
  '/:typeCode',
  requirePermission('run-types:read'),
  controller.getRunTypeByCode
);

// GET /api/paylinq/payroll-run-types - List all
router.get(
  '/',
  requirePermission('run-types:read'),
  controller.listRunTypes
);

// POST /api/paylinq/payroll-run-types - Create
router.post(
  '/',
  requirePermission('payroll:run_types:create'),
  controller.createRunType
);

// PATCH /api/paylinq/payroll-run-types/:id - Update
router.patch(
  '/:id',
  requirePermission('run-types:update'),
  controller.updateRunType
);

// DELETE /api/paylinq/payroll-run-types/:id - Delete
router.delete(
  '/:id',
  requirePermission('payroll:run_types:delete'),
  controller.deleteRunType
);

export default router;
