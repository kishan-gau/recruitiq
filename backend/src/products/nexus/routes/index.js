/**
 * Nexus Routes
 * API routes for Nexus HRIS product
 */

import express from 'express';
import { authenticateTenant, requireProductAccess } from '../../../middleware/auth.js';
import { requireOrganization } from '../../../middleware/requireOrganization.js';
import EmployeeController from '../controllers/employeeController.js';
import TimeOffController from '../controllers/timeOffController.js';
import ContractController from '../controllers/contractController.js';
import PerformanceController from '../controllers/performanceController.js';
import BenefitsController from '../controllers/benefitsController.js';
import AttendanceController from '../controllers/attendanceController.js';
import DepartmentController from '../controllers/departmentController.js';
import LocationController from '../controllers/locationController.js';
import DocumentController from '../controllers/documentController.js';
import ReportsController from '../controllers/reportsController.js';
import * as userAccessController from '../controllers/userAccessController.js';
import Joi from 'joi';
import { validate } from '../../../middleware/validation.js';

const router = express.Router();

// All Nexus routes require tenant authentication and product access
router.use(authenticateTenant);
router.use(requireProductAccess('nexus'));
router.use(requireOrganization);

// Initialize controllers
const employeeController = new EmployeeController();
const timeOffController = new TimeOffController();
const contractController = new ContractController();
const performanceController = new PerformanceController();
const benefitsController = new BenefitsController();
const attendanceController = new AttendanceController();
const departmentController = new DepartmentController();
const locationController = new LocationController();
const documentController = new DocumentController();
const reportsController = new ReportsController();

// ========== EMPLOYEE ROUTES ==========
router.get('/employees/org-chart', employeeController.getOrgChart);
router.get('/employees/search', employeeController.searchEmployees);
router.get('/employees/:id', employeeController.getEmployee);
router.get('/employees', employeeController.listEmployees);
router.post('/employees', employeeController.createEmployee);
router.patch('/employees/:id', employeeController.updateEmployee);
router.post('/employees/:id/terminate', employeeController.terminateEmployee);
router.delete('/employees/:id', employeeController.deleteEmployee);

// ========== EMPLOYEE USER ACCESS ROUTES ==========
// Validation schemas for user access management
const grantAccessSchema = Joi.object({
  email: Joi.string().email().optional(),
  password: Joi.string().min(8).optional(),
  sendEmail: Joi.boolean().optional()
});

const updateAccessSchema = Joi.object({
  email: Joi.string().email().optional(),
  accountStatus: Joi.string().valid('active', 'inactive', 'suspended', 'pending_activation').optional(),
  isActive: Joi.boolean().optional(),
  preferences: Joi.object().optional()
});

// POST /api/nexus/employees/:employeeId/grant-access - Grant system access to employee
router.post(
  '/employees/:employeeId/grant-access',
  validate(grantAccessSchema),
  userAccessController.grantAccess
);

// GET /api/nexus/employees/:employeeId/user-account - Get user account status
router.get(
  '/employees/:employeeId/user-account',
  userAccessController.getUserAccount
);

// DELETE /api/nexus/employees/:employeeId/revoke-access - Revoke system access
router.delete(
  '/employees/:employeeId/revoke-access',
  userAccessController.revokeAccess
);

// PATCH /api/nexus/employees/:employeeId/user-access - Update user access settings
router.patch(
  '/employees/:employeeId/user-access',
  validate(updateAccessSchema),
  userAccessController.updateAccess
);

// ========== CONTRACT ROUTES ==========
router.get('/contracts/expiring', contractController.getExpiringContracts);
router.get('/contracts/employee/:employeeId', contractController.getEmployeeContracts);
router.get('/contracts/:id', contractController.getContract);
router.get('/contracts', contractController.listContracts);
router.post('/contracts', contractController.createContract);
router.patch('/contracts/:id', contractController.updateContract);
router.post('/contracts/:id/activate', contractController.activateContract);
router.post('/contracts/:id/terminate', contractController.terminateContract);
router.post('/contracts/:id/progress-sequence', contractController.progressSequence);

// ========== TIME-OFF ROUTES ==========
router.post('/time-off/requests', timeOffController.createRequest);
router.post('/time-off/requests/:id/review', timeOffController.reviewRequest);
router.post('/time-off/requests/:id/cancel', timeOffController.cancelRequest);
router.get('/time-off/requests', timeOffController.getRequests);
router.get('/time-off/balances/:employeeId', timeOffController.getBalances);
router.post('/time-off/types', timeOffController.createType);
router.post('/time-off/accrue', timeOffController.accrueTimeOff);

