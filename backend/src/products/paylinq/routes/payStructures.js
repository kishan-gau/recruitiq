/**
 * Pay Structure Routes
 * Defines REST endpoints for pay structure template management
 * 
 * @module products/paylinq/routes/payStructures
 */

import express from 'express';
import * as payStructureController from '../controllers/payStructureController.js';

const router = express.Router();

// ==================== TEMPLATE ROUTES ====================

// Create new pay structure template
router.post('/templates', payStructureController.createTemplate);

// Get all templates for organization
router.get('/templates', payStructureController.getTemplates);

// Get template by ID with components
router.get('/templates/:id', payStructureController.getTemplateById);

// Update template
router.put('/templates/:id', payStructureController.updateTemplate);

// Publish template
router.post('/templates/:id/publish', payStructureController.publishTemplate);

// Deprecate template
router.post('/templates/:id/deprecate', payStructureController.deprecateTemplate);

// Create new version of template
router.post('/templates/:id/versions', payStructureController.createTemplateVersion);

// Get template version history
router.get('/templates/versions/:templateCode', payStructureController.getTemplateVersions);

// Get template changelog
router.get('/templates/:id/changelog', payStructureController.getTemplateChangelog);

// Compare two template versions
router.get('/templates/compare', payStructureController.compareTemplateVersions);

// Upgrade workers to new template version
router.post('/templates/:id/upgrade-workers', payStructureController.upgradeWorkersToVersion);

// ==================== COMPONENT ROUTES ====================

// Add component to template
router.post('/templates/:id/components', payStructureController.addComponent);

// Get template components
router.get('/templates/:id/components', payStructureController.getTemplateComponents);

// Update component
router.put('/components/:componentId', payStructureController.updateComponent);

// Delete component
router.delete('/components/:componentId', payStructureController.deleteComponent);

// Reorder components
router.post('/templates/:id/components/reorder', payStructureController.reorderComponents);

// ==================== WORKER ASSIGNMENT ROUTES ====================

// Assign template to worker
router.post('/workers/:employeeId/assignments', payStructureController.assignTemplateToWorker);

// Get current worker pay structure
router.get('/workers/:employeeId/current', payStructureController.getCurrentWorkerStructure);

// Get worker pay structure history
router.get('/workers/:employeeId/history', payStructureController.getWorkerStructureHistory);

// Upgrade worker to new template version
router.post('/workers/:employeeId/upgrade', payStructureController.upgradeWorkerToNewVersion);

// ==================== COMPONENT OVERRIDE ROUTES ====================

// Add component override for worker
router.post('/workers/:employeeId/overrides', payStructureController.addComponentOverride);

// Get worker component overrides
router.get('/worker-structures/:workerStructureId/overrides', payStructureController.getWorkerOverrides);

// Update component override
router.put('/overrides/:overrideId', payStructureController.updateComponentOverride);

// Delete component override
router.delete('/overrides/:overrideId', payStructureController.deleteComponentOverride);

export default router;
