import RoleService from '../services/RoleService.js';
import logger from '../../../utils/logger.js';

const roleService = new RoleService();

/**
 * List all roles
 * GET /api/rbac/roles
 */
export const listRoles = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { product, isActive, isSystem } = req.query;
    
    const filters = {};
    if (product) filters.product = product;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isSystem !== undefined) filters.isSystem = isSystem === 'true';

    const roles = await roleService.list(organizationId, filters);

    res.json({
      success: true,
      roles,
      count: roles.length
    });
  } catch (error) {
    logger.error('Error listing roles', {
      error: error.message,
      organizationId: req.user.organizationId,
      query: req.query
    });
    next(error);
  }
};

/**
 * Get role by ID
 * GET /api/rbac/roles/:id
 */
export const getRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const role = await roleService.getById(id, organizationId, true);

    res.json({
      success: true,
      role
    });
  } catch (error) {
    if (error.message === 'Role not found') {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    
    logger.error('Error getting role', {
      error: error.message,
      roleId: req.params.id,
      organizationId: req.user.organizationId
    });
    next(error);
  }
};

/**
 * Create new role
 * POST /api/rbac/roles
 */
export const createRole = async (req, res, next) => {
  try {
    const { organizationId, id: userId } = req.user;
    const roleData = req.body;

    const role = await roleService.create(roleData, organizationId, userId);

    res.status(201).json({
      success: true,
      role,
      message: 'Role created successfully'
    });
  } catch (error) {
    if (error.name === 'ValidationError' || error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    logger.error('Error creating role', {
      error: error.message,
      data: req.body,
      organizationId: req.user.organizationId,
      userId: req.user.id
    });
    next(error);
  }
};

/**
 * Update role
 * PATCH /api/rbac/roles/:id
 */
export const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId, id: userId } = req.user;
    const updateData = req.body;

    const role = await roleService.update(id, updateData, organizationId, userId);

    res.json({
      success: true,
      role,
      message: 'Role updated successfully'
    });
  } catch (error) {
    if (error.message === 'Role not found') {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    
    if (error.message.includes('Cannot modify system roles') || error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    logger.error('Error updating role', {
      error: error.message,
      roleId: req.params.id,
      data: req.body,
      organizationId: req.user.organizationId,
      userId: req.user.id
    });
    next(error);
  }
};

/**
 * Delete role
 * DELETE /api/rbac/roles/:id
 */
export const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId, id: userId } = req.user;

    await roleService.delete(id, organizationId, userId);

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    if (error.message === 'Role not found') {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    
    if (error.message.includes('Cannot delete system roles')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    logger.error('Error deleting role', {
      error: error.message,
      roleId: req.params.id,
      organizationId: req.user.organizationId,
      userId: req.user.id
    });
    next(error);
  }
};

/**
 * Assign permissions to role
 * POST /api/rbac/roles/:id/permissions
 */
export const assignPermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { organizationId, id: userId } = req.user;
    const { permissionIds } = req.body;

    const role = await roleService.assignPermissions(id, permissionIds, organizationId, userId);

    res.json({
      success: true,
      role,
      message: 'Permissions assigned successfully'
    });
  } catch (error) {
    if (error.message === 'Role not found') {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }
    
    if (error.message.includes('Cannot modify permissions for system roles') || 
        error.message.includes('permission IDs are invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    logger.error('Error assigning permissions', {
      error: error.message,
      roleId: req.params.id,
      permissionIds: req.body.permissionIds,
      organizationId: req.user.organizationId,
      userId: req.user.id
    });
    next(error);
  }
};
