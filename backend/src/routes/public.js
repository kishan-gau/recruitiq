import express from 'express';
import {
  getPublicJob,
  listPublicJobs,
  submitApplication,
  getApplicationStatus,
  uploadDocument
} from '../controllers/publicController.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for public endpoints
const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 applications per hour per IP
  message: 'Too many applications from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
});

// Public job routes (no authentication)
router.get('/jobs/:identifier', getPublicJob);
router.get('/careers/:organizationId', listPublicJobs);

// Application submission (rate limited)
router.post('/jobs/:jobId/apply', applicationLimiter, submitApplication);

// Application tracking (rate limited)
router.get('/track/:trackingCode', trackingLimiter, getApplicationStatus);
router.post('/track/:trackingCode/documents', trackingLimiter, uploadDocument);

export default router;
