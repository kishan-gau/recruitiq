/**
 * Paylinq Tax Rate Routes
 */

import express from 'express';
import taxRateController from '../controllers/taxRateController.js';
import { validate  } from '../../../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
// Note: Date-only fields per TIMEZONE_ARCHITECTURE.md use YYYY-MM-DD format
const createTaxRuleSchema = Joi.object({
  taxType: Joi.string().valid('income_tax', 'social_security', 'medicare', 'state_tax', 'local_tax', 'other').required(),
  taxName: Joi.string().max(100).required(),
  jurisdiction: Joi.string().max(100).required(),
  taxCode: Joi.string().max(50).allow(null, ''),
  calculationMethod: Joi.string().valid('flat_rate', 'progressive', 'tiered', 'formula').required(),
  flatRate: Joi.number().min(0).max(100).allow(null),
  formula: Joi.string().max(500).allow(null, ''),
  effectiveDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''),
  isActive: Joi.boolean().default(true),
  metadata: Joi.object().allow(null),
});

const updateTaxRuleSchema = Joi.object({
  taxName: Joi.string().max(100),
  jurisdiction: Joi.string().max(100),
  taxCode: Joi.string().max(50).allow(null, ''),
  calculationMethod: Joi.string().valid('flat_rate', 'progressive', 'tiered', 'formula'),
  flatRate: Joi.number().min(0).max(100).allow(null),
  formula: Joi.string().max(500).allow(null, ''),
  effectiveDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
    'string.pattern.base': 'Effective date must be in YYYY-MM-DD format',
  }),
  endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''),
  isActive: Joi.boolean(),
  metadata: Joi.object().allow(null),
});

const createTaxBracketSchema = Joi.object({
  minIncome: Joi.number().min(0).required(),
  maxIncome: Joi.number().min(0).allow(null),
  rate: Joi.number().min(0).max(100).required(),
  flatAmount: Joi.number().min(0).default(0),
  bracketOrder: Joi.number().integer().min(1).required(),
});

const updateTaxBracketSchema = Joi.object({
  minIncome: Joi.number().min(0),
  maxIncome: Joi.number().min(0).allow(null),
  rate: Joi.number().min(0).max(100),
  flatAmount: Joi.number().min(0),
  bracketOrder: Joi.number().integer().min(1),
});

// Note: Pay period dates are date-only fields per TIMEZONE_ARCHITECTURE.md
const calculateTaxesSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  grossPay: Joi.number().min(0).required(),
  payPeriodStart: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Pay period start must be a valid date in YYYY-MM-DD format',
  }),
  payPeriodEnd: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Pay period end must be a valid date in YYYY-MM-DD format',
  }),
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const taxRuleIdParamSchema = Joi.object({
  taxRuleId: Joi.string().uuid().required(),
});

// Tax rule routes
router.post('/', validate(createTaxRuleSchema, 'body'), taxRateController.createTaxRule);
router.get('/', taxRateController.getTaxRules);
router.get('/:id', validate(idParamSchema, 'params'), taxRateController.getTaxRuleById);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateTaxRuleSchema, 'body'), taxRateController.updateTaxRule);
router.delete('/:id', validate(idParamSchema, 'params'), taxRateController.deleteTaxRule);

// Tax bracket routes
router.post('/:taxRuleId/brackets', validate(taxRuleIdParamSchema, 'params'), validate(createTaxBracketSchema, 'body'), taxRateController.createTaxBracket);
router.get('/:taxRuleId/brackets', validate(taxRuleIdParamSchema, 'params'), taxRateController.getTaxBrackets);
router.put('/brackets/:id', validate(idParamSchema, 'params'), validate(updateTaxBracketSchema, 'body'), taxRateController.updateTaxBracket);
router.delete('/brackets/:id', validate(idParamSchema, 'params'), taxRateController.deleteTaxBracket);

// Tax calculation routes
router.post('/calculations/calculate', validate(calculateTaxesSchema, 'body'), taxRateController.calculateTaxes);
router.post('/setup-suriname', taxRateController.setupSurinameTaxRules);

export default router;
