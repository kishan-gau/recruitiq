import PermissionService from '../services/PermissionService.js';
import logger from '../../../utils/logger.js';

const permissionService = new PermissionService();

/**
 * List all permissions
 * GET /api/rbac/permissions
 */
export const listPermissions = async (req, res, next) => {
  try {
    const { product, category } = req.query;
    
    const filters = {};
    if (product) filters.product = product;
    if (category) filters.category = category;

    const permissions = await permissionService.list(filters);

    res.json({
      success: true,
      permissions,
      count: permissions.length
    });
  } catch (error) {
    logger.error('Error listing permissions', {
      error: error.message,
      query: req.query
    });
    next(error);
  }
};

/**
 * Get permissions grouped by product and category
 * GET /api/rbac/permissions/grouped
 */
export const getGroupedPermissions = async (req, res, next) => {
  try {
    const grouped = await permissionService.getGrouped();

    res.json({
      success: true,
      grouped
    });
  } catch (error) {
    logger.error('Error getting grouped permissions', {
      error: error.message
    });
    next(error);
  }
};

/**
 * Get permissions by product
 * GET /api/rbac/permissions/product/:product
 */
export const getPermissionsByProduct = async (req, res, next) => {
  try {
    const { product } = req.params;
    
    const permissions = await permissionService.getByProduct(product);

    res.json({
      success: true,
      product,
      permissions,
      count: permissions.length
    });
  } catch (error) {
    logger.error('Error getting permissions by product', {
      error: error.message,
      product: req.params.product
    });
    next(error);
  }
};
