/**
 * ScheduleHub API Routes
 * Defines all REST API endpoints for ScheduleHub workforce scheduling
 */

import express from 'express';
import { authenticateTenant, requireProductAccess, requirePermission } from '../../../middleware/auth.js';
import WorkerController from '../controllers/workerController.js';
import ScheduleController from '../controllers/scheduleController.js';
import AvailabilityController from '../controllers/availabilityController.js';
import TimeOffController from '../controllers/timeOffController.js';
import ShiftTradeController from '../controllers/shiftTradeController.js';
import RoleController from '../controllers/roleController.js';
import StationController from '../controllers/stationController.js';
import StatsController from '../controllers/statsController.js';

const router = express.Router();

// All ScheduleHub routes require tenant authentication and product access
router.use(authenticateTenant);
router.use(requireProductAccess('schedulehub'));

// Initialize controllers
const workerController = new WorkerController();
const scheduleController = new ScheduleController();
const availabilityController = new AvailabilityController();
const timeOffController = new TimeOffController();
const shiftTradeController = new ShiftTradeController();
const roleController = new RoleController();
const stationController = new StationController();
const statsController = new StatsController();

// ============================================================================
// STATS ROUTES
// ============================================================================

router.get('/stats', requirePermission('scheduling:stats:read'), statsController.getStats);

// ============================================================================
// WORKER ROUTES
// ============================================================================

router.post('/workers', requirePermission('scheduling:workers:create'), workerController.createWorker);
router.get('/workers', requirePermission('scheduling:workers:read'), workerController.listWorkers);
router.get('/workers/:id', requirePermission('scheduling:workers:read'), workerController.getWorkerById);
router.get('/workers/employee/:employeeId', requirePermission('scheduling:workers:read'), workerController.getWorkerByEmployeeId);
router.patch('/workers/:id', requirePermission('scheduling:workers:update'), workerController.updateWorker);
router.post('/workers/:id/terminate', requirePermission('scheduling:workers:delete'), workerController.terminateWorker);
router.get('/workers/:id/availability', requirePermission('scheduling:workers:read'), workerController.getAvailabilitySummary);
router.get('/workers/:id/shifts', requirePermission('scheduling:workers:read'), workerController.getShiftHistory);

// ============================================================================
// SCHEDULE ROUTES
// ============================================================================

router.post('/schedules', requirePermission('scheduling:schedules:create'), scheduleController.createSchedule);
router.post('/schedules/auto-generate', requirePermission('scheduling:schedules:create'), scheduleController.autoGenerateSchedule);
router.get('/schedules', requirePermission('scheduling:schedules:read'), scheduleController.listSchedules);
router.get('/schedules/:id', requirePermission('scheduling:schedules:read'), scheduleController.getScheduleById);
router.post('/schedules/:scheduleId/shifts', requirePermission('scheduling:shifts:create'), scheduleController.createShift);
router.post('/schedules/:id/publish', requirePermission('scheduling:schedules:publish'), scheduleController.publishSchedule);

// ============================================================================
// SHIFT ROUTES
// ============================================================================

router.patch('/shifts/:id', requirePermission('scheduling:shifts:update'), scheduleController.updateShift);
router.post('/shifts/:id/cancel', requirePermission('scheduling:shifts:delete'), scheduleController.cancelShift);
router.post('/shifts/:id/assign', requirePermission('scheduling:shifts:assign'), scheduleController.assignWorker);
router.post('/shifts/:id/unassign', requirePermission('scheduling:shifts:assign'), scheduleController.unassignWorker);
router.post('/shifts/:id/clock-in', requirePermission('scheduling:shifts:clock'), scheduleController.clockIn);
router.get('/workers/:workerId/shifts', requirePermission('scheduling:shifts:read'), scheduleController.getWorkerShifts);

// ============================================================================
// AVAILABILITY ROUTES
// ============================================================================

router.get('/availability', requirePermission('scheduling:availability:read'), availabilityController.listAvailability);
router.post('/availability', requirePermission('scheduling:availability:create'), availabilityController.createAvailability);
router.patch('/availability/:id', requirePermission('scheduling:availability:update'), availabilityController.updateAvailability);
router.delete('/availability/:id', requirePermission('scheduling:availability:delete'), availabilityController.deleteAvailability);
router.get('/workers/:workerId/availability', requirePermission('scheduling:availability:read'), availabilityController.getWorkerAvailability);
router.get('/workers/:workerId/check-availability', requirePermission('scheduling:availability:read'), availabilityController.checkAvailability);
router.get('/available-workers', requirePermission('scheduling:availability:read'), availabilityController.getAvailableWorkers);
router.post('/workers/:workerId/default-availability', requirePermission('scheduling:availability:create'), availabilityController.createDefaultAvailability);

// ============================================================================
// TIME OFF ROUTES
// ============================================================================

