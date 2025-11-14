# Authentication System Part 2 - Middleware & Routes

**Document:** 03b-AUTHENTICATION-MIDDLEWARE.md  
**Project:** Multi-Tenant Consolidated Reporting System  
**Continuation of:** 03-AUTHENTICATION-SYSTEM.md

---

## 3. Middleware Implementation

### Authentication Middleware

```javascript
// src/middleware/authenticate.js

const jwtService = require('../auth/jwt.service');
const sessionService = require('../auth/session.service');
const { UnauthorizedError } = require('../utils/errors');

/**
 * Main authentication middleware
 * Validates JWT token and attaches user info to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No authorization token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify and decode token
    const decoded = jwtService.verifyAccessToken(token);

    // Check if token is revoked
    const isRevoked = await jwtService.isTokenRevoked(decoded.jti);
    if (isRevoked) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // Validate session
    await sessionService.validateSession(decoded.sessionId);

    // Attach user info to request object
    req.auth = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      scope: decoded.scope,
      permissions: decoded.permissions,
      dataMasking: decoded.dataMasking,
      sessionId: decoded.sessionId
    };

    next();
  } catch (error) {
    if (error.message === 'Token expired') {
      return res.status(401).json({
        error: 'token_expired',
        message: 'Access token has expired. Please refresh your token.'
      });
    }

    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        error: 'unauthorized',
        message: error.message
      });
    }

    return res.status(401).json({
      error: 'authentication_failed',
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Allows anonymous access but attaches user info if token present
 */
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.get('Authorization');
  
  if (!authHeader) {
    req.auth = null;
    return next();
  }

  try {
    await authenticate(req, res, next);
  } catch (error) {
    // If authentication fails, continue as anonymous
    req.auth = null;
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate
};
```

### Authorization Middleware

```javascript
// src/middleware/authorize.js

const db = require('../database/connection');
const { ForbiddenError } = require('../utils/errors');

/**
 * Check if user has required role
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Check if user has specific permission
 */
const requirePermission = (module, permission) => {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required'
      });
    }

    const hasPermission = req.auth.permissions?.[module]?.[permission] === true;

    if (!hasPermission) {
      return res.status(403).json({
        error: 'forbidden',
        message: `Missing permission: ${module}.${permission}`
      });
    }

    next();
  };
};

/**
 * Check if user can access requested organization(s)
 */
const requireOrganizationAccess = async (req, res, next) => {
  if (!req.auth) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Authentication required'
    });
  }

  try {
    // Extract organization ID from request
    // Could be in params, query, or body
    const orgId = req.params.organizationId || 
                  req.query.organizationId || 
                  req.body.organizationId;

    if (!orgId) {
      // If no specific org requested, user is querying across all accessible orgs
      return next();
    }

    // Check if user has access to this organization
    const hasAccess = req.auth.scope.accessibleOrganizations.includes(orgId);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'You do not have access to this organization'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      error: 'authorization_error',
      message: 'Failed to verify organization access'
    });
  }
};

/**
 * Filter organizations in request based on user access
 * Modifies req.auth.filteredOrganizations with accessible org IDs
 */
const filterOrganizations = async (req, res, next) => {
  if (!req.auth) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Authentication required'
    });
  }

  try {
    // Get requested organization IDs
    let requestedOrgIds = [];
    
    if (req.query.organizationIds) {
      requestedOrgIds = Array.isArray(req.query.organizationIds) 
        ? req.query.organizationIds 
        : [req.query.organizationIds];
    } else if (req.body.organizationIds) {
      requestedOrgIds = req.body.organizationIds;
    }

    // If no specific orgs requested, use all accessible orgs
    if (requestedOrgIds.length === 0) {
      req.auth.filteredOrganizations = req.auth.scope.accessibleOrganizations;
      return next();
    }

    // Filter to only orgs user can access
    const accessible = req.auth.scope.accessibleOrganizations;
    req.auth.filteredOrganizations = requestedOrgIds.filter(id => 
      accessible.includes(id)
    );

    // Warn if some orgs were filtered out
    if (req.auth.filteredOrganizations.length < requestedOrgIds.length) {
      const filtered = requestedOrgIds.length - req.auth.filteredOrganizations.length;
      req.warnings = req.warnings || [];
      req.warnings.push(`${filtered} organization(s) filtered due to access restrictions`);
    }

    next();
  } catch (error) {
    return res.status(500).json({
      error: 'authorization_error',
      message: 'Failed to filter organizations'
    });
  }
};

/**
 * Check if user can export data
 */
const requireExportPermission = (module) => {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required'
      });
    }

    const canExport = req.auth.permissions?.[module]?.exportData === true;

    if (!canExport) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'You do not have permission to export data'
      });
    }

    next();
  };
};

/**
 * Enforce data visibility level
 * Prevents users from accessing detail-level data if they only have aggregate access
 */
const enforceDataVisibility = (requiredLevel) => {
  const levelHierarchy = {
    'aggregate_only': 1,
    'masked_detail': 2,
    'full_detail': 3
  };

  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required'
      });
    }

    const userLevel = req.auth.scope.dataVisibilityLevel;
    const requiredLevelValue = levelHierarchy[requiredLevel];
    const userLevelValue = levelHierarchy[userLevel];

    if (userLevelValue < requiredLevelValue) {
      return res.status(403).json({
        error: 'forbidden',
        message: `This report requires ${requiredLevel} access. You have ${userLevel} access.`
      });
    }

    next();
  };
};

module.exports = {
  requireRole,
  requirePermission,
  requireOrganizationAccess,
  filterOrganizations,
  requireExportPermission,
  enforceDataVisibility
};
```

