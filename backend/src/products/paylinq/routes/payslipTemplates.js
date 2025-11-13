/**
 * Payslip Template Routes
 * Defines REST endpoints for payslip template management
 */

import express from 'express';
import payslipTemplateController from '../controllers/payslipTemplateController.js';
import { validate } from '../../../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const assignmentIdParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
  assignmentId: Joi.string().uuid().required(),
});

// Template routes
router.get('/', payslipTemplateController.getTemplates);
router.get('/:id', validate(idParamSchema, 'params'), payslipTemplateController.getTemplateById);
router.post('/', payslipTemplateController.createTemplate);
router.put('/:id', validate(idParamSchema, 'params'), payslipTemplateController.updateTemplate);
router.delete('/:id', validate(idParamSchema, 'params'), payslipTemplateController.deleteTemplate);

// Template actions
router.post('/:id/duplicate', validate(idParamSchema, 'params'), payslipTemplateController.duplicateTemplate);
router.post('/:id/activate', validate(idParamSchema, 'params'), payslipTemplateController.activateTemplate);
router.post('/:id/archive', validate(idParamSchema, 'params'), payslipTemplateController.archiveTemplate);
router.post('/:id/preview', validate(idParamSchema, 'params'), payslipTemplateController.generatePreview);

// Assignment routes
router.get('/:id/assignments', validate(idParamSchema, 'params'), payslipTemplateController.getTemplateAssignments);
router.post('/:id/assignments', validate(idParamSchema, 'params'), payslipTemplateController.createAssignment);
router.put('/:id/assignments/:assignmentId', validate(assignmentIdParamSchema, 'params'), payslipTemplateController.updateAssignment);
router.delete('/:id/assignments/:assignmentId', validate(assignmentIdParamSchema, 'params'), payslipTemplateController.deleteAssignment);

export default router;
