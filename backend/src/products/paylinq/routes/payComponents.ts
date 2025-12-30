/**
 * Paylinq Pay Component Routes
 */

import express from 'express';
import payComponentController from '../controllers/payComponentController.js';
import * as forfaitRuleController from '../controllers/forfaitRuleController.js';
import { validate  } from '../../../middleware/validation.js';
import { requirePermission } from '../../../middleware/auth.js';
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
  customAmount: Joi.number().allow(null),
  customRate: Joi.number().allow(null),
  effectiveFrom: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  effectiveTo: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''),
  notes: Joi.string().max(500).allow(null, ''),
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

const createEmployeeComponentAssignmentSchema = Joi.object({
  componentId: Joi.string().uuid().required(),
  componentCode: Joi.string().max(50).optional(),
  effectiveFrom: Joi.string().isoDate().required(),
  effectiveTo: Joi.string().isoDate().allow(null, ''),
  configuration: Joi.object().optional(),
  overrideAmount: Joi.number().allow(null),
  overrideFormula: Joi.string().allow(null, ''),
  notes: Joi.string().max(500).allow(null, ''),
});

const updateEmployeeComponentAssignmentSchema = Joi.object({
  effectiveFrom: Joi.string().isoDate().optional(),
  effectiveTo: Joi.string().isoDate().allow(null, '').optional(),
  configuration: Joi.object().optional(),
  overrideAmount: Joi.number().allow(null).optional(),
  overrideFormula: Joi.string().allow(null, '').optional(),
  notes: Joi.string().max(500).allow(null, '').optional(),
}).min(1);

const assignmentIdParamSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  assignmentId: Joi.string().uuid().required(),
});

const componentCodeParamSchema = Joi.object({
  componentCode: Joi.string().max(50).required(),
});

const forfaitRuleSchema = Joi.object({
  enabled: Joi.boolean().required(),
  forfaitComponentCode: Joi.string().when('enabled', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  valueMapping: Joi.object().when('enabled', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  }).pattern(
    Joi.string(),
    Joi.object({
      sourceField: Joi.string().required(),
      targetField: Joi.string().required(),
      required: Joi.boolean().default(true)
    })
  ),
  conditions: Joi.object({
    minValue: Joi.number().optional(),
    maxValue: Joi.number().optional(),
    requiresApproval: Joi.boolean().default(false)
  }).optional(),
  description: Joi.string().max(500).optional()
});

const forfaitPreviewSchema = Joi.object({
  componentCode: Joi.string().max(50).required(),
  configuration: Joi.object().required()
});

// Global pay component routes
router.post(
  '/',
  requirePermission('payroll:components:create'),
  validate(createPayComponentSchema, 'body'),
  payComponentController.createPayComponent
);

router.get(
  '/',
  requirePermission('components:read'),
  payComponentController.getPayComponents
);

router.get(
  '/:id',
  requirePermission('components:read'),
  validate(idParamSchema, 'params'),
  payComponentController.getPayComponentById
);

router.put(
  '/:id',
  requirePermission('components:update'),
  validate(idParamSchema, 'params'),
  validate(updatePayComponentSchema, 'body'),
  payComponentController.updatePayComponent
);

router.delete(
  '/:id',
  requirePermission('payroll:components:delete'),
  validate(idParamSchema, 'params'),
  payComponentController.deletePayComponent
);

// Employee-specific pay component routes
router.post(
  '/employees/:employeeId/pay-components',
  requirePermission('payroll:components:create'),
  validate(employeeIdParamSchema, 'params'),
  validate(createEmployeePayComponentSchema, 'body'),
  payComponentController.createEmployeePayComponent
);

router.get(
  '/employees/:employeeId/pay-components',
  requirePermission('components:read'),
  validate(employeeIdParamSchema, 'params'),
  payComponentController.getEmployeePayComponents
);

router.put(
  '/employees/:employeeId/pay-components/:id',
  requirePermission('components:update'),
  validate(employeeComponentParamSchema, 'params'),
  validate(updatePayComponentSchema, 'body'),
  payComponentController.updateEmployeePayComponent
);

router.delete(
  '/employees/:employeeId/pay-components/:id',
  requirePermission('payroll:components:delete'),
  validate(employeeComponentParamSchema, 'params'),
  payComponentController.deleteEmployeePayComponent
);

// Employee Component Assignments (new rich assignment system)
router.post(
  '/employees/:employeeId/assignments',
  requirePermission('payroll:employee-components:create'),
  validate(employeeIdParamSchema, 'params'),
  validate(createEmployeeComponentAssignmentSchema, 'body'),
  payComponentController.assignComponentToEmployee
);

router.get(
  '/employees/:employeeId/assignments',
  requirePermission('payroll:employee-components:read'),
  validate(employeeIdParamSchema, 'params'),
  payComponentController.getEmployeeComponentAssignments
);

router.patch(
  '/employees/:employeeId/assignments/:assignmentId',
  requirePermission('payroll:employee-components:update'),
  validate(assignmentIdParamSchema, 'params'),
  validate(updateEmployeeComponentAssignmentSchema, 'body'),
  payComponentController.updateEmployeeComponentAssignment
);

router.delete(
  '/employees/:employeeId/assignments/:assignmentId',
  requirePermission('payroll:employee-components:delete'),
  validate(assignmentIdParamSchema, 'params'),
  payComponentController.removeEmployeeComponentAssignment
);

// Forfait rule management routes
router.get(
  '/forfait-rules/templates',
  requirePermission('components:read'),
  forfaitRuleController.getForfaitRuleTemplates
);

router.post(
  '/forfait-rules/preview',
  requirePermission('components:read'),
  validate(forfaitPreviewSchema, 'body'),
  forfaitRuleController.previewForfaitCalculation
);

router.put(
  '/:componentCode/forfait-rule',
  requirePermission('components:update'),
  validate(componentCodeParamSchema, 'params'),
  validate(forfaitRuleSchema, 'body'),
  forfaitRuleController.setForfaitRule
);

router.get(
  '/:componentCode/forfait-rule',
  requirePermission('components:read'),
  validate(componentCodeParamSchema, 'params'),
  forfaitRuleController.getForfaitRule
);

router.delete(
  '/:componentCode/forfait-rule',
  requirePermission('components:delete'),
  validate(componentCodeParamSchema, 'params'),
  forfaitRuleController.removeForfaitRule
);

export default router;
