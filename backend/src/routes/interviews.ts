import express from 'express';
import {
  listInterviews,
  getInterview,
  scheduleInterview,
  updateInterview,
  submitFeedback,
  cancelInterview
} from '../controllers/interviewController.refactored.ts';
import { authenticate } from '../middleware/auth.ts';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/interviews - List interviews
router.get('/', listInterviews);

// POST /api/interviews - Schedule interview
router.post('/', scheduleInterview);

// GET /api/interviews/:id - Get interview details
router.get('/:id', getInterview);

// PUT /api/interviews/:id - Update interview
router.put('/:id', updateInterview);

// POST /api/interviews/:id/feedback - Submit feedback
router.post('/:id/feedback', submitFeedback);

// DELETE /api/interviews/:id - Cancel interview
router.delete('/:id', cancelInterview);

export default router;
