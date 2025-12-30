/**
 * CloudWatch Integration
 * 
 * Integrates with AWS CloudWatch for metrics and logs.
 */

import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * CloudWatch client wrapper
 */
class CloudWatchClient {
  constructor() {
    this.enabled = config.monitoring?.cloudwatch?.enabled || false;
    this.namespace = config.monitoring?.cloudwatch?.namespace || 'RecruitIQ/Security';
    this.region = config.monitoring?.cloudwatch?.region || config.aws?.region || 'us-east-1';
    
    if (this.enabled) {
      this.initializeClient();
    }
  }
  
  /**
   * Initialize CloudWatch client
   */
  async initializeClient() {
    try {
      // Dynamically import AWS SDK only if needed
      const { CloudWatchClient: AWSCloudWatchClient, PutMetricDataCommand } = await import('@aws-sdk/client-cloudwatch');
      const { CloudWatchLogsClient, PutLogEventsCommand } = await import('@aws-sdk/client-cloudwatch-logs');
      
      this.metricsClient = new AWSCloudWatchClient({ region: this.region });
      this.logsClient = new CloudWatchLogsClient({ region: this.region });
      this.PutMetricDataCommand = PutMetricDataCommand;
      this.PutLogEventsCommand = PutLogEventsCommand;
      
      logger.info('CloudWatch client initialized', {
        namespace: this.namespace,
        region: this.region,
      });
    } catch (error) {
      logger.error('Failed to initialize CloudWatch client', {
        error: error.message,
      });
      this.enabled = false;
    }
  }
  
  /**
   * Put metric data to CloudWatch
   * 
   * @param {string} metricName - Metric name
   * @param {number} value - Metric value
   * @param {string} unit - Metric unit (Count, Seconds, etc.)
   * @param {Object} dimensions - Metric dimensions
   */
  async putMetric(metricName, value, unit = 'Count', dimensions = {}) {
    if (!this.enabled || !this.metricsClient) {
      return;
    }
    
    try {
      const dimensionArray = Object.entries(dimensions).map(([key, val]) => ({
        Name: key,
        Value: String(val),
      }));
      
      const command = new this.PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: unit,
            Timestamp: new Date(),
            Dimensions: dimensionArray,
          },
        ],
      });
      
      await this.metricsClient.send(command);
      
      logger.debug('CloudWatch metric sent', {
        metricName,
        value,
        unit,
        dimensions,
      });
    } catch (error) {
      logger.error('Failed to send CloudWatch metric', {
        metricName,
        error: error.message,
      });
    }
  }
  
  /**
   * Put security event to CloudWatch
   * 
   * @param {Object} event - Security event
   */
  async putSecurityEvent(event) {
    const { type, severity, metadata } = event;
    
    // Send metric for event count
    await this.putMetric('SecurityEvents', 1, 'Count', {
      EventType: type,
      Severity: severity,
    });
    
    // Send specific metrics based on event type
    switch (type) {
      case 'failed_login':
        await this.putMetric('FailedLogins', 1, 'Count', {
          IP: metadata.ip || 'unknown',
        });
        break;
        
      case 'brute_force_detected':
        await this.putMetric('BruteForceAttempts', 1, 'Count', {
          IP: metadata.ip || 'unknown',
        });
        break;
        
      case 'rate_limit_exceeded':
        await this.putMetric('RateLimitViolations', 1, 'Count', {
          Endpoint: metadata.endpoint || 'unknown',
        });
        break;
        
      case 'sql_injection_attempt':
        await this.putMetric('SQLInjectionAttempts', 1, 'Count', {
          Endpoint: metadata.endpoint || 'unknown',
        });
        break;
        
      case 'xss_attempt':
        await this.putMetric('XSSAttempts', 1, 'Count', {
          Endpoint: metadata.endpoint || 'unknown',
        });
        break;
    }
  }
  
  /**
   * Put alert to CloudWatch
   * 
   * @param {Object} alert - Security alert
   */
  async putAlert(alert) {
    const { type, severity } = alert;
    
    await this.putMetric('SecurityAlerts', 1, 'Count', {
      AlertType: type,
      Severity: severity,
    });
  }
  
  /**
   * Check if CloudWatch is enabled
   * 
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const cloudWatchClient = new CloudWatchClient();

// ============================================================================
// EXPORTS
// ============================================================================

export default cloudWatchClient;
export { CloudWatchClient };
