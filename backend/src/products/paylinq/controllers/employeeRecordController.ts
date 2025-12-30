/**
 * Paylinq Employee Record Controller
 * Handles HTTP requests for employee payroll records management
 */

import PayrollService from '../services/payrollService.js';

const payrollService = new PayrollService();
import { mapApiToDb, mapEmployeeDbToApi, mapEmployeeDbArrayToApi } from '../utils/dtoMapper.js';
import logger from '../../../utils/logger.js';

/**
 * Create a new employee payroll record
 * POST /api/paylinq/employees
 */
async function createEmployeeRecord(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const employeeData = mapApiToDb(req.body);

    const employee = await payrollService.createEmployeeRecord(employeeData, organizationId, userId);

    logger.info('Employee payroll record created', {
      organizationId,
      employeeId: employee.id,
      userId,
    });

    res.status(201).json({
      success: true,
      employee: mapEmployeeDbToApi(employee),
      message: 'Employee record created successfully',
    });
  } catch (error) {
    logger.error('Error creating employee record', {
      error: error.message,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: error.message,
      });
    }

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Get all employee payroll records
 * GET /api/paylinq/employees
 */
async function getEmployeeRecords(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { 
      status, 
      workerTypeId, 
      departmentId, 
      includeInactive,
      page = 1,
      limit = 10,
      sortField = 'created_at',
      sortDirection = 'desc'
    } = req.query;

    const filters = {
      status,
      workerTypeId,
      departmentId,
      includeInactive: includeInactive === 'true',
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sortField,
      sortDirection: sortDirection.toLowerCase(),
    };

    const result = await payrollService.getEmployeesByOrganization(organizationId, filters);

    res.status(200).json({
      success: true,
      employees: mapEmployeeDbArrayToApi(result.employees),
      pagination: result.pagination,
      count: result.employees.length,
    });
  } catch (error) {
    logger.error('Error fetching employee records', {
      error: error.message,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch employee records',
    });
  }
}

/**
 * Get a single employee payroll record by ID
 * GET /api/paylinq/employees/:id
 */
async function getEmployeeRecordById(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { id } = req.params;

    const employee = await payrollService.getEmployeeById(id, organizationId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Employee record not found',
      });
    }

    res.status(200).json({
      success: true,
      employee: mapEmployeeDbToApi(employee),
    });
  } catch (error) {
    // Handle NotFoundError
    if (error.message === 'Employee record not found' || error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Employee record not found',
      });
    }

    logger.error('Error fetching employee record', {
      error: error.message,
      employeeId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch employee record',
    });
  }
}

/**
 * Update an employee payroll record
 * PUT /api/paylinq/employees/:id
 */
async function updateEmployeeRecord(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = mapApiToDb(req.body);

    const employee = await payrollService.updateEmployeeRecord(id, updateData, organizationId, userId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Employee record not found',
      });
    }

    logger.info('Employee payroll record updated', {
      organizationId,
      employeeId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      employee: mapEmployeeDbToApi(employee),
      message: 'Employee record updated successfully',
    });
  } catch (error) {
    logger.error('Error updating employee record', {
      error: error.message,
      employeeId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    // Handle NotFoundError with 404 status
    if (error.message === 'Employee record not found' || error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Employee record not found'
      });
    }

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: error.message,
    });
  }
}

/**
 * Delete an employee payroll record
 * DELETE /api/paylinq/employees/:id
 */
async function deleteEmployeeRecord(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { id } = req.params;

    const deleted = await payrollService.deleteEmployeeRecord(id, organizationId, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Employee record not found',
      });
    }

    logger.info('Employee payroll record deleted', {
      organizationId,
      employeeId: id,
      userId,
    });

    res.status(200).json({
      success: true,
      message: 'Employee record deleted successfully',
    });
  } catch (error) {
    // Handle NotFoundError
    if (error.message === 'Employee record not found' || error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Employee record not found',
      });
    }

    logger.error('Error deleting employee record', {
      error: error.message,
      employeeId: req.params.id,
      organizationId: req.user?.organization_id,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete employee record',
    });
  }
}

/**
 * Get employee payroll history
 * GET /api/paylinq/employees/:id/history
 */
async function getEmployeePayrollHistory(req, res) {
  try {
    const organizationId = req.user.organization_id;
    const { id } = req.params;
    const { startDate, endDate, limit } = req.query;

    const filters = {
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 12,
    };

    const history = await payrollService.getEmployeePayrollHistory(id, organizationId, filters);

    res.status(200).json({
      success: true,
      history: history,
      count: history.length,
    });
  } catch (error) {
    // Handle NotFoundError
    if (error.message === 'Employee record not found' || error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Employee record not found',
      });
    }

    logger.error('Error fetching employee payroll history', {
      error: error.message,
      employeeId: req.params.id,
      organizationId: req.user?.organization_id,
    });

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch payroll history',
    });
  }
}

export default {
  createEmployeeRecord,
  getEmployeeRecords,
  getEmployeeRecordById,
  updateEmployeeRecord,
  deleteEmployeeRecord,
  getEmployeePayrollHistory,
};
