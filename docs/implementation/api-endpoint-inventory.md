# API Endpoint Inventory

**Last Updated:** November 3, 2025  
**Purpose:** Complete inventory of all existing API endpoints for multi-product transformation planning

---

## 📋 Executive Summary

The current RecruitIQ backend exposes **123 endpoints** across **17 route files**:

- **Core Application:** 60 endpoints (ATS functionality)
- **Authentication & Security:** 19 endpoints
- **Admin/Portal:** 31 endpoints (platform administration)
- **Public/Career Portal:** 5 endpoints
- **Infrastructure/VPS:** 8 endpoints

**Base URL:** `/api`

---

## 🗂️ Endpoint Inventory by Route File

### 1. Authentication Routes (`/api/auth`)
**File:** `routes/auth.js`  
**Total Endpoints:** 12  
**Authentication:** Mixed (some public, some protected)

| Method | Endpoint | Auth | Rate Limit | Purpose | Product Mapping |
|--------|----------|------|------------|---------|-----------------|
| POST | `/auth/register` | Public | Standard | User registration | **Shared Core** |
| POST | `/auth/login` | Public | Standard | User login | **Shared Core** |
| POST | `/auth/logout` | Required | None | User logout | **Shared Core** |
| POST | `/auth/refresh` | Public | None | Refresh access token | **Shared Core** |
| GET | `/auth/me` | Required | None | Get current user | **Shared Core** |
| POST | `/auth/forgot-password` | Public | 3/hour | Request password reset | **Shared Core** |
| GET | `/auth/reset-password/:token` | Public | None | Verify reset token | **Shared Core** |
| POST | `/auth/reset-password` | Public | 3/hour | Reset password | **Shared Core** |
| GET | `/auth/sessions` | Required | None | Get active sessions | **Shared Core** |
| DELETE | `/auth/sessions/:sessionId` | Required | None | Revoke specific session | **Shared Core** |
| DELETE | `/auth/sessions` | Required | None | Revoke all other sessions | **Shared Core** |

**Controller:** `authController.js`  
**Dependencies:** `bcryptjs`, `jsonwebtoken`, `refresh_tokens` table

---

### 2. Multi-Factor Authentication Routes (`/api/mfa`)
**File:** `routes/mfa.routes.js`  
**Total Endpoints:** 8  
**Authentication:** Mixed

| Method | Endpoint | Auth | Rate Limit | Purpose | Product Mapping |
|--------|----------|------|------------|---------|-----------------|
| POST | `/mfa/setup` | Required + Feature | 3/hour | Initialize MFA setup (QR code) | **Shared Core** |
| POST | `/mfa/verify-setup` | Required + Feature | 5/5min | Verify TOTP and enable MFA | **Shared Core** |
| POST | `/mfa/verify` | Public (temp token) | 5/5min | Verify MFA during login | **Shared Core** |
| POST | `/mfa/use-backup-code` | Public (temp token) | 5/5min | Use backup code for login | **Shared Core** |
| POST | `/mfa/disable` | Required + Feature | 5/hour | Disable MFA | **Shared Core** |
| POST | `/mfa/regenerate-backup-codes` | Required + Feature | 5/hour | Generate new backup codes | **Shared Core** |
| GET | `/mfa/status` | Required + Feature | None | Get MFA status | **Shared Core** |

**Controller:** `mfaController.js`  
**Dependencies:** `speakeasy`, `qrcode`, `users.mfa_secret`

---

### 3. User Management Routes (`/api/users`)
**File:** `routes/users.js`  
**Total Endpoints:** 8  
**Authentication:** Required (all)

| Method | Endpoint | Auth | Role Required | Purpose | Product Mapping |
|--------|----------|------|---------------|---------|-----------------|
| GET | `/users` | Required | None | List all users | **Shared Core** |
| POST | `/users` | Required | owner/admin | Create/invite user | **Shared Core** |
| GET | `/users/:id` | Required | None | Get user by ID | **Shared Core** |
| PUT | `/users/:id` | Required | None (own) | Update user profile | **Shared Core** |
| PATCH | `/users/:id/role` | Required | owner/admin | Update user role | **Shared Core** |
| PATCH | `/users/:id/status` | Required | owner/admin | Update user active status | **Shared Core** |
| DELETE | `/users/:id` | Required | owner/admin | Delete user | **Shared Core** |

