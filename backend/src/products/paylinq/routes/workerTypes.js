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
  payStructureTemplateCode: Joi.string().max(50).optional().allow(null, ''),
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

// Template inclusion validation schemas
const createInclusionSchema = Joi.object({
  componentType: Joi.string().valid('allowance', 'deduction', 'earning').required(),
  componentId: Joi.string().uuid().required(),
  isRequired: Joi.boolean().optional().default(false),
  isEditable: Joi.boolean().optional().default(true),
  defaultValue: Joi.alternatives().try(
    Joi.number(),
    Joi.object()
  ).optional().allow(null),
  displayOrder: Joi.number().integer().min(0).optional().allow(null)
});

const updateInclusionSchema = Joi.object({
  isRequired: Joi.boolean().optional(),
  isEditable: Joi.boolean().optional(),
  defaultValue: Joi.alternatives().try(
    Joi.number(),
    Joi.object()
  ).optional().allow(null),
  displayOrder: Joi.number().integer().min(0).optional().allow(null)
}).min(1);

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

// Template Inclusion Routes

// GET /api/paylinq/worker-types/:id/inclusions - Get all inclusions for template
router.get(
  '/:id/inclusions',
  requirePermission('worker-types:read'),
  validate(uuidParamSchema, 'params'),
  workerTypeController.getTemplateInclusions
);

// POST /api/paylinq/worker-types/:id/inclusions - Add inclusion to template
router.post(
  '/:id/inclusions',
  requirePermission('worker-types:update'),
  validate(uuidParamSchema, 'params'),
  validate(createInclusionSchema, 'body'),
  workerTypeController.addTemplateInclusion
);

// PUT /api/paylinq/worker-types/:id/inclusions/:inclusionId - Update inclusion
router.put(
  '/:id/inclusions/:inclusionId',
  requirePermission('worker-types:update'),
  validate(Joi.object({
    id: Joi.string().uuid().required(),
    inclusionId: Joi.string().uuid().required()
  }), 'params'),
  validate(updateInclusionSchema, 'body'),
  workerTypeController.updateTemplateInclusion
);

// DELETE /api/paylinq/worker-types/:id/inclusions/:inclusionId - Remove inclusion
router.delete(
  '/:id/inclusions/:inclusionId',
  requirePermission('worker-types:update'),
  validate(Joi.object({
    id: Joi.string().uuid().required(),
    inclusionId: Joi.string().uuid().required()
  }), 'params'),
  workerTypeController.removeTemplateInclusion
);

// Pay Structure Template Upgrade Routes

// GET /api/products/paylinq/worker-types/:id/upgrade-status - Get upgrade status
router.get(
  '/:id/upgrade-status',
  requirePermission('worker-types:read'),
  validate(uuidParamSchema, 'params'),
  workerTypeController.getUpgradeStatus
);

// GET /api/products/paylinq/worker-types/:id/preview-upgrade - Preview template upgrade
router.get(
  '/:id/preview-upgrade',
  requirePermission('worker-types:read'),
  validate(uuidParamSchema, 'params'),
  workerTypeController.previewUpgrade
);

// POST /api/products/paylinq/worker-types/:id/upgrade-workers - Upgrade workers to template
router.post(
  '/:id/upgrade-workers',
  requirePermission('worker-types:update'),
  validate(uuidParamSchema, 'params'),
  validate(Joi.object({
    workerIds: Joi.array().items(Joi.string().uuid()).optional().allow(null),
    effectiveDate: Joi.date().optional().allow(null)
  }), 'body'),
  workerTypeController.upgradeWorkers
);

export default router;
