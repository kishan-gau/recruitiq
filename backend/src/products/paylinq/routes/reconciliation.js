/**
 * Paylinq Reconciliation Routes
 */

import express from 'express';
import reconciliationController from '../controllers/reconciliationController.js';
import { validate  } from '../../../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

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
router.post('/', validate(createReconciliationSchema, 'body'), reconciliationController.createReconciliation);
router.get('/', reconciliationController.getReconciliations);
router.get('/:id', validate(idParamSchema, 'params'), reconciliationController.getReconciliationById);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateReconciliationSchema, 'body'), reconciliationController.updateReconciliation);
router.post('/:id/complete', validate(idParamSchema, 'params'), validate(completeReconciliationSchema, 'body'), reconciliationController.completeReconciliation);
router.delete('/:id', validate(idParamSchema, 'params'), reconciliationController.deleteReconciliation);
router.post('/:id/items', validate(idParamSchema, 'params'), validate(createReconciliationItemSchema, 'body'), reconciliationController.addReconciliationItem);
router.get('/:id/items', validate(idParamSchema, 'params'), reconciliationController.getReconciliationItems);
router.put('/items/:id', validate(idParamSchema, 'params'), validate(updateReconciliationItemSchema, 'body'), reconciliationController.updateReconciliationItem);
router.post('/items/:id/resolve', validate(idParamSchema, 'params'), validate(resolveReconciliationItemSchema, 'body'), reconciliationController.resolveReconciliationItem);

export default router;
