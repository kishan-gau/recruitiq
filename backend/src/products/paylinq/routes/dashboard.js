/**
 * Paylinq Dashboard Routes
 */

import express from 'express';
import dashboardController from '../controllers/dashboardController.js';
import { createEndpointLimiter } from '../../../middleware/rateLimit.js';

const router = express.Router();

// Note: authenticateTenant and requireProductAccess are already applied at parent router level

// Rate limiter for dashboard endpoints
const dashboardLimiter = createEndpointLimiter({
  endpoint: 'paylinq-dashboard',
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Allow reasonable refresh frequency
  message: 'Too many dashboard requests. Please try again later.',
});

router.use(dashboardLimiter);

// Dashboard routes
router.get('/', dashboardController.getDashboardOverview);
router.get('/payroll-stats', dashboardController.getPayrollStats);
router.get('/employee-stats', dashboardController.getEmployeeStats);
router.get('/recent-activity', dashboardController.getRecentActivity);

export default router;
