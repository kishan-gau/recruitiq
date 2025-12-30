/**
 * VPS Management Routes (TransIP Integration)
 */

import express from 'express';
import * as vpsController from '../controllers/vpsController.ts';
import { requireRole } from '../middleware/auth.ts';

const router = express.Router();

// Health check endpoint (no role restriction)
router.get('/health', vpsController.healthCheck);

// VPS information (admin/owner only)
router.get('/info', requireRole('admin', 'owner'), vpsController.getVPSInfo);

// VPS metrics (admin/owner only)
router.get('/metrics', requireRole('admin', 'owner'), vpsController.getVPSMetrics);

// VPS control endpoints (owner only)
router.post('/start', requireRole('owner'), vpsController.startVPS);
router.post('/stop', requireRole('owner'), vpsController.stopVPS);
router.post('/reboot', requireRole('owner'), vpsController.rebootVPS);

// Snapshot management (admin/owner only)
router.get('/snapshots', requireRole('admin', 'owner'), vpsController.getSnapshots);
router.post('/snapshots', requireRole('owner'), vpsController.createSnapshot);
router.post('/snapshots/:snapshotId/revert', requireRole('owner'), vpsController.revertToSnapshot);

export default router;