**Controller:** `userController.js`  
**Dependencies:** `users` table, RBAC middleware

---

### 4. Organization Routes (`/api/organizations`)
**File:** `routes/organizations.js`  
**Total Endpoints:** 5  
**Authentication:** Required (all)

| Method | Endpoint | Auth | Purpose | Product Mapping |
|--------|----------|------|---------|-----------------|
| GET | `/organizations` | Required | Get current organization | **Shared Core** |
| PUT | `/organizations` | Required | Update organization | **Shared Core** |
| GET | `/organizations/stats` | Required | Get usage statistics | **Shared Core** |
| GET | `/organizations/session-policy` | Required | Get session policy | **Shared Core** |
| PUT | `/organizations/session-policy` | Required | Update session policy | **Shared Core** |

**Controller:** `organizationController.js`  
**Dependencies:** `organizations` table

---

### 5. Workspace Routes (`/api/workspaces`)
**File:** `routes/workspaces.js`  
**Total Endpoints:** 9  
**Authentication:** Required (all)

| Method | Endpoint | Auth | Purpose | Product Mapping |
|--------|----------|------|---------|-----------------|
| GET | `/workspaces` | Required | List all workspaces | **Shared Core** |
| POST | `/workspaces` | Required | Create workspace | **Shared Core** |
| GET | `/workspaces/:id` | Required | Get workspace details | **Shared Core** |
| PUT | `/workspaces/:id` | Required | Update workspace | **Shared Core** |
| DELETE | `/workspaces/:id` | Required | Delete workspace | **Shared Core** |
| GET | `/workspaces/:id/members` | Required | Get workspace members | **Shared Core** |
| POST | `/workspaces/:id/members` | Required | Add member to workspace | **Shared Core** |
| DELETE | `/workspaces/:id/members/:userId` | Required | Remove member | **Shared Core** |

**Controller:** `workspaceController.js`  
**Dependencies:** `workspaces`, `workspace_members` tables

---

### 6. Job Routes (`/api/jobs`)
**File:** `routes/jobs.js`  
**Total Endpoints:** 9 (7 protected + 2 public)  
**Authentication:** Mixed

| Method | Endpoint | Auth | Purpose | Product Mapping |
|--------|----------|------|---------|-----------------|
| GET | `/jobs/public` | Public | List public jobs | **RecruitIQ** |
| GET | `/jobs/public/:id` | Public | Get public job | **RecruitIQ** |
| GET | `/jobs` | Required | List all jobs | **RecruitIQ** |
| POST | `/jobs` | Required | Create job | **RecruitIQ** |
| GET | `/jobs/:id` | Required | Get job details | **RecruitIQ** |
| PUT | `/jobs/:id` | Required | Update job | **RecruitIQ** |
| PUT | `/jobs/:id/publish` | Required | Publish/unpublish job | **RecruitIQ** |
| PUT | `/jobs/:id/portal-settings` | Required | Update portal settings | **RecruitIQ** |
| DELETE | `/jobs/:id` | Required | Delete job | **RecruitIQ** |

**Controller:** `jobController.refactored.js`  
**Dependencies:** `jobs` table  
**Note:** Rename to `/api/recruit/jobs` in multi-product architecture

---

### 7. Candidate Routes (`/api/candidates`)
**File:** `routes/candidates.js`  
**Total Endpoints:** 6  
**Authentication:** Required (all)

| Method | Endpoint | Auth | Purpose | Product Mapping |
|--------|----------|------|---------|-----------------|
| GET | `/candidates` | Required | List all candidates | **RecruitIQ** |
| POST | `/candidates` | Required | Create candidate | **RecruitIQ** |
| GET | `/candidates/:id` | Required | Get candidate details | **RecruitIQ** |
| GET | `/candidates/:id/applications` | Required | Get candidate's applications | **RecruitIQ** |
| PUT | `/candidates/:id` | Required | Update candidate | **RecruitIQ** |
| DELETE | `/candidates/:id` | Required | Delete candidate | **RecruitIQ** |

**Controller:** `candidateController.refactored.js`  
**Dependencies:** `candidates` table  
**Note:** Rename to `/api/recruit/candidates` in multi-product architecture

---

