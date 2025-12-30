/**
 * Paylinq Employee Record Routes
 * Handles employee payroll record endpoints
 */

import express from 'express';
import employeeRecordController from '../controllers/employeeRecordController.js';
import userAccessController from '../controllers/userAccessController.js';
import payComponentController from '../controllers/payComponentController.js';
import { validate  } from '../../../middleware/validation.js';
import { requirePermission } from '../../../middleware/auth.js';
import { createEndpointLimiter  } from '../../../middleware/rateLimit.js';
import Joi from 'joi';

const router = express.Router();

// All routes require authentication

// Rate limiter
const employeeLimiter = createEndpointLimiter({
  endpoint: 'paylinq-employees',
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many employee requests. Please try again later.',
});

router.use(employeeLimiter);

// Validation schemas
const createEmployeeSchema = Joi.object({
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

const updateEmployeeSchema = Joi.object({
  workerTypeId: Joi.string().uuid().allow(null),
  employeeNumber: Joi.string().max(50).allow(null, ''),
  firstName: Joi.string().max(100),
  lastName: Joi.string().max(100),
  email: Joi.string().email().max(255),
  departmentId: Joi.string().uuid().allow(null),
  status: Joi.string().valid('active', 'on_leave', 'terminated'),
  paymentMethod: Joi.string().valid('direct_deposit', 'check', 'cash'),
  bankAccountNumber: Joi.string().max(50).allow(null, ''),
  bankRoutingNumber: Joi.string().max(50).allow(null, ''),
  taxInfo: Joi.object().allow(null),
  metadata: Joi.object().allow(null),
});

const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const grantAccessSchema = Joi.object({
  password: Joi.string().min(8).optional(),
  preferences: Joi.object().optional(),
});

const updateAccessSchema = Joi.object({
  email: Joi.string().email().optional(),
  password: Joi.string().min(8).optional(),
  accountStatus: Joi.string().valid('active', 'inactive', 'locked', 'pending_activation').optional(),
  isActive: Joi.boolean().optional(),
  preferences: Joi.object().optional(),
});

// Routes

// POST /api/paylinq/employees - Create employee record
router.post(
  '/',
  requirePermission('payroll:employees:create'),
  validate(createEmployeeSchema, 'body'),
  employeeRecordController.createEmployeeRecord
);

// GET /api/paylinq/employees - Get all employee records
router.get('/', requirePermission('payroll:employees:read'), employeeRecordController.getEmployeeRecords);

// GET /api/paylinq/employees/:id - Get employee record by ID
router.get(
  '/:id',
  requirePermission('payroll:employees:read'),
  validate(uuidParamSchema, 'params'),
  employeeRecordController.getEmployeeRecordById
);

// PUT /api/paylinq/employees/:id - Update employee record
router.put(
  '/:id',
  requirePermission('payroll:employees:update'),
  validate(uuidParamSchema, 'params'),
  validate(updateEmployeeSchema, 'body'),
  employeeRecordController.updateEmployeeRecord
);

// DELETE /api/paylinq/employees/:id - Delete employee record
router.delete(
  '/:id',
  requirePermission('payroll:employees:delete'),
  validate(uuidParamSchema, 'params'),
  employeeRecordController.deleteEmployeeRecord
);

// GET /api/paylinq/employees/:id/history - Get payroll history
router.get(
  '/:id/history',
  requirePermission('payroll:employees:read'),
  validate(uuidParamSchema, 'params'),
  employeeRecordController.getEmployeePayrollHistory
);

// GET /api/paylinq/employees/:id/assignments - Get employee pay component assignments
router.get(
  '/:id/assignments',
  requirePermission('payroll:employees:read'),
  (req, res, next) => {
    // Map :id to :employeeId for the controller
    req.params.employeeId = req.params.id;
    next();
  },
  payComponentController.getEmployeeComponentAssignments
);

// ==================== USER ACCESS MANAGEMENT ====================

// POST /api/paylinq/employees/:employeeId/grant-access - Grant system access to employee
router.post(
  '/:employeeId/grant-access',
  requirePermission('payroll:employees:manage_access'),
  validate({ employeeId: Joi.string().uuid().required() }, 'params'),
  validate(grantAccessSchema, 'body'),
  userAccessController.grantAccess
);

// GET /api/paylinq/employees/:employeeId/user-account - Get user account status
router.get(
  '/:employeeId/user-account',
  requirePermission('payroll:employees:read'),
  validate({ employeeId: Joi.string().uuid().required() }, 'params'),
  userAccessController.getUserAccount
);

// DELETE /api/paylinq/employees/:employeeId/revoke-access - Revoke system access
router.delete(
  '/:employeeId/revoke-access',
  requirePermission('payroll:employees:manage_access'),
  validate({ employeeId: Joi.string().uuid().required() }, 'params'),
  userAccessController.revokeAccess
);

// PATCH /api/paylinq/employees/:employeeId/user-access - Update user access settings
router.patch(
  '/:employeeId/user-access',
  requirePermission('payroll:employees:manage_access'),
  validate({ employeeId: Joi.string().uuid().required() }, 'params'),
  validate(updateAccessSchema, 'body'),
  userAccessController.updateAccess
);

export default router;
