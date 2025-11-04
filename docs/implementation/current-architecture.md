# Current Architecture Documentation

**Last Updated:** November 3, 2025  
**Purpose:** Comprehensive analysis of the existing RecruitIQ codebase to prepare for multi-product transformation

---

## 📋 Executive Summary

RecruitIQ is currently a single-product Applicant Tracking System (ATS) with a monolithic backend and React frontend. The system is **not yet in production**, which allows for clean refactoring into a multi-product architecture without data migration concerns.

**Current State:**
- **Backend:** Node.js/Express monolith with 16 controllers, 30+ services, 5 repositories
- **Database:** PostgreSQL with 27 tables (core ATS + license management + deployment infrastructure)
- **Frontend:** React SPA with Vite, Tailwind CSS, and modular components
- **Architecture:** Single-tenant with multi-workspace support
- **Deployment:** Supports both shared and dedicated deployment models

**Target State:**
- **Backend:** Multi-product architecture with three products (RecruitIQ ATS, Paylinq Payroll, Nexus HRIS)
- **Database:** Unified schema with product-specific tables and shared core tables
- **Frontend:** Three independent SPAs + admin portal, sharing common UI components
- **Architecture:** Multi-product SaaS with shared infrastructure

---

## 🏗️ Backend Architecture

### Directory Structure

```
backend/
├── src/
│   ├── config/              # Configuration files
│   ├── controllers/         # 16 controller files
│   ├── database/            # Schema, migrations, connection
│   ├── integrations/        # External integrations
│   ├── middleware/          # 16 middleware functions
│   ├── models/              # Data models
│   ├── modules/             # Modular components
│   ├── repositories/        # 5 repository files (data access layer)
│   ├── routes/              # 17 route files
│   ├── services/            # 30+ service files (business logic)
│   ├── shared/              # Shared utilities
│   ├── utils/               # Utility functions
│   └── server.js            # Application entry point
├── tests/                   # Test suites
├── scripts/                 # Deployment and utility scripts
├── logs/                    # Application logs
├── package.json
├── jest.config.js
└── docker-compose.yml
```

### Controllers (16 files)

| Controller | File | Purpose | Lines | Routes |
|------------|------|---------|-------|--------|
| **Auth** | `authController.js` | Authentication & authorization | ~300 | 10 |
| **MFA** | `mfaController.js` | Multi-factor authentication | ~150 | 5 |
| **User** | `userController.js` | User management | ~250 | 8 |
| **Organization** | `organizationController.js` | Organization management | ~200 | 6 |
| **Workspace** | `workspaceController.js` | Workspace management | ~200 | 7 |
| **Job** | `jobController.js` | Job posting management | ~300 | 9 |
| **Job (Refactored)** | `jobController.refactored.js` | Improved job controller | ~250 | 9 |
| **Candidate** | `candidateController.js` | Candidate management | ~350 | 10 |
| **Candidate (Refactored)** | `candidateController.refactored.js` | Improved candidate controller | ~300 | 10 |
| **Application** | `applicationController.js` | Application management | ~300 | 8 |
| **Application (Refactored)** | `applicationController.refactored.js` | Improved application controller | ~250 | 8 |
| **Interview** | `interviewController.js` | Interview scheduling | ~300 | 9 |
| **Interview (Refactored)** | `interviewController.refactored.js` | Improved interview controller | ~250 | 9 |
| **Communication** | `communicationController.js` | Email/SMS communication | ~200 | 5 |
| **Flow Template** | `flowTemplateController.js` | Workflow templates | ~150 | 6 |
| **Public** | `publicController.js` | Public API endpoints | ~100 | 3 |

**Key Observations:**
- Several controllers have "refactored" versions (newer, cleaner implementations)
- Most controllers follow RESTful patterns with CRUD operations
- Authentication is handled separately from authorization
- MFA is implemented as a separate concern

### Services (30+ files)

