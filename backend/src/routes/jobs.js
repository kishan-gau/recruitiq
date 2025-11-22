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
import { authenticate, optionalAuth, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/public', listPublicJobs);
router.get('/public/:id', getPublicJob);

// Protected routes (authentication required)
router.use(authenticate);

// View operations - require 'job:view'
router.get('/', requirePermission('job:view'), listJobs);
router.get('/:id', requirePermission('job:view'), getJob);

// Create operations - require 'job:create'
router.post('/', requirePermission('job:create'), createJob);

// Edit operations - require 'job:edit'
router.put('/:id', requirePermission('job:edit'), updateJob);
router.put('/:id/portal-settings', requirePermission('job:edit'), updatePortalSettings);

// Publish operations - require 'job:publish'
router.put('/:id/publish', requirePermission('job:publish'), publishJob);

// Delete operations - require 'job:delete'
router.delete('/:id', requirePermission('job:delete'), deleteJob);

export default router;
