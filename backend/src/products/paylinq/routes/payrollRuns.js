/**
 * Paylinq Payroll Run Routes
 */

import express from 'express';
import payrollRunController from '../controllers/payrollRunController.js';
import { validate  } from '../../../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

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
router.post('/', validate(createPayrollRunSchema, 'body'), payrollRunController.createPayrollRun);
router.get('/', payrollRunController.getPayrollRuns);
router.get('/:id', validate(idParamSchema, 'params'), payrollRunController.getPayrollRunById);
router.post('/:id/calculate', validate(idParamSchema, 'params'), validate(calculatePayrollSchema, 'body'), payrollRunController.calculatePayroll);
router.post('/:id/mark-for-review', validate(idParamSchema, 'params'), payrollRunController.markPayrollRunForReview);
router.post('/:id/process', validate(idParamSchema, 'params'), payrollRunController.processPayrollRun);
router.post('/:id/approve', validate(idParamSchema, 'params'), payrollRunController.approvePayrollRun);
router.post('/:id/cancel', validate(idParamSchema, 'params'), payrollRunController.cancelPayrollRun);
router.post('/:id/send-payslips', validate(idParamSchema, 'params'), payrollRunController.sendPayslips);
router.put('/:id', validate(idParamSchema, 'params'), validate(updatePayrollRunSchema, 'body'), payrollRunController.updatePayrollRun);
router.post('/:id/finalize', validate(idParamSchema, 'params'), payrollRunController.finalizePayrollRun);
router.delete('/:id', validate(idParamSchema, 'params'), payrollRunController.deletePayrollRun);
router.get('/:id/paychecks', validate(idParamSchema, 'params'), payrollRunController.getPayrollRunPaychecks);

export default router;
