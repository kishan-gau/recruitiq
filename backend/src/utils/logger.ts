import winston from 'winston';
import Transport from 'winston-transport';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { combine, timestamp, printf, colorize, errors, json, metadata } = winston.format;

// ============================================================================
// LAZY CONFIG PROXY (Avoid Circular Dependency)
// ============================================================================

/**
 * Lazy config proxy to avoid circular dependency
 * Industry Standard: Proxy pattern for lazy initialization
 * 
 * This allows the logger module to be imported before config is fully initialized.
 */
let _configCache = null;

const config = new Proxy({}, {
  get(target, prop) {
    // Lazy load config on first access
    if (!_configCache) {
      try {
        // Synchronous require for ES modules workaround
        // In this case, we'll use environment variables as fallback
        _configCache = {
          env: process.env.NODE_ENV || 'development',
          logging: {
            level: process.env.LOG_LEVEL || 'info',
            colorize: process.env.LOG_COLORIZE !== 'false'
          },
          deployment: {
            type: process.env.DEPLOYMENT_TYPE || 'local',
            tenantId: process.env.TENANT_ID || null,
            instanceId: process.env.INSTANCE_ID || process.env.HOSTNAME || 'unknown'
          },
          centralLogging: {
            enabled: process.env.CENTRAL_LOGGING_ENABLED === 'true',
            host: process.env.CENTRAL_LOG_HOST,
            port: parseInt(process.env.CENTRAL_LOG_PORT) || 5432,
            database: process.env.CENTRAL_LOG_DATABASE,
            user: process.env.CENTRAL_LOG_USER,
            password: process.env.CENTRAL_LOG_PASSWORD,
            ssl: process.env.CENTRAL_LOG_SSL !== 'false'
          }
        };
      } catch (error) {
        // Fallback if config module not available
        _configCache = {
          env: 'development',
          logging: { level: 'info', colorize: true },
          deployment: { type: 'local', tenantId: null, instanceId: 'unknown' },
          centralLogging: { enabled: false }
        };
      }
    }
    return _configCache[prop];
  }
});

// ============================================================================
// SENSITIVE DATA FILTERING
// ============================================================================

/**
 * List of sensitive field names to redact from logs
 * Security: Never log passwords, tokens, credit cards, SSNs, etc.
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'newPassword',
  'oldPassword',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'auth',
  'cookie',
  'ssn',
  'socialSecurity',
  'creditCard',
  'cardNumber',
  'cvv',
  'pin',
  'privateKey',
  'encryptionKey',
];

/**
 * Recursively redact sensitive fields from objects
 * Security: Prevents accidental logging of sensitive data
 */
function redactSensitiveData(obj: any, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > 10) return '[Max Depth]';
  
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, depth + 1));
  }
  
  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if key contains sensitive field name
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field.toLowerCase())
    );
    
    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      redacted[key] = redactSensitiveData(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

/**
 * Custom Winston format to redact sensitive data
 */
const redactFormat = winston.format((info) => {
  if (info.meta) {
    info.meta = redactSensitiveData(info.meta);
  }
  
  // Redact query parameters and body
  if (info.query) {
    info.query = redactSensitiveData(info.query);
  }
  if (info.body) {
    info.body = redactSensitiveData(info.body);
  }
  if (info.headers) {
    info.headers = redactSensitiveData(info.headers);
  }
  
  return info;
})();

// ============================================================================
// LOG FORMATS
// ============================================================================

/**
 * Human-readable format for console
 */
const consoleFormat = printf(({ level, message, timestamp, stack, requestId, userId, ...meta }) => {
  let log = `${timestamp} [${level}]`;
  
  // Add request ID for tracing
  if (requestId) {
    log += ` [${requestId}]`;
  }
  
  // Add user ID for security tracking
  if (userId) {
    log += ` [user:${userId}]`;
  }
  
  log += `: ${message}`;
  
  // Add metadata
  const metaKeys = Object.keys(meta);
  if (metaKeys.length > 0) {
    // Filter out internal Winston fields
    const filteredMeta = {};
    for (const key of metaKeys) {
      if (!['level', 'message', 'timestamp', 'label'].includes(key)) {
        filteredMeta[key] = meta[key];
      }
    }
    
    if (Object.keys(filteredMeta).length > 0) {
      log += `\n  ${JSON.stringify(filteredMeta, null, 2)}`;
    }
  }
  
  // Add stack trace for errors
  if (stack) {
    log += `\n${stack}`;
  }
  
  return log;
});

/**
 * JSON format for production/parsing
 */
const jsonFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  redactFormat,
  metadata(),
  json()
);