#### Core Services
```
services/
├── jobs/
│   ├── JobService.js                    # Job business logic
│   └── JobValidationService.js          # Job validation rules
├── candidates/
│   ├── CandidateService.js              # Candidate business logic
│   └── CandidateEnrichmentService.js    # Resume parsing, data enrichment
├── applications/
│   └── ApplicationService.js            # Application workflow logic
├── interviews/
│   └── InterviewService.js              # Interview scheduling logic
└── [other services]
```

#### Security & Infrastructure Services
- `mfaService.js` - MFA token generation and validation
- `passwordResetService.js` - Password reset flow
- `tokenBlacklist.js` - JWT token revocation
- `accountLockout.js` - Brute force protection
- `ipTracking.js` - IP-based security monitoring
- `securityMonitor.js` - Security event tracking
- `encryption.js` - Data encryption utilities
- `secretsManager.js` - Secrets management
- `transip.js` - VPS management via TransIP API
- `vpsManager.js` - VPS provisioning and management

### Repositories (5 files)

| Repository | Purpose | Tables | Key Methods |
|------------|---------|--------|-------------|
| **BaseRepository** | Abstract base class for all repos | - | `findById`, `findAll`, `create`, `update`, `delete` |
| **JobRepository** | Job data access | jobs | `findByWorkspace`, `findPublished`, `search` |
| **CandidateRepository** | Candidate data access | candidates | `findByWorkspace`, `search`, `findByEmail` |
| **ApplicationRepository** | Application data access | applications | `findByJob`, `findByCandidate`, `updateStatus` |
| **InterviewRepository** | Interview data access | interviews | `findByApplication`, `findByInterviewer`, `checkConflicts` |

**Key Observations:**
- All repositories extend `BaseRepository` for consistency
- Each repository maps to a single primary table
- Repositories handle all SQL queries (no raw SQL in controllers/services)
- Search functionality is implemented at the repository level

### Routes (17 files)

| Route File | Base Path | Endpoints | Authentication |
|------------|-----------|-----------|----------------|
| `auth.js` | `/api/auth` | 10 | Mixed (some public) |
| `mfa.routes.js` | `/api/mfa` | 5 | Required |
| `users.js` | `/api/users` | 8 | Required |
| `organizations.js` | `/api/organizations` | 6 | Required |
| `workspaces.js` | `/api/workspaces` | 7 | Required |
| `jobs.js` | `/api/jobs` | 9 | Mixed (public view) |
| `candidates.js` | `/api/candidates` | 10 | Required |
| `applications.js` | `/api/applications` | 8 | Required |
| `interviews.js` | `/api/interviews` | 9 | Required |
| `communications.js` | `/api/communications` | 5 | Required |
| `flowTemplates.js` | `/api/flow-templates` | 6 | Required |
| `public.js` | `/api/public` | 3 | Public |
| `portal.js` | `/api/portal` | 4 | Public (job portal) |
| `userManagement.js` | `/api/admin/users` | 10 | Admin only |
| `rolesPermissions.js` | `/api/admin/roles` | 8 | Admin only |
| `provisioning.js` | `/api/admin/provision` | 6 | Admin only |
| `security.js` | `/api/admin/security` | 5 | Admin only |

**Total Endpoints:** ~110-120 endpoints

**Key Observations:**
- RESTful API design with consistent patterns
- Public endpoints for job portal and candidate applications
- Admin routes separated with `/api/admin` prefix
- Most routes require authentication via JWT tokens
- Rate limiting applied to sensitive endpoints (auth, password reset)

### Middleware (16 files)

