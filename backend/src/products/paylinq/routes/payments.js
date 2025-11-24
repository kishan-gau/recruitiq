/**
 * Paylinq Payment Routes
 */

import express from 'express';
import paymentController from '../controllers/paymentController.js';
import { requirePermission } from '../../../middleware/auth.js';
import { validate  } from '../../../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
// Note: Date-only fields per TIMEZONE_ARCHITECTURE.md use YYYY-MM-DD format
const createPaymentSchema = Joi.object({
  paycheckId: Joi.string().uuid().required(),
  employeeId: Joi.string().uuid().required(),
  amount: Joi.number().min(0).required(),
  paymentMethod: Joi.string().valid('direct_deposit', 'check', 'cash', 'wire_transfer').required(),
  paymentDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  bankAccountNumber: Joi.string().max(50).allow(null, ''),
  bankRoutingNumber: Joi.string().max(50).allow(null, ''),
  checkNumber: Joi.string().max(50).allow(null, ''),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'cancelled').default('pending'),
  metadata: Joi.object().allow(null),
});

const updatePaymentSchema = Joi.object({
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed', 'cancelled'),
  paymentDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
    'string.pattern.base': 'Payment date must be in YYYY-MM-DD format',
  }),
  confirmationNumber: Joi.string().max(100).allow(null, ''),
  errorMessage: Joi.string().max(500).allow(null, ''),
  metadata: Joi.object().allow(null),
});

const cancelPaymentSchema = Joi.object({
  reason: Joi.string().max(500).required(),
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const employeeIdParamSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
});

// Routes
router.post('/', requirePermission('payroll:payments:create'), validate(createPaymentSchema, 'body'), paymentController.createPayment);
router.get('/', requirePermission('payments:read'), paymentController.getPayments);
router.get('/pending', requirePermission('payments:read'), paymentController.getPendingPayments);
router.get('/:id', requirePermission('payments:read'), validate(idParamSchema, 'params'), paymentController.getPaymentById);
router.get('/employees/:employeeId/payments', requirePermission('payments:read'), validate(employeeIdParamSchema, 'params'), paymentController.getEmployeePayments);
router.put('/:id', requirePermission('payments:update'), validate(idParamSchema, 'params'), validate(updatePaymentSchema, 'body'), paymentController.updatePayment);
router.post('/:id/process', requirePermission('payroll:payments:process'), validate(idParamSchema, 'params'), paymentController.processPayment);
router.post('/:id/retry', requirePermission('payroll:payments:process'), validate(idParamSchema, 'params'), paymentController.retryPayment);
router.post('/:id/cancel', requirePermission('payments:update'), validate(idParamSchema, 'params'), validate(cancelPaymentSchema, 'body'), paymentController.cancelPayment);
router.delete('/:id', requirePermission('payroll:payments:delete'), validate(idParamSchema, 'params'), paymentController.deletePayment);

export default router;
