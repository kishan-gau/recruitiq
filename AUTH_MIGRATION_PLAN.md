# Authentication Migration Plan: Cookie-Based Auth with SSO

**Version:** 1.0  
**Date:** November 15, 2025  
**Status:** Planning Phase  
**Author:** System Architect

---

## Executive Summary

This document outlines the comprehensive plan to migrate all tenant-facing applications (Portal, Nexus, RecruitIQ, ScheduleHub) from **legacy Bearer token authentication** to PayLinQ's **battle-tested cookie-based authentication** with **Single Sign-On (SSO)** between tenant applications.

### Current State

- ✅ **PayLinQ**: Modern cookie-based auth with httpOnly cookies, CSRF protection, MFA support
- ❌ **Portal**: Legacy Bearer token auth (platform users)
- ❌ **Nexus**: Uses `@recruitiq/auth` package (needs migration)
- ❌ **RecruitIQ**: No current implementation (planned)
- ❌ **ScheduleHub**: No current implementation (planned)

### Target State

- ✅ **All tenant apps** (PayLinQ, Nexus, RecruitIQ, ScheduleHub): Cookie-based auth with SSO
- ✅ **Portal**: Separate cookie-based auth (platform users only, no SSO with tenant apps)
- ✅ **Unified `@recruitiq/auth` package**: Single source of truth for auth logic
- ✅ **Industry standards**: httpOnly cookies, CSRF protection, automatic token rotation

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current Authentication Analysis](#current-authentication-analysis)
3. [Migration Strategy](#migration-strategy)
4. [SSO Implementation](#sso-implementation)
5. [Phase 1: Package Consolidation](#phase-1-package-consolidation)
6. [Phase 2: Backend API Alignment](#phase-2-backend-api-alignment)
7. [Phase 3: Portal Migration](#phase-3-portal-migration)
8. [Phase 4: Nexus Migration](#phase-4-nexus-migration)
9. [Phase 5: RecruitIQ & ScheduleHub](#phase-5-recruitiq--schedulehub)
10. [SSO Cross-Domain Setup](#sso-cross-domain-setup)
11. [Security Considerations](#security-considerations)
12. [Testing Strategy](#testing-strategy)
13. [Rollback Plan](#rollback-plan)
14. [Timeline & Milestones](#timeline--milestones)

---

## Architecture Overview

### Authentication Separation

```
┌─────────────────────────────────────────────────────────────┐
│                     RecruitIQ Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         PLATFORM USERS (No SSO)                      │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  Portal (Platform Admin)                     │   │   │
│  │  │  - Platform authentication only              │   │   │
│  │  │  - Separate cookie domain                    │   │   │
│  │  │  - authenticatePlatform middleware           │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         TENANT USERS (SSO Enabled)                   │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  PayLinQ                                     │   │   │
│  │  │  - Cookie-based auth ✅                      │   │   │
│  │  │  - CSRF protection ✅                        │   │   │
│  │  │  - MFA support ✅                            │   │   │
│  │  │  - SSO enabled ✅                            │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  Nexus                                       │   │   │
│  │  │  - Migrate from Bearer → Cookie 🔄          │   │   │
│  │  │  - Enable SSO 🔄                            │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  RecruitIQ                                   │   │   │
│  │  │  - Implement cookie auth 🔄                 │   │   │
│  │  │  - Enable SSO 🔄                            │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │  ScheduleHub                                 │   │   │
│  │  │  - Implement cookie auth 🔄                 │   │   │
│  │  │  - Enable SSO 🔄                            │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Backend API                                   │   │
│  │  - /auth/platform/* (Platform users, no SSO)        │   │
│  │  - /auth/tenant/* (Tenant users, SSO enabled)       │   │
│  │  - authenticatePlatform middleware                   │   │
│  │  - authenticateTenant middleware                     │   │
│  │  - Separate JWT signing keys per user type          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Cookie Strategy

#### Platform Users (Portal)
```javascript
// Domain: portal.recruitiq.com
// Cookie Name: platform_access_token
// Path: /
// SameSite: Strict
// Secure: true (HTTPS only)
// HttpOnly: true
// No SSO with tenant apps
```

#### Tenant Users (SSO-enabled apps)
```javascript
// Domain: .recruitiq.com (shared for SSO)
// Cookie Name: tenant_access_token
// Path: /
// SameSite: Lax (allows cross-subdomain navigation)
// Secure: true (HTTPS only)
// HttpOnly: true
// Shared across: paylinq.recruitiq.com, nexus.recruitiq.com, etc.
```

---

## Current Authentication Analysis

### PayLinQ (✅ Reference Implementation)

**Status:** Fully implemented and production-ready

**Features:**
- ✅ httpOnly cookies for token storage
- ✅ CSRF protection with token validation
- ✅ Automatic token rotation
- ✅ MFA support with grace periods
- ✅ Session management
- ✅ Secure logout (cookie clearing)

**Files:**
- `apps/paylinq/src/contexts/AuthContext.tsx` - React auth context
- `apps/paylinq/src/hooks/usePaylinqAPI.ts` - API client wrapper
- `backend/src/routes/auth/authRoutes.js` - Auth endpoints
- `backend/src/middleware/auth.js` - `authenticateTenant` middleware
- `backend/src/middleware/csrf.js` - CSRF protection

**Key Implementation Details:**
```typescript
// PayLinQ AuthContext pattern
export function AuthProvider({ children }: AuthProviderProps) {
  // 1. Check session on mount (validates httpOnly cookie)
  useEffect(() => {
    const checkAuth = async () => {
      const response = await api.auth.getMe(); // Cookies sent automatically
      setUser(response.user);
      // Fetch CSRF token after session validation
      await api.fetchCsrfToken();
    };
    checkAuth();
  }, []);

  // 2. Login sets httpOnly cookies via backend
  const login = async (email: string, password: string) => {
    const response = await api.auth.login({ email, password });
    // Backend sets cookies - no client-side token storage
    setUser(response.user);
  };

  // 3. Logout clears cookies on backend
  const logout = async () => {
    await api.auth.logout(); // Backend clears httpOnly cookies
    setUser(null);
  };
}
```

**API Client Pattern:**
```typescript
// Axios instance with cookie support
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // CRITICAL: Send httpOnly cookies
});

// CSRF token interceptor
api.interceptors.request.use(async config => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    if (!csrfToken) {
      const response = await axios.get('/api/csrf-token', { withCredentials: true });
      csrfToken = response.data.csrfToken;
    }
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
```

### Portal (❌ Legacy Bearer Token)

**Status:** Needs migration

**Current Implementation:**
- ❌ Bearer token in Authorization header
- ❌ Tokens stored in localStorage (XSS vulnerability)
- ✅ CSRF protection attempted (but not fully utilized with Bearer tokens)
- ✅ Token refresh logic exists
- ❌ Platform-specific auth (separate from tenant auth)

**Files:**
- `apps/portal/src/contexts/AuthContext.jsx`
- `apps/portal/src/services/api.js`

**Problems:**
1. Bearer tokens bypass CSRF protection (see `csrf.js:69`)
2. Tokens stored in localStorage (XSS risk)
3. Manual token management (error-prone)
4. Not aligned with tenant auth system

**Migration Path:**
- Keep platform authentication separate (no SSO with tenant apps)
- Migrate to cookie-based auth for security
- Use `authenticatePlatform` middleware
- Update `AuthContext` to match PayLinQ pattern

### Nexus (⚠️ Uses `@recruitiq/auth` Package)

**Status:** Partially implemented, needs alignment

**Current Implementation:**
- Uses `@recruitiq/auth` shared package
- `@recruitiq/api-client` for API calls
- Unclear if cookie-based or Bearer token

**Files:**
- `packages/auth/src/AuthContext.tsx`
- `packages/auth/src/ProtectedRoute.tsx`
- `apps/nexus/src/pages/Login.tsx`

**Issues:**
1. `@recruitiq/auth` package references `api.auth.login()` but implementation unclear
2. Package is meant to be shared but PayLinQ doesn't use it (uses custom `AuthContext.tsx`)
3. No clear cookie configuration
4. No CSRF token management visible

**Migration Path:**
- Audit `@recruitiq/auth` package implementation
- Align with PayLinQ's cookie-based pattern
- Ensure SSO compatibility with tenant apps
- Update `@recruitiq/api-client` to handle cookies + CSRF

### RecruitIQ & ScheduleHub (📝 Not Yet Implemented)

**Status:** Greenfield implementation

**Opportunity:**
- Implement cookie-based auth from day one
- Use updated `@recruitiq/auth` package
- Enable SSO automatically
- Follow PayLinQ reference implementation

---

## Migration Strategy

### Guiding Principles

1. **Security First**: Cookie-based auth is more secure than Bearer tokens for web apps
2. **Zero Downtime**: Migrations must not disrupt active users
3. **Backwards Compatibility**: Support graceful transition period
4. **SSO for Tenant Apps Only**: Platform (Portal) remains isolated
5. **Reference Implementation**: PayLinQ is the gold standard
6. **Industry Standards**: Follow OWASP best practices

### Migration Approach

**Big Bang vs Incremental:**
- ❌ **Big Bang**: Risky, high chance of breaking changes
- ✅ **Incremental**: Migrate one app at a time, test thoroughly

**Rollout Order:**
1. ✅ **PayLinQ** - Already done (reference implementation)
2. **Shared Package** - Update `@recruitiq/auth` to match PayLinQ
3. **Backend Alignment** - Ensure all `/auth/tenant/*` endpoints consistent
4. **Portal** - Migrate to cookie-based (platform auth, no SSO)
5. **Nexus** - Migrate to cookie-based (tenant auth, SSO enabled)
6. **RecruitIQ** - Implement from scratch (tenant auth, SSO enabled)
7. **ScheduleHub** - Implement from scratch (tenant auth, SSO enabled)

### Key Success Metrics

- [ ] Zero security vulnerabilities (XSS, CSRF, token leakage)
- [ ] SSO works seamlessly between tenant apps
- [ ] No user-facing disruptions during migration
- [ ] All apps pass security audit
- [ ] Documentation updated for all auth flows

---

## SSO Implementation

### What is SSO (Single Sign-On)?

**SSO allows users to log in once and access multiple applications without re-authenticating.**

In our case:
- Log in to **PayLinQ** → Automatically logged in to **Nexus**, **RecruitIQ**, **ScheduleHub**
- Log out from any app → Logged out from all tenant apps
- **Portal** is excluded (platform users, separate authentication domain)

### SSO Architecture

#### Cookie Sharing Strategy

**Domain Configuration:**
```
Production:
- paylinq.recruitiq.com    → tenant_access_token (domain: .recruitiq.com)
- nexus.recruitiq.com      → tenant_access_token (domain: .recruitiq.com)
- recruitiq.recruitiq.com  → tenant_access_token (domain: .recruitiq.com)
- portal.recruitiq.com     → platform_access_token (domain: portal.recruitiq.com)

Development:
- localhost:5174 (PayLinQ)  → tenant_access_token (domain: localhost)
- localhost:5175 (Nexus)    → PROBLEM: Cannot share cookies between ports!

Solution: Use nginx reverse proxy in development
- app.local/paylinq  → tenant_access_token (domain: .app.local)
- app.local/nexus    → tenant_access_token (domain: .app.local)
- app.local/portal   → platform_access_token (domain: app.local)
```

#### Backend Session Management

**Unified Session Store:**
```javascript
// backend/src/models/TenantSession.js
class TenantSession {
  id              // UUID - session identifier
  userId          // Tenant user ID
  organizationId  // Tenant's organization
  accessToken     // JWT access token (short-lived: 15 minutes)
  refreshToken    // JWT refresh token (long-lived: 7 days)
  deviceInfo      // Browser, OS, location
  ipAddress       // Security tracking
  lastActivity    // Session timeout tracking
  createdAt       // Session start time
  expiresAt       // Session expiry time
  revokedAt       // Manual revocation
}
```

**Session Lifecycle:**
1. User logs in → Create session → Set httpOnly cookies
2. User navigates to another app → Cookies sent automatically → Session validated
3. Access token expires → Refresh token used → New access token issued
4. User logs out → Session revoked → Cookies cleared
5. Session timeout → Automatic logout → Redirect to login

#### SSO Flow Diagram

```
User                 PayLinQ               Backend              Nexus
  │                     │                     │                   │
  │──Login──────────────>│                     │                   │
  │                     │──POST /auth/login──>│                   │
  │                     │                     │                   │
  │                     │<─Set-Cookie─────────│                   │
  │                     │  (tenant_access_token, .recruitiq.com)  │
  │<────Dashboard───────│                     │                   │
  │                     │                     │                   │
  │──Navigate to Nexus────────────────────────────────────────────>│
  │                     │                     │                   │
  │                     │                     │<─GET /nexus───────│
  │                     │                     │  (cookie sent     │
  │                     │                     │   automatically)  │
  │                     │                     │                   │
  │                     │                     │──Validate Session──>│
  │                     │                     │<──User Data───────│
  │                     │                     │                   │
  │<────Nexus Dashboard───────────────────────────────────────────│
  │                     │                     │   (NO LOGIN!)     │
```

### SSO Implementation Checklist

- [ ] Backend: Unified session storage (PostgreSQL)
- [ ] Backend: Tenant auth endpoints return shared cookies
- [ ] Backend: `authenticateTenant` middleware validates shared cookies
- [ ] Backend: Logout endpoint clears session and cookies
- [ ] Frontend: All tenant apps use same cookie domain
- [ ] Frontend: AuthContext checks for existing session on mount
- [ ] Frontend: No manual token storage (cookies only)
- [ ] Infrastructure: Configure domain/subdomain in production
- [ ] Infrastructure: Nginx reverse proxy for local development
- [ ] Security: CSRF tokens synchronized across apps
- [ ] Security: Session timeout consistent across apps

---

## Phase 1: Package Consolidation

**Goal:** Update `@recruitiq/auth` package to match PayLinQ's battle-tested implementation

### Current State Analysis

**`packages/auth/src/AuthContext.tsx`:**
- ❌ Uses `@recruitiq/api-client` but unclear if cookie-based
- ❌ No CSRF token management visible
- ❌ Generic `api.auth.login()` - implementation unclear
- ⚠️ Has login/logout/session management but missing cookie specifics

**`apps/paylinq/src/contexts/AuthContext.tsx`:**
- ✅ Explicit cookie-based auth
- ✅ CSRF token management
- ✅ Proper session validation
- ✅ MFA support
- ✅ Production-tested

### Migration Steps

#### 1.1 Backup Current Package
```bash
cd packages/auth
git checkout -b backup/auth-package-pre-migration
git commit -am "Backup: Pre-migration state of @recruitiq/auth"
git push origin backup/auth-package-pre-migration
```

#### 1.2 Update AuthContext
```typescript
// packages/auth/src/AuthContext.tsx

import { RecruitIQPlatformAPI } from '@recruitiq/api-client';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  type: 'tenant' | 'platform';
  organizationId: string;
  enabledProducts?: string[];
  productRoles?: Record<string, string>;
  mfaEnabled?: boolean;
}

export function AuthProvider({ children, apiClient }: AuthProviderProps) {
  // Initialize API client with cookie support
  const [api] = useState(() => {
    if (apiClient) return apiClient;
    return new RecruitIQPlatformAPI({
      baseURL: getAPIBaseURL(),
      timeout: 30000,
    });
  });

  // Session validation on mount (cookie-based)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Call /auth/tenant/me - cookies sent automatically
        const response = await api.auth.getMe();
        setUser(response.user);
        
        // Fetch CSRF token after session validation
        await api.fetchCsrfToken();
      } catch (err) {
        // No valid session - this is expected
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Login - backend sets httpOnly cookies
  const login = async (email: string, password: string) => {
    const response = await api.auth.login({ email, password });
    
    // Check for MFA requirement
    if ('mfaRequired' in response && response.mfaRequired) {
      return { mfaRequired: true, mfaToken: response.mfaToken };
    }
    
    setUser(response.user);
    
    // Fetch CSRF token after login
    await api.fetchCsrfToken();
    
    return true;
  };

  // Logout - backend clears httpOnly cookies
  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };
}
```

#### 1.3 Update API Client
```typescript
// packages/api-client/src/index.ts

export class RecruitIQPlatformAPI {
  private client: AxiosInstance;
  private csrfToken: string | null = null;

  constructor(config: APIConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      withCredentials: true, // CRITICAL: Send httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for CSRF tokens
    this.client.interceptors.request.use(async (config) => {
      const mutatingMethods = ['post', 'put', 'patch', 'delete'];
      if (config.method && mutatingMethods.includes(config.method)) {
        // Lazy fetch CSRF token if not available
        if (!this.csrfToken && !config.url?.includes('/csrf-token')) {
          await this.fetchCsrfToken();
        }
        if (this.csrfToken) {
          config.headers['X-CSRF-Token'] = this.csrfToken;
        }
      }
      return config;
    });

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If 401 and not already retrying, try refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.auth.refresh();
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed - redirect to login
            window.location.href = '/login?reason=session_expired';
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  async fetchCsrfToken() {
    const response = await this.client.get('/csrf-token');
    this.csrfToken = response.data.csrfToken;
    return this.csrfToken;
  }

  // Auth API
  public auth = {
    login: (data: LoginData) => this.client.post('/auth/tenant/login', data),
    logout: () => this.client.post('/auth/tenant/logout'),
    refresh: () => this.client.post('/auth/tenant/refresh'),
    getMe: () => this.client.get('/auth/tenant/me'),
  };
}
```

#### 1.4 Testing
```bash
# Test package in isolation
cd packages/auth
npm test

# Test with PayLinQ (should still work)
cd ../../apps/paylinq
npm run dev

# Test with Nexus (should work after migration)
cd ../nexus
npm run dev
```

#### 1.5 Acceptance Criteria
- [ ] `@recruitiq/auth` matches PayLinQ's `AuthContext.tsx` functionality
- [ ] Cookie-based authentication works
- [ ] CSRF token management functional
- [ ] MFA support included
- [ ] Session validation on mount works
- [ ] All tests pass
- [ ] PayLinQ still works with new package (regression test)

---

## Phase 2: Backend API Alignment

**Goal:** Ensure all backend auth endpoints are consistent and support SSO

### Current Backend State

**Auth Routes:**
```javascript
// backend/src/routes/auth/authRoutes.js
router.post('/platform/login', platformAuthController.login);
router.post('/platform/logout', platformAuthController.logout);
router.get('/platform/me', authenticatePlatform, platformAuthController.getProfile);

router.post('/tenant/login', tenantAuthController.login);
router.post('/tenant/logout', tenantAuthController.logout);
router.get('/tenant/me', authenticateTenant, tenantAuthController.getProfile);
```

**Middleware:**
```javascript
// backend/src/middleware/auth.js
export const authenticatePlatform = async (req, res, next) => {
  const token = req.cookies.accessToken; // Read from httpOnly cookie
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.type !== 'platform') throw new Error('Invalid token type');
  // ... attach user to req.user
};

export const authenticateTenant = async (req, res, next) => {
  const token = req.cookies.accessToken; // Read from httpOnly cookie
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.type !== 'tenant') throw new Error('Invalid token type');
  // ... attach user to req.user
  // ... set PostgreSQL RLS context
};
```

### Required Changes

#### 2.1 Separate Cookie Names
```javascript
// backend/src/config/auth.js
export const AUTH_CONFIG = {
  platform: {
    cookieName: 'platform_access_token',
    refreshCookieName: 'platform_refresh_token',
    domain: process.env.PLATFORM_COOKIE_DOMAIN || undefined, // portal.recruitiq.com
    sameSite: 'strict',
    path: '/',
  },
  tenant: {
    cookieName: 'tenant_access_token',
    refreshCookieName: 'tenant_refresh_token',
    domain: process.env.TENANT_COOKIE_DOMAIN || undefined, // .recruitiq.com (SSO)
    sameSite: 'lax', // Allow cross-subdomain navigation
    path: '/',
  },
};
```

#### 2.2 Update Controllers
```javascript
// backend/src/controllers/auth/tenantAuthController.js
export async function login(req, res) {
  const { email, password } = req.body;
  
  // Authenticate user
  const user = await TenantUser.authenticate(email, password);
  
  // Generate tokens
  const accessToken = jwt.sign(
    { id: user.id, type: 'tenant', organizationId: user.organization_id },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { id: user.id, type: 'tenant', organizationId: user.organization_id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  // Set httpOnly cookies (SSO-enabled domain)
  res.cookie(AUTH_CONFIG.tenant.cookieName, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: AUTH_CONFIG.tenant.sameSite,
    domain: AUTH_CONFIG.tenant.domain, // .recruitiq.com for SSO
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  
  res.cookie(AUTH_CONFIG.tenant.refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: AUTH_CONFIG.tenant.sameSite,
    domain: AUTH_CONFIG.tenant.domain,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  
  // Return user data (no tokens in response body)
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      type: 'tenant',
      organizationId: user.organization_id,
      enabledProducts: user.enabled_products,
      productRoles: user.product_roles,
    },
  });
}
```

#### 2.3 Update Middleware
```javascript
// backend/src/middleware/auth.js
export const authenticateTenant = async (req, res, next) => {
  try {
    // Read tenant-specific cookie
    const token = req.cookies[AUTH_CONFIG.tenant.cookieName];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify token type
    if (decoded.type !== 'tenant') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token type. Tenant access required.',
      });
    }
    
    // Get user from database
    const user = await TenantUser.findById(decoded.id, decoded.organizationId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }
    
    // Set PostgreSQL RLS context
    await db.query('SELECT set_config($1, $2, true)', [
      'app.current_organization_id',
      decoded.organizationId,
    ]);
    
    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      type: 'tenant',
      organizationId: user.organization_id,
      enabledProducts: user.enabled_products || [],
      productRoles: user.product_roles || {},
    };
    
    next();
  } catch (error) {
    logger.error('Tenant authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};
```

#### 2.4 Environment Variables
```bash
# .env.production
TENANT_COOKIE_DOMAIN=.recruitiq.com
PLATFORM_COOKIE_DOMAIN=portal.recruitiq.com

# .env.development
TENANT_COOKIE_DOMAIN=.app.local
PLATFORM_COOKIE_DOMAIN=app.local
```

#### 2.5 Testing
```bash
# Test tenant auth endpoints
curl -X POST http://localhost:3001/api/auth/tenant/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt

# Verify cookies set correctly
cat cookies.txt

# Test authenticated endpoint
curl -X GET http://localhost:3001/api/auth/tenant/me \
  -b cookies.txt
```

#### 2.6 Acceptance Criteria
- [ ] Separate cookie names for platform vs tenant
- [ ] Tenant cookies use SSO-compatible domain
- [ ] Platform cookies use isolated domain
- [ ] Middleware correctly reads respective cookies
- [ ] Session validation works across subdomains (tenant)
- [ ] All auth endpoints return consistent responses
- [ ] CSRF token endpoint works with cookie auth

---

## Phase 3: Portal Migration

**Goal:** Migrate Portal from Bearer token to cookie-based auth (platform users, no SSO)

### Current Issues
1. Bearer tokens in localStorage (XSS vulnerability)
2. Manual token refresh logic
3. CSRF protection bypassed by Bearer tokens
4. Not aligned with tenant auth system

### Migration Steps

#### 3.1 Update AuthContext
```javascript
// apps/portal/src/contexts/AuthContext.jsx

import apiService from '../services/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Validate session via httpOnly cookie
        const userData = await apiService.getMe();
        
        // Verify platform user with portal access
        if (userData.user_type === 'platform' && userData.permissions?.includes('portal.view')) {
          setUser(userData);
        }
      } catch (error) {
        // No valid session
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await apiService.login(email, password);
      
      // Check if MFA is required
      if (response.mfaRequired) {
        return {
          mfaRequired: true,
          mfaToken: response.mfaToken,
        };
      }
      
      const userData = response.user;
      
      // Verify platform user
      if (userData.user_type !== 'platform') {
        throw new Error('Access denied. This portal is for platform administrators only.');
      }
      
      if (!userData.permissions?.includes('portal.view')) {
        throw new Error('Access denied. You do not have permission to access this portal.');
      }
      
      setUser(userData);
      return userData;
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    await apiService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### 3.2 Update API Service
```javascript
// apps/portal/src/services/api.js

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

let csrfToken = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // CRITICAL: Send httpOnly cookies
});

// Request interceptor for CSRF tokens
api.interceptors.request.use(
  async (config) => {
    const mutatingMethods = ['post', 'put', 'patch', 'delete'];
    if (config.method && mutatingMethods.includes(config.method.toLowerCase())) {
      // Lazy fetch CSRF token
      if (!csrfToken && !config.url?.includes('/csrf-token')) {
        try {
          const csrfResponse = await axios.get(`${API_BASE_URL}/csrf-token`, {
            withCredentials: true,
          });
          csrfToken = csrfResponse.data?.csrfToken;
        } catch (err) {
          console.warn('Failed to fetch CSRF token:', err);
        }
      }
      
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    const skipRefreshUrls = ['/auth/platform/login', '/auth/platform/refresh', '/auth/platform/logout'];
    const shouldSkipRefresh = skipRefreshUrls.some((url) => originalRequest.url?.includes(url));
    
    if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
      originalRequest._retry = true;
      
      try {
        // Refresh token (httpOnly cookie sent automatically)
        await axios.post(`${API_BASE_URL}/auth/platform/refresh`, {}, {
          withCredentials: true,
        });
        
        // Fetch fresh CSRF token
        const csrfResponse = await axios.get(`${API_BASE_URL}/csrf-token`, {
          withCredentials: true,
        });
        csrfToken = csrfResponse.data?.csrfToken;
        
        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?reason=session_expired';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

class APIService {
  async login(email, password) {
    const response = await api.post('/auth/platform/login', { email, password });
    return response.data;
  }

  async logout() {
    await api.post('/auth/platform/logout', {});
    csrfToken = null;
  }

  async getMe() {
    const response = await api.get('/auth/platform/me');
    return response.data.user;
  }

  // ... rest of API methods
}

export default new APIService();
```

#### 3.3 Remove localStorage Usage
```bash
# Search for localStorage usage in Portal
cd apps/portal
grep -r "localStorage" src/

# Replace all localStorage token storage
# (Should be none after migration)
```

#### 3.4 Testing Checklist
- [ ] Login works and sets httpOnly cookies
- [ ] Session persists across page refreshes
- [ ] CSRF tokens are fetched and sent with mutations
- [ ] Token refresh works automatically
- [ ] Logout clears cookies
- [ ] No tokens in localStorage
- [ ] Portal remains isolated from tenant apps (no SSO)
- [ ] MFA flow works correctly

---

## Phase 4: Nexus Migration

**Goal:** Migrate Nexus to use updated `@recruitiq/auth` with SSO enabled

### Migration Steps

#### 4.1 Update Dependencies
```bash
cd apps/nexus

# Ensure using latest packages
pnpm update @recruitiq/auth @recruitiq/api-client
```

#### 4.2 Update main.tsx
```typescript
// apps/nexus/src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@recruitiq/auth'; // Use shared package
import { RecruitIQPlatformAPI } from '@recruitiq/api-client';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Initialize API client with cookie support
const apiClient = new RecruitIQPlatformAPI({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider apiClient={apiClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </AuthProvider>
  </React.StrictMode>
);
```

#### 4.3 Update Login Component
```typescript
// apps/nexus/src/pages/Login.tsx

import { useAuth } from '@recruitiq/auth';

export function Login() {
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await login(email, password);
      
      // Check if MFA required
      if (typeof result === 'object' && result.mfaRequired) {
        // Show MFA input
        setShowMFA(true);
        setMFAToken(result.mfaToken);
        return;
      }
      
      // Login successful - redirect
      navigate('/dashboard');
    } catch (err) {
      // Error handled by AuthContext
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Login form */}
    </form>
  );
}
```

#### 4.4 Test SSO Flow
```bash
# Start all tenant apps
pnpm dev:paylinq  # Port 5174
pnpm dev:nexus    # Port 5175

# Manual test:
# 1. Login to PayLinQ
# 2. Open Nexus in same browser
# 3. Should be automatically logged in (SSO)

# Note: In dev, ports prevent cookie sharing
# Need nginx reverse proxy for true SSO testing
```

#### 4.5 Acceptance Criteria
- [ ] Nexus uses `@recruitiq/auth` package
- [ ] Cookie-based authentication works
- [ ] CSRF protection functional
- [ ] SSO works with PayLinQ (after nginx setup)
- [ ] Session validation on mount works
- [ ] No Bearer token usage
- [ ] All protected routes work

---

## Phase 5: RecruitIQ & ScheduleHub

**Goal:** Implement cookie-based auth from scratch with SSO enabled

### Implementation Steps

#### 5.1 Setup AuthProvider
```typescript
// apps/recruitiq/src/main.tsx (same for ScheduleHub)

import { AuthProvider } from '@recruitiq/auth';
import { RecruitIQPlatformAPI } from '@recruitiq/api-client';

const apiClient = new RecruitIQPlatformAPI({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider apiClient={apiClient}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

#### 5.2 Implement Login Page
```typescript
// apps/recruitiq/src/pages/Login.tsx

import { useAuth } from '@recruitiq/auth';

export function Login() {
  const { login, error, isLoading } = useAuth();
  
  // Same pattern as Nexus/PayLinQ
  // ... login form implementation
}
```

#### 5.3 Implement Protected Routes
```typescript
// apps/recruitiq/src/App.tsx

import { ProtectedRoute } from '@recruitiq/auth';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}
```

#### 5.4 Acceptance Criteria
- [ ] Authentication works with cookies
- [ ] SSO works with PayLinQ/Nexus
- [ ] CSRF protection enabled
- [ ] Session management functional
- [ ] MFA support integrated
- [ ] All security checks pass

---

## SSO Cross-Domain Setup

### Development Environment (Nginx)

**Problem:** `localhost:5174` and `localhost:5175` cannot share cookies

**Solution:** Nginx reverse proxy

```nginx
# /etc/nginx/sites-available/recruitiq-dev

server {
    listen 80;
    server_name app.local;

    # PayLinQ
    location /paylinq/ {
        proxy_pass http://localhost:5174/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cookie_domain localhost app.local;
        proxy_cookie_path / /paylinq;
    }

    # Nexus
    location /nexus/ {
        proxy_pass http://localhost:5175/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cookie_domain localhost app.local;
        proxy_cookie_path / /nexus;
    }

    # RecruitIQ
    location /recruitiq/ {
        proxy_pass http://localhost:5176/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cookie_domain localhost app.local;
        proxy_cookie_path / /recruitiq;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Setup:**
```bash
# Install nginx (macOS)
brew install nginx

# Add to /etc/hosts
127.0.0.1 app.local

# Copy nginx config
sudo cp nginx-dev.conf /etc/nginx/sites-available/recruitiq-dev
sudo ln -s /etc/nginx/sites-available/recruitiq-dev /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo nginx -s reload

# Access apps
# http://app.local/paylinq
# http://app.local/nexus
# http://app.local/recruitiq
```

### Production Environment

**DNS Configuration:**
```
paylinq.recruitiq.com     → PayLinQ app
nexus.recruitiq.com       → Nexus app
recruitiq.recruitiq.com   → RecruitIQ app
schedulehub.recruitiq.com → ScheduleHub app
portal.recruitiq.com      → Portal (platform, no SSO)
api.recruitiq.com         → Backend API
```

**Cookie Domain:**
```javascript
// Tenant apps (SSO enabled)
domain: '.recruitiq.com'  // Leading dot allows all subdomains

// Platform app (no SSO)
domain: 'portal.recruitiq.com'  // Specific domain only
```

**Nginx Configuration:**
```nginx
# Production nginx
server {
    listen 443 ssl http2;
    server_name *.recruitiq.com;

    ssl_certificate /etc/letsencrypt/live/recruitiq.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/recruitiq.com/privkey.pem;

    # Tenant apps (SSO)
    location / {
        proxy_pass http://tenant_apps;
        proxy_cookie_domain tenant_apps .recruitiq.com;
    }
}

server {
    listen 443 ssl http2;
    server_name portal.recruitiq.com;

    # Platform app (no SSO)
    location / {
        proxy_pass http://portal_app;
        proxy_cookie_domain portal_app portal.recruitiq.com;
    }
}
```

---

## Security Considerations

### Cookie Security Checklist

- [ ] **httpOnly**: Prevents JavaScript access (XSS protection)
- [ ] **secure**: HTTPS only in production
- [ ] **sameSite**: `Strict` for platform, `Lax` for tenant (SSO compatibility)
- [ ] **domain**: `.recruitiq.com` for tenant (SSO), `portal.recruitiq.com` for platform
- [ ] **signed**: Sign cookies to prevent tampering
- [ ] **maxAge**: 15 minutes for access token, 7 days for refresh token

### CSRF Protection

- [ ] CSRF tokens required for all state-changing operations
- [ ] Tokens synchronized across SSO apps
- [ ] Tokens refreshed after token rotation
- [ ] Proper error handling for invalid tokens

### Session Management

- [ ] Session timeout: 15 minutes of inactivity
- [ ] Absolute session timeout: 24 hours
- [ ] Concurrent session detection
- [ ] Session revocation on logout
- [ ] Session revocation on password change

### Token Security

- [ ] Short-lived access tokens (15 minutes)
- [ ] Long-lived refresh tokens (7 days)
- [ ] Automatic token rotation
- [ ] Token revocation list (blacklist)
- [ ] Different signing keys for platform vs tenant

### Audit Trail

- [ ] Log all authentication events
- [ ] Log SSO navigations
- [ ] Log session creation/revocation
- [ ] Log failed login attempts
- [ ] Log MFA events

---

## Testing Strategy

### Unit Tests

**Package Tests:**
```bash
cd packages/auth
npm test

# Test AuthContext
# Test useAuth hook
# Test ProtectedRoute component
```

**API Client Tests:**
```bash
cd packages/api-client
npm test

# Test cookie handling
# Test CSRF token interceptor
# Test token refresh logic
```

### Integration Tests

**Backend Tests:**
```bash
cd backend
npm test tests/integration/auth-cookie.test.js

# Test login sets cookies correctly
# Test authenticated requests send cookies
# Test CSRF protection works
# Test token refresh works
# Test logout clears cookies
```

**SSO Tests:**
```bash
# Test SSO flow
npm test tests/integration/sso.test.js

# Test login to PayLinQ → Nexus auto-login
# Test logout from Nexus → PayLinQ auto-logout
# Test session synchronization
# Test cross-app navigation
```

### End-to-End Tests

**Playwright Tests:**
```typescript
// apps/paylinq/e2e/auth-sso.spec.ts

test('SSO flow: Login to PayLinQ, navigate to Nexus', async ({ page }) => {
  // Login to PayLinQ
  await page.goto('http://app.local/paylinq/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://app.local/paylinq/dashboard');

  // Navigate to Nexus - should be auto-logged in
  await page.goto('http://app.local/nexus');
  await expect(page).toHaveURL('http://app.local/nexus/dashboard');
  await expect(page.locator('text=Welcome')).toBeVisible();
});

test('SSO flow: Logout from Nexus affects PayLinQ', async ({ page }) => {
  // Login and navigate to Nexus
  // ...

  // Logout from Nexus
  await page.click('button[aria-label="Logout"]');

  // Navigate to PayLinQ - should redirect to login
  await page.goto('http://app.local/paylinq/dashboard');
  await expect(page).toHaveURL(/.*\/login/);
});
```

### Security Tests

**OWASP ZAP Scan:**
```bash
# Run automated security scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://app.local \
  -r zap-report.html
```

**Manual Security Checklist:**
- [ ] XSS: Try injecting `<script>alert('XSS')</script>` in inputs
- [ ] CSRF: Try state-changing request without CSRF token
- [ ] Session fixation: Try reusing old session ID
- [ ] Cookie theft: Verify httpOnly prevents JavaScript access
- [ ] Token tampering: Try modifying JWT token
- [ ] Privilege escalation: Try accessing admin routes as regular user

---

## Rollback Plan

### Per-Phase Rollback

**Phase 1 (Package):**
```bash
# Revert package changes
cd packages/auth
git checkout backup/auth-package-pre-migration

# Rebuild
pnpm install
pnpm build
```

**Phase 2 (Backend):**
```bash
# Revert backend changes
cd backend
git revert HEAD~5..HEAD  # Revert last 5 commits

# Restart server
pm2 restart backend
```

**Phase 3-5 (Frontend Apps):**
```bash
# Revert specific app
cd apps/portal  # or nexus, recruitiq, schedulehub
git revert HEAD~3..HEAD

# Rebuild and redeploy
pnpm build
# Deploy old build
```

### Emergency Rollback (All Phases)

```bash
# Tag current production before migration
git tag pre-auth-migration

# If migration fails catastrophically
git checkout pre-auth-migration

# Rebuild and redeploy everything
pnpm install
pnpm build
# Deploy to production
```

### Database Rollback

```sql
-- If session table changes were made
-- Backup before migration
pg_dump recruitiq_prod > backup_pre_auth_migration.sql

-- Restore if needed
psql recruitiq_prod < backup_pre_auth_migration.sql
```

---

## Timeline & Milestones

### Week 1: Planning & Preparation
- [ ] Review migration plan with team
- [ ] Set up development environment (nginx)
- [ ] Backup production database
- [ ] Create feature branch: `feature/auth-cookie-migration`

### Week 2: Phase 1 (Package Consolidation)
- [ ] Update `@recruitiq/auth` package
- [ ] Update `@recruitiq/api-client` package
- [ ] Write comprehensive tests
- [ ] Test with PayLinQ (regression)
- [ ] Code review

### Week 3: Phase 2 (Backend Alignment)
- [ ] Separate cookie names
- [ ] Update auth controllers
- [ ] Update auth middleware
- [ ] Add SSO domain configuration
- [ ] Integration tests
- [ ] Code review

### Week 4: Phase 3 (Portal Migration)
- [ ] Update Portal AuthContext
- [ ] Update Portal API service
- [ ] Remove localStorage usage
- [ ] End-to-end testing
- [ ] Deploy to staging
- [ ] User acceptance testing

### Week 5: Phase 4 (Nexus Migration)
- [ ] Migrate Nexus to new package
- [ ] Test SSO with PayLinQ
- [ ] End-to-end testing
- [ ] Deploy to staging
- [ ] User acceptance testing

### Week 6: Phase 5 (RecruitIQ & ScheduleHub)
- [ ] Implement auth for RecruitIQ
- [ ] Implement auth for ScheduleHub
- [ ] Test SSO across all tenant apps
- [ ] End-to-end testing
- [ ] Deploy to staging
- [ ] User acceptance testing

### Week 7: Production Deployment
- [ ] Final security audit
- [ ] Load testing
- [ ] Deploy to production (off-peak hours)
- [ ] Monitor for issues
- [ ] Rollback plan ready

### Week 8: Post-Migration Monitoring
- [ ] Monitor error rates
- [ ] Monitor session metrics
- [ ] Monitor SSO usage
- [ ] Gather user feedback
- [ ] Address issues
- [ ] Documentation updates

---

## Success Criteria

### Technical Success Metrics

- [ ] Zero security vulnerabilities in production
- [ ] 100% of apps using cookie-based auth
- [ ] SSO works seamlessly between tenant apps
- [ ] CSRF protection enabled for all mutations
- [ ] Session management functional
- [ ] MFA support integrated
- [ ] Token refresh works automatically
- [ ] Logout works across all apps (tenant SSO)
- [ ] Performance: Auth checks <50ms
- [ ] Availability: 99.9% uptime during migration

### User Experience Metrics

- [ ] Zero user complaints about auth issues
- [ ] SSO adoption rate >80%
- [ ] Login success rate >95%
- [ ] Average login time <2 seconds
- [ ] Session timeout complaints <5%
- [ ] User satisfaction score ≥4.5/5

### Documentation & Knowledge Transfer

- [ ] Migration plan documented (this document)
- [ ] Architecture diagrams updated
- [ ] API documentation updated
- [ ] Developer guide for new auth system
- [ ] Runbook for troubleshooting auth issues
- [ ] Training session for support team

---

## Appendix

### A. Cookie vs Bearer Token Comparison

| Feature | Bearer Token (Old) | httpOnly Cookie (New) |
|---------|-------------------|----------------------|
| **Storage** | localStorage (XSS vulnerable) | httpOnly cookie (XSS protected) |
| **CSRF Protection** | Not needed (but then no defense) | Required (defense in depth) |
| **Auto-sent** | No (manual Authorization header) | Yes (browser handles) |
| **SSO Support** | Hard to implement | Native with shared domain |
| **Logout** | Client-side only | Server-side invalidation |
| **Mobile Apps** | Easy | Requires extra work |
| **Web Apps** | Manual management | Automatic |
| **Security** | Lower | Higher |
| **Industry Standard** | Deprecated for web | Recommended for web |

### B. Resources

**Industry Standards:**
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [IETF HTTP State Management (Cookies)](https://datatracker.ietf.org/doc/html/rfc6265)

**Internal Documentation:**
- [Backend Standards](./docs/BACKEND_STANDARDS.md)
- [Security Standards](./docs/SECURITY_STANDARDS.md)
- [Testing Standards](./docs/TESTING_STANDARDS.md)

### C. Glossary

- **SSO (Single Sign-On)**: Login once, access multiple apps
- **httpOnly Cookie**: Cookie that cannot be accessed by JavaScript
- **CSRF (Cross-Site Request Forgery)**: Attack where malicious site tricks user's browser
- **Token Rotation**: Replacing tokens periodically for security
- **Session Timeout**: Automatic logout after inactivity
- **RLS (Row-Level Security)**: PostgreSQL security feature for multi-tenancy

---

## Approval & Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tech Lead | ___________ | ___________ | ___________ |
| Security Lead | ___________ | ___________ | ___________ |
| Product Manager | ___________ | ___________ | ___________ |
| DevOps Lead | ___________ | ___________ | ___________ |

---

**END OF MIGRATION PLAN**
