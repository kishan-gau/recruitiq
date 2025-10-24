# RecruitIQ Architecture Analysis
**Date:** October 24, 2025  
**Version:** 1.0  
**Status:** Current State Analysis

---

## Executive Summary

RecruitIQ is a modern recruitment management system built with React that currently operates as a **client-side application with localStorage persistence**. The application features a sophisticated **multi-workspace architecture** that serves as an excellent foundation for future deployment models:

1. **Multi-Tenant Cloud (SaaS)** - Shared infrastructure, multiple organizations
2. **Single-Tenant Cloud** - Dedicated cloud instance per organization  
3. **On-Premise** - Self-hosted on customer infrastructure

This document analyzes the current architecture and provides a roadmap for evolving it to support all three deployment models while maintaining code reusability and minimizing technical debt.

---

## Current Technology Stack

### Frontend
- **Framework:** React 18.2.0
- **Router:** React Router DOM 6.14.1
- **State Management:** Context API (no Redux/Zustand)
- **Styling:** Tailwind CSS 3.4.18
- **Animations:** Framer Motion 10.18.0
- **Build Tool:** Vite 5.0.0
- **Testing:** Vitest 3.2.4 + Playwright 1.56.1

### Backend (Current)
- **Data Storage:** Browser localStorage (JSON)
- **API:** Optional mock Express server (development only)
- **Authentication:** Client-side only (localStorage tokens)

### Backend (Planned)
- **Runtime:** Node.js + Express
- **Database:** PostgreSQL (recommended) or MySQL
- **Authentication:** JWT + OAuth2 / SAML
- **File Storage:** S3-compatible (AWS S3, MinIO for on-premise)
- **Caching:** Redis
- **API:** RESTful + GraphQL (optional)

---

## Architecture Layers

### 1. Presentation Layer (UI Components)
```
src/components/
├── Core UI Components (Card, Modal, ConfirmDialog, etc.)
├── Feature Components (JobForm, CandidateForm, etc.)
├── Layout Components (Layout, PublicLayout, Sidebar, etc.)
└── Icon System (SVG Sprite + SpriteIcon wrapper)
```

**Analysis:**
- ✅ Well-organized component structure
- ✅ Reusable UI primitives
- ✅ Separation of concerns (public vs authenticated layouts)
- ⚠️ No component library (builds from scratch)
- ⚠️ Limited accessibility features

### 2. Business Logic Layer (Contexts)
```
src/context/
├── AuthContext.jsx          # User authentication & roles
├── WorkspaceContext.jsx     # Multi-tenancy foundation
├── DataContext.jsx          # CRUD operations
├── FlowContext.jsx          # Workflow templates
└── ToastContext.jsx         # User notifications
```

**Analysis:**
- ✅ Context API provides good separation
- ✅ WorkspaceContext already implements tenant isolation
- ✅ Prepared for API integration (window.RECRUITIQ_API flag)
- ⚠️ No organization layer above workspaces
- ⚠️ Direct localStorage coupling

### 3. Data Access Layer (Currently Mixed)
```
Current: Context → localStorage
Future:  Context → API Client → Backend → Database
```

**Analysis:**
- ✅ DataContext has API-ready patterns (`if(window.RECRUITIQ_API)`)
- ✅ Async/await already in place
- ⚠️ No centralized API client
- ⚠️ No request/response interceptors
- ⚠️ No error handling strategy

### 4. Routing Layer
```
src/App.jsx
├── Public Routes    # /apply/:jobId, /track/:code, /careers/:orgId
├── Applicant Routes # /applicant/signup, /applicant/login, /applicant/dashboard
└── Recruiter Routes # /, /jobs, /candidates, /pipeline, /profile
```

**Analysis:**
- ✅ Role-based routing (recruiters, applicants, public)
- ✅ Protected route wrappers
- ✅ Public career portal for candidate applications
- ⚠️ No route-level permissions (e.g., admin-only routes)
- ⚠️ No dynamic route loading

---

## Data Model Analysis

### Current Hierarchy
```
User (AuthContext)
  └── Workspaces (WorkspaceContext)
       ├── Jobs (DataContext)
       ├── Candidates (DataContext)
       └── Flow Templates (FlowContext)
```

### Required Hierarchy for Multi-Tenancy
```
Organization (NEW - Tenant)
  ├── License (NEW)
  ├── Subscription (NEW)
  ├── Users
  │    └── Roles (admin, recruiter, viewer)
  └── Workspaces
       ├── Jobs
       ├── Candidates
       ├── Interviews
       ├── Flow Templates
       └── Applicants (NEW)
```

### Storage Keys Pattern

**Current:**
```javascript
recruitiq_{workspaceId}_{resource}
// Example: recruitiq_default_data, recruitiq_workspace_123_data
```

**Proposed (Multi-Tenant):**
```javascript
recruitiq_{organizationId}_{workspaceId}_{resource}
// Example: recruitiq_org_acme_workspace_hr_data
```

**Proposed (Database):**
```sql
-- Row-level security
SELECT * FROM jobs WHERE organization_id = current_org_id();
```

---

## Multi-Tenancy Readiness Assessment

### ✅ Strengths (Already Implemented)

1. **Workspace Isolation**
   - WorkspaceContext provides complete data segregation
   - Each workspace has independent localStorage namespace
   - Workspace switching triggers full data reload
   - Users can belong to multiple workspaces

