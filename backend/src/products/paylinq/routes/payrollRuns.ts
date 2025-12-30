/**
 * Paylinq Payroll Run Routes
 */

import express, { Router } from 'express';
import payrollRunController from '../controllers/payrollRunController.js';
import { validate  } from '../../../middleware/validation.js';
import { requirePermission } from '../../../middleware/auth.js';
import Joi from 'joi';

const router: Router = express.Router();

// Validation schemas
// Note: Pay period dates are date-only fields per TIMEZONE_ARCHITECTURE.md
// Updated to include runType field for dynamic payroll run type selection
// They should be YYYY-MM-DD format strings, not full ISO 8601 timestamps
const createPayrollRunSchema = Joi.object({
  payrollName: Joi.string().required().messages({
    'string.empty': 'Payroll name is required',
    'any.required': 'Payroll name is required',
  }),
  periodStart: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Period start must be a valid date in YYYY-MM-DD format',
    'any.required': 'Period start date is required',
  }),
  periodEnd: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Period end must be a valid date in YYYY-MM-DD format',
    'any.required': 'Period end date is required',
  }),
  paymentDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Payment date must be a valid date in YYYY-MM-DD format',
    'any.required': 'Payment date is required',
  }),
  runType: Joi.string().optional().default('REGULAR').messages({
    'string.empty': 'Run type cannot be empty',
  }),
  status: Joi.string().valid('draft', 'calculating', 'calculated', 'approved', 'processing', 'processed', 'cancelled').default('draft'),
});

const updatePayrollRunSchema = Joi.object({
  payrollName: Joi.string().messages({
    'string.empty': 'Payroll name cannot be empty',
  }),
  periodStart: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
    'string.pattern.base': 'Period start must be a valid date in YYYY-MM-DD format',
  }),
  periodEnd: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
    'string.pattern.base': 'Period end must be a valid date in YYYY-MM-DD format',
  }),
  paymentDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
    'string.pattern.base': 'Payment date must be a valid date in YYYY-MM-DD format',
  }),
  status: Joi.string().valid('draft', 'calculating', 'calculated', 'approved', 'processing', 'processed', 'cancelled'),
});

const calculatePayrollSchema = Joi.object({
  includeEmployees: Joi.array().items(Joi.string().uuid()).allow(null),
  excludeEmployees: Joi.array().items(Joi.string().uuid()).allow(null),
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

// Routes
// View operations - require 'payroll:run:view'
router.get('/', requirePermission('payroll:read'), payrollRunController.getPayrollRuns);
router.get('/:id', requirePermission('payroll:read'), validate(idParamSchema, 'params'), payrollRunController.getPayrollRunById);
router.get('/:id/paychecks', requirePermission('payroll:read'), validate(idParamSchema, 'params'), payrollRunController.getPayrollRunPaychecks);

// Create operations - require 'payroll:run:create'
router.post('/', requirePermission('payroll:run:create'), validate(createPayrollRunSchema, 'body'), payrollRunController.createPayrollRun);

// Edit operations - require 'payroll:run:edit'
router.put('/:id', requirePermission('payroll:update'), validate(idParamSchema, 'params'), validate(updatePayrollRunSchema, 'body'), payrollRunController.updatePayrollRun);

// Calculate/Review operations - require 'payroll:run:edit'
router.post('/:id/calculate', requirePermission('payroll:update'), validate(idParamSchema, 'params'), validate(calculatePayrollSchema, 'body'), payrollRunController.calculatePayroll);
router.post('/:id/mark-for-review', requirePermission('payroll:update'), validate(idParamSchema, 'params'), payrollRunController.markPayrollRunForReview);

// Approve operations - require 'payroll:run:approve'
router.post('/:id/approve', requirePermission('payroll:run:approve'), validate(idParamSchema, 'params'), payrollRunController.approvePayrollRun);
router.post('/:id/finalize', requirePermission('payroll:run:approve'), validate(idParamSchema, 'params'), payrollRunController.finalizePayrollRun);

// Process operations - require 'payroll:run:process'
router.post('/:id/process', requirePermission('payroll:run:process'), validate(idParamSchema, 'params'), payrollRunController.processPayrollRun);
router.post('/:id/send-payslips', requirePermission('payroll:run:process'), validate(idParamSchema, 'params'), payrollRunController.sendPayslips);

// Cancel/Delete operations - require 'payroll:run:delete'
router.post('/:id/cancel', requirePermission('payroll:run:delete'), validate(idParamSchema, 'params'), payrollRunController.cancelPayrollRun);
router.delete('/:id', requirePermission('payroll:run:delete'), validate(idParamSchema, 'params'), payrollRunController.deletePayrollRun);

export default router;
