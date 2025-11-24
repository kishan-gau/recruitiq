/**
 * Paylinq Worker Type Routes
 * Handles worker type template management endpoints
 */

import express from 'express';
import workerTypeController from '../controllers/workerTypeController.js';
import { validate  } from '../../../middleware/validation.js';
import { createEndpointLimiter  } from '../../../middleware/rateLimit.js';
import { requirePermission } from '../../../middleware/auth.js';
import Joi from 'joi';

const router = express.Router();

// All routes require authentication

// Rate limiter for worker type operations
const workerTypeLimiter = createEndpointLimiter({
  endpoint: 'paylinq-worker-types',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many worker type requests. Please try again later.',
});

router.use(workerTypeLimiter);

// Validation schemas (matches service layer workerTypeTemplateSchema)
const createWorkerTypeSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  code: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(500).optional().allow(null, ''),
  defaultPayFrequency: Joi.string().valid('weekly', 'bi-weekly', 'semi-monthly', 'monthly').required(),
  defaultPaymentMethod: Joi.string().valid('ach', 'check', 'wire', 'cash').required(),
  benefitsEligible: Joi.boolean().optional().default(false),
  overtimeEligible: Joi.boolean().optional().default(true),
  ptoEligible: Joi.boolean().optional().default(false),
  sickLeaveEligible: Joi.boolean().optional().default(false),
  vacationAccrualRate: Joi.number().min(0).max(1).optional().allow(null)
});

const updateWorkerTypeSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  code: Joi.string().min(2).max(50).optional(),
  description: Joi.string().max(500).optional().allow(null, ''),
  defaultPayFrequency: Joi.string().valid('weekly', 'bi-weekly', 'semi-monthly', 'monthly').optional(),
  defaultPaymentMethod: Joi.string().valid('ach', 'check', 'wire', 'cash').optional(),
  benefitsEligible: Joi.boolean().optional(),
  overtimeEligible: Joi.boolean().optional(),
  ptoEligible: Joi.boolean().optional(),
  sickLeaveEligible: Joi.boolean().optional(),
  vacationAccrualRate: Joi.number().min(0).max(1).optional().allow(null)
}).min(1); // At least one field must be provided

const assignEmployeesSchema = Joi.object({
  employeeIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
});

const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

// Routes

// POST /api/paylinq/worker-types - Create worker type
router.post(
  '/',
  requirePermission('worker-types:create'),
  validate(createWorkerTypeSchema, 'body'),
  workerTypeController.createWorkerType
);

// GET /api/paylinq/worker-types - Get all worker types
router.get(
  '/',
  requirePermission('worker-types:read'),
  workerTypeController.getWorkerTypes
);

// GET /api/paylinq/worker-types/:id - Get worker type by ID
router.get(
  '/:id',
  requirePermission('worker-types:read'),
  validate(uuidParamSchema, 'params'),
  workerTypeController.getWorkerTypeById
);

// PUT /api/paylinq/worker-types/:id - Update worker type
router.put(
  '/:id',
  requirePermission('worker-types:update'),
  validate(uuidParamSchema, 'params'),
  validate(updateWorkerTypeSchema, 'body'),
  workerTypeController.updateWorkerType
);

// DELETE /api/paylinq/worker-types/:id - Delete worker type
router.delete(
  '/:id',
  requirePermission('worker-types:delete'),
  validate(uuidParamSchema, 'params'),
  workerTypeController.deleteWorkerType
);

// POST /api/paylinq/worker-types/:id/assign-employees - Assign employees
router.post(
  '/:id/assign-employees',
  requirePermission('worker-types:update'),
  validate(uuidParamSchema, 'params'),
  validate(assignEmployeesSchema, 'body'),
  workerTypeController.assignEmployees
);

// GET /api/paylinq/worker-types/:id/employees - Get worker type employees
router.get(
  '/:id/employees',
  requirePermission('worker-types:read'),
  validate(uuidParamSchema, 'params'),
  workerTypeController.getWorkerTypeEmployees
);

export default router;
