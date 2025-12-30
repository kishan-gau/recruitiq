/**
 * Security Monitoring Service
 * 
 * Provides real-time security event monitoring and alerting.
 * 
 * Features:
 * - Failed login tracking and brute force detection
 * - Suspicious activity detection
 * - Anomaly detection (unusual patterns)
 * - Real-time alerts via multiple channels
 * - Security metrics collection
 * - Event correlation and analysis
 * 
 * Integration:
 * - CloudWatch (AWS)
 * - Datadog
 * - Email alerts
 * - Webhook notifications
 * - Slack/Teams integration
 */

import logger from '../utils/logger.js';
import config from '../config/index.js';
import EventEmitter from 'events';
import cloudWatchClient from '../integrations/cloudwatch.js';
import datadogClient from '../integrations/datadog.js';

// ============================================================================
// CENTRAL MONITORING DATABASE
// ============================================================================

let centralMonitoringPool = null;

// Initialize central monitoring database pool for cloud instances
if (config.deployment?.type === 'cloud' && config.centralMonitoring?.enabled) {
  (async () => {
    try {
      const { Pool } = await import('pg');
      centralMonitoringPool = new Pool({
        host: config.centralMonitoring.host,
        port: config.centralMonitoring.port,
        database: config.centralMonitoring.database,
        user: config.centralMonitoring.user,
        password: config.centralMonitoring.password,
        ssl: config.centralMonitoring.ssl,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      
      await centralMonitoringPool.query('SELECT 1');
      // console.log('✓ Central monitoring database connected');
    } catch (error) {
      // console.error('✗ Failed to connect to central monitoring database:', error.message);
      centralMonitoringPool = null;
    }
  })();
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const MONITOR_CONFIG = {
  // Failed login thresholds
  failedLoginThreshold: parseInt(process.env.FAILED_LOGIN_THRESHOLD, 10) || 5,
  failedLoginWindowMs: parseInt(process.env.FAILED_LOGIN_WINDOW_MS, 10) || 900000, // 15 minutes
  
  // Suspicious activity thresholds
  rapidRequestThreshold: parseInt(process.env.RAPID_REQUEST_THRESHOLD, 10) || 100,
  rapidRequestWindowMs: parseInt(process.env.RAPID_REQUEST_WINDOW_MS, 10) || 60000, // 1 minute
  
  // Alert cooldown (prevent alert spam)
  alertCooldownMs: parseInt(process.env.ALERT_COOLDOWN_MS, 10) || 300000, // 5 minutes
  
  // Monitoring enabled
  enabled: process.env.SECURITY_MONITORING_ENABLED !== 'false',
};

// ============================================================================
// SECURITY EVENT TYPES
// ============================================================================

export const SecurityEventType = {
  // Authentication events
  FAILED_LOGIN: 'failed_login',
  BRUTE_FORCE_DETECTED: 'brute_force_detected',
  ACCOUNT_LOCKED: 'account_locked',
  SUSPICIOUS_LOGIN: 'suspicious_login',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  
  // Authorization events
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  PRIVILEGE_ESCALATION: 'privilege_escalation',
  FORBIDDEN_RESOURCE: 'forbidden_resource',
  
  // Data events
  SENSITIVE_DATA_ACCESS: 'sensitive_data_access',
  BULK_DATA_EXPORT: 'bulk_data_export',
  DATA_MODIFICATION: 'data_modification',
  ENCRYPTION_FAILURE: 'encryption_failure',
  
  // System events
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  CSRF_VIOLATION: 'csrf_violation',
  MALICIOUS_FILE_UPLOAD: 'malicious_file_upload',
  
  // Configuration events
  CONFIG_CHANGED: 'config_changed',
  SECRET_ACCESSED: 'secret_accessed',
  CERTIFICATE_EXPIRING: 'certificate_expiring',
  
  // Anomalies
  UNUSUAL_ACTIVITY: 'unusual_activity',
  GEOGRAPHIC_ANOMALY: 'geographic_anomaly',
  TIME_ANOMALY: 'time_anomaly',
};

// ============================================================================
// ALERT SEVERITY LEVELS
// ============================================================================

export const AlertSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

// ============================================================================
// SECURITY MONITOR CLASS
// ============================================================================

class SecurityMonitor extends EventEmitter {
  
  failedLogins: Map<string, any>;

constructor() {
    super();
    
    // In-memory storage for tracking (use Redis in production)
    this.failedLogins = new Map(); // ip -> { count, firstAttempt, lastAttempt }
    this.requestCounts = new Map(); // ip -> { count, windowStart }
    this.alertHistory = new Map(); // alertType -> lastAlertTime
    this.securityMetrics = {
      totalEvents: 0,
      eventsByType: new Map(),
      alertsSent: 0,
      lastAlert: null,
    };
    
    // Set up event listeners
    this.setupEventListeners();
    
    logger.info('Security Monitor initialized', {
      enabled: MONITOR_CONFIG.enabled,
      failedLoginThreshold: MONITOR_CONFIG.failedLoginThreshold,
    });
  }
  
  /**
   * Set up event listeners for security events
   */
  setupEventListeners() {
    this.on('security-event', this.handleSecurityEvent.bind(this));
  }
  
  /**
   * Track a security event
   * 
   * @param {string} eventType - Type of security event
   * @param {Object} metadata - Event metadata
   */
  trackEvent(eventType, metadata = {}) {
    if (!MONITOR_CONFIG.enabled) {
      return;
    }
    
    const event = {
      type: eventType,
      timestamp: new Date(),
      metadata,
      severity: this.determineSeverity(eventType),
    };
    
    // Update metrics
    this.securityMetrics.totalEvents++;
    const eventCount = this.securityMetrics.eventsByType.get(eventType) || 0;
    this.securityMetrics.eventsByType.set(eventType, eventCount + 1);
    
    // Log event
    logger.logSecurityEvent(eventType, metadata);
    
    // Send to central monitoring database if cloud deployment
    this.sendToCentralMonitoring(event, metadata);
    
    // Emit event for processing
    this.emit('security-event', event);
    
    return event;
  }
  
  /**
   * Send security event to central monitoring database (cloud only)
   * 
   * @param {Object} event - Security event
   * @param {Object} metadata - Event metadata
   */
  async sendToCentralMonitoring(event, metadata) {
    // Only for cloud deployments with central monitoring enabled
    if (config.deployment?.type !== 'cloud' || !centralMonitoringPool) {
      return;
    }
    
    try {
      const query = `
        INSERT INTO security_events (
          timestamp, event_type, severity, description,
          tenant_id, instance_id, user_id, username,
          ip_address, user_agent, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      const values = [
        event.timestamp,
        event.type,
        event.severity,
        metadata.reason || metadata.message || event.type,
        config.deployment.tenantId,
        config.deployment.instanceId,
        metadata.userId || null,
        metadata.username || metadata.userEmail || null,
        metadata.ip || metadata.ipAddress || null,
        metadata.userAgent || null,
        JSON.stringify(metadata),
      ];
      
      await centralMonitoringPool.query(query, values);
    } catch (error) {
      // Don't throw - just log locally to avoid monitoring loops
      logger.error('Failed to send security event to central monitoring', {
        error: error.message,
        eventType: event.type,
      });
    }
  }
  
  /**
   * Send security alert to central monitoring database (cloud only)
   * 
   * @param {Object} alert - Security alert
   */
  async sendAlertToCentralDatabase(alert) {
    // Only for cloud deployments with central monitoring enabled
    if (config.deployment?.type !== 'cloud' || !centralMonitoringPool) {
      return;
    }
    
    try {
      const query = `
        INSERT INTO security_alerts (
          timestamp, alert_id, alert_type, severity, description,
          tenant_id, instance_id, channels_sent, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      const values = [
        alert.timestamp,
        alert.id,
        alert.type || alert.event?.type,
        alert.severity,
        alert.message,
        config.deployment.tenantId,
        config.deployment.instanceId,
        alert.channels || [],
        JSON.stringify(alert.event?.metadata || {}),
      ];
      
      await centralMonitoringPool.query(query, values);
    } catch (error) {
      logger.error('Failed to send alert to central monitoring', {
        error: error.message,
        alertId: alert.id,
      });
    }
  }
  
  /**
   * Handle security event and check for patterns
   * 
   * @param {Object} event - Security event
   */
  handleSecurityEvent(event) {
    const { type, metadata } = event;
    
    // Check for specific event types that need immediate action
    switch (type) {
      case SecurityEventType.FAILED_LOGIN:
        this.handleFailedLogin(metadata);
        break;
        
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        this.handleRateLimitExceeded(metadata);
        break;
        
      case SecurityEventType.SQL_INJECTION_ATTEMPT:
      case SecurityEventType.XSS_ATTEMPT:
        this.handleAttackAttempt(event);
        break;
        
      case SecurityEventType.MALICIOUS_FILE_UPLOAD:
        this.handleMaliciousUpload(metadata);
        break;
        
      case SecurityEventType.CERTIFICATE_EXPIRING:
        this.sendAlert(event, AlertSeverity.WARNING);
        break;
        
      default:
        // Check for anomalies
        this.checkForAnomalies(event);
    }
  }
  
  /**
   * Handle failed login attempt
   * 
   * @param {Object} metadata - Login attempt metadata
   */
  handleFailedLogin(metadata) {
    const { ip, username, userAgent } = metadata;
    const key = ip || 'unknown';
    
    // Get or create tracking entry
    let tracking = this.failedLogins.get(key);
    
    if (!tracking) {
      tracking = {
        count: 0,
        firstAttempt: Date.now(),
        lastAttempt: Date.now(),
        usernames: new Set(),
      };
      this.failedLogins.set(key, tracking);
    }
    
    // Check if window has expired
    const windowExpired = Date.now() - tracking.firstAttempt > MONITOR_CONFIG.failedLoginWindowMs;
    
    if (windowExpired) {
      // Reset tracking
      tracking.count = 1;
      tracking.firstAttempt = Date.now();
      tracking.usernames = new Set([username]);
    } else {
      // Increment count
      tracking.count++;
      tracking.usernames.add(username);
    }
    
    tracking.lastAttempt = Date.now();
    
    // Check for brute force
    if (tracking.count >= MONITOR_CONFIG.failedLoginThreshold) {
      this.detectBruteForce({
        ip,
        username,
        userAgent,
        attemptCount: tracking.count,
        attemptedUsernames: Array.from(tracking.usernames),
        windowStart: new Date(tracking.firstAttempt),
      });
    }
  }
  
  /**
   * Detect brute force attack
   * 
   * @param {Object} metadata - Brute force metadata
   */
  detectBruteForce(metadata) {
    const event = {
      type: SecurityEventType.BRUTE_FORCE_DETECTED,
      timestamp: new Date(),
      metadata,
      severity: AlertSeverity.CRITICAL,
    };
    
    logger.logSecurityEvent(SecurityEventType.BRUTE_FORCE_DETECTED, metadata);
    
    // Send alert
    this.sendAlert(event, AlertSeverity.CRITICAL);
    
    // Reset tracking to prevent alert spam
    if (metadata.ip) {
      this.failedLogins.delete(metadata.ip);
    }
  }
  
  /**
   * Handle rate limit exceeded
   * 
   * @param {Object} metadata - Rate limit metadata
   */
  handleRateLimitExceeded(metadata) {
    const { ip, endpoint } = metadata;
    
    // Check for rapid repeated violations
    const key = `${ip}:${endpoint}`;
    let tracking = this.requestCounts.get(key);
    
    if (!tracking) {
      tracking = {
        count: 1,
        windowStart: Date.now(),
      };
      this.requestCounts.set(key, tracking);
    } else {
      const windowExpired = Date.now() - tracking.windowStart > MONITOR_CONFIG.rapidRequestWindowMs;
      
      if (windowExpired) {
        tracking.count = 1;
        tracking.windowStart = Date.now();
      } else {
        tracking.count++;
      }
    }
    
    // Alert if threshold exceeded
    if (tracking.count >= MONITOR_CONFIG.rapidRequestThreshold) {
      this.sendAlert({
        type: SecurityEventType.UNUSUAL_ACTIVITY,
        timestamp: new Date(),
        metadata: {
          ...metadata,
          violationCount: tracking.count,
          description: 'Excessive rate limit violations detected',
        },
        severity: AlertSeverity.WARNING,
      }, AlertSeverity.WARNING);
      
      // Reset tracking
      this.requestCounts.delete(key);
    }
  }
  
  /**
   * Handle attack attempt (SQL injection, XSS, etc.)
   * 
   * @param {Object} event - Attack event
   */
  handleAttackAttempt(event) {
    // Always alert on attack attempts
    this.sendAlert(event, AlertSeverity.CRITICAL);
  }
  
  /**
   * Handle malicious file upload
   * 
   * @param {Object} metadata - Upload metadata
   */
  handleMaliciousUpload(metadata) {
    this.sendAlert({
      type: SecurityEventType.MALICIOUS_FILE_UPLOAD,
      timestamp: new Date(),
      metadata,
      severity: AlertSeverity.CRITICAL,
    }, AlertSeverity.CRITICAL);
  }
  
  /**
   * Check for anomalies in security events
   * 
   * @param {Object} event - Security event
   */
  checkForAnomalies(event) {
    // Implement anomaly detection logic
    // This is a simplified version - in production, use ML-based detection
    
    const { metadata } = event;
    
    // Geographic anomaly (login from unusual location)
    if (metadata.location && metadata.userId) {
      // Check if location is different from usual
      // This would require storing user location history
    }
    
    // Time anomaly (access at unusual hours)
    const hour = new Date().getHours();
    if (metadata.userId && (hour < 6 || hour > 22)) {
      this.trackEvent(SecurityEventType.TIME_ANOMALY, {
        ...metadata,
        hour,
        description: 'Access during unusual hours',
      });
    }
  }
  
  /**
   * Send alert through configured channels
   * 
   * @param {Object} event - Security event
   * @param {string} severity - Alert severity
   */
  sendAlert(event, severity) {
    const alertKey = `${event.type}:${event.metadata.ip || 'unknown'}`;
    
    // Check alert cooldown
    const lastAlert = this.alertHistory.get(alertKey);
    if (lastAlert && Date.now() - lastAlert < MONITOR_CONFIG.alertCooldownMs) {
      return; // Skip alert to prevent spam
    }
    
    // Update alert history
    this.alertHistory.set(alertKey, Date.now());
    
    // Create alert
    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: event.type,
      severity,
      timestamp: event.timestamp,
      event,
      metadata: event.metadata,
      description: this.getAlertDescription(event),
      message: this.getAlertDescription(event),
    };
    
    // Update metrics
    this.securityMetrics.alertsSent++;
    this.securityMetrics.lastAlert = alert;
    
    // Log alert
    logger.warn('Security Alert', alert);
    
    // Send to central database (cloud only)
    this.sendAlertToCentralDatabase(alert);
    
    // Emit alert for external handlers
    this.emit('alert', alert);
    
    // Send through configured channels
    this.sendToChannels(alert);
  }
  
  /**
   * Get human-readable alert description
   * 
   * @param {Object} event - Security event
   * @returns {string} Alert description
   */
  getAlertDescription(event) {
    const { type, metadata } = event;
    
    switch (type) {
      case SecurityEventType.BRUTE_FORCE_DETECTED:
        return `Brute force attack detected from IP ${metadata.ip}. ${metadata.attemptCount} failed login attempts.`;
        
      case SecurityEventType.SQL_INJECTION_ATTEMPT:
        return `SQL injection attempt detected from IP ${metadata.ip} on endpoint ${metadata.endpoint}.`;
        
      case SecurityEventType.XSS_ATTEMPT:
        return `XSS attack attempt detected from IP ${metadata.ip}.`;
        
      case SecurityEventType.MALICIOUS_FILE_UPLOAD:
        return `Malicious file upload detected from user ${metadata.userId}. Threat: ${metadata.threat}.`;
        
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        return `Rate limit exceeded by IP ${metadata.ip} on endpoint ${metadata.endpoint}.`;
        
      case SecurityEventType.UNAUTHORIZED_ACCESS:
        return `Unauthorized access attempt by user ${metadata.userId} to resource ${metadata.resource}.`;
        
      case SecurityEventType.CERTIFICATE_EXPIRING:
        return `TLS certificate expiring in ${metadata.daysUntilExpiry} days.`;
        
      default:
        return `Security event: ${type}`;
    }
  }
  
  /**
   * Send alert to configured channels
   * 
   * @param {Object} alert - Alert object
   */
  async sendToChannels(alert) {
    const channels = config.monitoring?.alertChannels || ['log'];
    
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailAlert(alert);
            break;
            
          case 'slack':
            await this.sendSlackAlert(alert);
            break;
            
          case 'webhook':
            await this.sendWebhookAlert(alert);
            break;
            
          case 'cloudwatch':
            await this.sendCloudWatchAlert(alert);
            break;
            
          case 'datadog':
            await this.sendDatadogAlert(alert);
            break;
            
          case 'log':
          default:
            // Already logged above
            break;
        }
      } catch (error) {
        logger.error('Failed to send alert through channel', {
          channel,
          alertType: alert.type,
          error: error.message,
        });
      }
    }
  }
  
  /**
   * Send alert via email
   * 
   * @param {Object} alert - Alert object
   */
  async sendEmailAlert(alert) {
    // Email sending implementation would go here
    // This is a placeholder for the email service integration
    logger.info('Email alert sent (placeholder)', { alertId: alert.id });
  }
  
  /**
   * Send alert to Slack
   * 
   * @param {Object} alert - Alert object
   */
  async sendSlackAlert(alert) {
    // Slack webhook integration would go here
    logger.info('Slack alert sent (placeholder)', { alertId: alert.id });
  }
  
  /**
   * Send alert via webhook
   * 
   * @param {Object} alert - Alert object
   */
  async sendWebhookAlert(alert) {
    const webhookUrl = config.monitoring?.webhookUrl;
    
    if (!webhookUrl) {
      return;
    }
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });
      
      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }
      
      logger.info('Webhook alert sent', { alertId: alert.id });
    } catch (error) {
      logger.error('Failed to send webhook alert', {
        alertId: alert.id,
        error: error.message,
      });
    }
  }
  
  /**
   * Send alert to CloudWatch
   * 
   * @param {Object} alert - Alert object
   */
  async sendCloudWatchAlert(alert) {
    if (cloudWatchClient.isEnabled()) {
      await cloudWatchClient.putAlert(alert);
      logger.info('CloudWatch alert sent', { alertId: alert.id });
    }
  }
  
  /**
   * Send alert to Datadog
   * 
   * @param {Object} alert - Alert object
   */
  async sendDatadogAlert(alert) {
    if (datadogClient.isEnabled()) {
      await datadogClient.sendAlert(alert);
      logger.info('Datadog alert sent', { alertId: alert.id });
    }
  }
  
  /**
   * Determine severity based on event type
   * 
   * @param {string} eventType - Event type
   * @returns {string} Severity level
   */
  determineSeverity(eventType) {
    const criticalEvents = [
      SecurityEventType.BRUTE_FORCE_DETECTED,
      SecurityEventType.SQL_INJECTION_ATTEMPT,
      SecurityEventType.XSS_ATTEMPT,
      SecurityEventType.MALICIOUS_FILE_UPLOAD,
      SecurityEventType.PRIVILEGE_ESCALATION,
    ];
    
    const warningEvents = [
      SecurityEventType.FAILED_LOGIN,
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      SecurityEventType.UNAUTHORIZED_ACCESS,
      SecurityEventType.CERTIFICATE_EXPIRING,
    ];
    
    if (criticalEvents.includes(eventType)) {
      return AlertSeverity.CRITICAL;
    }
    
    if (warningEvents.includes(eventType)) {
      return AlertSeverity.WARNING;
    }
    
    return AlertSeverity.INFO;
  }
  
  /**
   * Get security metrics
   * 
   * @returns {Object} Security metrics
   */
  getMetrics() {
    return {
      ...this.securityMetrics,
      eventsByType: Object.fromEntries(this.securityMetrics.eventsByType),
      activeThreats: {
        failedLogins: this.failedLogins.size,
        rateLimitViolations: this.requestCounts.size,
      },
    };
  }
  
  /**
   * Reset tracking (for testing)
   */
  reset() {
    this.failedLogins.clear();
    this.requestCounts.clear();
    this.alertHistory.clear();
    this.securityMetrics = {
      totalEvents: 0,
      eventsByType: new Map(),
      alertsSent: 0,
      lastAlert: null,
    };
  }
  
  /**
   * Health check
   * 
   * @returns {Object} Health status
   */
  healthCheck() {
    return {
      status: MONITOR_CONFIG.enabled ? 'healthy' : 'disabled',
      enabled: MONITOR_CONFIG.enabled,
      metrics: this.getMetrics(),
      config: {
        failedLoginThreshold: MONITOR_CONFIG.failedLoginThreshold,
        failedLoginWindowMs: MONITOR_CONFIG.failedLoginWindowMs,
        rapidRequestThreshold: MONITOR_CONFIG.rapidRequestThreshold,
        alertCooldownMs: MONITOR_CONFIG.alertCooldownMs,
      },
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const securityMonitor = new SecurityMonitor();

// ============================================================================
// EXPORTS
// ============================================================================

export default securityMonitor;
export { SecurityMonitor, MONITOR_CONFIG };
