/**
 * ProductFeature Controller
 * HTTP handlers for product feature management endpoints
 */

import { productFeatureService } from '../services/index.js';

class ProductFeatureController {
  /**
   * GET /api/products/:productId/features
   * Get all features for a product
   */
  async getProductFeatures(req, res) {
    try {
      const { productId } = req.params;
      const { status, defaultOnly } = req.query;

      let features;
      if (status) {
        features = await productFeatureService.getFeaturesByStatus(productId, status);
      } else if (defaultOnly === 'true') {
        features = await productFeatureService.getDefaultFeatures(productId);
      } else {
        features = await productFeatureService.getProductFeatures(productId);
      }

      res.json(features);
    } catch (_error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/products/:productId/features/:featureKey
   * Get specific feature
   */
  async getFeature(req, res) {
    try {
      const { productId, featureKey } = req.params;
      const feature = await productFeatureService.getFeature(productId, featureKey);
      res.json(feature);
    } catch (_error) {
      if (error.message === 'Feature not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/products/:productId/features/available
   * Get available features for organization tier
   */
  async getAvailableFeatures(req, res) {
    try {
      const { productId } = req.params;
      const { tier } = req.query;

      if (!tier) {
        return res.status(400).json({ error: 'Organization tier is required' });
      }

      const features = await productFeatureService.getAvailableFeatures(productId, tier);
      res.json(features);
    } catch (_error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/products/:productId/features/:featureKey/check
   * Check if feature is available for organization
   */
  async checkFeatureAvailability(req, res) {
    try {
      const { productId, featureKey } = req.params;
      const { organizationId, tier } = req.query;

      if (!organizationId || !tier) {
        return res.status(400).json({ error: 'Organization ID and tier are required' });
      }

      const isAvailable = await productFeatureService.isFeatureAvailable(
        productId,
        featureKey,
        organizationId,
        tier
      );

      res.json({ isAvailable });
    } catch (_error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/products/:productId/features/stats
   * Get feature statistics
   */
  async getFeatureStats(req, res) {
    try {
      const { productId } = req.params;
      const stats = await productFeatureService.getFeatureStats(productId);
      res.json(stats);
    } catch (_error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/products/:productId/features
   * Create new feature
   */
  async createFeature(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user?.id;

      const featureData = {
        productId,
        ...req.body
      };

      const feature = await productFeatureService.createFeature(featureData, userId);
      res.status(201).json(feature);
    } catch (_error) {
      if (error.message === 'Product not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * PATCH /api/products/:productId/features/:featureKey
   * Update feature
   */
  async updateFeature(req, res) {
    try {
      const { productId, featureKey } = req.params;
      const userId = req.user?.id;

      const feature = await productFeatureService.updateFeature(productId, featureKey, req.body, userId);
      res.json(feature);
    } catch (_error) {
      if (error.message === 'Feature not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * PATCH /api/products/:productId/features/:featureKey/rollout
   * Update feature rollout percentage
   */
  async updateRollout(req, res) {
    try {
      const { productId, featureKey } = req.params;
      const { rolloutPercentage } = req.body;
      const userId = req.user?.id;

      if (rolloutPercentage === undefined) {
        return res.status(400).json({ error: 'rolloutPercentage is required' });
      }

      const feature = await productFeatureService.updateRollout(
        productId,
        featureKey,
        rolloutPercentage,
        userId
      );

      res.json(feature);
    } catch (_error) {
      if (error.message === 'Feature not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /api/products/:productId/features/:featureKey/enable
   * Enable feature (100% rollout)
   */
  async enableFeature(req, res) {
    try {
      const { productId, featureKey } = req.params;
      const userId = req.user?.id;

      const feature = await productFeatureService.enableFeature(productId, featureKey, userId);
      res.json(feature);
    } catch (_error) {
      if (error.message === 'Feature not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /api/products/:productId/features/:featureKey/disable
   * Disable feature (0% rollout)
   */
  async disableFeature(req, res) {
    try {
      const { productId, featureKey } = req.params;
      const userId = req.user?.id;

      const feature = await productFeatureService.disableFeature(productId, featureKey, userId);
      res.json(feature);
    } catch (_error) {
      if (error.message === 'Feature not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * DELETE /api/products/:productId/features/:featureKey
   * Delete feature
   */
  async deleteFeature(req, res) {
    try {
      const { productId, featureKey } = req.params;
      const userId = req.user?.id;

      await productFeatureService.deleteFeature(productId, featureKey, userId);
      res.status(204).send();
    } catch (_error) {
      if (error.message === 'Feature not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }
}

export default new ProductFeatureController();