| Middleware | Purpose | Applied To |
|------------|---------|------------|
| `auth.js` | JWT token validation | Protected routes |
| `cors.js` | CORS configuration | All routes |
| `csrf.js` | CSRF protection | State-changing routes |
| `errorHandler.js` | Global error handling | All routes |
| `rateLimit.js` | Rate limiting | All routes (configurable) |
| `requestLogger.js` | HTTP request logging | All routes |
| `queryLogger.js` | SQL query logging | Database queries |
| `validation.js` | Request validation (Joi) | All routes with schemas |
| `securityHeaders.js` | Security headers (Helmet) | All routes |
| `securityMonitoring.js` | Security event tracking | All routes |
| `requestSecurity.js` | Input sanitization | All routes |
| `massAssignmentProtection.js` | Prevent mass assignment | Update/create routes |
| `checkFeature.js` | Feature flag checking | Feature-specific routes |
| `fileUpload.js` | File upload handling | Upload endpoints |
| `requestId.js` | Request ID generation | All routes |

**Middleware Chain (typical request):**
```
Request → CORS → Request ID → Security Headers → Rate Limit → Request Logger 
→ Authentication → Authorization → Validation → Security Monitoring 
→ Controller → Response
```

### Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Authentication Flow                      │
└─────────────────────────────────────────────────────────────┘

1. User Login
   POST /api/auth/login
   ↓
   Validate credentials (bcrypt password check)
   ↓
   Check MFA requirement (if enabled for organization)
   ↓
   Generate JWT access token (15min expiry)
   Generate refresh token (7 day expiry)
   ↓
   Store refresh token in database
   Track session (IP, user agent, location)
   ↓
   Return tokens + user data

2. Authenticated Request
   GET /api/jobs (with Authorization: Bearer <token>)
   ↓
   auth.js middleware extracts token
   ↓
   Verify JWT signature and expiry
   Check token not blacklisted
   ↓
   Load user from database (with roles/permissions)
   ↓
   Attach user to req.user
   ↓
   Controller processes request

3. Token Refresh
   POST /api/auth/refresh (with refresh token)
   ↓
   Validate refresh token in database
   Check not expired or revoked
   ↓
   Generate new access token
   Rotate refresh token (optional)
   ↓
   Return new tokens

4. Multi-Factor Authentication
   POST /api/auth/login (MFA required)
   ↓
   Return { requiresMFA: true, tempToken }
   ↓
   POST /api/mfa/verify (with tempToken + code)
   ↓
   Verify TOTP code
   ↓
   Complete login (issue real tokens)
```

**Authorization Model:**
- **Organizations** - Top-level tenant isolation
- **Workspaces** - Sub-tenants within an organization
- **Roles** - Named permission sets (Admin, Recruiter, Hiring Manager, etc.)
- **Permissions** - Granular access control (e.g., "jobs:create", "candidates:view")
- **Users** - Assigned to workspaces with specific roles

**Permission Check Flow:**
```javascript
// In middleware/auth.js
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// In routes
router.post('/jobs', requirePermission('jobs:create'), createJob);
```

### Configuration Management

**Files:**
- `config/database.js` - Database connection settings
- `config/auth.js` - JWT secrets, token expiry settings
- `config/email.js` - Email service configuration
- `config/storage.js` - File storage configuration
- `config/app.js` - Application-level settings

**Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/recruitiq
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recruitiq
DB_USER=postgres
DB_PASSWORD=secret

# JWT
JWT_SECRET=random_secret_key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=another_secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# External Services
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@recruitiq.com
SMTP_PASS=secret
```

---

## 🗄️ Database Schema

### Current Tables (27 total)

#### Core Application Tables (15)
1. **organizations** - Top-level tenants with licensing and deployment config
2. **users** - User accounts with authentication credentials
3. **permissions** - Granular permission definitions
4. **roles** - Named permission sets
5. **role_permissions** - Many-to-many role-permission mapping
6. **refresh_tokens** - Active refresh tokens for session management
7. **workspaces** - Sub-tenants within organizations
8. **workspace_members** - User-workspace-role associations
9. **flow_templates** - Workflow templates for candidate processing
10. **jobs** - Job postings with requirements and settings
11. **candidates** - Candidate profiles with resumes and contact info
12. **applications** - Job applications linking candidates to jobs
13. **interviews** - Interview scheduling and status
14. **interview_interviewers** - Many-to-many interview-user mapping
15. **communications** - Email/SMS communication log

