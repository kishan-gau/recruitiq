import express, { Router } from 'express';
import * as platformAuthController from '../../controllers/auth/platformAuthController.ts';
import * as tenantAuthController from '../../controllers/auth/tenantAuthController.ts';
import { authenticatePlatform, authenticateTenant } from '../../middleware/auth.ts';

const router: Router = express.Router();

/**
 * Platform Authentication Routes
 * For Portal admins and License Managers
 */
router.post('/platform/login', platformAuthController.login);
router.post('/platform/refresh', platformAuthController.refresh);
router.post('/platform/logout', platformAuthController.logout);
router.get('/platform/me', authenticatePlatform, platformAuthController.getProfile);
router.post('/platform/revoke-all-sessions', authenticatePlatform, platformAuthController.revokeAllSessions);

/**
 * Tenant Authentication Routes
 * For product application users (Nexus, PayLinQ, ScheduleHub, RecruitIQ)
 */
router.post('/tenant/login', tenantAuthController.login);
router.post('/tenant/refresh', tenantAuthController.refresh);
router.post('/tenant/logout', tenantAuthController.logout);
router.get('/tenant/me', authenticateTenant, tenantAuthController.getProfile);
router.post('/tenant/revoke-all-sessions', authenticateTenant, tenantAuthController.revokeAllSessions);
router.post('/tenant/switch-product', authenticateTenant, tenantAuthController.switchProduct);

export default router;
