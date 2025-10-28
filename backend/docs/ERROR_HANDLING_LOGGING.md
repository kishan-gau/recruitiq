# Error Handling & Logging Guide

**Status**: ✅ Implemented (Todo #7)  
**Last Updated**: 2025-10-28  
**Security Impact**: High - Prevents information leakage, enables security monitoring

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Error Handling System](#error-handling-system)
3. [Logging System](#logging-system)
4. [Security Features](#security-features)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)
7. [Log File Management](#log-file-management)
8. [Monitoring & Alerting](#monitoring--alerting)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### What Was Implemented

✅ **Enhanced Error Handling**
- Standardized error responses across all endpoints
- Custom error classes for different scenarios
- Automatic error classification and handling
- Security-focused error messages (no sensitive data leaks)

✅ **Structured Logging**
- Winston-based logging with multiple transports
- Automatic sensitive data redaction
- Request ID tracking for distributed tracing
- Separate security audit logs
- Performance monitoring

✅ **Security Features**
- Automatic filtering of passwords, tokens, and sensitive fields
- Security event tracking (logins, access attempts, etc.)
- Brute force detection and alerting
- Production-safe error messages

---

## Error Handling System

### Error Class Hierarchy

```javascript
APIError (Base Class)
├── ValidationError (400)
├── UnauthorizedError (401)
├── ForbiddenError (403)
├── NotFoundError (404)
├── ConflictError (409)
├── BusinessLogicError (422)
├── RateLimitError (429)
├── InternalServerError (500)
└── ServiceUnavailableError (503)
```

### Custom Error Classes

#### 1. ValidationError (400)
Used for input validation failures.

```javascript
import { ValidationError } from '../middleware/errorHandler.js';

// Simple validation error
throw new ValidationError('Email is required');

// With detailed validation errors
throw new ValidationError('Validation failed', {
  errors: [
    { field: 'email', message: 'Invalid email format' },
    { field: 'password', message: 'Password too short' }
  ]
});
```

#### 2. UnauthorizedError (401)
Used when authentication is required or invalid.

```javascript
import { UnauthorizedError } from '../middleware/errorHandler.js';

throw new UnauthorizedError('Invalid credentials');
throw new UnauthorizedError('Authentication token required');
```

#### 3. ForbiddenError (403)
Used when user lacks permissions.

```javascript
import { ForbiddenError } from '../middleware/errorHandler.js';

throw new ForbiddenError('You do not have permission to access this resource');
throw new ForbiddenError('Admin access required');
```

#### 4. NotFoundError (404)
Used when resource doesn't exist.

```javascript
import { NotFoundError } from '../middleware/errorHandler.js';

throw new NotFoundError('User not found');
throw new NotFoundError('Job posting not found', 'Job');
```

#### 5. ConflictError (409)
Used for resource conflicts.

```javascript
import { ConflictError } from '../middleware/errorHandler.js';

throw new ConflictError('Email already registered', { email: user.email });
```

#### 6. BusinessLogicError (422)
Used for business rule violations.

```javascript
import { BusinessLogicError } from '../middleware/errorHandler.js';

throw new BusinessLogicError('Cannot delete job with active applications', {
  jobId,
  applicationCount: 5
});
```

### Error Response Format

All errors return a consistent JSON structure:

```json
{
  "error": {
    "type": "ValidationError",
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "errorId": "ERR-1698765432-abc123",
    "timestamp": "2025-10-28T10:30:00.000Z",
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "Invalid email format",
          "type": "string.email"
        }
      ]
    }
  }
}
```

**Fields:**
- `type`: Error class name
- `message`: Human-readable error message (sanitized in production)
- `code`: Machine-readable error code (e.g., VALIDATION_ERROR)
- `errorId`: Unique error ID for tracking and support
- `timestamp`: ISO 8601 timestamp
- `details`: Additional context (only in development or for operational errors)

### Async Error Handling

Use `asyncHandler` to automatically catch errors in async routes:

```javascript
import { asyncHandler } from '../middleware/errorHandler.js';

// Without asyncHandler (manual try-catch needed)
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new NotFoundError('User not found');
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// With asyncHandler (errors automatically caught)
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('User not found');
  res.json({ user });
}));
```

---

## Logging System

### Log Levels

- **error**: Server errors, exceptions, critical failures
- **warn**: Client errors, suspicious activity, recoverable issues
- **info**: Normal operations, requests, security events
- **debug**: Detailed information for debugging
- **verbose**: Very detailed information

**Configuration:**
```javascript
// .env
LOG_LEVEL=info  // production
LOG_LEVEL=debug // development
```

### Log Files

All logs are stored in the `logs/` directory:

```
logs/
├── combined.log       # All logs
├── error.log          # Error level only
├── warn.log           # Warning level only
├── security.log       # Security events only
├── exceptions.log     # Uncaught exceptions
└── rejections.log     # Unhandled promise rejections
```

**File Rotation:**
- Max file size: 10MB
- Max files: 5-30 (depending on type)
- Old files automatically compressed and rotated

### Structured Logging

Logs are stored in JSON format for easy parsing:

```json
{
  "level": "info",
  "message": "User login successful",
  "timestamp": "2025-10-28 10:30:00.123",
  "service": "recruitiq-api",
  "environment": "production",
  "requestId": "1698765432-abc123",
  "userId": "user_123",
  "ip": "192.168.1.100",
  "metadata": {
    "email": "john@example.com"
  }
}
```

### Request ID Tracking

Every request gets a unique ID for tracing:

```javascript
// Automatically added to all requests
req.id // "1698765432-abc123"

// Included in all logs
logger.info('Processing request', { requestId: req.id });

// Returned in response headers
// X-Request-ID: 1698765432-abc123
```

**Client-side usage:**
```javascript
// Include request ID when reporting errors
fetch('/api/users', {
  headers: {
    'X-Request-ID': 'client-abc123' // Optional: pass from client
  }
});
```

### Sensitive Data Redaction

**Automatically redacted fields:**
- Passwords (password, passwordHash, newPassword, etc.)
- Tokens (token, accessToken, refreshToken, apiKey, etc.)
- Auth headers (authorization, cookie, auth)
- Financial data (creditCard, cardNumber, cvv, pin)
- Personal data (ssn, socialSecurity, privateKey)

**Example:**
```javascript
// Input
logger.info('User data', {
  email: 'john@example.com',
  password: 'secret123',
  apiKey: 'key_abc123'
});

// Logged output
{
  "email": "john@example.com",
  "password": "[REDACTED]",
  "apiKey": "[REDACTED]"
}
```

### Security Event Logging

Track security-relevant events for compliance and monitoring:

```javascript
import { logSecurityEvent, SecurityEventType } from '../utils/logger.js';

// Login success
logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, {
  userId: user.id,
  email: user.email,
}, req);

// Login failure
logSecurityEvent(SecurityEventType.LOGIN_FAILURE, {
  severity: 'warn',
  email: req.body.email,
  reason: 'invalid_credentials',
}, req);

// Unauthorized access attempt
logSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, {
  severity: 'warn',
  attemptedResource: req.path,
}, req);
```

**Available Event Types:**
- LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT
- TOKEN_REFRESH, TOKEN_INVALID
- PASSWORD_CHANGE, PASSWORD_RESET_REQUEST, PASSWORD_RESET_COMPLETE
- ACCOUNT_LOCKED
- RATE_LIMIT_EXCEEDED
- UNAUTHORIZED_ACCESS, FORBIDDEN_ACCESS
- SUSPICIOUS_ACTIVITY
- DATA_ACCESS, DATA_MODIFICATION
- FILE_UPLOAD, FILE_DOWNLOAD
- PERMISSION_CHANGE
- USER_CREATED, USER_DELETED
- SQL_INJECTION_ATTEMPT, XSS_ATTEMPT, CSRF_VALIDATION_FAILED

**Security logs are stored separately** in `logs/security.log` for compliance and auditing.

### Performance Logging

Track slow operations for optimization:

```javascript
import { logPerformance } from '../utils/logger.js';

const start = Date.now();
const results = await expensiveOperation();
const duration = Date.now() - start;

logPerformance('Database query', duration, {
  threshold: 1000, // Log if > 1 second
  query: 'SELECT * FROM users',
  resultCount: results.length,
});
```

---

## Security Features

### 1. Information Leakage Prevention

**Problem**: Error messages can expose sensitive system information.

**Solution**: Sanitize error messages in production.

```javascript
// Development error
{
  "error": {
    "message": "Database connection failed: Connection to postgres://user:pass@localhost:5432/db failed",
    "stack": "Error: Database connection failed\n  at connect (db.js:123)\n..."
  }
}

// Production error (sanitized)
{
  "error": {
    "message": "An unexpected error occurred",
    "errorId": "ERR-1698765432-abc123"
  }
}
```

### 2. Brute Force Detection

Automatically tracks failed login attempts:

```javascript
import { trackFailedLogin } from '../utils/logger.js';

// In login route
if (!validPassword) {
  const attemptCount = trackFailedLogin(email, req);
  
  // Alert after 5 failed attempts
  if (attemptCount >= 5) {
    // Security event automatically logged
    // Consider implementing account lockout
  }
  
  throw new UnauthorizedError('Invalid credentials');
}
```

### 3. Database Error Sanitization

PostgreSQL error codes are mapped to safe messages:

| Error Code | Message (Production) | Internal Code |
|------------|----------------------|---------------|
| 23505 | A resource with this value already exists | DUPLICATE_RESOURCE |
| 23503 | Referenced resource does not exist | INVALID_REFERENCE |
| 23502 | Required field is missing | MISSING_REQUIRED_FIELD |
| 08xxx | Service temporarily unavailable | DATABASE_UNAVAILABLE |

### 4. JWT Error Handling

JWT errors are consistently handled:

```javascript
// JsonWebTokenError
{
  "error": {
    "type": "JsonWebTokenError",
    "message": "Invalid authentication token",
    "code": "INVALID_TOKEN"
  }
}

// TokenExpiredError
{
  "error": {
    "type": "TokenExpiredError",
    "message": "Authentication token has expired",
    "code": "TOKEN_EXPIRED"
  }
}
```

---

## Usage Examples

### Basic Route with Error Handling

```javascript
import { asyncHandler, NotFoundError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

router.get('/jobs/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  logger.info('Fetching job', { jobId: id, requestId: req.id });
  
  const job = await db.query(
    'SELECT * FROM jobs WHERE id = $1',
    [id]
  );
  
  if (job.rows.length === 0) {
    throw new NotFoundError('Job not found', 'Job');
  }
  
  res.json({ job: job.rows[0] });
}));
```

### Authentication Route with Security Logging

```javascript
import { UnauthorizedError, asyncHandler } from '../middleware/errorHandler.js';
import { logSecurityEvent, SecurityEventType, trackFailedLogin } from '../utils/logger.js';

router.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const user = await User.findByEmail(email);
  
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    // Track failed attempt
    trackFailedLogin(email, req);
    
    // Log security event
    logSecurityEvent(SecurityEventType.LOGIN_FAILURE, {
      severity: 'warn',
      email,
      reason: 'invalid_credentials',
    }, req);
    
    throw new UnauthorizedError('Invalid credentials');
  }
  
  // Success - log event
  logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, {
    userId: user.id,
    email: user.email,
  }, req);
  
  const token = generateToken(user);
  res.json({ token, user });
}));
```

### Data Modification with Audit Logging

```javascript
import { logSecurityEvent, SecurityEventType } from '../utils/logger.js';
import { asyncHandler, ForbiddenError } from '../middleware/errorHandler.js';

router.patch('/users/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Authorization check
  if (req.user.id !== id && req.user.role !== 'admin') {
    logSecurityEvent(SecurityEventType.FORBIDDEN_ACCESS, {
      severity: 'warn',
      attemptedUserId: id,
      attemptedAction: 'user_update',
    }, req);
    
    throw new ForbiddenError('Cannot modify other users');
  }
  
  // Update user
  const updated = await User.update(id, req.body);
  
  // Log data modification
  logSecurityEvent(SecurityEventType.DATA_MODIFICATION, {
    resourceType: 'user',
    resourceId: id,
    modifiedFields: Object.keys(req.body),
  }, req);
  
  res.json({ user: updated });
}));
```

### File Upload with Security Logging

```javascript
import { logSecurityEvent, SecurityEventType } from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { secureUpload } from '../middleware/fileUpload.js';

router.post('/upload', 
  authenticate,
  secureUpload.single('file'),
  asyncHandler(async (req, res) => {
    const file = req.file;
    
    // Log file upload
    logSecurityEvent(SecurityEventType.FILE_UPLOAD, {
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      virusScanResult: file.virusScanResult,
    }, req);
    
    res.json({ 
      success: true,
      fileId: file.id,
      url: file.url 
    });
  })
);
```

### Performance Monitoring

```javascript
import { logPerformance } from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';

router.get('/reports/analytics', asyncHandler(async (req, res) => {
  const start = Date.now();
  
  // Expensive operation
  const analytics = await generateAnalytics(req.query);
  
  const duration = Date.now() - start;
  
  // Log if slow (> 2 seconds)
  logPerformance('Analytics generation', duration, {
    threshold: 2000,
    dateRange: req.query.dateRange,
    resultCount: analytics.length,
  });
  
  res.json({ analytics });
}));
```

---

## Best Practices

### 1. Always Use Custom Error Classes

❌ **Bad:**
```javascript
if (!user) {
  res.status(404).json({ error: 'User not found' });
  return;
}
```

✅ **Good:**
```javascript
if (!user) {
  throw new NotFoundError('User not found');
}
```

### 2. Use asyncHandler for Async Routes

❌ **Bad:**
```javascript
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});
```

✅ **Good:**
```javascript
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.findAll();
  res.json({ users });
}));
```

### 3. Never Log Sensitive Data Directly

❌ **Bad:**
```javascript
logger.info('User login', { email, password }); // Password logged!
```

✅ **Good:**
```javascript
logger.info('User login', { email }); // Password automatically redacted if present
```

### 4. Include Request Context in Logs

❌ **Bad:**
```javascript
logger.error('Database error', { error: err.message });
```

✅ **Good:**
```javascript
logger.error('Database error', {
  requestId: req.id,
  userId: req.user?.id,
  query: 'SELECT * FROM users',
  error: err.message,
});
```

### 5. Log Security Events

```javascript
// Always log authentication events
logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, { userId: user.id }, req);

// Always log permission changes
logSecurityEvent(SecurityEventType.PERMISSION_CHANGE, {
  targetUserId: userId,
  oldRole: 'member',
  newRole: 'admin',
}, req);

// Always log data access for sensitive resources
logSecurityEvent(SecurityEventType.DATA_ACCESS, {
  resourceType: 'payroll',
  resourceId: payroll.id,
}, req);
```

### 6. Return Consistent Error Responses

All routes automatically return the standard error format when using custom error classes:

```javascript
{
  "error": {
    "type": "NotFoundError",
    "message": "Resource not found",
    "code": "NOT_FOUND",
    "errorId": "ERR-1698765432-abc123",
    "timestamp": "2025-10-28T10:30:00.000Z"
  }
}
```

### 7. Use Error Codes for Client-Side Handling

```javascript
// Client-side error handling
try {
  const response = await fetch('/api/users');
  const data = await response.json();
  
  if (!response.ok) {
    switch (data.error.code) {
      case 'NOT_FOUND':
        showNotFoundMessage();
        break;
      case 'VALIDATION_ERROR':
        showValidationErrors(data.error.details.errors);
        break;
      case 'RATE_LIMIT_EXCEEDED':
        showRateLimitMessage(data.error.details.retryAfter);
        break;
      default:
        showGenericError();
    }
  }
} catch (error) {
  showNetworkError();
}
```

---

## Log File Management

### Log Rotation

Files automatically rotate when they reach 10MB:

```
logs/
├── combined.log          # Current log
├── combined.log.1        # Previous log
├── combined.log.2        # Older log
└── combined.log.3.gz     # Compressed older log
```

### Manual Log Management

```bash
# View recent errors
tail -f logs/error.log

# Search for specific request
grep "ERR-1698765432-abc123" logs/combined.log

# View security events
cat logs/security.log | jq '.securityEvent'

# Count errors by type
cat logs/error.log | jq -r '.error.code' | sort | uniq -c

# Find slow requests
cat logs/combined.log | jq 'select(.duration > "3000ms")'
```

### Log Cleanup

```bash
# Delete logs older than 30 days
find logs/ -name "*.log.*" -mtime +30 -delete

# Compress old logs
find logs/ -name "*.log.[0-9]" -exec gzip {} \;
```

---

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Error Rate**
   ```bash
   # Errors per minute
   grep -c "level.*error" logs/combined.log
   ```

2. **Failed Logins**
   ```bash
   # Failed logins in last hour
   grep "LOGIN_FAILURE" logs/security.log | grep "$(date -u +%Y-%m-%d)" | wc -l
   ```

3. **Rate Limit Hits**
   ```bash
   # Rate limit events
   grep "RATE_LIMIT_EXCEEDED" logs/security.log | wc -l
   ```

4. **Slow Requests**
   ```bash
   # Requests taking > 3 seconds
   grep "Slow operation" logs/warn.log | wc -l
   ```

### Integration with Monitoring Tools

**DataDog:**
```javascript
// Add DataDog transport
import { datadog } from 'winston-datadog';

logger.add(new datadog({
  apiKey: config.datadogApiKey,
  hostname: config.hostname,
  service: 'recruitiq-api',
}));
```

**CloudWatch:**
```javascript
import WinstonCloudWatch from 'winston-cloudwatch';

logger.add(new WinstonCloudWatch({
  logGroupName: '/aws/lambda/recruitiq-api',
  logStreamName: `${config.env}-${config.hostname}`,
  awsRegion: config.aws.region,
}));
```

---

## Troubleshooting

### Problem: Logs Not Being Written

**Check:**
1. Logs directory exists and is writable
2. Disk space available
3. File permissions correct

```bash
# Check disk space
df -h

# Check permissions
ls -la logs/

# Create logs directory
mkdir -p logs
chmod 755 logs
```

### Problem: Too Many Logs (Disk Space)

**Solution:** Adjust log levels and rotation:

```javascript
// .env
LOG_LEVEL=warn  # Reduce verbosity

// config/index.js
logging: {
  level: process.env.LOG_LEVEL || 'warn',
  maxSize: '5m',  // Smaller files
  maxFiles: 5,    // Fewer files
}
```

### Problem: Sensitive Data in Logs

**Check:** Ensure redaction is working:

```javascript
// Test redaction
logger.info('Test', {
  password: 'secret',      // Should be [REDACTED]
  email: 'test@test.com',  // Should be visible
});
```

**Add custom sensitive fields:**
```javascript
// utils/logger.js
const SENSITIVE_FIELDS = [
  ...existingFields,
  'customSecretField',
  'internalApiKey',
];
```

### Problem: Cannot Find Errors by Request ID

**Ensure request ID is included:**
```javascript
// All logs should include req.id
logger.info('Operation', {
  requestId: req.id,  // Always include
  // ... other data
});
```

**Search logs:**
```bash
# Find all logs for request
grep "1698765432-abc123" logs/combined.log
```

---

## Summary

✅ **Implemented Features:**
- Standardized error responses (10 custom error classes)
- Enhanced Winston logging with redaction
- Request ID tracking
- Security event logging (25+ event types)
- Performance monitoring
- Automatic sensitive data filtering
- Brute force detection
- Separate security audit logs

✅ **Security Benefits:**
- No sensitive data in logs
- Production-safe error messages
- Security event tracking for compliance
- Request tracing for debugging
- Failed login attempt tracking

✅ **Developer Benefits:**
- Consistent error handling
- Easy-to-use error classes
- Automatic async error catching
- Structured JSON logs
- Performance insights

For implementation details, see:
- `src/utils/logger.js` - Enhanced logging system
- `src/middleware/errorHandler.js` - Error handling and custom errors
- `src/middleware/requestId.js` - Request ID middleware
- `src/middleware/requestLogger.js` - Request logging
