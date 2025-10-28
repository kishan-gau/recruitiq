import express from 'express';
import { getOrganization, updateOrganization, getUsageStats } from '../controllers/organizationController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { organizationSchemas } from '../utils/validationSchemas.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/organizations - Get current organization
router.get('/', getOrganization);

// PUT /api/organizations - Update organization
router.put('/', validate(organizationSchemas.update, 'body'), updateOrganization);

// GET /api/organizations/stats - Get usage statistics
router.get('/stats', getUsageStats);

export default router;