#### Logging & Monitoring Tables (3)
16. **system_logs** - Application logs (errors, warnings, info)
17. **security_events** - Security-related events (login, failed auth, etc.)
18. **security_alerts** - Security alerts requiring attention

#### Deployment Infrastructure Tables (2)
19. **vps_instances** - VPS server instances for dedicated deployments
20. **instance_deployments** - Deployment history and status

#### License Management Tables (7)
21. **customers** - License customers (partners, resellers)
22. **tier_presets** - Predefined tier configurations
23. **licenses** - License keys and entitlements
24. **instances** - License instances (activations)
25. **usage_events** - Usage tracking for billing
26. **tier_migrations** - Tier upgrade/downgrade history
27. **license_audit_log** - Audit trail for license changes

### Key Relationships

```
organizations (1) ─── (M) workspaces
     │                       │
     │ (1)                   │ (M)
     │                       │
     └────── (M) users ──────┘
                │
                │ (1)
                │
                └─── (M) refresh_tokens

workspaces (1) ─── (M) workspace_members ─── (M) users
     │                                             │
     │ (1)                                         │ (M)
     │                                             │
     └─── (M) jobs                          roles ─┘
            │
            │ (1)
            │
            └─── (M) applications ─── (M) candidates
                       │
                       │ (1)
                       │
                       └─── (M) interviews ─── (M) interview_interviewers ─── (M) users
```

### Database Statistics

| Table | Estimated Columns | Primary Key | Foreign Keys | Indexes |
|-------|------------------|-------------|--------------|---------|
| organizations | 20+ | UUID | 1 (vps_id) | 5 |
| users | 25+ | UUID | 1 (organization_id) | 8 |
| workspaces | 10+ | UUID | 1 (organization_id) | 3 |
| jobs | 25+ | UUID | 2 (workspace_id, created_by) | 6 |
| candidates | 20+ | UUID | 2 (workspace_id, created_by) | 7 |
| applications | 15+ | UUID | 3 (job, candidate, workspace) | 5 |
| interviews | 20+ | UUID | 3 (application, workspace, created_by) | 6 |

**Total Indexes:** ~60-70 across all tables

---

## 🎨 Frontend Architecture

### Directory Structure

```
recruitiq/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Card.jsx
│   │   ├── Modal.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Button.jsx
│   │   └── [20+ components]
│   ├── pages/               # Page components (routes)
│   │   ├── Dashboard.jsx
│   │   ├── Jobs.jsx
│   │   ├── Candidates.jsx
│   │   ├── Applications.jsx
│   │   └── [15+ pages]
│   ├── contexts/            # React Context providers
│   │   ├── AuthContext.jsx
│   │   ├── ThemeContext.jsx
│   │   └── WorkspaceContext.jsx
│   ├── services/            # API client services
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── jobService.js
│   │   └── [10+ services]
│   ├── utils/               # Utility functions
│   │   ├── formatters.js
│   │   ├── validators.js
│   │   └── dateHelpers.js
│   ├── constants/           # Constants and enums
│   ├── App.jsx              # Root component
│   ├── main.jsx             # Application entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.cjs
```

### Technology Stack

- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v3
- **Routing:** React Router v6
- **State Management:** React Context API
- **HTTP Client:** Axios
- **Animations:** Framer Motion
- **Forms:** React Hook Form
- **Validation:** Joi (shared with backend)
- **Icons:** Heroicons
- **Date Handling:** date-fns

### Component Inventory

**Layout Components:**
- `Sidebar.jsx` - Collapsible navigation sidebar (256px/72px)
- `Header.jsx` - Top navigation bar (72px height)
- `Layout.jsx` - Main layout wrapper
- `PageHeader.jsx` - Page title and actions
- `Breadcrumbs.jsx` - Navigation breadcrumbs

