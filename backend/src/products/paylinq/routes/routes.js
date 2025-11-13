/**
 * Paylinq Routes Index
 * Combines all Paylinq product routes with middleware
 */

import express from 'express';
import { authenticateTenant, requireProductAccess } from '../../../middleware/auth.js';
import { requireOrganization } from '../../../middleware/requireOrganization.js';

// Import route modules
import dashboardRoutes from './dashboard.js';
import workerTypeRoutes from './workerTypes.js';
import workerRoutes from './workers.js';
import employeeRoutes from './employees.js';
import compensationRoutes from './compensation.js';
import payComponentRoutes from './payComponents.js';
import payStructureRoutes from './payStructures.js';
import formulaRoutes from './formulas.js';
import formulaTemplateRoutes from './formula-templates.js';
import timeAttendanceRoutes from './timeAttendance.js';
import timesheetRoutes from './timesheets.js';
import schedulingRoutes from './scheduling.js';
import payrollRunRoutes from './payrollRuns.js';
import payrollRunTypeRoutes from './payrollRunTypes.js';
import paycheckRoutes from './paychecks.js';
import deductionRoutes from './deductions.js';
import reconciliationRoutes from './reconciliation.js';
import taxRateRoutes from './taxRates.js';
import paymentRoutes from './payments.js';
import reportsRoutes from './reports.js';
import settingsRoutes from './settings.js';
import payslipTemplateRoutes from './payslipTemplates.js';
import temporalPatternRoutes from './temporalPatterns.js';

const router = express.Router();

// DEBUG: Log all incoming requests to PayLinQ routes
router.use((req, res, next) => {
  console.log('=== PayLinQ Route Debug ===');
  console.log('Path:', req.path);
  console.log('Method:', req.method);
  console.log('Cookies object:', req.cookies);
  console.log('Cookie keys:', Object.keys(req.cookies || {}));
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

export default router;
