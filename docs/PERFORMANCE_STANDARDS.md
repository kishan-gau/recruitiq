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
