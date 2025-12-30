import express from 'express';
import { 
  getOrganization, 
  updateOrganization, 
  getUsageStats,
  getSessionPolicy,
  updateSessionPolicy
} from '../controllers/organizationController.js';
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

// Session Policy Management
// GET /api/organizations/session-policy - Get session policy settings
router.get('/session-policy', getSessionPolicy);

// PUT /api/organizations/session-policy - Update session policy settings
router.put('/session-policy', updateSessionPolicy);

export default router;
