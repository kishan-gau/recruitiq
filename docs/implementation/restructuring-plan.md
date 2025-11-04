# Code Restructuring Plan: Monolith to Multi-Product Architecture

**Document Version:** 1.0  
**Last Updated:** November 3, 2025  
**Status:** Planning  
**Author:** Development Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Structure Analysis](#current-structure-analysis)
3. [Target Architecture](#target-architecture)
4. [Backend Restructuring](#backend-restructuring)
5. [Frontend Restructuring](#frontend-restructuring)
6. [Database Migration Strategy](#database-migration-strategy)
7. [File-by-File Migration Mapping](#file-by-file-migration-mapping)
8. [Migration Phases](#migration-phases)
9. [Testing Strategy](#testing-strategy)
10. [Rollback Plan](#rollback-plan)

---

## 1. Executive Summary

### Objective
Transform the current monolithic RecruitIQ application into a multi-product SaaS platform supporting three distinct products:
- **RecruitIQ** (Recruitment Management)
- **Paylinq** (Payroll Management) - New product
- **Nexus** (HRIS) - New product

### Approach
**Incremental migration** with zero downtime, maintaining backward compatibility throughout the process.

### Key Metrics
- **Current Backend Files:** ~150 files in monolithic structure
- **Current Frontend Components:** ~40 RecruitIQ + ~5 Portal components
- **Target Backend Products:** 4 products (RecruitIQ, Paylinq, Nexus, Core)
- **Target Frontend Apps:** 4 apps (RecruitIQ, Paylinq, Nexus, Portal)
- **Estimated Migration Time:** 8-12 weeks
- **Estimated Effort:** 640-800 developer hours

### Success Criteria
- ✅ Zero data loss during migration
- ✅ Zero downtime for existing customers
- ✅ All existing features continue to work
- ✅ Clear product boundaries established
- ✅ Shared code properly extracted
- ✅ New products can be developed independently

---

## 2. Current Structure Analysis

### 2.1 Current Backend Structure

```
backend/
├── src/
│   ├── server.js                      # Main entry point
│   ├── config/                        # Configuration files (5 files)
│   ├── controllers/                   # Request handlers (16 files)
│   ├── services/                      # Business logic (30+ files)
│   ├── routes/                        # API routes (17 files)
│   ├── middleware/                    # Express middleware (15+ files)
│   ├── models/                        # Database models (legacy)
│   ├── repositories/                  # Data access layer (minimal)
│   ├── modules/                       # Feature modules (license, permissions)
│   ├── database/                      # Database utilities
│   ├── integrations/                  # External integrations (2 files)
│   ├── shared/                        # Shared utilities
│   └── utils/                         # Utility functions (10+ files)
├── tests/                             # Test files
├── package.json
└── docker-compose.yml
```

**Problems with Current Structure:**
- ❌ All features mixed together (recruitment, portal, future products)
- ❌ No clear product boundaries
- ❌ Difficult to assign ownership
- ❌ Hard to scale teams
- ❌ Tight coupling between features
- ❌ Cannot deploy products independently

### 2.2 Current Frontend Structure

```
recruitiq/                             # Recruitment app
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/                    # 40+ components (all recruitment)
│   ├── pages/                         # 15+ pages
│   ├── services/                      # API clients
│   ├── context/                       # React context
│   ├── hooks/                         # Custom hooks
│   └── utils/                         # Utilities
├── package.json
└── vite.config.js

portal/                                # Admin portal
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/                    # 5 components (license, MFA)
│   ├── pages/                         # 7+ pages
│   ├── services/                      # API clients
│   ├── contexts/                      # React context
│   └── utils/                         # Utilities
├── package.json
└── vite.config.js
```

**Problems with Current Structure:**
- ❌ Two separate React apps (not a monorepo)
- ❌ Duplicated code (auth, MFA, layouts)
- ❌ No shared component library
- ❌ Inconsistent styling and UX
- ❌ Difficult to share types/interfaces
- ❌ Separate build pipelines

---

## 3. Target Architecture

### 3.1 Target Backend Structure

```
backend/
├── src/
│   ├── server.js                      # Main entry point (orchestrator)
│   │
│   ├── products/                      # Product-specific code
│   │   ├── recruitiq/                 # RecruitIQ product
│   │   │   ├── controllers/           # Recruitment controllers
│   │   │   ├── services/              # Recruitment business logic
│   │   │   ├── routes/                # Recruitment routes
│   │   │   ├── repositories/          # Recruitment data access
│   │   │   ├── models/                # Recruitment domain models
│   │   │   ├── validators/            # Input validation
│   │   │   ├── events/                # Event handlers
│   │   │   └── index.js               # Product exports
│   │   │
│   │   ├── paylinq/                   # Paylinq product (NEW)
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── routes/
│   │   │   ├── repositories/
│   │   │   ├── models/
│   │   │   ├── validators/
│   │   │   ├── events/
│   │   │   └── index.js
│   │   │
│   │   ├── nexus/                     # Nexus product (NEW)
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── routes/
│   │   │   ├── repositories/
│   │   │   ├── models/
│   │   │   ├── validators/
│   │   │   ├── events/
│   │   │   └── index.js
│   │   │
│   │   └── portal/                    # Portal product
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── routes/
│   │       ├── repositories/
│   │       └── index.js
│   │
│   ├── core/                          # Shared/Core functionality
│   │   ├── auth/                      # Authentication & authorization
│   │   │   ├── authService.js
│   │   │   ├── jwtService.js
│   │   │   ├── mfaService.js
│   │   │   ├── passwordService.js
│   │   │   └── sessionService.js
│   │   │
│   │   ├── database/                  # Database utilities
│   │   │   ├── connection.js
│   │   │   ├── migrations/
│   │   │   ├── seeds/
│   │   │   └── queryBuilder.js
│   │   │
│   │   ├── middleware/                # Shared middleware
│   │   │   ├── authenticate.js
│   │   │   ├── authorize.js
│   │   │   ├── errorHandler.js
│   │   │   ├── rateLimit.js
│   │   │   ├── validation.js
│   │   │   └── audit.js
│   │   │
│   │   ├── security/                  # Security utilities
│   │   │   ├── encryption.js
│   │   │   ├── secretsManager.js
│   │   │   ├── ipTracking.js
│   │   │   ├── accountLockout.js
│   │   │   └── securityMonitor.js
│   │   │
│   │   ├── events/                    # Event bus
│   │   │   ├── EventBus.js
│   │   │   ├── EventEmitter.js
│   │   │   └── eventTypes.js
│   │   │
│   │   ├── queue/                     # Message queue
│   │   │   ├── QueueService.js
│   │   │   ├── processors/
│   │   │   └── jobs/
│   │   │
│   │   ├── integrations/              # External integrations
│   │   │   ├── cloudwatch.js
│   │   │   ├── datadog.js
│   │   │   ├── storage/
│   │   │   │   ├── fileStorage.js
│   │   │   │   └── s3Client.js
│   │   │   └── webhooks/
│   │   │       ├── WebhookService.js
│   │   │       └── handlers/
│   │   │
│   │   ├── infrastructure/            # Infrastructure services
│   │   │   ├── vpsManager.js
│   │   │   ├── transip.js
│   │   │   └── provisioning.js
│   │   │
│   │   └── utils/                     # Shared utilities
│   │       ├── logger.js
│   │       ├── validator.js
│   │       ├── emailService.js
│   │       ├── dateUtils.js
│   │       └── helpers.js
│   │
│   └── config/                        # Configuration
│       ├── index.js
│       ├── database.js
│       ├── auth.js
│       ├── products.js
│       └── environments/
│           ├── development.js
│           ├── production.js
│           └── test.js
│
├── tests/                             # Tests mirroring src structure
│   ├── products/
│   │   ├── recruitiq/
│   │   ├── paylinq/
│   │   ├── nexus/
│   │   └── portal/
│   └── core/
│
├── scripts/                           # Utility scripts
├── package.json
└── docker-compose.yml
```

**Key Principles:**
- ✅ **Products folder:** Each product is self-contained
- ✅ **Core folder:** Shared functionality used by all products
- ✅ **Clear boundaries:** No cross-product imports (except via events)
- ✅ **Independent deployment:** Each product can be deployed separately
- ✅ **Team ownership:** Clear product ownership

### 3.2 Target Frontend Structure (Monorepo)

```
apps/
├── recruitiq/                         # RecruitIQ app
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── features/                  # Feature-based organization
│   │   │   ├── jobs/
│   │   │   ├── candidates/
│   │   │   ├── applications/
│   │   │   ├── interviews/
│   │   │   └── dashboard/
│   │   ├── components/                # App-specific components
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
│
├── paylinq/                           # Paylinq app (NEW)
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── features/
│   │   │   ├── payroll/
│   │   │   ├── employees/
│   │   │   ├── payments/
│   │   │   ├── reports/
│   │   │   └── dashboard/
│   │   ├── components/
│   │   ├── pages/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
│
├── nexus/                             # Nexus app (NEW)
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── features/
│   │   │   ├── employees/
│   │   │   ├── leave/
│   │   │   ├── contracts/
│   │   │   ├── documents/
│   │   │   └── dashboard/
│   │   ├── components/
│   │   ├── pages/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
│
└── portal/                            # Admin portal
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── features/
    │   │   ├── customers/
    │   │   ├── licenses/
    │   │   ├── billing/
    │   │   └── support/
    │   ├── components/
    │   ├── pages/
    │   └── utils/
    ├── package.json
    └── vite.config.js

packages/                              # Shared packages
├── ui/                                # Shared UI library
│   ├── src/
│   │   ├── components/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Card/
│   │   │   ├── Table/
│   │   │   ├── Layout/
│   │   │   └── index.js
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── usePermissions.js
│   │   │   └── index.js
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
│
├── api-client/                        # Shared API client
│   ├── src/
│   │   ├── apiClient.js
│   │   ├── auth.js
│   │   ├── products/
│   │   │   ├── recruitiq.js
│   │   │   ├── paylinq.js
│   │   │   ├── nexus.js
│   │   │   └── portal.js
│   │   └── index.js
│   └── package.json
│
├── types/                             # Shared TypeScript types
│   ├── src/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── products.ts
│   │   └── index.ts
│   └── package.json
│
└── utils/                             # Shared utilities
    ├── src/
    │   ├── validation.js
    │   ├── formatting.js
    │   ├── date.js
    │   └── index.js
    └── package.json

package.json                           # Root package.json (workspace)
pnpm-workspace.yaml                    # Workspace configuration
turbo.json                             # Turborepo configuration (optional)
```

**Key Principles:**
- ✅ **Monorepo:** All frontend apps in one repository
- ✅ **Shared packages:** Common code in packages/
- ✅ **Feature-based:** Each app organized by features
- ✅ **Independent builds:** Each app builds independently
- ✅ **Shared UI library:** Consistent UX across products
- ✅ **Type safety:** Shared TypeScript types

---

## 4. Backend Restructuring

### 4.1 Product Mapping Strategy

**Current files → Target products:**

| Current Module | Target Product | Rationale |
|----------------|----------------|-----------|
| Jobs, Candidates, Applications, Interviews, Communications | **RecruitIQ** | Core recruitment features |
| Organizations, Workspaces (customer-facing) | **RecruitIQ** | Customer self-service |
| Organizations, Workspaces (admin) | **Portal** | Admin management |
| Users, Roles, Permissions | **Core/Auth** | Shared across all products |
| MFA, Security, Audit | **Core/Security** | Shared security |
| VPS Provisioning, Licenses | **Portal** | Admin infrastructure |
| Flow Templates | **RecruitIQ** | Recruitment workflows |

### 4.2 Backend File Migration Map

#### Controllers (Current → Target)

| Current File | Lines | Target Location | Product |
|--------------|-------|-----------------|---------|
| `authController.js` | 350 | `core/auth/authController.js` | Core |
| `mfaController.js` | 200 | `core/auth/mfaController.js` | Core |
| `userController.js` | 400 | Split: `core/auth/userController.js` + `products/portal/controllers/userController.js` | Core + Portal |
| `organizationController.js` | 500 | Split: `products/recruitiq/controllers/organizationController.js` + `products/portal/controllers/organizationController.js` | RecruitIQ + Portal |
| `workspaceController.js` | 300 | Split: `products/recruitiq/controllers/workspaceController.js` + `products/portal/controllers/workspaceController.js` | RecruitIQ + Portal |
| `jobController.js` | 600 | `products/recruitiq/controllers/jobController.js` | RecruitIQ |
| `candidateController.js` | 800 | `products/recruitiq/controllers/candidateController.js` | RecruitIQ |
| `applicationController.js` | 500 | `products/recruitiq/controllers/applicationController.js` | RecruitIQ |
| `interviewController.js` | 400 | `products/recruitiq/controllers/interviewController.js` | RecruitIQ |
| `communicationController.js` | 300 | `products/recruitiq/controllers/communicationController.js` | RecruitIQ |
| `flowTemplateController.js` | 250 | `products/recruitiq/controllers/flowTemplateController.js` | RecruitIQ |
| `publicController.js` | 200 | `products/recruitiq/controllers/publicController.js` | RecruitIQ |

**Total Controllers:** 16 files → 20+ files (some split)

#### Services (Current → Target)

| Current File/Folder | Target Location | Product |
|---------------------|-----------------|---------|
| `mfaService.js` | `core/auth/mfaService.js` | Core |
| `passwordResetService.js` | `core/auth/passwordResetService.js` | Core |
| `tokenBlacklist.js` | `core/auth/tokenBlacklist.js` | Core |
| `accountLockout.js` | `core/security/accountLockout.js` | Core |
| `ipTracking.js` | `core/security/ipTracking.js` | Core |
| `securityMonitor.js` | `core/security/securityMonitor.js` | Core |
| `encryption.js` | `core/security/encryption.js` | Core |
| `secretsManager.js` | `core/security/secretsManager.js` | Core |
| `vpsManager.js` | `core/infrastructure/vpsManager.js` | Core |
| `transip.js` | `core/infrastructure/transip.js` | Core |
| `services/jobs/*` | `products/recruitiq/services/jobs/*` | RecruitIQ |
| `services/candidates/*` | `products/recruitiq/services/candidates/*` | RecruitIQ |
| `services/applications/*` | `products/recruitiq/services/applications/*` | RecruitIQ |
| `services/interviews/*` | `products/recruitiq/services/interviews/*` | RecruitIQ |

**Total Services:** 30+ files → 35+ files (organized by product)

#### Routes (Current → Target)

| Current File | Endpoints | Target Location | Product |
|--------------|-----------|-----------------|---------|
| `auth.js` | 10 | `core/auth/routes.js` | Core |
| `mfa.routes.js` | 5 | `core/auth/mfaRoutes.js` | Core |
| `security.js` | 8 | `core/security/routes.js` | Core |
| `users.js` | 8 | Split: `core/auth/userRoutes.js` + `products/portal/routes/users.js` | Core + Portal |
| `organizations.js` | 12 | Split: `products/recruitiq/routes/organizations.js` + `products/portal/routes/organizations.js` | RecruitIQ + Portal |
| `workspaces.js` | 10 | Split: `products/recruitiq/routes/workspaces.js` + `products/portal/routes/workspaces.js` | RecruitIQ + Portal |
| `portal.js` | 15 | `products/portal/routes/index.js` | Portal |
| `provisioning.js` | 8 | `products/portal/routes/provisioning.js` | Portal |
| `rolesPermissions.js` | 12 | `core/auth/rolesPermissionsRoutes.js` | Core |
| `jobs.js` | 12 | `products/recruitiq/routes/jobs.js` | RecruitIQ |
| `candidates.js` | 15 | `products/recruitiq/routes/candidates.js` | RecruitIQ |
| `applications.js` | 10 | `products/recruitiq/routes/applications.js` | RecruitIQ |
| `interviews.js` | 10 | `products/recruitiq/routes/interviews.js` | RecruitIQ |
| `communications.js` | 8 | `products/recruitiq/routes/communications.js` | RecruitIQ |
| `flowTemplates.js` | 8 | `products/recruitiq/routes/flowTemplates.js` | RecruitIQ |
| `public.js` | 5 | `products/recruitiq/routes/public.js` | RecruitIQ |

**Total Routes:** 17 files (123 endpoints) → 25+ files (same endpoints, organized by product)

#### Middleware (Current → Target)

| Current File | Target Location | Product |
|--------------|-----------------|---------|
| `authenticate.js` | `core/middleware/authenticate.js` | Core |
| `authorize.js` | `core/middleware/authorize.js` | Core |
| `validateRequest.js` | `core/middleware/validation.js` | Core |
| `errorHandler.js` | `core/middleware/errorHandler.js` | Core |
| `rateLimit.js` | `core/middleware/rateLimit.js` | Core |
| `auditLog.js` | `core/middleware/audit.js` | Core |
| `csrfProtection.js` | `core/middleware/csrfProtection.js` | Core |
| `securityHeaders.js` | `core/middleware/securityHeaders.js` | Core |
| `cors.js` | `core/middleware/cors.js` | Core |
| `multer.js` | `core/middleware/upload.js` | Core |

**All middleware → Core** (shared across products)

#### Utilities (Current → Target)

| Current File | Target Location | Product |
|--------------|-----------------|---------|
| `fileStorage.js` | `core/integrations/storage/fileStorage.js` | Core |
| `logger.js` | `core/utils/logger.js` | Core |
| `validator.js` | `core/utils/validator.js` | Core |
| `encryption.js` | `core/security/encryption.js` | Core |
| `dbEncryption.js` | `core/database/encryption.js` | Core |

### 4.3 New Infrastructure Files to Create

**Event Bus:**
```
core/events/
├── EventBus.js                        # Redis Streams implementation
├── EventEmitter.js                    # Event emitter wrapper
├── eventTypes.js                      # Event type constants
└── handlers/
    ├── candidateHiredHandler.js
    ├── employeeCreatedHandler.js
    └── payslipGeneratedHandler.js
```

**Message Queue:**
```
core/queue/
├── QueueService.js                    # Bull queue wrapper
├── processors/
│   ├── emailProcessor.js
│   ├── webhookProcessor.js
│   └── reportProcessor.js
└── jobs/
    ├── sendEmail.js
    ├── deliverWebhook.js
    └── generateReport.js
```

**Webhook Infrastructure:**
```
core/integrations/webhooks/
├── WebhookService.js                  # Incoming/outgoing webhooks
├── handlers/
│   ├── stripeHandler.js
│   ├── linkedinHandler.js
│   └── checkrHandler.js
└── validators/
    ├── stripeValidator.js
    └── linkedinValidator.js
```

---

## 5. Frontend Restructuring

### 5.1 Monorepo Setup

**Workspace Manager:** pnpm (recommended) or npm workspaces

**Root package.json:**
```json
{
  "name": "recruitiq-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "pnpm run --parallel --filter=./apps/* dev",
    "dev:recruitiq": "pnpm run --filter=recruitiq dev",
    "dev:paylinq": "pnpm run --filter=paylinq dev",
    "dev:nexus": "pnpm run --filter=nexus dev",
    "dev:portal": "pnpm run --filter=portal dev",
    "build": "pnpm run --parallel --filter=./apps/* build",
    "test": "pnpm run --parallel --filter=./apps/* test",
    "lint": "pnpm run --parallel --filter=./apps/* lint"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0"
  }
}
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 5.2 Frontend Component Migration Map

#### RecruitIQ App Components

| Current Component | Lines | Target Location | Shared? |
|-------------------|-------|-----------------|---------|
| `Layout.jsx` | 150 | `packages/ui/components/Layout/` | ✅ Yes |
| `Sidebar.jsx` | 200 | `apps/recruitiq/components/Sidebar.jsx` | ❌ Product-specific |
| `AvatarMenu.jsx` | 100 | `packages/ui/components/AvatarMenu/` | ✅ Yes |
| `Card.jsx` | 50 | `packages/ui/components/Card/` | ✅ Yes |
| `Modal.jsx` | 150 | `packages/ui/components/Modal/` | ✅ Yes |
| `ConfirmDialog.jsx` | 100 | `packages/ui/components/ConfirmDialog/` | ✅ Yes |
| `MFASetup.jsx` | 200 | `packages/ui/components/MFASetup/` | ✅ Yes |
| `MFAVerification.jsx` | 150 | `packages/ui/components/MFAVerification/` | ✅ Yes |
| `SessionManagement.jsx` | 120 | `packages/ui/components/SessionManagement/` | ✅ Yes |
| `Pagination.jsx` | 80 | `packages/ui/components/Pagination/` | ✅ Yes |
| `SearchInput.jsx` | 60 | `packages/ui/components/SearchInput/` | ✅ Yes |
| `QuickSearch.jsx` | 250 | `apps/recruitiq/components/QuickSearch.jsx` | ❌ Product-specific |
| `FilterChips.jsx` | 100 | `packages/ui/components/FilterChips/` | ✅ Yes |
| `JobForm.jsx` | 400 | `apps/recruitiq/features/jobs/components/JobForm.jsx` | ❌ Product-specific |
| `CandidateForm.jsx` | 500 | `apps/recruitiq/features/candidates/components/CandidateForm.jsx` | ❌ Product-specific |
| `CandidateFlowProgress.jsx` | 150 | `apps/recruitiq/features/candidates/components/FlowProgress.jsx` | ❌ Product-specific |
| `ApplicationSourceBadge.jsx` | 50 | `apps/recruitiq/features/applications/components/SourceBadge.jsx` | ❌ Product-specific |
| `FlowDesigner.jsx` | 600 | `apps/recruitiq/features/flows/components/FlowDesigner.jsx` | ❌ Product-specific |
| `DashboardQuickResults.jsx` | 200 | `apps/recruitiq/features/dashboard/components/QuickResults.jsx` | ❌ Product-specific |
| `MobileDashboardSummary.jsx` | 150 | `apps/recruitiq/features/dashboard/components/MobileSummary.jsx` | ❌ Product-specific |
| `RecentActivitySummary.jsx` | 120 | `apps/recruitiq/features/dashboard/components/RecentActivity.jsx` | ❌ Product-specific |
| `WorkspaceManager.jsx` | 300 | `apps/recruitiq/features/workspaces/components/WorkspaceManager.jsx` | ❌ Product-specific |
| `WorkspaceSelector.jsx` | 150 | `apps/recruitiq/components/WorkspaceSelector.jsx` | ❌ Product-specific |
| `PublicLayout.jsx` | 100 | `apps/recruitiq/components/PublicLayout.jsx` | ❌ Product-specific |
| `PublishJobToggle.jsx` | 80 | `apps/recruitiq/features/jobs/components/PublishToggle.jsx` | ❌ Product-specific |
| `PortalSettingsModal.jsx` | 200 | `apps/recruitiq/components/PortalSettingsModal.jsx` | ❌ Product-specific |

**Summary:**
- **Shared Components:** 11 components → `packages/ui/`
- **Product-Specific:** 13 components → `apps/recruitiq/`

#### Portal App Components

| Current Component | Lines | Target Location | Shared? |
|-------------------|-------|-----------------|---------|
| `Layout.jsx` | 120 | `packages/ui/components/Layout/` | ✅ Yes (merge with RecruitIQ layout) |
| `MFASetup.jsx` | 200 | `packages/ui/components/MFASetup/` | ✅ Yes (merge with RecruitIQ) |
| `MFAVerification.jsx` | 150 | `packages/ui/components/MFAVerification/` | ✅ Yes (merge with RecruitIQ) |
| `ProtectedRoute.jsx` | 80 | `packages/ui/components/ProtectedRoute/` | ✅ Yes |
| `licenses/*` | 500+ | `apps/portal/features/licenses/` | ❌ Portal-specific |

### 5.3 Shared UI Library Structure

**packages/ui/src/components/:**

```
Button/
├── Button.jsx
├── Button.module.css
├── Button.test.jsx
└── index.js

Input/
├── Input.jsx
├── Input.module.css
├── Input.test.jsx
└── index.js

Select/
├── Select.jsx
├── Select.module.css
└── index.js

Modal/
├── Modal.jsx
├── ModalHeader.jsx
├── ModalBody.jsx
├── ModalFooter.jsx
├── Modal.module.css
├── Modal.test.jsx
└── index.js

Card/
├── Card.jsx
├── CardHeader.jsx
├── CardBody.jsx
├── CardFooter.jsx
├── Card.module.css
└── index.js

Table/
├── Table.jsx
├── TableHeader.jsx
├── TableBody.jsx
├── TableRow.jsx
├── TableCell.jsx
├── Table.module.css
└── index.js

Layout/
├── Layout.jsx
├── Sidebar.jsx
├── Header.jsx
├── Footer.jsx
├── MainContent.jsx
├── Layout.module.css
└── index.js

Form/
├── Form.jsx
├── FormGroup.jsx
├── FormLabel.jsx
├── FormError.jsx
├── FormHint.jsx
└── index.js

Auth/
├── MFASetup.jsx
├── MFAVerification.jsx
├── SessionManagement.jsx
├── ProtectedRoute.jsx
└── index.js

Feedback/
├── Alert.jsx
├── Toast.jsx
├── ConfirmDialog.jsx
├── LoadingSpinner.jsx
└── index.js

Navigation/
├── Pagination.jsx
├── Breadcrumbs.jsx
├── Tabs.jsx
└── index.js

Search/
├── SearchInput.jsx
├── FilterChips.jsx
├── FilterPanel.jsx
└── index.js

Avatar/
├── Avatar.jsx
├── AvatarMenu.jsx
└── index.js
```

### 5.4 API Client Migration

**Current:**
```
recruitiq/src/services/api.js          # 500 lines, all endpoints
portal/src/services/api.js             # 200 lines, portal endpoints
```

**Target:**
```
packages/api-client/src/
├── apiClient.js                       # Base HTTP client (axios/fetch)
├── auth.js                            # Auth helpers
├── products/
│   ├── recruitiq.js                   # RecruitIQ API methods
│   ├── paylinq.js                     # Paylinq API methods
│   ├── nexus.js                       # Nexus API methods
│   └── portal.js                      # Portal API methods
└── index.js                           # Exports
```

**Example API Client:**
```javascript
// packages/api-client/src/apiClient.js
import axios from 'axios';

class ApiClient {
  constructor(baseURL) {
    this.client = axios.create({
      baseURL: baseURL || process.env.VITE_API_URL,
      withCredentials: true,
    });
    
    this.client.interceptors.request.use(this.handleRequest);
    this.client.interceptors.response.use(
      this.handleResponse,
      this.handleError
    );
  }
  
  async get(url, config) {
    return this.client.get(url, config);
  }
  
  async post(url, data, config) {
    return this.client.post(url, data, config);
  }
  
  // ... other methods
}

export default new ApiClient();
```

```javascript
// packages/api-client/src/products/recruitiq.js
import apiClient from '../apiClient';

export const jobs = {
  list: (params) => apiClient.get('/api/recruitiq/jobs', { params }),
  get: (id) => apiClient.get(`/api/recruitiq/jobs/${id}`),
  create: (data) => apiClient.post('/api/recruitiq/jobs', data),
  update: (id, data) => apiClient.put(`/api/recruitiq/jobs/${id}`, data),
  delete: (id) => apiClient.delete(`/api/recruitiq/jobs/${id}`),
};

export const candidates = {
  list: (params) => apiClient.get('/api/recruitiq/candidates', { params }),
  get: (id) => apiClient.get(`/api/recruitiq/candidates/${id}`),
  create: (data) => apiClient.post('/api/recruitiq/candidates', data),
  // ...
};

// ... more modules
```

---


## 6. Database Migration Strategy

### 6.1 Database Structure (No Changes Needed)

**Current database design is already multi-product ready:**
- ✅ Multi-tenant architecture with `organization_id`
- ✅ Tables are logically separated
- ✅ No tight coupling between recruitment and future product tables

**Product-to-Table Mapping:**

| Product | Tables | Count |
|---------|--------|-------|
| **Core/Auth** | users, sessions, mfa_devices, password_resets, audit_logs | 5 |
| **Portal** | organizations, workspaces, licenses, vps_instances, deployment_logs | 5 |
| **RecruitIQ** | jobs, candidates, applications, interviews, communications, flow_templates, flow_steps | 7 |
| **Paylinq** | employees, payroll_runs, payslips, payments, tax_filings (NEW) | 5 (to be created) |
| **Nexus** | employees, contracts, leave_requests, documents, policies (NEW) | 5 (to be created) |
| **Shared** | roles, permissions, role_permissions, user_roles, file_uploads | 5 |

### 6.2 New Tables to Create

#### Paylinq Tables (Phase 8)

```sql
-- Employees table (shared with Nexus)
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_number VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  date_of_birth DATE,
  ssn_encrypted TEXT, -- Social Security Number (encrypted)
  bank_account_encrypted TEXT, -- IBAN (encrypted)
  address JSONB, -- { street, city, postal_code, country }
  tax_info JSONB, -- { tax_id, tax_bracket, deductions }
  employment_type VARCHAR(50), -- full-time, part-time, contract
  job_title VARCHAR(255),
  department VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE,
  salary_amount DECIMAL(12,2),
  salary_currency VARCHAR(3) DEFAULT 'EUR',
  salary_frequency VARCHAR(20), -- monthly, bi-weekly, weekly
  status VARCHAR(20) DEFAULT 'active', -- active, on_leave, terminated
  source_system VARCHAR(50), -- 'nexus', 'recruitiq', 'manual'
  source_id UUID, -- ID from source system
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_employees_org ON employees(organization_id);
CREATE INDEX idx_employees_status ON employees(organization_id, status);
CREATE INDEX idx_employees_source ON employees(source_system, source_id);

-- Payroll runs
CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_number VARCHAR(50) UNIQUE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- draft, processing, completed, failed, cancelled
  employee_count INTEGER DEFAULT 0,
  total_gross_pay DECIMAL(15,2) DEFAULT 0,
  total_deductions DECIMAL(15,2) DEFAULT 0,
  total_net_pay DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'EUR',
  notes TEXT,
  processed_at TIMESTAMP,
  processed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_payroll_runs_org ON payroll_runs(organization_id);
CREATE INDEX idx_payroll_runs_status ON payroll_runs(organization_id, status);
CREATE INDEX idx_payroll_runs_period ON payroll_runs(period_start, period_end);

-- Payslips
CREATE TABLE payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  payslip_number VARCHAR(50) UNIQUE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_date DATE NOT NULL,
  hours_worked DECIMAL(8,2),
  overtime_hours DECIMAL(8,2),
  base_salary DECIMAL(12,2),
  overtime_pay DECIMAL(12,2),
  bonuses DECIMAL(12,2) DEFAULT 0,
  allowances DECIMAL(12,2) DEFAULT 0,
  gross_pay DECIMAL(12,2),
  tax_deduction DECIMAL(12,2),
  social_security DECIMAL(12,2),
  other_deductions DECIMAL(12,2) DEFAULT 0,
  net_pay DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'EUR',
  breakdown JSONB, -- Detailed breakdown of all components
  pdf_url TEXT, -- S3 URL to generated payslip PDF
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payslips_org ON payslips(organization_id);
CREATE INDEX idx_payslips_run ON payslips(payroll_run_id);
CREATE INDEX idx_payslips_employee ON payslips(employee_id);
CREATE INDEX idx_payslips_period ON payslips(period_start, period_end);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  payment_reference VARCHAR(100) UNIQUE NOT NULL,
  payment_method VARCHAR(50), -- bank_transfer, sepa, wire
  batch_id VARCHAR(100), -- Bank batch ID
  total_amount DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'EUR',
  payment_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  payment_provider VARCHAR(50), -- stripe, mollie, bank
  provider_payment_id VARCHAR(255),
  provider_response JSONB,
  error_message TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_run ON payments(payroll_run_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Tax filings
CREATE TABLE tax_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  filing_type VARCHAR(50), -- monthly, quarterly, annual
  tax_period_start DATE NOT NULL,
  tax_period_end DATE NOT NULL,
  filing_deadline DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, submitted, accepted, rejected
  total_wages DECIMAL(15,2),
  total_tax DECIMAL(15,2),
  total_social_security DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'EUR',
  filing_data JSONB, -- Complete tax filing data
  submission_reference VARCHAR(100),
  submitted_at TIMESTAMP,
  submitted_by UUID REFERENCES users(id),
  acknowledgement_data JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tax_filings_org ON tax_filings(organization_id);
CREATE INDEX idx_tax_filings_period ON tax_filings(tax_period_start, tax_period_end);
CREATE INDEX idx_tax_filings_status ON tax_filings(status);
```

#### Nexus Tables (Phase 9)

```sql
-- Contracts (employee contracts)
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  contract_type VARCHAR(50), -- permanent, fixed-term, temporary, freelance
  start_date DATE NOT NULL,
  end_date DATE,
  job_title VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  salary_amount DECIMAL(12,2),
  salary_currency VARCHAR(3) DEFAULT 'EUR',
  salary_frequency VARCHAR(20),
  working_hours_per_week DECIMAL(5,2),
  probation_period_months INTEGER,
  notice_period_months INTEGER,
  contract_terms JSONB, -- All contract terms and conditions
  signed_by_employee BOOLEAN DEFAULT false,
  signed_by_employer BOOLEAN DEFAULT false,
  employee_signature_date TIMESTAMP,
  employer_signature_date TIMESTAMP,
  document_url TEXT, -- S3 URL to signed contract PDF
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, expired, terminated
  termination_reason TEXT,
  terminated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_contracts_org ON contracts(organization_id);
CREATE INDEX idx_contracts_employee ON contracts(employee_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- Leave requests
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(50), -- vacation, sick, personal, parental, unpaid
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested DECIMAL(4,2), -- Can be 0.5 for half days
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_org ON leave_requests(organization_id);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Leave balances
CREATE TABLE leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(50),
  year INTEGER NOT NULL,
  total_days DECIMAL(5,2), -- Annual allowance
  used_days DECIMAL(5,2) DEFAULT 0,
  pending_days DECIMAL(5,2) DEFAULT 0,
  available_days DECIMAL(5,2), -- Calculated: total - used - pending
  carried_over_days DECIMAL(5,2) DEFAULT 0, -- From previous year
  expires_at DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, leave_type, year)
);

CREATE INDEX idx_leave_balances_employee ON leave_balances(employee_id);
CREATE INDEX idx_leave_balances_year ON leave_balances(year);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE, -- NULL for company-wide docs
  document_type VARCHAR(50), -- contract, policy, handbook, form, certificate, payslip
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL, -- S3 URL
  file_name VARCHAR(255),
  file_size INTEGER, -- in bytes
  mime_type VARCHAR(100),
  version INTEGER DEFAULT 1,
  requires_signature BOOLEAN DEFAULT false,
  signed_by_employee BOOLEAN DEFAULT false,
  signature_date TIMESTAMP,
  signature_data JSONB,
  requires_acknowledgement BOOLEAN DEFAULT false,
  acknowledged_by_employee BOOLEAN DEFAULT false,
  acknowledgement_date TIMESTAMP,
  expiry_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- active, archived, expired
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_employee ON documents(employee_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);

-- Policies
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  policy_type VARCHAR(50), -- code_of_conduct, security, privacy, leave, expense, remote_work
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT, -- Markdown or HTML
  version VARCHAR(20),
  effective_date DATE NOT NULL,
  requires_acknowledgement BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, archived
  published_at TIMESTAMP,
  published_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_policies_org ON policies(organization_id);
CREATE INDEX idx_policies_status ON policies(status);

-- Policy acknowledgements
CREATE TABLE policy_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  UNIQUE(policy_id, employee_id)
);

CREATE INDEX idx_policy_acks_policy ON policy_acknowledgements(policy_id);
CREATE INDEX idx_policy_acks_employee ON policy_acknowledgements(employee_id);
```

### 6.3 Migration Scripts

**Create migration script for new tables:**

```javascript
// backend/src/database/migrations/20251103_create_paylinq_tables.js
exports.up = async function(knex) {
  // Create employees table
  await knex.schema.createTable('employees', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('organization_id').notNullable()
      .references('id').inTable('organizations').onDelete('CASCADE');
    table.string('employee_number', 50).unique().notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('email', 255).unique().notNullable();
    // ... more columns
    table.timestamps(true, true);
  });
  
  // Create payroll_runs table
  await knex.schema.createTable('payroll_runs', (table) => {
    // ... table definition
  });
  
  // ... more tables
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('policy_acknowledgements');
  await knex.schema.dropTableIfExists('policies');
  await knex.schema.dropTableIfExists('documents');
  await knex.schema.dropTableIfExists('leave_balances');
  await knex.schema.dropTableIfExists('leave_requests');
  await knex.schema.dropTableIfExists('contracts');
  await knex.schema.dropTableIfExists('tax_filings');
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('payslips');
  await knex.schema.dropTableIfExists('payroll_runs');
  await knex.schema.dropTableIfExists('employees');
};
```

### 6.4 Data Integrity Checks

**No data migration needed for existing tables**, but verify:

```sql
-- Check all organizations still accessible
SELECT COUNT(*) FROM organizations;

-- Check all users still have proper roles
SELECT u.id, u.email, r.name 
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id;

-- Check all jobs have valid organization references
SELECT COUNT(*) FROM jobs WHERE organization_id NOT IN (SELECT id FROM organizations);

-- Check all candidates have valid organization references
SELECT COUNT(*) FROM candidates WHERE organization_id NOT IN (SELECT id FROM organizations);
```

---

## 7. File-by-File Migration Mapping

### 7.1 Backend Migration Checklist

#### Phase 1: Create Target Structure (Week 1)

```bash
# Create new directory structure
mkdir -p backend/src/products/{recruitiq,paylinq,nexus,portal}/{controllers,services,routes,repositories,models,validators,events}
mkdir -p backend/src/core/{auth,database,middleware,security,events,queue,integrations,infrastructure,utils}
mkdir -p backend/src/core/integrations/{storage,webhooks}
```

#### Phase 2: Move Core/Shared Files (Week 1-2)

| Step | Current File | Target File | Action |
|------|--------------|-------------|--------|
| 1 | `controllers/authController.js` | `core/auth/authController.js` | Move |
| 2 | `controllers/mfaController.js` | `core/auth/mfaController.js` | Move |
| 3 | `services/mfaService.js` | `core/auth/mfaService.js` | Move |
| 4 | `services/passwordResetService.js` | `core/auth/passwordResetService.js` | Move |
| 5 | `services/tokenBlacklist.js` | `core/auth/tokenBlacklist.js` | Move |
| 6 | `services/accountLockout.js` | `core/security/accountLockout.js` | Move |
| 7 | `services/ipTracking.js` | `core/security/ipTracking.js` | Move |
| 8 | `services/securityMonitor.js` | `core/security/securityMonitor.js` | Move |
| 9 | `services/encryption.js` | `core/security/encryption.js` | Move |
| 10 | `services/secretsManager.js` | `core/security/secretsManager.js` | Move |
| 11 | `utils/fileStorage.js` | `core/integrations/storage/fileStorage.js` | Move |
| 12 | `services/vpsManager.js` | `core/infrastructure/vpsManager.js` | Move |
| 13 | `services/transip.js` | `core/infrastructure/transip.js` | Move |
| 14 | All `middleware/*` | `core/middleware/*` | Move all |
| 15 | All `database/*` | `core/database/*` | Move all |
| 16 | `integrations/cloudwatch.js` | `core/integrations/cloudwatch.js` | Move |
| 17 | `integrations/datadog.js` | `core/integrations/datadog.js` | Move |

#### Phase 3: Move RecruitIQ Product Files (Week 2-3)

| Step | Current File | Target File | Action |
|------|--------------|-------------|--------|
| 18 | `controllers/jobController.js` | `products/recruitiq/controllers/jobController.js` | Move |
| 19 | `controllers/candidateController.js` | `products/recruitiq/controllers/candidateController.js` | Move |
| 20 | `controllers/applicationController.js` | `products/recruitiq/controllers/applicationController.js` | Move |
| 21 | `controllers/interviewController.js` | `products/recruitiq/controllers/interviewController.js` | Move |
| 22 | `controllers/communicationController.js` | `products/recruitiq/controllers/communicationController.js` | Move |
| 23 | `controllers/flowTemplateController.js` | `products/recruitiq/controllers/flowTemplateController.js` | Move |
| 24 | `controllers/publicController.js` | `products/recruitiq/controllers/publicController.js` | Move |
| 25 | `services/jobs/*` | `products/recruitiq/services/jobs/*` | Move folder |
| 26 | `services/candidates/*` | `products/recruitiq/services/candidates/*` | Move folder |
| 27 | `services/applications/*` | `products/recruitiq/services/applications/*` | Move folder |
| 28 | `services/interviews/*` | `products/recruitiq/services/interviews/*` | Move folder |
| 29 | `routes/jobs.js` | `products/recruitiq/routes/jobs.js` | Move |
| 30 | `routes/candidates.js` | `products/recruitiq/routes/candidates.js` | Move |
| 31 | `routes/applications.js` | `products/recruitiq/routes/applications.js` | Move |
| 32 | `routes/interviews.js` | `products/recruitiq/routes/interviews.js` | Move |
| 33 | `routes/communications.js` | `products/recruitiq/routes/communications.js` | Move |
| 34 | `routes/flowTemplates.js` | `products/recruitiq/routes/flowTemplates.js` | Move |
| 35 | `routes/public.js` | `products/recruitiq/routes/public.js` | Move |

#### Phase 4: Split User/Organization Controllers (Week 3)

**userController.js → Split into Core + Portal**

```javascript
// Current: controllers/userController.js (400 lines)

// Target 1: core/auth/userController.js (150 lines)
// - getCurrentUser()
// - updateProfile()
// - changePassword()
// - getMyPermissions()

// Target 2: products/portal/controllers/userController.js (250 lines)
// - listAllUsers() [Admin only]
// - createUser() [Admin only]
// - updateUser() [Admin only]
// - deleteUser() [Admin only]
// - assignRole() [Admin only]
// - suspendUser() [Admin only]
```

**organizationController.js → Split into RecruitIQ + Portal**

```javascript
// Current: controllers/organizationController.js (500 lines)

// Target 1: products/recruitiq/controllers/organizationController.js (250 lines)
// - getMyOrganization() [Customer-facing]
// - updateMyOrganization() [Customer-facing]
// - getOrganizationSettings() [Customer-facing]
// - updateOrganizationSettings() [Customer-facing]

// Target 2: products/portal/controllers/organizationController.js (250 lines)
// - listAllOrganizations() [Admin only]
// - createOrganization() [Admin only]
// - updateOrganization() [Admin only]
// - deleteOrganization() [Admin only]
// - suspendOrganization() [Admin only]
// - getOrganizationAnalytics() [Admin only]
```

#### Phase 5: Move Portal Files (Week 3)

| Step | Current File | Target File | Action |
|------|--------------|-------------|--------|
| 36 | `routes/portal.js` | `products/portal/routes/index.js` | Move |
| 37 | `routes/provisioning.js` | `products/portal/routes/provisioning.js` | Move |
| 38 | Portal parts of `userController.js` | `products/portal/controllers/userController.js` | Split & move |
| 39 | Portal parts of `organizationController.js` | `products/portal/controllers/organizationController.js` | Split & move |
| 40 | Portal parts of `workspaceController.js` | `products/portal/controllers/workspaceController.js` | Split & move |

#### Phase 6: Update Imports (Week 4)

**Update all import statements to reflect new paths:**

```javascript
// OLD
import authController from '../controllers/authController.js';
import mfaService from '../services/mfaService.js';
import { authenticate } from '../middleware/authenticate.js';

// NEW
import authController from '../core/auth/authController.js';
import mfaService from '../core/auth/mfaService.js';
import { authenticate } from '../core/middleware/authenticate.js';
```

**Create index.js files for cleaner imports:**

```javascript
// core/auth/index.js
export { default as authController } from './authController.js';
export { default as mfaController } from './mfaController.js';
export { default as authService } from './authService.js';
export { default as mfaService } from './mfaService.js';

// Usage
import { authController, mfaService } from '../core/auth/index.js';
```

#### Phase 7: Update server.js (Week 4)

**Current server.js:**
```javascript
// OLD: Direct imports
import jobsRoutes from './routes/jobs.js';
import candidatesRoutes from './routes/candidates.js';
import authRoutes from './routes/auth.js';
// ... 17 route imports

app.use('/api', authRoutes);
app.use('/api/jobs', jobsRoutes);
// ... 17 route registrations
```

**New server.js:**
```javascript
// NEW: Product-based imports
import recruitiqRoutes from './products/recruitiq/routes/index.js';
import paylinqRoutes from './products/paylinq/routes/index.js';
import nexusRoutes from './products/nexus/routes/index.js';
import portalRoutes from './products/portal/routes/index.js';
import coreRoutes from './core/auth/routes.js';

// Mount products
app.use('/api/recruitiq', recruitiqRoutes);
app.use('/api/paylinq', paylinqRoutes);
app.use('/api/nexus', nexusRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/auth', coreRoutes); // Core auth endpoints
```

**Product route aggregator:**
```javascript
// products/recruitiq/routes/index.js
import express from 'express';
import jobsRoutes from './jobs.js';
import candidatesRoutes from './candidates.js';
import applicationsRoutes from './applications.js';
import interviewsRoutes from './interviews.js';
import communicationsRoutes from './communications.js';
import flowTemplatesRoutes from './flowTemplates.js';
import publicRoutes from './public.js';

const router = express.Router();

router.use('/jobs', jobsRoutes);
router.use('/candidates', candidatesRoutes);
router.use('/applications', applicationsRoutes);
router.use('/interviews', interviewsRoutes);
router.use('/communications', communicationsRoutes);
router.use('/flow-templates', flowTemplatesRoutes);
router.use('/public', publicRoutes);

export default router;
```

### 7.2 Frontend Migration Checklist

#### Phase 1: Create Monorepo Structure (Week 5)

```bash
# Initialize workspace
mkdir -p apps/{recruitiq,paylinq,nexus,portal}
mkdir -p packages/{ui,api-client,types,utils}

# Move existing apps
mv recruitiq apps/recruitiq
mv portal apps/portal

# Create new apps (basic scaffolding)
# paylinq and nexus will be created later
```

#### Phase 2: Extract Shared Components (Week 5-6)

| Component | Current Location | Target Location | Shared? |
|-----------|------------------|-----------------|---------|
| Layout.jsx | `recruitiq/src/components/` | `packages/ui/components/Layout/` | ✅ Yes |
| Sidebar.jsx | Multiple | App-specific | ❌ No |
| AvatarMenu.jsx | `recruitiq/src/components/` | `packages/ui/components/AvatarMenu/` | ✅ Yes |
| Card.jsx | `recruitiq/src/components/` | `packages/ui/components/Card/` | ✅ Yes |
| Modal.jsx | `recruitiq/src/components/` | `packages/ui/components/Modal/` | ✅ Yes |
| ConfirmDialog.jsx | `recruitiq/src/components/` | `packages/ui/components/ConfirmDialog/` | ✅ Yes |
| MFASetup.jsx | Both apps | `packages/ui/components/Auth/MFASetup.jsx` | ✅ Yes |
| MFAVerification.jsx | Both apps | `packages/ui/components/Auth/MFAVerification.jsx` | ✅ Yes |
| SessionManagement.jsx | `recruitiq/src/components/` | `packages/ui/components/Auth/SessionManagement.jsx` | ✅ Yes |
| Pagination.jsx | `recruitiq/src/components/` | `packages/ui/components/Pagination/` | ✅ Yes |
| SearchInput.jsx | `recruitiq/src/components/` | `packages/ui/components/SearchInput/` | ✅ Yes |
| FilterChips.jsx | `recruitiq/src/components/` | `packages/ui/components/FilterChips/` | ✅ Yes |

#### Phase 3: Create API Client Package (Week 6)

```bash
# Create package structure
mkdir -p packages/api-client/src/products
cd packages/api-client

# Extract API methods from:
# - apps/recruitiq/src/services/api.js → packages/api-client/src/products/recruitiq.js
# - apps/portal/src/services/api.js → packages/api-client/src/products/portal.js
```

#### Phase 4: Update App Imports (Week 7)

**recruitiq/src/pages/Dashboard.jsx:**
```javascript
// OLD
import Layout from '../components/Layout';
import Card from '../components/Card';
import api from '../services/api';

// NEW
import { Layout, Card } from '@recruitiq/ui';
import { jobs, candidates } from '@recruitiq/api-client';

// Usage
const jobs = await jobs.list({ page: 1 });
```

#### Phase 5: Create Shared Types Package (Week 7)

```typescript
// packages/types/src/auth.ts
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role: string;
}

export interface Session {
  userId: string;
  organizationId: string;
  expiresAt: Date;
}

// packages/types/src/products.ts
export interface Job {
  id: string;
  title: string;
  description: string;
  // ...
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  // ...
}
```

---


## 8. Migration Phases

### 8.1 Phase Timeline Overview

| Phase | Duration | Effort | Risk | Description |
|-------|----------|--------|------|-------------|
| **Phase 1** | Week 1 | 40h | Low | Create target structure |
| **Phase 2** | Week 1-2 | 80h | Low | Move core/shared files |
| **Phase 3** | Week 2-3 | 120h | Medium | Move RecruitIQ files |
| **Phase 4** | Week 3 | 40h | High | Split shared controllers |
| **Phase 5** | Week 3 | 40h | Low | Move Portal files |
| **Phase 6** | Week 4 | 80h | High | Update all imports |
| **Phase 7** | Week 4 | 40h | Medium | Update server.js routing |
| **Phase 8** | Week 5 | 40h | Low | Create frontend monorepo |
| **Phase 9** | Week 5-6 | 80h | Medium | Extract shared UI components |
| **Phase 10** | Week 6 | 40h | Medium | Create API client package |
| **Phase 11** | Week 7 | 80h | High | Update frontend imports |
| **Phase 12** | Week 8 | 80h | Critical | Full integration testing |
| **TOTAL** | **8 weeks** | **720h** | - | Complete restructuring |

### 8.2 Detailed Phase Breakdown

#### Phase 1: Create Target Structure (Week 1, 40 hours)

**Objective:** Set up new directory structure without touching existing code

**Tasks:**
1. Create backend product folders (2h)
2. Create backend core folders (2h)
3. Create frontend monorepo structure (4h)
4. Create package folders (2h)
5. Setup workspace configurations (4h)
6. Create README files for each folder (2h)
7. Document new structure (4h)

**Deliverables:**
- ✅ Complete folder structure created
- ✅ README.md in each product folder
- ✅ pnpm-workspace.yaml configured
- ✅ Root package.json with workspace scripts

**Risk:** Low - No code changes yet

**Validation:**
```bash
# Verify structure
tree backend/src -L 3
tree apps -L 2
tree packages -L 2
```

#### Phase 2: Move Core/Shared Files (Week 1-2, 80 hours)

**Objective:** Move authentication, security, and shared utilities

**Day 1-2 (16h): Authentication**
- Move authController.js → core/auth/
- Move mfaController.js → core/auth/
- Move mfaService.js → core/auth/
- Move passwordResetService.js → core/auth/
- Move tokenBlacklist.js → core/auth/
- Update imports in moved files
- Test: Authentication still works

**Day 3-4 (16h): Security**
- Move security services → core/security/
- Move encryption.js → core/security/
- Move secretsManager.js → core/security/
- Update imports
- Test: Security features work

**Day 5-6 (16h): Middleware**
- Move all middleware → core/middleware/
- Update imports
- Test: All middleware applied correctly

**Day 7-8 (16h): Database & Utilities**
- Move database folder → core/database/
- Move integrations → core/integrations/
- Move infrastructure services → core/infrastructure/
- Update imports
- Test: Database connections work

**Day 9-10 (16h): Testing & Validation**
- Run unit tests
- Run integration tests
- Fix any broken imports
- Update test paths

**Deliverables:**
- ✅ All core files moved
- ✅ All imports updated
- ✅ All tests passing
- ✅ Application still runs

**Risk:** Low - Core files are relatively independent

**Validation:**
```bash
npm test
npm run start:dev
# Verify authentication works
# Verify API requests work
```

#### Phase 3: Move RecruitIQ Files (Week 2-3, 120 hours)

**Objective:** Move all recruitment-specific code to products/recruitiq/

**Day 1-3 (24h): Controllers**
- Move job, candidate, application, interview controllers
- Update imports
- Test each controller

**Day 4-6 (24h): Services**
- Move services/jobs/ folder
- Move services/candidates/ folder
- Move services/applications/ folder
- Move services/interviews/ folder
- Update imports
- Test each service

**Day 7-9 (24h): Routes**
- Move all recruitment routes
- Create products/recruitiq/routes/index.js aggregator
- Update server.js to mount recruitiq routes
- Test all endpoints

**Day 10-12 (24h): Repositories & Models**
- Move any recruitment-specific repositories
- Move any recruitment-specific models
- Update imports

**Day 13-15 (24h): Testing & Validation**
- Run all RecruitIQ tests
- Test all API endpoints manually
- Fix any issues
- Update Postman collection

**Deliverables:**
- ✅ All RecruitIQ files moved to products/recruitiq/
- ✅ All imports updated
- ✅ All tests passing
- ✅ All 80+ RecruitIQ endpoints working

**Risk:** Medium - Large codebase with many interdependencies

**Validation:**
```bash
# Test recruitment endpoints
curl http://localhost:3000/api/recruitiq/jobs
curl http://localhost:3000/api/recruitiq/candidates
curl http://localhost:3000/api/recruitiq/applications

# Run tests
npm test -- products/recruitiq
```

#### Phase 4: Split Shared Controllers (Week 3, 40 hours)

**Objective:** Split controllers used by multiple products

**Day 1 (8h): Split userController.js**
```javascript
// Original: 400 lines
// Split into:
// - core/auth/userController.js (150 lines) - User profile
// - products/portal/controllers/userController.js (250 lines) - Admin user management
```

**Day 2 (8h): Split organizationController.js**
```javascript
// Original: 500 lines
// Split into:
// - products/recruitiq/controllers/organizationController.js (250 lines) - Self-service
// - products/portal/controllers/organizationController.js (250 lines) - Admin management
```

**Day 3 (8h): Split workspaceController.js**
```javascript
// Original: 300 lines
// Split into:
// - products/recruitiq/controllers/workspaceController.js (150 lines)
// - products/portal/controllers/workspaceController.js (150 lines)
```

**Day 4 (8h): Update routes**
- Update auth routes to use core/auth/userController
- Update recruitiq routes to use recruitiq organizationController
- Update portal routes to use portal controllers
- Test all affected endpoints

**Day 5 (8h): Testing & Validation**
- Test user profile endpoints
- Test admin user management
- Test organization self-service
- Test admin organization management
- Fix any issues

**Deliverables:**
- ✅ userController split and working
- ✅ organizationController split and working
- ✅ workspaceController split and working
- ✅ All tests passing

**Risk:** High - These controllers are heavily used

**Validation:**
```bash
# Test user endpoints
curl http://localhost:3000/api/auth/me
curl http://localhost:3000/api/portal/users

# Test organization endpoints
curl http://localhost:3000/api/recruitiq/organization
curl http://localhost:3000/api/portal/organizations
```

#### Phase 5: Move Portal Files (Week 3, 40 hours)

**Objective:** Consolidate portal-specific code

**Day 1-2 (16h): Move portal controllers and routes**
- Move portal routes
- Move provisioning routes
- Move license management code
- Update imports

**Day 3-4 (16h): Move portal services**
- Move customer management services
- Move billing services
- Update imports

**Day 5 (8h): Testing**
- Test portal dashboard
- Test customer creation
- Test license management
- Test provisioning

**Deliverables:**
- ✅ All portal files in products/portal/
- ✅ Portal application working
- ✅ All admin features functional

**Risk:** Low - Portal is relatively independent

#### Phase 6: Update All Imports (Week 4, 80 hours)

**Objective:** Fix all import statements to use new paths

**Automated approach:**
```bash
# Find and replace imports
find backend/src -name "*.js" -type f -exec sed -i 's|../controllers/authController|../core/auth/authController|g' {} +
find backend/src -name "*.js" -type f -exec sed -i 's|../services/mfaService|../core/auth/mfaService|g' {} +
# ... more replacements
```

**Manual review:**
- Review each changed file
- Ensure imports are correct
- Test each module
- Fix edge cases

**Day 1-3 (24h): Update backend imports**
- Update all import statements
- Create barrel exports (index.js)
- Test each module

**Day 4-5 (16h): Update test imports**
- Update test file imports
- Run all tests
- Fix failing tests

**Day 6-10 (40h): Comprehensive testing**
- Unit tests
- Integration tests
- Manual API testing
- Fix all issues

**Deliverables:**
- ✅ All imports updated
- ✅ No broken imports
- ✅ All tests passing

**Risk:** High - Easy to miss imports, causing runtime errors

**Validation:**
```bash
# Check for old import patterns
grep -r "../controllers/" backend/src
grep -r "../services/" backend/src
# Should return no results

# Run all tests
npm test
```

#### Phase 7: Update Server.js Routing (Week 4, 40 hours)

**Objective:** Refactor server.js to use product-based routing

**Day 1-2 (16h): Create product route aggregators**
```javascript
// products/recruitiq/routes/index.js
// products/paylinq/routes/index.js
// products/nexus/routes/index.js
// products/portal/routes/index.js
```

**Day 3 (8h): Update server.js**
- Remove individual route imports
- Import product routes
- Mount at /api/{product}
- Test routing

**Day 4-5 (16h): Testing**
- Test all endpoints with new URLs
- Update Postman collection
- Update frontend API URLs
- Test end-to-end

**Deliverables:**
- ✅ Product-based routing working
- ✅ All endpoints accessible
- ✅ API documentation updated

**Risk:** Medium - Changes API URL structure

**Validation:**
```bash
# Test new routes
curl http://localhost:3000/api/recruitiq/jobs
curl http://localhost:3000/api/portal/customers

# Verify old routes don't work
curl http://localhost:3000/api/jobs
# Should return 404
```

#### Phase 8: Create Frontend Monorepo (Week 5, 40 hours)

**Objective:** Set up monorepo infrastructure

**Day 1-2 (16h): Initialize monorepo**
- Create apps/ and packages/ folders
- Move recruitiq → apps/recruitiq
- Move portal → apps/portal
- Create pnpm-workspace.yaml
- Update root package.json

**Day 3 (8h): Setup shared tooling**
- Configure ESLint for monorepo
- Configure Prettier
- Configure Vite for all apps
- Setup Turbo repo (optional)

**Day 4-5 (16h): Test build & dev**
- Test dev mode for each app
- Test build for each app
- Fix any issues
- Document commands

**Deliverables:**
- ✅ Monorepo structure working
- ✅ All apps build successfully
- ✅ Dev mode works for all apps

**Risk:** Low - Non-breaking infrastructure change

**Validation:**
```bash
pnpm run dev:recruitiq
pnpm run dev:portal
pnpm run build
```

#### Phase 9: Extract Shared UI Components (Week 5-6, 80 hours)

**Objective:** Create shared UI library

**Day 1-3 (24h): Extract basic components**
- Extract Layout, Card, Modal, Button, Input
- Create packages/ui/ structure
- Export components
- Add Storybook (optional)

**Day 4-6 (24h): Extract auth components**
- Extract MFASetup, MFAVerification
- Extract SessionManagement
- Extract ProtectedRoute

**Day 7-8 (16h): Extract utility hooks**
- Extract useAuth hook
- Extract usePermissions hook
- Extract other shared hooks

**Day 9-10 (16h): Testing**
- Test shared components in both apps
- Fix styling issues
- Document components

**Deliverables:**
- ✅ Shared UI library created
- ✅ 11+ shared components
- ✅ Components work in both apps

**Risk:** Medium - Styling and behavior must be consistent

**Validation:**
```bash
cd packages/ui
pnpm run build
pnpm run storybook
```

#### Phase 10: Create API Client Package (Week 6, 40 hours)

**Objective:** Extract API logic to shared package

**Day 1-2 (16h): Create apiClient base**
- Create packages/api-client/
- Extract base HTTP client
- Add interceptors
- Add error handling

**Day 3-4 (16h): Extract product APIs**
- Extract RecruitIQ API methods
- Extract Portal API methods
- Organize by feature

**Day 5 (8h): Testing**
- Test API methods
- Update apps to use shared client
- Fix any issues

**Deliverables:**
- ✅ API client package created
- ✅ All API methods migrated
- ✅ Apps using shared client

**Risk:** Medium - Critical path for all API calls

#### Phase 11: Update Frontend Imports (Week 7, 80 hours)

**Objective:** Update all frontend imports to use shared packages

**Day 1-3 (24h): Update RecruitIQ app**
- Update component imports
- Update API client imports
- Update hook imports
- Test application

**Day 4-5 (16h): Update Portal app**
- Update component imports
- Update API client imports
- Test application

**Day 6-10 (40h): Testing & Bug Fixes**
- Test all features in RecruitIQ
- Test all features in Portal
- Fix UI/UX issues
- Fix API issues
- Performance testing

**Deliverables:**
- ✅ All imports updated
- ✅ Both apps working
- ✅ No regressions

**Risk:** High - Many imports to update

#### Phase 12: Full Integration Testing (Week 8, 80 hours)

**Objective:** Comprehensive testing of entire system

**Day 1-2 (16h): Backend testing**
- Test all API endpoints
- Load testing
- Security testing
- Performance testing

**Day 3-4 (16h): Frontend testing**
- Test all user flows
- Test all features
- Cross-browser testing
- Mobile testing

**Day 5-6 (16h): End-to-end testing**
- Test complete workflows
- Test RecruitIQ features
- Test Portal features
- Test authentication flows

**Day 7-8 (16h): Bug fixes**
- Fix critical bugs
- Fix high priority bugs
- Regression testing

**Day 9-10 (16h): Documentation & deployment**
- Update all documentation
- Prepare deployment plan
- Create rollback plan
- Deploy to staging

**Deliverables:**
- ✅ All tests passing
- ✅ No critical bugs
- ✅ Documentation updated
- ✅ Ready for production

**Risk:** Critical - Final validation before production

---

## 9. Testing Strategy

### 9.1 Testing Levels

#### Unit Tests
**Coverage Target:** >80%

**Backend:**
```bash
# Test core modules
npm test -- core/auth
npm test -- core/security
npm test -- core/middleware

# Test product modules
npm test -- products/recruitiq
npm test -- products/portal
```

**Frontend:**
```bash
# Test shared UI components
pnpm run --filter=@recruitiq/ui test

# Test apps
pnpm run --filter=recruitiq test
pnpm run --filter=portal test
```

#### Integration Tests
**Focus:** API endpoints and database operations

```javascript
// Test RecruitIQ job endpoints
describe('RecruitIQ Jobs API', () => {
  it('GET /api/recruitiq/jobs - should return paginated jobs', async () => {
    const response = await request(app)
      .get('/api/recruitiq/jobs?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('jobs');
    expect(response.body).toHaveProperty('pagination');
  });
  
  it('POST /api/recruitiq/jobs - should create job', async () => {
    const jobData = {
      title: 'Software Engineer',
      description: 'We are hiring',
      location: 'Paramaribo',
    };
    
    const response = await request(app)
      .post('/api/recruitiq/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send(jobData);
    
    expect(response.status).toBe(201);
    expect(response.body.job).toHaveProperty('id');
  });
});
```

#### End-to-End Tests
**Focus:** Complete user workflows

```javascript
// Test candidate application flow
describe('Candidate Application Flow', () => {
  it('should complete full application process', async () => {
    // 1. Candidate views public job listing
    const jobsResponse = await request(app)
      .get('/api/recruitiq/public/jobs');
    
    const jobId = jobsResponse.body.jobs[0].id;
    
    // 2. Candidate submits application
    const applicationResponse = await request(app)
      .post('/api/recruitiq/public/apply')
      .send({
        jobId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        resume: 'base64...',
      });
    
    expect(applicationResponse.status).toBe(201);
    
    // 3. Recruiter reviews application
    const applicationsResponse = await request(app)
      .get('/api/recruitiq/applications')
      .set('Authorization', `Bearer ${recruiterToken}`);
    
    expect(applicationsResponse.body.applications).toContainEqual(
      expect.objectContaining({
        email: 'john@example.com',
      })
    );
    
    // 4. Recruiter schedules interview
    const interviewResponse = await request(app)
      .post('/api/recruitiq/interviews')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({
        candidateId: applicationResponse.body.candidate.id,
        dateTime: '2025-11-10T14:00:00Z',
        type: 'video',
      });
    
    expect(interviewResponse.status).toBe(201);
  });
});
```

### 9.2 Regression Testing Checklist

**Critical Paths to Test After Each Phase:**

✅ **Authentication & Authorization:**
- [ ] User can log in
- [ ] User can log out
- [ ] MFA setup works
- [ ] MFA verification works
- [ ] Password reset works
- [ ] Session management works
- [ ] Role-based access control works

✅ **RecruitIQ Features:**
- [ ] Create/edit/delete jobs
- [ ] View job listings
- [ ] Receive applications
- [ ] Add candidates manually
- [ ] Schedule interviews
- [ ] Send communications
- [ ] Use flow templates
- [ ] Dashboard displays correctly

✅ **Portal Features:**
- [ ] Create/edit customers
- [ ] Assign licenses
- [ ] Provision VPS
- [ ] View analytics
- [ ] Manage users
- [ ] Billing features

✅ **Performance:**
- [ ] API response times <500ms (p95)
- [ ] Page load times <2s
- [ ] No memory leaks
- [ ] No N+1 queries

✅ **Security:**
- [ ] CSRF protection works
- [ ] Rate limiting works
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] Sensitive data encrypted

### 9.3 Automated Testing Pipeline

**GitHub Actions Workflow:**
```yaml
name: CI/CD

on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
        working-directory: ./backend
      
      - name: Run linter
        run: npm run lint
        working-directory: ./backend
      
      - name: Run unit tests
        run: npm test
        working-directory: ./backend
      
      - name: Run integration tests
        run: npm run test:integration
        working-directory: ./backend
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
  
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run linter
        run: pnpm run lint
      
      - name: Run tests
        run: pnpm run test
      
      - name: Build apps
        run: pnpm run build
```

---

## 10. Rollback Plan

### 10.1 Rollback Strategy

**Git-Based Rollback:**

```bash
# Each phase is a separate branch
git checkout phase-1-structure
git checkout phase-2-core-files
git checkout phase-3-recruitiq
# ... etc

# If phase fails, rollback to previous phase
git checkout phase-2-core-files
git branch -D phase-3-recruitiq
```

**Branch Strategy:**
```
master (production)
├── restructure-main (integration branch)
    ├── phase-1-structure
    ├── phase-2-core-files
    ├── phase-3-recruitiq
    ├── phase-4-split-controllers
    ├── phase-5-portal
    ├── phase-6-imports
    ├── phase-7-routing
    ├── phase-8-frontend-monorepo
    ├── phase-9-shared-ui
    ├── phase-10-api-client
    └── phase-11-frontend-imports
```

### 10.2 Rollback Triggers

**Automatic Rollback Conditions:**
- Test coverage drops below 70%
- More than 5 critical bugs discovered
- Performance degrades >20%
- Security vulnerability introduced
- Database migration fails

**Manual Rollback Decision Points:**
- Stakeholder disapproval
- Timeline exceeds 12 weeks
- Resource constraints
- Scope creep

### 10.3 Rollback Procedures

#### Backend Rollback

**Scenario 1: Phase 2-7 (Backend restructuring)**

```bash
# 1. Stop application
pm2 stop recruitiq-backend

# 2. Checkout previous working branch
git checkout <previous-phase-branch>

# 3. Reinstall dependencies (if needed)
npm ci

# 4. Rollback database (if migrations were run)
npm run migrate:rollback

# 5. Restart application
pm2 start recruitiq-backend

# 6. Verify application is working
curl http://localhost:3000/health
```

**Scenario 2: Import updates break application**

```bash
# Find broken imports
grep -r "Cannot find module" logs/error.log

# Automated fix script
node scripts/fix-imports.js

# Or rollback entire phase
git checkout phase-6-imports^  # Previous commit
```

#### Frontend Rollback

**Scenario 1: Monorepo migration fails**

```bash
# 1. Stop dev servers
pkill -f "vite"

# 2. Rollback to separate apps
git checkout master
cd recruitiq && npm run dev &
cd portal && npm run dev &

# 3. Update environment variables
# VITE_API_URL=http://localhost:3000 (old structure)
```

**Scenario 2: Shared UI component breaks apps**

```bash
# Rollback specific package
cd packages/ui
git checkout <previous-commit>
pnpm run build

# Rebuild apps
pnpm run --filter=recruitiq build
pnpm run --filter=portal build
```

### 10.4 Database Rollback

**Migration Rollback:**
```javascript
// backend/src/database/migrations/20251103_create_paylinq_tables.js
exports.down = async function(knex) {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('policy_acknowledgements');
  await knex.schema.dropTableIfExists('policies');
  // ... more tables
};

// Execute rollback
npm run migrate:rollback
```

**Data Integrity Check After Rollback:**
```sql
-- Verify core tables
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM jobs;
SELECT COUNT(*) FROM candidates;

-- Check for orphaned records
SELECT COUNT(*) FROM applications
WHERE candidate_id NOT IN (SELECT id FROM candidates);

SELECT COUNT(*) FROM interviews
WHERE candidate_id NOT IN (SELECT id FROM candidates);
```

### 10.5 Monitoring During Migration

**Key Metrics to Monitor:**

| Metric | Baseline | Alert Threshold | Critical Threshold |
|--------|----------|-----------------|-------------------|
| API Response Time (p95) | 200ms | >500ms | >1000ms |
| Error Rate | 0.1% | >1% | >5% |
| Database Query Time (p95) | 50ms | >200ms | >500ms |
| Memory Usage | 500MB | >1GB | >2GB |
| CPU Usage | 20% | >60% | >80% |
| Test Coverage | 80% | <75% | <70% |

**Monitoring Tools:**
```javascript
// backend/src/core/middleware/monitoring.js
import prometheus from 'prom-client';

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 500, 1000, 2000],
});

export function monitoringMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
    
    // Alert if response time too high
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration,
      });
    }
  });
  
  next();
}
```

---

## 11. Success Criteria

### 11.1 Technical Success Criteria

✅ **Code Organization:**
- [ ] All products in separate folders
- [ ] Clear product boundaries
- [ ] No cross-product dependencies (except via events)
- [ ] Shared code in core/ folder

✅ **Testing:**
- [ ] >80% unit test coverage
- [ ] All integration tests passing
- [ ] All end-to-end tests passing
- [ ] Performance tests passing

✅ **Performance:**
- [ ] API response times <500ms (p95)
- [ ] Frontend load times <2s
- [ ] No regressions vs baseline
- [ ] Database query times <200ms (p95)

✅ **Quality:**
- [ ] Zero critical bugs
- [ ] <5 high priority bugs
- [ ] All security checks passing
- [ ] Code review approved

✅ **Documentation:**
- [ ] Architecture documented
- [ ] API documentation updated
- [ ] Developer guides updated
- [ ] Deployment guide updated

### 11.2 Business Success Criteria

✅ **Zero Downtime:**
- [ ] No service interruptions
- [ ] All existing customers unaffected
- [ ] All features continue to work

✅ **Developer Productivity:**
- [ ] Faster onboarding for new developers
- [ ] Clear ownership per product
- [ ] Easier to add new features
- [ ] Reduced merge conflicts

✅ **Scalability:**
- [ ] Products can be deployed independently
- [ ] Teams can work in parallel
- [ ] New products can be added easily
- [ ] Infrastructure costs unchanged

### 11.3 Acceptance Testing

**Sign-off Required From:**
1. **Tech Lead:** Code quality, architecture, performance
2. **DevOps:** Deployment, monitoring, rollback plan
3. **QA:** All tests passing, no regressions
4. **Product Owner:** All features working, UX unchanged
5. **Security:** Security audit passed

**Final Checklist:**
- [ ] All phases completed
- [ ] All tests passing
- [ ] All documentation updated
- [ ] Rollback plan tested
- [ ] Monitoring in place
- [ ] Team trained on new structure
- [ ] Stakeholders informed
- [ ] Go/No-go decision made

---

## 12. Post-Migration

### 12.1 Cleanup Tasks

**Week 9-10:**
- [ ] Delete old/unused files
- [ ] Remove deprecated code
- [ ] Clean up commented code
- [ ] Remove .refactored files
- [ ] Optimize imports
- [ ] Remove unused dependencies

**Commands:**
```bash
# Find unused files
npx depcheck

# Find unused exports
npx ts-prune

# Remove unused imports
npx eslint --fix

# Check bundle size
npm run build -- --analyze
```

### 12.2 Documentation Updates

**Documents to Update:**
- [ ] README.md (root and all products)
- [ ] CONTRIBUTING.md
- [ ] API_DOCUMENTATION.md
- [ ] ARCHITECTURE.md
- [ ] DEPLOYMENT.md
- [ ] DEVELOPER_GUIDE.md

**New Documents to Create:**
- [ ] MONOREPO_GUIDE.md
- [ ] PRODUCT_STRUCTURE.md
- [ ] SHARED_COMPONENTS.md
- [ ] EVENT_BUS_GUIDE.md

### 12.3 Team Training

**Training Sessions:**
1. **Architecture Overview (2h)**
   - New folder structure
   - Product boundaries
   - Core vs product code

2. **Development Workflow (2h)**
   - Working in monorepo
   - Using shared packages
   - Testing strategy

3. **Deployment Process (1h)**
   - New deployment pipeline
   - Rollback procedures
   - Monitoring

**Training Materials:**
- Video recordings
- Documentation
- Example PRs
- Cheat sheets

---

## 13. Summary

### 13.1 Migration Overview

**Total Effort:** 720 hours (8 weeks with 2 developers)

**Key Achievements:**
- ✅ Clear product boundaries
- ✅ Shared code in core/
- ✅ Frontend monorepo
- ✅ Shared UI library
- ✅ Shared API client
- ✅ Zero data loss
- ✅ Zero downtime

**Files Moved:**
- **Backend:** ~150 files → reorganized into 4 products
- **Frontend:** ~50 components → monorepo with shared library

**New Structure Benefits:**
1. **Scalability:** Easy to add new products (Paylinq, Nexus)
2. **Team Efficiency:** Clear ownership, parallel development
3. **Code Quality:** Shared components, consistent UX
4. **Maintainability:** Clear boundaries, easier debugging
5. **Deployment:** Independent product deployments

### 13.2 Next Steps After Restructuring

**Phase 2: Core Infrastructure (Weeks 9-12)**
- Implement event bus (Redis Streams)
- Implement message queue (Bull)
- Implement webhook infrastructure
- Setup API gateway (NGINX)

**Phase 3-7: Build New Products (Weeks 13-40)**
- Build Paylinq (Payroll)
- Build Nexus (HRIS)
- Integrate products via events

**Phase 8+: Scale & Optimize (Weeks 41+)**
- Performance optimization
- Advanced monitoring
- Auto-scaling
- Multi-region deployment

---

**End of Restructuring Plan**

This plan should be reviewed and approved by all stakeholders before starting the migration.

