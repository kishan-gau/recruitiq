/**
 * Formula Template Routes
 */

import express, { Router } from 'express';
import formulaTemplateController from '../controllers/formulaTemplateController.js';
import { requirePermission } from '../../../middleware/auth.js';

const router: Router = express.Router();

// Get all templates (with filtering)
router.get('/', requirePermission('formulas:read'), formulaTemplateController.getTemplates);

// Get popular templates (must be before /:id to avoid route conflicts)
router.get('/popular', requirePermission('formulas:read'), formulaTemplateController.getPopularTemplates);

// Search by tags
router.post('/search/tags', requirePermission('formulas:read'), formulaTemplateController.searchByTags);

// Get recommended templates by category
router.get('/recommended/:category', requirePermission('formulas:read'), formulaTemplateController.getRecommendedTemplates);

// Get template by code
router.get('/code/:code', requirePermission('formulas:read'), formulaTemplateController.getTemplateByCode);

// Get template by ID
router.get('/:id', requirePermission('formulas:read'), formulaTemplateController.getTemplateById);

// Create custom template
router.post('/', requirePermission('formulas:create'), formulaTemplateController.createTemplate);

// Update custom template
router.put('/:id', requirePermission('formulas:update'), formulaTemplateController.updateTemplate);

// Delete custom template
router.delete('/:id', requirePermission('formulas:delete'), formulaTemplateController.deleteTemplate);

// Apply template with parameters
router.post('/:id/apply', requirePermission('formulas:test'), formulaTemplateController.applyTemplate);

export default router;