**UI Components:**
- `Button.jsx` - Primary, secondary, danger button variants
- `Card.jsx` - Content cards with shadow
- `Modal.jsx` - Portal-based modal dialogs
- `Table.jsx` - Data table with sorting and filtering
- `Badge.jsx` - Status badges
- `Avatar.jsx` - User avatars with fallback
- `Dropdown.jsx` - Dropdown menus
- `Tabs.jsx` - Tab navigation
- `Input.jsx` - Form input with validation
- `Select.jsx` - Select dropdown
- `DatePicker.jsx` - Date selection
- `FileUpload.jsx` - File upload with drag-drop

**Feature Components:**
- `JobCard.jsx` - Job listing card
- `CandidateCard.jsx` - Candidate profile card
- `ApplicationPipeline.jsx` - Kanban board for applications
- `InterviewScheduler.jsx` - Calendar-based interview scheduling
- `CommunicationPanel.jsx` - Email/SMS interface
- `ActivityFeed.jsx` - Recent activity timeline

### Routing Structure

```javascript
// Protected routes (requires authentication)
<Route element={<ProtectedRoute />}>
  <Route path="/" element={<Layout />}>
    <Route index element={<Dashboard />} />
    <Route path="jobs" element={<Jobs />} />
    <Route path="jobs/:id" element={<JobDetails />} />
    <Route path="candidates" element={<Candidates />} />
    <Route path="candidates/:id" element={<CandidateProfile />} />
    <Route path="applications" element={<Applications />} />
    <Route path="interviews" element={<Interviews />} />
    <Route path="settings" element={<Settings />} />
  </Route>
</Route>

// Public routes
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/jobs/:slug" element={<PublicJobPage />} />
<Route path="/apply/:jobId" element={<ApplicationForm />} />
```

### API Integration Pattern

```javascript
// services/jobService.js
import api from './api';

export const jobService = {
  // Get all jobs
  async getJobs(workspaceId) {
    const response = await api.get(`/jobs?workspace=${workspaceId}`);
    return response.data;
  },

  // Get single job
  async getJob(id) {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  // Create job
  async createJob(data) {
    const response = await api.post('/jobs', data);
    return response.data;
  },

  // Update job
  async updateJob(id, data) {
    const response = await api.put(`/jobs/${id}`, data);
    return response.data;
  },

  // Delete job
  async deleteJob(id) {
    await api.delete(`/jobs/${id}`);
  }
};
```

### State Management

**Authentication State (AuthContext):**
```javascript
const AuthContext = React.createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    setUser(response.data.user);
    localStorage.setItem('token', response.data.accessToken);
    return response.data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 🔌 External Integrations

### Current Integrations

1. **Email Service** - SMTP integration for transactional emails
   - Welcome emails
   - Password reset emails
   - Interview notifications
   - Application status updates

2. **File Storage** - Local file system (planned: S3/Azure Blob)
   - Resume uploads
   - Attachment storage
   - Profile pictures

3. **TransIP API** - VPS provisioning for dedicated deployments
   - Create VPS instances
   - Configure networking
   - Deploy application containers

4. **Payment Gateway** - (Planned) Stripe/PayPal for subscriptions
   - Subscription management
   - Invoice generation
   - Payment processing

### Integration Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    External Services                      │
├──────────────────────────────────────────────────────────┤
│  SMTP Server  │  File Storage  │  VPS Provider  │  CDN   │
└────────┬──────────────┬──────────────┬──────────────┬────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                        │
         ┌──────────────▼──────────────┐
         │    Integration Layer        │
         │  (src/integrations/)        │
         └──────────────┬──────────────┘
                        │
         ┌──────────────▼──────────────┐
         │     Service Layer           │
         │   (Business Logic)          │
         └──────────────┬──────────────┘
                        │
         ┌──────────────▼──────────────┐
         │     Controller Layer        │
         │   (HTTP Endpoints)          │
         └─────────────────────────────┘
```

