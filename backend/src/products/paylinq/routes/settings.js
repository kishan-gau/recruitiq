/**
 * Paylinq Settings Routes
 * Company and payroll configuration endpoints
 */

import express from 'express';
import {
  getSettings,
  updateSettings,
  getCompanySettings,
  updateCompanySettings,
  getPayrollSettings,
  updatePayrollSettings,
} from '../controllers/settingsController.js';
import {
  getTaxRules,
  getTaxRule,
  createTaxRule,
  updateTaxRule,
  deleteTaxRule,
} from '../controllers/taxRulesController.js';

const router = express.Router();

// Get all settings (company + payroll)
router.get('/', getSettings);

// Update all settings
router.put('/', updateSettings);

// Company settings
router.get('/company', getCompanySettings);
router.put('/company', updateCompanySettings);

// Payroll settings
router.get('/payroll', getPayrollSettings);
router.put('/payroll', updatePayrollSettings);

// Tax rules
router.get('/tax-rules', getTaxRules);
router.get('/tax-rules/:id', getTaxRule);
router.post('/tax-rules', createTaxRule);
router.put('/tax-rules/:id', updateTaxRule);
router.delete('/tax-rules/:id', deleteTaxRule);

export default router;
