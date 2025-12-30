/**
 * Paylinq Reconciliation Routes
 */

import express, { Router } from 'express';
import reconciliationController from '../controllers/reconciliationController.ts';
import { requirePermission } from '../../../middleware/auth.ts';
import { validate  } from '../../../middleware/validation.ts';
import Joi from 'joi';

const router: Router = express.Router();

// Validation schemas
const createReconciliationSchema = Joi.object({
  payrollRunId: Joi.string().uuid().required(),
  reconciliationType: Joi.string().valid('bank', 'gl', 'tax', 'benefit').required(),
  reconciliationDate: Joi.date().allow(null),
  expectedTotal: Joi.number().allow(null),
  actualTotal: Joi.number().allow(null),
  status: Joi.string().valid('pending', 'in_progress', 'completed', 'failed').default('pending'),
  notes: Joi.string().max(1000).allow(null, ''),
});

const updateReconciliationSchema = Joi.object({
  expectedTotal: Joi.number().allow(null),
  actualTotal: Joi.number().allow(null),
  status: Joi.string().valid('pending', 'in_progress', 'completed', 'failed'),
  notes: Joi.string().max(1000).allow(null, ''),
});

const completeReconciliationSchema = Joi.object({
  notes: Joi.string().max(1000).allow(null, ''),
});

const createReconciliationItemSchema = Joi.object({
  itemType: Joi.string().max(100).required(),
  description: Joi.string().max(500).required(),
  expectedAmount: Joi.number().required(),
  actualAmount: Joi.number().required(),
  varianceAmount: Joi.number().allow(null),
  notes: Joi.string().max(500).allow(null, ''),
});

const updateReconciliationItemSchema = Joi.object({
  description: Joi.string().max(500),
  expectedAmount: Joi.number(),
  actualAmount: Joi.number(),
  varianceAmount: Joi.number(),
  status: Joi.string().valid('pending', 'resolved', 'escalated'),
  notes: Joi.string().max(500).allow(null, ''),
});

const resolveReconciliationItemSchema = Joi.object({
  resolution: Joi.string().max(1000).required(),
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

// Routes
router.post('/', requirePermission('payroll:reconciliation:create'), validate(createReconciliationSchema, 'body'), reconciliationController.createReconciliation);
router.get('/', requirePermission('payroll:reconciliation:read'), reconciliationController.getReconciliations);
router.get('/:id', requirePermission('payroll:reconciliation:read'), validate(idParamSchema, 'params'), reconciliationController.getReconciliationById);
router.put('/:id', requirePermission('payroll:reconciliation:update'), validate(idParamSchema, 'params'), validate(updateReconciliationSchema, 'body'), reconciliationController.updateReconciliation);
router.post('/:id/complete', requirePermission('payroll:reconciliation:update'), validate(idParamSchema, 'params'), validate(completeReconciliationSchema, 'body'), reconciliationController.completeReconciliation);
router.delete('/:id', requirePermission('payroll:reconciliation:delete'), validate(idParamSchema, 'params'), reconciliationController.deleteReconciliation);
router.post('/:id/items', requirePermission('payroll:reconciliation:update'), validate(idParamSchema, 'params'), validate(createReconciliationItemSchema, 'body'), reconciliationController.addReconciliationItem);
router.get('/:id/items', requirePermission('payroll:reconciliation:read'), validate(idParamSchema, 'params'), reconciliationController.getReconciliationItems);
router.put('/items/:id', requirePermission('payroll:reconciliation:update'), validate(idParamSchema, 'params'), validate(updateReconciliationItemSchema, 'body'), reconciliationController.updateReconciliationItem);
router.post('/items/:id/resolve', requirePermission('payroll:reconciliation:update'), validate(idParamSchema, 'params'), validate(resolveReconciliationItemSchema, 'body'), reconciliationController.resolveReconciliationItem);

export default router;
