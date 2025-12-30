import express from 'express';
import {
  listFlowTemplates,
  getFlowTemplate,
  createFlowTemplate,
  updateFlowTemplate,
  deleteFlowTemplate,
  cloneFlowTemplate
} from '../controllers/flowTemplateController.ts';
import { authenticate } from '../middleware/auth.ts';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/flow-templates - List all flow templates
router.get('/', listFlowTemplates);

// POST /api/flow-templates - Create flow template
router.post('/', createFlowTemplate);

// GET /api/flow-templates/:id - Get flow template details
router.get('/:id', getFlowTemplate);

// PUT /api/flow-templates/:id - Update flow template
router.put('/:id', updateFlowTemplate);

// DELETE /api/flow-templates/:id - Delete flow template
router.delete('/:id', deleteFlowTemplate);

// POST /api/flow-templates/:id/clone - Clone flow template
router.post('/:id/clone', cloneFlowTemplate);

export default router;
