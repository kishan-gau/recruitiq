/**
 * Paylinq Scheduling Routes
 */

import express from 'express';
import schedulingController from '../controllers/schedulingController.js';
import { requirePermission } from '../../../middleware/auth.js';
import { validate  } from '../../../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
// Accept both individual shift format and bulk schedule format
const createScheduleSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  // Bulk schedule fields - validate as ISO date strings, keep as strings (no conversion)
  startDate: Joi.date().iso().raw(),
  endDate: Joi.date().iso().raw(),
  scheduleType: Joi.string().valid('regular', 'flexible', 'rotating', 'on_call', 'shift').allow(null, ''),
  shifts: Joi.array().items(Joi.object({
    dayOfWeek: Joi.number().min(0).max(6),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    breakMinutes: Joi.number().min(0),
  })),
  // Single shift fields - scheduleDate is required when not using bulk format
  // .raw() prevents Joi from converting the string to a Date object
  scheduleDate: Joi.date().iso().raw().when('startDate', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  breakMinutes: Joi.number().min(0).default(0),
  location: Joi.string().max(255).allow(null, ''),
  notes: Joi.string().max(500).allow(null, ''),
  status: Joi.string().valid('scheduled', 'confirmed', 'completed', 'cancelled').default('scheduled'),
  metadata: Joi.object().allow(null),
});

const updateScheduleSchema = Joi.object({
  // Bulk schedule fields - validate as ISO date strings, keep as strings (no conversion)
  startDate: Joi.date().iso().raw(),
  endDate: Joi.date().iso().raw(),
  scheduleType: Joi.string().valid('regular', 'flexible', 'rotating', 'on_call', 'shift'),
  shifts: Joi.array().items(Joi.object({
    dayOfWeek: Joi.number().min(0).max(6),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    breakMinutes: Joi.number().min(0),
  })),
  // Single shift fields - .raw() prevents Joi from converting the string to a Date object
  scheduleDate: Joi.date().iso().raw(),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  breakMinutes: Joi.number().min(0),
  location: Joi.string().max(255).allow(null, ''),
  notes: Joi.string().max(500).allow(null, ''),
  status: Joi.string().valid('scheduled', 'confirmed', 'completed', 'cancelled'),
  metadata: Joi.object().allow(null),
});

const createChangeRequestSchema = Joi.object({
  scheduleId: Joi.string().uuid().required(),
  employeeId: Joi.string().uuid().allow(null), // Added for compatibility
  requestType: Joi.string().valid('cancel', 'change', 'swap', 'time_off').required(),
  requestReason: Joi.string().max(500).required(),
  // .raw() prevents Joi from converting date strings to Date objects
  proposedDate: Joi.date().iso().raw().allow(null),
  proposedStartDate: Joi.date().iso().raw().allow(null), // Added for compatibility
  proposedEndDate: Joi.date().iso().raw().allow(null), // Added for compatibility
  proposedStartTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
  proposedEndTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
  swapWithEmployeeId: Joi.string().uuid().allow(null),
  metadata: Joi.object().allow(null),
});

const reviewChangeRequestSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  reviewNotes: Joi.string().max(500).allow(null, ''),
});

const idParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

// Routes
router.post('/', requirePermission('scheduling:create'), validate(createScheduleSchema, 'body'), schedulingController.createSchedule);
router.get('/', requirePermission('scheduling:read'), schedulingController.getSchedules); // Supports ?employeeId=xxx query parameter
router.get('/:id', requirePermission('scheduling:read'), validate(idParamSchema, 'params'), schedulingController.getScheduleById);
router.put('/:id', requirePermission('scheduling:update'), validate(idParamSchema, 'params'), validate(updateScheduleSchema, 'body'), schedulingController.updateSchedule);
router.delete('/:id', requirePermission('scheduling:delete'), validate(idParamSchema, 'params'), schedulingController.deleteSchedule);
router.post('/change-requests', requirePermission('scheduling:update'), validate(createChangeRequestSchema, 'body'), schedulingController.createChangeRequest);
router.get('/change-requests', requirePermission('scheduling:read'), schedulingController.getChangeRequests);
router.post('/change-requests/:id/review', requirePermission('scheduling:approve'), validate(idParamSchema, 'params'), validate(reviewChangeRequestSchema, 'body'), schedulingController.reviewChangeRequest);

export default router;