router.get('/time-off', requirePermission('scheduling:time_off:read'), timeOffController.listRequests);
router.post('/time-off', requirePermission('scheduling:time_off:create'), timeOffController.createRequest);
router.get('/time-off/pending', requirePermission('scheduling:time_off:approve'), timeOffController.getPendingRequests);
router.get('/time-off/:id', requirePermission('scheduling:time_off:read'), timeOffController.getRequestById);
router.post('/time-off/:id/review', requirePermission('scheduling:time_off:approve'), timeOffController.reviewRequest);
router.post('/time-off/:id/cancel', requirePermission('scheduling:time_off:delete'), timeOffController.cancelRequest);
router.get('/workers/:workerId/time-off', requirePermission('scheduling:time_off:read'), timeOffController.getWorkerRequests);

// ============================================================================
// SHIFT SWAP/TRADE ROUTES
// ============================================================================

router.get('/shift-swaps/marketplace', requirePermission('scheduling:shift_swaps:read'), shiftTradeController.getOpenOffers);
router.get('/shift-swaps/pending-approvals', requirePermission('scheduling:shift_swaps:approve'), shiftTradeController.getPendingApprovals);
router.get('/shift-swaps/my-offers', requirePermission('scheduling:shift_swaps:read'), shiftTradeController.getMyOffers);
router.post('/shift-swaps', requirePermission('scheduling:shift_swaps:create'), shiftTradeController.createSwapOffer);
router.get('/shift-swaps/:id', requirePermission('scheduling:shift_swaps:read'), shiftTradeController.getOfferById);
router.post('/shift-swaps/:offerId/request', requirePermission('scheduling:shift_swaps:create'), shiftTradeController.requestSwap);
router.post('/shift-swaps/:offerId/approve', requirePermission('scheduling:shift_swaps:approve'), shiftTradeController.approveSwap);
router.post('/shift-swaps/:offerId/reject', requirePermission('scheduling:shift_swaps:approve'), shiftTradeController.rejectSwap);
router.post('/shift-swaps/:offerId/cancel', requirePermission('scheduling:shift_swaps:delete'), shiftTradeController.cancelOffer);
router.get('/shift-swaps/:offerId/requests', requirePermission('scheduling:shift_swaps:read'), shiftTradeController.getOfferRequests);
router.get('/workers/:workerId/swap-offers', requirePermission('scheduling:shift_swaps:read'), shiftTradeController.getWorkerOffers);
router.post('/shift-swap-requests/:requestId/accept', requirePermission('scheduling:shift_swaps:approve'), shiftTradeController.acceptSwapRequest);

// ============================================================================
// ROLE ROUTES
// ============================================================================

router.post('/roles', requirePermission('scheduling:roles:create'), roleController.createRole);
router.get('/roles', requirePermission('scheduling:roles:read'), roleController.listRoles);
router.get('/roles/:id', requirePermission('scheduling:roles:read'), roleController.getRoleById);
router.patch('/roles/:id', requirePermission('scheduling:roles:update'), roleController.updateRole);
router.delete('/roles/:id', requirePermission('scheduling:roles:delete'), roleController.deleteRole);
router.get('/roles/:id/workers', requirePermission('scheduling:roles:read'), roleController.getRoleWorkers);
router.post('/roles/:roleId/workers', requirePermission('scheduling:roles:assign'), roleController.assignWorker);
router.delete('/roles/:roleId/workers/:workerId', requirePermission('scheduling:roles:assign'), roleController.removeWorker);
router.patch('/roles/:roleId/workers/:workerId', requirePermission('scheduling:roles:assign'), roleController.updateWorkerRole);
router.get('/workers/:workerId/roles', requirePermission('scheduling:roles:read'), roleController.getWorkerRoles);

// ============================================================================
// STATION ROUTES
// ============================================================================

router.post('/stations', requirePermission('scheduling:stations:create'), stationController.createStation);
router.get('/stations', requirePermission('scheduling:stations:read'), stationController.listStations);
router.get('/stations/:id', requirePermission('scheduling:stations:read'), stationController.getStationById);
router.patch('/stations/:id', requirePermission('scheduling:stations:update'), stationController.updateStation);
router.get('/stations/:id/requirements', requirePermission('scheduling:stations:read'), stationController.getStationRequirements);
router.post('/stations/:stationId/requirements', requirePermission('scheduling:stations:update'), stationController.addRequirement);
router.patch('/stations/:stationId/requirements/:roleId', requirePermission('scheduling:stations:update'), stationController.updateRequirement);
router.delete('/stations/:stationId/requirements/:roleId', requirePermission('scheduling:stations:update'), stationController.removeRequirement);

// Assignment routes
router.get('/stations/:id/assignments', requirePermission('scheduling:assignments:read'), stationController.getStationAssignments);
router.post('/stations/:id/assignments', requirePermission('scheduling:assignments:create'), stationController.assignEmployee);
router.delete('/stations/:stationId/assignments/:assignmentId', requirePermission('scheduling:assignments:delete'), stationController.unassignEmployee);

export default router;
