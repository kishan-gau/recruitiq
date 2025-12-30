import express from 'express';
import {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  addWorkspaceMember,
  removeWorkspaceMember
} from '../controllers/workspaceController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, validateMultiple } from '../middleware/validation.js';
import { workspaceSchemas, commonSchemas } from '../utils/validationSchemas.js';
import Joi from 'joi';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const workspaceIdParamSchema = Joi.object({
  id: commonSchemas.uuid,
});

const memberParamsSchema = Joi.object({
  id: commonSchemas.uuid,
  userId: commonSchemas.uuid,
});

const addMemberBodySchema = Joi.object({
  userId: commonSchemas.uuid,
  role: Joi.string().valid('admin', 'member', 'viewer').default('member'),
});

// GET /api/workspaces - List all workspaces
router.get('/', listWorkspaces);

// POST /api/workspaces - Create workspace
router.post('/', validate(workspaceSchemas.create, 'body'), createWorkspace);

// GET /api/workspaces/:id - Get workspace details
router.get('/:id', validate(workspaceIdParamSchema, 'params'), getWorkspace);

// PUT /api/workspaces/:id - Update workspace
router.put('/:id', validateMultiple({
  params: workspaceIdParamSchema,
  body: workspaceSchemas.update,
}), updateWorkspace);

// DELETE /api/workspaces/:id - Delete workspace
router.delete('/:id', validate(workspaceIdParamSchema, 'params'), deleteWorkspace);

// GET /api/workspaces/:id/members - Get workspace members
router.get('/:id/members', validate(workspaceIdParamSchema, 'params'), getWorkspaceMembers);

// POST /api/workspaces/:id/members - Add member to workspace
router.post('/:id/members', validateMultiple({
  params: workspaceIdParamSchema,
  body: addMemberBodySchema,
}), addWorkspaceMember);

// DELETE /api/workspaces/:id/members/:userId - Remove member from workspace
router.delete('/:id/members/:userId', validate(memberParamsSchema, 'params'), removeWorkspaceMember);

export default router;
