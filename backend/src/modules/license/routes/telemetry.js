import express from 'express'
import { telemetryController } from '../controllers/telemetryController.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = express.Router()

// All telemetry endpoints are public (no authentication)
// They will be called by RecruitIQ instances

// Report usage event
router.post('/event', asyncHandler(telemetryController.reportUsage))

// Send heartbeat
router.post('/heartbeat', asyncHandler(telemetryController.heartbeat))

// Get usage statistics (can be used by admin or instance)
router.get('/stats/:customerId', asyncHandler(telemetryController.getUsageStats))

// Get recent activity
router.get('/activity/:customerId', asyncHandler(telemetryController.getRecentActivity))

// Get global metrics (admin only, but no auth check here - should be protected at API level)
router.get('/metrics', asyncHandler(telemetryController.getGlobalMetrics))

export default router