---

## 🧪 Testing Architecture

### Test Structure

```
backend/tests/
├── unit/                    # Unit tests for individual functions
│   ├── services/
│   ├── repositories/
│   └── utils/
├── integration/             # API endpoint tests
│   ├── auth.test.js
│   ├── jobs.test.js
│   ├── candidates.test.js
│   └── applications.test.js
├── security/                # Security-specific tests
│   ├── auth-enhanced.test.js
│   ├── validation.test.js
│   └── sql-injection.test.js
└── load/                    # Load and performance tests
    └── basic-load.test.js
```

### Testing Tools

- **Test Runner:** Jest
- **Assertion Library:** Jest built-in
- **HTTP Mocking:** Supertest
- **Database Mocking:** pg-mem (in-memory PostgreSQL)
- **Coverage:** Jest coverage reporter

### Current Test Coverage

- Unit tests: ~40% coverage
- Integration tests: ~60% coverage
- Security tests: Comprehensive
- Load tests: Basic scenarios

---

## 📊 Performance Characteristics

### Current Performance Metrics

**API Response Times (average):**
- GET requests: 50-150ms
- POST/PUT requests: 100-300ms
- Complex queries (search): 200-500ms

**Database:**
- Connection pool: 20 max connections
- Query timeout: 30 seconds
- Indexes: ~60-70 across all tables

**Bottlenecks Identified:**
1. Candidate search (no full-text search index)
2. Application pipeline queries (N+1 problem)
3. Interview scheduling (complex availability checks)
4. Email sending (synchronous, blocks request)

---

## 🔒 Security Architecture

### Security Layers

1. **Transport Security**
   - HTTPS enforced (production)
   - TLS 1.2+ required
   - HSTS headers

2. **Authentication**
   - JWT tokens (access + refresh)
   - bcrypt password hashing (10 rounds)
   - Multi-factor authentication (TOTP)
   - Session management with revocation

3. **Authorization**
   - Role-based access control (RBAC)
   - Permission-based authorization
   - Workspace-level isolation
   - Organization-level isolation

4. **Input Validation**
   - Joi schema validation
   - SQL injection prevention (parameterized queries)
   - XSS prevention (input sanitization)
   - CSRF protection

5. **Rate Limiting**
   - Global rate limit: 100 req/15min per IP
   - Auth endpoints: 5 req/15min per IP
   - Password reset: 3 req/hour per IP

6. **Monitoring & Auditing**
   - Security event logging
   - Failed login tracking
   - Account lockout (5 failed attempts)
   - IP address tracking
   - User agent logging

### Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## 📦 Dependencies

### Backend Dependencies (package.json)

**Core:**
- `express` v4.18.2 - Web framework
- `pg` v8.11.3 - PostgreSQL client
- `dotenv` v16.3.1 - Environment variables
- `cors` v2.8.5 - CORS middleware

**Authentication:**
- `jsonwebtoken` v9.0.2 - JWT tokens
- `bcryptjs` v2.4.3 - Password hashing
- `speakeasy` v2.0.0 - TOTP (MFA)
- `qrcode` v1.5.3 - QR code generation

**Validation:**
- `joi` v17.10.2 - Schema validation
- `validator` v13.11.0 - String validation

**Security:**
- `helmet` v7.0.0 - Security headers
- `express-rate-limit` v7.0.1 - Rate limiting
- `csrf` v3.1.0 - CSRF protection

**Utilities:**
- `nodemailer` v6.9.7 - Email sending
- `uuid` v9.0.1 - UUID generation
- `date-fns` v2.30.0 - Date manipulation

**Testing:**
- `jest` v29.7.0 - Test framework
- `supertest` v6.3.3 - HTTP assertions
- `pg-mem` v2.8.0 - In-memory PostgreSQL

### Frontend Dependencies

