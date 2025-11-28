/**
 * Pay Structure Routes
 * Defines REST endpoints for pay structure template management
 * 
 * @module products/paylinq/routes/payStructures
 */

import express from 'express';
import * as payStructureController from '../controllers/payStructureController.js';
import { requirePermission } from '../../../middleware/auth.js';

const router = express.Router();

// ==================== TEMPLATE ROUTES ====================

// Create new pay structure template
router.post('/templates', requirePermission('payroll:structures:create'), payStructureController.createTemplate);

// Create pay structure FROM template
router.post('/templates/:templateId/create-from', requirePermission('payroll:structures:create'), payStructureController.createFromTemplate);

// Get all templates for organization
router.get('/templates', requirePermission('payroll:structures:read'), payStructureController.getTemplates);

// Compare two template versions (must be before :id route)
router.get('/templates/compare', requirePermission('payroll:structures:read'), payStructureController.compareTemplateVersions);

// Get template by ID with components
router.get('/templates/:id', requirePermission('payroll:structures:read'), payStructureController.getTemplateById);

// Update template
router.put('/templates/:id', requirePermission('payroll:structures:update'), payStructureController.updateTemplate);

// Publish template
router.post('/templates/:id/publish', requirePermission('payroll:structures:update'), payStructureController.publishTemplate);

// Deprecate template
router.post('/templates/:id/deprecate', requirePermission('payroll:structures:update'), payStructureController.deprecateTemplate);

// Create new version of template
router.post('/templates/:id/versions', requirePermission('payroll:structures:create'), payStructureController.createTemplateVersion);

// Delete template (draft versions only)
router.delete('/templates/:id', requirePermission('payroll:structures:delete'), payStructureController.deleteTemplate);

// Get template version history
router.get('/templates/versions/:templateCode', requirePermission('payroll:structures:read'), payStructureController.getTemplateVersions);

// Get template changelog
router.get('/templates/:id/changelog', requirePermission('payroll:structures:read'), payStructureController.getTemplateChangelog);

// Upgrade workers to new template version
router.post('/templates/:id/upgrade-workers', requirePermission('payroll:structures:update'), payStructureController.upgradeWorkersToVersion);

// ==================== COMPONENT ROUTES ====================

// Add component to template
router.post('/templates/:id/components', requirePermission('payroll:structures:update'), payStructureController.addComponent);

// Get template components
router.get('/templates/:id/components', requirePermission('payroll:structures:read'), payStructureController.getTemplateComponents);

// Update component
router.put('/components/:componentId', requirePermission('payroll:structures:update'), payStructureController.updateComponent);

// Delete component
router.delete('/components/:componentId', requirePermission('payroll:structures:delete'), payStructureController.deleteComponent);

// Reorder components
router.post('/templates/:id/components/reorder', requirePermission('payroll:structures:update'), payStructureController.reorderComponents);

// ==================== WORKER ASSIGNMENT ROUTES ====================

// Assign template to worker
router.post('/workers/:employeeId/assignments', requirePermission('payroll:structures:update'), payStructureController.assignTemplateToWorker);

// Get current worker pay structure
router.get('/workers/:employeeId/current', requirePermission('payroll:structures:read'), payStructureController.getCurrentWorkerStructure);

// Get worker pay structure history
router.get('/workers/:employeeId/history', requirePermission('payroll:structures:read'), payStructureController.getWorkerStructureHistory);

// ==================== TEMPLATE INCLUSION ROUTES (Nested Templates) ====================

// Add template inclusion (nested template)
router.post('/templates/:id/inclusions', requirePermission('payroll:structures:update'), payStructureController.addTemplateInclusion);

// Get template inclusions
router.get('/templates/:id/inclusions', requirePermission('payroll:structures:read'), payStructureController.getTemplateInclusions);

// Update template inclusion
router.patch('/templates/:id/inclusions/:inclusionId', requirePermission('payroll:structures:update'), payStructureController.updateTemplateInclusion);

// Remove template inclusion
router.delete('/templates/:id/inclusions/:inclusionId', requirePermission('payroll:structures:delete'), payStructureController.removeTemplateInclusion);

// Get resolved template (with all inclusions merged)
router.get('/templates/:id/resolved', requirePermission('payroll:structures:read'), payStructureController.getResolvedTemplate);

// Upgrade worker to new template version
router.post('/workers/:employeeId/upgrade', requirePermission('payroll:structures:update'), payStructureController.upgradeWorkerToNewVersion);

// ==================== COMPONENT OVERRIDE ROUTES ====================

// Add component override for worker
router.post('/workers/:employeeId/overrides', requirePermission('payroll:structures:update'), payStructureController.addComponentOverride);

// Get worker component overrides
router.get('/worker-structures/:workerStructureId/overrides', requirePermission('payroll:structures:read'), payStructureController.getWorkerOverrides);

// Update component override
router.put('/overrides/:overrideId', requirePermission('payroll:structures:update'), payStructureController.updateComponentOverride);

// Delete component override
router.delete('/overrides/:overrideId', requirePermission('payroll:structures:delete'), payStructureController.deleteComponentOverride);

export default router;
