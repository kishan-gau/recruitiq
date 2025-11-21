# Cookie-Based Session Migration Plan - Part 3: Monitoring & Rollback

**Part of:** [Cookie-Based Session Migration Plan](./COOKIE_SESSION_MIGRATION_PLAN.md)  
**Version:** 1.0  
**Last Updated:** November 21, 2025

---

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Monitoring & Metrics](#monitoring--metrics)
3. [Rollback Procedures](#rollback-procedures)
4. [Quick Reference](#quick-reference)

---

## Testing Strategy

### Unit Tests - Authentication Service

**Location:** `backend/tests/unit/services/auth/`

```javascript
// authService.test.js
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import AuthService from '../../../../src/services/auth/AuthService.js';

describe('AuthService - Cookie Sessions', () => {
  let service;
  let mockUserRepo;
  let mockSessionManager;

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updateLastLogin: jest.fn()
    };
    
    mockSessionManager = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      destroySession: jest.fn(),
      refreshSession: jest.fn()
    };

    service = new AuthService(mockUserRepo, mockSessionManager);
  });

  describe('login', () => {
    it('should create session and return user data', async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashed',
        organizationId: 'org-123',
        role: 'admin'
      };

      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockSessionManager.createSession.mockResolvedValue({
        sessionId: 'session-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      const result = await service.login('test@example.com', 'password123', 'req-id');

      expect(result.sessionId).toBe('session-123');
      expect(result.user).toEqual({
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role
      });
      expect(mockSessionManager.createSession).toHaveBeenCalledWith(
        user.id,
        user.organizationId,
        expect.objectContaining({
          role: user.role,
          email: user.email
        })
      );
    });

    it('should throw error for invalid credentials', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('invalid@example.com', 'wrong', 'req-id')
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('logout', () => {
    it('should destroy session', async () => {
      mockSessionManager.destroySession.mockResolvedValue(true);

      await service.logout('session-123');

      expect(mockSessionManager.destroySession).toHaveBeenCalledWith('session-123');
    });
  });
});
```

### Integration Tests - Session Management

**Location:** `backend/tests/integration/session-management.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import pool from '../../src/config/database.js';
import bcrypt from 'bcryptjs';

describe('Session Management - Integration Tests', () => {
  let testUser;
  let testOrg;

  beforeAll(async () => {
    // Create test organization
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name, created_at)
      VALUES (gen_random_uuid(), 'Test Org', NOW())
      RETURNING id
    `);
    testOrg = orgResult.rows[0];

    // Create test user
    const passwordHash = await bcrypt.hash('TestPassword123!', 12);
    const userResult = await pool.query(`
      INSERT INTO hris.user_account (
        id, email, password_hash, organization_id,
        first_name, last_name, role, is_active, created_at
      )
      VALUES (
        gen_random_uuid(), 'session-test@example.com', $1, $2,
        'Test', 'User', 'admin', true, NOW()
      )
      RETURNING id, email, organization_id, role
    `, [passwordHash, testOrg.id]);
    testUser = userResult.rows[0];
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [testUser.id]);
    await pool.query('DELETE FROM hris.user_account WHERE id = $1', [testUser.id]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrg.id]);
    await pool.end();
  });

  describe('POST /api/auth/login', () => {
    it('should set session cookie on successful login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'session-test@example.com',
          password: 'TestPassword123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);

      // Check session cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.startsWith('sessionId='))).toBe(true);

      // Verify cookie attributes
      const sessionCookie = cookies.find(c => c.startsWith('sessionId='));
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('Secure');
      expect(sessionCookie).toContain('SameSite=Strict');
      expect(sessionCookie).toContain('Path=/');
    });

    it('should create session in database', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'session-test@example.com',
          password: 'TestPassword123!'
        })
        .expect(200);

      // Extract session ID from cookie
      const cookies = response.headers['set-cookie'];
      const sessionCookie = cookies.find(c => c.startsWith('sessionId='));
      const sessionId = sessionCookie.split(';')[0].split('=')[1];

      // Verify session exists in database
      const result = await pool.query(
        'SELECT * FROM user_sessions WHERE session_id = $1',
        [sessionId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].user_id).toBe(testUser.id);
      expect(result.rows[0].organization_id).toBe(testUser.organization_id);
      expect(result.rows[0].is_active).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user data with valid session', async () => {
      // Login first
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'session-test@example.com',
          password: 'TestPassword123!'
        });

      const cookies = loginRes.headers['set-cookie'];

      // Access protected route
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should return 401 without session cookie', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });

    it('should return 401 with invalid session', async () => {
      await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['sessionId=invalid-session-id'])
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear session cookie and destroy session', async () => {
      // Login first
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'session-test@example.com',
          password: 'TestPassword123!'
        });

      const cookies = loginRes.headers['set-cookie'];
      const sessionCookie = cookies.find(c => c.startsWith('sessionId='));
      const sessionId = sessionCookie.split(';')[0].split('=')[1];

      // Logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check cookie is cleared
      const logoutCookies = response.headers['set-cookie'];
      expect(logoutCookies).toBeDefined();
      const clearedCookie = logoutCookies.find(c => c.startsWith('sessionId='));
      expect(clearedCookie).toContain('Max-Age=0');

      // Verify session is destroyed in database
      const result = await pool.query(
        'SELECT * FROM user_sessions WHERE session_id = $1',
        [sessionId]
      );

      expect(result.rows.length === 0 || result.rows[0].is_active === false).toBe(true);
    });
  });

  describe('Session Expiration', () => {
    it('should reject expired sessions', async () => {
      // Create expired session manually
      const expiredSessionId = 'expired-session-123';
      await pool.query(`
        INSERT INTO user_sessions (
          session_id, user_id, organization_id, session_data,
          expires_at, is_active, created_at
        )
        VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 hour', true, NOW())
      `, [
        expiredSessionId,
        testUser.id,
        testUser.organization_id,
        JSON.stringify({ role: testUser.role })
      ]);

      // Try to use expired session
      await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`sessionId=${expiredSessionId}`])
        .expect(401);
    });
  });
});
```

### E2E Tests - Cross-App SSO

**Location:** `backend/tests/e2e/sso-integration.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import pool from '../../src/config/database.js';

