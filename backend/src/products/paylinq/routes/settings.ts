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
import payPeriodController from '../controllers/payPeriodController.js';
import { requirePermission } from '../../../middleware/auth.js';

const router = express.Router();

// Get all settings (company + payroll)
router.get('/', requirePermission('settings:read'), getSettings);

// Update all settings
router.put('/', requirePermission('settings:update'), updateSettings);

// Company settings
router.get('/company', requirePermission('settings:read'), getCompanySettings);
router.put('/company', requirePermission('settings:update'), updateCompanySettings);

// Payroll settings
router.get('/payroll', requirePermission('settings:read'), getPayrollSettings);
router.put('/payroll', requirePermission('settings:update'), updatePayrollSettings);

// Pay Period Configuration
router.get('/pay-period-config', requirePermission('settings:read'), payPeriodController.getPayPeriodConfig);
router.put('/pay-period-config', requirePermission('settings:update'), payPeriodController.savePayPeriodConfig);
router.get('/pay-period/current', requirePermission('settings:read'), payPeriodController.getCurrentPayPeriod);
router.get('/pay-period/next', requirePermission('settings:read'), payPeriodController.getNextPayPeriod);

// Company Holidays
router.get('/holidays', requirePermission('settings:read'), payPeriodController.getHolidays);
router.post('/holidays', requirePermission('settings:update'), payPeriodController.createHoliday);
router.delete('/holidays/:id', requirePermission('payroll:settings:delete'), payPeriodController.deleteHoliday);

// Tax rules
router.get('/tax-rules', requirePermission('settings:read'), getTaxRules);
router.get('/tax-rules/:id', requirePermission('settings:read'), getTaxRule);
router.post('/tax-rules', requirePermission('settings:update'), createTaxRule);
router.put('/tax-rules/:id', requirePermission('settings:update'), updateTaxRule);
router.delete('/tax-rules/:id', requirePermission('payroll:settings:delete'), deleteTaxRule);

export default router;
