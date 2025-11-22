/**
 * Nexus Routes
 * API routes for Nexus HRIS product
 */

import express from 'express';
import { authenticateTenant, requireProductAccess, requirePermission } from '../../../middleware/auth.js';
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
// View operations - require 'employee:view'
router.get('/employees/org-chart', requirePermission('employee:view'), employeeController.getOrgChart);
router.get('/employees/search', requirePermission('employee:view'), employeeController.searchEmployees);
router.get('/employees/:id', requirePermission('employee:view'), employeeController.getEmployee);
router.get('/employees', requirePermission('employee:view'), employeeController.listEmployees);
router.get('/employees/:id/employment-history', requirePermission('employee:view'), employeeController.getEmploymentHistory);
router.get('/employees/:id/rehire-eligibility', requirePermission('employee:view'), employeeController.checkRehireEligibility);

// Create operations - require 'employee:create'
router.post('/employees', requirePermission('employee:create'), employeeController.createEmployee);

// Edit operations - require 'employee:edit'
router.patch('/employees/:id', requirePermission('employee:edit'), employeeController.updateEmployee);
router.post('/employees/:id/rehire', requirePermission('employee:edit'), employeeController.rehireEmployee);

// Terminate operations - require 'employee:terminate'
router.post('/employees/:id/terminate', requirePermission('employee:terminate'), employeeController.terminateEmployee);

// Delete operations - require 'employee:delete'
router.delete('/employees/:id', requirePermission('employee:delete'), employeeController.deleteEmployee);

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
// Request/View operations - require 'timeoff:view'
router.get('/time-off/requests', requirePermission('timeoff:view'), timeOffController.getRequests);
router.get('/time-off/balances/:employeeId', requirePermission('timeoff:view'), timeOffController.getBalances);

// Submit requests - require 'timeoff:request'
router.post('/time-off/requests', requirePermission('timeoff:request'), timeOffController.createRequest);
router.post('/time-off/requests/:id/cancel', requirePermission('timeoff:request'), timeOffController.cancelRequest);

// Review/Approve requests - require 'timeoff:approve'
router.post('/time-off/requests/:id/review', requirePermission('timeoff:approve'), timeOffController.reviewRequest);
router.post('/time-off/types', requirePermission('timeoff:approve'), timeOffController.createType);
router.post('/time-off/accrue', requirePermission('timeoff:approve'), timeOffController.accrueTimeOff);

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
router.get('/benefits/plans/:id/enrollment-summary', benefitsController.getEnrollmentSummary);
router.get('/benefits/plans/:id', benefitsController.getPlan);
router.get('/benefits/plans', benefitsController.listPlans);
router.patch('/benefits/plans/:id', benefitsController.updatePlan);

router.post('/benefits/enrollments', benefitsController.enrollEmployee);
router.get('/benefits/enrollments/employee/:employeeId', benefitsController.getEmployeeEnrollments); // Specific route first
router.get('/benefits/enrollments/:id', benefitsController.getEnrollment);
router.get('/benefits/enrollments', benefitsController.listEnrollments); // General route last
router.patch('/benefits/enrollments/:id', benefitsController.updateEnrollment);
router.post('/benefits/enrollments/:id/terminate', benefitsController.terminateEnrollment);

// ========== ATTENDANCE ROUTES ==========
// View operations - require 'attendance:view'
router.get('/attendance/records/today', requirePermission('attendance:view'), attendanceController.getTodayAttendance);
router.get('/attendance/statistics', requirePermission('attendance:view'), attendanceController.getAttendanceStatistics);
router.get('/attendance/:id', requirePermission('attendance:view'), attendanceController.getAttendance);
router.get('/attendance/employee/:employeeId', requirePermission('attendance:view'), attendanceController.getEmployeeAttendance);
router.get('/attendance/employee/:employeeId/summary', requirePermission('attendance:view'), attendanceController.getAttendanceSummary);

// Record attendance - require 'attendance:record'
router.post('/attendance/clock-in', requirePermission('attendance:record'), attendanceController.clockIn);
router.post('/attendance/clock-out', requirePermission('attendance:record'), attendanceController.clockOut);

// Manual attendance - require 'attendance:approve'
router.post('/attendance/manual', requirePermission('attendance:approve'), attendanceController.createManualAttendance);

// ========== DEPARTMENT ROUTES ==========
// View operations - require 'dept:view'
router.get('/departments/structure/full', requirePermission('dept:view'), departmentController.getOrganizationStructure);
router.get('/departments/:id/hierarchy', requirePermission('dept:view'), departmentController.getDepartmentHierarchy);
router.get('/departments/:id/employees', requirePermission('dept:view'), departmentController.getDepartmentEmployees);
router.get('/departments/:id', requirePermission('dept:view'), departmentController.getDepartment);
router.get('/departments', requirePermission('dept:view'), departmentController.getDepartments);

// Manage operations - require 'dept:manage'
router.post('/departments', requirePermission('dept:manage'), departmentController.createDepartment);
router.patch('/departments/:id', requirePermission('dept:manage'), departmentController.updateDepartment);
router.delete('/departments/:id', requirePermission('dept:manage'), departmentController.deleteDepartment);

// ========== LOCATION ROUTES ==========
// View operations - require 'location:view'
router.get('/locations/stats/all', requirePermission('location:view'), locationController.getAllLocationStats);
router.get('/locations/code/:code', requirePermission('location:view'), locationController.getLocationByCode);
router.get('/locations/:id/stats', requirePermission('location:view'), locationController.getLocationStats);
router.get('/locations/:id', requirePermission('location:view'), locationController.getLocation);
router.get('/locations', requirePermission('location:view'), locationController.getLocations);

// Manage operations - require 'location:manage'
router.post('/locations', requirePermission('location:manage'), locationController.createLocation);
router.patch('/locations/:id', requirePermission('location:manage'), locationController.updateLocation);
router.delete('/locations/:id', requirePermission('location:manage'), locationController.deleteLocation);

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
// All reports require 'hris:reports:view'
router.get('/reports/dashboard', requirePermission('hris:reports:view'), reportsController.getDashboardReport);
router.get('/reports/headcount', requirePermission('hris:reports:view'), reportsController.getHeadcountReport);
router.get('/reports/turnover', requirePermission('hris:reports:view'), reportsController.getTurnoverReport);
router.get('/reports/time-off', requirePermission('hris:reports:view'), reportsController.getTimeOffReport);
router.get('/reports/attendance', requirePermission('hris:reports:view'), reportsController.getAttendanceReport);
router.get('/reports/performance', requirePermission('hris:reports:view'), reportsController.getPerformanceReport);
router.get('/reports/benefits', requirePermission('hris:reports:view'), reportsController.getBenefitsReport);

export default router;
