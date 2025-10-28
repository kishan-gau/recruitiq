import express from 'express';
import { getOrganization, updateOrganization, getUsageStats } from '../controllers/organizationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/organizations - Get current organization
router.get('/', getOrganization);

// PUT /api/organizations - Update organization
router.put('/', updateOrganization);

// GET /api/organizations/stats - Get usage statistics
router.get('/stats', getUsageStats);

export default router;
