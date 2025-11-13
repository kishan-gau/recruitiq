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

const router = express.Router();

// GET /api/paylinq/payroll-run-types/summary - Get summary for dropdowns
router.get('/summary', controller.getRunTypesSummary);

// GET /api/paylinq/payroll-run-types/:typeCode/components - Resolve allowed components
router.get('/:typeCode/components', controller.resolveAllowedComponents);

// POST /api/paylinq/payroll-run-types/:typeCode/validate - Validate run type
router.post('/:typeCode/validate', controller.validateRunType);

// GET /api/paylinq/payroll-run-types/id/:id - Get by ID
router.get('/id/:id', controller.getRunTypeById);

// GET /api/paylinq/payroll-run-types/:typeCode - Get by code
router.get('/:typeCode', controller.getRunTypeByCode);

// GET /api/paylinq/payroll-run-types - List all
router.get('/', controller.listRunTypes);

// POST /api/paylinq/payroll-run-types - Create
router.post('/', controller.createRunType);

// PATCH /api/paylinq/payroll-run-types/:id - Update
router.patch('/:id', controller.updateRunType);

// DELETE /api/paylinq/payroll-run-types/:id - Delete
router.delete('/:id', controller.deleteRunType);

export default router;
