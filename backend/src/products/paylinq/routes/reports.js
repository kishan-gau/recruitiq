/**
 * Paylinq Reports Routes
 */

import express from 'express';
import reportsController from '../controllers/reportsController.js';
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
router.get('/payroll-summary', reportsController.getPayrollSummaryReport);
router.get('/employee-earnings', reportsController.getEmployeeEarningsReport);
router.get('/tax-liability', reportsController.getTaxLiabilityReport);
router.get('/time-attendance', reportsController.getTimeAttendanceReport);
router.get('/deductions', reportsController.getDeductionsReport);
router.get('/worker-type-distribution', reportsController.getWorkerTypeDistributionReport);

export default router;