// ============================================================================
// DATABASE TRANSPORT FOR CENTRAL LOGGING
// ============================================================================

/**
 * Options for DatabaseTransport
 */
interface DatabaseTransportOptions {
  pool: any; // pg.Pool type (dynamic import)
  tenantId: string;
  instanceId: string;
  batchSize?: number;
  flushInterval?: number;
}

/**
 * Custom Winston transport that writes logs to PostgreSQL database
 * Only active for cloud deployments with central logging enabled
 */
class DatabaseTransport extends Transport {
  pool: any; // pg.Pool type (dynamic import)
  tenantId: string;
  instanceId: string;
  batchSize: number;
  flushInterval: number;
  buffer: any[]; // Array of Winston log info objects
  flushTimer: NodeJS.Timeout | null;
  
  constructor(opts: DatabaseTransportOptions) {
    super(opts);
    this.pool = opts.pool;
    this.tenantId = opts.tenantId;
    this.instanceId = opts.instanceId;
    this.batchSize = opts.batchSize || 100;
    this.flushInterval = opts.flushInterval || 5000; // 5 seconds
    this.buffer = [];
    this.flushTimer = null;
    
    // Start periodic flush
    this.startPeriodicFlush();
  }
  
  /**
   * Log method called by Winston
   */
  log(info: any, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });
    
    // Add to buffer
    this.buffer.push(info);
    
    // Flush if buffer is full
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
    
    callback();
  }
  
  /**
   * Start periodic flush timer
   */
  startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }
  
  /**
   * Flush buffered logs to database
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const logs = [...this.buffer];
    this.buffer = [];
    
    try {
      // Batch insert into system_logs table
      const values = logs.map(log => {
        return `(
          NOW(),
          '${log.level}',
          '${this.escapeSql(log.message)}',
          '${this.tenantId}',
          '${this.instanceId}',
          ${log.requestId ? `'${log.requestId}'` : 'NULL'},
          ${log.userId ? log.userId : 'NULL'},
          ${log.ip ? `'${log.ip}'::inet` : 'NULL'},
          ${log.path ? `'${this.escapeSql(log.path)}'` : 'NULL'},
          ${log.method ? `'${log.method}'` : 'NULL'},
          ${log.stack ? `'${this.escapeSql(log.stack)}'` : 'NULL'},
          ${log.code ? `'${log.code}'` : 'NULL'},
          '${JSON.stringify(this.getMetadata(log))}'::jsonb
        )`;
      }).join(',');
      
      const query = `
        INSERT INTO system_logs (
          timestamp, level, message, tenant_id, instance_id,
          request_id, user_id, ip_address, endpoint, method,
          error_stack, error_code, metadata
        ) VALUES ${values}
      `;
      
      await this.pool.query(query);
    } catch (error) {
      // Don't throw - log locally instead to avoid logging loops
      // console.error('Failed to write logs to database:', error.message);
      // Could write to file as fallback here
    }
  }
  
  /**
   * Extract metadata from log info
   */
  getMetadata(info: any): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};
    const excludeKeys = [
      'level', 'message', 'timestamp', 'requestId', 'userId',
      'ip', 'path', 'method', 'stack', 'code', 'service',
      'environment', 'hostname', 'securityEvent'
    ];
    
    for (const [key, value] of Object.entries(info)) {
      if (!excludeKeys.includes(key) && key !== Symbol.for('level') && key !== Symbol.for('message')) {
        metadata[key] = value;
      }
    }
    
    return metadata;
  }
  
  /**
   * Escape SQL string values
   */
  escapeSql(str: string | undefined): string {
    if (!str) return '';
    return str.toString().replace(/'/g, "''");
  }
  
  /**
   * Close transport and flush remaining logs
   */
  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }
}