### 8. Application Routes (`/api/applications`)
**File:** `routes/applications.js`  
**Total Endpoints:** 6 (4 protected + 2 public)  
**Authentication:** Mixed

| Method | Endpoint | Auth | Purpose | Product Mapping |
|--------|----------|------|---------|-----------------|
| GET | `/applications/track/:trackingCode` | Public | Track application by code | **RecruitIQ** |
| POST | `/applications` | Public | Submit application (career portal) | **RecruitIQ** |
| GET | `/applications` | Required | List applications | **RecruitIQ** |
| GET | `/applications/:id` | Required | Get application details | **RecruitIQ** |
| PUT | `/applications/:id` | Required | Update application | **RecruitIQ** |
| DELETE | `/applications/:id` | Required | Delete application | **RecruitIQ** |

**Controller:** `applicationController.refactored.js`  
**Dependencies:** `applications`, `candidates`, `jobs` tables  
**Note:** Rename to `/api/recruit/applications` in multi-product architecture

---

### 9. Interview Routes (`/api/interviews`)
**File:** `routes/interviews.js`  
**Total Endpoints:** 6  
**Authentication:** Required (all)

| Method | Endpoint | Auth | Purpose | Product Mapping |
|--------|----------|------|---------|-----------------|
| GET | `/interviews` | Required | List interviews | **RecruitIQ** |
| POST | `/interviews` | Required | Schedule interview | **RecruitIQ** |
| GET | `/interviews/:id` | Required | Get interview details | **RecruitIQ** |
| PUT | `/interviews/:id` | Required | Update interview | **RecruitIQ** |
| POST | `/interviews/:id/feedback` | Required | Submit feedback | **RecruitIQ** |
| DELETE | `/interviews/:id` | Required | Cancel interview | **RecruitIQ** |

**Controller:** `interviewController.refactored.js`  
**Dependencies:** `interviews`, `interview_interviewers` tables  
**Note:** Rename to `/api/recruit/interviews` in multi-product architecture

---

### 10. Communication Routes (`/api/communications`)
**File:** `routes/communications.js`  
**Total Endpoints:** 4  
**Authentication:** Required (all)

| Method | Endpoint | Auth | Purpose | Product Mapping |
|--------|----------|------|---------|-----------------|
| POST | `/communications` | Required | Send message to candidate | **RecruitIQ** |
| GET | `/communications/:applicationId` | Required | Get all communications | **RecruitIQ** |
| PUT | `/communications/:id/read` | Required | Mark as read | **RecruitIQ** |
| DELETE | `/communications/:id` | Required | Delete communication | **RecruitIQ** |

**Controller:** `communicationController.js`  
**Dependencies:** `communications` table  
**Note:** Rename to `/api/recruit/communications` in multi-product architecture

---

### 11. Flow Template Routes (`/api/flow-templates`)
**File:** `routes/flowTemplates.js`  
**Total Endpoints:** 6  
**Authentication:** Required (all)

| Method | Endpoint | Auth | Purpose | Product Mapping |
|--------|----------|------|---------|-----------------|
| GET | `/flow-templates` | Required | List all flow templates | **RecruitIQ** |
| POST | `/flow-templates` | Required | Create flow template | **RecruitIQ** |
| GET | `/flow-templates/:id` | Required | Get flow template details | **RecruitIQ** |
| PUT | `/flow-templates/:id` | Required | Update flow template | **RecruitIQ** |
| DELETE | `/flow-templates/:id` | Required | Delete flow template | **RecruitIQ** |
| POST | `/flow-templates/:id/clone` | Required | Clone flow template | **RecruitIQ** |

**Controller:** `flowTemplateController.js`  
**Dependencies:** `flow_templates` table  
**Note:** Rename to `/api/recruit/flow-templates` in multi-product architecture

---

### 12. Public/Career Portal Routes (`/api/public`)
**File:** `routes/public.js`  
**Total Endpoints:** 5  
**Authentication:** Public (no auth required)

