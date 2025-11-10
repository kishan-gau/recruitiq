/**
 * Paylinq Worker Type Routes
 * Handles worker type template management endpoints
 */

import express from 'express';
import workerTypeController from '../controllers/workerTypeController.js';
import { validate  } from '../../../middleware/validation.js';
import { createEndpointLimiter  } from '../../../middleware/rateLimit.js';
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

// Validation schemas
const createWorkerTypeSchema = Joi.object({
  code: Joi.string().max(50).required(),
  name: Joi.string().max(100).required(),
  description: Joi.string().max(500).allow(null, ''),
  payType: Joi.string().valid('hourly', 'salary', 'commission', 'piece_rate').required(),
  defaultRate: Joi.number().min(0).allow(null),
  overtimeEligible: Joi.boolean().default(true),
  overtimeMultiplier: Joi.number().min(1).default(1.5),
  benefits: Joi.object().allow(null),
  taxSettings: Joi.object().allow(null),
  isActive: Joi.boolean().default(true),
});

const updateWorkerTypeSchema = Joi.object({
  code: Joi.string().max(50),
  name: Joi.string().max(100),
  description: Joi.string().max(500).allow(null, ''),
  payType: Joi.string().valid('hourly', 'salary', 'commission', 'piece_rate'),
  defaultRate: Joi.number().min(0).allow(null),
  overtimeEligible: Joi.boolean(),
  overtimeMultiplier: Joi.number().min(1),
  benefits: Joi.object().allow(null),
  taxSettings: Joi.object().allow(null),
  isActive: Joi.boolean(),
});

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
  validate(createWorkerTypeSchema, 'body'),
  workerTypeController.createWorkerType
);

// GET /api/paylinq/worker-types - Get all worker types
router.get('/', workerTypeController.getWorkerTypes);

// GET /api/paylinq/worker-types/:id - Get worker type by ID
router.get(
  '/:id',
  validate(uuidParamSchema, 'params'),
  workerTypeController.getWorkerTypeById
);

// PUT /api/paylinq/worker-types/:id - Update worker type
router.put(
  '/:id',
  validate(uuidParamSchema, 'params'),
  validate(updateWorkerTypeSchema, 'body'),
  workerTypeController.updateWorkerType
);

// DELETE /api/paylinq/worker-types/:id - Delete worker type
router.delete(
  '/:id',
  validate(uuidParamSchema, 'params'),
  workerTypeController.deleteWorkerType
);

// POST /api/paylinq/worker-types/:id/assign-employees - Assign employees
router.post(
  '/:id/assign-employees',
  validate(uuidParamSchema, 'params'),
  validate(assignEmployeesSchema, 'body'),
  workerTypeController.assignEmployees
);

// GET /api/paylinq/worker-types/:id/employees - Get worker type employees
router.get(
  '/:id/employees',
  validate(uuidParamSchema, 'params'),
  workerTypeController.getWorkerTypeEmployees
);

export default router;
