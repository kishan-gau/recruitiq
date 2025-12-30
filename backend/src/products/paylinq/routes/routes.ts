/**
 * Paylinq Routes Index
 * Combines all Paylinq product routes with middleware
 */

import express, { Router } from 'express';
import { authenticateTenant, requireProductAccess } from '../../../middleware/auth.ts';
import { requireOrganization } from '../../../middleware/requireOrganization.ts';

// Import route modules
import dashboardRoutes from './dashboard.ts';
import workerTypeRoutes from './workerTypes.ts';
import workerRoutes from './workers.ts';
import employeeRoutes from './employees.ts';
import compensationRoutes from './compensation.ts';
import payComponentRoutes from './payComponents.ts';
import payStructureRoutes from './payStructures.ts';
import formulaRoutes from './formulas.ts';
import formulaTemplateRoutes from './formula-templates.ts';
import timeAttendanceRoutes from './timeAttendance.ts';
import timesheetRoutes from './timesheets.ts';
import schedulingRoutes from './scheduling.ts';
import payrollRunRoutes from './payrollRuns.ts';
import payrollRunTypeRoutes from './payrollRunTypes.ts';
import paycheckRoutes from './paychecks.ts';
import deductionRoutes from './deductions.ts';
import reconciliationRoutes from './reconciliation.ts';
import taxRateRoutes from './taxRates.ts';
import paymentRoutes from './payments.ts';
import reportsRoutes from './reports.ts';
import settingsRoutes from './settings.ts';
import payslipTemplateRoutes from './payslipTemplates.ts';
import temporalPatternRoutes from './temporalPatterns.ts';
import currencyRoutes from './currency.ts';
import approvalRoutes from './approvals.ts';
import loontijdvakRoutes from './loontijdvak.ts';
import rbacRoutes from './rbac.ts';

const router: Router = express.Router();

// DEBUG: Log all incoming requests to PayLinQ routes
router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('=== PayLinQ Route Debug ===');
    console.log('Path:', req.path);
    console.log('Method:', req.method);
    console.log('Cookies object:', req.cookies);
    console.log('Cookie keys:', Object.keys(req.cookies || {}));
  }
  console.log('Signed cookies:', req.signedCookies);
  console.log('Raw cookie header:', req.headers.cookie);
  console.log('=========================');
  next();
});

// All Paylinq routes require tenant authentication with PayLinQ product access
// Uses httpOnly cookies for authentication
router.use(authenticateTenant);
router.use(requireProductAccess('paylinq'));
router.use(requireOrganization);

// Mount route modules
router.use('/dashboard', dashboardRoutes);
router.use('/worker-types', workerTypeRoutes);
router.use('/workers', workerRoutes); // Industry-standard alias for employees
router.use('/employees', employeeRoutes); // Legacy support
router.use('/compensation', compensationRoutes);
router.use('/pay-components', payComponentRoutes);
router.use('/pay-structures', payStructureRoutes);
router.use('/formulas', formulaRoutes);
router.use('/formula-templates', formulaTemplateRoutes);
router.use('/time-attendance', timeAttendanceRoutes);
router.use('/timesheets', timesheetRoutes);
router.use('/schedules', schedulingRoutes);
router.use('/payroll-runs', payrollRunRoutes);
router.use('/payroll-run-types', payrollRunTypeRoutes);
router.use('/paychecks', paycheckRoutes);
router.use('/deductions', deductionRoutes);
router.use('/reconciliations', reconciliationRoutes);
router.use('/tax-rules', taxRateRoutes);
router.use('/payments', paymentRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);
router.use('/payslip-templates', payslipTemplateRoutes);
router.use('/patterns', temporalPatternRoutes);
router.use('/currency', currencyRoutes); // Config, conversion, cache
router.use('/exchange-rates', currencyRoutes); // Exchange rates CRUD
router.use('/approvals', approvalRoutes);
router.use('/loontijdvak', loontijdvakRoutes); // Dutch tax period management
router.use('/rbac', rbacRoutes); // Roles & permissions management

export default router;