| Method | Endpoint | Auth | Rate Limit | Purpose | Product Mapping |
|--------|----------|------|------------|---------|-----------------|
| GET | `/public/jobs/:identifier` | Public | Standard | Get public job by ID/slug | **RecruitIQ** |
| GET | `/public/careers/:organizationId` | Public | Standard | List public jobs for org | **RecruitIQ** |
| POST | `/public/jobs/:jobId/apply` | Public | Strict | Submit application | **RecruitIQ** |
| GET | `/public/track/:trackingCode` | Public | Standard | Get application status | **RecruitIQ** |
| POST | `/public/track/:trackingCode/documents` | Public | Standard | Upload document | **RecruitIQ** |

**Controller:** `publicController.js`  
**Dependencies:** `jobs`, `candidates`, `applications` tables  
**Note:** Keep as public routes for career portal

---

### 13. Admin Portal - Logs & Monitoring (`/api/portal`)
**File:** `routes/portal.js`  
**Total Endpoints:** 7  
**Authentication:** Platform Admin Only

| Method | Endpoint | Auth | Purpose | Product Mapping |
|--------|----------|------|---------|-----------------|
| GET | `/portal/logs` | Platform Admin | Query system logs | **Shared Core** |
| GET | `/portal/logs/security` | Platform Admin | Query security events | **Shared Core** |
| GET | `/portal/logs/search` | Platform Admin | Full-text search logs | **Shared Core** |
| GET | `/portal/logs/download` | Platform Admin | Download logs as CSV | **Shared Core** |
| GET | `/portal/stats` | Platform Admin | Platform statistics | **Shared Core** |

**Dependencies:** `system_logs`, `security_events` tables (central database)  
**Note:** Admin portal only, separate from product APIs

---

### 14. Admin Portal - User Management (`/api/portal/users`)
**File:** `routes/userManagement.js`  
**Total Endpoints:** 7  
**Authentication:** Platform Admin Only

| Method | Endpoint | Auth | Permission | Purpose | Product Mapping |
|--------|----------|------|------------|---------|-----------------|
| GET | `/portal/users` | Platform Admin | portal.view | Get all users | **Shared Core** |
| GET | `/portal/users/:id` | Platform Admin | portal.view | Get user details | **Shared Core** |
| POST | `/portal/users` | Platform Admin | portal.manage | Create user | **Shared Core** |
| PUT | `/portal/users/:id` | Platform Admin | portal.manage | Update user | **Shared Core** |
| PUT | `/portal/users/:id/permissions` | Platform Admin | portal.manage | Update permissions | **Shared Core** |
| DELETE | `/portal/users/:id` | Platform Admin | portal.manage | Delete user | **Shared Core** |

**Dependencies:** `users`, `permissions` tables  
**Note:** Admin portal only

---

### 15. Admin Portal - Roles & Permissions (`/api/portal/roles`, `/api/portal/permissions`)
**File:** `routes/rolesPermissions.js`  
**Total Endpoints:** 11  
**Authentication:** Platform Admin Only

| Method | Endpoint | Auth | Permission | Purpose | Product Mapping |
|--------|----------|------|------------|---------|-----------------|
| GET | `/portal/roles` | Platform Admin | portal.view | Get all roles | **Shared Core** |
| GET | `/portal/roles/:id` | Platform Admin | portal.view | Get role details | **Shared Core** |
| POST | `/portal/roles` | Platform Admin | portal.manage | Create role | **Shared Core** |
| PUT | `/portal/roles/:id` | Platform Admin | portal.manage | Update role | **Shared Core** |
| DELETE | `/portal/roles/:id` | Platform Admin | portal.manage | Delete role | **Shared Core** |
| GET | `/portal/permissions` | Platform Admin | portal.view | Get all permissions | **Shared Core** |
| POST | `/portal/permissions` | Platform Admin | portal.manage | Create permission | **Shared Core** |
| PUT | `/portal/permissions/:id` | Platform Admin | portal.manage | Update permission | **Shared Core** |
| DELETE | `/portal/permissions/:id` | Platform Admin | portal.manage | Delete permission | **Shared Core** |

**Dependencies:** `roles`, `permissions`, `role_permissions` tables  
**Note:** Admin portal only, RBAC management

---

### 16. Admin Portal - Provisioning (`/api/portal/instances`)
**File:** `routes/provisioning.js`  
**Total Endpoints:** 6  
**Authentication:** Platform Admin Only

