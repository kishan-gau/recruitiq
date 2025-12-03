/**
 * VIP Employee Controller
 * 
 * HTTP request handlers for VIP employee management.
 * Controllers only handle HTTP parsing and response formatting;
 * all business logic is in VIPEmployeeService.
 * 
 * @module products/nexus/controllers/vipEmployeeController
 */

import VIPEmployeeService from '../services/vipEmployeeService.js';
import logger from '../../../utils/logger.js';

class VIPEmployeeController {
  constructor() {
    this.service = new VIPEmployeeService();
    
    // Bind methods
    this.listVIPEmployees = this.listVIPEmployees.bind(this);
    this.getVIPCount = this.getVIPCount.bind(this);
    this.getVIPStatus = this.getVIPStatus.bind(this);
    this.markAsVIP = this.markAsVIP.bind(this);
    this.updateVIPStatus = this.updateVIPStatus.bind(this);
    this.updateAccessControl = this.updateAccessControl.bind(this);
    this.removeVIPStatus = this.removeVIPStatus.bind(this);
    this.getAuditLog = this.getAuditLog.bind(this);
    this.checkAccess = this.checkAccess.bind(this);
  }

  /**
   * List VIP employees with filters
   * GET /vip-employees
   */
  async listVIPEmployees(req, res, next) {
    try {
      const organizationId = req.user.organizationId || req.user.organization_id;
      const filters = {
        search: req.query.search,
        isRestricted: req.query.isRestricted,
        restrictionLevel: req.query.restrictionLevel,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await this.service.listVIPEmployees(organizationId, filters);

      return res.status(200).json({
        success: true,
        vipEmployees: result.vipEmployees,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error listing VIP employees', {
        error: error.message,
        organizationId: req.user?.organizationId
      });
      next(error);
    }
  }

  /**
   * Get count of VIP employees
   * GET /vip-employees/count
   */
  async getVIPCount(req, res, next) {
    try {
      const organizationId = req.user.organizationId || req.user.organization_id;
      
      const count = await this.service.getVIPCount(organizationId);

      return res.status(200).json({
        success: true,
        count
      });
    } catch (error) {
      logger.error('Error getting VIP employees count', {
        error: error.message,
        organizationId: req.user?.organizationId
      });
      next(error);
    }
  }

  /**
   * Get VIP status for an employee
   * GET /vip-employees/:employeeId
   */
  async getVIPStatus(req, res, next) {
    try {
      const { employeeId } = req.params;
      const organizationId = req.user.organizationId || req.user.organization_id;

      const vipStatus = await this.service.getVIPStatus(employeeId, organizationId);

      return res.status(200).json({
        success: true,
        vipStatus
      });
    } catch (error) {
      logger.error('Error getting VIP status', {
        error: error.message,
        employeeId: req.params.employeeId,
        organizationId: req.user?.organizationId
      });
      next(error);
    }
  }

  /**
   * Mark employee as VIP
   * POST /vip-employees/:employeeId
   */
  async markAsVIP(req, res, next) {
    try {
      const { employeeId } = req.params;
      const organizationId = req.user.organizationId || req.user.organization_id;
      const userId = req.user.id;
      const vipData = req.body;

      const result = await this.service.markAsVIP(
        employeeId,
        vipData,
        organizationId,
        userId
      );

      return res.status(201).json({
        success: true,
        vipEmployee: result,
        message: 'Employee marked as VIP successfully'
      });
    } catch (error) {
      logger.error('Error marking employee as VIP', {
        error: error.message,
        employeeId: req.params.employeeId,
        organizationId: req.user?.organizationId
      });
      next(error);
    }
  }

  /**
   * Update VIP status settings
   * PATCH /vip-employees/:employeeId
   */
  async updateVIPStatus(req, res, next) {
    try {
      const { employeeId } = req.params;
      const organizationId = req.user.organizationId || req.user.organization_id;
      const userId = req.user.id;
      const updates = req.body;

      const result = await this.service.markAsVIP(
        employeeId,
        updates,
        organizationId,
        userId
      );

      return res.status(200).json({
        success: true,
        vipEmployee: result,
        message: 'VIP status updated successfully'
      });
    } catch (error) {
      logger.error('Error updating VIP status', {
        error: error.message,
        employeeId: req.params.employeeId,
        organizationId: req.user?.organizationId
      });
      next(error);
    }
  }

  /**
   * Update access control rules
   * PATCH /vip-employees/:employeeId/access-control
   */
  async updateAccessControl(req, res, next) {
    try {
      const { employeeId } = req.params;
      const organizationId = req.user.organizationId || req.user.organization_id;
      const userId = req.user.id;
      const accessControlData = req.body;

      const result = await this.service.updateAccessControl(
        employeeId,
        accessControlData,
        organizationId,
        userId
      );

      return res.status(200).json({
        success: true,
        accessControl: result,
        message: 'Access control rules updated successfully'
      });
    } catch (error) {
      logger.error('Error updating access control', {
        error: error.message,
        employeeId: req.params.employeeId,
        organizationId: req.user?.organizationId
      });
      next(error);
    }
  }

  /**
   * Remove VIP status from employee
   * DELETE /vip-employees/:employeeId
   */
  async removeVIPStatus(req, res, next) {
    try {
      const { employeeId } = req.params;
      const organizationId = req.user.organizationId || req.user.organization_id;
      const userId = req.user.id;

      await this.service.removeVIPStatus(
        employeeId,
        organizationId,
        userId
      );

      return res.status(200).json({
        success: true,
        message: 'VIP status removed successfully'
      });
    } catch (error) {
      logger.error('Error removing VIP status', {
        error: error.message,
        employeeId: req.params.employeeId,
        organizationId: req.user?.organizationId
      });
      next(error);
    }
  }

  /**
   * Get audit log for VIP employee access
   * GET /vip-employees/:employeeId/audit-log
   */
  async getAuditLog(req, res, next) {
    try {
      const { employeeId } = req.params;
      const organizationId = req.user.organizationId || req.user.organization_id;
      const filters = {
        accessType: req.query.accessType,
        accessGranted: req.query.accessGranted,
        userId: req.query.userId,
        fromDate: req.query.fromDate,
        toDate: req.query.toDate,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await this.service.getAuditLog(
        employeeId,
        organizationId,
        filters
      );

      return res.status(200).json({
        success: true,
        auditLog: result.logs,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting VIP audit log', {
        error: error.message,
        employeeId: req.params.employeeId,
        organizationId: req.user?.organizationId
      });
      next(error);
    }
  }

  /**
   * Check if current user has access to VIP employee
   * GET /vip-employees/:employeeId/check-access
   */
  async checkAccess(req, res, next) {
    try {
      const { employeeId } = req.params;
      const organizationId = req.user.organizationId || req.user.organization_id;
      const userId = req.user.id;
      const accessType = req.query.accessType || 'general';

      const result = await this.service.checkAccess(
        employeeId,
        userId,
        organizationId,
        accessType,
        {
          endpoint: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('user-agent')
        }
      );

      return res.status(200).json({
        success: true,
        access: {
          granted: result.granted,
          reason: result.reason
        }
      });
    } catch (error) {
      logger.error('Error checking VIP access', {
        error: error.message,
        employeeId: req.params.employeeId,
        organizationId: req.user?.organizationId
      });
      next(error);
    }
  }
}

export default VIPEmployeeController;
