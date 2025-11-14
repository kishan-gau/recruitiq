# Authentication System - Reporting Engine

**Document:** 03-AUTHENTICATION-SYSTEM.md  
**Project:** Multi-Tenant Consolidated Reporting System  
**Created:** November 13, 2025  

---

## Overview

The reporting engine uses **JWT (JSON Web Token)** authentication with role-based scoping. This document covers the complete authentication flow, token structure, middleware implementation, and security best practices.

---

## 1. JWT Token Structure

### Access Token

```javascript
{
  // Standard JWT claims
  "jti": "550e8400-e29b-41d4-a716-446655440000",  // Unique token ID for revocation
  "iat": 1699891200,  // Issued at timestamp
  "exp": 1699894800,  // Expiration (1 hour from iat)
  "iss": "recruitiq-reporting",  // Issuer
  
  // Custom claims for reporting engine
  "type": "reporting",  // Token type identifier
  "userId": "123e4567-e89b-12d3-a526-426614174000",
  "email": "john.doe@company.com",
  "role": "group_executive",
  
  // Access scope (critical for multi-tenant security)
  "scope": {
    "accessibleGroups": [
      "550e8400-e29b-41d4-a716-446655440001",  // Group IDs user can access
      "550e8400-e29b-41d4-a716-446655440002"
    ],
    "accessibleOrganizations": [
      "660e8400-e29b-41d4-a716-446655440010"  // Direct org access (without group)
    ],
    "dataVisibilityLevel": "full_detail",  // or "masked_detail", "aggregate_only"
    "modules": ["hr", "payroll", "scheduling"]
  },
  
  // Permissions (from role template + user overrides)
  "permissions": {
    "hr": {
      "viewEmployees": true,
      "viewDetails": true,
      "viewSalaries": true,
      "exportData": true
    },
    "payroll": {
      "viewReports": true,
      "viewIndividual": true,
      "viewAggregates": true,
      "exportData": true
    },
    "scheduling": {
      "viewSchedules": true
    }
  },
  
  // Data masking rules
  "dataMasking": {
    "salary": "range",       // Show ranges instead of exact amounts
    "ssn": "mask",           // XXX-XX-1234
    "email": "domain_only",  // *****@company.com
    "phone": "partial"       // (555) XXX-1234
  },
  
  // Session metadata
  "sessionId": "session-uuid",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

### Refresh Token

```javascript
{
  "jti": "660e8400-e29b-41d4-a716-446655440020",
  "iat": 1699891200,
  "exp": 1702483200,  // 30 days from iat
  "iss": "recruitiq-reporting",
  
  "type": "refresh",
  "userId": "123e4567-e89b-12d3-a526-426614174000",
  "sessionId": "session-uuid",
  
  // Refresh tokens have minimal claims (security best practice)
  // Full permissions loaded when exchanging for new access token
}
```

---

## 2. Backend Implementation - Node.js/Express

### Project Structure

```
backend/
├── src/
│   ├── auth/
│   │   ├── jwt.service.js           # JWT generation & verification
│   │   ├── password.service.js      # Password hashing & validation
│   │   ├── session.service.js       # Session management
│   │   ├── mfa.service.js           # Multi-factor authentication
│   │   └── permission.service.js    # Permission checking
│   ├── middleware/
│   │   ├── authenticate.js          # JWT verification middleware
│   │   ├── authorize.js             # Permission checking middleware
│   │   ├── rateLimit.js             # Rate limiting
│   │   └── auditLog.js              # Access logging
│   ├── routes/
│   │   └── auth.routes.js           # Login, logout, refresh endpoints
│   ├── config/
│   │   ├── jwt.config.js            # JWT configuration
│   │   └── security.config.js       # Security settings
│   └── utils/
│       └── errors.js                # Custom error classes
```

### JWT Service

```javascript
// src/auth/jwt.service.js

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');

