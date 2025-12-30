/**
 * Paylinq Timesheet Routes
 */

import express, { Router } from 'express';
import timesheetController from '../controllers/timesheetController.js';
import { validate  } from '../../../middleware/validation.js';
import Joi from 'joi';

const router: Router = express.Router();

// Validation schemas
const createTimesheetSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  payrollRunId: Joi.string().uuid().allow(null),
  periodStart: Joi.date().iso().required(),
  periodEnd: Joi.date().iso().required(),
  status: Joi.string().valid('draft', 'submitted', 'approved', 'rejected', 'processed').default('draft'),
  notes: Joi.string().max(500).allow(null, ''),
});

const updateTimesheetSchema = Joi.object({
  payrollRunId: Joi.string().uuid().allow(null),
  periodStart: Joi.date().iso(),
  periodEnd: Joi.date().iso(),
  status: Joi.string().valid('draft', 'submitted', 'approved', 'rejected', 'processed'),
  notes: Joi.string().max(500).allow(null, ''),
  rejectionReason: Joi.string().max(500).allow(null, ''),
});

const rejectTimesheetSchema = Joi.object({
  rejectionReason: Joi.string().max(500).required(),
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const employeeIdParamSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
});

const payrollRunIdParamSchema = Joi.object({
  payrollRunId: Joi.string().uuid().required(),
});

// Routes
router.post('/', validate(createTimesheetSchema, 'body'), timesheetController.createTimesheet);
router.get('/', timesheetController.getTimesheets);
router.get('/employees/:employeeId/timesheets', validate(employeeIdParamSchema, 'params'), timesheetController.getEmployeeTimesheets);
router.get('/payroll-runs/:payrollRunId/timesheets', validate(payrollRunIdParamSchema, 'params'), timesheetController.getPayrollRunTimesheets);
router.get('/:id', validate(idParamSchema, 'params'), timesheetController.getTimesheetById);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateTimesheetSchema, 'body'), timesheetController.updateTimesheet);
router.post('/:id/submit', validate(idParamSchema, 'params'), timesheetController.submitTimesheet);
router.post('/:id/approve', validate(idParamSchema, 'params'), timesheetController.approveTimesheet);
router.post('/:id/reject', validate(idParamSchema, 'params'), validate(rejectTimesheetSchema, 'body'), timesheetController.rejectTimesheet);
router.post('/:id/create-rated-lines', validate(idParamSchema, 'params'), timesheetController.createRatedTimeLines);
router.delete('/:id', validate(idParamSchema, 'params'), timesheetController.deleteTimesheet);

export default router;
