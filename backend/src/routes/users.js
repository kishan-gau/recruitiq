import express from 'express';
import { listUsers, getUser, createUser, updateUser, updateUserRole, deleteUser } from '../controllers/userController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/users - List all users
router.get('/', listUsers);

// POST /api/users - Create/invite new user (admin/owner only)
router.post('/', requireRole('owner', 'admin'), createUser);

// GET /api/users/:id - Get user by ID
router.get('/:id', getUser);

// PUT /api/users/:id - Update user profile
router.put('/:id', updateUser);

// PATCH /api/users/:id/role - Update user role (admin/owner only)
router.patch('/:id/role', requireRole('owner', 'admin'), updateUserRole);

// DELETE /api/users/:id - Delete user (admin/owner only)
router.delete('/:id', requireRole('owner', 'admin'), deleteUser);

export default router;