/**
 * Create database pool for central logging (if enabled)
 */
let centralLoggingPool = null;

if (config.deployment?.type === 'cloud' && config.centralLogging?.enabled) {
  try {
    const { Pool } = await import('pg');
    centralLoggingPool = new Pool({
      host: config.centralLogging.host,
      port: config.centralLogging.port || 5432,
      database: config.centralLogging.database,
      user: config.centralLogging.user,
      password: config.centralLogging.password,
      ssl: config.centralLogging.ssl !== false, // Default to true
      max: 5, // Keep pool small for logging
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    
    // Test connection
    await centralLoggingPool.query('SELECT 1');
    // console.log('✓ Central logging database connected');
  } catch (error) {
    // console.error('✗ Failed to connect to central logging database:', error.message);
    centralLoggingPool = null;
  }
}

// ============================================================================
// LOGGER CONFIGURATION
// ============================================================================

// Create logs directory
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Main application logger with enhanced security and structure
 */
const transports = [
  // Console output (human-readable in development)
  new winston.transports.Console({
    format: config.env === 'development' 
      ? combine(colorize(), timestamp({ format: 'HH:mm:ss' }), redactFormat, consoleFormat)
      : jsonFormat,
  }),
  
  // Error logs
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 10,
    tailable: true,
  }),
  
  // Warning logs
  new winston.transports.File({
    filename: path.join(logsDir, 'warn.log'),
    level: 'warn',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    tailable: true,
  }),
  
  // All logs
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    maxsize: 10485760, // 10MB
    maxFiles: 15,
    tailable: true,
  }),
  
  // Security audit logs (separate file for compliance)
  new winston.transports.File({
    filename: path.join(logsDir, 'security.log'),
    level: 'info',
    maxsize: 10485760, // 10MB
    maxFiles: 30, // Keep longer for security audits
    tailable: true,
    format: combine(
      winston.format((info) => {
        // Only log security-related events
        return info.securityEvent ? info : false;
      })(),
      jsonFormat
    ),
  }),
];

// Add database transport for cloud instances
if (centralLoggingPool && config.deployment?.type === 'cloud') {
  transports.push(
    new DatabaseTransport({
      pool: centralLoggingPool,
      tenantId: config.deployment.tenantId || 'unknown',
      instanceId: config.deployment.instanceId || process.env.HOSTNAME || 'unknown',
      batchSize: 100,
      flushInterval: 5000,
    })
  );
}

const logger = winston.createLogger({
  level: config.logging.level || 'info',
  format: jsonFormat,
  defaultMeta: { 
    service: 'recruitiq-api',
    environment: config.env,
    hostname: process.env.HOSTNAME || 'localhost',
    tenantId: config.deployment?.tenantId,
    instanceId: config.deployment?.instanceId,
  },
  transports,
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10485760,
      maxFiles: 5,
    }),
    new winston.transports.Console({
      format: combine(colorize(), consoleFormat),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10485760,
      maxFiles: 5,
    }),
    new winston.transports.Console({
      format: combine(colorize(), consoleFormat),
    }),
  ],
  exitOnError: false, // Don't exit on handled exceptions
});

// ============================================================================
// SECURITY EVENT LOGGING
// ============================================================================

/**
 * Security event types for tracking
 */