### Audit Logging Middleware

```javascript
// src/middleware/auditLog.js

const db = require('../database/connection');

/**
 * Log all access to reporting endpoints
 */
const auditLog = (reportType, reportCategory) => {
  return async (req, res, next) => {
    // Store start time for response time calculation
    req.auditStartTime = Date.now();

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    
    res.json = function(body) {
      // Log after response is sent
      setImmediate(async () => {
        try {
          const responseTime = Date.now() - req.auditStartTime;
          
          // Extract organization info from request
          const orgIds = req.auth?.filteredOrganizations || [];
          const orgNames = await getOrganizationNames(orgIds);

          // Determine if data was exported
          const isExport = req.path.includes('/export') || 
                          req.query.format === 'excel' || 
                          req.query.format === 'pdf';

          await db.query(
            `INSERT INTO audit.access_audit_log (
              user_id, user_email, user_role,
              report_type, report_category,
              group_id, group_name,
              organization_ids, organization_names,
              endpoint, http_method, query_params, filters_applied,
              data_visibility_level, columns_accessed,
              rows_returned, records_exported, export_format,
              success, http_status_code, error_message, response_time_ms,
              ip_address, user_agent, session_id
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
              $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
            )`,
            [
              req.auth?.userId,
              req.auth?.email,
              req.auth?.role,
              reportType,
              reportCategory,
              null, // group_id - extract if needed
              null, // group_name
              orgIds,
              orgNames,
              req.originalUrl,
              req.method,
              JSON.stringify(req.query),
              JSON.stringify(req.body),
              req.auth?.scope?.dataVisibilityLevel,
              null, // columns_accessed - could track from query
              Array.isArray(body?.data) ? body.data.length : null,
              isExport,
              req.query.format || null,
              res.statusCode < 400,
              res.statusCode,
              res.statusCode >= 400 ? body?.message : null,
              responseTime,
              req.ip,
              req.get('User-Agent'),
              req.auth?.sessionId
            ]
          );
        } catch (error) {
          console.error('Audit logging failed:', error);
          // Don't fail the request if audit logging fails
        }
      });

      // Send response
      return originalJson(body);
    };

    next();
  };
};

/**
 * Get organization names from IDs
 */
async function getOrganizationNames(orgIds) {
  if (!orgIds || orgIds.length === 0) return [];

  const { rows } = await db.query(
    'SELECT name FROM operational.organizations WHERE id = ANY($1)',
    [orgIds]
  );

  return rows.map(r => r.name);
}

module.exports = { auditLog };
```

### Rate Limiting Middleware

```javascript
// src/middleware/rateLimit.js

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

// Create Redis client for distributed rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:api:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many requests. Please try again later.'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 login attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    error: 'rate_limit_exceeded',
    message: 'Too many login attempts. Please try again in 15 minutes.'
  }
});

/**
 * Export rate limiter
 * 20 exports per hour per user
 */
const exportLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:export:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => {
    // Rate limit by user ID instead of IP
    return req.auth?.userId || req.ip;
  },
  message: {
    error: 'export_limit_exceeded',
    message: 'Export quota exceeded. You can export 20 reports per hour.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  exportLimiter
};
```

---

## 4. Authentication Routes

### Auth Routes Handler

