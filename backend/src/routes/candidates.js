import express from 'express';
import {
  listCandidates,
  getCandidate,
  getCandidateApplications,
  createCandidate,
  updateCandidate,
  deleteCandidate
} from '../controllers/candidateController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/candidates - List all candidates
router.get('/', listCandidates);

// POST /api/candidates - Create candidate
router.post('/', createCandidate);

// GET /api/candidates/:id - Get candidate details
router.get('/:id', getCandidate);

// GET /api/candidates/:id/applications - Get candidate's applications
router.get('/:id/applications', getCandidateApplications);

// PUT /api/candidates/:id - Update candidate
router.put('/:id', updateCandidate);

// DELETE /api/candidates/:id - Delete candidate
router.delete('/:id', deleteCandidate);

export default router;
