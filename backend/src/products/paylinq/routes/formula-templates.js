/**
 * Formula Template Routes
 */

import express from 'express';
import formulaTemplateController from '../controllers/formulaTemplateController.js';

const router = express.Router();

// Get all templates (with filtering)
router.get('/', formulaTemplateController.getTemplates);

// Get popular templates (must be before /:id to avoid route conflicts)
router.get('/popular', formulaTemplateController.getPopularTemplates);

// Search by tags
router.post('/search/tags', formulaTemplateController.searchByTags);

// Get recommended templates by category
router.get('/recommended/:category', formulaTemplateController.getRecommendedTemplates);

// Get template by code
router.get('/code/:code', formulaTemplateController.getTemplateByCode);

// Get template by ID
router.get('/:id', formulaTemplateController.getTemplateById);

// Create custom template
router.post('/', formulaTemplateController.createTemplate);

// Update custom template
router.put('/:id', formulaTemplateController.updateTemplate);

// Delete custom template
router.delete('/:id', formulaTemplateController.deleteTemplate);

// Apply template with parameters
router.post('/:id/apply', formulaTemplateController.applyTemplate);

export default router;
