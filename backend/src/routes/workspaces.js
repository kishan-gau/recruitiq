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

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/workspaces - List all workspaces
router.get('/', listWorkspaces);

// POST /api/workspaces - Create workspace
router.post('/', createWorkspace);

// GET /api/workspaces/:id - Get workspace details
router.get('/:id', getWorkspace);

// PUT /api/workspaces/:id - Update workspace
router.put('/:id', updateWorkspace);

// DELETE /api/workspaces/:id - Delete workspace
router.delete('/:id', deleteWorkspace);

// GET /api/workspaces/:id/members - Get workspace members
router.get('/:id/members', getWorkspaceMembers);

// POST /api/workspaces/:id/members - Add member to workspace
router.post('/:id/members', addWorkspaceMember);

// DELETE /api/workspaces/:id/members/:userId - Remove member from workspace
router.delete('/:id/members/:userId', removeWorkspaceMember);

export default router;