class JWTService {
  constructor() {
    // Load from environment variables
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '1h';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '30d';
    this.issuer = 'recruitiq-reporting';
  }

  /**
   * Generate access token with full user permissions
   */
  async generateAccessToken(user, sessionId) {
    // Fetch user's accessible organizations via database function
    const { rows: accessibleOrgs } = await db.query(
      'SELECT organization_id FROM security.get_user_accessible_orgs($1)',
      [user.id]
    );

    const payload = {
      jti: uuidv4(),
      type: 'reporting',
      userId: user.id,
      email: user.email,
      role: user.role,
      
      scope: {
        accessibleGroups: user.accessible_groups || [],
        accessibleOrganizations: accessibleOrgs.map(r => r.organization_id),
        dataVisibilityLevel: user.permissions?.dataVisibility?.level || 'aggregate_only',
        modules: this.getEnabledModules(user.permissions)
      },
      
      permissions: user.permissions,
      dataMasking: user.data_masking_rules || {},
      
      sessionId: sessionId,
      ipAddress: user.lastLoginIp,
      userAgent: user.lastUserAgent
    };

    const token = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: this.issuer
    });

    return token;
  }

  /**
   * Generate refresh token (minimal claims)
   */
  generateRefreshToken(userId, sessionId) {
    const payload = {
      jti: uuidv4(),
      type: 'refresh',
      userId: userId,
      sessionId: sessionId
    };

    const token = jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: this.issuer
    });

    return token;
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: this.issuer
      });

      // Validate token type
      if (decoded.type !== 'reporting') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: this.issuer
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Check if token is revoked
   */
  async isTokenRevoked(jti) {
    const { rows } = await db.query(
      `SELECT 1 FROM security.user_sessions 
       WHERE token_jti = $1 AND revoked_at IS NOT NULL`,
      [jti]
    );
    return rows.length > 0;
  }

  /**
   * Extract enabled modules from permissions
   */
  getEnabledModules(permissions) {
    const modules = [];
    if (permissions?.hr?.viewEmployees) modules.push('hr');
    if (permissions?.payroll?.viewReports) modules.push('payroll');
    if (permissions?.scheduling?.viewSchedules) modules.push('scheduling');
    return modules;
  }
}

module.exports = new JWTService();
```

### Password Service

```javascript
// src/auth/password.service.js

const bcrypt = require('bcrypt');
const crypto = require('crypto');