const API_URL = 'http://localhost:4000';

describe('SSO Integration - E2E Tests', () => {
  let cookies = {};
  const testUsers = {
    tenant: {
      email: 'tenant@testcompany.com',
      password: 'Admin123!'
    }
  };

  beforeAll(async () => {
    console.log('🔧 Verifying test data...');
    
    const userCheck = await pool.query(
      'SELECT email FROM hris.user_account WHERE email = $1',
      [testUsers.tenant.email]
    );
    
    if (userCheck.rows.length === 0) {
      throw new Error(`Test user ${testUsers.tenant.email} not found. Run database setup.`);
    }
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up E2E test data...');
  });

  describe('Cross-App Authentication', () => {
    it('should login successfully and set session cookie', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send(testUsers.tenant)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
      
      cookies.auth = response.headers['set-cookie'];
      
      // Verify cookie attributes
      const sessionCookie = cookies.auth.find(c => c.startsWith('sessionId='));
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('Secure');
    });

    it('should access protected route with session cookie', async () => {
      const response = await request(API_URL)
        .get('/api/auth/me')
        .set('Cookie', cookies.auth)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUsers.tenant.email);
    });

    it('should maintain session across multiple requests', async () => {
      const response1 = await request(API_URL)
        .get('/api/auth/me')
        .set('Cookie', cookies.auth)
        .expect(200);

      const response2 = await request(API_URL)
        .get('/api/auth/me')
        .set('Cookie', cookies.auth)
        .expect(200);

      expect(response1.body.user.id).toBe(response2.body.user.id);
    });

    it('should switch products while maintaining session', async () => {
      // Access Nexus product
      const nexusRes = await request(API_URL)
        .post('/api/auth/switch-product')
        .set('Cookie', cookies.auth)
        .send({ product: 'nexus' })
        .expect(200);

      expect(nexusRes.body.success).toBe(true);

      // Access PayLinQ product
      const paylinqRes = await request(API_URL)
        .post('/api/auth/switch-product')
        .set('Cookie', cookies.auth)
        .send({ product: 'paylinq' })
        .expect(200);

      expect(paylinqRes.body.success).toBe(true);
    });

    it('should logout and clear session cookie', async () => {
      const response = await request(API_URL)
        .post('/api/auth/logout')
        .set('Cookie', cookies.auth)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader.some(c => 
        c.includes('Max-Age=0') || c.includes('Expires=Thu, 01 Jan 1970')
      )).toBe(true);
    });

    it('should reject requests after logout', async () => {
      await request(API_URL)
        .get('/api/auth/me')
        .set('Cookie', cookies.auth)
        .expect(401);
    });
  });
});
```

---

## Monitoring & Metrics

### Key Performance Indicators (KPIs)

```javascript
// backend/src/monitoring/sessionMetrics.js
import logger from '../utils/logger.js';

class SessionMetrics {
  constructor() {
    this.metrics = {
      activeSessions: 0,
      loginAttempts: 0,
      loginSuccesses: 0,
      loginFailures: 0,
      logoutCount: 0,
      sessionExpired: 0,
      averageSessionDuration: 0
    };

    this.startTime = Date.now();
  }

