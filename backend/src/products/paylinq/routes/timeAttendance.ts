/**
 * Paylinq Time Attendance Routes
 */

import express, { Router } from 'express';
import timeAttendanceController from '../controllers/timeAttendanceController.ts';
import { requirePermission } from '../../../middleware/auth.ts';
import { validate  } from '../../../middleware/validation.ts';
import Joi from 'joi';

const router: Router = express.Router();

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

// Shift type schemas
const createShiftTypeSchema = Joi.object({
  shiftName: Joi.string().required().max(100),
  shiftCode: Joi.string().required().max(50),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(), // HH:MM format
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  durationHours: Joi.number().min(0).max(24).required(),
  isOvernight: Joi.boolean().default(false),
  breakDurationMinutes: Joi.number().min(0).default(0),
  isPaidBreak: Joi.boolean().default(false),
  shiftDifferentialRate: Joi.number().min(0).default(0),
  description: Joi.string().max(500).allow(null, ''),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

const updateShiftTypeSchema = Joi.object({
  shiftName: Joi.string().max(100),
  shiftCode: Joi.string().max(50),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  durationHours: Joi.number().min(0).max(24),
  isOvernight: Joi.boolean(),
  breakDurationMinutes: Joi.number().min(0),
  isPaidBreak: Joi.boolean(),
  shiftDifferentialRate: Joi.number().min(0),
  description: Joi.string().max(500).allow(null, ''),
  status: Joi.string().valid('active', 'inactive'),
});

// Routes
router.post('/clock-in', requirePermission('timesheets:update'), validate(clockInSchema, 'body'), timeAttendanceController.clockIn);
router.post('/clock-out', requirePermission('timesheets:update'), validate(clockOutSchema, 'body'), timeAttendanceController.clockOut);
router.get('/active-clocks', requirePermission('timesheets:read'), timeAttendanceController.getActiveClockEntries);
router.get('/employees/:employeeId/clock-history', requirePermission('timesheets:read'), validate(employeeIdParamSchema, 'params'), timeAttendanceController.getEmployeeClockHistory);

// Shift type routes
router.post('/shift-types', requirePermission('timesheets:create'), validate(createShiftTypeSchema, 'body'), timeAttendanceController.createShiftType);
router.get('/shift-types', requirePermission('timesheets:read'), timeAttendanceController.getShiftTypes);
router.get('/shift-types/:id', requirePermission('timesheets:read'), validate(idParamSchema, 'params'), timeAttendanceController.getShiftTypeById);
router.put('/shift-types/:id', requirePermission('timesheets:update'), validate(idParamSchema, 'params'), validate(updateShiftTypeSchema, 'body'), timeAttendanceController.updateShiftType);
router.delete('/shift-types/:id', requirePermission('timesheets:delete'), validate(idParamSchema, 'params'), timeAttendanceController.deleteShiftType);

// Time entry routes
router.post('/time-entries', requirePermission('timesheets:create'), validate(createTimeEntrySchema, 'body'), timeAttendanceController.createTimeEntry);
router.get('/time-entries', requirePermission('timesheets:read'), timeAttendanceController.getTimeEntries);
router.get('/time-entries/:id', requirePermission('timesheets:read'), validate(idParamSchema, 'params'), timeAttendanceController.getTimeEntryById);
router.put('/time-entries/:id', requirePermission('timesheets:update'), validate(idParamSchema, 'params'), validate(updateTimeEntrySchema, 'body'), timeAttendanceController.updateTimeEntry);
router.post('/time-entries/bulk-approve', requirePermission('timesheets:approve'), validate(bulkApproveSchema, 'body'), timeAttendanceController.bulkApproveTimeEntries);
router.delete('/time-entries/:id', requirePermission('timesheets:delete'), validate(idParamSchema, 'params'), timeAttendanceController.deleteTimeEntry);

export default router;
