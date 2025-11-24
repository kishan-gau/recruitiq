/**
 * Paylinq Reports Routes
 */

import express from 'express';
import reportsController from '../controllers/reportsController.js';
import { requirePermission } from '../../../middleware/auth.js';
import { createEndpointLimiter  } from '../../../middleware/rateLimit.js';

const router = express.Router();

// Rate limiter for report generation (reports can be resource-intensive)
const reportsLimiter = createEndpointLimiter({
  endpoint: 'paylinq-reports',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Lower limit for resource-intensive operations
  message: 'Too many report requests. Please try again later.',
});

router.use(reportsLimiter);

// Routes
router.get('/payroll-summary', requirePermission('reports:read'), reportsController.getPayrollSummaryReport);
router.get('/employee-earnings', requirePermission('reports:read'), reportsController.getEmployeeEarningsReport);
router.get('/tax-liability', requirePermission('reports:read'), reportsController.getTaxLiabilityReport);
router.get('/time-attendance', requirePermission('reports:read'), reportsController.getTimeAttendanceReport);
router.get('/deductions', requirePermission('reports:read'), reportsController.getDeductionsReport);
router.get('/worker-type-distribution', requirePermission('reports:read'), reportsController.getWorkerTypeDistributionReport);

export default router;
