/**
 * Paylinq Paycheck Routes
 */

import express, { Router } from 'express';
import paycheckController from '../controllers/paycheckController.js';
import { validate  } from '../../../middleware/validation.js';
import { requirePermission } from '../../../middleware/auth.js';
import Joi from 'joi';

const router: Router = express.Router();

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
router.get(
  '/',
  requirePermission('payroll:paychecks:read'),
  paycheckController.getPaychecks
);

router.get(
  '/:id',
  requirePermission('payroll:paychecks:read'),
  validate(idParamSchema, 'params'),
  paycheckController.getPaycheckById
);

router.get(
  '/:id/components',
  requirePermission('payroll:paychecks:read'),
  validate(idParamSchema, 'params'),
  paycheckController.getPaycheckComponents
);

router.get(
  '/:id/pdf',
  requirePermission('payroll:paychecks:read'),
  validate(idParamSchema, 'params'),
  paycheckController.downloadPayslipPdf
);

router.post(
  '/:id/send',
  requirePermission('payroll:paychecks:process'),
  validate(idParamSchema, 'params'),
  paycheckController.sendPayslip
);

router.get(
  '/employees/:employeeId/paychecks',
  requirePermission('payroll:paychecks:read'),
  validate(employeeIdParamSchema, 'params'),
  paycheckController.getEmployeePaychecks
);

router.get(
  '/employees/:employeeId/ytd-summary',
  requirePermission('payroll:paychecks:read'),
  validate(employeeIdParamSchema, 'params'),
  paycheckController.getEmployeeYtdSummary
);

router.put(
  '/:id',
  requirePermission('payroll:paychecks:update'),
  validate(idParamSchema, 'params'),
  validate(updatePaycheckSchema, 'body'),
  paycheckController.updatePaycheck
);

router.post(
  '/:id/void',
  requirePermission('payroll:paychecks:void'),
  validate(idParamSchema, 'params'),
  validate(voidPaycheckSchema, 'body'),
  paycheckController.voidPaycheck
);

router.post(
  '/:id/reissue',
  requirePermission('payroll:paychecks:update'),
  validate(idParamSchema, 'params'),
  validate(reissuePaycheckSchema, 'body'),
  paycheckController.reissuePaycheck
);

router.delete(
  '/:id',
  requirePermission('payroll:paychecks:delete'),
  validate(idParamSchema, 'params'),
  paycheckController.deletePaycheck
);

export default router;
