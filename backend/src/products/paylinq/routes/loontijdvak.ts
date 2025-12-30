/**
 * Loontijdvak (Tax Period) Routes
 * 
 * Manages Dutch payroll tax periods for accurate tax calculations.
 * Loontijdvak periods define the timeframe used for progressive tax rate lookups.
 */

import express, { Router } from 'express';
import loontijdvakController from '../controllers/loontijdvakController.js';
import { requirePermission } from '../../../middleware/auth.js';
import { validate } from '../../../middleware/validation.js';
import Joi from 'joi';

const router: Router = express.Router();

// Validation schemas
const createLoontijdvakSchema = Joi.object({
  periodType: Joi.string()
    .valid('week', '4_weeks', 'month', 'quarter', 'year')
    .required()
    .messages({
      'any.only': 'Period type must be one of: week, 4_weeks, month, quarter, year'
    }),
  periodNumber: Joi.number()
    .integer()
    .min(1)
    .max(53)
    .required()
    .messages({
      'number.min': 'Period number must be at least 1',
      'number.max': 'Period number cannot exceed 53'
    }),
  year: Joi.number()
    .integer()
    .min(2020)
    .max(2100)
    .required()
    .messages({
      'number.min': 'Year must be 2020 or later',
      'number.max': 'Year cannot exceed 2100'
    }),
  startDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'Start date must be in YYYY-MM-DD format'
    }),
  endDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'End date must be in YYYY-MM-DD format'
    }),
  taxTableVersion: Joi.string()
    .max(50)
    .optional()
    .allow(null, ''),
  isActive: Joi.boolean()
    .default(true),
  metadata: Joi.object().optional().allow(null)
});

const updateLoontijdvakSchema = Joi.object({
  periodType: Joi.string()
    .valid('week', '4_weeks', 'month', 'quarter', 'year')
    .optional(),
  periodNumber: Joi.number()
    .integer()
    .min(1)
    .max(53)
    .optional(),
  startDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  taxTableVersion: Joi.string()
    .max(50)
    .optional()
    .allow(null, ''),
  isActive: Joi.boolean()
    .optional(),
  metadata: Joi.object().optional().allow(null)
}).min(1);

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const querySchema = Joi.object({
  year: Joi.number().integer().optional(),
  periodType: Joi.string()
    .valid('week', '4_weeks', 'month', 'quarter', 'year')
    .optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

const dateQuerySchema = Joi.object({
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'Date must be in YYYY-MM-DD format'
    }),
  periodType: Joi.string()
    .valid('week', '4_weeks', 'month', 'quarter', 'year')
    .optional()
});

const bulkCreateSchema = Joi.object({
  year: Joi.number()
    .integer()
    .min(2020)
    .max(2100)
    .required(),
  periodTypes: Joi.array()
    .items(Joi.string().valid('week', '4_weeks', 'month'))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one period type must be specified'
    })
});

// CRUD routes
router.post(
  '/',
  requirePermission('settings:update'),
  validate(createLoontijdvakSchema, 'body'),
  loontijdvakController.create
);

router.get(
  '/',
  requirePermission('settings:read'),
  validate(querySchema, 'query'),
  loontijdvakController.list
);

router.get(
  '/:id',
  requirePermission('settings:read'),
  validate(idParamSchema, 'params'),
  loontijdvakController.getById
);

router.put(
  '/:id',
  requirePermission('settings:update'),
  validate(idParamSchema, 'params'),
  validate(updateLoontijdvakSchema, 'body'),
  loontijdvakController.update
);

router.delete(
  '/:id',
  requirePermission('payroll:settings:delete'),
  validate(idParamSchema, 'params'),
  loontijdvakController.delete
);

// Utility routes
router.get(
  '/lookup/by-date',
  requirePermission('settings:read'),
  validate(dateQuerySchema, 'query'),
  loontijdvakController.findByDate
);

router.post(
  '/bulk/generate',
  requirePermission('settings:update'),
  validate(bulkCreateSchema, 'body'),
  loontijdvakController.bulkGenerate
);

router.get(
  '/validation/overlaps',
  requirePermission('settings:read'),
  loontijdvakController.checkOverlaps
);

export default router;
