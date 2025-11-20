# Frontend Standards

**Part of:** [RecruitIQ Coding Standards](../CODING_STANDARDS.md)  
**Version:** 1.2  
**Last Updated:** November 19, 2025

---

## Table of Contents

1. [Provider Wrapping Order](#provider-wrapping-order)
2. [API Client Integration Standards](#api-client-integration-standards)
3. [React Component Standards](#react-component-standards)
4. [Component Structure](#component-structure)
5. [Hooks Guidelines](#hooks-guidelines)
6. [State Management](#state-management)
7. [Styling Standards](#styling-standards)
8. [Performance Optimization](#performance-optimization)
9. [Accessibility](#accessibility)
10. [Form Handling](#form-handling)

---

## Provider Wrapping Order

### Industry Standard Provider Order (MANDATORY)

**CRITICAL:** Context providers MUST be wrapped in the correct order to ensure proper initialization and dependency management.

### Standard Order (Outermost → Innermost)

```tsx
1. ErrorBoundary        // Error handling (most defensive layer)
2. BrowserRouter        // Routing context (framework layer)
3. AuthProvider         // Authentication state (core app state)
4. QueryClientProvider  // API cache - React Query (data layer)
5. ThemeProvider        // UI preferences (visual layer)
6. ToastProvider        // Notifications (UI feedback layer)
7. Domain Providers     // App-specific (Organization, Workspace, etc.)
```

### Rationale for Order

| Provider | Position | Reason |
|----------|----------|--------|
| **ErrorBoundary** | First (outermost) | Must catch errors from ALL child components and providers |
| **BrowserRouter** | After ErrorBoundary | Provides routing context needed by many providers (redirects, location) |
| **AuthProvider** | After Router | Auth logic may need navigation; must be available before domain logic |
| **QueryClientProvider** | After Auth | API queries need authentication tokens |
| **ThemeProvider** | After Auth | Theme preferences may depend on user settings |
| **ToastProvider** | After Theme | Toast styling depends on theme context |
| **Domain Providers** | Last (innermost) | Organization/Workspace/Data providers depend on auth and may trigger queries |

### Implementation Examples

#### ✅ CORRECT: App.tsx with BrowserRouter Inside

```tsx
// apps/paylinq/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    {/* Protected routes */}
                  </Route>
                </Routes>
              </Suspense>
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
```

#### ✅ CORRECT: main.tsx with BrowserRouter Outside

```tsx
// apps/portal/src/main.jsx
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
```

#### ✅ CORRECT: Complex App with Multiple Domain Providers

```tsx
// apps/recruitiq/src/main.jsx
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@recruitiq/auth';
import { OrganizationProvider } from './context/OrganizationContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <OrganizationProvider>
            <WorkspaceProvider>
              <DataProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </DataProvider>
            </WorkspaceProvider>
          </OrganizationProvider>
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

### Common Anti-Patterns

#### ❌ WRONG: Router Inside Auth

```tsx
// ❌ BAD: Auth cannot use routing context
<AuthProvider>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</AuthProvider>
```

**Problem:** AuthProvider cannot access routing context for redirects on login/logout.

#### ❌ WRONG: Domain Providers Before Auth

```tsx
// ❌ BAD: Organization context loads before user is authenticated
<BrowserRouter>
  <OrganizationProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </OrganizationProvider>
</BrowserRouter>
```

**Problem:** Organization/Workspace data requires authenticated user context.

#### ❌ WRONG: Theme Before Auth

```tsx
// ❌ BAD: Theme loads before auth
<BrowserRouter>
  <ThemeProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>
</BrowserRouter>
```

**Problem:** User-specific theme preferences need authenticated user data.

#### ❌ WRONG: Missing ErrorBoundary

```tsx
// ❌ BAD: No error boundary
<BrowserRouter>
  <AuthProvider>
    <App />
  </AuthProvider>
</BrowserRouter>
```

**Problem:** Unhandled errors crash the entire app instead of showing error UI.

### BrowserRouter Placement: App vs main

**Two valid patterns exist:**

#### Pattern A: Router in main.tsx (Recommended for Portal-style apps)

```tsx
// main.tsx - Router at top level
<BrowserRouter>
  <AuthProvider>
    <App />
  </AuthProvider>
</BrowserRouter>

// App.tsx - Just Routes
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/" element={<Layout />} />
</Routes>
```

**Benefits:**
- Cleaner App.tsx focused on routing
- Router available across all providers
- Better for apps with complex provider trees

#### Pattern B: Router in App.tsx (Recommended for Product apps)

```tsx
// main.tsx - Just root setup
<React.StrictMode>
  <App />
</React.StrictMode>

// App.tsx - Router with all providers
<ErrorBoundary>
  <BrowserRouter>
    <AuthProvider>
      <Routes>...</Routes>
    </AuthProvider>
  </BrowserRouter>
</ErrorBoundary>
```

**Benefits:**
- Single file controls entire provider tree
- Easier to visualize provider hierarchy
- ErrorBoundary can wrap Router

**Both patterns are acceptable as long as the provider ORDER is correct.**

### Verification Checklist

When setting up a new app or refactoring providers:

- [ ] ErrorBoundary wraps everything (if errors should be caught)
- [ ] BrowserRouter is outside AuthProvider (or no routing needed in auth)
- [ ] AuthProvider is outside domain providers (Organization, Workspace, etc.)
- [ ] QueryClientProvider is after AuthProvider (queries need auth)
- [ ] ThemeProvider is after AuthProvider (themes may be user-specific)
- [ ] ToastProvider is after ThemeProvider (toasts need theme styling)
- [ ] No nested BrowserRouters (only one per app)
- [ ] Suspense boundaries around lazy-loaded routes

### References

This pattern follows industry standards used by:
- **Next.js** `_app.tsx` provider structure
- **Remix** root layout conventions
- **React Router** official documentation
- **Material-UI** example applications
- **Ant Design** recommended setup

---

## API Client Integration Standards

### Centralized API Clients (MANDATORY)

**ALL frontend applications MUST use the centralized `@recruitiq/api-client` package.**

```typescript
// ✅ CORRECT: Use product-specific clients
import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

// ❌ WRONG: Direct apiClient imports from local files
import { apiClient } from './api';  // Deprecated pattern
```

### Service Layer Pattern

**Create service files that wrap the product clients:**

```typescript
// apps/nexus/src/services/locations.service.ts
import { NexusClient, APIClient } from '@recruitiq/api-client';

// Singleton instances
const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const locationsService = {
  /**
   * Lists all locations with optional filters
   */
  async listLocations(filters?: { search?: string; isActive?: boolean }) {
    const response = await nexusClient.listLocations(filters);
    return response.data.locations || response.data;
  },

  /**
   * Gets a single location by ID
   */
  async getLocation(id: string) {
    const response = await nexusClient.getLocation(id);
    return response.data.location || response.data;
  },

  /**
   * Creates a new location
   */
  async createLocation(data: { name: string; address: string; city: string; country: string }) {
    const response = await nexusClient.createLocation(data);
    return response.data.location || response.data;
  },

  /**
   * Updates an existing location
   */
  async updateLocation(id: string, updates: Partial<any>) {
    const response = await nexusClient.updateLocation(id, updates);
    return response.data.location || response.data;
  },

  /**
   * Deletes a location (soft delete)
   */
  async deleteLocation(id: string) {
    await nexusClient.deleteLocation(id);
  },

  /**
   * Gets location statistics
   */
  async getStatistics() {
    const response = await nexusClient.getLocationStatistics();
    return response.data;
  }
};
```

### React Query Integration

**Use React Query hooks with the service layer:**

```typescript
// apps/nexus/src/hooks/useLocations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { locationsService } from '../services/locations.service';

/**
 * Hook for fetching locations list
 */
export function useLocations(filters?: any) {
  return useQuery({
    queryKey: ['locations', filters],
    queryFn: () => locationsService.listLocations(filters),
  });
}

/**
 * Hook for fetching a single location
 */
export function useLocation(id: string) {
  return useQuery({
    queryKey: ['locations', id],
    queryFn: () => locationsService.getLocation(id),
    enabled: !!id,
  });
}

/**
 * Hook for creating a location
 */
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: locationsService.createLocation,
    onSuccess: () => {
      // Invalidate and refetch locations list
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

/**
 * Hook for updating a location
 */
export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      locationsService.updateLocation(id, updates),
    onSuccess: (_, { id }) => {
      // Invalidate specific location and list
      queryClient.invalidateQueries({ queryKey: ['locations', id] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

/**
 * Hook for deleting a location
 */
export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: locationsService.deleteLocation,
    onSuccess: () => {
      // Invalidate locations list
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}
```

### Component Integration

**Use the React Query hooks in components:**

```tsx
// apps/nexus/src/pages/locations/LocationsList.tsx
import React from 'react';
import { useLocations, useDeleteLocation } from '../../hooks/useLocations';
import { useNavigate } from 'react-router-dom';

export default function LocationsList() {
  const navigate = useNavigate();
  const { data: locations, isLoading, error } = useLocations();
  const deleteLocation = useDeleteLocation();

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this location?')) {
      await deleteLocation.mutateAsync(id);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Locations</h1>
      <button onClick={() => navigate('/locations/new')}>Add Location</button>
      
      <div className="locations-grid">
        {locations?.map((location) => (
          <div key={location.id} className="location-card">
            <h3>{location.name}</h3>
            <p>{location.city}, {location.country}</p>
            <button onClick={() => navigate(`/locations/${location.id}`)}>View</button>
            <button onClick={() => navigate(`/locations/${location.id}/edit`)}>Edit</button>
            <button onClick={() => handleDelete(location.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Multi-Product Integration

**For apps that use multiple products (e.g., Nexus + ScheduleHub):**

```typescript
// apps/nexus/src/services/index.ts
import { APIClient, NexusClient, ScheduleHubClient } from '@recruitiq/api-client';

// Single APIClient instance shared across products
const apiClient = new APIClient();

// Product clients
export const nexusClient = new NexusClient(apiClient);
export const scheduleHubClient = new ScheduleHubClient(apiClient);

// Service layer for Nexus
export * from './locations.service';
export * from './employees.service';
export * from './departments.service';

// Service layer for ScheduleHub
export * from './schedulehub/schedules.service';
export * from './schedulehub/stations.service';
```

### Portal (Admin) Integration

**Portal uses PortalAPI for platform administration:**

```typescript
// apps/portal/src/services/auth.service.ts
import { PortalAPI, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const portalClient = new PortalAPI(apiClient);

export const authService = {
  async login(email: string, password: string) {
    const response = await portalClient.login(email, password);
    return response;
  },

  async getMe() {
    const response = await portalClient.getMe();
    return response.user || response.data;
  },
};

// apps/portal/src/services/customers.service.ts
export const customersService = {
  async getCustomers(filters = {}) {
    const response = await portalClient.getCustomers(filters);
    return response.customers || response.data;
  },

  async getCustomer(id: string) {
    const response = await portalClient.getCustomer(id);
    return response.customer || response.data;
  },
};
```

**Portal Legacy Pattern (Backward Compatible):**

Portal components may still use the legacy `apiService` pattern (933-line api.js file). While functional, new components should use the new service layer:

```jsx
// ❌ OLD PATTERN (still works, but deprecated):
import apiService from '../../services/api';

const customers = await apiService.getCustomers();
const customer = await apiService.getCustomer(id);

// ✅ NEW PATTERN (preferred):
import { customersService, authService } from '../../services';

const customers = await customersService.getCustomers();
const user = await authService.getMe();
```

### RecruitIQ (ATS) Integration

**RecruitIQ uses RecruitIQAPI for recruitment features:**

```typescript
// apps/recruitiq/src/services/auth.service.ts
import { RecruitIQAPI, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const recruitiqClient = new RecruitIQAPI(apiClient);

export const authService = {
  async login(email: string, password: string) {
    const response = await recruitiqClient.login(email, password);
    return response;
  },

  async register(data: any) {
    const response = await recruitiqClient.register(data);
    return response;
  },

  async getMe() {
    const response = await recruitiqClient.getMe();
    return response.user || response.data;
  },
};

// apps/recruitiq/src/services/jobs.service.ts
export const jobsService = {
  async getJobs(params = {}) {
    const response = await recruitiqClient.getJobs(params);
    return response.jobs || response.data;
  },

  async getPublicJobs() {
    const response = await recruitiqClient.getPublicJobs();
    return response.jobs || response.data;
  },
};
```

**RecruitIQ Usage in Components:**

```jsx
// apps/recruitiq/src/pages/Jobs/JobList.jsx
import { jobsService, authService } from '../../services';

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      try {
        const data = await jobsService.getJobs({ status: 'open' });
        setJobs(data);
      } catch (error) {
        console.error('Failed to load jobs:', error);
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  return (
    <div>
      {loading ? (
        <LoadingSpinner />
      ) : (
        jobs.map(job => <JobCard key={job.id} job={job} />)
      )}
    </div>
  );
}
```

### Available Product Clients

| Product | Client Class | Package Import | Use Case |
|---------|-------------|----------------|----------|
| Nexus (HRIS) | `NexusClient` | `@recruitiq/api-client` | Employee management, attendance, benefits, documents |
| PayLinQ (Payroll) | `PayLinQClient` | `@recruitiq/api-client` | Payroll runs, compensation, tax calculations |
| ScheduleHub | `ScheduleHubClient` | `@recruitiq/api-client` | Scheduling, shifts, stations, time tracking |
| RecruitIQ (ATS) | `RecruitIQAPI` | `@recruitiq/api-client` | Job postings, candidates, applications, interviews |
| Portal (Admin) | `PortalAPI` | `@recruitiq/api-client` | Platform administration, licenses, customers, features |

### File Upload Pattern

**For endpoints that require file uploads:**

```typescript
// apps/nexus/src/services/documents.service.ts
import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const documentsService = {
  /**
   * Uploads a document file
   */
  async uploadDocument(file: File, metadata: { name: string; folderId?: string }) {
    const response = await nexusClient.uploadFile(file, metadata);
    return response.data.document || response.data;
  },

  /**
   * Downloads a document
   */
  async downloadDocument(id: string) {
    const response = await nexusClient.downloadDocument(id);
    return response.data; // Blob data
  }
};
```

### Error Handling Pattern

**Handle API errors consistently:**

```typescript
// apps/nexus/src/services/locations.service.ts
import { NexusClient, APIClient } from '@recruitiq/api-client';
import { toast } from '../contexts/ToastContext';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const locationsService = {
  async createLocation(data: any) {
    try {
      const response = await nexusClient.createLocation(data);
      toast.success('Location created successfully');
      return response.data.location;
    } catch (error: any) {
      // API client provides structured error responses
      const message = error.response?.data?.error || 'Failed to create location';
      toast.error(message);
      throw error;
    }
  }
};
```

### Migration from Legacy Pattern

**If you have existing code using direct API calls:**

```typescript
// ❌ OLD PATTERN (Before migration)
import { apiClient } from './api';

export const locationsService = {
  async listLocations() {
    const response = await apiClient.get('/api/products/nexus/locations');
    return response.data;
  }
};

// ✅ NEW PATTERN (After migration)
import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

export const locationsService = {
  async listLocations(filters?: any) {
    const response = await nexusClient.listLocations(filters);
    return response.data.locations || response.data;
  }
};
```

### API Client Standards Checklist

**For every new service file:**

- [ ] Import from `@recruitiq/api-client`, not local files
- [ ] Use product-specific client (NexusClient, PayLinQClient, etc.)
- [ ] Create service layer that wraps client methods
- [ ] Export service functions, not the client directly
- [ ] Use React Query hooks for component integration
- [ ] Handle errors consistently with toast notifications
- [ ] Add JSDoc comments for all service functions
- [ ] Return unwrapped data from service functions
- [ ] Include TypeScript types for parameters and returns

---

## React Component Standards

### Component Types

```jsx
// ✅ CORRECT: Functional components (preferred)
import React from 'react';
import PropTypes from 'prop-types';

function JobCard({ job, onEdit, onDelete }) {
  return (
    <div className="job-card">
      <h3>{job.title}</h3>
      <p>{job.description}</p>
      <button onClick={() => onEdit(job.id)}>Edit</button>
      <button onClick={() => onDelete(job.id)}>Delete</button>
    </div>
  );
}

JobCard.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default JobCard;

// ❌ WRONG: Class components (avoid unless necessary)
class JobCard extends React.Component {
  render() {
    return <div>...</div>;
  }
}
```

### Component Naming

```jsx
// ✅ CORRECT: PascalCase for components
JobCard.jsx
JobList.jsx
ApplicationForm.jsx
CandidateProfile.jsx

// ✅ CORRECT: Component file structure
src/components/
  jobs/
    JobCard.jsx
    JobList.jsx
    JobForm.jsx
    index.js  // Export all job components
  candidates/
    CandidateCard.jsx
    CandidateList.jsx
    index.js
  common/
    Button.jsx
    Modal.jsx
    LoadingSpinner.jsx

// ❌ WRONG: Inconsistent naming
jobCard.jsx      // Should be PascalCase
job-card.jsx     // Should be PascalCase
JobCardComponent.jsx  // Redundant "Component" suffix
```

---

## Component Structure

### Component File Template

```jsx
/**
 * JobCard Component
 * 
 * Displays a job posting card with title, description, and actions
 * 
 * @component
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

// Local imports
import Button from '../common/Button';
import { formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import './JobCard.css';

/**
 * JobCard component
 */
function JobCard({ job, onEdit, onDelete, showActions = true }) {
  // 1. Hooks (order matters)
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  // 2. Computed values (useMemo)
  const formattedDate = useMemo(
    () => formatDate(job.createdAt),
    [job.createdAt]
  );

  const canEdit = useMemo(
    () => user.role === 'admin' || job.createdBy === user.id,
    [user.role, user.id, job.createdBy]
  );

  // 3. Effects
  useEffect(() => {
    // Component mount/unmount logic
    console.log('JobCard mounted for job:', job.id);
    
    return () => {
      console.log('JobCard unmounted');
    };
  }, [job.id]);

  // 4. Event handlers (useCallback for performance)
  const handleEdit = useCallback(() => {
    onEdit(job.id);
  }, [job.id, onEdit]);

  const handleDelete = useCallback(() => {
    if (confirm(`Are you sure you want to delete "${job.title}"?`)) {
      onDelete(job.id);
    }
  }, [job.id, job.title, onDelete]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // 5. Render helpers
  const renderActions = () => {
    if (!showActions || !canEdit) return null;

    return (
      <div className="job-card-actions">
        <Button variant="secondary" onClick={handleEdit}>
          Edit
        </Button>
        <Button variant="danger" onClick={handleDelete}>
          Delete
        </Button>
      </div>
    );
  };

  // 6. Main render
  return (
    <div className="job-card" data-testid="job-card">
      <div className="job-card-header">
        <h3 className="job-card-title">{job.title}</h3>
        <span className="job-card-date">{formattedDate}</span>
      </div>

      <p className={`job-card-description ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {job.description}
      </p>

      <button 
        className="job-card-expand" 
        onClick={handleToggleExpand}
        aria-expanded={isExpanded}
      >
        {isExpanded ? 'Show Less' : 'Show More'}
      </button>

      {renderActions()}
    </div>
  );
}

// 7. PropTypes
JobCard.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    createdAt: PropTypes.string.isRequired,
    createdBy: PropTypes.string
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  showActions: PropTypes.bool
};

// 8. Default props
JobCard.defaultProps = {
  showActions: true
};

export default JobCard;
```

### Component Organization Rules

```jsx
// ✅ CORRECT: Organized structure
// 1. Imports (external first, then local)
// 2. Component definition
// 3. Hooks (in consistent order)
// 4. Event handlers
// 5. Render helpers
// 6. Main render
// 7. PropTypes
// 8. Export

// Hook order (MANDATORY):
// 1. useContext
// 2. useState
// 3. useReducer
// 4. useRef
// 5. useMemo
// 6. useCallback
// 7. useEffect

// ❌ WRONG: Random order
function BadComponent() {
  const handleClick = () => {};  // Event handler before hooks
  useEffect(() => {});           // Effect before state
  const [value, setValue] = useState();  // State after effect
  const data = useMemo(() => {});  // Memo after effect
}
```

---

## Hooks Guidelines

### useState

```jsx
// ✅ CORRECT: Descriptive state names
const [isLoading, setIsLoading] = useState(false);
const [jobs, setJobs] = useState([]);
const [selectedJobId, setSelectedJobId] = useState(null);
const [formData, setFormData] = useState({
  title: '',
  description: '',
  status: 'draft'
});

// ✅ CORRECT: Update state immutably
const addJob = (newJob) => {
  setJobs(prevJobs => [...prevJobs, newJob]);
};

const updateJob = (jobId, updates) => {
  setJobs(prevJobs =>
    prevJobs.map(job =>
      job.id === jobId ? { ...job, ...updates } : job
    )
  );
};

const updateFormData = (field, value) => {
  setFormData(prev => ({
    ...prev,
    [field]: value
  }));
};

// ❌ WRONG: Mutating state
const addJob = (newJob) => {
  jobs.push(newJob);  // ❌ Mutating array
  setJobs(jobs);
};
```

### useEffect

```jsx
// ✅ CORRECT: Clear dependencies
useEffect(() => {
  fetchJobs(organizationId);
}, [organizationId]);  // Only re-run when organizationId changes

// ✅ CORRECT: Cleanup function
useEffect(() => {
  const subscription = api.subscribe('jobs', handleJobUpdate);
  
  return () => {
    subscription.unsubscribe();  // Cleanup
  };
}, []);

// ✅ CORRECT: Separate concerns
useEffect(() => {
  fetchJobs();
}, []);

useEffect(() => {
  document.title = `${jobs.length} Jobs`;
}, [jobs.length]);

// ❌ WRONG: Missing dependencies
useEffect(() => {
  fetchJobs(organizationId);  // Uses organizationId
}, []);  // ❌ Missing dependency!

// ❌ WRONG: Too many responsibilities
useEffect(() => {
  fetchJobs();
  fetchCandidates();
  updateTitle();
  subscribeToEvents();
  // Too much in one effect!
}, []);
```

### useCallback

```jsx
// ✅ CORRECT: Memoize callbacks passed to child components
const JobList = ({ jobs }) => {
  const handleEdit = useCallback((jobId) => {
    // Edit logic
  }, []);  // No dependencies if logic is self-contained

  const handleDelete = useCallback((jobId) => {
    deleteJob(jobId, organizationId);
  }, [organizationId]);  // Include dependencies

  return (
    <div>
      {jobs.map(job => (
        <JobCard
          key={job.id}
          job={job}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};

// ❌ WRONG: Creating new functions on every render
const JobList = ({ jobs }) => {
  return (
    <div>
      {jobs.map(job => (
        <JobCard
          key={job.id}
          job={job}
          onEdit={(id) => {}}  // ❌ New function every render
          onDelete={(id) => {}}  // ❌ New function every render
        />
      ))}
    </div>
  );
};
```

### useMemo

```jsx
// ✅ CORRECT: Expensive computations
const JobDashboard = ({ jobs }) => {
  const statistics = useMemo(() => {
    return {
      total: jobs.length,
      open: jobs.filter(j => j.status === 'open').length,
      closed: jobs.filter(j => j.status === 'closed').length,
      avgApplications: calculateAverage(jobs.map(j => j.applicationCount))
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs
      .filter(job => job.status === 'open')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [jobs]);

  return <div>...</div>;
};

// ❌ WRONG: Overusing useMemo for simple values
const value = useMemo(() => a + b, [a, b]);  // ❌ Too simple, no benefit
```

### Custom Hooks

```jsx
// ✅ CORRECT: Custom hook for reusable logic
/**
 * Custom hook for fetching jobs
 */
function useJobs(organizationId) {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchJobs() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get(`/jobs`, {
          params: { organizationId }
        });

        if (isMounted) {
          setJobs(response.data.jobs);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchJobs();

    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  const refetch = useCallback(() => {
    // Refetch logic
  }, [organizationId]);

  return { jobs, isLoading, error, refetch };
}

// Usage
function JobList() {
  const { user } = useAuth();
  const { jobs, isLoading, error, refetch } = useJobs(user.organizationId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{jobs.map(job => <JobCard key={job.id} job={job} />)}</div>;
}
```

---

## State Management

### Context API

```jsx
// ✅ CORRECT: Context for global state
// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user from token
    const token = localStorage.getItem('token');
    if (token) {
      loadUserFromToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
}
```

---

## Styling Standards

### TailwindCSS Guidelines

```jsx
// ✅ CORRECT: Semantic class grouping
<div className="
  flex items-center justify-between
  px-4 py-3
  bg-white rounded-lg shadow-md
  hover:shadow-lg transition-shadow
">
  <h3 className="text-lg font-semibold text-gray-900">
    {job.title}
  </h3>
</div>

// ✅ CORRECT: Conditional classes
<button 
  className={`
    px-4 py-2 rounded font-medium
    ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
    ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
  `}
  disabled={isLoading}
>
  {isLoading ? 'Loading...' : 'Submit'}
</button>

// ✅ CORRECT: Use clsx for complex conditionals
import clsx from 'clsx';

<div className={clsx(
  'px-4 py-2 rounded',
  {
    'bg-green-100 text-green-800': status === 'open',
    'bg-gray-100 text-gray-800': status === 'closed',
    'bg-yellow-100 text-yellow-800': status === 'draft'
  }
)}>
  {status}
</div>
```

---

## Performance Optimization

### React.memo

```jsx
// ✅ CORRECT: Memoize components that receive same props often
const JobCard = React.memo(function JobCard({ job, onEdit, onDelete }) {
  return (
    <div className="job-card">
      <h3>{job.title}</h3>
      {/* ... */}
    </div>
  );
});

// Custom comparison function
const JobCard = React.memo(
  function JobCard({ job }) {
    return <div>{job.title}</div>;
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    return prevProps.job.id === nextProps.job.id &&
           prevProps.job.title === nextProps.job.title;
  }
);
```

### Code Splitting

```jsx
// ✅ CORRECT: Lazy load routes
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/common/LoadingSpinner';

const JobList = lazy(() => import('./pages/jobs/JobList'));
const JobDetail = lazy(() => import('./pages/jobs/JobDetail'));
const CandidateList = lazy(() => import('./pages/candidates/CandidateList'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/jobs" element={<JobList />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/candidates" element={<CandidateList />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

---

## Accessibility

### ARIA Attributes

```jsx
// ✅ CORRECT: Accessible components
<button
  onClick={handleDelete}
  aria-label="Delete job posting"
  aria-describedby="delete-description"
>
  <TrashIcon />
</button>

<input
  type="text"
  id="job-title"
  aria-label="Job title"
  aria-required="true"
  aria-invalid={errors.title ? 'true' : 'false'}
  aria-describedby={errors.title ? 'title-error' : undefined}
/>

{errors.title && (
  <span id="title-error" role="alert" className="error-message">
    {errors.title}
  </span>
)}
```

---

## Form Handling

### Controlled Components

```jsx
// ✅ CORRECT: Controlled form
function JobForm({ initialData = {}, onSubmit }) {
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    status: initialData.status || 'draft'
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          aria-invalid={errors.title ? 'true' : 'false'}
        />
        {errors.title && <span role="alert">{errors.title}</span>}
      </div>

      <button type="submit">Submit</button>
    </form>
  );
}
```

---

**Next:** [Git Standards](./GIT_STANDARDS.md)