```javascript
// src/routes/auth.routes.js

const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const jwtService = require('../auth/jwt.service');
const passwordService = require('../auth/password.service');
const sessionService = require('../auth/session.service');
const { authenticate } = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimit');

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password, mfaCode } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Email and password are required'
      });
    }

    // Get user from database
    const { rows } = await db.query(
      `SELECT 
        id, email, username, first_name, last_name,
        password_hash, role, is_active, account_locked,
        locked_until, accessible_groups, accessible_organizations,
        permissions, data_masking_rules,
        mfa_enabled, mfa_secret,
        session_timeout_minutes, max_concurrent_sessions
       FROM security.reporting_users
       WHERE LOWER(email) = LOWER($1)
         AND deleted_at IS NULL`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid email or password'
      });
    }

    const user = rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'account_inactive',
        message: 'Your account has been deactivated'
      });
    }

    // Check if account is locked
    if (user.account_locked) {
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return res.status(403).json({
          error: 'account_locked',
          message: `Account locked until ${new Date(user.locked_until).toLocaleTimeString()}`
        });
      } else {
        // Unlock if lock period expired
        await db.query(
          `UPDATE security.reporting_users
           SET account_locked = false, failed_login_attempts = 0, locked_until = NULL
           WHERE id = $1`,
          [user.id]
        );
      }
    }

    // Verify password
    const passwordValid = await passwordService.comparePassword(password, user.password_hash);

    if (!passwordValid) {
      // Increment failed login attempts
      await db.query(
        `UPDATE security.reporting_users
         SET failed_login_attempts = failed_login_attempts + 1,
             account_locked = CASE WHEN failed_login_attempts + 1 >= 5 THEN true ELSE false END,
             locked_until = CASE WHEN failed_login_attempts + 1 >= 5 THEN NOW() + INTERVAL '30 minutes' ELSE NULL END
         WHERE id = $1`,
        [user.id]
      );

      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid email or password'
      });
    }

    // Check MFA if enabled
    if (user.mfa_enabled) {
      if (!mfaCode) {
        return res.status(200).json({
          requiresMfa: true,
          message: 'MFA code required'
        });
      }

      // Verify MFA code (implementation in next section)
      const mfaValid = await verifyMfaCode(user.id, user.mfa_secret, mfaCode);
      if (!mfaValid) {
        return res.status(401).json({
          error: 'invalid_mfa',
          message: 'Invalid MFA code'
        });
      }
    }

    // Generate session ID
    const sessionId = await generateSessionId();

    // Generate tokens
    const accessToken = await jwtService.generateAccessToken(user, sessionId);
    const refreshToken = jwtService.generateRefreshToken(user.id, sessionId);

    // Create session record
    await sessionService.createSession(user.id, jwtService.verifyAccessToken(accessToken).jti, refreshToken, req);

    // Update last login info
    await db.query(
      `UPDATE security.reporting_users
       SET 
         last_login_at = NOW(),
         last_login_ip = $2,
         failed_login_attempts = 0,
         last_activity_at = NOW()
       WHERE id = $1`,
      [user.id, req.ip]
    );

    // Return tokens and user info
    res.json({
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600, // 1 hour in seconds
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'login_failed',
      message: 'Login failed. Please try again.'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Exchange refresh token for new access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwtService.verifyRefreshToken(refreshToken);

    // Verify session exists and is valid
    await sessionService.validateSession(decoded.sessionId);

    // Get user info
    const { rows } = await db.query(
      `SELECT 
        id, email, username, first_name, last_name, role,
        accessible_groups, accessible_organizations,
        permissions, data_masking_rules, is_active
       FROM security.reporting_users
       WHERE id = $1 AND deleted_at IS NULL`,
      [decoded.userId]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Invalid refresh token'
      });
    }

    const user = rows[0];

    // Generate new access token
    const newAccessToken = await jwtService.generateAccessToken(user, decoded.sessionId);

    res.json({
      accessToken: newAccessToken,
      tokenType: 'Bearer',
      expiresIn: 3600
    });

  } catch (error) {
    return res.status(401).json({
      error: 'refresh_failed',
      message: 'Failed to refresh token'
    });
  }
});

/**
 * POST /api/auth/logout
 * Revoke current session
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    await sessionService.revokeSession(req.auth.sessionId, 'user_logout');

    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'logout_failed',
      message: 'Logout failed'
    });
  }
});

/**
 * POST /api/auth/logout-all
 * Revoke all user sessions (force logout from all devices)
 */
router.post('/logout-all', authenticate, async (req, res) => {
  try {
    await sessionService.revokeAllUserSessions(req.auth.userId, 'user_action');

    res.json({
      message: 'Logged out from all devices'
    });
  } catch (error) {
    console.error('Logout-all error:', error);
    res.status(500).json({
      error: 'logout_failed',
      message: 'Failed to logout from all devices'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT 
        id, email, username, first_name, last_name, display_name,
        role, accessible_groups, accessible_organizations,
        permissions, data_masking_rules,
        last_login_at, last_activity_at,
        mfa_enabled
       FROM security.reporting_users
       WHERE id = $1`,
      [req.auth.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found'
      });
    }

    res.json({
      user: rows[0],
      scope: req.auth.scope
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'server_error',
      message: 'Failed to get user info'
    });
  }
});

// Helper function to generate session ID
function generateSessionId() {
  const { v4: uuidv4 } = require('uuid');
  return uuidv4();
}

// Helper function for MFA verification (placeholder)
async function verifyMfaCode(userId, secret, code) {
  // Implementation using speakeasy or similar library
  const speakeasy = require('speakeasy');
  
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: code,
    window: 2 // Allow 2 time steps before/after for clock skew
  });
}

module.exports = router;
```

---

**Status:** ✅ Authentication Part 2 Complete  
**Next:** 03c - MFA & Password Management
