import express, { Router } from 'express';
import {
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
  trackApplication,
  deleteApplication
} from '../controllers/applicationController.refactored.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router: Router = express.Router();

// Public route - track application by code (no auth)
router.get('/track/:trackingCode', trackApplication);

// Public route - submit application (no auth required for career portal)
router.post('/', createApplication);

// Protected routes (authentication required)
router.use(authenticate);

// GET /api/applications - List applications
router.get('/', listApplications);

// GET /api/applications/:id - Get application details
router.get('/:id', getApplication);

// PUT /api/applications/:id - Update application
router.put('/:id', updateApplication);

// DELETE /api/applications/:id - Delete application
router.delete('/:id', deleteApplication);

export default router;
