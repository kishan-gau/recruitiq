/**
 * Paylinq Workers Routes
 * Industry-standard alias for employee records
 * Handles all worker types: W-2 employees, 1099 contractors, etc.
 */

import express, { Router } from 'express';
import employeeRecordController from '../controllers/employeeRecordController.ts';
import { validate  } from '../../../middleware/validation.ts';
import { requirePermission } from '../../../middleware/auth.ts';
import { createEndpointLimiter  } from '../../../middleware/rateLimit.ts';
import Joi from 'joi';

const router: Router = express.Router();

// Note: Authentication (authenticateTenant, requireProductAccess, requireOrganization) 
// is already applied at parent router level in routes/routes.js

// Rate limiter
const workerLimiter = createEndpointLimiter({
  endpoint: 'paylinq-workers',
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many worker requests. Please try again later.',
});

router.use(workerLimiter);

// Validation schemas
const createWorkerSchema = Joi.object({
  hrisEmployeeId: Joi.string().required(),
  workerTypeId: Joi.string().uuid().allow(null),
  employeeNumber: Joi.string().max(50).allow(null, ''),
  firstName: Joi.string().max(100).required(),
  lastName: Joi.string().max(100).required(),
  email: Joi.string().email().max(255).required(),
  departmentId: Joi.string().uuid().allow(null),
  hireDate: Joi.string().isoDate().required(),
  status: Joi.string().valid('active', 'on_leave', 'terminated').default('active'),
  paymentMethod: Joi.string().valid('direct_deposit', 'check', 'cash').default('direct_deposit'),
  bankAccountNumber: Joi.string().max(50).allow(null, ''),
  bankRoutingNumber: Joi.string().max(50).allow(null, ''),
  taxInfo: Joi.object().allow(null),
  metadata: Joi.object().allow(null),
});

const updateWorkerSchema = Joi.object({
  workerTypeId: Joi.string().uuid().allow(null),
  employeeNumber: Joi.string().max(50).allow(null, ''),
  firstName: Joi.string().max(100),
  lastName: Joi.string().max(100),
  email: Joi.string().email().max(255),
  departmentId: Joi.string().uuid().allow(null),
  status: Joi.string().valid('active', 'on_leave', 'terminated'),
  paymentMethod: Joi.string().valid('direct_deposit', 'check', 'cash'),
  bankName: Joi.string().max(100).allow(null, ''),
  bankAccountNumber: Joi.string().max(50).allow(null, ''),
  bankRoutingNumber: Joi.string().max(50).allow(null, ''),
  taxInfo: Joi.object().allow(null),
  metadata: Joi.object().allow(null),
});

const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

// Routes - Using existing employeeRecordController

// POST /api/paylinq/workers - Create worker record
router.post(
  '/',
  requirePermission('payroll:employees:create'),
  validate(createWorkerSchema, 'body'),
  employeeRecordController.createEmployeeRecord
);

// GET /api/paylinq/workers - Get all worker records
router.get('/', requirePermission('payroll:employees:read'), employeeRecordController.getEmployeeRecords);

// GET /api/paylinq/workers/:id - Get worker record by ID
router.get(
  '/:id',
  requirePermission('payroll:employees:read'),
  validate(uuidParamSchema, 'params'),
  employeeRecordController.getEmployeeRecordById
);

// PUT /api/paylinq/workers/:id - Update worker record
router.put(
  '/:id',
  requirePermission('payroll:employees:update'),
  validate(uuidParamSchema, 'params'),
  validate(updateWorkerSchema, 'body'),
  employeeRecordController.updateEmployeeRecord
);

// DELETE /api/paylinq/workers/:id - Delete worker record
router.delete(
  '/:id',
  requirePermission('payroll:employees:delete'),
  validate(uuidParamSchema, 'params'),
  employeeRecordController.deleteEmployeeRecord
);

// GET /api/paylinq/workers/:id/history - Get payroll history
router.get(
  '/:id/history',
  requirePermission('payroll:employees:read'),
  validate(uuidParamSchema, 'params'),
  employeeRecordController.getEmployeePayrollHistory
);

export default router;
