/**
 * EmployeeController
 * HTTP request handlers for employee management
 */

import EmployeeService from '../services/employeeService.js';
import logger from '../../../utils/logger.js';

class EmployeeController {
  constructor() {
    this.service = new EmployeeService();
    this.logger = logger;
  }

  /**
   * Create a new employee
   * POST /api/nexus/employees
   */
  createEmployee = async (req, res) => {
    try {
      const { organization_id: organizationId, id: userId } = req.user;
      const employee = await this.service.createEmployee(req.body, organizationId, userId);
      res.status(201).json({ success: true, data: employee });
    } catch (error) {
      this.logger.error('Error in createEmployee controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Get employee by ID
   * GET /api/nexus/employees/:id
   */
  getEmployee = async (req, res) => {
    try {
      const { organization_id: organizationId } = req.user;
      const { id } = req.params;
      const employee = await this.service.getEmployee(id, organizationId);
      res.json({ success: true, data: employee });
    } catch (error) {
      this.logger.error('Error in getEmployee controller', { error: error.message });
      const status = error.message === 'Employee not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * List employees with filters
   * GET /api/nexus/employees
   */
  listEmployees = async (req, res) => {
    try {
      const { organization_id: organizationId } = req.user;
      const { 
        departmentId, 
        locationId, 
        employmentStatus, 
        employmentType,
        search,
        limit = 50, 
        offset = 0 
      } = req.query;

      const filters = {};
      if (departmentId) filters.departmentId = departmentId;
      if (locationId) filters.locationId = locationId;
      if (employmentStatus) filters.employmentStatus = employmentStatus;
      if (employmentType) filters.employmentType = employmentType;
      if (search) filters.search = search;

      const options = { 
        limit: parseInt(limit), 
        offset: parseInt(offset) 
      };

      const result = await this.service.listEmployees(filters, organizationId, options);
      res.json({ 
        success: true, 
        data: result.employees, 
        total: result.total,
        limit: options.limit,
        offset: options.offset
      });
    } catch (error) {
      this.logger.error('Error in listEmployees controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Update employee
   * PATCH /api/nexus/employees/:id
   */
  updateEmployee = async (req, res) => {
    try {
      const { organization_id: organizationId, id: userId } = req.user;
      const { id } = req.params;
      const employee = await this.service.updateEmployee(id, req.body, organizationId, userId);
      res.json({ success: true, data: employee });
    } catch (error) {
      this.logger.error('Error in updateEmployee controller', { error: error.message });
      const status = error.message === 'Employee not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Terminate employee
   * POST /api/nexus/employees/:id/terminate
   */
  terminateEmployee = async (req, res) => {
    try {
      const { organization_id: organizationId, id: userId } = req.user;
      const { id } = req.params;
      const employee = await this.service.terminateEmployee(id, req.body, organizationId, userId);
      res.json({ success: true, data: employee });
    } catch (error) {
      this.logger.error('Error in terminateEmployee controller', { error: error.message });
      const status = error.message === 'Employee not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Delete employee (soft delete)
   * DELETE /api/nexus/employees/:id
   */
  deleteEmployee = async (req, res) => {
    try {
      const { organization_id: organizationId, id: userId } = req.user;
      const { id } = req.params;
      await this.service.deleteEmployee(id, organizationId, userId);
      res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (error) {
      this.logger.error('Error in deleteEmployee controller', { error: error.message });
      const status = error.message === 'Employee not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Get organization chart
   * GET /api/nexus/employees/org-chart
   */
  getOrgChart = async (req, res) => {
    try {
      const { organization_id: organizationId } = req.user;
      const orgChart = await this.service.getOrgChart(organizationId);
      res.json({ success: true, data: orgChart });
    } catch (error) {
      this.logger.error('Error in getOrgChart controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Search employees
   * GET /api/nexus/employees/search
   */
  searchEmployees = async (req, res) => {
    try {
      const { organization_id: organizationId } = req.user;
      const { q, limit = 20 } = req.query;

      if (!q) {
        return res.status(400).json({ success: false, error: 'Search query is required' });
      }

      const employees = await this.service.searchEmployees(q, organizationId, { limit: parseInt(limit) });
      res.json({ success: true, data: employees });
    } catch (error) {
      this.logger.error('Error in searchEmployees controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

export default EmployeeController;
