/**
 * Paylinq Dashboard Routes
 */

import express, { Router } from 'express';
import dashboardController from '../controllers/dashboardController.ts';
import { requirePermission } from '../../../middleware/auth.ts';
import { createEndpointLimiter } from '../../../middleware/rateLimit.ts';

const router: Router = express.Router();

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
router.get('/', requirePermission('dashboard:read'), dashboardController.getDashboardOverview);
router.get('/payroll-stats', requirePermission('dashboard:read'), dashboardController.getPayrollStats);
router.get('/employee-stats', requirePermission('dashboard:read'), dashboardController.getEmployeeStats);
router.get('/recent-activity', requirePermission('dashboard:read'), dashboardController.getRecentActivity);

export default router;