2. **Role-Based Access**
   - AuthContext supports roles (recruiter, applicant)
   - Route protection based on authentication
   - User role determines accessible features

3. **Data Scoping**
   - All CRUD operations are workspace-aware
   - FlowContext scopes templates to current workspace
   - DataContext uses getStorageKey() for isolation

4. **Public Portal**
   - Separate public routes for candidate applications
   - Organization-scoped career pages (/careers/:orgId)
   - Applicant accounts with profile management

### ⚠️ Gaps (Needs Implementation)

1. **No Organization Entity**
   - Workspaces exist independently
   - No parent tenant/organization concept
   - Can't group workspaces under one billing entity

2. **No License Management**
   - No license validation
   - No feature flags or usage limits
   - No tier-based restrictions

3. **No Usage Tracking**
   - Can't measure active users
   - No storage/API usage metrics
   - No audit logs

4. **No Subscription Management**
   - No billing integration
   - No payment processing
   - No subscription lifecycle

5. **No Admin Panel**
   - Can't manage users centrally
   - No super-admin role
   - No organization settings

6. **Authentication Limitations**
   - No SSO/SAML support
   - No multi-factor authentication
   - Passwords stored in plain text (localStorage)
   - No session management

---

## Security Analysis

### Current State

**Authentication:**
- ✅ Separate login flows (recruiters vs applicants)
- ✅ Session persistence via localStorage
- ⚠️ No password hashing
- ⚠️ No token expiration
- ⚠️ No refresh tokens

**Authorization:**
- ✅ Role-based route protection
- ⚠️ No granular permissions
- ⚠️ No workspace-level permissions

**Data Security:**
- ✅ Workspace-scoped data access
- ⚠️ All data stored in browser (XSS risk)
- ⚠️ No encryption at rest
- ⚠️ No data retention policies

### Required for Production

1. **Server-Side Authentication**
   - JWT tokens with expiration
   - Refresh token rotation
   - Password hashing (bcrypt/argon2)
   - Rate limiting on login attempts

2. **Authorization Framework**
   - Role-based access control (RBAC)
   - Permission-based actions
   - Resource-level permissions
   - Workspace membership validation

3. **Data Protection**
   - HTTPS only
   - Encryption at rest (database)
   - Encryption in transit (TLS 1.3)
   - GDPR compliance (data deletion, exports)
   - Audit logging

4. **Network Security**
   - CORS policies
   - CSRF protection
   - XSS prevention (Content Security Policy)
   - SQL injection prevention (parameterized queries)
   - API rate limiting

---

## Scalability Considerations

### Current Limitations

1. **Client-Side Storage**
   - Limited to ~10MB localStorage
   - No data sharing across devices
   - Performance degrades with large datasets
   - No concurrent user support

2. **No Caching Strategy**
   - Every page load re-parses JSON
   - No intelligent data fetching
   - No optimistic updates with rollback

3. **No Real-Time Features**
   - No WebSocket support
   - No collaborative editing
   - No live notifications

### Scalability Path

**Phase 1: API Migration (Months 1-2)**
- Move from localStorage to REST API
- Implement data pagination
- Add request caching (React Query or SWR)

**Phase 2: Database Optimization (Months 3-4)**
- Add database indexes
- Implement query optimization
- Add read replicas for reporting

**Phase 3: Caching Layer (Months 5-6)**
- Redis for session storage
- Cache frequently accessed data
- Implement cache invalidation strategies

**Phase 4: Real-Time Features (Months 7-8)**
- WebSocket server for live updates
- Pub/sub for multi-instance support
- Optimistic UI updates

**Phase 5: Horizontal Scaling (Months 9-12)**
- Load balancer setup
- Stateless application servers
- CDN for static assets
- Database sharding (if needed)

---

## File Structure Overview

```
recruitiq/
├── src/
│   ├── components/       # 20+ UI components
│   │   ├── icons/        # SVG icon system
│   │   └── __tests__/    # Component tests
│   ├── context/          # 5 context providers
│   ├── pages/            # 15+ page components
│   │   ├── applicant/    # Applicant portal pages
│   │   └── public/       # Public career portal
│   ├── utils/            # Utility functions
│   ├── App.jsx           # Router configuration
│   ├── main.jsx          # App initialization
│   └── mockData.js       # Sample data generator
├── server/               # Optional dev server
│   ├── server.js         # Express mock API
│   └── db.json           # Mock database
├── e2e/                  # Playwright tests
├── playwright/           # Visual regression tests
└── public/               # Static assets
```

**Code Metrics:**
- Total Components: ~35
- Total Contexts: 5
- Total Pages: ~18
- Total Tests: ~15
- Lines of Code: ~8,000+ (estimated)

---

## Next Steps

See companion documents for detailed implementation plans:

1. **ARCHITECTURE_MIGRATION_PLAN.md** - Step-by-step migration from localStorage to backend
2. **ARCHITECTURE_MULTI_TENANT.md** - Multi-tenancy implementation guide
3. **ARCHITECTURE_DEPLOYMENT_MODELS.md** - Deployment-specific configurations
4. **ARCHITECTURE_API_DESIGN.md** - API endpoints and data contracts
5. **ARCHITECTURE_SECURITY_PLAN.md** - Security implementation roadmap

---

**Document Status:** ✅ Complete  
**Last Updated:** October 24, 2025  
**Next Review:** After Phase 1 Implementation