// ========== PERFORMANCE ROUTES ==========
router.get('/performance/reviews/statistics', performanceController.getReviewsStatistics);
router.post('/performance/reviews', performanceController.createReview);
router.get('/performance/reviews/:id', performanceController.getReview);
router.get('/performance/reviews', performanceController.listReviews);
router.patch('/performance/reviews/:id', performanceController.updateReview);

router.get('/performance/goals/statistics', performanceController.getGoalsStatistics);
router.post('/performance/goals', performanceController.createGoal);
router.get('/performance/goals', performanceController.listGoals);
router.patch('/performance/goals/:id', performanceController.updateGoal);

router.post('/performance/feedback', performanceController.createFeedback);
router.get('/performance/feedback/employee/:employeeId', performanceController.getEmployeeFeedback);

// ========== BENEFITS ROUTES ==========
router.post('/benefits/plans', benefitsController.createPlan);
router.get('/benefits/plans/:id', benefitsController.getPlan);
router.get('/benefits/plans', benefitsController.listPlans);
router.patch('/benefits/plans/:id', benefitsController.updatePlan);

router.post('/benefits/enrollments', benefitsController.enrollEmployee);
router.get('/benefits/enrollments/:id', benefitsController.getEnrollment);
router.get('/benefits/enrollments/employee/:employeeId', benefitsController.getEmployeeEnrollments);
router.patch('/benefits/enrollments/:id', benefitsController.updateEnrollment);
router.post('/benefits/enrollments/:id/terminate', benefitsController.terminateEnrollment);

// ========== ATTENDANCE ROUTES ==========
router.post('/attendance/clock-in', attendanceController.clockIn);
router.post('/attendance/clock-out', attendanceController.clockOut);
router.post('/attendance/manual', attendanceController.createManualAttendance);
router.get('/attendance/records/today', attendanceController.getTodayAttendance);
router.get('/attendance/statistics', attendanceController.getAttendanceStatistics);
router.get('/attendance/:id', attendanceController.getAttendance);
router.get('/attendance/employee/:employeeId', attendanceController.getEmployeeAttendance);
router.get('/attendance/employee/:employeeId/summary', attendanceController.getAttendanceSummary);

// ========== DEPARTMENT ROUTES ==========
router.post('/departments', departmentController.createDepartment);
router.get('/departments/structure/full', departmentController.getOrganizationStructure);
router.get('/departments/:id/hierarchy', departmentController.getDepartmentHierarchy);
router.get('/departments/:id/employees', departmentController.getDepartmentEmployees);
router.get('/departments/:id', departmentController.getDepartment);
router.get('/departments', departmentController.getDepartments);
router.patch('/departments/:id', departmentController.updateDepartment);
router.delete('/departments/:id', departmentController.deleteDepartment);

// ========== LOCATION ROUTES ==========
router.post('/locations', locationController.createLocation);
router.get('/locations/stats/all', locationController.getAllLocationStats);
router.get('/locations/code/:code', locationController.getLocationByCode);
router.get('/locations/:id/stats', locationController.getLocationStats);
router.get('/locations/:id', locationController.getLocation);
router.get('/locations', locationController.getLocations);
router.patch('/locations/:id', locationController.updateLocation);
router.delete('/locations/:id', locationController.deleteLocation);

// ========== DOCUMENT ROUTES ==========
router.post('/documents', documentController.createDocument);
router.get('/documents/search', documentController.searchDocuments);
router.get('/documents/expired', documentController.getExpiredDocuments);
router.get('/documents/expiring/:days', documentController.getExpiringDocuments);
router.get('/documents/stats/organization', documentController.getOrganizationDocumentStats);
router.get('/documents/employee/:employeeId/stats', documentController.getEmployeeDocumentStats);
router.get('/documents/employee/:employeeId', documentController.getEmployeeDocuments);
router.get('/documents/type/:type', documentController.getDocumentsByType);
router.get('/documents/:id', documentController.getDocument);
router.patch('/documents/:id', documentController.updateDocument);
router.delete('/documents/:id', documentController.deleteDocument);

// ========== REPORTS ROUTES ==========
router.get('/reports/dashboard', reportsController.getDashboardReport);
router.get('/reports/headcount', reportsController.getHeadcountReport);
router.get('/reports/turnover', reportsController.getTurnoverReport);
router.get('/reports/time-off', reportsController.getTimeOffReport);
router.get('/reports/attendance', reportsController.getAttendanceReport);
router.get('/reports/performance', reportsController.getPerformanceReport);
router.get('/reports/benefits', reportsController.getBenefitsReport);

export default router;
