/**
 * Payslip Template Routes
 * Defines REST endpoints for payslip template management
 */

import express from 'express';
import payslipTemplateController from '../controllers/payslipTemplateController.js';
import { requirePermission } from '../../../middleware/auth.js';
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
router.get('/', requirePermission('payroll:templates:read'), payslipTemplateController.getTemplates);
router.get('/:id', requirePermission('payroll:templates:read'), validate(idParamSchema, 'params'), payslipTemplateController.getTemplateById);
router.post('/', requirePermission('payroll:templates:create'), payslipTemplateController.createTemplate);
router.put('/:id', requirePermission('payroll:templates:update'), validate(idParamSchema, 'params'), payslipTemplateController.updateTemplate);
router.delete('/:id', requirePermission('payroll:templates:delete'), validate(idParamSchema, 'params'), payslipTemplateController.deleteTemplate);

// Template actions
router.post('/:id/duplicate', requirePermission('payroll:templates:create'), validate(idParamSchema, 'params'), payslipTemplateController.duplicateTemplate);
router.post('/:id/activate', requirePermission('payroll:templates:update'), validate(idParamSchema, 'params'), payslipTemplateController.activateTemplate);
router.post('/:id/archive', requirePermission('payroll:templates:update'), validate(idParamSchema, 'params'), payslipTemplateController.archiveTemplate);
router.post('/:id/preview', requirePermission('payroll:templates:read'), validate(idParamSchema, 'params'), payslipTemplateController.generatePreview);

// Assignment routes
router.get('/:id/assignments', requirePermission('payroll:templates:read'), validate(idParamSchema, 'params'), payslipTemplateController.getTemplateAssignments);
router.post('/:id/assignments', requirePermission('payroll:templates:update'), validate(idParamSchema, 'params'), payslipTemplateController.createAssignment);
router.put('/:id/assignments/:assignmentId', requirePermission('payroll:templates:update'), validate(assignmentIdParamSchema, 'params'), payslipTemplateController.updateAssignment);
router.delete('/:id/assignments/:assignmentId', requirePermission('payroll:templates:delete'), validate(assignmentIdParamSchema, 'params'), payslipTemplateController.deleteAssignment);

export default router;
