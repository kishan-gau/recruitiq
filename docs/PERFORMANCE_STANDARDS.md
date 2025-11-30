# Performance Standards

**Part of:** [RecruitIQ Coding Standards](../CODING_STANDARDS.md)  
**Version:** 1.0  
**Last Updated:** November 3, 2025

---

## Table of Contents

1. [Performance Goals](#performance-goals)
2. [Backend Performance](#backend-performance)
3. [Frontend Performance](#frontend-performance)
4. [Database Performance](#database-performance)
5. [Caching Strategies](#caching-strategies)
6. [Monitoring & Profiling](#monitoring--profiling)

---

## Performance Goals

### Target Metrics

```
API Response Times:
  P50: < 100ms
  P95: < 200ms
  P99: < 500ms

Database Queries:
  Simple queries: < 50ms
  Complex queries: < 200ms
  Bulk operations: < 1000ms

Frontend (Lighthouse):
  Performance: > 90
  First Contentful Paint: < 1.5s
  Time to Interactive: < 3.0s
  Largest Contentful Paint: < 2.5s

Bundle Size:
  Initial JS bundle: < 200KB (gzipped)
  Initial CSS bundle: < 50KB (gzipped)
  Total page weight: < 1MB
```

---

## Backend Performance

### Request Handling

```javascript
// ✅ CORRECT: Efficient async operations
async function getJobWithRelations(jobId, organizationId) {
  // Fetch in parallel instead of sequential
  const [job, applications, candidates] = await Promise.all([
    JobRepository.findById(jobId, organizationId),
    ApplicationRepository.findByJobId(jobId, organizationId),
    CandidateRepository.findByJobId(jobId, organizationId)
  ]);

  return {
    ...job,
    applications,
    candidates
  };
}

// ❌ WRONG: Sequential awaits
async function getJobWithRelations(jobId, organizationId) {
  const job = await JobRepository.findById(jobId, organizationId);
  const applications = await ApplicationRepository.findByJobId(jobId, organizationId);
  const candidates = await CandidateRepository.findByJobId(jobId, organizationId);
  
  return { ...job, applications, candidates };
}
```

### Response Compression

```javascript
import compression from 'compression';

// Enable gzip compression
app.use(compression({
  level: 6,  // Compression level (0-9)
  threshold: 1024,  // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

### Pagination (MANDATORY for lists)

```javascript
// ✅ CORRECT: Always paginate large datasets
async function listJobs(filters, organizationId) {
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
  const offset = (page - 1) * limit;

  const [countResult, jobsResult] = await Promise.all([
    // Get count in parallel
    query(
      'SELECT COUNT(*) as total FROM jobs WHERE organization_id = $1 AND deleted_at IS NULL',
      [organizationId],
      organizationId
    ),
    // Get page of results
    query(
      `SELECT * FROM jobs 
       WHERE organization_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset],
      organizationId
    )
  ]);

  return {
    jobs: jobsResult.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].total),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    }
  };
}

// ❌ WRONG: Loading entire table
async function listJobs(organizationId) {
  const result = await query(
    'SELECT * FROM jobs WHERE organization_id = $1',  // Could be thousands!
    [organizationId],
    organizationId
  );
  
  return result.rows;
}
```

### Avoid N+1 Queries

```javascript
// ✅ CORRECT: Single query with JOIN
async function getJobsWithApplicationCount(organizationId) {
  const result = await query(`
    SELECT 
      j.*,
      COUNT(a.id) as application_count
    FROM jobs j
    LEFT JOIN applications a ON j.id = a.job_id AND a.deleted_at IS NULL
    WHERE j.organization_id = $1
      AND j.deleted_at IS NULL
    GROUP BY j.id
    ORDER BY j.created_at DESC
  `, [organizationId], organizationId);

  return result.rows;
}

// ❌ WRONG: N+1 queries
async function getJobsWithApplicationCount(organizationId) {
  const jobs = await query(
    'SELECT * FROM jobs WHERE organization_id = $1',
    [organizationId],
    organizationId
  );

  // N additional queries!
  for (const job of jobs.rows) {
    const count = await query(
      'SELECT COUNT(*) FROM applications WHERE job_id = $1',
      [job.id],
      organizationId
    );
    job.application_count = count.rows[0].count;
  }

  return jobs.rows;
}
```

### Bulk Operations

```javascript
// ✅ CORRECT: Bulk insert
async function bulkCreateCandidates(candidates, organizationId, userId) {
  // Build VALUES clause for bulk insert
  const valuesClauses = [];
  const values = [];
  let paramCount = 0;

  for (const candidate of candidates) {
    paramCount++;
    const idParam = paramCount;
    paramCount++;
    const emailParam = paramCount;
    paramCount++;
    const nameParam = paramCount;
    
    valuesClauses.push(`($${idParam}, $${emailParam}, $${nameParam}, $${paramCount + 1}, $${paramCount + 2})`);
    values.push(
      uuid(),
      candidate.email,
      candidate.name,
      organizationId,
      userId
    );
    paramCount += 2;
  }

  const result = await query(`
    INSERT INTO candidates (id, email, name, organization_id, created_by)
    VALUES ${valuesClauses.join(', ')}
    RETURNING *
  `, values, organizationId);

  return result.rows;
}

// ❌ WRONG: Individual inserts in loop
async function bulkCreateCandidates(candidates, organizationId, userId) {
  const created = [];
  
  for (const candidate of candidates) {
    const result = await query(  // Individual query per candidate!
      'INSERT INTO candidates (email, name, organization_id, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [candidate.email, candidate.name, organizationId, userId],
      organizationId
    );
    created.push(result.rows[0]);
  }
  
  return created;
}
```

---

## Frontend Performance

### Code Splitting

```javascript
// ✅ CORRECT: Lazy load routes
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Jobs = lazy(() => import('./pages/Jobs'));
const Candidates = lazy(() => import('./pages/Candidates'));
const Reports = lazy(() => import('./pages/Reports'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs/*" element={<Jobs />} />
          <Route path="/candidates/*" element={<Candidates />} />
          <Route path="/reports/*" element={<Reports />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

### Memoization

```javascript
// ✅ CORRECT: Memoize expensive computations
import { useMemo, useCallback } from 'react';

function JobDashboard({ jobs }) {
  // Memoize expensive calculation
  const statistics = useMemo(() => {
    return {
      total: jobs.length,
      open: jobs.filter(j => j.status === 'open').length,
      avgSalary: jobs.reduce((sum, j) => sum + (j.salary || 0), 0) / jobs.length
    };
  }, [jobs]);

  // Memoize callbacks
  const handleFilter = useCallback((status) => {
    // Filter logic
  }, []);

  return <div>...</div>;
}

// ✅ CORRECT: Memoize components
const JobCard = React.memo(function JobCard({ job }) {
  return (
    <div className="job-card">
      <h3>{job.title}</h3>
      <p>{job.description}</p>
    </div>
  );
});
```

### Virtual Scrolling for Long Lists

```javascript
// ✅ CORRECT: Virtual scrolling for large lists
import { FixedSizeList } from 'react-window';

function JobList({ jobs }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <JobCard job={jobs[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={jobs.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// ❌ WRONG: Rendering thousands of items
function JobList({ jobs }) {
  return (
    <div>
      {jobs.map(job => <JobCard key={job.id} job={job} />)}
      {/* Could render 10,000+ components! */}
    </div>
  );
}
```

### Image Optimization

```javascript
// ✅ CORRECT: Lazy load images
<img 
  src={candidate.photo} 
  alt={candidate.name}
  loading="lazy"
  width="200"
  height="200"
/>

// ✅ CORRECT: Use modern formats
<picture>
  <source srcSet={`${photo}.webp`} type="image/webp" />
  <source srcSet={`${photo}.jpg`} type="image/jpeg" />
  <img src={`${photo}.jpg`} alt="Candidate" />
</picture>

// ✅ CORRECT: Responsive images
<img
  src={photo}
  srcSet={`
    ${photo}-small.jpg 400w,
    ${photo}-medium.jpg 800w,
    ${photo}-large.jpg 1200w
  `}
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  alt="Candidate"
  loading="lazy"
/>
```

### Debouncing & Throttling

```javascript
// ✅ CORRECT: Debounce search input
import { useState, useCallback } from 'react';
import { debounce } from 'lodash';

function JobSearch() {
  const [searchTerm, setSearchTerm] = useState('');

  // Debounce API call
  const debouncedSearch = useCallback(
    debounce(async (term) => {
      if (term.length >= 3) {
        const results = await api.searchJobs(term);
        setResults(results);
      }
    }, 300),
    []
  );

  const handleChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  return <input value={searchTerm} onChange={handleChange} />;
}

// ✅ CORRECT: Throttle scroll handler
import { throttle } from 'lodash';

const handleScroll = useCallback(
  throttle(() => {
    // Expensive scroll operation
  }, 100),
  []
);

useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [handleScroll]);
```

### Bundle Optimization

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@headlessui/react', '@heroicons/react'],
          
          // Feature chunks
          'jobs': ['./src/pages/jobs/*'],
          'candidates': ['./src/pages/candidates/*'],
          'reports': ['./src/pages/reports/*']
        }
      }
    },
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true  // Remove console.logs in production
      }
    }
  }
};
```

### React Query Optimization (MANDATORY)

React Query (TanStack Query) is our standard for API state management. Proper configuration prevents unnecessary API calls and improves performance.

#### QueryClient Configuration

```typescript
// ✅ CORRECT: Optimized QueryClient configuration
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: Data stays fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      
      // Garbage collection: Keep unused data for 10 minutes
      gcTime: 10 * 60 * 1000,
      
      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        // Retry once for other errors
        return failureCount < 1;
      },
      
      // Don't refetch on window focus for stable data
      refetchOnWindowFocus: false,
      
      // Refetch on reconnect for critical data
      refetchOnReconnect: true,
      
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
    mutations: {
      // Never retry mutations (data modification)
      retry: false,
    },
  },
});

// ❌ WRONG: Default configuration causes excessive API calls
const queryClient = new QueryClient();
// Uses defaults: staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: true
// Results in API calls on every render, window focus, and mount!
```

#### Smart Query Key Structure

```typescript
// ✅ CORRECT: Hierarchical query keys for efficient invalidation
export const queryKeys = {
  // Top level
  locations: ['locations'] as const,
  
  // With filters
  locationsList: (filters?: any) => ['locations', 'list', filters] as const,
  
  // Single item
  locationsDetail: (id: string) => ['locations', 'detail', id] as const,
  
  // Statistics (separate cache)
  locationsStats: () => ['locations', 'statistics'] as const,
};

// Usage in hooks
export function useLocations(filters?: any) {
  return useQuery({
    queryKey: queryKeys.locationsList(filters),
    queryFn: () => locationsService.listLocations(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: queryKeys.locationsDetail(id),
    queryFn: () => locationsService.getLocation(id),
    enabled: !!id, // Only run when ID exists
    staleTime: 10 * 60 * 1000, // 10 minutes for details
  });
}

// ❌ WRONG: Flat query keys make invalidation difficult
useQuery({
  queryKey: ['locations'], // Too generic
  queryFn: () => locationsService.listLocations(filters),
});

useQuery({
  queryKey: ['location', id], // Inconsistent naming
  queryFn: () => locationsService.getLocation(id),
});
```

#### Efficient Cache Invalidation

```typescript
// ✅ CORRECT: Granular invalidation
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: locationsService.createLocation,
    onSuccess: () => {
      // Invalidate ONLY the list queries, not individual items
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.locations,
        exact: false, // Invalidate all queries starting with ['locations']
      });
      
      // Update statistics if shown
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.locationsStats() 
      });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      locationsService.updateLocation(id, updates),
    onSuccess: (updatedLocation, { id }) => {
      // Update specific item in cache (no refetch needed!)
      queryClient.setQueryData(
        queryKeys.locationsDetail(id),
        updatedLocation
      );
      
      // Invalidate list to show updated item
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.locationsList() 
      });
    },
  });
}

// ❌ WRONG: Nuclear invalidation
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: locationsService.createLocation,
    onSuccess: () => {
      // Invalidates EVERYTHING!
      queryClient.invalidateQueries();
    },
  });
}
```

#### Optimistic Updates for Better UX

```typescript
// ✅ CORRECT: Optimistic update for instant feedback
export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      locationsService.updateLocation(id, updates),
    
    // Optimistic update (runs before mutation)
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.locationsDetail(id) 
      });

      // Snapshot previous value
      const previousLocation = queryClient.getQueryData(
        queryKeys.locationsDetail(id)
      );

      // Optimistically update cache
      queryClient.setQueryData(
        queryKeys.locationsDetail(id),
        (old: any) => ({ ...old, ...updates })
      );

      // Return context with snapshot
      return { previousLocation };
    },
    
    // Rollback on error
    onError: (error, { id }, context) => {
      queryClient.setQueryData(
        queryKeys.locationsDetail(id),
        context?.previousLocation
      );
    },
    
    // Refetch to ensure sync
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.locationsDetail(id) 
      });
    },
  });
}
```

#### Prefetching for Anticipated Navigation

```typescript
// ✅ CORRECT: Prefetch data before navigation
export function LocationCard({ location }: { location: Location }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleMouseEnter = () => {
    // Prefetch location details on hover
    queryClient.prefetchQuery({
      queryKey: queryKeys.locationsDetail(location.id),
      queryFn: () => locationsService.getLocation(location.id),
      staleTime: 10 * 60 * 1000,
    });
  };

  const handleClick = () => {
    // Data already cached from prefetch!
    navigate(`/locations/${location.id}`);
  };

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      className="cursor-pointer"
    >
      <h3>{location.name}</h3>
      <p>{location.city}</p>
    </div>
  );
}
```

#### Preventing Race Conditions

```typescript
// ✅ CORRECT: Use query cancellation
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export function useSearchLocations(searchTerm: string) {
  return useQuery({
    queryKey: ['locations', 'search', searchTerm],
    queryFn: async ({ signal }) => {
      // Pass abort signal to axios
      const response = await axios.get('/api/products/nexus/locations', {
        params: { search: searchTerm },
        signal, // Automatic cancellation
      });
      return response.data;
    },
    enabled: searchTerm.length >= 3, // Only search with 3+ chars
    staleTime: 30 * 1000, // 30 seconds for search results
  });
}

// React Query automatically cancels previous requests when searchTerm changes!
```

#### Dependent Queries

```typescript
// ✅ CORRECT: Enable query based on dependency
export function useLocationDepartments(locationId: string | undefined) {
  return useQuery({
    queryKey: ['locations', locationId, 'departments'],
    queryFn: () => departmentsService.listByLocation(locationId!),
    enabled: !!locationId, // Only fetch when locationId exists
    staleTime: 5 * 60 * 1000,
  });
}

// Usage
function LocationDetails({ locationId }: { locationId?: string }) {
  // First query
  const { data: location } = useLocation(locationId);
  
  // Second query only runs when locationId exists
  const { data: departments } = useLocationDepartments(locationId);
  
  return (
    <div>
      {location && <h1>{location.name}</h1>}
      {departments && <DepartmentList departments={departments} />}
    </div>
  );
}
```

#### Parallel Queries for Independent Data

```typescript
// ✅ CORRECT: Fetch multiple independent resources in parallel
export function useDashboardData(organizationId: string) {
  const locationsQuery = useQuery({
    queryKey: queryKeys.locationsList(),
    queryFn: () => locationsService.listLocations(),
    staleTime: 5 * 60 * 1000,
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'list'],
    queryFn: () => departmentsService.listDepartments(),
    staleTime: 5 * 60 * 1000,
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.locationsStats(),
    queryFn: () => locationsService.getStatistics(),
    staleTime: 2 * 60 * 1000, // Refresh stats more frequently
  });

  // All queries run in parallel
  return {
    locations: locationsQuery.data,
    departments: departmentsQuery.data,
    stats: statsQuery.data,
    isLoading: locationsQuery.isLoading || departmentsQuery.isLoading || statsQuery.isLoading,
    isError: locationsQuery.isError || departmentsQuery.isError || statsQuery.isError,
  };
}
```

#### Infinite Queries for Pagination

```typescript
// ✅ CORRECT: Use infinite queries for infinite scroll
export function useInfiniteLocations(filters?: any) {
  return useInfiniteQuery({
    queryKey: ['locations', 'infinite', filters],
    queryFn: ({ pageParam = 1 }) =>
      locationsService.listLocations({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.hasNext ? pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}

// Usage
function InfiniteLocationsList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteLocations();

  return (
    <div>
      {data?.pages.map((page) =>
        page.locations.map((location) => (
          <LocationCard key={location.id} location={location} />
        ))
      )}
      
      {hasNextPage && (
        <button 
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

#### React Query Anti-Patterns to Avoid

```typescript
// ❌ WRONG: Fetching in useEffect when React Query should be used
function LocationDetails({ locationId }: { locationId: string }) {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Manual fetching - loses caching, refetching, error handling!
    setLoading(true);
    locationsService.getLocation(locationId)
      .then(setLocation)
      .finally(() => setLoading(false));
  }, [locationId]);

  // Use useLocation hook instead!
}

// ❌ WRONG: Disabling all React Query features
const { data } = useQuery({
  queryKey: ['locations'],
  queryFn: fetchLocations,
  staleTime: 0, // Always stale
  gcTime: 0, // Never cache
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  // This defeats the purpose of React Query!
});

// ❌ WRONG: Too many unnecessary invalidations
onSuccess: () => {
  queryClient.invalidateQueries(); // Invalidates EVERYTHING
  queryClient.refetchQueries(); // Refetches EVERYTHING
}

// ❌ WRONG: Storing query data in local state
const { data: locations } = useLocations();
const [localLocations, setLocalLocations] = useState(locations);
// Breaks cache synchronization! Use query data directly.
```

#### Performance Checklist for React Query

- [ ] QueryClient configured with appropriate `staleTime` and `gcTime`
- [ ] Query keys use hierarchical structure for efficient invalidation
- [ ] Mutations invalidate only affected queries (not everything)
- [ ] Optimistic updates implemented for instant feedback
- [ ] Prefetching used for anticipated navigation
- [ ] Query cancellation enabled via abort signals
- [ ] Dependent queries use `enabled` option
- [ ] Infinite queries used for pagination/infinite scroll
- [ ] No manual data fetching in `useEffect` when React Query could be used
- [ ] No unnecessary query invalidations

---

## Database Performance

### Indexing Strategy

```sql
-- ✅ CORRECT: Index foreign keys
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);

-- ✅ CORRECT: Composite index for common queries
CREATE INDEX idx_jobs_org_status_created 
ON jobs(organization_id, status, created_at DESC)
WHERE deleted_at IS NULL;

-- ✅ CORRECT: Partial index for active records
CREATE INDEX idx_jobs_active 
ON jobs(organization_id, created_at DESC)
WHERE deleted_at IS NULL AND status = 'open';

-- ✅ CORRECT: Index for text search
CREATE INDEX idx_jobs_title_gin 
ON jobs USING gin(to_tsvector('english', title));

-- ❌ WRONG: Too many columns
CREATE INDEX idx_jobs_everything 
ON jobs(col1, col2, col3, col4, col5, col6, col7);  -- Too broad!
```

### Query Optimization

```sql
-- ✅ CORRECT: Use EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM jobs 
WHERE organization_id = '...' 
  AND status = 'open'
  AND deleted_at IS NULL;

-- Look for:
-- - Index scans (good) vs Sequential scans (bad)
-- - Execution time
-- - Rows scanned vs returned

-- ✅ CORRECT: Use covering indexes
CREATE INDEX idx_jobs_covering 
ON jobs(organization_id, status, created_at)
INCLUDE (title, description);  -- Include frequently selected columns

-- ✅ CORRECT: Limit returned columns
SELECT id, title, status, created_at 
FROM jobs
WHERE organization_id = $1;

-- ❌ WRONG: SELECT *
SELECT * FROM jobs WHERE organization_id = $1;  -- Returns unnecessary columns
```

### Connection Pooling

```javascript
// ✅ CORRECT: Proper pool configuration
const pool = new Pool({
  max: 20,                    // Maximum connections
  min: 2,                     // Minimum connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000,  // Connection timeout
  
  // Query timeout
  statement_timeout: 30000  // 30 second query timeout
});

// Monitor pool health
pool.on('error', (err) => {
  logger.error('Pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New client connected to pool');
});
```

---

## Caching Strategies

### Redis Caching

```javascript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

/**
 * Cache-aside pattern
 */
async function getJob(jobId, organizationId) {
  const cacheKey = `job:${organizationId}:${jobId}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Cache miss - fetch from database
  const job = await JobRepository.findById(jobId, organizationId);
  
  if (job) {
    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(job));
  }
  
  return job;
}

/**
 * Invalidate cache on update
 */
async function updateJob(jobId, data, organizationId, userId) {
  const job = await JobRepository.update(jobId, data, organizationId, userId);
  
  // Invalidate cache
  const cacheKey = `job:${organizationId}:${jobId}`;
  await redis.del(cacheKey);
  
  // Also invalidate list cache
  await redis.del(`jobs:${organizationId}:*`);
  
  return job;
}
```

### In-Memory Caching

```javascript
// ✅ CORRECT: Cache static data
import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 600,  // 10 minutes default
  checkperiod: 120  // Check for expired keys every 2 minutes
});

/**
 * Cache dropdown options
 */
async function getJobStatuses() {
  const cacheKey = 'job-statuses';
  
  let statuses = cache.get(cacheKey);
  if (statuses) {
    return statuses;
  }
  
  statuses = await query('SELECT * FROM job_statuses ORDER BY name');
  cache.set(cacheKey, statuses.rows);
  
  return statuses.rows;
}
```

### HTTP Caching Headers

```javascript
// ✅ CORRECT: Set cache headers
app.get('/api/jobs/:id', async (req, res) => {
  const job = await JobService.getById(req.params.id, req.user.organizationId);
  
  // Cache for 5 minutes
  res.set('Cache-Control', 'private, max-age=300');
  res.set('ETag', generateETag(job));
  
  return res.json({ success: true, job });
});

// Static assets - cache longer
app.use('/static', express.static('public', {
  maxAge: '1y',  // Cache for 1 year
  immutable: true
}));
```

---

## Monitoring & Profiling

### Performance Logging

```javascript
/**
 * Middleware to log request duration
 */
function performanceLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      organizationId: req.user?.organizationId
    });
    
    // Alert on slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`
      });
    }
  });
  
  next();
}

app.use(performanceLogger);
```

### Database Query Monitoring

```javascript
/**
 * Monitor slow queries
 */
export async function query(text, params, organizationId, options = {}) {
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries
    if (duration > 100) {
      logger.warn('Slow query', {
        duration: `${duration}ms`,
        query: text,
        table: options.table,
        operation: options.operation
      });
    }
    
    // Track query statistics
    metrics.recordQuery({
      table: options.table,
      operation: options.operation,
      duration,
      rowCount: result.rowCount
    });
    
    return result;
  } catch (error) {
    logger.error('Query failed', {
      error: error.message,
      query: text,
      duration: `${Date.now() - start}ms`
    });
    throw error;
  }
}
```

### Frontend Performance Monitoring

```javascript
// ✅ CORRECT: Use Performance API
function measurePageLoad() {
  window.addEventListener('load', () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    
    console.log('Page load time:', pageLoadTime + 'ms');
    
    // Send to analytics
    analytics.track('page_load', {
      duration: pageLoadTime,
      dns: perfData.domainLookupEnd - perfData.domainLookupStart,
      tcp: perfData.connectEnd - perfData.connectStart,
      ttfb: perfData.responseStart - perfData.navigationStart,
      dom: perfData.domComplete - perfData.domLoading
    });
  });
}

// Measure component render time
function ProfiledComponent() {
  useEffect(() => {
    performance.mark('component-start');
    
    return () => {
      performance.mark('component-end');
      performance.measure('component-render', 'component-start', 'component-end');
      
      const measure = performance.getEntriesByName('component-render')[0];
      console.log('Render time:', measure.duration + 'ms');
    };
  }, []);
  
  return <div>...</div>;
}
```

---

## Performance Checklist

### Backend
- [ ] All list endpoints paginated
- [ ] Database queries use indexes
- [ ] No N+1 query problems
- [ ] Bulk operations for multiple records
- [ ] Response compression enabled
- [ ] Connection pooling configured
- [ ] Slow query logging enabled
- [ ] Caching for frequently accessed data

### Frontend
- [ ] Code splitting for routes
- [ ] Lazy loading for images
- [ ] Components memoized where appropriate
- [ ] Virtual scrolling for long lists
- [ ] Debouncing for search inputs
- [ ] Bundle size < 200KB gzipped
- [ ] Lighthouse score > 90
- [ ] No unnecessary re-renders

### Database
- [ ] Indexes on foreign keys
- [ ] Composite indexes for common queries
- [ ] Partial indexes for soft deletes
- [ ] Query execution time < 100ms
- [ ] EXPLAIN ANALYZE on slow queries
- [ ] Regular VACUUM and ANALYZE

---

**End of Standards Documentation**

For questions or suggestions, please open an issue or contact the development team.