class PasswordService {
  constructor() {
    this.saltRounds = 12; // Bcrypt cost factor
    this.minLength = 12;
    this.requireUppercase = true;
    this.requireLowercase = true;
    this.requireNumbers = true;
    this.requireSpecialChars = true;
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(plainPassword) {
    return await bcrypt.hash(plainPassword, this.saltRounds);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(plainPassword, hash) {
    return await bcrypt.compare(plainPassword, hash);
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const errors = [];

    if (password.length < this.minLength) {
      errors.push(`Password must be at least ${this.minLength} characters`);
    }

    if (this.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = [
      'password123', 'admin123', 'welcome123', 'qwerty123',
      'Password123!', 'Admin123!', 'Welcome123!'
    ];
    if (commonPasswords.some(weak => password.toLowerCase().includes(weak.toLowerCase()))) {
      errors.push('Password is too common');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Generate secure random password
   */
  generateRandomPassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each required type
    password += this.getRandomChar('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    password += this.getRandomChar('abcdefghijklmnopqrstuvwxyz');
    password += this.getRandomChar('0123456789');
    password += this.getRandomChar('!@#$%^&*');
    
    // Fill remaining length
    for (let i = password.length; i < length; i++) {
      password += this.getRandomChar(charset);
    }
    
    // Shuffle
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Get random character from charset
   */
  getRandomChar(charset) {
    const randomIndex = crypto.randomInt(0, charset.length);
    return charset[randomIndex];
  }

  /**
   * Generate password reset token
   */
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = new PasswordService();
```

### Session Service

```javascript
// src/auth/session.service.js

const db = require('../database/connection');
const crypto = require('crypto');

class SessionService {
  /**
   * Create new user session
   */
  async createSession(userId, tokenJti, refreshToken, req) {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const { rows } = await db.query(
      `INSERT INTO security.user_sessions 
       (user_id, token_jti, refresh_token_hash, ip_address, user_agent, expires_at, device_fingerprint)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        tokenJti,
        refreshTokenHash,
        req.ip,
        req.get('User-Agent'),
        expiresAt,
        this.generateDeviceFingerprint(req)
      ]
    );

    // Check concurrent session limit
    await this.enforceSessionLimit(userId);

    return rows[0].id;
  }

  /**
   * Validate session exists and not revoked
   */
  async validateSession(sessionId) {
    const { rows } = await db.query(
      `SELECT user_id, revoked_at, expires_at
       FROM security.user_sessions
       WHERE id = $1`,
      [sessionId]
    );

    if (rows.length === 0) {
      throw new Error('Session not found');
    }

    const session = rows[0];

    if (session.revoked_at) {
      throw new Error('Session revoked');
    }

    if (new Date(session.expires_at) < new Date()) {
      throw new Error('Session expired');
    }

    // Update last activity
    await this.updateSessionActivity(sessionId);

    return session;
  }

  /**
   * Update session last activity timestamp
   */
  async updateSessionActivity(sessionId) {
    await db.query(
      `UPDATE security.user_sessions
       SET last_activity_at = NOW()
       WHERE id = $1`,
      [sessionId]
    );
  }

  /**
   * Revoke session (logout)
   */
  async revokeSession(sessionId, reason = 'user_logout') {
    await db.query(
      `UPDATE security.user_sessions
       SET revoked_at = NOW(), revoke_reason = $2
       WHERE id = $1`,
      [sessionId, reason]
    );
  }

  /**
   * Revoke all user sessions (force logout)
   */
  async revokeAllUserSessions(userId, reason = 'admin_action') {
    await db.query(
      `UPDATE security.user_sessions
       SET revoked_at = NOW(), revoke_reason = $2
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId, reason]
    );
  }

  /**
   * Enforce max concurrent sessions
   */
  async enforceSessionLimit(userId) {
    // Get user's max concurrent sessions setting
    const { rows: userRows } = await db.query(
      'SELECT max_concurrent_sessions FROM security.reporting_users WHERE id = $1',
      [userId]
    );

    const maxSessions = userRows[0]?.max_concurrent_sessions || 3;

    // Get active session count
    const { rows: sessionRows } = await db.query(
      `SELECT id FROM security.user_sessions
       WHERE user_id = $1 
         AND revoked_at IS NULL 
         AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId]
    );

    // Revoke oldest sessions if over limit
    if (sessionRows.length > maxSessions) {
      const sessionsToRevoke = sessionRows.slice(maxSessions);
      for (const session of sessionsToRevoke) {
        await this.revokeSession(session.id, 'session_limit_exceeded');
      }
    }
  }

  /**
   * Hash refresh token for storage
   */
  hashRefreshToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(req) {
    const components = [
      req.get('User-Agent') || '',
      req.get('Accept-Language') || '',
      req.get('Accept-Encoding') || ''
    ];
    
    const fingerprint = crypto
      .createHash('md5')
      .update(components.join('|'))
      .digest('hex');
    
    return fingerprint;
  }

  /**
   * Clean up expired sessions (run via cron)
   */
  async cleanupExpiredSessions() {
    const { rowCount } = await db.query(
      `DELETE FROM security.user_sessions
       WHERE expires_at < NOW() - INTERVAL '7 days'`
    );
    
    return { deletedCount: rowCount };
  }
}

module.exports = new SessionService();
```

---

**Status:** ✅ Authentication Part 1 Complete  
**Next:** 03b - Middleware & Route Handlers
