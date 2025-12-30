import express from 'express';
import {
  sendMessage,
  getApplicationCommunications,
  markAsRead,
  deleteCommunication
} from '../controllers/communicationController.ts';
import { authenticate } from '../middleware/auth.ts';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /api/communications - Send message to candidate
router.post('/', sendMessage);

// GET /api/communications/:applicationId - Get all communications for an application
router.get('/:applicationId', getApplicationCommunications);

// PUT /api/communications/:id/read - Mark as read
router.put('/:id/read', markAsRead);

// DELETE /api/communications/:id - Delete communication
router.delete('/:id', deleteCommunication);

export default router;
