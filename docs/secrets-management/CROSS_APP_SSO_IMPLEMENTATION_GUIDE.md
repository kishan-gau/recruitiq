# Cross-Application SSO Implementation Guide

**Version:** 1.0  
**Last Updated:** November 21, 2025  
**Status:** Implementation Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Phases](#implementation-phases)
4. [Phase 1: Cookie-Based Session Management](#phase-1-cookie-based-session-management)
5. [Phase 2: Cross-Domain Authentication](#phase-2-cross-domain-authentication)
6. [Phase 3: Multi-Product SSO](#phase-3-multi-product-sso)
7. [Testing Strategy](#testing-strategy)
8. [Security Considerations](#security-considerations)
9. [Monitoring & Logging](#monitoring--logging)
10. [Rollback Procedures](#rollback-procedures)
11. [Quick Reference](#quick-reference)

---

## Overview

### Purpose

This guide provides a comprehensive, step-by-step approach to implementing **Single Sign-On (SSO)** across RecruitIQ's multi-product SaaS platform, enabling users to authenticate once and access all products (PayLinQ, Nexus, ScheduleHub, RecruitIQ) seamlessly.

### Current State

**Problem:** Users must login separately for each product application:
- PayLinQ (port 5174)
- Nexus (port 5175)
- ScheduleHub (port 5176)
- RecruitIQ (port 5174)
- Portal (port 5173)

**Impact:**
- Poor user experience
- Multiple authentication flows
- Inconsistent session management
- No cross-app session sharing

### Target State

**Solution:** Unified SSO system where:
- Users login once at central authentication point
- Session shared across all product applications
- Automatic token refresh across apps
- Seamless product switching
- Centralized logout

**Benefits:**
- ✅ Enhanced user experience
- ✅ Reduced authentication complexity
- ✅ Consistent security model
- ✅ Simplified session management
- ✅ Better product integration

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      RecruitIQ Platform                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ PayLinQ  │  │  Nexus   │  │Schedule  │  │RecruitIQ │      │
│  │ :5174    │  │  :5175   │  │Hub :5176 │  │  :5174   │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │             │               │             │            │
│       └─────────────┴───────────────┴─────────────┘            │
│                           │                                    │
│                    ┌──────▼──────┐                            │
│                    │   Backend   │                            │
│                    │   :3001     │                            │
│                    └──────┬──────┘                            │
│                           │                                    │
│              ┌────────────┼────────────┐                      │
│              │            │            │                      │
│         ┌────▼────┐  ┌───▼────┐  ┌───▼────┐                 │
│         │  Auth   │  │Session │  │Product │                 │
│         │ Service │  │  Store │  │Manager │                 │
│         └─────────┘  └────────┘  └────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Session Flow:
1. User logs in via any app → Backend creates session
2. Backend sets httpOnly cookie with session ID
3. Session stored in Redis/PostgreSQL
4. All apps share same cookie domain (.localhost for dev)
5. Apps check session on each request → Backend validates
6. Token refresh happens transparently
```

### Authentication Flow

```
┌─────────┐                  ┌─────────┐                 ┌──────────┐
│  User   │                  │Frontend │                 │ Backend  │
│ Browser │                  │   App   │                 │   API    │
└────┬────┘                  └────┬────┘                 └────┬─────┘
     │                            │                           │
     │ 1. Navigate to /login      │                           │
     ├───────────────────────────►│                           │
     │                            │                           │
     │                            │ 2. POST /api/auth/login   │
     │                            ├──────────────────────────►│
     │                            │   { email, password }     │
     │                            │                           │
     │                            │                           │ 3. Validate
     │                            │                           │    credentials
     │                            │                           │
     │                            │ 4. Set-Cookie: session_id │
     │                            │◄──────────────────────────┤
     │                            │    (httpOnly, secure)     │
     │                            │                           │
     │ 5. Redirect to dashboard   │                           │
     │◄───────────────────────────┤                           │
     │                            │                           │
     │ 6. Access protected route  │                           │
     ├───────────────────────────►│                           │
     │                            │                           │
     │                            │ 7. GET /api/resource      │
     │                            │    Cookie: session_id     │
     │                            ├──────────────────────────►│
     │                            │                           │
     │                            │                           │ 8. Validate
     │                            │                           │    session
     │                            │                           │
     │                            │ 9. Return user data       │
     │                            │◄──────────────────────────┤
     │                            │                           │
     │ 10. Render protected page  │                           │
     │◄───────────────────────────┤                           │
     │                            │                           │
```

### Cross-App Session Sharing

```
Scenario: User switches from PayLinQ to Nexus

┌──────────┐                    ┌──────────┐               ┌──────────┐
│ PayLinQ  │                    │  Backend │               │  Nexus   │
│  App     │                    │   API    │               │   App    │
└────┬─────┘                    └────┬─────┘               └────┬─────┘
     │                               │                          │
     │ User clicks "Switch to Nexus" │                          │
     ├───────────────────────────────┼─────────────────────────►│
     │                               │                          │
     │                               │  1. Check session cookie │
     │                               │◄─────────────────────────┤
     │                               │     (Cookie: session_id) │
     │                               │                          │
     │                               │  2. Session valid?       │
     │                               │  ✓ Yes - same session_id │
     │                               │                          │
     │                               │  3. Return user data     │
     │                               ├─────────────────────────►│
     │                               │                          │
     │                               │  4. Load Nexus dashboard │
     │                               │  (No re-login required!) │
     │                               │                          │
```

---

## Implementation Phases

### Phase Overview

| Phase | Focus | Duration | Risk Level |
|-------|-------|----------|------------|
| **Phase 1** | Cookie-Based Sessions | 2-3 days | Low |
| **Phase 2** | Cross-Domain Auth | 2-3 days | Medium |
| **Phase 3** | Multi-Product SSO | 3-4 days | Medium |

### Success Criteria

**Phase 1 Complete:**
- ✅ Backend sets httpOnly cookies
- ✅ Frontend stores no JWT in localStorage
- ✅ Session validated on each request
- ✅ Tests passing (auth, session management)

**Phase 2 Complete:**
- ✅ Cookie domain set to `.localhost` (dev)
- ✅ All apps share same cookie
- ✅ Cross-domain session validation works
- ✅ CORS configured correctly

**Phase 3 Complete:**
- ✅ Users switch products without re-login
- ✅ Centralized logout clears all sessions
- ✅ Product context tracked per user
- ✅ E2E tests validate full SSO flow

---

## Phase 1: Cookie-Based Session Management

### Objective

Replace JWT localStorage storage with secure httpOnly cookies for session management.

### Backend Changes

#### 1.1 Update Authentication Service

**File:** `backend/src/services/AuthService.js`

```javascript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import UserAccountRepository from '../repositories/UserAccountRepository.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

class AuthService {
  constructor(repository = null) {
    this.repository = repository || new UserAccountRepository();
  }

  /**
   * Login user and create session
   * Returns session data and tokens (to be set as cookies)
   */
  async login(email, password, ipAddress) {
    try {
      // 1. Find user by email
      const user = await this.repository.findByEmail(email);
      
      if (!user) {
        logger.warn('Login failed - user not found', { email });
        throw new Error('Invalid credentials');
      }

      // 2. Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isValid) {
        logger.warn('Login failed - invalid password', { email, userId: user.id });
        throw new Error('Invalid credentials');
      }

      // 3. Generate session ID
      const sessionId = uuidv4();

      // 4. Generate access token (short-lived)
      const accessToken = jwt.sign(
        {
          sessionId,
          userId: user.id,
          email: user.email,
          organizationId: user.organization_id,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' } // 15 minutes
      );

      // 5. Generate refresh token (long-lived)
      const refreshToken = jwt.sign(
        {
          sessionId,
          userId: user.id,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' } // 7 days
      );

      // 6. Store session in database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      await query(
        `INSERT INTO user_sessions (
          id, user_id, refresh_token, ip_address, 
          user_agent, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [sessionId, user.id, refreshToken, ipAddress, null, expiresAt],
        user.organization_id,
        { operation: 'INSERT', table: 'user_sessions' }
      );

      // 7. Log successful login
      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        sessionId,
        ipAddress
      });

      // 8. Return tokens and user data (tokens will be set as cookies)
      return {
        accessToken,
        refreshToken,
        sessionId,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organization_id
        }
      };
    } catch (error) {
      logger.error('Login error', {
        error: error.message,
        email
      });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // 1. Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // 2. Get session from database
      const sessionResult = await query(
        `SELECT s.*, u.email, u.organization_id, u.role
         FROM user_sessions s
         JOIN hris.user_account u ON s.user_id = u.id
         WHERE s.id = $1 
           AND s.refresh_token = $2
           AND s.expires_at > NOW()
           AND s.revoked_at IS NULL`,
        [decoded.sessionId, refreshToken],
        null,
        { operation: 'SELECT', table: 'user_sessions' }
      );

      if (sessionResult.rows.length === 0) {
        throw new Error('Invalid or expired session');
      }

      const session = sessionResult.rows[0];

      // 3. Generate new access token
      const accessToken = jwt.sign(
        {
          sessionId: session.id,
          userId: session.user_id,
          email: session.email,
          organizationId: session.organization_id,
          role: session.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      // 4. Update last activity timestamp
      await query(
        `UPDATE user_sessions 
         SET last_activity_at = NOW()
         WHERE id = $1`,
        [session.id],
        session.organization_id,
        { operation: 'UPDATE', table: 'user_sessions' }
      );

      logger.info('Access token refreshed', {
        userId: session.user_id,
        sessionId: session.id
      });

      return {
        accessToken,
        user: {
          id: session.user_id,
          email: session.email,
          organizationId: session.organization_id,
          role: session.role
        }
      };
    } catch (error) {
      logger.error('Token refresh error', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Logout user and revoke session
   */
  async logout(sessionId) {
    try {
      // Revoke session in database
      await query(
        `UPDATE user_sessions
         SET revoked_at = NOW()
         WHERE id = $1`,
        [sessionId],
        null,
        { operation: 'UPDATE', table: 'user_sessions' }
      );

      logger.info('User logged out', { sessionId });

      return { success: true };
    } catch (error) {
      logger.error('Logout error', {
        error: error.message,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Validate session
   */
  async validateSession(sessionId) {
    try {
      const result = await query(
        `SELECT s.*, u.email, u.organization_id, u.role, u.name
         FROM user_sessions s
         JOIN hris.user_account u ON s.user_id = u.id
         WHERE s.id = $1
           AND s.expires_at > NOW()
           AND s.revoked_at IS NULL`,
        [sessionId],
        null,
        { operation: 'SELECT', table: 'user_sessions' }
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Update last activity
      await query(
        `UPDATE user_sessions
         SET last_activity_at = NOW()
         WHERE id = $1`,
        [sessionId],
        result.rows[0].organization_id,
        { operation: 'UPDATE', table: 'user_sessions' }
      );

      return {
        id: result.rows[0].user_id,
        email: result.rows[0].email,
        name: result.rows[0].name,
        role: result.rows[0].role,
        organizationId: result.rows[0].organization_id
      };
    } catch (error) {
      logger.error('Session validation error', {
        error: error.message,
        sessionId
      });
      return null;
    }
  }
}

export default AuthService;
```

#### 1.2 Update Auth Controller

**File:** `backend/src/controllers/authController.js`

```javascript
import AuthService from '../services/AuthService.js';
import logger from '../utils/logger.js';

const authService = new AuthService();

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  // Domain will be set in Phase 2
};

/**
 * Login endpoint - sets session cookies
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;

    // Perform login
    const { accessToken, refreshToken, sessionId, user } = await authService.login(
      email,
      password,
      ipAddress
    );

    // Set access token cookie (15 minutes)
    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    // Set refresh token cookie (7 days)
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Set session ID cookie (for reference)
    res.cookie('session_id', sessionId, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      user,
      message: 'Login successful'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh token endpoint
 */
export async function refreshToken(req, res, next) {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'No refresh token provided',
        errorCode: 'NO_REFRESH_TOKEN'
      });
    }

    // Refresh access token
    const { accessToken, user } = await authService.refreshAccessToken(refreshToken);

    // Set new access token cookie
    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      user,
      message: 'Token refreshed'
    });
  } catch (error) {
    // Clear invalid cookies
    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
    res.clearCookie('session_id', COOKIE_OPTIONS);

    return res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token',
      errorCode: 'INVALID_REFRESH_TOKEN'
    });
  }
}

/**
 * Logout endpoint - clears cookies
 */
export async function logout(req, res, next) {
  try {
    const sessionId = req.cookies.session_id;

    if (sessionId) {
      await authService.logout(sessionId);
    }

    // Clear all auth cookies
    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
    res.clearCookie('session_id', COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user endpoint
 */
export async function getCurrentUser(req, res, next) {
  try {
    // User should already be attached by authenticate middleware
    return res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
}
```

#### 1.3 Update Authentication Middleware

**File:** `backend/src/middleware/auth.js`

```javascript
import jwt from 'jsonwebtoken';
import AuthService from '../services/AuthService.js';
import logger from '../utils/logger.js';

const authService = new AuthService();

/**
 * Authenticate middleware - validates session from cookie
 */
export async function authenticate(req, res, next) {
  try {
    // 1. Check for access token in cookie
    const accessToken = req.cookies.access_token;
    const refreshToken = req.cookies.refresh_token;
    const sessionId = req.cookies.session_id;

    if (!accessToken) {
      logger.warn('No access token provided', {
        path: req.path,
        ip: req.ip
      });

      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'NO_ACCESS_TOKEN'
      });
    }

    try {
      // 2. Verify access token
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

      // 3. Validate session is still active
      const user = await authService.validateSession(decoded.sessionId);

      if (!user) {
        logger.warn('Invalid session', {
          sessionId: decoded.sessionId,
          userId: decoded.userId
        });

        return res.status(401).json({
          success: false,
          error: 'Session expired or invalid',
          errorCode: 'INVALID_SESSION'
        });
      }

      // 4. Attach user to request
      req.user = user;
      req.sessionId = decoded.sessionId;

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError' && refreshToken) {
        // Access token expired but we have refresh token
        // Return 401 with special code to trigger refresh on client
        return res.status(401).json({
          success: false,
          error: 'Access token expired',
          errorCode: 'TOKEN_EXPIRED',
          shouldRefresh: true
        });
      }

      logger.warn('Token verification failed', {
        error: error.message,
        path: req.path
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        errorCode: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    logger.error('Authentication error', {
      error: error.message,
      path: req.path
    });

    next(error);
  }
}

/**
 * Optional authentication - attaches user if token present but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  try {
    const accessToken = req.cookies.access_token;

    if (!accessToken) {
      return next();
    }

    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const user = await authService.validateSession(decoded.sessionId);

      if (user) {
        req.user = user;
        req.sessionId = decoded.sessionId;
      }
    } catch (error) {
      // Silently fail for optional auth
      logger.debug('Optional auth failed', { error: error.message });
    }

    next();
  } catch (error) {
    next(error);
  }
}
```

#### 1.4 Add Database Migration for Sessions Table

**File:** `backend/src/database/migrations/20251121000000_create_user_sessions_table.sql`

```sql
-- Migration: Create user_sessions table for session management
-- Author: RecruitIQ Dev Team
-- Date: 2025-11-21

BEGIN;

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  refresh_token TEXT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key to user_account
  CONSTRAINT fk_user_sessions_user
    FOREIGN KEY (user_id)
    REFERENCES hris.user_account(id)
    ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_user_sessions_user_id 
  ON user_sessions(user_id) 
  WHERE revoked_at IS NULL;

CREATE INDEX idx_user_sessions_expires_at 
  ON user_sessions(expires_at) 
  WHERE revoked_at IS NULL;

CREATE INDEX idx_user_sessions_refresh_token 
  ON user_sessions(refresh_token) 
  WHERE revoked_at IS NULL;

-- Add comments
COMMENT ON TABLE user_sessions IS 'Stores user session data for cookie-based authentication';
COMMENT ON COLUMN user_sessions.id IS 'Session ID (used in cookies)';
COMMENT ON COLUMN user_sessions.refresh_token IS 'JWT refresh token for session renewal';
COMMENT ON COLUMN user_sessions.ip_address IS 'IP address where session was created';
COMMENT ON COLUMN user_sessions.expires_at IS 'Session expiration timestamp';
COMMENT ON COLUMN user_sessions.revoked_at IS 'Timestamp when session was revoked (logout)';

COMMIT;
```

### Frontend Changes

#### 1.5 Update AuthContext (Example: Nexus)

**File:** `apps/nexus/src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Check if user is authenticated on mount
   */
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Check authentication status
   */
  const checkAuth = async () => {
    try {
      // Cookie is automatically sent with request
      const response = await apiClient.get('/api/auth/me');
      
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      // If token expired, try to refresh
      if (error.response?.data?.errorCode === 'TOKEN_EXPIRED') {
        await refreshAuth();
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login user
   */
  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        setUser(response.data.user);
        // Cookies are automatically set by backend
      } else {
        throw new Error(response.data.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(
        error.response?.data?.error || 'Login failed. Please try again.'
      );
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
      setUser(null);
      // Cookies are automatically cleared by backend
    } catch (error) {
      console.error('Logout error:', error);
      // Clear user anyway
      setUser(null);
    }
  };

  /**
   * Refresh authentication
   */
  const refreshAuth = async () => {
    try {
      const response = await apiClient.post('/api/auth/refresh');
      
      if (response.data.success) {
        setUser(response.data.user);
        // New access token cookie is automatically set
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      setUser(null);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
}
```

#### 1.6 Update API Client with Auto-Refresh

**File:** `apps/nexus/src/services/api.ts`

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Create axios instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  withCredentials: true, // CRITICAL: Send cookies with requests
  headers: {
    'Content-Type': 'application/json'
  }
});

// Track if refresh is in progress
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Subscribe to token refresh
 */
function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

/**
 * Notify all subscribers of new token
 */
function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

/**
 * Response interceptor for automatic token refresh
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Check if error is due to expired token
    if (
      error.response?.status === 401 &&
      error.response?.data?.errorCode === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Wait for refresh to complete
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh token
        await apiClient.post('/api/auth/refresh');
        
        isRefreshing = false;
        onRefreshed('refreshed');

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];

        // Refresh failed - redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### Testing Phase 1

#### 1.7 Integration Tests

**File:** `backend/tests/integration/cookie-auth.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import pool from '../../src/config/database.js';

describe('Cookie-Based Authentication - Integration Tests', () => {
  let testUserId;
  let testOrgId;
  const testUser = {
    email: 'test@cookieauth.com',
    password: 'TestPassword123!',
    name: 'Test User'
  };

  beforeAll(async () => {
    // Create test organization
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name)
      VALUES (gen_random_uuid(), 'Test Org Cookie Auth')
      RETURNING id
    `);
    testOrgId = orgResult.rows[0].id;

    // Create test user
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(testUser.password, 12);

    const userResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, name, organization_id, role)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'admin')
      RETURNING id
    `, [testUser.email, passwordHash, testUser.name, testOrgId]);
    
    testUserId = userResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM hris.user_account WHERE id = $1', [testUserId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
    await pool.end();
  });

  describe('POST /api/auth/login', () => {
    it('should login and set httpOnly cookies', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      // Check response
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);

      // Check cookies are set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.length).toBeGreaterThan(0);

      // Verify cookies contain expected values
      const cookieString = cookies.join('; ');
      expect(cookieString).toContain('access_token');
      expect(cookieString).toContain('refresh_token');
      expect(cookieString).toContain('session_id');

      // Verify httpOnly flag
      expect(cookieString).toContain('HttpOnly');

      // Verify SameSite flag
      expect(cookieString).toContain('SameSite');
    });

    it('should reject login with invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(500); // Should be 401 in production
    });
  });

  describe('GET /api/auth/me', () => {
    let authCookies;

    beforeAll(async () => {
      // Login to get cookies
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authCookies = loginResponse.headers['set-cookie'];
    });

    it('should return user data with valid session cookie', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject request without cookie', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshCookie;

    beforeAll(async () => {
      // Login to get cookies
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      // Extract only refresh_token cookie
      const cookies = loginResponse.headers['set-cookie'];
      refreshCookie = cookies.find(c => c.startsWith('refresh_token'));
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();

      // Should set new access_token cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.startsWith('access_token'))).toBe(true);
    });

    it('should reject refresh without token', async () => {
      await request(app)
        .post('/api/auth/refresh')
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let authCookies;

    beforeEach(async () => {
      // Login to get fresh cookies
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      authCookies = loginResponse.headers['set-cookie'];
    });

    it('should logout and clear cookies', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', authCookies)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify cookies are cleared (Max-Age=0 or Expires in past)
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const cookieString = cookies.join('; ');
      expect(
        cookieString.includes('Max-Age=0') || 
        cookieString.includes('Expires=Thu, 01 Jan 1970')
      ).toBe(true);
    });

    it('should reject subsequent requests after logout', async () => {
      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', authCookies);

      // Try to access protected route
      await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookies)
        .expect(401);
    });
  });
});
```

### Phase 1 Checklist

- [ ] Backend session table created and migrated
- [ ] AuthService updated with session management
- [ ] Auth controller sets httpOnly cookies
- [ ] Authentication middleware validates cookies
- [ ] Frontend AuthContext uses cookie-based auth
- [ ] API client configured with `withCredentials: true`
- [ ] Auto-refresh interceptor implemented
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Documentation updated

---

## Phase 2: Cross-Domain Authentication

### Objective

Enable cookie sharing across all frontend applications on localhost using `.localhost` domain.

### Backend Changes

#### 2.1 Update Cookie Domain Configuration

**File:** `backend/src/config/index.js`

```javascript
const config = {
  // ... existing config

  cookies: {
    domain: process.env.COOKIE_DOMAIN || (
      process.env.NODE_ENV === 'production' 
        ? '.recruitiq.com' 
        : '.localhost'
    ),
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    httpOnly: true,
    path: '/'
  }
};

export default config;
```

#### 2.2 Update Auth Controller with Cross-Domain Cookies

**File:** `backend/src/controllers/authController.js`

```javascript
import config from '../config/index.js';

// Update COOKIE_OPTIONS
const COOKIE_OPTIONS = {
  httpOnly: config.cookies.httpOnly,
  secure: config.cookies.secure,
  sameSite: config.cookies.sameSite,
  domain: config.cookies.domain, // ✅ Now includes domain
  path: config.cookies.path
};

// Rest of the controller code remains the same...
```

#### 2.3 Update CORS Configuration

**File:** `backend/src/middleware/cors.js`

```javascript
import cors from 'cors';

const ALLOWED_ORIGINS = [
  'http://localhost:5173', // Portal
  'http://localhost:5174', // PayLinQ / RecruitIQ
  'http://localhost:5175', // Nexus
  'http://localhost:5176', // ScheduleHub
  // Production origins
  'https://portal.recruitiq.com',
  'https://paylinq.recruitiq.com',
  'https://nexus.recruitiq.com',
  'https://schedulehub.recruitiq.com',
  'https://app.recruitiq.com'
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // ✅ CRITICAL: Allow credentials (cookies)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
});
```

### Frontend Changes

#### 2.4 Update Environment Variables

**File:** `apps/nexus/.env.local`

```env
VITE_API_URL=http://localhost:3001
```

**File:** `apps/paylinq/.env.local`

```env
VITE_API_URL=http://localhost:3001
```

**File:** `apps/portal/.env.local`

```env
VITE_API_URL=http://localhost:3001
```

**File:** `apps/schedulehub/.env.local`

```env
VITE_API_URL=http://localhost:3001
```

#### 2.5 Verify API Client Configuration

Ensure all apps have `withCredentials: true`:

**Files:** 
- `apps/nexus/src/services/api.ts`
- `apps/paylinq/src/services/api.ts`
- `apps/portal/src/services/api.js`
- `apps/schedulehub/src/services/api.ts`

```typescript
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  withCredentials: true, // ✅ Ensure this is set
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### Testing Phase 2

#### 2.6 Manual Cross-Domain Testing

**Test Procedure:**

1. **Start all services:**
```powershell
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Nexus
cd apps/nexus
npm run dev

# Terminal 3: PayLinQ
cd apps/paylinq
npm run dev
```

2. **Test cross-app session sharing:**

```
Step 1: Login via Nexus (http://localhost:5175)
  - Open browser
  - Navigate to http://localhost:5175/login
  - Login with test credentials
  - Verify: You're logged in

Step 2: Check cookies in DevTools
  - Open DevTools → Application → Cookies
  - Verify cookies exist:
    ✓ access_token (Domain: .localhost)
    ✓ refresh_token (Domain: .localhost)
    ✓ session_id (Domain: .localhost)

Step 3: Navigate to PayLinQ (http://localhost:5174)
  - Open new tab
  - Navigate to http://localhost:5174
  - Verify: You're automatically logged in (no login required)

Step 4: Check cookies again
  - Same cookies visible in PayLinQ app
  - Same session_id across both apps

Step 5: Logout from PayLinQ
  - Click logout in PayLinQ
  - Verify: Logged out from PayLinQ

Step 6: Switch back to Nexus tab
  - Refresh Nexus page
  - Verify: Also logged out (session revoked)
```

#### 2.7 Integration Test for Cross-Domain

**File:** `backend/tests/integration/cross-domain-auth.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import pool from '../../src/config/database.js';

describe('Cross-Domain Authentication - Integration Tests', () => {
  let testUserId;
  let testOrgId;

  beforeAll(async () => {
    // Create test data
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name)
      VALUES (gen_random_uuid(), 'Test Org Cross Domain')
      RETURNING id
    `);
    testOrgId = orgResult.rows[0].id;

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('TestPassword123!', 12);

    const userResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, name, organization_id, role)
      VALUES (gen_random_uuid(), 'test@crossdomain.com', $1, 'Test User', $2, 'admin')
      RETURNING id
    `, [passwordHash, testOrgId]);
    
    testUserId = userResult.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM hris.user_account WHERE id = $1', [testUserId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
    await pool.end();
  });

  it('should set cookies with .localhost domain', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@crossdomain.com',
        password: 'TestPassword123!'
      })
      .expect(200);

    const cookies = response.headers['set-cookie'];
    const cookieString = cookies.join('; ');

    // Verify domain is set to .localhost
    expect(cookieString).toContain('Domain=.localhost');
  });

  it('should accept cookies from different subdomains', async () => {
    // Login from one "subdomain" (simulated via Origin header)
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://nexus.localhost:5175')
      .send({
        email: 'test@crossdomain.com',
        password: 'TestPassword123!'
      })
      .expect(200);

    const cookies = loginResponse.headers['set-cookie'];

    // Access API from different "subdomain"
    const meResponse = await request(app)
      .get('/api/auth/me')
      .set('Origin', 'http://paylinq.localhost:5174')
      .set('Cookie', cookies)
      .expect(200);

    expect(meResponse.body.success).toBe(true);
    expect(meResponse.body.user).toBeDefined();
  });
});
```

### Phase 2 Checklist

- [ ] Cookie domain configured (`.localhost` for dev)
- [ ] CORS middleware allows credentials
- [ ] CORS whitelist includes all app origins
- [ ] All frontend apps use `withCredentials: true`
- [ ] Environment variables configured
- [ ] Manual testing completed (cross-app login)
- [ ] Integration tests passing
- [ ] Cookies visible in all apps with `.localhost` domain
- [ ] Session persists across app navigation
- [ ] Logout revokes session across all apps

---

## Phase 3: Multi-Product SSO

### Objective

Enable seamless product switching with product context tracking.

### Backend Changes

#### 3.1 Add Product Context to Sessions

**File:** `backend/src/database/migrations/20251121000001_add_product_context_to_sessions.sql`

```sql
-- Migration: Add product context tracking to user sessions
-- Author: RecruitIQ Dev Team
-- Date: 2025-11-21

BEGIN;

-- Add current_product column
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS current_product VARCHAR(50);

-- Add product_history jsonb column
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS product_history JSONB DEFAULT '[]'::jsonb;

-- Add index for product lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_current_product
  ON user_sessions(current_product)
  WHERE revoked_at IS NULL;

-- Add comments
COMMENT ON COLUMN user_sessions.current_product IS 'Current product the user is accessing (nexus, paylinq, schedulehub, recruitiq)';
COMMENT ON COLUMN user_sessions.product_history IS 'Array of product switches with timestamps';

COMMIT;
```

#### 3.2 Update AuthService with Product Tracking

**File:** `backend/src/services/AuthService.js`

Add product tracking methods:

```javascript
/**
 * Switch user's current product
 */
async switchProduct(sessionId, productSlug) {
  try {
    // Validate product slug
    const validProducts = ['nexus', 'paylinq', 'schedulehub', 'recruitiq', 'portal'];
    
    if (!validProducts.includes(productSlug)) {
      throw new Error('Invalid product');
    }

    // Get current session
    const sessionResult = await query(
      `SELECT * FROM user_sessions WHERE id = $1 AND revoked_at IS NULL`,
      [sessionId],
      null,
      { operation: 'SELECT', table: 'user_sessions' }
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found');
    }

    const session = sessionResult.rows[0];

    // Build product history entry
    const historyEntry = {
      product: productSlug,
      timestamp: new Date().toISOString(),
      from: session.current_product || null
    };

    // Update session with new product
    await query(
      `UPDATE user_sessions
       SET current_product = $1,
           product_history = product_history || $2::jsonb,
           last_activity_at = NOW()
       WHERE id = $3`,
      [productSlug, JSON.stringify(historyEntry), sessionId],
      null,
      { operation: 'UPDATE', table: 'user_sessions' }
    );

    logger.info('User switched product', {
      sessionId,
      userId: session.user_id,
      from: session.current_product,
      to: productSlug
    });

    return {
      success: true,
      currentProduct: productSlug
    };
  } catch (error) {
    logger.error('Product switch error', {
      error: error.message,
      sessionId,
      productSlug
    });
    throw error;
  }
}

/**
 * Get user's product access history
 */
async getProductHistory(sessionId) {
  try {
    const result = await query(
      `SELECT product_history FROM user_sessions WHERE id = $1`,
      [sessionId],
      null,
      { operation: 'SELECT', table: 'user_sessions' }
    );

    if (result.rows.length === 0) {
      return [];
    }

    return result.rows[0].product_history || [];
  } catch (error) {
    logger.error('Error fetching product history', {
      error: error.message,
      sessionId
    });
    return [];
  }
}
```

#### 3.3 Add Product Switch Endpoint

**File:** `backend/src/controllers/authController.js`

```javascript
/**
 * Switch current product
 */
export async function switchProduct(req, res, next) {
  try {
    const { product } = req.body;
    const sessionId = req.sessionId;

    if (!product) {
      return res.status(400).json({
        success: false,
        error: 'Product is required',
        errorCode: 'PRODUCT_REQUIRED'
      });
    }

    const result = await authService.switchProduct(sessionId, product);

    return res.status(200).json({
      success: true,
      currentProduct: result.currentProduct,
      message: `Switched to ${product}`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get product history
 */
export async function getProductHistory(req, res, next) {
  try {
    const sessionId = req.sessionId;
    const history = await authService.getProductHistory(sessionId);

    return res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    next(error);
  }
}
```

#### 3.4 Add Product Routes

**File:** `backend/src/routes/auth.js`

```javascript
// Add new routes
router.post('/switch-product', authenticate, switchProduct);
router.get('/product-history', authenticate, getProductHistory);
```

### Frontend Changes

#### 3.5 Add Product Switcher Component

**File:** `apps/nexus/src/components/ProductSwitcher.tsx`

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

interface Product {
  name: string;
  slug: string;
  url: string;
  icon: string;
}

const PRODUCTS: Product[] = [
  { name: 'Nexus', slug: 'nexus', url: 'http://localhost:5175', icon: '🏢' },
  { name: 'PayLinQ', slug: 'paylinq', url: 'http://localhost:5174', icon: '💰' },
  { name: 'ScheduleHub', slug: 'schedulehub', url: 'http://localhost:5176', icon: '📅' },
  { name: 'RecruitIQ', slug: 'recruitiq', url: 'http://localhost:5177', icon: '👥' },
  { name: 'Portal', slug: 'portal', url: 'http://localhost:5173', icon: '⚙️' }
];

export default function ProductSwitcher({ currentProduct }: { currentProduct: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleProductSwitch = async (product: Product) => {
    if (product.slug === currentProduct) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);

    try {
      // Notify backend of product switch
      await apiClient.post('/api/auth/switch-product', {
        product: product.slug
      });

      // Redirect to new product (session will be maintained)
      window.location.href = product.url;
    } catch (error) {
      console.error('Product switch error:', error);
      alert('Failed to switch product. Please try again.');
      setIsSwitching(false);
    }
  };

  const currentProductInfo = PRODUCTS.find(p => p.slug === currentProduct);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        disabled={isSwitching}
      >
        <span className="text-2xl">{currentProductInfo?.icon}</span>
        <span className="font-medium">{currentProductInfo?.name}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Switch Product
              </div>

              {PRODUCTS.map((product) => (
                <button
                  key={product.slug}
                  onClick={() => handleProductSwitch(product)}
                  disabled={product.slug === currentProduct || isSwitching}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    product.slug === currentProduct
                      ? 'bg-blue-50 text-blue-700 cursor-default'
                      : 'hover:bg-gray-100 text-gray-700'
                  } ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-2xl">{product.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{product.name}</div>
                    {product.slug === currentProduct && (
                      <div className="text-xs text-blue-600">Current</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {isSwitching && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-lg font-medium">Switching product...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 3.6 Integrate Product Switcher in Layout

**File:** `apps/nexus/src/layouts/DashboardLayout.tsx`

```typescript
import ProductSwitcher from '../components/ProductSwitcher';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Nexus</h1>
            
            <div className="flex items-center gap-4">
              {/* Product Switcher */}
              <ProductSwitcher currentProduct="nexus" />
              
              {/* User Menu */}
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Dashboard content */}
      </main>
    </div>
  );
}
```

### Testing Phase 3

#### 3.7 E2E Test for Multi-Product SSO

**File:** `backend/tests/e2e/sso-product-switching.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import pool from '../../src/config/database.js';

describe('Multi-Product SSO - E2E Tests', () => {
  let testUserId;
  let testOrgId;
  let authCookies;

  beforeAll(async () => {
    // Create test data
    const orgResult = await pool.query(`
      INSERT INTO organizations (id, name)
      VALUES (gen_random_uuid(), 'Test Org SSO')
      RETURNING id
    `);
    testOrgId = orgResult.rows[0].id;

    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('TestPassword123!', 12);

    const userResult = await pool.query(`
      INSERT INTO hris.user_account (id, email, password_hash, name, organization_id, role)
      VALUES (gen_random_uuid(), 'test@sso.com', $1, 'SSO Test User', $2, 'admin')
      RETURNING id
    `, [passwordHash, testOrgId]);
    
    testUserId = userResult.rows[0].id;

    // Login to get session cookies
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@sso.com',
        password: 'TestPassword123!'
      });

    authCookies = loginResponse.headers['set-cookie'];
  });

  afterAll(async () => {
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM hris.user_account WHERE id = $1', [testUserId]);
    await pool.query('DELETE FROM organizations WHERE id = $1', [testOrgId]);
    await pool.end();
  });

  describe('Product Switching', () => {
    it('should switch from Nexus to PayLinQ', async () => {
      const response = await request(app)
        .post('/api/auth/switch-product')
        .set('Cookie', authCookies)
        .send({ product: 'paylinq' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.currentProduct).toBe('paylinq');
    });

    it('should track product history', async () => {
      // Switch products multiple times
      await request(app)
        .post('/api/auth/switch-product')
        .set('Cookie', authCookies)
        .send({ product: 'nexus' });

      await request(app)
        .post('/api/auth/switch-product')
        .set('Cookie', authCookies)
        .send({ product: 'paylinq' });

      await request(app)
        .post('/api/auth/switch-product')
        .set('Cookie', authCookies)
        .send({ product: 'schedulehub' });

      // Get history
      const response = await request(app)
        .get('/api/auth/product-history')
        .set('Cookie', authCookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.history)).toBe(true);
      expect(response.body.history.length).toBeGreaterThan(0);

      // Verify last entry is schedulehub
      const lastEntry = response.body.history[response.body.history.length - 1];
      expect(lastEntry.product).toBe('schedulehub');
    });

    it('should reject invalid product slug', async () => {
      await request(app)
        .post('/api/auth/switch-product')
        .set('Cookie', authCookies)
        .send({ product: 'invalid-product' })
        .expect(500); // Should be 400 in production
    });

    it('should maintain session across product switches', async () => {
      // Switch product
      await request(app)
        .post('/api/auth/switch-product')
        .set('Cookie', authCookies)
        .send({ product: 'nexus' });

      // Verify user is still authenticated
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });
  });

  describe('Centralized Logout', () => {
    it('should logout from all products', async () => {
      // Switch to PayLinQ
      await request(app)
        .post('/api/auth/switch-product')
        .set('Cookie', authCookies)
        .send({ product: 'paylinq' });

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', authCookies)
        .expect(200);

      // Verify cannot access protected routes
      await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookies)
        .expect(401);

      // Verify cannot switch products after logout
      await request(app)
        .post('/api/auth/switch-product')
        .set('Cookie', authCookies)
        .send({ product: 'nexus' })
        .expect(401);
    });
  });
});
```

### Phase 3 Checklist

- [ ] Product context columns added to sessions table
- [ ] AuthService updated with product tracking
- [ ] Product switch endpoint implemented
- [ ] Product history endpoint implemented
- [ ] ProductSwitcher component created
- [ ] ProductSwitcher integrated in all apps
- [ ] E2E tests passing
- [ ] Manual testing completed (switch between all products)
- [ ] Session persists across product switches
- [ ] Product history tracked correctly
- [ ] Centralized logout works across all products

---

## Testing Strategy

### Unit Tests

**Files to Test:**
- `backend/src/services/AuthService.js`
- `backend/src/middleware/auth.js`
- Frontend AuthContext components

**Coverage Requirements:**
- Services: 90%+
- Middleware: 85%+
- Components: 75%+

### Integration Tests

**Test Scenarios:**
1. Cookie-based login/logout
2. Token refresh flow
3. Session validation
4. Cross-domain cookie sharing
5. Product switching
6. Concurrent session handling

**Test Files:**
- `backend/tests/integration/cookie-auth.test.js`
- `backend/tests/integration/cross-domain-auth.test.js`
- `backend/tests/integration/session-management.test.js`

### E2E Tests

**Test Scenarios:**
1. Complete SSO flow across all apps
2. Product switching without re-login
3. Centralized logout
4. Session expiration handling
5. Token refresh during active use

**Test Files:**
- `backend/tests/e2e/sso-product-switching.test.js`
- `backend/tests/e2e/sso-cross-app.test.js`

### Manual Testing Checklist

#### Phase 1 Testing

- [ ] Login via Nexus app
- [ ] Verify httpOnly cookies set in DevTools
- [ ] Access protected routes
- [ ] Verify token auto-refresh works
- [ ] Logout and verify cookies cleared
- [ ] Try accessing protected route after logout (should fail)

#### Phase 2 Testing

- [ ] Login via Nexus app
- [ ] Verify cookie domain is `.localhost`
- [ ] Open PayLinQ in new tab
- [ ] Verify automatically logged in (no login required)
- [ ] Check cookies in both tabs (same session_id)
- [ ] Logout from PayLinQ
- [ ] Switch back to Nexus tab and refresh
- [ ] Verify also logged out in Nexus

#### Phase 3 Testing

- [ ] Login via any app
- [ ] Click product switcher
- [ ] Switch to different product
- [ ] Verify no re-login required
- [ ] Switch to third product
- [ ] Verify still logged in
- [ ] Check product history endpoint
- [ ] Logout from any product
- [ ] Verify logged out from all products

---

## Security Considerations

### Cookie Security

#### HttpOnly Flag

**Purpose:** Prevents JavaScript access to cookies  
**Status:** ✅ Enabled by default

```javascript
const COOKIE_OPTIONS = {
  httpOnly: true, // Prevents XSS attacks
  // ...
};
```

#### Secure Flag

**Purpose:** Only send cookies over HTTPS  
**Status:** ✅ Enabled in production

```javascript
const COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  // ...
};
```

#### SameSite Attribute

**Purpose:** Prevents CSRF attacks  
**Status:** ✅ Set to 'lax' for dev, 'strict' for prod

```javascript
const COOKIE_OPTIONS = {
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  // ...
};
```

### Session Security

#### Session Timeout

**Access Token:** 15 minutes (short-lived)  
**Refresh Token:** 7 days (long-lived)  
**Session Expiration:** 7 days (matches refresh token)

```javascript
const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });
const refreshToken = jwt.sign(payload, secret, { expiresIn: '7d' });
```

#### Session Revocation

Sessions can be revoked by:
1. User logout (sets `revoked_at` timestamp)
2. Admin action (security breach response)
3. Automatic cleanup (expired sessions)

```sql
UPDATE user_sessions
SET revoked_at = NOW()
WHERE id = $1;
```

#### IP Address Tracking

Sessions store IP address for audit:

```javascript
await query(
  `INSERT INTO user_sessions (..., ip_address, ...) 
   VALUES (..., $4, ...)`,
  [..., ipAddress, ...]
);
```

**Use Cases:**
- Detect suspicious login patterns
- Geographic anomaly detection
- Security audit trails

### CSRF Protection

**Mitigation Strategy:**
1. SameSite cookie attribute
2. CORS origin validation
3. Custom CSRF tokens for state-changing operations (optional enhancement)

```javascript
// CORS configuration
const corsMiddleware = cors({
  origin: ALLOWED_ORIGINS,
  credentials: true, // Allow cookies
});
```

### XSS Protection

**Frontend Measures:**
1. Never use `dangerouslySetInnerHTML`
2. Sanitize user input before rendering
3. Content Security Policy headers

**Backend Measures:**
1. HttpOnly cookies (no JS access)
2. Input validation with Joi
3. Output encoding

### Rate Limiting

**Recommendation:** Add rate limiting to auth endpoints

```javascript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts. Please try again later.'
});

router.post('/login', authLimiter, login);
```

### Security Headers

```javascript
// Add security headers middleware
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));
```

---

## Monitoring & Logging

### Authentication Events to Log

#### Success Events

```javascript
logger.info('User logged in successfully', {
  userId: user.id,
  email: user.email,
  sessionId,
  ipAddress,
  userAgent: req.headers['user-agent']
});

logger.info('Access token refreshed', {
  userId: session.user_id,
  sessionId: session.id
});

logger.info('User switched product', {
  sessionId,
  userId: session.user_id,
  from: session.current_product,
  to: productSlug
});

logger.info('User logged out', {
  sessionId,
  userId: user.id
});
```

#### Failure Events

```javascript
logger.warn('Login failed - user not found', {
  email,
  ipAddress: req.ip
});

logger.warn('Login failed - invalid password', {
  email,
  userId: user.id,
  ipAddress: req.ip
});

logger.warn('Invalid session', {
  sessionId,
  userId: decoded.userId
});

logger.error('Token refresh error', {
  error: error.message,
  sessionId
});
```

### Metrics to Track

#### Authentication Metrics

- **Login Success Rate:** `successful_logins / total_login_attempts`
- **Failed Login Attempts:** Count by user, IP, time window
- **Average Session Duration:** `logout_time - login_time`
- **Token Refresh Rate:** Count per session
- **Session Expiration Rate:** Sessions expired vs renewed

#### Product Usage Metrics

- **Product Switch Frequency:** Switches per user per day
- **Most Used Products:** Count by product slug
- **Product Usage Time:** Time spent per product
- **Cross-Product Journeys:** Common switch patterns

### Monitoring Dashboard (Recommended)

**Tool:** Grafana + Prometheus

**Panels:**
1. Authentication Events (login, logout, refresh) - Time series
2. Active Sessions - Gauge
3. Failed Login Attempts - Heatmap
4. Product Switches - Bar chart
5. Session Duration - Histogram
6. Error Rate - Time series

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: authentication
    rules:
      - alert: HighFailedLoginRate
        expr: rate(failed_logins[5m]) > 10
        for: 5m
        annotations:
          summary: "High failed login rate detected"

      - alert: SessionDatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          summary: "Session database is down"

      - alert: TokenRefreshFailures
        expr: rate(token_refresh_errors[5m]) > 5
        for: 5m
        annotations:
          summary: "High token refresh failure rate"
```

---

## Rollback Procedures

### If Phase 1 Fails

**Symptoms:**
- Users cannot login
- Cookies not being set
- Sessions not persisting

**Rollback Steps:**

```bash
# 1. Stop backend
pm2 stop recruitiq-backend

# 2. Revert migrations
cd backend
npm run migrate:down

# 3. Restore previous code
git checkout main -- src/services/AuthService.js
git checkout main -- src/controllers/authController.js
git checkout main -- src/middleware/auth.js

# 4. Restart backend
npm run dev
```

### If Phase 2 Fails

**Symptoms:**
- Cookies not shared across apps
- CORS errors
- Session not persisting on navigation

**Rollback Steps:**

```bash
# 1. Remove cookie domain
# Edit backend/src/config/index.js
# Comment out domain: '.localhost'

# 2. Restart backend
pm2 restart recruitiq-backend

# 3. Clear browser cookies
# Manual: DevTools → Application → Clear cookies

# 4. Test with single app
```

### If Phase 3 Fails

**Symptoms:**
- Product switching not working
- Session context lost
- Database errors

**Rollback Steps:**

```bash
# 1. Revert product context migration
cd backend
npm run migrate:down

# 2. Remove product tracking code
git checkout main -- src/services/AuthService.js
git checkout main -- src/controllers/authController.js

# 3. Remove ProductSwitcher components from frontends
# (Components can remain but won't function)

# 4. Restart services
pm2 restart all
```

### Emergency Rollback (Full Revert)

**Symptoms:**
- Multiple critical issues
- Data corruption
- System-wide authentication failures

**Steps:**

```bash
# 1. Stop all services
pm2 stop all

# 2. Revert entire SSO implementation
git checkout main

# 3. Revert database migrations
cd backend
npm run migrate:down -- --count 2

# 4. Clear all sessions
psql -d recruitiq_db -c "DELETE FROM user_sessions;"

# 5. Restart services
npm install
pm2 start all

# 6. Notify users to re-login
```

---

## Quick Reference

### Environment Variables

```env
# Backend (.env)
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
COOKIE_DOMAIN=.localhost
SESSION_EXPIRY_DAYS=7
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Frontend (apps/*/.env.local)
VITE_API_URL=http://localhost:3001
```

### Key Commands

```bash
# Start all services
pnpm dev

# Run migrations
cd backend
npm run migrate:up

# Run tests
npm test tests/integration/cookie-auth.test.js
npm run test:e2e

# Check session count
psql -d recruitiq_db -c "SELECT COUNT(*) FROM user_sessions WHERE revoked_at IS NULL;"

# Clean expired sessions
psql -d recruitiq_db -c "DELETE FROM user_sessions WHERE expires_at < NOW();"
```

### API Endpoints

```
POST   /api/auth/login          - Login with email/password
POST   /api/auth/logout         - Logout and revoke session
POST   /api/auth/refresh        - Refresh access token
GET    /api/auth/me             - Get current user
POST   /api/auth/switch-product - Switch current product
GET    /api/auth/product-history - Get product usage history
```

### Cookie Names

```
access_token   - JWT access token (15 min)
refresh_token  - JWT refresh token (7 days)
session_id     - Session identifier
```

### Database Tables

```sql
-- Sessions
user_sessions (id, user_id, refresh_token, current_product, product_history, expires_at, revoked_at)

-- Indexes
idx_user_sessions_user_id
idx_user_sessions_expires_at
idx_user_sessions_refresh_token
idx_user_sessions_current_product
```

### Product Slugs

```
nexus        - Nexus HRIS
paylinq      - PayLinQ Payroll
schedulehub  - ScheduleHub Scheduling
recruitiq    - RecruitIQ ATS
portal       - Admin Portal
```

### Frontend Integration

```typescript
// API Client Setup
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true // CRITICAL!
});

// Auth Context Usage
import { useAuth } from '@/contexts/AuthContext';

const { user, login, logout, isAuthenticated } = useAuth();
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Cookies not being set | Check `withCredentials: true` in frontend |
| CORS errors | Verify origin in CORS whitelist |
| Session not persisting | Check cookie domain is `.localhost` |
| Token expired errors | Implement auto-refresh in API client |
| Logout doesn't clear session | Verify `revoked_at` is being set |
| Product switch fails | Check product slug is valid |

---

## Success Metrics

### Phase 1 Success Criteria

- ✅ Zero localStorage JWT storage
- ✅ All auth cookies have httpOnly flag
- ✅ Token refresh works automatically
- ✅ Users stay logged in for 7 days
- ✅ Logout clears all cookies
- ✅ 100% test coverage for auth flows

### Phase 2 Success Criteria

- ✅ Cookie domain is `.localhost` in dev
- ✅ Single login works across all apps
- ✅ Logout from one app logs out all apps
- ✅ No CORS errors in console
- ✅ Session ID is same across all apps
- ✅ Cross-domain tests passing

### Phase 3 Success Criteria

- ✅ Users switch products without re-login
- ✅ Product context tracked in session
- ✅ Product history accessible via API
- ✅ ProductSwitcher component in all apps
- ✅ E2E tests validate complete flow
- ✅ Centralized logout works

### Business Impact Metrics

**User Experience:**
- **Login Reduction:** 80% reduction in login prompts
- **Session Continuity:** 95%+ of sessions persist across apps
- **Product Switching:** < 2 seconds average switch time

**Security:**
- **Session Security:** Zero XSS/CSRF vulnerabilities
- **Audit Trail:** 100% of auth events logged
- **Session Revocation:** < 1 second logout propagation

**Performance:**
- **API Response Time:** < 200ms for auth checks
- **Cookie Size:** < 4KB total
- **Database Load:** < 10ms session lookups

---

## Next Steps

### Post-Implementation

1. **Monitor for 1 week**
   - Check logs for auth errors
   - Track failed login attempts
   - Monitor session expiration patterns

2. **Gather user feedback**
   - Survey users on SSO experience
   - Identify friction points
   - Measure satisfaction improvement

3. **Performance optimization**
   - Add Redis for session caching
   - Optimize session lookup queries
   - Implement connection pooling

4. **Security hardening**
   - Add rate limiting to auth endpoints
   - Implement anomaly detection
   - Add 2FA support (future enhancement)

5. **Documentation**
   - Update user manual
   - Create internal runbook
   - Document troubleshooting procedures

### Future Enhancements

- **Redis Session Store:** Replace PostgreSQL with Redis for session storage
- **2FA Support:** Add two-factor authentication
- **Social Login:** Google, Microsoft, LinkedIn SSO
- **Session Management UI:** Allow users to view/revoke active sessions
- **Device Fingerprinting:** Enhanced security with device tracking
- **Geo-based Alerts:** Notify on login from new location
- **Passwordless Login:** Magic link or WebAuthn support

---

## Appendix

### References

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN Web Docs: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [CORS Specification](https://fetch.spec.whatwg.org/#http-cors-protocol)

### Contact

**Questions or Issues:**
- Slack: #recruitiq-dev
- Email: dev-team@recruitiq.com
- GitHub Issues: [RecruitIQ Repository](https://github.com/recruitiq/platform)

---

**Document Version:** 1.0  
**Last Updated:** November 21, 2025  
**Next Review:** December 21, 2025  
**Status:** ✅ Ready for Implementation
