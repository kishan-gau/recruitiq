import express, { Router } from 'express';
import { listUsers, getUser, createUser, updateUser, updateUserRole, deleteUser, updateUserStatus } from '../controllers/userController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate, validateMultiple } from '../middleware/validation.js';
import { userSchemas, commonSchemas } from '../utils/validationSchemas.js';
import { protectMassAssignment } from '../middleware/massAssignmentProtection.js';
import Joi from 'joi';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas for query params
const userIdParamSchema = Joi.object({
  id: commonSchemas.uuid,
});

const listUsersQuerySchema = Joi.object({
  ...commonSchemas.pagination,
  role: Joi.string().valid('admin', 'recruiter', 'hiring_manager', 'interviewer').optional(),
  isActive: Joi.boolean().optional(),
  search: commonSchemas.searchQuery.optional(),
});

const updateStatusSchema = Joi.object({
  is_active: Joi.boolean().required(),
});

// GET /api/users - List all users
router.get('/', validate(listUsersQuerySchema, 'query'), listUsers);

// POST /api/users - Create/invite new user (admin/owner only)
router.post('/', requireRole('owner', 'admin'), validate(userSchemas.create, 'body'), createUser);

// GET /api/users/:id - Get user by ID
router.get('/:id', validate(userIdParamSchema, 'params'), getUser);

// PUT /api/users/:id - Update user profile
router.put('/:id', 
  protectMassAssignment({
    allowedFields: ['name', 'phone', 'timezone', 'avatarUrl'],
    strict: true, // Reject requests with unexpected fields
  }),
  validateMultiple({
    params: userIdParamSchema,
    body: userSchemas.update,
  }), 
  updateUser
);

// PATCH /api/users/:id/role - Update user role (admin/owner only)
router.patch('/:id/role', requireRole('owner', 'admin'), validateMultiple({
  params: userIdParamSchema,
  body: Joi.object({
    role: Joi.string().valid('admin', 'recruiter', 'hiring_manager', 'interviewer').required(),
  }),
}), updateUserRole);

// PATCH /api/users/:id/status - Update user active status (admin/owner only)
router.patch('/:id/status', requireRole('owner', 'admin'), validateMultiple({
  params: userIdParamSchema,
  body: updateStatusSchema,
}), updateUserStatus);

// DELETE /api/users/:id - Delete user (admin/owner only)
router.delete('/:id', requireRole('owner', 'admin'), validate(userIdParamSchema, 'params'), deleteUser);

export default router;
