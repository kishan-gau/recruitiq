# Security Standards

**Part of:** [RecruitIQ Coding Standards](../CODING_STANDARDS.md)  
**Version:** 1.0  
**Last Updated:** November 3, 2025

---

## Table of Contents

1. [Security Principles](#security-principles)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [Input Validation](#input-validation)
5. [SQL Injection Prevention](#sql-injection-prevention)
6. [XSS Prevention](#xss-prevention)
7. [CSRF Protection](#csrf-protection)
8. [Tenant Isolation](#tenant-isolation)
9. [Secrets Management](#secrets-management)
10. [Security Logging](#security-logging)

---

## Security Principles

### Core Security Rules (MANDATORY)

1. **NEVER trust user input** - Always validate and sanitize
2. **ALWAYS use parameterized queries** - Prevent SQL injection
3. **ALWAYS filter by organizationId** - Enforce tenant isolation
4. **NEVER expose sensitive data** - Redact in logs and responses
5. **ALWAYS use HTTPS** - No exceptions in production
6. **NEVER store passwords in plain text** - Use bcrypt
7. **ALWAYS sanitize output** - Prevent XSS attacks
8. **NEVER expose stack traces** to users in production
9. **ALWAYS rate limit** API endpoints
10. **NEVER commit secrets** to version control

---

## Authentication & Authorization

### JWT Token Standards

```javascript
// ✅ CORRECT: Token generation
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/index.js';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN, // e.g., '24h'
      issuer: 'recruitiq-api',
      audience: 'recruitiq-client'
    }
  );
}

// ✅ CORRECT: Token verification
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'recruitiq-api',
      audience: 'recruitiq-client'
    });
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

// ❌ WRONG: No expiration
jwt.sign({ id: user.id }, JWT_SECRET); // Missing expiration!

// ❌ WRONG: Weak secret
const JWT_SECRET = 'secret123'; // Too weak!
```

### Authentication Middleware

```javascript
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';

export async function authenticate(req, res, next) {
  try {
    // 1. Extract token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // 2. Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Check token blacklist (for logout)
    const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // 4. Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      organizationId: decoded.organizationId,
      role: decoded.role
    };

    // 5. Log authentication
    logger.info('User authenticated', {
      userId: req.user.id,
      ip: req.ip,
      path: req.path
    });

    next();
  } catch (error) {
    // Log security event
    logger.logSecurityEvent('authentication_failed', {
      ip: req.ip,
      path: req.path,
      error: error.message
    });

    next(new UnauthorizedError('Authentication failed'));
  }
}
```

### Role-Based Access Control

```javascript
/**
 * Middleware to check user roles
 * @param {Array<string>} allowedRoles - Roles that can access the endpoint
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const { role } = req.user;

    if (!allowedRoles.includes(role)) {
      logger.logSecurityEvent('forbidden_access', {
        userId: req.user.id,
        userRole: role,
        requiredRoles: allowedRoles,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied',
        errorCode: 'FORBIDDEN'
      });
    }

    next();
  };
}

// Usage in routes
router.post('/admin/users', 
  authenticate, 
  requireRole('admin', 'owner'),
  createUser
);
```

### Password Security

```javascript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // Minimum 12 for production

/**
 * Hashes a password using bcrypt
 */
export async function hashPassword(password) {
  // Validate password strength first
  if (password.length < 12) {
    throw new ValidationError('Password must be at least 12 characters');
  }

  // Check for common patterns
  if (isCommonPassword(password)) {
    throw new ValidationError('Password is too common');
  }

  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a password against a hash
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Password strength validation
function isCommonPassword(password) {
  const commonPasswords = [
    'password123', '12345678', 'qwerty123', 'admin123'
    // Load from file in production
  ];
  
  return commonPasswords.includes(password.toLowerCase());
}

// ❌ WRONG: Plain text passwords
user.password = req.body.password; // NEVER DO THIS!

// ❌ WRONG: Weak hashing
const hash = crypto.createHash('md5').update(password).digest('hex'); // MD5 is broken!

// ✅ CORRECT: Proper password hashing
user.passwordHash = await hashPassword(req.body.password);
```

---

## Data Protection

### Sensitive Data Handling

```javascript
// ✅ CORRECT: Redact sensitive fields in logs
function sanitizeForLogging(data) {
  const sensitive = ['password', 'passwordHash', 'token', 'ssn', 'creditCard'];
  
  const sanitized = { ...data };
  
  sensitive.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

// Usage
logger.info('User data', sanitizeForLogging(userData));

// ✅ CORRECT: Remove sensitive fields from API responses
function sanitizeUserForResponse(user) {
  const { passwordHash, refreshToken, ...safe } = user;
  return safe;
}

// ❌ WRONG: Logging sensitive data
logger.info('User login', { 
  email: user.email, 
  password: req.body.password // NEVER LOG PASSWORDS!
});

// ❌ WRONG: Returning sensitive data
return res.json({ user }); // May include passwordHash!
```

### Data Encryption at Rest

```javascript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts sensitive data
 */
export function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypts sensitive data
 */
export function decrypt(encrypted, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY, 'hex'), 
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Usage for sensitive fields
async function saveSensitiveData(data) {
  const { encrypted, iv, authTag } = encrypt(data.ssn);
  
  await pool.query(`
    INSERT INTO sensitive_data (user_id, encrypted_data, iv, auth_tag)
    VALUES ($1, $2, $3, $4)
  `, [userId, encrypted, iv, authTag]);
}
```

---

## Input Validation

### Validation Rules (MANDATORY)

```javascript
import Joi from 'joi';
import validator from 'validator';

// ✅ CORRECT: Comprehensive validation
const userSchema = Joi.object({
  // String validation
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .max(255),
  
  // Strong password validation
  password: Joi.string()
    .required()
    .min(12)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
    }),
  
  // Phone validation
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .allow(null, ''),
  
  // URL validation
  website: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional()
    .allow(null, ''),
  
  // Enum validation
  role: Joi.string()
    .valid('admin', 'recruiter', 'hiring_manager', 'interviewer')
    .required(),
  
  // UUID validation
  organizationId: Joi.string()
    .uuid()
    .required(),
  
  // Date validation
  birthDate: Joi.date()
    .max('now')
    .min('1900-01-01')
    .optional(),
  
  // Number validation
  salary: Joi.number()
    .integer()
    .min(0)
    .max(10000000)
    .optional(),
  
  // Array validation
  skills: Joi.array()
    .items(Joi.string().trim().max(50))
    .min(1)
    .max(100)
    .unique()
    .optional(),
  
  // Nested object validation
  address: Joi.object({
    street: Joi.string().max(200).required(),
    city: Joi.string().max(100).required(),
    state: Joi.string().length(2).uppercase().required(),
    zip: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required()
  }).optional()
}).options({ 
  stripUnknown: true, // Remove unknown fields
  abortEarly: false // Return all errors, not just first
});

// Validate input
async function validateInput(data) {
  try {
    return await userSchema.validateAsync(data);
  } catch (error) {
    // Log validation failure
    logger.warn('Validation failed', {
      errors: error.details,
      data: sanitizeForLogging(data)
    });
    
    throw new ValidationError('Invalid input', error.details);
  }
}
```

### Additional Validation Helpers

```javascript
import validator from 'validator';

/**
 * Sanitizes and validates email
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required');
  }
  
  const sanitized = validator.normalizeEmail(email);
  
  if (!validator.isEmail(sanitized)) {
    throw new ValidationError('Invalid email format');
  }
  
  // Check for disposable email domains
  if (isDisposableEmail(sanitized)) {
    throw new ValidationError('Disposable email addresses are not allowed');
  }
  
  return sanitized;
}

/**
 * Validates UUID
 */
export function validateUUID(id, fieldName = 'ID') {
  if (!validator.isUUID(id, 4)) {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
  return id;
}

/**
 * Sanitizes HTML input
 */
export function sanitizeHTML(input) {
  // Remove all HTML tags
  return validator.escape(input);
}

/**
 * Validates file upload
 */
export function validateFileUpload(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  
  if (file.size > maxSize) {
    throw new ValidationError('File size exceeds 10MB limit');
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    throw new ValidationError('Invalid file type');
  }
  
  // Validate file extension matches MIME type
  const ext = file.originalname.split('.').pop().toLowerCase();
  const mimeToExt = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'application/pdf': ['pdf']
  };
  
  if (!mimeToExt[file.mimetype]?.includes(ext)) {
    throw new ValidationError('File extension does not match content type');
  }
  
  return true;
}
```

---

## SQL Injection Prevention

### Parameterized Queries (MANDATORY)

```javascript
// ❌ WRONG: String concatenation (SQL INJECTION RISK!)
const query = `SELECT * FROM users WHERE email = '${email}'`;
await pool.query(query);

// ❌ WRONG: Template literals (SQL INJECTION RISK!)
const query = `SELECT * FROM users WHERE email = '${email}' AND role = '${role}'`;
await pool.query(query);

// ✅ CORRECT: Parameterized queries
const query = 'SELECT * FROM users WHERE email = $1 AND role = $2';
await pool.query(query, [email, role]);

// ✅ CORRECT: Using custom query wrapper
const query = 'SELECT * FROM users WHERE email = $1 AND organization_id = $2';
await query(text, [email, organizationId], organizationId, {
  operation: 'SELECT',
  table: 'users'
});

// ✅ CORRECT: Dynamic WHERE clauses
function buildWhereClause(filters) {
  const conditions = [];
  const values = [];
  let paramCount = 0;

  if (filters.email) {
    paramCount++;
    conditions.push(`email = $${paramCount}`);
    values.push(filters.email);
  }

  if (filters.role) {
    paramCount++;
    conditions.push(`role = $${paramCount}`);
    values.push(filters.role);
  }

  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}` 
    : '';

  return { whereClause, values };
}

// Usage
const { whereClause, values } = buildWhereClause(filters);
const query = `SELECT * FROM users ${whereClause}`;
await pool.query(query, values);
```

### Query Validation

```javascript
/**
 * Validates table and column names to prevent SQL injection
 */
function validateIdentifier(identifier) {
  // Only allow alphanumeric and underscores
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new ValidationError('Invalid identifier');
  }
  
  // Check against whitelist
  const allowedTables = ['jobs', 'candidates', 'applications', 'interviews', 'users'];
  if (!allowedTables.includes(identifier)) {
    throw new ValidationError('Table not allowed');
  }
  
  return identifier;
}

// Usage for dynamic table names
const tableName = validateIdentifier(req.query.table);
const query = `SELECT * FROM ${tableName} WHERE organization_id = $1`;
```

---

## XSS Prevention

### Output Encoding

```javascript
import validator from 'validator';

/**
 * Escapes HTML to prevent XSS
 */
export function escapeHTML(str) {
  return validator.escape(str);
}

// Usage in API responses
function formatJobForResponse(job) {
  return {
    ...job,
    title: escapeHTML(job.title),
    description: escapeHTML(job.description)
  };
}

// ✅ CORRECT: Always sanitize user-generated content
app.get('/api/jobs/:id', async (req, res) => {
  const job = await JobService.getById(req.params.id, req.user.organizationId);
  
  // Sanitize before sending to client
  return res.json({
    success: true,
    job: formatJobForResponse(job)
  });
});
```

### Content Security Policy

```javascript
// In middleware/securityHeaders.js
export function securityHeaders(req, res, next) {
  // Prevent XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self';"
  );
  
  next();
}
```

---

## CSRF Protection

### CSRF Token Implementation

```javascript
import csrf from 'csurf';

// Setup CSRF protection
const csrfProtection = csrf({ cookie: true });

// Apply to state-changing routes
app.post('/api/jobs', csrfProtection, createJob);
app.put('/api/jobs/:id', csrfProtection, updateJob);
app.delete('/api/jobs/:id', csrfProtection, deleteJob);

// Provide CSRF token to client
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

---

## Tenant Isolation

### Organization Filtering (MANDATORY)

```javascript
// ❌ WRONG: No organization filtering
SELECT * FROM jobs WHERE id = $1

// ✅ CORRECT: Always filter by organization
SELECT * FROM jobs 
WHERE id = $1 
  AND organization_id = $2 
  AND deleted_at IS NULL

// ✅ CORRECT: JOINs must filter both tables
SELECT j.*, c.name as candidate_name
FROM jobs j
JOIN applications a ON j.id = a.job_id
JOIN candidates c ON a.candidate_id = c.id
WHERE j.id = $1
  AND j.organization_id = $2
  AND c.organization_id = $2  -- Filter both sides!
  AND j.deleted_at IS NULL

// ✅ CORRECT: Verify ownership before operations
async function updateJob(jobId, data, organizationId, userId) {
  // First verify the job belongs to the organization
  const job = await this.repository.findById(jobId, organizationId);
  
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  
  // Now safe to update
  return this.repository.update(jobId, data, organizationId);
}
```

---

## Secrets Management

### Environment Variables

```javascript
// ❌ WRONG: Hard-coded secrets
const JWT_SECRET = 'my-secret-key-123';
const DB_PASSWORD = 'password123';

// ✅ CORRECT: Environment variables
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const DB_PASSWORD = process.env.DB_PASSWORD;

// ✅ CORRECT: Validate required secrets
function validateConfig() {
  const required = [
    'JWT_SECRET',
    'DB_PASSWORD',
    'ENCRYPTION_KEY',
    'AWS_SECRET_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate secret strength
  if (JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
}

// ❌ WRONG: Committing .env file
// .env should ALWAYS be in .gitignore

// ✅ CORRECT: .env.example for reference
// Commit .env.example with placeholder values
```

---

## Security Logging

### Security Event Logging

```javascript
// Security events that MUST be logged
const SECURITY_EVENTS = {
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  AUTHENTICATION_FAILED: 'authentication_failed',
  FORBIDDEN_ACCESS: 'forbidden_access',
  TOKEN_REVOKED: 'token_revoked',
  PASSWORD_CHANGED: 'password_changed',
  ROLE_CHANGED: 'role_changed',
  DATA_EXPORT: 'data_export',
  BULK_DELETE: 'bulk_delete',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded'
};

/**
 * Logs security events
 */
function logSecurityEvent(eventType, details) {
  logger.warn('Security Event', {
    eventType,
    timestamp: new Date().toISOString(),
    severity: getSeverity(eventType),
    ...details,
    ip: details.ip || 'unknown',
    userId: details.userId || 'anonymous'
  });
  
  // Alert on critical events
  if (isCritical(eventType)) {
    alertSecurityTeam(eventType, details);
  }
}

// Usage
logSecurityEvent(SECURITY_EVENTS.UNAUTHORIZED_ACCESS, {
  userId: req.user?.id,
  ip: req.ip,
  path: req.path,
  method: req.method,
  attempted Resource: req.params.id
});
```

---

**Next:** [Database Standards](./DATABASE_STANDARDS.md)
