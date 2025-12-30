/**
 * Datadog Integration
 * 
 * Integrates with Datadog for metrics, logs, and APM.
 */

import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Datadog client wrapper
 */
class DatadogClient {
  enabled: boolean;
  apiKey: string | undefined;
  appKey: string | undefined;
  site: string;
  service: string;
  env: string;

  constructor() {
    this.enabled = config.monitoring?.datadog?.enabled || false;
    this.apiKey = config.monitoring?.datadog?.apiKey || process.env.DATADOG_API_KEY;
    this.appKey = config.monitoring?.datadog?.appKey || process.env.DATADOG_APP_KEY;
    this.site = config.monitoring?.datadog?.site || 'datadoghq.com';
    this.service = config.monitoring?.datadog?.service || 'recruitiq';
    this.env = config.env || 'development';
    
    if (this.enabled && !this.apiKey) {
      logger.warn('Datadog is enabled but API key is not configured');
      this.enabled = false;
    }
  }
  
  /**
   * Send metric to Datadog
   * 
   * @param {string} metricName - Metric name
   * @param {number} value - Metric value
   * @param {string} type - Metric type (count, gauge, rate)
   * @param {Array} tags - Metric tags
   */
  async sendMetric(metricName, value, type = 'count', tags = []) {
    if (!this.enabled) {
      return;
    }
    
    try {
      const metric = {
        series: [
          {
            metric: `recruitiq.security.${metricName}`,
            points: [[Math.floor(Date.now() / 1000), value]],
            type,
            tags: [
              `service:${this.service}`,
              `env:${this.env}`,
              ...tags,
            ],
          },
        ],
      };
      
      const response = await fetch(`https://api.${this.site}/api/v1/series`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': this.apiKey,
        },
        body: JSON.stringify(metric),
      });
      
      if (!response.ok) {
        throw new Error(`Datadog API returned ${response.status}`);
      }
      
      logger.debug('Datadog metric sent', {
        metricName,
        value,
        type,
        tags,
      });
    } catch (error) {
      logger.error('Failed to send Datadog metric', {
        metricName,
        error: error.message,
      });
    }
  }
  
  /**
   * Send event to Datadog
   * 
   * @param {string} title - Event title
   * @param {string} text - Event text
   * @param {string} alertType - Alert type (info, warning, error, success)
   * @param {Array} tags - Event tags
   */
  async sendEvent(title, text, alertType = 'info', tags = []) {
    if (!this.enabled) {
      return;
    }
    
    try {
      const event = {
        title,
        text,
        alert_type: alertType,
        tags: [
          `service:${this.service}`,
          `env:${this.env}`,
          ...tags,
        ],
        source_type_name: 'security',
      };
      
      const response = await fetch(`https://api.${this.site}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'DD-API-KEY': this.apiKey,
        },
        body: JSON.stringify(event),
      });
      
      if (!response.ok) {
        throw new Error(`Datadog API returned ${response.status}`);
      }
      
      logger.debug('Datadog event sent', {
        title,
        alertType,
        tags,
      });
    } catch (error) {
      logger.error('Failed to send Datadog event', {
        title,
        error: error.message,
      });
    }
  }
  
  /**
   * Send security event to Datadog
   * 
   * @param {Object} event - Security event
   */
  async sendSecurityEvent(event) {
    const { type, severity, metadata } = event;
    
    // Send metric
    await this.sendMetric(
      'events',
      1,
      'count',
      [`event_type:${type}`, `severity:${severity}`]
    );
    
    // Send event for critical/error severity
    if (severity === 'critical' || severity === 'error') {
      const title = `Security Event: ${type}`;
      const text = this.formatEventText(event);
      const alertType = severity === 'critical' ? 'error' : 'warning';
      
      await this.sendEvent(
        title,
        text,
        alertType,
        [`event_type:${type}`, `severity:${severity}`]
      );
    }
  }
  
  /**
   * Send alert to Datadog
   * 
   * @param {Object} alert - Security alert
   */
  async sendAlert(alert) {
    const { type, severity, description, metadata } = alert;
    
    // Send metric
    await this.sendMetric(
      'alerts',
      1,
      'count',
      [`alert_type:${type}`, `severity:${severity}`]
    );
    
    // Send event
    const alertType = this.mapSeverityToAlertType(severity);
    
    await this.sendEvent(
      `Security Alert: ${type}`,
      description || this.formatEventText({ type, metadata }),
      alertType,
      [`alert_type:${type}`, `severity:${severity}`]
    );
  }
  
  /**
   * Format event text for Datadog
   * 
   * @param {Object} event - Event object
   * @returns {string} Formatted text
   */
  formatEventText(event) {
    const { type, metadata } = event;
    
    let text = `Event Type: ${type}\n`;
    
    if (metadata.ip) {
      text += `IP: ${metadata.ip}\n`;
    }
    
    if (metadata.userId) {
      text += `User ID: ${metadata.userId}\n`;
    }
    
    if (metadata.endpoint) {
      text += `Endpoint: ${metadata.endpoint}\n`;
    }
    
    if (metadata.description) {
      text += `Description: ${metadata.description}\n`;
    }
    
    return text;
  }
  
  /**
   * Map severity to Datadog alert type
   * 
   * @param {string} severity - Severity level
   * @returns {string} Datadog alert type
   */
  mapSeverityToAlertType(severity) {
    const mapping = {
      critical: 'error',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };
    
    return mapping[severity] || 'info';
  }
  
  /**
   * Check if Datadog is enabled
   * 
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }
  
  /**
   * Health check
   * 
   * @returns {Object} Health status
   */
  async healthCheck() {
    if (!this.enabled) {
      return {
        status: 'disabled',
        enabled: false,
      };
    }
    
    try {
      // Test API connectivity
      const response = await fetch(`https://api.${this.site}/api/v1/validate`, {
        method: 'GET',
        headers: {
          'DD-API-KEY': this.apiKey,
        },
      });
      
      const valid = response.ok;
      
      return {
        status: valid ? 'healthy' : 'unhealthy',
        enabled: true,
        apiKeyValid: valid,
        site: this.site,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        enabled: true,
        error: error.message,
      };
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const datadogClient = new DatadogClient();

// ============================================================================
// EXPORTS
// ============================================================================

export default datadogClient;
export { DatadogClient };
