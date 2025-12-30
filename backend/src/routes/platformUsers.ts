/**
 * Platform Users Routes
 * API routes for managing platform administrators (users table with user_type='platform')
 * Only accessible by super_admin users
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as platformUserController from '../controllers/platformUserController.js';

const router = express.Router();

// Middleware to ensure only super_admin can access these routes
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required' 
    });
  }
  
  const userRole = req.user.role || req.user.user_role;
  if (userRole !== 'super_admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Forbidden: Super admin access required' 
    });
  }
  
  next();
};

// All routes require authentication and super_admin role
router.use(authenticate);
router.use(requireSuperAdmin);

// POST /api/platform-users - Create platform user
router.post('/', platformUserController.createPlatformUser);

// GET /api/platform-users - List all platform users
router.get('/', platformUserController.listPlatformUsers);

// GET /api/platform-users/:id - Get platform user by ID
router.get('/:id', platformUserController.getPlatformUser);

// PATCH /api/platform-users/:id - Update platform user
router.patch('/:id', platformUserController.updatePlatformUser);

// POST /api/platform-users/:id/change-password - Change password
router.post('/:id/change-password', platformUserController.changePassword);

// POST /api/platform-users/:id/deactivate - Deactivate platform user
router.post('/:id/deactivate', platformUserController.deactivatePlatformUser);

// POST /api/platform-users/:id/reactivate - Reactivate platform user
router.post('/:id/reactivate', platformUserController.reactivatePlatformUser);

export default router;