| Method | Endpoint | Auth | Permission | Purpose | Product Mapping |
|--------|----------|------|------------|---------|-----------------|
| POST | `/portal/instances` | Platform Admin | None | Provision new client | **Shared Core** |
| GET | `/portal/instances/:deploymentId/status` | Platform Admin | None | Get deployment status | **Shared Core** |
| GET | `/portal/clients` | Platform Admin | None | Get all clients | **Shared Core** |
| GET | `/portal/vps/available` | Platform Admin | vps.view | Get available VPS | **Shared Core** |
| GET | `/portal/vps` | Platform Admin | vps.view | Get all VPS | **Shared Core** |
| GET | `/portal/vps/stats` | Platform Admin | vps.view | Get VPS statistics | **Shared Core** |
| POST | `/portal/vps` | Platform Admin | vps.create | Register VPS | **Shared Core** |

**Dependencies:** `organizations`, `instance_deployments`, `vps_instances` tables  
**Note:** Infrastructure management, admin portal only

---

### 17. Security Dashboard (`/api/security`)
**File:** `routes/security.js`  
**Total Endpoints:** 9  
**Authentication:** Admin/Security Admin

| Method | Endpoint | Auth | Role | Purpose | Product Mapping |
|--------|----------|------|------|---------|-----------------|
| GET | `/security/dashboard` | Required | admin/security_admin | Security overview | **Shared Core** |
| GET | `/security/metrics` | Required | admin/security_admin | Detailed metrics | **Shared Core** |
| GET | `/security/events` | Required | admin/security_admin | Recent security events | **Shared Core** |
| GET | `/security/alerts` | Required | admin/security_admin | Recent alerts | **Shared Core** |
| GET | `/security/threats` | Required | admin/security_admin | Active threats | **Shared Core** |
| GET | `/security/health` | Required | admin/security_admin | Security system health | **Shared Core** |
| GET | `/security/config` | Required | admin/security_admin | Security configuration | **Shared Core** |
| POST | `/security/test-alert` | Required | admin/security_admin | Test alert system | **Shared Core** |
| GET | `/security/statistics` | Required | admin/security_admin | Security statistics | **Shared Core** |

**Dependencies:** Security monitoring services  
**Note:** Keep as shared security dashboard

---

## 📊 Endpoint Summary by Product

### Shared Core Endpoints (60 endpoints)

These endpoints will remain accessible to ALL products:

**Authentication & User Management (31 endpoints):**
- `/api/auth/*` (12 endpoints) - Login, logout, password reset, sessions
- `/api/mfa/*` (8 endpoints) - Multi-factor authentication
- `/api/users/*` (8 endpoints) - User CRUD operations
- `/api/organizations/*` (5 endpoints) - Organization settings
- `/api/workspaces/*` (9 endpoints) - Workspace management

**Admin Portal (29 endpoints):**
- `/api/portal/logs/*` (5 endpoints) - Centralized logging
- `/api/portal/users/*` (6 endpoints) - Admin user management
- `/api/portal/roles/*` (5 endpoints) - Role management
- `/api/portal/permissions/*` (4 endpoints) - Permission management
- `/api/portal/instances/*` (3 endpoints) - Client provisioning
- `/api/portal/vps/*` (4 endpoints) - VPS management
- `/api/portal/clients` (1 endpoint) - Client list

**Security Dashboard (9 endpoints):**
- `/api/security/*` (9 endpoints) - Security monitoring

**Public Career Portal (5 endpoints):**
- `/api/public/*` (5 endpoints) - Public job portal

---

### RecruitIQ-Specific Endpoints (40 endpoints)

These endpoints are ONLY for the ATS product and will be renamed:

**Current Routes → New Routes:**
- `/api/jobs/*` → `/api/recruit/jobs/*` (9 endpoints)
- `/api/candidates/*` → `/api/recruit/candidates/*` (6 endpoints)
- `/api/applications/*` → `/api/recruit/applications/*` (6 endpoints)
- `/api/interviews/*` → `/api/recruit/interviews/*` (6 endpoints)
- `/api/communications/*` → `/api/recruit/communications/*` (4 endpoints)
- `/api/flow-templates/*` → `/api/recruit/flow-templates/*` (6 endpoints)

**Total:** 40 endpoints (37 protected + 3 public routes in applications)

---

### Paylinq Endpoints (NEW - To Be Created)

Based on Phase 9 (Paylinq Backend Services), estimate **65+ new endpoints**:

