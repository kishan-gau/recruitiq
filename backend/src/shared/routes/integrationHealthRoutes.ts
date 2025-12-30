/**
 * Integration Health Routes
 * Routes for monitoring cross-product integration health
 */

import express from 'express';
import IntegrationHealthController from '../controllers/integrationHealthController.ts';

const router = express.Router();
const controller = new IntegrationHealthController();

/**
 * GET /api/integrations/health
 * Get overall integration health status
 */
router.get('/health', (req, res) => controller.getHealth(req, res));

/**
 * GET /api/integrations/health/:integrationName
 * Get health status for specific integration
 */
router.get('/health/:integrationName', (req, res) => controller.getIntegrationHealth(req, res));

/**
 * POST /api/integrations/health/:integrationName/reset
 * Reset metrics for specific integration (admin only)
 */
router.post('/health/:integrationName/reset', (req, res) => controller.resetIntegrationMetrics(req, res));

/**
 * POST /api/integrations/health/reset-all
 * Reset all integration metrics (admin only)
 */
router.post('/health/reset-all', (req, res) => controller.resetAllMetrics(req, res));

export default router;
