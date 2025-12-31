/**
 * ProductPermission Controller
 * HTTP handlers for product permission endpoints
 */

import { productPermissionService } from '../services/index.js';

class ProductPermissionController {
  /**
   * GET /api/organizations/:organizationId/products
   * Get all products for an organization
   */
  async getOrganizationProducts(req, res) {
    try {
      const { organizationId } = req.params;
      const { enabled } = req.query;

      let products;
      if (enabled === 'true') {
        products = await productPermissionService.getEnabledProducts(organizationId);
      } else {
        products = await productPermissionService.getOrganizationPermissions(organizationId);
      }

      res.json(products);
    } catch (_error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/organizations/:organizationId/products/:productId
   * Check if organization has access to product
   */
  async checkAccess(req, res) {
    try {
      const { organizationId, productId } = req.params;
      const { accessLevel } = req.query;

      let hasAccess;
      if (accessLevel) {
        hasAccess = await productPermissionService.hasAccessLevel(organizationId, productId, accessLevel);
      } else {
        hasAccess = await productPermissionService.hasAccess(organizationId, productId);
      }

      res.json({ hasAccess });
    } catch (_error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/organizations/:organizationId/products/:productId/features/:featureKey
   * Check if feature is enabled
   */
  async checkFeature(req, res) {
    try {
      const { organizationId, productId, featureKey } = req.params;
      const isEnabled = await productPermissionService.isFeatureEnabled(organizationId, productId, featureKey);
      res.json({ isEnabled });
    } catch (_error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/organizations/:organizationId/products/:productId/grant
   * Grant product access to organization
   */
  async grantAccess(req, res) {
    try {
      const { organizationId, productId } = req.params;
      const userId = req.user?.id;

      const permissionData = {
        organizationId,
        productId,
        ...req.body
      };

      const permission = await productPermissionService.grantAccess(permissionData, userId);
      res.status(201).json(permission);
    } catch (_error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * PATCH /api/organizations/:organizationId/products/:productId
   * Update permission
   */
  async updatePermission(req, res) {
    try {
      const { organizationId, productId } = req.params;
      const userId = req.user?.id;

      const permission = await productPermissionService.updatePermission(
        organizationId,
        productId,
        req.body,
        userId
      );

      res.json(permission);
    } catch (_error) {
      if (error.message === 'Permission not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /api/organizations/:organizationId/products/:productId/revoke
   * Revoke product access
   */
  async revokeAccess(req, res) {
    try {
      const { organizationId, productId } = req.params;
      const userId = req.user?.id;

      const permission = await productPermissionService.revokeAccess(organizationId, productId, userId);
      res.json(permission);
    } catch (_error) {
      if (error.message === 'Permission not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /api/organizations/:organizationId/products/:productId/features/:featureKey/enable
   * Enable feature for organization
   */
  async enableFeature(req, res) {
    try {
      const { organizationId, productId, featureKey } = req.params;
      const userId = req.user?.id;

      const permission = await productPermissionService.enableFeature(
        organizationId,
        productId,
        featureKey,
        userId
      );

      res.json(permission);
    } catch (_error) {
      if (error.message === 'Permission not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /api/organizations/:organizationId/products/:productId/features/:featureKey/disable
   * Disable feature for organization
   */
  async disableFeature(req, res) {
    try {
      const { organizationId, productId, featureKey } = req.params;
      const userId = req.user?.id;

      const permission = await productPermissionService.disableFeature(
        organizationId,
        productId,
        featureKey,
        userId
      );

      res.json(permission);
    } catch (_error) {
      if (error.message === 'Permission not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * PATCH /api/organizations/:organizationId/products/:productId/usage
   * Update usage counters
   */
  async updateUsage(req, res) {
    try {
      const { organizationId, productId } = req.params;
      const { usersCount, resourcesCount } = req.body;

      const permission = await productPermissionService.updateUsage(
        organizationId,
        productId,
        usersCount,
        resourcesCount
      );

      res.json(permission);
    } catch (_error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * GET /api/products/licenses/expired
   * Check and get expired licenses (admin only)
   */
  async getExpiredLicenses(req, res) {
    try {
      const expiredLicenses = await productPermissionService.checkExpiredLicenses();
      res.json(expiredLicenses);
    } catch (_error) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new ProductPermissionController();
