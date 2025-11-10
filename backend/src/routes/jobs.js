import express from 'express';
import {
  listJobs,
  getJob,
  getPublicJob,
  listPublicJobs,
  createJob,
  updateJob,
  deleteJob,
  publishJob,
  updatePortalSettings
} from '../controllers/jobController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/public', listPublicJobs);
router.get('/public/:id', getPublicJob);

// Protected routes (authentication required)
router.use(authenticate);

// GET /api/jobs - List all jobs
router.get('/', listJobs);

// POST /api/jobs - Create job
router.post('/', createJob);

// GET /api/jobs/:id - Get job details
router.get('/:id', getJob);

// PUT /api/jobs/:id - Update job
router.put('/:id', updateJob);

// PUT /api/jobs/:id/publish - Publish/unpublish job
router.put('/:id/publish', publishJob);

// PUT /api/jobs/:id/portal-settings - Update portal settings
router.put('/:id/portal-settings', updatePortalSettings);

// DELETE /api/jobs/:id - Delete job
router.delete('/:id', deleteJob);

export default router;
