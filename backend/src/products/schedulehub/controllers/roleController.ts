/**
 * ScheduleHub Role Controller
 * HTTP request handlers for role and worker assignment management
 */

import RoleService from '../services/roleService.ts';
import logger from '../../../utils/logger.ts';

class RoleController {
  constructor() {
    this.roleService = new RoleService();
  }

  /**
   * Create a new role
   * POST /api/schedulehub/roles
   */
  createRole = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;

      // Debug logging to see actual request data
      logger.info('Controller received request body:', {
        bodyKeys: Object.keys(req.body),
        bodyData: req.body
      });

      const result = await this.roleService.createRole(
        req.body,
        organizationId,
        userId
      );

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createRole controller:', error);
      next(error);
    }
  };

  /**
   * Update role
   * PATCH /api/schedulehub/roles/:id
   */
  updateRole = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { id } = req.params;

      const result = await this.roleService.updateRole(
        id,
        req.body,
        organizationId,
        userId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in updateRole controller:', error);
      next(error);
    }
  };

  /**
   * List roles
   * GET /api/schedulehub/roles
   */
  listRoles = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { isActive, departmentId } = req.query;

      const result = await this.roleService.listRoles(
        organizationId,
        isActive === 'true',
        departmentId
      );

      // Return consistent format expected by frontend: { roles: Role[] }
      res.json({ 
        success: true, 
        roles: result.data || result  // Handle both old and new service formats
      });
    } catch (error) {
      logger.error('Error in listRoles controller:', error);
      next(error);
    }
  };

  /**
   * Get role by ID
   * GET /api/schedulehub/roles/:id
   */
  getRoleById = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const result = await this.roleService.getRoleById(id, organizationId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Error in getRoleById controller:', error);
      next(error);
    }
  };

  /**
   * Get workers assigned to role
   * GET /api/schedulehub/roles/:id/workers
   */
  getRoleWorkers = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { id } = req.params;
      const { includeInactive } = req.query;

      const result = await this.roleService.getRoleWorkers(
        id,
        organizationId,
        includeInactive === 'true'
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in getRoleWorkers controller:', error);
      next(error);
    }
  };

  /**
   * Assign worker to role
   * POST /api/schedulehub/roles/:roleId/workers
   */
  assignWorker = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { roleId } = req.params;
      const { workerId, proficiencyLevel, certificationDate, notes } = req.body;

      const result = await this.roleService.assignWorkerToRole(
        workerId,
        roleId,
        organizationId,
        proficiencyLevel,
        certificationDate,
        notes,
        userId
      );

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in assignWorker controller:', error);
      next(error);
    }
  };

  /**
   * Remove worker from role
   * DELETE /api/schedulehub/roles/:roleId/workers/:workerId
   */
  removeWorker = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { roleId, workerId } = req.params;

      const result = await this.roleService.removeWorkerFromRole(
        workerId,
        roleId,
        organizationId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in removeWorker controller:', error);
      next(error);
    }
  };

  /**
   * Get worker's roles
   * GET /api/schedulehub/workers/:workerId/roles
   */
  getWorkerRoles = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const { workerId } = req.params;
      const { includeInactive } = req.query;

      const result = await this.roleService.getWorkerRoles(
        workerId,
        organizationId,
        includeInactive === 'true'
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in getWorkerRoles controller:', error);
      next(error);
    }
  };

  /**
   * Update worker role assignment
   * PATCH /api/schedulehub/roles/:roleId/workers/:workerId
   */
  updateWorkerRole = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { roleId, workerId } = req.params;
      const { proficiencyLevel, certificationDate, notes } = req.body;

      // First remove, then re-assign with new details
      await this.roleService.removeWorkerFromRole(workerId, roleId, organizationId);
      
      const result = await this.roleService.assignWorkerToRole(
        workerId,
        roleId,
        organizationId,
        proficiencyLevel,
        certificationDate,
        notes,
        userId
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in updateWorkerRole controller:', error);
      next(error);
    }
  };

  /**
   * Delete (soft delete) a role
   * DELETE /api/schedulehub/roles/:id
   * 
   * Note: This uses the isActive flag for soft delete, consistent with the
   * existing role schema which doesn't have a deleted_at column. The role
   * remains in the database but is excluded from active role listings.
   */
  deleteRole = async (req, res, next) => {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { id } = req.params;

      // Soft delete by setting isActive to false (consistent with role schema)
      const result = await this.roleService.updateRole(
        id,
        { isActive: false },
        organizationId,
        userId
      );

      res.json({ success: true, message: 'Role deleted successfully', role: result.data });
    } catch (error) {
      logger.error('Error in deleteRole controller:', error);
      next(error);
    }
  };
}

export default RoleController;
