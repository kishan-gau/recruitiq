import express from 'express';
import {
  getPublicJob,
  listPublicJobs,
  submitApplication,
  getApplicationStatus,
  uploadDocument
} from '../controllers/publicController.js';
import { applicationLimiter, publicLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Public job routes (no authentication)
router.get('/jobs/:identifier', publicLimiter, getPublicJob);
router.get('/careers/:organizationId', publicLimiter, listPublicJobs);

// Application submission (strict rate limiting)
router.post('/jobs/:jobId/apply', applicationLimiter, submitApplication);

// Application tracking (rate limited)
router.get('/track/:trackingCode', publicLimiter, getApplicationStatus);
router.post('/track/:trackingCode/documents', publicLimiter, uploadDocument);

export default router;
