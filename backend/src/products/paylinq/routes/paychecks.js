/**
 * Paylinq Paycheck Routes
 */

import express from 'express';
import paycheckController from '../controllers/paycheckController.js';
import { validate  } from '../../../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const updatePaycheckSchema = Joi.object({
  status: Joi.string().valid('draft', 'approved', 'paid', 'voided'),
  grossPay: Joi.number().min(0),
  netPay: Joi.number().min(0),
  totalTaxes: Joi.number().min(0),
  totalDeductions: Joi.number().min(0),
  notes: Joi.string().max(500).allow(null, ''),
});

const voidPaycheckSchema = Joi.object({
  reason: Joi.string().max(500).required(),
});

const reissuePaycheckSchema = Joi.object({
  adjustments: Joi.object().allow(null),
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const employeeIdParamSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
});

// Routes
router.get('/', paycheckController.getPaychecks);
router.get('/:id', validate(idParamSchema, 'params'), paycheckController.getPaycheckById);
router.get('/:id/components', validate(idParamSchema, 'params'), paycheckController.getPaycheckComponents); // PHASE 2: Component breakdown
router.get('/:id/pdf', validate(idParamSchema, 'params'), paycheckController.downloadPayslipPdf);
router.post('/:id/send', validate(idParamSchema, 'params'), paycheckController.sendPayslip);
router.get('/employees/:employeeId/paychecks', validate(employeeIdParamSchema, 'params'), paycheckController.getEmployeePaychecks);
router.put('/:id', validate(idParamSchema, 'params'), validate(updatePaycheckSchema, 'body'), paycheckController.updatePaycheck);
router.post('/:id/void', validate(idParamSchema, 'params'), validate(voidPaycheckSchema, 'body'), paycheckController.voidPaycheck);
router.post('/:id/reissue', validate(idParamSchema, 'params'), validate(reissuePaycheckSchema, 'body'), paycheckController.reissuePaycheck);
router.delete('/:id', validate(idParamSchema, 'params'), paycheckController.deletePaycheck);

export default router;