**Worker Management:**
- `/api/payroll/worker-types` - CRUD (5 endpoints)
- `/api/payroll/worker-type-templates` - CRUD (5 endpoints)

**Pay Components:**
- `/api/payroll/pay-components` - CRUD (5 endpoints)
- `/api/payroll/pay-formulas` - CRUD (5 endpoints)

**Tax Management:**
- `/api/payroll/tax-rule-sets` - CRUD (5 endpoints)
- `/api/payroll/tax-brackets` - CRUD (5 endpoints)
- `/api/payroll/tax-allowances` - CRUD (5 endpoints)
- `/api/payroll/tax/calculate` - Calculate tax (1 endpoint)

**Time & Attendance:**
- `/api/payroll/time-entries` - CRUD + approval (7 endpoints)
- `/api/payroll/rated-time-lines` - CRUD (5 endpoints)

**Scheduling:**
- `/api/payroll/work-schedules` - CRUD (5 endpoints)
- `/api/payroll/shift-assignments` - CRUD (5 endpoints)
- `/api/payroll/schedule-change-requests` - CRUD + approval (7 endpoints)

**Payroll Runs:**
- `/api/payroll/payroll-runs` - CRUD + process (7 endpoints)
- `/api/payroll/payroll-run-components` - List + update (2 endpoints)

**Reconciliation:**
- `/api/payroll/reconciliation-records` - CRUD (5 endpoints)
- `/api/payroll/reconciliation-items` - CRUD (5 endpoints)
- `/api/payroll/variance-explanations` - CRUD (5 endpoints)

**Deductions & Payments:**
- `/api/payroll/deductions` - CRUD (5 endpoints)
- `/api/payroll/worker-deductions` - CRUD (5 endpoints)
- `/api/payroll/payment-history` - List + details (2 endpoints)
- `/api/payroll/payment-batches` - CRUD (5 endpoints)

**Estimated Total:** 65+ endpoints

---

### Nexus Endpoints (NEW - To Be Created)

Based on Phase 12 (Nexus Backend Services), estimate **75+ new endpoints**:

**User Accounts (separate from core users):**
- `/api/hris/user-accounts` - CRUD (5 endpoints)

**Employee Management:**
- `/api/hris/employees` - CRUD + lifecycle (8 endpoints)
- `/api/hris/departments` - CRUD (5 endpoints)
- `/api/hris/locations` - CRUD (5 endpoints)
- `/api/hris/positions` - CRUD (5 endpoints)

**Contract Management:**
- `/api/hris/sequence-policies` - CRUD (5 endpoints)
- `/api/hris/sequence-steps` - CRUD (5 endpoints)
- `/api/hris/contracts` - CRUD + workflow (8 endpoints)

**Leave Management:**
- `/api/hris/leave-policies` - CRUD (5 endpoints)
- `/api/hris/leave-requests` - CRUD + approval (8 endpoints)
- `/api/hris/leave-balances` - List + calculate (2 endpoints)

**Attendance:**
- `/api/hris/attendance-records` - CRUD + reporting (7 endpoints)

**Rule Engine:**
- `/api/hris/rules` - CRUD + execute (7 endpoints)
- `/api/hris/rule-execution-logs` - List + details (2 endpoints)

**Performance Management:**
- `/api/hris/performance-reviews` - CRUD + workflow (8 endpoints)
- `/api/hris/performance-goals` - CRUD (5 endpoints)

**Benefits:**
- `/api/hris/benefits` - CRUD (5 endpoints)
- `/api/hris/benefit-enrollments` - CRUD (5 endpoints)

**Documents:**
- `/api/hris/documents` - CRUD + templates (7 endpoints)

**Estimated Total:** 75+ endpoints

---

## 🎯 Multi-Product API Architecture

### Proposed Route Structure