  /**
   * Record login attempt
   */
  recordLoginAttempt(success, userId = null) {
    this.metrics.loginAttempts++;
    
    if (success) {
      this.metrics.loginSuccesses++;
      this.metrics.activeSession++;
      
      logger.info('Login success', {
        userId,
        timestamp: new Date().toISOString(),
        metric: 'login_success'
      });
    } else {
      this.metrics.loginFailures++;
      
      logger.warn('Login failure', {
        userId,
        timestamp: new Date().toISOString(),
        metric: 'login_failure'
      });
    }
  }

  /**
   * Record logout
   */
  recordLogout(userId, sessionDuration) {
    this.metrics.logoutCount++;
    this.metrics.activeSessions = Math.max(0, this.metrics.activeSessions - 1);
    
    // Update average session duration
    const currentAvg = this.metrics.averageSessionDuration;
    const count = this.metrics.logoutCount;
    this.metrics.averageSessionDuration = 
      ((currentAvg * (count - 1)) + sessionDuration) / count;

    logger.info('Logout recorded', {
      userId,
      sessionDuration,
      timestamp: new Date().toISOString(),
      metric: 'logout'
    });
  }

  /**
   * Record session expiration
   */
  recordSessionExpired(userId) {
    this.metrics.sessionExpired++;
    this.metrics.activeSessions = Math.max(0, this.metrics.activeSessions - 1);
    
    logger.info('Session expired', {
      userId,
      timestamp: new Date().toISOString(),
      metric: 'session_expired'
    });
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    
    return {
      ...this.metrics,
      loginSuccessRate: this.metrics.loginAttempts > 0
        ? (this.metrics.loginSuccesses / this.metrics.loginAttempts * 100).toFixed(2)
        : 0,
      uptime: Math.floor(uptime / 1000),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset metrics (for testing or daily rollover)
   */
  reset() {
    const snapshot = this.getMetrics();
    
    this.metrics = {
      activeSessions: this.metrics.activeSessions, // Keep current active count
      loginAttempts: 0,
      loginSuccesses: 0,
      loginFailures: 0,
      logoutCount: 0,
      sessionExpired: 0,
      averageSessionDuration: 0
    };

    return snapshot;
  }
}

export default new SessionMetrics();
```

### Health Check Endpoint

```javascript
// backend/src/routes/health.js
import express from 'express';
import pool from '../config/database.js';
import sessionMetrics from '../monitoring/sessionMetrics.js';

const router = express.Router();

/**
 * Session health check endpoint
 */
router.get('/health/sessions', async (req, res) => {
  try {
    // Check database connectivity
    const dbCheck = await pool.query('SELECT 1');
    
    // Get active sessions count
    const sessionCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM user_sessions
      WHERE is_active = true
        AND expires_at > NOW()
    `);

    // Get metrics
    const metrics = sessionMetrics.getMetrics();

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbCheck.rowCount > 0,
        activeConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingConnections: pool.waitingCount
      },
      sessions: {
        active: parseInt(sessionCount.rows[0].count),
        metrics
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
```

### Logging Integration

```javascript
// backend/src/utils/logger.js - Session logging additions

/**
 * Log session events
 */
export function logSessionEvent(event, details) {
  const logData = {
    event,
    timestamp: new Date().toISOString(),
    ...details
  };

  switch (event) {
    case 'session_created':
      logger.info('Session created', logData);
      break;
    case 'session_destroyed':
      logger.info('Session destroyed', logData);
      break;
    case 'session_expired':
      logger.warn('Session expired', logData);
      break;
    case 'session_refresh':
      logger.info('Session refreshed', logData);
      break;
    case 'invalid_session':
      logger.warn('Invalid session attempt', logData);
      break;
    default:
      logger.info('Session event', logData);
  }
}
```

### Alert Configuration

```yaml
# monitoring/alerts/session-alerts.yml
alerts:
  - name: high_login_failure_rate
    condition: login_failure_rate > 20%
    window: 5m
    severity: warning
    action: notify_ops_team
    
  - name: session_database_errors
    condition: session_db_errors > 5
    window: 1m
    severity: critical
    action: page_on_call
    
  - name: abnormal_session_count
    condition: active_sessions > 10000
    window: 1m
    severity: warning
    action: notify_ops_team
    
  - name: session_cleanup_failure
    condition: expired_sessions_not_cleaned > 1000
    window: 15m
    severity: warning
    action: notify_ops_team
```

---

## Rollback Procedures

### Decision Criteria for Rollback

**Trigger rollback if:**
1. ✅ Login success rate < 95% for 5+ minutes
2. ✅ Session database errors > 50 per minute
3. ✅ Active session count drops by > 50% unexpectedly
4. ✅ Critical security vulnerability discovered
5. ✅ Frontend apps cannot establish sessions
6. ✅ Cross-app SSO completely broken

**DO NOT rollback for:**
1. ❌ Individual user login failures
2. ❌ Transient network issues
3. ❌ Non-critical bug reports
4. ❌ Minor UI inconsistencies

### Rollback Steps

#### Step 1: Immediate Actions (5 minutes)

```bash
# 1. Switch backend to rollback branch
cd c:\RecruitIQ\backend
git stash
git checkout rollback/pre-cookie-session

# 2. Restore database schema (if schema changed)
psql -U postgres -d recruitiq -f rollback/sessions_schema_rollback.sql

# 3. Restart backend server
npm run build
pm2 restart backend

# 4. Verify backend health
curl http://localhost:3001/api/health
```

#### Step 2: Frontend Rollback (10 minutes)

```bash
# Rollback each frontend app
cd c:\RecruitIQ\apps\portal
git checkout rollback/pre-cookie-session
npm run build
pm2 restart portal-frontend

cd c:\RecruitIQ\apps\nexus
git checkout rollback/pre-cookie-session
npm run build
pm2 restart nexus-frontend

# Verify frontend connectivity
curl http://localhost:5173
curl http://localhost:5174
```

#### Step 3: Communication (Immediate)

```markdown
**Incident Notice: Session System Rollback**

Status: Rolling back cookie-based session system
Impact: Users may need to re-login
ETA: 30 minutes
Updates: Every 15 minutes

Actions:
1. Backend rolled back to JWT tokens
2. Frontend apps rolled back to token auth
3. Database sessions table preserved (no data loss)
4. All users will need to re-authenticate

Next Update: [Time + 15 min]
```

#### Step 4: Verification (15 minutes)

```javascript
// Run rollback verification tests
npm run test:rollback

// Verify critical flows
npm run test:integration -- auth.test.js
npm run test:integration -- tenant-isolation.test.js

// Check metrics
curl http://localhost:3001/api/health
```

#### Step 5: Post-Rollback Analysis

```markdown
## Rollback Post-Mortem Template

### Incident Summary
- **Date/Time:** [Timestamp]
- **Duration:** [Minutes]
- **Impact:** [Users affected]
- **Root Cause:** [What triggered rollback]

### Timeline
- [Time] - Issue detected
- [Time] - Rollback decision made
- [Time] - Backend rolled back
- [Time] - Frontend rolled back
- [Time] - Services restored

### Technical Details
- **Symptoms:** [What users experienced]
- **Logs:** [Link to relevant logs]
- **Metrics:** [Key metrics during incident]

### Lessons Learned
1. What worked well
2. What needs improvement
3. Preventive measures

### Action Items
- [ ] Fix root cause
- [ ] Update tests to catch this
- [ ] Improve monitoring
- [ ] Update runbook
```

---

## Quick Reference

### Session Cookie Attributes

```
Name: sessionId
HttpOnly: true
Secure: true (production)
SameSite: Strict
Path: /
Max-Age: 86400 (24 hours)
Domain: .recruitiq.com (production)
```

### Database Schema

```sql
-- user_sessions table
CREATE TABLE user_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES hris.user_account(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  session_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  ip_address VARCHAR(45),
  user_agent TEXT
);
```

### Key Files Reference

```
Authentication:
  backend/src/services/auth/AuthService.js
  backend/src/services/session/SessionManager.js
  backend/src/middleware/authenticate.js

Frontend Services:
  apps/portal/src/services/auth.service.ts
  apps/nexus/src/services/auth.service.ts
  apps/paylinq/src/services/auth.service.ts

Tests:
  backend/tests/unit/services/auth/authService.test.js
  backend/tests/integration/session-management.test.js
  backend/tests/e2e/sso-integration.test.js
```

### Common Commands

```bash
# Development
npm run dev                    # Start all services
npm run dev:backend           # Backend only
npm run dev:portal            # Portal only

# Testing
npm test                      # All tests
npm run test:unit             # Unit tests only
npm run test:integration      # Integration tests
npm run test:e2e              # E2E tests

# Monitoring
curl http://localhost:3001/api/health
curl http://localhost:3001/api/health/sessions

# Database
psql -U postgres -d recruitiq
SELECT COUNT(*) FROM user_sessions WHERE is_active = true;
```

---

**Previous:** [Cookie-Based Session Migration Plan - Part 2](./COOKIE_SESSION_MIGRATION_PART2.md)  
**Main Document:** [Cookie-Based Session Migration Plan](./COOKIE_SESSION_MIGRATION_PLAN.md)
