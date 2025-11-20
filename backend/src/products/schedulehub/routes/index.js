/**
 * ScheduleHub API Routes
 * Defines all REST API endpoints for ScheduleHub workforce scheduling
 */

import express from 'express';
import { authenticateTenant, requireProductAccess } from '../../../middleware/auth.js';
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

router.get('/stats', statsController.getStats);

// ============================================================================
// WORKER ROUTES
// ============================================================================

router.post('/workers', workerController.createWorker);
router.get('/workers', workerController.listWorkers);
router.get('/workers/:id', workerController.getWorkerById);
router.get('/workers/employee/:employeeId', workerController.getWorkerByEmployeeId);
router.patch('/workers/:id', workerController.updateWorker);
router.post('/workers/:id/terminate', workerController.terminateWorker);
router.get('/workers/:id/availability', workerController.getAvailabilitySummary);
router.get('/workers/:id/shifts', workerController.getShiftHistory);

// ============================================================================
// SCHEDULE ROUTES
// ============================================================================

router.post('/schedules', scheduleController.createSchedule);
router.get('/schedules', scheduleController.listSchedules);
router.get('/schedules/:id', scheduleController.getScheduleById);
router.post('/schedules/:scheduleId/shifts', scheduleController.createShift);
router.post('/schedules/:id/publish', scheduleController.publishSchedule);

// ============================================================================
// SHIFT ROUTES
// ============================================================================

router.patch('/shifts/:id', scheduleController.updateShift);
router.post('/shifts/:id/cancel', scheduleController.cancelShift);
router.post('/shifts/:id/assign', scheduleController.assignWorker);
router.post('/shifts/:id/unassign', scheduleController.unassignWorker);
router.post('/shifts/:id/clock-in', scheduleController.clockIn);
router.get('/workers/:workerId/shifts', scheduleController.getWorkerShifts);

// ============================================================================
// AVAILABILITY ROUTES
// ============================================================================

router.post('/availability', availabilityController.createAvailability);
router.patch('/availability/:id', availabilityController.updateAvailability);
router.delete('/availability/:id', availabilityController.deleteAvailability);
router.get('/workers/:workerId/availability', availabilityController.getWorkerAvailability);
router.get('/workers/:workerId/check-availability', availabilityController.checkAvailability);
router.get('/available-workers', availabilityController.getAvailableWorkers);
router.post('/workers/:workerId/default-availability', availabilityController.createDefaultAvailability);

// ============================================================================
// TIME OFF ROUTES
// ============================================================================

router.get('/time-off', timeOffController.listRequests);
router.post('/time-off', timeOffController.createRequest);
router.get('/time-off/pending', timeOffController.getPendingRequests);
router.get('/time-off/:id', timeOffController.getRequestById);
router.post('/time-off/:id/review', timeOffController.reviewRequest);
router.post('/time-off/:id/cancel', timeOffController.cancelRequest);
router.get('/workers/:workerId/time-off', timeOffController.getWorkerRequests);

// ============================================================================
// SHIFT SWAP/TRADE ROUTES
// ============================================================================

router.get('/shift-swaps/marketplace', shiftTradeController.getOpenOffers);
router.post('/shift-swaps', shiftTradeController.createSwapOffer);
router.get('/shift-swaps/:id', shiftTradeController.getOfferById);
router.post('/shift-swaps/:offerId/request', shiftTradeController.requestSwap);
router.post('/shift-swaps/:offerId/approve', shiftTradeController.approveSwap);
router.post('/shift-swaps/:offerId/cancel', shiftTradeController.cancelOffer);
router.get('/shift-swaps/:offerId/requests', shiftTradeController.getOfferRequests);
router.get('/workers/:workerId/swap-offers', shiftTradeController.getWorkerOffers);
router.post('/shift-swap-requests/:requestId/accept', shiftTradeController.acceptSwapRequest);

// ============================================================================
// ROLE ROUTES
// ============================================================================

router.post('/roles', roleController.createRole);
router.get('/roles', roleController.listRoles);
router.get('/roles/:id', roleController.getRoleById);
router.patch('/roles/:id', roleController.updateRole);
router.get('/roles/:id/workers', roleController.getRoleWorkers);
router.post('/roles/:roleId/workers', roleController.assignWorker);
router.delete('/roles/:roleId/workers/:workerId', roleController.removeWorker);
router.patch('/roles/:roleId/workers/:workerId', roleController.updateWorkerRole);
router.get('/workers/:workerId/roles', roleController.getWorkerRoles);

// ============================================================================
// STATION ROUTES
// ============================================================================

router.post('/stations', stationController.createStation);
router.get('/stations', stationController.listStations);
router.get('/stations/:id', stationController.getStationById);
router.patch('/stations/:id', stationController.updateStation);
router.get('/stations/:id/requirements', stationController.getStationRequirements);
router.post('/stations/:stationId/requirements', stationController.addRequirement);
router.patch('/stations/:stationId/requirements/:roleId', stationController.updateRequirement);
router.delete('/stations/:stationId/requirements/:roleId', stationController.removeRequirement);

export default router;
