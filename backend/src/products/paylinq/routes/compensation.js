/**
 * Paylinq Compensation Routes
 */

import express from 'express';
import compensationController from '../controllers/compensationController.js';
import { validate  } from '../../../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
// Note: Date-only fields per TIMEZONE_ARCHITECTURE.md use YYYY-MM-DD format
const createCompensationSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  compensationType: Joi.string().valid('hourly', 'salary', 'commission').required(),
  amount: Joi.number().min(0).required(),
  currency: Joi.string().length(3).default('SRD'),
  effectiveDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''),
  payFrequency: Joi.string().valid('weekly', 'bi_weekly', 'semi_monthly', 'monthly').required(),
  hoursPerWeek: Joi.number().min(0).max(168).allow(null),
  metadata: Joi.object().allow(null),
});

const updateCompensationSchema = Joi.object({
  compensationType: Joi.string().valid('hourly', 'salary', 'commission'),
  amount: Joi.number().min(0),
  currency: Joi.string().length(3),
  effectiveDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
    'string.pattern.base': 'Effective date must be in YYYY-MM-DD format',
  }),
  endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''),
  payFrequency: Joi.string().valid('weekly', 'bi_weekly', 'semi_monthly', 'monthly'),
  hoursPerWeek: Joi.number().min(0).max(168).allow(null),
  metadata: Joi.object().allow(null),
});

const employeeIdParamSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

// Routes
router.post('/', validate(createCompensationSchema, 'body'), compensationController.createCompensation);

// New API client compatible routes (employee singular)
router.get('/employee/:employeeId/current', validate(employeeIdParamSchema, 'params'), compensationController.getEmployeeCompensation);
router.get('/employee/:employeeId/history', validate(employeeIdParamSchema, 'params'), compensationController.getCompensationHistory);
router.get('/employee/:employeeId/summary', validate(employeeIdParamSchema, 'params'), compensationController.getCompensationSummary);
router.get('/employee/:employeeId', validate(employeeIdParamSchema, 'params'), compensationController.getEmployeeCompensation);

// Legacy routes (employees plural) - kept for backwards compatibility
router.get('/employees/:employeeId/compensation', validate(employeeIdParamSchema, 'params'), compensationController.getEmployeeCompensation);
router.get('/employees/:employeeId/compensation/history', validate(employeeIdParamSchema, 'params'), compensationController.getCompensationHistory);

router.get('/:id', validate(idParamSchema, 'params'), compensationController.getCompensationById);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateCompensationSchema, 'body'), compensationController.updateCompensation);
router.delete('/:id', validate(idParamSchema, 'params'), compensationController.deleteCompensation);

export default router;