**Core:**
- `react` v18.2.0 - UI framework
- `react-dom` v18.2.0 - React DOM renderer
- `react-router-dom` v6.18.0 - Routing
- `vite` v4.5.0 - Build tool

**Styling:**
- `tailwindcss` v3.3.5 - Utility-first CSS
- `postcss` v8.4.31 - CSS processing
- `autoprefixer` v10.4.16 - CSS vendor prefixes

**HTTP:**
- `axios` v1.6.0 - HTTP client

**UI:**
- `framer-motion` v10.16.4 - Animations
- `@heroicons/react` v2.0.18 - Icons
- `react-hook-form` v7.48.2 - Form handling

---

## 🚀 Deployment Architecture

### Current Deployment Models

1. **Shared Deployment** (Default)
   - Single application instance
   - Multi-tenant database
   - Shared resources
   - Cost-effective for small/medium organizations

2. **Dedicated Deployment** (Enterprise)
   - Dedicated VPS instance per organization
   - Isolated database
   - Custom configuration
   - Enhanced security and performance

### Infrastructure Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer                            │
│                  (Nginx / Cloudflare)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐           ┌────▼─────┐
    │  Shared  │           │Dedicated │
    │ Instance │           │ Instance │
    │          │           │  (VPS)   │
    └────┬─────┘           └────┬─────┘
         │                      │
    ┌────▼─────┐           ┌────▼─────┐
    │ Shared   │           │Dedicated │
    │ Database │           │ Database │
    └──────────┘           └──────────┘
```

### Deployment Process

1. **Code Push** - Push to GitHub
2. **CI/CD** - Automated tests run
3. **Build** - Docker image built
4. **Deploy** - Image deployed to servers
5. **Health Check** - Automated health checks
6. **Rollback** - Automatic rollback on failure

---

## 📝 Summary & Recommendations

### Current Strengths

✅ **Well-Structured Codebase**
- Clear separation of concerns (controllers, services, repositories)
- Consistent naming conventions
- Good use of middleware for cross-cutting concerns

✅ **Security First**
- Comprehensive authentication and authorization
- Multiple security layers (JWT, MFA, rate limiting)
- Security monitoring and auditing

✅ **Scalable Architecture**
- Support for multiple deployment models
- Workspace-based multi-tenancy
- Repository pattern for data access

✅ **Testing Infrastructure**
- Jest test framework configured
- Unit, integration, and security tests
- Test coverage tracking

### Areas for Improvement

⚠️ **Code Duplication**
- Multiple "refactored" controller versions exist
- Consolidation needed before multi-product split

⚠️ **Performance Optimization Needed**
- Missing full-text search indexes
- N+1 query problems in some endpoints
- Synchronous email sending

⚠️ **Documentation Gaps**
- Limited inline documentation
- API documentation needs generation (Swagger/OpenAPI)
- Missing architecture diagrams

### Recommendations for Multi-Product Transformation

1. **Consolidate Refactored Controllers**
   - Remove old controller versions
   - Keep only refactored versions
   - Update routes to use consolidated controllers

2. **Create Shared Core**
   - Extract authentication/authorization into core
   - Extract database utilities into core
   - Extract middleware into core

3. **Product-Specific Restructuring**
   - Move ATS controllers/services to `products/recruitiq/`
   - Create new structure for `products/paylinq/`
   - Create new structure for `products/nexus/`

4. **Database Schema Design**
   - Design unified schema with product-specific tables
   - Maintain shared tables (organizations, users, workspaces)
   - Add product-specific tables for Paylinq and Nexus

5. **API Versioning**
   - Implement API versioning (`/api/v1/recruit/...`)
   - Support product-specific routes
   - Maintain backward compatibility during transition

---

**Next Steps:** Proceed to Task 1.2 (Database Analysis) and Task 1.3 (API Endpoint Inventory) for detailed mapping.

**Document Status:** ✅ Complete  
**Last Updated:** November 3, 2025  
**Author:** Architecture Team
