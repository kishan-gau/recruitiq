/**
 * Paylinq Time Attendance Routes
 */

import express from 'express';
import timeAttendanceController from '../controllers/timeAttendanceController.js';
import { validate  } from '../../../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const clockInSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  clockInTime: Joi.date().iso().default(() => new Date()),
  location: Joi.string().max(255).allow(null, ''),
  notes: Joi.string().max(500).allow(null, ''),
});

const clockOutSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  clockOutTime: Joi.date().iso().default(() => new Date()),
  notes: Joi.string().max(500).allow(null, ''),
});

const createTimeEntrySchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  workDate: Joi.date().iso().required(),
  clockInTime: Joi.date().iso().required(),
  clockOutTime: Joi.date().iso().required(),
  breakMinutes: Joi.number().min(0).default(0),
  notes: Joi.string().max(500).allow(null, ''),
  status: Joi.string().valid('draft', 'submitted', 'approved', 'rejected').default('draft'),
});

const updateTimeEntrySchema = Joi.object({
  workDate: Joi.date().iso(),
  clockInTime: Joi.date().iso(),
  clockOutTime: Joi.date().iso(),
  breakMinutes: Joi.number().min(0),
  regularHours: Joi.number().min(0),
  overtimeHours: Joi.number().min(0),
  notes: Joi.string().max(500).allow(null, ''),
  status: Joi.string().valid('draft', 'submitted', 'approved', 'rejected'),
});

const bulkApproveSchema = Joi.object({
  timeEntryIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  action: Joi.string().valid('approve', 'reject').required(),
  rejectionReason: Joi.string().max(500).allow(null, ''),
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

const employeeIdParamSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
});

// Routes
router.post('/clock-in', validate(clockInSchema, 'body'), timeAttendanceController.clockIn);
router.post('/clock-out', validate(clockOutSchema, 'body'), timeAttendanceController.clockOut);
router.get('/active-clocks', timeAttendanceController.getActiveClockEntries);
router.get('/employees/:employeeId/clock-history', validate(employeeIdParamSchema, 'params'), timeAttendanceController.getEmployeeClockHistory);
router.post('/time-entries', validate(createTimeEntrySchema, 'body'), timeAttendanceController.createTimeEntry);
router.get('/time-entries', timeAttendanceController.getTimeEntries);
router.get('/time-entries/:id', validate(idParamSchema, 'params'), timeAttendanceController.getTimeEntryById);
router.put('/time-entries/:id', validate(idParamSchema, 'params'), validate(updateTimeEntrySchema, 'body'), timeAttendanceController.updateTimeEntry);
router.post('/time-entries/bulk-approve', validate(bulkApproveSchema, 'body'), timeAttendanceController.bulkApproveTimeEntries);
router.delete('/time-entries/:id', validate(idParamSchema, 'params'), timeAttendanceController.deleteTimeEntry);

export default router;
