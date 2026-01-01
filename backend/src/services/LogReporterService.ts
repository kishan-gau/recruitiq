/**
 * Log Reporter Service
 * 
 * Sends system logs from tenant instances to the Portal.
 * Runs on tenant VPS and reports logs periodically.
 * 
 * This is part of the Tenant → Portal communication flow.
 */

import axios from 'axios';

export interface LogReporterOptions {
  portalUrl?: string;
  tenantId?: string;
  organizationSlug?: string;
  tenantApiKey?: string;
  maxBufferSize?: number;
  flushInterval?: number;
  localStoragePath?: string;
}

interface LogEntry {
  level?: string;
  message: string;
  timestamp?: string;
  context?: Record<string, unknown>;
  userId?: string;
  ip?: string;
}

class LogReporterService {
  
  flushInterval: number;

  intervalId: ReturnType<typeof setInterval> | null;

  isRunning: boolean;

  localStoragePath: string;

  logBuffer: LogEntry[];

  maxBufferSize: number;

  organizationSlug: string | undefined;

  portalUrl: string | undefined;

  tenantApiKey: string | undefined;

  tenantId: string | undefined;

constructor(options: LogReporterOptions = {}) {
    this.portalUrl = options.portalUrl || process.env.PORTAL_API_URL || 'https://portal.recruitiq.nl';
    this.tenantId = options.tenantId || process.env.TENANT_ID;
    this.organizationSlug = options.organizationSlug || process.env.ORGANIZATION_SLUG;
    this.tenantApiKey = options.tenantApiKey || process.env.TENANT_API_KEY;
    
    // Log buffer
    this.logBuffer = [];
    this.maxBufferSize = options.maxBufferSize || 100;
    this.flushInterval = options.flushInterval || 5 * 60 * 1000; // 5 minutes
    
    // Local storage path for offline logs
    this.localStoragePath = options.localStoragePath || '/var/log/recruitiq/portal-queue';
    
    // Reporter status
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Add a log entry to the buffer
   * @param {Object} log - Log entry
   * @param {string} log.level - Log level (info, warn, error, debug)
   * @param {string} log.message - Log message
   * @param {Object} [log.context] - Additional context
   * @param {string} [log.userId] - User ID if available
   * @param {string} [log.ip] - Client IP if available
   */
  addLog(log: LogEntry): void {
    const entry = {
      level: log.level || 'info',
      message: log.message,
      timestamp: log.timestamp || new Date().toISOString(),
      context: log.context || {},
      userId: log.userId,
      ip: log.ip
    };

    this.logBuffer.push(entry);

    // If buffer is full, flush immediately
    if (this.logBuffer.length >= this.maxBufferSize) {
      this.sendLogBatch().catch(err => {
        console.error('[LogReporter] Immediate flush failed:', err.message);
      });
    }
  }

  /**
   * Collect logs from various sources
   * @returns {Array} Collected logs
   */
  async collectLogs() {
    // Return buffered logs
    const logs = [...this.logBuffer];
    this.logBuffer = [];
    return logs;
  }

  /**
   * Send a batch of logs to the Portal
   * @returns {Promise<Object>} Send result
   */
  async sendLogBatch() {
    const logs = await this.collectLogs();
    
    if (logs.length === 0) {
      return { success: true, message: 'No logs to send' };
    }

    try {
      const response = await axios.post(
        `${this.portalUrl}/api/tenant-logs`,
        {
          tenantId: this.tenantId,
          organizationSlug: this.organizationSlug,
          logs
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.tenantApiKey}`,
            'X-Tenant-Id': this.tenantId
          },
          timeout: 30000 // 30 second timeout
        }
      );

      console.log(`[LogReporter] Sent ${logs.length} logs to portal`);
      return { success: true, count: logs.length };

    } catch (error) {
      console.error('[LogReporter] Failed to send logs:', error.message);
      
      // Store locally if portal is unreachable
      await this.storeLogsLocally(logs);
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Store logs locally when portal is unreachable
   * @param {Array} logs - Logs to store
   */
  async storeLogsLocally(logs) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Ensure directory exists
      await fs.mkdir(this.localStoragePath, { recursive: true });
      
      // Write logs to timestamped file
      const filename = `logs-${Date.now()}.json`;
      const filepath = path.join(this.localStoragePath, filename);
      
      await fs.writeFile(filepath, JSON.stringify(logs, null, 2));
      
      console.log(`[LogReporter] Stored ${logs.length} logs locally: ${filename}`);
    } catch (error) {
      console.error('[LogReporter] Failed to store logs locally:', error.message);
      // Re-add logs to buffer as last resort
      this.logBuffer.push(...logs);
    }
  }

  /**
   * Retry sending locally stored logs
   * @returns {Promise<Object>} Retry result
   */
  async retryLocalLogs() {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const files = await fs.readdir(this.localStoragePath).catch(() => []);
      
      if (files.length === 0) {
        return { success: true, message: 'No local logs to retry' };
      }

      let totalSent = 0;
      let errors = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filepath = path.join(this.localStoragePath, file);
        
        try {
          const content = await fs.readFile(filepath, 'utf8');
          const logs = JSON.parse(content);
          
          // Try to send
          const response = await axios.post(
            `${this.portalUrl}/api/tenant-logs`,
            {
              tenantId: this.tenantId,
              organizationSlug: this.organizationSlug,
              logs
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.tenantApiKey}`,
                'X-Tenant-Id': this.tenantId
              },
              timeout: 30000
            }
          );
          
          // Success - delete local file
          await fs.unlink(filepath);
          totalSent += logs.length;
          
        } catch (error) {
          console.error(`[LogReporter] Failed to retry ${file}:`, error.message);
          errors++;
        }
      }

      return {
        success: errors === 0,
        sent: totalSent,
        errors
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Start the log reporter
   */
  startReporter() {
    if (this.isRunning) {
      console.log('[LogReporter] Already running');
      return;
    }

    console.log('[LogReporter] Starting log reporter');
    console.log(`[LogReporter] Portal URL: ${this.portalUrl}`);
    console.log(`[LogReporter] Flush interval: ${this.flushInterval / 1000}s`);

    this.isRunning = true;

    // Flush logs on interval
    this.intervalId = setInterval(async () => {
      try {
        await this.sendLogBatch();
        // Also retry any locally stored logs
        await this.retryLocalLogs();
      } catch (error) {
        console.error('[LogReporter] Periodic flush error:', error.message);
      }
    }, this.flushInterval);
  }

  /**
   * Stop the log reporter
   */
  stopReporter() {
    if (!this.isRunning) return;

    console.log('[LogReporter] Stopping log reporter');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;

    // Flush remaining logs
    this.sendLogBatch().catch(err => {
      console.error('[LogReporter] Final flush failed:', err.message);
    });
  }

  /**
   * Create Express middleware for logging requests
   * @returns {Function} Express middleware
   */
  createMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Log request on response finish
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Only log significant events
        if (res.statusCode >= 400 || duration > 5000) {
          this.addLog({
            level: res.statusCode >= 500 ? 'error' : (res.statusCode >= 400 ? 'warn' : 'info'),
            message: `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
            context: {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              duration
            },
            userId: req.user?.id,
            ip: req.ip
          });
        }
      });

      next();
    };
  }

  /**
   * Report a specific event to Portal
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Send result
   */
  async reportEvent(eventType, eventData) {
    try {
      const response = await axios.post(
        `${this.portalUrl}/api/tenant-events`,
        {
          tenantId: this.tenantId,
          organizationSlug: this.organizationSlug,
          eventType,
          eventData,
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.tenantApiKey}`,
            'X-Tenant-Id': this.tenantId
          },
          timeout: 10000
        }
      );

      return { success: true };
    } catch (error) {
      console.error(`[LogReporter] Failed to report event ${eventType}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Report health status to Portal
   * @param {Object} healthData - Health data
   * @returns {Promise<Object>} Send result
   */
  async reportHealth(healthData) {
    return this.reportEvent('health_check', healthData);
  }
}

export default LogReporterService;