export const SecurityEventType = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  TOKEN_REFRESH: 'token_refresh',
  TOKEN_INVALID: 'token_invalid',
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_RESET_COMPLETE: 'password_reset_complete',
  ACCOUNT_LOCKED: 'account_locked',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  FORBIDDEN_ACCESS: 'forbidden_access',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  FILE_UPLOAD: 'file_upload',
  FILE_DOWNLOAD: 'file_download',
  PERMISSION_CHANGE: 'permission_change',
  USER_CREATED: 'user_created',
  USER_DELETED: 'user_deleted',
  API_KEY_USED: 'api_key_used',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  CSRF_VALIDATION_FAILED: 'csrf_validation_failed',
};

/**
 * Security event details interface
 */
interface SecurityEventDetails {
  severity?: string;
  [key: string]: any;
}

/**
 * Log security events for compliance and monitoring
 * Security: Separate logging for audit trails
 */
export function logSecurityEvent(
  eventType: string, 
  details: SecurityEventDetails = {}, 
  req: any = null
): void {
  const event: Record<string, any> = {
    securityEvent: true,
    eventType,
    timestamp: new Date().toISOString(),
    ...details,
  };
  
  // Add request context if available
  if (req) {
    event.requestId = req.id;
    event.userId = req.user?.id;
    event.userEmail = req.user?.email;
    event.ip = req.ip || req.connection?.remoteAddress;
    event.userAgent = req.get('user-agent');
    event.method = req.method;
    event.path = req.path;
    event.query = redactSensitiveData(req.query);
  }
  
  // Log at appropriate level
  const severity = details.severity || 'info';
  logger.log(severity, `Security Event: ${eventType}`, event);
}

/**
 * Track failed login attempts for brute force detection
 */
const failedLoginAttempts = new Map<string, number[]>();

export function trackFailedLogin(identifier: string, req: any): number {
  const key = `${identifier}:${req.ip}`;
  const attempts = failedLoginAttempts.get(key) || [];
  attempts.push(Date.now());
  
  // Keep only last 15 minutes
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  const recentAttempts = attempts.filter(time => time > fifteenMinutesAgo);
  failedLoginAttempts.set(key, recentAttempts);
  
  // Alert on suspicious activity (5+ failed attempts)
  if (recentAttempts.length >= 5) {
    logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
      severity: 'warn',
      reason: 'multiple_failed_logins',
      identifier,
      attemptCount: recentAttempts.length,
    }, req);
  }
  
  return recentAttempts.length;
}

// ============================================================================
// REQUEST ID GENERATION
// ============================================================================

/**
 * Generate unique request ID for tracing
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add request ID to logger context
 */
export function createRequestLogger(requestId: string, userId: string | null = null): any {
  return logger.child({ requestId, userId });
}

// ============================================================================
// PERFORMANCE LOGGING
// ============================================================================

/**
 * Performance log details interface
 */
interface PerformanceDetails {
  threshold?: number;
  [key: string]: any;
}

/**
 * Log slow queries and operations
 */
export function logPerformance(
  operation: string, 
  duration: number, 
  details: PerformanceDetails = {}
): void {
  const threshold = details.threshold || 1000; // Default 1 second
  
  if (duration > threshold) {
    logger.warn('Slow operation detected', {
      operation,
      duration: `${duration}ms`,
      threshold: `${threshold}ms`,
      ...details,
    });
  } else {
    logger.debug('Operation completed', {
      operation,
      duration: `${duration}ms`,
      ...details,
    });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Log with request context
 */
export function logWithContext(
  level: string, 
  message: string, 
  req: any, 
  meta: Record<string, any> = {}
): void {
  const context = {
    requestId: req.id,
    userId: req.user?.id,
    ip: req.ip,
    method: req.method,
    path: req.path,
    ...meta,
  };
  
  logger.log(level, message, context);
}

/**
 * Log database errors without exposing sensitive information
 */
export function logDatabaseError(
  error: any, 
  query: string | null = null, 
  params: any = null
): void {
  logger.error('Database error', {
    code: error.code,
    message: error.message,
    // Don't log full query in production to avoid data leaks
    query: config.env === 'development' ? query : 'REDACTED',
    params: config.env === 'development' ? redactSensitiveData(params) : 'REDACTED',
  });
}

// Export logger as default
export default logger;
