/**
 * Paylinq Pay Component Routes
 */

import express from 'express';
import payComponentController from '../controllers/payComponentController.js';
import { validate  } from '../../../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
// Accept proper camelCase field names per industry standards (Google, Microsoft, Stripe)
const createPayComponentSchema = Joi.object({
  componentCode: Joi.string().max(50).required(),
  componentName: Joi.string().max(100).required(),
  componentType: Joi.string().valid('earning', 'deduction', 'benefit', 'tax', 'reimbursement').required(),
  category: Joi.string().valid('regular', 'regular_pay', 'overtime', 'bonus', 'commission', 'allowance', 'tax', 'benefit', 'garnishment', 'loan', 'other').allow(null, ''),
  calculationType: Joi.string().valid('fixed', 'fixed_amount', 'percentage', 'hours_based', 'hourly_rate', 'formula', 'unit_based').required(),
  defaultAmount: Joi.number().allow(null),
  defaultRate: Joi.number().allow(null),
  formula: Joi.string().max(500).allow(null, ''),
  isTaxable: Joi.boolean().default(true),
  affectsTaxableIncome: Joi.boolean().default(true),
  isPreTax: Joi.boolean().default(false),
  isRecurring: Joi.boolean().default(true),
  isActive: Joi.boolean().default(true),
  appliesToOvertime: Joi.boolean().allow(null),
  appliesToGross: Joi.boolean().allow(null),
  description: Joi.string().max(500).allow(null, ''),
  metadata: Joi.object().allow(null),
});

const updatePayComponentSchema = Joi.object({
  componentCode: Joi.string().max(50),
  componentName: Joi.string().max(100),
  category: Joi.string().valid('regular', 'regular_pay', 'overtime', 'bonus', 'commission', 'allowance', 'tax', 'benefit', 'garnishment', 'loan', 'other').allow(null, ''),
  calculationType: Joi.string().valid('fixed', 'fixed_amount', 'percentage', 'hours_based', 'hourly_rate', 'formula', 'unit_based'),
  defaultAmount: Joi.number().allow(null),
  defaultRate: Joi.number().allow(null),
  formula: Joi.string().max(500).allow(null, ''),
  isTaxable: Joi.boolean(),
  affectsTaxableIncome: Joi.boolean(),
  isPreTax: Joi.boolean(),
  isRecurring: Joi.boolean(),
  isActive: Joi.boolean(),
  appliesToOvertime: Joi.boolean(),
  appliesToGross: Joi.boolean(),
  description: Joi.string().max(500).allow(null, ''),
  metadata: Joi.object().allow(null),
});

const createEmployeePayComponentSchema = Joi.object({
  payComponentId: Joi.string().uuid().required(),
  amount: Joi.number().allow(null),
  rate: Joi.number().allow(null),
  startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''),
  isActive: Joi.boolean().default(true),
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const employeeIdParamSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
});

const employeeComponentParamSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  id: Joi.string().uuid().required(),
});

// Global pay component routes
router.post('/', validate(createPayComponentSchema, 'body'), payComponentController.createPayComponent);
router.get('/', payComponentController.getPayComponents);
router.get('/:id', validate(idParamSchema, 'params'), payComponentController.getPayComponentById);
router.put('/:id', validate(idParamSchema, 'params'), validate(updatePayComponentSchema, 'body'), payComponentController.updatePayComponent);
router.delete('/:id', validate(idParamSchema, 'params'), payComponentController.deletePayComponent);

// Employee-specific pay component routes
router.post('/employees/:employeeId/pay-components', validate(employeeIdParamSchema, 'params'), validate(createEmployeePayComponentSchema, 'body'), payComponentController.createEmployeePayComponent);
router.get('/employees/:employeeId/pay-components', validate(employeeIdParamSchema, 'params'), payComponentController.getEmployeePayComponents);
router.put('/employees/:employeeId/pay-components/:id', validate(employeeComponentParamSchema, 'params'), validate(updatePayComponentSchema, 'body'), payComponentController.updateEmployeePayComponent);
router.delete('/employees/:employeeId/pay-components/:id', validate(employeeComponentParamSchema, 'params'), payComponentController.deleteEmployeePayComponent);

export default router;
