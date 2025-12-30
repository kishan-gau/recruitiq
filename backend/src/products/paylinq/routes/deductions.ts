/**
 * Paylinq Deduction Routes
 */

import express, { Router } from 'express';
import deductionController from '../controllers/deductionController.js';
import { validate  } from '../../../middleware/validation.js';
import { requirePermission } from '../../../middleware/auth.js';
import Joi from 'joi';

const router: Router = express.Router();

// Validation schemas
// Note: Date-only fields per TIMEZONE_ARCHITECTURE.md use YYYY-MM-DD format
// Note: Database constraint allows: benefit, garnishment, loan, union_dues, pension, insurance, other
const createDeductionSchema = Joi.object({
  employeeRecordId: Joi.string().uuid().required(), // Changed from employeeId to match DB field
  deductionType: Joi.string().valid('benefit', 'garnishment', 'loan', 'union_dues', 'pension', 'insurance', 'other').required(),
  deductionCode: Joi.string().max(50).optional(), // Optional - auto-generated if missing
  deductionName: Joi.string().max(100).optional(), // Optional - auto-generated if missing
  calculationType: Joi.string().valid('fixed_amount', 'percentage', 'tiered').optional(), // Optional - defaults to fixed_amount
  deductionAmount: Joi.number().min(0).when('calculationType', { // Changed from amount to deductionAmount
    is: 'fixed_amount',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  deductionPercentage: Joi.number().min(0).max(100).when('calculationType', {
    is: 'percentage',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  frequency: Joi.string().valid('per_payroll', 'weekly', 'biweekly', 'semimonthly', 'monthly', 'annually').default('per_payroll'),
  effectiveFrom: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(), // Changed from startDate to effectiveFrom
  effectiveTo: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''), // Changed from endDate to effectiveTo
  maxPerPayroll: Joi.number().min(0).allow(null), // Changed from maxAmount to maxPerPayroll
  maxAnnual: Joi.number().min(0).allow(null),
  isPreTax: Joi.boolean().default(false),
  isRecurring: Joi.boolean().default(true),
  isActive: Joi.boolean().default(true), // Changed from status to isActive
  priority: Joi.number().integer().min(1).default(1),
  notes: Joi.string().max(500).allow(null, ''), // Changed from metadata to notes
});

const updateDeductionSchema = Joi.object({
  deductionType: Joi.string().valid('benefit', 'garnishment', 'loan', 'union_dues', 'pension', 'insurance', 'other'),
  deductionCode: Joi.string().max(50),
  deductionName: Joi.string().max(100),
  calculationType: Joi.string().valid('fixed_amount', 'percentage', 'tiered'),
  deductionAmount: Joi.number().min(0),
  deductionPercentage: Joi.number().min(0).max(100),
  frequency: Joi.string().valid('per_payroll', 'weekly', 'biweekly', 'semimonthly', 'monthly', 'annually'),
  effectiveFrom: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
    'string.pattern.base': 'Effective from date must be in YYYY-MM-DD format',
  }),
  effectiveTo: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''),
  maxPerPayroll: Joi.number().min(0).allow(null),
  maxAnnual: Joi.number().min(0).allow(null),
  isPreTax: Joi.boolean(),
  isRecurring: Joi.boolean(),
  isActive: Joi.boolean(),
  priority: Joi.number().integer().min(1),
  notes: Joi.string().max(500).allow(null, ''),
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const employeeIdParamSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
});

// Routes
router.post(
  '/',
  requirePermission('deductions:create'),
  validate(createDeductionSchema, 'body'),
  deductionController.createDeduction
);

router.get(
  '/',
  requirePermission('deductions:read'),
  deductionController.getDeductions
);

router.get(
  '/employees/:employeeId/deductions',
  requirePermission('deductions:read'),
  validate(employeeIdParamSchema, 'params'),
  deductionController.getEmployeeDeductions
);

router.get(
  '/:id',
  requirePermission('deductions:read'),
  validate(idParamSchema, 'params'),
  deductionController.getDeductionById
);

router.put(
  '/:id',
  requirePermission('deductions:update'),
  validate(idParamSchema, 'params'),
  validate(updateDeductionSchema, 'body'),
  deductionController.updateDeduction
);

router.delete(
  '/:id',
  requirePermission('deductions:delete'),
  validate(idParamSchema, 'params'),
  deductionController.deleteDeduction
);

export default router;
