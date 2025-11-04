# Frontend Architecture Analysis

**Document Version:** 1.0  
**Last Updated:** November 3, 2025  
**Status:** In Progress  
**Author:** Development Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Frontend Applications Overview](#frontend-applications-overview)
3. [Technology Stack](#technology-stack)
4. [Application Structure - RecruitIQ](#application-structure-recruitiq)
5. [Application Structure - Portal](#application-structure-portal)
6. [Routing Architecture](#routing-architecture)
7. [State Management](#state-management)
8. [Component Architecture](#component-architecture)
9. [API Integration Layer](#api-integration-layer)
10. [Build & Development Configuration](#build--development-configuration)
11. [Testing Strategy](#testing-strategy)
12. [Reusable Components for Shared Library](#reusable-components-for-shared-library)
13. [Multi-Product Migration Strategy](#multi-product-migration-strategy)

---

## 1. Executive Summary

### Current State
RecruitIQ has **two separate React applications** running independently:
- **RecruitIQ App** (`recruitiq/`) - Customer-facing ATS application
- **Admin Portal** (`portal/`) - Platform administration and monitoring

### Key Findings
- ✅ **Modern Stack**: React 18.2, Vite 7.1, React Router v7, TanStack Query v5
- ✅ **Well-Structured**: Clear separation of concerns with Context API for state
- ✅ **Type-Safe Routing**: Protected routes with role-based access control
- ✅ **API Layer**: Custom API clients with token management and error handling
- ⚠️ **No Shared UI**: Components duplicated between apps
- ⚠️ **Different Patterns**: Portal uses Axios, RecruitIQ uses Fetch
- ⚠️ **Manual Builds**: No monorepo structure or shared packages

### Recommendations
1. **Create Shared UI Library**: Extract 15-20 common components
2. **Standardize API Client**: Use consistent pattern across apps
3. **Implement Monorepo**: Use pnpm workspaces or Nx
4. **Design System**: Create unified Tailwind theme tokens
5. **Component Catalog**: Use Storybook for shared components

---

## 2. Frontend Applications Overview

### 2.1 RecruitIQ Application (`recruitiq/`)

**Purpose:** Customer-facing Applicant Tracking System  
**Port:** 5173 (dev)  
**Users:** Recruiters, Hiring Managers, Applicants  
**Routes:** 15+ protected routes + 5 public routes

**Key Features:**
- Dashboard with hiring metrics
- Job requisition management
- Candidate pipeline (kanban view)
- Interview scheduling
- Application tracking (public)
- Career page (public)
- Multi-workspace support
- MFA authentication
- Session management
- Flow templates (workflow builder)

**Component Count:**
- 38 components in `/components`
- 14 page components in `/pages`
- 6 context providers
- 9 custom hooks
- 3 utility modules

### 2.2 Admin Portal (`portal/`)

**Purpose:** Platform administration and monitoring  
**Port:** 5174 (dev)  
**Users:** Platform Administrators  
**Routes:** 20+ admin-only routes

**Key Features:**
- Security monitoring dashboard
- License management (SaaS)
- Customer provisioning
- VPS/infrastructure management
- User & role management
- System logs viewer
- Security alerts
- Tier management
- Analytics & reporting

**Component Count:**
- 4 shared components in `/components`
- 35+ page components (nested in feature folders)
- 1 context provider (Auth)
- No custom hooks (uses React Query directly)
- 1 unified API service

---

## 3. Technology Stack

### 3.1 Core Dependencies (Shared)

| Package | Version | Purpose |
|---------|---------|---------|
| **react** | 18.2.0 | UI library |
| **react-dom** | 18.2.0 | DOM rendering |
| **react-router-dom** | 7.1.1 | Client-side routing |
| **@tanstack/react-query** | 5.90.5 | Server state management |
| **axios** | 1.12.2 | HTTP client (Portal only) |
| **vite** | 7.1.12 | Build tool & dev server |
| **tailwindcss** | 3.4.18 | Utility-first CSS |
| **postcss** | 8.x | CSS processing |
| **autoprefixer** | 10.x | CSS vendor prefixes |

### 3.2 RecruitIQ-Specific Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **framer-motion** | 10.18.0 | Animation library |
| **clsx** | 2.1.1 | Conditional class names |
| **vitest** | 3.2.4 | Unit testing |
| **@playwright/test** | 1.56.1 | E2E testing |
| **@testing-library/react** | 16.3.0 | Component testing |

### 3.3 Portal-Specific Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **react-hot-toast** | 2.6.0 | Toast notifications |
| **lucide-react** | 0.460.0 | Icon library |
| **recharts** | 2.15.3 | Charts/analytics |
| **date-fns** | 4.1.0 | Date manipulation |

### 3.4 Build Tools

**Vite Configuration:**
- Dev server with HMR (Hot Module Replacement)
- API proxy to backend (avoid CORS in dev)
- Code splitting & lazy loading
- Terser minification
- Source maps (dev only)
- ES2020 target
- Manual chunk splitting for vendor code

**Tailwind Configuration:**
- Class-based dark mode
- Content scanning: `./index.html`, `./src/**/*.{js,jsx,ts,tsx}`
- No custom plugins currently
- Minimal theme extensions

---

## 4. Application Structure - RecruitIQ

### 4.1 Folder Structure

```
recruitiq/src/
├── App.jsx                    # Root component with routing
├── main.jsx                   # Entry point with providers
├── index.css                  # Global styles + Tailwind imports
├── mockData.js                # Development data
│
├── components/                # 38 components
│   ├── Layout.jsx            # Main layout with header/sidebar
│   ├── PublicLayout.jsx      # Layout for public pages
│   ├── Sidebar.jsx           # Navigation sidebar
│   ├── Modal.jsx             # Reusable modal (Portal-based)
│   ├── Card.jsx              # Simple card wrapper
│   ├── Icon.jsx              # SVG icon component
│   ├── JobForm.jsx           # Job creation form
│   ├── CandidateForm.jsx     # Candidate creation form
│   ├── QuickSearch.jsx       # Global search with history
│   ├── Pagination.jsx        # Pagination controls
│   ├── FilterChips.jsx       # Active filter chips
│   ├── FlowDesigner.jsx      # Workflow stage builder
│   ├── MFASetup.jsx          # MFA enrollment UI
│   ├── MFAVerification.jsx   # MFA login verification
│   ├── SessionManagement.jsx # Active sessions viewer
│   ├── WorkspaceManager.jsx  # Workspace CRUD
│   ├── WorkspaceSelector.jsx # Workspace switcher dropdown
│   ├── AvatarMenu.jsx        # User menu dropdown
│   ├── ConfirmDialog.jsx     # Confirmation modal
│   ├── DashboardQuickResults.jsx  # Dashboard widget
│   ├── MobileDashboardSummary.jsx # Mobile dashboard
│   └── ... (18 more)
│
├── pages/                     # 14 pages
│   ├── Login.jsx             # Login page
│   ├── Dashboard.jsx         # Main dashboard
│   ├── Jobs.jsx              # Job listings
│   ├── JobDetail.jsx         # Single job view
│   ├── JobRequisition.jsx    # Job form page (create/edit)
│   ├── Candidates.jsx        # Candidate listings
│   ├── CandidateDetail.jsx   # Single candidate view
│   ├── Pipeline.jsx          # Kanban pipeline view
│   ├── Interviews.jsx        # Interview scheduler
│   ├── Profile.jsx           # User profile + MFA
│   ├── FlowTemplates.jsx     # Workflow templates
│   ├── MobileQuickResults.jsx # Mobile search results
│   ├── public/               # 5 public pages
│   │   ├── CareerPage.jsx   # Public job board
│   │   ├── ApplyJob.jsx     # Application form
│   │   ├── ApplicationSuccess.jsx
│   │   └── TrackApplication.jsx
│   └── applicant/            # 3 applicant pages
│       ├── ApplicantLogin.jsx
│       ├── ApplicantSignup.jsx
│       └── ApplicantDashboard.jsx
│
├── context/                   # 6 Context providers
│   ├── AuthContext.jsx       # Authentication state
│   ├── WorkspaceContext.jsx  # Multi-workspace state
│   ├── OrganizationContext.jsx # Org settings
│   ├── DataContext.jsx       # Legacy data state
│   ├── FlowContext.jsx       # Flow templates
│   └── ToastContext.jsx      # Toast notifications
│
├── hooks/                     # 9 custom hooks
│   ├── useJobs.js            # React Query hook for jobs
│   ├── useCandidates.js      # React Query hook for candidates
│   ├── useApplications.js    # React Query hook for applications
│   ├── useInterviews.js      # React Query hook for interviews
│   ├── useFlowTemplates.js   # React Query hook for templates
│   ├── useDebounce.js        # Debounce input
│   ├── usePagination.js      # Pagination state
│   └── useSearchFilters.js   # Filter state management
│
├── services/                  # API integration
│   └── api.js                # 850+ line API client (Fetch-based)
│
├── utils/                     # Utilities
│   ├── searchUtils.js        # Search/filter logic
│   └── telemetry.js          # Analytics tracking
│
└── test/                      # Testing utilities
    ├── setup.js              # Vitest setup
    ├── testUtils.jsx         # Testing helpers
    └── TESTING_GUIDE.md      # Testing documentation
```

### 4.2 Entry Point & Provider Hierarchy

**main.jsx - Provider Nesting:**
```jsx
<React.StrictMode>
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>                    // Level 1: Authentication
        <OrganizationProvider>          // Level 2: Org settings
          <WorkspaceProvider>           // Level 3: Workspace switching
            <DataProvider>              // Level 4: Legacy data (to deprecate)
              <FlowProvider>            // Level 5: Flow templates
                <ToastProvider>         // Level 6: Notifications
                  <App />
                </ToastProvider>
              </FlowProvider>
            </DataProvider>
          </WorkspaceProvider>
        </OrganizationProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
</React.StrictMode>
```

**Provider Dependencies:**
- `WorkspaceProvider` depends on `AuthContext`
- `DataProvider` depends on `WorkspaceContext` (legacy, to be removed)
- `FlowProvider` depends on `WorkspaceContext`
- No circular dependencies ✅

---

## 5. Application Structure - Portal

### 5.1 Folder Structure

```
portal/src/
├── App.jsx                    # Root component with routing
├── main.jsx                   # Entry point with providers
├── index.css                  # Global styles + Tailwind imports
│
├── components/                # 4 shared components
│   ├── Layout.jsx            # Main layout (header + nested sidebar)
│   ├── ProtectedRoute.jsx    # Auth guard component
│   ├── MFASetup.jsx          # MFA enrollment UI
│   └── MFAVerification.jsx   # MFA login verification
│
├── pages/                     # Feature-organized pages
│   ├── Login.jsx             # Login page
│   ├── Dashboard.jsx         # Main dashboard
│   ├── Settings.jsx          # Portal settings
│   │
│   ├── security/             # Security monitoring (3 pages)
│   │   ├── SecurityDashboard.jsx
│   │   ├── SecurityEvents.jsx
│   │   └── SecurityAlerts.jsx
│   │
│   ├── logs/                 # Log management (2 pages)
│   │   ├── LogViewer.jsx
│   │   └── SystemLogs.jsx
│   │
│   ├── infrastructure/       # VPS management (2 pages)
│   │   ├── VPSManager.jsx
│   │   └── ClientProvisioning.jsx
│   │
│   ├── licenses/             # License management (10+ pages)
│   │   ├── Dashboard.jsx
│   │   ├── CustomerList.jsx
│   │   ├── CustomerDetail.jsx
│   │   ├── LicenseCreate.jsx
│   │   ├── Analytics.jsx
│   │   ├── Tiers.jsx
│   │   └── Settings.jsx
│   │
│   ├── users/                # User management (3 pages)
│   │   ├── UserManagement.jsx
│   │   ├── UserCreate.jsx
│   │   └── UserDetail.jsx
│   │
│   ├── roles/                # Role management (1 page)
│   │   └── RoleManagement.jsx
│   │
│   └── permissions/          # Permission management (1 page)
│       └── PermissionManagement.jsx
│
├── contexts/                  # 1 Context provider
│   └── AuthContext.jsx       # Authentication state
│
├── services/                  # API integration
│   └── api.js                # 1,000+ line unified API service (Axios-based)
│
├── constants/                 # Constants (if any)
│
└── utils/                     # Utilities (if any)
```

### 5.2 Entry Point & Provider Hierarchy

**main.jsx - Simpler Provider Structure:**
```jsx
<React.StrictMode>
  <BrowserRouter>
    <AuthProvider>                     // Level 1: Authentication only
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </AuthProvider>
  </BrowserRouter>
</React.StrictMode>
```

**Key Differences from RecruitIQ:**
- ✅ Simpler: Only 1 context provider (Auth)
- ✅ No workspace switching (platform admin only)
- ✅ No organization context (manages multiple orgs)
- ✅ React Query for all data fetching
- ❌ No toast provider (uses react-hot-toast directly)
- ❌ No custom hooks (React Query used directly in components)

---

## 6. Routing Architecture

### 6.1 RecruitIQ Routing (React Router v7)

**Route Structure:**
```jsx
<Routes>
  {/* Public Routes - No authentication */}
  <Route path="/login" element={<Login />} />
  <Route path="/apply/:jobId" element={<ApplyJob />} />
  <Route path="/apply/:jobId/success" element={<ApplicationSuccess />} />
  <Route path="/track/:trackingCode" element={<TrackApplication />} />
  <Route path="/careers/:organizationId" element={<CareerPage />} />
  
  {/* Applicant Routes */}
  <Route path="/applicant/signup" element={<ApplicantSignup />} />
  <Route path="/applicant/login" element={<ApplicantLogin />} />
  <Route path="/applicant/dashboard" element={
    <ApplicantProtectedRoute>
      <ApplicantDashboard />
    </ApplicantProtectedRoute>
  } />
  
  {/* Recruiter Protected Routes */}
  <Route path="/*" element={
    <ProtectedRoute>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/new" element={<JobRequisition />} />
          <Route path="/jobs/:id/edit" element={<JobRequisition />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/candidates" element={<Candidates />} />
          <Route path="/candidates/:id" element={<CandidateDetail />} />
          <Route path="/interviews" element={<Interviews />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/mobile/quick-results" element={<MobileQuickResults />} />
        </Routes>
      </Layout>
    </ProtectedRoute>
  } />
</Routes>
```

**Route Protection:**
- `ProtectedRoute` - Checks `isAuthenticated && isRecruiter`
- `ApplicantProtectedRoute` - Checks `isAuthenticated && isApplicant`
- Redirects to `/login` if not authenticated
- Lazy loading for all page components (using `React.lazy`)

### 6.2 Portal Routing (React Router v7)

**Route Structure:**
```jsx
<Routes>
  {/* Public Route */}
  <Route path="/login" element={<Login />} />
  
  {/* Protected Routes - Nested under Layout */}
  <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
    <Route index element={<Navigate to="/dashboard" replace />} />
    <Route path="dashboard" element={<Dashboard />} />
    
    {/* Security Section */}
    <Route path="security">
      <Route index element={<SecurityDashboard />} />
      <Route path="events" element={<SecurityEvents />} />
      <Route path="alerts" element={<SecurityAlerts />} />
    </Route>
    
    {/* Logs Section */}
    <Route path="logs">
      <Route index element={<LogViewer />} />
      <Route path="system" element={<SystemLogs />} />
    </Route>
    
    {/* Infrastructure Section */}
    <Route path="infrastructure">
      <Route index element={<VPSManager />} />
      <Route path="provision" element={<ClientProvisioning />} />
    </Route>
    
    {/* License Manager Section (7 routes) */}
    <Route path="licenses">
      <Route index element={<LicenseDashboard />} />
      <Route path="customers" element={<CustomerList />} />
      <Route path="customers/:id" element={<CustomerDetail />} />
      <Route path="create" element={<LicenseCreate />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="tiers" element={<Tiers />} />
      <Route path="settings" element={<LicenseSettings />} />
    </Route>
    
    {/* User Management */}
    <Route path="users">
      <Route index element={<UserManagement />} />
      <Route path="create" element={<UserCreate />} />
      <Route path=":id" element={<UserDetail />} />
    </Route>
    
    {/* Roles & Permissions */}
    <Route path="roles" element={<RoleManagement />} />
    <Route path="permissions" element={<PermissionManagement />} />
    <Route path="settings" element={<Settings />} />
  </Route>
</Routes>
```

**Route Protection:**
- `ProtectedRoute` - Checks `isAuthenticated`
- Additional backend validation: `user_type === 'platform'`
- Backend also checks `portal.view` permission
- No lazy loading currently (could be added for optimization)

### 6.3 Routing Comparison

| Feature | RecruitIQ | Portal |
|---------|-----------|--------|
| **Router Version** | React Router v7.1.1 | React Router v7.1.1 |
| **Route Pattern** | Flat with nested inner routes | Nested with `<Outlet />` |
| **Lazy Loading** | ✅ All pages lazy loaded | ❌ Not implemented |
| **Protected Routes** | 2 types (Recruiter, Applicant) | 1 type (Platform Admin) |
| **Public Routes** | 5 routes (careers, apply, track) | 1 route (login only) |
| **Total Routes** | 20+ | 25+ |
| **Dynamic Params** | `:id`, `:jobId`, `:trackingCode`, `:organizationId` | `:id`, `:userId`, `:roleId` |

---

## 7. State Management

### 7.1 RecruitIQ State Management

**Architecture:** Context API + React Query  
**Pattern:** Multiple specialized contexts + server state caching

#### Context Providers (6)

**1. AuthContext** (`context/AuthContext.jsx`)
- **Purpose:** User authentication & session management
- **State:** `user`, `isLoading`, `error`, `mfaWarning`
- **Methods:** `login()`, `loginApplicant()`, `signupApplicant()`, `logout()`, `dismissMfaWarning()`
- **Storage:** Tokens in localStorage (via api.js)
- **Dependencies:** api.js service
- **Size:** 164 lines

**2. WorkspaceContext** (`context/WorkspaceContext.jsx`)
- **Purpose:** Multi-workspace/multi-tenancy support
- **State:** `currentWorkspace`, `workspaces[]`, `workspaceColors{}`
- **Methods:** `switchWorkspace()`, `createWorkspace()`, `renameWorkspace()`, `deleteWorkspace()`, `addWorkspaceUser()`, `updateWorkspaceUser()`, `removeWorkspaceUser()`
- **Storage:** Current workspace ID in localStorage, colors in localStorage
- **Dependencies:** AuthContext, OrganizationContext, api.js
- **Size:** 411 lines
- **Special:** Workspace colors are frontend-only (not persisted to backend)

**3. OrganizationContext** (`context/OrganizationContext.jsx`)
- **Purpose:** Organization settings & licensing
- **State:** `organization`, `loading`, `stats`
- **Methods:** `updateOrganization()`, `canCreateWorkspace()`, `refresh()`
- **Dependencies:** AuthContext, api.js
- **Provides:** License limits, usage stats, session policies, MFA settings

**4. DataContext** (`context/DataContext.jsx`) ⚠️ **LEGACY**
- **Purpose:** Client-side data cache (jobs, candidates, applications, interviews)
- **State:** `jobs[]`, `candidates[]`, `applications[]`, `interviews[]`, loading states, error states
- **Methods:** 30+ CRUD methods for each entity type
- **Dependencies:** WorkspaceContext, AuthContext, api.js
- **Size:** 582 lines
- **Status:** ⚠️ **TO BE DEPRECATED** - Moving to React Query hooks
- **Migration:** `useJobs`, `useCandidates`, `useApplications`, `useInterviews` hooks replace this

**5. FlowContext** (`context/FlowContext.jsx`)
- **Purpose:** Workflow template management
- **State:** `flowTemplates[]`, `loading`, `error`
- **Methods:** `getFlowTemplate()`, `createFlowTemplate()`, `updateFlowTemplate()`, `deleteFlowTemplate()`, `cloneFlowTemplate()`
- **Dependencies:** WorkspaceContext, api.js
- **Cache:** Templates loaded once per workspace session

**6. ToastContext** (`context/ToastContext.jsx`)
- **Purpose:** Toast notification system
- **State:** `toasts[]`
- **Methods:** `showToast(message, type)`, `removeToast(id)`
- **Types:** 'success', 'error', 'info', 'warning'
- **Auto-dismiss:** Configurable timeout per toast

#### React Query Hooks (9)

**Custom Hooks Pattern:**
```javascript
// Example: useJobs.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useJobs(options = {}) {
  const { currentWorkspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  
  // Query for fetching
  const { data, isLoading, error } = useQuery({
    queryKey: ['jobs', currentWorkspaceId, params],
    queryFn: async () => await api.getJobs(params),
    enabled: !!currentWorkspaceId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
  
  // Mutations for creating/updating/deleting
  const createMutation = useMutation({
    mutationFn: (data) => api.createJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs'])
      toast.showToast('Job created!', 'success')
    }
  })
  
  return { jobs, isLoading, error, createJob, updateJob, deleteJob }
}
```

**Available Hooks:**
1. `useJobs` - Job management with pagination
2. `useCandidates` - Candidate management with filtering
3. `useApplications` - Application tracking
4. `useInterviews` - Interview scheduling
5. `useFlowTemplates` - Workflow templates
6. `useDebounce` - Input debouncing utility
7. `usePagination` - Pagination state management
8. `useSearchFilters` - URL-based filter state

**React Query Configuration:**
```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes cache
      retry: 1,                       // Retry once on failure
      refetchOnWindowFocus: false,    // Don't refetch on tab switch
      refetchOnReconnect: true,       // Refetch when online
    },
    mutations: {
      retry: 0,                       // Don't retry mutations
    }
  }
})
```

### 7.2 Portal State Management

**Architecture:** React Query only (no Context API for data)  
**Pattern:** Server state only, minimal client state

#### Context Providers (1)

**AuthContext** (`contexts/AuthContext.jsx`)
- **Purpose:** User authentication only
- **State:** `user`, `loading`, `mfaWarning`
- **Methods:** `login()`, `logout()`, `dismissMfaWarning()`
- **Storage:** Tokens in HTTP-only cookies (backend managed)
- **Dependencies:** api.js service
- **Size:** 98 lines
- **Simpler:** No workspace/org context needed

#### React Query Usage

**Pattern:** Direct usage in components (no custom hooks)

```javascript
// Example: CustomerList.jsx
import { useQuery } from '@tanstack/react-query'
import apiService from '../services/api'

function CustomerList() {
  const { data, isLoading } = useQuery({
    queryKey: ['customers', filters],
    queryFn: () => apiService.getCustomers(filters)
  })
  
  // Component logic...
}
```

**No Custom Hooks:** Portal uses React Query directly in components instead of creating abstraction layers. This is simpler but less reusable.

### 7.3 State Management Comparison

| Aspect | RecruitIQ | Portal |
|--------|-----------|--------|
| **Context Providers** | 6 (Auth, Workspace, Org, Data, Flow, Toast) | 1 (Auth only) |
| **Custom Hooks** | 9 hooks | 0 hooks |
| **React Query** | ✅ Migrating from Context | ✅ Primary pattern |
| **Local Storage** | Tokens, workspace ID, colors, theme | User data (non-sensitive) |
| **HTTP Cookies** | ❌ Not used | ✅ Tokens (HTTP-only, secure) |
| **Server State** | React Query + DataContext (legacy) | React Query only |
| **Client State** | Contexts (auth, workspace, org) | Context (auth only) |
| **Complexity** | Higher (multi-tenancy, workspaces) | Lower (single tenant) |

---

## 8. Component Architecture

### 8.1 Component Patterns

**RecruitIQ follows these patterns:**

1. **Functional Components Only** - No class components
2. **Hooks-Based** - useState, useEffect, useContext, custom hooks
3. **Props Destructuring** - `function Component({ prop1, prop2 })`
4. **Default Props** - Using ES6 default parameters
5. **Memo Optimization** - `React.memo()` for list items (Card.jsx)
6. **Portal Rendering** - Modals use `ReactDOM.createPortal()`
7. **Compound Components** - FlowDesigner has sub-components
8. **Controlled Components** - Forms use controlled inputs

### 8.2 RecruitIQ Component Inventory

#### Layout Components (4)
- **Layout.jsx** (151 lines) - Main app layout with header, sidebar, MFA banner
- **PublicLayout.jsx** (60 lines) - Minimal layout for public pages
- **Sidebar.jsx** (150+ lines) - Navigation sidebar with workspace selector
- **AvatarMenu.jsx** (100+ lines) - User dropdown menu

#### Form Components (3)
- **JobForm.jsx** (256 lines) - Job creation/edit form with validation
- **CandidateForm.jsx** (202 lines) - Candidate creation form
- **FlowDesigner.jsx** (500+ lines) - Visual workflow builder (drag-and-drop)

#### Modal Components (4)
- **Modal.jsx** (189 lines) - Base modal with Portal, animations, focus trap
- **ConfirmDialog.jsx** (80 lines) - Simple confirmation dialog
- **ConfirmationModal.jsx** (50 lines) - Another confirmation variant
- **PortalSettingsModal.jsx** (300+ lines) - Job portal customization

#### UI Components (12)
- **Card.jsx** (8 lines) - Memoized card wrapper
- **Icon.jsx** (30 lines) - SVG icon wrapper
- **Pagination.jsx** (100+ lines) - Pagination controls
- **FilterChips.jsx** (80 lines) - Active filter tags
- **SearchInput.jsx** (50 lines) - Search input with icon
- **FAB.jsx** (40 lines) - Floating action button
- **QuickSearch.jsx** (300+ lines) - Global search with history
- **PublishJobToggle.jsx** (120 lines) - Job publish switch
- **ApplicationSourceBadge.jsx** (30 lines) - Source badge (manual/portal/api)
- **CandidateFlowProgress.jsx** (150 lines) - Candidate stage progress
- **DashboardQuickResults.jsx** (80 lines) - Dashboard search widget
- **MobileDashboardSummary.jsx** (100 lines) - Mobile-optimized dashboard

#### Workspace Components (2)
- **WorkspaceManager.jsx** (300+ lines) - Workspace CRUD modal
- **WorkspaceSelector.jsx** (150+ lines) - Workspace dropdown switcher

#### Auth Components (3)
- **MFASetup.jsx** (200+ lines) - MFA enrollment with QR code
- **MFAVerification.jsx** (150+ lines) - MFA code input during login
- **SessionManagement.jsx** (200+ lines) - View/revoke active sessions

#### Debug Components (1)
- **DebugOverlay.jsx** (50 lines) - Development debug info overlay

#### Specialized Components (6)
- **RecentActivitySummary.jsx** - Activity feed widget
- **CandidateTable.jsx** - Candidate list table
- **InterviewCalendar.jsx** - Interview scheduling calendar
- **JobBoard.jsx** - Job listing cards
- **PipelineKanban.jsx** - Drag-and-drop kanban board
- **StageColumn.jsx** - Kanban column component

### 8.3 Portal Component Inventory

#### Layout Components (1)
- **Layout.jsx** (245 lines) - Main layout with nested sidebar navigation

#### Auth Components (3)
- **ProtectedRoute.jsx** (40 lines) - Route guard wrapper
- **MFASetup.jsx** (similar to RecruitIQ)
- **MFAVerification.jsx** (similar to RecruitIQ)

#### Page Components (35+)
All pages are in feature folders:
- `pages/security/` - 3 components (Dashboard, Events, Alerts)
- `pages/logs/` - 2 components (LogViewer, SystemLogs)
- `pages/infrastructure/` - 2 components (VPSManager, ClientProvisioning)
- `pages/licenses/` - 10 components (Dashboard, CustomerList, CustomerDetail, etc.)
- `pages/users/` - 3 components (UserManagement, UserCreate, UserDetail)
- `pages/roles/` - 1 component (RoleManagement)
- `pages/permissions/` - 1 component (PermissionManagement)

**Pattern:** Portal has fewer reusable components, more page-specific code

### 8.4 Component Reusability Analysis

#### High Reusability (Candidates for Shared Library)

| Component | RecruitIQ | Portal | Reusable? | Shared Library Name |
|-----------|-----------|--------|-----------|---------------------|
| **Modal** | ✅ | ❌ | ✅ | `@recruitiq/ui/Modal` |
| **Card** | ✅ | ❌ | ✅ | `@recruitiq/ui/Card` |
| **Button** | Inline | Inline | ✅ | `@recruitiq/ui/Button` |
| **Input** | Inline | Inline | ✅ | `@recruitiq/ui/Input` |
| **Select** | Inline | Inline | ✅ | `@recruitiq/ui/Select` |
| **Pagination** | ✅ | ❌ | ✅ | `@recruitiq/ui/Pagination` |
| **ConfirmDialog** | ✅ | ❌ | ✅ | `@recruitiq/ui/ConfirmDialog` |
| **Toast** | Context | react-hot-toast | ✅ | `@recruitiq/ui/Toast` |
| **Layout** | ✅ | ✅ | ✅ | `@recruitiq/ui/Layout` |
| **Sidebar** | ✅ | ✅ | ✅ | `@recruitiq/ui/Sidebar` |
| **Avatar** | ✅ | ✅ | ✅ | `@recruitiq/ui/Avatar` |
| **Badge** | ✅ | ❌ | ✅ | `@recruitiq/ui/Badge` |
| **Table** | Inline | Inline | ✅ | `@recruitiq/ui/Table` |
| **Spinner** | Inline | Inline | ✅ | `@recruitiq/ui/Spinner` |
| **Icon** | ✅ | lucide-react | ⚠️ | Standardize on lucide-react |

#### Medium Reusability (Product-Specific but Could Share Logic)

| Component | Shared Logic? | Notes |
|-----------|---------------|-------|
| **MFASetup** | ✅ | Identical logic, can share |
| **MFAVerification** | ✅ | Identical logic, can share |
| **ProtectedRoute** | ✅ | Different auth checks, can parameterize |
| **SearchInput** | ✅ | Similar UI, different APIs |
| **FilterChips** | ✅ | Generic filter display |

#### Low Reusability (Product-Specific)

- JobForm, CandidateForm, FlowDesigner - RecruitIQ-specific
- WorkspaceManager, WorkspaceSelector - RecruitIQ-specific
- CustomerList, LicenseCreate, VPSManager - Portal-specific
- SecurityDashboard, LogViewer - Portal-specific

### 8.5 Component Design Patterns

**1. Compound Components** (FlowDesigner)
```jsx
<FlowDesigner>
  <FlowDesigner.Stage />
  <FlowDesigner.Transition />
  <FlowDesigner.Toolbar />
</FlowDesigner>
```

**2. Render Props** (Not used currently)

**3. Higher-Order Components** (ProtectedRoute)
```jsx
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" />
}
```

**4. Custom Hooks** (RecruitIQ extensive, Portal minimal)

**5. Context + Hooks** (RecruitIQ pattern)
```jsx
// Context provider
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  // ...
}

// Hook for consumption
export function useToast() {
  return useContext(ToastContext)
}
```

---

## 9. API Integration Layer

### 9.1 RecruitIQ API Client (`services/api.js`)

**Architecture:** Custom Fetch-based client  
**Size:** 850+ lines  
**Pattern:** Class-based singleton

**Key Features:**
- ✅ JWT token management (localStorage)
- ✅ Automatic token refresh (401 handling)
- ✅ Request timeout (30s)
- ✅ CSRF token support
- ✅ XSS input sanitization
- ✅ Error handling with user-friendly messages
- ✅ Session expiry detection
- ⚠️ Token stored in localStorage (not HTTP-only cookies)

**Class Structure:**
```javascript
class APIClient {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || '/api'
    this.isRefreshing = false
    this.refreshSubscribers = []
  }

  // Token Management
  setToken(token, refreshToken, expiresIn)
  getToken()
  clearTokens()
  isTokenExpired()
  refreshToken()
  
  // Security
  sanitizeInput(data)
  getCSRFToken()
  
  // Core Request
  async request(endpoint, options)
  
  // Auth Methods (12 methods)
  async login(email, password)
  async register(data)
  async logout()
  async getMe()
  async getActiveSessions()
  async revokeSession(sessionId)
  async revokeAllSessions()
  // ... MFA methods
  
  // Organization Methods (3 methods)
  async getOrganization()
  async updateOrganization(data)
  async getOrganizationStats()
  
  // Workspace Methods (7 methods)
  async getWorkspaces()
  async createWorkspace(data)
  async updateWorkspace(id, data)
  async deleteWorkspace(id)
  async addWorkspaceMember(workspaceId, userId)
  async removeWorkspaceMember(workspaceId, userId)
  
  // User Methods (6 methods)
  async getUsers(params)
  async getUser(id)
  async createUser(data)
  async updateUser(id, data)
  async deleteUser(id)
  
  // Job Methods (8 methods)
  async getJobs(params)
  async createJob(data)
  async updateJob(id, data)
  async deleteJob(id)
  async getPublicJobs()
  
  // Candidate Methods (6 methods)
  // Application Methods (6 methods)
  // Interview Methods (6 methods)
  // Flow Template Methods (6 methods)
  // MFA Methods (8 methods)
}

export default new APIClient()
```

**Token Refresh Flow:**
```javascript
// 1. Request fails with 401
// 2. Check if already refreshing (prevent duplicate refreshes)
// 3. Call /api/auth/refresh with refresh token
// 4. Store new tokens
// 5. Retry original request with new token
// 6. If refresh fails, clear tokens and redirect to login
```

### 9.2 Portal API Client (`services/api.js`)

**Architecture:** Axios-based service class  
**Size:** 1,000+ lines  
**Pattern:** Class-based singleton

**Key Features:**
- ✅ Axios instance with interceptors
- ✅ HTTP-only cookie authentication (more secure)
- ✅ Automatic token refresh via interceptor
- ✅ Error handling with toast notifications
- ✅ Response interceptors for 401
- ✅ Cookie domain rewrite for development
- ❌ No CSRF token handling (relies on SameSite cookies)

**Axios Configuration:**
```javascript
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true  // Send cookies automatically
})

// Response interceptor for token refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    
    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        // Refresh token (cookies sent automatically)
        await api.post('/auth/refresh', {})
        // Retry original request
        return api(originalRequest)
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }
)
```

**Service Methods:**
```javascript
class APIService {
  // Auth (3 methods)
  async login(email, password)
  async logout()
  async getMe()
  
  // MFA (7 methods)
  async getMFAStatus()
  async setupMFA()
  async verifyMFASetup(token, secret)
  async verifyMFA(mfaToken, token)
  async useBackupCode(mfaToken, backupCode)
  async disableMFA(password, token)
  async regenerateBackupCodes(password, token)
  
  // Security (5 methods)
  async getSecurityDashboard()
  async getSecurityEvents(filters)
  async getSecurityAlerts(filters)
  async acknowledgeAlert(alertId)
  async resolveAlert(alertId)
  
  // License Management (20+ methods)
  async getDashboardMetrics()
  async getUpcomingRenewals(days)
  async getCustomers(filters)
  async getCustomer(id)
  async createCustomer(data)
  async updateCustomer(id, data)
  async deleteCustomer(id)
  async renewLicense(customerId, months)
  async suspendLicense(customerId)
  async downloadLicenseFile(customerId)
  // ... more license methods
  
  // Tier Management (10+ methods)
  async getTiers()
  async getTierHistory(tierName)
  async getTierStats()
  async createTierVersion(tierData, autoMigrate)
  async previewTierMigration(tierName, filters)
  async executeTierMigration(migrationId, filters)
  // ... more tier methods
  
  // Infrastructure (7 methods)
  async getVPSInstances()
  async createVPSInstance(data)
  async startVPSInstance(vpsName)
  async stopVPSInstance(vpsName)
  async rebootVPSInstance(vpsName)
  async deleteVPSInstance(vpsName)
  
  // User Management (6 methods)
  async getUsers(filters)
  async createUser(userData)
  async updateUser(userId, userData)
  async deleteUser(userId)
  
  // Roles & Permissions (10 methods)
  // Logs (3 methods)
  // Session Management (5 methods)
  
  // Helper Methods
  transformCustomer(customer)
  transformCustomerDetail(data)
  calculateMRR(tier)
}
```

### 9.3 API Client Comparison

| Feature | RecruitIQ | Portal |
|---------|-----------|--------|
| **HTTP Client** | Native Fetch | Axios 1.12.2 |
| **Architecture** | Custom class | Axios + Service class |
| **Authentication** | JWT in localStorage | HTTP-only cookies |
| **Token Storage** | localStorage (less secure) | Cookies (more secure) |
| **Token Refresh** | Manual refresh logic | Axios interceptor |
| **CSRF Protection** | ✅ X-CSRF-Token header | ⚠️ Relies on SameSite |
| **Input Sanitization** | ✅ Basic XSS prevention | ❌ No sanitization |
| **Request Timeout** | ✅ 30 seconds | ❌ No timeout |
| **Error Handling** | ✅ User-friendly messages | ✅ Toast notifications |
| **Retry Logic** | ✅ 1 retry for queries | ✅ Auto-retry on 401 |
| **Total Methods** | 70+ API methods | 80+ API methods |
| **Lines of Code** | 850 lines | 1,000 lines |

### 9.4 Recommendations

**Standardization:**
1. **Choose One Approach:** Either Fetch or Axios for both apps
   - Recommendation: **Axios** (better ecosystem, interceptors, easier error handling)

2. **Consistent Auth:** Migrate RecruitIQ to HTTP-only cookies
   - More secure than localStorage
   - Prevents XSS token theft
   - Backend already supports this for Portal

3. **Shared API Client:** Create `@recruitiq/api-client` package
   ```javascript
   // packages/api-client/src/index.js
   export class BaseAPIClient {
     // Shared authentication logic
     // Shared token refresh
     // Shared error handling
   }
   
   // apps/recruitiq/src/services/api.js
   import { BaseAPIClient } from '@recruitiq/api-client'
   class RecruitIQAPI extends BaseAPIClient {
     // Product-specific methods
   }
   
   // apps/portal/src/services/api.js
   import { BaseAPIClient } from '@recruitiq/api-client'
   class PortalAPI extends BaseAPIClient {
     // Product-specific methods
   }
   ```

4. **TypeScript Migration:** Add types for API responses
   ```typescript
   interface Job {
     id: string
     title: string
     status: 'open' | 'closed' | 'draft'
     // ...
   }
   
   async getJobs(): Promise<{ jobs: Job[], total: number }>
   ```

---

## 10. Build & Development Configuration

### 10.1 Vite Configuration

**RecruitIQ** (`vite.config.js`)
```javascript
export default defineConfig({
  plugins: [react()],
  
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      }
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    }
  },
  
  build: {
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
    },
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      }
    },
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
})
```

**Portal** (`vite.config.js`)
```javascript
export default defineConfig({
  plugins: [react()],
  
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost', // For cookie-based auth
      },
    },
  },
  
  build: {
    outDir: 'dist',
    sourcemap: true, // Always true (even in prod)
  },
})
```

**Comparison:**
| Feature | RecruitIQ | Portal |
|---------|-----------|--------|
| **Dev Port** | 5173 | 5174 |
| **API Proxy** | ✅ Basic | ✅ With cookie rewrite |
| **Security Headers** | ✅ CSP, XSS, etc. | ❌ Not configured |
| **Code Splitting** | ✅ Manual chunks | ❌ Default |
| **Minification** | ✅ Terser with options | ✅ Default |
| **Source Maps** | ✅ Dev only | ⚠️ Always on |
| **Console Removal** | ✅ Prod only | ❌ Not configured |
| **Chunk Optimization** | ✅ Vendor splitting | ❌ Default |

### 10.2 Tailwind Configuration

**RecruitIQ** (`tailwind.config.cjs`)
```javascript
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx,html}'],
  darkMode: 'class', // Manual dark mode toggle
  theme: {
    extend: {}, // No custom theme extensions
  },
  plugins: [], // No plugins
}
```

**Portal** (`tailwind.config.js`)
```javascript
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          // ... custom color palette
          900: '#0c4a6e',
        }
      }
    },
  },
  plugins: [],
}
```

**Comparison:**
| Feature | RecruitIQ | Portal |
|---------|-----------|--------|
| **Dark Mode** | ✅ Class-based | ❌ Not configured |
| **Custom Colors** | ❌ Uses defaults | ✅ Primary palette |
| **Plugins** | None | None |
| **Config Format** | CommonJS | ES Module |

### 10.3 Development Scripts

**RecruitIQ** (`package.json`)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:css": "postcss src/index.css -o src/tailwind.css",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:visual": "playwright test --project=chromium"
  }
}
```

**Portal** (`package.json`)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext js,jsx"
  }
}
```

**Comparison:**
| Script | RecruitIQ | Portal |
|--------|-----------|--------|
| **Development** | ✅ `npm run dev` | ✅ `npm run dev` |
| **Build** | ✅ `npm run build` | ✅ `npm run build` |
| **Preview** | ✅ `npm run preview` | ✅ `npm run preview` |
| **Unit Tests** | ✅ Vitest | ❌ Not configured |
| **E2E Tests** | ✅ Playwright (5 scripts) | ❌ Not configured |
| **Linting** | ❌ Not configured | ✅ ESLint |
| **CSS Build** | ✅ PostCSS script | ❌ Not needed |

---

## 11. Testing Strategy

### 11.1 RecruitIQ Testing

**Testing Stack:**
- **Unit Tests:** Vitest 3.2.4 + @testing-library/react 16.3.0
- **E2E Tests:** Playwright 1.56.1
- **Coverage:** Built into Vitest

**Test Files Found:**
```
recruitiq/src/
├── components/
│   ├── CandidateForm.test.jsx
│   ├── JobForm.test.jsx
│   ├── DashboardQuickResults.test.jsx
│   ├── FilterChips.test.jsx
│   ├── Layout.search.test.jsx
│   ├── MobileDashboardSummary.test.jsx
│   ├── Pagination.test.jsx
│   ├── QuickSearch.test.jsx
│   └── QuickSearch.history.test.jsx
│
├── pages/
│   ├── Login.test.jsx
│   └── MobileQuickResults.test.jsx
│
├── hooks/
│   └── useDebounce.test.js
│
├── utils/
│   └── searchUtils.test.js
│
└── test/
    ├── setup.js              # Vitest + @testing-library setup
    ├── testUtils.jsx         # Custom render with providers
    └── TESTING_GUIDE.md      # Testing documentation
```

**Test Coverage:**
- ✅ 13 component tests
- ✅ 1 hook test
- ✅ 1 util test
- ✅ E2E test suite in `e2e/` folder
- **Estimated Coverage:** ~20% of components

**Test Patterns:**

```javascript
// Component test with providers
import { render, screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test/testUtils'
import JobForm from './JobForm'

describe('JobForm', () => {
  it('validates required fields', async () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <JobForm open={true} onClose={jest.fn()} />
    )
    
    const titleInput = getByLabelText(/job title/i)
    fireEvent.blur(titleInput)
    
    expect(getByText(/job title is required/i)).toBeInTheDocument()
  })
})

// Hook test
import { renderHook, waitFor } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
  it('debounces value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )
    
    expect(result.current).toBe('initial')
    rerender({ value: 'updated', delay: 500 })
    expect(result.current).toBe('initial') // Not updated yet
    
    await waitFor(() => expect(result.current).toBe('updated'), { timeout: 600 })
  })
})
```

**Vitest Configuration:**
```javascript
// vitest.config.js
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/test/']
    }
  }
})
```

**Playwright Configuration:**
```javascript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
```

### 11.2 Portal Testing

**Testing Stack:**
- ❌ **No unit tests configured**
- ❌ **No E2E tests configured**
- ❌ **No coverage tracking**

**Recommendation:** Add testing to Portal app:
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
npm install --save-dev @playwright/test
```

### 11.3 Testing Comparison

| Aspect | RecruitIQ | Portal |
|--------|-----------|--------|
| **Unit Testing** | ✅ Vitest + RTL | ❌ Not configured |
| **E2E Testing** | ✅ Playwright | ❌ Not configured |
| **Test Count** | 15+ tests | 0 tests |
| **Coverage** | ~20% components | N/A |
| **CI Integration** | ✅ Ready | N/A |
| **Test Utils** | ✅ Custom helpers | N/A |

---

## 12. Reusable Components for Shared Library

### 12.1 Recommended Shared UI Library Structure

```
packages/ui/
├── package.json
├── src/
│   ├── index.ts                    # Barrel export
│   │
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── Input/
│   │   │   ├── Input.tsx
│   │   │   ├── Input.test.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── Modal/
│   │   │   ├── Modal.tsx
│   │   │   ├── Modal.test.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── Card/
│   │   ├── Badge/
│   │   ├── Avatar/
│   │   ├── Pagination/
│   │   ├── Table/
│   │   ├── Select/
│   │   ├── Checkbox/
│   │   ├── Radio/
│   │   ├── Switch/
│   │   ├── Tooltip/
│   │   ├── Dropdown/
│   │   ├── Toast/
│   │   └── Spinner/
│   │
│   ├── layouts/
│   │   ├── AppLayout/
│   │   ├── Sidebar/
│   │   └── Header/
│   │
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── usePagination.ts
│   │   ├── useDisclosure.ts
│   │   └── useMediaQuery.ts
│   │
│   ├── utils/
│   │   ├── cn.ts              # clsx helper
│   │   ├── formatters.ts
│   │   └── validators.ts
│   │
│   └── theme/
│       ├── tokens.ts          # Design tokens
│       ├── colors.ts
│       ├── typography.ts
│       └── spacing.ts
│
└── tailwind.config.js         # Shared Tailwind config
```

### 12.2 Priority Components (Phase 1 - Core)

**High Priority (15 components):**

1. **Button** - Extract from inline usage
   - Variants: primary, secondary, ghost, danger
   - Sizes: sm, md, lg
   - States: loading, disabled
   - Icons: leading, trailing

2. **Input** - Text input with validation
   - Types: text, email, password, number
   - States: error, success, disabled
   - Icons: leading, trailing
   - Helper text

3. **Select** - Dropdown select
   - Multi-select support
   - Search/filter
   - Custom option rendering

4. **Modal** - From RecruitIQ Modal.jsx
   - Portal rendering
   - Focus trap
   - Animations
   - Sizes: sm, md, lg, xl, full

5. **Card** - From RecruitIQ Card.jsx
   - Variants: default, bordered, elevated
   - Interactive: hover, clickable

6. **Badge** - Status badges
   - Variants: primary, success, warning, danger, info
   - Sizes: sm, md, lg
   - Dot variant

7. **Avatar** - User avatars
   - Sizes: xs, sm, md, lg, xl
   - Fallback: initials, icon
   - Status indicator

8. **Pagination** - From RecruitIQ Pagination.jsx
   - Page numbers
   - Previous/next
   - Jump to page
   - Items per page selector

9. **Table** - Data table
   - Sorting
   - Filtering
   - Pagination
   - Selection (single/multi)
   - Loading state

10. **Spinner** - Loading indicator
    - Sizes: sm, md, lg
    - Colors: primary, white, gray

11. **Toast** - Notifications
    - Variants: success, error, warning, info
    - Position: top-left, top-right, bottom-left, bottom-right
    - Auto-dismiss
    - Action buttons

12. **ConfirmDialog** - From RecruitIQ
    - Title, description
    - Confirm/cancel buttons
    - Danger variant

13. **Checkbox** - Checkbox input
    - Indeterminate state
    - Disabled state
    - Label

14. **Radio** - Radio button
    - Group support
    - Disabled state
    - Label

15. **Switch** - Toggle switch
    - Sizes: sm, md, lg
    - Disabled state
    - Label

### 12.3 Phase 2 Components (Advanced)

**Medium Priority (10 components):**

16. **Tooltip** - Hover/focus tooltips
17. **Dropdown** - Dropdown menu
18. **Tabs** - Tab navigation
19. **Accordion** - Collapsible sections
20. **Breadcrumb** - Navigation breadcrumbs
21. **Alert** - Alert banners
22. **Progress** - Progress bar/circle
23. **Skeleton** - Loading skeletons
24. **Empty State** - No data states
25. **File Upload** - File upload widget

### 12.4 Phase 3 Components (Specialized)

**Low Priority (Complex components):**

26. **DataGrid** - Advanced table with virtual scrolling
27. **Calendar** - Date picker/calendar
28. **DatePicker** - Date range picker
29. **TimePicker** - Time selection
30. **ColorPicker** - Color selection
31. **RichTextEditor** - WYSIWYG editor
32. **Charts** - Chart components (integrate recharts)
33. **Kanban** - Drag-and-drop kanban board
34. **Form** - Form builder with validation
35. **Wizard** - Multi-step wizard

### 12.5 Shared Hooks

**Priority Hooks:**

1. **useDebounce** - From RecruitIQ
2. **usePagination** - From RecruitIQ
3. **useDisclosure** - Open/close state management
4. **useMediaQuery** - Responsive breakpoint detection
5. **useClickOutside** - Detect clicks outside element
6. **useLocalStorage** - localStorage with sync
7. **useSessionStorage** - sessionStorage with sync
8. **useTimeout** - Declarative setTimeout
9. **useInterval** - Declarative setInterval
10. **useCopyToClipboard** - Copy text utility

### 12.6 Migration Strategy

**Step 1: Setup (1 week)**
- Create `packages/ui` directory
- Setup TypeScript + Vite library mode
- Configure Tailwind with design tokens
- Setup Storybook for component catalog
- Setup testing with Vitest

**Step 2: Extract Core Components (2 weeks)**
- Extract 15 core components from RecruitIQ
- Write tests for each component
- Create Storybook stories
- Document usage in README

**Step 3: Integrate into Apps (1 week)**
- Update RecruitIQ to use `@recruitiq/ui`
- Update Portal to use `@recruitiq/ui`
- Remove old duplicate components
- Test thoroughly

**Step 4: Expand Library (Ongoing)**
- Add Phase 2 components as needed
- Add Phase 3 specialized components
- Continuously improve based on usage

---

## 13. Multi-Product Migration Strategy

### 13.1 Current vs Future Architecture

**Current Architecture:**
```
RecruitIQ/
├── backend/          # Monolithic backend
├── recruitiq/        # RecruitIQ app
└── portal/           # Admin portal
```

**Future Architecture (Monorepo):**
```
RecruitIQ/
├── apps/
│   ├── recruitiq/         # RecruitIQ ATS
│   ├── paylinq/           # Paylinq Payroll (new)
│   ├── nexus/             # Nexus HRIS (new)
│   └── portal/            # Admin Portal
│
├── packages/
│   ├── ui/                # @recruitiq/ui - Shared components
│   ├── api-client/        # @recruitiq/api-client - API client
│   ├── auth/              # @recruitiq/auth - Auth logic
│   ├── utils/             # @recruitiq/utils - Utilities
│   ├── config/            # @recruitiq/config - Shared config
│   └── types/             # @recruitiq/types - TypeScript types
│
├── backend/
│   └── src/
│       ├── products/
│       │   ├── recruitiq/
│       │   ├── paylinq/
│       │   ├── nexus/
│       │   └── core/      # Shared auth, users, orgs
│       └── ...
│
└── package.json           # Root package.json
```

### 13.2 Frontend Monorepo Setup

**Tool: pnpm Workspaces (Recommended)**

**Why pnpm?**
- ✅ Faster than npm/yarn (efficient disk usage)
- ✅ Strict node_modules structure (no phantom dependencies)
- ✅ Built-in workspace support
- ✅ Works great with Nx or Turborepo for caching

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
    "dev": "pnpm --parallel --filter './apps/*' dev",
    "dev:recruitiq": "pnpm --filter recruitiq dev",
    "dev:portal": "pnpm --filter portal dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^1.10.0",
    "typescript": "^5.2.0"
  }
}
```

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**turbo.json (for build caching):**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false
    }
  }
}
```

### 13.3 Migration Phases

**Phase 1: Setup Monorepo (1 week)**
- Install pnpm globally
- Create monorepo structure
- Move existing apps to `apps/` folder
- Setup workspace dependencies
- Test builds

**Phase 2: Extract Shared UI (2 weeks)**
- Create `packages/ui`
- Extract 15 core components
- Setup Storybook
- Update apps to use shared components

**Phase 3: Extract Shared API Client (1 week)**
- Create `packages/api-client`
- Extract common API logic
- Migrate RecruitIQ to use it
- Migrate Portal to use it

**Phase 4: Extract Shared Auth (1 week)**
- Create `packages/auth`
- Extract AuthContext logic
- Standardize on HTTP-only cookies
- Support multi-product auth

**Phase 5: Create Paylinq App (4 weeks)**
- Create `apps/paylinq` from template
- Implement Paylinq-specific features
- Use shared UI components
- Connect to Paylinq backend APIs

**Phase 6: Create Nexus App (4 weeks)**
- Create `apps/nexus` from template
- Implement Nexus-specific features
- Use shared UI components
- Connect to Nexus backend APIs

**Phase 7: Optimize & Polish (2 weeks)**
- Performance optimization
- Bundle size optimization
- A11y improvements
- Documentation

### 13.4 Shared Package Dependencies

**Example: `packages/ui/package.json`**
```json
{
  "name": "@recruitiq/ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "vite build && tsc",
    "dev": "vite build --watch",
    "test": "vitest",
    "storybook": "storybook dev -p 6006"
  },
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "framer-motion": "^10.18.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.2.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@storybook/react": "^7.6.0"
  }
}
```

**Example: `apps/recruitiq/package.json`**
```json
{
  "name": "recruitiq",
  "version": "0.1.0",
  "dependencies": {
    "@recruitiq/ui": "workspace:*",
    "@recruitiq/api-client": "workspace:*",
    "@recruitiq/auth": "workspace:*",
    "@recruitiq/utils": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^7.1.1",
    "@tanstack/react-query": "^5.90.5"
  }
}
```

### 13.5 Development Workflow

**Start all apps:**
```bash
pnpm dev
```

**Start specific app:**
```bash
pnpm dev:recruitiq
pnpm dev:paylinq
pnpm dev:nexus
pnpm dev:portal
```

**Build all:**
```bash
pnpm build
```

**Test all:**
```bash
pnpm test
```

**Add dependency to specific app:**
```bash
pnpm --filter recruitiq add axios
```

**Add dependency to shared package:**
```bash
pnpm --filter @recruitiq/ui add lucide-react
```

### 13.6 Product-Specific vs Shared Code

**Shared Code (packages/):**
- ✅ UI components (Button, Modal, Table, etc.)
- ✅ Authentication logic
- ✅ API client base class
- ✅ Common utilities (date formatters, validators, etc.)
- ✅ Design tokens (colors, spacing, typography)
- ✅ Common hooks (useDebounce, usePagination, etc.)

**Product-Specific Code (apps/):**
- ✅ Product routes and pages
- ✅ Product-specific components (JobForm, PayrollForm, LeaveForm)
- ✅ Product-specific API methods
- ✅ Product-specific contexts (WorkspaceContext for RecruitIQ)
- ✅ Product-specific business logic
- ✅ Product-specific assets and branding

### 13.7 Migration Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Breaking changes during migration** | High | Medium | Feature freeze during migration, comprehensive testing |
| **Dependency conflicts** | Medium | Low | Use pnpm strict mode, lock file |
| **Build time increase** | Medium | Medium | Use Turbo for caching, incremental builds |
| **Learning curve (monorepo)** | Low | High | Team training, documentation |
| **Complex CI/CD** | High | Medium | Use Nx Cloud or Turbo Remote Cache |

---

## 14. Summary & Next Steps

### 14.1 Key Findings

**Strengths:**
1. ✅ Modern React 18 with hooks and functional components
2. ✅ React Router v7 with protected routes
3. ✅ TanStack Query for server state (RecruitIQ migrating)
4. ✅ Vite for fast builds and HMR
5. ✅ Tailwind CSS for styling
6. ✅ Good test coverage on RecruitIQ (20%)
7. ✅ Well-structured folder organization
8. ✅ Custom API clients with auth handling

**Weaknesses:**
1. ❌ No shared component library
2. ❌ Inconsistent API patterns (Fetch vs Axios)
3. ❌ No monorepo structure
4. ❌ Token storage in localStorage (RecruitIQ)
5. ❌ Legacy DataContext still in use
6. ❌ No tests on Portal
7. ❌ Different icon libraries (custom vs lucide-react)
8. ❌ No TypeScript

**Opportunities:**
1. 💡 Extract shared UI library (15-35 components)
2. 💡 Migrate to monorepo (pnpm + Turborepo)
3. 💡 Standardize on HTTP-only cookies
4. 💡 Add TypeScript for type safety
5. 💡 Create design system documentation
6. 💡 Setup Storybook for component catalog
7. 💡 Add E2E tests to Portal
8. 💡 Migrate to Nx for better DX

### 14.2 Immediate Actions (Next 2 Weeks)

**Priority 1: Setup Monorepo**
- [ ] Install pnpm and Turborepo
- [ ] Create monorepo structure
- [ ] Move apps to `apps/` folder
- [ ] Test builds and dev servers

**Priority 2: Extract Shared UI**
- [ ] Create `packages/ui` package
- [ ] Extract 5 core components (Button, Input, Modal, Card, Badge)
- [ ] Write tests and Storybook stories
- [ ] Update RecruitIQ to use shared components

**Priority 3: Standardize API Client**
- [ ] Choose Axios as standard (better DX)
- [ ] Create `packages/api-client`
- [ ] Migrate RecruitIQ to HTTP-only cookies
- [ ] Extract common auth logic

### 14.3 Medium-Term Goals (Next 2 Months)

**Goals:**
- Complete shared UI library (15 components)
- Migrate all apps to shared packages
- Add TypeScript to shared packages
- Setup Storybook for component catalog
- Create Paylinq frontend shell (routing, basic pages)
- Create Nexus frontend shell (routing, basic pages)
- Improve test coverage to 50%

### 14.4 Long-Term Vision (6 Months)

**Vision:**
- Full multi-product SaaS platform
- 3 product apps + 1 admin portal
- Shared UI library with 35+ components
- Consistent design system
- 80%+ test coverage
- TypeScript across all apps
- Automated CI/CD with monorepo
- Storybook component documentation
- Performance optimized (lighthouse 90+)

---

**Document Status:** ✅ Complete  
**Next Document:** Integration Analysis (Task 1.5)

