/**
 * DepartmentController
 * HTTP request handlers for department management
 */

import DepartmentService from '../services/departmentService.js';
import logger from '../../../utils/logger.js';

class DepartmentController {
  constructor() {
    this.service = new DepartmentService();
    this.logger = logger;
  }

  /**
   * Create department
   * POST /api/nexus/departments
   */
  createDepartment = async (req, res) => {
    try {
      const { organizationId, userId } = req.auth;
      const department = await this.service.createDepartment(req.body, organizationId, userId);
      res.status(201).json({ success: true, data: department });
    } catch (error) {
      this.logger.error('Error in createDepartment controller', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  };

  /**
   * Get department by ID
   * GET /api/nexus/departments/:id
   */
  getDepartment = async (req, res) => {
    try {
      const { organizationId } = req.auth;
      const { id } = req.params;
      const department = await this.service.getDepartment(id, organizationId);
      res.json({ success: true, data: department });
    } catch (error) {
      this.logger.error('Error in getDepartment controller', { error: error.message });
      const status = error.message === 'Department not found' ? 404 : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Update department
   * PATCH /api/nexus/departments/:id
   */
  updateDepartment = async (req, res) => {
    try {
      const { organizationId, userId } = req.auth;
      const { id } = req.params;
      const department = await this.service.updateDepartment(id, req.body, organizationId, userId);
      res.json({ success: true, data: department });
    } catch (error) {
      this.logger.error('Error in updateDepartment controller', { error: error.message });
      const status = error.message === 'Department not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Delete department
   * DELETE /api/nexus/departments/:id
   */
  deleteDepartment = async (req, res) => {
    try {
      const { organizationId, userId } = req.auth;
      const { id } = req.params;
      await this.service.deleteDepartment(id, organizationId, userId);
      res.json({ success: true, message: 'Department deleted successfully' });
    } catch (error) {
      this.logger.error('Error in deleteDepartment controller', { error: error.message });
      const status = error.message === 'Department not found' ? 404 : 400;
      res.status(status).json({ success: false, error: error.message });
    }
  };

  /**
   * Get all departments
   * GET /api/nexus/departments
   */
  getDepartments = async (req, res) => {
    try {
      const { organizationId } = req.auth;
      const { locationId, managerId, limit = 50, offset = 0 } = req.query;

      const filters = {};
      if (locationId) filters.locationId = locationId;
      if (managerId) filters.managerId = managerId;

      const departments = await this.service.listDepartments(
        filters,
        organizationId,
        { limit: parseInt(limit), offset: parseInt(offset) }
      );
      res.json({ success: true, data: departments });
    } catch (error) {
      this.logger.error('Error in getDepartments controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get department hierarchy
   * GET /api/nexus/departments/:id/hierarchy
   */
  getDepartmentHierarchy = async (req, res) => {
    try {
      const { organizationId } = req.auth;
      const { id } = req.params;
      const hierarchy = await this.service.getDepartmentHierarchy(id, organizationId);
      res.json({ success: true, data: hierarchy });
    } catch (error) {
      this.logger.error('Error in getDepartmentHierarchy controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get organization structure (full hierarchy)
   * GET /api/nexus/departments/structure/full
   */
  getOrganizationStructure = async (req, res) => {
    try {
      const { organizationId } = req.auth;
      const structure = await this.service.getOrganizationStructure(organizationId);
      res.json({ success: true, data: structure });
    } catch (error) {
      this.logger.error('Error in getOrganizationStructure controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get department employees
   * GET /api/nexus/departments/:id/employees
   */
  getDepartmentEmployees = async (req, res) => {
    try {
      const { organizationId } = req.auth;
      const { id } = req.params;
      const { includeSubdepartments = 'false' } = req.query;

      const employees = await this.service.getDepartmentEmployees(
        id,
        organizationId,
        includeSubdepartments === 'true'
      );
      res.json({ success: true, data: employees });
    } catch (error) {
      this.logger.error('Error in getDepartmentEmployees controller', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

export default DepartmentController;
