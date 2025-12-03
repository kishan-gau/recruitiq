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
import vipEmployeesRoutes from './vipEmployees.js';
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
// View operations - require 'employees:read'
router.get('/employees/org-chart', requirePermission('employees:read'), employeeController.getOrgChart);
router.get('/employees/search', requirePermission('employees:read'), employeeController.searchEmployees);
router.get('/employees/:id', requirePermission('employees:read'), employeeController.getEmployee);
router.get('/employees', requirePermission('employees:read'), employeeController.listEmployees);
router.get('/employees/:id/employment-history', requirePermission('employees:read'), employeeController.getEmploymentHistory);
router.get('/employees/:id/rehire-eligibility', requirePermission('employees:read'), employeeController.checkRehireEligibility);

// Create operations - require 'employees:create'
router.post('/employees', requirePermission('employees:create'), employeeController.createEmployee);

// Edit operations - require 'employees:update'
router.patch('/employees/:id', requirePermission('employees:update'), employeeController.updateEmployee);
router.post('/employees/:id/rehire', requirePermission('employees:update'), employeeController.rehireEmployee);

// Terminate operations - require 'employees:terminate'
router.post('/employees/:id/terminate', requirePermission('employees:terminate'), employeeController.terminateEmployee);

// Delete operations - require 'employees:delete'
router.delete('/employees/:id', requirePermission('employees:delete'), employeeController.deleteEmployee);

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
router.get('/time-off/requests', requirePermission('timeoff:read'), timeOffController.getRequests);
router.get('/time-off/balances/:employeeId', requirePermission('timeoff:read'), timeOffController.getBalances);

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
// ========== BENEFITS ROUTES ==========
router.post('/benefits/plans', requirePermission('benefits:create'), benefitsController.createPlan);
router.get('/benefits/plans/:id', requirePermission('benefits:read'), benefitsController.getPlan);
router.get('/benefits/plans', requirePermission('benefits:read'), benefitsController.listPlans);
router.patch('/benefits/plans/:id', requirePermission('benefits:update'), benefitsController.updatePlan);

router.post('/benefits/enrollments', requirePermission('benefits:create'), benefitsController.enrollEmployee);
router.get('/benefits/enrollments/employee/:employeeId', requirePermission('benefits:read'), benefitsController.getEmployeeEnrollments); // Specific route first
router.get('/benefits/enrollments/:id', requirePermission('benefits:read'), benefitsController.getEnrollment);
router.get('/benefits/enrollments', requirePermission('benefits:read'), benefitsController.listEnrollments); // General route last
router.patch('/benefits/enrollments/:id', requirePermission('benefits:update'), benefitsController.updateEnrollment);
router.post('/benefits/enrollments/:id/terminate', requirePermission('benefits:update'), benefitsController.terminateEnrollment);

// ========== ATTENDANCE ROUTES ==========
// View operations - require 'attendance:view'
router.get('/attendance/records/today', requirePermission('attendance:read'), attendanceController.getTodayAttendance);
router.get('/attendance/statistics', requirePermission('attendance:read'), attendanceController.getAttendanceStatistics);
router.get('/attendance/:id', requirePermission('attendance:read'), attendanceController.getAttendance);
router.get('/attendance/employee/:employeeId', requirePermission('attendance:read'), attendanceController.getEmployeeAttendance);
router.get('/attendance/employee/:employeeId/summary', requirePermission('attendance:read'), attendanceController.getAttendanceSummary);

// Record attendance - require 'attendance:record'
router.post('/attendance/clock-in', requirePermission('attendance:create'), attendanceController.clockIn);
router.post('/attendance/clock-out', requirePermission('attendance:create'), attendanceController.clockOut);

// Manual attendance - require 'attendance:approve'
router.post('/attendance/manual', requirePermission('attendance:approve'), attendanceController.createManualAttendance);

// ========== DEPARTMENT ROUTES ==========
// View operations - require 'departments:read'
router.get('/departments/structure/full', requirePermission('departments:read'), departmentController.getOrganizationStructure);
router.get('/departments/:id/hierarchy', requirePermission('departments:read'), departmentController.getDepartmentHierarchy);
router.get('/departments/:id/employees', requirePermission('departments:read'), departmentController.getDepartmentEmployees);
router.get('/departments/:id', requirePermission('departments:read'), departmentController.getDepartment);
router.get('/departments', requirePermission('departments:read'), departmentController.getDepartments);

// Manage operations - require 'departments:manage'
router.post('/departments', requirePermission('departments:manage'), departmentController.createDepartment);
router.patch('/departments/:id', requirePermission('departments:manage'), departmentController.updateDepartment);
router.delete('/departments/:id', requirePermission('departments:manage'), departmentController.deleteDepartment);

// ========== LOCATION ROUTES ==========
// View operations - require 'locations:read'
router.get('/locations/stats/all', requirePermission('locations:read'), locationController.getAllLocationStats);
router.get('/locations/code/:code', requirePermission('locations:read'), locationController.getLocationByCode);
router.get('/locations/:id/stats', requirePermission('locations:read'), locationController.getLocationStats);
router.get('/locations/:id', requirePermission('locations:read'), locationController.getLocation);
router.get('/locations', requirePermission('locations:read'), locationController.getLocations);

// Manage operations - require 'locations:manage'
router.post('/locations', requirePermission('locations:manage'), locationController.createLocation);
router.patch('/locations/:id', requirePermission('locations:manage'), locationController.updateLocation);
router.delete('/locations/:id', requirePermission('locations:manage'), locationController.deleteLocation);

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
// All reports require 'reports:view'
router.get('/reports/dashboard', requirePermission('reports:view'), reportsController.getDashboardReport);
router.get('/reports/headcount', requirePermission('reports:headcount'), reportsController.getHeadcountReport);
router.get('/reports/turnover', requirePermission('reports:turnover'), reportsController.getTurnoverReport);
router.get('/reports/time-off', requirePermission('reports:view'), reportsController.getTimeOffReport);
router.get('/reports/attendance', requirePermission('reports:attendance'), reportsController.getAttendanceReport);
router.get('/reports/performance', requirePermission('reports:view'), reportsController.getPerformanceReport);
router.get('/reports/benefits', requirePermission('reports:view'), reportsController.getBenefitsReport);

// ========== VIP EMPLOYEE ROUTES ==========
// VIP employee management and access control
router.use('/vip-employees', vipEmployeesRoutes);

export default router;
