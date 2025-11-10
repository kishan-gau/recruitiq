/**
 * Paylinq Scheduling Routes
 */

import express from 'express';
import schedulingController from '../controllers/schedulingController.js';
import { validate  } from '../../../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
// Accept both individual shift format and bulk schedule format
const createScheduleSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  // Bulk schedule fields
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  scheduleType: Joi.string().valid('regular', 'flexible', 'rotating', 'on_call', 'shift').allow(null, ''),
  shifts: Joi.array().items(Joi.object({
    dayOfWeek: Joi.number().min(0).max(6),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    breakMinutes: Joi.number().min(0),
  })),
  // Single shift fields - scheduleDate is required when not using bulk format
  scheduleDate: Joi.date().iso().when('startDate', {
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
  // Bulk schedule fields
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  scheduleType: Joi.string().valid('regular', 'flexible', 'rotating', 'on_call', 'shift'),
  shifts: Joi.array().items(Joi.object({
    dayOfWeek: Joi.number().min(0).max(6),
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    breakMinutes: Joi.number().min(0),
  })),
  // Single shift fields
  scheduleDate: Joi.date().iso(),
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
  proposedDate: Joi.date().iso().allow(null),
  proposedStartDate: Joi.date().iso().allow(null), // Added for compatibility
  proposedEndDate: Joi.date().iso().allow(null), // Added for compatibility
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

const employeeIdParamSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
});

// Routes
router.post('/', validate(createScheduleSchema, 'body'), schedulingController.createSchedule);
router.get('/', schedulingController.getSchedules);
router.get('/employees/:employeeId/schedules', validate(employeeIdParamSchema, 'params'), schedulingController.getEmployeeSchedules);
router.get('/:id', validate(idParamSchema, 'params'), schedulingController.getScheduleById);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateScheduleSchema, 'body'), schedulingController.updateSchedule);
router.delete('/:id', validate(idParamSchema, 'params'), schedulingController.deleteSchedule);
router.post('/change-requests', validate(createChangeRequestSchema, 'body'), schedulingController.createChangeRequest);
router.get('/change-requests', schedulingController.getChangeRequests);
router.post('/change-requests/:id/review', validate(idParamSchema, 'params'), validate(reviewChangeRequestSchema, 'body'), schedulingController.reviewChangeRequest);

export default router;
