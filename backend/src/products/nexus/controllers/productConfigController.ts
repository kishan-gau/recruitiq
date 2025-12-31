/**
 * ProductConfig Controller
 * HTTP handlers for product configuration endpoints
 */

import { productConfigService } from '../services/index.js';

class ProductConfigController {
  /**
   * GET /api/organizations/:organizationId/products/:productId/configs
   * Get all configs for organization and product
   */
  async getConfigs(req, res) {
    try {
      const { organizationId, productId } = req.params;
      const { format } = req.query;

      if (format === 'map') {
        const configMap = await productConfigService.getConfigMap(organizationId, productId);
        return res.json(configMap);
      }

      const configs = await productConfigService.getConfigs(organizationId, productId);
      res.json(configs);
    } catch (_error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/organizations/:organizationId/products/:productId/configs/:configKey
   * Get specific config value
   */
  async getConfig(req, res) {
    try {
      const { organizationId, productId, configKey } = req.params;
      const config = await productConfigService.getConfig(organizationId, productId, configKey);
      
      if (!config) {
        return res.status(404).json({ error: 'Config not found' });
      }

      res.json(config);
    } catch (_error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * PUT /api/organizations/:organizationId/products/:productId/configs/:configKey
   * Set config value
   */
  async setConfig(req, res) {
    try {
      const { organizationId, productId, configKey } = req.params;
      const { configValue, configType, isEncrypted, isSensitive, description } = req.body;
      const userId = req.user?.id;

      if (configValue === undefined) {
        return res.status(400).json({ error: 'configValue is required' });
      }

      const options = {
        configType,
        isEncrypted,
        isSensitive,
        description
      };

      const config = await productConfigService.setConfig(
        organizationId,
        productId,
        configKey,
        configValue,
        options,
        userId
      );

      res.json(config);
    } catch (_error) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * PATCH /api/organizations/:organizationId/products/:productId/configs/:configKey
   * Update config value
   */
  async updateConfig(req, res) {
    try {
      const { organizationId, productId, configKey } = req.params;
      const { configValue } = req.body;
      const userId = req.user?.id;

      if (configValue === undefined) {
        return res.status(400).json({ error: 'configValue is required' });
      }

      const config = await productConfigService.updateConfig(
        organizationId,
        productId,
        configKey,
        configValue,
        userId
      );

      res.json(config);
    } catch (_error) {
      if (error.message === 'Config not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * DELETE /api/organizations/:organizationId/products/:productId/configs/:configKey
   * Delete config
   */
  async deleteConfig(req, res) {
    try {
      const { organizationId, productId, configKey } = req.params;
      const userId = req.user?.id;

      await productConfigService.deleteConfig(organizationId, productId, configKey, userId);
      res.status(204).send();
    } catch (_error) {
      if (error.message === 'Config not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * DELETE /api/organizations/:organizationId/products/:productId/configs
   * Delete all configs for organization and product
   */
  async deleteAllConfigs(req, res) {
    try {
      const { organizationId, productId } = req.params;
      const userId = req.user?.id;

      const count = await productConfigService.deleteAllConfigs(organizationId, productId, userId);
      res.json({ deleted: count });
    } catch (_error) {
      res.status(400).json({ error: error.message });
    }
  }
}

export default new ProductConfigController();
