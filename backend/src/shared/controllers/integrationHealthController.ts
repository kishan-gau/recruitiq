/**
 * Integration Health Controller
 * Provides endpoints to monitor cross-product integration health
 */

import integrationErrorHandler from '../../shared/utils/integrationErrorHandler.js';
import logger from '../../utils/logger.js';

class IntegrationHealthController {
  constructor() {
    this.logger = logger;
    this.errorHandler = integrationErrorHandler;
  }

  /**
   * GET /api/integrations/health
   * Get health status of all integrations
   */
  async getHealth(req, res) {
    try {
      const health = this.errorHandler.getHealthStatus();
      
      // Calculate overall health
      const integrations = Object.keys(health);
      const totalIntegrations = integrations.length;
      const healthyIntegrations = integrations.filter(name => {
        const status = health[name];
        return status.circuitBreakerState === 'closed' && 
               parseFloat(status.successRate) >= 95;
      }).length;

      const overallHealth = totalIntegrations > 0
        ? (healthyIntegrations / totalIntegrations) * 100
        : 100;

      const response = {
        status: overallHealth >= 80 ? 'healthy' : overallHealth >= 50 ? 'degraded' : 'unhealthy',
        overallHealthPercentage: overallHealth.toFixed(2) + '%',
        timestamp: new Date().toISOString(),
        integrations: health
      };

      this.logger.info('[Integration Health] Health check requested', {
        status: response.status,
        overallHealth: response.overallHealthPercentage
      });

      res.json(response);
    } catch (_error) {
      this.logger.error('[Integration Health] Error getting health status', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        error: 'Failed to get integration health status',
        message: error.message
      });
    }
  }

  /**
   * GET /api/integrations/health/:integrationName
   * Get health status of specific integration
   */
  async getIntegrationHealth(req, res) {
    try {
      const { integrationName } = req.params;
      const health = this.errorHandler.getHealthStatus();
      
      if (!health[integrationName]) {
        return res.status(404).json({
          error: 'Integration not found',
          message: `No metrics available for integration: ${integrationName}`
        });
      }

      res.json({
        integration: integrationName,
        ...health[integrationName],
        timestamp: new Date().toISOString()
      });
    } catch (_error) {
      this.logger.error('[Integration Health] Error getting integration health', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        error: 'Failed to get integration health',
        message: error.message
      });
    }
  }

  /**
   * POST /api/integrations/health/:integrationName/reset
   * Reset metrics for specific integration
   */
  async resetIntegrationMetrics(req, res) {
    try {
      const { integrationName } = req.params;
      
      this.errorHandler.resetMetrics(integrationName);

      res.json({
        message: `Metrics reset for integration: ${integrationName}`,
        timestamp: new Date().toISOString()
      });
    } catch (_error) {
      this.logger.error('[Integration Health] Error resetting metrics', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        error: 'Failed to reset integration metrics',
        message: error.message
      });
    }
  }

  /**
   * POST /api/integrations/health/reset-all
   * Reset all integration metrics
   */
  async resetAllMetrics(req, res) {
    try {
      this.errorHandler.resetAllMetrics();

      res.json({
        message: 'All integration metrics reset',
        timestamp: new Date().toISOString()
      });
    } catch (_error) {
      this.logger.error('[Integration Health] Error resetting all metrics', {
        error: error.message,
        stack: error.stack
      });
      res.status(500).json({
        error: 'Failed to reset all metrics',
        message: error.message
      });
    }
  }
}

export default IntegrationHealthController;