```
/api
├── /auth/*                          # Shared authentication (12)
├── /mfa/*                           # Shared MFA (8)
├── /users/*                         # Shared user management (8)
├── /organizations/*                 # Shared organization settings (5)
├── /workspaces/*                    # Shared workspace management (9)
├── /public/*                        # Shared public endpoints (5)
├── /security/*                      # Shared security dashboard (9)
│
├── /portal                          # Admin Portal (Platform Admins Only)
│   ├── /logs/*                      # Centralized logs (5)
│   ├── /users/*                     # Admin user management (6)
│   ├── /roles/*                     # Role management (5)
│   ├── /permissions/*               # Permission management (4)
│   ├── /instances/*                 # Client provisioning (3)
│   ├── /vps/*                       # VPS management (4)
│   └── /clients                     # Client list (1)
│
├── /recruit                         # RecruitIQ ATS (40 endpoints)
│   ├── /jobs/*                      # Job management (9)
│   ├── /candidates/*                # Candidate management (6)
│   ├── /applications/*              # Application tracking (6)
│   ├── /interviews/*                # Interview scheduling (6)
│   ├── /communications/*            # Candidate communications (4)
│   └── /flow-templates/*            # Workflow templates (6)
│
├── /payroll                         # Paylinq Payroll (65+ endpoints)
│   ├── /worker-types/*              # Worker type management
│   ├── /pay-components/*            # Pay component configuration
│   ├── /tax/*                       # Tax calculation & management
│   ├── /time-entries/*              # Time & attendance
│   ├── /work-schedules/*            # Shift scheduling
│   ├── /payroll-runs/*              # Payroll processing
│   ├── /reconciliation/*            # Reconciliation & variance
│   ├── /deductions/*                # Deduction management
│   └── /payment-history/*           # Payment tracking
│
└── /hris                            # Nexus HRIS (75+ endpoints)
    ├── /user-accounts/*             # User account management
    ├── /employees/*                 # Employee lifecycle
    ├── /contracts/*                 # Contract management
    ├── /leave/*                     # Leave management
    ├── /attendance/*                # Attendance tracking
    ├── /rules/*                     # Rule engine
    ├── /performance/*               # Performance reviews
    ├── /benefits/*                  # Benefits management
    └── /documents/*                 # Document management
```

### Total Endpoint Count

| Product | Current | New (Estimated) | Total |
|---------|---------|-----------------|-------|
| **Shared Core** | 60 | 0 | 60 |
| **Admin Portal** | 31 | 0 | 31 |
| **RecruitIQ (ATS)** | 40 | 0 | 40 |
| **Paylinq (Payroll)** | 0 | 65+ | 65+ |
| **Nexus (HRIS)** | 0 | 75+ | 75+ |
| **Public/Career Portal** | 5 | 0 | 5 |
| **Security Dashboard** | 9 | 0 | 9 |
| **TOTAL** | **123** | **140+** | **263+** |

---

## 🔐 Authentication & Authorization Patterns

### Current Authentication Flow

```
┌──────────────────────────────────────────────────────────┐
│                  Request Flow                             │
└──────────────────────────────────────────────────────────┘

1. Client Request
   ↓
2. CORS Middleware
   ↓
3. Security Headers Middleware
   ↓
4. Rate Limiting Middleware
   ↓
5. Request Logger Middleware
   ↓
6. Authentication Middleware (authenticate)
   - Extract JWT from Authorization header
   - Verify JWT signature
   - Check token not blacklisted
   - Load user from database
   - Attach user to req.user
   ↓
7. Authorization Middleware (requireRole, requirePermission)
   - Check user.role matches required role
   - Check user has required permission
   ↓
8. Validation Middleware (validate)
   - Validate request body/params/query
   ↓
9. Controller
   ↓
10. Response
```

### Authentication Types by Route

**Public Routes (no auth):**
- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/refresh`
- `/api/auth/forgot-password`
- `/api/auth/reset-password/*`
- `/api/mfa/verify`
- `/api/mfa/use-backup-code`
- `/api/jobs/public/*`
- `/api/applications` (POST - public application submission)
- `/api/applications/track/:trackingCode`
- `/api/public/*`

**Authenticated Routes (JWT required):**
- All other `/api/auth/*` endpoints
- All `/api/mfa/*` (except verify endpoints)
- All `/api/users/*`
- All `/api/organizations/*`
- All `/api/workspaces/*`
- All `/api/jobs/*` (except public)
- All `/api/candidates/*`
- All `/api/applications/*` (except public)
- All `/api/interviews/*`
- All `/api/communications/*`
- All `/api/flow-templates/*`
- All `/api/security/*`

**Platform Admin Only:**
- All `/api/portal/*` endpoints
  - Requires `user_type = 'platform'`
  - Most require specific permissions (portal.view, portal.manage, vps.*)

**Role-Based:**
- `/api/users` POST, DELETE - Requires owner/admin role
- `/api/users/:id/role` PATCH - Requires owner/admin role
- `/api/users/:id/status` PATCH - Requires owner/admin role

---

## 🔄 Rate Limiting by Endpoint Type

| Endpoint Category | Rate Limit | Window | Purpose |
|-------------------|------------|--------|---------|
| **Global Default** | 100 requests | 15 min | Prevent API abuse |
| **Authentication** | 5 requests | 15 min | Prevent brute force |
| **Password Reset** | 3 requests | 1 hour | Prevent abuse |
| **MFA Verification** | 5 requests | 5 min | Prevent brute force |
| **MFA Setup** | 3 requests | 1 hour | Prevent setup abuse |
| **MFA Management** | 5 requests | 1 hour | Prevent disable abuse |
| **Public Application** | Strict | Custom | Prevent spam |
| **Public Job Views** | Standard | 15 min | Allow browsing |

---

## 🎯 Migration Strategy

### Phase 1: Add Product Identifier
```javascript
// Add product param to all routes
app.use('/api/auth', authRoutes); // Shared
app.use('/api/users', userRoutes); // Shared
app.use('/api/jobs', jobRoutes); // Add product check middleware
```

### Phase 2: Create Product-Specific Routes
```javascript
// New route structure
app.use('/api/recruit/jobs', recruitJobRoutes);
app.use('/api/recruit/candidates', recruitCandidateRoutes);
app.use('/api/payroll/payroll-runs', payrollRunRoutes);
app.use('/api/hris/employees', hrisEmployeeRoutes);
```

### Phase 3: Maintain Backward Compatibility
```javascript
// Redirect old routes to new routes
app.use('/api/jobs', (req, res, next) => {
  // Redirect to /api/recruit/jobs
  res.redirect(308, `/api/recruit${req.url}`);
});
```

### Phase 4: Deprecate Old Routes
```javascript
// Add deprecation warnings
app.use('/api/jobs', (req, res, next) => {
  res.set('X-API-Deprecated', 'true');
  res.set('X-API-New-Endpoint', '/api/recruit/jobs');
  next();
});
```

---

## 📝 Summary & Recommendations

### Current State Assessment

✅ **Strengths:**
- RESTful API design with consistent patterns
- Comprehensive authentication with MFA support
- Role-based access control (RBAC)
- Rate limiting on sensitive endpoints
- Input validation with Joi schemas
- Separation of public and protected routes
- Admin portal for platform administration

⚠️ **Areas for Improvement:**
- No API versioning (e.g., `/api/v1/`)
- No formal API documentation (Swagger/OpenAPI)
- Some routes use legacy controllers (need consolidation)
- No product-based route organization
- Missing HATEOAS links in responses

### Multi-Product Recommendations

1. **Implement API Versioning**
   ```
   /api/v1/auth/*
   /api/v1/recruit/*
   /api/v1/payroll/*
   /api/v1/hris/*
   ```

2. **Product-Specific Route Prefixes**
   - Keep shared routes: `/api/auth`, `/api/users`, `/api/organizations`, `/api/workspaces`
   - Rename RecruitIQ routes: `/api/jobs` → `/api/recruit/jobs`
   - New Paylinq routes: `/api/payroll/*`
   - New Nexus routes: `/api/hris/*`

3. **Generate OpenAPI/Swagger Documentation**
   - Auto-generate from route definitions
   - Provide interactive API explorer
   - Document all request/response schemas

4. **Implement Product-Based Middleware**
   ```javascript
   function requireProduct(productName) {
     return (req, res, next) => {
       if (!req.user.organization.enabledProducts.includes(productName)) {
         return res.status(403).json({ error: 'Product not enabled' });
       }
       next();
     };
   }
   ```

5. **Add Product Filtering to Shared Endpoints**
   - `/api/users?product=recruitiq` - Filter users by product
   - `/api/workspaces?product=payroll` - Filter workspaces by product

---

**Document Status:** ✅ Complete  
**Last Updated:** November 3, 2025  
**Total Endpoints Documented:** 123 current + 140+ planned = 263+  
**Route Files Analyzed:** 17
